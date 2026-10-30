"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function TimelinePage() {
  const [entries, setEntries] = useState([]);
  const [status, setStatus] = useState("Loading timeline…");
  const [category, setCategory] = useState("");
  const [organization, setOrganization] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const timelineRef = useRef(null);
  useEffect(() => {
    fetch("/api/community-timeline", { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setEntries(data.entries); setStatus("");
    }).catch(() => setStatus("The timeline could not be loaded. Please try again later."));
  }, []);
  useEffect(() => {
    if (!entries.length || !window.location.hash) return;
    let id;
    try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
    document.getElementById(id)?.scrollIntoView();
  }, [entries]);
  const visible = useMemo(() => entries.filter((entry) => (!category || entry.category === category) && (!organization || entry.organization === organization) && (!from || entry.date >= from) && (!to || entry.date <= to)), [entries, category, organization, from, to]);
  function moveTimeline(direction) {
    const timeline = timelineRef.current;
    if (!timeline) return;
    const card = timeline.querySelector("li");
    const gap = Number.parseFloat(window.getComputedStyle(timeline).columnGap) || 0;
    timeline.scrollBy({ left: direction * ((card?.getBoundingClientRect().width || timeline.clientWidth) + gap), behavior: "auto" });
  }
  return <main className="mx-auto max-w-5xl space-y-8 px-5 py-12">
    <header><p className="text-sm font-semibold uppercase tracking-widest text-primary">Unite · Create · Evolve</p><h1 className="mt-2 text-4xl font-bold">GO timeline and roadmap</h1><p className="mt-4 text-muted-foreground">Explore verified history and future ideas. Proposals and community preferences are not delivery commitments.</p></header>
    <details className="rounded-xl border p-5">
      <summary className="cursor-pointer font-medium">Filter timeline</summary>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <label>Category<select className="mt-1 block w-full rounded border bg-background p-2" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{[...new Set(entries.map((entry) => entry.category))].sort().map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Organization<select className="mt-1 block w-full rounded border bg-background p-2" value={organization} onChange={(event) => setOrganization(event.target.value)}><option value="">All organizations</option>{[...new Set(entries.map((entry) => entry.organization).filter(Boolean))].sort().map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>From<input type="date" className="mt-1 block w-full rounded border bg-background p-2" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
      <label>To<input type="date" className="mt-1 block w-full rounded border bg-background p-2" value={to} onChange={(event) => setTo(event.target.value)} /></label>
      </div>
    </details>
    {status ? <p role="status">{status}</p> : visible.length ? <section aria-labelledby="timeline-events-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h2 id="timeline-events-heading" className="text-2xl font-semibold">Explore the timeline</h2><p className="mt-1 text-sm text-muted-foreground">{visible.length} {visible.length === 1 ? "entry" : "entries"} · Swipe or use the arrows to explore.</p></div>
        <div className="flex gap-2"><button type="button" onClick={() => moveTimeline(-1)} aria-label="Scroll to earlier timeline entries" aria-controls="timeline-entries" className="inline-flex h-11 w-11 items-center justify-center rounded-full border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><ArrowLeft className="h-5 w-5" aria-hidden="true" /></button><button type="button" onClick={() => moveTimeline(1)} aria-label="Scroll to later timeline entries" aria-controls="timeline-entries" className="inline-flex h-11 w-11 items-center justify-center rounded-full border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><ArrowRight className="h-5 w-5" aria-hidden="true" /></button></div>
      </div>
      <ol id="timeline-entries" ref={timelineRef} tabIndex={0} aria-label="Timeline entries, in chronological order" onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "ArrowLeft" || event.key === "ArrowRight")) { event.preventDefault(); moveTimeline(event.key === "ArrowLeft" ? -1 : 1); } }} className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-4 motion-safe:scroll-smooth motion-reduce:scroll-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        {visible.map((entry) => <li id={entry.id} key={entry.id} className="w-[85%] min-w-0 shrink-0 snap-start scroll-mt-8 rounded-xl border bg-card p-5 sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)]"><div className="flex flex-wrap gap-3 text-sm text-muted-foreground"><time dateTime={entry.date}>{entry.date}</time><span>{entry.category}</span><strong>{entry.state}</strong></div><h3 className="mt-2 text-xl font-semibold">{entry.title}</h3><details className="mt-3"><summary className="cursor-pointer">Details</summary><p className="mt-3 whitespace-pre-wrap">{entry.description}</p>{entry.organization && <p className="mt-3">Related organization: {entry.organization}{entry.relationship ? ` — ${entry.relationship}` : ""}</p>}{entry.project && <p>Project: {entry.project}</p>}{entry.image && <Image unoptimized src={entry.image} alt={entry.imageAlt || entry.title} width={800} height={450} className="mt-3 h-auto max-h-96 w-auto max-w-full rounded object-contain" />}{entry.link && <a className="mt-2 block underline" href={entry.link}>Related link</a>}{entry.source && <a className="mt-2 block underline" href={entry.source}>Source</a>}</details><a className="mt-3 inline-block text-sm underline" href={`#${entry.id}`}>Link to this entry</a></li>)}
      </ol>
    </section> : <p>{entries.length ? "No entries match these filters." : "No timeline entries have been published yet. Verified history will appear here after review."}</p>}
  </main>;
}
