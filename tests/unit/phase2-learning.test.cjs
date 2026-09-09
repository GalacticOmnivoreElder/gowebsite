const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const visibility = loadSourceModule("src/lib/content-visibility.js", ["isPublicLearningStatus"]);
const learning = loadSourceModule("src/lib/learning-items.js", ["ACTIVE_ENROLLMENT_STATES", "cleanLearningItem", "isActiveEnrollmentState", "isLearningManager", "toPublicLearningItemDto", "validateEnrollmentAnswers"], { stripImports: true, sandbox: { ...visibility, hasMentorToolAccess: (data) => data.mentorStatus === "approved" && data.activeMember === true && data.membershipTier === "mentor" } });

function baseItem(overrides = {}) { return learning.cleanLearningItem({ slug: "atomic-workshop", title: "Atomic Workshop", description: "A capacity-controlled workshop.", status: "enrollment_open", waitlistEnabled: true, capacity: 2, accessType: "free", ...overrides }); }

test("learning models protect private links and validate application questions", () => {
  const item = baseItem({ location: "https://meet.example/private", customQuestions: [{ id: "portfolio", label: "Portfolio", type: "portfolio_link", required: true }, { id: "access", label: "Accessibility", type: "accessibility_request" }] });
  const answers = learning.validateEnrollmentAnswers(item.customQuestions, { portfolio: "https://example.com/work", access: "Captions, please" });
  assert.equal(answers.access, "Captions, please");
  assert.throws(() => learning.validateEnrollmentAnswers(item.customQuestions, { portfolio: "http://unsafe.test" }), /HTTPS/);
  const dto = learning.toPublicLearningItemDto({ id: "learning-1", ...item });
  assert.equal(dto.placesRemaining, 2);
  assert.equal(dto.location, "");
  assert.doesNotMatch(JSON.stringify(dto), /meet\.example|privateSessionUrl|invitedUserIds/);
});

test("assigned instructors require verified paid Mentor access", () => {
  const item = baseItem({ instructorUserId: "teacher" });
  assert.equal(learning.isLearningManager(item, { uid: "teacher", userData: { activeMember: true, membershipTier: "mentor", mentorStatus: "approved" } }), true);
  assert.equal(learning.isLearningManager(item, { uid: "teacher", userData: { activeMember: true, membershipTier: "mentor", mentorStatus: "suspended" } }), false);
  assert.equal(learning.isLearningManager(item, { uid: "other", admin: true }), true);
});

test("active enrollment states remain explicit", () => {
  for (const state of learning.ACTIVE_ENROLLMENT_STATES) assert.equal(learning.isActiveEnrollmentState(state), true);
  assert.equal(learning.isActiveEnrollmentState("declined"), false);
});
