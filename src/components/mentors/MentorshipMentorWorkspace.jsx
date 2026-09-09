"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "@/firebase";
import { MENTOR_VERIFICATION_NOTICE } from "@/constants/membership";
import { TimeZoneSelect } from "@/components/forms/TimeZoneSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MentorApplicationStatusCard } from "@/components/mentors/MentorApplicationStatusCard";
import { MentorWorkspace } from "@/components/mentors/MentorWorkspace";

const MENTOR_CONDUCT_VERSION = "go-code-of-conduct-v1";
const MENTOR_TERMS_VERSION = "mentor-terms-v2";

const emptyForm = {
  displayName: "",
  professionalHeadline: "",
  biography: "",
  areasOfExpertise: "",
  supportedDisciplines: "",
  toolsAndTechnologies: "",
  experienceLevel: "",
  experienceYears: 0,
  evidenceLinks: "",
  languages: "English",
  timeZone: "Europe/Skopje",
  availableFormats: ["online"],
  generalAvailability: "",
  preferredMenteeLevels: ["beginner", "intermediate"],
  maximumActiveMentees: 1,
  mentorshipTopics: "",
  topicsNotOffered: "",
  accessibilityInformation: "",
  conflictOfInterestDeclaration: "",
  publicProfileConsent: false,
  conductAccepted: false,
  termsAccepted: false,
};

const csv = (value) => String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
const toggle = (values, value) => values.includes(value)
  ? values.filter((item) => item !== value)
  : [...values, value];

