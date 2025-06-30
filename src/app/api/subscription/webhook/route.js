import { adminDb } from "@/lib/firebase-admin";
import { verifyWebhookSignature } from "@/lib/webhook-verification";
import {
  isWebhookProcessed,
  markWebhookProcessed,
} from "@/lib/webhook-deduplication";

export async function POST(request) {
  console.log("🎯 WEBHOOK RECEIVED AT:", new Date().toISOString());
  console.log("📦 Headers:", Object.fromEntries(request.headers.entries()));

  try {
    // Get the raw body for signature verification
    const body = await request.text();

    // Get signature from headers
    const signature =
      request.headers.get("x-polar-signature") ||
      request.headers.get("x-signature") ||
      request.headers.get("signature");

    // Verify webhook signature (add POLAR_WEBHOOK_SECRET to your .env)
    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;

    if (
      webhookSecret &&
      !verifyWebhookSignature(body, signature, webhookSecret)
    ) {
      console.error("❌ Webhook signature verification failed");
      return new Response("Unauthorized", { status: 401 });
    }

    console.log("📦 Raw body:", body);

    // Parse JSON
    const data = JSON.parse(body);

    // FIXED: Use the actual webhook ID from headers, not the subscription ID
    const webhookId = request.headers.get("webhook-id");
    const eventId = webhookId || `${data.type}_${Date.now()}_${Math.random()}`;

    console.log("🆔 Using webhook ID:", eventId);

    // Check if webhook already processed
    if (await isWebhookProcessed(eventId, data.type)) {
      console.log(`⚠️ Webhook ${eventId} already processed, skipping`);
      return new Response("Already processed", { status: 200 });
    }

    console.log("📦 Parsed webhook data:", JSON.stringify(data, null, 2));
    console.log("🏷️ Event type:", data.type);

    // Handle different event types
    switch (data.type) {
      case "order.paid":
        await handleOrderPaid(data.data);
        break;

      case "subscription.canceled":
        await handleSubscriptionCanceled(data.data);
        break;

      case "subscription.updated":
        await handleSubscriptionUpdated(data.data);
        break;

      case "payment.failed":
        await handlePaymentFailed(data.data);
        break;

      default:
        console.log(`ℹ️ Ignoring event type: ${data.type}`);
    }

    // Mark as processed
    await markWebhookProcessed(eventId, data.type, data);

    console.log("✅ Webhook processing completed");
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("❌ CRITICAL ERROR in webhook:", error);
    console.error("❌ Error stack:", error.stack);
    return new Response("Error", { status: 500 });
  }
}

// Handle order paid - adapted for your user structure
async function handleOrderPaid(orderData) {
  console.log("💰 ORDER PAID EVENT DETECTED!");

  const customerEmail = orderData?.customer?.email;
  const customerName = orderData?.customer?.name;
  const customerId = orderData?.customer?.id;

  console.log("🔍 Extracted data:");
  console.log("   - Email:", customerEmail);
  console.log("   - Name:", customerName);
  console.log("   - Customer ID:", customerId);

  if (!customerEmail) {
    console.error("❌ No customer email found in order.paid");
    throw new Error("No email found");
  }

  // Check for duplicate processing
  const existingOrder = await adminDb
    .collection("orders")
    .doc(orderData.id)
    .get();

  if (existingOrder.exists) {
    console.log("⚠️ Order already processed, skipping");
    return;
  }

  // Find user by email
  console.log(`🔍 Searching for user with email: ${customerEmail}`);
  const userQuery = await adminDb
    .collection("users")
    .where("email", "==", customerEmail)
    .limit(1)
    .get();

  console.log(
    `📊 User search result: empty=${userQuery.empty}, size=${userQuery.size}`
  );

  if (!userQuery.empty) {
    const userDoc = userQuery.docs[0];
    const currentUserData = userDoc.data();

    console.log(`✅ Found user ${userDoc.id}`);
    console.log(
      `📄 Current user data:`,
      JSON.stringify(currentUserData, null, 2)
    );

    // Update user to active member - adapted for your structure
    const updateData = {
      activeMember: true,
      polarCustomerId: customerId,
      subscriptionId: orderData.subscription_id,
      updatedAt: new Date(),
      webhookProcessedAt: new Date(),
      lastOrderId: orderData.id,
      subscriptionStatus: "active",
      willRenew: true,
    };

    console.log(`💾 Updating user with:`, JSON.stringify(updateData, null, 2));

    await userDoc.ref.update(updateData);

    console.log(`✅ Successfully updated user ${userDoc.id} to active member`);

    // Create order record
    const orderRecord = {
      userId: userDoc.id,
      polarOrderId: orderData.id,
      polarCustomerId: customerId,
      status: orderData.status,
      amount: orderData.amount,
      currency: orderData.currency,
      subscriptionId: orderData.subscription_id,
      createdAt: new Date(orderData.created_at),
      paidAt: new Date(),
      webhookProcessedAt: new Date(),
      processed: true,
    };

    console.log(
      `💾 Creating order record:`,
      JSON.stringify(orderRecord, null, 2)
    );

    await adminDb
      .collection("orders")
      .doc(orderData.id)
      .set(orderRecord, { merge: true });

    console.log(`✅ Created order record ${orderData.id}`);
  } else {
    console.error(`❌ No user found with email: ${customerEmail}`);
    throw new Error(`User not found: ${customerEmail}`);
  }
}

