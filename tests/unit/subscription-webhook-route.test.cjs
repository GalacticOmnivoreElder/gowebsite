const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");
const { NextResponse, createRequest } = require("../helpers/route-test-utils.cjs");
const subscriptionStateHelpers = loadSourceModule(
  "src/lib/subscription-state.js",
  ["normalizeRefundTransition", "normalizeSubscriptionTransition"]
);

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

function createAdminDb(seed = {}) {
  const docs = {
    orders: {},
    processed_webhooks: {},
    subscription_events: [],
    users: { ...(seed.users || {}) },
  };

  function userDoc(uid) {
    const data = docs.users[uid];
    return {
      exists: !!data,
      id: uid,
      data: () => data || {},
      ref: {
        async update(update) {
          docs.users[uid] = { ...(docs.users[uid] || {}), ...update };
        },
      },
    };
  }

  return {
    docs,
    collection(name) {
      if (name === "users") {
        return {
          doc(uid) {
            return {
              async get() {
                return userDoc(uid);
              },
            };
          },
          where(field, operator, value) {
            assert.equal(operator, "==");
            return {
              limit(limitValue) {
                assert.equal(limitValue, 1);
                return {
                  async get() {
                    const match = Object.entries(docs.users).find(
                      ([, data]) => data[field] === value
                    );
                    return {
                      docs: match ? [userDoc(match[0])] : [],
                      empty: !match,
                    };
                  },
                };
              },
            };
          },
        };
      }

      if (name === "orders") {
        return {
          doc(id) {
            return {
              async set(data, options = {}) {
                docs.orders[id] = options.merge
                  ? { ...(docs.orders[id] || {}), ...data }
                  : data;
              },
            };
          },
        };
      }

      if (name === "subscription_events") {
        return {
          async add(data) {
            docs.subscription_events.push(data);
            return { id: `event-${docs.subscription_events.length}` };
          },
        };
      }

      throw new Error(`Unexpected collection: ${name}`);
    },
  };
}

function loadRoute({
  getPolarSubscriptionImpl,
  processed = new Set(),
  seed = {},
  webhookThrows,
} = {}) {
  const captured = {};
  const adminDb = createAdminDb(seed);
  const marks = [];
  const claims = new Set();
  const emailEvents = [];
  const queuedEmailKeys = new Set();

  const route = loadSourceModule(
    "src/app/api/subscription/webhook/route.js",
    ["POST"],
    {
      stripImports: true,
      sandbox: {
        ...subscriptionStateHelpers,
        Date: FixedDate,
        NextResponse,
        Webhooks: (callbacks) => {
          Object.assign(captured, callbacks);
          return async () => {
            if (webhookThrows) throw webhookThrows;
            return NextResponse.json({ received: true });
          };
        },
        adminDb,
        cancelPendingEmailEvents: async () => 0,
        enqueueAdminEmailEvent: async (event) => {
          emailEvents.push(event);
          return [];
        },
        enqueueEmailEvent: async (event) => {
          const key = `${event.type}:${event.eventId}:${event.userId || event.recipient}`;
          if (queuedEmailKeys.has(key)) {
            return { created: false, id: "email-job" };
          }
          queuedEmailKeys.add(key);
          emailEvents.push(event);
          return { created: true, id: "email-job" };
        },
        claimWebhookProcessing: async (eventId, eventType) => {
          const key = `${eventType}:${eventId}`;
          if (processed.has(key) || claims.has(key)) return false;
          claims.add(key);
          return true;
        },
        markWebhookProcessed: async (eventId, eventType, payload) => {
          const key = `${eventType}:${eventId}`;
          claims.delete(key);
          processed.add(key);
          marks.push({ eventId, eventType, payload });
        },
        releaseWebhookProcessing: async (eventId, eventType) => {
          claims.delete(`${eventType}:${eventId}`);
        },
        resolvePolarProductTier: (productId) =>
          productId === "company-product"
            ? "company"
            : productId === "member-product"
            ? "member"
            : null,
        getPendingSubscriptionUpdate: (subscription) => {
          const pending =
            subscription?.pending_update || subscription?.pendingUpdate;
          return pending
            ? {
                id: pending.id || null,
                appliesAt: pending.applies_at || pending.appliesAt,
                productId: pending.product_id || pending.productId,
              }
            : null;
        },
        getPolarSubscription:
          getPolarSubscriptionImpl ||
          (async () => {
            throw new Error("Unexpected Polar subscription refresh");
          }),
      },
    }
  );

  return { ...route, adminDb, captured, emailEvents, marks, processed };
}

