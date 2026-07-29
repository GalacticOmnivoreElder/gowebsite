export function normalizeSubscriptionTransition({
  cancelAtPeriodEnd = false,
  currentPeriodEnd = null,
  eventType,
  now = new Date(),
  status = "incomplete",
}) {
  const accessThroughPeriod =
    currentPeriodEnd instanceof Date &&
    Number.isFinite(currentPeriodEnd.getTime()) &&
    currentPeriodEnd.getTime() > now.getTime();

  if (eventType === "subscription.active") {
    return {
      activeMember: true,
      subscriptionStatus: "active",
      willRenew: true,
      lastPaymentFailed: false,
    };
  }

  if (eventType === "subscription.uncanceled") {
    return {
      activeMember: true,
      subscriptionStatus: "active",
      willRenew: true,
    };
  }

  if (eventType === "subscription.canceled") {
    return {
      activeMember: accessThroughPeriod,
      subscriptionStatus: "canceled",
      willRenew: false,
    };
  }

  if (eventType === "subscription.revoked") {
    return {
      activeMember: false,
      subscriptionStatus: "revoked",
      willRenew: false,
    };
  }

  if (eventType === "subscription.updated") {
    const isPastDue = status === "past_due";
    const effectiveStatus = cancelAtPeriodEnd ? "canceled" : status;
    return {
      activeMember:
        status === "active" ||
        isPastDue ||
        (status === "canceled" && accessThroughPeriod),
      subscriptionStatus: effectiveStatus,
      willRenew: !cancelAtPeriodEnd && status === "active",
      lastPaymentFailed: isPastDue,
    };
  }

  return {
    activeMember: status === "active",
    subscriptionStatus: status,
    willRenew: status === "active",
  };
}

export function normalizeRefundTransition({
  refundedAmount = null,
  totalAmount = null,
}) {
  const refund = Number(refundedAmount);
  const total = Number(totalAmount);
  const hasAmounts =
    refundedAmount != null &&
    totalAmount != null &&
    Number.isFinite(refund) &&
    Number.isFinite(total);
  const isFullRefund = !hasAmounts || refund >= total;

  return {
    isFullRefund,
    revokeEntitlement: isFullRefund,
    orderStatus: isFullRefund ? "refunded" : "partially_refunded",
  };
}
