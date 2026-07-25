import { Webhooks } from "@polar-sh/nextjs";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  isWebhookProcessed,
  markWebhookProcessed,
} from "@/lib/webhook-deduplication";
import { resolvePolarProductTier } from "@/lib/polar";
import { sendPurchaseConfirmationEmail } from "@/lib/purchase-email";

const polarWebhookHandler = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET,
  onOrderPaid: (payload) => processWebhook(payload, handleOrderPaid),
  onOrderRefunded: (payload) => processWebhook(payload, handleOrderRefunded),
  onOrderUpdated: (payload) => processWebhook(payload, handleOrderUpdated),
  onSubscriptionCreated: (payload) =>
    processWebhook(payload, handleSubscriptionCreated),
  onSubscriptionActive: (payload) =>
    processWebhook(payload, handleSubscriptionActive),
  onSubscriptionUpdated: (payload) =>
    processWebhook(payload, handleSubscriptionUpdated),
  onSubscriptionCanceled: (payload) =>
    processWebhook(payload, handleSubscriptionCanceled),
  onSubscriptionUncanceled: (payload) =>
    processWebhook(payload, handleSubscriptionUncanceled),
  onSubscriptionRevoked: (payload) =>
    processWebhook(payload, handleSubscriptionRevoked),
  onCustomerStateChanged: (payload) =>
    processWebhook(payload, handleCustomerStateChanged),
});

// Polar emits events (e.g. member.created) that our pinned @polar-sh/sdk
// version doesn't know how to parse. The SDK throws an SDKValidationError
// ("Unknown event type: ...") *after* the signature has already verified, which
// the Webhooks() wrapper rethrows as a 500 — so Polar keeps retrying forever.
// Acknowledge those with a 200 so they're dropped instead of retried. Signature
// failures still surface as the wrapper's 403, and real handler errors (which
// we *do* want Polar to retry) still bubble up as 500s.
function isUnknownEventTypeError(error) {
  for (let err = error; err; err = err?.cause) {
    if (typeof err?.rawMessage === "string" && err.rawMessage.includes("Unknown event type")) {
      return true;
    }
    if (typeof err?.message === "string" && err.message.includes("Unknown event type")) {
      return true;
    }
    if (err?.cause === err) break;
  }
  return false;
}

export async function POST(request) {
  try {
    return await polarWebhookHandler(request);
  } catch (error) {
    if (isUnknownEventTypeError(error)) {
      console.warn(
        "Ignoring unhandled Polar webhook event type:",
        error?.cause?.rawValue?.type || error?.rawValue?.type || "unknown"
      );
      return NextResponse.json({ received: true, ignored: true });
    }
    throw error;
  }
}

async function processWebhook(payload, handler) {
  const eventId = payload.id || `${payload.type}_${payload.data?.id}`;
  if (await isWebhookProcessed(eventId, payload.type)) {
    return;
  }

  await handler(payload.data, payload);
  await markWebhookProcessed(eventId, payload.type, payload);
}

function getCustomerId(data) {
  return data?.customer_id || data?.customerId || data?.customer?.id || null;
}

function getCustomerEmail(data) {
  return data?.customer?.email || data?.customer_email || data?.customerEmail || null;
}

function getSubscriptionId(data) {
  return data?.subscription_id || data?.subscriptionId || data?.subscription?.id || data?.id || null;
}

function getMetadataUid(data) {
  return (
    data?.metadata?.uid ||
    data?.customer?.external_id ||
    data?.customer?.externalId ||
    data?.external_customer_id ||
    null
  );
}

function getMetadataTier(data) {
  const productId =
    data?.product_id ||
    data?.productId ||
    data?.product?.id ||
    data?.subscription?.product_id ||
    data?.subscription?.productId ||
    data?.subscription?.product?.id ||
    data?.checkout?.product_id ||
    data?.checkout?.productId ||
    data?.checkout?.product?.id ||
    null;
  const productTier = resolvePolarProductTier(productId);
  if (productTier) return productTier;

  const metadataTier =
    data?.metadata?.tier ||
    data?.subscription?.metadata?.tier ||
    data?.checkout?.metadata?.tier ||
    null;
  return metadataTier === "company"
    ? "company"
    : metadataTier === "member"
    ? "member"
    : null;
}

function parsePolarDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    return new Date(value < 100000000000 ? value * 1000 : value);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getCurrentPeriodEnd(data) {
  return parsePolarDate(
    data?.current_period_end ||
      data?.currentPeriodEnd ||
      data?.subscription?.current_period_end ||
      data?.subscription?.currentPeriodEnd
  );
}

