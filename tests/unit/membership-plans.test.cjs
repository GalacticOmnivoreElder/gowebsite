const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const { BILLING_INTERVALS, MEMBERSHIP_PLANS } = loadSourceModule(
  "src/constants/membership.js",
  ["BILLING_INTERVALS", "MEMBERSHIP_PLANS"]
);

test("membership catalogue matches the MKD launch prices without public checkout URLs", () => {
  assert.deepEqual(
    JSON.parse(JSON.stringify(BILLING_INTERVALS.map((option) => option.id))),
    ["monthly", "annual"]
  );

  const prices = Object.fromEntries(
    MEMBERSHIP_PLANS.map((plan) => [
      plan.tier,
      {
        annual: plan.pricing.annual.amount,
        monthly: plan.pricing.monthly.amount,
      },
    ])
  );

  assert.deepEqual(JSON.parse(JSON.stringify(prices)), {
    company: { annual: 29000, monthly: 2999 },
    member: { annual: 4800, monthly: 500 },
    mentor: { annual: 14999, monthly: 1499 },
  });

  assert.equal(
    MEMBERSHIP_PLANS.some((plan) =>
      Object.values(plan.pricing).some((price) => "checkoutUrl" in price)
    ),
    false
  );
  assert.equal(
    MEMBERSHIP_PLANS.find((plan) => plan.tier === "mentor").availableForPurchase,
    false
  );
});
