const ACCESS_MARKER = /^\s*GO_(ACCESS|TYPE|CATEGORY)\s*:\s*(.+?)\s*$/i;
const MEMBERS_MARKER = /\[(?:GO\s+)?MEMBERS?\]/i;
const VIDEO_HOSTS = new Set(["meet.google.com", "hangouts.google.com"]);

function asString(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

export function normalizeAccessValue(value) {
  const normalized = asString(value).toLowerCase();
  return ["member", "members", "community", "private"].includes(normalized)
    ? "members"
    : "public";
}

export function getEventMarkers(event = {}) {
  const description = asString(event.description);
  const lines = description.split(/\r?\n/);
  const markers = {};

  for (const line of lines) {
    const match = line.match(ACCESS_MARKER);
    if (!match) continue;
    markers[match[1].toLowerCase()] = match[2].trim();
  }

  return markers;
}

export function stripGoMetadata(value = "") {
  return asString(value)
    .split(/\r?\n/)
    .filter((line) => !ACCESS_MARKER.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function getEventAccess(event = {}, source = "public") {
  if (source === "members") return "members";

  const markers = getEventMarkers(event);
  if (markers.access) return normalizeAccessValue(markers.access);
  if (event.extendedProperties?.shared?.goAccess) {
    return normalizeAccessValue(event.extendedProperties.shared.goAccess);
  }
  if (event.extendedProperties?.private?.goAccess) {
    return normalizeAccessValue(event.extendedProperties.private.goAccess);
  }
  if (MEMBERS_MARKER.test(asString(event.summary))) return "members";

  return "public";
}

export function getEventCategory(event = {}) {
  const markers = getEventMarkers(event);
  const category = markers.type || markers.category;
  if (category) return category.toLowerCase().replace(/\s+/g, "-");

  const title = asString(event.summary).toLowerCase();
  if (title.includes("community")) return "community";
  if (title.includes("mentor")) return "mentorship";
  if (title.includes("workshop")) return "workshop";
  if (title.includes("match")) return "matchmaking";
  return "go-event";
}

export function getVideoJoinUrl(event = {}) {
  const entryPoint = event.conferenceData?.entryPoints?.find(
    (entry) => entry?.entryPointType === "video" && entry?.uri
  );
  const candidate = entryPoint?.uri || event.hangoutLink;
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" || !VIDEO_HOSTS.has(url.hostname)) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeCalendarEvent(event = {}, { source = "public", timezone = "Europe/Belgrade" } = {}) {
  const startValue = event.start?.dateTime || event.start?.date || null;
  const endValue = event.end?.dateTime || event.end?.date || startValue;
  if (!event.id || !startValue) return null;

  const access = getEventAccess(event, source);
  const joinUrl = getVideoJoinUrl(event);
  const allDay = Boolean(event.start?.date && !event.start?.dateTime);
  const description = stripGoMetadata(event.description);

  return {
    id: asString(event.id),
    title: asString(event.summary, "GO Event"),
    description,
    start: startValue,
    end: endValue,
    allDay,
    timezone: event.start?.timeZone || timezone,
    location: asString(event.location) || null,
    htmlLink: access === "public" && /^https:\/\/calendar\.google\.com\//i.test(asString(event.htmlLink))
      ? event.htmlLink
      : null,
    status: asString(event.status, "confirmed").toLowerCase(),
    access,
    category: getEventCategory(event),
    hasJoinLink: Boolean(joinUrl),
    joinAvailable: access === "public" && Boolean(joinUrl),
    ...(access === "public" && joinUrl ? { joinUrl } : {}),
    source,
  };
}

export function getEventTimestamp(event) {
  const value = event?.start?.dateTime || event?.start?.date;
  const timestamp = value ? new Date(value).getTime() : Number.POSITIVE_INFINITY;
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}
