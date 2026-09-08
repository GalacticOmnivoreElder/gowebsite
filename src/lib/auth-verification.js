import { adminAuth } from "@/lib/firebase-admin";
import { getResend } from "@/lib/resend";
import { safeInternalRedirect } from "@/lib/safe-redirect";
import {
  escapeHtml,
  getSiteUrl,
  normalizeEmail,
} from "@/lib/email/utils";
import { renderEmailLayout } from "@/lib/email/templates/base";

function environmentName() {
  return process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
}

function isProductionDelivery() {
  return (
    process.env.VERCEL_ENV === "production" ||
    process.env.EMAIL_PRODUCTION_DELIVERY === "true"
  );
}

export function verificationContinueUrl(redirect = "/profile") {
  const safeRedirect = safeInternalRedirect(redirect);
  const url = new URL("/login", `${getSiteUrl()}/`);
  url.searchParams.set("verified", "1");
  url.searchParams.set("redirect", safeRedirect);
  return url.toString();
}

function verificationText({ displayName, verificationUrl }) {
  return `${displayName ? `Hi ${displayName},` : "Hello,"}

Confirm your email address to finish setting up your Galactic Omnivore account.

Verify your email: ${verificationUrl}

If you did not create this account, you can ignore this message.

Galactic Omnivore`;
}

function verificationHtml({ displayName, verificationUrl }) {
  const greeting = displayName
    ? `<p style="margin:0 0 16px;">Hi ${escapeHtml(displayName)},</p>`
    : `<p style="margin:0 0 16px;">Hello,</p>`;

  return renderEmailLayout({
    preheader: "Confirm your Galactic Omnivore email address.",
    heading: "Verify your email address",
    bodyHtml:
      greeting +
      `<p style="margin:0 0 16px;">Confirm your email address to finish setting up your Galactic Omnivore account.</p>` +
      `<p style="margin:0 0 16px;">If you did not create this account, you can ignore this message.</p>`,
    ctaLabel: "Verify email address",
    ctaUrl: verificationUrl,
  });
}

export async function sendVerificationEmail({ uid, email, redirect } = {}) {
  if (!uid) {
    const error = new Error("Verification account is required");
    error.code = "verification_account_missing";
    throw error;
  }

  const authUser = await adminAuth.getUser(uid);
  if (authUser.emailVerified) return { skipped: true };

  const recipient = normalizeEmail(authUser.email || email);
  if (!recipient) {
    const error = new Error("The account does not have a valid email address");
    error.code = "verification_email_missing";
    error.permanent = true;
    throw error;
  }

  if (process.env.EMAIL_DISABLE_SEND === "true") {
    const error = new Error("Email delivery is disabled");
    error.code = "email_delivery_disabled";
    error.permanent = true;
    throw error;
  }

  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM_TRANSACTIONAL) {
    const error = new Error("Verification email delivery is not configured");
    error.code = "verification_delivery_not_configured";
    error.permanent = true;
    throw error;
  }

  const verificationUrl = await adminAuth.generateEmailVerificationLink(
    recipient,
    {
      url: verificationContinueUrl(redirect),
      handleCodeInApp: false,
    }
  );

  const displayName = String(authUser.displayName || "").trim();
  const production = isProductionDelivery();
  const testRecipient = normalizeEmail(process.env.EMAIL_TEST_RECIPIENT);
  if (!production && !testRecipient) {
    const error = new Error("A test email recipient is required outside production");
    error.code = "verification_test_recipient_missing";
    error.permanent = true;
    throw error;
  }

  const subject = production
    ? "Verify your Galactic Omnivore email address"
    : `[${environmentName()}] Verify your Galactic Omnivore email address`;
  const actualRecipient = production ? recipient : testRecipient;
  const result = await getResend().emails.send(
    {
      from: process.env.EMAIL_FROM_TRANSACTIONAL,
      to: actualRecipient,
      replyTo: process.env.EMAIL_REPLY_TO || undefined,
      subject,
      html: verificationHtml({ displayName, verificationUrl }),
      text: verificationText({ displayName, verificationUrl }),
      tags: [
        {
          name: "environment",
          value: environmentName().replace(/[^A-Za-z0-9_-]/g, "_"),
        },
        { name: "category", value: "essential" },
        { name: "event", value: "auth_email_verification" },
      ],
    },
    {
      idempotencyKey: `auth-email-verification/${uid}/${Date.now()}`.slice(
        0,
        256
      ),
    }
  );

  if (result.error) {
    const error = new Error(result.error.message || "Resend rejected the email");
    error.code = result.error.name || "provider_error";
    error.permanent = ["validation_error", "invalid_idempotency_key"].includes(
      result.error.name
    );
    throw error;
  }

  return {
    sent: true,
    providerEmailId: result.data?.id || null,
  };
}
