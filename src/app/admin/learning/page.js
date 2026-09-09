"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { auth } from "@/firebase";
import { TimeZoneSelect } from "@/components/forms/TimeZoneSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const QUESTION_TYPES = ["short_text", "long_text", "multiple_choice", "checkboxes", "portfolio_link", "experience_level", "accessibility_request"];
const LEARNING_STATUSES = ["draft", "enrollment_open", "enrollment_closed", "full", "waitlist_available", "in_progress", "completed", "canceled", "archived"];
const ACCESS_TYPES = ["free", "community_member_only", "invitation_only", "administrator_approved", "public_event_registration"];
const FORMATS = ["online", "in_person", "hybrid", "self_paced"];
const LOCATION_TYPES = ["online", "go_hq", "external_venue", "hybrid", "not_applicable"];

const initial = {
  title: "", slug: "", description: "", instructorName: "", instructorUserId: "",
  learningType: "course", level: "", prerequisites: "", language: "", startsAt: "", endsAt: "",
  timeZone: "Europe/Skopje", durationMinutes: "", format: "online", locationType: "online",
  publicLocation: "", privateSessionUrl: "", capacity: "", enrollmentOpensAt: "", enrollmentClosesAt: "",
  cancellationDeadline: "", accessType: "free", membershipRequirement: "", expectedOutcome: "",
  accessibilityInformation: "", organizerContactRoute: "/contact", waitlistEnabled: false,
  enrollmentMode: "automatic", status: "draft", invitedUserIds: "", customQuestions: [],
};

const dateInput = (value) => value ? new Date(value).toISOString().slice(0, 16) : "";
const optionLabel = (value) => value.replaceAll("_", " ");

function SelectField({ label, value, options, onChange }) {
  return <label className="block space-y-1 text-sm"><span className="font-medium">{label}</span><select className="w-full rounded-md border bg-background px-3 py-2 capitalize" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{optionLabel(option)}</option>)}</select></label>;
}

