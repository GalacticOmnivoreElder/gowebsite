const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");
const { NextResponse, createRequest } = require("../helpers/route-test-utils.cjs");

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadRoute({ queueThrows, user } = {}) {
  const jobs = [];
  const route = loadSourceModule(
    "src/app/api/welcomeEmail/route.js",
    ["POST"],
    {
      stripImports: true,
      sandbox: {
        console: { ...console, error() {} },
        NextResponse,
        getRequestUser: async () => user || null,
        enqueueEmailEvent: async (event) => {
          if (queueThrows) throw queueThrows;
          jobs.push(event);
          return { created: true, id: "email-job-1" };
        },
      },
    }
  );

  return { ...route, jobs };
}

test("welcome email route requires authentication", async () => {
  const route = loadRoute();
  const response = await route.POST(
    createRequest({ jsonBody: { email: "target@example.com" } })
  );

  assert.equal(response.status, 401);
  assert.equal(route.jobs.length, 0);
});

test("welcome email route queues only for the authenticated account", async () => {
  const route = loadRoute({
    user: {
      uid: "member-1",
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
  assert.equal(response.body.emailJobId, "email-job-1");
  assert.equal(route.jobs[0].recipient, "member@example.com");
  assert.equal(route.jobs[0].data.displayName, "Real Member");
  assert.doesNotMatch(JSON.stringify(route.jobs[0]), /spoofed@example.com/);
});

test("welcome email route surfaces queue failure", async () => {
  const route = loadRoute({
    queueThrows: new Error("Firestore unavailable"),
    user: { uid: "member-1", email: "member@example.com", userData: {} },
  });
  const response = await route.POST(createRequest({ jsonBody: {} }));

  assert.equal(response.status, 500);
  assert.deepEqual(plain(response.body), {
    error: "Failed to queue welcome email",
  });
});
