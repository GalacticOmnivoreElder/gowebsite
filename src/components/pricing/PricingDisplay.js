"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import { ArrowRight, Building2, Check, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import SubscribeButton from "@/components/ui/SubscribeButton";
import { BusinessUpgradeDialog } from "@/components/pricing/BusinessUpgradeDialog";
import MobxStore from "@/mobx";
import { auth } from "@/firebase";
import { parseCheckoutPlanKey } from "@/lib/checkout-navigation";
import { canChooseMembershipPlan } from "@/lib/membership-ui";
import { beginSubscriptionConfirmationAttempt } from "@/lib/subscription-confirmation";
import {
  BILLING_INTERVALS,
  MEMBERSHIP_PLANS,
} from "@/constants/membership";

const planIcons = {
  community: User,
  business: Building2,
};

const formatPrice = (amount) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount);

const formatPendingDate = (value) => {
  if (!value) return null;
  const date =
    typeof value?.toDate === "function"
      ? value.toDate()
      : value?._seconds || value?.seconds
      ? new Date((value._seconds || value.seconds) * 1000)
      : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(date);
};

export const PricingDisplay = observer(() => {
  const [interval, setInterval] = useState("monthly");
  const [upgradeInterval, setUpgradeInterval] = useState("monthly");
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [scheduledUpgrade, setScheduledUpgrade] = useState(null);
  const resumedCheckout = useRef(false);
  const user = MobxStore.user;
  const authLoading = MobxStore.loading || MobxStore.permissionsLoading;
  const isAnonymous = MobxStore.isUserAnonymous;
  const hasActiveSubscription = MobxStore.hasActiveSubscription;
  const currentTier =
    MobxStore.permissions?.permissions?.membershipTier ||
    user?.membershipTier ||
    null;
  const hasActiveBusinessMembership =
    hasActiveSubscription && currentTier === "company";
  const pendingBusinessUpgrade =
    scheduledUpgrade ||
    (user?.pendingMembershipTier === "company" &&
    user?.pendingMembershipStatus === "scheduled"
      ? {
          pendingMembershipCurrency: user.pendingMembershipCurrency,
          pendingMembershipEffectiveAt: user.pendingMembershipEffectiveAt,
          pendingMembershipInterval: user.pendingMembershipInterval,
          pendingMembershipPriceAmount: user.pendingMembershipPriceAmount,
          pendingMembershipTier: user.pendingMembershipTier,
        }
      : null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const selection = parseCheckoutPlanKey(searchParams.get("plan"));
    if (!selection) return;

    setInterval(selection.interval);
    if (
      resumedCheckout.current ||
      authLoading ||
      !user ||
      isAnonymous
    ) {
      return;
    }

    resumedCheckout.current = true;
    searchParams.delete("plan");
    const remainingQuery = searchParams.toString();
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}${remainingQuery ? `?${remainingQuery}` : ""}${window.location.hash}`
    );

    const canChoosePlan = canChooseMembershipPlan({
      hasActiveSubscription,
      currentTier:
        MobxStore.permissions?.permissions?.membershipTier ||
        user?.membershipTier,
      pendingTier: user?.pendingMembershipTier,
      targetTier: selection.tier,
      subscriptionStatus: user?.subscriptionStatus,
      willRenew: user?.willRenew,
    });

    if (!canChoosePlan) {
      window.location.assign("/profile");
      return;
    }

    if (
      hasActiveSubscription &&
      currentTier === "member" &&
      selection.tier === "company"
    ) {
      setUpgradeInterval(selection.interval);
      setUpgradeDialogOpen(true);
      return;
    }

    const resumeCheckout = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const token = await currentUser.getIdToken();
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          interval: selection.interval,
          tier: selection.tier,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.url) {
        throw new Error(result.error || "Failed to start checkout.");
      }

      if (result.flow !== "portal") {
        beginSubscriptionConfirmationAttempt({
          baselineConfirmationId: user?.membershipConfirmationId || null,
          baselineMembershipTier: currentTier,
          interval: selection.interval,
          mode: "purchase",
          tier: selection.tier,
          userId: user.uid,
        });
      }
      window.location.assign(result.url);
    };

    resumeCheckout().catch((error) => {
      console.error("Could not resume membership checkout:", error);
      window.alert(error.message);
    });
  }, [authLoading, currentTier, hasActiveSubscription, isAnonymous, user]);

  return (
    <div className="min-w-0 max-w-full space-y-8">
      <div className="flex justify-center">
        <div
          className="inline-flex w-full max-w-xs rounded-md border bg-muted/30 p-1"
          role="group"
          aria-label="Billing interval"
        >
          {BILLING_INTERVALS.map((option) => (
            <Button
              key={option.id}
              type="button"
              size="sm"
              variant={interval === option.id ? "default" : "ghost"}
              className={`min-w-0 ${
                option.id === "annual" ? "flex-[1.65] gap-2" : "flex-1"
              }`}
              aria-pressed={interval === option.id}
              onClick={() => setInterval(option.id)}
            >
              {option.label}
              {option.id === "annual" && (
                <span
                  className={`shrink-0 rounded-sm px-2 py-0.5 text-xs font-semibold leading-none ${
                    interval === "annual"
                      ? "bg-primary-foreground/15 text-primary-foreground"
                      : "bg-primary/15 text-primary"
                  }`}
                >
                  Save up to 20%
                </span>
              )}
            </Button>
          ))}
        </div>
      </div>

      {hasActiveBusinessMembership && (
        <div className="mx-auto flex max-w-5xl flex-col gap-4 rounded-lg border border-primary/35 bg-primary/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-foreground">
              GO Business is active
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              You have every Community benefit plus project creation and
              team-management tools.
            </p>
          </div>
          <Button variant="outline" asChild className="shrink-0">
            <Link href="/billing">Manage Business membership</Link>
          </Button>
        </div>
      )}

      {pendingBusinessUpgrade && !hasActiveBusinessMembership && (
        <div className="mx-auto flex max-w-5xl flex-col gap-4 rounded-lg border border-primary/35 bg-primary/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-foreground">
              GO Business upgrade scheduled
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              GO Community stays active until{" "}
              {formatPendingDate(
                pendingBusinessUpgrade.pendingMembershipEffectiveAt
              ) || "your next renewal date"}
              . Business access begins only after Polar applies the change.
            </p>
          </div>
          <Button variant="outline" asChild className="shrink-0">
            <Link href="/billing">Manage scheduled upgrade</Link>
          </Button>
        </div>
      )}

      <div className="mx-auto grid min-w-0 max-w-5xl grid-cols-1 gap-6 lg:grid-cols-2">
        {MEMBERSHIP_PLANS.map((plan) => {
          const Icon = planIcons[plan.id];
          const price = plan.pricing[interval];
          const isCurrentPlan =
            hasActiveSubscription && currentTier === plan.tier;
          const isUpgradeTarget =
            hasActiveSubscription &&
            currentTier === "member" &&
            plan.tier === "company";
          const isIncludedWithBusiness =
            hasActiveBusinessMembership && plan.tier === "member";
          const isHighlighted =
            isCurrentPlan ||
            (!hasActiveBusinessMembership &&
              (plan.popular || isUpgradeTarget));

          return (
            <Card
              key={plan.id}
              className={`relative min-w-0 max-w-full flex h-full flex-col overflow-hidden ${
                isHighlighted ? "border-primary" : ""
              }`}
            >
              <CardHeader className="min-w-0 space-y-5 px-4 pb-4 sm:px-6">
                <div className="flex min-h-8 flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Icon className="h-6 w-6 text-primary" />
                    <span className="min-w-0 text-sm font-medium text-muted-foreground">
                      {plan.audience}
                    </span>
                  </div>
                  {isCurrentPlan ? (
                    <Badge className="shrink-0">Current membership</Badge>
                  ) : pendingBusinessUpgrade && plan.tier === "company" ? (
                    <Badge className="shrink-0">Upgrade scheduled</Badge>
                  ) : isIncludedWithBusiness ? (
                    <Badge variant="outline" className="shrink-0">
                      Included with Business
                    </Badge>
                  ) : (
                    plan.popular && (
                      <Badge className="shrink-0">Most popular</Badge>
                    )
                  )}
                </div>

                <div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground sm:min-h-12">
                    {plan.description}
                  </p>
                </div>

                <div className="min-h-24">
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-bold">
                      {formatPrice(price.amount)}
                    </span>
                    <span className="pb-1 text-muted-foreground">
                      MKD / {price.period}
                    </span>
                  </div>
                  <div className="mt-2 flex min-h-6 flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>{price.billingNote}</span>
                    {price.savings && (
                      <Badge variant="outline">{price.savings}</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="min-w-0 flex-1 px-4 pt-2 sm:px-6">
                <ul className="space-y-3">
                  {plan.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-3 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="min-w-0 break-words">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="min-w-0 px-4 pt-6 sm:px-6">
                {pendingBusinessUpgrade && plan.tier === "company" ? (
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full"
                    asChild
                  >
                    <Link href="/billing">Manage scheduled upgrade</Link>
                  </Button>
                ) : isCurrentPlan && hasActiveBusinessMembership ? (
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full"
                    asChild
                  >
                    <Link href="/billing">Manage current membership</Link>
                  </Button>
                ) : isIncludedWithBusiness ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="w-full"
                    disabled
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Included with GO Business
                  </Button>
                ) : isUpgradeTarget ? (
                  <Button
                    type="button"
                    className="w-full"
                    variant="default"
                    size="lg"
                    onClick={() => {
                      setUpgradeInterval(interval);
                      setUpgradeDialogOpen(true);
                    }}
                  >
                    Review Business upgrade
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <SubscribeButton
                    tier={plan.tier}
                    interval={interval}
                    useServerCheckout
                    className="w-full"
                    variant={
                      plan.popular || isUpgradeTarget
                        ? "default"
                        : "outline"
                    }
                    size="lg"
                  >
                    Choose {plan.name}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </SubscribeButton>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Prices shown in MKD. Polar confirms the available regional price and
        applicable taxes at secure checkout.
      </p>

      <BusinessUpgradeDialog
        interval={upgradeInterval}
        open={upgradeDialogOpen}
        onOpenChange={setUpgradeDialogOpen}
        onScheduled={setScheduledUpgrade}
      />
    </div>
  );
});
