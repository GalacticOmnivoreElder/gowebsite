"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, Clock, ExternalLink, Loader2, MapPin, Users } from "lucide-react";
import { auth } from "@/firebase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trackEvent } from "@/lib/analytics/client";

function QuestionField({ question, value, onChange }) {
  if (question.type === "multiple_choice") {
    return <select className="w-full rounded-md border bg-background px-3 py-2" value={value || ""} onChange={(event) => onChange(event.target.value)}><option value="">Select</option>{question.options.map((option) => <option key={option}>{option}</option>)}</select>;
  }
  if (question.type === "checkboxes") {
    const selected = Array.isArray(value) ? value : [];
    return <div className="space-y-2">{question.options.map((option) => <label key={option} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selected.includes(option)} onChange={(event) => onChange(event.target.checked ? [...selected, option] : selected.filter((item) => item !== option))} />{option}</label>)}</div>;
  }
  if (["long_text", "accessibility_request"].includes(question.type)) {
    return <textarea className="min-h-28 w-full rounded-md border bg-background px-3 py-2" value={value || ""} onChange={(event) => onChange(event.target.value)} />;
  }
  return <Input type={question.type === "portfolio_link" ? "url" : "text"} value={value || ""} onChange={(event) => onChange(event.target.value)} />;
}

