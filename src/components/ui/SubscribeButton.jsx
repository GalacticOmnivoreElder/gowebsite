"use client";

import { useState } from "react";
import { observer } from "mobx-react-lite";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import MobxStore from "@/mobx";

const SubscribeButton = observer(
  ({
    children,
    className = "",
    variant = "default",
    size = "default",
    disabled = false,
    requireAuth = true,
    ...props
  }) => {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubscribe = async () => {
      // Check if user is logged in
      if (requireAuth && !MobxStore.user) {
        router.push(
          "/login?redirect=" + encodeURIComponent(window.location.pathname)
        );
        return;
      }

      // Check if user is already a member
      if (MobxStore.user?.activeMember) {
        router.push("/dashboard");
        return;
      }

      setLoading(true);
      try {
        // Build query parameters for Polar checkout
        const params = new URLSearchParams({
          products:
            process.env.NEXT_PUBLIC_POLAR_PRODUCT_ID || "your_product_id",
          customerEmail: MobxStore.user?.email || "",
          customerName: MobxStore.user?.username || "",
          metadata: JSON.stringify({
            username: MobxStore.user?.username || "",
            uid: MobxStore.user?.uid || "",
          }),
        });

        // Redirect to checkout
        window.location.href = `/api/checkout?${params.toString()}`;
      } catch (error) {
        console.error("Failed to create checkout session:", error);
        alert("Failed to start subscription. Please try again.");
        setLoading(false);
      }
    };

    // Don't show button if user is already a member
    if (MobxStore.user?.activeMember) {
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
