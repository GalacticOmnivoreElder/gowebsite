const assert = require('node:assert/strict');
const test = require('node:test');
const { loadSourceModule } = require('../helpers/load-source-module.cjs');

test('paid Whop Community and Business plans resolve access and project capacity for both intervals', async () => {
  const { whopConfig, deriveWhopMembership } = await import('../../src/lib/whop-model.mjs');
  const { resolveMembershipRecord } = await import('../../src/lib/membership-access.mjs');
  const { getEffectiveMembership } = loadSourceModule('src/lib/auth-utils.js', ['getEffectiveMembership'], { stripImports: true, sandbox: { resolveMembershipRecord } });
  const { projectAllowance, isGoReleased } = loadSourceModule('src/lib/go-policy.js', ['projectAllowance', 'isGoReleased']);
  const { hasCommunityContentAccess } = loadSourceModule('src/lib/content-entitlements.js', ['hasCommunityContentAccess'], { stripImports: true, sandbox: { getEffectiveMembership } });
  const { readProjectCapacity, commitProjectCreation } = loadSourceModule('src/lib/project-capacity.js', ['readProjectCapacity', 'commitProjectCreation'], { stripImports: true, sandbox: { getEffectiveMembership, projectAllowance, isGoReleased } });
  const config = whopConfig({ WHOP_ENVIRONMENT: 'production', WHOP_ACCOUNT_ID: 'biz_fXnLxutjLKO8jT', WHOP_API_KEY: 'test', WHOP_SITE_URL: 'https://example.com', FIREBASE_PROJECT_ID: 'test', WHOP_FIREBASE_PROJECT_ID: 'test' });
  const now = new Date();
  for (const tier of ['member', 'company']) for (const interval of ['monthly', 'annual']) {
    const plan = config.catalog.find(item => item.tier === tier && item.interval === interval);
    const membership = { id: 'mem_test', account: { id: config.accountId }, product_id: plan.productId, variant_id: plan.variantId, user_id: 'user_test', status: 'active', current_period_start: new Date(now.getTime() - 60000).toISOString(), current_period_end: new Date(now.getTime() + 86400000).toISOString() };
    const payment = { account_id: config.accountId, membership_id: membership.id, product_id: plan.productId, variant_id: plan.variantId, user: { id: membership.user_id }, status: 'paid', paid_at: now.toISOString(), total: { amount: String(plan.amount), currency: 'mkd' } };
    const data = { whopMembership: deriveWhopMembership(membership, [payment], plan, config, now), ...(tier === 'company' ? { businessProjectLimit: 3 } : {}) };
    const effective = getEffectiveMembership(data);
    assert.equal(effective.membershipTier, tier);
    assert.equal(effective.canCreateProjects, tier === 'company');
    assert.equal(hasCommunityContentAccess(data), true);
    const user = { uid: 'buyer', userData: data, ...effective };
    const db = { collection: name => ({ where: () => ({ get: async () => ({ docs: [] }) }), doc: () => ({ get: async () => ({ data: () => ({}) }) }) }) };
    assert.equal((await readProjectCapacity(user, db)).limit, tier === 'company' ? null : 1);
    if (tier === 'company') {
      const withoutAgreement = { ...user, userData: { whopMembership: data.whopMembership } };
      assert.equal((await readProjectCapacity(withoutAgreement, db)).limit, null);
    }
    const reads = [{ data: () => data }, { data: () => ({}) }, { exists: false }, { docs: [] }];
    db.runTransaction = async fn => fn({ get: async () => reads.shift(), set: () => {} });
    const result = await commitProjectCreation({ user, projectId: 'project', creationRequestRef: {}, writes: [], intent: tier === 'company' ? 'hire-talent' : 'creator', db });
    assert.equal(result.replayed, false);
    assert.equal(getEffectiveMembership({ whopMembership: deriveWhopMembership(membership, [], plan, config, now) }).activeMember, false);
    assert.equal(getEffectiveMembership(data, { now: new Date(now.getTime() + 86400001) }).activeMember, false);
  }
});
