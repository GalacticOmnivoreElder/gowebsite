"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { auth } from "@/firebase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const filters = ["all", "confirmed", "waitlisted", "canceled", "attended", "did_not_attend", "completed"];
const managementStates = ["pending_approval", "confirmed", "waitlisted", "declined", "canceled_by_organizer", "attended", "did_not_attend", "completed"];

export function ParticipantManager({ slug }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState([]);
  const [announcement, setAnnouncement] = useState({ subject: "", message: "", audience: "confirmed" });
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return;
    const response = await fetch(`/api/learning-items/${encodeURIComponent(slug)}/participants`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Participant list unavailable");
    setData(result);
  }, [slug]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(() => load().catch((loadError) => setError(loadError.message)));
    return unsubscribe;
  }, [load]);

  const visible = useMemo(() => (data?.participants || []).filter((participant) => {
    if (filter === "all") return true;
    if (filter === "canceled") return participant.state.startsWith("canceled_");
    return participant.state === filter;
  }), [data, filter]);

  const updateParticipant = async (enrollmentId, state) => {
    const token = await auth.currentUser.getIdToken();
    const response = await fetch(`/api/learning-items/${encodeURIComponent(slug)}/participants`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ enrollmentId, state }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Participant could not be updated");
    await load();
  };

  const sendAnnouncement = async () => {
    setSending(true);
    setError("");
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`/api/learning-items/${encodeURIComponent(slug)}/participants`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...announcement, selectedEnrollmentIds: selected }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Announcement could not be sent");
      setAnnouncement((current) => ({ ...current, subject: "", message: "" }));
      setError(`${result.notified} participant notifications created${result.emailQueued ? "." : "; email delivery will need attention."}`);
    } catch (sendError) {
      setError(sendError.message);
    } finally {
      setSending(false);
    }
  };

  if (!data && !error) return <div className="container py-16"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></div>;
  if (!data) return <div className="container py-16"><Card><CardContent className="p-8 text-center">{error}</CardContent></Card></div>;

  return (
    <main className="container mx-auto max-w-7xl px-4 py-10">
      <Button variant="ghost" asChild className="mb-5"><Link href={`/education/${slug}`}>Back to learning item</Link></Button>
      <h1 className="text-3xl font-bold">Participants: {data.item.title}</h1>
      <p className="mt-2 text-muted-foreground">Only platform administrators and the assigned instructor can access this page. Participant email addresses are never shown.</p>

      <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle>{data.participants.length} enrollments</CardTitle><select className="rounded-md border bg-background px-3 py-2" value={filter} onChange={(event) => setFilter(event.target.value)}>{filters.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></div></CardHeader>
          <CardContent className="space-y-3">
            {visible.map((participant) => (
              <div key={participant.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex gap-3"><input type="checkbox" checked={selected.includes(participant.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, participant.id] : current.filter((id) => id !== participant.id))} /><div><Link className="font-semibold hover:underline" href={participant.profileUrl}>{participant.displayName}</Link><p className="mt-1 text-xs text-muted-foreground">Enrolled {participant.enrollmentDate ? new Date(participant.enrollmentDate).toLocaleString() : "date unavailable"}</p></div></div>
                  <Badge className="capitalize">{participant.state.replaceAll("_", " ")}</Badge>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2"><span className="text-xs text-muted-foreground">Update state:</span>{managementStates.map((state) => <Button key={state} size="sm" variant="outline" disabled={participant.state === state} onClick={() => updateParticipant(participant.id, state).catch((updateError) => setError(updateError.message))}>{state.replaceAll("_", " ")}</Button>)}</div>
                {Object.keys(participant.accessibilityAnswers || {}).length > 0 && <details className="mt-4 rounded-md bg-muted/30 p-3"><summary className="cursor-pointer text-sm font-medium">Operational accessibility responses</summary><div className="mt-2 space-y-2 text-sm">{Object.entries(participant.accessibilityAnswers).map(([key, value]) => <p key={key}><span className="font-medium">{key}:</span> {String(value)}</p>)}</div></details>}
              </div>
            ))}
            {visible.length === 0 && <p className="py-8 text-center text-muted-foreground">No participants match this filter.</p>}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader><CardTitle>Course announcement</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium">Audience</label><select className="w-full rounded-md border bg-background px-3 py-2" value={announcement.audience} onChange={(event) => setAnnouncement((current) => ({ ...current, audience: event.target.value }))}>{["confirmed", "waitlisted", "selected", "attended", "did_not_attend", "completed"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></div>
            <div><label className="mb-1 block text-sm font-medium">Subject</label><Input value={announcement.subject} onChange={(event) => setAnnouncement((current) => ({ ...current, subject: event.target.value }))} /></div>
            <div><label className="mb-1 block text-sm font-medium">Message</label><textarea className="min-h-32 w-full rounded-md border bg-background px-3 py-2" value={announcement.message} onChange={(event) => setAnnouncement((current) => ({ ...current, message: event.target.value }))} /></div>
            <p className="text-xs text-muted-foreground">Every recipient receives a private platform notification. Transactional email is queued separately without revealing addresses.</p>
            <Button className="w-full" disabled={sending || !announcement.subject || !announcement.message || (announcement.audience === "selected" && selected.length === 0)} onClick={sendAnnouncement}>{sending ? "Sending..." : "Send announcement"}</Button>
            {error && <p className="text-sm" role="status">{error}</p>}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
