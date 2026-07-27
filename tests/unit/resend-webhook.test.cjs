const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

function createDb() {
  const docs = {
    email_delivery_events: {},
    email_outbox: {
      "job-1": {
        providerEmailId: "provider-email-1",
        status: "sent",
      },
    },
    processed_email_webhooks: {},
  };

  function ref(collectionName, id) {
    return {
      collectionName,
      id,
      async delete() {
        delete docs[collectionName][id];
      },
      async get() {
        const data = docs[collectionName][id];
        return { exists: data !== undefined, data: () => data };
      },
      async set(data) {
        docs[collectionName][id] = data;
      },
      async update(update) {
        docs[collectionName][id] = {
          ...(docs[collectionName][id] || {}),
          ...update,
        };
      },
    };
  }

  return {
    docs,
    collection(name) {
      if (name === "email_outbox") {
        const filters = [];
        const query = {
          where(field, operator, value) {
            assert.equal(operator, "==");
            filters.push({ field, value });
            return this;
          },
          limit() {
            return this;
          },
          async get() {
            const matches = Object.entries(docs.email_outbox).filter(
              ([, data]) =>
                filters.every(({ field, value }) => data[field] === value)
            );
            return {
              empty: matches.length === 0,
              docs: matches.map(([id, data]) => ({
                id,
                ref: ref("email_outbox", id),
                data: () => data,
              })),
            };
          },
        };
        return query;
      }
      return {
        doc(id) {
          return ref(name, id);
        },
      };
    },
    async runTransaction(callback) {
      return callback({
        get: (target) => target.get(),
        create(target, data) {
          if (docs[target.collectionName][target.id] !== undefined) {
            throw new Error("already exists");
          }
          docs[target.collectionName][target.id] = data;
        },
      });
    },
  };
}

function loadWebhook() {
  const adminDb = createDb();
  const globalSuppressions = [];
  const newsletterSuppressions = [];
  const verificationCalls = [];
  const module = loadSourceModule(
    "src/lib/email/resend-webhook.js",
    ["processResendWebhook", "verifyResendWebhook"],
    {
      stripImports: true,
      sandbox: {
        adminDb,
        getResend: () => ({
          webhooks: {
            verify(input) {
              verificationCalls.push(input);
              return { type: "email.sent", data: {} };
            },
          },
        }),
        normalizeEmail: (value) =>
          typeof value === "string" && value.includes("@")
            ? value.trim().toLowerCase()
            : "",
        process: { env: { EMAIL_TRACK_ENGAGEMENT: "false" } },
        suppressEmailAddress: async (value) => {
          globalSuppressions.push(value);
        },
        suppressNewsletterSubscriber: async (value) => {
          newsletterSuppressions.push(value);
        },
        syncNewsletterContactEvent: async () => true,
      },
    }
  );
  return {
    ...module,
    adminDb,
    globalSuppressions,
    newsletterSuppressions,
    verificationCalls,
  };
}

test("Resend webhook verification passes the raw payload and Svix headers to the SDK", () => {
  const webhook = loadWebhook();
  const result = webhook.verifyResendWebhook({
    payload: '{"type":"email.sent"}',
    headers: { id: "evt-1", timestamp: "123", signature: "v1,sig" },
    secret: "whsec_test",
  });
  assert.equal(result.type, "email.sent");
  assert.deepEqual(
    JSON.parse(JSON.stringify(webhook.verificationCalls[0])),
    {
      payload: '{"type":"email.sent"}',
      headers: { id: "evt-1", timestamp: "123", signature: "v1,sig" },
      webhookSecret: "whsec_test",
    }
  );
});

test("duplicate Resend webhooks are ignored and bounces suppress future marketing", async () => {
  const webhook = loadWebhook();
  const event = {
    type: "email.bounced",
    created_at: "2026-07-27T12:00:00.000Z",
    data: {
      email_id: "provider-email-1",
      to: ["BOUNCE@example.com"],
    },
  };

  const first = await webhook.processResendWebhook({
    providerEventId: "evt-bounce-1",
    event,
  });
  const duplicate = await webhook.processResendWebhook({
    providerEventId: "evt-bounce-1",
    event,
  });

  assert.deepEqual(JSON.parse(JSON.stringify(first)), { processed: true });
  assert.deepEqual(JSON.parse(JSON.stringify(duplicate)), { duplicate: true });
  assert.equal(webhook.adminDb.docs.email_outbox["job-1"].status, "failed");
  assert.equal(
    webhook.adminDb.docs.email_outbox["job-1"].lastErrorCode,
    "bounced"
  );
  assert.equal(webhook.globalSuppressions.length, 1);
  assert.equal(webhook.globalSuppressions[0].email, "bounce@example.com");
  assert.equal(webhook.newsletterSuppressions.length, 1);
  assert.equal(
    webhook.adminDb.docs.processed_email_webhooks["evt-bounce-1"].status,
    "processed"
  );
  assert.equal(
    webhook.adminDb.docs.email_delivery_events["evt-bounce-1"].eventType,
    "email.bounced"
  );
});
