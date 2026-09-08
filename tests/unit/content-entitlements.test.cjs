const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const { getEffectiveMembership } = loadSourceModule("src/lib/auth-utils.js", ["getEffectiveMembership"], { stripImports: true });
const entitlements = loadSourceModule("src/lib/content-entitlements.js", ["hasCommunityContentAccess", "hasMentorToolAccess", "hasResourceAccess", "hasAssetContributionAccess"], { stripImports: true, sandbox: { getEffectiveMembership } });

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

test("Mentor subscribers must be verified before producing assets while normal member contributions remain available", () => {
  for (const mentorStatus of [undefined, "none", "applicant", "suspended", "rejected", "inactive"]) {
    assert.equal(entitlements.hasAssetContributionAccess({ activeMember: true, membershipTier: "mentor", mentorStatus }), false);
  }
  assert.equal(entitlements.hasAssetContributionAccess({ activeMember: true, membershipTier: "mentor", mentorStatus: "approved" }), true);
  assert.equal(entitlements.hasAssetContributionAccess({ activeMember: false, membershipTier: "mentor", mentorStatus: "approved" }), false);
  for (const membershipTier of ["member", "company"]) {
    assert.equal(entitlements.hasAssetContributionAccess({ activeMember: true, membershipTier }), true);
  }
  assert.equal(entitlements.hasAssetContributionAccess({ membershipTier: "mentor" }, { admin: true }), true);
});

test("unverified Mentor users cannot create drafts or edit/submit asset versions through the API", async () => {
  for (const mentorStatus of ["applicant", "suspended"]) {
    const route = loadSourceModule("src/app/api/asset-packs/route.js", ["GET", "POST", "PATCH"], {
      stripImports: true,
      sandbox: {
        ...entitlements,
        Response,
        getProductConfig: () => ({ featureFlags: { communityAssetSubmissions: true } }),
        getRequestUser: async () => ({ uid: "mentor-buyer", userData: { activeMember: true, membershipTier: "mentor", mentorStatus } }),
        adminDb: { collection: () => {
          const query = { limit: () => query, where: () => query, get: async () => ({ docs: [] }) };
          return query;
        } },
      },
    });
    const page = await route.GET({});
    const data = await page.json();
    assert.equal(data.canSubmit, false);
    assert.match(data.submissionBlockReason, /interview/);
    for (const method of ["POST", "PATCH"]) {
      const response = await route[method]({ json: async () => ({ mentorStatus: "approved", submit: true }) });
      assert.equal(response.status, 403);
      assert.equal((await response.json()).code, "mentor_verification_required");
    }
  }
});
