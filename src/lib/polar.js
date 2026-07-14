export function getPolarServer() {
  return process.env.POLAR_SERVER === "production" ? "production" : "sandbox";
}

export function getPolarApiBase() {
  return getPolarServer() === "production"
    ? "https://api.polar.sh/v1"
    : "https://sandbox-api.polar.sh/v1";
}

/**
 * Resolve the Polar product id for a (tier, interval) pair.
 *
 * Polar products each have a single recurring interval, so monthly and annual
 * are separate products — hence four env vars. The legacy single-interval vars
 * (NEXT_PUBLIC_POLAR_PRODUCT_ID / NEXT_PUBLIC_POLAR_COMPANY_PRODUCT_ID) are used
 * as the MONTHLY fallback so existing config keeps working.
 *
 * tier: "member" | "company"   interval: "monthly" | "annual"
 */
export function resolvePolarProductId(tier, interval) {
  const t = tier === "company" ? "company" : "member";
  const i = interval === "annual" ? "annual" : "monthly";
  const env = process.env;

  const map = {
    member: {
      monthly:
        env.NEXT_PUBLIC_POLAR_MEMBER_MONTHLY_PRODUCT_ID ||
        env.NEXT_PUBLIC_POLAR_PRODUCT_ID,
      annual: env.NEXT_PUBLIC_POLAR_MEMBER_ANNUAL_PRODUCT_ID,
    },
    company: {
      monthly:
        env.NEXT_PUBLIC_POLAR_COMPANY_MONTHLY_PRODUCT_ID ||
        env.NEXT_PUBLIC_POLAR_COMPANY_PRODUCT_ID,
      annual: env.NEXT_PUBLIC_POLAR_COMPANY_ANNUAL_PRODUCT_ID,
    },
  };

  return map[t][i] || null;
}

export function getPolarPortalBase() {
  const orgSlug = process.env.POLAR_ORGANIZATION_SLUG;
  if (!orgSlug) {
    throw new Error("POLAR_ORGANIZATION_SLUG is required");
  }

  const host =
    getPolarServer() === "production" ? "https://polar.sh" : "https://sandbox.polar.sh";
  return `${host}/${orgSlug}/portal/overview`;
}

export async function createPolarCustomerSession(customerId) {
  if (!customerId) {
    throw new Error("Polar customer ID is required");
  }

  const response = await fetch(`${getPolarApiBase()}/customer-sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.POLAR_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customer_id: customerId,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create Polar customer session: ${errorText}`);
  }

  return response.json();
}
