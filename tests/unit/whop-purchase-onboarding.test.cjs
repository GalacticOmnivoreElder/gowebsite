const assert = require('node:assert/strict');
const test = require('node:test');
const { createHash } = require('node:crypto');
const { loadSourceModule } = require('../helpers/load-source-module.cjs');

test('a paid account-linked Whop checkout updates only its buyer and produces an onboarding confirmation', async () => {
  const model = await import('../../src/lib/whop-model.mjs');
  const access = await import('../../src/lib/membership-access.mjs');
  const config = { environment: 'sandbox', accountId: 'biz_test', token: 'test', baseUrl: 'https://api.test', catalog: [{ tier: 'mentor', interval: 'monthly', amount: 1500, productId: 'prod_test', variantId: 'plan_test' }] };
  const now = new Date();
  const membership = { id: 'mem_test', account: { id: config.accountId }, product_id: 'prod_test', variant_id: 'plan_test', user_id: 'whop_user', status: 'active', current_period_start: new Date(now.getTime() - 60000).toISOString(), current_period_end: new Date(now.getTime() + 86400000).toISOString(), updated_at: now.toISOString() };
  const payment = { id: 'pay_test', account_id: config.accountId, membership_id: membership.id, product_id: 'prod_test', variant_id: 'plan_test', user: { id: 'whop_user' }, checkout_configuration_id: 'ch_test', status: 'paid', paid_at: now.toISOString(), total: { amount: '1500', currency: 'mkd' } };
  const store = new Map([
    ['users/buyer', { mentorStatus: 'approved' }],
    ['users/other', {}],
    ['whop_checkouts/sandbox_biz_test_ch_test', { uid: 'buyer', variantId: 'plan_test', productId: 'prod_test' }],
  ]);
  function ref(path) { return { path, async get() { return { exists: store.has(path), data: () => store.get(path) }; }, async set(value, options) { store.set(path, options?.merge ? { ...store.get(path), ...value } : value); }, async update(value) { store.set(path, { ...store.get(path), ...value }); }, async delete() { store.delete(path); } }; }
  const db = { collection: name => ({ doc: id => ref(`${name}/${id}`) }), async runTransaction(fn) { return fn({ get: r => r.get(), set: (r, v, o) => r.set(v, o), update: (r, v) => r.update(v), delete: r => r.delete() }); } };
  const fetch = async url => ({ ok: true, status: 200, json: async () => new URL(url).pathname.startsWith('/memberships/') ? membership : { data: [payment], page_info: { has_next_page: false } } });
  const service = loadSourceModule('src/lib/whop.js', ['syncWhopMembership'], { stripImports: true, transform: s => s.replace("import 'server-only';", ''), sandbox: { ...model, ...access, URLSearchParams, adminDb: db, fetch, randomUUID: () => 'lease-token', enqueueDiscordSync: async () => {} } });
  await service.syncWhopMembership('mem_test', config);
  const buyer = store.get('users/buyer');
  assert.equal(buyer.whopMembership.tier, 'mentor');
  assert.equal(buyer.whopMembership.paymentVerified, true);
  assert.equal(store.get('users/other').whopMembership, undefined);
  const auth = loadSourceModule('src/lib/auth-utils.js', ['getEffectiveMembership', 'getMembershipConfirmationId'], { stripImports: true, sandbox: { ...access, createHash } });
  assert.equal(auth.getEffectiveMembership(buyer).membershipTier, 'mentor');
  assert.ok(auth.getMembershipConfirmationId(buyer));
  const entitlements = loadSourceModule('src/lib/content-entitlements.js', ['hasMentorToolAccess'], { stripImports: true, sandbox: { getEffectiveMembership: auth.getEffectiveMembership } });
  assert.equal(entitlements.hasMentorToolAccess(buyer), true);
});
