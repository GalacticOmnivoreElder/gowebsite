"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { bootcampCourse } from "@/content/idea-to-playable";
import { formatDateTimeInTimeZone } from "@/lib/timezones";
import { CourseWorkspace } from "@/components/learning/CourseWorkspace";
import { courseFetch } from "@/lib/course-client";
function signIn(hash = "cohorts") {
  window.location.assign(`/login?redirect=${encodeURIComponent(`/education/${bootcampCourse.slug}#${hash}`)}`);
}
const activeStates = ["started", "pending_profile_completion", "pending_approval", "confirmed", "waitlisted", "attended", "completed", "did_not_attend"];

function EnrollmentQuestion({ question, value, onChange, prefix }) {
  const id = `${prefix}-${question.id}`;
  return <fieldset className="space-y-2 text-sm"><legend>{question.label}{question.required ? " *" : ""}</legend>
    {question.type === "checkboxes" ? question.options.map(option => <label key={option} className="flex gap-2"><input type="checkbox" checked={(value || []).includes(option)} onChange={e => onChange(e.target.checked ? [...(value || []), option] : (value || []).filter(v => v !== option))} />{option}</label>)
      : question.type === "multiple_choice" ? <select id={id} aria-label={question.label} className="w-full rounded-md border bg-background p-2" value={value || ""} onChange={e => onChange(e.target.value)}><option value="">Choose</option>{question.options.map(option => <option key={option}>{option}</option>)}</select>
      : ["long_text", "accessibility_request"].includes(question.type) ? <textarea id={id} aria-label={question.label} className="min-h-24 w-full rounded-md border bg-background p-2" value={value || ""} onChange={e => onChange(e.target.value)} />
      : <Input id={id} aria-label={question.label} type={question.type === "portfolio_link" ? "url" : "text"} value={value || ""} onChange={e => onChange(e.target.value)} />}
  </fieldset>;
}

export function CourseBootcamp({ selectedSlug }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [modes, setModes] = useState({});
  const [consent, setConsent] = useState(false);
  const [answers, setAnswers] = useState({});
  const load = useCallback(async () => {
    try { const next = await courseFetch(`/api/learning-courses/${bootcampCourse.slug}`); setData(next); setError(""); }
    catch (e) { setData(null); setError(e.message); }
  }, []);
  useEffect(() => auth.onAuthStateChanged(() => { setData(null); load(); }), [load]);
  const act = async (path, method, body, success) => {
    setBusy(true); setMessage("");
    try { await courseFetch(path, { method, ...(body ? { body: JSON.stringify(body) } : {}) }); await load(); setMessage(success); }
    catch (e) { setMessage(e.message); }
    finally { setBusy(false); }
  };
  const course = data?.course || bootcampCourse;
  const cohorts = data?.cohorts || [];
  const enrolled = cohorts.filter(c => ["confirmed", "attended", "did_not_attend", "completed"].includes(c.enrollment?.state) || c.canManage);
  return <main className="container mx-auto max-w-6xl space-y-12 px-4 py-12 md:py-16">
    <Link href="/education" className="text-sm text-muted-foreground hover:text-primary">← GO Education</Link>
    <section className="grid items-center gap-8 rounded-2xl border bg-card p-6 md:p-10 lg:grid-cols-[1fr_300px]">
      <div><div className="flex flex-wrap gap-2"><Badge>Live bootcamp</Badge><Badge variant="outline">Beginner / Early Game Developer</Badge></div>
        <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-6xl">{course.title}</h1><p className="mt-4 text-xl text-primary">{course.subtitle}</p><p className="mt-6 max-w-2xl text-2xl leading-relaxed">{course.promise}</p>
        <p className="mt-4 text-muted-foreground">5 days · 2 hours per day · 10 live mentorship hours · Monday–Friday</p>
        <div className="mt-7 flex flex-wrap gap-3"><Button asChild><a href="#cohorts">Enroll</a></Button><Button variant="outline" asChild><a href="#curriculum">View Curriculum</a></Button></div>
        {course.memberAccess && <p className="mt-4 text-sm">Galactic Omnivore Community Members attend for free.</p>}
      </div>
      {course.imageUrl ? <Image src={course.imageUrl} alt={course.title} width={600} height={600} unoptimized className="aspect-square rounded-xl object-cover" /> : <div className="space-y-5 rounded-xl border border-primary/30 bg-primary/5 p-6"><p className="text-sm uppercase tracking-widest text-muted-foreground">Your Friday outcome</p><p className="text-5xl font-bold text-primary">v0.1</p><p>A playable game.<br />A public URL.<br />A process you can repeat.</p></div>}
    </section>
    <section><h2 className="text-3xl font-bold">Your idea, playable</h2><p className="mt-4 leading-7 text-muted-foreground">{course.description}</p><p className="mt-4 leading-7">{course.outcomes}</p></section>
    <section><h2 className="text-2xl font-bold">Who this is for</h2><p className="mt-4 leading-7 text-muted-foreground">{course.audience}</p></section>
    <section><h2 className="text-2xl font-bold">What you will build</h2><p className="mt-4 leading-7 text-muted-foreground">Your own small game: a working core loop, a clear goal, feedback, a beginning and an ending, and a restart. Every student may make a different game. Everyone follows the same development process.</p></section>
    <section className="rounded-xl border p-6"><h2 className="text-2xl font-bold">How the course works</h2><p className="mt-5 text-xl font-semibold text-primary">{course.aiRule}</p><p className="mt-4 leading-8">{course.methodology}</p><p className="mt-4 text-muted-foreground">Ask AI to inspect the existing project and propose small, testable steps with dependencies, risks and acceptance criteria. Review the plan before implementation. If the scope changes materially, stop and approve the revised plan. Run and verify every change.</p></section>
    <section id="curriculum" className="scroll-mt-24"><h2 className="text-3xl font-bold">Five days. One repeatable process.</h2><div className="mt-6 space-y-3">{course.modules.map((module, index) => <details key={module.id} className="rounded-xl border bg-card p-5"><summary className="cursor-pointer text-lg font-semibold">Day {index + 1} — {module.title} <span className="ml-2 text-sm text-primary">{module.milestone}</span></summary><p className="mt-4 font-medium">{module.theme}</p><p className="mt-3 whitespace-pre-wrap leading-7 text-muted-foreground">{module.content}</p>{index === 1 && <details className="mt-5 rounded-lg border p-4"><summary className="cursor-pointer font-medium">QA ticket and AI debugging template</summary><p className="mt-4 whitespace-pre-wrap text-sm leading-6">{course.qaTemplate}</p></details>}</details>)}</div></section>
    <section><h2 className="text-2xl font-bold">Tools used</h2><p className="mt-4 text-xl">{course.tools}</p><p className="mt-3 text-muted-foreground">Godot + Codex + GitHub + itch.io is the primary workflow. Git keeps each verified step recoverable.</p></section>
    <section><h2 className="text-2xl font-bold">What you will know after the course</h2><p className="mt-4 leading-7 text-muted-foreground">How to turn an idea into a feasible scope, direct an AI coding agent, verify changes, report bugs, manage versions, publish a build, collect feedback and choose what to build next.</p></section>
    <Card><CardHeader><CardTitle>{course.badgeTitle}</CardTitle></CardHeader><CardContent className="space-y-4"><p>Demonstrate Scope, Build, Debug, Version and Ship. Your instructor checks independence and evidence, not visual polish.</p><p>Publish a playable v0.1 on itch.io and submit evidence of at least <strong>10 reviews/ratings</strong>. The minimum remains 10 even when a cohort has more than 100 people. Human verification can take place after the live week.</p><p className="font-semibold">The success criterion: you can continue developing independently.</p></CardContent></Card>
    <section id="cohorts" className="scroll-mt-24"><h2 className="text-3xl font-bold">Upcoming cohorts</h2><p className="mt-3 text-muted-foreground">First cohort: internal GO team and existing Community members. Repeat attendance is welcome.</p>
      {error && <div role="alert" className="mt-4 rounded-lg border p-4"><p>{error}</p><Button variant="outline" onClick={load} className="mt-3">Retry</Button></div>}
      {!data && !error && <p role="status" className="mt-4">Loading dates and available places…</p>}
      <div className="mt-6 grid gap-5 md:grid-cols-2">{cohorts.map(cohort => {
        const enrollment = cohort.enrollment, active = activeStates.includes(enrollment?.state), mode = modes[cohort.slug] || "in_person";
        const full = mode === "in_person" && cohort.placesRemaining === 0;
        return <Card key={cohort.id} className={selectedSlug === cohort.slug ? "border-primary" : ""}><CardHeader><CardTitle>{cohort.title}</CardTitle></CardHeader><CardContent className="space-y-4">
          <p>{formatDateTimeInTimeZone(cohort.startsAt, cohort.timeZone)} – {formatDateTimeInTimeZone(cohort.endsAt, cohort.timeZone)}</p><p className="text-sm text-muted-foreground">{cohort.timeZone} · {cohort.language} · {cohort.instructorName}</p><p>{cohort.location} · {cohort.placesRemaining} in-person places remaining · unlimited online</p>
          <details><summary className="cursor-pointer">Five session times</summary><ul className="mt-3 space-y-2 text-sm">{cohort.sessions.map(s => <li key={s.id}>{s.title}: {formatDateTimeInTimeZone(s.startsAt, cohort.timeZone)} – {new Intl.DateTimeFormat(undefined, { timeZone: cohort.timeZone, hour: "2-digit", minute: "2-digit" }).format(new Date(s.endsAt))}</li>)}</ul></details>
          {cohort.jamUrl && <a href={cohort.jamUrl} target="_blank" rel="noopener noreferrer" className="block text-primary underline">Open the cohort itch.io jam</a>}
          {enrollment && <p className="rounded-lg bg-muted p-3">{enrollment.state.replaceAll("_", " ")} · {enrollment.attendanceMode === "online" ? "Online" : "GOHQ"}</p>}
          {!active && <><label className="block text-sm">Attendance<select className="mt-2 w-full rounded-md border bg-background p-2" value={mode} onChange={e => setModes({ ...modes, [cohort.slug]: e.target.value })}><option value="in_person">GOHQ — in person</option><option value="online">Online</option></select></label>
            {(cohort.customQuestions || []).map(q => <EnrollmentQuestion key={q.id} question={q} prefix={cohort.id} value={answers[cohort.slug]?.[q.id]} onChange={value => setAnswers({ ...answers, [cohort.slug]: { ...answers[cohort.slug], [q.id]: value } })} />)}
            <Button className="w-full" disabled={busy || (data.authenticated && !cohort.eligibility.allowed)} onClick={() => data.authenticated ? act(`/api/learning-items/${cohort.slug}/enrollment`, "POST", { attendanceMode: mode, answers: answers[cohort.slug] || {} }, full ? "You joined the GOHQ seat waitlist. Online enrollment is also available." : "Your enrollment is confirmed.") : signIn()}>{!data.authenticated ? "Sign in to enroll" : full ? "Join GOHQ waitlist" : "Enroll free"}</Button>
            {!cohort.eligibility.allowed && data.authenticated && <p className="text-sm text-muted-foreground">{cohort.eligibility.reason === "community_membership_required" ? "This pilot is for existing members and invited internal team. Standalone access is coming soon." : "Enrollment is currently closed for this cohort."}</p>}</>}
          {enrollment?.waitlistOfferStatus === "offered" && <><p className="text-sm">Offer expires {formatDateTimeInTimeZone(enrollment.waitlistOfferExpiresAt, cohort.timeZone)}</p><Button disabled={busy} onClick={() => act(`/api/learning-items/${cohort.slug}/enrollment`, "POST", { action: "confirm_waitlist_offer" }, "Your GOHQ place is confirmed.")}>Accept offered place</Button></>}
          {active && !["completed", "did_not_attend"].includes(enrollment.state) && <Button variant="outline" disabled={busy} onClick={() => act(`/api/learning-items/${cohort.slug}/enrollment`, "DELETE", null, "Enrollment canceled. You may choose another attendance mode or cohort.")}>Cancel enrollment</Button>}
          {!active && (!data.authenticated || cohort.eligibility.reason === "community_membership_required") && <Button asChild variant="outline" className="w-full"><a href="#price-waitlist">Coming soon — get price announcements</a></Button>}
          {cohort.canManage && <Button asChild variant="outline"><Link href={`/education/${cohort.slug}/participants`}>Manage participants</Link></Button>}
        </CardContent></Card>;
      })}</div>{data && !cohorts.length && <p className="mt-4">No cohorts are published right now. Join the announcement waitlist below.</p>}
    </section>
    <p role="status" aria-live="polite" className="scroll-mt-24">{message}</p>
    {enrolled.map(c => <CourseWorkspace key={`${c.id}-${c.enrollment?.state}`} slug={c.slug} title={c.title} timeZone={c.timeZone} />)}
    <section id="price-waitlist" className="scroll-mt-24 rounded-xl border p-6"><h2 className="text-2xl font-bold">Standalone access is coming soon</h2><p className="mt-3 text-muted-foreground">No price has been announced. Join the price announcement waitlist for course availability and future video-bundle access. This does not reserve a cohort seat.</p>
      {data?.interested ? <><p className="mt-4">You’re on the price announcement waitlist.</p><Button className="mt-4" variant="outline" disabled={busy} onClick={() => act(`/api/learning-courses/${course.slug}/interest`, "DELETE", null, "You left the price announcement waitlist.")}>Leave waitlist</Button></> : <><label className="mt-5 flex items-start gap-3 text-sm"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />Notify me about this course’s price and availability.</label><Button className="mt-4" disabled={busy || !consent || !!error || !data} onClick={() => data?.authenticated ? act(`/api/learning-courses/${course.slug}/interest`, "POST", { consent: true }, "You joined the price announcement waitlist.") : signIn("price-waitlist")}>Coming soon — join price waitlist</Button></>}
    </section>
    <section><h2 className="text-2xl font-bold">A prototype, and the skills to keep going</h2><p className="mt-4 leading-7 text-muted-foreground">{course.expectations}</p></section>
    <section><h2 className="text-2xl font-bold">FAQ</h2><div className="mt-4 space-y-3">{course.faq.map(f => <details key={f.question} className="rounded-lg border p-4"><summary className="cursor-pointer font-medium">{f.question}</summary><p className="mt-3 leading-7 text-muted-foreground">{f.answer}</p></details>)}</div></section>
  </main>;
}
