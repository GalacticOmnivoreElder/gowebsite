"use client";

import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

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
              Email notification settings will be enabled in a future update
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
