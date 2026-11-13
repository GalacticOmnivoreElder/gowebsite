export function isSubscriptionEnding({ subscriptionStatus, willRenew }) {
  return subscriptionStatus === "canceled" || willRenew === false;
}

export function canChooseMembershipPlan({
  hasActiveSubscription,
}) {
  return !hasActiveSubscription;
}
