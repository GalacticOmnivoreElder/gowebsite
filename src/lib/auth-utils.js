import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { createHash } from "node:crypto";

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

const NON_ENTITLED_SUBSCRIPTION_STATUSES = new Set([
  "incomplete",
  "incomplete_expired",
  "refunded",
  "revoked",
  "unpaid",
]);

export function getSubscriptionAccessEnd(userData = {}) {
  const value = userData?.subscriptionEndsAt;
  if (!value) return null;

  const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  return date instanceof Date && Number.isFinite(date.getTime()) ? date : null;
}

export function hasActiveSubscription(userData = {}, now = new Date()) {
  const status = String(userData?.subscriptionStatus || "")
    .trim()
    .toLowerCase();
  if (NON_ENTITLED_SUBSCRIPTION_STATUSES.has(status)) return false;

  // Polar's paid-through date is authoritative whenever it is present. This
  // protects monthly and annual Community, Mentor, and Business subscribers
  // from a stale activeMember flag, especially after cancel-at-period-end.
  const endsAt = getSubscriptionAccessEnd(userData);
  if (endsAt) {
    const currentTime = now instanceof Date ? now.getTime() : new Date(now).getTime();
    return Number.isFinite(currentTime) && currentTime < endsAt.getTime();
  }

  return userData?.activeMember === true;
}

export function getMembershipConfirmationId(userData = {}) {
  const activationKey = String(
    userData?.membershipActivationPurchaseKey || ""
  ).trim();
  if (!activationKey || !hasActiveSubscription(userData)) return null;

  return createHash("sha256")
    .update(`go-membership-confirmation:v1:${activationKey}`)
    .digest("hex")
    .slice(0, 32);
}

export function getEffectiveMembership(userData = {}, { admin = false, now = new Date() } = {}) {
  const subscribed = hasActiveSubscription(userData, now);
  const activeMember = admin || subscribed;
  const membershipTier = activeMember
    ? admin
      ? "company"
      : userData.membershipTier || "member"
    : null;

  return {
    activeMember,
    membershipTier,
    subscribed,
    canCreateProjects: membershipTier === "company",
    canAccessPackages:
      activeMember || (Array.isArray(userData.unlockedPackages) && userData.unlockedPackages.length > 0),
  };
}

/**
 * Resolve the authenticated user for an API request into a single object that
 * carries everything the authorization helpers need:
 *  - uid / email
 *  - admin: TRUE if the Firebase Auth custom claim `admin` OR the Firestore
 *    users/{uid}.admin field is set. Platform-admin (superadmin) powers depend
 *    on this being Firestore-aware - many admins are flagged only in Firestore.
 *  - activeMember / membershipTier: derived from the Polar subscription model
 *    (users/{uid}.activeMember + subscriptionEndsAt), with paid-through
 *    windows treated as active even when a delayed event left the flag stale.
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

  const membership = getEffectiveMembership(userData, { admin });

  return {
    uid: decoded.uid,
    email: decoded.email || userData.email || null,
    admin,
    activeMember: membership.activeMember,
    membershipTier: membership.membershipTier,
    canCreateProjects: membership.canCreateProjects,
    canAccessPackages: membership.canAccessPackages,
    claims: decoded,
    userData,
  };
}
