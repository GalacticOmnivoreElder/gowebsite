"use client";
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
  const [mode, setMode] = useState('drawing');
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
    setEvidence(''); setReflection(''); setShare(false); setPublicSummary(''); setMessage(''); setError('');
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
    setMode(draft?.mode ?? lesson.modes[0]); setError(''); setMessage('');
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
    if (!evidence.trim() || !reflection.trim()) { setError('Add both evidence and reflection before completing the mission.'); return; }
    submitting.current = true; setBusy(true); setError('');
    const version = generation.current;
    const user = auth.currentUser;
    const body = { eventType: 'lesson_complete', eventId: crypto.randomUUID(), lessonId: lesson.id, evidence, reflection, mode, ...(lesson.id === 'share' && share ? { publicSummary } : {}) };
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
    <h2>Make your first tiny game</h2>
    <p>Notice → Imagine → Shape → Build → Test → Share</p>
    <p>500 mission XP + 100 completion bonus. Notice is free; continue with GO Community.</p>
    <button type="button" onClick={() => open(0)} disabled={busy || loading}>Start Starter Pathway</button>
    <p>{summary.completedLessons.length} of 6 worlds complete · {summary.xp} learning XP</p>
    <nav aria-label="Six learning worlds" className="starter-worlds">{starterLessons.map((world, i) => <button key={world.id} type="button" disabled={busy} aria-current={index === i ? 'step' : undefined} onClick={() => open(i)}>{world.world}. {world.title}{summary.completedLessons.includes(world.id) ? ' ✓ Complete' : world.access !== 'free' && !access ? ' · Community' : ''}</button>)}</nav>
    {loading && <p role="status">Checking your saved progress…</p>}
    {lesson && <article>
      <h3 ref={heading} tabIndex={-1}>World {lesson.world} — {lesson.title}</h3>
      <p>{lesson.promise}</p>
      {locked ? <p>This world is included with GO Community. <Link href="/membership">Explore membership</Link> or <Link href="/login">sign in</Link> to continue.</p> : <>
        <p>{lesson.idea}</p><h4>Notice an example</h4><p>{lesson.example}</p>
        <h4>Your mission · {lesson.missionXp} XP</h4><p>{lesson.mission}</p>
        <form onSubmit={complete} aria-busy={busy}>
          <label htmlFor="starter-mode">How will you make it?</label>
          <select id="starter-mode" value={mode} onChange={e => edit('mode', e.target.value, setMode)} disabled={busy}>{lesson.modes.map(value => <option key={value} value={value}>{value.replaceAll('-', ' ')}</option>)}</select>
          <label htmlFor="starter-evidence">Evidence — {lesson.evidencePrompt}</label>
          <textarea id="starter-evidence" required maxLength={1200} value={evidence} onChange={e => edit('evidence', e.target.value, setEvidence)} disabled={busy} aria-invalid={!!error} aria-describedby="starter-guidance starter-error" />
          <label htmlFor="starter-reflection">Reflection — {lesson.reflectionPrompt}</label>
          <textarea id="starter-reflection" required maxLength={1200} value={reflection} onChange={e => edit('reflection', e.target.value, setReflection)} disabled={busy} aria-invalid={!!error} aria-describedby="starter-guidance starter-error" />
          <p id="starter-guidance">Up to 1,200 characters in each field. Describe your work or paste a project link. Evidence and reflection stay private.</p>
          {lesson.id === 'share' && !summary.completedLessons.includes('share') && <><label><input type="checkbox" checked={share} onChange={e => edit('share', e.target.checked, setShare)} disabled={busy} /> Include a separate project summary in my Passport when I finish all six worlds, following my existing visibility settings.</label>{share && <><label htmlFor="starter-public">Project summary to share (optional, up to 1,200 characters)</label><textarea id="starter-public" maxLength={1200} value={publicSummary} onChange={e => edit('publicSummary', e.target.value, setPublicSummary)} disabled={busy} /></>}</>}
          <button disabled={busy || loading} type="submit">{busy ? 'Saving…' : summary.completedLessons.includes(lesson.id) ? 'Confirm completion (no extra XP)' : 'Complete mission'}</button>
        </form>
      </>}
      {summary.completedLessons.includes(lesson.id) && <p>{index < 5 ? <button type="button" disabled={busy} onClick={() => open(index + 1)}>Next world: {lesson.nextRouteLabel}</button> : <Link href="/projects">Explore GO Projects</Link>}</p>}
    </article>}
    <p id="starter-error" role="alert">{error}</p><p role="status">{message}</p>
    <p><Link href="/profile/cv">Your GameDev Passport</Link> · <Link href="/education">Browse GO Education</Link></p>
  </section>;
}

