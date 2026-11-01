"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "@/firebase";
import { TIMELINE_CATEGORIES, TIMELINE_STATES } from "@/lib/community-timeline";
import CommunityHungerEditor from "@/components/admin/CommunityHungerEditor";
import CommunityParticipationAdmin from "@/components/admin/CommunityParticipationAdmin";
import reviewQueue from "../../../../docs/timeline-approval-queue-2026-10-30.json";

const empty = { title: "", description: "", date: "", category: "milestone", state: "proposal", organization: "", relationship: "", project: "", image: "", imageAlt: "", link: "", source: "", published: false, reason: "" };
export default function AdminTimelinePage() {
  const [form, setForm] = useState(empty);
  const [entries, setEntries] = useState([]);
  const [message, setMessage] = useState("Loading…");
  const [busy, setBusy] = useState(false);
  const request = useCallback(async (options = {}) => {
    const token = await auth.currentUser?.getIdToken();
    const response = await fetch("/api/admin/community-timeline", { ...options, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    return result;
  }, []);
  const load = useCallback(async () => { const data = await request(); setEntries(data.entries); setMessage(""); }, [request]);
  useEffect(() => auth.onAuthStateChanged(() => load().catch((error) => setMessage(error.message))), [load]);
  async function save(event) {
    event.preventDefault(); setBusy(true); setMessage("");
    try { await request({ method: "POST", body: JSON.stringify(form) }); setForm(empty); await load(); setMessage("Entry saved."); } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }
  function review(candidate, existing) {
    setForm(existing ? { ...empty, ...existing, reason: "" } : {
      ...empty,
      ...candidate,
      date: candidate.date || "",
      category: candidate.category || "project",
      state: candidate.state || "proposal",
      source: candidate.source?.startsWith("http") ? candidate.source : "",
      published: false,
      reason: "",
    });
    document.getElementById("timeline-editor")?.scrollIntoView({ behavior: "smooth" });
  }
  const field = (key, label, type = "text") => <label className="block space-y-1"><span>{label}</span><input className="block w-full rounded border bg-background p-2" type={type} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></label>;
  return <main className="mx-auto max-w-4xl space-y-6 p-6"><h1 className="text-3xl font-bold">Community timeline</h1><p>Verify completed history against original records before publishing. Record external organizations’ actual relationships. All saves are audited.</p>
  <section aria-labelledby="review-queue-heading" className="space-y-4 rounded-xl border p-5">
    <h2 id="review-queue-heading" className="text-xl font-semibold">Prepared entries for review</h2>
    <p>These research suggestions have not been saved automatically. Select an entry to review and edit it below. To publish, check “Approved for publication”, provide a reason, and save. Leave the box unchecked to save a draft.</p>
    <ul className="space-y-3">{reviewQueue.entries.map((candidate) => {
      const existing = entries.find((entry) => entry.title === candidate.title && entry.date === candidate.date);
      return <li key={candidate.title} className="space-y-1 rounded border p-3">
        <h3 className="font-semibold">{candidate.title}</h3>
        <p>{candidate.date} · {existing ? (existing.published ? "Published" : "Saved draft") : "Ready to review"}</p>
        <p>{candidate.description}</p>
        <p><a className="underline" href={candidate.source} target="_blank" rel="noreferrer">View source</a>{candidate.link && <> · <a className="underline" href={candidate.link} target="_blank" rel="noreferrer">Related source</a></>}</p>
        <button type="button" className="rounded border px-3 py-1" onClick={() => review(candidate, existing)}>{existing ? "Review saved entry" : "Review entry"}</button>
      </li>;
    })}</ul>
    <h3 className="font-semibold">Projects needing more information</h3>
    <p>These Drive-derived suggestions need a verified date and the other checks noted below. Private source links are not included; verify that any source is appropriate to publish.</p>
    <ul className="space-y-3">{reviewQueue.approved_drive_candidates_awaiting_verification.map((candidate) => {
      const existing = entries.find((entry) => entry.title === candidate.title);
      return <li key={candidate.title} className="space-y-1 rounded border p-3">
        <h4 className="font-semibold">{candidate.title}</h4>
        <p>{candidate.status}</p>
        <button type="button" className="rounded border px-3 py-1" onClick={() => review(candidate, existing)}>{existing ? "Review saved entry" : "Complete project details"}</button>
      </li>;
    })}</ul>
  </section>
  <form id="timeline-editor" onSubmit={save} className="space-y-4 rounded-xl border p-5">
    {field("title", "Title")}{field("date", "Date", "date")}
    <label className="block">Description<textarea className="mt-1 block w-full rounded border bg-background p-2" rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
    {[['category', TIMELINE_CATEGORIES], ['state', TIMELINE_STATES]].map(([key, options]) => <label key={key} className="block capitalize">{key}<select className="mt-1 block w-full rounded border bg-background p-2" value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>)}
    {field("organization", "Related organization")}{field("relationship", "Relationship to GO")}{field("project", "Project")}{field("image", "Image URL", "url")}{field("imageAlt", "Image alternative text")}{field("link", "Related URL", "url")}{field("source", "Source URL (required for published completed history)", "url")}{field("reason", "Reason for this change")}
    <label className="flex gap-2"><input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} />Approved for publication</label>
    <button disabled={busy} className="rounded bg-primary px-4 py-2 text-primary-foreground">{busy ? "Saving…" : "Save entry"}</button> <button type="button" className="rounded border px-4 py-2" onClick={() => setForm(empty)}>New entry</button>
  </form><p role="status">{message}</p><h2 className="text-xl font-semibold">Existing entries</h2><ul className="space-y-2">{entries.map((entry) => <li key={entry.id} className="rounded border p-3"><button className="underline" onClick={() => setForm({ ...empty, ...entry, reason: "" })}>{entry.title}</button> — {entry.date} · {entry.published ? "Published" : "Draft"} · ID: {entry.id}</li>)}</ul><CommunityHungerEditor /><CommunityParticipationAdmin /></main>;
}
