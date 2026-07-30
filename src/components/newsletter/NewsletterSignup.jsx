"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NEWSLETTER_FORM_MESSAGES,
  validateNewsletterSubmission,
} from "@/lib/newsletter-client";

const copyByVariant = {
  section: {
    heading: "Join the GO mailing list",
    description: "Enter your email to receive updates from Galactic Omnivore.",
  },
  footer: {
    heading: "Newsletter",
    description: "Join the Galactic Omnivore mailing list.",
  },
};

export function NewsletterSignup({
  source = "landing-page",
  variant = "section",
  className = "",
}) {
  const presentation = copyByVariant[variant] || copyByVariant.section;
  const isFooter = variant === "footer";
  const inFlight = useRef(false);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [company, setCompany] = useState("");
  const [state, setState] = useState("idle");
  const [emailError, setEmailError] = useState("");
  const [consentError, setConsentError] = useState("");
  const [submissionError, setSubmissionError] = useState("");

  const emailId = `newsletter-email-${source}`;
  const emailErrorId = `${emailId}-error`;
  const consentId = `newsletter-consent-${source}`;
  const consentErrorId = `${consentId}-error`;
  const companyId = `newsletter-company-${source}`;
  const feedbackId = `newsletter-feedback-${source}`;

  const submit = async (event) => {
    event.preventDefault();
    if (inFlight.current) return;

    const validation = validateNewsletterSubmission({ email, consent });
    setEmailError(validation.emailError);
    setConsentError(validation.consentError);
    setSubmissionError("");

    if (validation.emailError || validation.consentError) {
      setState("idle");
      return;
    }

    inFlight.current = true;
    setState("loading");

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          email: validation.email,
          consent: true,
          source,
          company,
        }),
      });

      if (!response.ok) {
        throw new Error(NEWSLETTER_FORM_MESSAGES.genericError);
      }

      setState("success");
      setEmail("");
      setConsent(false);
    } catch {
      setState("error");
      setSubmissionError(NEWSLETTER_FORM_MESSAGES.genericError);
    } finally {
      inFlight.current = false;
    }
  };

  const headingId = `newsletter-heading-${source}`;

  return (
    <div className={className}>
      {isFooter ? (
        <h3 id={headingId} className="text-lg font-semibold">
          {presentation.heading}
        </h3>
      ) : (
        <h2
          id={headingId}
          className="text-3xl font-bold sm:text-4xl"
        >
          {presentation.heading}
        </h2>
      )}
      <p
        className={
          isFooter
            ? "mt-1 text-sm text-muted-foreground"
            : "mx-auto mt-3 max-w-xl text-white/90"
        }
      >
        {presentation.description}
      </p>

      {state === "success" ? (
        <div
          id={feedbackId}
          className={`mt-5 rounded-md border p-4 ${
            isFooter
              ? "border-green-500/40 bg-green-500/10 text-sm"
              : "border-white/40 bg-black/20 text-white"
          }`}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {NEWSLETTER_FORM_MESSAGES.success}
        </div>
      ) : (
        <form
          onSubmit={submit}
          className={`mt-5 ${isFooter ? "max-w-2xl" : "mx-auto max-w-2xl"}`}
          noValidate
          aria-labelledby={headingId}
          aria-describedby={state === "error" ? feedbackId : undefined}
        >
          <label htmlFor={emailId} className="sr-only">
            Email address
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="min-w-0 flex-1">
              <Input
                id={emailId}
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (emailError) setEmailError("");
                }}
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? emailErrorId : undefined}
                required
                disabled={state === "loading"}
                className={`h-11 w-full ${
                  isFooter
                    ? "bg-background"
                    : "border-white/50 bg-white text-black placeholder:text-black/55"
                }`}
              />
              {emailError && (
                <p
                  id={emailErrorId}
                  className={`mt-2 text-left text-sm ${
                    isFooter ? "text-destructive" : "font-medium text-white"
                  }`}
                  role="alert"
                >
                  {emailError}
                </p>
              )}
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={state === "loading"}
              className={`h-11 w-full sm:w-auto ${
                isFooter
                  ? ""
                  : "bg-white text-black hover:bg-white/90 focus-visible:ring-white"
              }`}
            >
              {state === "loading"
                ? NEWSLETTER_FORM_MESSAGES.loading
                : "Subscribe"}
            </Button>
          </div>

          <div
            className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden"
            aria-hidden="true"
          >
            <label htmlFor={companyId}>Company</label>
            <input
              id={companyId}
              name="company"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
            />
          </div>

          <div className="mt-3 text-left">
            <label
              htmlFor={consentId}
              className={`flex cursor-pointer items-start gap-3 ${
                isFooter ? "text-xs" : "text-sm"
              }`}
            >
              <input
                id={consentId}
                name="consent"
                type="checkbox"
                checked={consent}
                onChange={(event) => {
                  setConsent(event.target.checked);
                  if (consentError) setConsentError("");
                }}
                aria-invalid={Boolean(consentError)}
                aria-describedby={
                  consentError ? consentErrorId : undefined
                }
                disabled={state === "loading"}
                className="mt-0.5 h-5 w-5 shrink-0 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <span
                className={
                  isFooter ? "text-muted-foreground" : "text-white/90"
                }
              >
                I agree to receive email updates from Galactic Omnivore and
                understand that I can unsubscribe at any time. See the{" "}
                <Link
                  href="/privacy"
                  className="font-medium underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
            {consentError && (
              <p
                id={consentErrorId}
                className={`mt-2 text-sm ${
                  isFooter ? "text-destructive" : "font-medium text-white"
                }`}
                role="alert"
              >
                {consentError}
              </p>
            )}
          </div>

          <div
            id={feedbackId}
            className="mt-3"
            aria-live="polite"
            aria-atomic="true"
          >
            {state === "error" && (
              <p
                className={`text-sm ${
                  isFooter ? "text-destructive" : "font-medium text-white"
                }`}
                role="alert"
              >
                {submissionError}
              </p>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
