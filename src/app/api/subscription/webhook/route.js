import { Webhooks } from "@polar-sh/nextjs";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  claimWebhookProcessing,
  markWebhookProcessed,
  releaseWebhookProcessing,
} from "@/lib/webhook-deduplication";
import {
  normalizeRefundTransition,
  normalizeSubscriptionTransition,
} from "@/lib/subscription-state";
import {
  getPolarSubscription,
  resolvePolarProductTier,
} from "@/lib/polar";
import { getPendingSubscriptionUpdate } from "@/lib/subscription-upgrade";
import {
  cancelPendingEmailEvents,
  enqueueAdminEmailEvent,
  enqueueEmailEvent,
} from "@/lib/email";

const ONBOARDING_REMINDER_DELAY_MS = 48 * 60 * 60 * 1000;

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
// the Webhooks() wrapper rethrows as a 500 - so Polar keeps retrying forever.
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
  const claimed = await claimWebhookProcessing(
    eventId,
    payload.type,
    payload
  );
  if (!claimed) {
    return;
  }

  try {
    await handler(payload.data, payload);
    await markWebhookProcessed(eventId, payload.type, payload);
  } catch (error) {
    await releaseWebhookProcessing(eventId, payload.type).catch(
      (releaseError) => {
        console.error("webhook_claim_release_failed", {
          eventId,
          eventType: payload.type,
          error: releaseError?.message || "unknown",
        });
      }
    );
    throw error;
  }
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

function getCheckoutId(data) {
  return (
    data?.checkout_id ||
    data?.checkoutId ||
    data?.checkout?.id ||
    data?.subscription?.checkout_id ||
    data?.subscription?.checkoutId ||
    null
  );
}

