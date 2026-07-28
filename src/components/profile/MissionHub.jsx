"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Briefcase,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Clock3,
  Code2,
  Compass,
  Contact,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  Gauge,
  GraduationCap,
  Layers3,
  MapPin,
  Orbit,
  Pencil,
  Radio,
  Rocket,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  User,
  Users,
  Wrench,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CvDownloadButton } from "@/components/profile/CvDownloadButton";
import { buildMissionProfile } from "@/lib/profile-mission";

function initials(name) {
  return String(name || "GO")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function readableStatus(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function paragraphPreview(value, maxLength = 900) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) return text;
  const slice = text.slice(0, maxLength);
  const lastSpace = slice.lastIndexOf(" ");
  return `${slice.slice(0, lastSpace > maxLength * 0.75 ? lastSpace : maxLength)}…`;
}

function ProfileText({ value }) {
  const paragraphs = String(value || "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <div className="space-y-4 text-[15px] leading-7 text-muted-foreground">
      {paragraphs.map((paragraph, index) => (
        <p key={`${paragraph.slice(0, 32)}-${index}`} className="whitespace-pre-wrap">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

function MissionPanel({ title, eyebrow, icon: Icon, children, className = "" }) {
  return (
    <Card
      className={`mission-panel overflow-hidden border-white/10 bg-card/80 shadow-[0_20px_70px_-48px_rgba(202,34,128,0.8)] backdrop-blur ${className}`}
    >
      <CardHeader className="space-y-2 pb-4">
        {eyebrow ? (
          <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
            <Radio className="h-3 w-3" aria-hidden="true" />
            {eyebrow}
          </div>
        ) : null}
        <CardTitle className="flex items-center gap-2 text-xl">
          {Icon ? <Icon className="h-5 w-5 text-primary" aria-hidden="true" /> : null}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function StatCard({ label, value, hint, icon: Icon }) {
  return (
    <div className="mission-stat rounded-xl border border-white/10 bg-black/25 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function TagCluster({ items, emptyText }) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Badge
          key={item}
          variant="secondary"
          className="border border-white/5 bg-white/[0.06] px-3 py-1 text-foreground"
        >
          {item}
        </Badge>
      ))}
    </div>
  );
}

function LongProfile({ value }) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = String(value || "").length > 900;
  const visibleText = expanded ? value : paragraphPreview(value);

  return (
    <MissionPanel
      title="Full Profile"
      eyebrow="Captain's log"
      icon={BookOpen}
    >
      <div className="max-w-4xl">
        <ProfileText value={visibleText} />
        {hasMore ? (
          <Button
            type="button"
            variant="ghost"
            className="mt-4 px-0 text-primary hover:bg-transparent hover:text-primary/80"
            onClick={() => setExpanded((current) => !current)}
            aria-expanded={expanded}
          >
            {expanded ? (
              <ChevronUp className="mr-2 h-4 w-4" />
            ) : (
              <ChevronDown className="mr-2 h-4 w-4" />
            )}
            {expanded ? "Show condensed profile" : "Read full profile"}
          </Button>
        ) : null}
      </div>
    </MissionPanel>
  );
}

function ExperienceList({ items }) {
  if (!items.length) {
    return (
      <div className="rounded-lg border border-dashed border-white/10 bg-black/10 p-6 text-sm text-muted-foreground">
        No experience entries have been added to this GO CV yet.
      </div>
    );
  }

  return (
    <ol className="relative space-y-7 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-gradient-to-b before:from-primary before:to-transparent">
      {items.map((item, index) => (
        <li
          key={`${item.title || "experience"}-${index}`}
          className="relative pl-8"
        >
          <span className="absolute left-0 top-1.5 h-[15px] w-[15px] rounded-full border-4 border-card bg-primary shadow-[0_0_18px_rgba(202,34,128,0.7)]" />
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-foreground">
                {item.title || "Untitled project"}
              </h3>
              {item.role ? (
                <p className="mt-1 text-sm font-medium text-primary">
                  {item.role}
                </p>
              ) : null}
            </div>
            {item.status ? (
              <Badge variant="outline" className="border-white/10">
                {readableStatus(item.status)}
              </Badge>
            ) : null}
          </div>
          {item.description ? (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
              {item.description}
            </p>
          ) : null}
          {item.tools?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {item.tools.map((tool) => (
                <span
                  key={tool}
                  className="rounded-full bg-white/[0.05] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                >
                  {tool}
                </span>
              ))}
            </div>
          ) : null}
          {item.link ? (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              View project
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function EducationList({ items }) {
  if (!items.length) return null;

  return (
    <MissionPanel title="Education" eyebrow="Training records" icon={GraduationCap}>
      <div className="space-y-5">
        {items.map((item, index) => {
          if (typeof item === "string") {
            return (
              <p key={`${item}-${index}`} className="text-sm text-muted-foreground">
                {item}
              </p>
            );
          }
          const title =
            item.qualification ||
            item.degree ||
            item.title ||
            item.program ||
            "Education";
          const meta = [
            item.institution || item.school,
            item.location,
            item.date || item.year,
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <div key={`${title}-${index}`} className="border-l-2 border-primary/50 pl-4">
              <h3 className="font-semibold">{title}</h3>
              {meta ? (
                <p className="mt-1 text-sm text-muted-foreground">{meta}</p>
              ) : null}
              {item.description ? (
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </MissionPanel>
  );
}

function SelectedProjects({ projects, loading }) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-60 rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  if (!projects.length) {
    return (
      <div className="rounded-lg border border-dashed border-white/10 bg-black/10 p-8 text-center">
        <Briefcase className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          No public Galactic Omnivore projects are connected to this profile yet.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {projects.slice(0, 3).map((project) => (
        <Link
          key={project.id || `${project.title}-${project.role}`}
          href={`/project/${project.id}`}
          className="group overflow-hidden rounded-xl border border-white/10 bg-black/20 transition duration-300 hover:-translate-y-1 hover:border-primary/50 motion-reduce:transform-none motion-reduce:transition-none"
        >
          <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary/20 via-black to-violet-900/20">
            {project.thumbnail ? (
              <Image
                src={project.thumbnail}
                alt={`${project.title} project thumbnail`}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover opacity-85 transition duration-500 group-hover:scale-105 group-hover:opacity-100 motion-reduce:transform-none motion-reduce:transition-none"
              />
            ) : (
              <Orbit
                className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 text-primary/60"
                aria-hidden="true"
              />
            )}
            <Badge className="absolute left-3 top-3 bg-black/70 text-white backdrop-blur">
              {project.role}
            </Badge>
          </div>
          <div className="p-4">
            <h3 className="line-clamp-1 font-semibold group-hover:text-primary">
              {project.title}
            </h3>
            <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">
              {project.description || project.goal || "Explore this GO project."}
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              Open project
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function ContactGrid({ socialLinks, portfolioLinks, contact }) {
  const locationDetails = [contact.location, contact.timezone].filter(Boolean);
  const hasAnything =
    socialLinks.length || portfolioLinks.length || locationDetails.length;

  if (!hasAnything) {
    return (
      <p className="text-sm text-muted-foreground">
        No public contact or portfolio channels have been enabled.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {locationDetails.map((value, index) => (
        <div
          key={value}
          className="flex min-w-0 items-center gap-3 rounded-lg border border-white/10 bg-black/20 p-3"
        >
          {index === 0 ? (
            <MapPin className="h-4 w-4 shrink-0 text-primary" />
          ) : (
            <Clock3 className="h-4 w-4 shrink-0 text-primary" />
          )}
          <span className="truncate text-sm text-muted-foreground">{value}</span>
        </div>
      ))}
      {socialLinks.map((link) =>
        link.href ? (
          <a
            key={`${link.platform}-${link.value}`}
            href={link.href}
            target={link.platform === "email" ? undefined : "_blank"}
            rel={link.platform === "email" ? undefined : "noopener noreferrer"}
            className="flex min-w-0 items-center gap-3 rounded-lg border border-white/10 bg-black/20 p-3 transition hover:border-primary/50 hover:bg-primary/5 motion-reduce:transition-none"
          >
            <Contact className="h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {link.label}
              </span>
              <span className="block truncate text-sm">{link.value}</span>
            </span>
            <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </a>
        ) : (
          <div
            key={`${link.platform}-${link.value}`}
            className="flex min-w-0 items-center gap-3 rounded-lg border border-white/10 bg-black/20 p-3"
          >
            <Contact className="h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {link.label}
              </span>
              <span className="block truncate text-sm">{link.value}</span>
            </span>
          </div>
        )
      )}
      {portfolioLinks.map((link, index) => (
        <a
          key={`${link.value}-${index}`}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-w-0 items-center gap-3 rounded-lg border border-white/10 bg-black/20 p-3 transition hover:border-primary/50 hover:bg-primary/5 motion-reduce:transition-none"
        >
          <Layers3 className="h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Portfolio
            </span>
            <span className="block truncate text-sm">{link.value}</span>
          </span>
          <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </a>
      ))}
    </div>
  );
}

const commandLinks = [
  {
    href: "/profile?tab=projects",
    label: "Projects",
    description: "Owned and joined missions",
    icon: Briefcase,
  },
  {
    href: "/profile?tab=applications",
    label: "Applications",
    description: "Review active submissions",
    icon: FileText,
  },
  {
    href: "/profile?tab=downloads",
    label: "Downloads",
    description: "Access member resources",
    icon: Download,
  },
  {
    href: "/billing",
    label: "Membership",
    description: "Subscription and billing",
    icon: CreditCard,
  },
  {
    href: "/profile?tab=settings",
    label: "Settings",
    description: "Account controls",
    icon: Settings,
  },
];

export default function MissionHub({
  profile,
  currentUser,
  projects,
  projectsLoading = false,
  isOwner = false,
  hasActiveSubscription = false,
  onEdit,
  membershipContent,
}) {
  const model = useMemo(
    () => buildMissionProfile({ profile, currentUser, projects, isOwner }),
    [profile, currentUser, projects, isOwner]
  );
  const cvStatus =
    model.cvStatus === "active"
      ? "CV published"
      : model.cvStatus === "draft"
      ? "CV draft"
      : "CV not generated";
  const profileVisibility =
    profile?.profilePrivacy === "private" ? "Private profile" : "Public profile";
  const missing = [
    ...model.missingInformation,
    !model.longBio ? "full profile" : null,
    !model.skills.length ? "skills" : null,
  ].filter(Boolean);

  return (
    <section
      className="mission-hub-shell relative isolate overflow-hidden rounded-2xl border border-white/10 px-4 py-5 sm:px-6 sm:py-7 lg:px-8"
      aria-labelledby="mission-hub-title"
    >
      <div className="pointer-events-none absolute -right-28 -top-32 h-80 w-80 rounded-full border border-primary/20" aria-hidden="true">
        <div className="mission-orbit absolute inset-8 rounded-full border border-dashed border-primary/20">
          <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_16px_rgba(202,34,128,0.9)]" />
        </div>
      </div>

      <div className="relative space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">
              <CircleDot className="h-3 w-3" aria-hidden="true" />
              Galactic Omnivore command deck
            </div>
            <h1 id="mission-hub-title" className="text-3xl font-bold tracking-tight sm:text-4xl">
              {isOwner ? "Your Mission Hub" : "Mission Profile"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              A professional flight record through the universe of game development.
            </p>
          </div>
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/10 px-3 py-1 text-primary"
          >
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
            {isOwner ? profileVisibility : "Public transmission"}
          </Badge>
        </div>

        <Card className="mission-hero overflow-hidden border-primary/25 bg-black/35 shadow-[0_30px_100px_-55px_rgba(202,34,128,1)] backdrop-blur">
          <CardContent className="relative p-5 sm:p-7 lg:p-8">
            <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div className="flex min-w-0 flex-col gap-5 sm:flex-row">
                <div className="relative shrink-0 self-start">
                  <Avatar className="h-24 w-24 border-2 border-primary/50 shadow-[0_0_35px_-8px_rgba(202,34,128,0.85)] sm:h-28 sm:w-28">
                    <AvatarImage src={model.avatar} alt="" />
                    <AvatarFallback className="bg-primary/15 text-2xl font-semibold text-primary">
                      {initials(model.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-background bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]"
                    aria-label="Profile online"
                  />
                </div>

                <div className="min-w-0">
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Player identity
                  </div>
                  <h2 className="mt-1 break-words text-3xl font-bold tracking-tight sm:text-4xl">
                    {model.name}
                  </h2>
                  <p className="mt-2 text-lg font-medium text-primary">
                    {model.headline}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {model.contact.location ? (
                      <Badge variant="secondary" className="bg-white/[0.07]">
                        <MapPin className="mr-1 h-3 w-3" />
                        {model.contact.location}
                      </Badge>
                    ) : null}
                    {model.availability.slice(0, 2).map((item) => (
                      <Badge
                        key={item}
                        variant="secondary"
                        className="bg-emerald-500/10 text-emerald-300"
                      >
                        <Sparkles className="mr-1 h-3 w-3" />
                        {item}
                      </Badge>
                    ))}
                    {isOwner ? (
                      <Badge
                        variant="secondary"
                        className={
                          hasActiveSubscription
                            ? "bg-amber-500/10 text-amber-300"
                            : "bg-white/[0.07]"
                        }
                      >
                        <BadgeCheck className="mr-1 h-3 w-3" />
                        {hasActiveSubscription ? "Premium member" : "GO member"}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-5 max-w-3xl text-[15px] leading-7 text-muted-foreground">
                    {model.intro || model.summary}
                  </p>
                  {model.socialLinks.length ? (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {model.socialLinks.slice(0, 4).map((link) =>
                        link.href ? (
                          <Button key={link.platform} asChild variant="outline" size="sm">
                            <a
                              href={link.href}
                              target={link.platform === "email" ? undefined : "_blank"}
                              rel={
                                link.platform === "email"
                                  ? undefined
                                  : "noopener noreferrer"
                              }
                            >
                              {link.label}
                              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                            </a>
                          </Button>
                        ) : null
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              {isOwner ? (
                <div className="flex w-full flex-col gap-2 sm:w-auto lg:min-w-[188px]">
                  <Button onClick={onEdit}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Profile
                  </Button>
                  <CvDownloadButton
                    profile={profile}
                    currentUser={currentUser}
                    projects={projects}
                    variant="outline"
                  />
                  <Button variant="outline" asChild>
                    <Link href="/cv">
                      <FileText className="mr-2 h-4 w-4" />
                      Manage GO CV
                    </Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link href="/onboarding?edit=1">
                      <Rocket className="mr-2 h-4 w-4" />
                      Update Onboarding
                    </Link>
                  </Button>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="GO CV"
            value={cvStatus}
            hint={model.skillLevel ? `${readableStatus(model.skillLevel)} level` : "Professional record"}
            icon={FileText}
          />
          <StatCard
            label="Expertise"
            value={`${model.skills.length} skills`}
            hint={`${model.tools.length} tools and technologies`}
            icon={Code2}
          />
          <StatCard
            label="Missions"
            value={`${model.platformProjects.length} projects`}
            hint={model.joinedAt ? `Member since ${model.joinedAt}` : "Community flight record"}
            icon={Orbit}
          />
          <StatCard
            label="Readiness"
            value={`${model.completion}%`}
            hint={model.completion >= 80 ? "Profile ready to share" : "Profile setup in progress"}
            icon={Gauge}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.8fr)]">
          <MissionPanel
            title="Professional Summary"
            eyebrow="Mission overview"
            icon={Compass}
          >
            <p className="max-w-4xl whitespace-pre-wrap text-[15px] leading-7 text-muted-foreground">
              {model.summary}
            </p>
          </MissionPanel>

          <MissionPanel title="Mission Readiness" eyebrow="Systems check" icon={Target}>
            <div className="flex items-end justify-between gap-3">
              <span className="text-3xl font-semibold">{model.completion}%</span>
              <span className="text-xs text-muted-foreground">
                {model.completion >= 80 ? "Ready to transmit" : "Setup in progress"}
              </span>
            </div>
            <div
              className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]"
              role="progressbar"
              aria-label="Profile completion"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={model.completion}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-fuchsia-400 shadow-[0_0_14px_rgba(202,34,128,0.65)] transition-[width] duration-500 motion-reduce:transition-none"
                style={{ width: `${model.completion}%` }}
              />
            </div>
            <div className="mt-5 border-t border-white/10 pt-4">
              {missing.length ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Suggested next coordinates
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {missing.slice(0, 3).map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <CircleDot className="h-3 w-3 text-primary" />
                        Add {item}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="flex items-center gap-2 text-sm text-emerald-300">
                  <BadgeCheck className="h-4 w-4" />
                  Core profile systems are online.
                </div>
              )}
            </div>
          </MissionPanel>
        </div>

        {model.longBio ? <LongProfile value={model.longBio} /> : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <MissionPanel title="Skills & Expertise" eyebrow="Core capabilities" icon={Sparkles}>
            <TagCluster
              items={model.skills}
              emptyText="Add skills to help collaborators understand your strengths."
            />
          </MissionPanel>
          <MissionPanel title="Tools & Technologies" eyebrow="Systems loadout" icon={Wrench}>
            <TagCluster
              items={model.tools}
              emptyText="No tools or engines are listed in this GO CV yet."
            />
          </MissionPanel>
        </div>

        <MissionPanel
          title="Experience"
          eyebrow="Flight record"
          icon={Briefcase}
        >
          <ExperienceList items={model.cvProjects} />
        </MissionPanel>

        <MissionPanel
          title="Selected Projects"
          eyebrow="Active missions"
          icon={Layers3}
        >
          <SelectedProjects
            projects={model.platformProjects}
            loading={projectsLoading}
          />
          {isOwner && model.platformProjects.length > 3 ? (
            <Button asChild variant="ghost" className="mt-4 px-0 text-primary">
              <Link href="/profile?tab=projects">
                View all projects
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : null}
        </MissionPanel>

        <EducationList items={model.education} />

        <div className="grid gap-6 lg:grid-cols-2">
          <MissionPanel title="Availability" eyebrow="Open channels" icon={CalendarDays}>
            <div className="space-y-5">
              <TagCluster
                items={model.availability}
                emptyText="Availability has not been specified."
              />
              {model.lookingFor.length ? (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Looking for</h3>
                  <TagCluster items={model.lookingFor} />
                </div>
              ) : null}
              {model.canHelpWith.length ? (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Can help with</h3>
                  <TagCluster items={model.canHelpWith} />
                </div>
              ) : null}
            </div>
          </MissionPanel>

          <MissionPanel
            title="Social & Contact"
            eyebrow="Communication array"
            icon={Contact}
          >
            <ContactGrid
              socialLinks={model.socialLinks}
              portfolioLinks={model.portfolioLinks}
              contact={model.contact}
            />
          </MissionPanel>
        </div>

        {isOwner ? (
          <MissionPanel title="Command Deck" eyebrow="Private controls" icon={Users}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {commandLinks.map(({ href, label, description, icon: Icon }) => (
                <Link
                  key={label}
                  href={href}
                  className="group rounded-xl border border-white/10 bg-black/20 p-4 transition hover:border-primary/50 hover:bg-primary/5 motion-reduce:transition-none"
                >
                  <Icon className="h-5 w-5 text-primary" />
                  <div className="mt-3 font-semibold group-hover:text-primary">{label}</div>
                  <div className="mt-1 text-xs leading-5 text-muted-foreground">
                    {description}
                  </div>
                </Link>
              ))}
            </div>
          </MissionPanel>
        ) : null}

        {isOwner && membershipContent ? (
          <MissionPanel
            title="Membership & Billing"
            eyebrow="Account systems"
            icon={ShieldCheck}
          >
            {membershipContent}
          </MissionPanel>
        ) : null}

        {!model.cv && isOwner ? (
          <Card className="border-primary/25 bg-primary/[0.06]">
            <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <User className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
                <div>
                  <h2 className="font-semibold">Your GO CV is waiting for launch</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Complete onboarding to generate your professional game-development CV.
                  </p>
                </div>
              </div>
              <Button asChild>
                <Link href="/onboarding">
                  Start onboarding
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </section>
  );
}
