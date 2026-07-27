const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");
const { NextResponse, createRequest } = require("../helpers/route-test-utils.cjs");

test("public newsletter signup passes signed-out visitors through server-side controls", async () => {
  const calls = [];
  const route = loadSourceModule(
    "src/app/api/newsletter/subscribe/route.js",
    ["POST"],
    {
      stripImports: true,
      sandbox: {
        NextResponse,
        consumeNewsletterRateLimit: async () => true,
        getRequestUser: async () => null,
        newsletterFingerprint: (ip, email) => `${ip}:${email}`,
        requestNewsletterSubscription: async (input) => {
          calls.push(input);
          return {
            success: true,
            message:
              "If this address can be subscribed, a confirmation email will arrive shortly.",
          };
        },
      },
    }
  );
  const response = await route.POST(
    createRequest({
      headers: { "x-forwarded-for": "203.0.113.2" },
      jsonBody: {
        email: "visitor@example.com",
        consent: true,
        source: "homepage",
      },
    })
  );
  assert.equal(response.status, 200);
  assert.equal(calls[0].userId, null);
  assert.equal(calls[0].verifiedUserEmail, null);
  assert.equal(calls[0].consent, true);
});

test("newsletter preferences support signed, login-free reads and unsubscribe", async () => {
  const updates = [];
  const route = loadSourceModule(
    "src/app/api/newsletter/preferences/route.js",
    ["GET", "POST"],
    {
      stripImports: true,
      sandbox: {
        NextResponse,
        getNewsletterPreferences: async (token) =>
          token === "valid-token"
            ? {
                normalizedEmail: "member@example.com",
                status: "subscribed",
                topics: { newsletter: true },
              }
            : null,
        maskEmail: () => "me****@example.com",
        updateNewsletterPreferences: async (input) => {
          updates.push(input);
          return { status: input.unsubscribe ? "unsubscribed" : "updated" };
        },
      },
    }
  );

  let response = await route.GET(
    createRequest({
      url: "https://example.test/api/newsletter/preferences?token=valid-token",
    })
  );
  assert.equal(response.status, 200);
  assert.equal(response.body.email, "me****@example.com");

  response = await route.POST(
    createRequest({
      jsonBody: { token: "valid-token", unsubscribe: true, topics: {} },
    })
  );
  assert.equal(response.status, 200);
  assert.equal(updates[0].unsubscribe, true);
});

test("email cron requires its bearer secret before processing jobs", async () => {
  let processed = 0;
  const route = loadSourceModule(
    "src/app/api/cron/email-outbox/route.js",
    ["GET", "POST"],
    {
      stripImports: true,
      sandbox: {
        NextResponse,
        process: { env: { CRON_SECRET: "cron-test-secret" } },
        enqueueDailyEmailFailureDigest: async () => ({ queued: 0 }),
        processEmailOutbox: async () => {
          processed += 1;
          return { sent: 0 };
        },
        requeueExpiredEmailJobs: async () => 0,
      },
    }
  );

  let response = await route.GET(createRequest());
  assert.equal(response.status, 401);
  assert.equal(processed, 0);

  response = await route.POST(
    createRequest({
      headers: { authorization: "Bearer cron-test-secret" },
    })
  );
  assert.equal(response.status, 200);
  assert.equal(processed, 1);
});

test("GitHub schedules the protected email worker without a Vercel Hobby cron", () => {
  const workflow = fs.readFileSync(
    ".github/workflows/email-outbox.yml",
    "utf8"
  );

  assert.match(workflow, /cron:\s*["']\*\/5 \* \* \* \*["']/);
  assert.match(
    workflow,
    /https:\/\/www\.galacticomnivore\.com\/api\/cron\/email-outbox/
  );
  assert.match(workflow, /\$\{\{\s*secrets\.CRON_SECRET\s*\}\}/);
  assert.match(workflow, /Authorization: Bearer \$CRON_SECRET/);
  assert.equal(
    fs.existsSync("vercel.json"),
    false,
    "Vercel Hobby deployments must not register a frequent Vercel cron"
  );
});

test("email, delivery, and newsletter Firestore collections are server-only", () => {
  const rules = fs.readFileSync("firestore.rules", "utf8");
  [
    "email_outbox",
    "email_delivery_events",
    "email_suppressions",
    "processed_email_webhooks",
    "newsletter_subscribers",
    "newsletter_events",
    "newsletter_rate_limits",
    "email_action_rate_limits",
  ].forEach((collection) => {
    const line = rules
      .split(/\r?\n/)
      .find((value) => value.includes(`match /${collection}/{doc}`));
    assert.ok(
      line?.includes("allow read, write: if false;"),
      `${collection} must be denied to browser clients`
    );
  });

  const envExample = fs.readFileSync(".env.example", "utf8");
  [
    "RESEND_API_KEY",
    "RESEND_WEBHOOK_SECRET",
    "EMAIL_FROM_TRANSACTIONAL",
    "EMAIL_FROM_MARKETING",
    "NEWSLETTER_TOKEN_SECRET",
    "CRON_SECRET",
  ].forEach((name) => assert.match(envExample, new RegExp(`^${name}=`, "m")));
});
