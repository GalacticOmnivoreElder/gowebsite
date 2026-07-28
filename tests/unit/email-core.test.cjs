const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const events = loadSourceModule("src/lib/email/events.js", [
  "EMAIL_CATEGORIES",
  "EMAIL_EVENTS",
  "getEmailEventDefinition",
  "validateEmailEvent",
]);

const preferences = loadSourceModule(
  "src/lib/email/preferences.js",
  ["getEmailPreferenceDecision", "isEssentialEmailEvent"],
  {
    stripImports: true,
    sandbox: {
      EMAIL_CATEGORIES: events.EMAIL_CATEGORIES,
      getEmailEventDefinition: events.getEmailEventDefinition,
    },
  }
);

const utils = loadSourceModule("src/lib/email/utils.js", [
  "createNewsletterConfirmationToken",
  "createSignedActionToken",
  "hashOpaqueToken",
  "makeEmailJobId",
  "makeIdempotencyKey",
  "normalizeEmail",
  "verifySignedActionToken",
]);

test("email preferences separate essential, product, package, reminder, and marketing consent", () => {
  assert.equal(
    preferences.getEmailPreferenceDecision({
      eventType: "billing.payment_failed",
      userData: {
        settings: {
          emailNotifications: false,
          marketingEmails: false,
          newPackageAlerts: false,
          subscriptionReminders: false,
        },
      },
    }).allowed,
    true
  );
  assert.equal(
    preferences.getEmailPreferenceDecision({
      eventType: "project.status_changed",
      userData: { settings: { emailNotifications: false } },
    }).allowed,
    false
  );
  assert.equal(
    preferences.getEmailPreferenceDecision({
      eventType: "package.published",
      userData: { settings: { newPackageAlerts: false } },
    }).allowed,
    false
  );
  assert.equal(
    preferences.getEmailPreferenceDecision({
      eventType: "billing.renewal_reminder",
      userData: { settings: { subscriptionReminders: false } },
    }).allowed,
    false
  );
  assert.equal(
    preferences.getEmailPreferenceDecision({
      eventType: "newsletter.campaign",
      newsletterSubscriber: { status: "pending" },
    }).allowed,
    false
  );
  assert.equal(
    preferences.getEmailPreferenceDecision({
      eventType: "newsletter.campaign",
      newsletterSubscriber: { status: "subscribed" },
    }).allowed,
    true
  );
  assert.equal(
    preferences.getEmailPreferenceDecision({
      eventType: "newsletter.campaign",
      newsletterSubscriber: { status: "subscribed" },
      emailSuppression: { status: "complained" },
    }).allowed,
    false
  );
});

test("email normalization and signed newsletter tokens are deterministic, expiring, and tamper evident", () => {
  const originalSecret = process.env.NEWSLETTER_TOKEN_SECRET;
  process.env.NEWSLETTER_TOKEN_SECRET = "test-secret-that-is-at-least-32-bytes-long";
  try {
    assert.equal(utils.normalizeEmail("  ADA@Example.COM "), "ada@example.com");
    assert.equal(utils.normalizeEmail("invalid"), "");

    const first = utils.createNewsletterConfirmationToken("subscriber-1", "v1");
    const second = utils.createNewsletterConfirmationToken("subscriber-1", "v1");
    assert.equal(first, second);
    assert.equal(utils.hashOpaqueToken(first), utils.hashOpaqueToken(second));

    const signed = utils.createSignedActionToken("subscriber-1", 2, 60);
    assert.equal(utils.verifySignedActionToken(signed).sub, "subscriber-1");
    assert.equal(utils.verifySignedActionToken(`${signed}tampered`), null);

    const expired = utils.createSignedActionToken("subscriber-1", 2, -1);
    assert.equal(utils.verifySignedActionToken(expired), null);
  } finally {
    if (originalSecret === undefined) delete process.env.NEWSLETTER_TOKEN_SECRET;
    else process.env.NEWSLETTER_TOKEN_SECRET = originalSecret;
  }
});

function loadOutbox({
  jobOverrides = {},
  sendError,
  seed = {},
} = {}) {
  let sendCalls = 0;
  let job = {
    eventType: "account.welcome",
    eventId: "user-1",
    recipient: "member@example.com",
    category: "essential",
    status: "pending",
    attempts: 0,
    nextAttemptAt: new Date(Date.now() - 1000),
    templateData: {},
    idempotencyKey: "welcome/user-1/member",
    ...jobOverrides,
  };
  const ref = {
    async update(update) {
      job = { ...job, ...update };
    },
  };
  const candidate = { id: "job-1", ref, data: () => job };
  const query = {
    where() {
      return this;
    },
    orderBy() {
      return this;
    },
    limit() {
      return this;
    },
    async get() {
      return { docs: [candidate], empty: false };
    },
  };
  const adminDb = {
    collection(name) {
      if (name === "email_outbox") return query;
      if (["users", "user_profiles", "onboarding_sessions"].includes(name)) {
        return {
          doc(id) {
            return {
              async get() {
                const data = seed[name]?.[id];
                return {
                  exists: !!data,
                  data: () => data || {},
                };
              },
            };
          },
        };
      }
      throw new Error(`Unexpected collection: ${name}`);
    },
    async runTransaction(callback) {
      return callback({
        get: async () => ({ id: "job-1", exists: true, data: () => job }),
        update: (_target, update) => {
          job = { ...job, ...update };
        },
      });
    },
  };
  const module = loadSourceModule(
    "src/lib/email/outbox.js",
    [
      "createEmailOutboxJob",
      "isMissingFirestoreIndexError",
      "processEmailOutbox",
    ],
    {
      stripImports: true,
      sandbox: {
        adminDb,
        getEmailPreferenceDecision: () => ({ allowed: true }),
        makeEmailJobId: utils.makeEmailJobId,
        makeIdempotencyKey: utils.makeIdempotencyKey,
        normalizeEmail: utils.normalizeEmail,
        hashValue: (value) => require("node:crypto")
          .createHash("sha256")
          .update(String(value))
          .digest("hex"),
        sendEmailJob: async () => {
          sendCalls += 1;
          if (sendError) throw sendError;
          return { status: "sent", providerEmailId: "email-1" };
        },
        validateEmailEvent: events.validateEmailEvent,
      },
    }
  );
  return {
    ...module,
    getJob: () => job,
    getSendCalls: () => sendCalls,
  };
}