function QuestionBuilder({ questions, onChange }) {
  const update = (index, changes) => onChange(questions.map((question, questionIndex) => questionIndex === index ? { ...question, ...changes } : question));
  return <section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Enrollment questions</h3><p className="text-xs text-muted-foreground">Build the form applicants complete inside GO.</p></div><Button type="button" variant="outline" onClick={() => onChange([...questions, { id: `question_${questions.length + 1}`, label: "", type: "short_text", required: false, options: [] }])}>Add question</Button></div>{questions.map((question, index) => <div key={`${question.id}-${index}`} className="space-y-3 rounded-md border p-4"><div className="grid gap-3 md:grid-cols-[1fr_220px]"><label className="text-sm"><span className="mb-1 block font-medium">Question</span><Input value={question.label} onChange={(event) => update(index, { label: event.target.value, id: question.id || `question_${index + 1}` })} /></label><SelectField label="Answer type" value={question.type} options={QUESTION_TYPES} onChange={(type) => update(index, { type, options: ["multiple_choice", "checkboxes"].includes(type) ? question.options || [] : [] })} /></div>{["multiple_choice", "checkboxes"].includes(question.type) ? <label className="block text-sm"><span className="mb-1 block font-medium">Options</span><Input value={(question.options || []).join(", ")} onChange={(event) => update(index, { options: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) })} /><span className="mt-1 block text-xs text-muted-foreground">Separate choices with commas.</span></label> : null}<div className="flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={question.required === true} onChange={(event) => update(index, { required: event.target.checked })} />Required</label><Button type="button" variant="ghost" onClick={() => onChange(questions.filter((_, questionIndex) => questionIndex !== index))}>Remove</Button></div></div>)}{questions.length === 0 ? <p className="rounded-md border border-dashed p-5 text-center text-sm text-muted-foreground">No additional application questions.</p> : null}</section>;
}

export default function AdminLearningPage() {
  const [items, setItems] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [instructorSearch, setInstructorSearch] = useState("");
  const [form, setForm] = useState(initial);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const authenticatedFetch = useCallback(async (path, options = {}) => {
    const token = await auth.currentUser?.getIdToken();
    return fetch(path, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` }, cache: "no-store" });
  }, []);

  const load = useCallback(async () => {
    const [itemsResponse, usersResponse] = await Promise.all([
      authenticatedFetch("/api/admin/learning-items"),
      authenticatedFetch("/api/admin/users"),
    ]);
    const [itemsResult, usersResult] = await Promise.all([
      itemsResponse.json().catch(() => []),
      usersResponse.json().catch(() => ({})),
    ]);
    if (!itemsResponse.ok) throw new Error(itemsResult.error || "Learning items could not be loaded");
    if (!usersResponse.ok) throw new Error(usersResult.error || "Approved instructors could not be loaded");
    setItems(itemsResult);
    setInstructors((usersResult.users || []).filter((user) => user.isMember && user.membershipTier === "mentor" && user.mentorStatus === "approved"));
  }, [authenticatedFetch]);

  useEffect(() => auth.onAuthStateChanged(() => load().catch((error) => setMessage(error.message))), [load]);

  const visibleInstructors = useMemo(() => {
    const query = instructorSearch.trim().toLowerCase();
    if (!query) return instructors;
    return instructors.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(query));
  }, [instructorSearch, instructors]);

  const edit = (item) => {
    setEditingId(item.id);
    setForm({
      ...initial, ...item,
      startsAt: dateInput(item.startsAt), endsAt: dateInput(item.endsAt),
      enrollmentOpensAt: dateInput(item.enrollmentOpensAt), enrollmentClosesAt: dateInput(item.enrollmentClosesAt),
      cancellationDeadline: dateInput(item.cancellationDeadline), capacity: item.capacity ?? "",
      invitedUserIds: (item.invitedUserIds || []).join(", "), customQuestions: item.customQuestions || [],
      publicLocation: item.publicLocation || (!/^https?:\/\//i.test(item.location || "") ? item.location || "" : ""),
      privateSessionUrl: item.privateSessionUrl || (/^https?:\/\//i.test(item.location || "") ? item.location : ""),
    });
  };

  const save = async () => {
    setSaving(true); setMessage("");
    try {
      const selectedInstructor = instructors.find((user) => user.id === form.instructorUserId);
      const payload = {
        ...form, id: editingId, instructorName: selectedInstructor?.name || form.instructorName,
        capacity: form.capacity === "" ? null : Number(form.capacity),
        durationMinutes: Number(form.durationMinutes) || 0,
        invitedUserIds: form.invitedUserIds.split(",").map((value) => value.trim()).filter(Boolean),
      };
      const response = await authenticatedFetch("/api/admin/learning-items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Learning item could not be saved");
      setForm(initial); setEditingId(null); setMessage("Learning item saved."); await load();
    } catch (error) { setMessage(error.message); } finally { setSaving(false); }
  };

  const field = (name, label, type = "text") => name === "timeZone"
    ? <TimeZoneSelect label={label} value={form[name]} onChange={(value) => setForm((current) => ({ ...current, [name]: value }))} />
    : <label className="block text-sm"><span className="mb-1 block font-medium">{label}</span><Input type={type} value={form[name] ?? ""} onChange={(event) => setForm((current) => ({ ...current, [name]: event.target.value }))} /></label>;

  return <div className="space-y-8"><div><h1 className="text-3xl font-bold">Learning</h1><p className="mt-2 text-muted-foreground">Create, review, and publish native GO courses and workshops.</p></div><Card><CardHeader><CardTitle>{editingId ? "Edit learning item" : "Create learning item"}</CardTitle></CardHeader><CardContent className="space-y-5"><div className="grid gap-4 md:grid-cols-2">{field("title", "Title")}{field("slug", "Slug")}</div><section className="space-y-3 rounded-md border p-4"><div><h3 className="font-semibold">Approved instructor</h3><p className="text-xs text-muted-foreground">Only verified GO mentors with current paid access can be assigned.</p></div><Input aria-label="Search approved mentors" placeholder="Search by name or email" value={instructorSearch} onChange={(event) => setInstructorSearch(event.target.value)} /><select aria-label="Assigned instructor" className="w-full rounded-md border bg-background px-3 py-2" value={form.instructorUserId} onChange={(event) => { const instructor = instructors.find((user) => user.id === event.target.value); setForm((current) => ({ ...current, instructorUserId: event.target.value, instructorName: instructor?.name || "" })); }}><option value="">GO team / no assigned mentor</option>{visibleInstructors.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.email}</option>)}</select></section><label className="block text-sm"><span className="mb-1 block font-medium">Description</span><textarea className="min-h-32 w-full rounded-md border bg-background px-3 py-2" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></label><div className="grid gap-4 md:grid-cols-3"><SelectField label="Type" value={form.learningType} options={["course", "workshop"]} onChange={(value) => setForm((current) => ({ ...current, learningType: value }))} />{field("level", "Level")}{field("language", "Language")}</div><div className="grid gap-4 md:grid-cols-3">{field("startsAt", "Starts", "datetime-local")}{field("endsAt", "Ends", "datetime-local")}{field("timeZone", "Time zone")}{field("durationMinutes", "Duration (minutes)", "number")}<SelectField label="Format" value={form.format} options={FORMATS} onChange={(value) => setForm((current) => ({ ...current, format: value }))} /><SelectField label="Location type" value={form.locationType} options={LOCATION_TYPES} onChange={(value) => setForm((current) => ({ ...current, locationType: value }))} /></div><div className="grid gap-4 md:grid-cols-2">{field("publicLocation", "Public venue or platform text")}{field("privateSessionUrl", "Private session URL", "url")}</div><p className="text-xs text-muted-foreground">The private session URL is released only to an authorized instructor or a confirmed participant after a server-side access check.</p><div className="grid gap-4 md:grid-cols-3">{field("capacity", "Capacity", "number")}{field("enrollmentOpensAt", "Enrollment opens", "datetime-local")}{field("enrollmentClosesAt", "Enrollment closes", "datetime-local")}{field("cancellationDeadline", "Cancellation deadline", "datetime-local")}{field("organizerContactRoute", "Organizer contact route")}</div><div className="grid gap-4 md:grid-cols-3"><SelectField label="Access" value={form.accessType} options={ACCESS_TYPES} onChange={(value) => setForm((current) => ({ ...current, accessType: value }))} /><SelectField label="Enrollment mode" value={form.enrollmentMode} options={["automatic", "approval"]} onChange={(value) => setForm((current) => ({ ...current, enrollmentMode: value }))} /><SelectField label="Publication state" value={form.status} options={LEARNING_STATUSES} onChange={(value) => setForm((current) => ({ ...current, status: value }))} /></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.waitlistEnabled} onChange={(event) => setForm((current) => ({ ...current, waitlistEnabled: event.target.checked }))} />Waiting list enabled</label>{field("membershipRequirement", "Membership requirement label")}{field("invitedUserIds", "Invited user IDs (comma separated)")}<div className="grid gap-4 md:grid-cols-2"><label className="text-sm"><span className="mb-1 block font-medium">Prerequisites</span><textarea className="min-h-24 w-full rounded-md border bg-background px-3 py-2" value={form.prerequisites} onChange={(event) => setForm((current) => ({ ...current, prerequisites: event.target.value }))} /></label><label className="text-sm"><span className="mb-1 block font-medium">Expected outcome</span><textarea className="min-h-24 w-full rounded-md border bg-background px-3 py-2" value={form.expectedOutcome} onChange={(event) => setForm((current) => ({ ...current, expectedOutcome: event.target.value }))} /></label></div><label className="block text-sm"><span className="mb-1 block font-medium">Accessibility information</span><textarea className="min-h-24 w-full rounded-md border bg-background px-3 py-2" value={form.accessibilityInformation} onChange={(event) => setForm((current) => ({ ...current, accessibilityInformation: event.target.value }))} /></label><QuestionBuilder questions={form.customQuestions} onChange={(customQuestions) => setForm((current) => ({ ...current, customQuestions }))} /><div className="flex flex-wrap gap-3"><Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save learning item"}</Button>{editingId ? <Button variant="outline" asChild><Link href={`/education/${form.slug}`}>Preview</Link></Button> : null}{editingId ? <Button variant="outline" onClick={() => { setEditingId(null); setForm(initial); }}>Cancel edit</Button> : null}</div>{message ? <p className="text-sm" role="status">{message}</p> : null}</CardContent></Card><Card><CardHeader><CardTitle>Learning items</CardTitle></CardHeader><CardContent className="space-y-3">{items.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4"><div><div className="flex items-center gap-2"><p className="font-semibold">{item.title}</p><Badge>{optionLabel(item.status)}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{item.learningType} · {item.confirmedCount || 0} confirmed · {item.waitlistCount || 0} waiting</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => edit(item)}>Edit</Button><Button variant="outline" asChild><Link href={`/education/${item.slug}/participants`}>Participants</Link></Button></div></div>)}{items.length === 0 ? <p className="py-8 text-center text-muted-foreground">No learning items have been created.</p> : null}</CardContent></Card></div>;
}
