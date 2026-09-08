import { MEMBERSHIP_PLANS } from "@/constants/membership";
import { getPolarProduct, resolvePolarProductId, resolvePolarProductTier } from "@/lib/polar";
import { getProductConfig } from "@/lib/product-config";

// The supplied annual link initially billed monthly. Validate the actual Polar
// product before advertising availability and again before creating checkout.
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
  if (!getProductConfig().mentorCheckoutEnabled || !productId) {
    return { available: false };
  }
  try {
    const product = await getPolarProduct(productId);
    return { available: isMentorProductReady(product, productId, interval) };
  } catch {
    return { available: false };
  }
}
