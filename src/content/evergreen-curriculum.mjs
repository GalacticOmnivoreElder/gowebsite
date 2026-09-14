import lessons from './starter-lessons.mjs';
import { products } from './product-catalog.mjs';
/** @typedef {'drawing'|'paper-prototype'|'no-code'|'level-editor'|'game-engine'|'programming'} LearningMode */
/** @typedef {{id:string, world:number, slug:string, title:string, promise:string, idea:string, example:string, mission:string, evidencePrompt:string, reflectionPrompt:string, badgeId:string, badgeTitle:string, skillId:string, skillTitle:string, missionXp:number, nextRouteKey:string, nextRouteLabel:string, modes:LearningMode[], access:string}} StarterLesson */
export const starterLessons = /** @type {StarterLesson[]} */ (lessons);
export const lessonById = Object.fromEntries(starterLessons.map(lesson => [lesson.id, lesson]));
// Local lesson routes are separate from the existing verified external resolver.
export const starterRoutes = Object.fromEntries(starterLessons.map(lesson => [lesson.id, { href: `/learn#world-${lesson.id}`, label: lesson.title }]));
export const learningCatalog = {
  version: 'starter-pathway-v1', coreLoop: starterLessons.map(lesson => lesson.title),
  starterPathway: { id: 'starter-pathway', title: 'GO Game Dev Starter Pathway', description: 'Make a tiny game by noticing, imagining, shaping, building, testing, and sharing.', lessonIds: starterLessons.map(lesson => lesson.id) },
  starterTotalMissionXp: 500, starterCompletionBonusXp: 100,
  lessons: starterLessons, products, routes: { ...starterRoutes, projects: { href: '/projects', label: 'GO Projects' } },
  badges: [...starterLessons.map(lesson => ({ id: lesson.badgeId, title: lesson.badgeTitle })), { id: 'starter-game-maker', title: 'Starter Game Maker' }],
};

