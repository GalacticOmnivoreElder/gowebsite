import { DESTINATIONS } from './go-routes.mjs';

const AWARDS = Object.freeze({ ask: 20, open_route: 5 });
export function learningSummary(data = {}) {
  const xp = Number.isSafeInteger(data.xp) && data.xp >= 0 ? data.xp : 0;
  return { xp, level: Math.floor(xp / 100) + 1, progress: xp % 100,
    badges: Array.isArray(data.badges) ? data.badges : [], lastRoute: data.lastRoute ?? null, brainTags: [] };
}

export function validateLearningEvent(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).some(key => !['eventType', 'routeKey', 'eventId'].includes(key)) ||
      typeof body.eventType !== 'string' || typeof body.routeKey !== 'string' ||
      !Object.hasOwn(AWARDS, body.eventType) || !Object.hasOwn(DESTINATIONS, body.routeKey) ||
      typeof body.eventId !== 'string' || !/^[a-zA-Z0-9-]{16,64}$/.test(body.eventId)) {
    throw Object.assign(new Error('Use a known event, route key and unique event ID.'), { status: 400 });
  }
  return { eventType: body.eventType, routeKey: body.routeKey, eventId: body.eventId };
}

// Called within a Firestore transaction: concurrent requests cannot bypass limits
// or lose awards. Keep only bounded counters and IDs, never learner questions.
export function applyLearningEvent(data = {}, event, now = Date.now()) {
  const summary = learningSummary(data);
  const day = new Date(now).toISOString().slice(0, 10);
  const dailyCount = data.day === day ? data.dailyCount ?? 0 : 0;
  const recent = (data.recent ?? []).filter(item => item.at > now - 60000);
  const ids = data.day === day ? data.eventIds ?? [] : [];
  if (ids.includes(event.eventId)) return { data, summary, xpAwarded: 0 };
  if (recent.length >= 12 || dailyCount >= 100) {
    throw Object.assign(new Error('Progress limit reached. You can keep exploring without saved XP.'), { status: 429 });
  }
  const badges = new Set(summary.badges);
  badges.add('signal-seeker');
  if (event.routeKey === 'foundations') badges.add('scope-scout');
  if (event.routeKey === 'microgame') badges.add('builder-spark');
  if (['mentor', 'projects', 'resources', 'events', 'membership'].includes(event.routeKey)) badges.add('community-cartographer');
  const xpAwarded = AWARDS[event.eventType];
  const next = { xp: summary.xp + xpAwarded, badges: [...badges], lastRoute: event.routeKey,
    day, dailyCount: dailyCount + 1, recent: [...recent, { at: now }],
    eventIds: [...ids, event.eventId], updatedAt: now };
  return { data: next, summary: learningSummary(next), xpAwarded };
}

export function createLearningSignalHandlers({ authenticate, read, record }) {
  const json = (payload, status = 200) => Response.json(payload, { status, headers: { 'Cache-Control': 'private, no-store' } });
  const fallback = (status = 200, error) => json({ persisted: false, summary: learningSummary(), ...(error ? { error } : {}) }, status);
  async function handle(request, write) {
    try {
      const user = await authenticate(request);
      if (!user) return fallback(request.headers.has('authorization') ? 401 : 200);
      if (!write) return json({ persisted: true, summary: await read(user.uid) });
      if (!request.headers.get('content-type')?.startsWith('application/json')) return fallback(415, 'Use JSON.');
      const raw = await request.text();
      if (raw.length > 1024) return fallback(413, 'Event too large.');
      let body;
      try { body = JSON.parse(raw); } catch { return fallback(400, 'Invalid JSON.'); }
      const event = validateLearningEvent(body);
      const result = await record(user.uid, event);
      return json({ persisted: true, summary: result.summary, xpAwarded: result.xpAwarded });
    } catch (error) {
      return fallback(error.status === 400 || error.status === 429 ? error.status : 503,
        error.status === 400 || error.status === 429 ? error.message : 'Progress is unavailable. Continue with XP for this visit.');
    }
  }
  return { GET: request => handle(request, false), POST: request => handle(request, true) };
}
