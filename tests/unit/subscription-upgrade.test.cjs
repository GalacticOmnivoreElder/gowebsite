const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");
const {
  NextResponse,
  createRequest,
} = require("../helpers/route-test-utils.cjs");

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadUpgradeLibrary({
  subscription,
  targetProduct,
  targetProductId = "business-monthly",
} = {}) {
  return loadSourceModule(
    "src/lib/subscription-upgrade.js",
    [
      "SubscriptionUpgradeError",
      "buildBusinessUpgradePreview",
      "getPendingSubscriptionUpdate",
      "getPendingUpgradeFirestoreData",
    ],
    {
      stripImports: true,
      transform: (source) =>
        source.replace(
          "export class SubscriptionUpgradeError",
          "class SubscriptionUpgradeError"
        ),
      sandbox: {
        getPolarProduct: async () => targetProduct,
        getPolarSubscription: async () => subscription,
        resolvePolarProductId: () => targetProductId,
        resolvePolarProductTier: (productId) =>
          productId?.startsWith("business")
            ? "company"
            : productId?.startsWith("community")
            ? "member"
            : null,
      },
    }
  );
}

function communityUser(overrides = {}) {
  return {
    activeMember: true,
    membershipTier: "member",
    uid: "user-1",
    userData: {
      activeMember: true,
      membershipTier: "member",
      polarCustomerId: "customer-1",
      subscriptionId: "subscription-1",
      subscriptionStatus: "active",
      willRenew: true,
      ...overrides,
    },
  };
}

function activeCommunitySubscription(overrides = {}) {
  return {
    amount: 50000,
    currency: "mkd",
    current_period_end: "2026-08-29T00:00:00.000Z",
    customer_id: "customer-1",
    id: "subscription-1",
    product: { id: "community-monthly", name: "GO Community" },
    product_id: "community-monthly",
    recurring_interval: "month",
    status: "active",
    ...overrides,
  };
}

function businessProduct(overrides = {}) {
  return {
    id: "business-monthly",
    name: "GO Business",
    prices: [
      {
        is_archived: false,
        price_amount: 299900,
        price_currency: "mkd",
        recurring_interval: "month",
      },
    ],
    ...overrides,
  };
}

test("Business upgrade preview is authoritative and keeps Community active", async () => {
  const { buildBusinessUpgradePreview } = loadUpgradeLibrary({
    subscription: activeCommunitySubscription({
      discount_id: "discount-1",
    }),
    targetProduct: businessProduct(),
  });

  const preview = await buildBusinessUpgradePreview(
    communityUser(),
    "monthly"
  );

  assert.equal(preview.currentPlan.tier, "member");
  assert.equal(preview.currentPlan.hasDiscount, true);
  assert.equal(preview.targetPlan.tier, "company");
  assert.equal(preview.targetPlan.amount, 299900);
  assert.equal(preview.noChargeToday, true);
  assert.equal(preview.pending, false);
  assert.equal(preview.effectiveAt, "2026-08-29T00:00:00.000Z");
});

test("preview rejects ownership, active-product, and currency mismatches", async () => {
  let loaded = loadUpgradeLibrary({
    subscription: activeCommunitySubscription({
      customer_id: "different-customer",
    }),
    targetProduct: businessProduct(),
  });
  await assert.rejects(
    () => loaded.buildBusinessUpgradePreview(communityUser(), "monthly"),
    /does not belong/
  );

  loaded = loadUpgradeLibrary({
    subscription: activeCommunitySubscription({
      product_id: "business-monthly",
      product: { id: "business-monthly" },
    }),
    targetProduct: businessProduct(),
  });
  await assert.rejects(
    () => loaded.buildBusinessUpgradePreview(communityUser(), "monthly"),
    /does not report Community/
  );

  loaded = loadUpgradeLibrary({
    subscription: activeCommunitySubscription({ status: "past_due" }),
    targetProduct: businessProduct(),
  });
  await assert.rejects(
    () => loaded.buildBusinessUpgradePreview(communityUser(), "monthly"),
    /active, renewing Community subscription/
  );

  loaded = loadUpgradeLibrary({
    subscription: activeCommunitySubscription(),
    targetProduct: businessProduct({
      prices: [
        {
          price_amount: 2999,
          price_currency: "eur",
          recurring_interval: "month",
        },
      ],
    }),
  });
  await assert.rejects(
    () => loaded.buildBusinessUpgradePreview(communityUser(), "monthly"),
    /different currencies/
  );
});

test("an existing matching Polar pending update makes scheduling idempotent", async () => {
  const appliesAt = "2026-08-29T00:00:00.000Z";
  const { buildBusinessUpgradePreview } = loadUpgradeLibrary({
    subscription: activeCommunitySubscription({
      pending_update: {
        applies_at: appliesAt,
        id: "pending-1",
        product_id: "business-monthly",
      },
    }),
    targetProduct: businessProduct(),
  });

  const preview = await buildBusinessUpgradePreview(
    communityUser(),
    "monthly"
  );
  assert.equal(preview.pending, true);
  assert.equal(preview.pendingUpdate.id, "pending-1");
  assert.equal(preview.effectiveAt, appliesAt);
});

