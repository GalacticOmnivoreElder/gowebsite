"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { auth } from "@/firebase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trackEvent } from "@/lib/analytics/client";

const levels = ["beginner", "intermediate", "advanced", "professional"];
const formats = ["online", "gohq", "hybrid"];
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const emptyForm = { learningObjective: "", discipline: "", skillLevel: "beginner", preferredLanguage: "English", preferredFormat: "online", availabilityDays: [], generalAvailability: "", timeZone: "Europe/Skopje", expectedDuration: "single_session", portfolioUrl: "", note: "", isAdult: false };

export function MentorshipRequestWorkspace({ initialMentorId = "" }) {
  const [form, setForm] = useState(emptyForm);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedMentorId, setSelectedMentorId] = useState(initialMentorId);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const selectedMentor = useMemo(() => suggestions.find((item) => item.mentor.id === selectedMentorId), [suggestions, selectedMentorId]);

  const authorizedRequest = async (url, options) => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Sign in to request mentorship");
    return fetch(url, { ...options, headers: { ...(options?.headers || {}), Authorization: `Bearer ${token}` }, cache: "no-store" });
  };
  const payload = () => ({ ...form, availabilityDays: form.availabilityDays.map(Number) });
  const findMentors = async () => {
    trackEvent("mentorship_request_started", {
      flow: "self_service_matchmaking",
      entry_point: "matchmaking",
    });
    setLoading(true); setStatus("");
    try {
      const response = await authorizedRequest("/api/mentorship/suggestions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload()) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error === "community_membership_required" ? "Active Community or Business membership is required to submit mentorship requests." : result.error === "adult_confirmation_required" ? "Please confirm that you are 18 or older." : result.error || "Mentor suggestions could not be loaded");
      setSuggestions(result.suggestions || []);
      setStatus(result.suggestions?.length ? "Compatible mentors are ready. Choose one, or request GO assistance." : "No available mentor matches all of these preferences. You can request GO assistance.");
    } catch (error) { setStatus(error.message); } finally { setLoading(false); }
  };
  const submit = async (assistanceRequested = false) => {
    if (!assistanceRequested && !selectedMentorId) return setStatus("Choose one mentor or request GO assistance.");
    trackEvent("mentorship_request_started", {
      flow: "self_service_matchmaking",
      entry_point: assistanceRequested ? "go_assistance" : "mentor_selection",
    });
    setLoading(true); setStatus("");
    try {
      const response = await authorizedRequest("/api/mentorship/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload(), targetMentorId: assistanceRequested ? null : selectedMentorId, assistanceRequested }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Mentorship request could not be submitted");
      trackEvent("mentorship_request_completed", {
        flow: "self_service_matchmaking",
        request_mode: assistanceRequested ? "go_assistance" : "mentor_selection",
      });
      setStatus("Mentorship request submitted. Track it in your private mentorship dashboard.");
    } catch (error) { setStatus(error.message); } finally { setLoading(false); }
  };
  const toggleDay = (day) => setForm((current) => ({ ...current, availabilityDays: current.availabilityDays.includes(day) ? current.availabilityDays.filter((value) => value !== day) : [...current.availabilityDays, day] }));

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader><CardTitle>Tell us what you want to learn</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <label className="block space-y-1 text-sm"><span className="font-medium">Learning objective</span><textarea className="min-h-28 w-full rounded-md border bg-background px-3 py-2" value={form.learningObjective} onChange={(event) => setForm((current) => ({ ...current, learningObjective: event.target.value }))} /></label>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Discipline or subject" value={form.discipline} onChange={(value) => setForm((current) => ({ ...current, discipline: value }))} />
            <Field label="Preferred language" value={form.preferredLanguage} onChange={(value) => setForm((current) => ({ ...current, preferredLanguage: value }))} />
            <Select label="Current skill level" value={form.skillLevel} options={levels} onChange={(value) => setForm((current) => ({ ...current, skillLevel: value }))} />
            <Select label="Preferred format" value={form.preferredFormat} options={formats} onChange={(value) => setForm((current) => ({ ...current, preferredFormat: value }))} />
            <Select label="Expected duration" value={form.expectedDuration} options={["single_session", "two_to_four_weeks", "one_to_three_months"]} onChange={(value) => setForm((current) => ({ ...current, expectedDuration: value }))} />
            <Field label="Time zone" value={form.timeZone} onChange={(value) => setForm((current) => ({ ...current, timeZone: value }))} />
            <Field label="Portfolio or project link (optional)" type="url" value={form.portfolioUrl} onChange={(value) => setForm((current) => ({ ...current, portfolioUrl: value }))} />
            <Field label="Availability note" value={form.generalAvailability} onChange={(value) => setForm((current) => ({ ...current, generalAvailability: value }))} />
          </div>
          <fieldset><legend className="text-sm font-medium">Generally available days</legend><div className="mt-2 flex flex-wrap gap-3">{days.map((day, index) => <label key={day} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.availabilityDays.includes(index)} onChange={() => toggleDay(index)} />{day}</label>)}</div></fieldset>
          <label className="block space-y-1 text-sm"><span className="font-medium">Optional note</span><textarea className="min-h-20 w-full rounded-md border bg-background px-3 py-2" value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} /></label>
          <label className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={form.isAdult} onChange={(event) => setForm((current) => ({ ...current, isAdult: event.target.checked }))} /><span>I confirm I am 18 or older. Public self-service matchmaking is not available to minors.</span></label>
          <Button onClick={findMentors} disabled={loading}>{loading ? "Checking compatibility…" : "Suggest compatible mentors"}</Button>
        </CardContent>
      </Card>

      {suggestions.length > 0 && <section><h2 className="text-2xl font-bold">Compatible available mentors</h2><p className="mt-2 text-sm text-muted-foreground">Suggestions explain broad compatibility only. Exact mentor schedules remain private.</p><div className="mt-4 grid gap-4 md:grid-cols-2">{suggestions.map((item) => <Card key={item.mentor.id} className={selectedMentorId === item.mentor.id ? "border-primary" : ""}><CardHeader><div className="flex items-start justify-between gap-3"><CardTitle>{item.mentor.displayName}</CardTitle><Badge>{item.score}% match</Badge></div></CardHeader><CardContent className="space-y-4"><div className="flex flex-wrap gap-2">{item.reasons.map((reason) => <Badge key={reason} variant="outline">{reason}</Badge>)}</div><p className="text-sm text-muted-foreground">{item.capacityRemaining} mentoring place{item.capacityRemaining === 1 ? "" : "s"} currently available.</p><div className="flex gap-2"><Button variant={selectedMentorId === item.mentor.id ? "default" : "outline"} onClick={() => setSelectedMentorId(item.mentor.id)}>Select mentor</Button><Button asChild variant="ghost"><Link href={`/mentors/${item.mentor.id}`}>View profile</Link></Button></div></CardContent></Card>)}</div></section>}
      <div className="flex flex-wrap gap-3"><Button disabled={loading || !selectedMentorId} onClick={() => submit(false)}>Send to {selectedMentor?.mentor.displayName || "selected mentor"}</Button><Button disabled={loading} variant="outline" onClick={() => submit(true)}>Request GO assistance</Button></div>
      {status && <p role="status" className="rounded-md border bg-card p-4 text-sm">{status} {status.includes("submitted") && <Link className="ml-2 text-primary underline" href="/profile?tab=mentorships">Open dashboard</Link>}</p>}
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) { return <label className="space-y-1 text-sm"><span className="font-medium">{label}</span><Input type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
function Select({ label, value, options, onChange }) { return <label className="space-y-1 text-sm"><span className="font-medium">{label}</span><select className="w-full rounded-md border bg-background px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select></label>; }
