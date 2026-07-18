export function isSubscriptionEnding({ subscriptionStatus, willRenew }) {
  return subscriptionStatus === "canceled" || willRenew === false;
}

export function canChooseMembershipPlan({
  hasActiveSubscription,
  currentTier,
  targetTier = "member",
  subscriptionStatus,
  willRenew,
}) {
  if (!hasActiveSubscription) return true;

  if (isSubscriptionEnding({ subscriptionStatus, willRenew })) return true;

  return currentTier === "member" && targetTier === "company";
}
