const PRIVATE_ROUTE_PREFIXES = [
  "/admin",
  "/dashboard",
  "/profile",
  "/onboarding",
  "/signup",
  "/login",
  "/reset-password",
  "/verify-email",
  "/checkout",
  "/billing",
  "/subscription",
  "/project/",
  "/project/create",
  "/matchmaking",
  "/education/",
  "/video-bundles/",
  "/resources/",
];

export function isClarityConfigured() {
  return (
    typeof window !== "undefined" &&
    process.env.NODE_ENV !== "test" &&
    process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true" &&
    /^[a-zA-Z0-9_-]+$/.test(process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || "")
  );
}

export function isClarityEligible(pathname = "/") {
  const path = pathname.split("?", 1)[0] || "/";
  return !PRIVATE_ROUTE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix)
  );
}

export function getClarityScriptUrl() {
  const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
  return projectId ? `https://www.clarity.ms/tag/${projectId}` : null;
}

export function prepareClarity() {
  if (!isClarityConfigured() || typeof window === "undefined") return null;
  if (!window.clarity) {
    const queue = [];
    const clarity = (...args) => queue.push(args);
    clarity.q = queue;
    window.clarity = clarity;
  }
  return getClarityScriptUrl();
}

export function setClarityConsent(granted) {
  if (typeof window !== "undefined" && typeof window.clarity === "function") {
    window.clarity("consent", granted === true);
  }
}
