const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const {
  normalizeRefundTransition,
  normalizeSubscriptionTransition,
} = loadSourceModule(
  "src/lib/subscription-state.js",
  ["normalizeRefundTransition", "normalizeSubscriptionTransition"]
);

const now = new Date("2026-07-29T12:00:00.000Z");

test("subscription transitions preserve retry access and end revoked access", () => {
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(
        normalizeSubscriptionTransition({
          eventType: "subscription.updated",
          now,
          status: "past_due",
        })
      )
    ),
    {
      activeMember: true,
      lastPaymentFailed: true,
      subscriptionStatus: "past_due",
      willRenew: false,
    }
  );
  assert.equal(
    normalizeSubscriptionTransition({
      eventType: "subscription.revoked",
      now,
    }).activeMember,
    false
  );
});

test("canceled subscriptions keep access only through a future effective end", () => {
  assert.equal(
    normalizeSubscriptionTransition({
      currentPeriodEnd: new Date("2026-08-29T12:00:00.000Z"),
      eventType: "subscription.canceled",
      now,
    }).activeMember,
    true
  );
  assert.equal(
    normalizeSubscriptionTransition({
      currentPeriodEnd: new Date("2026-07-28T12:00:00.000Z"),
      eventType: "subscription.canceled",
      now,
    }).activeMember,
    false
  );
});

test("full and partial refunds have distinct entitlement effects", () => {
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(
        normalizeRefundTransition({
          refundedAmount: 500,
          totalAmount: 500,
        })
      )
    ),
    {
      isFullRefund: true,
      orderStatus: "refunded",
      revokeEntitlement: true,
    }
  );
  assert.equal(
    normalizeRefundTransition({
      refundedAmount: 100,
      totalAmount: 500,
    }).revokeEntitlement,
    false
  );
});