test("webhook route ignores unknown Polar event types without retrying", async () => {
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    const error = new Error("Unknown event type: member.created");
    const route = loadRoute({ webhookThrows: error });
    const response = await route.POST(createRequest());

    assert.equal(response.status, 200);
    assert.deepEqual(plain(response.body), { ignored: true, received: true });
  } finally {
    console.warn = originalWarn;
  }
});

test("order.paid grants access, stores order data, and marks webhook processed", async () => {
  const route = loadRoute({
    seed: {
      users: {
        "user-1": { email: "member@example.com" },
      },
    },
  });

  await route.captured.onOrderPaid({
    data: {
      amount: 1500,
      currency: "eur",
      current_period_end: "2026-08-14T12:00:00.000Z",
      customer: { email: "member@example.com", id: "cus_123" },
      id: "order_1",
      metadata: { tier: "company", uid: "user-1" },
      product_id: "prod_1",
      status: "paid",
      subscription_id: "sub_1",
    },
    id: "evt_order_paid",
    type: "order.paid",
  });

  assert.equal(route.adminDb.docs.users["user-1"].activeMember, true);
  assert.equal(route.adminDb.docs.users["user-1"].membershipTier, "company");
  assert.equal(route.adminDb.docs.users["user-1"].subscriptionId, "sub_1");
  assert.equal(route.adminDb.docs.orders.order_1.status, "paid");
  assert.equal(route.marks[0].eventType, "order.paid");
});

test("order.paid derives Business creator access from the Polar product", async () => {
  const route = loadRoute({
    seed: {
      users: {
        "user-1": { email: "creator@example.com" },
      },
    },
  });

  await route.captured.onOrderPaid({
    data: {
      customer: { email: "creator@example.com", id: "cus_creator" },
      id: "order_creator",
      product_id: "company-product",
      status: "paid",
      subscription_id: "sub_creator",
    },
    id: "evt_order_creator",
    type: "order.paid",
  });

  assert.equal(route.adminDb.docs.users["user-1"].activeMember, true);
  assert.equal(route.adminDb.docs.users["user-1"].membershipTier, "company");
});

test("order.paid and subscription.active produce one activation email", async () => {
  const route = loadRoute({
    seed: {
      users: {
        "user-1": { activeMember: false, email: "member@example.com" },
      },
    },
  });

  await route.captured.onOrderPaid({
    data: {
      customer: { email: "member@example.com", id: "cus_123" },
      id: "order_1",
      metadata: { uid: "user-1" },
      status: "paid",
      subscription_id: "sub_1",
    },
    id: "evt_paid",
    type: "order.paid",
  });
  await route.captured.onSubscriptionActive({
    data: {
      customer_id: "cus_123",
      id: "sub_1",
      status: "active",
    },
    id: "evt_active_after_paid",
    type: "subscription.active",
  });

  assert.equal(
    route.emailEvents.filter(
      (event) => event.type === "billing.membership_activated"
    ).length,
    1
  );
});

