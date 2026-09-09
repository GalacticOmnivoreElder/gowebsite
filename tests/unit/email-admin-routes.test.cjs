const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");
const { NextResponse, createRequest } = require("../helpers/route-test-utils.cjs");

function loadRoute(path, exports, { user } = {}) {
  const jobs = [];
  const route = loadSourceModule(path, exports, {
    stripImports: true,
    sandbox: {
      console: { ...console, error() {} },
      NextResponse,
      process: { env: { ...process.env, VERCEL_ENV: "production" } },
      getRequestUser: async () => user || null,
      hashValue: () => "event-hash",
      enqueueEmailEvent: async (event) => {
        jobs.push(event);
        return { created: true, id: "email-job-1" };
      },
    },
  });
  return { ...route, jobs };
}

test("the production email diagnostic endpoint is removed", () => {
  assert.equal(require("node:fs").existsSync("src/app/api/testEmail/route.js"), false);
});

test("onboarding email utility requires an admin and a message", async () => {
  let route = loadRoute("src/app/api/onboardingEmail/route.js", ["POST"], {
    user: { admin: false, email: "member@example.com" },
  });
  let response = await route.POST(createRequest({ jsonBody: { message: "Hello" } }));
  assert.equal(response.status, 403);

  route = loadRoute("src/app/api/onboardingEmail/route.js", ["POST"], {
    user: { admin: true, email: "admin@example.com" },
  });
  response = await route.POST(createRequest({ jsonBody: { message: "" } }));
  assert.equal(response.status, 400);
  assert.equal(route.jobs.length, 0);
});

test("onboarding email utility cannot relay mail to a supplied address", async () => {
  const route = loadRoute("src/app/api/onboardingEmail/route.js", ["POST"], {
    user: { admin: true, email: "admin@example.com" },
  });
  const response = await route.POST(
    createRequest({
      jsonBody: {
        email: "external@example.com",
        message: "Please follow up.",
        name: "Applicant",
        subject: "Profile help",
      },
    })
  );

  assert.equal(response.status, 200);
  assert.equal(route.jobs[0].recipient, "admin@example.com");
  assert.equal(route.jobs[0].data.contactEmail, "external@example.com");
  assert.equal(route.jobs[0].type, "admin.onboarding_note");
});
