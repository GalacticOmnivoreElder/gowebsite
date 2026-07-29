import {
  getPolarProduct,
  getPolarSubscription,
  resolvePolarProductId,
  resolvePolarProductTier,
} from "@/lib/polar";

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active"]);

export class SubscriptionUpgradeError extends Error {
  constructor(message, code, status = 409) {
    super(message);
    this.name = "SubscriptionUpgradeError";
    this.code = code;
    this.status = status;
  }
}

export function getPendingSubscriptionUpdate(subscription) {
  const pending =
    subscription?.pending_update || subscription?.pendingUpdate || null;
  if (!pending) return null;

  const productId = pending.product_id || pending.productId || null;
  const appliesAt = pending.applies_at || pending.appliesAt || null;
  if (!productId || !appliesAt) return null;

  return {
    id: pending.id || null,
    productId,
    appliesAt,
  };
}

export function getSubscriptionProductId(subscription) {
  return (
    subscription?.product_id ||
    subscription?.productId ||
    subscription?.product?.id ||
    null
  );
}

export function getSubscriptionCustomerId(subscription) {
  return (
    subscription?.customer_id ||
    subscription?.customerId ||
    subscription?.customer?.id ||
    null
  );
}

function getRecurringPrice(product, interval) {
  const recurringInterval = interval === "annual" ? "year" : "month";
  const prices = Array.isArray(product?.prices) ? product.prices : [];
  const price = prices.find((candidate) => {
    const candidateInterval =
      candidate?.recurring_interval ||
      candidate?.recurringInterval ||
      product?.recurring_interval ||
      product?.recurringInterval;
    const isArchived =
      candidate?.is_archived === true || candidate?.isArchived === true;
    return candidateInterval === recurringInterval && !isArchived;
  });

  const amount = price?.price_amount ?? price?.priceAmount ?? null;
  const currency =
    price?.price_currency ||
    price?.priceCurrency ||
    product?.price_currency ||
    product?.priceCurrency ||
    null;

  if (!Number.isInteger(amount) || amount < 0 || !currency) {
    throw new SubscriptionUpgradeError(
      "Polar did not return a fixed recurring price for this Business plan.",
      "target_price_unavailable",
      503
    );
  }

  return {
    amount,
    currency: String(currency).toUpperCase(),
    interval: recurringInterval,
  };
}

function normalizeDate(value) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export async function buildBusinessUpgradePreview(user, interval) {
  const normalizedInterval = interval === "annual" ? "annual" : "monthly";
  const userData = user?.userData || {};

  if (!user?.activeMember || user?.membershipTier !== "member") {
    throw new SubscriptionUpgradeError(
      "An active Community membership is required for this upgrade.",
      "community_membership_required"
    );
  }
  if (
    userData.subscriptionStatus === "canceled" ||
    userData.willRenew === false
  ) {
    throw new SubscriptionUpgradeError(
      "This membership is scheduled to end. Reactivate it before upgrading.",
      "subscription_ending"
    );
  }
  if (!userData.subscriptionId || !userData.polarCustomerId) {
    throw new SubscriptionUpgradeError(
      "The Polar subscription could not be identified. Please contact support.",
      "missing_subscription"
    );
  }

  const targetProductId = resolvePolarProductId(
    "company",
    normalizedInterval
  );
  if (!targetProductId || resolvePolarProductTier(targetProductId) !== "company") {
    throw new SubscriptionUpgradeError(
      "The selected Business membership is not configured correctly.",
      "invalid_target_product",
      503
    );
  }

  const [subscription, targetProduct] = await Promise.all([
    getPolarSubscription(userData.subscriptionId),
    getPolarProduct(targetProductId),
  ]);

  if (subscription?.id !== userData.subscriptionId) {
    throw new SubscriptionUpgradeError(
      "Polar returned a different subscription than expected.",
      "subscription_mismatch"
    );
  }
  if (
    getSubscriptionCustomerId(subscription) !== userData.polarCustomerId
  ) {
    throw new SubscriptionUpgradeError(
      "This subscription does not belong to the authenticated billing account.",
      "subscription_owner_mismatch",
      403
    );
  }
  if (!ACTIVE_SUBSCRIPTION_STATUSES.has(subscription?.status)) {
    throw new SubscriptionUpgradeError(
      "Only an active, renewing Community subscription can be upgraded.",
      "subscription_not_active"
    );
  }
  if (subscription?.cancel_at_period_end || subscription?.cancelAtPeriodEnd) {
    throw new SubscriptionUpgradeError(
      "This subscription is scheduled to end. Reactivate it before upgrading.",
      "subscription_ending"
    );
  }

  const currentProductId = getSubscriptionProductId(subscription);
  if (resolvePolarProductTier(currentProductId) !== "member") {
    throw new SubscriptionUpgradeError(
      "Polar does not report Community as the current active plan.",
      "current_product_mismatch"
    );
  }

  const targetPrice = getRecurringPrice(targetProduct, normalizedInterval);
  const currentCurrency = String(subscription.currency || "").toUpperCase();
  if (!currentCurrency || targetPrice.currency !== currentCurrency) {
    throw new SubscriptionUpgradeError(
      "The current and target plans use different currencies and cannot be switched safely.",
      "currency_mismatch"
    );
  }

  const effectiveAt = normalizeDate(
    subscription.current_period_end || subscription.currentPeriodEnd
  );
  if (!effectiveAt) {
    throw new SubscriptionUpgradeError(
      "Polar did not return the next renewal date.",
      "renewal_date_unavailable",
      503
    );
  }

  const pendingUpdate = getPendingSubscriptionUpdate(subscription);
  if (pendingUpdate && pendingUpdate.productId !== targetProductId) {
    throw new SubscriptionUpgradeError(
      "Another subscription change is already scheduled. Manage it from Billing before choosing a different plan.",
      "different_update_pending"
    );
  }

  const currentAmount =
    subscription.amount ??
    subscription.price ??
    userData.lastOrderAmount ??
    null;

  return {
    currentPlan: {
      tier: "member",
      name: subscription?.product?.name || "GO Community",
      amount: Number.isInteger(currentAmount) ? currentAmount : null,
      currency: currentCurrency,
      interval:
        subscription.recurring_interval ||
        subscription.recurringInterval ||
        null,
      hasDiscount: Boolean(
        subscription.discount_id ||
          subscription.discountId ||
          subscription.discount
      ),
    },
    targetPlan: {
      tier: "company",
      name: targetProduct?.name || "GO Business",
      productId: targetProductId,
      amount: targetPrice.amount,
      currency: targetPrice.currency,
      interval: targetPrice.interval,
    },
    effectiveAt: pendingUpdate?.appliesAt || effectiveAt,
    nextRenewalAt: pendingUpdate?.appliesAt || effectiveAt,
    noChargeToday: true,
    priceIsEstimate: true,
    pending: Boolean(pendingUpdate),
    pendingUpdate,
    subscriptionId: subscription.id,
  };
}

export function getPendingUpgradeFirestoreData(preview, pendingUpdate) {
  return {
    pendingMembershipTier: "company",
    pendingMembershipProductId: preview.targetPlan.productId,
    pendingMembershipEffectiveAt:
      pendingUpdate?.appliesAt || preview.effectiveAt,
    pendingMembershipInterval:
      preview.targetPlan.interval === "year" ? "annual" : "monthly",
    pendingMembershipPriceAmount: preview.targetPlan.amount,
    pendingMembershipCurrency: preview.targetPlan.currency,
    pendingMembershipStatus: "scheduled",
    pendingMembershipUpdateId: pendingUpdate?.id || null,
  };
}
