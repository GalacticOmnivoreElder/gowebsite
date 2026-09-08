const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");
const { MEMBERSHIP_PLANS } = loadSourceModule("src/constants/membership.js", ["MEMBERSHIP_PLANS"]);
const polar = loadSourceModule("src/lib/polar.js", ["resolvePolarProductTier", "resolvePolarProductId"], {
  sandbox: { process: { env: { POLAR_SERVER: "production" } } },
});

function loadGuard({ product, enabled = true, fail = false } = {}) {
  return loadSourceModule("src/lib/mentor-checkout.js", ["isMentorProductReady", "getMentorCheckoutStatus"], {
    stripImports: true,
    sandbox: {
      ...polar,
      MEMBERSHIP_PLANS,
      getProductConfig: () => ({ mentorCheckoutEnabled: enabled }),
      getPolarProduct: async () => {
        if (fail) throw new Error("Polar unavailable");
        return product;
      },
    },
  });
}

function productFor(interval) {
  return {
    id: polar.resolvePolarProductId("mentor", interval),
    is_archived: false,
    is_recurring: true,
    recurring_interval: interval === "annual" ? "year" : "month",
    recurring_interval_count: 1,
    prices: [{
      is_archived: false,
      amount_type: "fixed",
      price_currency: "mkd",
      price_amount: interval === "annual" ? 1499900 : 149900,
    }],
  };
}

test("Mentor monthly and yearly products become available only with matching billing terms", async () => {
  for (const interval of ["monthly", "annual"]) {
    const product = productFor(interval);
    const guard = loadGuard({ product });
    assert.equal((await guard.getMentorCheckoutStatus(interval)).available, true);
  }
});

test("annual-labelled Mentor product billing monthly cannot be purchased as annual", async () => {
  const product = { ...productFor("annual"), recurring_interval: "month" };
  assert.equal((await loadGuard({ product }).getMentorCheckoutStatus("annual")).available, false);
});

test("Mentor checkout rejects changed price, currency, interval count, archived or mismatched products", () => {
  const original = productFor("monthly");
  const variants = [
    { ...original, id: "another-product" },
    { ...original, is_archived: true },
    { ...original, is_recurring: false },
    { ...original, recurring_interval_count: 3 },
    { ...original, prices: [] },
    { ...original, prices: [{ ...original.prices[0], price_amount: 1499900 }] },
    { ...original, prices: [{ ...original.prices[0], price_currency: "eur" }] },
    { ...original, prices: [{ ...original.prices[0], is_archived: true }] },
  ];
  const guard = loadGuard();
  for (const product of variants) {
    assert.equal(guard.isMentorProductReady(product, original.id, "monthly"), false);
  }
});

test("Mentor checkout fails closed when disabled or Polar cannot be reached", async () => {
  assert.equal((await loadGuard({ product: productFor("monthly"), enabled: false }).getMentorCheckoutStatus("monthly")).available, false);
  assert.equal((await loadGuard({ fail: true }).getMentorCheckoutStatus("monthly")).available, false);
});

test("Mentor auth selection and purchase confirmation retain both billing intervals", () => {
  const navigation = loadSourceModule("src/lib/checkout-navigation.js", ["buildCheckoutAuthUrl", "parseCheckoutPlanKey"]);
  const confirmation = loadSourceModule("src/lib/subscription-confirmation.js", ["createSubscriptionConfirmationAttempt"]);
  for (const interval of ["monthly", "annual"]) {
    const plan = navigation.parseCheckoutPlanKey(`mentor-${interval}`);
    assert.equal(plan.tier, "mentor");
    assert.equal(plan.interval, interval);
    assert.equal(navigation.buildCheckoutAuthUrl({ tier: "mentor", interval }), `/login?redirect=%2Fmembership&plan=mentor-${interval}`);
    assert.equal(navigation.buildCheckoutAuthUrl({ tier: "mentor", interval, isAnonymous: true }), `/signup?redirect=%2Fmembership&plan=mentor-${interval}`);
    const attempt = confirmation.createSubscriptionConfirmationAttempt({ tier: "mentor", baselineMembershipTier: "mentor", interval, userId: "mentor-buyer" });
    assert.equal(attempt.tier, "mentor");
    assert.equal(attempt.baselineMembershipTier, "mentor");
    assert.equal(attempt.interval, interval);
  }
});

test("Mentor membership grants community access but never automatic mentor approval or Business powers", () => {
  const { getEffectiveMembership } = loadSourceModule("src/lib/auth-utils.js", ["getEffectiveMembership"], { stripImports: true });
  const { hasMentorToolAccess } = loadSourceModule("src/lib/content-entitlements.js", ["hasMentorToolAccess"], { stripImports: true });
  const buyer = { activeMember: true, membershipTier: "mentor", mentorStatus: "applicant" };
  const access = getEffectiveMembership(buyer);
  assert.equal(access.activeMember, true);
  assert.equal(access.membershipTier, "mentor");
  assert.equal(access.canCreateProjects, false);
  assert.equal(access.canAccessPackages, true);
  assert.equal(hasMentorToolAccess(buyer), false);
  assert.equal(hasMentorToolAccess({ ...buyer, mentorStatus: "approved" }), true);
});
