"use client";

import Script from "next/script";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { readConsent, writeConsent } from "@/lib/analytics/consent";
import { setAnalyticsConsent, trackPageView } from "@/lib/analytics/client";
import { getPageType } from "@/lib/analytics/events";
import {
  getClarityScriptUrl,
  isClarityConfigured,
  isClarityEligible,
  prepareClarity,
  setClarityConsent,
} from "@/lib/analytics/clarity";

const AnalyticsConsentContext = createContext(null);

export function useAnalyticsConsent() {
  const value = useContext(AnalyticsConsentContext);
  if (!value) {
    throw new Error("useAnalyticsConsent must be used inside AnalyticsProvider");
  }
  return value;
}

function AnalyticsRuntime({ consent, pathname }) {
  const [claritySrc, setClaritySrc] = useState(null);
  const lastTrackedPagePath = useRef(null);
  const pagePath = pathname || "/";

  useEffect(() => {
    if (consent?.analytics !== true) {
      setAnalyticsConsent(false);
      setClarityConsent(false);
      setClaritySrc(null);
      return;
    }

    setAnalyticsConsent(true);
    if (isClarityConfigured() && isClarityEligible(pagePath)) {
      setClaritySrc(prepareClarity() || getClarityScriptUrl());
    } else {
      setClarityConsent(false);
      setClaritySrc(null);
    }
  }, [consent?.analytics, pagePath]);

  useEffect(() => {
    if (consent?.analytics !== true) {
      lastTrackedPagePath.current = null;
      return;
    }
    if (lastTrackedPagePath.current === pagePath) return;

    lastTrackedPagePath.current = pagePath;
    trackPageView(pagePath, getPageType(pagePath));
  }, [consent?.analytics, pagePath]);

  return claritySrc ? (
    <Script
      id="go-clarity"
      src={claritySrc}
      strategy="afterInteractive"
      onLoad={() => setClarityConsent(true)}
      onError={() => setClarityConsent(false)}
    />
  ) : null;
}

export function AnalyticsProvider({ children }) {
  const pathname = usePathname();
  const [consent, setConsent] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    setConsent(readConsent());
    setHydrated(true);
  }, []);

  const saveConsent = (value) => {
    const next = writeConsent(value);
    setConsent(next);
    setSettingsOpen(false);
  };

  const contextValue = useMemo(
    () => ({
      consent,
      hydrated,
      saveConsent,
      settingsOpen,
      openSettings: () => setSettingsOpen(true),
      closeSettings: () => setSettingsOpen(false),
    }),
    [consent, hydrated, settingsOpen]
  );

  return (
    <AnalyticsConsentContext.Provider value={contextValue}>
      <AnalyticsRuntime
        consent={consent}
        pathname={pathname}
      />
      {children}
    </AnalyticsConsentContext.Provider>
  );
}
