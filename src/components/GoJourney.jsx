'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase';
import { GO_INTENTS, savedGoIntent, rememberGoIntent } from '@/lib/go-intents';

export function GoJourney({ membership = false }) {
  const pathname = usePathname();
  const [intent, setIntent] = useState(null);
  const [access, setAccess] = useState(null);
  useEffect(() => {
    rememberGoIntent(new URLSearchParams(window.location.search).get('intent'));
    setIntent(savedGoIntent());
    let current = 0;
    const stop = onAuthStateChanged(auth, async user => {
      const version = ++current;
      setAccess(null);
      if (!user) return;
      try {
        const response = await fetch('/api/go-access', { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: 'no-store' });
        const data = await response.json();
        if (version === current && response.ok) setAccess(data);
      } catch { /* No inferred entitlement on network failure. */ }
    });
    return () => { current++; stop(); };
  }, [pathname]);
  if (access?.frozen) return <aside role="status" className="border-b border-amber-500/40 bg-amber-500/10 p-4 text-center text-sm">Your membership has ended. Your existing work remains available to view; changes are frozen. <Link className="underline" href="/membership">Renew membership</Link> or <Link className="underline" href="/support">contact GO</Link>.</aside>;
  if (!intent || (!membership && pathname !== '/subscription/success' && pathname !== '/profile/cv')) return null;
  const item = GO_INTENTS[intent];
  return <aside className="mx-auto my-5 max-w-5xl rounded-xl border border-primary/40 bg-primary/5 p-5">
    <p className="text-sm text-muted-foreground">Your goal</p><h2 className="mt-1 text-xl font-semibold">{item.label}</h2>
    <p className="mt-2 text-sm">{intent === 'publish-solo' ? 'Build one creator project at a time, then work with GO on release preparation and publishing guidance.' : intent === 'find-team' ? 'Find existing team opportunities or use your included creator project to bring collaborators together.' : intent === 'become-mentor' ? 'Apply for GO review and an interview. Subscription access and mentor approval are separate.' : item.description}</p>
    {(access?.activeMember || intent === 'become-mentor' || intent === 'find-work' || intent === 'mentorship') && <Link className="mt-4 inline-block font-semibold text-primary underline" href={item.continueTo}>Continue: {item.label} →</Link>}
  </aside>;
}
