'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase';
import { goFetch } from '@/lib/go-client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const empty = { title: '', kind: 'guide', content: '', materialUrl: '' };
export default function MentorResources({ staff = false }) {
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState(empty);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState({});
  const path = `/api/mentor-resources${staff ? '?review=true' : ''}`;
  useEffect(() => {
    let version = 0;
    const stop = onAuthStateChanged(auth, async user => {
      const current = ++version; setData(null); setDraft(empty);
      if (!user) { setError('Sign in to open the resource workspace.'); return; }
      try { const result = await goFetch(path); if (version === current) { setData(result); setError(''); } } catch (e) { if (version === current) setError(e.message); }
    });
    return () => { version++; stop(); };
  }, [path]);
  async function save(body) {
    setBusy(true); setError(''); setMessage('');
    try { await goFetch('/api/mentor-resources', body); setData(await goFetch(path)); setDraft(empty); setMessage('Resource saved.'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-5xl space-y-6 px-5 py-12"><h1 className="text-4xl font-bold">{staff ? 'Review mentor learning resources' : 'Create learning resources'}</h1><p className="text-muted-foreground">Approved mentors can create guides, courses, workshops, video bundles and assets for GO review. The mentor earnings policy is 90%; paid sales and payouts will open once the accounting and payment terms are configured.</p><p className="text-sm">GO Business members can retain mentor earning access with the additional 1,500 MKD/month add-on. <Link className="text-primary underline" href="/contact">Arrange access with GO</Link>.</p>
    {error && <p role="alert" className="text-destructive">{error}</p>}{message && <p role="status">{message}</p>}
    {!data && <Link className="underline" href="/login?redirect=/mentor-resources">Sign in</Link>}
    {!staff && data && !data.canCreate && <p>GO approval and an active Mentor subscription or Business mentor add-on are required to create resources. <Link className="underline" href="/membership?intent=become-mentor">Review Mentor access</Link>.</p>}
    {!staff && data?.canCreate && <form className="space-y-4 rounded-xl border p-5" onSubmit={e => { e.preventDefault(); save({ ...draft, submit: true }); }}><label className="block">Title<Input required minLength={5} maxLength={160} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label><label className="block">Resource type<select className="ml-3 rounded border bg-background p-2" value={draft.kind} onChange={e => setDraft({ ...draft, kind: e.target.value })}>{['guide','course','workshop','video_bundle','asset'].map(kind => <option key={kind} value={kind}>{kind.replace('_', ' ')}</option>)}</select></label><label className="block">Learning material<Textarea rows={8} required minLength={30} maxLength={20000} value={draft.content} onChange={e => setDraft({ ...draft, content: e.target.value })} /></label><label className="block">Optional HTTPS material link<Input type="url" value={draft.materialUrl} onChange={e => setDraft({ ...draft, materialUrl: e.target.value })} /></label><div className="flex gap-3"><Button disabled={busy}>Submit for GO review</Button><Button type="button" variant="outline" disabled={busy} onClick={() => save({ ...draft, submit: false })}>Save draft</Button></div></form>}
    {data?.resources.map(item => <article key={item.id} className="space-y-3 rounded-xl border p-5"><h2 className="text-xl font-semibold">{item.title}</h2><p className="text-sm">{item.kind} · {item.status}</p><p className="whitespace-pre-wrap">{item.content}</p>{item.materialUrl && <a className="text-primary underline" href={item.materialUrl} target="_blank" rel="noopener noreferrer">Open learning material</a>}<p>{item.reviewNote}</p>{staff ? <><label className="block">Review notes<Textarea value={notes[item.id] || ''} onChange={e => setNotes({ ...notes, [item.id]: e.target.value })} /></label><div className="flex flex-wrap gap-3">{['published','changes_requested','archived'].map(status => <Button key={status} disabled={busy} variant="outline" onClick={() => save({ action: 'review', id: item.id, status, reviewNote: notes[item.id] })}>{status.replace('_', ' ')}</Button>)}</div></> : data.canCreate && <Button variant="outline" onClick={() => { setDraft(item); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit and resubmit</Button>}</article>)}
  </main>;
}
