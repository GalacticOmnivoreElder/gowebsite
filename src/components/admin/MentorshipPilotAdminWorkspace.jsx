"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { auth } from "@/firebase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const deletableMentorStatuses = new Set(["draft", "submitted", "needs_information", "rejected", "archived"]);
const mentorReviewOptions = ["approved", "needs_information", "rejected", "paused", "suspended", "archived"];
const requestReviewOptions = ["under_review", "needs_information", "ready_for_suggestions", "no_match_available", "closed"];
const labelStatus = (value) => String(value || "unknown").replaceAll("_", " ");

export function MentorshipPilotAdminWorkspace() {
  const [data, setData] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [mentorDecisions, setMentorDecisions] = useState({});
  const [requestDecisions, setRequestDecisions] = useState({});
  const [suggestions, setSuggestions] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");

  const call = useCallback(async (options = {}) => {
    const token = await auth.currentUser?.getIdToken();
    return fetch("/api/admin/mentorship-pilot", {
      ...options,
      headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  }, []);

  const load = useCallback(async () => {
    const response = await call();
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Mentorship pilot operations could not be loaded.");
    setData(result);
  }, [call]);

  useEffect(() => { load().catch((error) => setMessage(error.message)); }, [load]);

  const act = async (body, success) => {
    setBusy(true);
    setMessage("");
    try {
      const response = await call({ method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Admin update could not be saved.");
      setMessage(success);
      await load();
      return true;
    } catch (error) {
      setMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || !deleteReason.trim()) return;
    const deleted = await act(
      { action: "delete_mentor_application", userId: deleteTarget.id, reason: deleteReason.trim() },
      "Mentor application deleted and the applicant's mentor status reset."
    );
    if (deleted) {
      setDeleteTarget(null);
      setDeleteReason("");
    }
  };

  if (!data) return <p className="py-10 text-center text-muted-foreground">Loading mentorship pilot operations…</p>;

  const metric = (label, value) => (
    <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></CardContent></Card>
  );

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase text-primary">Controlled pilot</p>
        <h1 className="mt-2 text-3xl font-bold">Mentorship operations</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">Review mentor applicants, route member requests, monitor capacity, and handle private program operations.</p>
      </div>
      {message ? <p role="status" className="rounded-md border p-3 text-sm">{message}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metric("Approved mentors", data.counts.approvedMentors)}
        {metric("Available capacity", `${Math.max(0, data.counts.totalMentorCapacity - data.counts.activeMentorships)}/${data.counts.totalMentorCapacity}`)}
        {metric("Requests awaiting review", data.counts.requestsAwaitingReview)}
        {metric("Staff attention", data.counts.engagementsRequiringAttention + (data.alerts?.filter((item) => item.status === "open").length || 0))}
      </div>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Mentor applications</h2>
        <div className="space-y-3">
          {data.mentorApplications.map((item) => {
            const currentStatus = item.application?.status || item.profile?.status || "draft";
            return (
              <Card key={item.id}>
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.profile?.displayName || item.application?.displayName || item.id}</p>
                      <p className="text-sm text-muted-foreground">{item.profile?.professionalHeadline || "No professional headline"} · {labelStatus(currentStatus)}</p>
                    </div>
                    <Badge variant="outline">{labelStatus(item.profile?.status || currentStatus)}</Badge>
                  </div>
                  {item.profile ? <p className="text-sm">Expertise: {(item.profile.areasOfExpertise || []).join(", ") || "not provided"} · Capacity: {item.profile.maximumActiveMentees || 0} · Languages: {(item.profile.languages || []).join(", ") || "not provided"}</p> : null}
                  {item.profile?.internalReviewNotes ? <p className="rounded-md bg-muted p-3 text-sm">Private notes: {item.profile.internalReviewNotes}</p> : null}

                  <div className="grid gap-3 lg:grid-cols-[minmax(12rem,0.6fr)_1fr_1fr_auto]">
                    <select aria-label={`Decision for mentor ${item.id}`} className="rounded-md border bg-background px-3 py-2 text-sm" value={mentorDecisions[item.id] || currentStatus} onChange={(event) => setMentorDecisions((current) => ({ ...current, [item.id]: event.target.value }))}>
                      {mentorReviewOptions.map((option) => <option key={option} value={option}>{labelStatus(option)}</option>)}
                    </select>
                    <Input aria-label={`Message for mentor ${item.id}`} placeholder="Message shown to the applicant" value={mentorDecisions[`${item.id}:message`] || ""} onChange={(event) => setMentorDecisions((current) => ({ ...current, [`${item.id}:message`]: event.target.value }))} />
                    <Input aria-label={`Private notes for mentor ${item.id}`} placeholder="Private staff notes" value={mentorDecisions[`${item.id}:notes`] || ""} onChange={(event) => setMentorDecisions((current) => ({ ...current, [`${item.id}:notes`]: event.target.value }))} />
                    <Button disabled={busy} onClick={() => act({ action: "review_mentor", userId: item.id, decision: mentorDecisions[item.id] || currentStatus, customerMessage: mentorDecisions[`${item.id}:message`] || "", internalNotes: mentorDecisions[`${item.id}:notes`] || "" }, "Mentor review saved.")}>Save review</Button>
                  </div>

                  {deletableMentorStatuses.has(currentStatus) ? (
                    <div className="border-t pt-3"><Button variant="destructive" size="sm" disabled={busy} onClick={() => setDeleteTarget(item)}><Trash2 className="mr-2 h-4 w-4" />Delete submission</Button></div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
          {data.mentorApplications.length === 0 ? <Card><CardContent className="p-8 text-center text-muted-foreground">No mentor applications in the queue.</CardContent></Card> : null}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Requests and suggestions</h2>
        <div className="space-y-3">
          {data.requests.map((item) => {
            const selectedMentor = item.requestedMentorProfile;
            const canForward = Boolean(item.requestedMentorId) && ["submitted", "under_review", "ready_for_suggestions"].includes(item.status);
            return (
              <Card key={item.id}>
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{item.title}</p><p className="text-sm text-muted-foreground">{item.menteeUserId} · {item.discipline} · {labelStatus(item.status)}</p></div><Badge>{labelStatus(item.currentLevel)}</Badge></div>
                  <p className="text-sm">Goal: {item.goal}</p>
                  {item.requestedMentorId ? (
                    <div className="rounded-md border border-primary/25 bg-primary/5 p-3 text-sm"><p className="font-medium">Requested mentor: {selectedMentor?.displayName || item.requestedMentorId}</p><p className="mt-1 text-muted-foreground">{selectedMentor?.professionalHeadline || "Official GO mentor"}{Number.isFinite(selectedMentor?.availableSlots) ? ` · ${selectedMentor.availableSlots} available slot${selectedMentor.availableSlots === 1 ? "" : "s"}` : ""}</p></div>
                  ) : null}
                  <p className="text-xs text-muted-foreground">Private accessibility request: {item.accessibilityRequest || "none provided"}</p>

                  <div className="grid gap-3 lg:grid-cols-[minmax(12rem,0.6fr)_1fr_auto]">
                    <select aria-label={`Request decision for ${item.id}`} className="rounded-md border bg-background px-3 py-2 text-sm" value={requestDecisions[item.id] || item.status} onChange={(event) => setRequestDecisions((current) => ({ ...current, [item.id]: event.target.value }))}>
                      {requestReviewOptions.map((option) => <option key={option} value={option}>{labelStatus(option)}</option>)}
                    </select>
                    <Input aria-label={`Customer message for ${item.id}`} placeholder="Message shown to the member" value={requestDecisions[`${item.id}:message`] || ""} onChange={(event) => setRequestDecisions((current) => ({ ...current, [`${item.id}:message`]: event.target.value }))} />
                    <Button disabled={busy} onClick={() => act({ action: "review_request", requestId: item.id, decision: requestDecisions[item.id] || "under_review", customerMessage: requestDecisions[`${item.id}:message`] || "" }, "Request review saved.")}>Save request review</Button>
                  </div>

                  {canForward ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/25 bg-primary/5 p-4"><div><p className="text-sm font-medium">Direct mentor request</p><p className="text-xs text-muted-foreground">GO checks approval and live capacity again before sending it to the mentor.</p></div><Button disabled={busy} onClick={() => act({ action: "forward_to_requested_mentor", requestId: item.id, customerMessage: requestDecisions[`${item.id}:message`] || "" }, "Request approved and sent to the selected mentor.")}>Approve and send to mentor</Button></div>
                  ) : null}

                  {["ready_for_suggestions", "suggestions_sent", "application_submitted"].includes(item.status) ? (
                    <div className="space-y-2 rounded-md border border-primary/20 bg-primary/5 p-4">
                      <p className="text-sm font-medium">Send approved mentor suggestions</p>
                      <p className="text-xs text-muted-foreground">Use one line per mentor: mentor user ID | concise reason.</p>
                      <textarea aria-label={`Mentor suggestions for ${item.id}`} className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm" value={suggestions[item.id] || ""} onChange={(event) => setSuggestions((current) => ({ ...current, [item.id]: event.target.value }))} />
                      <Button disabled={busy} onClick={() => act({ action: "send_suggestions", requestId: item.id, suggestions: String(suggestions[item.id] || "").split("\n").map((line) => { const [mentorId, ...reason] = line.split("|"); return { mentorId: mentorId?.trim(), reasonSummary: reason.join("|").trim() }; }).filter((suggestion) => suggestion.mentorId) }, "Mentor suggestions sent.")}>Send suggestions</Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
          {data.requests.length === 0 ? <Card><CardContent className="p-8 text-center text-muted-foreground">No mentorship requests yet.</CardContent></Card> : null}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Engagements requiring attention</h2>
        <div className="space-y-3">
          {(data.engagements || []).filter((item) => ["paused", "completion_pending", "under_review"].includes(item.status)).map((item) => (
            <Card key={item.id}><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-semibold">{item.mentorDisplayName} · {labelStatus(item.status)}</p><p className="text-sm text-muted-foreground">{item.id} · {item.menteeDisplayName}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={() => act({ action: "engagement_action", engagementId: item.id, engagementAction: item.status === "paused" ? "resume" : "pause" }, "Engagement status updated.")}>{item.status === "paused" ? "Resume" : "Pause"}</Button><Button variant="destructive" disabled={busy} onClick={() => act({ action: "engagement_action", engagementId: item.id, engagementAction: "end_early", reasonCategory: "ended_by_go" }, "Engagement ended and capacity released.")}>End engagement</Button></div></CardContent></Card>
          ))}
          {!(data.engagements || []).some((item) => ["paused", "completion_pending", "under_review"].includes(item.status)) ? <Card><CardContent className="p-8 text-center text-muted-foreground">No engagements require staff attention.</CardContent></Card> : null}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Private reports and staff alerts</CardTitle></CardHeader><CardContent className="space-y-3">{[...(data.reports || []), ...(data.alerts || [])].map((item) => <div key={item.id} className="rounded-md border p-3 text-sm"><div className="flex justify-between gap-3"><strong>{item.category || item.type}</strong><Badge variant="outline">{item.status}</Badge></div>{item.details ? <p className="mt-2 whitespace-pre-wrap">{item.details}</p> : null}<p className="mt-2 text-xs text-muted-foreground">Engagement {item.engagementId || "not specified"}</p>{item.category && item.status !== "resolved" ? <Button className="mt-3" size="sm" variant="outline" disabled={busy} onClick={() => act({ action: "resolve_report", reportId: item.id, status: "resolved" }, "Report resolved.")}>Mark resolved</Button> : null}</div>)}{!data.reports?.length && !data.alerts?.length ? <p className="text-sm text-muted-foreground">No reports or staff alerts.</p> : null}</CardContent></Card>
        <Card><CardHeader><CardTitle>Audit history</CardTitle></CardHeader><CardContent className="max-h-96 space-y-2 overflow-auto">{data.audit?.map((item) => <div key={item.id} className="rounded-md bg-muted/40 p-3 text-xs"><p className="font-medium">{item.action}</p><p className="text-muted-foreground">{item.entityType} {item.entityId} · {item.createdAt ? new Date(item.createdAt).toLocaleString() : "time unavailable"}</p></div>)}{!data.audit?.length ? <p className="text-sm text-muted-foreground">No pilot audit events yet.</p> : null}</CardContent></Card>
      </section>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open && !busy) { setDeleteTarget(null); setDeleteReason(""); } }}>
        <DialogContent role="alertdialog">
          <DialogHeader><DialogTitle>Delete mentor submission?</DialogTitle><DialogDescription>This removes the mentor application and draft profile for {deleteTarget?.profile?.displayName || deleteTarget?.application?.displayName || deleteTarget?.id}. Current status: {labelStatus(deleteTarget?.application?.status || deleteTarget?.profile?.status)}.</DialogDescription></DialogHeader>
          <label className="space-y-2 text-sm"><span className="font-medium">Reason for deletion *</span><textarea autoFocus className="min-h-24 w-full rounded-md border bg-background px-3 py-2" value={deleteReason} onChange={(event) => setDeleteReason(event.target.value)} placeholder="Required for the private audit record" /></label>
          <DialogFooter><Button variant="outline" disabled={busy} onClick={() => { setDeleteTarget(null); setDeleteReason(""); }}>Cancel</Button><Button variant="destructive" disabled={busy || !deleteReason.trim()} onClick={confirmDelete}>{busy ? "Deleting…" : "Delete submission"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
