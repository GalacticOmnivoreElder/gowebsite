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
        isNewsletterEnabled: () => true,
        newsletterUnavailableResponse: () =>
          NextResponse.json({ error: "Unavailable" }, { status: 404 }),
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

test("newsletter signup logs the server-side cause without logging the address", async () => {
  const logs = [];
  const route = loadSourceModule(
    "src/app/api/newsletter/subscribe/route.js",
    ["POST"],
    {
      stripImports: true,
      sandbox: {
        NextResponse,
        isNewsletterEnabled: () => true,
        newsletterUnavailableResponse: () =>
          NextResponse.json({ error: "Unavailable" }, { status: 404 }),
        console: {
          log() {},
          error(value) {
            logs.push(value);
          },
        },
        consumeNewsletterRateLimit: async () => true,
        getRequestUser: async () => null,
        newsletterFingerprint: () => "safe-fingerprint",
        requestNewsletterSubscription: async () => {
          throw new Error("NEWSLETTER_TOKEN_SECRET is not configured");
        },
      },
    }
  );

  const response = await route.POST(
    createRequest({
      headers: { "x-vercel-id": "request-1" },
      jsonBody: {
        email: "private@example.com",
        consent: true,
        source: "homepage",
      },
    })
  );

  assert.equal(response.status, 500);
  assert.equal(logs.length, 1);
  assert.match(logs[0], /NEWSLETTER_TOKEN_SECRET is not configured/);
  assert.doesNotMatch(logs[0], /private@example\.com/);
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
        isNewsletterEnabled: () => true,
        newsletterUnavailableResponse: () =>
          NextResponse.json({ error: "Unavailable" }, { status: 404 }),
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

test("newsletter endpoints are unavailable while publishing is disabled", async () => {
  let subscriptionRequests = 0;
  const route = loadSourceModule(
    "src/app/api/newsletter/subscribe/route.js",
    ["POST"],
    {
      stripImports: true,
      sandbox: {
        NextResponse,
        isNewsletterEnabled: () => false,
        newsletterUnavailableResponse: () =>
          NextResponse.json({ error: "Unavailable" }, { status: 404 }),
        requestNewsletterSubscription: async () => {
          subscriptionRequests += 1;
        },
      },
    }
  );

  const response = await route.POST(createRequest({ jsonBody: {} }));
  assert.equal(response.status, 404);
  assert.equal(subscriptionRequests, 0);
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
        verifyGithubActionsOidcToken: async () => false,
        getEmailConfigurationStatus: () => ({ configured: true }),
        enqueueDailyEmailFailureDigest: async () => ({ queued: 0 }),
        processEmailOutbox: async () => {
          processed += 1;
          return { sent: 0 };
        },
        requeueExpiredEmailJobs: async () => 0,
        sendEmailDeliveryTest: async () => null,
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

test("email cron accepts the pinned GitHub Actions OIDC identity", async () => {
  let processed = 0;
  const route = loadSourceModule(
    "src/app/api/cron/email-outbox/route.js",
    ["POST"],
    {
      stripImports: true,
      sandbox: {
        NextResponse,
        process: { env: {} },
        verifyGithubActionsOidcToken: async (token) =>
          token === "signed-github-token",
        getEmailConfigurationStatus: () => ({ configured: true }),
        enqueueDailyEmailFailureDigest: async () => ({ queued: 0 }),
        processEmailOutbox: async () => {
          processed += 1;
          return { sent: 0 };
        },
        requeueExpiredEmailJobs: async () => 0,
        sendEmailDeliveryTest: async () => null,
      },
    }
  );

  let response = await route.POST(createRequest());
  assert.equal(response.status, 401);
  assert.equal(processed, 0);

  response = await route.POST(
    createRequest({
      headers: { authorization: "Bearer signed-github-token" },
    })
  );
  assert.equal(response.status, 200);
  assert.equal(processed, 1);
});

test("email cron can send an OIDC-protected production delivery test", async () => {
  const recipients = [];
  const route = loadSourceModule(
    "src/app/api/cron/email-outbox/route.js",
    ["POST"],
    {
      stripImports: true,
      sandbox: {
        NextResponse,
        process: { env: {} },
        verifyGithubActionsOidcToken: async () => true,
        getEmailConfigurationStatus: () => ({
          configured: true,
          deliveryReady: true,
        }),
        enqueueDailyEmailFailureDigest: async () => ({ queued: 0 }),
        processEmailOutbox: async () => ({ sent: 0 }),
        requeueExpiredEmailJobs: async () => 0,
        sendEmailDeliveryTest: async (recipient) => {
          recipients.push(recipient);
          return { providerEmailId: "email-test-1" };
        },
      },
    }
  );

  const response = await route.POST(
    createRequest({
      headers: {
        authorization: "Bearer signed-github-token",
        "x-email-test-recipient": "operator@example.com",
      },
    })
  );

  assert.equal(response.status, 200);
  assert.deepEqual(recipients, ["operator@example.com"]);
  assert.equal(response.body.deliveryTest.providerEmailId, "email-test-1");
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
  assert.match(workflow, /id-token:\s*write/);
  assert.match(workflow, /ACTIONS_ID_TOKEN_REQUEST_URL/);
  assert.match(workflow, /ACTIONS_ID_TOKEN_REQUEST_TOKEN/);
  assert.match(workflow, /Authorization: Bearer \$GITHUB_OIDC_TOKEN/);
  assert.match(workflow, /secrets\.EMAIL_TEST_RECIPIENT/);
  assert.match(workflow, /X-Email-Test-Recipient: \$TEST_EMAIL_RECIPIENT/);
  assert.doesNotMatch(workflow, /secrets\.CRON_SECRET/);

  const oidcVerifier = fs.readFileSync(
    "src/lib/githubActionsOidc.js",
    "utf8"
  );
  [
    "https://token.actions.githubusercontent.com",
    "https://www.galacticomnivore.com/api/cron/email-outbox",
    "GalacticOmnivoreElder/gowebsite",
    "821858267",
    "194530138",
    "refs/heads/prod",
    ".github/workflows/email-outbox.yml",
    "schedule",
    "workflow_dispatch",
  ].forEach((value) => assert.match(oidcVerifier, new RegExp(value)));
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
    "email_deduplication",
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
