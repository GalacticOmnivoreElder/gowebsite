"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { observer } from "mobx-react-lite";
import MobxStore from "@/mobx";
import { auth } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { TagInput } from "@/components/ui/tag-input";
import { LoadingSpinner } from "@/reusable-ui/LoadingSpinner";
import {
  ONBOARDING_STEPS,
  PRIMARY_ROLES,
  SKILL_LEVEL_OPTIONS,
  COMMON_TOOLS,
  HELP_TOPICS,
} from "@/constants/onboarding";

const STEP_TITLES = {
  identity: "Identity",
  discord: "Discord",
  "role-skills": "Role & Skills",
  portfolio: "Portfolio & Experience",
  goals: "Goals & Interests",
  help: "Help & Contribution",
  consent: "Consent & Visibility",
};

async function authedFetch(url, method, body) {
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function Chips({ options, value = [], onChange }) {
  const toggle = (opt) =>
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={`px-3 py-1 rounded-full border text-sm transition-colors ${
            value.includes(opt)
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-muted-foreground border-border hover:border-primary/50"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

const OnboardingContent = observer(() => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editCompletedOnboarding = searchParams.get("edit") === "1";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState({});
  const [error, setError] = useState("");
  const authReady = MobxStore.isReady;
  const currentUserId = MobxStore.user?.uid;

  const step = ONBOARDING_STEPS[stepIndex];

  useEffect(() => {
    if (!authReady) return;
    if (!currentUserId) {
      router.replace("/login?redirect=/onboarding");
      return;
    }
    (async () => {
      try {
        const data = await authedFetch("/api/onboarding", "GET");
        if (data.onboardingCompleted && !editCompletedOnboarding) {
          router.replace("/cv");
          return;
        }

        if (data.onboardingCompleted && data.session) {
          setDraft(data.session.draft_data_json || {});
          setStepIndex(0);
          return;
        }

        const started = await authedFetch("/api/onboarding", "POST");
        setDraft(started.draft_data_json || {});
        const idx = ONBOARDING_STEPS.indexOf(started.current_step);
        setStepIndex(idx >= 0 ? idx : 0);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [authReady, currentUserId, editCompletedOnboarding, router]);

  const stepData = draft[step] || {};
  const setField = (key, val) =>
    setDraft((d) => ({ ...d, [step]: { ...(d[step] || {}), [key]: val } }));

  const progress = useMemo(
    () => Math.round(((stepIndex + 1) / ONBOARDING_STEPS.length) * 100),
    [stepIndex]
  );

  const saveStep = async (nextStep) => {
    setSaving(true);
    setError("");
    try {
      await authedFetch("/api/onboarding", "PATCH", {
        step,
        data: stepData,
        nextStep,
      });
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const next = async () => {
    const nextStep = ONBOARDING_STEPS[stepIndex + 1];
    try {
      await saveStep(nextStep);
      setStepIndex((i) => i + 1);
    } catch {}
  };
  const back = () => setStepIndex((i) => Math.max(0, i - 1));

  const complete = async () => {
    setSaving(true);
    setError("");
    try {
      await saveStep(step);
      await authedFetch("/api/onboarding", "PUT");
      await MobxStore.checkAuth?.();
      router.push("/cv?welcome=1");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>
              Step {stepIndex + 1} of {ONBOARDING_STEPS.length}
            </span>
            <span>{STEP_TITLES[step]}</span>
          </div>
          <Progress value={progress} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading">{STEP_TITLES[step]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === "identity" && (
              <>
                <Field label="Full name *">
                  <Input value={stepData.full_name || ""} onChange={(e) => setField("full_name", e.target.value)} />
                </Field>
                <Field label="Display name / gamertag *">
                  <Input value={stepData.display_name || ""} onChange={(e) => setField("display_name", e.target.value)} />
                </Field>
                <Field label="Email *">
                  <Input type="email" value={stepData.email ?? MobxStore.user?.email ?? ""} onChange={(e) => setField("email", e.target.value)} />
                </Field>
                <Field label="Location (optional)">
                  <Input value={stepData.location || ""} onChange={(e) => setField("location", e.target.value)} />
                </Field>
                <Field label="Timezone *">
                  <Input placeholder="e.g. GMT+1 / CET" value={stepData.timezone || ""} onChange={(e) => setField("timezone", e.target.value)} />
                </Field>
              </>
            )}

            {step === "discord" && (
              <>
                <Field label="Discord username *">
                  <Input value={stepData.discord_username || ""} onChange={(e) => setField("discord_username", e.target.value)} />
                </Field>
                <CheckRow
                  checked={!!stepData.already_joined}
                  onChange={(v) => setField("already_joined", v)}
                  label="I have already joined the GO Discord"
                />
                <p className="text-sm text-muted-foreground">
                  Not joined yet? You&apos;ll get an invite and your role will be
                  assigned by an admin after onboarding.
                </p>
              </>
            )}

            {step === "role-skills" && (
              <>
                <Field label="Primary role *">
                  <select
                    className="w-full border border-border rounded-md h-10 px-3 bg-background"
                    value={stepData.primary_role || ""}
                    onChange={(e) => setField("primary_role", e.target.value)}
                  >
                    <option value="">Select…</option>
                    {stepData.primary_role &&
                      !PRIMARY_ROLES.includes(stepData.primary_role) && (
                        <option value={stepData.primary_role}>
                          {stepData.primary_role}
                        </option>
                      )}
                    {PRIMARY_ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Secondary roles (optional)">
                  <TagInput
                    suggestions={PRIMARY_ROLES}
                    value={stepData.secondary_roles || []}
                    onChange={(value) => setField("secondary_roles", value)}
                    placeholder="Add another role"
                    ariaLabel="Add a secondary role"
                  />
                </Field>
                <Field label="Skill level *">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {SKILL_LEVEL_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setField("skill_level", option.value)}
                        aria-pressed={stepData.skill_level === option.value}
                        className={`min-h-20 rounded-md border p-3 text-left transition-colors ${
                          stepData.skill_level === option.value
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background hover:border-primary/50"
                        }`}
                      >
                        <span className="block text-sm font-medium">{option.label}</span>
                        <span
                          className={`mt-1 block text-xs ${
                            stepData.skill_level === option.value
                              ? "text-primary-foreground/80"
                              : "text-muted-foreground"
                          }`}
                        >
                          {option.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Tools used (optional)">
                  <TagInput
                    suggestions={COMMON_TOOLS}
                    value={stepData.tools || []}
                    onChange={(value) => setField("tools", value)}
                    placeholder="Add a tool, engine, or language"
                    ariaLabel="Add a tool, engine, or language"
                  />
                </Field>
              </>
            )}

            {step === "portfolio" && (
              <>
                <Field label="Portfolio link (optional)">
                  <Input placeholder="https://…" value={stepData.portfolio || ""} onChange={(e) => setField("portfolio", e.target.value)} />
                </Field>
                <Field label="GitHub (optional)">
                  <Input placeholder="https://github.com/…" value={stepData.github || ""} onChange={(e) => setField("github", e.target.value)} />
                </Field>
                <Field label="Itch.io / Steam / ArtStation (optional)">
                  <Input placeholder="https://…" value={stepData.other_link || ""} onChange={(e) => setField("other_link", e.target.value)} />
                </Field>
                <p className="text-xs text-muted-foreground">
                  These are compiled into the &quot;links&quot; on your GO CV.
                </p>
              </>
            )}

            {step === "goals" && (
              <>
                <Field label="Current goal *">
                  <Textarea rows={3} placeholder="e.g. I want to build my first playable prototype" value={stepData.current_goal || ""} onChange={(e) => setField("current_goal", e.target.value)} />
                </Field>
                <CheckRow checked={!!stepData.looking_for_projects} onChange={(v) => setField("looking_for_projects", v)} label="Looking for projects" />
                <CheckRow checked={!!stepData.looking_for_paid_work} onChange={(v) => setField("looking_for_paid_work", v)} label="Looking for paid work" />
                <CheckRow checked={!!stepData.looking_for_team} onChange={(v) => setField("looking_for_team", v)} label="Looking for team members" />
                <CheckRow checked={!!stepData.looking_for_mentorship} onChange={(v) => setField("looking_for_mentorship", v)} label="Interested in mentorship" />
                <CheckRow checked={!!stepData.looking_for_jobs} onChange={(v) => setField("looking_for_jobs", v)} label="Interested in jobs/internships" />
              </>
            )}

            {step === "help" && (
              <>
                <Field label="What can you help others with?">
                  <Chips options={HELP_TOPICS} value={stepData.can_help_with || []} onChange={(v) => setField("can_help_with", v)} />
                </Field>
                <Field label="What do you need help with?">
                  <Chips options={HELP_TOPICS} value={stepData.needs_help_with || []} onChange={(v) => setField("needs_help_with", v)} />
                </Field>
                <CheckRow checked={!!stepData.is_blocked} onChange={(v) => setField("is_blocked", v)} label="I'm currently blocked on something" />
                {stepData.is_blocked && (
                  <Field label="Describe your blocker">
                    <Textarea rows={2} value={stepData.blocker_description || ""} onChange={(e) => setField("blocker_description", e.target.value)} />
                  </Field>
                )}
              </>
            )}

            {step === "consent" && (
              <>
                <CheckRow checked={!!stepData.consent_store_data} onChange={(v) => setField("consent_store_data", v)} label="I consent to GO storing my profile data *" />
                <CheckRow checked={!!stepData.consent_ai_generation} onChange={(v) => setField("consent_ai_generation", v)} label="I consent to AI-assisted profile/CV generation *" />
                <CheckRow checked={!!stepData.consent_share_with_admins} onChange={(v) => setField("consent_share_with_admins", v)} label="I consent to sharing my profile with GO admins *" />
                <div className="h-px bg-border my-2" />
                <CheckRow checked={stepData.visibility_project_creators ?? true} onChange={(v) => setField("visibility_project_creators", v)} label="Show my profile to project creators" />
                <CheckRow checked={stepData.visibility_job_matching ?? true} onChange={(v) => setField("visibility_job_matching", v)} label="Show my profile for job matching" />
                <CheckRow checked={stepData.visibility_public ?? false} onChange={(v) => setField("visibility_public", v)} label="Make my profile public" />
              </>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={back} disabled={stepIndex === 0 || saving}>
                Back
              </Button>
              {stepIndex < ONBOARDING_STEPS.length - 1 ? (
                <Button onClick={next} disabled={saving}>
                  {saving ? "Saving…" : "Continue"}
                </Button>
              ) : (
                <Button onClick={complete} disabled={saving}>
                  {saving ? "Finishing…" : "Finish & generate my GO CV"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function CheckRow({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <Checkbox checked={checked} onCheckedChange={onChange} />
      <span className="text-sm">{label}</span>
    </label>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
