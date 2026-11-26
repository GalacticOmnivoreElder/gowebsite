const assert = require('node:assert/strict');
const test = require('node:test');
const { loadSourceModule } = require('../helpers/load-source-module.cjs');

test('verified Whop Mentor purchases grant member access and approved Mentor tools through the paid period', async () => {
  const { whopConfig, deriveWhopMembership } = await import('../../src/lib/whop-model.mjs');
  const { resolveMembershipRecord } = await import('../../src/lib/membership-access.mjs');
  const { getEffectiveMembership } = loadSourceModule('src/lib/auth-utils.js', ['getEffectiveMembership'], { stripImports: true, sandbox: { resolveMembershipRecord } });
  const access = loadSourceModule('src/lib/content-entitlements.js', ['hasCommunityContentAccess', 'hasMentorToolAccess'], { stripImports: true, sandbox: { getEffectiveMembership } });
  const config = whopConfig({ WHOP_ENVIRONMENT: 'production', WHOP_ACCOUNT_ID: 'biz_fXnLxutjLKO8jT', WHOP_API_KEY: 'test', WHOP_SITE_URL: 'https://example.com', FIREBASE_PROJECT_ID: 'test', WHOP_FIREBASE_PROJECT_ID: 'test' });
  const now = new Date('2026-11-15T00:00:00Z');
  for (const interval of ['monthly', 'annual']) {
    const plan = config.catalog.find(item => item.tier === 'mentor' && item.interval === interval);
    const membership = { id: 'mem_test', account: { id: config.accountId }, product_id: plan.productId, variant_id: plan.variantId, user_id: 'user_test', status: 'active', current_period_start: '2026-11-01T00:00:00Z', current_period_end: '2026-12-01T00:00:00Z' };
    const payment = { account_id: config.accountId, membership_id: membership.id, product_id: plan.productId, variant_id: plan.variantId, user: { id: membership.user_id }, status: 'paid', paid_at: '2026-11-01T00:00:00Z', total: { amount: String(plan.amount), currency: 'mkd' } };
    const record = deriveWhopMembership(membership, [payment], plan, config, now);
    const buyer = { whopMembership: record, mentorStatus: 'applicant' };
    assert.equal(access.hasCommunityContentAccess(buyer, { now }), true);
    assert.equal(access.hasMentorToolAccess(buyer, { now }), false);
    assert.equal(access.hasMentorToolAccess({ ...buyer, mentorStatus: 'approved' }, { now }), true);
    assert.equal(access.hasMentorToolAccess({ ...buyer, mentorStatus: 'approved' }, { now: new Date('2026-12-01T00:00:00Z') }), false);
    assert.equal(access.hasMentorToolAccess({ whopMembership: deriveWhopMembership(membership, [], plan, config, now), mentorStatus: 'approved' }, { now }), false);
  }
});
