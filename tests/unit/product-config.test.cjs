const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const configModule = loadSourceModule("src/lib/product-config.js", [
  "areMentorApplicationsOpen",
  "getProductConfig",
  "getMentorshipFeedbackConfig",
  "getSafeProductConfig",
  "isValidHttpsUrl",
  "parseBooleanEnv",
]);

test("Phase 1 product flags fail closed except navigation", () => {
  const config = configModule.getProductConfig({});
  assert.equal(config.featureFlags.productNavigation, true);
  for (const [name, enabled] of Object.entries(config.featureFlags)) {
    if (name !== "productNavigation") assert.equal(enabled, false, name);
  }
  assert.equal(config.mentorApplicationsConfigured, false);
  assert.equal(config.mentorCheckoutEnabled, false);
});

test("Phase 5 feedback deadline defaults safely", () => {
  assert.equal(configModule.getMentorshipFeedbackConfig({}).feedbackDeadlineDays, 14);
  assert.equal(configModule.getMentorshipFeedbackConfig({ MENTOR_FEEDBACK_DEADLINE_DAYS: "30" }).feedbackDeadlineDays, 30);
  assert.equal(configModule.getMentorshipFeedbackConfig({ MENTOR_FEEDBACK_DEADLINE_DAYS: "0" }).feedbackDeadlineDays, 14);
});

test("mentor applications require environment configuration and the admin override", () => {
  const config = configModule.getProductConfig({ MENTOR_APPLICATIONS_OPEN: "true", MENTOR_APPLICATION_URL: "https://forms.test/mentor" });
  assert.equal(configModule.areMentorApplicationsOpen(config, { mentorApplicationsOpen: false }), false);
  assert.equal(configModule.areMentorApplicationsOpen(config, { mentorApplicationsOpen: true }), true);
  assert.equal(configModule.getSafeProductConfig({ MENTOR_APPLICATIONS_OPEN: "true", MENTOR_APPLICATION_URL: "https://forms.test/mentor" }).mentorApplicationUrl, undefined);
  assert.equal(configModule.getProductConfig({ MENTOR_APPLICATIONS_OPEN: "true", MENTOR_APPLICATION_URL: "http://forms.test/mentor" }).mentorApplicationsConfigured, false);
  assert.equal(configModule.isValidHttpsUrl("javascript:alert(1)"), false);
});
