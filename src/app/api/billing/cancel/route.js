import { NextResponse } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";

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

    // First, create a customer session for the customer portal API
    const customerSessionResponse = await fetch(
      "https://api.polar.sh/v1/customer-sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.POLAR_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_id: userData.polarCustomerId,
        }),
      }
    );

    if (!customerSessionResponse.ok) {
      const errorText = await customerSessionResponse.text();
      console.error("❌ Failed to create customer session:", errorText);
      throw new Error(`Failed to create customer session: ${errorText}`);
    }

    const customerSession = await customerSessionResponse.json();
    console.log("✅ Customer session created:", customerSession.token);

    // Now cancel the subscription using the customer portal API
    const cancelUrl = `https://api.polar.sh/v1/customer-portal/subscriptions/${userData.subscriptionId}/cancel`;
    console.log("📡 Cancel URL:", cancelUrl);

    const response = await fetch(cancelUrl, {
      method: "POST",
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
      canceledAt: new Date(),
      updatedAt: new Date(),
    };

    // If we got subscription data from Polar, use it to set end date
    if (canceledSubscription?.current_period_end) {
      updateData.subscriptionEndsAt = new Date(
        canceledSubscription.current_period_end * 1000
      );
    } else {
      // Fallback: assume 30 days from now if we don't have the exact end date
      const fallbackEndDate = new Date();
      fallbackEndDate.setDate(fallbackEndDate.getDate() + 30);
      updateData.subscriptionEndsAt = fallbackEndDate;
    }

    await userDoc.ref.update(updateData);

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