function loadPermanentDedupOutbox() {
  const docs = {
    email_deduplication: {},
    email_outbox: {},
  };
  const adminDb = {
    collection(name) {
      return {
        doc(id) {
          return { collectionName: name, id };
        },
      };
    },
    async runTransaction(callback) {
      return callback({
        async get(ref) {
          const value = docs[ref.collectionName]?.[ref.id];
          return {
            exists: !!value,
            data: () => value || {},
          };
        },
        create(ref, value) {
          if (docs[ref.collectionName][ref.id]) {
            throw new Error("already exists");
          }
          docs[ref.collectionName][ref.id] = value;
        },
      });
    },
  };
  const module = loadSourceModule(
    "src/lib/email/outbox.js",
    ["enqueueEmailEvent"],
    {
      stripImports: true,
      sandbox: {
        adminDb,
        getEmailPreferenceDecision: () => ({ allowed: true }),
        makeEmailJobId: utils.makeEmailJobId,
        makeIdempotencyKey: utils.makeIdempotencyKey,
        normalizeEmail: utils.normalizeEmail,
        hashValue: (value) =>
          require("node:crypto")
            .createHash("sha256")
            .update(String(value))
            .digest("hex"),
        sendEmailJob: async () => ({
          status: "sent",
          providerEmailId: "email-1",
        }),
        validateEmailEvent: events.validateEmailEvent,
      },
    }
  );
  return { ...module, docs };
}

test("outbox IDs permanently deduplicate the same semantic event", () => {
  const outbox = loadOutbox();
  const event = {
    type: "application.approved",
    eventId: "application-1",
    userId: "user-1",
    recipient: "Member@Example.com",
    data: { projectId: "project-1" },
  };
  const first = outbox.createEmailOutboxJob(event);
  const second = outbox.createEmailOutboxJob(event);
  assert.equal(first.id, second.id);
  assert.equal(first.idempotencyKey, second.idempotencyKey);
  assert.notEqual(
    first.id,
    outbox.createEmailOutboxJob({ ...event, eventId: "application-2" }).id
  );
  assert.throws(
    () =>
      outbox.createEmailOutboxJob({
        ...event,
        data: { password: "must-not-enter-outbox" },
      }),
    /Sensitive email template field/
  );
});

test("permanent deduplication survives outbox TTL deletion", async () => {
  const outbox = loadPermanentDedupOutbox();
  const event = {
    type: "billing.membership_activated",
    eventId: "checkout:checkout-1",
    userId: "user-1",
    recipient: "member@example.com",
    data: { tier: "member" },
  };

  assert.equal((await outbox.enqueueEmailEvent(event)).created, true);
  assert.equal((await outbox.enqueueEmailEvent(event)).created, false);

  const jobId = Object.keys(outbox.docs.email_outbox)[0];
  delete outbox.docs.email_outbox[jobId];

  assert.equal((await outbox.enqueueEmailEvent(event)).created, false);
  assert.ok(outbox.docs.email_deduplication[jobId]);
});

test("outbox retries transient errors and finalizes permanent failures", async () => {
  let outbox = loadOutbox({
    sendError: Object.assign(new Error("temporary"), { code: "provider_error" }),
  });
  await outbox.processEmailOutbox();
  assert.equal(outbox.getJob().status, "pending");
  assert.equal(outbox.getJob().attempts, 1);
  assert.ok(outbox.getJob().nextAttemptAt > new Date());

  outbox = loadOutbox({
    sendError: Object.assign(new Error("invalid"), {
      code: "validation_error",
      permanent: true,
    }),
  });
  await outbox.processEmailOutbox();
  assert.equal(outbox.getJob().status, "failed");
  assert.ok(outbox.getJob().expiresAt instanceof Date);
});

test("outbox recognizes only Firestore missing-index failures", () => {
  const outbox = loadOutbox();
  assert.equal(
    outbox.isMissingFirestoreIndexError({
      code: 9,
      details: "The query requires an index.",
    }),
    true
  );
  assert.equal(
    outbox.isMissingFirestoreIndexError({
      code: 9,
      details: "A different failed precondition",
    }),
    false
  );
  assert.equal(
    outbox.isMissingFirestoreIndexError({
      code: 13,
      details: "The query requires an index.",
    }),
    false
  );
});

test("onboarding reminders are suppressed from authoritative completed state", async () => {
  const outbox = loadOutbox({
    jobOverrides: {
      category: "essential",
      eventType: "onboarding.incomplete_reminder",
      eventId: "user-1-membership-onboarding",
      userId: "user-1",
    },
    seed: {
      onboarding_sessions: {
        "user-1": { status: "in_progress" },
      },
      user_profiles: {
        "user-1": { onboarding_completed: true },
      },
      users: {
        "user-1": {
          activeMember: true,
          email: "member@example.com",
          onboardingCompleted: false,
        },
      },
    },
  });

  await outbox.processEmailOutbox();

  assert.equal(outbox.getJob().status, "suppressed");
  assert.equal(outbox.getJob().suppressionReason, "onboarding_completed");
  assert.equal(outbox.getSendCalls(), 0);
});
