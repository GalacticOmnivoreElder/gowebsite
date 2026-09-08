// Canonical IANA time zone helpers shared by the browser and server.
// Keep values as IANA identifiers so daylight-saving changes are handled by
// the platform instead of being baked into a fixed UTC offset.

const FALLBACK_TIME_ZONES = [
  "UTC",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Africa/Lagos",
  "Africa/Nairobi",
  "America/Argentina/Buenos_Aires",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Mexico_City",
  "America/New_York",
  "America/Sao_Paulo",
  "Asia/Bangkok",
  "Asia/Dubai",
  "Asia/Hong_Kong",
  "Asia/Jakarta",
  "Asia/Kolkata",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Europe/Amsterdam",
  "Europe/Athens",
  "Europe/Belgrade",
  "Europe/Berlin",
  "Europe/Dublin",
  "Europe/Helsinki",
  "Europe/Istanbul",
  "Europe/Lisbon",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Paris",
  "Europe/Prague",
  "Europe/Rome",
  "Europe/Skopje",
  "Europe/Stockholm",
  "Europe/Vienna",
  "Europe/Warsaw",
  "Pacific/Auckland",
];

export const DEFAULT_TIME_ZONE = "Europe/Skopje";

function supportedTimeZones() {
  if (typeof Intl.supportedValuesOf === "function") {
    return Intl.supportedValuesOf("timeZone");
  }
  return FALLBACK_TIME_ZONES;
}

export const TIME_ZONE_VALUES = Object.freeze(
  [...new Set(["UTC", ...supportedTimeZones()])].sort((a, b) => a.localeCompare(b))
);

const cityName = (value) => {
  if (value === "UTC") return "UTC";
  const city = value.split("/").pop().replaceAll("_", " ");
  return city.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export function isValidTimeZone(value) {
  return TIME_ZONE_VALUES.includes(String(value || "").trim());
}

export function normalizeTimeZone(value, fallback = DEFAULT_TIME_ZONE) {
  const candidate = String(value || "").trim();
  return isValidTimeZone(candidate) ? candidate : fallback;
}

export function formatTimeZoneLabel(value, now = new Date()) {
  const zone = normalizeTimeZone(value);
  if (zone === "UTC") return "UTC (Coordinated Universal Time)";
  let offset = "";
  try {
    offset = new Intl.DateTimeFormat("en", {
      timeZone: zone,
      timeZoneName: "shortOffset",
    })
      .formatToParts(now)
      .find((part) => part.type === "timeZoneName")?.value || "";
  } catch {
    // The value has already been validated; the label can safely omit the
    // offset if an older runtime does not support shortOffset.
  }
  return `${cityName(zone)}${offset ? ` (${offset})` : ""} — ${zone}`;
}

export function formatDateTimeInTimeZone(value, timeZone, options = {}) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    ...options,
    timeZone: normalizeTimeZone(timeZone),
  }).format(date);
}

export const TIME_ZONE_OPTIONS = Object.freeze(
  TIME_ZONE_VALUES.map((value) => ({ value, label: formatTimeZoneLabel(value) }))
);
