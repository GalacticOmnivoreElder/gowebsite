import assert from 'node:assert/strict';
import test from 'node:test';
import { GO_ORIGIN, isExpectedPage } from '../src/lib/go-routes.mjs';
const base = (process.env.GO_LAB_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
const read = (path, options = {}) => fetch(`${base}${path}`, { signal: AbortSignal.timeout(12000), ...options });
test('lab returns the actual interactive surface', async () => {
  const response = await read('/learn');
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const marker of ['GO Game Development Lab', 'The Galactic Omnivore learning guide', 'go-avatar.png', 'Ask me about making games', 'data-phase="idle"']) assert.ok(html.includes(marker), marker);
});
test('progress endpoint exposes summary or explicit fallback', async () => {
  const response = await read('/api/learning-signal');
  assert.ok(response.ok);
  const payload = await response.json();
  assert.equal(typeof payload.persisted, 'boolean');
  assert.equal(typeof payload.summary.xp, 'number');
});
test('runtime route resolution returns verified GO destinations', async () => {
  const response = await read('/api/learning-routes?keys=mentor,microgame');
  assert.equal(response.status, 200);
  const { routes } = await response.json();
  assert.equal(routes.mentor.href, `${GO_ORIGIN}/mentorship`);
  for (const route of Object.values(routes)) {
    assert.equal(route.verified, true, 'GO upstream unavailable or content failed verification');
    assert.equal(new URL(route.href).origin, GO_ORIGIN);
  }
});
test('click-time redirect returns a real expected page or verified Education fallback', async () => {
  const response = await read('/api/go-link?key=microgame', { redirect: 'manual' });
  assert.equal(response.status, 302);
  const target = response.headers.get('location');
  assert.equal(new URL(target).origin, GO_ORIGIN);
  const page = await fetch(target, { signal: AbortSignal.timeout(8000) });
  assert.equal(page.status, 200);
  assert.ok(isExpectedPage(await page.text(), 'microgame|education'));
});
test('unknown key cannot redirect to arbitrary URL', async () => {
  const response = await read('/api/go-link?key=https://evil.test', { redirect: 'manual' });
  assert.equal(response.status, 400);
  assert.equal(response.headers.get('location'), null);
});
