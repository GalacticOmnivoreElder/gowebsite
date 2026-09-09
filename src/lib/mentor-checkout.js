import { MEMBERSHIP_PLANS } from "@/constants/membership";
import { resolvePolarProductId, resolvePolarProductTier } from "@/lib/polar";
import { getProductConfig } from "@/lib/product-config";

// Validate product payloads when auditing Polar configuration.
export function isMentorProductReady(product, productId, interval) {
  const plan = MEMBERSHIP_PLANS.find((item) => item.tier === "mentor");
  const price = plan.pricing[interval];
  if (!price || !productId || resolvePolarProductTier(productId) !== "mentor") return false;
  const expectedInterval = interval === "annual" ? "year" : "month";
  return Boolean(
    product?.id === productId &&
      product.is_archived === false &&
      product.is_recurring === true &&
      product.recurring_interval === expectedInterval &&
      (product.recurring_interval_count ?? 1) === 1 &&
      product.prices?.some((item) =>
        item.is_archived === false &&
        item.amount_type === "fixed" &&
        item.price_currency === "mkd" &&
        item.price_amount === price.amount * 100
      )
  );
}

export async function getMentorCheckoutStatus(interval) {
  const productId = resolvePolarProductId("mentor", interval);
  return {
    available:
      getProductConfig().mentorCheckoutEnabled &&
      Boolean(productId) &&
      resolvePolarProductTier(productId) === "mentor",
    productId: productId || null,
  };
}