test("subscription.active and order.paid produce one activation email when active arrives first", async () => {
  const route = loadRoute({
    seed: {
      users: {
        "user-1": { activeMember: false, email: "member@example.com" },
      },
    },
  });

  await route.captured.onSubscriptionActive({
    data: {
      customer: { external_id: "user-1", id: "cus_123" },
      current_period_end: "2026-08-14T12:00:00.000Z",
      id: "sub_1",
      status: "active",
    },
    id: "evt_active_first",
    timestamp: "2026-07-14T12:00:00.000Z",
    type: "subscription.active",
  });
  await route.captured.onOrderPaid({
    data: {
      billing_reason: "subscription_create",
      checkout_id: "checkout_only_exposed_by_order",
      customer: { email: "member@example.com", id: "cus_123" },
      id: "order_1",
      metadata: { uid: "user-1" },
      status: "paid",
      subscription_id: "sub_1",
      total_amount: 1500,
      currency: "eur",
    },
    id: "evt_paid_after_active",
    timestamp: "2026-07-14T12:00:01.000Z",
    type: "order.paid",
  });

  const activationEvents = route.emailEvents.filter(
    (event) => event.type === "billing.membership_activated"
  );
  assert.equal(activationEvents.length, 1);
  assert.equal(activationEvents[0].eventId, "subscription:sub_1");
});

test("processed webhook events are skipped", async () => {
  const processed = new Set(["subscription.active:evt_active"]);
  const route = loadRoute({
    processed,
    seed: {
      users: {
        "user-1": { activeMember: false },
      },
    },
  });

  await route.captured.onSubscriptionActive({
    data: {
      customer: { external_id: "user-1", id: "cus_123" },
      id: "sub_1",
      status: "active",
    },
    id: "evt_active",
    type: "subscription.active",
  });

  assert.equal(route.adminDb.docs.users["user-1"].activeMember, false);
  assert.equal(route.marks.length, 0);
});

test("concurrent replay claims one webhook execution", async () => {
  const route = loadRoute({
    seed: {
      users: {
        "user-1": { activeMember: false, email: "member@example.com" },
      },
    },
  });
  const payload = {
    data: {
      customer: { email: "member@example.com", id: "cus_123" },
      id: "order_concurrent",
      metadata: { uid: "user-1" },
      status: "paid",
      subscription_id: "sub_concurrent",
    },
    id: "evt_concurrent",
    type: "order.paid",
  };

  await Promise.all([
    route.captured.onOrderPaid(payload),
    route.captured.onOrderPaid(payload),
  ]);

  assert.equal(route.marks.length, 1);
  assert.equal(route.adminDb.docs.orders.order_concurrent.status, "paid");
  assert.equal(
    route.emailEvents.filter(
      (event) => event.type === "billing.membership_activated"
    ).length,
    1
  );
});

test("subscription update handles past_due without revoking access", async () => {
  const route = loadRoute({
    seed: {
      users: {
        "user-1": { polarCustomerId: "cus_123" },
      },
    },
  });

  await route.captured.onSubscriptionUpdated({
    data: {
      current_period_end: "2026-08-14T12:00:00.000Z",
      customer_id: "cus_123",
      id: "sub_1",
      status: "past_due",
    },
    id: "evt_past_due",
    type: "subscription.updated",
  });

  assert.equal(route.adminDb.docs.users["user-1"].activeMember, true);
  assert.equal(route.adminDb.docs.users["user-1"].subscriptionStatus, "past_due");
  assert.equal(route.adminDb.docs.users["user-1"].lastPaymentFailed, true);
  assert.equal(route.adminDb.docs.subscription_events[0].eventType, "past_due");
});

