import { NextResponse } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";
import { getPolarApiBase } from "@/lib/polar";

export async function GET(request) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const decodedToken = await verifyToken(token);

    // Get user document
    const userDoc = await adminDb
      .collection("users")
      .doc(decodedToken.uid)
      .get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data();

    // If no subscription, return basic info
    if (!userData.subscriptionId) {
      return NextResponse.json({
        hasSubscription: false,
        activeMember: userData.activeMember || false,
      });
    }

    // Get subscription details from Polar
    try {
      const response = await fetch(
        `${getPolarApiBase()}/subscriptions/${userData.subscriptionId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.POLAR_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const subscription = await response.json();

        return NextResponse.json({
          hasSubscription: true,
          activeMember: userData.activeMember || false,
          subscriptionStatus: userData.subscriptionStatus || "active",
          subscription: {
            id: subscription.id,
            status: subscription.status,
            currentPeriodStart: subscription.current_period_start,
            currentPeriodEnd: subscription.current_period_end,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            price: subscription.price,
            currency: subscription.currency,
            product: subscription.product,
          },
          canceledAt: userData.canceledAt,
          subscriptionEndsAt: userData.subscriptionEndsAt,
        });
      }
    } catch (polarError) {
      console.error("Error fetching from Polar:", polarError);
    }

    // Fallback to Firestore data if Polar fails
    return NextResponse.json({
      hasSubscription: true,
      activeMember: userData.activeMember || false,
      subscriptionStatus: userData.subscriptionStatus || "active",
      canceledAt: userData.canceledAt,
      subscriptionEndsAt: userData.subscriptionEndsAt,
      // Use stored order data for pricing
      lastOrderAmount: userData.lastOrderAmount,
      monthsPaid: userData.monthsPaid || 0,
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
