'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BookOpen, Gamepad2, Briefcase } from 'lucide-react';
import { GO_INTENTS, rememberGoIntent, savedGoIntent } from '@/lib/go-intents';

const pillars = [
  { id: 'learn', title: 'LEARN', copy: 'Get guidance. Share what you know.', icon: BookOpen },
  { id: 'portfolio', title: 'PORTFOLIO', copy: 'Find your team. Build and publish.', icon: Gamepad2 },
  { id: 'outsource', title: 'OUTSOURCE', copy: 'Find paid work. Hire the right people.', icon: Briefcase },
];

export function GoEntry() {
  const [pillar, setPillar] = useState(null);
  const [saved, setSaved] = useState(null);
  const heading = useRef(null);
  useEffect(() => { setSaved(savedGoIntent()); }, []);
  useEffect(() => { if (pillar) heading.current?.focus(); }, [pillar]);
  return <section className="relative overflow-hidden border-b border-primary/30 bg-[#0b080e] px-5 py-12 text-white sm:py-20" aria-labelledby="go-entry-title">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(202,34,128,0.18),transparent_70%)]" />
    <div className="relative mx-auto max-w-6xl">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[.24em] text-primary">Your next step starts here</p>
      <h1 id="go-entry-title" className="max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl">Learn with guidance.<br />Build something worth sharing.</h1>
      <p className="mt-5 max-w-2xl text-lg text-white/70">Meet mentors, find collaborators, or connect your skills with an opportunity.</p>
      <div className="mt-10 flex items-center justify-between gap-4">
        <h2 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none sm:text-2xl">{pillar ? 'How would you like to start?' : 'What do you want to do?'}</h2>
        <span className="shrink-0 text-sm text-white/60">{pillar ? '2' : '1'} of 2</span>
      </div>
      <div className={`mt-5 grid gap-4 ${pillar ? 'sm:grid-cols-2' : 'md:grid-cols-3'}`}>
        {!pillar ? pillars.map(({ id, title, copy, icon: Icon }) => <button type="button" key={id} onClick={() => setPillar(id)} className="group min-h-44 rounded-2xl border border-white/20 bg-white/5 p-7 text-left transition-colors hover:border-primary hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
          <Icon className="mb-6 h-7 w-7 text-primary" aria-hidden="true" /><span className="block text-xl font-bold">{title}</span><span className="mt-2 block text-sm text-white/70">{copy}</span>
        </button>) : Object.entries(GO_INTENTS).filter(([, item]) => item.pillar === pillar).map(([id, item]) => <Link key={id} href={item.href} onClick={() => rememberGoIntent(id)} className="rounded-2xl border border-primary/50 bg-primary/10 p-7 transition-colors hover:bg-primary/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
          <span className="flex items-center justify-between gap-3 text-xl font-bold">{item.label}<ArrowRight aria-hidden="true" /></span><span className="mt-3 block text-white/70">{item.description}</span>
        </Link>)}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-6 text-sm">
        {pillar && <button type="button" onClick={() => { setPillar(null); heading.current?.focus(); }} className="flex min-h-11 items-center gap-2 underline underline-offset-4"><ArrowLeft size={16} />Change goal</button>}
        <Link href="/community" className="min-h-11 content-center text-white/70 underline underline-offset-4">Just exploring? Browse GO</Link>
        {saved && <Link href={GO_INTENTS[saved].continueTo} className="min-h-11 content-center text-primary underline underline-offset-4">Continue: {GO_INTENTS[saved].label}</Link>}
      </div>
    </div>
  </section>;
}
