export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return Response.json({ error: "No token provided" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const userDoc = await adminDb.collection("users").doc(uid).get();
    const userData = userDoc.data();

    // Check if user has active subscription using new Polar.sh structure
    let isMember = false;
    let subscriptionData = null;

    if (userData?.activeMember) {
      // If user is marked as active member, check if subscription has expired
      if (userData.subscriptionEndsAt) {
        const subscriptionEndsAt = userData.subscriptionEndsAt.toDate
          ? userData.subscriptionEndsAt.toDate()
          : new Date(userData.subscriptionEndsAt);
        const now = new Date();

        if (now > subscriptionEndsAt) {
          // Subscription has expired, update user
          console.log("⚠️ Subscription expired, updating user status");
          await adminDb.collection("users").doc(uid).update({
            activeMember: false,
            updatedAt: new Date(),
          });
          isMember = false;
        } else {
          isMember = true;
          subscriptionData = {
            subscriptionId: userData.subscriptionId,
            subscriptionStatus: userData.subscriptionStatus,
            subscriptionEndsAt: subscriptionEndsAt,
            willRenew: userData.willRenew,
            polarCustomerId: userData.polarCustomerId,
          };
        }
      } else {
        // No end date, assume active
        isMember = true;
        subscriptionData = {
          subscriptionId: userData.subscriptionId,
          subscriptionStatus: userData.subscriptionStatus,
          willRenew: userData.willRenew,
          polarCustomerId: userData.polarCustomerId,
        };
      }
    }

    console.log("Subscription status:", { isMember, subscriptionData });

    const permissions = {
      isAdmin: !!decodedToken.admin,
      isMember: isMember,
      canAccessPackages: isMember || userData?.unlockedPackages?.length > 0,
    };

    console.log("Calculated permissions:", permissions);

    return Response.json({
      user: {
        uid,
        email: userData?.email,
        username: userData?.username,
        createdAt: userData?.createdAt,
        unlockedPackages: userData?.unlockedPackages || [],
        activeMember: isMember,
        subscriptionStatus: userData?.subscriptionStatus,
        willRenew: userData?.willRenew,
        subscriptionEndsAt: userData?.subscriptionEndsAt,
      },
      subscription: subscriptionData,
      permissions,
    });
  } catch (error) {
    console.error("Verify permissions error:", error);
    return Response.json({ error: "Authentication failed" }, { status: 401 });
  }
}
