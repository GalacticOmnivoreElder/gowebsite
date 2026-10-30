"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "@/firebase";
import { TIMELINE_CATEGORIES, TIMELINE_STATES } from "@/lib/community-timeline";
import CommunityHungerEditor from "@/components/admin/CommunityHungerEditor";
import CommunityParticipationAdmin from "@/components/admin/CommunityParticipationAdmin";

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
  const field = (key, label, type = "text") => <label className="block space-y-1"><span>{label}</span><input className="block w-full rounded border bg-background p-2" type={type} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></label>;
  return <main className="mx-auto max-w-4xl space-y-6 p-6"><h1 className="text-3xl font-bold">Community timeline</h1><p>Verify completed history against original records before publishing. Record external organizations’ actual relationships. All saves are audited.</p><form onSubmit={save} className="space-y-4 rounded-xl border p-5">
    {field("title", "Title")}{field("date", "Date", "date")}
    <label className="block">Description<textarea className="mt-1 block w-full rounded border bg-background p-2" rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
    {[['category', TIMELINE_CATEGORIES], ['state', TIMELINE_STATES]].map(([key, options]) => <label key={key} className="block capitalize">{key}<select className="mt-1 block w-full rounded border bg-background p-2" value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>)}
    {field("organization", "Related organization")}{field("relationship", "Relationship to GO")}{field("project", "Project")}{field("image", "Image URL", "url")}{field("imageAlt", "Image alternative text")}{field("link", "Related URL", "url")}{field("source", "Source URL (required for published completed history)", "url")}{field("reason", "Reason for this change")}
    <label className="flex gap-2"><input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} />Approved for publication</label>
    <button disabled={busy} className="rounded bg-primary px-4 py-2 text-primary-foreground">{busy ? "Saving…" : "Save entry"}</button> <button type="button" className="rounded border px-4 py-2" onClick={() => setForm(empty)}>New entry</button>
  </form><p role="status">{message}</p><h2 className="text-xl font-semibold">Existing entries</h2><ul className="space-y-2">{entries.map((entry) => <li key={entry.id} className="rounded border p-3"><button className="underline" onClick={() => setForm({ ...empty, ...entry, reason: "" })}>{entry.title}</button> — {entry.date} · {entry.published ? "Published" : "Draft"} · ID: {entry.id}</li>)}</ul><CommunityHungerEditor /><CommunityParticipationAdmin /></main>;
}
