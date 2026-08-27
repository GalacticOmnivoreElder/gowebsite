import { createPrivateKey } from "crypto";
import { SignJWT } from "jose";

import {
  getEventAccess,
  getEventTimestamp,
  getVideoJoinUrl,
  normalizeCalendarEvent,
} from "@/lib/go-events-core";
import { inspectNormalizedPem, normalizePemPrivateKey } from "@/lib/pem-private-key";

const PUBLIC_CALENDAR_ID =
  process.env.GO_EVENTS_PUBLIC_CALENDAR_ID ||
  "d88aa1c479a0ef990128bda11f762b849698d58daf1cbb134871079fecb3a518@group.calendar.google.com";
const MEMBERS_CALENDAR_ID = process.env.GO_EVENTS_MEMBERS_CALENDAR_ID || "";
const TIMEZONE = process.env.GO_EVENTS_TIMEZONE || "Europe/Belgrade";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CACHE_TTL_MS = 5 * 60 * 1000;
const EVENT_WINDOW_MS = 180 * 24 * 60 * 60 * 1000;

const eventListCache = new Map();
let serviceAccountTokenCache = null;

function inspectEnvVar(name) {
  const raw = process.env[name];
  if (raw == null) {
    return { name, set: false, length: 0 };
  }

  const value = String(raw);
  const trimmed = value.trim();
  const wrappedInQuotes =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));

  return {
    name,
    set: true,
    length: value.length,
    trimmedLength: trimmed.length,
    emptyAfterTrim: trimmed.length === 0,
    wrappedInQuotes,
    hasRealNewline: value.includes("\n"),
    hasEscapedNewline: value.includes("\\n"),
    startsWithBrace: trimmed.startsWith("{"),
    looksLikePem: trimmed.includes("BEGIN PRIVATE KEY") || trimmed.includes("BEGIN RSA PRIVATE KEY"),
  };
}

function inspectServiceAccountJson() {
  const json = process.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON;
  const base = inspectEnvVar("GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON");
  if (!base.set || base.emptyAfterTrim) {
    return { ...base, jsonParses: false, hasClientEmail: false, hasPrivateKey: false };
  }

  try {
    const parsed = JSON.parse(String(json).trim());
    return {
      ...base,
      jsonParses: true,
      parsedType: parsed && typeof parsed === "object" && !Array.isArray(parsed) ? "object" : typeof parsed,
      hasClientEmail: Boolean(parsed?.client_email),
      hasPrivateKey: Boolean(parsed?.private_key),
      clientEmailLength: typeof parsed?.client_email === "string" ? parsed.client_email.length : 0,
      privateKeyLength: typeof parsed?.private_key === "string" ? parsed.private_key.length : 0,
      privateKeyLooksLikePem:
        typeof parsed?.private_key === "string" &&
        (parsed.private_key.includes("BEGIN PRIVATE KEY") || parsed.private_key.includes("BEGIN RSA PRIVATE KEY")),
    };
  } catch (error) {
    return {
      ...base,
      jsonParses: false,
      parseError: error instanceof Error ? error.message : "JSON.parse failed",
      hasClientEmail: false,
      hasPrivateKey: false,
    };
  }
}