function loadUpgradeRoute({
  preview,
  user = communityUser(),
  updatedSubscription,
} = {}) {
  const scheduleCalls = [];
  const userUpdates = [];

  class SubscriptionUpgradeError extends Error {
    constructor(message, code, status = 409) {
      super(message);
      this.code = code;
      this.status = status;
    }
  }

  const route = loadSourceModule(
    "src/app/api/subscription/upgrade/route.js",
    ["GET", "POST"],
    {
      stripImports: true,
      sandbox: {
        NextResponse,
        SubscriptionUpgradeError,
        adminDb: {
          collection(name) {
            assert.equal(name, "users");
            return {
              doc(uid) {
                assert.equal(uid, "user-1");
                return {
                  async update(update) {
                    userUpdates.push(update);
                  },
                };
              },
            };
          },
        },
        buildBusinessUpgradePreview: async () => preview,
        getPendingSubscriptionUpdate: (subscription) =>
          subscription?.pending_update
            ? {
                appliesAt: subscription.pending_update.applies_at,
                id: subscription.pending_update.id,
                productId: subscription.pending_update.product_id,
              }
            : null,
        getPendingUpgradeFirestoreData: (value, pending) => ({
          pendingMembershipCurrency: value.targetPlan.currency,
          pendingMembershipEffectiveAt: pending.appliesAt,
          pendingMembershipInterval: "monthly",
          pendingMembershipPriceAmount: value.targetPlan.amount,
          pendingMembershipProductId: value.targetPlan.productId,
          pendingMembershipStatus: "scheduled",
          pendingMembershipTier: "company",
          pendingMembershipUpdateId: pending.id,
        }),
        getRequestUser: async () => user,
        schedulePolarProductChange: async (subscriptionId, productId) => {
          scheduleCalls.push({ productId, subscriptionId });
          return updatedSubscription;
        },
      },
    }
  );

  return { ...route, scheduleCalls, userUpdates };
}

test("opening the review endpoint does not mutate the subscription", async () => {
  const preview = {
    pending: false,
    targetPlan: {
      amount: 299900,
      currency: "MKD",
      productId: "business-monthly",
    },
  };
  const route = loadUpgradeRoute({ preview });

  const response = await route.GET(
    createRequest({
      headers: { authorization: "Bearer token" },
      url: "https://go.test/api/subscription/upgrade?interval=monthly",
    })
  );

  assert.equal(response.status, 200);
  assert.deepEqual(plain(response.body), { preview });
  assert.deepEqual(route.scheduleCalls, []);
  assert.deepEqual(route.userUpdates, []);
});

test("upgrade review rejects unsupported billing intervals before any mutation", async () => {
  const route = loadUpgradeRoute({
    preview: {
      pending: false,
      targetPlan: {
        amount: 299900,
        currency: "MKD",
        productId: "business-monthly",
      },
    },
  });

  const response = await route.POST(
    createRequest({
      headers: { authorization: "Bearer token" },
      jsonBody: { interval: "weekly" },
      url: "https://go.test/api/subscription/upgrade",
    })
  );

  assert.equal(response.status, 400);
  assert.equal(response.body.code, "invalid_interval");
  assert.deepEqual(route.scheduleCalls, []);
  assert.deepEqual(route.userUpdates, []);
});

test("confirmation schedules next-period target once and never trusts a client product", async () => {
  const preview = {
    effectiveAt: "2026-08-29T00:00:00.000Z",
    pending: false,
    pendingUpdate: null,
    priceIsEstimate: true,
    subscriptionId: "subscription-1",
    targetPlan: {
      amount: 299900,
      currency: "MKD",
      interval: "month",
      productId: "business-monthly",
    },
  };
  const route = loadUpgradeRoute({
    preview,
    updatedSubscription: {
      pending_update: {
        applies_at: preview.effectiveAt,
        id: "pending-1",
        product_id: "business-monthly",
      },
    },
  });

  const response = await route.POST(
    createRequest({
      headers: { authorization: "Bearer token" },
      jsonBody: {
        interval: "monthly",
        productId: "forged-community-product",
        prorationBehavior: "prorate",
      },
      url: "https://go.test/api/subscription/upgrade",
    })
  );

  assert.equal(response.status, 200);
  assert.deepEqual(plain(route.scheduleCalls), [
    {
      productId: "business-monthly",
      subscriptionId: "subscription-1",
    },
  ]);
  assert.equal(route.userUpdates[0].pendingMembershipTier, "company");
  assert.equal(
    Object.hasOwn(route.userUpdates[0], "membershipTier"),
    false
  );
  assert.equal(response.body.upgrade.currentTier, "member");
});

test("the upgrade dialog requires informed confirmation and is accessible", () => {
  const source = fs.readFileSync(
    "src/components/pricing/BusinessUpgradeDialog.jsx",
    "utf8"
  );
  assert.match(source, /Review Business upgrade/);
  assert.match(source, /No charge today/);
  assert.match(source, /Confirm scheduled upgrade/);
  assert.match(source, /type="checkbox"/);
  assert.match(source, /DialogDescription/);
  assert.match(source, /motion-reduce:animate-none/);
});

test("profile and billing distinguish the pending upgrade from active Community access", () => {
  const profileSource = fs.readFileSync(
    "src/app/(main)/profile/page.js",
    "utf8"
  );
  const billingSource = fs.readFileSync(
    "src/app/billing/page.js",
    "utf8"
  );

  for (const source of [profileSource, billingSource]) {
    assert.match(source, /Business upgrade scheduled/);
    assert.match(source, /Community remains active/);
    assert.match(source, /pendingMembershipTier/);
  }
});
