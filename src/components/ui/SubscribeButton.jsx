"use client";

import { useState, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import MobxStore from "@/mobx";
import { auth } from "@/firebase";
import { buildCheckoutAuthUrl } from "@/lib/checkout-navigation";
import { canChooseMembershipPlan } from "@/lib/membership-ui";
import { beginSubscriptionConfirmationAttempt } from "@/lib/subscription-confirmation";

const SubscribeButton = observer(
  ({
    children,
    className = "",
    variant = "default",
    size = "default",
    disabled = false,
    requireAuth = true,
    tier = "member",
    interval = "monthly",
    productId,
    checkoutUrl,
    useServerCheckout = false,
    ...props
  }) => {
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();
    const canChoosePlan = canChooseMembershipPlan({
      hasActiveSubscription: mounted && MobxStore.hasActiveSubscription,
      currentTier:
        (mounted && MobxStore.permissions?.permissions?.membershipTier) ||
        (mounted && MobxStore.user?.membershipTier),
      pendingTier: mounted
        ? MobxStore.user?.pendingMembershipTier
        : null,
      targetTier: tier,
      subscriptionStatus: mounted
        ? MobxStore.user?.subscriptionStatus
        : null,
      willRenew: mounted ? MobxStore.user?.willRenew : null,
    });
    const authStateLoading =
      mounted && (MobxStore.loading || MobxStore.permissionsLoading);

    useEffect(() => {
      setMounted(true);
      setLoading(false);

      const handlePageShow = (event) => {
        if (event.persisted) {
          setLoading(false);
        }
      };

      window.addEventListener("pageshow", handlePageShow);
      return () => window.removeEventListener("pageshow", handlePageShow);
    }, []);

    const redirectToAuthentication = () => {
      if (checkoutUrl || useServerCheckout) {
        router.push(
          buildCheckoutAuthUrl({
            tier,
            interval,
            isAnonymous: MobxStore.isUserAnonymous,
            redirectPath: window.location.pathname,
          })
        );
        return;
      }

      router.push(
        "/login?redirect=" + encodeURIComponent(window.location.pathname)
      );
    };

    const handleSubscribe = async () => {
      if (!mounted) return;

      if (!useServerCheckout && !checkoutUrl && !productId) {
        if (
          requireAuth &&
          (!MobxStore.user || MobxStore.isUserAnonymous)
        ) {
          router.push(
            "/login?redirect=" + encodeURIComponent("/membership")
          );
          return;
        }

        router.push("/membership");
        return;
      }

      if (authStateLoading) return;

      if (
        requireAuth &&
        (!MobxStore.user || MobxStore.isUserAnonymous)
      ) {
        redirectToAuthentication();
        return;
      }

      if (!canChoosePlan) {
        router.push("/profile");
        return;
      }

      if (checkoutUrl && !useServerCheckout) {
        setLoading(true);
        beginSubscriptionConfirmationAttempt({
          baselineConfirmationId:
            MobxStore.user?.membershipConfirmationId || null,
          baselineMembershipTier:
            MobxStore.permissions?.permissions?.membershipTier ||
            MobxStore.user?.membershipTier ||
            null,
          interval,
          mode: "purchase",
          tier,
          userId: MobxStore.user?.uid,
        });
        window.location.assign(checkoutUrl);
        return;
      }

      setLoading(true);
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          redirectToAuthentication();
          return;
        }

        const token = await currentUser.getIdToken();
        const response = await fetch("/api/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ tier, interval, productId }),
        });

        const data = await response.json();
        if (!response.ok || !data.url) {
          throw new Error(data.error || "Failed to create checkout session");
        }

        // A new purchase returns from checkout to our success page. Existing
        // paid members manage upgrades in Polar's portal, so no purchase
        // confirmation marker should exist until Polar records a real change.
        if (data.flow !== "portal") {
          beginSubscriptionConfirmationAttempt({
            baselineConfirmationId:
              MobxStore.user?.membershipConfirmationId || null,
            baselineMembershipTier:
              MobxStore.permissions?.permissions?.membershipTier ||
              MobxStore.user?.membershipTier ||
              null,
            interval,
            mode: "purchase",
            tier,
            userId: currentUser.uid,
          });
        }
        window.location.href = data.url;
      } catch (error) {
        console.error("Failed to create checkout session:", error);
        alert(
          error.message || "Failed to start subscription. Please try again."
        );
        setLoading(false);
      }
    };

    if (!canChoosePlan) {
      return null;
    }

    return (
      <Button
        onClick={handleSubscribe}
        disabled={
          disabled || loading || authStateLoading
        }
        className={className}
        variant={variant}
        size={size}
        {...props}
      >
        {loading ? "Starting checkout..." : children || "Subscribe Premium"}
      </Button>
    );
  }
);

export default SubscribeButton;
