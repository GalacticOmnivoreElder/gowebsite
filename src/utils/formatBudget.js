export function formatBudget(budget, currency = "MKD") {
  if (budget == null || budget === "" || Number.isNaN(Number(budget))) {
    return "N/A";
  }

  const num = Number(budget);
  const suffix = String(currency || "MKD").toUpperCase();

  if (num > Number.MAX_SAFE_INTEGER) {
    return "Budget too large";
  }

  if (num >= 1_000_000_000) {
    return `${Math.round(num / 1_000_000).toLocaleString()}M ${suffix}`;
  }

  if (num >= 1_000_000) {
    const millions = num / 1_000_000;
    const formatted =
      millions >= 10
        ? Math.round(millions).toLocaleString()
        : millions.toFixed(1).replace(/\.0$/, "");
    return `${formatted}M ${suffix}`;
  }

  if (num >= 10_000) {
    return `${Math.round(num / 1_000).toLocaleString()}K ${suffix}`;
  }

  return `${num.toLocaleString()} ${suffix}`;
}

export function hasProjectBudget(budget) {
  if (budget === null || budget === undefined || budget === "") return false;

  const value = Number(budget);
  return Number.isFinite(value) && value >= 0;
}
