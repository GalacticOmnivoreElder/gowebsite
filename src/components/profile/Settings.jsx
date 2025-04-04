"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { auth } from "@/firebase";

export default function Settings({ user }) {
  const [settings, setSettings] = useState({
    emailNotifications: user.settings?.emailNotifications ?? true,
    newPackageAlerts: user.settings?.newPackageAlerts ?? true,
    subscriptionReminders: user.settings?.subscriptionReminders ?? true,
    marketingEmails: user.settings?.marketingEmails ?? false,
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = (key) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const idToken = await auth.currentUser.getIdToken();

      const response = await fetch("/api/user/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          settings: settings,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save settings");
      }

      toast({
        title: "Settings Saved",
        description: "Your notification preferences have been updated.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Settings</CardTitle>
        <CardDescription>
          Manage how and when you receive notifications from us.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive email notifications about your account.
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={settings.emailNotifications}
              onCheckedChange={() => handleToggle("emailNotifications")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="new-package-alerts">New Package Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when new monthly packages are available.
              </p>
            </div>
            <Switch
              id="new-package-alerts"
              checked={settings.newPackageAlerts}
              onCheckedChange={() => handleToggle("newPackageAlerts")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="subscription-reminders">
                Subscription Reminders
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive reminders about your subscription status.
              </p>
            </div>
            <Switch
              id="subscription-reminders"
              checked={settings.subscriptionReminders}
              onCheckedChange={() => handleToggle("subscriptionReminders")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="marketing-emails">Marketing Emails</Label>
              <p className="text-sm text-muted-foreground">
                Receive promotional emails and special offers.
              </p>
            </div>
            <Switch
              id="marketing-emails"
              checked={settings.marketingEmails}
              onCheckedChange={() => handleToggle("marketingEmails")}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={saveSettings} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </CardFooter>
    </Card>
  );
}