export function getGoEventsEnvDiagnostics() {
  const serviceAccountJson = inspectServiceAccountJson();
  const clientEmail = inspectEnvVar("GOOGLE_CALENDAR_CLIENT_EMAIL");
  const privateKey = inspectEnvVar("GOOGLE_CALENDAR_PRIVATE_KEY");
  const privateKeyBase64 = inspectEnvVar("GOOGLE_CALENDAR_PRIVATE_KEY_BASE64");
  const apiKey = inspectEnvVar("GOOGLE_CALENDAR_API_KEY");
  const publicCalendarId = inspectEnvVar("GO_EVENTS_PUBLIC_CALENDAR_ID");
  const membersCalendarId = inspectEnvVar("GO_EVENTS_MEMBERS_CALENDAR_ID");
  const timezone = inspectEnvVar("GO_EVENTS_TIMEZONE");
  const embedUrl = inspectEnvVar("NEXT_PUBLIC_GO_EVENTS_CALENDAR_EMBED_URL");
  const publicUrl = inspectEnvVar("NEXT_PUBLIC_GO_EVENTS_CALENDAR_PUBLIC_URL");

  let serviceAccountPath = "none";
  if (serviceAccountJson.jsonParses && serviceAccountJson.hasClientEmail && serviceAccountJson.hasPrivateKey) {
    serviceAccountPath = "GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON";
  } else if (
    clientEmail.set &&
    !clientEmail.emptyAfterTrim &&
    ((privateKey.set && !privateKey.emptyAfterTrim) || (privateKeyBase64.set && !privateKeyBase64.emptyAfterTrim))
  ) {
    serviceAccountPath = privateKeyBase64.set && !privateKeyBase64.emptyAfterTrim
      ? "GOOGLE_CALENDAR_CLIENT_EMAIL + GOOGLE_CALENDAR_PRIVATE_KEY_BASE64"
      : "GOOGLE_CALENDAR_CLIENT_EMAIL + GOOGLE_CALENDAR_PRIVATE_KEY";
  }

  const missing = [];
  if (!publicCalendarId.set || publicCalendarId.emptyAfterTrim) missing.push("GO_EVENTS_PUBLIC_CALENDAR_ID (optional, has code fallback)");
  if (serviceAccountPath === "none" && (!apiKey.set || apiKey.emptyAfterTrim)) {
    missing.push("GOOGLE_CALENDAR_API_KEY (required for public calendar if no service account)");
  }
  if ((membersCalendarId.set && !membersCalendarId.emptyAfterTrim) && serviceAccountPath === "none") {
    missing.push("service account credentials (required because GO_EVENTS_MEMBERS_CALENDAR_ID is set)");
  }
  if (serviceAccountJson.set && !serviceAccountJson.emptyAfterTrim && !serviceAccountJson.jsonParses) {
    missing.push("GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON is set but is not valid JSON");
  }
  if (privateKey.set && !privateKey.emptyAfterTrim && !privateKey.looksLikePem && !privateKey.hasEscapedNewline && !privateKey.hasRealNewline) {
    missing.push("GOOGLE_CALENDAR_PRIVATE_KEY does not look like a PEM key");
  }

  return {
    vercelEnv: process.env.VERCEL_ENV || null,
    nodeEnv: process.env.NODE_ENV || null,
    vars: {
      GO_EVENTS_PUBLIC_CALENDAR_ID: publicCalendarId,
      GO_EVENTS_MEMBERS_CALENDAR_ID: membersCalendarId,
      GO_EVENTS_TIMEZONE: timezone,
      GOOGLE_CALENDAR_API_KEY: apiKey,
      GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON: serviceAccountJson,
      GOOGLE_CALENDAR_CLIENT_EMAIL: clientEmail,
      GOOGLE_CALENDAR_PRIVATE_KEY: privateKey,
      GOOGLE_CALENDAR_PRIVATE_KEY_BASE64: privateKeyBase64,
      NEXT_PUBLIC_GO_EVENTS_CALENDAR_EMBED_URL: embedUrl,
      NEXT_PUBLIC_GO_EVENTS_CALENDAR_PUBLIC_URL: publicUrl,
    },
    derived: {
      resolvedPublicCalendarIdSet: Boolean(PUBLIC_CALENDAR_ID),
      resolvedMembersCalendarIdSet: Boolean(MEMBERS_CALENDAR_ID),
      resolvedTimezone: TIMEZONE,
      serviceAccountPath,
      apiKeySet: apiKey.set && !apiKey.emptyAfterTrim,
      likelyAuthMode:
        serviceAccountPath !== "none"
          ? "service-account"
          : apiKey.set && !apiKey.emptyAfterTrim
            ? "api-key"
            : "none",
      likelyMissingOrMisconfigured: missing,
      normalizedPrivateKey: inspectResolvedPrivateKey(),
    },
  };
}

function inspectResolvedPrivateKey() {
  try {
    const account = getServiceAccount();
    if (!account?.private_key) return { present: false };
    return { present: true, ...inspectNormalizedPem(account.private_key) };
  } catch (error) {
    return { present: true, inspectError: error instanceof Error ? error.message : "inspect failed" };
  }
}

