const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const confirmation = loadSourceModule(
  "src/lib/subscription-confirmation.js",
  [
    "createSubscriptionConfirmationAttempt",
    "isSubscriptionConfirmationAttemptFresh",
    "shouldShowSubscriptionConfirmation",
  ]
);

const fixedNow = Date.parse("2026-07-28T12:00:00.000Z");

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
  };
}

test("subscription confirmation requires a fresh checkout attempt and a new verified activation", () => {
  const attempt = confirmation.createSubscriptionConfirmationAttempt({
    baselineConfirmationId: "previous-activation",
    baselineMembershipTier: null,
    interval: "annual",
    now: fixedNow,
    tier: "company",
    userId: "user-1",
  });

  assert.equal(attempt.interval, "annual");
  assert.equal(attempt.mode, "purchase");
  assert.equal(attempt.tier, "company");
  assert.equal(
    confirmation.shouldShowSubscriptionConfirmation({
      attempt,
      now: fixedNow + 60_000,
      userId: "user-1",
      verification: {
        hasPaidSubscription: true,
        membershipConfirmationId: "new-activation",
      },
    }),
    true
  );
});

test("Business upgrade confirmation waits for the server-verified target tier", () => {
  const attempt = confirmation.createSubscriptionConfirmationAttempt({
    baselineConfirmationId: "existing-activation",
    baselineMembershipTier: "member",
    mode: "upgrade",
    now: fixedNow,
    tier: "company",
    userId: "user-1",
  });

  assert.equal(
    confirmation.shouldShowSubscriptionConfirmation({
      attempt,
      now: fixedNow + 60_000,
      userId: "user-1",
      verification: {
        hasPaidSubscription: true,
        membershipConfirmationId: "existing-activation",
        membershipTier: "member",
      },
    }),
    false
  );
  assert.equal(
    confirmation.shouldShowSubscriptionConfirmation({
      attempt,
      now: fixedNow + 60_000,
      userId: "user-1",
      verification: {
        hasPaidSubscription: true,
        membershipConfirmationId: "existing-activation",
        membershipTier: "company",
      },
    }),
    true
  );
});

test("subscription confirmation rejects URL-only, inactive, repeated, stale, and cross-account visits", () => {
  const attempt = confirmation.createSubscriptionConfirmationAttempt({
    baselineConfirmationId: "same-activation",
    now: fixedNow,
    userId: "user-1",
  });
  const activeVerification = {
    hasPaidSubscription: true,
    membershipConfirmationId: "same-activation",
  };

  assert.equal(
    confirmation.shouldShowSubscriptionConfirmation({
      attempt: null,
      now: fixedNow,
      userId: "user-1",
      verification: {
        hasPaidSubscription: true,
        membershipConfirmationId: "new-activation",
      },
    }),
    false
  );
  assert.equal(
    confirmation.shouldShowSubscriptionConfirmation({
      attempt,
      now: fixedNow,
      userId: "user-1",
      verification: {
        hasPaidSubscription: false,
        membershipConfirmationId: "new-activation",
      },
    }),
    false
  );
  assert.equal(
    confirmation.shouldShowSubscriptionConfirmation({
      attempt,
      now: fixedNow,
      userId: "user-1",
      verification: activeVerification,
    }),
    false
  );
  assert.equal(
    confirmation.shouldShowSubscriptionConfirmation({
      attempt,
      now: fixedNow + 25 * 60 * 60 * 1000,
      userId: "user-1",
      verification: {
        hasPaidSubscription: true,
        membershipConfirmationId: "new-activation",
      },
    }),
    false
  );
  assert.equal(
    confirmation.shouldShowSubscriptionConfirmation({
      attempt,
      now: fixedNow,
      userId: "another-user",
      verification: {
        hasPaidSubscription: true,
        membershipConfirmationId: "new-activation",
      },
    }),
    false
  );
});

test("acknowledging a confirmation clears the checkout session and suppresses repeats", () => {
  const localStorage = createMemoryStorage();
  const sessionStorage = createMemoryStorage();
  const browserConfirmation = loadSourceModule(
    "src/lib/subscription-confirmation.js",
    [
      "acknowledgeMembershipConfirmation",
      "beginSubscriptionConfirmationAttempt",
      "getPendingSubscriptionConfirmationAttempt",
      "isMembershipConfirmationAcknowledged",
    ],
    {
      sandbox: {
        window: { localStorage, sessionStorage },
      },
    }
  );

  browserConfirmation.beginSubscriptionConfirmationAttempt({
    userId: "user-1",
  });
  assert.ok(
    browserConfirmation.getPendingSubscriptionConfirmationAttempt({
      userId: "user-1",
    })
  );

  browserConfirmation.acknowledgeMembershipConfirmation("activation-1");

  assert.equal(
    browserConfirmation.getPendingSubscriptionConfirmationAttempt({
      userId: "user-1",
    }),
    null
  );
  assert.equal(
    browserConfirmation.isMembershipConfirmationAcknowledged("activation-1"),
    true
  );
  assert.equal(
    browserConfirmation.isMembershipConfirmationAcknowledged("activation-2"),
    false
  );
});

test("subscription success dialog is accessible, responsive, and links to every requested destination", () => {
  const successPage = fs.readFileSync(
    "src/app/subscription/success/page.js",
    "utf8"
  );
  const dialogPrimitive = fs.readFileSync(
    "src/components/ui/dialog.jsx",
    "utf8"
  );
  const subscribeButton = fs.readFileSync(
    "src/components/ui/SubscribeButton.jsx",
    "utf8"
  );
  const pricingDisplay = fs.readFileSync(
    "src/components/pricing/PricingDisplay.js",
    "utf8"
  );

  assert.match(
    successPage,
    /You’re officially a Galactic Omnivore member!/
  );
  assert.match(successPage, /about 10 minutes/);
  assert.match(successPage, /DialogTitle/);
  assert.match(successPage, /DialogDescription/);
  assert.match(successPage, /onOpenChange=\{handleDialogOpenChange\}/);
  assert.match(successPage, /max-h-\[calc\(100vh-2rem\)\]/);
  assert.match(successPage, /w-\[calc\(100%-2rem\)\]/);
  assert.match(successPage, /overflow-y-auto/);
  assert.match(successPage, /sm:px-8/);
  assert.match(successPage, /navigateAfterConfirmation\(\"\/onboarding\"\)/);
  assert.match(successPage, /navigateAfterConfirmation\(\"\/dashboard\"\)/);
  assert.match(successPage, /navigateAfterConfirmation\(\"\/projects\"\)/);
  assert.doesNotMatch(successPage, /useSearchParams/);
  assert.match(subscribeButton, /beginSubscriptionConfirmationAttempt/);
  assert.match(pricingDisplay, /beginSubscriptionConfirmationAttempt/);
  assert.match(subscribeButton, /if \(data\.flow !== "portal"\)/);
  assert.match(pricingDisplay, /if \(result\.flow !== "portal"\)/);
  assert.match(dialogPrimitive, /DialogPrimitive\.Content/);
  assert.match(dialogPrimitive, /DialogPrimitive\.Title/);
  assert.match(dialogPrimitive, /DialogPrimitive\.Description/);
  assert.match(dialogPrimitive, /DialogPrimitive\.Close/);
});
