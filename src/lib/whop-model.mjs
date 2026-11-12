export const WHOP_API_VERSION = '2026-11-10-1';
export const WHOP_CATALOG = [
  ['member', 'monthly', 500, 'go-community'],
  ['member', 'annual', 4800, 'go-community-annual'],
  ['mentor', 'monthly', 1500, 'go-mentor'],
  ['mentor', 'annual', 14999, 'go-mentor-annual'],
  ['company', 'monthly', 2999, 'go-business'],
  ['company', 'annual', 29999, 'go-business-annual'],
].map(([tier, interval, amount, slug]) => ({ tier, interval, amount, currency: 'mkd',
  days: interval === 'annual' ? 365 : 30,
  url: `https://whop.com/galacticomnivore-0ec7/${slug}/`,
  envPrefix: `WHOP_${tier.toUpperCase()}_${interval.toUpperCase()}` }));

// Public identifiers, verified against GO's Whop catalogue. Sandbox requires
// separate explicit IDs; production defaults never leak into that environment.
const PRODUCTION_IDS = {
  member_monthly: ['prod_D1WqA38JQwuf8', 'plan_JmVORg4ukobiN'],
  member_annual: ['prod_BpBYHZBubPwKg', 'plan_eAQ712tjBEHhb'],
  mentor_monthly: ['prod_8KFDAPQDsy7QE', 'plan_zcoU1vTYDT9GG'],
  mentor_annual: ['prod_DZP3i6nht01yO', 'plan_znpd9alFPpLXd'],
  company_monthly: ['prod_9pdCcuOxvAtis', 'plan_6JNsFK7cMuJn8'],
  company_annual: ['prod_Q3sLI8rJIGEAA', 'plan_Zg2FUArNdKKm6'],
};

export function whopError(code, status = 503) {
  return Object.assign(new Error(code), { code, status });
}

export function whopConfig(env = process.env) {
  const environment = env.WHOP_ENVIRONMENT;
  if (!['sandbox', 'production'].includes(environment)) throw whopError('whop_environment_missing');
  const accountId = env.WHOP_ACCOUNT_ID;
  const projectId = env.FIREBASE_PROJECT_ID;
  // A sandbox deployment must use an explicitly designated staging database.
  // Do not permit sandbox payments to become production entitlements.
  if (!projectId || projectId !== env.WHOP_FIREBASE_PROJECT_ID ||
      (environment === 'sandbox' && (projectId === env.WHOP_PRODUCTION_FIREBASE_PROJECT_ID ||
       !env.WHOP_PRODUCTION_FIREBASE_PROJECT_ID || env.VERCEL_ENV === 'production'))) {
    throw whopError('whop_firebase_environment_mismatch');
  }
  if (!/^biz_[a-zA-Z0-9]+$/.test(accountId || '') || !env.WHOP_API_KEY) throw whopError('whop_credentials_missing');
  const origin = new URL(env.WHOP_SITE_URL || 'http://invalid.local');
  if (origin.hostname === 'invalid.local' || (origin.protocol !== 'https:' && origin.hostname !== 'localhost')) throw whopError('whop_site_url_invalid');
  return { environment, accountId, token: env.WHOP_API_KEY, siteUrl: origin.origin,
    baseUrl: environment === 'sandbox' ? 'https://sandbox-api.whop.com/api/v1' : 'https://api.whop.com/api/v1',
    catalog: WHOP_CATALOG.map(item => {
      const defaults = environment === 'production' && accountId === 'biz_fXnLxutjLKO8jT'
        ? PRODUCTION_IDS[`${item.tier}_${item.interval}`] : [];
      return { ...item, productId: env[`${item.envPrefix}_PRODUCT_ID`] || defaults[0],
        variantId: env[`${item.envPrefix}_VARIANT_ID`] || defaults[1] };
    }) };
}

export function configuredPlan(config, tier, interval) {
  const plan = config.catalog.find(item => item.tier === tier && item.interval === interval);
  if (!plan) throw whopError('invalid_plan', 400);
  if (!/^prod_\w+$/.test(plan.productId || '') || !/^plan_\w+$/.test(plan.variantId || '')) throw whopError('whop_plan_not_configured');
  return plan;
}

