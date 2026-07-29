const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const fixedNow = new Date("2026-07-29T12:00:00.000Z");

class FixedDate extends Date {
  constructor(value) {
    super(arguments.length === 0 ? fixedNow.getTime() : value);
  }

  static now() {
    return fixedNow.getTime();
  }
}

function loadDeduplication() {
  const markers = {};
  const adminDb = {
    collection(name) {
      assert.equal(name, "processed_webhooks");
      return {
        doc(id) {
          return {
            id,
            async get() {
              return {
                exists: Object.hasOwn(markers, id),
                data: () => markers[id] || {},
              };
            },
            async set(data, options = {}) {
              markers[id] = options.merge
                ? { ...(markers[id] || {}), ...data }
                : data;
            },
          };
        },
      };
    },
    async runTransaction(callback) {
      return callback({
        delete(ref) {
          delete markers[ref.id];
        },
        async get(ref) {
          return {
            exists: Object.hasOwn(markers, ref.id),
            data: () => markers[ref.id] || {},
          };
        },
        set(ref, data, options = {}) {
          markers[ref.id] = options.merge
            ? { ...(markers[ref.id] || {}), ...data }
            : data;
        },
      });
    },
  };
  const source = loadSourceModule(
    "src/lib/webhook-deduplication.js",
    [
      "claimWebhookProcessing",
      "isWebhookProcessed",
      "markWebhookProcessed",
      "releaseWebhookProcessing",
    ],
    {
      stripImports: true,
      sandbox: { adminDb, Date: FixedDate },
    }
  );
  return { ...source, markers };
}

test("webhook claim is exclusive and completion is durable", async () => {
  const dedupe = loadDeduplication();

  assert.equal(
    await dedupe.claimWebhookProcessing("evt_1", "order.paid", {
      data: { id: "order_1" },
    }),
    true
  );
  assert.equal(
    await dedupe.claimWebhookProcessing("evt_1", "order.paid", {}),
    false
  );

  await dedupe.markWebhookProcessed("evt_1", "order.paid", {
    data: { id: "order_1" },
  });

  assert.equal(await dedupe.isWebhookProcessed("evt_1", "order.paid"), true);
  assert.equal(
    await dedupe.claimWebhookProcessing("evt_1", "order.paid", {}),
    false
  );
  assert.equal(dedupe.markers["order.paid_evt_1"].status, "processed");
});

test("failed webhook claims are released for a safe retry", async () => {
  const dedupe = loadDeduplication();

  assert.equal(
    await dedupe.claimWebhookProcessing("evt_retry", "subscription.active", {}),
    true
  );
  await dedupe.releaseWebhookProcessing("evt_retry", "subscription.active");
  assert.equal(
    await dedupe.claimWebhookProcessing("evt_retry", "subscription.active", {}),
    true
  );
});
