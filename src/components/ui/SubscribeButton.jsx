"use client";

import { useState, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import MobxStore from "@/mobx";
import { auth } from "@/firebase";
import { buildCheckoutAuthUrl } from "@/lib/checkout-navigation";

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
    ...props
  }) => {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
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
      if (checkoutUrl) {
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
      if (!checkoutUrl && !productId) {
        router.push("/membership");
        return;
      }

      if (MobxStore.loading || MobxStore.permissionsLoading) return;

      if (
        requireAuth &&
        (!MobxStore.user || MobxStore.isUserAnonymous)
      ) {
        redirectToAuthentication();
        return;
      }

      if (MobxStore.hasActiveSubscription) {
        router.push("/profile");
        return;
      }

      if (checkoutUrl) {
        setLoading(true);
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

        // Redirect to the Polar-hosted (or embedded) checkout.
        window.location.href = data.url;
      } catch (error) {
        console.error("Failed to create checkout session:", error);
        alert(
          error.message || "Failed to start subscription. Please try again."
        );
        setLoading(false);
      }
    };

    if (MobxStore.hasActiveSubscription) {
      return null;
    }

    return (
      <Button
        onClick={handleSubscribe}
        disabled={
          disabled || loading || MobxStore.loading || MobxStore.permissionsLoading
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