// Handle subscription cancellation - adapted for your structure
async function handleSubscriptionCanceled(subscriptionData) {
  console.log("❌ SUBSCRIPTION CANCELED EVENT DETECTED!");
  console.log(
    "📦 Subscription data:",
    JSON.stringify(subscriptionData, null, 2)
  );

  const subscriptionId = subscriptionData.id;
  const currentPeriodEnd = subscriptionData.current_period_end;

  if (!subscriptionId) {
    console.error("❌ No subscription ID found");
    throw new Error("No subscription ID found");
  }

  // Find user by subscription ID
  console.log(`🔍 Searching for user with subscription ID: ${subscriptionId}`);
  const userQuery = await adminDb
    .collection("users")
    .where("subscriptionId", "==", subscriptionId)
    .limit(1)
    .get();

  if (!userQuery.empty) {
    const userDoc = userQuery.docs[0];

    console.log(`✅ Found user ${userDoc.id} with canceled subscription`);

    // Calculate when access should end
    let subscriptionEndsAt;

    if (currentPeriodEnd) {
      // Check if it's already an ISO string or needs conversion from timestamp
      const endsAtDate = isNaN(Date.parse(currentPeriodEnd))
        ? new Date(currentPeriodEnd * 1000)
        : new Date(currentPeriodEnd);

      if (isNaN(endsAtDate.getTime())) {
        console.error("❌ Invalid current_period_end date:", currentPeriodEnd);
        // Fallback: 30 days from now if we don't have valid end date
        subscriptionEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        console.log(
          `📅 Using fallback date (30 days): ${subscriptionEndsAt.toISOString()}`
        );
      } else {
        subscriptionEndsAt = endsAtDate;
        console.log(
          `📅 Using current_period_end: ${currentPeriodEnd} -> ${subscriptionEndsAt.toISOString()}`
        );
      }
    } else {
      // Fallback: 30 days from now if we don't have valid end date
      subscriptionEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      console.log(
        `📅 Using fallback date (30 days): ${subscriptionEndsAt.toISOString()}`
      );
    }

    // Validate the date before using it
    if (isNaN(subscriptionEndsAt.getTime())) {
      console.error("❌ Invalid date calculated, using fallback");
      subscriptionEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    // Mark as canceled but keep access until period ends
    const updateData = {
      subscriptionStatus: "canceled",
      canceledAt: new Date(),
      subscriptionEndsAt: subscriptionEndsAt,
      willRenew: false,
      updatedAt: new Date(),
      webhookProcessedAt: new Date(),
      // activeMember stays TRUE - will be checked in auth verification
    };

    console.log(
      `💾 Marking subscription as canceled (access until ${subscriptionEndsAt.toISOString()}):`,
      JSON.stringify(updateData, null, 2)
    );

    await userDoc.ref.update(updateData);

    console.log(
      `✅ User ${
        userDoc.id
      } marked as canceled but access maintained until ${subscriptionEndsAt.toISOString()}`
    );

    // Log cancellation event
    await adminDb.collection("subscription_events").add({
      userId: userDoc.id,
      subscriptionId: subscriptionId,
      eventType: "canceled",
      canceledAt: new Date(),
      accessEndsAt: subscriptionEndsAt,
      eventData: subscriptionData,
      processedAt: new Date(),
    });
  } else {
    console.error(`❌ No user found with subscription ID: ${subscriptionId}`);
    throw new Error(`User not found for subscription: ${subscriptionId}`);
  }
}

// Handle subscription updates
async function handleSubscriptionUpdated(subscriptionData) {
  console.log("🔄 SUBSCRIPTION UPDATED EVENT DETECTED!");
  console.log(
    "📦 Subscription data:",
    JSON.stringify(subscriptionData, null, 2)
  );

  const subscriptionId = subscriptionData.id;
  const status = subscriptionData.status;
  const cancelAtPeriodEnd = subscriptionData.cancel_at_period_end;
  const canceledAt = subscriptionData.canceled_at;

  if (!subscriptionId) {
    console.error("❌ No subscription ID found");
    return;
  }

  // Find user by subscription ID
  const userQuery = await adminDb
    .collection("users")
    .where("subscriptionId", "==", subscriptionId)
    .limit(1)
    .get();

  if (!userQuery.empty) {
    const userDoc = userQuery.docs[0];

    console.log(`✅ Found user ${userDoc.id} with updated subscription`);

    let subscriptionStatus = status;
    const updateData = {
      updatedAt: new Date(),
      webhookProcessedAt: new Date(),
    };

    // If subscription is marked to cancel at period end, treat it as canceled
    if (cancelAtPeriodEnd && canceledAt) {
      console.log("🔄 Subscription is active but will cancel at period end");
      subscriptionStatus = "canceled";
      updateData.subscriptionStatus = "canceled";
      updateData.canceledAt = new Date(canceledAt);
      updateData.willRenew = false;

      // Calculate when access ends
      const currentPeriodEnd = subscriptionData.current_period_end;
      if (currentPeriodEnd) {
        // Check if it's already an ISO string or needs conversion from timestamp
        const endsAtDate = isNaN(Date.parse(currentPeriodEnd))
          ? new Date(currentPeriodEnd * 1000)
          : new Date(currentPeriodEnd);

        if (isNaN(endsAtDate.getTime())) {
          console.error(
            "❌ Invalid current_period_end date:",
            currentPeriodEnd
          );
          // Fallback to 30 days from now
          updateData.subscriptionEndsAt = new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          );
        } else {
          updateData.subscriptionEndsAt = endsAtDate;
        }

        console.log(
          `📅 Access will end at: ${updateData.subscriptionEndsAt.toISOString()}`
        );
      }

      // Keep activeMember true until the actual end date
      console.log("✅ Keeping activeMember=true until subscription ends");
    } else {
      // Normal subscription update
      updateData.subscriptionStatus = status;

      // If subscription becomes inactive, deactivate user
      if (
        status === "canceled" ||
        status === "expired" ||
        status === "past_due"
      ) {
        updateData.activeMember = false;
        if (status === "canceled") {
          updateData.canceledAt = new Date();
          updateData.willRenew = false;
        }
      } else if (status === "active") {
        updateData.activeMember = true;
        updateData.willRenew = true;
      }
    }

    await userDoc.ref.update(updateData);

    console.log(
      `✅ Updated user ${userDoc.id} subscription status to: ${subscriptionStatus}`
    );

    // Log update event
    await adminDb.collection("subscription_events").add({
      userId: userDoc.id,
      subscriptionId: subscriptionId,
      eventType: "updated",
      newStatus: subscriptionStatus,
      cancelAtPeriodEnd: cancelAtPeriodEnd,
      eventData: subscriptionData,
      processedAt: new Date(),
    });
  } else {
    console.error(`❌ No user found with subscription ID: ${subscriptionId}`);
  }
}

