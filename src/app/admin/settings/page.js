"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { auth } from "@/firebase";

export default function SettingsPage() {
  const [productSettings, setProductSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const response = await fetch("/api/admin/product-settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) setProductSettings(await response.json());
    };
    load().catch(() => setMessage("Could not load product settings."));
  }, []);

  const saveMentorApplications = async () => {
    if (!productSettings) return;
    setSaving(true);
    setMessage("");
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/admin/product-settings", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ mentorApplicationsOpen: productSettings.mentorApplicationsOpen }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not save product settings.");
      setProductSettings(result);
      setMessage("Product settings saved.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <div className="rounded-lg border border-border bg-card p-8 shadow">
        <h2 className="text-xl font-semibold">Product availability</h2>
        <p className="mt-2 text-sm text-muted-foreground">The server configuration remains the safety gate. An admin override cannot open mentor applications until the application URL and environment flag are configured.</p>
        <div className="mt-6 flex items-start gap-3">
          <input
            id="mentor-applications-open"
            type="checkbox"
            className="mt-1 h-4 w-4"
            checked={productSettings?.mentorApplicationsOpen === true}
            disabled={!productSettings || !productSettings.mentorApplicationsConfigured || saving}
            onChange={(event) => setProductSettings((current) => ({ ...current, mentorApplicationsOpen: event.target.checked }))}
          />
          <div>
            <label htmlFor="mentor-applications-open" className="font-medium">Mentor applications open</label>
            <p className="text-sm text-muted-foreground">
              {productSettings?.mentorApplicationsConfigured
                ? "The application destination is configured on the server."
                : "Coming soon: MENTOR_APPLICATION_URL and MENTOR_APPLICATIONS_OPEN are not enabled."}
            </p>
          </div>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <Button onClick={saveMentorApplications} disabled={!productSettings?.mentorApplicationsConfigured || saving}>{saving ? "Saving..." : "Save product availability"}</Button>
          {message && <p className="text-sm text-muted-foreground" role="status">{message}</p>}
        </div>
      </div>

      <div className="bg-card p-8 rounded-lg shadow border border-border">
        <h2 className="text-xl font-semibold mb-4">Admin Settings</h2>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Subscription Price
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-border bg-muted text-muted-foreground">
                  $
                </span>
                <input
                  type="text"
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-border bg-background focus:ring-primary focus:border-primary"
                  placeholder="9.99"
                  disabled
                />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                This feature will be enabled in a future update
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Subscription Duration
              </label>
              <div className="flex">
                <input
                  type="text"
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-l-md border border-border bg-background focus:ring-primary focus:border-primary"
                  placeholder="1"
                  disabled
                />
                <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-border bg-muted text-muted-foreground">
                  months
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                This feature will be enabled in a future update
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Email Notifications
            </label>
            <div className="mt-2">
              <div className="flex items-center">
                <input
                  id="email-new-subscription"
                  name="email-new-subscription"
                  type="checkbox"
                  className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                  checked
                  readOnly
                  disabled
                />
                <label
                  htmlFor="email-new-subscription"
                  className="ml-2 block text-sm"
                >
                  Send email when a new subscription is activated
                </label>
              </div>
              <div className="flex items-center mt-2">
                <input
                  id="email-subscription-cancelled"
                  name="email-subscription-cancelled"
                  type="checkbox"
                  className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                  checked
                  readOnly
                  disabled
                />
                <label
                  htmlFor="email-subscription-cancelled"
                  className="ml-2 block text-sm"
                >
                  Send email when a subscription is cancelled
                </label>
              </div>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Transactional and administrative notifications are active.
              Recipients are configured with server environment variables;
              delivery and consent health is available in the{" "}
              <Link href="/admin/newsletter" className="underline">
                newsletter dashboard
              </Link>
              .
            </p>
          </div>

          <div className="pt-4 border-t border-border">
            <Button disabled>Save Settings</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
