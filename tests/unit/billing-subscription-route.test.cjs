const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");
const { NextResponse, createAdminDb, createRequest } = require("../helpers/route-test-utils.cjs");

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function hasActiveSubscription(userData = {}) {
  return userData?.activeMember === true;
}

function getEffectiveMembership(userData = {}, { admin = false } = {}) {
  const subscribed = hasActiveSubscription(userData);
  const activeMember = admin || subscribed;
  const membershipTier = activeMember
    ? admin
      ? "company"
      : userData.membershipTier || "member"
    : null;

  return {
    activeMember,
    membershipTier,
    canAccessPackages:
      activeMember || (Array.isArray(userData.unlockedPackages) && userData.unlockedPackages.length > 0),
    canCreateProjects: membershipTier === "company",
    subscribed,
  };
}

function loadRoute({ users = {}, tokenUid = "user-1", fetchImpl } = {}) {
  return loadSourceModule(
    "src/app/api/billing/subscription/route.js",
    ["GET"],
    {
      stripImports: true,
      sandbox: {
        NextResponse,
        adminDb: createAdminDb({ users }),
        fetch: fetchImpl || (async () => ({ ok: false })),
        getPolarApiBase: () => "https://polar.test/v1",
        getEffectiveMembership,
        getTokenFromRequest: (request) => request.headers.get("authorization")?.replace("Bearer ", "") || null,
        hasActiveSubscription,
        verifyToken: async () => ({ uid: tokenUid }),
      },
    }
  );
}

test("billing subscription route requires authentication", async () => {
  const { GET } = loadRoute();

  const response = await GET(createRequest());

  assert.equal(response.status, 401);
  assert.deepEqual(plain(response.body), { error: "Authentication required" });
});

test("billing subscription route returns 404 when the user document is missing", async () => {
  const { GET } = loadRoute();

  const response = await GET(createRequest({ headers: { authorization: "Bearer token" } }));

  assert.equal(response.status, 404);
  assert.deepEqual(plain(response.body), { error: "User not found" });
});

test("billing subscription route returns basic info without a subscription id", async () => {
  const { GET } = loadRoute({
    users: {
      "user-1": { activeMember: true },
    },
  });

  const response = await GET(createRequest({ headers: { authorization: "Bearer token" } }));

  assert.equal(response.status, 200);
  assert.deepEqual(plain(response.body), {
    activeMember: true,
    hasPaidSubscription: true,
    hasSubscription: false,
    membershipTier: "member",
  });
});

test("billing subscription route reports admin membership benefits without a subscription id", async () => {
  const { GET } = loadRoute({
    users: {
      "user-1": { activeMember: false, admin: true },
    },
  });

  const response = await GET(createRequest({ headers: { authorization: "Bearer token" } }));

  assert.equal(response.status, 200);
  assert.deepEqual(plain(response.body), {
    activeMember: true,
    hasPaidSubscription: false,
    hasSubscription: false,
    membershipTier: "company",
  });
});

test("billing subscription route returns Polar subscription details when available", async () => {
  const calls = [];
  const { GET } = loadRoute({
    users: {
      "user-1": {
        activeMember: true,
        canceledAt: null,
        subscriptionEndsAt: "2026-08-14",
        subscriptionId: "sub_123",
        subscriptionStatus: "active",
      },
    },
    fetchImpl: async (url, options) => {
      calls.push({ options, url });
      return {
        ok: true,
        async json() {
          return {
            cancel_at_period_end: false,
            currency: "eur",
            current_period_end: "2026-08-14",
            current_period_start: "2026-07-14",
            id: "sub_123",
            price: 1000,
            product: { id: "prod_123" },
            status: "active",
          };
        },
      };
    },
  });

  const response = await GET(createRequest({ headers: { authorization: "Bearer token" } }));

  assert.equal(calls[0].url, "https://polar.test/v1/subscriptions/sub_123");
  assert.equal(response.body.hasSubscription, true);
  assert.equal(response.body.hasPaidSubscription, true);
  assert.equal(response.body.membershipTier, "member");
  assert.equal(response.body.subscription.id, "sub_123");
  assert.equal(response.body.subscription.currency, "eur");
  assert.equal(response.body.subscription.cancelAtPeriodEnd, false);
});

test("billing subscription route falls back to Firestore data when Polar fails", async () => {
  const { GET } = loadRoute({
    users: {
      "user-1": {
        activeMember: true,
        lastOrderAmount: 1500,
        monthsPaid: 2,
        subscriptionEndsAt: "2026-08-14",
        subscriptionId: "sub_123",
        subscriptionStatus: "active",
      },
    },
    fetchImpl: async () => {
      throw new Error("Polar unavailable");
    },
  });

  const originalError = console.error;
  console.error = () => {};
  try {
    const response = await GET(createRequest({ headers: { authorization: "Bearer token" } }));

    assert.equal(response.status, 200);
    assert.deepEqual(plain(response.body), {
      activeMember: true,
      hasPaidSubscription: true,
      hasSubscription: true,
      lastOrderAmount: 1500,
      membershipTier: "member",
      monthsPaid: 2,
      subscriptionEndsAt: "2026-08-14",
      subscriptionStatus: "active",
    });
  } finally {
    console.error = originalError;
  }
});