// Handle payment failures
async function handlePaymentFailed(paymentData) {
  console.log("💳 PAYMENT FAILED EVENT DETECTED!");
  console.log("📦 Payment data:", JSON.stringify(paymentData, null, 2));

  const customerEmail = paymentData?.customer?.email;
  const subscriptionId = paymentData?.subscription_id;

  if (!customerEmail && !subscriptionId) {
    console.error("❌ No customer email or subscription ID found");
    return;
  }

  // Find user by email or subscription ID
  let userQuery;
  if (subscriptionId) {
    userQuery = await adminDb
      .collection("users")
      .where("subscriptionId", "==", subscriptionId)
      .limit(1)
      .get();
  } else {
    userQuery = await adminDb
      .collection("users")
      .where("email", "==", customerEmail)
      .limit(1)
      .get();
  }

  if (!userQuery.empty) {
    const userDoc = userQuery.docs[0];

    console.log(`⚠️ Payment failed for user ${userDoc.id}`);

    // Update user with payment failure info
    const updateData = {
      lastPaymentFailed: true,
      lastPaymentFailedAt: new Date(),
      updatedAt: new Date(),
      webhookProcessedAt: new Date(),
    };

    await userDoc.ref.update(updateData);

    // Log payment failure event
    await adminDb.collection("subscription_events").add({
      userId: userDoc.id,
      subscriptionId: subscriptionId,
      eventType: "payment_failed",
      eventData: paymentData,
      processedAt: new Date(),
    });

    console.log(`📝 Logged payment failure for user ${userDoc.id}`);
  } else {
    console.error(`❌ No user found for failed payment`);
  }
}
