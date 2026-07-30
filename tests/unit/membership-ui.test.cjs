const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const { canChooseMembershipPlan, isSubscriptionEnding } = loadSourceModule(
  "src/lib/membership-ui.js",
  ["canChooseMembershipPlan", "isSubscriptionEnding"]
);

const billingPageSource = fs.readFileSync(
  "src/app/billing/page.js",
  "utf8"
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

test("billing page returns members to their profile", () => {
  assert.match(billingPageSource, /router\.push\("\/profile"\)/);
  assert.match(billingPageSource, /Back to Profile/);
  assert.doesNotMatch(billingPageSource, /router\.push\("\/dashboard"\)/);
  assert.doesNotMatch(billingPageSource, /Back to Dashboard/);
});

test("billing presents one membership CTA and no redundant Get Started card", () => {
  assert.doesNotMatch(billingPageSource, /Get Started/);
  assert.equal(
    (billingPageSource.match(/>\s*Review membership\s*</g) || []).length,
    1
  );
});
