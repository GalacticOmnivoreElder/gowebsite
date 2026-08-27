import { createPrivateKey } from "crypto";
import { SignJWT } from "jose";

import {
  getEventAccess,
  getEventTimestamp,
  getVideoJoinUrl,
  normalizeCalendarEvent,
} from "@/lib/go-events-core";
import { normalizePemPrivateKey } from "@/lib/pem-private-key";

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
    throw configurationError("Google Calendar service account private key is invalid.");
  }

  try {
    return createPrivateKey({ key: normalized, format: "pem" });
  } catch {
    throw configurationError("Google Calendar service account private key is invalid.");
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