test("scheduled Business updates keep Community access until Polar applies them", async () => {
  const polarStates = [
    {
      currency: "mkd",
      current_period_end: "2026-08-14T12:00:00.000Z",
      customer_id: "cus_123",
      id: "sub_1",
      pending_update: {
        applies_at: "2026-08-14T12:00:00.000Z",
        id: "pending_1",
        product_id: "company-product",
      },
      product_id: "member-product",
      status: "active",
    },
    {
      currency: "mkd",
      current_period_end: "2026-09-14T12:00:00.000Z",
      customer_id: "cus_123",
      id: "sub_1",
      pending_update: null,
      product_id: "company-product",
      status: "active",
    },
  ];
  const route = loadRoute({
    getPolarSubscriptionImpl: async () => polarStates.shift(),
    seed: {
      users: {
        "user-1": {
          activeMember: true,
          email: "member@example.com",
          membershipTier: "member",
          pendingMembershipCurrency: "MKD",
          pendingMembershipEffectiveAt: "2026-08-14T12:00:00.000Z",
          pendingMembershipPriceAmount: 299900,
          pendingMembershipProductId: "company-product",
          pendingMembershipStatus: "scheduled",
          pendingMembershipTier: "company",
          polarCustomerId: "cus_123",
        },
      },
    },
  });

  // The adapter-stripped payload omits pending_update. The handler must fetch
  // Polar's authoritative state because Firestore says an upgrade is pending.
  await route.captured.onSubscriptionUpdated({
    data: {
      customer_id: "cus_123",
      id: "sub_1",
      product_id: "member-product",
      status: "active",
    },
    id: "evt_upgrade_scheduled",
    type: "subscription.updated",
  });

  let user = route.adminDb.docs.users["user-1"];
  assert.equal(user.membershipTier, "member");
  assert.equal(user.pendingMembershipTier, "company");
  assert.equal(
    route.emailEvents.some((event) => event.type === "billing.plan_changed"),
    false
  );

  await route.captured.onSubscriptionUpdated({
    data: {
      customer_id: "cus_123",
      id: "sub_1",
      product_id: "company-product",
      status: "active",
    },
    id: "evt_upgrade_applied",
    type: "subscription.updated",
  });

  user = route.adminDb.docs.users["user-1"];
  assert.equal(user.membershipTier, "company");
  assert.equal(user.pendingMembershipTier, null);
  assert.equal(
    route.emailEvents.filter(
      (event) => event.type === "billing.plan_changed"
    ).length,
    1
  );
});

test("subscription canceled keeps access until period end and revoked removes access", async () => {
  const route = loadRoute({
    seed: {
      users: {
        "user-1": { polarCustomerId: "cus_123" },
      },
    },
  });

  await route.captured.onSubscriptionCanceled({
    data: {
      current_period_end: "2026-08-14T12:00:00.000Z",
      customer_id: "cus_123",
      id: "sub_1",
      status: "canceled",
    },
    id: "evt_canceled",
    type: "subscription.canceled",
  });

  assert.equal(route.adminDb.docs.users["user-1"].activeMember, true);
  assert.equal(route.adminDb.docs.users["user-1"].willRenew, false);
  assert.equal(route.adminDb.docs.users["user-1"].subscriptionStatus, "canceled");

  await route.captured.onSubscriptionRevoked({
    data: {
      customer_id: "cus_123",
      id: "sub_1",
      status: "revoked",
    },
    id: "evt_revoked",
    type: "subscription.revoked",
  });

  assert.equal(route.adminDb.docs.users["user-1"].activeMember, false);
  assert.equal(route.adminDb.docs.users["user-1"].subscriptionStatus, "revoked");
});

test("full refunds revoke access while partial refunds only update the order", async () => {
  let route = loadRoute({
    seed: {
      users: {
        "user-1": { activeMember: true, polarCustomerId: "cus_123" },
      },
    },
  });

  await route.captured.onOrderRefunded({
    data: {
      amount: 1000,
      customer_id: "cus_123",
      id: "order_1",
      refunded_amount: 1000,
    },
    id: "evt_refund_full",
    type: "order.refunded",
  });

  assert.equal(route.adminDb.docs.users["user-1"].activeMember, false);
  assert.equal(route.adminDb.docs.orders.order_1.status, "refunded");

  route = loadRoute({
    seed: {
      users: {
        "user-1": { activeMember: true, polarCustomerId: "cus_123" },
      },
    },
  });

  await route.captured.onOrderRefunded({
    data: {
      amount: 1000,
      customer_id: "cus_123",
      id: "order_2",
      refunded_amount: 250,
    },
    id: "evt_refund_partial",
    type: "order.refunded",
  });

  assert.equal(route.adminDb.docs.users["user-1"].activeMember, true);
  assert.equal(
    route.adminDb.docs.orders.order_2.status,
    "partially_refunded"
  );
  assert.equal(route.adminDb.docs.orders.order_2.refundedAmount, 250);
});
