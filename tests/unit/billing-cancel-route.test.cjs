const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");
const { NextResponse, createRequest } = require("../helpers/route-test-utils.cjs");

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

const fixedNow = new Date("2026-07-14T12:00:00.000Z");

class FixedDate extends Date {
  constructor(value) {
    if (arguments.length === 0) {
      super(fixedNow.getTime());
    } else {
      super(value);
    }
  }

  static now() {
    return fixedNow.getTime();
  }
}

function loadRoute({ fetchImpl, tokenUid = "user-1", userData } = {}) {
  const updates = [];
  const userDoc = {
    exists: !!userData,
    data: () => userData || {},
    ref: {
      async update(update) {
        updates.push(update);
      },
    },
  };

  const route = loadSourceModule(
    "src/app/api/billing/cancel/route.js",
    ["POST"],
    {
      stripImports: true,
      sandbox: {
        Date: FixedDate,
        NextResponse,
        adminDb: {
          collection(name) {
            assert.equal(name, "users");
            return {
              doc(uid) {
                assert.equal(uid, tokenUid);
                return {
                  async get() {
                    return userDoc;
                  },
                };
              },
            };
          },
        },
        createPolarCustomerSession: async () => ({ token: "customer-session-token" }),
        fetch: fetchImpl || (async () => ({ ok: true, status: 200, json: async () => ({}) })),
        getPolarApiBase: () => "https://polar.test/v1",
        getTokenFromRequest: (request) => request.headers.get("authorization")?.replace("Bearer ", "") || null,
        cancelPendingEmailEvents: async () => 0,
        enqueueEmailEvent: async () => ({ created: true, id: "email-job" }),
        verifyToken: async () => ({ uid: tokenUid }),
      },
    }
  );

  return { ...route, updates };
}

function muteConsole(fn) {
  const original = { error: console.error, log: console.log };
  console.error = () => {};
  console.log = () => {};
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      console.error = original.error;
      console.log = original.log;
    });
}

test("billing cancel route requires auth, user, and subscription", async () => {
  let route = loadRoute();
  let response = await muteConsole(() => route.POST(createRequest()));
  assert.equal(response.status, 401);

  route = loadRoute({ userData: null });
  response = await muteConsole(() =>
    route.POST(createRequest({ headers: { authorization: "Bearer token" } }))
  );
  assert.equal(response.status, 404);

  route = loadRoute({ userData: { polarCustomerId: "cus_123" } });
  response = await muteConsole(() =>
    route.POST(createRequest({ headers: { authorization: "Bearer token" } }))
  );
  assert.equal(response.status, 400);
  assert.deepEqual(plain(response.body), { error: "No active subscription found" });
});

test("billing cancel route calls Polar and stores returned period end", async () => {
  const calls = [];
  const route = loadRoute({
    fetchImpl: async (url, options) => {
      calls.push({ options, url });
      return {
        ok: true,
        status: 200,
        async json() {
          return { current_period_end: "2026-08-14T12:00:00.000Z" };
        },
      };
    },
    userData: {
      polarCustomerId: "cus_123",
      subscriptionId: "sub_123",
    },
  });

  const response = await muteConsole(() =>
    route.POST(createRequest({ headers: { authorization: "Bearer token" } }))
  );

  assert.equal(response.status, 200);
  assert.deepEqual(plain(response.body), {
    endsAt: "2026-08-14T12:00:00.000Z",
    message: "Subscription canceled successfully",
    success: true,
  });
  assert.equal(calls[0].url, "https://polar.test/v1/customer-portal/subscriptions/sub_123");
  assert.equal(calls[0].options.method, "DELETE");
  assert.equal(calls[0].options.headers.Authorization, "Bearer customer-session-token");
  assert.equal(route.updates[0].subscriptionStatus, "canceled");
  assert.equal(route.updates[0].subscriptionEndsAt.toISOString(), "2026-08-14T12:00:00.000Z");
});

test("billing cancel route tolerates 404 from Polar and stores fallback end date", async () => {
  const route = loadRoute({
    fetchImpl: async () => ({
      ok: false,
      status: 404,
      text: async () => "not found",
    }),
    userData: {
      polarCustomerId: "cus_123",
      subscriptionId: "sub_123",
    },
  });

  const response = await muteConsole(() =>
    route.POST(createRequest({ headers: { authorization: "Bearer token" } }))
  );

  assert.equal(response.status, 200);
  assert.equal(route.updates[0].subscriptionStatus, "canceled");
  assert.equal(route.updates[0].subscriptionEndsAt.toISOString(), "2026-08-13T12:00:00.000Z");
});
