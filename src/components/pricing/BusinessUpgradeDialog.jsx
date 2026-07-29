"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  ShieldCheck,
} from "lucide-react";
import { auth } from "@/firebase";
import MobxStore from "@/mobx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function formatMoney(amount, currency) {
  if (!Number.isInteger(amount) || !currency) return "Price unavailable";
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    currencyDisplay: "code",
  }).format(amount / 100);
}

function formatDate(value) {
  if (!value) return "the next renewal date";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "long",
  }).format(new Date(value));
}

function formatInterval(interval) {
  return interval === "year" ? "year" : "month";
}

export function BusinessUpgradeDialog({
  interval,
  open,
  onOpenChange,
  onScheduled,
}) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [scheduled, setScheduled] = useState(null);

  useEffect(() => {
    if (!open) {
      setPreview(null);
      setError("");
      setUnderstood(false);
      setScheduled(null);
      return;
    }

    let cancelled = false;
    const loadPreview = async () => {
      setLoading(true);
      setError("");
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          throw new Error("Sign in again to review this upgrade.");
        }
        const token = await currentUser.getIdToken();
        const response = await fetch(
          `/api/subscription/upgrade?interval=${encodeURIComponent(interval)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.preview) {
          throw new Error(
            data.error || "The Business upgrade could not be verified."
          );
        }
        if (!cancelled) setPreview(data.preview);
      } catch (loadError) {
        if (!cancelled) setError(loadError.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPreview();
    return () => {
      cancelled = true;
    };
  }, [interval, open]);

  const confirmUpgrade = async () => {
    if (!preview || !understood || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("Sign in again to confirm this upgrade.");
      }
      const token = await currentUser.getIdToken();
      const response = await fetch("/api/subscription/upgrade", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ interval }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.scheduled) {
        throw new Error(data.error || "The upgrade could not be scheduled.");
      }

      setScheduled(data.upgrade);
      onScheduled?.(data.upgrade);
      await MobxStore.checkPermissions(true);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const effectiveDate = formatDate(
    scheduled?.pendingMembershipEffectiveAt || preview?.effectiveAt
  );
  const targetPlan = scheduled?.targetPlan || preview?.targetPlan;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] overflow-y-auto motion-reduce:animate-none motion-reduce:transition-none sm:max-w-xl">
        {scheduled ? (
          <>
            <DialogHeader>
              <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <DialogTitle>Business upgrade scheduled</DialogTitle>
              <DialogDescription>
                GO Community remains active until {effectiveDate}. Business
                access begins only after Polar applies the change.
              </DialogDescription>
            </DialogHeader>
            <Alert className="border-primary/35 bg-primary/10">
              <CalendarDays className="h-4 w-4" />
              <AlertTitle>No charge today</AlertTitle>
              <AlertDescription>
                Your expected Business renewal is{" "}
                {formatMoney(targetPlan?.amount, targetPlan?.currency)} per{" "}
                {formatInterval(targetPlan?.interval)}. Polar will confirm the
                final total, discounts, and taxes at renewal.
              </AlertDescription>
            </Alert>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button">Done</Button>
              </DialogClose>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Review Business upgrade</DialogTitle>
              <DialogDescription>
                Review when your plan and access will change before confirming.
              </DialogDescription>
            </DialogHeader>

            {loading && (
              <div
                className="flex min-h-48 items-center justify-center text-sm text-muted-foreground"
                role="status"
              >
                Verifying your subscription with Polar…
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Upgrade unavailable</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {preview && !loading && (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Current plan
                    </p>
                    <p className="mt-1 font-semibold">
                      {preview.currentPlan.name}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatMoney(
                        preview.currentPlan.amount,
                        preview.currentPlan.currency
                      )}{" "}
                      per {formatInterval(preview.currentPlan.interval)}
                    </p>
                  </div>
                  <ArrowRight
                    className="mx-auto h-5 w-5 rotate-90 text-primary sm:rotate-0"
                    aria-hidden="true"
                  />
                  <div className="rounded-lg border border-primary/40 bg-primary/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                      Scheduled plan
                    </p>
                    <p className="mt-1 font-semibold">
                      {preview.targetPlan.name}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatMoney(
                        preview.targetPlan.amount,
                        preview.targetPlan.currency
                      )}{" "}
                      per {formatInterval(preview.targetPlan.interval)}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border p-4 text-sm">
                  <div className="flex gap-3">
                    <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <p className="font-medium">No charge today</p>
                      <p className="text-muted-foreground">
                        There is no prorated charge or credit for this scheduled
                        change.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <p className="font-medium">Changes on {effectiveDate}</p>
                      <p className="text-muted-foreground">
                        Community remains active until then. Business benefits
                        begin only after Polar confirms the change.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <p className="font-medium">Estimated renewal price</p>
                      <p className="text-muted-foreground">
                        {formatMoney(
                          preview.targetPlan.amount,
                          preview.targetPlan.currency
                        )}{" "}
                        per {formatInterval(preview.targetPlan.interval)}.
                        Polar confirms applicable discounts and taxes at
                        renewal.
                      </p>
                    </div>
                  </div>
                </div>

                {preview.currentPlan.hasDiscount && (
                  <Alert>
                    <AlertTitle>Your Community plan has a discount</AlertTitle>
                    <AlertDescription>
                      The Business price above is the current plan price before
                      any renewal taxes or eligible discounts. Your discounted
                      Community price does not provide early Business access.
                    </AlertDescription>
                  </Alert>
                )}

                <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 text-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                  <input
                    type="checkbox"
                    checked={understood}
                    onChange={(event) => setUnderstood(event.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-primary"
                  />
                  <span>
                    I understand that GO Community remains active until{" "}
                    {effectiveDate}, and Business access starts only after
                    Polar applies the scheduled change.
                  </span>
                </label>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="button"
                onClick={confirmUpgrade}
                disabled={!preview || !understood || loading || submitting}
              >
                {submitting
                  ? "Scheduling upgrade…"
                  : "Confirm scheduled upgrade"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
