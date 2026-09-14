import { DESTINATIONS } from './go-routes.mjs';
import { lessonById, starterLessons } from '../content/evergreen-curriculum.mjs';

const AWARDS = Object.freeze({ ask: 20, open_route: 5 });
export function learningSummary(data = {}) {
  const xp = Number.isSafeInteger(data.xp) && data.xp >= 0 ? data.xp : 0;
  return { xp, level: Math.floor(xp / 100) + 1, progress: xp % 100,
    badges: Array.isArray(data.badges) ? data.badges : [], lastRoute: data.lastRoute ?? null, brainTags: [],
    completedLessons: starterLessons.filter(l => data.completedLessons?.includes(l.id)).map(l => l.id),
    skills: starterLessons.filter(l => data.completedLessons?.includes(l.id)).map(l => l.skillId),
    pathwayComplete: starterLessons.every(l => data.completedLessons?.includes(l.id)) };
}

export function validateLearningEvent(body) {
  if (body && ['lesson_started', 'lesson_complete'].includes(body.eventType)) {
    const lesson = typeof body.lessonId === 'string' && Object.hasOwn(lessonById, body.lessonId) ? lessonById[body.lessonId] : null;
    const clean = value => typeof value === 'string' ? value.replace(/<[^>]*>/g, '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim() : '';
    if (!lesson || Object.keys(body).some(key => !['eventType','eventId','lessonId','evidence','reflection','mode','publicSummary'].includes(key)) ||
        (body.publicSummary !== undefined && (typeof body.publicSummary !== 'string' || body.publicSummary.length > 1200)) ||
        ['evidence', 'reflection'].some(key => body[key] !== undefined && (typeof body[key] !== 'string' || body[key].length > 1200)) ||
        (body.publicSummary !== undefined && (body.eventType !== 'lesson_complete' || lesson.id !== 'share')) ||
        typeof body.eventId !== 'string' || !/^[a-zA-Z0-9-]{16,64}$/.test(body.eventId) ||
        (body.mode !== undefined && !lesson.modes.includes(body.mode)) ||
        (body.eventType === 'lesson_complete' && ['evidence','reflection'].some(key => typeof body[key] !== 'string' || body[key].length > 1200 || !clean(body[key])))) {
      throw Object.assign(new Error('Choose a lesson and include evidence and reflection, each up to 1,200 characters.'), { status: 400 });
    }
    return { eventType: body.eventType, eventId: body.eventId, lessonId: lesson.id, routeKey: lesson.nextRouteKey,
      evidence: clean(body.evidence), reflection: clean(body.reflection), publicSummary: clean(body.publicSummary), mode: body.mode ?? lesson.modes[0] };
  }
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
  if (event.eventType === 'lesson_complete' && summary.completedLessons.includes(event.lessonId)) return { data, summary, xpAwarded: 0 };
  const day = new Date(now).toISOString().slice(0, 10);
  const dailyCount = data.day === day ? data.dailyCount ?? 0 : 0;
  const recent = (data.recent ?? []).filter(item => item.at > now - 60000);
  const ids = data.day === day ? data.eventIds ?? [] : [];
  if (ids.includes(event.eventId)) return { data, summary, xpAwarded: 0 };
  if (recent.length >= 12 || dailyCount >= 100) {
    throw Object.assign(new Error('Progress limit reached. You can keep exploring without saved XP.'), { status: 429 });
  }
  const badges = new Set(summary.badges);
  if (event.eventType.startsWith('lesson_')) {
    const lesson = lessonById[event.lessonId];
    const complete = event.eventType === 'lesson_complete';
    const completedLessons = complete ? [...summary.completedLessons, lesson.id] : summary.completedLessons;
    const pathwayComplete = starterLessons.every(l => completedLessons.includes(l.id));
    const bonus = complete && pathwayComplete && !data.pathwayBonusAwarded ? 100 : 0;
    if (complete) badges.add(lesson.badgeId);
    if (bonus) badges.add('starter-game-maker');
    const xpAwarded = (complete ? lesson.missionXp : 0) + bonus;
    const next = { ...data, xp: summary.xp + xpAwarded, badges: [...badges], completedLessons,
      pathwayBonusAwarded: data.pathwayBonusAwarded === true || bonus > 0,
      ...(complete && lesson.id === 'share' ? { publicSummary: event.publicSummary || '' } : {}),
      completions: { ...data.completions, ...(complete ? { [lesson.id]: { at: now, evidence: event.evidence, reflection: event.reflection, mode: event.mode } } : {}) },
      lastRoute: lesson.nextRouteKey, day, dailyCount: dailyCount + 1, recent: [...recent, { at: now }], eventIds: [...ids, event.eventId], updatedAt: now };
    return { data: next, summary: learningSummary(next), xpAwarded, changed: true };
  }
  badges.add('signal-seeker');
  if (event.routeKey === 'foundations') badges.add('scope-scout');
  if (event.routeKey === 'microgame') badges.add('builder-spark');
  if (['mentor', 'projects', 'resources', 'events', 'membership'].includes(event.routeKey)) badges.add('community-cartographer');
  const xpAwarded = AWARDS[event.eventType];
  const next = { ...data, xp: summary.xp + xpAwarded, badges: [...badges], lastRoute: event.routeKey,
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
      if (!write) return json({ persisted: true, communityAccess: user.activeMember === true, summary: await read(user.uid) });
      if (!request.headers.get('content-type')?.startsWith('application/json')) return fallback(415, 'Use JSON.');
      const raw = await request.text();
      if (raw.length > 8192) return fallback(413, 'Event too large.');
      let body;
      try { body = JSON.parse(raw); } catch { return fallback(400, 'Invalid JSON.'); }
      const event = validateLearningEvent(body);
      if (event.lessonId && lessonById[event.lessonId].access !== 'free' && !user.activeMember) return fallback(403, 'Continue this world with GO Community membership.');
      const result = await record(user.uid, event);
      return json({ persisted: true, summary: result.summary, xpAwarded: result.xpAwarded });
    } catch (error) {
      return fallback(error.status === 400 || error.status === 429 ? error.status : 503,
        error.status === 400 || error.status === 429 ? error.message : 'Progress is unavailable. Continue with XP for this visit.');
    }
  }
  return { GET: request => handle(request, false), POST: request => handle(request, true) };
}
