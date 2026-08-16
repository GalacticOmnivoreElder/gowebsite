"use client";

import { useState, useEffect } from "react";
import { useAnalyticsConsent } from "@/components/analytics/AnalyticsProvider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Link from "next/link";

const CookieConsent = () => {
  const [open, setOpen] = useState(false);
  const {
    consent,
    hydrated,
    saveConsent,
    settingsOpen,
    closeSettings,
  } = useAnalyticsConsent();
  const [preferences, setPreferences] = useState({
    essential: true,
    functional: false,
    analytics: false,
  });

  // Load existing preferences when dialog opens
  useEffect(() => {
    if (open && consent) {
      setPreferences({
        essential: true,
        functional: consent.functional ?? false,
        analytics: consent.analytics ?? false,
      });
    }
  }, [open, consent]);

  // Show the banner if there's no consent
  const showBanner = hydrated && !consent;

  // Always render the Dialog, but only show the banner when needed
  return (
    <>
      {showBanner && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50">
          <div className="container py-4 px-4 md:px-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm">
                  We use essential cookies to operate GO. Optional analytics
                  cookies are enabled only if you choose them.{" "}
                  <Link href="/cookies" className="underline">
                    Learn more
                  </Link>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(true)}
                >
                  Cookie Settings
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    saveConsent({
                      essential: true,
                      functional: false,
                      analytics: false,
                    })
                  }
                >
                  Reject All
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    saveConsent({
                      essential: true,
                      functional: true,
                      analytics: true,
                    })
                  }
                >
                  Accept All
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={open || settingsOpen}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) closeSettings();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cookie Preferences</DialogTitle>
            <DialogDescription>
              Essential cookies are always on. Analytics enables Firebase
              Analytics and Microsoft Clarity on selected public pages.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Essential Cookies</Label>
              <Switch checked disabled />
            </div>

            <div className="flex items-center justify-between">
              <Label>Functional Cookies</Label>
              <Switch
                checked={preferences.functional}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, functional: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Analytics Cookies</Label>
              <Switch
                checked={preferences.analytics}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, analytics: checked })
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                saveConsent(preferences);
                setOpen(false);
              }}
            >
              Save Preferences
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CookieConsent;

export function CookieSettingsButton({ className = "" }) {
  const { openSettings } = useAnalyticsConsent();
  return (
    <button
      type="button"
      className={`text-sm text-muted-foreground hover:text-foreground transition-colors ${className}`}
      onClick={openSettings}
    >
      Cookie settings
    </button>
  );
}
