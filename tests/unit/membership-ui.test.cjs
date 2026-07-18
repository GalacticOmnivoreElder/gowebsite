const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const { canChooseMembershipPlan, isSubscriptionEnding } = loadSourceModule(
  "src/lib/membership-ui.js",
  ["canChooseMembershipPlan", "isSubscriptionEnding"]
);

test("membership selection remains available without an active subscription", () => {
  assert.equal(
    canChooseMembershipPlan({
      hasActiveSubscription: false,
      targetTier: "member",
    }),
    true
  );
});

test("canceled members can select a replacement membership", () => {
  assert.equal(
    isSubscriptionEnding({ subscriptionStatus: "canceled", willRenew: false }),
    true
  );
  assert.equal(
    canChooseMembershipPlan({
      currentTier: "member",
      hasActiveSubscription: true,
      subscriptionStatus: "canceled",
      targetTier: "member",
      willRenew: false,
    }),
    true
  );
});

test("Community members can upgrade to Business without repurchasing Community", () => {
  const current = {
    currentTier: "member",
    hasActiveSubscription: true,
    subscriptionStatus: "active",
    willRenew: true,
  };

  assert.equal(
    canChooseMembershipPlan({ ...current, targetTier: "member" }),
    false
  );
  assert.equal(
    canChooseMembershipPlan({ ...current, targetTier: "company" }),
    true
  );
});

test("active Business members are not offered another plan", () => {
  assert.equal(
    canChooseMembershipPlan({
      currentTier: "company",
      hasActiveSubscription: true,
      subscriptionStatus: "active",
      targetTier: "member",
      willRenew: true,
    }),
    false
  );
});
