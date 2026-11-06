const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");
const { MEMBERSHIP_PLANS } = loadSourceModule("src/constants/membership.js", ["MEMBERSHIP_PLANS"]);
const polar = loadSourceModule("src/lib/polar.js", ["resolvePolarProductTier", "resolvePolarProductId"], { sandbox: { process: { env: { POLAR_SERVER: "production" } } } });

function loadGuard(enabled = true, membershipCheckoutEnabled = true) { return loadSourceModule("src/lib/mentor-checkout.js", ["isMentorProductReady", "getMentorCheckoutStatus"], { stripImports: true, sandbox: { ...polar, MEMBERSHIP_PLANS, getProductConfig: () => ({ mentorCheckoutEnabled: enabled, membershipCheckoutEnabled }) } }); }
function productFor(interval) { return { id: polar.resolvePolarProductId("mentor", interval), is_archived: false, is_recurring: true, recurring_interval: interval === "annual" ? "year" : "month", recurring_interval_count: 1, prices: [{ is_archived: false, amount_type: "fixed", price_currency: "mkd", price_amount: interval === "annual" ? 1499900 : 149900 }] }; }

test("Mentor monthly and annual checkout stay available from approved product ids", async () => {
  for (const interval of ["monthly", "annual"]) assert.equal((await loadGuard().getMentorCheckoutStatus(interval)).available, true);
});

test("the Mentor programme does not expose a paid checkout link", () => {
  const mentor = MEMBERSHIP_PLANS.find((plan) => plan.tier === "mentor");
  assert.equal(mentor.availableForPurchase, false);
  assert.equal("checkoutUrl" in mentor.pricing.annual, false);
});

test("Polar product audits reject changed billing terms", () => {
  const guard = loadGuard();
  const product = productFor("annual");
  assert.equal(guard.isMentorProductReady(product, product.id, "annual"), true);
  assert.equal(guard.isMentorProductReady({ ...product, recurring_interval: "month" }, product.id, "annual"), false);
  assert.equal(guard.isMentorProductReady({ ...product, is_archived: true }, product.id, "annual"), false);
});

test("Mentor checkout can be disabled centrally", async () => {
  assert.equal((await loadGuard(false).getMentorCheckoutStatus("monthly")).available, false);
});

test("Mentor checkout remains disabled while subscription checkout is paused", async () => {
  assert.equal((await loadGuard(true, false).getMentorCheckoutStatus("monthly")).available, false);
});

test("Mentor membership does not grant verification or Business powers", () => {
  const { getEffectiveMembership } = loadSourceModule("src/lib/auth-utils.js", ["getEffectiveMembership"], { stripImports: true });
  const { hasMentorToolAccess } = loadSourceModule("src/lib/content-entitlements.js", ["hasMentorToolAccess"], { stripImports: true, sandbox: { getEffectiveMembership } });
  const buyer = { activeMember: true, membershipTier: "mentor", mentorStatus: "applicant" };
  const access = getEffectiveMembership(buyer);
  assert.equal(access.activeMember, true);
  assert.equal(access.canCreateProjects, false);
  assert.equal(hasMentorToolAccess(buyer), false);
  assert.equal(hasMentorToolAccess({ ...buyer, mentorStatus: "approved" }), true);
});
