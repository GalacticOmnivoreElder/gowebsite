import { starterLessons } from '../content/evergreen-curriculum.mjs';
// Only this projection enters the existing Passport. Private submissions never do.
export function starterPassportRecord(data) {
  const lessons = starterLessons.filter(l => data.completedLessons?.includes(l.id));
  return {
    id: 'starter-pathway', title: 'GO Game Dev Starter Pathway',
    complete: lessons.length === 6,
    achievement: lessons.length === 6 ? 'Starter Game Maker' : null,
    publicSummary: lessons.length === 6 ? data.publicSummary || '' : '',
    lessons: lessons.map(l => ({ id: l.id, title: l.title, badgeId: l.badgeId, badgeTitle: l.badgeTitle, skillId: l.skillId, skillTitle: l.skillTitle, completedAt: new Date(data.completions[l.id].at).toISOString() })),
  };
}