export function validateWhopVariant(variant, product, plan, accountId) {
  const errors = [];
  if (variant.id !== plan.variantId || product.id !== plan.productId || variant.product?.id !== product.id) errors.push('product_variant');
  if (variant.account?.id !== accountId || product.account?.id !== accountId) errors.push('account');
  if (variant.currency !== 'mkd' || variant.billing_type !== 'renewal' || variant.billing_period !== plan.days) errors.push('currency_or_interval');
  // initial_price is an EXTRA setup charge; it is added to renewal_price at checkout.
  if (variant.initial_price !== 0 || variant.renewal_price !== plan.amount || Number(variant.initial_price_due?.amount) !== plan.amount) errors.push('price');
  if (variant.trial_period_days || variant.split_pay_required_payments || variant.expiration_days) errors.push('trial_or_installments');
  if (variant.release_method !== 'buy_now' || variant.visibility === 'archived') errors.push('not_purchasable');
  if (errors.length) throw Object.assign(whopError('whop_catalog_mismatch'), { fields: errors });
  return { taxType: variant.tax_type, collectTax: variant.collect_tax,
    cancellationDiscount: variant.offer_cancel_discount, adaptivePricing: variant.adaptive_pricing_enabled };
}

export function trustedWhopUrl(value, environment) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && url.hostname === (environment === 'sandbox' ? 'sandbox.whop.com' : 'whop.com') && !url.username && !url.password) return url.href;
  } catch { /* Missing provider URL. */ }
  throw whopError('whop_url_invalid');
}

export function paymentEvidence(payment, membership, config) {
  return payment.account_id === config.accountId && payment.membership_id === membership.id &&
    payment.product_id === membership.product_id && payment.variant_id === membership.variant_id &&
    payment.user?.id === membership.user_id;
}

export function deriveWhopMembership(membership, payments, plan, config, now = new Date(), disputeStatuses = []) {
  if (membership.account?.id !== config.accountId || membership.product_id !== plan.productId || membership.variant_id !== plan.variantId) throw whopError('whop_membership_mismatch');
  const paid = payments.filter(p => paymentEvidence(p, membership, config) && p.status === 'paid' && p.paid_at && Number(p.total?.amount) > 0)
    .sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at));
  const payment = paid[0];
  const periodStart = new Date(membership.current_period_start);
  const periodEnd = new Date(membership.current_period_end);
  // A failed renewal may advance the provider period. Never extend access on
  // the strength of an older payment from a previous period.
  // Providers can record the charge and period boundary a few seconds apart.
  // A short tolerance cannot bridge the minimum 30-day renewal period.
  const currentPayment = payment && Number.isFinite(periodStart.getTime()) &&
    new Date(payment.paid_at).getTime() >= periodStart.getTime() - 120000;
  const fullRefund = payment && (payment.auto_refunded || (payment.refunded_amount &&
    payment.refunded_amount.currency === payment.total.currency && Number(payment.refunded_amount.amount) >= Number(payment.total.amount)));
  const blockedDispute = disputeStatuses.some(s => !['won', 'prevented', 'warning_closed'].includes(s));
  const activeMember = Boolean(currentPayment && !fullRefund && !blockedDispute &&
    ['active', 'past_due'].includes(membership.status) && periodEnd > now);
  return { id: membership.id, environment: config.environment, accountId: config.accountId,
    productId: plan.productId, variantId: plan.variantId, userId: membership.user_id,
    tier: plan.tier, interval: plan.interval, amount: plan.amount, currency: 'mkd',
    status: membership.status, activeMember, paymentVerified: Boolean(currentPayment && !fullRefund),
    paidThrough: currentPayment && Number.isFinite(periodEnd.getTime()) ? periodEnd : null,
    periodStart: Number.isFinite(periodStart.getTime()) ? periodStart : null,
    cancelAtPeriodEnd: membership.cancel_at_period_end === true,
    paymentId: payment?.id || null, fullRefund: Boolean(fullRefund), disputed: blockedDispute,
    providerUpdatedAt: membership.updated_at, syncedAt: now };
}
