const SAFE_EVENT_NAME = /^[a-z][a-z0-9_]{0,39}$/;
const SAFE_IDENTIFIER = /^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,99}$/;
const SAFE_CATEGORY = /^[a-zA-Z0-9][a-zA-Z0-9._/ -]{0,79}$/;
const SENSITIVE_KEY = /(email|password|token|secret|phone|address|name|message|note|goal|bio|text|content_body|payment|card|credential)/i;

export const ANALYTICS_EVENTS = Object.freeze({
  page_view: ["page_path", "page_type"],
  navigation_clicked: ["cta_id", "destination_path", "navigation_area"],
  external_link_clicked: ["destination_category", "link_context"],
  calendar_embed_opened: ["source"],
  calendar_external_link_clicked: ["link_context"],
  events_calendar_loaded: ["source", "event_count"],
  event_detail_opened: ["content_id", "access_level"],
  event_join_attempted: ["content_id", "access_level"],
  event_join_succeeded: ["content_id", "access_level"],
  event_join_denied: ["content_id", "access_level", "error_category"],
  calendar_period_changed: ["direction"],
  event_route_clicked: ["event_route", "destination_path"],
  schedule_call_clicked: ["link_context"],
  signup_started: ["method", "flow"],
  signup_completed: ["method", "flow"],
  login_started: ["method"],
  login_completed: ["method"],
  login_failed: ["method", "error_category"],
  profile_setup_started: ["entry_point"],
  profile_setup_completed: ["entry_point"],
  membership_viewed: ["page_path"],
  membership_tier_selected: ["membership_tier", "billing_interval"],
  checkout_started: ["membership_tier", "billing_interval", "provider"],
  checkout_completed: [
    "membership_tier",
    "billing_interval",
    "provider",
    "confirmation_source",
  ],
  project_viewed: ["project_visibility", "project_type", "content_id"],
  project_creation_started: ["entry_point"],
  project_creation_completed: ["project_type", "project_visibility"],
  learning_content_viewed: ["content_type", "content_id"],
  course_viewed: ["content_id"],
  workshop_viewed: ["content_id"],
  resource_viewed: ["content_type", "content_id"],
  video_bundle_viewed: ["content_id"],
  mentorship_viewed: ["surface"],
  mentorship_request_started: ["flow", "entry_point"],
  mentorship_request_completed: ["flow", "request_mode"],
  form_started: ["form_id", "page_path"],
  form_completed: ["form_id", "page_path"],
  form_validation_error: ["form_id", "field_id", "error_type"],
});

function cleanString(value, pattern, maxLength = 100) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const clean = String(value).trim().slice(0, maxLength);
  if (/@/.test(clean) || /^eyJ[a-zA-Z0-9_-]+\./.test(clean)) return null;
  return clean && pattern.test(clean) ? clean : null;
}

function cleanPath(value) {
  if (typeof value !== "string") return null;
  const path = value.split(/[?#]/, 1)[0].trim();
  return path.startsWith("/") && !path.includes("\\")
    ? path.slice(0, 200)
    : null;
}

const DYNAMIC_PAGE_PATHS = [
  ["/project/", "/project/[id]"],
  ["/education/", "/education/[slug]"],
  ["/video-bundles/", "/video-bundles/[slug]"],
  ["/resources/", "/resources/[slug]"],
  ["/mentors/", "/mentors/[id]"],
];

function cleanValue(key, value) {
  if (SENSITIVE_KEY.test(key)) return null;
  if (key === "page_path" || key === "destination_path") {
    return cleanPath(value);
  }
  if (key === "content_id") {
    return cleanString(value, SAFE_IDENTIFIER, 100);
  }
  if (key === "error_category" || key === "field_id") {
    return cleanString(value, SAFE_CATEGORY, 80);
  }
  return cleanString(value, SAFE_CATEGORY, 100);
}

export function buildEventPayload(eventName, properties = {}) {
  if (!SAFE_EVENT_NAME.test(eventName) || !ANALYTICS_EVENTS[eventName]) {
    return null;
  }

  const allowedProperties = ANALYTICS_EVENTS[eventName];
  const payload = {};

  for (const key of allowedProperties) {
    const value = cleanValue(key, properties?.[key]);
    if (value !== null) payload[key] = value;
  }

  return payload;
}

export function getPageType(pathname = "/") {
  const path = pathname.split("?", 1)[0] || "/";
  if (path === "/") return "landing";
  if (path.startsWith("/education") || path.startsWith("/video-bundles")) return "learning";
  if (path.startsWith("/project") || path === "/projects") return "projects";
  if (path.startsWith("/membership") || path.startsWith("/pricing") || path.startsWith("/checkout")) return "membership";
  if (path.startsWith("/mentors") || path.startsWith("/matchmaking")) return "mentorship";
  if (path.startsWith("/events")) return "events";
  if (path.startsWith("/blog")) return "blog";
  if (path.startsWith("/resources")) return "resources";
  if (path.startsWith("/admin")) return "admin";
  return "page";
}

export function normalizePagePath(pathname = "/") {
  const path = cleanPath(pathname) || "/";
  const dynamicPath = DYNAMIC_PAGE_PATHS.find(([prefix]) =>
    path.startsWith(prefix)
  );
  return dynamicPath ? dynamicPath[1] : path;
}
