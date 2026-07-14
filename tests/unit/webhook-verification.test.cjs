const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const { verifyWebhookSignature } = loadSourceModule("src/lib/webhook-verification.js", [
  "verifyWebhookSignature",
]);

function sign(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

function withMutedConsole(fn) {
  const original = {
    error: console.error,
    log: console.log,
    warn: console.warn,
  };
  console.error = () => {};
  console.log = () => {};
  console.warn = () => {};

  try {
    return fn();
  } finally {
    console.error = original.error;
    console.log = original.log;
    console.warn = original.warn;
  }
}

test("verifyWebhookSignature accepts a matching Polar HMAC signature", () => {
  const payload = JSON.stringify({ type: "order.paid", data: { id: "order_123" } });
  const secret = "whsec_test";

  withMutedConsole(() => {
    assert.equal(verifyWebhookSignature(payload, `sha256=${sign(payload, secret)}`, secret), true);
    assert.equal(verifyWebhookSignature(payload, sign(payload, secret), secret), true);
  });
});

test("verifyWebhookSignature rejects a wrong or malformed signature", () => {
  const payload = JSON.stringify({ type: "subscription.revoked" });
  const secret = "whsec_test";
  const wrongSameLength = "0".repeat(64);

  withMutedConsole(() => {
    assert.equal(verifyWebhookSignature(payload, wrongSameLength, secret), false);
    assert.equal(verifyWebhookSignature(payload, "not-hex", secret), false);
  });
});

test("verifyWebhookSignature allows missing signature data for local development", () => {
  withMutedConsole(() => {
    assert.equal(verifyWebhookSignature("{}", null, "secret"), true);
    assert.equal(verifyWebhookSignature("{}", "sha256=abc", ""), true);
  });
});
