"use client";
import "./starter-pathway.css";
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase';
import { starterLessons } from '@/content/evergreen-curriculum.mjs';
import { applyLearningEvent, learningSummary, validateLearningEvent } from '@/lib/omnivore-progress.mjs';

export default function StarterPathway({ requestedLesson, onProgress }) {
  const [index, setIndex] = useState(null);
  const [summary, setSummary] = useState(learningSummary);
  const [access, setAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [evidence, setEvidence] = useState('');
  const [reflection, setReflection] = useState('');
  const [share, setShare] = useState(false);
  const [publicSummary, setPublicSummary] = useState('');
  const [approach, setApproach] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const local = useRef({});
  const drafts = useRef({});
  const generation = useRef(0);
  const submitting = useRef(false);
  const heading = useRef(null);
  const lesson = index === null ? null : starterLessons[index];
  const locked = lesson && lesson.access !== 'free' && !access;
  useEffect(() => onAuthStateChanged(auth, async user => {
    const version = ++generation.current;
    local.current = {}; drafts.current = {}; submitting.current = false;
    setSummary(learningSummary()); setAccess(false); setLoading(true); setBusy(false);
    setEvidence(''); setReflection(''); setApproach(''); setShare(false); setPublicSummary(''); setMessage(''); setError('');
    try {
      if (!user) return;
      const token = await user.getIdToken();
      const response = await fetch('/api/learning-signal', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(6000) });
      const payload = await response.json();
      if (version !== generation.current) return;
      if (response.ok && payload.persisted) {
        local.current = payload.summary; setSummary(payload.summary); setAccess(payload.communityAccess === true);
      } else setMessage('Saved progress is unavailable. Notice is available for this visit.');
    } catch { if (version === generation.current) setMessage('Saved progress is unavailable. Notice is available for this visit.'); }
    finally { if (version === generation.current) setLoading(false); }
  }), []);
  useEffect(() => {
    if (requestedLesson && !submitting.current) setIndex(0);
    // The request is an explicit action from the instructor.
  }, [requestedLesson]);
  useEffect(() => {
    function followHash() {
      const next = starterLessons.findIndex(world => `#world-${world.id}` === window.location.hash);
      if (next >= 0 && !submitting.current) setIndex(next);
    }
    followHash();
    window.addEventListener('hashchange', followHash);
    return () => window.removeEventListener('hashchange', followHash);
  }, []);
  useEffect(() => {
    if (!lesson) return;
    const draft = drafts.current[lesson.id];
    setEvidence(draft?.evidence ?? ''); setReflection(draft?.reflection ?? '');
    setShare(draft?.share ?? false); setPublicSummary(draft?.publicSummary ?? '');
    setApproach(draft?.approach ?? ''); setError(''); setMessage('');
  }, [lesson]);
  useEffect(() => { if (index !== null) heading.current?.focus(); }, [index]);
  function open(next) {
    setIndex(next);
  }
  function edit(field, value, setter) {
    drafts.current[lesson.id] = { ...drafts.current[lesson.id], [field]: value };
    setter(value);
  }
  async function complete(event) {
    event.preventDefault();
    if (submitting.current || locked || loading) return;

    submitting.current = true; setBusy(true); setError('');
    const version = generation.current;
    const user = auth.currentUser;
    const body = { eventType: 'lesson_complete', eventId: crypto.randomUUID(), lessonId: lesson.id, evidence, reflection, ...(approach ? { approach } : {}), ...(lesson.id === 'share' && share ? { publicSummary } : {}) };
    try {
      let payload;
      if (user) {
        try {
          const token = await user.getIdToken();
          const response = await fetch('/api/learning-signal', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(6000) });
          payload = await response.json();
          if ([400,401,403,413,415,429].includes(response.status)) {
            if (version === generation.current) { setError(payload.error || 'Please sign in again before saving.'); if (response.status === 403) setAccess(false); }
            return;
          }
        } catch { /* Preserve this visit when the service is unreachable. */ }
      }
      if (version !== generation.current || auth.currentUser !== user) return;
      const persisted = payload?.persisted === true;
      const result = persisted ? payload : applyLearningEvent(local.current, validateLearningEvent(body));
      local.current = persisted ? { ...local.current, ...result.summary } : result.data;
      setSummary(result.summary);
      if (persisted) onProgress?.(result.summary);
      setMessage(`${lesson.badgeTitle} · ${lesson.skillTitle} · ${result.xpAwarded} XP awarded. ${persisted ? 'Saved to your Passport.' : 'Saved for this visit only. Your Passport has not been updated.'}${result.summary.pathwayComplete ? ' Starter Game Maker complete!' : ''}`);
    } catch { setError('This mission could not be completed. Your writing is still here; please try again.'); }
    finally { if (version === generation.current) { submitting.current = false; setBusy(false); } }
  }
  return <section className="starter-pathway" aria-label="Starter Pathway" data-clarity-mask="true">
    <p className="starter-eyebrow">Six steps · One small playable idea</p><h2>Learn the thinking behind making games</h2><p>Explore actions, choices, rules, and consequences. Use whatever you have, at your own pace. No particular tool or game engine is needed.</p>
    <p>Notice → Imagine → Shape → Build → Test → Share</p>
    <p>500 mission XP + 100 completion bonus. Notice is free; continue with GO Community.</p>
    <button type="button" onClick={() => open(0)} disabled={busy || loading}>Begin the journey</button>
    <p>{summary.completedLessons.length} of 6 steps complete · {summary.xp} learning XP</p>
    <nav aria-label="Six steps of making a game" className="starter-worlds">{starterLessons.map((world, i) => <button key={world.id} type="button" disabled={busy} aria-current={index === i ? 'step' : undefined} onClick={() => open(i)}>{world.world}. {world.title}{summary.completedLessons.includes(world.id) ? ' ✓ Complete' : world.access !== 'free' && !access ? ' · Community' : ''}</button>)}</nav>
    {loading && <p role="status">Checking your saved progress…</p>}
    {lesson && <article>
      <h3 ref={heading} tabIndex={-1}>Step {lesson.world} — {lesson.title}</h3>
      <p>{lesson.promise}</p>
      {locked ? <p>This step is included with GO Community. <Link href="/membership">Explore membership</Link> or <Link href="/login">sign in</Link> to continue.</p> : <>
        <div className="starter-idea"><h4>The idea</h4><p>{lesson.idea}</p></div>
        <details className="starter-example"><summary>See a simple example</summary><p>{lesson.example}</p></details>
        <div className="starter-mission"><h4>Try this</h4><p>{lesson.mission}</p><ol>{lesson.steps.map(step => <li key={step}>{step}</li>)}</ol></div>
        <p className="starter-principle"><strong>Carry this with you</strong><br />{lesson.principle}</p>
        <form onSubmit={complete} aria-busy={busy}>
          <fieldset className="starter-approaches" disabled={busy}>
            <legend>{lesson.approachPrompt} <span>(optional)</span></legend>
            <p>Choose a starting point if it helps. Both approaches explore the same idea.</p>
            {lesson.approaches.map(option => <label className="starter-approach" key={option.id}>
              <input type="radio" name="starter-approach" value={option.id} checked={approach === option.id} onChange={() => edit('approach', option.id, setApproach)} />
              <span><strong>{option.label}</strong><span>{option.detail}</span></span>
            </label>)}
          </fieldset>
          <div className="starter-journal">
            <h4>Your journey, your way</h4>
            <p>{lesson.evidencePrompt}</p>
            <p id="starter-guidance">These notes are optional and private. Use this space or keep your own journal. There is nothing to prove or upload. Up to 1,200 characters per field; notes entered here are saved with your first completion.</p>
            <label htmlFor="starter-evidence">Something you want to remember (optional)</label>
            <textarea id="starter-evidence" maxLength={1200} placeholder="An idea, a surprise, a decision… whatever matters to you." value={evidence} onChange={e => edit('evidence', e.target.value, setEvidence)} disabled={busy} aria-describedby="starter-guidance starter-error" />
            <label htmlFor="starter-reflection">A question to take with you (optional)</label>
            <p id="starter-reflection-prompt">{lesson.reflectionPrompt}</p>
            <textarea id="starter-reflection" maxLength={1200} placeholder="Leave a thought here, or simply take a moment to reflect." value={reflection} onChange={e => edit('reflection', e.target.value, setReflection)} disabled={busy} aria-describedby="starter-reflection-prompt starter-guidance starter-error" />
          </div>
          {lesson.id === 'share' && !summary.completedLessons.includes('share') && <><label><input type="checkbox" checked={share} onChange={e => edit('share', e.target.checked, setShare)} disabled={busy} /> Include a separate project summary in my Passport when I finish all six worlds, following my existing visibility settings.</label>{share && <><label htmlFor="starter-public">Project summary to share (optional, up to 1,200 characters)</label><textarea id="starter-public" maxLength={1200} value={publicSummary} onChange={e => edit('publicSummary', e.target.value, setPublicSummary)} disabled={busy} /></>}</>}
          <button disabled={busy || loading} type="submit">{busy ? 'Saving…' : summary.completedLessons.includes(lesson.id) ? 'Confirm completion (no extra XP)' : 'Mark this step complete'}</button>
        </form>
      </>}
      {summary.completedLessons.includes(lesson.id) && <p>{index < 5 ? <button type="button" disabled={busy} onClick={() => open(index + 1)}>Next step: {lesson.nextRouteLabel}</button> : <Link href="/projects">Explore GO Projects</Link>}</p>}
    </article>}
    <p id="starter-error" role="alert">{error}</p><p role="status">{message}</p>
    <p><Link href="/profile?tab=learning">Your learning journey</Link> · <Link href="/profile/cv">Your GameDev Passport</Link> · <Link href="/education">Browse GO Education</Link></p>
  </section>;
}

