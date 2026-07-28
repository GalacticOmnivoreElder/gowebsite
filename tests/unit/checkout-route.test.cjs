const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");
const { NextResponse, createRequest } = require("../helpers/route-test-utils.cjs");

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

const envKeys = ["NODE_ENV", "POLAR_ACCESS_TOKEN", "POLAR_SUCCESS_URL"];

async function withEnv(values, fn) {
  const original = {};
  for (const key of envKeys) {
    original[key] = process.env[key];
    delete process.env[key];
  }

  Object.assign(process.env, values);
  try {
    return await fn();
  } finally {
    for (const key of envKeys) {
      if (original[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original[key];
      }
    }
  }
}

function loadRoute({
  user,
  productId = "prod_member_monthly",
  polarCreate,
  portalSession = {
    customerPortalUrl: "https://sandbox.polar.sh/go/portal",
  },
} = {}) {
  const polarCalls = [];
  const portalCalls = [];
  class Polar {
    constructor(config) {
      this.config = config;
      this.checkouts = {
        create: async (input) => {
          polarCalls.push({ config, input });
          if (polarCreate) return polarCreate(input);
          return { url: "https://checkout.polar.test/session" };
        },
      };
      this.subscriptions = {
        get: async (input) => {
          polarCalls.push({ config, input, operation: "subscription.get" });
          return { recurringInterval: "month" };
        },
        update: async (input) => {
          polarCalls.push({
            config,
            input,
            operation: "subscription.update",
          });
          return { status: "active" };
        },
      };
    }
  }

  const route = loadSourceModule(
    "src/app/api/checkout/route.js",
    ["POST"],
    {
      stripImports: true,
      sandbox: {
        NextResponse,
        Polar,
        createPolarCustomerSession: async (customerId) => {
          portalCalls.push(customerId);
          return portalSession;
        },
        getPolarPortalBase: () =>
          "https://sandbox.polar.sh/go/portal/overview",
        getPolarServer: () => "sandbox",
        getRequestUser: async () => user || null,
        resolvePolarProductId: () => productId,
      },
    }
  );

  return { ...route, polarCalls, portalCalls };
}

test("checkout route requires authentication", async () => {
  const { POST } = loadRoute();

  const response = await POST(createRequest({ jsonBody: {} }));

  assert.equal(response.status, 401);
  assert.deepEqual(plain(response.body), { error: "Authentication required" });
});

test("Community upgrade opens Polar's customer-confirmed plan change without mutating the subscription", async () => {
  await withEnv({ POLAR_ACCESS_TOKEN: "token" }, async () => {
    const { POST, polarCalls, portalCalls } = loadRoute({
      productId: "configured-business-product",
      user: {
        activeMember: true,
        email: "member@example.com",
        membershipTier: "member",
        uid: "user-1",
        userData: {
          activeMember: true,
          membershipTier: "member",
          polarCustomerId: "customer-1",
          subscriptionId: "subscription-1",
          subscriptionStatus: "active",
          willRenew: true,
        },
      },
    });

    const response = await POST(
      createRequest({
        jsonBody: { interval: "monthly", tier: "company" },
        url: "https://go.test/api/checkout",
      })
    );

    assert.equal(response.status, 200);
    assert.deepEqual(plain(response.body), {
      flow: "portal",
      url: "https://sandbox.polar.sh/go/portal",
    });
    assert.deepEqual(portalCalls, ["customer-1"]);
    assert.deepEqual(polarCalls, []);
  });
});

test("Community upgrade falls back to an encoded authenticated portal URL", async () => {
  await withEnv({ POLAR_ACCESS_TOKEN: "token" }, async () => {
    const { POST, polarCalls } = loadRoute({
      portalSession: { token: "short lived token" },
      productId: "configured-business-annual",
      user: {
        activeMember: true,
        membershipTier: "member",
        uid: "user-1",
        userData: {
          activeMember: true,
          membershipTier: "member",
          polarCustomerId: "customer/1",
          subscriptionId: "subscription-1",
          subscriptionStatus: "active",
          willRenew: true,
        },
      },
    });

    const response = await POST(
      createRequest({
        jsonBody: { interval: "annual", tier: "company" },
      })
    );

    assert.equal(response.status, 200);
    assert.deepEqual(plain(response.body), {
      flow: "portal",
      url:
        "https://sandbox.polar.sh/go/portal/overview" +
        "?customer_session_token=short%20lived%20token&id=customer%2F1",
    });
    assert.equal(
      polarCalls.some((call) => call.operation === "subscription.update"),
      false
    );
  });
});

test("Community upgrade requires a linked Polar customer", async () => {
  await withEnv({ POLAR_ACCESS_TOKEN: "token" }, async () => {
    const { POST, polarCalls, portalCalls } = loadRoute({
      productId: "configured-business-product",
      user: {
        activeMember: true,
        membershipTier: "member",
        uid: "user-1",
        userData: {
          activeMember: true,
          membershipTier: "member",
          subscriptionStatus: "active",
          willRenew: true,
        },
      },
    });

    const response = await POST(
      createRequest({
        jsonBody: { interval: "monthly", tier: "company" },
      })
    );

    assert.equal(response.status, 409);
    assert.equal(response.body.code, "missing_customer");
    assert.deepEqual(portalCalls, []);
    assert.deepEqual(polarCalls, []);
  });
});

test("checkout route requires a configured product id", async () => {
  await withEnv({ POLAR_ACCESS_TOKEN: "token" }, async () => {
    const { POST } = loadRoute({
      productId: null,
      user: { email: "member@example.com", uid: "user-1" },
    });

    const response = await POST(
      createRequest({ jsonBody: { interval: "annual", tier: "company" } })
    );

    assert.equal(response.status, 400);
    assert.deepEqual(plain(response.body), {
      error: "No Polar product configured for the company annual plan.",
    });
  });
});

test("checkout route requires the Polar access token", async () => {
  await withEnv({}, async () => {
    const { POST } = loadRoute({
      user: { email: "member@example.com", uid: "user-1" },
    });

    const response = await POST(createRequest({ jsonBody: {} }));

    assert.equal(response.status, 500);
    assert.deepEqual(plain(response.body), {
      error: "Polar is not configured (missing POLAR_ACCESS_TOKEN).",
    });
  });
});

test("checkout route creates Polar checkout with authenticated identity and buyer IP", async () => {
  await withEnv(
    {
      POLAR_ACCESS_TOKEN: "token",
      POLAR_SUCCESS_URL: "https://go.test/subscription/success",
    },
    async () => {
      const { POST, polarCalls } = loadRoute({
        user: { email: "member@example.com", uid: "user-1" },
      });

      const response = await POST(
        createRequest({
          headers: {
            "x-forwarded-for": "203.0.113.10, 10.0.0.1",
          },
          jsonBody: { interval: "annual", tier: "company" },
          url: "https://go.test/api/checkout",
        })
      );

      assert.equal(response.status, 200);
      assert.deepEqual(plain(response.body), {
        flow: "checkout",
        url: "https://checkout.polar.test/session",
      });
      assert.deepEqual(plain(polarCalls[0].config), {
        accessToken: "token",
        server: "sandbox",
      });
      assert.deepEqual(plain(polarCalls[0].input), {
        customerEmail: "member@example.com",
        customerIpAddress: "203.0.113.10",
        externalCustomerId: "user-1",
        metadata: {
          interval: "annual",
          tier: "company",
          uid: "user-1",
        },
        products: ["prod_member_monthly"],
        successUrl: "https://go.test/subscription/success",
      });
    }
  );
});

test("checkout route ignores client-supplied product ids", async () => {
  await withEnv({ POLAR_ACCESS_TOKEN: "token" }, async () => {
    const { POST, polarCalls } = loadRoute({
      productId: "configured-company-product",
      user: { email: "creator@example.com", uid: "creator-1" },
    });

    const response = await POST(
      createRequest({
        jsonBody: {
          interval: "monthly",
          productId: "cheaper-member-product",
          tier: "company",
        },
      })
    );

    assert.equal(response.status, 200);
    assert.deepEqual(plain(polarCalls[0].input.products), [
      "configured-company-product",
    ]);
    assert.equal(polarCalls[0].input.metadata.tier, "company");
  });
});

test("checkout route surfaces useful Polar config hints in development", async () => {
  await withEnv(
    {
      NODE_ENV: "development",
      POLAR_ACCESS_TOKEN: "bad-token",
    },
    async () => {
      const originalError = console.error;
      console.error = () => {};
      try {
        const { POST } = loadRoute({
          polarCreate: async () => {
            const error = new Error("invalid_token");
            error.status = 401;
            throw error;
          },
          user: { email: "member@example.com", uid: "user-1" },
        });

        const response = await POST(createRequest({ jsonBody: {} }));

        assert.equal(response.status, 500);
        assert.equal(response.body.error, "Failed to create checkout session.");
        assert.equal(response.body.polarStatus, 401);
        assert.match(response.body.hint, /Polar rejected the access token/);
      } finally {
        console.error = originalError;
      }
    }
  );
});