function getProductId(data) {
  return (
    data?.product_id ||
    data?.productId ||
    data?.product?.id ||
    data?.subscription?.product_id ||
    data?.subscription?.productId ||
    data?.subscription?.product?.id ||
    data?.checkout?.product_id ||
    data?.checkout?.productId ||
    data?.checkout?.product?.id ||
    null
  );
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
  const productId = getProductId(data);
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

function getRecurringInterval(data) {
  return (
    data?.recurring_interval ||
    data?.recurringInterval ||
    data?.product?.recurring_interval ||
    data?.product?.recurringInterval ||
    data?.subscription?.recurring_interval ||
    data?.subscription?.recurringInterval ||
    null
  );
}

function getOrderAmount(data) {
  return (
    data?.total_amount ??
    data?.totalAmount ??
    data?.amount ??
    data?.subtotal_amount ??
    data?.subtotalAmount ??
    null
  );
}

function getActivationDate(data, payload) {
  return (
    parsePolarDate(
      data?.started_at ||
        data?.startedAt ||
        data?.current_period_start ||
        data?.currentPeriodStart ||
        data?.subscription?.started_at ||
        data?.subscription?.startedAt ||
        data?.subscription?.current_period_start ||
        data?.subscription?.currentPeriodStart ||
        data?.created_at ||
        data?.createdAt
    ) || parsePolarDate(payload?.timestamp)
  );
}

function getMembershipActivationKey(data) {
  const checkoutId = getCheckoutId(data);
  if (checkoutId) return `checkout:${checkoutId}`;
  const subscriptionId = getSubscriptionId(data);
  if (subscriptionId) return `subscription:${subscriptionId}`;
  return null;
}

function getCanonicalMembershipActivationKey(data, previousUserData = {}) {
  const activationKey = getMembershipActivationKey(data);
  const previousActivationKey =
    previousUserData?.membershipActivationPurchaseKey || null;
  if (!previousActivationKey) return activationKey;
  if (previousActivationKey === activationKey) return previousActivationKey;

  const subscriptionId = getSubscriptionId(data);
  if (
    subscriptionId &&
    previousUserData?.subscriptionId === subscriptionId
  ) {
    return previousActivationKey;
  }

  return activationKey;
}

function getOrderEmailType(orderData, previousUserData, activationKey) {
  const billingReason = String(
    orderData?.billing_reason || orderData?.billingReason || ""
  ).toLowerCase();
  if (billingReason === "subscription_cycle") return "billing.renewal_paid";
  if (billingReason === "subscription_update") return null;
  if (billingReason === "subscription_create") {
    return "billing.membership_activated";
  }
  if (
    activationKey &&
    previousUserData?.membershipActivationPurchaseKey === activationKey
  ) {
    return "billing.membership_activated";
  }
  return !previousUserData?.activeMember || !previousUserData?.lastOrderId
    ? "billing.membership_activated"
    : "billing.renewal_paid";
}

async function enqueueOnboardingReminder({
  userId,
  recipient,
  tier,
  userData,
}) {
  if (!recipient || userData?.onboardingCompleted === true) return null;
  const now = new Date();
  return enqueueEmailEvent({
    type: "onboarding.incomplete_reminder",
    eventId: `${userId}-membership-onboarding`,
    userId,
    recipient,
    scheduledFor: new Date(now.getTime() + ONBOARDING_REMINDER_DELAY_MS),
    data: {
      displayName: userData?.username || userData?.name || null,
      tier: tier || userData?.membershipTier || null,
    },
  });
}

async function enqueueMembershipActivationEmail({
  sourceData,
  payload,
  userDoc,
  userData,
  amount,
  amountLabel,
  activationKey: activationKeyOverride,
}) {
  const recipient = userData?.email;
  const activationKey =
    activationKeyOverride || getMembershipActivationKey(sourceData);
  if (!recipient || !activationKey) return null;

  const tier = getMetadataTier(sourceData) || userData.membershipTier || null;
  const result = await enqueueEmailEvent({
    type: "billing.membership_activated",
    eventId: activationKey,
    userId: userDoc.id,
    recipient,
    data: {
      displayName: userData.username || userData.name || null,
      tier,
      interval: getRecurringInterval(sourceData),
      amount,
      amountLabel,
      currency:
        sourceData?.currency ||
        sourceData?.subscription?.currency ||
        null,
      activationDate: getActivationDate(sourceData, payload),
      nextRenewalDate: getCurrentPeriodEnd(sourceData),
      willRenew:
        sourceData?.cancel_at_period_end === true ||
        sourceData?.cancelAtPeriodEnd === true
          ? false
          : true,
    },
  });

  await enqueueOnboardingReminder({
    userId: userDoc.id,
    recipient,
    tier,
    userData,
  });
  return { ...result, activationKey };
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

async function handleOrderPaid(orderData, payload) {
  const userDoc = await findUserForPolarData(orderData);
  if (!userDoc) {
    throw new Error(`No user found for paid Polar order ${orderData?.id}`);
  }

  const subscriptionId = getSubscriptionId(orderData);
  const customerId = getCustomerId(orderData);
  const currentPeriodEnd = getCurrentPeriodEnd(orderData);
  const amount = getOrderAmount(orderData);

  const tier = getMetadataTier(orderData);
  const interval = getRecurringInterval(orderData);
  const previousUserData = userDoc.data();
  const activationKey = getCanonicalMembershipActivationKey(
    orderData,
    previousUserData
  );
  const emailType = getOrderEmailType(
    orderData,
    previousUserData,
    activationKey
  );
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
    ...(emailType === "billing.membership_activated" && activationKey
      ? {
          membershipActivationPurchaseKey: activationKey,
          membershipActivatedAt:
            getActivationDate(orderData, payload) || new Date(),
        }
      : {}),
    ...(tier === previousUserData.pendingMembershipTier
      ? {
          pendingMembershipTier: null,
          pendingMembershipProductId: null,
          pendingMembershipEffectiveAt: null,
          pendingMembershipInterval: null,
          pendingMembershipPriceAmount: null,
          pendingMembershipCurrency: null,
          pendingMembershipStatus: null,
          pendingMembershipUpdateId: null,
        }
      : {}),
  };

  if (subscriptionId) {
    userUpdate.subscriptionId = subscriptionId;
  }
  if (currentPeriodEnd) {
    userUpdate.subscriptionEndsAt = currentPeriodEnd;
  }

  await userDoc.ref.update(userUpdate);

  await adminDb
    .collection("orders")
    .doc(orderData.id)
    .set(
      {
        userId: userDoc.id,
        polarOrderId: orderData.id,
        polarCustomerId: customerId,
        customerEmail: getCustomerEmail(orderData),
        status: orderData.status || "paid",
        amount,
        currency: orderData.currency,
        productId: getProductId(orderData),
        subscriptionId,
        createdAt: parsePolarDate(orderData.created_at || orderData.createdAt) || new Date(),
        paidAt: new Date(),
        webhookProcessedAt: new Date(),
        processed: true,
      },
      { merge: true }
    );

  if (previousUserData.email && emailType) {
    if (emailType === "billing.membership_activated") {
      await enqueueMembershipActivationEmail({
        sourceData: orderData,
        payload,
        userDoc,
        userData: previousUserData,
        amount,
        amountLabel: "Amount paid",
        activationKey,
      });
    } else {
      await enqueueEmailEvent({
        type: emailType,
        eventId: orderData.id,
        userId: userDoc.id,
        recipient: previousUserData.email,
        data: {
          displayName: previousUserData.username || previousUserData.name,
          tier: tier || previousUserData.membershipTier || null,
          interval,
          amount,
          currency: orderData.currency,
          endsAt: currentPeriodEnd,
        },
      });
    }

    if (currentPeriodEnd) {
      const reminderDays = interval === "year" ? 7 : 3;
      const scheduledFor = new Date(
        currentPeriodEnd.getTime() - reminderDays * 24 * 60 * 60 * 1000
      );
      if (scheduledFor > new Date()) {
        await enqueueEmailEvent({
          type: "billing.renewal_reminder",
          eventId: `${subscriptionId || orderData.id}-${currentPeriodEnd.toISOString()}`,
          userId: userDoc.id,
          recipient: previousUserData.email,
          scheduledFor,
          data: {
            tier: tier || previousUserData.membershipTier || null,
            endsAt: currentPeriodEnd,
          },
        });
      }
    }
  }
  if (!previousUserData.activeMember) {
    await enqueueAdminEmailEvent({
      type: "admin.membership_activated",
      eventId: orderData.id,
      data: {
        subject: "New Galactic Omnivore membership",
        heading: "Membership activated",
        message: `A ${tier || "member"} membership was activated.`,
        ctaLabel: "Open subscriptions",
        ctaUrl: `${
          process.env.NEXT_PUBLIC_SITE_URL ||
          "https://www.galacticomnivore.com"
        }/admin/subscriptions`,
      },
    });
  }
}

async function handleSubscriptionCreated(subscriptionData) {
  // Fires when the subscription record is created. Access is granted by
  // order.paid / subscription.active - here we just link the record so we
  // never miss the customer/tier association.
  const status = subscriptionData.status || "incomplete";
  await updateSubscriptionUser(
    subscriptionData,
    normalizeSubscriptionTransition({
      eventType: "subscription.created",
      status,
    }),
    { requireUser: false }
  );
}

async function handleSubscriptionActive(subscriptionData, payload) {
  const result = await updateSubscriptionUser(subscriptionData, {
    ...normalizeSubscriptionTransition({
      eventType: "subscription.active",
      status: subscriptionData.status,
    }),
    canceledAt: null,
  });
  const previous = result?.previousData;
  const activationKey = getCanonicalMembershipActivationKey(
    subscriptionData,
    previous
  );
  const previousStatus = previous?.subscriptionStatus;
  const paymentRecovery =
    previousStatus === "past_due" || previous?.lastPaymentFailed === true;
  const shouldAttemptActivation =
    previous?.email &&
    !paymentRecovery &&
    (!previous.activeMember ||
      !previous.lastOrderId ||
      previous.membershipActivationPurchaseKey ===
        activationKey);

  if (shouldAttemptActivation) {
    const queued = await enqueueMembershipActivationEmail({
      sourceData: subscriptionData,
      payload,
      userDoc: { id: result.userId },
      userData: previous,
      amount: subscriptionData.amount ?? null,
      amountLabel: "Plan amount",
      activationKey,
    });
    if (queued?.activationKey && result.userRef) {
      await result.userRef.update({
        membershipActivationPurchaseKey: queued.activationKey,
        membershipActivatedAt:
          getActivationDate(subscriptionData, payload) || new Date(),
        updatedAt: new Date(),
      });
    }
  }
}

async function handleSubscriptionUpdated(subscriptionData) {
  const linkedUser = await findUserForPolarData(subscriptionData);
  const previousLinkedData = linkedUser?.data?.() || {};
  const payloadIncludesPendingUpdate =
    Object.hasOwn(subscriptionData || {}, "pending_update") ||
    Object.hasOwn(subscriptionData || {}, "pendingUpdate");
  let authoritativeData = subscriptionData;

  // The pinned webhook adapter predates Polar's pending_update field and may
  // strip it during validation. Once an upgrade is known to be pending, fetch
  // the current subscription so a scheduled, canceled, superseded, or applied
  // update cannot be mistaken for an immediate entitlement change.
  if (
    previousLinkedData.pendingMembershipTier &&
    !payloadIncludesPendingUpdate
  ) {
    authoritativeData = await getPolarSubscription(
      getSubscriptionId(subscriptionData)
    );
  }

  const status = authoritativeData.status || "active";
  const cancelAtPeriodEnd =
    authoritativeData.cancel_at_period_end ||
    authoritativeData.cancelAtPeriodEnd;
  const currentPeriodEnd = getCurrentPeriodEnd(authoritativeData);

  // past_due keeps access during Polar's retry window. A later revoked event
  // ends access.
  const isPastDue = status === "past_due";
  const result = await updateSubscriptionUser(authoritativeData, {
    ...normalizeSubscriptionTransition({
      cancelAtPeriodEnd,
      currentPeriodEnd,
      eventType: "subscription.updated",
      status,
    }),
    canceledAt: cancelAtPeriodEnd
      ? parsePolarDate(subscriptionData.canceled_at || subscriptionData.canceledAt) ||
        new Date()
      : null,
  });
  const previous = result?.previousData;
  const nextTier = getMetadataTier(authoritativeData);
  if (previous?.email && isPastDue && previous.subscriptionStatus !== "past_due") {
    await enqueueEmailEvent({
      type: "billing.payment_failed",
      eventId: `${getSubscriptionId(authoritativeData)}-${getCurrentPeriodEnd(authoritativeData)?.toISOString() || "current"}`,
      userId: result.userId,
      recipient: previous.email,
      data: {
        displayName: previous.username || previous.name,
        endsAt: getCurrentPeriodEnd(authoritativeData),
      },
    });
    await enqueueAdminEmailEvent({
      type: "admin.payment_failure",
      eventId: `${getSubscriptionId(authoritativeData)}-${getCurrentPeriodEnd(authoritativeData)?.toISOString() || "current"}`,
      data: {
        subject: "Membership payment is past due",
        heading: "Payment failure",
        message: "A member subscription entered the past-due grace period.",
        ctaLabel: "Open subscriptions",
      },
    });
  }
  if (
    previous?.email &&
    nextTier &&
    previous.membershipTier &&
    nextTier !== previous.membershipTier
  ) {
    await enqueueEmailEvent({
      type: "billing.plan_changed",
      eventId: `${getSubscriptionId(authoritativeData)}-${nextTier}`,
      userId: result.userId,
      recipient: previous.email,
      data: {
        previousTier: previous.membershipTier,
        tier: nextTier,
        effectiveAt: new Date(),
        endsAt: getCurrentPeriodEnd(authoritativeData),
      },
    });
  }
}

async function handleSubscriptionUncanceled(subscriptionData) {
  // Member re-enabled auto-renew before the period ended.
  const result = await updateSubscriptionUser(subscriptionData, {
    ...normalizeSubscriptionTransition({
      eventType: "subscription.uncanceled",
      status: subscriptionData.status,
    }),
    canceledAt: null,
  });
  await cancelPendingEmailEvents({
    userId: result?.userId,
    eventType: "billing.access_expiring",
    reason: "subscription_reactivated",
  });
  if (result?.previousData?.email) {
    await enqueueEmailEvent({
      type: "billing.reactivated",
      eventId: getSubscriptionId(subscriptionData),
      userId: result.userId,
      recipient: result.previousData.email,
      data: { endsAt: getCurrentPeriodEnd(subscriptionData) },
    });
  }
}

async function handleSubscriptionCanceled(subscriptionData) {
  const currentPeriodEnd = getCurrentPeriodEnd(subscriptionData);
  const result = await updateSubscriptionUser(subscriptionData, {
    ...normalizeSubscriptionTransition({
      currentPeriodEnd,
      eventType: "subscription.canceled",
      status: subscriptionData.status,
    }),
    canceledAt: parsePolarDate(subscriptionData.canceled_at || subscriptionData.canceledAt) || new Date(),
    subscriptionEndsAt: currentPeriodEnd || new Date(),
  });
  await cancelPendingEmailEvents({
    userId: result?.userId,
    eventType: "billing.renewal_reminder",
    reason: "subscription_cancelled",
  });
  if (result?.previousData?.email) {
    await enqueueEmailEvent({
      type: "billing.cancellation_scheduled",
      eventId: getSubscriptionId(subscriptionData),
      userId: result.userId,
      recipient: result.previousData.email,
      data: { endsAt: currentPeriodEnd || new Date() },
    });
    const reminderAt = currentPeriodEnd
      ? new Date(currentPeriodEnd.getTime() - 3 * 24 * 60 * 60 * 1000)
      : null;
    if (reminderAt && reminderAt > new Date()) {
      await enqueueEmailEvent({
        type: "billing.access_expiring",
        eventId: `${getSubscriptionId(subscriptionData)}-${currentPeriodEnd.toISOString()}`,
        userId: result.userId,
        recipient: result.previousData.email,
        scheduledFor: reminderAt,
        data: { endsAt: currentPeriodEnd },
      });
    }
  }
  await enqueueAdminEmailEvent({
    type: "admin.subscription_cancelled",
    eventId: getSubscriptionId(subscriptionData),
    data: {
      subject: "Membership cancellation scheduled",
      heading: "Subscription cancelled",
      message: `A membership cancellation was scheduled${currentPeriodEnd ? ` through ${currentPeriodEnd.toISOString()}` : ""}.`,
      ctaLabel: "Open subscriptions",
    },
  });
}

async function handleSubscriptionRevoked(subscriptionData) {
  const result = await updateSubscriptionUser(subscriptionData, {
    ...normalizeSubscriptionTransition({
      eventType: "subscription.revoked",
      status: subscriptionData.status,
    }),
    canceledAt: new Date(),
    subscriptionEndsAt: new Date(),
  });
  await Promise.all([
    cancelPendingEmailEvents({
      userId: result?.userId,
      eventType: "billing.renewal_reminder",
      reason: "subscription_revoked",
    }),
    cancelPendingEmailEvents({
      userId: result?.userId,
      eventType: "billing.access_expiring",
      reason: "subscription_revoked",
    }),
  ]);
  if (result?.previousData?.email) {
    await enqueueEmailEvent({
      type: "billing.access_revoked",
      eventId: getSubscriptionId(subscriptionData),
      userId: result.userId,
      recipient: result.previousData.email,
      data: {},
    });
  }
}

async function handleOrderUpdated(orderData) {
  if (orderData.status === "refunded") {
    await handleOrderRefunded(orderData);
  }
}

async function handleOrderRefunded(orderData) {
  const refundedAmount =
    orderData.refunded_amount ?? orderData.refundedAmount ?? null;
  const total =
    orderData.amount ?? orderData.total_amount ?? orderData.subtotal_amount ?? null;
  const refundTransition = normalizeRefundTransition({
    refundedAmount,
    totalAmount: total,
  });
  const { isFullRefund } = refundTransition;

  await adminDb
    .collection("orders")
    .doc(orderData.id)
    .set(
      {
        status: refundTransition.orderStatus,
        refundedAmount,
        refundedAt: new Date(),
        webhookProcessedAt: new Date(),
      },
      { merge: true }
    );

  // Revoke access on a full refund. Partial refunds leave the subscription
  // untouched (Polar will send subscription.* events if it changes state).
  const userDoc = await findUserForPolarData(orderData);
  if (isFullRefund) {
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
  if (userDoc) {
    const userData = userDoc.data();
    if (userData.email) {
      await enqueueEmailEvent({
        type: "billing.refund_processed",
        eventId: orderData.id,
        userId: userDoc.id,
        recipient: userData.email,
        data: {
          isFullRefund,
          amount: refundedAmount,
          currency: orderData.currency,
        },
      });
    }
  }
  if (isFullRefund) {
    await enqueueAdminEmailEvent({
      type: "admin.refund_processed",
      eventId: orderData.id,
      data: {
        subject: "Full Polar refund processed",
        heading: "Full refund processed",
        message: "A full Polar refund was processed and membership access ended.",
        ctaLabel: "Open subscriptions",
      },
    });
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

  const previousData = userDoc.data();
  const currentPeriodEnd =
    state.subscriptionEndsAt || getCurrentPeriodEnd(subscriptionData);
  const subscriptionId = getSubscriptionId(subscriptionData);
  const tier = getMetadataTier(subscriptionData);
  const pendingUpdate = getPendingSubscriptionUpdate(subscriptionData);
  const hasPendingUpdateField =
    Object.hasOwn(subscriptionData || {}, "pending_update") ||
    Object.hasOwn(subscriptionData || {}, "pendingUpdate");
  const pendingTier = pendingUpdate
    ? resolvePolarProductTier(pendingUpdate.productId)
    : null;
  const clearedPendingState = {
    pendingMembershipTier: null,
    pendingMembershipProductId: null,
    pendingMembershipEffectiveAt: null,
    pendingMembershipInterval: null,
    pendingMembershipPriceAmount: null,
    pendingMembershipCurrency: null,
    pendingMembershipStatus: null,
    pendingMembershipUpdateId: null,
  };
  const pendingState = pendingUpdate
    ? {
        pendingMembershipTier: pendingTier,
        pendingMembershipProductId: pendingUpdate.productId,
        pendingMembershipEffectiveAt: parsePolarDate(
          pendingUpdate.appliesAt
        ),
        pendingMembershipStatus: "scheduled",
        pendingMembershipUpdateId: pendingUpdate.id,
      }
    : hasPendingUpdateField && previousData.pendingMembershipTier
    ? clearedPendingState
    : {};
  const updateData = {
    polarCustomerId: getCustomerId(subscriptionData),
    subscriptionId,
    ...(tier ? { membershipTier: tier } : {}),
    ...pendingState,
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
    processedAt: new Date(),
    accessEndsAt: updateData.subscriptionEndsAt || null,
  });
  return {
    userId: userDoc.id,
    userRef: userDoc.ref,
    previousData,
    updateData,
  };
}
