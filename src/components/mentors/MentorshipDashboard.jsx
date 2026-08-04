"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { auth } from "@/firebase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MentorshipFeedbackPanel } from "@/components/mentors/MentorshipFeedbackPanel";

export function MentorshipDashboard() {
  const [data, setData] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [clarifications, setClarifications] = useState({});
  const [schedules, setSchedules] = useState({});
  const [concerns, setConcerns] = useState({});
  const [cancellationReasons, setCancellationReasons] = useState({});

  const request = useCallback(async (url, options = {}) => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Sign in to view mentorship activity");
    return fetch(url, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` }, cache: "no-store" });
  }, []);
  const load = useCallback(async () => {
    const response = await request("/api/mentorship/dashboard");
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Mentorship dashboard could not be loaded");
    setData(result);
  }, [request]);
  useEffect(() => { const unsubscribe = auth.onAuthStateChanged(() => load().catch((error) => setMessage(error.message))); return unsubscribe; }, [load]);

  const mutate = async (url, body, success) => {
    setBusy(true); setMessage("");
    try {
      const response = await request(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Mentorship update could not be saved");
      setMessage(success); await load();
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  };
  const respond = (item, action) => mutate(`/api/mentorship/requests/${item.id}/response`, { action, message: clarifications[item.id] || "" }, `Response saved: ${action}.`);
  const answerClarification = (item) => mutate(`/api/mentorship/requests/${item.id}/clarification`, { response: clarifications[item.id] || "" }, "Clarification sent.");
  const engagementAction = (item, action, payload = {}) => mutate(`/api/mentorship/engagements/${item.id}`, { action, ...payload }, "Mentorship updated.");
  const submitConcern = async (item) => {
    const concern = concerns[item.id] || {};
    setBusy(true); setMessage("");
    try {
      const response = await request(`/api/mentorship/engagements/${item.id}/concerns`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: concern.category || "safety_or_conduct", details: concern.details || "" }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Concern could not be submitted");
      setMessage("Your concern was submitted privately to GO administrators."); await load();
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  };

  if (!data && !message) return <div className="py-12 text-center text-muted-foreground">Loading mentorship dashboard…</div>;
  if (!data) return <Card><CardContent className="p-8 text-center"><p role="alert">{message}</p><Button className="mt-4" onClick={() => load().catch((error) => setMessage(error.message))}>Try again</Button></CardContent></Card>;
  const uid = auth.currentUser?.uid;
  const incoming = data.requests.filter((item) => item.targetMentorId === uid && ["awaiting_mentor_response", "clarification_requested"].includes(item.status));

  return <div className="space-y-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-bold">Mentorship dashboard</h2><p className="text-sm text-muted-foreground">Requests, scheduling, completion, and private support.</p></div><Button asChild variant="outline"><Link href="/matchmaking">New mentorship request</Link></Button></div>
    {message && <p className="rounded-md border bg-card p-3 text-sm" role="status">{message}</p>}

    {incoming.length > 0 && <section><h3 className="mb-3 text-lg font-semibold">Requests awaiting your response</h3><div className="space-y-4">{incoming.map((item) => <Card key={item.id}><CardHeader><div className="flex justify-between gap-3"><CardTitle>{item.discipline}: {item.learningObjective}</CardTitle><Badge>{item.status.replaceAll("_", " ")}</Badge></div></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">From {item.studentDisplayName} · {item.skillLevel} · {item.preferredLanguage} · {item.preferredFormat}</p><p>{item.note}</p>{item.clarificationResponse && <p className="rounded-md bg-muted p-3 text-sm"><strong>Student clarification:</strong> {item.clarificationResponse}</p>}<Input aria-label="Clarification question or decline note" value={clarifications[item.id] || ""} onChange={(event) => setClarifications((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Optional decline note, or required clarification question" /><div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => respond(item, "accept")}>Accept</Button><Button disabled={busy} variant="outline" onClick={() => respond(item, "clarification")}>Request clarification</Button><Button disabled={busy} variant="destructive" onClick={() => respond(item, "decline")}>Decline</Button></div></CardContent></Card>)}</div></section>}

    <section><h3 className="mb-3 text-lg font-semibold">Your requests</h3>{data.requests.filter((item) => item.studentId === uid).length ? <div className="space-y-3">{data.requests.filter((item) => item.studentId === uid).map((item) => <Card key={item.id}><CardContent className="space-y-3 p-5"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{item.discipline}: {item.learningObjective}</p><Badge variant="outline">{item.status.replaceAll("_", " ")}</Badge></div><p className="text-sm text-muted-foreground">{item.mentorDisplayName || "Waiting for GO assistance"}{item.responseDeadline ? ` · response due ${new Date(item.responseDeadline).toLocaleDateString()}` : ""}</p>{item.status === "clarification_requested" && <div className="space-y-2"><p className="text-sm"><strong>Mentor question:</strong> {item.clarificationQuestion}</p><Input value={clarifications[item.id] || ""} onChange={(event) => setClarifications((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Your clarification" /><Button disabled={busy} onClick={() => answerClarification(item)}>Send clarification</Button></div>}</CardContent></Card>)}</div> : <Card><CardContent className="p-8 text-center text-muted-foreground">No mentorship requests yet.</CardContent></Card>}</section>

    <section><h3 className="mb-3 text-lg font-semibold">Engagements</h3>{data.engagements.length ? <div className="space-y-4">{data.engagements.map((item) => { const isMentor = item.mentorId === uid; const active = ["scheduling", "scheduled", "attended", "active", "reported"].includes(item.status); const schedule = schedules[item.id] || { startsAt: "", endsAt: "", timeZone: "Europe/Skopje", meetingUrl: "" }; return <Card key={item.id}><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle>{item.discipline} with {isMentor ? item.studentDisplayName : item.mentorDisplayName}</CardTitle><Badge>{item.status}</Badge></div></CardHeader><CardContent className="space-y-4"><p>{item.learningObjective}</p>{isMentor && ["scheduling", "scheduled"].includes(item.status) && <div className="grid gap-2 md:grid-cols-2"><Input aria-label="Proposed start" type="datetime-local" value={schedule.startsAt} onChange={(event) => setSchedules((current) => ({ ...current, [item.id]: { ...schedule, startsAt: event.target.value } }))} /><Input aria-label="Proposed end" type="datetime-local" value={schedule.endsAt} onChange={(event) => setSchedules((current) => ({ ...current, [item.id]: { ...schedule, endsAt: event.target.value } }))} /><Input aria-label="Schedule time zone" value={schedule.timeZone} onChange={(event) => setSchedules((current) => ({ ...current, [item.id]: { ...schedule, timeZone: event.target.value } }))} /><Input aria-label="Private meeting URL" type="url" placeholder="Private meeting URL (optional for in-person sessions)" value={schedule.meetingUrl} onChange={(event) => setSchedules((current) => ({ ...current, [item.id]: { ...schedule, meetingUrl: event.target.value } }))} /><Button disabled={busy || !schedule.startsAt || !schedule.endsAt} onClick={() => engagementAction(item, "propose_times", { proposedSlots: [{ ...schedule, startsAt: new Date(schedule.startsAt).toISOString(), endsAt: new Date(schedule.endsAt).toISOString() }] })}>Propose time</Button></div>}{!isMentor && item.proposedSlots.length > 0 && !item.agreedSchedule && <div><p className="mb-2 text-sm font-medium">Choose a proposed time</p><div className="flex flex-wrap gap-2">{item.proposedSlots.map((slot) => <Button key={slot.index} variant="outline" disabled={busy} onClick={() => engagementAction(item, "confirm_time", { slotIndex: slot.index })}>{new Date(slot.startsAt).toLocaleString()} ({slot.timeZone})</Button>)}</div></div>}{item.agreedSchedule && <div className="rounded-md bg-muted p-3 text-sm"><p><strong>Agreed time:</strong> {new Date(item.agreedSchedule.startsAt).toLocaleString()} ({item.agreedSchedule.timeZone})</p>{item.agreedSchedule.meetingUrl && <a className="mt-2 inline-block text-primary underline" href={item.agreedSchedule.meetingUrl} target="_blank" rel="noreferrer">Open private meeting link</a>}</div>}{active && <div className="space-y-2"><div className="flex flex-wrap gap-2">{isMentor && item.status === "scheduled" && <Button disabled={busy} onClick={() => engagementAction(item, "mark_attended")}>Mark attended</Button>}<Button disabled={busy} variant="outline" onClick={() => engagementAction(item, "complete")}>{item.completionConfirmations.includes(uid) ? "Completion confirmation sent" : "Confirm completion"}</Button></div><div className="flex flex-col gap-2 sm:flex-row"><Input aria-label="Optional cancellation reason" placeholder="Reason for cancellation (optional)" value={cancellationReasons[item.id] || ""} onChange={(event) => setCancellationReasons((current) => ({ ...current, [item.id]: event.target.value }))} /><Button disabled={busy} variant="destructive" onClick={() => engagementAction(item, "cancel", { reason: cancellationReasons[item.id] || "" })}>Cancel engagement</Button></div></div>}<details className="rounded-md border p-3"><summary className="cursor-pointer text-sm font-medium">Report a mentorship concern privately</summary><div className="mt-3 space-y-2"><select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={(concerns[item.id] || {}).category || "safety_or_conduct"} onChange={(event) => setConcerns((current) => ({ ...current, [item.id]: { ...(current[item.id] || {}), category: event.target.value } }))}><option value="safety_or_conduct">Safety or conduct</option><option value="scheduling">Scheduling</option><option value="scope">Mentorship scope</option><option value="other">Other</option></select><textarea aria-label="Concern details" className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm" value={(concerns[item.id] || {}).details || ""} onChange={(event) => setConcerns((current) => ({ ...current, [item.id]: { ...(current[item.id] || {}), details: event.target.value } }))} /><Button disabled={busy || !(concerns[item.id]?.details || "").trim()} variant="outline" onClick={() => submitConcern(item)}>Submit private concern</Button></div></details></CardContent></Card>; })}</div> : <Card><CardContent className="p-8 text-center text-muted-foreground">No active or past mentorship engagements.</CardContent></Card>}</section>
    {data.feedbackEnabled && data.engagements.some((item) => item.status === "completed") && <section><h3 className="mb-3 text-lg font-semibold">Completed mentorship feedback</h3><p className="mb-4 text-sm text-muted-foreground">Private direct reviews, correction requests, and optional author-consented mentor references.</p><div className="space-y-4">{data.engagements.filter((item) => item.status === "completed").map((item) => <MentorshipFeedbackPanel key={item.id} engagement={item} feedback={data.feedback.filter((entry) => entry.engagementId === item.id)} uid={uid} request={request} onChanged={load} onMessage={setMessage} />)}</div></section>}
  </div>;
}
