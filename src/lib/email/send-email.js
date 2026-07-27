import { getResend } from "@/lib/resend";
import { renderEmailEventTemplate } from "./templates/events";
import {
  absoluteSiteUrl,
  createNewsletterConfirmationToken,
  normalizeEmail,
  sanitizeTag,
} from "./utils";

function environmentName() {
  return process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
}

function isProductionDelivery() {
  return (
    process.env.VERCEL_ENV === "production" ||
    process.env.EMAIL_PRODUCTION_DELIVERY === "true"
  );
}

function sendingDisabled() {
  if (process.env.EMAIL_DISABLE_SEND === "true") return true;
  return (
    !isProductionDelivery() &&
    !normalizeEmail(process.env.EMAIL_TEST_RECIPIENT)
  );
}

function senderForCategory(category) {
  const key =
    category === "marketing"
      ? "EMAIL_FROM_MARKETING"
      : "EMAIL_FROM_TRANSACTIONAL";
  const sender = process.env[key];
  if (!sender && isProductionDelivery()) {
    throw new Error(`${key} is not configured`);
  }
  return sender || "Galactic Omnivore <disabled@example.invalid>";
}

export async function sendEmailJob(job) {
  const recipient = normalizeEmail(job.recipient);
  if (!recipient) {
    const error = new Error("Invalid email recipient");
    error.code = "invalid_recipient";
    error.permanent = true;
    throw error;
  }

  let templateData = job.templateData || {};
  if (job.eventType === "newsletter.confirm") {
    const confirmationToken = createNewsletterConfirmationToken(
      templateData.subscriberId,
      templateData.confirmationVersion
    );
    templateData = {
      ...templateData,
      confirmationUrl: absoluteSiteUrl(
        `/api/newsletter/confirm?token=${encodeURIComponent(confirmationToken)}&subscriber=${encodeURIComponent(templateData.subscriberId)}`
      ),
    };
  }
  if (
    job.category === "marketing" &&
    (!templateData.preferencesUrl || !templateData.unsubscribeUrl)
  ) {
    const error = new Error(
      "Marketing email requires preference and unsubscribe URLs"
    );
    error.code = "invalid_marketing_links";
    error.permanent = true;
    throw error;
  }
  if (
    job.category === "marketing" &&
    isProductionDelivery() &&
    !process.env.EMAIL_MARKETING_ADDRESS
  ) {
    const error = new Error("EMAIL_MARKETING_ADDRESS is not configured");
    error.code = "missing_marketing_address";
    error.permanent = true;
    throw error;
  }

  const template = renderEmailEventTemplate(job.eventType, templateData);
  const testRecipient = normalizeEmail(process.env.EMAIL_TEST_RECIPIENT);
  const env = environmentName();

  if (sendingDisabled()) {
    return {
      status: "suppressed",
      reason: "sending_disabled",
      providerEmailId: null,
    };
  }

  const production = isProductionDelivery();
  const actualRecipient = production ? recipient : testRecipient;
  const subject =
    production
      ? template.subject
      : `[${env}] ${template.subject}`;
  const result = await getResend().emails.send(
    {
      from: senderForCategory(job.category),
      to: actualRecipient,
      replyTo: process.env.EMAIL_REPLY_TO || undefined,
      subject,
      html: template.html,
      text: template.text,
      tags: [
        { name: "environment", value: sanitizeTag(env) },
        { name: "category", value: sanitizeTag(job.category) },
        { name: "event", value: sanitizeTag(job.eventType) },
        ...(job.userId
          ? [{ name: "user_id", value: sanitizeTag(job.userId) }]
          : []),
        ...(job.templateData?.projectId
          ? [
              {
                name: "project_id",
                value: sanitizeTag(job.templateData.projectId),
              },
            ]
          : []),
        ...(job.templateData?.campaignId
          ? [
              {
                name: "campaign_id",
                value: sanitizeTag(job.templateData.campaignId),
              },
            ]
          : []),
      ],
      ...(job.category === "marketing"
        ? {
            headers: {
              "List-Unsubscribe": `<${templateData.unsubscribeUrl}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          }
        : {}),
    },
    { idempotencyKey: job.idempotencyKey }
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
    status: "sent",
    providerEmailId: result.data?.id || null,
  };
}
