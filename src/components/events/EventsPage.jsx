"use client";

import Link from "next/link";
import { observer } from "mobx-react";
import {
  ArrowDown,
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  LockKeyhole,
  MapPin,
  Radio,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { auth } from "@/firebase";
import MobxStore from "@/mobx";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics/client";
import {
  GO_EVENTS_CALENDAR_PUBLIC_URL,
  GO_EVENTS_SCHEDULE_URL,
  GO_EVENTS_TIMEZONE,
} from "@/lib/events";

const eventRoutes = [
  {
    label: "Learn practical skills",
    description: "Build useful craft through focused sessions and workshops.",
    href: "/education",
    icon: Sparkles,
  },
  {
    label: "Meet collaborators",
    description: "Find people, ideas, and project routes worth exploring.",
    href: "/community",
    icon: Users,
  },
  {
    label: "Find mentorship",
    description: "Connect your current challenge with a clearer next step.",
    href: "/matchmaking",
    icon: ArrowRight,
  },
  {
    label: "Explore projects",
    description: "See what creators are building and where you can contribute.",
    href: "/projects",
    icon: Radio,
  },
  {
    label: "Connect as a studio or business",
    description: "Talk with GO about collaboration, support, or a project idea.",
    href: "/contact",
    icon: ShieldCheck,
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

function formatDate(value, options = {}) {
  if (!value) return "Date to be announced";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: GO_EVENTS_TIMEZONE,
      day: "numeric",
      month: "short",
      year: "numeric",
      ...options,
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatTime(value, allDay) {
  if (allDay) return "All day";
  if (!value) return "Time to be announced";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: GO_EVENTS_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function dateKey(value, allDay = false) {
  if (!value) return "";
  if (allDay) return String(value).slice(0, 10);
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: GO_EVENTS_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
  } catch {
    return String(value).slice(0, 10);
  }
}

function monthLabel(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(value);
}

function monthCells(value) {
  const year = value.getFullYear();
  const month = value.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: first.getDay() }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }
  return cells;
}

function readableCategory(category = "go-event") {
  return category.replace(/[-_]/g, " ");
}

function accessLabel(event) {
  return event.access === "members" ? "GO Community members" : "Open to everyone";
}

function eventLocationLabel(event) {
  if (event.location) return event.location;
  if (event.format === "Google Meet" || event.hasJoinLink) return "Google Meet";
  return "Location to be announced";
}

function eventFormatLabel(event) {
  if (event.format) return event.format;
  if (event.location) return "In person";
  if (event.hasJoinLink) return "Google Meet";
  return "Online";
}

function formatTimeRange(event) {
  const start = formatTime(event.start, event.allDay);
  if (event.allDay || !event.end || event.end === event.start) return start;
  const end = formatTime(event.end, event.allDay);
  return start === end ? start : `${start}–${end}`;
}

function formatDuration(event) {
  if (!event.durationMinutes) return "Not specified";
  const hours = Math.floor(event.durationMinutes / 60);
  const minutes = event.durationMinutes % 60;
  if (!hours) return `${minutes} min`;
  if (!minutes) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}

function EventMetaGrid({ event, detail = false }) {
  const items = [
    {
      label: "When",
      value: `${formatDate(event.start, { weekday: "short" })} · ${formatTimeRange(event)} · ${event.timezone || GO_EVENTS_TIMEZONE}`,
      icon: Clock3,
    },
    { label: "Where", value: eventLocationLabel(event), icon: MapPin },
    { label: "Format", value: eventFormatLabel(event), icon: Radio },
    { label: "Duration", value: formatDuration(event), icon: Clock3 },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map(({ label, value, icon: Icon }) => (
        <div key={label} className={`border border-white/10 ${detail ? "bg-black/20 p-4" : "bg-black/10 p-3"}`}>
          <p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-white/40"><Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />{label}</p>
          <p className="mt-2 text-sm font-semibold text-white/85">{value}</p>
        </div>
      ))}
    </div>
  );
}

function EventBriefing({ event, detail = false }) {
  return (
    <div className={`border border-white/10 bg-black/20 ${detail ? "mt-7 p-5" : "mt-5 p-4"}`}>
      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary">Briefing</p>
      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-white/70">
        {event.description || "The organizer has not added a briefing for this event yet."}
      </p>
    </div>
  );
}

function EventCard({ event, compact = false, isMember, joiningId, onSelect, onJoin }) {
  const isMembersOnly = event.access === "members";
  const isJoining = joiningId === event.id;

  return (
    <article className={`group relative overflow-hidden border bg-[#111014] transition-colors ${isMembersOnly ? "border-primary/35 hover:border-primary/75" : "border-white/12 hover:border-cyan-300/50"} ${compact ? "p-4" : "p-5 sm:p-6"}`}>
      <div aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${isMembersOnly ? "bg-primary" : "bg-cyan-300"}`} />
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">
          <span>{formatDate(event.start, { weekday: "short" })}</span>
          <span className="text-primary">/</span>
          <span>{readableCategory(event.category)}</span>
        </div>
        {isMembersOnly ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 border border-primary/45 bg-primary/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-pink-200"><LockKeyhole className="h-3 w-3" aria-hidden="true" />Members only</span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1.5 border border-cyan-300/30 bg-cyan-300/5 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-cyan-100">Open event</span>
        )}
      </div>

      <button type="button" className="mt-5 block text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-[#111014]" onClick={() => onSelect(event)}>
        <h3 className={`${compact ? "text-lg" : "text-xl sm:text-2xl"} font-semibold tracking-tight text-white`}>{event.title}</h3>
      </button>

      <div className="mt-4">
        <EventMetaGrid event={event} />
      </div>

      {!compact && <p className="mt-4 line-clamp-3 text-sm leading-7 text-white/55">{event.description || "Event briefing will be shared in the event details."}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {isMembersOnly ? (
          <Button type="button" size="sm" className="rounded-sm bg-primary text-white hover:bg-primary/90" disabled={isJoining} onClick={() => onJoin(event)}>
            {isJoining ? "Connecting…" : isMember ? "Join community event" : "Review membership"}
            {isJoining ? <RefreshCw className="ml-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <ArrowRight className="ml-2 h-3.5 w-3.5" aria-hidden="true" />}
          </Button>
        ) : event.joinUrl ? (
          <a href={event.joinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center rounded-sm bg-cyan-300 px-3 text-xs font-semibold text-[#071014] transition-colors hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200" onClick={() => trackEvent("event_join_succeeded", { content_id: event.id, access_level: "public" })}>
            <Video className="mr-2 h-3.5 w-3.5" aria-hidden="true" />Join event
          </a>
        ) : null}
        <button type="button" className="inline-flex items-center text-xs font-semibold text-white/55 underline-offset-4 transition-colors hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" onClick={() => onSelect(event)}>View details<ArrowRight className="ml-2 h-3.5 w-3.5" aria-hidden="true" /></button>
      </div>

      <p className="mt-5 border-t border-white/10 pt-3 font-mono text-[9px] uppercase tracking-[0.16em] text-white/35">{accessLabel(event)}</p>
    </article>
  );
}

function EventDetails({ event, isMember, joiningId, onClose, onJoin }) {
  if (!event) return null;
  const isMembersOnly = event.access === "members";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="presentation" onMouseDown={(eventTarget) => { if (eventTarget.target === eventTarget.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="go-event-details-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto border border-primary/45 bg-[#111014] p-6 shadow-[0_0_90px_rgba(202,34,128,0.24)] sm:p-8" onKeyDown={(keyboardEvent) => { if (keyboardEvent.key === "Escape") onClose(); }} tabIndex={-1}>
        <div className="flex items-start justify-between gap-5">
          <div><p className="font-mono text-[10px] uppercase tracking-[0.28em] text-primary">Event briefing / {readableCategory(event.category)}</p><h2 id="go-event-details-title" className="mt-3 text-3xl font-bold tracking-tight text-white">{event.title}</h2></div>
          <button type="button" aria-label="Close event details" className="flex h-9 w-9 shrink-0 items-center justify-center border border-white/15 text-white/55 transition-colors hover:border-primary hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" onClick={onClose}><X className="h-4 w-4" aria-hidden="true" /></button>
        </div>

        <div className="mt-7 border border-white/10 bg-black/20 p-4"><p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">Subject</p><p className="mt-2 text-base font-semibold text-white">{event.subject || event.title}</p></div>

        <div className="mt-3"><EventMetaGrid event={event} detail /></div>

        <div className="mt-3 border border-white/10 bg-black/20 p-4"><p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">Access</p><p className="mt-2 text-sm font-semibold text-white">{accessLabel(event)}</p><p className="mt-1 text-sm text-white/60">{isMembersOnly ? "Your membership is checked when you join." : "Open event channel."}</p></div>

        <EventBriefing event={event} detail />

        <div className="mt-7 flex flex-wrap items-center gap-3">
          {isMembersOnly ? (
            <Button type="button" className="rounded-sm bg-primary text-white hover:bg-primary/90" disabled={joiningId === event.id} onClick={() => onJoin(event)}>{joiningId === event.id ? "Connecting…" : isMember ? "Join community event" : "Review membership"}<ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Button>
          ) : event.joinUrl ? (
            <a href={event.joinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-sm bg-cyan-300 px-4 text-sm font-semibold text-[#071014] hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"><Video className="mr-2 h-4 w-4" aria-hidden="true" />Join event</a>
          ) : null}
          {event.htmlLink && !isMembersOnly && <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center border border-white/20 px-4 text-sm font-semibold text-white/75 hover:border-primary hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Open in Google Calendar<ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" /></a>}
        </div>

        {isMembersOnly && !isMember && <p className="mt-5 border-l-2 border-primary bg-primary/10 px-4 py-3 text-sm leading-6 text-white/70">This is a GO Community meeting. Review the membership options to unlock the protected joining flow.</p>}
      </div>
    </div>
  );
}

function EventsPage() {
  const [calendar, setCalendar] = useState({ status: "loading", events: [], nextEvent: null, timezone: GO_EVENTS_TIMEZONE, configured: false });
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [joiningId, setJoiningId] = useState(null);
  const [joinError, setJoinError] = useState("");
  const [activeMonth, setActiveMonth] = useState(() => new Date());
  const [activeDate, setActiveDate] = useState("");

  const isMember = !MobxStore.isUserAnonymous && Boolean(MobxStore.isMember || MobxStore.user?.activeMember === true);

  useEffect(() => {
    let active = true;
    async function loadEvents() {
      try {
        const response = await fetch("/api/go-events", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!active) return;
        if (!response.ok) {
          setCalendar({ status: "error", events: [], nextEvent: null, timezone: payload.timezone || GO_EVENTS_TIMEZONE, configured: false, error: payload.error || "The GO event channel is unavailable right now." });
          return;
        }
        setCalendar({ ...payload, status: "ready" });
        if (payload.nextEvent?.start) setActiveMonth(new Date(payload.nextEvent.start));
        trackEvent("events_calendar_loaded", { source: "go_events_api", event_count: payload.events?.length || 0 });
      } catch {
        if (!active) return;
        setCalendar({ status: "error", events: [], nextEvent: null, timezone: GO_EVENTS_TIMEZONE, configured: false, error: "The GO event channel could not be reached." });
      }
    }
    loadEvents();
    return () => { active = false; };
  }, []);

  const eventsByDate = useMemo(() => {
    const grouped = new Map();
    for (const event of calendar.events) {
      const key = dateKey(event.start, event.allDay);
      grouped.set(key, [...(grouped.get(key) || []), event]);
    }
    return grouped;
  }, [calendar.events]);

  const selectedDateEvents = activeDate ? eventsByDate.get(activeDate) || [] : [];
  const cells = monthCells(activeMonth);

  const handleCalendarExternalClick = () => trackEvent("calendar_external_link_clicked", { link_context: "events_calendar_subscribe" });
  const handleScheduleClick = () => trackEvent("schedule_call_clicked", { link_context: "events_page" });

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    setJoinError("");
    trackEvent("event_detail_opened", { content_id: event.id, access_level: event.access });
  };

  const handleJoin = async (event) => {
    trackEvent("event_join_attempted", { content_id: event.id, access_level: event.access });
    if (event.access === "members" && !isMember) {
      trackEvent("event_join_denied", { content_id: event.id, access_level: event.access, error_category: "membership_required" });
      window.location.assign("/membership?reason=community-event");
      return;
    }

    setJoinError("");
    setJoiningId(event.id);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        window.location.assign("/login?returnTo=/events");
        return;
      }
      const response = await fetch(`/api/go-events/${encodeURIComponent(event.id)}/join`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        window.location.assign(payload.signInUrl || "/login?returnTo=/events");
        return;
      }
      if (response.status === 403) {
        window.location.assign(payload.membershipUrl || "/membership?reason=community-event");
        return;
      }
      if (!response.ok || !payload.joinUrl) throw new Error(payload.error || "The meeting link is not available.");
      trackEvent("event_join_succeeded", { content_id: event.id, access_level: event.access });
      window.location.assign(payload.joinUrl);
    } catch (error) {
      setJoinError(error.message || "The event join link is temporarily unavailable.");
      trackEvent("event_join_denied", { content_id: event.id, access_level: event.access, error_category: "join_unavailable" });
    } finally {
      setJoiningId(null);
    }
  };

  const changeMonth = (offset) => {
    setActiveMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
    setActiveDate("");
    trackEvent("calendar_period_changed", { direction: offset > 0 ? "next" : "previous" });
  };

  return (
    <div className="overflow-hidden bg-[#080609] text-white">
      <section className="relative isolate flex min-h-[620px] items-center overflow-hidden border-b border-primary/25 px-4 py-24 sm:px-6 lg:min-h-[680px] lg:py-32">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_50%_20%,rgba(202,34,128,0.22),transparent_38%),linear-gradient(180deg,#100610_0%,#080609_72%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-30 [background-image:radial-gradient(circle,rgba(255,255,255,0.78)_0.7px,transparent_0.8px),linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:43px_43px,72px_72px,72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[min(78vw,760px)] w-[min(78vw,760px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/20 shadow-[0_0_100px_rgba(202,34,128,0.12)]" />
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[min(54vw,520px)] w-[min(54vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
        <div className="mx-auto w-full max-w-6xl"><div className="max-w-4xl">
          <div className="flex items-center gap-3 font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-primary sm:text-xs"><span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_16px_rgba(202,34,128,0.95)]" />GO events / live transmissions</div>
          <h1 className="mt-7 max-w-4xl text-balance text-5xl font-extrabold leading-[0.98] tracking-tight sm:text-6xl lg:text-8xl">Find your next <span className="text-primary">signal.</span></h1>
          <p className="mt-7 max-w-3xl text-pretty text-base leading-8 text-white/70 sm:text-lg sm:leading-9 lg:text-xl">Join workshops, community sessions, mentorship events, project meetups, and practical game-development conversations designed to help you reach your next playable milestone.</p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"><Button size="lg" className="h-12 rounded-sm bg-primary px-6 text-white shadow-[0_0_28px_rgba(202,34,128,0.24)] hover:bg-primary/90" onClick={scrollToCalendar}>Explore upcoming events<ArrowDown className="ml-2 h-4 w-4" aria-hidden="true" /></Button><Button asChild size="lg" variant="outline" className="h-12 rounded-sm border-white/35 bg-black/25 px-6 text-white hover:border-primary hover:bg-primary/10 hover:text-white"><a href={GO_EVENTS_SCHEDULE_URL} target="_blank" rel="noopener noreferrer" onClick={handleScheduleClick}>Schedule a call<ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" /></a></Button></div>
          <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/10 pt-5 font-mono text-[10px] uppercase tracking-[0.24em] text-white/45"><span className="flex items-center gap-2"><Radio className="h-3.5 w-3.5 text-primary" aria-hidden="true" />Public event channel online</span><span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />Online + GOHQ</span><span className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden="true" />Europe / Belgrade time</span></div>
        </div></div>
      </section>

      <section className="border-b border-primary/20 bg-[#a51561] px-4 py-14 sm:px-6 sm:py-20"><div className="mx-auto max-w-6xl"><div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end"><div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-white/65">What you can plug into</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">A calendar for the whole GO journey</h2></div><p className="max-w-2xl text-sm leading-7 text-white/75 sm:text-base">Choose the kind of signal that matches your current stage, then use the event details to understand the format, access, and next action.</p></div><div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{eventTypes.map((type, index) => <div key={type} className="flex items-center gap-3 border border-white/20 bg-black/20 px-4 py-3 text-sm text-white/85"><span className="font-mono text-[10px] text-white/45">0{index + 1}</span><span>{type}</span></div>)}</div></div></section>

      <section id="go-events-calendar" aria-labelledby="go-events-calendar-heading" className="scroll-mt-24 border-y border-white/10 bg-[#111014] px-4 py-16 sm:px-6 sm:py-24"><div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between"><div><p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-primary"><CalendarDays className="h-4 w-4" aria-hidden="true" />Live event calendar</p><h2 id="go-events-calendar-heading" className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Your next GO checkpoint</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">A custom event view powered by the GO calendar. Public sessions are open to everyone; protected community meetings reveal their Google Meet entry only after membership is verified.</p></div><Button asChild variant="outline" className="w-full shrink-0 rounded-sm border-primary/60 bg-transparent text-white hover:bg-primary/10 hover:text-white sm:w-auto"><a href={GO_EVENTS_CALENDAR_PUBLIC_URL} target="_blank" rel="noopener noreferrer" onClick={handleCalendarExternalClick}><CalendarPlus className="mr-2 h-4 w-4" aria-hidden="true" />Subscribe to GO calendar<ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" /></a></Button></div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative overflow-hidden border border-primary/45 bg-[#160d16] p-6 shadow-[0_0_60px_rgba(202,34,128,0.12)] sm:p-8"><div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full border border-primary/25 shadow-[0_0_80px_rgba(202,34,128,0.14)]" /><div className="relative"><div className="flex items-center justify-between gap-4"><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">Next transmission</p><span className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.9)]" />Signal live</span></div>{calendar.status === "loading" ? <div className="mt-12 animate-pulse" aria-live="polite"><div className="h-8 w-3/4 bg-white/10" /><div className="mt-5 h-4 w-1/2 bg-white/10" /><div className="mt-3 h-4 w-2/3 bg-white/10" /></div> : calendar.nextEvent ? <><h3 className="mt-8 max-w-lg text-3xl font-bold tracking-tight text-white sm:text-4xl">{calendar.nextEvent.title}</h3><div className="mt-6"><EventMetaGrid event={calendar.nextEvent} /></div><EventBriefing event={calendar.nextEvent} /><div className="mt-8 flex flex-wrap gap-3">{calendar.nextEvent.access === "members" ? <Button className="rounded-sm bg-primary text-white hover:bg-primary/90" onClick={() => handleJoin(calendar.nextEvent)}>{isMember ? "Join community event" : "Review membership"}<ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Button> : calendar.nextEvent.joinUrl ? <a href={calendar.nextEvent.joinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-sm bg-cyan-300 px-4 text-sm font-semibold text-[#071014] hover:bg-cyan-200"><Video className="mr-2 h-4 w-4" aria-hidden="true" />Join event</a> : null}<button type="button" className="inline-flex h-10 items-center border border-white/20 px-4 text-sm font-semibold text-white/70 hover:border-primary hover:text-white" onClick={() => handleSelectEvent(calendar.nextEvent)}>View briefing<ArrowRight className="ml-4 h-4 w-4" aria-hidden="true" /></button></div></> : <div className="mt-12"><h3 className="text-2xl font-bold text-white">No transmission scheduled yet</h3><p className="mt-4 max-w-md text-sm leading-7 text-white/60">Subscribe to the GO Calendar and check back soon for the next community checkpoint.</p></div>}{joinError && <p className="mt-5 border-l-2 border-amber-300 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-100" role="alert">{joinError}</p>}</div></div>

          <div className="border border-white/10 bg-[#0b090d] p-4 sm:p-6" data-testid="go-events-calendar-state" data-state={calendar.status}><div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5"><div><p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">Upcoming transmissions</p><p className="mt-2 text-sm text-white/50">{calendar.events.length ? `${calendar.events.length} scheduled event${calendar.events.length === 1 ? "" : "s"}` : "Live schedule"}</p></div><div className="flex items-center gap-2"><button type="button" aria-label="Previous month" className="flex h-9 w-9 items-center justify-center border border-white/15 text-white/60 hover:border-primary hover:text-white" onClick={() => changeMonth(-1)}><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button><span className="min-w-32 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-white/70">{monthLabel(activeMonth)}</span><button type="button" aria-label="Next month" className="flex h-9 w-9 items-center justify-center border border-white/15 text-white/60 hover:border-primary hover:text-white" onClick={() => changeMonth(1)}><ChevronRight className="h-4 w-4" aria-hidden="true" /></button></div></div>
            {calendar.status === "error" ? <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center" role="status"><Radio className="h-8 w-8 text-primary" aria-hidden="true" /><h3 className="mt-5 text-xl font-semibold text-white">The GO event signal is being connected</h3><p className="mt-3 max-w-md text-sm leading-6 text-white/55">{calendar.error || "The live schedule is temporarily unavailable."} Subscribe to the calendar below while the connection is restored.</p></div> : calendar.status === "loading" ? <div className="grid grid-cols-7 gap-1 pt-6" aria-label="Loading event calendar">{Array.from({ length: 35 }, (_, index) => <div key={index} className="h-12 animate-pulse bg-white/[0.04]" />)}</div> : <><div className="mt-6 grid grid-cols-7 gap-1 font-mono text-[9px] uppercase tracking-[0.1em] text-white/35"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div><div className="mt-2 grid grid-cols-7 gap-1">{cells.map((day, index) => { if (!day) return <div key={`empty-${index}`} className="min-h-16 border border-transparent" />; const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`; const dayEvents = eventsByDate.get(key) || []; const isSelected = activeDate === key; const isToday = dateKey(new Date().toISOString()) === key; return <button key={key} type="button" aria-label={`${day.toLocaleDateString("en-US", { month: "long", day: "numeric" })}${dayEvents.length ? `, ${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"}` : ""}`} className={`relative min-h-16 border p-2 text-left transition-colors ${isSelected ? "border-primary bg-primary/15" : "border-white/10 bg-white/[0.025] hover:border-primary/60"}`} onClick={() => setActiveDate(key)}><span className={`font-mono text-xs ${isToday ? "inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white" : "text-white/60"}`}>{day.getDate()}</span>{dayEvents.length > 0 && <span className="absolute bottom-2 left-2 right-2 flex gap-1">{dayEvents.slice(0, 3).map((event) => <span key={event.id} className={`h-1 flex-1 ${event.access === "members" ? "bg-primary" : "bg-cyan-300"}`} />)}</span>}</button>; })}</div>{activeDate && <div className="mt-5 border-t border-white/10 pt-5"><div className="flex items-center justify-between gap-3"><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Selected date</p><button type="button" className="text-xs text-white/45 hover:text-white" onClick={() => setActiveDate("")}>Show all</button></div>{selectedDateEvents.length ? <div className="mt-3 space-y-2">{selectedDateEvents.map((event) => <button key={event.id} type="button" className="flex w-full items-center justify-between gap-3 border border-white/10 bg-white/[0.025] p-3 text-left hover:border-primary/60" onClick={() => handleSelectEvent(event)}><span className="min-w-0"><span className="block truncate text-sm font-semibold text-white">{event.title}</span><span className="mt-1 block text-xs text-white/50">{formatTime(event.start, event.allDay)}</span></span>{event.access === "members" ? <LockKeyhole className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> : <ArrowRight className="h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />}</button>)}</div> : <p className="mt-3 text-sm text-white/50">No events on this date.</p>}</div>}</>}</div>
          </div>
        </div>

        {calendar.events.length > 0 && <div className="mt-8 grid gap-4 md:grid-cols-2">{calendar.events.slice(0, 6).map((event) => <EventCard key={event.id} event={event} isMember={isMember} joiningId={joiningId} onSelect={handleSelectEvent} onJoin={handleJoin} />)}</div>}
        <div className="mt-6 flex flex-col gap-4 border border-white/10 bg-black/20 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" /><p className="text-sm leading-6 text-white/60">Prefer Google Calendar? Subscribe to the source calendar for updates and reminders.</p></div><a href={GO_EVENTS_CALENDAR_PUBLIC_URL} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" onClick={handleCalendarExternalClick}>Open in Google Calendar<ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" /></a></div>
      </section>

      <section className="relative px-4 py-16 sm:px-6 sm:py-24"><div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:72px_72px]" /><div className="relative mx-auto max-w-6xl"><div className="mx-auto max-w-3xl text-center"><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">Choose your route</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Find the signal that fits your journey</h2><p className="mt-4 text-sm leading-7 text-white/60 sm:text-base">Every event is a different route through the GO universe. Choose the signal that matches where you are in your game-development journey.</p></div><div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-5">{eventRoutes.map((route) => { const RouteIcon = route.icon; return <Link key={route.href} href={route.href} className="group flex min-h-[208px] flex-col border border-white/15 bg-[#111014] p-5 transition-colors hover:border-primary/70 hover:bg-primary/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#080609]"><RouteIcon className="h-6 w-6 text-primary transition-transform duration-300 group-hover:-translate-y-1" aria-hidden="true" /><h3 className="mt-7 text-base font-semibold leading-6">{route.label}</h3><p className="mt-3 text-sm leading-6 text-white/55">{route.description}</p><ArrowRight className="mt-auto h-4 w-4 text-white/45 transition-transform group-hover:translate-x-1 group-hover:text-primary" aria-hidden="true" /></Link>; })}</div></div></section>

      <section className="px-4 py-16 sm:px-6 sm:py-24"><div className="mx-auto grid max-w-6xl gap-10 border border-primary/30 bg-[#151015] p-7 shadow-[0_0_80px_rgba(202,34,128,0.08)] sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center lg:p-14"><div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">Your next playable milestone</p><h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Start with a signal. Choose your next route.</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">Explore the community, build practical skills, find collaborators, or talk with GO about a project or partnership.</p></div><div className="flex flex-col gap-3 sm:flex-row lg:flex-col"><Button asChild className="rounded-sm bg-primary hover:bg-primary/90"><Link href="/education">Explore learning</Link></Button><Button asChild variant="outline" className="rounded-sm border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"><a href={GO_EVENTS_SCHEDULE_URL} target="_blank" rel="noopener noreferrer" onClick={handleScheduleClick}>Schedule a call<ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" /></a></Button></div></div></section>
      <EventDetails event={selectedEvent} isMember={isMember} joiningId={joiningId} onClose={() => setSelectedEvent(null)} onJoin={handleJoin} />
    </div>
  );
}

export default observer(EventsPage);
