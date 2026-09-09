const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const { getEffectiveMembership } = loadSourceModule("src/lib/auth-utils.js", ["getEffectiveMembership"], { stripImports: true });
const entitlements = loadSourceModule("src/lib/content-entitlements.js", ["hasCommunityContentAccess", "hasMentorToolAccess", "hasResourceAccess", "hasAssetContributionAccess"], { stripImports: true, sandbox: { getEffectiveMembership } });

test("Community, Mentor, and Business memberships inherit shared content access", () => {
  for (const membershipTier of ["member", "mentor", "company"]) assert.equal(entitlements.hasCommunityContentAccess({ activeMember: true, membershipTier }), true);
  assert.equal(getEffectiveMembership({ activeMember: true, membershipTier: "member" }).canCreateProjects, false);
  assert.equal(getEffectiveMembership({ activeMember: true, membershipTier: "company" }).canCreateProjects, true);
});

test("resource unlocks and verified Mentor membership are explicit entitlements", () => {
  assert.equal(entitlements.hasResourceAccess("pack-1", { unlockedPackages: ["pack-1"] }), true);
  assert.equal(entitlements.hasResourceAccess("pack-2", { unlockedPackages: ["pack-1"] }), false);
  assert.equal(entitlements.hasMentorToolAccess({ activeMember: true, membershipTier: "mentor", mentorStatus: "approved" }), true);
  for (const user of [{ mentorStatus: "approved" }, { activeMember: true, membershipTier: "member", mentorStatus: "approved" }, { activeMember: true, membershipTier: "mentor", mentorStatus: "suspended" }]) assert.equal(entitlements.hasMentorToolAccess(user), false);
});

test("scheduled cancellation preserves Mentor tools until the paid-through date", () => {
  const now = new Date("2026-09-09T00:00:00.000Z");
  const user = { membershipTier: "mentor", mentorStatus: "approved", subscriptionStatus: "canceled", subscriptionEndsAt: "2026-10-09T00:00:00.000Z" };
  assert.equal(entitlements.hasMentorToolAccess(user, { now }), true);
  assert.equal(entitlements.hasMentorToolAccess(user, { now: new Date("2026-10-10T00:00:00.000Z") }), false);
});

test("unverified Mentor users cannot create or update asset submissions", async () => {
  for (const mentorStatus of ["applicant", "suspended"]) {
    const route = loadSourceModule("src/app/api/asset-packs/route.js", ["GET", "POST", "PATCH"], { stripImports: true, sandbox: { ...entitlements, Response, getProductConfig: () => ({ featureFlags: { communityAssetSubmissions: true } }), getRequestUser: async () => ({ uid: "mentor-buyer", userData: { activeMember: true, membershipTier: "mentor", mentorStatus } }), adminDb: { collection: () => { const query = { limit: () => query, where: () => query, get: async () => ({ docs: [] }) }; return query; } } } });
    assert.equal((await (await route.GET({})).json()).canSubmit, false);
    for (const method of ["POST", "PATCH"]) assert.equal((await route[method]({ json: async () => ({ submit: true }) })).status, 403);
  }
});
