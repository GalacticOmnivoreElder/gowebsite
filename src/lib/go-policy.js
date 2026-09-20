// Pure policy helpers. Billing and approvals are always resolved on the server.
export function policyDate(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  return date && Number.isFinite(date.getTime()) ? date : null;
}

export function isExpiredWorkspace(data = {}, active = false, now = new Date()) {
  if (active) return false;
  const end = policyDate(data.subscriptionEndsAt);
  // New/free accounts never inherit the former-subscriber freeze.
  return Boolean(data.subscriptionId || data.membershipActivationPurchaseKey || data.membershipTier) &&
    (Boolean(end && end <= now) || ['canceled', 'expired', 'revoked', 'refunded', 'unpaid'].includes(data.subscriptionStatus));
}

export function projectAllowance(data = {}, active = false, admin = false) {
  if (admin) return { limit: null, reason: null };
  if (!active) return { limit: 0, reason: 'membership_required' };
  if (data.membershipTier === 'company') {
    const limit = data.businessProjectLimit;
    return Number.isInteger(limit) && limit > 0 && limit <= 10000
      ? { limit, reason: null }
      : { limit: 0, reason: 'business_capacity_required' };
  }
  return { limit: 1, reason: null };
}

export function hasMentorAddon(data = {}, now = new Date()) {
  const end = policyDate(data.mentorAddonEndsAt);
  return data.mentorAddonStatus === 'active' && Boolean(end && end > now);
}

export function isGoReleased(project = {}) {
  return project.releaseApproval?.status === 'approved' &&
    Boolean(project.releaseApproval.reviewedBy && project.releaseApproval.reviewedAt);
}

export function retainedContentAccess(data = {}, content = {}, active = false, now = new Date()) {
  if (active) return true;
  if (['revoked', 'refunded', 'suspended'].includes(data.subscriptionStatus)) return false;
  if (!isExpiredWorkspace(data, false, now)) return false;
  const end = policyDate(data.subscriptionEndsAt);
  // Require dated publication evidence. Undated legacy material needs an explicit grant.
  const published = policyDate(content.publishedAt || content.createdAt);
  return Boolean(end && published && published <= end);
}
