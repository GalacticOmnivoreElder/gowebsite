import test from 'node:test';
import assert from 'node:assert/strict';
import { learningCatalog, starterLessons } from '../src/content/evergreen-curriculum.mjs';
import { applyLearningEvent, validateLearningEvent, createLearningSignalHandlers } from '../src/lib/omnivore-progress.mjs';
import { starterPassportRecord } from '../src/lib/starter-passport.mjs';
const event = lessonId => ({eventType:'lesson_complete',eventId:`starter-event-${lessonId}-000000`,lessonId,evidence:'Choose, move, score',reflection:'Choose a direction.'});
test('catalog has six full lessons and all four product types',()=>{
 assert.equal(starterLessons.length,6); assert.equal(starterLessons.reduce((n,l)=>n+l.missionXp,0),500);
 assert.equal(learningCatalog.starterCompletionBonusXp,100); assert.equal(new Set(learningCatalog.products.map(p=>p.type)).size,4);
 for(const l of starterLessons) for(const key of ['promise','idea','example','mission','evidencePrompt','reflectionPrompt','badgeId','skillId','nextRouteKey']) assert.ok(l[key]);
});
test('retries, lifetime 600 XP, private projection, preserved legacy progress',()=>{
 let data={};
 for(const l of starterLessons){data=applyLearningEvent(data,validateLearningEvent(event(l.id))).data;assert.equal(applyLearningEvent(data,validateLearningEvent({...event(l.id),eventId:'another-event-000000000'})).xpAwarded,0);}
 assert.equal(data.xp,600); assert.equal(data.badges.filter(b=>b==='starter-game-maker').length,1);
 const next=applyLearningEvent(data,validateLearningEvent({eventType:'ask',routeKey:'orientation',eventId:'legacy-event-000000000'}));
 assert.equal(next.summary.xp,620);assert.equal(next.summary.completedLessons.length,6);assert.equal(next.summary.skills.length,6);
 assert.equal(starterPassportRecord(data).complete,true);assert.ok(!JSON.stringify(starterPassportRecord(data)).includes('Choose'));assert.ok(!JSON.stringify(next.summary).includes('Choose'));
});
test('validate authority, required private fields, length and mode',()=>{
 for(const extra of [{evidence:' '},{reflection:''},{evidence:'x'.repeat(1201)},{evidence:'<b></b>'},{lessonId:'__proto__'},{xp:999},{uid:'victim'},{badgeId:'winner'},{routeKey:'https://evil.test'},{mode:'unknown'}]) assert.throws(()=>validateLearningEvent({...event('notice'),...extra}),{status:400});
 assert.equal(validateLearningEvent({...event('notice'),evidence:'<b>Paper</b>'}).evidence,'Paper');
});
test('existing membership gate rejects locked lessons before storage',async()=>{
 let writes=0;const req=l=>new Request('http://localhost',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(event(l))});
 const options={authenticate:async()=>({uid:'real',activeMember:false}),record:async(uid,e)=>{writes++;assert.equal(uid,'real');return applyLearningEvent({},e);}};
 const locked=createLearningSignalHandlers(options);assert.equal((await locked.POST(req('imagine'))).status,403);assert.equal(writes,0);assert.equal((await(await locked.POST(req('notice'))).json()).xpAwarded,50);
 const member=createLearningSignalHandlers({...options,authenticate:async()=>({uid:'real',activeMember:true})});assert.equal((await(await member.POST(req('imagine'))).json()).persisted,true);
});

test('next routes are reviewed and lesson input is strictly bounded', () => {
 for (const lesson of starterLessons) {
  const route = learningCatalog.routes[lesson.nextRouteKey];
  assert.ok(route);
  assert.ok(route.href === '/projects' || starterLessons.some(world => route.href === `/learn#world-${world.id}`));
 }
 for (const extra of [{lessonId: ['notice']}, {publicSummary: 'publish this'}, {eventType: 'lesson_started', evidence: 'x'.repeat(1201)}, {eventType: 'lesson_started', reflection: 123}]) {
  assert.throws(() => validateLearningEvent({...event('notice'), ...extra}), {status: 400});
 }
});
test('opted-in summary stays private until all worlds complete in any order', () => {
 let data = applyLearningEvent({}, validateLearningEvent({...event('share'), publicSummary: '<b>My tiny game</b>'})).data;
 assert.equal(starterPassportRecord(data).publicSummary, '');
 for (const lesson of starterLessons.filter(l => l.id !== 'share')) data = applyLearningEvent(data, validateLearningEvent(event(lesson.id))).data;
 assert.equal(starterPassportRecord(data).publicSummary, 'My tiny game');
 assert.equal(data.xp, 600);
});
