const ALLOWED_REDIRECT_ROOTS = new Set([
  "/applications",
  "/billing",
  "/blog",
  "/downloads",
  "/education",
  "/games",
  "/membership",
  "/onboarding",
  "/package",
  "/profile",
  "/project",
  "/projects",
  "/resources",
  "/settings",
  "/user",
]);

function isAllowedRedirectPath(pathname) {
  if (pathname === "/") return true;
  const root = `/${pathname.split("/").filter(Boolean)[0] || ""}`;
  return ALLOWED_REDIRECT_ROOTS.has(root);
}

export function safeInternalRedirect(value, fallback = "/profile") {
  if (typeof value !== "string" || !value.trim()) return fallback;

  const candidate = value.trim();
  let decoded;
  try {
    decoded = decodeURIComponent(candidate);
  } catch {
    return fallback;
  }

  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    decoded.startsWith("//") ||
    candidate.includes("\\") ||
    decoded.includes("\\") ||
    /[\u0000-\u001F\u007F]/.test(decoded)
  ) {
    return fallback;
  }

  try {
    const base = new URL("https://internal.galacticomnivore.invalid");
    const url = new URL(candidate, base);
    if (url.origin !== base.origin || !isAllowedRedirectPath(url.pathname)) {
      return fallback;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function redirectWithPlan(value, plan, fallback = "/profile") {
  const safeRedirect = safeInternalRedirect(value, fallback);
  if (!plan) return safeRedirect;

  const url = new URL(
    safeRedirect,
    "https://internal.galacticomnivore.invalid"
  );
  url.searchParams.set("plan", plan);
  return `${url.pathname}${url.search}${url.hash}`;
}
