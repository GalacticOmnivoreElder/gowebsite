"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { auth } from "@/firebase";
import { courseFetch } from "@/lib/course-client";
import { courseLocalDate, courseUtcDate } from "@/lib/course-dates";
import { TimeZoneSelect } from "@/components/forms/TimeZoneSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function Resources({ resources = [], onChange }) {
  const edit = (index, patch) => onChange(resources.map((r, i) => i === index ? { ...r, ...patch } : r));
  return <section className="space-y-3"><h3 className="font-semibold">Resources and recordings</h3><p className="text-sm text-muted-foreground">Add links now or later. Only approved resources are released; recordings additionally require current membership or internal-team access.</p>
    {resources.map((r, index) => <div key={r.id} className="grid gap-3 rounded-lg border p-4 md:grid-cols-2"><label className="text-sm">Title<Input value={r.title} onChange={e => edit(index, { title: e.target.value })} /></label><label className="text-sm">HTTPS URL<Input type="url" value={r.url} onChange={e => edit(index, { url: e.target.value })} /></label><label className="text-sm">Kind<select className="block w-full rounded-md border bg-background p-2" value={r.kind} onChange={e => edit(index, { kind: e.target.value, approved: false })}>{["guide", "prompt", "qa", "repository", "recording", "slides", "homework", "download", "example"].map(k => <option key={k}>{k}</option>)}</select></label><label className="text-sm">Day<select className="block w-full rounded-md border bg-background p-2" value={r.day} onChange={e => edit(index, { day: Number(e.target.value) })}>{[0,1,2,3,4,5].map(day => <option key={day} value={day}>{day ? `Day ${day}` : "Whole course"}</option>)}</select></label><label className="flex gap-2 text-sm"><input type="checkbox" checked={r.approved} onChange={e => edit(index, { approved: e.target.checked })} />Reviewed and approved for release</label><Button variant="outline" onClick={() => onChange(resources.filter((_, i) => i !== index))}>Remove resource</Button></div>)}
    <Button variant="outline" onClick={() => onChange([...resources, { id: crypto.randomUUID(), title: "", url: "", day: 0, kind: "guide", approved: false }])}>Add resource</Button>
  </section>;
}
const dateKeys = ["startsAt", "endsAt", "enrollmentOpensAt", "enrollmentClosesAt", "cancellationDeadline"];
function editableCohort(item) {
  const result = { ...item, invitedUserIds: (item.invitedUserIds || []).join(", ") };
  dateKeys.forEach(key => { result[key] = courseLocalDate(item[key], item.timeZone); });
  result.sessions = item.sessions.map(s => ({ ...s, startsAt: courseLocalDate(s.startsAt, item.timeZone), endsAt: courseLocalDate(s.endsAt, item.timeZone) }));
  return result;
}
export default function CourseBootcampAdmin() {
  const [data, setData] = useState(null), [course, setCourse] = useState(null), [cohort, setCohort] = useState(null), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  const load = async () => { const next = await courseFetch("/api/admin/learning-courses"); setData(next); setCourse(next.course); };
  useEffect(() => auth.onAuthStateChanged(user => { if (user) load().catch(e => setMessage(e.message)); }), []);
  const save = async (kind) => {
    setBusy(true); setMessage("");
    try {
      let body = course;
      if (kind === "cohort") {
        body = { ...cohort, invitedUserIds: cohort.invitedUserIds.split(",").map(s => s.trim()).filter(Boolean), capacity: Number(cohort.capacity), sessions: cohort.sessions.map(s => ({ ...s, startsAt: courseUtcDate(s.startsAt, cohort.timeZone), endsAt: courseUtcDate(s.endsAt, cohort.timeZone) })) };
        dateKeys.forEach(key => { body[key] = courseUtcDate(cohort[key], cohort.timeZone); });
      }
      await courseFetch("/api/admin/learning-courses", { method: kind === "cohort" ? "PUT" : "POST", body: JSON.stringify(body) });
      await load(); if (kind === "cohort") setCohort(null); setMessage("Saved. Published changes are now available on the course page.");
    } catch (e) { setMessage(e.message); } finally { setBusy(false); }
  };
  function duplicate(item) {
    const next = editableCohort(item);
    const shift = local => local ? new Date(Date.parse(`${local}:00Z`) + 7 * 86400000).toISOString().slice(0,16) : "";
    dateKeys.forEach(key => { next[key] = shift(next[key]); });
    next.sessions = next.sessions.map(s => ({ ...s, startsAt: shift(s.startsAt), endsAt: shift(s.endsAt), privateSessionUrl: "" }));
    next.id = `from-idea-to-playable-${next.startsAt.slice(0,10)}`; next.slug = next.id; next.title = `${course.title} · ${next.startsAt.slice(0,10)}`;
    next.status = "draft"; next.resources = []; next.jamUrl = ""; next.invitedUserIds = ""; next.instructorUserId ||= "";
    next.createOnly = true;
    next.confirmedCount = 0; next.onlineConfirmedCount = 0; next.reservedCount = 0; next.waitlistCount = 0;
    setCohort(next);
  }
  const courseText = (key, label) => <label key={key} className="block text-sm">{label}<textarea className="mt-1 min-h-20 w-full rounded-md border bg-background p-3" value={course[key] || ""} onChange={e => setCourse({ ...course, [key]: e.target.value })} /></label>;
  const cohortText = (key, label, type = "text") => <label key={key} className="block text-sm">{label}<Input type={type} value={cohort[key] ?? ""} onChange={e => setCohort({ ...cohort, [key]: e.target.value })} /></label>;
  return <Card><CardHeader><CardTitle>Flagship course — From Idea to Playable</CardTitle></CardHeader><CardContent className="space-y-6">
    {message && <p role="status">{message}</p>}{!data && <p>Loading flagship course settings…</p>}
    {course && <>
      <p className="text-sm text-muted-foreground">Standalone course and video-bundle purchases are coming soon. No price is charged. Member access and the price announcement waitlist are available.</p>
      <Button asChild variant="outline"><Link href="/education/from-idea-to-playable">View course</Link></Button>
      <details className="rounded-lg border p-4"><summary className="cursor-pointer font-semibold">Course page, curriculum and resources</summary><fieldset disabled={busy} className="mt-5 space-y-4">
        <label className="block text-sm">Publication<select className="ml-3 rounded-md border bg-background p-2" value={course.status} onChange={e => setCourse({ ...course, status: e.target.value })}><option value="draft">Draft</option><option value="published">Published</option></select></label>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={course.memberAccess} onChange={e => setCourse({ ...course, memberAccess: e.target.checked })} />Member enrollment enabled</label>
        {[["title","Title"],["subtitle","Subtitle"],["promise","Promise"],["description","Description"],["audience","Who this is for"],["outcomes","Outcomes"],["tools","Tools"],["methodology","Development loop"],["aiRule","AI approval principle"],["expectations","Expectations"],["badgeTitle","Badge title"],["qaTemplate","QA template"]].map(([key,label]) => courseText(key,label))}
        <label className="block text-sm">Course image URL<Input type="url" value={course.imageUrl} onChange={e => setCourse({ ...course, imageUrl: e.target.value })} /></label>
        {course.modules.map((module, index) => <div key={module.id} className="space-y-3 rounded-lg border p-4"><h3 className="font-semibold">Day {index + 1}</h3>{["title", "theme", "milestone", "content"].map(key => <label key={key} className="block text-sm capitalize">{key}<textarea className="mt-1 min-h-16 w-full rounded-md border bg-background p-2" value={module[key]} onChange={e => setCourse({ ...course, modules: course.modules.map((m,i) => i === index ? { ...m, [key]: e.target.value } : m) })} /></label>)}</div>)}
        <p className="text-sm text-muted-foreground">Curriculum changes apply to new cohorts. Existing cohorts retain their saved lesson content.</p>
        {course.faq.map((faq,index) => <div key={index} className="space-y-2 rounded-lg border p-3"><label className="block text-sm">FAQ question<Input value={faq.question} onChange={e => setCourse({ ...course, faq: course.faq.map((f,i) => i === index ? { ...f, question: e.target.value } : f) })} /></label><label className="block text-sm">Answer<textarea className="mt-1 w-full rounded-md border bg-background p-2" value={faq.answer} onChange={e => setCourse({ ...course, faq: course.faq.map((f,i) => i === index ? { ...f, answer: e.target.value } : f) })} /></label></div>)}
        <Resources resources={course.resources} onChange={resources => setCourse({ ...course, resources })} />
        <Button onClick={() => save("course")}>Save course</Button>
      </fieldset></details>
      <section className="space-y-3"><h3 className="text-lg font-semibold">Weekly cohorts</h3>{data.cohorts.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"><div><p className="font-semibold">{item.title}</p><p className="text-sm text-muted-foreground">{item.status} · {item.confirmedCount || 0} confirmed · {item.onlineConfirmedCount || 0} online · {item.waitlistCount || 0} waiting</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setCohort(editableCohort(item))}>Edit cohort</Button><Button variant="outline" onClick={() => duplicate(item)}>Duplicate next week</Button><Button variant="outline" asChild><Link href={`/education/${item.slug}/participants`}>Participants</Link></Button></div></div>)}</section>
      {cohort && <fieldset disabled={busy} className="space-y-5 rounded-xl border p-5"><legend className="px-2 font-semibold">Cohort settings</legend><p className="text-sm">All entered times are local to the timezone below. Online attendance is unlimited; capacity applies to GOHQ only.</p><TimeZoneSelect label="Cohort timezone" value={cohort.timeZone} onChange={timeZone => setCohort({ ...cohort, timeZone })} />
        <div className="grid gap-4 md:grid-cols-2">{cohortText("id", "Cohort identifier / URL")}{cohortText("title", "Title")}{cohortText("instructorName", "Instructor name")}{cohortText("instructorUserId", "Instructor account UID (optional)")}{cohortText("capacity", "GOHQ capacity", "number")}{cohortText("language", "Language")}{cohortText("publicLocation", "Public venue")}{dateKeys.map(key => cohortText(key, key.replace(/([A-Z])/g, " $1"), "datetime-local"))}</div>
        {cohortText("invitedUserIds", "Internal team account UIDs (comma separated)")}{cohortText("jamUrl", "itch.io cohort jam URL", "url")}
        <label className="block text-sm">Enrollment / publication state<select className="ml-3 rounded-md border bg-background p-2" value={cohort.status} onChange={e => setCohort({ ...cohort, status: e.target.value })}>{["draft","enrollment_open","enrollment_closed","in_progress","completed","canceled","archived"].map(s => <option key={s}>{s}</option>)}</select></label>
        {cohort.sessions.map((session, index) => <div key={session.id} className="grid gap-3 rounded-lg border p-4 md:grid-cols-2"><h3 className="font-semibold md:col-span-2">Day {index+1}: {session.title}</h3>{["startsAt", "endsAt", "privateSessionUrl"].map(key => <label key={key} className="text-sm">{key === "privateSessionUrl" ? "Private live session URL" : key === "startsAt" ? "Starts (local)" : "Ends (local)"}<Input type={key === "privateSessionUrl" ? "url" : "datetime-local"} value={session[key]} onChange={e => setCohort({ ...cohort, sessions: cohort.sessions.map((s,i) => i === index ? { ...s, [key]: e.target.value } : s) })} /></label>)}</div>)}
        <Resources resources={cohort.resources} onChange={resources => setCohort({ ...cohort, resources })} />
        <Button onClick={() => save("cohort")}>Save cohort</Button><Button className="ml-3" variant="outline" onClick={() => setCohort(null)}>Cancel edit</Button>
      </fieldset>}
      <details className="rounded-lg border p-4"><summary className="cursor-pointer font-semibold">Price announcement waitlist ({data.interests.length})</summary><p className="mt-3 text-sm text-muted-foreground">These people requested price and availability announcements. They do not hold cohort seats.</p><ul className="mt-3 space-y-2 text-sm">{data.interests.map(person => <li key={person.userId}>{person.email || person.userId} · {person.joinedAt?.slice(0,10)}</li>)}</ul></details>
    </>}
  </CardContent></Card>;
}