export function LearningDetail({ slug }) {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState({});
  const [message, setMessage] = useState("");
  const viewTracked = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    const headers = {};
    const user = auth.currentUser;
    if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;
    const response = await fetch(`/api/learning-items/${encodeURIComponent(slug)}`, { headers, cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    setItem(response.ok ? result : { error: result.error || "Learning item unavailable" });
    if (response.ok && !viewTracked.current) {
      viewTracked.current = true;
      const contentType = result.learningType || "learning_item";
      trackEvent("learning_content_viewed", {
        content_type: contentType,
        content_id: result.slug || slug,
      });
      const viewEvent =
        contentType === "course"
          ? "course_viewed"
          : contentType === "workshop"
          ? "workshop_viewed"
          : null;
      if (viewEvent) trackEvent(viewEvent, { content_id: result.slug || slug });
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(() => load().catch(() => setItem({ error: "Learning item unavailable" })));
    return unsubscribe;
  }, [load]);

  const request = async (method, body) => {
    const user = auth.currentUser;
    if (!user) {
      trackEvent("form_started", {
        form_id: "learning_enrollment",
        page_path: `/education/${slug}`,
      });
      window.location.assign(`/login?redirect=${encodeURIComponent(`/education/${slug}?enroll=1`)}`);
      return;
    }
    if (method === "POST") {
      trackEvent("form_started", {
        form_id: "learning_enrollment",
        page_path: `/education/${slug}`,
      });
    }
    setSubmitting(true);
    setMessage("");
    const token = await user.getIdToken();
    const response = await fetch(`/api/learning-items/${encodeURIComponent(slug)}/enrollment`, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Your learning enrollment has been updated." : result.error || "The enrollment could not be updated.");
    if (response.ok && method === "POST") {
      trackEvent("form_completed", {
        form_id: "learning_enrollment",
        page_path: `/education/${slug}`,
      });
    }
    setSubmitting(false);
    if (response.ok) await load();
  };

  if (loading) return <div className="container py-16 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></div>;
  if (!item || item.error) return <div className="container py-16"><Card><CardContent className="p-8 text-center">{item?.error || "Learning item unavailable"}</CardContent></Card></div>;
  const enrollment = item.enrollment;
  const active = enrollment && !["declined", "canceled_by_participant", "canceled_by_organizer"].includes(enrollment.state);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-12">
      <Button variant="ghost" asChild className="mb-6"><Link href="/education">Back to learning</Link></Button>
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="flex flex-wrap gap-2"><Badge className="capitalize">{item.learningType}</Badge><Badge variant="outline">{item.status.replaceAll("_", " ")}</Badge><Badge variant="secondary">{item.level}</Badge></div>
          <h1 className="mt-4 text-4xl font-bold">{item.title}</h1>
          <p className="mt-3 text-muted-foreground">Led by {item.instructorName}</p>
          <p className="mt-7 whitespace-pre-wrap leading-7 text-muted-foreground">{item.description}</p>
          {item.expectedOutcome && <section className="mt-8"><h2 className="text-xl font-semibold">Expected outcome</h2><p className="mt-2 text-muted-foreground">{item.expectedOutcome}</p></section>}
          {item.prerequisites && <section className="mt-8"><h2 className="text-xl font-semibold">Prerequisites</h2><p className="mt-2 text-muted-foreground">{item.prerequisites}</p></section>}
          {item.accessibilityInformation && <section className="mt-8"><h2 className="text-xl font-semibold">Accessibility</h2><p className="mt-2 text-muted-foreground">{item.accessibilityInformation}</p></section>}
        </div>
        <Card className="h-fit lg:sticky lg:top-24">
          <CardHeader><CardTitle>Enrollment</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {item.trainingAssigned && <Badge variant="secondary">Assigned mentor preparation</Badge>}
            {item.startsAt && <p className="flex gap-2 text-sm"><CalendarDays className="h-4 w-4 shrink-0 text-primary" />{new Date(item.startsAt).toLocaleString()} ({item.timeZone})</p>}
            {item.durationMinutes > 0 && <p className="flex gap-2 text-sm"><Clock className="h-4 w-4 shrink-0 text-primary" />{item.durationMinutes} minutes</p>}
            {item.location && <p className="flex gap-2 text-sm"><MapPin className="h-4 w-4 shrink-0 text-primary" />{item.location}</p>}
            {item.placesRemaining !== null && <p className="flex gap-2 text-sm"><Users className="h-4 w-4 shrink-0 text-primary" />{item.placesRemaining} places remaining</p>}
            {enrollment && <div className="rounded-md border bg-muted/20 p-3"><p className="text-sm font-medium capitalize">{enrollment.state.replaceAll("_", " ")}</p>{enrollment.waitlistOfferStatus === "offered" && <p className="mt-1 text-xs text-muted-foreground">Offer expires {new Date(enrollment.waitlistOfferExpiresAt).toLocaleString()}</p>}</div>}
            {!active && (item.customQuestions || []).map((question) => <div key={question.id}><label className="mb-2 block text-sm font-medium">{question.label}{question.required ? " *" : ""}</label><QuestionField question={question} value={answers[question.id]} onChange={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))} />{question.type === "accessibility_request" && <p className="mt-1 text-xs text-muted-foreground">Visible only to authorized organizers and the assigned instructor when needed.</p>}</div>)}
            {!active && <Button className="w-full" disabled={submitting || (!item.eligibility.allowed && item.isAuthenticated)} onClick={() => request("POST", { answers })}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{item.isAuthenticated ? "Enroll" : "Sign in to enroll"}</Button>}
            {enrollment?.waitlistOfferStatus === "offered" && <Button className="w-full" disabled={submitting} onClick={() => request("POST", { action: "confirm_waitlist_offer" })}>Confirm offered place</Button>}
            {active && enrollment.state !== "completed" && <Button variant="outline" className="w-full" disabled={submitting} onClick={() => request("DELETE")}>Cancel enrollment</Button>}
            {!item.eligibility.allowed && item.eligibility.reason === "community_membership_required" && <Button variant="outline" asChild className="w-full"><Link href="/membership">Review membership</Link></Button>}
            {item.canManage && <Button variant="secondary" asChild className="w-full"><Link href={`/education/${item.slug}/participants`}>Manage participants <ExternalLink className="ml-2 h-4 w-4" /></Link></Button>}
            {message && <p className="text-sm" role="status">{message}</p>}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
