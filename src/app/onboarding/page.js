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
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { LoadingSpinner } from "@/reusable-ui/LoadingSpinner";
import {
  SkillSelector,
  SkillTagInput,
} from "@/components/profile/SkillSelector";
import {
  ONBOARDING_STEPS,
  SKILL_LEVELS,
  COMMON_TOOLS,
  PORTFOLIO_LINK_TYPES,
  PAST_PROJECT_STATUSES,
  DISCORD_INVITE_URL,
} from "@/constants/onboarding";
import {
  countWords,
  MAX_PROFILE_ABOUT_WORDS,
  MAX_PROFILE_BIO_LENGTH,
} from "@/utils/validateProfile";

const STEP_TITLES = {
  identity: "Your profile",
  discord: "Community access",
  "role-skills": "Roles and skills",
  portfolio: "Portfolio and experience",
  goals: "Goals and availability",
  help: "Support and contribution",
  consent: "Consent and visibility",
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
          router.replace("/profile/cv");
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
  const legacyAvailabilitySelected =
    stepData.looking_for_projects ||
    stepData.looking_for_paid_work ||
    String(stepData.preferred_time_commitment || "").trim();
  const availabilityStatus =
    stepData.availability_status ||
    (legacyAvailabilitySelected ? "available" : "");
  const setAvailabilityStatus = (status) =>
    setDraft((currentDraft) => ({
      ...currentDraft,
      [step]: {
        ...(currentDraft[step] || {}),
        availability_status: status,
        ...(status === "unavailable"
          ? {
              looking_for_projects: false,
              looking_for_paid_work: false,
              preferred_time_commitment: "",
            }
          : {}),
      },
    }));

  const progress = useMemo(
    () => Math.round(((stepIndex + 1) / ONBOARDING_STEPS.length) * 100),
    [stepIndex]
  );

  const saveStep = async (nextStep) => {
    if (
      step === "identity" &&
      countWords(stepData.about_me) > MAX_PROFILE_ABOUT_WORDS
    ) {
      const validationError = new Error(
        `About you must be ${MAX_PROFILE_ABOUT_WORDS.toLocaleString()} words or less.`
      );
      setError(validationError.message);
      throw validationError;
    }

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
      router.push("/profile/cv?welcome=1");
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
                <Field label={`Short bio (optional, ${MAX_PROFILE_BIO_LENGTH} characters)`}>
                  <Textarea
                    rows={2}
                    maxLength={MAX_PROFILE_BIO_LENGTH}
                    value={stepData.bio || ""}
                    onChange={(e) => setField("bio", e.target.value)}
                  />
                </Field>
                <Field label="About you (optional)">
                  <Textarea
                    rows={6}
                    value={stepData.about_me || ""}
                    onChange={(e) => setField("about_me", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {countWords(stepData.about_me).toLocaleString()}/
                    {MAX_PROFILE_ABOUT_WORDS.toLocaleString()} words
                  </p>
                </Field>
                <Field label="Email *">
                  <Input type="email" value={stepData.email ?? MobxStore.user?.email ?? ""} onChange={(e) => setField("email", e.target.value)} />
                </Field>
                <Field label="Location (optional)">
                  <Input value={stepData.location || ""} onChange={(e) => setField("location", e.target.value)} />
                </Field>
                <Field label="Time zone *">
                  <Input placeholder="e.g. GMT+1 / CET" value={stepData.timezone || ""} onChange={(e) => setField("timezone", e.target.value)} />
                </Field>
              </>
            )}

            {step === "discord" && (
              <>
                <Field label="Discord username (optional)">
                  <Input value={stepData.discord_username || ""} onChange={(e) => setField("discord_username", e.target.value)} />
                </Field>
                <CheckRow
                  checked={!!stepData.already_joined}
                  onChange={(v) => setField("already_joined", v)}
                  label="I have already joined the GO Discord"
                />
                {!stepData.already_joined && (
                  <p className="text-sm text-muted-foreground">
                    Not joined yet?{" "}
                    <a
                      className="font-medium text-primary underline underline-offset-4"
                      href={DISCORD_INVITE_URL}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Join the GO Discord
                    </a>
                    . Your joined status is saved separately from your username.
                  </p>
                )}
              </>
            )}

            {step === "role-skills" && (
              <>
                <SkillTagInput
                  label="Primary role *"
                  value={stepData.primary_role || ""}
                  onChange={(value) => setField("primary_role", value)}
                />
                <Field label="Secondary roles (optional)">
                  <SkillSelector
                    value={stepData.secondary_roles || []}
                    onChange={(value) => setField("secondary_roles", value)}
                    suggestionsLabel="Suggested roles"
                    suggestionsHelp="Suggestions come from the community skill directory."
                    customLabel="Add another role"
                    customPlaceholder="e.g. Technical Artist"
                    addLabel="Add role"
                    emptyText="No secondary roles selected."
                    maxItems={8}
                    submissionLabel="complete onboarding"
                  />
                </Field>
                <Field label="Skills and experience (optional)">
                  <SkillSelector
                    value={
                      Array.isArray(stepData.skills)
                        ? stepData.skills
                        : [
                            stepData.primary_role,
                            ...(stepData.secondary_roles || []),
                            ...(stepData.tools || []),
                          ].filter(Boolean)
                    }
                    onChange={(skills) => setField("skills", skills)}
                    submissionLabel="complete onboarding"
                  />
                </Field>
                <Field label="Skill level *">
                  <div className="flex flex-wrap gap-2">
                    {SKILL_LEVELS.map((level) => (
                      <button key={level.id} type="button" onClick={() => setField("skill_level", level.id)}
                        title={level.description}
                        className={`px-3 py-1 rounded-full border text-sm ${stepData.skill_level === level.id ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
                        {level.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {SKILL_LEVELS.find((level) => level.id === stepData.skill_level)?.description ||
                      "Choose the description that best matches how you work today."}
                  </p>
                </Field>
                <Field label="Tools used (optional)">
                  <SkillSelector
                    value={stepData.tools || []}
                    onChange={(value) => setField("tools", value)}
                    suggestions={COMMON_TOOLS}
                    loadCatalog={false}
                    suggestionsLabel="Common tools and engines"
                    suggestionsHelp="Choose a suggestion or add the exact tool name you use."
                    customLabel="Add another tool or engine"
                    customPlaceholder="e.g. Visual Studio Code, RPG Maker MZ"
                    addLabel="Add tool"
                    emptyText="No tools or engines selected."
                    submissionLabel="complete onboarding"
                  />
                </Field>
              </>
            )}

            {step === "portfolio" && (
              <>
                <PortfolioLinksEditor
                  value={stepData.links || legacyPortfolioLinks(stepData)}
                  onChange={(value) => setField("links", value)}
                />
                <PastProjectsEditor
                  value={stepData.past_projects || []}
                  onChange={(value) => setField("past_projects", value)}
                />
              </>
            )}

            {step === "goals" && (
              <>
                <Field label="Current goal *">
                  <Textarea rows={3} placeholder="e.g. I want to build my first playable prototype" value={stepData.current_goal || ""} onChange={(e) => setField("current_goal", e.target.value)} />
                </Field>
                <Field label="Availability">
                  <RadioGroup
                    value={availabilityStatus}
                    onValueChange={setAvailabilityStatus}
                    className="gap-3"
                    aria-label="Current availability"
                  >
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
                      <RadioGroupItem value="available" className="mt-0.5" />
                      <span>
                        <span className="block text-sm font-medium">
                          Available for opportunities
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          Choose the types of work you are open to below.
                        </span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
                      <RadioGroupItem value="unavailable" className="mt-0.5" />
                      <span>
                        <span className="block text-sm font-medium">
                          Not currently available
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          Your profile will clearly show that you are not open
                          to opportunities right now.
                        </span>
                      </span>
                    </label>
                  </RadioGroup>
                  <p className="text-xs text-muted-foreground">
                    Leave this unanswered if you are not ready to share your
                    availability yet.
                  </p>
                </Field>
                {availabilityStatus === "available" ? (
                  <div className="space-y-3 rounded-lg border border-border p-4">
                    <CheckRow checked={!!stepData.looking_for_projects} onChange={(v) => setField("looking_for_projects", v)} label="Available for projects" />
                    <CheckRow checked={!!stepData.looking_for_paid_work} onChange={(v) => setField("looking_for_paid_work", v)} label="Open to paid work" />
                    <Field label="Preferred time commitment (optional)">
                      <Input
                        placeholder="e.g. 5–10 hours per week"
                        value={stepData.preferred_time_commitment || ""}
                        onChange={(e) =>
                          setField("preferred_time_commitment", e.target.value)
                        }
                      />
                    </Field>
                  </div>
                ) : null}
                <CheckRow checked={!!stepData.looking_for_team} onChange={(v) => setField("looking_for_team", v)} label="Looking for team members" />
                <CheckRow checked={!!stepData.looking_for_mentorship} onChange={(v) => setField("looking_for_mentorship", v)} label="Interested in mentorship" />
                <CheckRow checked={!!stepData.looking_for_jobs} onChange={(v) => setField("looking_for_jobs", v)} label="Interested in jobs/internships" />
              </>
            )}

            {step === "help" && (
              <>
                <Field label="What can you help others with?">
                  <SkillSelector
                    value={stepData.can_help_with || []}
                    onChange={(value) => setField("can_help_with", value)}
                    catalogMode="all"
                    allowCustom={false}
                    suggestionsLabel="Complete community skill directory"
                    suggestionsHelp="Choose any active skill you can help other members with."
                    emptyText="No contribution skills selected."
                    submissionLabel="complete onboarding"
                  />
                </Field>
                <Field label="What do you need help with?">
                  <SkillSelector
                    value={stepData.needs_help_with || []}
                    onChange={(value) => setField("needs_help_with", value)}
                    catalogMode="all"
                    allowCustom={false}
                    suggestionsLabel="Complete community skill directory"
                    suggestionsHelp="Choose any active skill where community support would help."
                    emptyText="No support skills selected."
                    submissionLabel="complete onboarding"
                  />
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
                  {saving ? "Saving..." : "Continue"}
                </Button>
              ) : (
                <Button onClick={complete} disabled={saving}>
                  {saving ? "Finishing..." : "Finish and generate my GameDev Passport"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

function legacyPortfolioLinks(data = {}) {
  return [
    data.portfolio ? { type: "portfolio", url: data.portfolio } : null,
    data.github ? { type: "github", url: data.github } : null,
    data.other_link ? { type: "other", url: data.other_link } : null,
  ].filter(Boolean);
}

function PortfolioLinksEditor({ value = [], onChange }) {
  const links = Array.isArray(value) ? value : [];
  const updateLink = (index, patch) =>
    onChange(
      links.map((link, linkIndex) =>
        linkIndex === index ? { ...link, ...patch } : link
      )
    );

  return (
    <div className="space-y-3">
      <div>
        <Label>Portfolio links (optional)</Label>
        <p className="text-xs text-muted-foreground">
          Add the public links you want included in your profile and GameDev
          Passport.
        </p>
      </div>
      {links.map((link, index) => (
        <div
          key={`${link.type || "link"}-${index}`}
          className="grid gap-2 rounded-md border p-3 sm:grid-cols-[9rem_1fr_auto]"
        >
          <Label className="sr-only" htmlFor={`portfolio-type-${index}`}>
            Link type
          </Label>
          <select
            id={`portfolio-type-${index}`}
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            value={link.type || "portfolio"}
            onChange={(event) =>
              updateLink(index, { type: event.target.value })
            }
          >
            {PORTFOLIO_LINK_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
          <Label className="sr-only" htmlFor={`portfolio-url-${index}`}>
            Portfolio URL
          </Label>
          <Input
            id={`portfolio-url-${index}`}
            type="url"
            placeholder="https://…"
            value={link.url || ""}
            onChange={(event) => updateLink(index, { url: event.target.value })}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              onChange(links.filter((_, linkIndex) => linkIndex !== index))
            }
            aria-label={`Remove portfolio link ${index + 1}`}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => onChange([...links, { type: "portfolio", url: "" }])}
      >
        Add portfolio link
      </Button>
    </div>
  );
}

function PastProjectsEditor({ value = [], onChange }) {
  const projects = Array.isArray(value) ? value : [];
  const updateProject = (index, patch) =>
    onChange(
      projects.map((project, projectIndex) =>
        projectIndex === index ? { ...project, ...patch } : project
      )
    );

  return (
    <div className="space-y-3">
      <div>
        <Label>Projects (optional)</Label>
        <p className="text-xs text-muted-foreground">
          Add prototypes, jam games, releases, or portfolio projects once here.
        </p>
      </div>
      {projects.map((project, index) => (
        <div key={index} className="space-y-3 rounded-md border p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Project title">
              <Input
                value={project.title || ""}
                onChange={(event) =>
                  updateProject(index, { title: event.target.value })
                }
              />
            </Field>
            <Field label="Your role">
              <Input
                value={project.role || ""}
                onChange={(event) =>
                  updateProject(index, { role: event.target.value })
                }
              />
            </Field>
            <Field label="Status">
              <select
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                value={project.status || ""}
                onChange={(event) =>
                  updateProject(index, { status: event.target.value })
                }
              >
                <option value="">Select status</option>
                {PAST_PROJECT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Project link">
              <Input
                type="url"
                placeholder="https://…"
                value={project.link || ""}
                onChange={(event) =>
                  updateProject(index, { link: event.target.value })
                }
              />
            </Field>
          </div>
          <Field label="Description">
            <Textarea
              rows={3}
              value={project.description || ""}
              onChange={(event) =>
                updateProject(index, { description: event.target.value })
              }
            />
          </Field>
          <Field label="Tools used">
            <SkillSelector
              value={project.tools || []}
              onChange={(tools) => updateProject(index, { tools })}
              suggestions={COMMON_TOOLS}
              loadCatalog={false}
              suggestionsLabel="Common project tools"
              suggestionsHelp="Select or add the exact tools used on this project."
              customLabel="Add a project tool"
              customPlaceholder="e.g. Unity 6, GitHub Actions"
              addLabel="Add tool"
              emptyText="No tools selected for this project."
              maxItems={12}
              submissionLabel="complete onboarding"
            />
          </Field>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              onChange(
                projects.filter((_, projectIndex) => projectIndex !== index)
              )
            }
          >
            Remove project
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          onChange([
            ...projects,
            {
              title: "",
              role: "",
              status: "",
              link: "",
              description: "",
              tools: [],
            },
          ])
        }
      >
        Add project
      </Button>
    </div>
  );
}

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
