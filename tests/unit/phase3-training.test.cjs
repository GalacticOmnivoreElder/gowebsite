const assert = require("node:assert/strict");
const fs = require("node:fs");
const { test } = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const training = loadSourceModule(
  "src/lib/training-assignments.js",
  [
    "hasActiveTrainingAssignment",
    "isTrainingAssignmentActive",
    "serializeTrainingAssignment",
    "trainingAssignmentId",
    "TRAINING_CONTENT_TYPES",
  ],
  { stripImports: true, sandbox: { adminDb: {} } }
);

test("training assignments are deterministic, item-specific, revocable, and expiring", async () => {
  const first = training.trainingAssignmentId("user-1", "video_bundle", "bundle-1");
  const second = training.trainingAssignmentId("user-1", "video_bundle", "bundle-2");
  assert.equal(first.length, 64);
  assert.notEqual(first, second);
  assert.equal(training.isTrainingAssignmentActive({ status: "active" }, new Date("2026-08-03")), true);
  assert.equal(training.isTrainingAssignmentActive({ status: "revoked" }, new Date("2026-08-03")), false);
  assert.equal(training.isTrainingAssignmentActive({ status: "active", expiresAt: new Date("2026-08-02") }, new Date("2026-08-03")), false);

  const assignment = { status: "active", expiresAt: new Date("2026-08-04") };
  const db = {
    collection: (name) => ({
      doc: (id) => ({
        get: async () => ({ exists: name === "training_assignments" && id === first, data: () => assignment }),
      }),
    }),
  };
  assert.equal(await training.hasActiveTrainingAssignment({ userId: "user-1", contentType: "video_bundle", contentId: "bundle-1", db, now: new Date("2026-08-03") }), true);
  assert.equal(await training.hasActiveTrainingAssignment({ userId: "user-1", contentType: "video_bundle", contentId: "bundle-2", db, now: new Date("2026-08-03") }), false);
});

test("an exact training assignment grants learning eligibility without changing membership", () => {
  const learning = loadSourceModule(
    "src/lib/learning-enrollment.js",
    ["getLearningEligibility"],
    {
      stripImports: true,
      sandbox: {
        ...training,
        adminDb: {},
        ACTIVE_ENROLLMENT_STATES: [],
        hasCommunityContentAccess: () => false,
      },
    }
  );
  const item = { status: "enrollment_open", accessType: "community_member_only" };
  const user = { uid: "candidate", userData: { membershipTier: null, mentorStatus: "applicant" } };
  assert.equal(learning.getLearningEligibility(item, user).reason, "community_membership_required");
  assert.deepEqual(
    JSON.parse(JSON.stringify(learning.getLearningEligibility(item, user, new Date(), { trainingAssigned: true }))),
    { allowed: true, reason: "training_assignment" }
  );
});

test("admin training grants persist even if email delivery fails", async () => {
  const records = new Map();
  const audits = [];
  const notices = [];
  const content = { title: "Environment Art", slug: "environment-art", status: "enrollment_open" };
  const snapshot = (id, value) => ({ id, exists: value !== undefined, data: () => value });
  const db = {
    collection(name) {
      if (name === "admin_audit_events") return { add: async (value) => audits.push(value) };
      if (name === "training_assignments") {
        return {
          doc(id) {
            return {
              get: async () => snapshot(id, records.get(id)),
              set: async (value) => records.set(id, value),
              update: async (value) => records.set(id, { ...records.get(id), ...value }),
            };
          },
        };
      }
      if (name === "users") return { doc: (id) => ({ get: async () => snapshot(id, id === "candidate" ? { email: "candidate@example.com" } : undefined) }) };
      if (name === "learning_items") return { doc: (id) => ({ get: async () => snapshot(id, id === "course-1" ? content : undefined) }) };
      throw new Error(`Unexpected collection ${name}`);
    },
  };
  const route = loadSourceModule(
    "src/app/api/admin/training-assignments/route.js",
    ["POST"],
    {
      stripImports: true,
      sandbox: {
        Response,
        adminDb: db,
        ...training,
        canListLearningItem: (item) => item.status === "enrollment_open",
        createProductNotification: async (value) => notices.push(value),
        enqueueEmailEventForUsers: async () => { throw new Error("email unavailable"); },
        getRequestUser: async () => ({ uid: "admin-1", admin: true }),
        isPublicVideoBundleStatus: (status) => status === "published",
      },
    }
  );
  const request = {
    json: async () => ({ userId: "candidate", contentType: "learning_item", contentId: "course-1", reason: "Preparation for future mentor work" }),
  };
  const response = await route.POST(request);
  const result = await response.json();
  assert.equal(response.status, 201);
  assert.equal(result.status, "active");
  assert.equal(records.size, 1);
  assert.equal([...records.values()][0].grantedBy, "admin-1");
  assert.equal(notices.length, 1);
  assert.equal(audits.length, 1);

  const duplicate = await route.POST(request);
  assert.equal(duplicate.status, 409);
});

test("training assignment administration rejects direct unauthenticated access", async () => {
  const route = loadSourceModule(
    "src/app/api/admin/training-assignments/route.js",
    ["POST"],
    {
      stripImports: true,
      sandbox: {
        Response,
        adminDb: {},
        ...training,
        getRequestUser: async () => null,
      },
    }
  );
  const response = await route.POST({ json: async () => ({}) });
  assert.equal(response.status, 401);
});

test("Phase 3 training UI and security avoid fixtures and Polar coupling", () => {
  const adminSource = fs.readFileSync("src/app/admin/training-assignments/page.js", "utf8");
  const routeSource = fs.readFileSync("src/app/api/admin/training-assignments/route.js", "utf8");
  const rules = fs.readFileSync("firestore.rules", "utf8");
  assert.match(adminSource, />Reason</);
  assert.match(adminSource, /optional expiry/i);
  assert.match(routeSource, /grantedBy/);
  assert.match(routeSource, /Promise\.allSettled/);
  assert.doesNotMatch(routeSource, /POLAR_MENTOR|checkout/i);
  assert.match(rules, /match \/training_assignments\/\{doc\}\s+\{ allow read, write: if false; \}/);
});
