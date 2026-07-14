"use client";

import { useState, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import MobxStore from "@/mobx";
import { auth } from "@/firebase";

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

    const handleSubscribe = async () => {
      if (requireAuth && !MobxStore.user) {
        router.push(
          "/login?redirect=" + encodeURIComponent(window.location.pathname)
        );
        return;
      }

      if (MobxStore.hasActiveSubscription) {
        router.push("/profile");
        return;
      }

      setLoading(true);
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          router.push(
            "/login?redirect=" + encodeURIComponent(window.location.pathname)
          );
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
        disabled={disabled || loading}
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
