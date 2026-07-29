import { NextResponse } from "next/server";
import {
  getEffectiveMembership,
  getMembershipConfirmationId,
  getTokenFromRequest,
  hasActiveSubscription,
  verifyToken,
} from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";
import {
  getPolarApiBase,
  resolvePolarProductTier,
} from "@/lib/polar";
import { getPendingSubscriptionUpdate } from "@/lib/subscription-upgrade";

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
    const isAdmin = decodedToken.admin === true || userData.admin === true;
    const membership = getEffectiveMembership(userData, { admin: isAdmin });
    const hasPaidSubscription = hasActiveSubscription(userData);
    const membershipConfirmationId =
      getMembershipConfirmationId(userData);
    const confirmationData = membershipConfirmationId
      ? { membershipConfirmationId }
      : {};

    // If no subscription, return basic info
    if (!userData.subscriptionId) {
      return NextResponse.json({
        hasSubscription: false,
        activeMember: membership.activeMember,
        membershipTier: membership.membershipTier,
        hasPaidSubscription,
        ...confirmationData,
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
        const pendingUpdate = getPendingSubscriptionUpdate(subscription);

        return NextResponse.json({
          hasSubscription: true,
          activeMember: membership.activeMember,
          membershipTier: membership.membershipTier,
          hasPaidSubscription,
          ...confirmationData,
          subscriptionStatus: userData.subscriptionStatus || "active",
          subscription: {
            id: subscription.id,
            status: subscription.status,
            currentPeriodStart: subscription.current_period_start,
            currentPeriodEnd: subscription.current_period_end,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            price: subscription.price,
            amount: subscription.amount,
            currency: subscription.currency,
            product: subscription.product,
            pendingUpdate: pendingUpdate
              ? {
                  id: pendingUpdate.id,
                  appliesAt: pendingUpdate.appliesAt,
                  productId: pendingUpdate.productId,
                  tier: resolvePolarProductTier(pendingUpdate.productId),
                  amount:
                    userData.pendingMembershipProductId ===
                    pendingUpdate.productId
                      ? userData.pendingMembershipPriceAmount ?? null
                      : null,
                  currency:
                    userData.pendingMembershipProductId ===
                    pendingUpdate.productId
                      ? userData.pendingMembershipCurrency || null
                      : null,
                  interval:
                    userData.pendingMembershipProductId ===
                    pendingUpdate.productId
                      ? userData.pendingMembershipInterval || null
                      : null,
                }
              : null,
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
      activeMember: membership.activeMember,
      membershipTier: membership.membershipTier,
      hasPaidSubscription,
      ...confirmationData,
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
