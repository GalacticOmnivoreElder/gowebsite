"use client";

import { useState } from "react";
import Link from "next/link";
import { auth } from "@/firebase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const initialForm = {
  title: "", goal: "", discipline: "", currentLevel: "beginner", desiredOutcome: "", projectLinks: "",
  preferredTimeframe: "two_to_four_weeks", timeframeDetails: "", languagePreferences: "English", timeZone: "Europe/Warsaw",
  availability: "", preferredFormat: "online", accessibilityRequest: "", dataSharingConsent: false, expectationsAcknowledged: false, isAdult: false,
};

function csv(value) { return String(value || "").split(",").map((item) => item.trim()).filter(Boolean); }

export function MentorshipPilotRequestWorkspace() {
  const [form, setForm] = useState(initialForm);
  const [requestId, setRequestId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const request = async (mode) => {
    setBusy(true); setMessage("");
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Sign in to request mentorship.");
      const response = await fetch("/api/mentorship/pilot/requests", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...form, requestId, mode, languagePreferences: csv(form.languagePreferences), projectLinks: csv(form.projectLinks) }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error === "mentorship_membership_required" ? "An active GO membership is required for the mentorship pilot." : result.error === "pilot_access_required" ? "Mentorship is currently limited to invited pilot participants." : result.error || "Mentorship request could not be saved.");
      setRequestId(result.id);
      setMessage(mode === "draft" ? "Draft saved privately. You can return and submit it when ready." : "Request submitted. GO reviews every request manually; a mentor is not guaranteed.");
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  };

  return <div className="space-y-6">
    <Card className="border-primary/25">
      <CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>Request mentorship</CardTitle><p className="mt-2 text-sm text-muted-foreground">Describe one concrete game-development goal. GO reviews requests manually and may suggest an approved mentor when fit and availability allow.</p></div><Badge variant="outline">Controlled pilot</Badge></div></CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Request title" value={form.title} onChange={(value) => update("title", value)} placeholder="e.g. Finish my combat prototype" />
          <Field label="Discipline or topic" value={form.discipline} onChange={(value) => update("discipline", value)} placeholder="Game design, art, audio…" />
        </div>
        <Field label="Your goal" value={form.goal} onChange={(value) => update("goal", value)} area help="What would you like to work through with a mentor? Keep it specific and achievable." />
        <div className="grid gap-4 md:grid-cols-2">
          <Select label="Current level" value={form.currentLevel} onChange={(value) => update("currentLevel", value)} options={["beginner", "intermediate", "advanced", "professional"]} />
          <Field label="Desired result" value={form.desiredOutcome} onChange={(value) => update("desiredOutcome", value)} area help="What would a useful outcome look like by the end?" />
        </div>
        <div className="grid gap-4 md:grid-cols-2"><Field label="Project or portfolio links (optional)" value={form.projectLinks} onChange={(value) => update("projectLinks", value)} placeholder="https://… (comma separated)" /><Field label="Preferred timeframe" value={form.timeframeDetails} onChange={(value) => update("timeframeDetails", value)} placeholder="e.g. evenings in September" /><Select label="Timeframe" value={form.preferredTimeframe} onChange={(value) => update("preferredTimeframe", value)} options={["single_session", "two_to_four_weeks", "one_to_three_months", "custom"]} /><Field label="Language preferences" value={form.languagePreferences} onChange={(value) => update("languagePreferences", value)} placeholder="English, Polish" /><Field label="Time zone" value={form.timeZone} onChange={(value) => update("timeZone", value)} /><Select label="Preferred format" value={form.preferredFormat} onChange={(value) => update("preferredFormat", value)} options={["online", "gohq", "hybrid"]} /></div>
        <Field label="Availability" value={form.availability} onChange={(value) => update("availability", value)} area help="Share a general pattern, not private contact details. Exact schedules are agreed only after acceptance." />
        <Field label="Accessibility or accommodation request (optional)" value={form.accessibilityRequest} onChange={(value) => update("accessibilityRequest", value)} area help="This is visible to authorized GO reviewers. It is not shared with a mentor by default." />
        <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm"><p className="font-medium">Before you submit</p><ul className="list-disc space-y-1 pl-5 text-muted-foreground"><li>GO reviews requests manually; a mentor is not guaranteed.</li><li>Only authorized GO reviewers see the request first.</li><li>If you apply to a suggestion, you will see exactly which structured details are shared with that mentor.</li><li>Mentorship is not therapy, legal or financial advice, recruitment, or a promise of employment or project outcomes.</li></ul><label className="flex items-start gap-2"><input className="mt-1" type="checkbox" checked={form.isAdult} onChange={(event) => update("isAdult", event.target.checked)} /><span>I confirm that I am 18 or older. The pilot does not support under-18 mentorship.</span></label><label className="flex items-start gap-2"><input className="mt-1" type="checkbox" checked={form.dataSharingConsent} onChange={(event) => update("dataSharingConsent", event.target.checked)} /><span>I understand the mentorship privacy notice and consent to GO processing this request.</span></label><label className="flex items-start gap-2"><input className="mt-1" type="checkbox" checked={form.expectationsAcknowledged} onChange={(event) => update("expectationsAcknowledged", event.target.checked)} /><span>I understand that the mentor makes the final decision and that GO provides limited facilitation.</span></label></div>
        <div className="flex flex-wrap gap-3"><Button variant="outline" onClick={() => request("draft")} disabled={busy}>{busy ? "Saving…" : "Save private draft"}</Button><Button onClick={() => request("submit")} disabled={busy || !form.isAdult || !form.dataSharingConsent || !form.expectationsAcknowledged}>{busy ? "Submitting…" : "Submit for GO review"}</Button></div>
        {message && <p role="status" className="rounded-md border bg-card p-3 text-sm">{message} {message.startsWith("Request submitted") && <Link className="ml-1 text-primary underline" href="/profile?tab=mentorships">Open mentorships</Link>}</p>}
      </CardContent>
    </Card>
  </div>;
}

function Field({ label, value, onChange, placeholder, area = false, help }) { return <label className="block space-y-1 text-sm"><span className="font-medium">{label}</span>{area ? <textarea className="min-h-24 w-full rounded-md border bg-background px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /> : <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />}{help && <span className="block text-xs text-muted-foreground">{help}</span>}</label>; }
function Select({ label, value, onChange, options }) { return <label className="space-y-1 text-sm"><span className="font-medium">{label}</span><select className="w-full rounded-md border bg-background px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select></label>; }
