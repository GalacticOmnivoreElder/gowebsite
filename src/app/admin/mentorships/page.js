"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "@/firebase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function AdminMentorshipsPage() {
  const [data, setData] = useState(null);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState({});
  const [notes, setNotes] = useState({});
  const [overrideUserId, setOverrideUserId] = useState("");

  const call = useCallback(async (options = {}) => {
    const token = await auth.currentUser?.getIdToken();
    return fetch("/api/admin/mentorships", {
      ...options,
      headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  }, []);

  const load = useCallback(async () => {
    const response = await call();
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Mentorship administration could not be loaded");
    setData(result);
  }, [call]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(() => load().catch((error) => setMessage(error.message)));
    return unsubscribe;
  }, [load]);

  const act = async (body) => {
    setMessage("");
    const response = await call({
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(result.error || "Action failed");
    setMessage("Administrator action saved.");
    await load();
  };

  if (!data) return <p className="p-8 text-center">{message || "Loading mentorship operations…"}</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Mentorship Operations</h1>
        <p className="mt-2 text-muted-foreground">Assign assisted requests, review private concerns and references, and monitor engagement lifecycle.</p>
      </div>
      {message && <p role="status" className="rounded-md border p-3 text-sm">{message}</p>}

      <section>
        <h2 className="mb-3 text-xl font-semibold">Request-limit exceptions</h2>
        <Card>
          <CardContent className="space-y-4 p-4">
            <p className="text-sm text-muted-foreground">Grant one additional request when an active request or engagement would normally block the member. Each exception is consumed transactionally.</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input aria-label="User ID for request-limit exception" placeholder="User ID" value={overrideUserId} onChange={(event) => setOverrideUserId(event.target.value)} />
              <Button disabled={!overrideUserId.trim()} onClick={() => act({ action: "allow_additional_request", userId: overrideUserId.trim() })}>Allow one request</Button>
            </div>
            {data.requestOverrides.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.requestOverrides.map((item) => <Badge key={item.userId} variant="outline">{item.userId}: {item.remaining} remaining</Badge>)}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">GO assistance requests</h2>
        <div className="space-y-3">
          {data.requests.filter((item) => item.status === "assistance_requested").map((item) => (
            <Card key={item.id}>
              <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_260px_auto]">
                <div><p className="font-semibold">{item.studentDisplayName}: {item.discipline}</p><p className="text-sm text-muted-foreground">{item.learningObjective}</p></div>
                <select aria-label={`Mentor for ${item.studentDisplayName}`} className="rounded-md border bg-background px-3 py-2" value={selected[item.id] || ""} onChange={(event) => setSelected((current) => ({ ...current, [item.id]: event.target.value }))}>
                  <option value="">Choose approved mentor</option>
                  {data.mentors.filter((mentor) => mentor.publicProfileEnabled).map((mentor) => <option key={mentor.id} value={mentor.id}>{mentor.name}</option>)}
                </select>
                <Button disabled={!selected[item.id]} onClick={() => act({ action: "assign_mentor", requestId: item.id, mentorId: selected[item.id] })}>Assign</Button>
              </CardContent>
            </Card>
          ))}
          {data.requests.every((item) => item.status !== "assistance_requested") && <p className="rounded-md border p-6 text-center text-muted-foreground">No requests need GO assistance.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Feedback and mentor references</h2>
        <p className="mb-3 text-sm text-muted-foreground">Private feedback is visible here for safety and appeals. Only a separately consented student reference can be approved for the mentor to showcase publicly.</p>
        <div className="space-y-3">
          {data.feedback.map((item) => (
            <Card key={item.id}>
              <CardHeader><div className="flex flex-wrap justify-between gap-3"><CardTitle>{item.direction.replaceAll("_", " ")}</CardTitle><div className="flex gap-2"><Badge variant="outline">{item.moderationStatus}</Badge>{item.reportStatus !== "none" && <Badge variant="destructive">report: {item.reportStatus}</Badge>}{item.correctionStatus !== "none" && <Badge variant="secondary">appeal: {item.correctionStatus}</Badge>}</div></div></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p><strong>Demonstrated qualities:</strong> {item.qualities.map((quality) => quality.replaceAll("_", " ")).join(", ")}</p>
                {item.privateWrittenFeedback && <div><p className="font-medium">Private written feedback</p><p className="whitespace-pre-wrap text-muted-foreground">{item.privateWrittenFeedback}</p></div>}
                {item.publicSharingConsent && <div className="rounded-md border border-primary/30 bg-primary/5 p-3"><p className="font-medium">Author-consented public reference</p><p className="mt-1 whitespace-pre-wrap">{item.publicReferenceText}</p><p className="mt-2 text-xs text-muted-foreground">Mentor showcase: {item.mentorShowcase ? "selected" : "not selected"}</p></div>}
                {item.reportDetails && <p><strong>Report:</strong> {item.reportDetails}</p>}
                {item.correctionDetails && <p><strong>Correction / appeal:</strong> {item.correctionDetails}</p>}
                <Input aria-label={`Administrator feedback notes for ${item.id}`} placeholder="Private moderation notes" value={notes[`feedback:${item.id}`] || ""} onChange={(event) => setNotes((current) => ({ ...current, [`feedback:${item.id}`]: event.target.value }))} />
                <div className="flex flex-wrap gap-2"><Button onClick={() => act({ action: "moderate_feedback", feedbackId: item.id, moderationStatus: "approved", adminNotes: notes[`feedback:${item.id}`] || "" })}>Approve reference / dismiss dispute</Button><Button variant="destructive" onClick={() => act({ action: "moderate_feedback", feedbackId: item.id, moderationStatus: "removed", adminNotes: notes[`feedback:${item.id}`] || "" })}>Remove / uphold dispute</Button></div>
              </CardContent>
            </Card>
          ))}
          {data.feedback.length === 0 && <p className="rounded-md border p-6 text-center text-muted-foreground">No completed-engagement feedback yet.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Private concerns</h2>
        <div className="space-y-3">
          {data.concerns.map((item) => (
            <Card key={item.id}>
              <CardHeader><div className="flex justify-between gap-3"><CardTitle>{item.category}</CardTitle><Badge>{item.status}</Badge></div></CardHeader>
              <CardContent className="space-y-3">
                <p className="whitespace-pre-wrap">{item.details}</p>
                <Input aria-label={`Administrator notes for ${item.category}`} placeholder="Private administrator notes" value={notes[item.id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} />
                <div className="flex gap-2"><Button variant="outline" onClick={() => act({ action: "resolve_concern", concernId: item.id, status: "reviewing", adminNotes: notes[item.id] })}>Reviewing</Button><Button onClick={() => act({ action: "resolve_concern", concernId: item.id, status: "resolved", adminNotes: notes[item.id] })}>Resolve</Button></div>
              </CardContent>
            </Card>
          ))}
          {data.concerns.length === 0 && <p className="rounded-md border p-6 text-center text-muted-foreground">No mentorship concerns reported.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Engagements</h2>
        {data.feedbackAudit.length > 0 && <details className="mb-5 rounded-md border p-4"><summary className="cursor-pointer font-medium">Feedback audit history ({data.feedbackAudit.length})</summary><div className="mt-3 max-h-80 space-y-2 overflow-auto">{data.feedbackAudit.map((event) => <div key={event.id} className="rounded-md bg-muted/40 p-3 text-xs"><p className="font-medium">{event.action}</p><p className="text-muted-foreground">Feedback {event.feedbackId} · actor {event.actorId} · {event.createdAt ? new Date(event.createdAt).toLocaleString() : "time unavailable"}</p></div>)}</div></details>}
        <div className="space-y-2">
          {data.engagements.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4"><div><p className="font-semibold">{item.studentDisplayName} and {item.mentorDisplayName}</p><p className="text-sm text-muted-foreground">{item.discipline}</p></div><Badge>{item.status}</Badge></div>)}
          {data.engagements.length === 0 && <p className="rounded-md border p-6 text-center text-muted-foreground">No mentorship engagements.</p>}
        </div>
      </section>
    </div>
  );
}
