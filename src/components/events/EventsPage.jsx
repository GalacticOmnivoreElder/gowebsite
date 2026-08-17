"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Briefcase,
  CalendarDays,
  CalendarPlus,
  Compass,
  ExternalLink,
  MapPin,
  Radio,
  Sparkles,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics/client";
import {
  GO_EVENTS_CALENDAR_EMBED_URL,
  GO_EVENTS_CALENDAR_PUBLIC_URL,
  GO_EVENTS_SCHEDULE_URL,
} from "@/lib/events";

const eventRoutes = [
  {
    label: "Learn practical skills",
    description: "Build useful craft through focused sessions and workshops.",
    href: "/education",
    icon: BookOpen,
    route: "learning",
  },
  {
    label: "Meet collaborators",
    description: "Find people, ideas, and project routes worth exploring.",
    href: "/community",
    icon: Users,
    route: "collaboration",
  },
  {
    label: "Find mentorship",
    description: "Connect your current challenge with a clearer next step.",
    href: "/matchmaking",
    icon: Compass,
    route: "mentorship",
  },
  {
    label: "Explore projects",
    description: "See what creators are building and where you can contribute.",
    href: "/projects",
    icon: Sparkles,
    route: "projects",
  },
  {
    label: "Connect as a studio or business",
    description: "Talk with GO about collaboration, support, or a project idea.",
    href: "/contact",
    icon: Briefcase,
    route: "business",
  },
];

const eventTypes = [
  "Workshops",
  "Community meetups",
  "Mentorship sessions",
  "Project sessions",
  "GOHQ visits",
  "Talks and panels",
];

