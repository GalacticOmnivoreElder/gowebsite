"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function SharedGoMilestones() {
  const [entries, setEntries] = useState([]); const [message, setMessage] = useState("Loading GO milestones…");
  useEffect(() => { fetch("/api/community-timeline", { cache: "no-store" }).then((response) => { if (!response.ok) throw new Error(); return response.json(); }).then((data) => { setEntries(data.entries.filter((entry) => entry.state === "completed")); setMessage(""); }).catch(() => setMessage("GO milestones are temporarily unavailable.")); }, []);
  return <section className="mt-8 rounded-xl border bg-card p-5 sm:p-7"><h2 className="text-2xl font-bold">Shared GO milestones</h2><p className="mt-2 text-sm text-muted-foreground">These public GO milestones provide context; they do not indicate personal attendance or membership.</p>{message ? <p className="mt-3" role="status">{message}</p> : entries.length ? <ol className="mt-4 space-y-2">{entries.map((entry) => <li key={entry.id}><time dateTime={entry.date}>{entry.date}</time> · <Link className="underline" href={`/timeline#${encodeURIComponent(entry.id)}`}>{entry.title}</Link></li>)}</ol> : <p className="mt-3">No verified milestones have been published yet.</p>}</section>;
}
