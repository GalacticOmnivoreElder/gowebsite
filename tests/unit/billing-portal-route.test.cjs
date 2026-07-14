const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");
const { NextResponse, createAdminDb, createRequest } = require("../helpers/route-test-utils.cjs");

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadRoute({ users = {}, tokenUid = "user-1" } = {}) {
  return loadSourceModule(
    "src/app/api/billing/portal/route.js",
    ["POST"],
    {
      stripImports: true,
      sandbox: {
        NextResponse,
        adminDb: createAdminDb({ users }),
        createPolarCustomerSession: async (customerId) => ({
          token: `session token for ${customerId}`,
        }),
        getPolarPortalBase: () => "https://sandbox.polar.sh/go/portal/overview",
        getTokenFromRequest: (request) => request.headers.get("authorization")?.replace("Bearer ", "") || null,
        verifyToken: async () => ({ uid: tokenUid }),
      },
    }
  );
}

test("billing portal route requires authentication", async () => {
  const { POST } = loadRoute();

  const response = await POST(createRequest());

  assert.equal(response.status, 401);
  assert.deepEqual(plain(response.body), { error: "Authentication required" });
});

test("billing portal route requires an existing user and Polar customer id", async () => {
  let route = loadRoute();
  let response = await route.POST(createRequest({ headers: { authorization: "Bearer token" } }));
  assert.equal(response.status, 404);
  assert.deepEqual(plain(response.body), { error: "User not found" });

  route = loadRoute({ users: { "user-1": {} } });
  response = await route.POST(createRequest({ headers: { authorization: "Bearer token" } }));
  assert.equal(response.status, 400);
  assert.deepEqual(plain(response.body), { error: "No customer ID found" });
});

test("billing portal route creates an encoded Polar portal URL", async () => {
  const { POST } = loadRoute({
    users: {
      "user-1": {
        polarCustomerId: "cus_123",
      },
    },
  });

  const response = await POST(createRequest({ headers: { authorization: "Bearer token" } }));

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(
    response.body.portal_url,
    "https://sandbox.polar.sh/go/portal/overview?customer_session_token=session%20token%20for%20cus_123&id=cus_123"
  );
});