function scrollToCalendar() {
  document.getElementById("go-events-calendar")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

export default function EventsPage() {
  const [calendarStatus, setCalendarStatus] = useState("loading");
  const calendarTracked = useRef(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setCalendarStatus((status) =>
        status === "loading" ? "timeout" : status
      );
    }, 8000);

    return () => window.clearTimeout(timeout);
  }, []);

  const handleCalendarLoad = () => {
    setCalendarStatus("loaded");
    if (!calendarTracked.current) {
      calendarTracked.current = true;
      trackEvent("calendar_embed_opened", { source: "events_page" });
    }
  };

  const handleCalendarExternalClick = () => {
    trackEvent("calendar_external_link_clicked", {
      link_context: "events_calendar_subscribe",
    });
  };

  const handleScheduleClick = () => {
    trackEvent("schedule_call_clicked", { link_context: "events_page" });
  };

  return (
    <div className="overflow-hidden bg-[#080609] text-white">
      <section className="relative isolate flex min-h-[620px] items-center overflow-hidden border-b border-primary/25 px-4 py-24 sm:px-6 lg:min-h-[680px] lg:py-32">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_50%_20%,rgba(202,34,128,0.22),transparent_38%),linear-gradient(180deg,#100610_0%,#080609_72%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-30 [background-image:radial-gradient(circle,rgba(255,255,255,0.78)_0.7px,transparent_0.8px),linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:43px_43px,72px_72px,72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_88%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[min(78vw,760px)] w-[min(78vw,760px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/20 shadow-[0_0_100px_rgba(202,34,128,0.12)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[min(54vw,520px)] w-[min(54vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10"
        />

        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-4xl">
            <div className="flex items-center gap-3 font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-primary sm:text-xs">
              <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_16px_rgba(202,34,128,0.95)]" />
              GO events / live transmissions
            </div>
            <h1 className="mt-7 max-w-4xl text-balance text-5xl font-extrabold leading-[0.98] tracking-tight sm:text-6xl lg:text-8xl">
              Find your next <span className="text-primary">signal.</span>
            </h1>
            <p className="mt-7 max-w-3xl text-pretty text-base leading-8 text-white/70 sm:text-lg sm:leading-9 lg:text-xl">
              Join workshops, community sessions, mentorship events, project
              meetups, and practical game-development conversations designed to
              help you reach your next playable milestone.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                size="lg"
                className="h-12 rounded-sm bg-primary px-6 text-white shadow-[0_0_28px_rgba(202,34,128,0.24)] hover:bg-primary/90"
                onClick={() => {
                  trackEvent("navigation_clicked", {
                    cta_id: "events_explore_calendar",
                    destination_path: "/events#go-events-calendar",
                    navigation_area: "events_hero",
                  });
                  scrollToCalendar();
                }}
              >
                Explore upcoming events
                <ArrowDown className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-sm border-white/35 bg-black/25 px-6 text-white hover:border-primary hover:bg-primary/10 hover:text-white"
              >
                <a
                  href={GO_EVENTS_SCHEDULE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleScheduleClick}
                >
                  Schedule a call
                  <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
                </a>
              </Button>
            </div>

            <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/10 pt-5 font-mono text-[10px] uppercase tracking-[0.24em] text-white/45">
              <span className="flex items-center gap-2">
                <Radio className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                Public event channel online
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                Online + GOHQ
              </span>
              <span className="flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                Europe / Belgrade time
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-primary/20 bg-[#a51561] px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-white/65">
                Next transmission
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Upcoming GO events
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
              The live calendar below contains the current public schedule. Open
              an event to review its details, participation notes, and Google
              Calendar options.
            </p>
          </div>

          <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {eventTypes.map((type, index) => (
              <div
                key={type}
                className="flex items-center gap-3 border border-white/20 bg-black/20 px-4 py-3 text-sm text-white/85"
              >
                <span className="font-mono text-[10px] text-white/45">
                  0{index + 1}
                </span>
                <span>{type}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-4 py-16 sm:px-6 sm:py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:72px_72px]"
        />
        <div className="relative mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">
              Choose your route
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Find the signal that fits your journey
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/60 sm:text-base">
              Every event is a different route through the GO universe. Choose
              the signal that matches where you are in your game-development
              journey.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {eventRoutes.map((route) => {
              const RouteIcon = route.icon;
              return (
                <Link
                  key={route.route}
                  href={route.href}
                  className="group flex min-h-[208px] flex-col border border-white/15 bg-[#111014] p-5 transition-colors hover:border-primary/70 hover:bg-primary/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#080609]"
                  onClick={() =>
                    trackEvent("event_route_clicked", {
                      event_route: route.route,
                      destination_path: route.href,
                    })
                  }
                >
                  <RouteIcon
                    className="h-6 w-6 text-primary transition-transform duration-300 group-hover:-translate-y-1"
                    aria-hidden="true"
                  />
                  <h3 className="mt-7 text-base font-semibold leading-6">
                    {route.label}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-white/55">
                    {route.description}
                  </p>
                  <ArrowRight
                    className="mt-auto h-4 w-4 text-white/45 transition-transform group-hover:translate-x-1 group-hover:text-primary"
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="go-events-calendar"
        aria-labelledby="go-events-calendar-heading"
        className="scroll-mt-24 border-y border-white/10 bg-[#111014] px-4 py-16 sm:px-6 sm:py-24"
      >
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                Live event calendar
              </p>
              <h2
                id="go-events-calendar-heading"
                className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl"
              >
                Follow the current GO schedule
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
                Availability and times are managed through Google Calendar. Open
                an event for its format, audience, location, and participation
                instructions.
              </p>
            </div>

            <Button
              asChild
              variant="outline"
              className="w-full shrink-0 rounded-sm border-primary/60 bg-transparent text-white hover:bg-primary/10 hover:text-white sm:w-auto"
            >
              <a
                href={GO_EVENTS_CALENDAR_PUBLIC_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleCalendarExternalClick}
              >
                <CalendarPlus className="mr-2 h-4 w-4" aria-hidden="true" />
                Subscribe to GO calendar
                <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
          </div>

          <div className="relative mt-10 overflow-hidden rounded-2xl border border-primary/35 bg-[#0b090d] p-2 shadow-[0_0_80px_rgba(202,34,128,0.12)] sm:p-3">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(202,34,128,0.2),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent_35%)]"
            />
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#111014]">
              <div className="flex flex-col gap-4 border-b border-white/10 bg-[#151015] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-primary/45 bg-primary/10 text-primary shadow-[0_0_20px_rgba(202,34,128,0.15)]">
                    <Radio className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-primary">
                      GO event control
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      MUGI public calendar channel
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">
                  <span className="inline-flex items-center gap-2 border border-emerald-400/30 bg-emerald-400/5 px-2.5 py-1.5 text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.9)]" />
                    Live
                  </span>
                  <span className="border border-white/10 px-2.5 py-1.5">
                    Europe / Belgrade
                  </span>
                  <span className="border border-white/10 px-2.5 py-1.5">
                    Month view
                  </span>
                </div>
              </div>

              <div className="relative bg-[#0a090c] p-2 sm:p-4">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent"
                />
                {calendarStatus === "loading" && (
                  <div
                    className="absolute inset-0 z-10 flex min-h-[600px] items-center justify-center bg-[#111014] px-6 text-center sm:min-h-[680px]"
                    aria-live="polite"
                  >
                    <div>
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-primary/50 bg-primary/10 text-primary">
                        <Radio className="h-5 w-5 animate-pulse" aria-hidden="true" />
                      </div>
                      <p className="mt-4 font-mono text-xs uppercase tracking-[0.24em] text-white/60">
                        Connecting to the public event channel…
                      </p>
                    </div>
                  </div>
                )}
                {calendarStatus === "timeout" && (
                  <div
                    className="mb-3 flex items-center gap-3 border border-primary/25 bg-primary/[0.06] px-4 py-3 text-sm text-white/65"
                    role="status"
                  >
                    <Radio className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    The live calendar is taking longer than expected. Use the
                    Google Calendar link below if it does not appear.
                  </div>
                )}
                <iframe
                  title="Galactic Omnivore public events calendar"
                  src={GO_EVENTS_CALENDAR_EMBED_URL}
                  className="h-[600px] w-full border-0 sm:h-[680px] lg:h-[720px]"
                  loading="lazy"
                  frameBorder="0"
                  scrolling="no"
                  onLoad={handleCalendarLoad}
                />
              </div>

              <div className="flex flex-col gap-2 border-t border-white/10 bg-[#0e0c11] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <span>Public channel / GO events</span>
                <span className="text-primary/80">Signal source: Google Calendar</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 border border-white/10 bg-black/20 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <p className="text-sm leading-6 text-white/60">
                Prefer Google Calendar? Open the public calendar to subscribe or
                review it in a full calendar view.
              </p>
            </div>
            <a
              href={GO_EVENTS_CALENDAR_PUBLIC_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={handleCalendarExternalClick}
            >
              Open in Google Calendar
              <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 border border-primary/30 bg-[#151015] p-7 shadow-[0_0_80px_rgba(202,34,128,0.08)] sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center lg:p-14">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">
              Your next playable milestone
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
              Start with a signal. Choose your next route.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
              Explore the community, build practical skills, find collaborators,
              or talk with GO about a project or partnership.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Button asChild className="rounded-sm bg-primary hover:bg-primary/90">
              <Link href="/education">Explore learning</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-sm border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <a
                href={GO_EVENTS_SCHEDULE_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleScheduleClick}
              >
                Schedule a call
                <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
