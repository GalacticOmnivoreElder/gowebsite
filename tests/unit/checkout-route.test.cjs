const assert = require('node:assert/strict');
const test = require('node:test');
const { loadSourceModule } = require('../helpers/load-source-module.cjs');
const { NextResponse, createRequest } = require('../helpers/route-test-utils.cjs');
function loadRoute({ user = { uid: 'go-user', claims: {} }, enabled = true, mentor = true, handler } = {}) {
  const calls = [];
  const mod = loadSourceModule('src/app/api/checkout/route.js', ['POST'], { stripImports: true, sandbox: { Response: NextResponse,
    getRequestUser: async () => user,
    getProductConfig: () => ({ membershipCheckoutEnabled: enabled, mentorCheckoutEnabled: mentor }),
    createWhopCheckout: async (...args) => { calls.push(args); return handler ? handler(...args) : { flow: 'checkout', provider: 'whop', url: 'https://whop.com/checkout/ch_valid/' }; },
  }});
  return { ...mod, calls };
}
const req = body => createRequest({ jsonBody: body });
test('checkout requires a non-anonymous Firebase account', async () => {
  for (const user of [null, { uid: 'u', claims: { firebase: { sign_in_provider: 'anonymous' } } }]) {
    const { POST, calls } = loadRoute({ user });
    assert.equal((await POST(req({ tier: 'member', interval: 'monthly' }))).status, 401); assert.equal(calls.length, 0);
  }
});
test('checkout remains paused until enabled', async () => {
  const { POST, calls } = loadRoute({ enabled: false });
  assert.equal((await POST(req({ tier: 'member', interval: 'monthly' }))).status, 503); assert.equal(calls.length, 0);
});
test('all six Whop selections use verified user and server-owned plan only', async () => {
  for (const tier of ['member', 'mentor', 'company']) for (const interval of ['monthly', 'annual']) {
    const { POST, calls } = loadRoute();
    const response = await POST(req({ tier, interval, productId: 'forged', uid: 'attacker', amount: 1 }));
    assert.equal(response.status, 200); assert.equal(calls[0][0].uid, 'go-user');
    assert.equal(calls[0][1], tier); assert.equal(calls[0][2], interval); assert.equal(calls[0].length, 3);
  }
});
test('invalid and disabled Mentor selections never call provider', async () => {
  for (const body of [{ tier: 'admin', interval: 'monthly' }, { tier: 'member', interval: 'weekly' }]) {
    const { POST, calls } = loadRoute(); assert.equal((await POST(req(body))).status, 400); assert.equal(calls.length, 0);
  }
  const { POST, calls } = loadRoute({ mentor: false });
  assert.equal((await POST(req({ tier: 'mentor', interval: 'annual' }))).status, 503); assert.equal(calls.length, 0);
});
test('provider conflict prevents duplicate checkout without exposing provider response', async () => {
  const { POST } = loadRoute({ handler: () => { throw Object.assign(new Error('secret provider text'), { code: 'active_membership', status: 409 }); } });
  const response = await POST(req({ tier: 'company', interval: 'monthly' }));
  assert.equal(response.status, 409); assert.equal(JSON.stringify(response.body).includes('secret provider text'), false);
});
