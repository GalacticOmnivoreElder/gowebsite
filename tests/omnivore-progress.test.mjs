import test from 'node:test';
import assert from 'node:assert/strict';
import { applyLearningEvent, createLearningSignalHandlers, learningSummary, validateLearningEvent } from '../src/lib/omnivore-progress.mjs';
const event = (id = 'event-000000000001', eventType = 'ask') => ({ eventId: id, eventType, routeKey: 'microgame' });
const request = (body, headers = {}) => new Request('http://localhost/api/learning-signal', {
  method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body),
});
test('fixed awards, idempotent retries and private text rejection', () => {
  const now = Date.UTC(2026, 8, 13);
  const first = applyLearningEvent({}, validateLearningEvent(event()), now);
  assert.equal(first.summary.xp, 20);
  assert.ok(first.summary.badges.includes('builder-spark'));
  assert.equal(applyLearningEvent(first.data, event(), now).xpAwarded, 0);
  assert.equal(applyLearningEvent(first.data, event('event-000000000002', 'open_route'), now).summary.xp, 25);
  for (const extra of [{ eventType: ['ask'] }, { routeKey: ['microgame'] }, { xp: 100000 }, { question: 'private text' }, { tags: ['untrusted'] }, { eventType: '__proto__' }, { routeKey: 'https://evil.test' }]) {
    assert.throws(() => validateLearningEvent({ ...event(), ...extra }), { status: 400 });
  }
});
test('minute and daily limits persist and reset with time', () => {
  const start = Date.UTC(2026, 8, 13);
  let data = {};
  for (let i = 0; i < 12; i++) data = applyLearningEvent(data, event(`event-${String(i).padStart(16, '0')}`), start).data;
  assert.throws(() => applyLearningEvent(data, event(), start), { status: 429 });
  assert.equal(applyLearningEvent(data, event(), start + 60001).xpAwarded, 20);
  data = { ...data, dailyCount: 100, recent: [] };
  assert.throws(() => applyLearningEvent(data, event(), start + 60001), { status: 429 });
  assert.equal(applyLearningEvent(data, event(), start + 86400000).xpAwarded, 20);
});
test('guests and spoofed prototype headers cannot save progress', async () => {
  let writes = 0;
  const handlers = createLearningSignalHandlers({ authenticate: async () => null, record: async () => { writes++; } });
  const response = await handlers.POST(request(event(), { 'oai-authenticated-user-id': 'victim', cookie: 'go_visitor=victim' }));
  assert.equal((await response.json()).persisted, false);
  assert.equal(writes, 0);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal((await handlers.POST(request(event(), { authorization: 'Bearer invalid' }))).status, 401);
});
test('verified UID controls storage; validation and outages return explicit status', async () => {
  const handlers = createLearningSignalHandlers({
    authenticate: async () => ({ uid: 'verified-member' }),
    read: async uid => { assert.equal(uid, 'verified-member'); return learningSummary({ xp: 80 }); },
    record: async (uid, input) => { assert.equal(uid, 'verified-member'); return applyLearningEvent({}, input); },
  });
  assert.equal((await (await handlers.GET(new Request('http://localhost'))).json()).summary.xp, 80);
  assert.equal((await (await handlers.POST(request(event()))).json()).summary.xp, 20);
  assert.equal((await handlers.POST(request({ ...event(), uid: 'victim' }))).status, 400);
  assert.equal((await handlers.POST(request({ ...event(), question: 'secret' }))).status, 400);
  assert.equal((await handlers.POST(new Request('http://localhost', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' }))).status, 400);
  const offline = createLearningSignalHandlers({ authenticate: async () => ({ uid: 'member' }), read: async () => { throw new Error('offline'); } });
  const response = await offline.GET(new Request('http://localhost'));
  assert.equal(response.status, 503);
  assert.equal((await response.json()).persisted, false);
});
