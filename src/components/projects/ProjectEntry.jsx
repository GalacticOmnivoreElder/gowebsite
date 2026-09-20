'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import Link from 'next/link';
import { auth } from '@/firebase';
import CreateProjectForm from '@/components/projects/CreateProjectForm';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function ProjectEntry() {
  const [state, setState] = useState({ loading: true });
  const [hire, setHire] = useState(false);
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const hiring = new URLSearchParams(window.location.search).get('intent') === 'hire-talent';
    setHire(hiring);
    let generation = 0;
    const stop = onAuthStateChanged(auth, async user => {
      const current = ++generation;
      if (!user) { setState({ signedOut: true }); setOpen(hiring); return; }
      setState({ loading: true });
      try {
        const response = await fetch('/api/go-access', { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: 'no-store' });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        if (generation === current) { setState(body); setOpen(hiring && body.tier !== 'company' && !body.admin); }
      } catch (error) { if (generation === current) setState({ error: error.message }); }
    });
    return () => { generation++; stop(); };
  }, [version]);
  if (state.loading) return <p role="status" className="p-10 text-center">Checking your project access…</p>;
  const eligible = !state.frozen && state.capacity?.canCreate && (!hire || state.tier === 'company' || state.admin);
  if (eligible) return <CreateProjectForm />;
  const message = state.error || (state.frozen ? 'Your workspace is read-only until your membership is renewed.' : state.capacity?.reason === 'business_capacity_required' ? 'Contact GO to agree your Business project allowance.' : state.capacity && !state.capacity.canCreate && state.activeMember ? 'Your project allowance is in use. GO must approve a release before you can start another project.' : hire ? 'An active GO Business subscription is required for hiring briefs. Your project capacity is agreed with the GO team.' : 'Community and Mentor members can build one creator project at a time. GO release approval unlocks the next.');
  return <main className="mx-auto max-w-3xl px-5 py-14"><h1 className="text-4xl font-bold">{hire ? 'Hire talent with GO Business' : 'Start your creator project'}</h1><p className="my-6 text-lg text-muted-foreground">{message}</p>
    <div className="flex flex-wrap gap-3">
      {state.error ? <Button onClick={() => setVersion(v => v + 1)}>Retry access check</Button> : <>
        {state.signedOut && <Button asChild><Link href={`/login?redirect=${encodeURIComponent('/project/create' + (hire ? '?intent=hire-talent' : ''))}`}>Sign in to continue</Link></Button>}
        {!state.activeMember && <Button asChild><Link href={`/membership?intent=${hire ? 'hire-talent' : 'publish-solo'}`}>Explore membership</Link></Button>}
        {hire && state.activeMember && state.tier !== 'company' && <Button asChild><Link href="/membership?intent=hire-talent#plans">Review Business access</Link></Button>}
        <Button variant="outline" asChild><Link href="/creator-projects">My creator projects</Link></Button>
        <Button variant="outline" asChild><Link href="/contact">Contact GO</Link></Button>
      </>}
    </div>
    {hire && <p className="mt-8">Building your own game? <Link className="text-primary underline" href="/project/create">Use your included creator project.</Link></p>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogTitle>Hire talent with GO Business</DialogTitle><DialogDescription>Create hiring briefs, review applicants and build your team. An active Business subscription is required; project capacity is agreed with GO. You can hire community members, mentors, or approved community experts.</DialogDescription><Button asChild><Link href="/membership?intent=hire-talent">Explore GO Business</Link></Button><Button variant="outline" asChild><Link href="/contact">Discuss project capacity</Link></Button><Button variant="ghost" onClick={() => setOpen(false)}>Not now</Button></DialogContent></Dialog>
  </main>;
}
