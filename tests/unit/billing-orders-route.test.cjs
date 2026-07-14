const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");
const { NextResponse, createAdminDb, createRequest } = require("../helpers/route-test-utils.cjs");

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function timestamp(value) {
  return {
    toDate() {
      return new Date(value);
    },
  };
}

function loadRoute({ orders = [], tokenUid = "user-1" } = {}) {
  return loadSourceModule(
    "src/app/api/billing/orders/route.js",
    ["GET"],
    {
      stripImports: true,
      sandbox: {
        NextResponse,
        adminDb: createAdminDb({ orders }),
        getTokenFromRequest: (request) => request.headers.get("authorization")?.replace("Bearer ", "") || null,
        verifyToken: async () => ({ uid: tokenUid }),
      },
    }
  );
}

test("billing orders route requires authentication", async () => {
  const { GET } = loadRoute();

  const response = await GET(createRequest());

  assert.equal(response.status, 401);
  assert.deepEqual(plain(response.body), { error: "Authentication required" });
});

test("billing orders route returns only the current user's serialized orders", async () => {
  const { GET } = loadRoute({
    orders: [
      {
        id: "order_1",
        data: {
          amount: 1000,
          createdAt: timestamp("2026-07-14T10:00:00.000Z"),
          paidAt: timestamp("2026-07-14T10:05:00.000Z"),
          userId: "user-1",
        },
      },
      {
        id: "order_2",
        data: {
          amount: 2000,
          createdAt: "2026-07-13",
          paidAt: null,
          userId: "someone-else",
        },
      },
    ],
  });

  const response = await GET(createRequest({ headers: { authorization: "Bearer token" } }));

  assert.equal(response.status, 200);
  assert.deepEqual(plain(response.body), {
    orders: [
      {
        amount: 1000,
        createdAt: "2026-07-14T10:00:00.000Z",
        id: "order_1",
        paidAt: "2026-07-14T10:05:00.000Z",
        userId: "user-1",
      },
    ],
  });
});
