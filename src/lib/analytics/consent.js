export const CONSENT_STORAGE_KEY = "go_cookie_consent_v1";

export const DEFAULT_CONSENT = Object.freeze({
  essential: true,
  functional: false,
  analytics: false,
});

function getStorage(storage) {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function normalizeConsent(value) {
  return {
    essential: true,
    functional: value?.functional === true,
    analytics: value?.analytics === true,
  };
}

export function readConsent(storage) {
  const target = getStorage(storage);
  if (!target) return null;

  try {
    const raw = target.getItem(CONSENT_STORAGE_KEY);
    return raw ? normalizeConsent(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function writeConsent(value, storage) {
  const normalized = normalizeConsent(value);
  const target = getStorage(storage);

  try {
    target?.setItem(CONSENT_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Consent must never prevent the site from working if storage is blocked.
  }

  return normalized;
}

export function isAnalyticsConsentGranted(value = readConsent()) {
  return value?.analytics === true;
}
