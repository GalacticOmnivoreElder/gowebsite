const PENDING_ATTEMPT_KEY = "go:subscription-confirmation:pending";
const ACKNOWLEDGED_PREFIX = "go:subscription-confirmation:ack:";
const MAX_ATTEMPT_AGE_MS = 24 * 60 * 60 * 1000;

function storageAvailable(storage) {
  return storage && typeof storage.getItem === "function";
}

export function createSubscriptionConfirmationAttempt({
  baselineConfirmationId = null,
  interval = "monthly",
  now = Date.now(),
  tier = "member",
  userId,
} = {}) {
  if (!userId) return null;

  return {
    attemptId:
      globalThis.crypto?.randomUUID?.() ||
      `${now}-${Math.random().toString(36).slice(2)}`,
    baselineConfirmationId:
      typeof baselineConfirmationId === "string"
        ? baselineConfirmationId
        : null,
    interval: interval === "annual" ? "annual" : "monthly",
    startedAt: now,
    tier: tier === "company" ? "company" : "member",
    userId,
  };
}

export function isSubscriptionConfirmationAttemptFresh(
  attempt,
  { now = Date.now(), userId } = {}
) {
  return Boolean(
    attempt &&
      attempt.userId &&
      attempt.userId === userId &&
      Number.isFinite(attempt.startedAt) &&
      now >= attempt.startedAt &&
      now - attempt.startedAt <= MAX_ATTEMPT_AGE_MS
  );
}

export function shouldShowSubscriptionConfirmation({
  attempt,
  now = Date.now(),
  verification,
  userId,
} = {}) {
  if (
    !isSubscriptionConfirmationAttemptFresh(attempt, { now, userId }) ||
    verification?.hasPaidSubscription !== true
  ) {
    return false;
  }

  const confirmationId = verification?.membershipConfirmationId;
  return Boolean(
    typeof confirmationId === "string" &&
      confirmationId &&
      confirmationId !== attempt.baselineConfirmationId
  );
}

export function beginSubscriptionConfirmationAttempt(details) {
  if (typeof window === "undefined") return null;
  const attempt = createSubscriptionConfirmationAttempt(details);
  if (!attempt || !storageAvailable(window.sessionStorage)) return attempt;
  window.sessionStorage.setItem(PENDING_ATTEMPT_KEY, JSON.stringify(attempt));
  return attempt;
}

export function getPendingSubscriptionConfirmationAttempt({ userId } = {}) {
  if (
    typeof window === "undefined" ||
    !storageAvailable(window.sessionStorage)
  ) {
    return null;
  }

  try {
    const attempt = JSON.parse(
      window.sessionStorage.getItem(PENDING_ATTEMPT_KEY) || "null"
    );
    if (!isSubscriptionConfirmationAttemptFresh(attempt, { userId })) {
      window.sessionStorage.removeItem(PENDING_ATTEMPT_KEY);
      return null;
    }
    return attempt;
  } catch {
    window.sessionStorage.removeItem(PENDING_ATTEMPT_KEY);
    return null;
  }
}

export function isMembershipConfirmationAcknowledged(confirmationId) {
  return Boolean(
    confirmationId &&
      typeof window !== "undefined" &&
      storageAvailable(window.localStorage) &&
      window.localStorage.getItem(`${ACKNOWLEDGED_PREFIX}${confirmationId}`)
  );
}

export function acknowledgeMembershipConfirmation(confirmationId) {
  if (typeof window === "undefined") return;
  if (storageAvailable(window.localStorage) && confirmationId) {
    window.localStorage.setItem(
      `${ACKNOWLEDGED_PREFIX}${confirmationId}`,
      new Date().toISOString()
    );
  }
  if (storageAvailable(window.sessionStorage)) {
    window.sessionStorage.removeItem(PENDING_ATTEMPT_KEY);
  }
}
