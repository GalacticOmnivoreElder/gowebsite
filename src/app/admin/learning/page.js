"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { auth } from "@/firebase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const initial = {
  title: "", slug: "", description: "", instructorName: "", instructorUserId: "",
  learningType: "course", level: "", prerequisites: "", language: "", startsAt: "", endsAt: "",
  timeZone: "Europe/Skopje", durationMinutes: "", format: "online", location: "", capacity: "",
  enrollmentOpensAt: "", enrollmentClosesAt: "", cancellationDeadline: "", accessType: "free",
  membershipRequirement: "", expectedOutcome: "", accessibilityInformation: "", organizerContactRoute: "/contact",
  waitlistEnabled: false, enrollmentMode: "automatic", status: "draft", invitedUserIds: "", customQuestionsJson: "[]",
};

const dateInput = (value) => value ? new Date(value).toISOString().slice(0, 16) : "";

export default function AdminLearningPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initial);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const request = useCallback(async (options = {}) => {
    const token = await auth.currentUser?.getIdToken();
    return fetch("/api/admin/learning-items", { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` }, cache: "no-store" });
  }, []);
  const load = useCallback(async () => {
    const response = await request();
    const result = await response.json().catch(() => []);
    if (!response.ok) throw new Error(result.error || "Learning items could not be loaded");
    setItems(result);
  }, [request]);
  useEffect(() => { const unsubscribe = auth.onAuthStateChanged(() => load().catch((error) => setMessage(error.message))); return unsubscribe; }, [load]);

  const edit = (item) => {
    setEditingId(item.id);
    setForm({
      ...initial, ...item,
      startsAt: dateInput(item.startsAt), endsAt: dateInput(item.endsAt), enrollmentOpensAt: dateInput(item.enrollmentOpensAt), enrollmentClosesAt: dateInput(item.enrollmentClosesAt), cancellationDeadline: dateInput(item.cancellationDeadline),
      capacity: item.capacity ?? "", invitedUserIds: (item.invitedUserIds || []).join(", "), customQuestionsJson: JSON.stringify(item.customQuestions || [], null, 2),
    });
  };

  const save = async () => {
    setSaving(true); setMessage("");
    try {
      let customQuestions;
      try { customQuestions = JSON.parse(form.customQuestionsJson || "[]"); } catch { throw new Error("Custom questions must be valid JSON."); }
      const payload = {
        ...form,
        id: editingId,
        capacity: form.capacity === "" ? null : Number(form.capacity),
        durationMinutes: Number(form.durationMinutes) || 0,
        invitedUserIds: form.invitedUserIds.split(",").map((value) => value.trim()).filter(Boolean),
        customQuestions,
      };
      delete payload.customQuestionsJson;
      const response = await request({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Learning item could not be saved");
      setForm(initial); setEditingId(null); setMessage("Learning item saved."); await load();
    } catch (error) { setMessage(error.message); } finally { setSaving(false); }
  };

  const field = (name, label, type = "text") => <div><label className="mb-1 block text-sm font-medium">{label}</label><Input type={type} value={form[name] ?? ""} onChange={(event) => setForm((current) => ({ ...current, [name]: event.target.value }))} /></div>;

  return (
    <div className="space-y-8">
      <div><h1 className="text-3xl font-bold">Learning</h1><p className="mt-2 text-muted-foreground">Manage courses and workshops. No production fixtures are created automatically.</p></div>
      <Card><CardHeader><CardTitle>{editingId ? "Edit learning item" : "Create learning item"}</CardTitle></CardHeader><CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">{field("title", "Title")}{field("slug", "Slug")}{field("instructorName", "Instructor display name")}{field("instructorUserId", "Assigned instructor user ID")}</div>
        <div><label className="mb-1 block text-sm font-medium">Description</label><textarea className="min-h-32 w-full rounded-md border bg-background px-3 py-2" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></div>
        <div className="grid gap-4 md:grid-cols-3"><div><label className="mb-1 block text-sm font-medium">Type</label><select className="w-full rounded-md border bg-background px-3 py-2" value={form.learningType} onChange={(event) => setForm((current) => ({ ...current, learningType: event.target.value }))}><option value="course">Course</option><option value="workshop">Workshop</option></select></div>{field("level", "Level")}{field("language", "Language")}</div>
        <div className="grid gap-4 md:grid-cols-3">{field("startsAt", "Starts", "datetime-local")}{field("endsAt", "Ends", "datetime-local")}{field("timeZone", "Time zone")}{field("durationMinutes", "Duration (minutes)", "number")}{field("format", "Format")}{field("location", "Location / platform")}</div>
        <div className="grid gap-4 md:grid-cols-3">{field("capacity", "Capacity", "number")}{field("enrollmentOpensAt", "Enrollment opens", "datetime-local")}{field("enrollmentClosesAt", "Enrollment closes", "datetime-local")}{field("cancellationDeadline", "Cancellation deadline", "datetime-local")}{field("organizerContactRoute", "Organizer contact route")}</div>
        <div className="grid gap-4 md:grid-cols-3"><div><label className="mb-1 block text-sm font-medium">Access</label><select className="w-full rounded-md border bg-background px-3 py-2" value={form.accessType} onChange={(event) => setForm((current) => ({ ...current, accessType: event.target.value }))}>{["free", "community_member_only", "invitation_only", "administrator_approved", "public_event_registration"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></div><div><label className="mb-1 block text-sm font-medium">Enrollment mode</label><select className="w-full rounded-md border bg-background px-3 py-2" value={form.enrollmentMode} onChange={(event) => setForm((current) => ({ ...current, enrollmentMode: event.target.value }))}><option value="automatic">Automatic</option><option value="approval">Approval</option></select></div><div><label className="mb-1 block text-sm font-medium">Status</label><select className="w-full rounded-md border bg-background px-3 py-2" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>{["draft", "enrollment_open", "enrollment_closed", "full", "waitlist_available", "in_progress", "completed", "canceled", "archived"].map((value) => <option key={value}>{value}</option>)}</select></div></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.waitlistEnabled} onChange={(event) => setForm((current) => ({ ...current, waitlistEnabled: event.target.checked }))} />Waiting list enabled</label>
        {field("membershipRequirement", "Membership requirement label")}{field("invitedUserIds", "Invited user IDs (comma separated)")}
        <div className="grid gap-4 md:grid-cols-2"><div><label className="mb-1 block text-sm font-medium">Prerequisites</label><textarea className="min-h-24 w-full rounded-md border bg-background px-3 py-2" value={form.prerequisites} onChange={(event) => setForm((current) => ({ ...current, prerequisites: event.target.value }))} /></div><div><label className="mb-1 block text-sm font-medium">Expected outcome</label><textarea className="min-h-24 w-full rounded-md border bg-background px-3 py-2" value={form.expectedOutcome} onChange={(event) => setForm((current) => ({ ...current, expectedOutcome: event.target.value }))} /></div></div>
        <div><label className="mb-1 block text-sm font-medium">Accessibility information</label><textarea className="min-h-24 w-full rounded-md border bg-background px-3 py-2" value={form.accessibilityInformation} onChange={(event) => setForm((current) => ({ ...current, accessibilityInformation: event.target.value }))} /></div>
        <div><label className="mb-1 block text-sm font-medium">Custom enrollment questions (JSON)</label><textarea className="min-h-44 w-full rounded-md border bg-background px-3 py-2 font-mono text-sm" value={form.customQuestionsJson} onChange={(event) => setForm((current) => ({ ...current, customQuestionsJson: event.target.value }))} /><p className="mt-1 text-xs text-muted-foreground">Types: short_text, long_text, multiple_choice, checkboxes, portfolio_link, experience_level, accessibility_request. File uploads are not supported.</p></div>
        <div className="flex gap-3"><Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save learning item"}</Button>{editingId && <Button variant="outline" onClick={() => { setEditingId(null); setForm(initial); }}>Cancel edit</Button>}</div>{message && <p className="text-sm" role="status">{message}</p>}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Learning items</CardTitle></CardHeader><CardContent className="space-y-3">{items.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4"><div><div className="flex items-center gap-2"><p className="font-semibold">{item.title}</p><Badge>{item.status}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{item.learningType} · {item.confirmedCount || 0} confirmed · {item.waitlistCount || 0} waiting</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => edit(item)}>Edit</Button><Button variant="outline" asChild><Link href={`/education/${item.slug}/participants`}>Participants</Link></Button></div></div>)}{items.length === 0 && <p className="py-8 text-center text-muted-foreground">No learning items have been created.</p>}</CardContent></Card>
    </div>
  );
}
