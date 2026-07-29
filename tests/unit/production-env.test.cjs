const assert = require("node:assert/strict");
const test = require("node:test");
const {
  validateProductionEnvironment,
} = require("../../src/lib/production-env.cjs");

function validEnvironment() {
  return {
    CRON_SECRET: "cron-secret",
    EMAIL_DISABLE_SEND: "false",
    EMAIL_FROM_TRANSACTIONAL: "GO <account@example.com>",
    EMAIL_PRODUCTION_DELIVERY: "true",
    FIREBASE_CLIENT_EMAIL: "firebase@example.com",
    FIREBASE_PRIVATE_KEY: "private-key",
    FIREBASE_PROJECT_ID: "go-production",
    NEXT_PUBLIC_FIREBASE_API_KEY: "client-api-key",
    NEXT_PUBLIC_FIREBASE_APP_ID: "app-id",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "go.example.firebaseapp.com",
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "sender-id",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "go-production",
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "go.example.appspot.com",
    NEXT_PUBLIC_POLAR_COMPANY_ANNUAL_PRODUCT_ID: "company-annual",
    NEXT_PUBLIC_POLAR_COMPANY_MONTHLY_PRODUCT_ID: "company-monthly",
    NEXT_PUBLIC_POLAR_MEMBER_ANNUAL_PRODUCT_ID: "member-annual",
    NEXT_PUBLIC_POLAR_MEMBER_MONTHLY_PRODUCT_ID: "member-monthly",
    NEXT_PUBLIC_SITE_URL: "https://www.galacticomnivore.com",
    POLAR_ACCESS_TOKEN: "polar-token",
    POLAR_ORGANIZATION_SLUG: "galactic-omnivore",
    POLAR_SERVER: "production",
    POLAR_SUCCESS_URL:
      "https://www.galacticomnivore.com/subscription/success",
    POLAR_WEBHOOK_SECRET: "polar-webhook",
    RESEND_API_KEY: "resend-token",
  };
}

test("production environment accepts a complete production configuration", () => {
  assert.deepEqual(validateProductionEnvironment(validEnvironment()), []);
});

test("production environment rejects sandbox billing and bootstrap access", () => {
  const env = {
    ...validEnvironment(),
    ADMIN_BOOTSTRAP_SECRET: "must-not-ship",
    POLAR_SERVER: "sandbox",
  };
  const errors = validateProductionEnvironment(env);

  assert.ok(errors.includes("POLAR_SERVER must be production"));
  assert.ok(
    errors.includes("ADMIN_BOOTSTRAP_SECRET must not be set in production")
  );
});
