const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const { BILLING_INTERVALS, MEMBERSHIP_PLANS } = loadSourceModule(
  "src/constants/membership.js",
  ["BILLING_INTERVALS", "MEMBERSHIP_PLANS"]
);

test("membership catalogue matches the four Polar products", () => {
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
    company: { annual: 480, monthly: 50 },
    member: { annual: 99, monthly: 10 },
  });
});

