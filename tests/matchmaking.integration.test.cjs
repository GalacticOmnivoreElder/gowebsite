// Run through Firebase emulators:exec for demo-go-platform.
const assert = require('node:assert/strict');
const { before, beforeEach, after, test } = require('node:test');
const { createHash } = require('node:crypto');
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { loadSourceModule } = require('./helpers/load-source-module.cjs');
const host = process.env.FIRESTORE_EMULATOR_HOST;
assert.equal(host, '127.0.0.1:8085', 'These tests must only use the local Firestore emulator');
const projectId = 'demo-go-platform';
const app = initializeApp({ projectId }, 'matchmaking-audit');
const db = getFirestore(app);
// The repository loader evaluates services in a VM realm. Firestore checks
// instanceof Promise, so bridge only the callback's Promise to the host realm.
const serviceDb = new Proxy(db, { get(target, key) {
  if (key === 'runTransaction') return (callback) => target.runTransaction((transaction) => Promise.resolve(callback(transaction)));
  const value = Reflect.get(target, key, target);
  return typeof value === 'function' ? value.bind(target) : value;
} });
const skills = loadSourceModule('src/lib/skills.js', ['getSkillKey', 'sanitizeSkills']);
const availability = loadSourceModule('src/lib/availability.js', ['normalizeAvailability']);
const { getEffectiveMembership } = loadSourceModule('src/lib/auth-utils.js', ['getEffectiveMembership'], { stripImports: true });
const { hasCommunityContentAccess } = loadSourceModule('src/lib/content-entitlements.js', ['hasCommunityContentAccess'], { stripImports: true, sandbox: { getEffectiveMembership } });
const journey = loadSourceModule('src/lib/go-journey.mjs', ['normalizeMatchmakingProfile', 'publicJourneyEvent', 'scoreMatch'], { stripImports: true, sandbox: skills });
const service = loadSourceModule('src/lib/go-journey-service.js', ['getMatchmakingCandidates', 'saveMatchmakingProfile', 'actOnMatch'], {
  stripImports: true,
  sandbox: { createHash, FieldValue, adminDb: serviceDb, ...skills, ...availability, ...journey, hasCommunityContentAccess,
    getSkillCatalog: async () => [{ name: 'Unity', active: true }, { name: 'Art', active: true }, { name: 'Retired', active: false }],
    getDiscordConfig: () => ({ appetiteEnabled: false }), appetiteConfigHash: () => 'unused',
  },
});
before(async () => { await db.collection('_audit').doc('ready').get(); });
beforeEach(async () => {
  const response = await fetch(`http://${host}/emulator/v1/projects/${projectId}/databases/(default)/documents`, { method: 'DELETE' });
  assert.equal(response.ok, true);
});
after(async () => { await db.terminate(); await deleteApp(app); });
const plain = (value) => JSON.parse(JSON.stringify(value));
async function creator(uid, overrides = {}) {
  await db.collection('users').doc(uid).set({ username: uid, skills: ['Unity'], activeMember: true, membershipTier: 'member' });
  await db.collection('user_profiles').doc(uid).set({ availability_status: 'available', availability_answered: true, available_for_projects: true });
  await db.collection('go_matchmaking_profiles').doc(uid).set({ optedIn: true, skills: ['Unity'], seekingSkills: ['Art'], interests: ['Unity'], availability: 'available', timeZone: 'Europe/Warsaw', goal: 'prototype', updatedAt: new Date(), ...overrides });
}
function route(options = {}) {
  return loadSourceModule('src/app/api/matchmaking/route.js', ['GET', 'PUT', 'POST'], { stripImports: true, sandbox: {
    Response, getProductConfig: () => ({ featureFlags: { goMatchmaking: options.enabled !== false } }),
    getRequestUser: async () => options.anonymous ? null : ({ uid: 'alex', userData: options.userData ?? { activeMember: true, membershipTier: 'member' }, admin: false }),
    hasCommunityContentAccess,
    getMatchmakingCandidates: service.getMatchmakingCandidates, saveMatchmakingProfile: service.saveMatchmakingProfile, actOnMatch: service.actOnMatch,
    ...options.stubs,
  } });
}
function request(method, body) {
  return new Request('http://localhost/api/matchmaking', { method, ...(body !== undefined ? { body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}) });
}
for (const method of ['GET', 'PUT', 'POST']) {
  test(`${method}: disabled feature returns 503 before touching services`, async () => {
    const handler = route({ enabled: false, stubs: { getRequestUser: () => { throw new Error('Must not authenticate'); } } });
    const response = await handler[method](request(method));
    assert.equal(response.status, 503);
    assert.match(response.headers.get('cache-control'), /private, no-store/);
  });
  test(`${method}: anonymous requests return 401`, async () => {
    assert.equal((await route({ anonymous: true })[method](request(method))).status, 401);
  });
  test(`${method}: free and expired accounts cannot use matchmaking`, async () => {
    for (const userData of [{ activeMember: false }, { activeMember: true, subscriptionEndsAt: '2020-01-01T00:00:00.000Z' }]) {
      const response = await route({ userData })[method](request(method));
      assert.equal(response.status, 403);
      assert.equal((await response.json()).code, 'membership_required');
    }
  });
}
for (const [method, size] of [['PUT', 12001], ['POST', 4001]]) {
  test(`${method}: malformed JSON and oversized bodies are rejected`, async () => {
    assert.equal((await route()[method](request(method, '{bad'))).status, 400);
    assert.equal((await route()[method](request(method, 'x'.repeat(size)))).status, 413);
  });
}
test('GET: backend errors return a generic unavailable message', async () => {
  const response = await route({ stubs: { getMatchmakingCandidates: () => { throw new Error('private infrastructure detail'); } } }).GET(request('GET'));
  assert.equal(response.status, 503);
  assert.doesNotMatch(JSON.stringify(await response.json()), /private infrastructure detail/);
});
test('GET: first-time users remain opted out and cannot see candidates', async () => {
  await db.collection('users').doc('alex').set({ skills: ['Unity'] });
  await creator('beck');
  const response = await route().GET(request('GET'));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.profile.optedIn, false);
  assert.equal(body.suggestions.length, 0);
});
test('PUT: uses the authenticated identity and authoritative skills; validates catalogue and time zone', async () => {
  await creator('alex');
  const response = await route().PUT(request('PUT', { userId: 'victim', optedIn: true, skills: ['Forged'], seekingSkills: ['Art', 'Retired', 'Unknown'], interests: ['Unity'], timeZone: 'Europe/Warsaw', shareAppetite: true, sharedAppetite: 'hungry' }));
  assert.equal(response.status, 200);
  const profile = (await db.collection('go_matchmaking_profiles').doc('alex').get()).data();
  assert.deepEqual(profile.skills, ['Unity']);
  assert.deepEqual(profile.seekingSkills, ['Art']);
  assert.equal(profile.sharedAppetite, null);
  assert.equal((await db.collection('go_matchmaking_profiles').doc('victim').get()).exists, false);
  assert.equal((await route().PUT(request('PUT', { optedIn: true, timeZone: 'invalid/zone' }))).status, 400);
});
test('POST: rejects self-match, invalid action, and a peer who opted out', async () => {
  await creator('alex'); await creator('beck', { optedIn: false });
  assert.equal((await route().POST(request('POST', { peerId: 'alex', action: 'accept' }))).status, 400);
  assert.equal((await route().POST(request('POST', { peerId: 'beck', action: 'invalid' }))).status, 400);
  assert.equal((await route().POST(request('POST', { peerId: 'beck', action: 'accept' }))).status, 409);
});
test('real Firestore: mutual acceptance creates one pair and two journal entries; retries do not double count', async () => {
  await creator('alex'); await creator('beck');
  assert.equal((await service.actOnMatch('alex', { peerId: 'beck', action: 'accept' })).state, 'pending');
  assert.equal((await db.collection('go_journey_events').get()).size, 0);
  assert.equal((await service.getMatchmakingCandidates('beck')).requests[0].acceptedByMe, false);
  assert.equal((await service.actOnMatch('beck', { peerId: 'alex', action: 'accept' })).state, 'matched');
  await service.actOnMatch('beck', { peerId: 'alex', action: 'accept' });
  assert.equal((await db.collection('go_matchmaking_pairs').get()).size, 1);
  assert.equal((await db.collection('go_journey_events').get()).size, 2);
  assert.equal((await db.collection('go_journey_stats').doc('alex').get()).data().all_collaborationsAccepted, 1);
  assert.equal((await service.getMatchmakingCandidates('alex')).matches.length, 1);
});
test('real Firestore: blocked creators disappear and cannot accept again', async () => {
  await creator('alex'); await creator('beck');
  await service.actOnMatch('alex', { peerId: 'beck', action: 'block' });
  await assert.rejects(service.actOnMatch('beck', { peerId: 'alex', action: 'accept' }), { status: 409 });
  assert.equal((await service.getMatchmakingCandidates('alex')).suggestions.length, 0);
  assert.equal((await service.getMatchmakingCandidates('beck')).suggestions.length, 0);
});
test('real Firestore: declines hide the pair and the other creator cannot override them', async () => {
  await creator('alex'); await creator('beck');
  await service.actOnMatch('alex', { peerId: 'beck', action: 'decline' });
  await assert.rejects(service.actOnMatch('beck', { peerId: 'alex', action: 'accept' }), { status: 409 });
  assert.equal((await service.getMatchmakingCandidates('beck')).suggestions.length, 0);
});
test('real Firestore: opting out removes a creator from suggestions', async () => {
  await creator('alex'); await creator('beck');
  await service.saveMatchmakingProfile('beck', { optedIn: false });
  assert.equal((await service.getMatchmakingCandidates('alex')).suggestions.length, 0);
});
test('membership expiry removes candidates and prevents direct acceptance', async () => {
  await creator('alex'); await creator('beck');
  await db.collection('users').doc('beck').update({ subscriptionEndsAt: new Date('2020-01-01') });
  assert.equal((await service.getMatchmakingCandidates('alex')).suggestions.length, 0);
  await assert.rejects(service.actOnMatch('alex', { peerId: 'beck', action: 'accept' }), { status: 409 });
});
test('unavailable creators cannot initiate or accept a match through the API', async () => {
  await creator('alex'); await creator('beck');
  await db.collection('user_profiles').doc('beck').update({ availability_status: 'unavailable' });
  await assert.rejects(service.actOnMatch('alex', { peerId: 'beck', action: 'accept' }), { status: 409 });
  await assert.rejects(service.actOnMatch('beck', { peerId: 'alex', action: 'accept' }), { status: 409 });
});
test('paid-through cancellation remains eligible until the subscription ends', async () => {
  await creator('alex'); await creator('beck');
  await db.collection('users').doc('beck').update({ subscriptionStatus: 'canceled', subscriptionEndsAt: new Date('2099-01-01') });
  assert.equal((await service.getMatchmakingCandidates('alex')).suggestions.length, 1);
  assert.equal((await service.actOnMatch('alex', { peerId: 'beck', action: 'accept' })).state, 'pending');
});
test('AUDIT: latest profile availability must exclude unavailable creators without resaving matchmaking', async () => {
  await creator('alex'); await creator('beck');
  await db.collection('user_profiles').doc('alex').update({ availability_status: 'unavailable', available_for_projects: false });
  const result = await service.getMatchmakingCandidates('alex');
  assert.equal(result.profile.availability, 'unavailable', 'Matchmaking should reflect the current GO profile');
  assert.equal(result.suggestions.length, 0);
});
test('AUDIT: accepted matches remain visible outside the latest 100 candidate profiles', async () => {
  await creator('alex'); await creator('beck', { updatedAt: new Date('2020-01-01') });
  await service.actOnMatch('alex', { peerId: 'beck', action: 'accept' });
  await service.actOnMatch('beck', { peerId: 'alex', action: 'accept' });
  const batch = db.batch();
  for (let i = 0; i < 100; i++) batch.set(db.collection('go_matchmaking_profiles').doc(`new-${i}`), { optedIn: true, availability: 'available', updatedAt: new Date() });
  await batch.commit();
  assert.equal((await service.getMatchmakingCandidates('alex')).matches.length, 1, 'Existing matches must not depend on candidate recency');
});
test('AUDIT: an unavailable peer can still be blocked after an existing match', async () => {
  await creator('alex'); await creator('beck');
  await service.actOnMatch('alex', { peerId: 'beck', action: 'accept' });
  await service.actOnMatch('beck', { peerId: 'alex', action: 'accept' });
  await service.saveMatchmakingProfile('beck', { optedIn: false });
  const existing = (await service.getMatchmakingCandidates('alex')).matches[0];
  assert.equal(existing.peer.name, 'Creator unavailable');
  assert.equal(existing.peer.profileUrl, null);
  assert.deepEqual(plain(existing.peer.skills), []);
  assert.equal((await service.actOnMatch('alex', { peerId: 'beck', action: 'block' })).state, 'blocked');
});
test('members can block an existing match after opting out themselves', async () => {
  await creator('alex'); await creator('beck');
  await service.actOnMatch('alex', { peerId: 'beck', action: 'accept' });
  await service.actOnMatch('beck', { peerId: 'alex', action: 'accept' });
  await service.saveMatchmakingProfile('alex', { optedIn: false });
  const result = await service.getMatchmakingCandidates('alex');
  assert.equal(result.profile.optedIn, false);
  assert.equal(result.suggestions.length, 0);
  assert.equal(result.matches[0].peer.profileUrl, null);
  assert.equal((await service.actOnMatch('alex', { peerId: 'beck', action: 'block' })).state, 'blocked');
});
test('AUDIT: withdrawing and renewing acceptance must require fresh consent and not double count', async () => {
  await creator('alex'); await creator('beck');
  await service.actOnMatch('alex', { peerId: 'beck', action: 'accept' });
  await service.actOnMatch('beck', { peerId: 'alex', action: 'accept' });
  await service.actOnMatch('alex', { peerId: 'beck', action: 'decline' });
  const result = await service.actOnMatch('alex', { peerId: 'beck', action: 'accept' });
  const count = (await db.collection('go_journey_stats').doc('alex').get()).data().all_collaborationsAccepted;
  assert.deepEqual(plain({ state: result.state, count }), { state: 'pending', count: 1 });
  assert.equal((await service.actOnMatch('beck', { peerId: 'alex', action: 'accept' })).state, 'matched');
  assert.equal((await db.collection('go_journey_stats').doc('alex').get()).data().all_collaborationsAccepted, 1);
  assert.equal((await db.collection('go_journey_stats').doc('beck').get()).data().all_collaborationsAccepted, 1);
});
