const test = require("node:test");
const assert = require("node:assert/strict");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const events = loadSourceModule("src/lib/analytics/events.js", [
  "ANALYTICS_EVENTS",
  "buildEventPayload",
  "getPageType",
  "normalizePagePath",
]);
const consent = loadSourceModule("src/lib/analytics/consent.js", [
  "CONSENT_STORAGE_KEY",
  "DEFAULT_CONSENT",
  "normalizeConsent",
  "readConsent",
  "writeConsent",
  "isAnalyticsConsentGranted",
]);

test("analytics event payloads are allowlisted and normalized", () => {
  assert.deepEqual(
    JSON.parse(JSON.stringify(events.buildEventPayload("navigation_clicked", {
      cta_id: "hero_join",
      destination_path: "/signup?redirect=/profile",
      navigation_area: "hero",
      ignored: "should not be included",
    }))),
    {
      cta_id: "hero_join",
      destination_path: "/signup",
      navigation_area: "hero",
    }
  );
});

test("unknown events and sensitive values are rejected safely", () => {
  assert.equal(events.buildEventPayload("not_registered", { value: "x" }), null);
  assert.deepEqual(
    JSON.parse(JSON.stringify(events.buildEventPayload("project_viewed", {
      content_id: "person@example.com",
      project_visibility: "Public",
      project_type: "Game Development",
    }))),
    {
      project_visibility: "Public",
      project_type: "Game Development",
    }
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(events.buildEventPayload("login_failed", {
      method: "email",
      error_category: "auth/invalid-credential",
      password: "secret-value",
    }))),
    { method: "email", error_category: "auth/invalid-credential" }
  );
});

test("page types are stable and do not include query strings", () => {
  assert.equal(events.getPageType("/"), "landing");
  assert.equal(events.getPageType("/education/course?enroll=1"), "learning");
  assert.equal(events.getPageType("/admin/dashboard"), "admin");
  assert.equal(events.getPageType("/unknown?email=person@example.com"), "page");
});

test("dynamic page views use route templates instead of private identifiers", () => {
  assert.equal(
    events.normalizePagePath("/project/private-project-123?tab=team"),
    "/project/[id]"
  );
  assert.equal(
    events.normalizePagePath("/education/course-1?enroll=1"),
    "/education/[slug]"
  );
  assert.equal(events.normalizePagePath("/about?utm_source=test"), "/about");
});

test("consent is normalized, essential, and storage-safe", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  };

  assert.deepEqual(JSON.parse(JSON.stringify(consent.normalizeConsent({ functional: true }))), {
    essential: true,
    functional: true,
    analytics: false,
  });
  assert.equal(consent.readConsent(storage), null);
  const saved = consent.writeConsent({ analytics: true }, storage);
  assert.equal(saved.essential, true);
  assert.equal(consent.isAnalyticsConsentGranted(consent.readConsent(storage)), true);
  assert.equal(values.has(consent.CONSENT_STORAGE_KEY), true);
});
