import { adminDb } from "@/lib/firebase-admin";
import { getRequestUser } from "@/lib/auth-utils";
import { MENTOR_STATUSES } from "@/lib/mentor-profiles";

function toIso(value) {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate().toISOString();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// Membership is expired if the access window has lapsed (Polar model).
function isActiveMember(userData) {
  if (userData?.activeMember !== true) return false;
  const endsAt = userData.subscriptionEndsAt;
  if (endsAt) {
    const date = typeof endsAt?.toDate === "function" ? endsAt.toDate() : new Date(endsAt);
    if (!Number.isNaN(date.getTime()) && new Date() > date) return false;
  }
  return true;
}

async function requireAdmin(request) {
  const adminUser = await getRequestUser(request);
  if (!adminUser) return { error: "No token provided", status: 401 };
  if (!adminUser.admin) return { error: "Not an admin", status: 403 };
  return { adminUser };
}

// GET /api/admin/users
// Returns every user in a single server-side read (adminDb bypasses client
// Firestore rules). Membership is derived from the Polar fields written by the
// subscription webhook onto users/{uid} - NOT from the legacy `subscriptions`
// collection, which was the source of the client-side N+1 query storm.
export async function GET(request) {
  try {
    const gate = await requireAdmin(request);
    if (gate.error) return Response.json({ error: gate.error }, { status: gate.status });

    const snapshot = await adminDb.collection("users").get();

    const users = snapshot.docs.map((doc) => {
      const data = doc.data();
      const isMember = isActiveMember(data);
      const membershipTier = ["member", "company"].includes(
        data.membershipTier
      )
        ? data.membershipTier
        : null;
      return {
        id: doc.id,
        name: data.name || data.displayName || data.username || "N/A",
        email: data.email || "N/A",
        joined: toIso(data.createdAt),
        isAdmin: data.admin === true,
        isMember,
        membershipTier,
        subscriptionStatus: data.subscriptionStatus || null,
        subscriptionEndsAt: toIso(data.subscriptionEndsAt),
        willRenew: data.willRenew ?? null,
        mentorStatus: MENTOR_STATUSES.includes(data.mentorStatus) ? data.mentorStatus : "none",
        mentorPublicProfileEnabled: data.mentorPublicProfileEnabled === true,
      };
    });

    // Newest first when we know when they joined.
    users.sort((a, b) => (b.joined || "").localeCompare(a.joined || ""));

    return Response.json({ users });
  } catch (error) {
    console.error("Error fetching admin users:", error);
    return Response.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// PUT /api/admin/users  { userId, activeMember?, membershipTier?, mentorStatus?, mentorPublicProfileEnabled? }
// Manual membership override for admins, written to the Polar user-doc model.
export async function PUT(request) {
  try {
    const gate = await requireAdmin(request);
    if (gate.error) return Response.json({ error: gate.error }, { status: gate.status });

    const { userId, activeMember, membershipTier, mentorStatus, mentorPublicProfileEnabled, reason: reasonInput } = await request.json();
    const hasActiveMember = typeof activeMember === "boolean";
    const hasMembershipTier = membershipTier !== undefined;
    const hasMentorStatus = mentorStatus !== undefined;
    const hasMentorVisibility = typeof mentorPublicProfileEnabled === "boolean";

    if (!userId || (!hasActiveMember && !hasMembershipTier && !hasMentorStatus && !hasMentorVisibility)) {
      return Response.json(
        { error: "userId and an account update are required" },
        { status: 400 }
      );
    }

    if (
      hasMembershipTier &&
      !["member", "company"].includes(membershipTier)
    ) {
      return Response.json(
        { error: "membershipTier must be member or company" },
        { status: 400 }
      );
    }
    if (hasMentorStatus && !MENTOR_STATUSES.includes(mentorStatus)) {
      return Response.json({ error: "mentorStatus is not supported" }, { status: 400 });
    }

    const reason = String(reasonInput || "").trim().slice(0, 2000);
    if (!reason) return Response.json({ error: "A reason is required for account control changes" }, { status: 400 });
    const userRef = adminDb.collection("users").doc(userId);
    const existing = await userRef.get();
    if (!existing.exists) return Response.json({ error: "User not found" }, { status: 404 });
    const previous = existing.data();
    if (hasMentorVisibility && mentorPublicProfileEnabled) {
      const effectiveStatus = hasMentorStatus ? mentorStatus : previous.mentorStatus || "none";
      if (effectiveStatus !== "approved") {
        return Response.json({ error: "Only approved mentors can have a public profile" }, { status: 409 });
      }
    }

    const now = new Date();
    const update = { updatedAt: now };

    if (hasActiveMember || hasMembershipTier) {
      update.membershipOverrideBy = gate.adminUser.uid;
      update.membershipOverrideAt = now;
    }

    if (hasActiveMember) {
      update.activeMember = activeMember;
      update.subscriptionStatus = activeMember ? "active" : "canceled";
      update.willRenew = activeMember;
    }
    if (hasMembershipTier) {
      update.membershipTier = membershipTier;
    }
    if (hasMentorStatus) {
      update.mentorStatus = mentorStatus;
      update.mentorStatusUpdatedBy = gate.adminUser.uid;
      update.mentorStatusUpdatedAt = now;
      if (mentorStatus !== "approved") update.mentorPublicProfileEnabled = false;
    }
    if (hasMentorVisibility) update.mentorPublicProfileEnabled = mentorPublicProfileEnabled;

    await userRef.set(
      update,
      { merge: true }
    );
    await adminDb.collection("admin_audit_events").add({
      action: hasActiveMember || hasMembershipTier ? (hasMentorStatus || hasMentorVisibility ? "account.controls_updated" : "account.entitlement_override_updated") : "mentor.account_controls_updated",
      actorId: gate.adminUser.uid,
      target: { type: "user", id: userId },
      targetUserId: userId,
      previousValue: {
        activeMember: previous.activeMember === true,
        membershipTier: previous.membershipTier || null,
        mentorStatus: previous.mentorStatus || "none",
        mentorPublicProfileEnabled: previous.mentorPublicProfileEnabled === true,
      },
      newValue: {
        activeMember: hasActiveMember ? activeMember : previous.activeMember === true,
        membershipTier: hasMembershipTier ? membershipTier : previous.membershipTier || null,
        mentorStatus: hasMentorStatus ? mentorStatus : previous.mentorStatus || "none",
        mentorPublicProfileEnabled: update.mentorPublicProfileEnabled ?? (hasMentorVisibility ? mentorPublicProfileEnabled : previous.mentorPublicProfileEnabled === true),
      },
      reason,
      createdAt: now,
    });

    return Response.json({
      success: true,
      userId,
      ...(hasActiveMember ? { activeMember } : {}),
      ...(hasMembershipTier ? { membershipTier } : {}),
      ...(hasMentorStatus ? { mentorStatus } : {}),
      ...(hasMentorVisibility ? { mentorPublicProfileEnabled } : {}),
    });
  } catch (error) {
    console.error("Error updating user membership:", error);
    return Response.json({ error: "Failed to update account" }, { status: 500 });
  }
}
