import { adminDb } from "@/lib/firebase-admin";
import { getRequestUser } from "@/lib/auth-utils";

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
// subscription webhook onto users/{uid} — NOT from the legacy `subscriptions`
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

// PUT /api/admin/users  { userId, activeMember?, membershipTier? }
// Manual membership override for admins, written to the Polar user-doc model.
export async function PUT(request) {
  try {
    const gate = await requireAdmin(request);
    if (gate.error) return Response.json({ error: gate.error }, { status: gate.status });

    const { userId, activeMember, membershipTier } = await request.json();
    const hasActiveMember = typeof activeMember === "boolean";
    const hasMembershipTier = membershipTier !== undefined;

    if (!userId || (!hasActiveMember && !hasMembershipTier)) {
      return Response.json(
        { error: "userId and a membership update are required" },
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

    const update = {
      updatedAt: new Date(),
      membershipOverrideBy: gate.adminUser.uid,
      membershipOverrideAt: new Date(),
    };

    if (hasActiveMember) {
      update.activeMember = activeMember;
      update.subscriptionStatus = activeMember ? "active" : "canceled";
      update.willRenew = activeMember;
    }
    if (hasMembershipTier) {
      update.membershipTier = membershipTier;
    }

    await adminDb.collection("users").doc(userId).set(
      update,
      { merge: true }
    );

    return Response.json({
      success: true,
      userId,
      ...(hasActiveMember ? { activeMember } : {}),
      ...(hasMembershipTier ? { membershipTier } : {}),
    });
  } catch (error) {
    console.error("Error updating user membership:", error);
    return Response.json({ error: "Failed to update membership" }, { status: 500 });
  }
}