export function MentorshipMentorWorkspace() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const update = useCallback((key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  }, []);

  const call = useCallback(async (options = {}) => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Sign in to manage your mentor application.");
    return fetch("/api/mentorship/mentor-application", {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
  }, []);

  const load = useCallback(async () => {
    const response = await call();
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Mentor application is unavailable.");
    setData(result);
    if (result.profile) {
      const privateProfile = result.privateProfile || {};
      setForm((current) => ({
        ...current,
        ...result.profile,
        areasOfExpertise: (result.profile.areasOfExpertise || []).join(", "),
        supportedDisciplines: (result.profile.supportedDisciplines || []).join(", "),
        toolsAndTechnologies: (result.profile.toolsAndTechnologies || []).join(", "),
        languages: (result.profile.languages || []).join(", "),
        mentorshipTopics: (result.profile.mentorshipTopics || []).join(", "),
        topicsNotOffered: (privateProfile.topicsNotOffered || result.profile.topicsNotOffered || []).join(", "),
        accessibilityInformation: privateProfile.accessibilityInformation || "",
        conflictOfInterestDeclaration: privateProfile.conflictOfInterestDeclaration || "",
        evidenceLinks: (result.profile.evidenceLinks || []).map((item) => item.url).join(", "),
        conductAccepted: result.consent?.conductAccepted === true,
        termsAccepted: result.consent?.termsAccepted === true,
      }));
    }
  }, [call]);

  useEffect(() => {
    let active = true;
    const unsubscribe = auth.onAuthStateChanged(() => {
      if (!active) return;
      load().catch((error) => {
        if (active) setData({ error: error.message });
      });
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [load]);

  const save = async (action) => {
    setBusy(true);
    setMessage("");
    try {
      const response = await call({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          action,
          areasOfExpertise: csv(form.areasOfExpertise),
          supportedDisciplines: csv(form.supportedDisciplines),
          toolsAndTechnologies: csv(form.toolsAndTechnologies),
          languages: csv(form.languages),
          mentorshipTopics: csv(form.mentorshipTopics),
          topicsNotOffered: csv(form.topicsNotOffered),
          evidenceLinks: csv(form.evidenceLinks),
          conductVersion: form.conductAccepted ? MENTOR_CONDUCT_VERSION : "",
          termsVersion: form.termsAccepted ? MENTOR_TERMS_VERSION : "",
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Mentor application could not be saved.");
      setMessage(action === "submit"
        ? "Your mentor application was submitted. GO will review it and contact you about the interview."
        : "Draft saved privately.");
      await load();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <p className="py-8 text-center text-muted-foreground">Loading mentor pathway…</p>;
  if (data.error) {
    return (
      <Card>
        <CardContent className="space-y-3 p-8 text-center">
          <Badge>Mentor applications</Badge>
          <p role="status">{data.error}</p>
          <p className="text-sm text-muted-foreground">
            Sign in to complete an application. GO reviews every application and verifies mentors through an interview before they can publish mentor materials or connect with members.
          </p>
        </CardContent>
      </Card>
    );
  }

  const status = data.application?.status || "draft";
  const locked = ["approved", "paused", "rejected", "suspended", "archived"].includes(status);
  const intakeClosed = data.applicationsOpen === false && !data.application;

  if (status === "approved") {
    return (
      <div className="space-y-6">
        <MentorApplicationStatusCard application={data.application} />
        <MentorWorkspace />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MentorApplicationStatusCard application={data.application || { status: "draft", nextAction: "Complete the application and submit it when you are ready." }} />
      {intakeClosed ? (
        <Card>
          <CardContent className="space-y-2 p-8 text-center">
            <CardTitle>Mentor application intake is paused</CardTitle>
            <p className="text-sm text-muted-foreground">GO is not accepting new mentor applications right now. Your account remains ready for the next intake.</p>
          </CardContent>
        </Card>
      ) : (
      <Card className="border-primary/25">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Apply to become a GO mentor</CardTitle>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{MENTOR_VERIFICATION_NOTICE}</p>
            </div>
            <Badge variant="outline">{status.replaceAll("_", " ")}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === "submitted" || status === "needs_information" ? (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
              <p className="font-medium">What happens next</p>
              <p className="mt-1 text-muted-foreground">
                GO reviews your answers, may ask for more information, and schedules an interview. Verification is required before you produce courses, workshops, video bundles, or assets, or connect with members requesting mentorship.
              </p>
            </div>
          ) : null}

          <fieldset disabled={locked} className="contents">
          <section className="space-y-4">
            <SectionHeading title="About you" description="Help members understand your background and the perspective you bring." />
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="Display name" value={form.displayName} onChange={(value) => update("displayName", value)} required />
              <TextField label="Professional headline" help="A short sentence shown on your mentor profile." value={form.professionalHeadline} onChange={(value) => update("professionalHeadline", value)} required />
            </div>
            <TextAreaField label="About your experience" help="Share the experience, projects, and outcomes that are relevant to mentoring. Do not include private contact details." value={form.biography} onChange={(value) => update("biography", value)} required />
          </section>

          <section className="space-y-4">
            <SectionHeading title="What you can mentor on" description="Use commas to separate items. Specific examples make matching easier." />
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="Topics and areas of expertise" value={form.areasOfExpertise} onChange={(value) => update("areasOfExpertise", value)} help="For example: game design, production, narrative systems." required />
              <TextField label="Game disciplines you support" value={form.supportedDisciplines} onChange={(value) => update("supportedDisciplines", value)} help="For example: 2D art, programming, audio." required />
              <TextField label="Tools and technologies" value={form.toolsAndTechnologies} onChange={(value) => update("toolsAndTechnologies", value)} help="For example: Unity, Blender, Git, FMOD." required />
              <SelectField label="Experience level" value={form.experienceLevel} onChange={(value) => update("experienceLevel", value)} options={["", "emerging", "experienced", "senior", "lead", "specialist"]} required />
              <TextField label="Years of experience" type="number" min="0" max="80" value={form.experienceYears} onChange={(value) => update("experienceYears", value)} />
              <TextField label="Topics you do not offer (optional)" value={form.topicsNotOffered} onChange={(value) => update("topicsNotOffered", value)} help="Set expectations early; separate items with commas." />
            </div>
            <TextField label="Additional mentorship topics (optional)" value={form.mentorshipTopics} onChange={(value) => update("mentorshipTopics", value)} help="Add specific outcomes or project stages you enjoy supporting." />
          </section>

          <section className="space-y-4">
            <SectionHeading title="Availability and format" description="This helps GO suggest realistic matches across time zones and schedules." />
            <div className="grid gap-4 md:grid-cols-2">
              <TimeZoneSelect value={form.timeZone} onChange={(value) => update("timeZone", value)} required />
              <TextField label="Maximum active mentees" type="number" min="1" max="20" value={form.maximumActiveMentees} onChange={(value) => update("maximumActiveMentees", value)} help="Choose a number you can support well." />
            </div>
            <TextAreaField label="When are you generally available?" help="Describe days, time windows, and how far ahead you usually schedule." value={form.generalAvailability} onChange={(value) => update("generalAvailability", value)} required />
            <div className="grid gap-6 md:grid-cols-2">
              <ChoiceGroup label="Formats you can offer" options={["online", "gohq", "hybrid"]} values={form.availableFormats} onChange={(values) => update("availableFormats", values)} />
              <ChoiceGroup label="Mentee levels you prefer" options={["beginner", "intermediate", "advanced", "professional", "all_levels"]} values={form.preferredMenteeLevels} onChange={(values) => update("preferredMenteeLevels", values)} />
            </div>
            <TextField label="Languages you can mentor in" value={form.languages} onChange={(value) => update("languages", value)} help="Separate languages with commas." />
          </section>

          <section className="space-y-4">
            <SectionHeading title="Trust, safety, and access" description="These answers help GO run a respectful and well-supported mentor program." />
            <TextField label="Evidence links (optional)" value={form.evidenceLinks} onChange={(value) => update("evidenceLinks", value)} help="Add public HTTPS links to work, talks, teaching, or other relevant evidence. Separate links with commas." />
            <TextAreaField label="Conflict-of-interest declaration" help="Tell us about any relationships, services, or topics that could affect a mentoring match. Write “None” if nothing applies." value={form.conflictOfInterestDeclaration} onChange={(value) => update("conflictOfInterestDeclaration", value)} required />
            <TextAreaField label="Accessibility information (optional)" help="Share accommodations or communication preferences that would help you participate." value={form.accessibilityInformation} onChange={(value) => update("accessibilityInformation", value)} />
            <div className="space-y-3 rounded-lg border p-4">
              <CheckField checked={form.publicProfileConsent} onChange={(value) => update("publicProfileConsent", value)}>
                I consent to an approved public mentor profile using the fields above. Private staff notes and exact availability remain restricted.
              </CheckField>
              <CheckField checked={form.conductAccepted} onChange={(value) => update("conductAccepted", value)}>
                I agree to follow the GO Code of Conduct while participating in the mentor program.
              </CheckField>
              <CheckField checked={form.termsAccepted} onChange={(value) => update("termsAccepted", value)}>
                I understand that an interview and GO verification are required before I can produce courses, workshops, video bundles, or assets, or connect with community members requesting mentorship.
              </CheckField>
            </div>
          </section>
          </fieldset>

          <div className="flex flex-wrap items-center gap-3 border-t pt-5">
            <Button variant="outline" onClick={() => save("save")} disabled={busy || locked}>{busy ? "Saving…" : "Save private draft"}</Button>
            <Button onClick={() => save("submit")} disabled={busy || locked}>{busy ? "Submitting…" : "Submit application for review"}</Button>
            {locked ? <span className="text-sm text-muted-foreground">This application is currently {status.replaceAll("_", " ")} and cannot be edited.</span> : null}
          </div>
          {message ? <p role="status" className="rounded-md border bg-card p-3 text-sm">{message}</p> : null}
        </CardContent>
      </Card>
      )}
    </div>
  );
}

function SectionHeading({ title, description }) {
  return <div><h3 className="text-lg font-semibold">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>;
}

function TextField({ label, value, onChange, type = "text", help, required = false, min, max }) {
  return <label className="block space-y-1 text-sm"><span className="font-medium">{label}{required ? " *" : ""}</span><Input type={type} min={min} max={max} value={value ?? ""} onChange={(event) => onChange(event.target.value)} required={required} />{help ? <span className="block text-xs text-muted-foreground">{help}</span> : null}</label>;
}

function TextAreaField({ label, value, onChange, help, required = false }) {
  return <label className="block space-y-1 text-sm"><span className="font-medium">{label}{required ? " *" : ""}</span><textarea className="min-h-28 w-full rounded-md border bg-background px-3 py-2" value={value ?? ""} onChange={(event) => onChange(event.target.value)} required={required} />{help ? <span className="block text-xs text-muted-foreground">{help}</span> : null}</label>;
}

function SelectField({ label, value, onChange, options, required = false }) {
  return <label className="block space-y-1 text-sm"><span className="font-medium">{label}{required ? " *" : ""}</span><select className="w-full rounded-md border bg-background px-3 py-2" value={value || ""} onChange={(event) => onChange(event.target.value)} required={required}>{options.map((option) => <option key={option} value={option}>{option ? option.replaceAll("_", " ") : "Choose an option"}</option>)}</select></label>;
}

function ChoiceGroup({ label, options, values, onChange }) {
  return <fieldset><legend className="mb-2 text-sm font-medium">{label}</legend><div className="flex flex-wrap gap-3">{options.map((option) => <label key={option} className="flex items-center gap-2 text-sm capitalize"><input type="checkbox" checked={(values || []).includes(option)} onChange={() => onChange(toggle(values || [], option))} />{option.replaceAll("_", " ")}</label>)}</div></fieldset>;
}

function CheckField({ checked, onChange, children }) {
  return <label className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={checked === true} onChange={(event) => onChange(event.target.checked)} /><span>{children}</span></label>;
}
