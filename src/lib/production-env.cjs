const REQUIRED_PRODUCTION_KEYS = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "POLAR_ACCESS_TOKEN",
  "POLAR_WEBHOOK_SECRET",
  "POLAR_ORGANIZATION_SLUG",
  "NEXT_PUBLIC_POLAR_MEMBER_MONTHLY_PRODUCT_ID",
  "NEXT_PUBLIC_POLAR_MEMBER_ANNUAL_PRODUCT_ID",
  "NEXT_PUBLIC_POLAR_COMPANY_MONTHLY_PRODUCT_ID",
  "NEXT_PUBLIC_POLAR_COMPANY_ANNUAL_PRODUCT_ID",
  "RESEND_API_KEY",
  "EMAIL_FROM_TRANSACTIONAL",
  "CRON_SECRET",
];

function isPresent(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateProductionEnvironment(env = process.env) {
  const errors = [];

  for (const key of REQUIRED_PRODUCTION_KEYS) {
    if (!isPresent(env[key])) errors.push(`${key} is required`);
  }

  if (env.POLAR_SERVER !== "production") {
    errors.push("POLAR_SERVER must be production");
  }

  if (isPresent(env.ADMIN_BOOTSTRAP_SECRET)) {
    errors.push("ADMIN_BOOTSTRAP_SECRET must not be set in production");
  }

  if (env.EMAIL_DISABLE_SEND === "true") {
    errors.push("EMAIL_DISABLE_SEND must not be true in production");
  }

  if (env.EMAIL_PRODUCTION_DELIVERY !== "true") {
    errors.push("EMAIL_PRODUCTION_DELIVERY must be true in production");
  }

  const hasServiceJson = isPresent(env.FIREBASE_SERVICE_ACCOUNT_JSON);
  const hasServiceAccountFields =
    isPresent(env.FIREBASE_PROJECT_ID) &&
    isPresent(env.FIREBASE_CLIENT_EMAIL) &&
    (isPresent(env.FIREBASE_PRIVATE_KEY) ||
      isPresent(env.FIREBASE_PRIVATE_KEY_BASE64));
  if (!hasServiceJson && !hasServiceAccountFields) {
    errors.push(
      "Firebase Admin credentials require FIREBASE_SERVICE_ACCOUNT_JSON or project/client-email/private-key fields"
    );
  }

  if (isPresent(env.NEXT_PUBLIC_SITE_URL)) {
    try {
      const siteUrl = new URL(env.NEXT_PUBLIC_SITE_URL);
      if (
        siteUrl.protocol !== "https:" ||
        siteUrl.username ||
        siteUrl.password ||
        (siteUrl.pathname !== "/" && siteUrl.pathname !== "")
      ) {
        errors.push("NEXT_PUBLIC_SITE_URL must be an HTTPS origin");
      }
    } catch {
      errors.push("NEXT_PUBLIC_SITE_URL must be a valid absolute URL");
    }
  }

  if (isPresent(env.POLAR_SUCCESS_URL)) {
    try {
      const successUrl = new URL(env.POLAR_SUCCESS_URL);
      const siteUrl = new URL(env.NEXT_PUBLIC_SITE_URL);
      if (
        successUrl.origin !== siteUrl.origin ||
        successUrl.pathname !== "/subscription/success"
      ) {
        errors.push(
          "POLAR_SUCCESS_URL must use NEXT_PUBLIC_SITE_URL and /subscription/success"
        );
      }
    } catch {
      errors.push("POLAR_SUCCESS_URL must be a valid absolute URL");
    }
  }

  return errors;
}

function assertProductionEnvironment(env = process.env) {
  const errors = validateProductionEnvironment(env);
  if (errors.length === 0) return;

  throw new Error(
    `Production environment validation failed:\n${errors
      .map((error) => `- ${error}`)
      .join("\n")}`
  );
}

module.exports = {
  REQUIRED_PRODUCTION_KEYS,
  assertProductionEnvironment,
  validateProductionEnvironment,
};
