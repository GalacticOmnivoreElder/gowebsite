const VALID_TIERS = new Set(["member", "company"]);
const VALID_INTERVALS = new Set(["monthly", "annual"]);

export function getCheckoutPlanKey(tier, interval) {
  const normalizedTier = VALID_TIERS.has(tier) ? tier : "member";
  const normalizedInterval = VALID_INTERVALS.has(interval)
    ? interval
    : "monthly";

  return `${normalizedTier}-${normalizedInterval}`;
}

export function parseCheckoutPlanKey(value) {
  if (typeof value !== "string") return null;

  const [tier, interval, extra] = value.split("-");
  if (extra || !VALID_TIERS.has(tier) || !VALID_INTERVALS.has(interval)) {
    return null;
  }

  return { tier, interval };
}

export function buildCheckoutAuthUrl({
  tier,
  interval,
  isAnonymous = false,
  redirectPath = "/membership",
}) {
  const authPath = isAnonymous ? "/signup" : "/login";
  const plan = getCheckoutPlanKey(tier, interval);

  return `${authPath}?redirect=${encodeURIComponent(
    redirectPath
  )}&plan=${encodeURIComponent(plan)}`;
}
