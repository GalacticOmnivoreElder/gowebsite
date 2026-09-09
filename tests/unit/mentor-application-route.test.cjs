const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

test("mentor applications use the authenticated native GO route", () => {
  const route = fs.readFileSync("src/app/api/mentorship/mentor-application/route.js", "utf8");
  const button = fs.readFileSync("src/components/pricing/MentorApplicationButton.jsx", "utf8");
  assert.match(route, /getMentorApplicationState/);
  assert.match(route, /mentor_applications_closed/);
  assert.doesNotMatch(route + button, /MENTOR_APPLICATION_URL|forms\.test|window\.open/);
  assert.match(button, /\/profile\?tab=mentor/);
});

test("the native route returns application status and honors the admin intake switch", () => {
  const route = fs.readFileSync("src/app/api/mentorship/mentor-application/route.js", "utf8");
  assert.match(route, /applicationsOpen: applicationState\.open/);
  assert.match(route, /if \(!applicationState\.open\)/);
  assert.match(route, /saveMentorApplication/);
});
