"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { observer } from "mobx-react-lite";
import MobxStore from "@/mobx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Gift,
  Users,
  Zap,
  ArrowRight,
  User,
  Crown,
  Star,
  RefreshCw,
} from "lucide-react";
import { LoadingSpinner } from "@/reusable-ui/LoadingSpinner";

const membershipPerks = [
  {
    icon: <Gift className="w-5 h-5" />,
    title: "Premium Resources",
    description: "Access to exclusive templates, tools, and downloads",
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: "Community Access",
    description: "Join our private Discord community of creators",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: "Priority Support",
    description: "Get faster responses and dedicated help",
  },
  {
    icon: <Star className="w-5 h-5" />,
    title: "Early Access",
    description: "Be first to try new features and content",
  },
];

const SubscriptionSuccessPage = observer(() => {
  const router = useRouter();
  const [verifying, setVerifying] = useState(true);
  const [membershipConfirmed, setMembershipConfirmed] = useState(false);

  useEffect(() => {
    router.replace("/subscription/success", { scroll: false });

    let cancelled = false;

    const verifyMembership = async () => {
      const maxAttempts = 10;

      try {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          if (cancelled) return;

          // checkAuth swallows its own errors, but guard here too so a single
          // failed poll can never leave the page stuck on an infinite spinner.
          try {
            await MobxStore.checkAuth();
          } catch (err) {
            console.error("Membership verification poll failed:", err);
          }

          if (cancelled) return;

          if (MobxStore.hasActiveSubscription) {
            setMembershipConfirmed(true);
            return;
          }

          if (attempt < maxAttempts - 1) {
            await new Promise((resolve) => setTimeout(resolve, 3000));
          }
        }
      } finally {
        // Always leave the loading state, whether we confirmed, timed out,
        // or hit an unexpected error. The page then shows the "processing"
        // fallback instead of spinning forever.
        if (!cancelled) {
          setVerifying(false);
        }
      }
    };

    verifyMembership();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (verifying) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <LoadingSpinner />
        <p className="text-muted-foreground text-center max-w-md">
          Confirming your recurring subscription. This usually takes a few
          seconds.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/20 rounded-full mb-4 border-2 border-primary/30">
            <CheckCircle className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2 font-heading">
            Welcome to the Community!
          </h1>
          <p className="text-xl text-muted-foreground">
            {membershipConfirmed
              ? "Your recurring subscription is now active."
              : "Payment received. Your membership may take a minute to activate."}
          </p>
        </div>

        <Card className="mb-8 border-border bg-card">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2 flex-wrap">
              <Badge
                variant="default"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Crown className="w-3 h-3 mr-1" />
                {membershipConfirmed ? "Active Member" : "Processing"}
              </Badge>
              <Badge variant="outline" className="border-primary/30 text-primary">
                Recurring Monthly Plan
              </Badge>
            </div>
            <CardTitle className="text-2xl text-primary font-heading">
              Thank you for subscribing!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              This is a <strong>recurring monthly subscription</strong>, not a
              one-time payment. You will be charged automatically each billing
              period until you cancel from your billing page.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="w-4 h-4" />
              <span>Auto-renews each month</span>
              <Badge variant="secondary" className="text-xs">
                Recurring
              </Badge>
            </div>
            {!membershipConfirmed && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                If premium access is not available yet, wait a moment and refresh
                your profile page.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="mb-8 bg-card border-border">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-foreground font-heading">
              Your Membership Perks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {membershipPerks.map((perk, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 rounded-lg bg-accent/50 border border-border hover:bg-accent/70 transition-colors"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary border border-primary/30">
                    {perk.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      {perk.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {perk.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Button
            onClick={() => router.push("/onboarding")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg font-semibold"
          >
            <User className="w-5 h-5 mr-2" />
            Complete your GO profile
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/projects")}
            className="border-primary/30 text-primary hover:bg-primary/10 px-8 py-3 text-lg font-semibold"
          >
            Browse Projects
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>
            Need help? Contact us at{" "}
            <a
              href="mailto:galacticomnivore@galacticomnivore.com"
              className="text-primary hover:underline"
            >
              galacticomnivore@galacticomnivore.com
            </a>{" "}
            or visit our{" "}
            <button
              onClick={() => router.push("/faq")}
              className="text-primary hover:underline"
            >
              FAQ page
            </button>
          </p>
        </div>
      </div>
    </div>
  );
});

export default SubscriptionSuccessPage;
