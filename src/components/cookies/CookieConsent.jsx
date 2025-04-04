"use client";

import { useState, useEffect } from "react";
import { observer } from "mobx-react";
import MobxStore from "@/mobx";
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

const CookieConsent = observer(() => {
  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true,
    functional: false,
    analytics: false,
  });

  // Load existing preferences when dialog opens
  useEffect(() => {
    if (open && MobxStore.cookieConsent) {
      setPreferences({
        essential: true,
        functional: MobxStore.cookieConsent.functional ?? false,
        analytics: MobxStore.cookieConsent.analytics ?? false,
      });
    }
  }, [open]);

  const saveConsent = (settings) => {
    MobxStore.setCookieConsent(settings);
  };

  // Show the banner if there's no consent
  const showBanner = !MobxStore.cookieConsent;

  // Always render the Dialog, but only show the banner when needed
  return (
    <>
      {showBanner && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50">
          <div className="container py-4 px-4 md:px-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm">
                  We use cookies to enhance your experience. By continuing to
                  visit this site you agree to our use of cookies.{" "}
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
        open={open || MobxStore.cookieSettingsOpen}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          MobxStore.cookieSettingsOpen = isOpen;
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cookie Preferences</DialogTitle>
            <DialogDescription>
              Customize your cookie preferences.
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
});

export default CookieConsent;
