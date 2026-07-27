const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const profileSource = fs.readFileSync(
  path.resolve(__dirname, "../../src/components/profile/ProfileEditor.jsx"),
  "utf8"
);
const onboardingSource = fs.readFileSync(
  path.resolve(__dirname, "../../src/app/onboarding/page.js"),
  "utf8"
);
const selectorSource = fs.readFileSync(
  path.resolve(__dirname, "../../src/components/profile/SkillSelector.jsx"),
  "utf8"
);

test("profile and onboarding share the accessible community skill selector", () => {
  assert.match(profileSource, /<SkillSelector/);
  assert.match(onboardingSource, /<SkillSelector/);
  assert.match(onboardingSource, /Skills & expertise \(optional\)/);
  assert.match(selectorSource, /\/api\/skills\?popular=true&limit=20/);
  assert.match(selectorSource, /Popular community skills/);
  assert.match(selectorSource, /aria-pressed=\{selected\}/);
  assert.match(selectorSource, /MAX_PROFILE_SKILLS/);
  assert.doesNotMatch(selectorSource, /Choose from the skill directory/);
});
