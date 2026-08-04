const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const visibility = loadSourceModule("src/lib/content-visibility.js", ["isPublicVideoBundleStatus"]);
const training = loadSourceModule(
  "src/lib/training-assignments.js",
  ["hasActiveTrainingAssignment", "isTrainingAssignmentActive", "trainingAssignmentId"],
  { stripImports: true, sandbox: { adminDb: {} } }
);
const video = loadSourceModule(
  "src/lib/video-bundles.js",
  [
    "calculateVideoCompletion",
    "cleanVideoBundle",
    "hasVideoBundleAccess",
    "toPublicVideoBundleDto",
  ],
  {
    stripImports: true,
    sandbox: {
      ...visibility,
      ...training,
      adminDb: {},
      hasCommunityContentAccess: (data, options = {}) => options.admin === true || ["community", "business"].includes(data.membershipTier),
    },
  }
);

test("video bundle DTOs never expose external destinations", () => {
  const bundle = video.cleanVideoBundle({
    slug: "environment-art",
    title: "Environment Art",
    description: "A focused learning bundle.",
    status: "published",
    bundleUrl: "https://drive.google.com/example",
    lessons: [{ title: "Blocking", externalUrl: "https://youtube.com/watch?v=abc" }],
    supportingFiles: [{ title: "Checklist", externalUrl: "https://drive.google.com/checklist" }],
  });
  const dto = video.toPublicVideoBundleDto({ id: "bundle-1", ...bundle });
  const serialized = JSON.stringify(dto);
  assert.equal(dto.hasCompleteBundleLink, true);
  assert.equal(dto.lessons[0].linkIndex, 0);
  assert.doesNotMatch(serialized, /drive\.google\.com|youtube\.com|externalUrl|bundleUrl/);
  assert.equal(video.calculateVideoCompletion(4, [0, 2, 2]), 50);
  assert.equal(video.calculateVideoCompletion(4, [], true), 100);
});

test("video entitlement accepts Community and Business, or one active mentor assignment", async () => {
  const assignment = { exists: true, data: () => ({ status: "active", expiresAt: new Date("2026-09-01T00:00:00Z") }) };
  const mentorAssignmentId = training.trainingAssignmentId("mentor", "video_bundle", "bundle-1");
  const db = { collection: () => ({ doc: (id) => ({ get: async () => id === mentorAssignmentId ? assignment : { exists: false } }) }) };
  assert.equal(await video.hasVideoBundleAccess("bundle-1", { uid: "community", userData: { membershipTier: "community" } }, { db }), true);
  assert.equal(await video.hasVideoBundleAccess("bundle-1", { uid: "business", userData: { membershipTier: "business" } }, { db }), true);
  assert.equal(await video.hasVideoBundleAccess("bundle-1", { uid: "mentor", userData: { mentorStatus: "approved" } }, { db, now: new Date("2026-08-03T00:00:00Z") }), true);
  assert.equal(await video.hasVideoBundleAccess("bundle-1", { uid: "free", userData: {} }, { db }), false);
});

const notifications = loadSourceModule(
  "src/lib/product-notifications.js",
  ["cleanProductNotification", "serializeProductNotification"],
  {
    stripImports: true,
    sandbox: {
      adminDb: {},
      safeInternalRedirect: (value, fallback) => typeof value === "string" && /^\/(education|video-bundles|profile)(\/|\?|$)/.test(value) ? value : fallback,
    },
  }
);

test("notifications require approved internal actions and serialize only safe links", () => {
  assert.throws(() => notifications.cleanProductNotification({
    recipientUserId: "user-1",
    type: "course_update",
    title: "Unsafe",
    message: "Unsafe action",
    actionUrl: "https://attacker.test",
  }), /approved internal action/);
  const clean = notifications.cleanProductNotification({
    recipientUserId: "user-1",
    type: "course_update",
    title: "Workshop update",
    message: "The start time changed.",
    actionUrl: "/education/workshop",
  }, new Date("2026-08-03T00:00:00Z"));
  assert.equal(clean.readAt, null);
  assert.equal(notifications.serializeProductNotification("n-1", { ...clean, actionUrl: "https://attacker.test" }).actionUrl, "/profile");
});

test("notification read actions cannot mutate another user's notification", async () => {
  const records = new Map([
    ["own", { recipientUserId: "user-1", readAt: null }],
    ["other", { recipientUserId: "user-2", readAt: null }],
  ]);
  const adminDb = {
    collection: () => ({
      doc: (id) => ({
        get: async () => ({ exists: records.has(id), data: () => records.get(id) }),
        update: async (updates) => records.set(id, { ...records.get(id), ...updates }),
      }),
    }),
  };
  const route = loadSourceModule("src/app/api/notifications/route.js", ["PATCH"], {
    stripImports: true,
    sandbox: {
      Response,
      adminDb,
      getRequestUser: async () => ({ uid: "user-1" }),
      getProductConfig: () => ({ featureFlags: { userNotifications: true } }),
      serializeProductNotification: () => ({}),
    },
  });
  const request = (notificationId) => ({ json: async () => ({ notificationId }) });
  assert.equal((await route.PATCH(request("other"))).status, 404);
  assert.equal(records.get("other").readAt, null);
  assert.equal((await route.PATCH(request("own"))).status, 200);
  assert.ok(records.get("own").readAt instanceof Date);
});

test("video open tickets return only a same-origin URL and store no destination", async () => {
  let storedTicket = null;
  const adminDb = {
    collection: (name) => ({
      doc: () => name === "video_bundles"
        ? { get: async () => ({ exists: true, data: () => ({ status: "published", bundleUrl: "https://youtube.com/watch?v=secret" }) }) }
        : { set: async (value) => { storedTicket = value; } },
    }),
  };
  const route = loadSourceModule("src/app/video-bundles/[slug]/open/route.js", ["POST"], {
    stripImports: true,
    sandbox: {
      Response,
      adminDb,
      getProductConfig: () => ({ featureFlags: { videoBundles: true } }),
      getRequestUser: async () => ({ uid: "member-1", userData: { membershipTier: "community" } }),
      hasVideoBundleAccess: async () => true,
      ...training,
      isPublicVideoBundleStatus: (status) => status === "published",
    },
  });
  const response = await route.POST(
    { json: async () => ({ targetType: "bundle" }) },
    { params: Promise.resolve({ slug: "bundle-1" }) }
  );
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.match(body.openUrl, /^\/video-bundles\/bundle-1\/open\?ticket=/);
  assert.doesNotMatch(JSON.stringify(body), /youtube\.com|secret/);
  assert.equal(Object.hasOwn(storedTicket, "destination"), false);
  assert.equal(storedTicket.videoBundleId, "bundle-1");
});
