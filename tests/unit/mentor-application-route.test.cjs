const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");
const { NextResponse, createRequest } = require("../helpers/route-test-utils.cjs");

const closedMessage = "Mentor applications are currently closed. The application form will become available when the next mentor intake opens.";

function loadRoute({ user = null, configured = false, override = false } = {}) {
  return loadSourceModule("src/app/api/mentor-application/open/route.js", ["POST"], {
    stripImports: true,
    sandbox: {
      Response: NextResponse,
      MENTOR_APPLICATIONS_CLOSED_MESSAGE: closedMessage,
      getRequestUser: async () => user,
      getProductSettings: async () => ({ mentorApplicationsOpen: override }),
      getProductConfig: () => ({ mentorApplicationsConfigured: configured, mentorApplicationUrl: "https://forms.test/mentor" }),
      areMentorApplicationsOpen: (config, settings) => config.mentorApplicationsConfigured && settings.mentorApplicationsOpen,
    },
  });
}

test("mentor application destination is never public or available while closed", async () => {
  let response = await loadRoute().POST(createRequest());
  assert.equal(response.status, 401);

  response = await loadRoute({ user: { uid: "mentor-1" } }).POST(createRequest());
  assert.equal(response.status, 503);
  assert.equal(response.body.error, closedMessage);
  assert.doesNotMatch(JSON.stringify(response.body), /forms\.test/);
});

test("authenticated users receive the server-only application URL only when both gates are open", async () => {
  const response = await loadRoute({ user: { uid: "mentor-1" }, configured: true, override: true }).POST(createRequest());
  assert.equal(response.status, 200);
  assert.equal(response.body.url, "https://forms.test/mentor");
});
