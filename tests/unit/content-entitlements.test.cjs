const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const { getEffectiveMembership } = loadSourceModule("src/lib/auth-utils.js", ["getEffectiveMembership"], { stripImports: true });
const entitlements = loadSourceModule("src/lib/content-entitlements.js", ["hasCommunityContentAccess", "hasMentorToolAccess", "hasResourceAccess"], { stripImports: true, sandbox: { getEffectiveMembership } });

test("Community and Business inherit resource access without changing project creation", () => {
  assert.equal(entitlements.hasCommunityContentAccess({ activeMember: true, membershipTier: "member" }), true);
  assert.equal(entitlements.hasCommunityContentAccess({ activeMember: true, membershipTier: "company" }), true);
  assert.equal(getEffectiveMembership({ activeMember: true, membershipTier: "member" }).canCreateProjects, false);
  assert.equal(getEffectiveMembership({ activeMember: true, membershipTier: "company" }).canCreateProjects, true);
});

test("resource unlocks and approved mentors are explicit entitlements", () => {
  assert.equal(entitlements.hasResourceAccess("pack-1", { unlockedPackages: ["pack-1"] }), true);
  assert.equal(entitlements.hasResourceAccess("pack-2", { unlockedPackages: ["pack-1"] }), false);
  assert.equal(entitlements.hasMentorToolAccess({ mentorStatus: "approved" }), true);
  for (const status of [undefined, "pending", "temporarily_unavailable", "suspended", "inactive", "rejected"]) {
    assert.equal(entitlements.hasMentorToolAccess({ mentorStatus: status }), false);
  }
});
