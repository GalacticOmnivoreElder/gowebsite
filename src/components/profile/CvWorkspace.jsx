"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { observer } from "mobx-react-lite";
import MobxStore from "@/mobx";
import { auth } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/reusable-ui/LoadingSpinner";
import { CvDownloadButton } from "@/components/profile/CvDownloadButton";
import { ProfileSectionTabs } from "@/components/profile/ProfileSectionTabs";
import { toast } from "@/components/ui/use-toast";
import {
  normalizeAvailability,
  reconcileAvailabilityMissingInformation,
} from "@/lib/availability";
import {
  AlertCircle,
  CheckCircle,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";

const CV_DESTINATION = "/profile/cv";
const UNSAVED_CHANGES_MESSAGE =
  "You have unsaved GameDev Passport changes. Leave this section and discard them?";

async function authedFetch(url, method, body) {
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function createDraft(cv) {
  if (!cv) return null;
  return {
    ...cv,
    title: cv.title || "",
    sections: (cv.sections || []).map((section) => ({
      ...section,
      title: section.title || "",
      content_json: {
        ...(section.content_json || {}),
        ...(section.section_type === "summary" && !section.content_json?.text
          ? { text: cv.summary || "" }
          : {}),
      },
    })),
  };
}

function listToText(value) {
  return Array.isArray(value) ? value.filter(Boolean).join(", ") : "";
}

function textToList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function portfolioUrl(link) {
  return typeof link === "string" ? link : link?.url || "";
}

function sectionBody(section) {
  const c = section.content_json || {};
  switch (section.section_type) {
    case "summary":
      return <p className="whitespace-pre-wrap text-muted-foreground">{c.text}</p>;
    case "skills":
      return (
        <p className="text-muted-foreground">
          {[c.primary_role, c.skill_level, ...(c.secondary_roles || [])]
            .filter(Boolean)
            .join(" · ") || "No skills listed"}
        </p>
      );
    case "tools":
      return (
        <div className="flex flex-wrap gap-2">
          {(c.tools || []).length ? (
            c.tools.map((tool, index) => (
              <Badge key={`${tool}-${index}`} variant="secondary">
                {tool}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">No tools listed</span>
          )}
        </div>
      );
    case "projects":
      return (c.projects || []).length ? (
        <ul className="space-y-4">
          {c.projects.map((project, index) => (
            <li key={index} className="text-sm">
              <p className="font-medium text-foreground">
                {project.title || "Untitled project"}
                {project.role ? ` — ${project.role}` : ""}
              </p>
              {project.description ? (
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                  {project.description}
                </p>
              ) : null}
              {[project.status, listToText(project.tools)].filter(Boolean).length ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {[project.status, listToText(project.tools)].filter(Boolean).join(" · ")}
                </p>
              ) : null}
              {project.link ? (
                <a
                  className="mt-1 inline-block text-primary hover:underline"
                  href={project.link}
                  target="_blank"
                  rel="noreferrer"
                >
                  {project.link}
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <span className="text-sm text-muted-foreground">No projects yet</span>
      );
    case "portfolio":
      return (c.links || []).length ? (
        <ul className="space-y-1 text-sm">
          {c.links.map((link, index) => (
            <li key={index}>
              <a
                className="text-primary hover:underline"
                href={portfolioUrl(link)}
                target="_blank"
                rel="noreferrer"
              >
                {portfolioUrl(link)}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <span className="text-sm text-muted-foreground">No links</span>
      );
    case "availability": {
      const availability = normalizeAvailability({ availability: c });
      return (
        <p className="text-sm text-muted-foreground">
          {availability.hasExplicitSelection
            ? availability.labels.join(" · ")
            : "Availability has not been specified."}
        </p>
      );
    }
    case "interests": {
      const rows = [
        ["Looking for", c.looking_for],
        ["Can help with", c.can_help_with],
        ["Needs help with", c.needs_help_with],
      ].filter(([, value]) => value?.length);
      return rows.length ? (
        <div className="space-y-1 text-sm text-muted-foreground">
          {rows.map(([label, value]) => (
            <p key={label}>
              <span className="font-medium text-foreground">{label}:</span> {listToText(value)}
            </p>
          ))}
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">No interests listed</span>
      );
    }
    case "contact":
      return (
        <div className="space-y-1 text-sm text-muted-foreground">
          {c.display_name ? <p>{c.display_name}</p> : null}
          {c.email_preference ? <p>{c.email_preference}</p> : null}
          {c.discord_username ? <p>Discord: {c.discord_username}</p> : null}
          {[c.location, c.timezone].filter(Boolean).length ? (
            <p>{[c.location, c.timezone].filter(Boolean).join(" · ")}</p>
          ) : null}
        </div>
      );
    default:
      return c.text ? (
        <p className="whitespace-pre-wrap text-muted-foreground">{c.text}</p>
      ) : null;
  }
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  const inputId = useId();
  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <Input
        id={inputId}
        type={type}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function ListField({ label, value, onChange, placeholder }) {
  const inputId = useId();
  const focusedRef = useRef(false);
  const [draftText, setDraftText] = useState(() => listToText(value));

  useEffect(() => {
    if (!focusedRef.current) {
      setDraftText(listToText(value));
    }
  }, [value]);

  const updateDraft = (text) => {
    setDraftText(text);
    onChange(textToList(text));
  };

  const finishEditing = () => {
    focusedRef.current = false;
    const normalizedValue = textToList(draftText);
    setDraftText(listToText(normalizedValue));
    onChange(normalizedValue);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <Input
        id={inputId}
        value={draftText}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onChange={(event) => updateDraft(event.target.value)}
        onBlur={finishEditing}
        placeholder={placeholder || "Separate entries with commas"}
      />
    </div>
  );
}

function CvSectionEditor({ section, onChange }) {
  const content = section.content_json || {};
  const setContent = (patch) =>
    onChange({ ...section, content_json: { ...content, ...patch } });
  const projects = content.projects || [];
  const links = content.links || [];

  let fields = null;
  switch (section.section_type) {
    case "summary":
      fields = (
        <div className="space-y-2">
          <Label>Summary text</Label>
          <Textarea
            rows={5}
            value={content.text || ""}
            onChange={(event) => setContent({ text: event.target.value })}
          />
        </div>
      );
      break;
    case "skills":
      fields = (
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Primary role"
            value={content.primary_role}
            onChange={(primary_role) => setContent({ primary_role })}
          />
          <Field
            label="Skill level"
            value={content.skill_level}
            onChange={(skill_level) => setContent({ skill_level })}
          />
          <div className="md:col-span-2">
            <ListField
              label="Other roles"
              value={content.secondary_roles}
              onChange={(secondary_roles) => setContent({ secondary_roles })}
            />
          </div>
        </div>
      );
      break;
    case "tools":
      fields = (
        <ListField
          label="Tools and engines"
          value={content.tools}
          onChange={(tools) => setContent({ tools })}
        />
      );
      break;
    case "projects":
      fields = (
        <div className="space-y-4">
          {projects.map((project, index) => {
            const updateProject = (patch) =>
              setContent({
                projects: projects.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, ...patch } : item
                ),
              });
            return (
              <div key={index} className="space-y-4 rounded-lg border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">Project {index + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setContent({ projects: projects.filter((_, itemIndex) => itemIndex !== index) })
                    }
                  >
                    <Trash2 className="mr-1 h-4 w-4" /> Remove
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="Project title"
                    value={project.title}
                    onChange={(title) => updateProject({ title })}
                  />
                  <Field
                    label="Role"
                    value={project.role}
                    onChange={(role) => updateProject({ role })}
                  />
                  <Field
                    label="Status"
                    value={project.status}
                    onChange={(status) => updateProject({ status })}
                  />
                  <Field
                    label="Project link"
                    value={project.link}
                    onChange={(link) => updateProject({ link })}
                    type="url"
                  />
                  <div className="md:col-span-2">
                    <ListField
                      label="Tools"
                      value={project.tools}
                      onChange={(tools) => updateProject({ tools })}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Description</Label>
                    <Textarea
                      rows={4}
                      value={project.description || ""}
                      onChange={(event) => updateProject({ description: event.target.value })}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setContent({
                projects: [
                  ...projects,
                  { title: "", role: "", description: "", tools: [], link: "", status: "" },
                ],
              })
            }
          >
            <Plus className="mr-1 h-4 w-4" /> Add project
          </Button>
        </div>
      );
      break;
    case "portfolio":
      fields = (
        <div className="space-y-3">
          {links.map((link, index) => (
            <div key={index} className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <Field
                  label={`Link ${index + 1}`}
                  value={portfolioUrl(link)}
                  onChange={(value) =>
                    setContent({ links: links.map((item, itemIndex) => (itemIndex === index ? value : item)) })
                  }
                  type="url"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove portfolio link ${index + 1}`}
                onClick={() => setContent({ links: links.filter((_, itemIndex) => itemIndex !== index) })}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setContent({ links: [...links, ""] })}
          >
            <Plus className="mr-1 h-4 w-4" /> Add link
          </Button>
        </div>
      );
      break;
    case "availability": {
      const availability = normalizeAvailability({ availability: content });
      const setAvailabilityStatus = (availability_status) =>
        setContent({
          availability_answered: true,
          availability_status,
          ...(availability_status === "unavailable"
            ? {
                available_for_projects: false,
                available_for_paid_work: false,
                preferred_time_commitment: null,
              }
            : {}),
        });
      fields = (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Current availability</Label>
            <RadioGroup
              value={
                availability.hasExplicitSelection ? availability.status : ""
              }
              onValueChange={setAvailabilityStatus}
              className="gap-3"
              aria-label="Current availability"
            >
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3">
                <RadioGroupItem value="available" />
                <span className="text-sm">Available for opportunities</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3">
                <RadioGroupItem value="unavailable" />
                <span className="text-sm">Not currently available</span>
              </label>
            </RadioGroup>
          </div>
          {availability.status === "available" ? (
            <>
              <CheckRow
                checked={!!content.available_for_projects}
                onChange={(available_for_projects) =>
                  setContent({ available_for_projects })
                }
                label="Available for projects"
              />
              <CheckRow
                checked={!!content.available_for_paid_work}
                onChange={(available_for_paid_work) =>
                  setContent({ available_for_paid_work })
                }
                label="Open to paid work"
              />
              <Field
                label="Preferred time commitment"
                value={content.preferred_time_commitment}
                onChange={(preferred_time_commitment) =>
                  setContent({ preferred_time_commitment })
                }
                placeholder="e.g. 5–10 hours per week"
              />
            </>
          ) : null}
        </div>
      );
      break;
    }
    case "interests":
      fields = (
        <div className="space-y-4">
          <ListField
            label="Looking for"
            value={content.looking_for}
            onChange={(looking_for) => setContent({ looking_for })}
          />
          <ListField
            label="Can help with"
            value={content.can_help_with}
            onChange={(can_help_with) => setContent({ can_help_with })}
          />
          <ListField
            label="Needs help with"
            value={content.needs_help_with}
            onChange={(needs_help_with) => setContent({ needs_help_with })}
          />
        </div>
      );
      break;
    case "contact":
      fields = (
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Display name"
            value={content.display_name}
            onChange={(display_name) => setContent({ display_name })}
          />
          <Field
            label="Email"
            value={content.email_preference}
            onChange={(email_preference) => setContent({ email_preference })}
            type="email"
          />
          <Field
            label="Discord username"
            value={content.discord_username}
            onChange={(discord_username) => setContent({ discord_username })}
          />
          <Field
            label="Location"
            value={content.location}
            onChange={(location) => setContent({ location })}
          />
          <div className="md:col-span-2">
            <Field
              label="Timezone"
              value={content.timezone}
              onChange={(timezone) => setContent({ timezone })}
            />
          </div>
        </div>
      );
      break;
    default:
      fields = (
        <div className="space-y-2">
          <Label>Section text</Label>
          <Textarea
            rows={4}
            value={content.text || ""}
            onChange={(event) => setContent({ text: event.target.value })}
          />
        </div>
      );
  }

  return (
    <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
      <Field
        label="Section heading"
        value={section.title}
        onChange={(title) => onChange({ ...section, title })}
      />
      {fields}
    </div>
  );
}

function ProfileCvFrame({ children, onSectionChange }) {
  return (
    <div className="container max-w-[1500px] py-6 sm:py-8 lg:py-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Member command center
        </div>
        <Badge variant="outline" className="border-white/10 bg-card/60">
          Private account navigation
        </Badge>
      </div>
      <Tabs value="cv" onValueChange={onSectionChange} className="space-y-6">
        <ProfileSectionTabs />
        <TabsContent value="cv" className="mt-0">
          <div className="mx-auto max-w-5xl space-y-6">{children}</div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const CvWorkspace = observer(() => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cv, setCv] = useState(null);
  const [draftCv, setDraftCv] = useState(null);
  const [ownerProfile, setOwnerProfile] = useState(null);
  const [projects, setProjects] = useState({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const authReady = MobxStore.isReady;
  const currentUser = MobxStore.user;
  const currentUserId = currentUser?.uid;

  const syncCv = (nextCv) => {
    setCv(nextCv);
    setDraftCv(createDraft(nextCv));
  };

  const isDirty = useMemo(
    () =>
      Boolean(
        editing &&
          cv &&
          draftCv &&
          JSON.stringify(draftCv) !== JSON.stringify(createDraft(cv))
      ),
    [cv, draftCv, editing]
  );
  const activePassport = editing ? draftCv : cv;
  const activeAvailabilitySection = activePassport?.sections?.find(
    (section) => section.section_type === "availability"
  );
  const activeAvailability = normalizeAvailability({
    availability: activeAvailabilitySection?.content_json,
    profile: ownerProfile,
  });
  const passportMissingInformation =
    reconcileAvailabilityMissingInformation(
      cv?.missing_information,
      activeAvailability
    );

  useEffect(() => {
    if (!authReady) return;
    if (!currentUserId) {
      router.replace(`/login?redirect=${encodeURIComponent(CV_DESTINATION)}`);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await authedFetch("/api/me/cv", "GET");
        if (cancelled) return;

        setCv(data.cv || null);
        setDraftCv(createDraft(data.cv));

        if (data.cv) {
          const [profileResult, projectsResult] = await Promise.allSettled([
            authedFetch(`/api/user/${currentUserId}`, "GET"),
            authedFetch(
              `/api/user/${currentUserId}/projects?scope=management`,
              "GET"
            ),
          ]);

          if (cancelled) return;
          if (profileResult.status === "fulfilled") {
            setOwnerProfile(profileResult.value);
          }
          if (projectsResult.status === "fulfilled") {
            setProjects(projectsResult.value);
          }
        }
      } catch (caughtError) {
        if (cancelled) return;
        setError(caughtError.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, currentUserId, reloadKey, router]);

  useEffect(() => {
    if (!isDirty) return;
    let restoringHistory = false;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const handleHistoryNavigation = () => {
      if (restoringHistory) {
        restoringHistory = false;
        return;
      }
      if (!window.confirm(UNSAVED_CHANGES_MESSAGE)) {
        restoringHistory = true;
        window.history.forward();
      }
    };

    const handleDocumentNavigation = (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = event.target.closest?.("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }

      const destination = new URL(anchor.href, window.location.href);
      const current = new URL(window.location.href);
      if (
        destination.origin !== current.origin ||
        (destination.pathname === current.pathname &&
          destination.search === current.search &&
          destination.hash === current.hash)
      ) {
        return;
      }

      if (!window.confirm(UNSAVED_CHANGES_MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handleHistoryNavigation);
    document.addEventListener("click", handleDocumentNavigation, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handleHistoryNavigation);
      document.removeEventListener("click", handleDocumentNavigation, true);
    };
  }, [isDirty]);

  const run = async (label, fn) => {
    setBusy(label);
    setError("");
    try {
      const data = await fn();
      if (data?.cv) syncCv(data.cv);
      return true;
    } catch (caughtError) {
      setError(caughtError.message);
      return false;
    } finally {
      setBusy("");
    }
  };

  const cancelEditing = () => {
    setDraftCv(createDraft(cv));
    setEditing(false);
  };

  const saveChanges = async () => {
    const summarySection = draftCv.sections.find((section) => section.section_type === "summary");
    const skillsSection = draftCv.sections.find((section) => section.section_type === "skills");
    const saved = await run("save", () =>
      authedFetch("/api/me/cv", "PATCH", {
        primary_role: skillsSection?.content_json?.primary_role || null,
        skill_level: skillsSection?.content_json?.skill_level || null,
        title: draftCv.title,
        summary: summarySection?.content_json?.text || "",
        sections: draftCv.sections,
        visibility_job_matching: draftCv.visibility_job_matching,
        visibility_project_creators: draftCv.visibility_project_creators,
        visibility_public: draftCv.visibility_public,
      })
    );
    if (saved) {
      setEditing(false);
      toast({
        title: "GameDev Passport saved",
        description: "Your latest changes and visibility settings are secure.",
      });
    }
  };

  const publishCv = async () => {
    const published = await run("publish", () =>
      authedFetch("/api/me/cv", "PUT")
    );
    if (published) {
      toast({
        title: "GameDev Passport published",
        description:
          "Your GameDev Passport is ready to use for project applications.",
      });
    }
  };

  const generateCv = async () => {
    if (
      cv &&
      !window.confirm(
        "Refresh your GameDev Passport from your onboarding answers? This replaces the current Passport content."
      )
    ) {
      return;
    }

    const generated = await run("generate", () =>
      authedFetch("/api/me/cv", "POST")
    );
    if (generated) {
      setEditing(false);
      toast({
        title: cv
          ? "GameDev Passport refreshed"
          : "GameDev Passport generated",
        description: "Review the generated details before publishing.",
      });
    }
  };

  const navigateTo = (destination) => {
    if (isDirty && !window.confirm(UNSAVED_CHANGES_MESSAGE)) return;
    router.push(destination);
  };

  const handleSectionChange = (value) => {
    const destinations = {
      profile: "/profile",
      cv: CV_DESTINATION,
      projects: "/profile?tab=projects",
      applications: "/profile?tab=applications",
      downloads: "/profile?tab=downloads",
      billing: "/billing",
      settings: "/profile?tab=settings",
    };
    const destination = destinations[value];
    if (destination && destination !== CV_DESTINATION) {
      navigateTo(destination);
    }
  };

  const exportProfile = cv
    ? {
        ...(ownerProfile || {}),
        username:
          ownerProfile?.username ||
          currentUser?.username ||
          currentUser?.displayName ||
          currentUser?.email ||
          "GO Member",
        cv,
      }
    : null;

  if (loading) {
    return (
      <ProfileCvFrame onSectionChange={handleSectionChange}>
        <Card>
          <CardContent
            className="flex min-h-[360px] flex-col items-center justify-center gap-3"
            aria-live="polite"
          >
            <LoadingSpinner />
            <p className="text-sm text-muted-foreground">
              Loading your GameDev Passport…
            </p>
          </CardContent>
        </Card>
      </ProfileCvFrame>
    );
  }
  if (error && !cv) {
    return (
      <ProfileCvFrame onSectionChange={handleSectionChange}>
        <Card className="border-destructive/40">
          <CardContent className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
            <AlertCircle className="mb-4 h-10 w-10 text-destructive" />
            <h1 className="font-heading text-2xl font-bold">
              Your GameDev Passport could not be loaded
            </h1>
            <p className="mt-2 max-w-lg text-muted-foreground">{error}</p>
            <Button
              className="mt-6"
              onClick={() => setReloadKey((value) => value + 1)}
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      </ProfileCvFrame>
    );
  }
  if (!cv || !draftCv) {
    return (
      <ProfileCvFrame onSectionChange={handleSectionChange}>
        <Card className="overflow-hidden border-primary/30">
          <CardContent className="relative flex min-h-[360px] flex-col items-center justify-center px-6 py-12 text-center">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
            <Sparkles className="mb-4 h-10 w-10 text-primary" />
            <h1 className="font-heading text-3xl font-bold">
              Build your GameDev Passport
            </h1>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Your GameDev Passport is a reusable game-development resume/CV
              that you can publish, download, and use when applying to
              projects.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button onClick={generateCv} disabled={!!busy}>
                <Sparkles className="mr-2 h-4 w-4" />
                {busy === "generate"
                  ? "Generating…"
                  : "Generate my GameDev Passport"}
              </Button>
              <Button asChild variant="outline">
                <Link href="/onboarding">Complete onboarding</Link>
              </Button>
            </div>
            {error ? (
              <p className="mt-4 text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </ProfileCvFrame>
    );
  }

  return (
    <ProfileCvFrame onSectionChange={handleSectionChange}>
        <section
          className="mission-hub-shell relative overflow-hidden rounded-2xl border p-5 sm:p-7"
          aria-labelledby="cv-page-title"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div className="max-w-2xl">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
                Career transmission
              </p>
              <h1
                id="cv-page-title"
                className="mt-2 font-heading text-3xl font-bold sm:text-4xl"
              >
                GameDev Passport
              </h1>
              <p className="mt-2 text-muted-foreground">
                Your GameDev Passport is a reusable game-development resume/CV
                that you can publish, download, and use when applying to
                projects.
              </p>
            <div className="mt-4 flex flex-wrap items-center gap-2" aria-live="polite">
              <Badge variant={cv.status === "active" ? "default" : "secondary"}>
                {cv.status === "active" ? "Published" : "Draft"}
              </Badge>
              {isDirty ? (
                <Badge
                  variant="outline"
                  className="border-amber-500/40 text-amber-400"
                >
                  Unsaved changes
                </Badge>
              ) : null}
              {cv.status !== "active" && (
                <span className="text-sm text-muted-foreground">
                  Publish to use it when applying to projects.
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:max-w-md lg:justify-end">
            <CvDownloadButton
              profile={exportProfile}
              currentUser={currentUser}
              projects={projects}
              variant="outline"
            />
            <Button
              variant="outline"
              disabled={!!busy || editing}
              onClick={generateCv}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${
                  busy === "generate"
                    ? "animate-spin motion-reduce:animate-none"
                    : ""
                }`}
              />
              {busy === "generate"
                ? "Refreshing…"
                : "Refresh from onboarding"}
            </Button>
            <Button asChild variant="outline" disabled={!!busy}>
              <Link href="/onboarding?edit=1">Update onboarding</Link>
            </Button>
            {cv.status !== "active" && (
              <Button
                disabled={!!busy || editing}
                onClick={publishCv}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {busy === "publish" ? "Publishing…" : "Approve & Publish"}
              </Button>
            )}
          </div>
          </div>
        </section>

        {cv.suggested_improvements?.length ||
        passportMissingInformation.length ? (
          <Card className="border-amber-500/30">
            <CardContent className="pt-6">
              <h2 className="mb-2 font-medium">
                Suggestions to strengthen your GameDev Passport
              </h2>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {cv.suggested_improvements?.map((suggestion, index) => (
                  <li key={`suggestion-${index}`}>{suggestion}</li>
                ))}
                {passportMissingInformation.map((item, index) => (
                  <li key={`missing-${index}`}>{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <CardTitle className="min-w-0 flex-1 font-heading">
              {editing ? (
                <Field
                  label="Passport title"
                  value={draftCv.title}
                  onChange={(title) => setDraftCv({ ...draftCv, title })}
                />
              ) : (
                cv.title
              )}
            </CardTitle>
            {editing ? (
              <Button variant="ghost" size="sm" onClick={cancelEditing} disabled={!!busy}>
                Cancel
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="mr-1 h-4 w-4" /> Edit all
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {editing ? (
              <>
                {(draftCv.sections || []).map((section, index) => (
                  <CvSectionEditor
                    key={`${section.section_type}-${index}`}
                    section={section}
                    onChange={(nextSection) =>
                      setDraftCv({
                        ...draftCv,
                        sections: draftCv.sections.map((item, itemIndex) =>
                          itemIndex === index ? nextSection : item
                        ),
                      })
                    }
                  />
                ))}
                <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                  <h2 className="font-medium">Visibility</h2>
                  <CheckRow
                    checked={!!draftCv.visibility_project_creators}
                    onChange={(visibility_project_creators) =>
                      setDraftCv({ ...draftCv, visibility_project_creators })
                    }
                    label="Visible to project creators"
                  />
                  <CheckRow
                    checked={!!draftCv.visibility_public}
                    onChange={(visibility_public) => setDraftCv({ ...draftCv, visibility_public })}
                    label="Public profile"
                  />
                  <CheckRow
                    checked={!!draftCv.visibility_job_matching}
                    onChange={(visibility_job_matching) =>
                      setDraftCv({ ...draftCv, visibility_job_matching })
                    }
                    label="Visible for job matching"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button disabled={!!busy} onClick={saveChanges}>
                    {busy === "save" ? "Saving…" : "Save all changes"}
                  </Button>
                  <Button variant="outline" disabled={!!busy} onClick={cancelEditing}>
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              (cv.sections || []).map((section, index) => (
                <section key={`${section.section_type}-${index}`}>
                  <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {section.title}
                  </h2>
                  {sectionBody(section)}
                </section>
              ))
            )}
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="text-center">
          <Button variant="outline" onClick={() => navigateTo("/projects")}>
            Use this GameDev Passport to apply to projects
          </Button>
        </div>
    </ProfileCvFrame>
  );
});

function CheckRow({ checked, onChange, label }) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <Checkbox checked={checked} onCheckedChange={onChange} />
      <span className="text-sm">{label}</span>
    </label>
  );
}

export default CvWorkspace;
