import { adminAuth, adminDb } from "@/lib/firebase-admin";

export function getTokenFromRequest(request) {
  const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.split("Bearer ")[1];
}

export async function verifyToken(token) {
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    throw new Error("Invalid token");
  }
}

/**
 * Resolve the authenticated user for an API request into a single object that
 * carries everything the authorization helpers need:
 *  - uid / email
 *  - admin: TRUE if the Firebase Auth custom claim `admin` OR the Firestore
 *    users/{uid}.admin field is set. Platform-admin (superadmin) powers depend
 *    on this being Firestore-aware — many admins are flagged only in Firestore.
 *  - activeMember / membershipTier: derived from the Polar subscription model
 *    (users/{uid}.activeMember + subscriptionEndsAt), with lapsed windows
 *    treated as inactive.
 *  - canCreateProjects: admin, or a "company" tier member.
 *
 * Returns null when there is no valid token.
 */
export async function getRequestUser(request) {
  const token = getTokenFromRequest(request);
  if (!token) return null;

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch (error) {
    return null;
  }

  let userData = {};
  try {
    const snap = await adminDb.collection("users").doc(decoded.uid).get();
    userData = snap.exists ? snap.data() : {};
  } catch (error) {
    console.error("getRequestUser: failed to load user doc", error);
  }

  const admin = decoded.admin === true || userData.admin === true;

  let activeMember = userData.activeMember === true;
  if (activeMember && userData.subscriptionEndsAt) {
    const endsAt = userData.subscriptionEndsAt.toDate
      ? userData.subscriptionEndsAt.toDate()
      : new Date(userData.subscriptionEndsAt);
    if (endsAt && new Date() > endsAt) {
      activeMember = false;
    }
  }

  const membershipTier = activeMember ? userData.membershipTier || "member" : null;

  return {
    uid: decoded.uid,
    email: decoded.email || userData.email || null,
    admin,
    activeMember,
    membershipTier,
    canCreateProjects: admin || membershipTier === "company",
    claims: decoded,
    userData,
  };
}
