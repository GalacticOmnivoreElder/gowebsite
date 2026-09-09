const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const configModule = loadSourceModule("src/lib/product-config.js", [
  "getProductConfig",
  "getMentorshipConfig",
  "getMentorshipFeedbackConfig",
  "getSafeProductConfig",
  "parseBooleanEnv",
]);

test("product flags use safe defaults", () => {
  const config = configModule.getProductConfig({});
  assert.equal(config.featureFlags.productNavigation, true);
  for (const [name, enabled] of Object.entries(config.featureFlags)) {
    if (name !== "productNavigation") assert.equal(enabled, false, name);
  }
  assert.equal(config.mentorCheckoutEnabled, true);
  assert.equal(configModule.getProductConfig({ MENTOR_CHECKOUT_ENABLED: "false" }).mentorCheckoutEnabled, false);
});

test("feedback deadline defaults safely", () => {
  assert.equal(configModule.getMentorshipFeedbackConfig({}).feedbackDeadlineDays, 14);
  assert.equal(configModule.getMentorshipFeedbackConfig({ MENTOR_FEEDBACK_DEADLINE_DAYS: "30" }).feedbackDeadlineDays, 30);
  assert.equal(configModule.getMentorshipFeedbackConfig({ MENTOR_FEEDBACK_DEADLINE_DAYS: "0" }).feedbackDeadlineDays, 14);
});

test("the internal mentor application intake is enabled by default and can be disabled", () => {
  assert.equal(configModule.getMentorshipConfig({}).featureFlags.mentorApplications, true);
  assert.equal(configModule.getMentorshipConfig({ MENTORSHIP_MENTOR_APPLICATIONS_ENABLED: "false" }).featureFlags.mentorApplications, false);
  assert.equal(configModule.getSafeProductConfig({}).mentorApplicationUrl, undefined);
});