async function findUserForPolarData(data) {
  const metadataUid = getMetadataUid(data);
  if (metadataUid) {
    const userDoc = await adminDb.collection("users").doc(metadataUid).get();
    if (userDoc.exists) {
      return userDoc;
    }
  }

  const customerId = getCustomerId(data);
  if (customerId) {
    const byCustomer = await adminDb
      .collection("users")
      .where("polarCustomerId", "==", customerId)
      .limit(1)
      .get();
    if (!byCustomer.empty) {
      return byCustomer.docs[0];
    }
  }

  const customerEmail = getCustomerEmail(data);
  if (customerEmail) {
    const byEmail = await adminDb
      .collection("users")
      .where("email", "==", customerEmail)
      .limit(1)
      .get();
    if (!byEmail.empty) {
      return byEmail.docs[0];
    }
  }

  return null;
}

async function handleOrderPaid(orderData) {
  const userDoc = await findUserForPolarData(orderData);
  if (!userDoc) {
    throw new Error(`No user found for paid Polar order ${orderData?.id}`);
  }

  const subscriptionId = getSubscriptionId(orderData);
  const customerId = getCustomerId(orderData);
  const currentPeriodEnd = getCurrentPeriodEnd(orderData);
  const amount =
    orderData.amount ??
    orderData.total_amount ??
    orderData.subtotal_amount ??
    null;

  const userData = userDoc.data();
  const tier =
    getMetadataTier(orderData) || userData.membershipTier || "member";
  const userUpdate = {
    activeMember: true,
    polarCustomerId: customerId,
    subscriptionStatus: "active",
    willRenew: true,
    ...(tier ? { membershipTier: tier } : {}),
    lastOrderId: orderData.id,
    lastOrderAmount: amount,
    lastPaymentFailed: false,
    updatedAt: new Date(),
    webhookProcessedAt: new Date(),
  };

  if (subscriptionId) {
    userUpdate.subscriptionId = subscriptionId;
  }
  if (currentPeriodEnd) {
    userUpdate.subscriptionEndsAt = currentPeriodEnd;
  }

  await userDoc.ref.update(userUpdate);

  const orderRef = adminDb.collection("orders").doc(orderData.id);
  const existingOrder = await orderRef.get();
  await orderRef.set(
    {
      userId: userDoc.id,
      polarOrderId: orderData.id,
      polarCustomerId: customerId,
      customerEmail: getCustomerEmail(orderData),
      status: orderData.status || "paid",
      amount,
      currency: orderData.currency,
      productId:
        orderData.product_id ||
        orderData.productId ||
        orderData.product?.id ||
        null,
      subscriptionId,
      createdAt:
        parsePolarDate(orderData.created_at || orderData.createdAt) ||
        new Date(),
      paidAt: new Date(),
      webhookProcessedAt: new Date(),
      processed: true,
      purchaseEmailStatus:
        existingOrder.data()?.purchaseEmailStatus === "sent"
          ? "sent"
          : "pending",
    },
    { merge: true }
  );

  if (existingOrder.data()?.purchaseEmailStatus !== "sent") {
    const recipient = userData.email || getCustomerEmail(orderData);
    if (!recipient) {
      await orderRef.set(
        {
          purchaseEmailStatus: "skipped",
          purchaseEmailError: "No customer email address was available",
        },
        { merge: true }
      );
      return;
    }

    try {
      const result = await sendPurchaseConfirmationEmail({
        amount,
        currency: orderData.currency,
        displayName:
          userData.username ||
          userData.displayName ||
          recipient.split("@")[0],
        interval:
          orderData.product?.recurring_interval ||
          orderData.product?.recurringInterval ||
          orderData.subscription?.recurring_interval ||
          null,
        orderId: orderData.id,
        tier,
        to: recipient,
      });
      await orderRef.set(
        {
          purchaseEmailStatus: "sent",
          purchaseEmailId: result.emailId,
          purchaseEmailSentAt: new Date(),
          purchaseEmailError: null,
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Could not send purchase confirmation email:", error);
      await orderRef.set(
        {
          purchaseEmailStatus: "failed",
          purchaseEmailError: String(error?.message || error).slice(0, 500),
        },
        { merge: true }
      );
    }
  }
}

async function handleSubscriptionCreated(subscriptionData) {
  // Fires when the subscription record is created. Access is granted by
  // order.paid / subscription.active — here we just link the record so we
  // never miss the customer/tier association.
  const status = subscriptionData.status || "incomplete";
  await updateSubscriptionUser(
    subscriptionData,
    {
      subscriptionStatus: status,
      // Only grant access if Polar already reports it active.
      activeMember: status === "active",
      willRenew: status === "active",
    },
    { requireUser: false }
  );
}

async function handleSubscriptionActive(subscriptionData) {
  await updateSubscriptionUser(subscriptionData, {
    activeMember: true,
    subscriptionStatus: "active",
    willRenew: true,
    canceledAt: null,
    lastPaymentFailed: false,
  });
}

async function handleSubscriptionUpdated(subscriptionData) {
  const status = subscriptionData.status || "active";
  const cancelAtPeriodEnd =
    subscriptionData.cancel_at_period_end || subscriptionData.cancelAtPeriodEnd;
  const currentPeriodEnd = getCurrentPeriodEnd(subscriptionData);

  // past_due = a renewal payment failed and Polar is retrying. Keep the member's
  // access during the grace window; Polar sends subscription.revoked when it
  // finally gives up.
  const isPastDue = status === "past_due";
  const keepsAccess =
    status === "active" ||
    isPastDue ||
    (status === "canceled" && !!currentPeriodEnd);

  await updateSubscriptionUser(subscriptionData, {
    activeMember: keepsAccess,
    subscriptionStatus: cancelAtPeriodEnd ? "canceled" : status,
    willRenew: !cancelAtPeriodEnd && status === "active",
    lastPaymentFailed: isPastDue,
    canceledAt: cancelAtPeriodEnd
      ? parsePolarDate(subscriptionData.canceled_at || subscriptionData.canceledAt) ||
        new Date()
      : null,
  });
}

async function handleSubscriptionUncanceled(subscriptionData) {
  // Member re-enabled auto-renew before the period ended.
  await updateSubscriptionUser(subscriptionData, {
    activeMember: true,
    subscriptionStatus: "active",
    willRenew: true,
    canceledAt: null,
  });
}

async function handleSubscriptionCanceled(subscriptionData) {
  const currentPeriodEnd = getCurrentPeriodEnd(subscriptionData);
  await updateSubscriptionUser(subscriptionData, {
    activeMember: !!currentPeriodEnd,
    subscriptionStatus: "canceled",
    willRenew: false,
    canceledAt: parsePolarDate(subscriptionData.canceled_at || subscriptionData.canceledAt) || new Date(),
    subscriptionEndsAt: currentPeriodEnd || new Date(),
  });
}

async function handleSubscriptionRevoked(subscriptionData) {
  await updateSubscriptionUser(subscriptionData, {
    activeMember: false,
    subscriptionStatus: "revoked",
    willRenew: false,
    canceledAt: new Date(),
    subscriptionEndsAt: new Date(),
  });
}

async function handleOrderUpdated(orderData) {
  if (orderData.status === "refunded") {
    await handleOrderRefunded(orderData);
  }
}

async function handleOrderRefunded(orderData) {
  await adminDb
    .collection("orders")
    .doc(orderData.id)
    .set(
      {
        status: "refunded",
        refundedAt: new Date(),
        webhookProcessedAt: new Date(),
      },
      { merge: true }
    );

  // Revoke access on a full refund. Partial refunds leave the subscription
  // untouched (Polar will send subscription.* events if it changes state).
  const refundedAmount =
    orderData.refunded_amount ?? orderData.refundedAmount ?? null;
  const total =
    orderData.amount ?? orderData.total_amount ?? orderData.subtotal_amount ?? null;
  const isFullRefund =
    refundedAmount == null || total == null || refundedAmount >= total;

  if (isFullRefund) {
    const userDoc = await findUserForPolarData(orderData);
    if (userDoc) {
      await userDoc.ref.update({
        activeMember: false,
        subscriptionStatus: "refunded",
        willRenew: false,
        updatedAt: new Date(),
        webhookProcessedAt: new Date(),
      });
    }
  }
}

async function handleCustomerStateChanged(customerStateData) {
  const userDoc = await findUserForPolarData(customerStateData);
  if (!userDoc) return;

  await userDoc.ref.update({
    polarCustomerId: getCustomerId(customerStateData),
    customerStateUpdatedAt: new Date(),
    webhookProcessedAt: new Date(),
    updatedAt: new Date(),
  });
}

async function updateSubscriptionUser(subscriptionData, state, options = {}) {
  const userDoc = await findUserForPolarData(subscriptionData);
  if (!userDoc) {
    // subscription.created can arrive before we've linked the customer; don't
    // hard-fail (which would make Polar retry forever). order.paid/active will
    // re-run this with a resolvable user.
    if (options.requireUser === false) {
      console.warn(
        `No user yet for Polar subscription ${subscriptionData?.id}; deferring.`
      );
      return;
    }
    throw new Error(`No user found for Polar subscription ${subscriptionData?.id}`);
  }

  const currentPeriodEnd =
    state.subscriptionEndsAt || getCurrentPeriodEnd(subscriptionData);
  const subscriptionId = getSubscriptionId(subscriptionData);
  const tier = getMetadataTier(subscriptionData);
  const updateData = {
    polarCustomerId: getCustomerId(subscriptionData),
    subscriptionId,
    ...(tier ? { membershipTier: tier } : {}),
    ...state,
    updatedAt: new Date(),
    webhookProcessedAt: new Date(),
  };

  if (currentPeriodEnd) {
    updateData.subscriptionEndsAt = currentPeriodEnd;
  }

  await userDoc.ref.update(updateData);

  await adminDb.collection("subscription_events").add({
    userId: userDoc.id,
    subscriptionId,
    eventType: state.subscriptionStatus,
    eventData: subscriptionData,
    processedAt: new Date(),
    accessEndsAt: updateData.subscriptionEndsAt || null,
  });
}
