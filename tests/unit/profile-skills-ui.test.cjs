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
const downloadsSource = fs.readFileSync(
  path.resolve(__dirname, "../../src/components/profile/Downloads.jsx"),
  "utf8"
);
const pricingSource = fs.readFileSync(
  path.resolve(__dirname, "../../src/components/pricing/PricingDisplay.js"),
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

test("onboarding accepts directory-backed roles, custom tools, and optional Discord", () => {
  assert.match(onboardingSource, /<SkillTagInput/);
  assert.match(onboardingSource, /Secondary roles \(optional\)/);
  assert.match(onboardingSource, /Common tools and engines/);
  assert.match(onboardingSource, /Discord username \(optional\)/);
  assert.match(onboardingSource, /Join the GO Discord/);
  assert.match(
    selectorSource,
    /onChange=\{\(event\) => onChange\(event\.target\.value\)\}/
  );
  assert.match(
    selectorSource,
    /onBlur=\{\(event\) => onChange\(normalizeSkillName/
  );
});

test("downloads use authenticated server entitlements instead of legacy client flags", () => {
  assert.match(downloadsSource, /\/api\/user\/packages/);
  assert.match(downloadsSource, /Authorization: `Bearer \$\{token\}`/);
  assert.match(downloadsSource, /unlockedPackageIds\.has\(pkg\.id\)/);
  assert.doesNotMatch(downloadsSource, /unlockedPackages\.includes/);
});

test("membership UI identifies the current plan and highlights Business upgrades", () => {
  assert.match(pricingSource, /Current membership/);
  assert.match(pricingSource, /isUpgradeTarget/);
  assert.match(pricingSource, /isHighlighted/);
  assert.match(pricingSource, /useServerCheckout/);
});

test("active Business membership is managed without offering another purchase", () => {
  assert.match(pricingSource, /GO Business is active/);
  assert.match(pricingSource, /Included with Business/);
  assert.match(pricingSource, /Included with GO Business/);
  assert.match(pricingSource, /Manage Business membership/);
  assert.match(pricingSource, /Manage current membership/);
  assert.match(pricingSource, /href="\/billing"/);
});
