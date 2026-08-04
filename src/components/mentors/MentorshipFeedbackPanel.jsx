"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const mentorQualities = ["clarity", "reliability", "practical_usefulness", "respect_and_safety", "quality_of_feedback", "support_for_objective"];
const studentQualities = ["preparation", "communication", "follow_through", "respect", "receptiveness", "reliability"];
const label = (value) => String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function MentorshipFeedbackPanel({ engagement, feedback, uid, request, onChanged, onMessage }) {
  const isStudent = engagement.studentId === uid;
  const own = feedback.find((item) => item.authorId === uid);
  const incoming = feedback.find((item) => item.recipientId === uid);
  const qualityOptions = isStudent ? mentorQualities : studentQualities;
  const [qualities, setQualities] = useState([]);
  const [privateWrittenFeedback, setPrivateWrittenFeedback] = useState("");
  const [publicSharingConsent, setPublicSharingConsent] = useState(own?.publicSharingConsent === true);
  const [publicReferenceText, setPublicReferenceText] = useState(own?.publicReferenceText || "");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const call = async (url, method, body, success) => {
    setBusy(true);
    onMessage("");
    try {
      const response = await request(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Feedback update could not be saved");
      onMessage(success);
      setDetails("");
      await onChanged();
    } catch (error) {
      onMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleQuality = (quality) => setQualities((current) => current.includes(quality) ? current.filter((item) => item !== quality) : [...current, quality]);
  const submit = () => call("/api/mentorship/feedback", "POST", { engagementId: engagement.id, qualities, privateWrittenFeedback, publicSharingConsent, publicReferenceText }, "Your mentorship feedback was submitted privately.");
  const update = (feedbackId, action, body, success) => call(`/api/mentorship/feedback/${feedbackId}`, "PATCH", { action, ...body }, success);

  return (
    <Card className="border-primary/25 bg-primary/[0.03]">
      <CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle className="text-lg">{engagement.discipline} feedback</CardTitle><Badge variant="outline">Direct review</Badge></div></CardHeader>
      <CardContent className="space-y-5">
        {!own && engagement.feedbackEligibility?.eligible && <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Choose demonstrated qualities and add optional private context. No stars, score, ranking, or automatic aggregate is created.</p>
          <fieldset disabled={busy}><legend className="mb-2 text-sm font-medium">Demonstrated qualities</legend><div className="grid gap-2 sm:grid-cols-2">{qualityOptions.map((quality) => <label key={quality} className="flex items-center gap-2 rounded-md border p-3 text-sm"><input type="checkbox" checked={qualities.includes(quality)} onChange={() => toggleQuality(quality)} />{label(quality)}</label>)}</div></fieldset>
          <label className="block text-sm font-medium">Private written feedback<textarea className="mt-2 min-h-28 w-full rounded-md border bg-background px-3 py-2 font-normal" value={privateWrittenFeedback} onChange={(event) => setPrivateWrittenFeedback(event.target.value)} maxLength={4000} placeholder={isStudent ? "Private context for GO moderation. This is not shown to the mentor." : "Private feedback for the student and GO moderation."} /></label>
          {isStudent && <div className="space-y-3 rounded-md border p-4"><label className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={publicSharingConsent} onChange={(event) => setPublicSharingConsent(event.target.checked)} /><span><strong>Allow a separate public mentor reference.</strong><br /><span className="text-muted-foreground">If approved, the mentor may choose to showcase this anonymous excerpt on their mentor profile and GameDev Passport. You can revoke consent later.</span></span></label>{publicSharingConsent && <textarea aria-label="Public mentor reference" className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm" value={publicReferenceText} onChange={(event) => setPublicReferenceText(event.target.value)} maxLength={1200} placeholder="Write the excerpt you consent to sharing publicly (minimum 20 characters)." />}</div>}
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">Submit by {new Date(engagement.feedbackEligibility.deadline).toLocaleDateString()}.</p><Button disabled={busy || qualities.length === 0 || (publicSharingConsent && publicReferenceText.trim().length < 20)} onClick={submit}>{busy ? "Submitting…" : "Submit feedback"}</Button></div>
        </div>}

        {!own && !engagement.feedbackEligibility?.eligible && <p className="text-sm text-muted-foreground">The feedback window is closed.</p>}

        {own && <div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium">Your submitted feedback</p><Badge variant="outline">{label(own.moderationStatus)}</Badge></div><p className="text-sm"><strong>Demonstrated qualities:</strong> {own.qualities.map(label).join(", ")}</p>{own.privateWrittenFeedback && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{own.privateWrittenFeedback}</p>}{isStudent && <div className="space-y-3 rounded-md border p-4"><label className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={publicSharingConsent} onChange={(event) => setPublicSharingConsent(event.target.checked)} /><span><strong>Consent to a public mentor reference</strong><br /><span className="text-muted-foreground">Only this separate excerpt-not your private feedback-can be moderated and selected by the mentor.</span></span></label>{publicSharingConsent && <textarea aria-label="Edit public mentor reference" className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm" value={publicReferenceText} onChange={(event) => setPublicReferenceText(event.target.value)} maxLength={1200} />}<Button disabled={busy || (publicSharingConsent && publicReferenceText.trim().length < 20)} variant="outline" onClick={() => update(own.id, "set_public_consent", { publicSharingConsent, publicReferenceText }, publicSharingConsent ? "The reference was sent for moderation." : "Public sharing consent was revoked.")}>{busy ? "Saving…" : "Save public sharing choice"}</Button></div>}</div>}

        {incoming && <div className="space-y-3 border-t pt-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium">Feedback received</p><Badge variant="outline">{label(incoming.moderationStatus)}</Badge></div><p className="text-sm"><strong>Demonstrated qualities:</strong> {incoming.qualities.map(label).join(", ")}</p>{incoming.privateWrittenFeedback && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{incoming.privateWrittenFeedback}</p>}{!isStudent && incoming.publicSharingConsent && incoming.publicReferenceText && <div className="space-y-3 rounded-md border border-primary/30 bg-primary/5 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-primary">Author-consented public reference</p><p className="whitespace-pre-wrap text-sm">{incoming.publicReferenceText}</p>{incoming.moderationStatus === "approved" ? <Button disabled={busy} variant={incoming.mentorShowcase ? "outline" : "default"} onClick={() => update(incoming.id, "set_showcase", { mentorShowcase: !incoming.mentorShowcase }, incoming.mentorShowcase ? "Reference removed from your public showcase." : "Reference added to your public showcase.")}>{incoming.mentorShowcase ? "Remove from showcase" : "Showcase on my profiles"}</Button> : <p className="text-xs text-muted-foreground">GO moderation must approve this excerpt before you can showcase it.</p>}</div>}
          <details className="rounded-md border p-3"><summary className="cursor-pointer text-sm font-medium">Report feedback or request a correction</summary><div className="mt-3 space-y-2"><Input aria-label="Feedback report or correction details" value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Explain the issue for private moderator review" /><div className="flex flex-wrap gap-2"><Button disabled={busy || !details.trim()} variant="outline" onClick={() => update(incoming.id, "request_correction", { details }, "Your correction request was sent to GO moderators.")}>Request correction / appeal</Button><Button disabled={busy || !details.trim()} variant="destructive" onClick={() => update(incoming.id, "report", { details }, "Your report was sent privately to GO moderators.")}>Report</Button></div></div></details></div>}
      </CardContent>
    </Card>
  );
}
