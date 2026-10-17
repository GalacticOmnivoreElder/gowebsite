"use client";

import { useEffect, useState } from "react";
import { auth } from "@/firebase";

function formatDate(value) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)) + " UTC";
}

export default function GoDevelopmentLog({ journey, isOwner, userId }) {
  const [data, setData] = useState(journey);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const [loadingOlder, setLoadingOlder] = useState(false);
  useEffect(() => setData(journey), [journey]);
  if (!data) return null;
  const kpis = data.kpis || {};

  async function setVisibility(entry) {
    setBusyId(entry.id); setMessage("");
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/development-log", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ eventId: entry.id, isPublic: entry.visibility !== "public" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Log visibility could not be updated.");
      setData((current) => ({
        ...current,
        kpis: result.kpis,
        entries: current.entries.map((item) => item.id === entry.id ? { ...item, visibility: entry.visibility === "public" ? "private" : "public" } : item),
      }));
      setMessage("Log visibility updated.");
    } catch (error) { setMessage(error.message); }
    finally { setBusyId(""); }
  }

  async function loadOlder() {
    if (!data.nextCursor) return;
    setLoadingOlder(true); setMessage("");
    try {
      const headers = {};
      if (auth.currentUser) headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
      const params = new URLSearchParams({ userId, cursor: data.nextCursor });
      const response = await fetch(`/api/development-log?${params}`, { headers, cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Earlier log entries could not be loaded.");
      setData((current) => ({ ...current, entries: [...current.entries, ...result.entries], nextCursor: result.nextCursor, kpis: result.kpis }));
    } catch (error) { setMessage(error.message); }
    finally { setLoadingOlder(false); }
  }

  const summary = `${kpis.gameJamsAttended || 0} verified game jam${kpis.gameJamsAttended === 1 ? "" : "s"} · ${kpis.collaborationsAccepted || 0} accepted collaboration match${kpis.collaborationsAccepted === 1 ? "" : "es"} · ${kpis.skillsValidated || 0} skill validation${kpis.skillsValidated === 1 ? "" : "s"}`;
  return <section className="mt-8 rounded-xl border bg-card p-5 sm:p-7" aria-labelledby="go-development-log-heading">
    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">GO system log</p>
    <h2 id="go-development-log-heading" className="mt-2 text-2xl font-bold">Development journey</h2>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">Progress summary: {summary}. Counts describe recorded GO milestones; they do not rank creators or measure skill level.</p>
    {data.entries?.length ? <ol className="mt-6 space-y-3">{data.entries.map((entry) => <li key={entry.id} className="rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{entry.title}{entry.visibility === "private" ? <span className="ml-2 rounded-full border px-2 py-0.5 text-xs font-normal text-muted-foreground">Private</span> : null}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{entry.privateSummary || entry.summary}</p>
          <p className="mt-2 text-xs text-muted-foreground" title={`Based on Planck 2018 base-ΛCDM; uncertainty ±0.023 Gyr. GO format v1. ${entry.stardate?.source || ""}`}>
            <span className="font-mono">{entry.stardate?.label || "GO stardate unavailable"}</span>
            <span className="sr-only">; canonical time </span>
            <time className="ml-2" dateTime={entry.occurredAt}>{formatDate(entry.occurredAt)}</time>
          </p>
        </div>
        {isOwner ? <button type="button" className="rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted" disabled={busyId === entry.id} onClick={() => setVisibility(entry)}>{busyId === entry.id ? "Saving…" : entry.visibility === "public" ? "Hide from public log" : "Show on public log"}</button> : null}
      </div>
    </li>)}</ol> : <p className="mt-5 rounded-lg border border-dashed p-5 text-sm text-muted-foreground">No GO journey events have been recorded yet. Verified collaborations and milestones will appear here.</p>}
    {data.nextCursor ? <button type="button" className="mt-4 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted" disabled={loadingOlder} onClick={loadOlder}>{loadingOlder ? "Loading…" : "Load earlier log entries"}</button> : null}
    {message ? <p className="mt-4 text-sm" role="status">{message}</p> : null}
    <p className="mt-5 text-xs leading-5 text-muted-foreground">GO stardate v1 uses the Planck 2018 estimate of the universe’s age, 13.797 ± 0.023 billion years. The display rounds age to 0.01 Gyr and uncertainty outward to 0.03 Gyr; UTC remains the canonical time for sorting. This is an original GO format, not an official Star Trek date system.</p>
  </section>;
}
