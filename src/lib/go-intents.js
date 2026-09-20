export const GO_INTENTS = Object.freeze({
  mentorship: { pillar: 'learn', label: 'Ask for mentorship', description: 'Get guidance for your next milestone.', href: '/learn?intent=mentorship', continueTo: '/learn?intent=mentorship' },
  'become-mentor': { pillar: 'learn', label: 'Become a mentor', description: 'Share your experience with GO review and support.', href: '/membership?intent=become-mentor', continueTo: '/profile?tab=mentor' },
  'publish-solo': { pillar: 'portfolio', label: 'Publish solo', description: 'Build your game and learn to release it with GO.', href: '/membership?intent=publish-solo', continueTo: '/creator-projects?intent=publish-solo' },
  'find-team': { pillar: 'portfolio', label: 'Find a team', description: 'Find collaborators or start your included creator project.', href: '/membership?intent=find-team', continueTo: '/creator-projects?intent=find-team' },
  'find-work': { pillar: 'outsource', label: 'Find paid work', description: 'Explore paid briefs that fit your skills.', href: '/projects?compensation=Paid&intent=find-work', continueTo: '/projects?compensation=Paid&intent=find-work' },
  'hire-talent': { pillar: 'outsource', label: 'Hire talent', description: 'Build your team with a GO Business project brief.', href: '/project/create?intent=hire-talent', continueTo: '/project/create?intent=hire-talent' },
});

export function validGoIntent(value) {
  return typeof value === 'string' && Object.hasOwn(GO_INTENTS, value) ? value : null;
}

export function rememberGoIntent(value) {
  const intent = validGoIntent(value);
  if (!intent || typeof window === 'undefined') return;
  try { localStorage.setItem('go.intent.v1', intent); } catch { /* Navigation works without storage. */ }
}

export function savedGoIntent() {
  if (typeof window === 'undefined') return null;
  try { return validGoIntent(localStorage.getItem('go.intent.v1')); } catch { return null; }
}

export function goContinuation(fallback = '/profile') {
  return GO_INTENTS[savedGoIntent()]?.continueTo || fallback;
}
