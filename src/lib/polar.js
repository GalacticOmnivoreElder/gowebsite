export function getPolarServer() {
  return process.env.POLAR_SERVER === "production" ? "production" : "sandbox";
}

export function getPolarApiBase() {
  return getPolarServer() === "production"
    ? "https://api.polar.sh/v1"
    : "https://sandbox-api.polar.sh/v1";
}

// Product IDs exposed by the four production Checkout Links currently used on
// /membership. Product IDs are public identifiers (the checkout pages expose
// them); keeping them here lets webhooks recover the entitlement when an older
// static Checkout Link does not include tier metadata.
const CHECKOUT_LINK_PRODUCT_IDS = {
  member: [
    "73c27030-6c24-4961-882b-f24f6b150144",
    "b748afb7-902c-4727-80ab-d9525b1d23aa",
  ],
  company: [
    "126bbba8-f3c7-4fcd-b2a1-0b3ab86032f6",
    "dd316098-f962-456e-a14a-080464b670b5",
  ],
};

export function resolvePolarProductTier(productId) {
  if (typeof productId !== "string" || !productId) return null;

  const env = process.env;
  const productIdsByTier = {
    member: new Set([
      ...CHECKOUT_LINK_PRODUCT_IDS.member,
      env.NEXT_PUBLIC_POLAR_PRODUCT_ID,
      env.NEXT_PUBLIC_POLAR_MEMBER_MONTHLY_PRODUCT_ID,
      env.NEXT_PUBLIC_POLAR_MEMBER_ANNUAL_PRODUCT_ID,
    ].filter(Boolean)),
    company: new Set([
      ...CHECKOUT_LINK_PRODUCT_IDS.company,
      env.NEXT_PUBLIC_POLAR_COMPANY_PRODUCT_ID,
      env.NEXT_PUBLIC_POLAR_COMPANY_MONTHLY_PRODUCT_ID,
      env.NEXT_PUBLIC_POLAR_COMPANY_ANNUAL_PRODUCT_ID,
    ].filter(Boolean)),
  };

  const matches = Object.entries(productIdsByTier)
    .filter(([, ids]) => ids.has(productId))
    .map(([tier]) => tier);

  return matches.length === 1 ? matches[0] : null;
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
