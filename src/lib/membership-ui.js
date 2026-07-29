export function isSubscriptionEnding({ subscriptionStatus, willRenew }) {
  return subscriptionStatus === "canceled" || willRenew === false;
}

export function canChooseMembershipPlan({
  hasActiveSubscription,
  currentTier,
  pendingTier,
  targetTier = "member",
  subscriptionStatus,
  willRenew,
}) {
  if (!hasActiveSubscription) return true;

  if (isSubscriptionEnding({ subscriptionStatus, willRenew })) return true;

  if (pendingTier) return false;

  return currentTier === "member" && targetTier === "company";
}
