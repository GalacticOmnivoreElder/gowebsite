const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const { BILLING_INTERVALS, MEMBERSHIP_PLANS } = loadSourceModule(
  "src/constants/membership.js",
  ["BILLING_INTERVALS", "MEMBERSHIP_PLANS"]
);

test("membership catalogue matches the MKD launch prices", () => {
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
  });

  const checkoutUrls = Object.fromEntries(
    MEMBERSHIP_PLANS.flatMap((plan) =>
      Object.entries(plan.pricing).map(([interval, price]) => [
        `${plan.tier}_${interval}`,
        price.checkoutUrl,
      ])
    )
  );

  assert.deepEqual(JSON.parse(JSON.stringify(checkoutUrls)), {
    company_annual:
      "https://buy.polar.sh/polar_cl_UtMDVEYWTIf2MyIECvoclfxLXrXvXjwEcJZAO3i0SeK",
    company_monthly:
      "https://buy.polar.sh/polar_cl_jXCPPseL1ZnPUhkxY7JJBjUk5CdzsimvTqVum2zuJgz",
    member_annual:
      "https://buy.polar.sh/polar_cl_dXXa5BGsLP8ukTHL5uFn6Ly8ijgz3VFqYAnHr4EvUxI",
    member_monthly:
      "https://buy.polar.sh/polar_cl_3eQZAkgR7tt6AVntit4gkKMQJ6vM7p2jlwvLF0EyUMq",
  });
});
