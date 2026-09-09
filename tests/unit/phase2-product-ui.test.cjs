const assert = require("node:assert/strict");
const fs = require("node:fs");
const { test } = require("node:test");
const source = (path) => fs.readFileSync(path, "utf8");

test("native learning routes and screens are wired without an external application flow", () => {
  const education = source("src/app/education/page.js");
  const detail = source("src/components/learning/LearningDetail.jsx");
  const participant = source("src/components/learning/ParticipantManager.jsx");
  const profile = source("src/app/(main)/profile/page.js");
  assert.match(education, /\/api\/learning-items/);
  assert.doesNotMatch(education, /api\/wordpress|BlogCard/);
  assert.match(detail, /confirm_waitlist_offer/);
  assert.match(detail, /session-access/);
  assert.match(participant, /Application responses/);
  assert.match(profile, /LearningDashboard/);
});

test("learning navigation retains the customer-facing hierarchy", () => {
  const header = source("src/components/Header.jsx");
  const learningCategoryNav = source("src/components/learning/LearningCategoryNav.jsx");
  const education = source("src/app/education/page.js");
  assert.match(header, /learningNavigation\.map/);
  assert.match(learningCategoryNav, /aria-label="Learning categories"/);
  assert.match(education, /activeItem=/);
  assert.match(education, /Courses/);
  assert.match(education, /Workshops/);
});

test("private learning session access is server-authorized", () => {
  const route = source("src/app/api/learning-items/[slug]/session-access/route.js");
  const publicDto = source("src/lib/learning-items.js");
  assert.match(route, /Confirmed enrollment is required/);
  assert.match(route, /private, no-store/);
  assert.match(publicDto, /publicLocationText/);
});