export function logGoEventsEnvDiagnostics(reason = "request") {
  const diagnostics = getGoEventsEnvDiagnostics();
  console.log("[GO Events env debug]", reason, JSON.stringify(diagnostics, null, 2));
  return diagnostics;
}

function configurationError(message) {
  const error = new Error(message);
  error.code = "GO_EVENTS_CALENDAR_NOT_CONFIGURED";
  return error;
}

function calendarApiError(message, status = 502) {
  const error = new Error(message);
  error.code = "GO_EVENTS_CALENDAR_API_ERROR";
  error.status = status;
  return error;
}

function decodePrivateKeyFromEnv() {
  const b64 = process.env.GOOGLE_CALENDAR_PRIVATE_KEY_BASE64?.trim();
  if (b64) {
    try {
      return Buffer.from(b64, "base64").toString("utf8");
    } catch {
      throw configurationError("GOOGLE_CALENDAR_PRIVATE_KEY_BASE64 is not valid base64.");
    }
  }
  return process.env.GOOGLE_CALENDAR_PRIVATE_KEY;
}

function getServiceAccount() {
  const json = process.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON?.trim();
  if (json) {
    try {
      const parsed = JSON.parse(json);
      if (parsed.client_email && parsed.private_key) {
        return {
          client_email: String(parsed.client_email).trim(),
          private_key: normalizePemPrivateKey(parsed.private_key),
        };
      }
    } catch {
      throw configurationError("GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON is invalid JSON.");
    }
  }

  const clientEmail = process.env.GOOGLE_CALENDAR_CLIENT_EMAIL?.trim();
  const privateKey = normalizePemPrivateKey(decodePrivateKeyFromEnv());
  if (clientEmail && privateKey) {
    return { client_email: clientEmail, private_key: privateKey };
  }

  return null;
}

