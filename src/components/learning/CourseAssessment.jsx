"use client";
import { useState } from "react";
import { courseFetch } from "@/lib/course-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function CourseAssessment({ participant, slug, onSaved }) {
  const [form, setForm] = useState(participant.assessment || { reviewCount: 0, evidenceVerified: false, competencies: {}, notes: "" });
  const [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  const submission = participant.submission || {};
  async function save(approved) {
    setBusy(true); setMessage("");
    try { await courseFetch(`/api/learning-items/${slug}/coursework`, { method: "PATCH", body: JSON.stringify({ ...form, approved, userId: participant.userId, submissionVersion: participant.submissionVersion || 0 }) }); setMessage("Assessment saved."); await onSaved(); }
    catch(e) { setMessage(e.message); } finally { setBusy(false); }
  }
  return <details className="mt-4 rounded-lg border p-4"><summary className="cursor-pointer font-semibold">Prototype, review evidence and badge assessment{participant.badge ? " — badge earned" : ""}</summary><div className="mt-4 space-y-4">
    <p className="text-sm">Attendance: {participant.attendanceMode || "in_person"} · Days completed: {(submission.completedDays || []).join(", ") || "None"}</p>
    {[['finalUrl','Open itch.io game'],['reviewEvidenceUrl','Open review evidence']].map(([key,label]) => submission[key] ? <a key={key} className="block text-primary underline" href={submission[key]} target="_blank" rel="noopener noreferrer">{label}</a> : <p key={key} className="text-sm">{label}: not submitted</p>)}
    <p className="whitespace-pre-wrap text-sm">{submission.playtestNotes}</p><p className="whitespace-pre-wrap text-sm">{submission.retrospective}</p>
    <label className="block text-sm">Human-verified reviews/ratings received (minimum 10)<Input type="number" min="0" step="1" value={form.reviewCount} onChange={e => setForm({ ...form, reviewCount: Number(e.target.value) })} /></label>
    <label className="flex gap-2 text-sm"><input type="checkbox" checked={form.evidenceVerified} onChange={e => setForm({ ...form, evidenceVerified: e.target.checked })} />I checked the playable build and itch.io review evidence</label>
    <div className="flex flex-wrap gap-4">{["scope","build","debug","version","ship"].map(key => <label key={key} className="flex gap-2 text-sm capitalize"><input type="checkbox" checked={form.competencies?.[key] || false} onChange={e => setForm({ ...form, competencies: { ...form.competencies, [key]: e.target.checked } })} />{key}</label>)}</div>
    <label className="block text-sm">Feedback / reason<textarea className="mt-2 w-full rounded-md border bg-background p-3" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></label>
    <div className="flex flex-wrap gap-3"><Button disabled={busy} onClick={() => save(true)}>Approve completion and award badge</Button><Button disabled={busy} variant="outline" onClick={() => save(false)}>Save review / request changes</Button></div>{participant.badge && <p className="text-sm">Requesting changes removes the award and unlocks evidence for resubmission.</p>}{message && <p role="status">{message}</p>}
  </div></details>;
}
