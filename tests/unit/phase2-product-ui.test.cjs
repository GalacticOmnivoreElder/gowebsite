const assert = require("node:assert/strict");
const fs = require("node:fs");
const { test } = require("node:test");

function source(path) {
  return fs.readFileSync(path, "utf8");
}

test("Phase 2 product routes and screens are wired without paid-course checkout", () => {
  const education = source("src/app/education/page.js");
  const detail = source("src/components/learning/LearningDetail.jsx");
  const participant = source("src/components/learning/ParticipantManager.jsx");
  const profile = source("src/app/(main)/profile/page.js");
  const bundle = source("src/components/video-bundles/VideoBundleDetail.jsx");
  assert.match(education, /\/api\/learning-items/);
  assert.match(detail, /confirm_waitlist_offer/);
  assert.match(participant, /selectedEnrollmentIds/);
  assert.match(profile, /NotificationsPanel/);
  assert.match(profile, /LearningDashboard/);
  assert.match(bundle, /targetType/);
  assert.doesNotMatch(education + detail + bundle, /POLAR_MENTOR|individuallyPaidCourses|checkout/i);
});

test("Phase 2 protected URLs and sensitive collections remain server-side", () => {
  const publicBundleRoute = source("src/app/api/video-bundles/route.js");
  const openRoute = source("src/app/video-bundles/[slug]/open/route.js");
  const rules = source("firestore.rules");
  assert.match(publicBundleRoute, /toPublicVideoBundleDto/);
  assert.match(openRoute, /protected_link_tickets/);
  assert.match(openRoute, /consumedAt/);
  for (const collection of ["learning_items", "learning_enrollments", "product_notifications", "video_bundles", "video_bundle_progress", "training_assignments"]) {
    assert.match(rules, new RegExp(`match \\/${collection}\\/\\{doc\\}[^}]+if false`));
  }
});

test("learning surfaces use the approved customer-facing hierarchy and copy", () => {
  const header = source("src/components/Header.jsx");
  const profileTabs = source("src/components/profile/ProfileSectionTabs.jsx");
  const videoBundles = source("src/app/video-bundles/page.js");
  const resources = source("src/app/resources/page.js");
  const education = source("src/app/education/page.js");
  const learningCategoryNav = source(
    "src/components/learning/LearningCategoryNav.jsx"
  );

  assert.match(header, /learningNavigation\.map/);
  assert.match(profileTabs, /xl:grid-cols-6/);
  assert.match(profileTabs, /md:grid-cols-4/);
  assert.doesNotMatch(profileTabs, /overflow-x-auto|w-max/);

  assert.match(videoBundles, /Explore focused collections of game-development videos selected by GO/);
  assert.match(videoBundles, /No video bundles are available yet/);
  assert.doesNotMatch(videoBundles, /YouTube|Google Drive|GO controls access/);

  assert.match(learningCategoryNav, /learningNavigation\.map/);
  assert.match(learningCategoryNav, /aria-label="Learning categories"/);
  assert.match(learningCategoryNav, /grid-cols-2/);
  assert.match(learningCategoryNav, /lg:grid-cols-4/);
  assert.match(education, /activeItem=/);
  assert.match(education, /EDUCATION_STREAMS\.WORKSHOPS\.title/);
  assert.match(videoBundles, /activeItem="Video Bundles"/);
  assert.match(resources, /activeItem="Resources"/);

  assert.match(resources, /Explore practical game-development material shared or selected by/);
  assert.match(resources, /isApril2025Resource/);
  assert.match(resources, /april2025Resource \|\| sortedResources\[0\]/);
  assert.doesNotMatch(resources, /Explore learning/);
});
