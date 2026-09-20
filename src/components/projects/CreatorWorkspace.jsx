'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import Link from 'next/link';
import { auth } from '@/firebase';
import { goFetch } from '@/lib/go-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function CreatorWorkspace({ staff = false }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [account, setAccount] = useState({ userId: '', limit: '', reason: '', endsAt: '' });
  async function reload() { setData(await goFetch(staff ? '/api/project-workspace?review=true' : '/api/go-access')); }
  useEffect(() => {
    let live = true;
    const stop = onAuthStateChanged(auth, user => {
      setData(null); setSignedOut(!user); setError('');
      if (user) goFetch(staff ? '/api/project-workspace?review=true' : '/api/go-access').then(result => { if (live) setData(result); }).catch(e => { if (live) setError(e.message); });
    });
    return () => { live = false; stop(); };
  }, [staff]);
  async function save(body) {
    setBusy(true); setError('');
    try { await goFetch('/api/project-workspace', body); await reload(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const projects = staff ? data?.projects : data?.capacity?.projects;
  return <main className="mx-auto max-w-5xl space-y-7 px-5 py-12"><header><p className="text-sm font-semibold text-primary">PORTFOLIO</p><h1 className="mt-2 text-4xl font-bold">{staff ? 'Project release and access review' : 'Your creator projects'}</h1><p className="mt-4 text-muted-foreground">{staff ? 'Record release decisions, negotiated Business capacity and verified mentor add-on access.' : 'Build with collaborators, prepare a release, and learn to publish through GO’s itch.io or Steam account with guidance from the GO team.'}</p></header>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {signedOut ? <Button asChild><Link href="/login?redirect=/creator-projects">Sign in to view your projects</Link></Button> : !data && !error ? <p role="status">Loading your workspace…</p> : null}
    {!staff && data && <section className="rounded-xl border p-5"><h2 className="text-xl font-semibold">Your project allowance</h2><p className="my-3">{data.capacity.used} in progress · {data.capacity.limit === null ? 'GO administrator access' : `${data.capacity.limit} available under your plan`}. GO release approval unlocks your next creator project.</p><div className="flex flex-wrap gap-3"><Button asChild><Link href="/project/create">{data.capacity.canCreate ? 'Start a creator project' : 'Review project access'}</Link></Button><Button variant="outline" asChild><Link href="/projects?intent=find-team">Find a team opportunity</Link></Button><Button variant="outline" asChild><Link href="/support">Ask GO for help</Link></Button></div></section>}
    {staff && data && <form className="space-y-4 rounded-xl border p-5" onSubmit={e => { e.preventDefault(); save({ ...account, action: 'set_capacity', limit: Number(account.limit) }); }}><h2 className="text-xl font-semibold">Account agreement</h2><label className="block">Account ID<Input required value={account.userId} onChange={e => setAccount({ ...account, userId: e.target.value })} /></label><label className="block">Negotiated concurrent project limit<Input type="number" min="0" max="10000" required value={account.limit} onChange={e => setAccount({ ...account, limit: e.target.value })} /></label><label className="block">Agreement or payment reference<Textarea required minLength={8} value={account.reason} onChange={e => setAccount({ ...account, reason: e.target.value })} /></label><Button disabled={busy}>Save Business capacity</Button><p className="text-sm text-muted-foreground">Business mentor earning access costs an additional 1,500 MKD/month. Grant access only after payment is verified. This control does not collect a payment.</p><label className="block">Add-on paid through<Input type="date" value={account.endsAt} onChange={e => setAccount({ ...account, endsAt: e.target.value })} /></label><div className="flex flex-wrap gap-3"><Button type="button" disabled={busy} onClick={() => save({ ...account, action: 'set_mentor_addon', status: 'active' })}>Record verified add-on access</Button><Button type="button" variant="outline" disabled={busy} onClick={() => save({ ...account, action: 'set_mentor_addon', status: 'inactive' })}>End add-on access</Button></div></form>}
    {projects?.length === 0 && <p>No projects to show yet.</p>}
    {projects?.map(project => <article key={project.id} className="space-y-4 rounded-xl border p-5"><h2 className="text-xl font-semibold"><Link className="underline" href={`/project/${project.id}`}>{project.title}</Link></h2><p className="text-sm">Release: {project.releaseApproval?.status || 'Not submitted'} · Publishing guidance: {project.publishingRequest?.status || 'Not requested'}</p>{staff && <p className="text-sm">Owner: {project.owner}</p>}
      {[project.releaseApproval, project.publishingRequest].filter(Boolean).map((review, index) => <div key={index} className="text-sm"><p>{review.note || review.reviewNote}</p>{/^https:\/\//i.test(review.evidenceUrl || '') && <a className="text-primary underline" href={review.evidenceUrl} target="_blank" rel="noopener noreferrer">Review submitted materials</a>}</div>)}
      {project.releaseApproval?.status !== 'approved' && <fieldset disabled={busy || (!staff && (!data.activeMember || data.frozen))} className="space-y-3 disabled:opacity-60"><label className="block">{staff ? 'Review outcome and evidence' : 'What would you like GO to review?'}<Textarea value={drafts[project.id]?.note || ''} onChange={e => setDrafts({ ...drafts, [project.id]: { ...drafts[project.id], note: e.target.value } })} /></label>{!staff && <label className="block">Playable build or release materials (HTTPS)<Input type="url" value={drafts[project.id]?.evidenceUrl || ''} onChange={e => setDrafts({ ...drafts, [project.id]: { ...drafts[project.id], evidenceUrl: e.target.value } })} /></label>}<div className="flex flex-wrap gap-3"><Button onClick={() => save({ ...drafts[project.id], projectId: project.id, action: staff ? 'approve_release' : 'request_release' })}>{staff ? 'Approve released game' : 'Request release review'}</Button><Button variant="outline" onClick={() => save({ ...drafts[project.id], projectId: project.id, action: staff ? 'review_publishing' : 'request_publishing' })}>{staff ? 'Record publishing review' : 'Request publishing guidance'}</Button></div></fieldset>}
    </article>)}
  </main>;
}
