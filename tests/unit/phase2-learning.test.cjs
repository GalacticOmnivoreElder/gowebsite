const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const visibility = loadSourceModule("src/lib/content-visibility.js", ["isPublicLearningStatus"]);
const training = loadSourceModule(
  "src/lib/training-assignments.js",
  ["isTrainingAssignmentActive", "trainingAssignmentId"],
  { stripImports: true, sandbox: { adminDb: {} } }
);
const learning = loadSourceModule(
  "src/lib/learning-items.js",
  [
    "ACTIVE_ENROLLMENT_STATES",
    "cleanLearningItem",
    "isActiveEnrollmentState",
    "isLearningManager",
    "toPublicLearningItemDto",
    "validateEnrollmentAnswers",
  ],
  { stripImports: true, sandbox: visibility }
);

function baseItem(overrides = {}) {
  return learning.cleanLearningItem({
    slug: "atomic-workshop",
    title: "Atomic Workshop",
    description: "A capacity-controlled workshop.",
    status: "enrollment_open",
    waitlistEnabled: true,
    capacity: 2,
    accessType: "free",
    ...overrides,
  });
}

test("Phase 2 learning models enforce public data and custom question rules", () => {
  const item = baseItem({
    customQuestions: [
      { id: "portfolio", label: "Portfolio", type: "portfolio_link", required: true },
      { id: "access", label: "Accessibility", type: "accessibility_request" },
      { id: "level", label: "Experience", type: "multiple_choice", options: ["new", "experienced"] },
    ],
    invitedUserIds: ["private-user"],
  });
  const answers = learning.validateEnrollmentAnswers(item.customQuestions, {
    portfolio: "https://example.com/work",
    access: "Captions, please",
    level: "new",
  });
  assert.equal(answers.access, "Captions, please");
  assert.throws(() => learning.validateEnrollmentAnswers(item.customQuestions, { portfolio: "http://unsafe.test" }), /HTTPS/);

  const dto = learning.toPublicLearningItemDto({ id: "learning-1", ...item });
  assert.equal(dto.slug, "atomic-workshop");
  assert.equal(dto.placesRemaining, 2);
  assert.equal(Object.hasOwn(dto, "invitedUserIds"), false);
  assert.equal(learning.isLearningManager(item, { uid: "private-user" }), false);
  assert.equal(learning.isLearningManager({ ...item, instructorUserId: "teacher" }, { uid: "teacher" }), true);
});

function createTransactionalDb(initialItem) {
  const records = new Map([["learning_items/item-1", { ...initialItem }]]);
  let lock = Promise.resolve();
  const ref = (collection, id) => ({ collection, id, path: `${collection}/${id}` });
  const snapshot = (reference) => ({
    id: reference.id,
    exists: records.has(reference.path),
    data: () => ({ ...records.get(reference.path) }),
  });
  return {
    records,
    collection(name) {
      return { doc: (id) => ref(name, id) };
    },
    runTransaction(callback) {
      const run = lock.then(async () => callback({
        get: async (reference) => snapshot(reference),
        set: (reference, value) => records.set(reference.path, { ...value }),
        update: (reference, value) => records.set(reference.path, { ...records.get(reference.path), ...value }),
      }));
      lock = run.catch(() => undefined);
      return run;
    },
  };
}

test("parallel enrollment attempts never overbook finite capacity", async () => {
  const service = loadSourceModule(
    "src/lib/learning-enrollment.js",
    ["createLearningEnrollment", "getLearningEligibility"],
    {
      stripImports: true,
      sandbox: {
        ...learning,
        ...training,
        adminDb: {},
        hasCommunityContentAccess: (data, options = {}) => options.admin === true || ["community", "business"].includes(data.membershipTier),
        createProductNotification: async () => ({ id: "notice" }),
        enqueueEmailEventForUsers: async () => ({ queued: 1 }),
        getLearningProductConfig: () => ({ waitlistConfirmationHours: 48 }),
      },
    }
  );
  const item = baseItem();
  const db = createTransactionalDb(item);
  const attempts = Array.from({ length: 20 }, (_, index) => service.createLearningEnrollment({
    itemId: "item-1",
    user: { uid: `user-${index}`, userData: { username: `Participant ${index}` } },
    db,
    now: new Date("2026-08-03T12:00:00Z"),
  }));
  const results = await Promise.all(attempts);
  assert.equal(results.filter((result) => result.state === "confirmed").length, 2);
  assert.equal(results.filter((result) => result.state === "waitlisted").length, 18);
  assert.equal(db.records.get("learning_items/item-1").confirmedCount, 2);
  assert.equal(db.records.get("learning_items/item-1").waitlistCount, 18);
});

test("learning access recognizes free, Community, Business, invitation, and approval flows", () => {
  const service = loadSourceModule(
    "src/lib/learning-enrollment.js",
    ["getLearningEligibility"],
    {
      stripImports: true,
      sandbox: {
        ...learning,
        ...training,
        adminDb: {},
        hasCommunityContentAccess: (data, options = {}) => options.admin === true || ["community", "business"].includes(data.membershipTier),
      },
    }
  );
  const user = (tier) => ({ uid: tier, userData: { membershipTier: tier } });
  assert.equal(service.getLearningEligibility(baseItem(), user("free")).allowed, true);
  assert.equal(service.getLearningEligibility(baseItem({ accessType: "community_member_only" }), user("community")).allowed, true);
  assert.equal(service.getLearningEligibility(baseItem({ accessType: "community_member_only" }), user("business")).allowed, true);
  assert.equal(service.getLearningEligibility(baseItem({ accessType: "community_member_only" }), user("free")).reason, "community_membership_required");
  assert.equal(service.getLearningEligibility(baseItem({ accessType: "invitation_only", invitedUserIds: ["invitee"] }), { uid: "invitee", userData: {} }).allowed, true);
  assert.equal(service.getLearningEligibility(baseItem({ accessType: "administrator_approved" }), user("free")).allowed, true);
});
