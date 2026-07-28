"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NewsletterSignup({
  source = "homepage",
  compact = false,
  className = "",
}) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [company, setCompany] = useState("");
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setState("loading");
    setError("");
    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, consent, source, company }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Newsletter signup is unavailable.");
      }
      setState("success");
      setEmail("");
      setConsent(false);
    } catch (submitError) {
      setState("error");
      setError(submitError.message);
    }
  };

  return (
    <div className={className}>
      {!compact && (
        <>
          <h2 className="text-3xl md:text-4xl font-bold">Join the newsletter</h2>
          <p className="mx-auto mt-3 max-w-2xl text-white/80">
            Get Galactic Omnivore community news, new opportunities, and
            selected resources in your inbox.
          </p>
        </>
      )}
      {compact && (
        <>
          <h3 className="font-semibold text-lg">Newsletter</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Community news and opportunities, sent thoughtfully.
          </p>
        </>
      )}

      {state === "success" ? (
        <div
          className={`mt-4 rounded-md border border-green-500/40 bg-green-500/10 p-4 ${
            compact ? "text-sm" : ""
          }`}
          role="status"
        >
          If this address can be subscribed, a confirmation email will arrive
          shortly. Check your inbox and spam folder.
        </div>
      ) : (
        <form
          onSubmit={submit}
          className="mx-auto mt-4 max-w-2xl"
          noValidate
        >
          <label htmlFor={`newsletter-email-${source}`} className="sr-only">
            Email address
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              id={`newsletter-email-${source}`}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={state === "loading"}
              className={compact ? "bg-background" : "bg-white text-black"}
            />
            <Button
              type="submit"
              disabled={state === "loading" || !consent}
              className={compact ? "" : "bg-white text-black hover:bg-white/90"}
            >
              {state === "loading" ? "Subscribing…" : "Subscribe"}
            </Button>
          </div>

          <div
            className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden"
            aria-hidden="true"
          >
            <label htmlFor={`newsletter-company-${source}`}>Company</label>
            <input
              id={`newsletter-company-${source}`}
              name="company"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
            />
          </div>

          <label
            htmlFor={`newsletter-consent-${source}`}
            className={`mt-3 flex items-start gap-2 text-left ${
              compact ? "text-xs" : "text-sm"
            }`}
          >
            <input
              id={`newsletter-consent-${source}`}
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              disabled={state === "loading"}
              className="mt-1 h-4 w-4 shrink-0 accent-primary"
            />
            <span className={compact ? "text-muted-foreground" : "text-white/80"}>
              I want to receive the Galactic Omnivore newsletter and understand
              that I can unsubscribe at any time. See the{" "}
              <Link href="/privacy" className="underline hover:no-underline">
                Privacy Policy
              </Link>
              .
            </span>
          </label>

          {state === "error" && (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
