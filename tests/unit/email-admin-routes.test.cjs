const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");
const { NextResponse, createRequest } = require("../helpers/route-test-utils.cjs");

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadRoute(path, exports, { resendResult, user } = {}) {
  const sends = [];
  const route = loadSourceModule(path, exports, {
    stripImports: true,
    sandbox: {
      console: { ...console, error() {} },
      NextResponse,
      getRequestUser: async () => user || null,
      getResend: () => ({
        emails: {
          async send(payload) {
            sends.push(payload);
            return resendResult || { data: { id: "email-1" }, error: null };
          },
        },
      }),
    },
  });

  return { ...route, sends };
}

test("email diagnostics require a platform admin", async () => {
  let route = loadRoute("src/app/api/testEmail/route.js", ["GET", "POST"]);
  let response = await route.GET(createRequest());
  assert.equal(response.status, 401);

  route = loadRoute("src/app/api/testEmail/route.js", ["GET", "POST"], {
    user: { admin: false, email: "member@example.com" },
  });
  response = await route.POST(createRequest());
  assert.equal(response.status, 403);
  assert.equal(route.sends.length, 0);
});

test("email diagnostics send only to the authenticated admin", async () => {
  const route = loadRoute("src/app/api/testEmail/route.js", ["GET", "POST"], {
    user: { admin: true, email: "admin@example.com" },
  });
  const response = await route.POST(
    createRequest({ jsonBody: { email: "spoofed@example.com" } })
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.emailId, "email-1");
  assert.equal(route.sends[0].to, "admin@example.com");
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
  assert.equal(route.sends.length, 0);
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
  assert.equal(route.sends[0].to, "admin@example.com");
  assert.match(route.sends[0].text, /external@example.com/);
});
