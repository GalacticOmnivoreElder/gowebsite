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
      return {
        id: doc.id,
        name: data.name || data.displayName || data.username || "N/A",
        email: data.email || "N/A",
        joined: toIso(data.createdAt),
        isAdmin: data.admin === true,
        isMember,
        membershipTier: isMember ? data.membershipTier || "member" : null,
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

// PUT /api/admin/users  { userId, activeMember }
// Manual membership override for admins, written to the Polar user-doc model.
export async function PUT(request) {
  try {
    const gate = await requireAdmin(request);
    if (gate.error) return Response.json({ error: gate.error }, { status: gate.status });

    const { userId, activeMember } = await request.json();
    if (!userId || typeof activeMember !== "boolean") {
      return Response.json(
        { error: "userId and boolean activeMember are required" },
        { status: 400 }
      );
    }

    await adminDb.collection("users").doc(userId).set(
      {
        activeMember,
        subscriptionStatus: activeMember ? "active" : "canceled",
        willRenew: activeMember,
        updatedAt: new Date(),
        membershipOverrideBy: gate.adminUser.uid,
        membershipOverrideAt: new Date(),
      },
      { merge: true }
    );

    return Response.json({ success: true, userId, activeMember });
  } catch (error) {
    console.error("Error updating user membership:", error);
    return Response.json({ error: "Failed to update membership" }, { status: 500 });
  }
}
