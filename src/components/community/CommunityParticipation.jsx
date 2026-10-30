"use client";
import { useCallback, useEffect, useState } from "react";
import { auth } from "@/firebase";
import { summarizePollResults } from "@/lib/community-poll-results";

function Results({ poll }) {
  const { total, winners } = summarizePollResults(poll.options, poll.results);
  return <><ul>{poll.options.map((option, index) => <li key={index}>{option}: {poll.results[index] || 0} votes</li>)}</ul><p>{total === 0 ? "No votes were cast." : `${winners.length > 1 ? "Tied preference" : "Most selected"}: ${winners.join(", ")} (${total} votes total).`}</p></>;
}

export default function CommunityParticipation() {
  const [data, setData] = useState(null); const [message, setMessage] = useState("Sign in with an active paid community subscription to participate.");
  const [form, setForm] = useState({ title: "", purpose: "", benefit: "" }); const [busy, setBusy] = useState(false);
  const request = useCallback(async (body) => {
    const token = await auth.currentUser?.getIdToken();
    const response = await fetch("/api/community-participation", { method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined, cache: "no-store" });
    const result = await response.json(); if (!response.ok) throw new Error(result.error); return result;
  }, []);
  const load = useCallback(async () => { const result = await request(); setData(result); setMessage(""); }, [request]);
  useEffect(() => auth.onAuthStateChanged((user) => { if (!user) { setData(null); setMessage("Sign in with an active paid community subscription to participate."); return; } load().catch((error) => { setData(null); setMessage(error.message); }); }), [load]);
  async function act(body) { setBusy(true); setMessage(""); try { await request(body); if (body.action === "suggest") setForm({ title: "", purpose: "", benefit: "" }); await load(); setMessage(body.action === "suggest" ? "Suggestion submitted for moderation." : "Your response was recorded."); } catch (error) { setMessage(error.message); } finally { setBusy(false); } }
  return <section className="space-y-5 rounded-xl border p-5"><h2 className="text-2xl font-bold">What’s the next bite?</h2><p>Suggestions and this informal platform-priority poll express preferences. They are not statutory votes or delivery commitments.</p><p role="status">{message}</p>{data && <>
    <h3 className="text-xl font-semibold">Suggestions</h3><p>Browse existing ideas before submitting to reduce duplicates.</p>{data.suggestions.length ? <ul className="space-y-3">{data.suggestions.map((item) => <li className="rounded border p-4" key={item.id}><h4 className="font-semibold">{item.title}</h4><p>Purpose: {item.purpose}</p><p>Expected benefit: {item.benefit}</p><p>Status: {item.status} — {item.statusNote}</p>{item.mergedInto && <p>Merged into suggestion {item.mergedInto}.</p>}{item.roadmapId && <a className="underline" href={`/timeline#${encodeURIComponent(item.roadmapId)}`}>Related timeline entry</a>}<p>{item.supportCount || 0} supporters</p>{["open", "accepted", "planned", "completed"].includes(item.status) && <button disabled={busy} className="mt-2 rounded border px-3 py-2" onClick={() => act({ action: "support", id: item.id })}>Support</button>}</li>)}</ul> : <p>No suggestions have been published yet.</p>}
    <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); act({ action: "suggest", ...form }); }}>{[["title", "Title"], ["purpose", "Purpose"], ["benefit", "Expected benefit"]].map(([key, label]) => <label key={key} className="block">{label}<textarea required maxLength={key === "title" ? 160 : 2000} className="mt-1 block w-full rounded border bg-background p-2" value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></label>)}<button disabled={busy} className="rounded bg-primary px-4 py-2 text-primary-foreground">Submit suggestion</button></form>
    <h3 className="text-xl font-semibold">Platform-priority polls</h3>{data.polls.length ? data.polls.map((poll) => <article className="rounded border p-4" key={poll.id}><h4 className="font-semibold">{poll.title}</h4><p>Voting: <time dateTime={poll.startsAt}>{new Date(poll.startsAt).toLocaleString()}</time> to <time dateTime={poll.endsAt}>{new Date(poll.endsAt).toLocaleString()}</time></p>{poll.results ? <Results poll={poll} /> : poll.open ? <div className="mt-2 flex flex-wrap gap-2">{poll.options.map((option, index) => <button disabled={busy} className="rounded border px-3 py-2" key={index} onClick={() => act({ action: "vote", pollId: poll.id, optionIndex: index })}>Vote: {option}</button>)}</div> : <p>Results have not been published.</p>}</article>) : <p>No polls are available.</p>}
  </>}</section>;
}
