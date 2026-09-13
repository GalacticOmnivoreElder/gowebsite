import test from 'node:test';
import assert from 'node:assert/strict';
import { createRouteResolver, GO_ORIGIN, isExpectedPage, sitemapLocations } from '../src/lib/go-routes.mjs';
const xml = paths => `<urlset>${paths.map(path => `<url><loc>${GO_ORIGIN}/${path}</loc></url>`).join('')}</urlset>`;
function fixture(paths, content = {}, options = {}) {
  const calls = [];
  const resolve = createRouteResolver({ ...options, fetcher: async url => {
    calls.push(url);
    if (content[url] instanceof Error) throw content[url];
    return new Response(url.endsWith('sitemap.xml') ? xml(paths) : content[url] ?? '<title>Game Development Education | Galactic Omnivore</title>');
  } });
  return { resolve, calls };
}
test('sitemap accepts only canonical GO URLs, rejects external and credential URLs', () => {
  assert.deepEqual(sitemapLocations(`<urlset><loc>https://evil.test/a</loc><loc>${GO_ORIGIN}/education</loc><loc>https://user@www.galacticomnivore.com/faq</loc></urlset>`), [`${GO_ORIGIN}/education`]);
});
test('HTTP 200 generic, soft-404 and script mentions do not pass content verification', () => {
  assert.equal(isExpectedPage('<title>GO Signal post</title><script>microgame</script>', 'microgame'), false);
  assert.equal(isExpectedPage('<h1>Microgame not found</h1>', 'microgame'), false);
  assert.equal(isExpectedPage('<h1>Build your first microgame</h1>', 'microgame'), true);
});
test('a real sitemap destination with matching heading is returned', async () => {
  const { resolve } = fixture(['education', 'mentorship'], { [`${GO_ORIGIN}/mentorship`]: '<title>GO Mentorship | Galactic Omnivore</title>' });
  const result = await resolve('mentor');
  assert.equal(result.href, `${GO_ORIGIN}/mentorship`);
  assert.equal(result.verified, true);
  assert.equal(result.fallback, false);
});
test('missing course is replaced with verified Education, never presented as that course', async () => {
  const { resolve, calls } = fixture(['education']);
  const result = await resolve('microgame');
  assert.equal(result.title, 'GO Education');
  assert.equal(result.fallback, true);
  assert.equal(result.verified, true);
  assert.equal(calls.some(url => url.includes('microgame')), false);
});
test('incorrect page content falls back even when listed in sitemap', async () => {
  const { resolve } = fixture(['education', 'mentorship'], { [`${GO_ORIGIN}/mentorship`]: '<title>Not found</title>' });
  assert.equal((await resolve('mentor')).fallback, true);
});
test('outage fails closed with unverified status and no invented link', async () => {
  const resolve = createRouteResolver({ fetcher: async () => { throw new Error('offline'); } });
  const result = await resolve('mentor');
  assert.equal(result.verified, false);
  assert.equal(result.href, `${GO_ORIGIN}/education`);
});
test('untrusted keys cannot turn resolver into an open proxy', async () => {
  const { resolve, calls } = fixture([]);
  await assert.rejects(() => resolve('https://evil.test'), /Unknown route/);
  assert.equal(calls.length, 0);
});
test('verified pages are cached for the bounded TTL', async () => {
  const { resolve, calls } = fixture(['education']);
  await resolve('education'); await resolve('education');
  assert.equal(calls.length, 2);
});
