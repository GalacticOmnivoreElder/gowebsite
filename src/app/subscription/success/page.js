"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { observer } from "mobx-react-lite";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Compass,
  RefreshCw,
  User,
} from "lucide-react";
import MobxStore from "@/mobx";
import { auth } from "@/firebase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  acknowledgeMembershipConfirmation,
  getPendingSubscriptionConfirmationAttempt,
  isMembershipConfirmationAcknowledged,
  shouldShowSubscriptionConfirmation,
} from "@/lib/subscription-confirmation";

const MAX_VERIFICATION_ATTEMPTS = 10;
const VERIFICATION_DELAY_MS = 3000;
const ONBOARDING_ESTIMATE = "about 10 minutes";

const SubscriptionSuccessPage = observer(() => {
  const router = useRouter();
  const [verificationRun, setVerificationRun] = useState(0);
  const [verifying, setVerifying] = useState(true);
  const [membershipConfirmed, setMembershipConfirmed] = useState(false);
  const [confirmationId, setConfirmationId] = useState(null);
  const [confirmationMode, setConfirmationMode] = useState("purchase");
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  useEffect(() => {
    if (window.location.search || window.location.hash) {
      window.history.replaceState(
        window.history.state,
        "",
        "/subscription/success"
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const verifyMembership = async () => {
      setVerifying(true);

      try {
        for (
          let attemptNumber = 0;
          attemptNumber < MAX_VERIFICATION_ATTEMPTS;
          attemptNumber += 1
        ) {
          if (cancelled) return;

          const currentUser = auth.currentUser;
          const userId = currentUser?.uid || MobxStore.user?.uid;

          if (currentUser && userId) {
            try {
              const token = await currentUser.getIdToken();
              const response = await fetch("/api/billing/subscription", {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                cache: "no-store",
              });
              const verification = await response.json().catch(() => ({}));

              if (
                response.ok &&
                verification.hasPaidSubscription === true
              ) {
                if (cancelled) return;

                setMembershipConfirmed(true);
                const pendingAttempt =
                  getPendingSubscriptionConfirmationAttempt({ userId });
                const nextConfirmationId =
                  verification.membershipConfirmationId || null;
                const nextConfirmationMode =
                  pendingAttempt?.mode === "upgrade"
                    ? "upgrade"
                    : "purchase";
                const confirmationReceiptId =
                  nextConfirmationMode === "upgrade"
                    ? `upgrade:${pendingAttempt?.attemptId || ""}`
                    : nextConfirmationId;
                const confirmationAcknowledged =
                  isMembershipConfirmationAcknowledged(
                    confirmationReceiptId
                  );

                if (
                  shouldShowSubscriptionConfirmation({
                    attempt: pendingAttempt,
                    verification,
                    userId,
                  }) &&
                  !confirmationAcknowledged
                ) {
                  setConfirmationId(confirmationReceiptId);
                  setConfirmationMode(nextConfirmationMode);
                  setConfirmationOpen(true);
                  await MobxStore.checkAuth?.();
                  return;
                }

                // A direct visit has no checkout marker and should never open
                // the dialog. With a marker, keep polling until the webhook
                // stores a new canonical activation receipt; subscription.active
                // can make membership active a moment before that write lands.
                if (!pendingAttempt || confirmationAcknowledged) {
                  await MobxStore.checkAuth?.();
                  return;
                }
              }
            } catch (error) {
              console.error(
                "Membership verification poll failed:",
                error
              );
            }
          }

          if (attemptNumber < MAX_VERIFICATION_ATTEMPTS - 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, VERIFICATION_DELAY_MS)
            );
          }
        }
      } finally {
        if (!cancelled) setVerifying(false);
      }
    };

    verifyMembership();

    return () => {
      cancelled = true;
    };
  }, [verificationRun]);

  const acknowledgeConfirmation = () => {
    acknowledgeMembershipConfirmation(confirmationId);
    setConfirmationOpen(false);
  };

  const navigateAfterConfirmation = (path) => {
    acknowledgeConfirmation();
    router.push(path);
  };

  const handleDialogOpenChange = (open) => {
    if (open) {
      setConfirmationOpen(true);
      return;
    }
    acknowledgeConfirmation();
  };

  if (verifying) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
        <div
          className="flex flex-col items-center gap-4"
          role="status"
          aria-live="polite"
        >
          <div className="relative h-20 w-20" aria-hidden="true">
            <span className="absolute inset-2 rounded-full bg-primary/25 blur-xl" />
            <span className="go-logo-spinner go-logo-spinner--running relative block h-20 w-20">
              <Image
                src="/galactic-omnivore-skull-v1-512.png"
                alt=""
                fill
                sizes="80px"
                priority
                className="select-none object-contain"
              />
            </span>
          </div>
          <p className="max-w-md text-center text-muted-foreground">
            Confirming your Galactic Omnivore membership. This usually takes a
            few seconds.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Card className="overflow-hidden border-primary/25 bg-card">
          <div className="h-2 bg-primary" aria-hidden="true" />
          <CardHeader className="items-center px-5 pb-4 pt-8 text-center sm:px-8">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-primary/40 bg-primary/15">
              {membershipConfirmed ? (
                <CheckCircle2
                  className="h-9 w-9 text-primary"
                  aria-hidden="true"
                />
              ) : (
                <RefreshCw
                  className="h-8 w-8 text-primary"
                  aria-hidden="true"
                />
              )}
            </div>
            <CardTitle className="font-heading text-3xl sm:text-4xl">
              {membershipConfirmed
                ? "Your membership is active"
                : "We’re finalizing your membership"}
            </CardTitle>
            <p className="max-w-xl text-muted-foreground">
              {membershipConfirmed
                ? "Your paid Galactic Omnivore membership has been verified. Choose what you’d like to do next."
                : "We haven’t received the final Polar confirmation yet. You have not been shown a subscription confirmation."}
            </p>
          </CardHeader>

          <CardContent className="space-y-6 px-5 pb-8 sm:px-8">
            {membershipConfirmed ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-md border border-border bg-background/60 p-4">
                    <Clock3
                      className="mb-3 h-6 w-6 text-primary"
                      aria-hidden="true"
                    />
                    <h2 className="font-semibold">Profile setup</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Onboarding takes {ONBOARDING_ESTIMATE} and helps create
                      your profile and draft GameDev Passport.
                    </p>
                  </div>
                  <div className="rounded-md border border-border bg-background/60 p-4">
                    <Compass
                      className="mb-3 h-6 w-6 text-primary"
                      aria-hidden="true"
                    />
                    <h2 className="font-semibold">Explore at your own pace</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      You can visit your profile or browse projects before
                      completing onboarding.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <Button onClick={() => router.push("/onboarding")}>
                    <User className="mr-2 h-4 w-4" aria-hidden="true" />
                    Start onboarding
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/profile")}
                  >
                    <User className="mr-2 h-4 w-4" aria-hidden="true" />
                    Explore your profile
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => router.push("/projects")}
                  >
                    Browse projects
                    <ArrowRight
                      className="ml-2 h-4 w-4"
                      aria-hidden="true"
                    />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center">
                <p className="max-w-lg text-sm text-muted-foreground">
                  Polar webhooks can occasionally take a little longer. You
                  can retry safely—this does not create another payment.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    onClick={() => setVerificationRun((run) => run + 1)}
                  >
                    Check membership again
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/membership")}
                  >
                    Return to membership
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={confirmationOpen}
        onOpenChange={handleDialogOpenChange}
      >
        <DialogContent className="max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto border-primary/40 bg-[#111111] p-0 text-white shadow-2xl shadow-primary/20 sm:rounded-md">
          <div className="h-2 bg-primary" aria-hidden="true" />
          <div className="space-y-6 px-5 pb-6 pt-4 sm:px-8 sm:pb-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-primary/50 bg-primary/20">
              <CheckCircle2
                className="h-9 w-9 text-primary"
                aria-hidden="true"
              />
            </div>

            <DialogHeader className="text-center sm:text-center">
              <DialogTitle className="font-heading text-2xl leading-tight sm:text-3xl">
                {confirmationMode === "upgrade"
                  ? "Your GO Business upgrade is confirmed"
                  : "Your GO membership is active"}
              </DialogTitle>
              <DialogDescription className="text-base leading-relaxed text-white/75">
                {confirmationMode === "upgrade"
                  ? "Your membership now includes GO Business project creation and team-building access."
                  : "Your membership is active. You can start setting up your profile now or continue exploring Galactic Omnivore."}
              </DialogDescription>
            </DialogHeader>

            <div className="flex gap-3 rounded-md border border-primary/30 bg-primary/10 p-4">
              <Clock3
                className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <p className="text-sm leading-relaxed text-white/85">
                Onboarding takes {ONBOARDING_ESTIMATE} and helps us create your
                profile and draft GameDev Passport.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                size="lg"
                onClick={() => navigateAfterConfirmation("/onboarding")}
              >
                <User className="mr-2 h-5 w-5" aria-hidden="true" />
                Start onboarding
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
                onClick={() => navigateAfterConfirmation("/profile")}
              >
                <User className="mr-2 h-5 w-5" aria-hidden="true" />
                Explore your profile
              </Button>
              <Button
                variant="ghost"
                className="text-white/80 hover:bg-white/10 hover:text-white"
                onClick={() => navigateAfterConfirmation("/projects")}
              >
                Browse projects
                <ArrowRight
                  className="ml-2 h-4 w-4"
                  aria-hidden="true"
                />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
});

export default SubscriptionSuccessPage;
