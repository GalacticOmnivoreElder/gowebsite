const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const { formatPurchaseAmount, sendPurchaseConfirmationEmail } = loadSourceModule(
  "src/lib/purchase-email.js",
  ["formatPurchaseAmount", "sendPurchaseConfirmationEmail"],
  {
    stripImports: true,
    sandbox: {
      getResend() {
        throw new Error("A test Resend client must be supplied");
      },
    },
  }
);

test("purchase amounts use Polar minor units", () => {
  assert.match(formatPurchaseAmount(299900, "mkd"), /2,999/);
  assert.equal(formatPurchaseAmount(null, "mkd"), null);
});

test("purchase confirmation identifies the plan and billing destination", async () => {
  const sends = [];
  const result = await sendPurchaseConfirmationEmail(
    {
      amount: 299900,
      currency: "mkd",
      displayName: "Ada",
      interval: "month",
      orderId: "order_1",
      tier: "company",
      to: "ada@example.com",
    },
    {
      emails: {
        async send(payload) {
          sends.push(payload);
          return { data: { id: "email-1" }, error: null };
        },
      },
    }
  );

  assert.equal(result.emailId, "email-1");
  assert.equal(sends[0].to, "ada@example.com");
  assert.match(sends[0].subject, /GO Business/);
  assert.match(sends[0].text, /order_1/);
  assert.match(sends[0].text, /\/billing/);
});

test("purchase confirmation surfaces email provider failures", async () => {
  await assert.rejects(
    sendPurchaseConfirmationEmail(
      {
        tier: "member",
        to: "member@example.com",
      },
      {
        emails: {
          async send() {
            return { data: null, error: { message: "Domain not verified" } };
          },
        },
      }
    ),
    /Domain not verified/
  );
});
