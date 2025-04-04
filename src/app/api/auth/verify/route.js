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

    const subscriptionQuery = await adminDb
      .collection("subscriptions")
      .where("userId", "==", uid)
      .where("active", "==", true)
      .limit(1)
      .get();

    console.log(
      "Subscription query results:",
      !subscriptionQuery.empty
        ? subscriptionQuery.docs[0].data()
        : "No active subscription"
    );

    const permissions = {
      isAdmin: !!decodedToken.admin,
      isMember: !subscriptionQuery.empty,
      canAccessPackages:
        !subscriptionQuery.empty || userData?.unlockedPackages?.length > 0,
    };

    console.log("Calculated permissions:", permissions);

    return Response.json({
      user: {
        uid,
        email: userData?.email,
        username: userData?.username,
        createdAt: userData?.createdAt,
        unlockedPackages: userData?.unlockedPackages || [],
      },
      subscription: !subscriptionQuery.empty
        ? subscriptionQuery.docs[0].data()
        : null,
      permissions,
    });
  } catch (error) {
    console.error("Verify permissions error:", error);
    return Response.json({ error: "Authentication failed" }, { status: 401 });
  }
}
