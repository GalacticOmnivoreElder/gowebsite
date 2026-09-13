export const GO_ORIGIN = 'https://www.galacticomnivore.com';
export const DESTINATIONS = {
  orientation: ['blog/start-your-game-dev-pathway-orientation-diagnostic-course', 'Orientation & Diagnostic', 'orientation|diagnostic'],
  foundations: ['blog/foundations-of-game-design-build-better-game-ideas', 'Foundations of Game Design', 'foundations of game design'],
  microgame: ['blog/build-your-first-microgame-from-idea-to-playable-prototype', 'Build Your First Microgame', 'microgame'],
  steam: ['blog/publish-your-game-on-steam-practical-workshop-for-indie-developers-2', 'Publish Your Game on Steam', 'publish.*steam'],
  kickstarter: ['blog/launch-your-game-on-kickstarter-crowdfunding-workshop-for-game-creators', 'Launch on Kickstarter', 'kickstarter|crowdfunding'],
  zine: ['blog/create-your-own-zine-join-our-upcoming-zine-workshop', 'Create Your Own Zine', 'zine'],
  roguelike: ['blog/learn-how-roguelikes-work-join-our-upcoming-workshop', 'How Roguelikes Work', 'roguelike'],
  mentor: ['mentorship', 'GO Mentorship', 'mentor'],
  projects: ['projects', 'GO Projects', 'project'],
  resources: ['resources', 'Community Resources', 'resource'],
  events: ['community', 'GO Community', 'community'],
  membership: ['membership', 'GO Membership', 'membership'],
  faq: ['faq', 'GO FAQ', 'faq|frequently asked'],
  education: ['education', 'GO Education', 'education'],
};

function canonical(value) {
  try {
    const url = new URL(value);
    return url.origin === GO_ORIGIN && !url.username && !url.password && !url.search && !url.hash ? url.href.replace(/\/$/, '') : null;
  } catch { return null; }
}
export function sitemapLocations(xml) {
  return [...xml.matchAll(/<loc>\s*(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?\s*<\/loc>/gs)]
    .map(match => canonical(match[1].trim().replace(/&amp;/g, '&'))).filter(Boolean);
}
export function isExpectedPage(html, expression) {
  const headings = [...html.matchAll(/<(title|h1)\b[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map(match => match[2].replace(/<[^>]+>/g, ' ')).join(' ');
  return !/not found|404|page unavailable|post not found/i.test(headings) && new RegExp(expression, 'i').test(headings);
}

// Fixed origin and fixed route keys: never proxy an arbitrary user-supplied URL.
export function createRouteResolver({ fetcher = fetch, ttl = 60000, timeout = 4500 } = {}) {
  let cache = null;
  let pending = null;
  const pages = new Map();
  async function text(url, signal) {
    const response = await fetcher(url, { signal, redirect: 'manual', cache: 'no-store', headers: { Accept: 'text/html, application/xml' } });
    if (!response.ok) throw new Error(`Upstream returned ${response.status}`);
    const body = await response.text();
    if (body.length > 2000000) throw new Error('Upstream response too large');
    return body;
  }
  async function sitemap(signal) {
    if (cache && cache.until > Date.now()) return cache.urls;
    if (pending) return pending;
    pending = (async () => {
      const first = await text(`${GO_ORIGIN}/sitemap.xml`, signal);
      const locations = sitemapLocations(first);
      const urls = /<sitemapindex\b/.test(first)
        ? (await Promise.all(locations.slice(0, 8).map(async url => sitemapLocations(await text(url, signal))))).flat()
        : locations;
      cache = { urls: new Set(urls), until: Date.now() + ttl };
      return cache.urls;
    })().finally(() => { pending = null; });
    return pending;
  }
  async function verify(key, urls, signal) {
    const [path, title, terms] = DESTINATIONS[key];
    const href = `${GO_ORIGIN}/${path}`;
    if (!urls.has(href)) return null;
    const hit = pages.get(key);
    if (hit && hit.until > Date.now()) return hit.value;
    try {
      const html = await text(href, signal);
      if (!isExpectedPage(html, terms)) return null;
      const value = { key, title, href, verified: true, fallback: false };
      pages.set(key, { until: Date.now() + ttl, value });
      return value;
    } catch { return null; }
  }
  return async function resolve(key) {
    if (!Object.hasOwn(DESTINATIONS, key)) throw new Error('Unknown route key');
    const signal = AbortSignal.timeout(timeout);
    try {
      const urls = await sitemap(signal);
      const primary = await verify(key, urls, signal);
      if (primary) return primary;
      const fallback = await verify('education', urls, signal);
      if (fallback) return { ...fallback, requestedKey: key, fallback: true, message: 'This specific page is not currently verified. Explore GO Education instead.' };
    } catch { /* Fail closed without labelling an unchecked link as verified. */ }
    return { key: 'education', requestedKey: key, title: 'GO Education', href: `${GO_ORIGIN}/education`, verified: false, fallback: true, message: 'GO is temporarily unreachable. You can try the Education page directly.' };
  };
}
export const resolveGoRoute = createRouteResolver();
