import { NextResponse } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";
import { createPolarCustomerSession, getPolarApiBase } from "@/lib/polar";
import {
  cancelPendingEmailEvents,
  enqueueEmailEvent,
} from "@/lib/email";

function parsePolarDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    return new Date(value < 100000000000 ? value * 1000 : value);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function POST(request) {
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

    if (!userData.subscriptionId) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 400 }
      );
    }

    console.log(
      "🔄 Attempting to cancel subscription:",
      userData.subscriptionId
    );

    const customerSession = await createPolarCustomerSession(userData.polarCustomerId);

    // Now cancel the subscription using the customer portal API
    const cancelUrl = `${getPolarApiBase()}/customer-portal/subscriptions/${userData.subscriptionId}`;
    console.log("📡 Cancel URL:", cancelUrl);

    const response = await fetch(cancelUrl, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${customerSession.token}`, // Use customer session token
        "Content-Type": "application/json",
      },
    });

    console.log("📡 Polar API Response Status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Polar API Error:", errorText);

      // Check if it's already canceled or doesn't exist
      if (response.status === 404) {
        console.log(
          "⚠️ Subscription not found in Polar, updating local status anyway"
        );
      } else if (response.status === 400) {
        const errorData = JSON.parse(errorText);
        console.log("⚠️ Polar API 400 Error:", errorData);

        // If already canceled, that's fine
        if (
          errorData.message?.includes("already") ||
          errorData.message?.includes("canceled")
        ) {
          console.log("✅ Subscription already canceled in Polar");
        } else {
          throw new Error(`Polar API Error: ${errorText}`);
        }
      } else {
        throw new Error(`Polar API Error (${response.status}): ${errorText}`);
      }
    }

    let canceledSubscription = null;
    if (response.ok) {
      canceledSubscription = await response.json();
      console.log("✅ Polar cancellation successful:", canceledSubscription);
    }

    // Update user document regardless of Polar response (for local tracking)
    const updateData = {
      subscriptionStatus: "canceled",
      willRenew: false,
      canceledAt: new Date(),
      updatedAt: new Date(),
    };

    // If we got subscription data from Polar, use it to set end date
    if (canceledSubscription?.current_period_end) {
      updateData.subscriptionEndsAt = parsePolarDate(canceledSubscription.current_period_end);
    }

    if (!updateData.subscriptionEndsAt) {
      // Fallback: assume 30 days from now if we don't have the exact end date
      const fallbackEndDate = new Date();
      fallbackEndDate.setDate(fallbackEndDate.getDate() + 30);
      updateData.subscriptionEndsAt = fallbackEndDate;
    }

    await userDoc.ref.update(updateData);
    await cancelPendingEmailEvents({
      userId: decodedToken.uid,
      eventType: "billing.renewal_reminder",
      reason: "subscription_cancelled",
    });
    if (userData.email) {
      await enqueueEmailEvent({
        type: "billing.cancellation_scheduled",
        eventId: userData.subscriptionId,
        userId: decodedToken.uid,
        recipient: userData.email,
        data: { endsAt: updateData.subscriptionEndsAt },
      });
      const reminderAt = new Date(
        updateData.subscriptionEndsAt.getTime() - 3 * 24 * 60 * 60 * 1000
      );
      if (reminderAt > new Date()) {
        await enqueueEmailEvent({
          type: "billing.access_expiring",
          eventId: `${userData.subscriptionId}-${updateData.subscriptionEndsAt.toISOString()}`,
          userId: decodedToken.uid,
          recipient: userData.email,
          scheduledFor: reminderAt,
          data: { endsAt: updateData.subscriptionEndsAt },
        });
      }
    }

    console.log("✅ User document updated with cancellation");

    return NextResponse.json({
      success: true,
      message: "Subscription canceled successfully",
      endsAt: updateData.subscriptionEndsAt,
    });
  } catch (error) {
    console.error("❌ Error canceling subscription:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
