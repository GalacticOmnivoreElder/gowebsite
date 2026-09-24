"use client";
import { useEffect, useState } from "react";
import { courseFetch } from "@/lib/course-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTimeInTimeZone } from "@/lib/timezones";

export function CourseWorkspace({ slug, title, timeZone }) {
  const [data, setData] = useState(null), [submission, setSubmission] = useState({}), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => { let active = true; courseFetch(`/api/learning-items/${slug}/coursework`).then(next => { if (active) { setData(next); setSubmission(next.submission); } }).catch(e => { if (active) setMessage(e.message); }); return () => { active = false; }; }, [slug]);
  async function save() {
    setBusy(true); setMessage("");
    try { await courseFetch(`/api/learning-items/${slug}/coursework`, { method: "PUT", body: JSON.stringify(submission) }); setMessage("Progress and evidence saved. Your instructor will review your submission."); }
    catch (e) { setMessage(e.message); } finally { setBusy(false); }
  }
  return <Card><CardHeader><CardTitle>Your course workspace — {title}</CardTitle></CardHeader><CardContent className="space-y-6">
    {message && <p role="status">{message}</p>}{!data && !message && <p>Loading your coursework…</p>}
    {data && <>
      {data.badge && <div className="rounded-xl border border-primary bg-primary/10 p-5"><h3 className="text-xl font-bold">{data.badge.title}</h3><p className="mt-2">Earned {new Date(data.badge.awardedAt).toLocaleDateString()} · Instructor verified</p></div>}
      {data.assessment && <div className="rounded-lg border p-4"><h3 className="font-semibold">Instructor review: {data.assessment.approved ? "Approved" : "In review / changes needed"}</h3><p>{data.assessment.reviewCount} reviews/ratings verified</p><p className="mt-2 whitespace-pre-wrap">{data.assessment.notes}</p></div>}
      <div className="grid gap-4 md:grid-cols-2">{data.modules.map((module, index) => {
        const session = data.sessions.find(s => s.id === module.id);
        return <div key={module.id} className="space-y-3 rounded-lg border p-4"><h3 className="font-semibold">Day {index + 1}: {module.title}</h3><p className="text-sm">{module.milestone}</p>{session && <p className="text-sm text-muted-foreground">{formatDateTimeInTimeZone(session.startsAt, timeZone)}</p>}
          {session?.privateSessionUrl ? <a className="block text-primary underline" href={session.privateSessionUrl} target="_blank" rel="noopener noreferrer">Open live session</a> : <p className="text-sm text-muted-foreground">Online session link will appear here when added by GO.</p>}
          <details><summary className="cursor-pointer text-sm">Lesson details</summary><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{module.content}</p></details>
          <label className="flex gap-2 text-sm"><input type="checkbox" disabled={!!data.badge} checked={(submission.completedDays || []).includes(index + 1)} onChange={e => setSubmission({ ...submission, completedDays: e.target.checked ? [...(submission.completedDays || []), index + 1] : submission.completedDays.filter(d => d !== index + 1) })} />Day {index + 1} completed</label>
          {data.resources.filter(r => r.day === index + 1).map(r => <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" className="block text-sm text-primary underline">{r.title} · {r.kind}</a>)}
        </div>;
      })}</div>
      <section><h3 className="font-semibold">Course materials</h3>{data.resources.filter(r => !r.day).map(r => <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" className="mt-2 block text-primary underline">{r.title} · {r.kind}</a>)}{!data.resources.length && <p className="mt-2 text-sm text-muted-foreground">Resources will appear here as they are added and approved.</p>}{!data.recordingAccess && <p className="mt-3 text-sm">Recording access ended with your membership. Separate video-bundle purchase is coming soon. <a className="text-primary underline" href="#price-waitlist">Join the price announcement waitlist</a>.</p>}</section>
      <fieldset disabled={!!data.badge || busy} className="space-y-4"><legend className="mb-3 text-lg font-semibold">Your playable v0.1 and playtest evidence</legend>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={submission.prototypePublished || false} onChange={e => setSubmission({ ...submission, prototypePublished: e.target.checked })} />My prototype is published and playable</label>
        <label className="block text-sm">itch.io game URL<Input type="url" value={submission.finalUrl || ""} onChange={e => setSubmission({ ...submission, finalUrl: e.target.value })} placeholder="https://your-name.itch.io/your-game" /></label>
        <label className="block text-sm">Review evidence URL (jam ratings, comments, or screenshot)<Input type="url" value={submission.reviewEvidenceUrl || ""} onChange={e => setSubmission({ ...submission, reviewEvidenceUrl: e.target.value })} /></label>
        <p className="text-sm text-muted-foreground">At least 10 reviews/ratings are required. Your instructor verifies the evidence; entering a URL does not automatically award completion.</p>
        {[['playtestNotes', 'External playtest: expected, observed, confusion, behavior, feedback, highest-priority change'], ['retrospective', "Retrospective: what exists, works, doesn't, what players said, what I would build next"]].map(([key, label]) => <label key={key} className="block text-sm">{label}<textarea className="mt-2 min-h-28 w-full rounded-md border bg-background p-3" maxLength={5000} value={submission[key] || ""} onChange={e => setSubmission({ ...submission, [key]: e.target.value })} /></label>)}
        <Button onClick={save}>{busy ? "Saving…" : "Save progress and evidence"}</Button>
      </fieldset>
    </>}
  </CardContent></Card>;
}
