"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, Loader2, Save, ShieldCheck } from "lucide-react";
import { auth } from "@/firebase";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const emptyProfile = { displayName: "", profileImage: "", biography: "", disciplines: "", skills: "", supportedStudentLevels: [], languages: "", mentorshipFormats: [], locationPreference: "online", timeZone: "Europe/Skopje", maximumActiveStudents: 1, portfolioLinksText: "", relatedLearningSlugs: "", relatedVideoBundleSlugs: "" };
const emptyAvailability = { timeZone: "Europe/Skopje", sessionFormats: [], subjectsCurrentlyAccepted: "", mentoringModes: [], maximumActiveStudents: 1, currentlyAcceptingStudents: false, availabilityStatus: "unavailable", temporaryPause: false, recurringWindows: [], individualDates: [] };
const formats = ["online", "gohq", "hybrid"];
const levels = ["beginner", "intermediate", "advanced", "professional", "all_levels"];

const csv = (value) => String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
const toggle = (values, value) => values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
const portfolioToText = (links = []) => links.map((link) => `${link.label} | ${link.url}`).join("\n");
const parsePortfolio = (value) => String(value || "").split("\n").map((line) => line.trim()).filter(Boolean).map((line) => { const [label, ...url] = line.split("|"); return { label: label.trim(), url: url.join("|").trim() }; });

function CheckboxGroup({ label, values, options, onChange }) {
  return <fieldset><legend className="mb-2 text-sm font-medium">{label}</legend><div className="flex flex-wrap gap-3">{options.map((option) => <label key={option} className="flex items-center gap-2 text-sm capitalize"><input type="checkbox" checked={values.includes(option)} onChange={() => onChange(toggle(values, option))} />{option.replaceAll("_", " ")}</label>)}</div></fieldset>;
}

function TextField({ label, value, onChange, type = "text", help }) {
  return <label className="block space-y-1 text-sm"><span className="font-medium">{label}</span><Input type={type} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />{help && <span className="block text-xs text-muted-foreground">{help}</span>}</label>;
}

