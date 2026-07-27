"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";
import MobxStore from "@/mobx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/profile";
  const [state, setState] = useState("idle");
  const [message, setMessage] = useState("");
  const cooldownTimer = useRef(null);

  useEffect(
    () => () => {
      if (cooldownTimer.current) window.clearTimeout(cooldownTimer.current);
    },
    []
  );

  const resend = async () => {
    if (state === "sending" || state === "cooldown") return;
    setState("sending");
    setMessage("");
    try {
      const result = await MobxStore.sendVerificationEmail();
      setMessage(
        result.skipped
          ? "This account is already verified."
          : "A new verification email has been sent."
      );
      setState("cooldown");
      cooldownTimer.current = window.setTimeout(
        () => setState("idle"),
        60_000
      );
    } catch {
      setMessage(
        "A verification email could not be sent yet. Please wait and try again."
      );
      setState("idle");
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="text-center">
        <MailCheck className="h-12 w-12 text-primary mx-auto" />
        <CardTitle className="mt-3">Verify your email address</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 text-center">
        <p className="text-muted-foreground">
          We sent a verification link to your account email. Open it to confirm
          your address, then continue to Galactic Omnivore.
        </p>
        {message && <p className="text-sm" role="status">{message}</p>}
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={resend}
            disabled={state !== "idle"}
          >
            {state === "sending"
              ? "Sending…"
              : state === "cooldown"
                ? "Email sent"
                : "Resend verification"}
          </Button>
          <Button asChild>
            <Link href={redirect}>Continue</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="container mx-auto min-h-[60vh] flex items-center justify-center py-12">
      <Suspense fallback={<p>Loading…</p>}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
