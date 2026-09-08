export const dynamic = "force-dynamic";

import {
  adminAuth,
  adminDb,
  isFirebaseAdminSetupError,
} from "@/lib/firebase-admin";
import {
  getEffectiveMembership,
  getMembershipConfirmationId,
  getSubscriptionAccessEnd,
  hasActiveSubscription,
} from "@/lib/auth-utils";

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return Response.json({ error: "No token provided" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (e) {
      console.error("Verify ID token error:", e);
      if (isFirebaseAdminSetupError(e)) {
        return Response.json(
          {
            error: "Server misconfiguration: Firebase Admin credentials are invalid",
            details: e?.message || String(e),
            hint: "Your login is fine. Common fix on Windows: delete GOOGLE_APPLICATION_CREDENTIALS from System/User environment variables if gcloud set it - it overrides Firebase. This app now uses FIREBASE_* from .env first. Also wrap the key in double quotes in .env, or use FIREBASE_PRIVATE_KEY_BASE64.",
            notYourFault: true,
          },
          { status: 503 }
        );
      }
      return Response.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const uid = decodedToken.uid;

    let userDoc;
    let userData;
    try {
      userDoc = await adminDb.collection("users").doc(uid).get();
      userData = userDoc.data();
    } catch (e) {
      console.error("Firestore error in /api/auth/verify:", e);
      const isCred =
        e?.code === 16 ||
        String(e?.message || "").includes("UNAUTHENTICATED");
      if (process.env.NODE_ENV === "development" && isCred) {
        return Response.json(
          {
            error: "Firestore rejected the server credential (not your login)",
            details:
              "verifyIdToken succeeded but Firestore returned UNAUTHENTICATED - almost always wrong GCP project or key/email mismatch.",
            hint: "Fix 1: Unset GCLOUD_PROJECT for this shell / Windows env if gcloud pointed at another project. Fix 2: Use one source only - FIREBASE_SERVICE_ACCOUNT_PATH pointing at your downloaded JSON (same file for all fields). Fix 3: Ensure FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, and FIREBASE_PROJECT_ID are copied from the SAME JSON in one paste (no mixing old email with new key). Then restart next dev.",
          },
          { status: 503 }
        );
      }
      return Response.json(
        { error: "Permission data temporarily unavailable" },
        { status: 503 }
      );
    }

    // Membership derives from the Polar subscription model written by the
    // webhook. The paid-through date remains authoritative if a cancellation
    // event and the cached activeMember flag arrive out of order.
    const now = new Date();
    const hasPaidSubscription = hasActiveSubscription(userData, now);
    const endsAt = getSubscriptionAccessEnd(userData);

    if (
      userDoc.exists &&
      typeof userData?.activeMember === "boolean" &&
      userData.activeMember !== hasPaidSubscription
    ) {
      // Repair stale cached state without changing the source subscription
      // status. Every authorization decision still uses the shared resolver.
      try {
        await adminDb.collection("users").doc(uid).update({
          activeMember: hasPaidSubscription,
          updatedAt: now,
        });
        userData = { ...userData, activeMember: hasPaidSubscription };
      } catch (e) {
        console.error("Failed to reconcile membership for", uid, e);
      }
    }

    const subscriptionData = hasPaidSubscription
      ? {
          subscriptionId: userData?.subscriptionId || null,
          subscriptionStatus: userData?.subscriptionStatus || null,
          subscriptionEndsAt: endsAt,
          willRenew: userData?.willRenew ?? null,
          polarCustomerId: userData?.polarCustomerId || null,
        }
      : null;

    // Admin can be set via Auth custom claims (decodedToken.admin) OR Firestore users/{uid}.admin
    const isAdmin = !!(decodedToken.admin === true || userData?.admin === true);

    // Tier: "member" can apply to projects; "company" can also create/manage projects.
    const membership = getEffectiveMembership(userData, { admin: isAdmin, now });
    const isMember = membership.activeMember;
    const membershipTier = membership.membershipTier;
    const canCreateProjects = membership.canCreateProjects;
    const membershipConfirmationId =
      getMembershipConfirmationId(userData);

    const permissions = {
      isAdmin,
      isMember,
      membershipTier,
      canCreateProjects,
      canAccessPackages: membership.canAccessPackages,
      hasPaidSubscription,
    };

    return Response.json({
      user: {
        uid,
        email: userData?.email,
        username: userData?.username,
        createdAt: userData?.createdAt,
        unlockedPackages: userData?.unlockedPackages || [],
        activeMember: isMember,
        membershipTier,
        subscriptionStatus: userData?.subscriptionStatus || null,
        willRenew: userData?.willRenew ?? null,
        subscriptionEndsAt: userData?.subscriptionEndsAt || null,
        polarCustomerId: userData?.polarCustomerId || null,
        pendingMembershipTier: userData?.pendingMembershipTier || null,
        pendingMembershipProductId:
          userData?.pendingMembershipProductId || null,
        pendingMembershipEffectiveAt:
          userData?.pendingMembershipEffectiveAt || null,
        pendingMembershipInterval:
          userData?.pendingMembershipInterval || null,
        pendingMembershipPriceAmount:
          userData?.pendingMembershipPriceAmount ?? null,
        pendingMembershipCurrency:
          userData?.pendingMembershipCurrency || null,
        pendingMembershipStatus:
          userData?.pendingMembershipStatus || null,
        ...(membershipConfirmationId ? { membershipConfirmationId } : {}),
      },
      subscription: subscriptionData,
      permissions,
    });
  } catch (error) {
    console.error("Verify permissions error:", error);
    const msg = error?.message || String(error);
    const code = error?.code || error?.errorInfo?.code;
    const isConfig =
      code === "app/invalid-credential" ||
      /invalid-credential|invalid PEM|FIREBASE_|GOOGLE_APPLICATION_CREDENTIALS|not valid PEM|Firebase Admin:/i.test(
        msg
      );
    if (process.env.NODE_ENV === "development" && isConfig) {
      return Response.json(
        {
          error: "Firebase Admin configuration error",
          details: msg,
          hint: "Use GOOGLE_APPLICATION_CREDENTIALS pointing at the service account JSON file, or FIREBASE_SERVICE_ACCOUNT_JSON.",
        },
        { status: 503 }
      );
    }
    return Response.json({ error: "Authentication failed" }, { status: 500 });
  }
}
