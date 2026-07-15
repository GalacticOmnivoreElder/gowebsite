const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const {
  buildCheckoutAuthUrl,
  getCheckoutPlanKey,
  parseCheckoutPlanKey,
} = loadSourceModule(
  "src/lib/checkout-navigation.js",
  [
    "buildCheckoutAuthUrl",
    "getCheckoutPlanKey",
    "parseCheckoutPlanKey",
  ]
);

test("checkout plan keys accept only known tiers and intervals", () => {
  assert.equal(getCheckoutPlanKey("company", "annual"), "company-annual");
  assert.equal(getCheckoutPlanKey("unknown", "weekly"), "member-monthly");
  assert.deepEqual(
    JSON.parse(JSON.stringify(parseCheckoutPlanKey("member-monthly"))),
    { tier: "member", interval: "monthly" }
  );
  assert.equal(parseCheckoutPlanKey("company-yearly"), null);
  assert.equal(parseCheckoutPlanKey("https://example.com"), null);
});

test("checkout authentication URLs preserve the selected plan", () => {
  assert.equal(
    buildCheckoutAuthUrl({ tier: "member", interval: "annual" }),
    "/login?redirect=%2Fmembership&plan=member-annual"
  );
  assert.equal(
    buildCheckoutAuthUrl({
      tier: "company",
      interval: "monthly",
      isAnonymous: true,
    }),
    "/signup?redirect=%2Fmembership&plan=company-monthly"
  );
});