export function MentorWorkspace() {
  const [state, setState] = useState(null);
  const [profile, setProfile] = useState(emptyProfile);
  const [availability, setAvailability] = useState(emptyAvailability);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState("");

  const authorizedFetch = useCallback(async (url, options = {}) => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Sign in to manage your mentor profile");
    return fetch(url, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` }, cache: "no-store" });
  }, []);

  const load = useCallback(async () => {
    const response = await authorizedFetch("/api/me/mentor-profile");
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(result.error || "Mentor workspace unavailable"), { status: response.status });
    setState(result);
    if (result.profile) setProfile({ ...emptyProfile, ...result.profile, disciplines: (result.profile.disciplines || []).join(", "), skills: (result.profile.skills || []).join(", "), languages: (result.profile.languages || []).join(", "), relatedLearningSlugs: (result.profile.relatedLearningSlugs || []).join(", "), relatedVideoBundleSlugs: (result.profile.relatedVideoBundleSlugs || []).join(", "), portfolioLinksText: portfolioToText(result.profile.portfolioLinks) });
    if (result.canManage && result.availabilityEnabled) {
      const availabilityResponse = await authorizedFetch("/api/me/mentor-availability");
      const availabilityResult = await availabilityResponse.json().catch(() => ({}));
      if (availabilityResponse.ok && availabilityResult.availability) setAvailability({ ...emptyAvailability, ...availabilityResult.availability, subjectsCurrentlyAccepted: (availabilityResult.availability.subjectsCurrentlyAccepted || []).join(", ") });
    }
  }, [authorizedFetch]);
  useEffect(() => { const unsubscribe = auth.onAuthStateChanged(() => load().catch((error) => setState({ error: error.message, unavailable: error.status === 503 }))); return unsubscribe; }, [load]);

  const saveProfile = async () => {
    setSaving("profile"); setMessage("");
    try {
      const payload = { ...profile, disciplines: csv(profile.disciplines), skills: csv(profile.skills), languages: csv(profile.languages), relatedLearningSlugs: csv(profile.relatedLearningSlugs), relatedVideoBundleSlugs: csv(profile.relatedVideoBundleSlugs), portfolioLinks: parsePortfolio(profile.portfolioLinksText), maximumActiveStudents: Number(profile.maximumActiveStudents) || 1 };
      delete payload.portfolioLinksText;
      const response = await authorizedFetch("/api/me/mentor-profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Profile could not be saved");
      setMessage("Mentor profile saved.");
      await load();
    } catch (error) { setMessage(error.message); } finally { setSaving(""); }
  };

  const saveAvailability = async () => {
    setSaving("availability"); setMessage("");
    try {
      const response = await authorizedFetch("/api/me/mentor-availability", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...availability, subjectsCurrentlyAccepted: csv(availability.subjectsCurrentlyAccepted), maximumActiveStudents: Number(availability.maximumActiveStudents) || 1 }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Availability could not be saved");
      setMessage("Private availability saved. Only the general status is public.");
      await load();
    } catch (error) { setMessage(error.message); } finally { setSaving(""); }
  };

  if (!state) return <Loader2 className="mx-auto h-8 w-8 animate-spin" />;
  if (state.error) return <Card><CardContent className="p-8 text-center"><p>{state.error}</p>{state.unavailable && <Badge className="mt-4">Coming Soon</Badge>}</CardContent></Card>;
  if (!state.canManage) return <Card><CardHeader><CardTitle>Mentor Programme</CardTitle></CardHeader><CardContent className="space-y-4"><Badge variant="secondary" className="capitalize">{state.mentorStatus.replaceAll("_", " ")}</Badge><p className="text-muted-foreground">Mentor profile and availability tools become available only after administrator approval.</p><Button asChild variant="outline"><Link href="/membership#mentor-programme">Review Mentor Programme</Link></Button></CardContent></Card>;

  return <div className="space-y-6"><Alert><ShieldCheck className="h-4 w-4" /><AlertDescription>Your account is approved for mentor tools. Public visibility remains controlled by administrators. Current directory status: <strong>{state.publicProfileEnabled ? "public when complete" : "private"}</strong>.</AlertDescription></Alert><Card><CardHeader><CardTitle>Approved mentor profile</CardTitle></CardHeader><CardContent className="space-y-5"><div className="grid gap-4 md:grid-cols-2"><TextField label="Display name" value={profile.displayName} onChange={(value) => setProfile((current) => ({ ...current, displayName: value }))} /><TextField label="Profile image HTTPS URL" type="url" value={profile.profileImage || ""} onChange={(value) => setProfile((current) => ({ ...current, profileImage: value }))} /><TextField label="Disciplines (comma separated)" value={profile.disciplines} onChange={(value) => setProfile((current) => ({ ...current, disciplines: value }))} /><TextField label="Skills (comma separated)" value={profile.skills} onChange={(value) => setProfile((current) => ({ ...current, skills: value }))} /><TextField label="Languages (comma separated)" value={profile.languages} onChange={(value) => setProfile((current) => ({ ...current, languages: value }))} /><TextField label="Time zone" value={profile.timeZone} onChange={(value) => setProfile((current) => ({ ...current, timeZone: value }))} /><TextField label="Related course/workshop slugs" value={profile.relatedLearningSlugs} onChange={(value) => setProfile((current) => ({ ...current, relatedLearningSlugs: value }))} /><TextField label="Related video-bundle slugs" value={profile.relatedVideoBundleSlugs} onChange={(value) => setProfile((current) => ({ ...current, relatedVideoBundleSlugs: value }))} /></div><label className="block space-y-1 text-sm"><span className="font-medium">Biography</span><textarea className="min-h-40 w-full rounded-md border bg-background px-3 py-2" value={profile.biography} onChange={(event) => setProfile((current) => ({ ...current, biography: event.target.value }))} /></label><CheckboxGroup label="Supported student levels" values={profile.supportedStudentLevels} options={levels} onChange={(value) => setProfile((current) => ({ ...current, supportedStudentLevels: value }))} /><CheckboxGroup label="Mentorship formats" values={profile.mentorshipFormats} options={formats} onChange={(value) => setProfile((current) => ({ ...current, mentorshipFormats: value }))} /><label className="block space-y-1 text-sm"><span className="font-medium">Portfolio links</span><textarea className="min-h-28 w-full rounded-md border bg-background px-3 py-2 font-mono text-sm" value={profile.portfolioLinksText} onChange={(event) => setProfile((current) => ({ ...current, portfolioLinksText: event.target.value }))} /><span className="text-xs text-muted-foreground">One per line: Label | https://example.com</span></label><Button onClick={saveProfile} disabled={saving === "profile"}><Save className="mr-2 h-4 w-4" />{saving === "profile" ? "Saving…" : "Save mentor profile"}</Button></CardContent></Card>{state.availabilityEnabled && <Card><CardHeader><CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5" />Private availability</CardTitle></CardHeader><CardContent className="space-y-5"><p className="text-sm text-muted-foreground">Exact windows remain private until an authorized Phase 4 request or scheduling step. The public profile receives only your general availability label.</p><div className="grid gap-4 md:grid-cols-2"><TextField label="Time zone" value={availability.timeZone} onChange={(value) => setAvailability((current) => ({ ...current, timeZone: value }))} /><TextField label="Maximum active students" type="number" value={availability.maximumActiveStudents} onChange={(value) => setAvailability((current) => ({ ...current, maximumActiveStudents: value }))} /><TextField label="Subjects currently accepted" value={availability.subjectsCurrentlyAccepted} onChange={(value) => setAvailability((current) => ({ ...current, subjectsCurrentlyAccepted: value }))} /><label className="space-y-1 text-sm"><span className="font-medium">General availability</span><select className="w-full rounded-md border bg-background px-3 py-2" value={availability.availabilityStatus} onChange={(event) => setAvailability((current) => ({ ...current, availabilityStatus: event.target.value }))}><option value="accepting">Accepting students</option><option value="limited">Limited availability</option><option value="unavailable">Currently unavailable</option></select></label></div><CheckboxGroup label="Session formats" values={availability.sessionFormats} options={formats} onChange={(value) => setAvailability((current) => ({ ...current, sessionFormats: value }))} /><CheckboxGroup label="Mentoring modes" values={availability.mentoringModes} options={["individual", "group"]} onChange={(value) => setAvailability((current) => ({ ...current, mentoringModes: value }))} /><div className="flex flex-wrap gap-5"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={availability.currentlyAcceptingStudents} onChange={(event) => setAvailability((current) => ({ ...current, currentlyAcceptingStudents: event.target.checked }))} />Currently accepting students</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={availability.temporaryPause} onChange={(event) => setAvailability((current) => ({ ...current, temporaryPause: event.target.checked }))} />Temporary pause</label></div><section><div className="flex items-center justify-between"><h3 className="font-semibold">Recurring windows</h3><Button type="button" size="sm" variant="outline" onClick={() => setAvailability((current) => ({ ...current, recurringWindows: [...current.recurringWindows, { dayOfWeek: 1, startsAt: "18:00", endsAt: "19:00", formats: ["online"] }] }))}>Add window</Button></div><div className="mt-3 space-y-3">{availability.recurringWindows.map((window, index) => <div key={index} className="grid gap-2 rounded-md border p-3 sm:grid-cols-4"><select aria-label={`Recurring window ${index + 1} weekday`} className="rounded-md border bg-background px-2" value={window.dayOfWeek} onChange={(event) => setAvailability((current) => ({ ...current, recurringWindows: current.recurringWindows.map((item, itemIndex) => itemIndex === index ? { ...item, dayOfWeek: Number(event.target.value) } : item) }))}>{["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, dayIndex) => <option key={day} value={dayIndex}>{day}</option>)}</select><Input aria-label={`Recurring window ${index + 1} start`} type="time" value={window.startsAt} onChange={(event) => setAvailability((current) => ({ ...current, recurringWindows: current.recurringWindows.map((item, itemIndex) => itemIndex === index ? { ...item, startsAt: event.target.value } : item) }))} /><Input aria-label={`Recurring window ${index + 1} end`} type="time" value={window.endsAt} onChange={(event) => setAvailability((current) => ({ ...current, recurringWindows: current.recurringWindows.map((item, itemIndex) => itemIndex === index ? { ...item, endsAt: event.target.value } : item) }))} /><Button type="button" variant="ghost" onClick={() => setAvailability((current) => ({ ...current, recurringWindows: current.recurringWindows.filter((_, itemIndex) => itemIndex !== index) }))}>Remove</Button></div>)}</div></section><section><div className="flex items-center justify-between"><h3 className="font-semibold">Individual available dates</h3><Button type="button" size="sm" variant="outline" onClick={() => setAvailability((current) => ({ ...current, individualDates: [...current.individualDates, { date: "", startsAt: "18:00", endsAt: "19:00", formats: ["online"] }] }))}>Add date</Button></div><div className="mt-3 space-y-3">{availability.individualDates.map((window, index) => <div key={index} className="grid gap-2 rounded-md border p-3 sm:grid-cols-4"><Input aria-label={`Individual availability ${index + 1} date`} type="date" value={window.date} onChange={(event) => setAvailability((current) => ({ ...current, individualDates: current.individualDates.map((item, itemIndex) => itemIndex === index ? { ...item, date: event.target.value } : item) }))} /><Input aria-label={`Individual availability ${index + 1} start`} type="time" value={window.startsAt} onChange={(event) => setAvailability((current) => ({ ...current, individualDates: current.individualDates.map((item, itemIndex) => itemIndex === index ? { ...item, startsAt: event.target.value } : item) }))} /><Input aria-label={`Individual availability ${index + 1} end`} type="time" value={window.endsAt} onChange={(event) => setAvailability((current) => ({ ...current, individualDates: current.individualDates.map((item, itemIndex) => itemIndex === index ? { ...item, endsAt: event.target.value } : item) }))} /><Button type="button" variant="ghost" onClick={() => setAvailability((current) => ({ ...current, individualDates: current.individualDates.filter((_, itemIndex) => itemIndex !== index) }))}>Remove</Button></div>)}</div></section><Button onClick={saveAvailability} disabled={saving === "availability"}><Save className="mr-2 h-4 w-4" />{saving === "availability" ? "Saving…" : "Save private availability"}</Button></CardContent></Card>}{message && <p className={message.toLowerCase().includes("could not") || message.toLowerCase().includes("must") ? "text-sm text-destructive" : "text-sm text-muted-foreground"} role="status">{message}</p>}</div>;
}
