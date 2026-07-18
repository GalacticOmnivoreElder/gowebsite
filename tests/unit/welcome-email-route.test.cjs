const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");
const { NextResponse, createRequest } = require("../helpers/route-test-utils.cjs");

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadRoute({ resendResult, user } = {}) {
  const sends = [];
  const route = loadSourceModule(
    "src/app/api/welcomeEmail/route.js",
    ["POST"],
    {
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
    }
  );

  return { ...route, sends };
}

test("welcome email route requires authentication", async () => {
  const route = loadRoute();
  const response = await route.POST(
    createRequest({ jsonBody: { email: "target@example.com" } })
  );

  assert.equal(response.status, 401);
  assert.equal(route.sends.length, 0);
});

test("welcome email route sends only to the authenticated account", async () => {
  const route = loadRoute({
    user: {
      email: "member@example.com",
      userData: { username: "Real Member" },
    },
  });
  const response = await route.POST(
    createRequest({
      jsonBody: {
        email: "spoofed@example.com",
        username: "Spoofed Name",
      },
    })
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.emailId, "email-1");
  assert.equal(route.sends[0].to, "member@example.com");
  assert.match(route.sends[0].html, /Real Member/);
  assert.doesNotMatch(route.sends[0].html, /spoofed@example.com/);
});

test("welcome email route surfaces provider rejection", async () => {
  const route = loadRoute({
    resendResult: { data: null, error: { message: "Domain is not verified" } },
    user: { email: "member@example.com", userData: {} },
  });
  const response = await route.POST(createRequest({ jsonBody: {} }));

  assert.equal(response.status, 500);
  assert.deepEqual(plain(response.body), {
    error: "Failed to send welcome email",
  });
});
