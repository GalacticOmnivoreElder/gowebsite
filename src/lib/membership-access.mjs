// Provider records remain independent: Polar continues to own the legacy flat
// fields. Whop never writes them, so delayed Polar events cannot undo Whop access.
export function accessDate(value) {
  if (!value) return null;
  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function legacySubscriptionActive(data = {}, now = new Date()) {
  if (['incomplete', 'incomplete_expired', 'refunded', 'revoked', 'unpaid'].includes(data.subscriptionStatus)) return false;
  const end = accessDate(data.subscriptionEndsAt);
  return end ? end > now : data.activeMember === true;
}

export function whopSubscriptionActive(record, now = new Date()) {
  return Boolean(record?.paymentVerified && record?.activeMember &&
    ['active', 'past_due'].includes(record.status) && accessDate(record.paidThrough) > now);
}

export function resolveMembershipRecord(data = {}, now = new Date()) {
  const whop = data.whopMembership;
  const legacyActive = legacySubscriptionActive(data, now);
  const whopActive = whopSubscriptionActive(whop, now);
  const ranks = { member: 1, mentor: 2, company: 3 };
  if (whopActive && (!legacyActive || (ranks[whop.tier] || 0) >= (ranks[data.membershipTier] || 1))) {
    return { provider: 'whop', active: true, tier: whop.tier, id: whop.id,
      status: whop.status, endsAt: accessDate(whop.paidThrough), willRenew: !whop.cancelAtPeriodEnd,
      activationKey: `whop:${whop.environment}:${whop.id}`, record: whop };
  }
  return { provider: data.subscriptionId ? 'polar' : null, active: legacyActive,
    tier: legacyActive ? data.membershipTier || 'member' : null, id: data.subscriptionId || null,
    status: data.subscriptionStatus || null, endsAt: accessDate(data.subscriptionEndsAt),
    willRenew: data.willRenew, activationKey: data.membershipActivationPurchaseKey || null };
}
