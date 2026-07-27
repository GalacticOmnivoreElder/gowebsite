const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const secret = "newsletter-test-secret-with-more-than-32-bytes";
const utils = loadSourceModule(
  "src/lib/email/utils.js",
  [
    "createNewsletterConfirmationToken",
    "createNewsletterConfirmationVersion",
    "createSignedActionToken",
    "hashOpaqueToken",
    "hashValue",
    "normalizeEmail",
    "verifySignedActionToken",
  ],
  {
    sandbox: {
      process: { env: { NEWSLETTER_TOKEN_SECRET: secret } },
    },
  }
);

function createDb() {
  const docs = {
    newsletter_events: {},
    newsletter_rate_limits: {},
    newsletter_subscribers: {},
  };
  let sequence = 0;

  function ref(collectionName, id) {
    return {
      collectionName,
      id,
      async get() {
        const data = docs[collectionName][id];
        return {
          id,
          exists: data !== undefined,
          data: () => data,
          ref: this,
        };
      },
      async set(data, options = {}) {
        docs[collectionName][id] = options.merge
          ? { ...(docs[collectionName][id] || {}), ...data }
          : data;
      },
      async update(data) {
        if (docs[collectionName][id] === undefined) {
          throw new Error("missing document");
        }
        docs[collectionName][id] = {
          ...docs[collectionName][id],
          ...data,
        };
      },
    };
  }

  return {
    docs,
    collection(name) {
      return {
        doc(id) {
          return ref(name, id || `event-${++sequence}`);
        },
      };
    },
    async runTransaction(callback) {
      const transaction = {
        get: (target) => target.get(),
        set: (target, data, options) => target.set(data, options),
        create: (target, data) => {
          if (docs[target.collectionName][target.id] !== undefined) {
            throw new Error("already exists");
          }
          docs[target.collectionName][target.id] = data;
        },
        update: (target, data) => target.update(data),
      };
      return callback(transaction);
    },
  };
}

function loadNewsletter() {
  const adminDb = createDb();
  const jobs = [];
  const module = loadSourceModule(
    "src/lib/email/newsletter.js",
    [
      "NEWSLETTER_GENERIC_RESPONSE",
      "confirmNewsletterSubscription",
      "consumeNewsletterRateLimit",
      "getNewsletterPreferences",
      "newsletterFingerprint",
      "requestNewsletterSubscription",
      "updateNewsletterPreferences",
    ],
    {
      stripImports: true,
      sandbox: {
        ...utils,
        adminDb,
        enqueueEmailEvent: async (event) => {
          jobs.push(event);
          return { created: true, id: `job-${jobs.length}` };
        },
        getResend: () => {
          throw new Error("Resend must not be called in tests");
        },
        process: {
          env: {
            NEWSLETTER_TOKEN_SECRET: secret,
            NODE_ENV: "test",
          },
        },
      },
    }
  );
  return { ...module, adminDb, jobs };
}

test("newsletter double opt-in deduplicates pending requests and uses a single-use confirmation", async () => {
  const newsletter = loadNewsletter();
  const response = await newsletter.requestNewsletterSubscription({
    email: " Ada@Example.com ",
    source: "homepage",
    consent: true,
  });
  assert.deepEqual(
    JSON.parse(JSON.stringify(response)),
    JSON.parse(JSON.stringify(newsletter.NEWSLETTER_GENERIC_RESPONSE))
  );
  assert.equal(newsletter.jobs.length, 1);
  assert.equal(newsletter.jobs[0].recipient, "ada@example.com");
  assert.equal(newsletter.jobs[0].data.confirmationUrl, undefined);

  await newsletter.requestNewsletterSubscription({
    email: "ada@example.com",
    source: "footer",
    consent: true,
  });
  assert.equal(newsletter.jobs.length, 1);

  const subscriberId = utils.hashValue("ada@example.com");
  const subscriber =
    newsletter.adminDb.docs.newsletter_subscribers[subscriberId];
  assert.equal(subscriber.status, "pending");
  const token = utils.createNewsletterConfirmationToken(
    subscriberId,
    subscriber.confirmationVersion
  );

  const confirmed = await newsletter.confirmNewsletterSubscription({
    subscriberId,
    token,
  });
  assert.equal(confirmed.status, "confirmed");
  assert.ok(confirmed.preferencesToken);
  assert.equal(
    newsletter.adminDb.docs.newsletter_subscribers[subscriberId]
      .confirmationTokenHash,
    null
  );

  const second = await newsletter.confirmNewsletterSubscription({
    subscriberId,
    token,
  });
  assert.equal(second.status, "already-confirmed");
  const confirmedEvents = Object.values(
    newsletter.adminDb.docs.newsletter_events
  ).filter((event) => event.eventType === "confirmed");
  assert.equal(confirmedEvents.length, 1);
});

test("newsletter unsubscribe requires a fresh double opt-in to resubscribe", async () => {
  const newsletter = loadNewsletter();
  await newsletter.requestNewsletterSubscription({
    email: "member@example.com",
    source: "homepage",
    consent: true,
  });
  const subscriberId = utils.hashValue("member@example.com");
  let subscriber =
    newsletter.adminDb.docs.newsletter_subscribers[subscriberId];
  const confirmed = await newsletter.confirmNewsletterSubscription({
    subscriberId,
    token: utils.createNewsletterConfirmationToken(
      subscriberId,
      subscriber.confirmationVersion
    ),
  });

  const unsubscribed = await newsletter.updateNewsletterPreferences({
    token: confirmed.preferencesToken,
    topics: {},
    unsubscribe: true,
  });
  assert.equal(unsubscribed.status, "unsubscribed");
  assert.equal(
    newsletter.adminDb.docs.newsletter_subscribers[subscriberId].status,
    "unsubscribed"
  );

  await newsletter.requestNewsletterSubscription({
    email: "member@example.com",
    source: "footer",
    consent: true,
  });
  subscriber = newsletter.adminDb.docs.newsletter_subscribers[subscriberId];
  assert.equal(subscriber.status, "pending");
  assert.equal(newsletter.jobs.length, 2);
});

test("newsletter honeypot is a no-op and signup rate limiting is server-side", async () => {
  const newsletter = loadNewsletter();
  await newsletter.requestNewsletterSubscription({
    email: "bot@example.com",
    source: "homepage",
    consent: true,
    honeypot: "Robot Company",
  });
  assert.equal(
    Object.keys(newsletter.adminDb.docs.newsletter_subscribers).length,
    0
  );
  assert.equal(newsletter.jobs.length, 0);

  const fingerprint = newsletter.newsletterFingerprint(
    "203.0.113.5",
    "person@example.com"
  );
  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.equal(
      await newsletter.consumeNewsletterRateLimit(fingerprint),
      true
    );
  }
  assert.equal(
    await newsletter.consumeNewsletterRateLimit(fingerprint),
    false
  );
});
