import {
  initializeAnalytics,
  isSupported,
  logEvent,
  setAnalyticsCollectionEnabled,
  setConsent,
} from "firebase/analytics";
import { app } from "@/firebase";
import { isAnalyticsConsentGranted, readConsent } from "./consent";
import { buildEventPayload, normalizePagePath } from "./events";

let analyticsPromise = null;
let analyticsInstance = null;

export function isAnalyticsConfigured() {
  return (
    typeof window !== "undefined" &&
    process.env.NODE_ENV !== "test" &&
    process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true" &&
    Boolean(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID)
  );
}

export function canTrack() {
  return isAnalyticsConfigured() && isAnalyticsConsentGranted(readConsent());
}

function updateConsent(granted) {
  setConsent({
    analytics_storage: granted ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}

export async function getAnalyticsClient() {
  if (!canTrack()) return null;
  if (analyticsInstance) return analyticsInstance;
  if (analyticsPromise) return analyticsPromise;

  analyticsPromise = (async () => {
    try {
      if (!(await isSupported())) return null;
      updateConsent(true);
      analyticsInstance = initializeAnalytics(app, {
        config: { send_page_view: false },
      });
      setAnalyticsCollectionEnabled(analyticsInstance, true);
      return analyticsInstance;
    } catch {
      analyticsPromise = null;
      return null;
    }
  })();

  return analyticsPromise;
}

export async function setAnalyticsConsent(granted) {
  if (typeof window === "undefined") return;

  updateConsent(granted === true);

  if (analyticsInstance) {
    setAnalyticsCollectionEnabled(analyticsInstance, granted === true);
  }

  if (granted === true) await getAnalyticsClient();
}

export async function trackEvent(eventName, properties = {}) {
  const payload = buildEventPayload(eventName, properties);
  if (!payload) return false;

  const client = await getAnalyticsClient();
  if (!client) return false;

  try {
    logEvent(client, eventName, payload);
    return true;
  } catch {
    return false;
  }
}

export function trackPageView(pagePath, pageType) {
  return trackEvent("page_view", {
    page_path: normalizePagePath(pagePath),
    page_type: pageType,
  });
}