function loadServiceAccountSigningKey(pem) {
  const normalized = normalizePemPrivateKey(pem);
  if (!normalized.includes("BEGIN PRIVATE KEY") && !normalized.includes("BEGIN RSA PRIVATE KEY")) {
    throw configurationError(
      "Google Calendar service account private key is invalid. Missing BEGIN PRIVATE KEY header after Vercel/env normalization."
    );
  }

  try {
    return createPrivateKey({ key: normalized, format: "pem" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown crypto error";
    throw configurationError(`Google Calendar service account private key is invalid. ${message}`);
  }
}

async function getServiceAccountToken() {
  const now = Math.floor(Date.now() / 1000);
  if (serviceAccountTokenCache && serviceAccountTokenCache.expiresAt - 60 > now) {
    return serviceAccountTokenCache.token;
  }

  const account = getServiceAccount();
  if (!account) return null;

  const privateKey = loadServiceAccountSigningKey(account.private_key);

  const assertion = await new SignJWT({
    scope: "https://www.googleapis.com/auth/calendar.readonly",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(account.client_email)
    .setAudience(GOOGLE_OAUTH_TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw configurationError("Google Calendar service account authorization failed.");
  }

  const data = await response.json();
  if (!data.access_token) {
    throw configurationError("Google Calendar authorization returned no access token.");
  }

  serviceAccountTokenCache = {
    token: data.access_token,
    expiresAt: now + Number(data.expires_in || 3600),
  };
  return data.access_token;
}

async function getCalendarRequestOptions(source) {
  const serviceToken = await getServiceAccountToken();
  if (serviceToken) {
    return { headers: { Authorization: `Bearer ${serviceToken}` } };
  }

  if (source === "members") {
    throw configurationError(
      "GO_EVENTS_MEMBERS_CALENDAR_ID requires a server-side Google Calendar credential."
    );
  }

  const apiKey = process.env.GOOGLE_CALENDAR_API_KEY?.trim();
  if (!apiKey) {
    throw configurationError(
      "Set GOOGLE_CALENDAR_API_KEY to load the public GO Calendar."
    );
  }

  return { searchParams: { key: apiKey } };
}

function buildFields() {
  return "items(id,recurringEventId,summary,description,start,end,location,htmlLink,status,organizer,conferenceData,hangoutLink,extendedProperties),nextPageToken";
}

async function googleFetch(url, options = {}) {
  const response = await fetch(url, { ...options, cache: "no-store" });
  if (!response.ok) {
    const error = calendarApiError(
      `Google Calendar request failed with status ${response.status}.`,
      response.status === 404 ? 404 : 502
    );
    throw error;
  }
  return response.json();
}

async function fetchCalendarEvents(calendarId, source, { timeMin, timeMax } = {}) {
  const cacheKey = `${calendarId}:${source}:${timeMin}:${timeMax}`;
  const cached = eventListCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const options = await getCalendarRequestOptions(source);
  const url = new URL(`${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`);
  const params = {
    singleEvents: "true",
    orderBy: "startTime",
    showDeleted: "false",
    maxResults: "2500",
    timeZone: TIMEZONE,
    fields: buildFields(),
  };
  if (timeMin) params.timeMin = timeMin;
  if (timeMax) params.timeMax = timeMax;
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  Object.entries(options.searchParams || {}).forEach(([key, value]) => url.searchParams.set(key, value));

  const data = await googleFetch(url, { headers: options.headers });
  const items = Array.isArray(data.items) ? data.items : [];
  eventListCache.set(cacheKey, { data: items, expiresAt: Date.now() + CACHE_TTL_MS });
  return items;
}

async function fetchCalendarEvent(calendarId, source, eventId) {
  const options = await getCalendarRequestOptions(source);
  const url = new URL(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`
  );
  url.searchParams.set("fields", buildFields().replace(",nextPageToken", ""));
  Object.entries(options.searchParams || {}).forEach(([key, value]) => url.searchParams.set(key, value));
  return googleFetch(url, { headers: options.headers });
}

function sourceEntries() {
  const sources = [{ id: PUBLIC_CALENDAR_ID, source: "public" }];
  if (MEMBERS_CALENDAR_ID) sources.unshift({ id: MEMBERS_CALENDAR_ID, source: "members" });
  return sources;
}

export async function getUpcomingGoEvents({ now = new Date() } = {}) {
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + EVENT_WINDOW_MS).toISOString();
  const sourceResults = await Promise.all(
    sourceEntries().map(async ({ id, source }) => ({
      source,
      items: await fetchCalendarEvents(id, source, { timeMin, timeMax }),
    }))
  );

  const byId = new Map();
  for (const result of sourceResults) {
    for (const item of result.items) {
      const normalized = normalizeCalendarEvent(item, { source: result.source, timezone: TIMEZONE });
      if (!normalized || normalized.status === "cancelled") continue;
      byId.set(normalized.id, normalized);
    }
  }

  const events = [...byId.values()]
    .filter((event) => getEventTimestamp(event) >= now.getTime())
    .sort((a, b) => getEventTimestamp(a) - getEventTimestamp(b));

  return {
    events,
    nextEvent: events[0] || null,
    timezone: TIMEZONE,
    configured: true,
    fetchedAt: new Date().toISOString(),
  };
}

export async function getCalendarEventForJoin(eventId) {
  if (typeof eventId !== "string" || !/^[a-zA-Z0-9_-]{1,200}$/.test(eventId)) {
    const error = new Error("Invalid event id.");
    error.code = "GO_EVENTS_INVALID_EVENT_ID";
    error.status = 400;
    throw error;
  }

  let lastError = null;
  for (const { id, source } of sourceEntries()) {
    try {
      const event = await fetchCalendarEvent(id, source, eventId);
      const access = getEventAccess(event, source);
      if (access === "members" && source !== "members") {
        throw configurationError(
          "Members-only GO events must be stored in GO_EVENTS_MEMBERS_CALENDAR_ID before a Meet link can be issued."
        );
      }
      return { event, source };
    } catch (error) {
      lastError = error;
      if (error?.status !== 404) throw error;
    }
  }

  const error = new Error("GO event not found.");
  error.code = "GO_EVENTS_EVENT_NOT_FOUND";
  error.status = 404;
  error.cause = lastError;
  throw error;
}

export function getJoinUrlFromCalendarEvent(event, source = "public") {
  const access = getEventAccess(event, source);
  const joinUrl = getVideoJoinUrl(event);
  return { access, joinUrl };
}

export { MEMBERS_CALENDAR_ID, PUBLIC_CALENDAR_ID, TIMEZONE };
