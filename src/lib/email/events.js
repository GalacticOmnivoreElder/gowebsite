export const EMAIL_CATEGORIES = Object.freeze({
  ESSENTIAL: "essential",
  PRODUCT: "product",
  SUBSCRIPTION_REMINDER: "subscription_reminder",
  PACKAGE: "package",
  MARKETING: "marketing",
  ADMIN: "admin",
});

export const EMAIL_EVENTS = Object.freeze({
  "account.welcome": { category: EMAIL_CATEGORIES.ESSENTIAL },
  "onboarding.incomplete_reminder": {
    category: EMAIL_CATEGORIES.PRODUCT,
  },
  "onboarding.completed": { category: EMAIL_CATEGORIES.PRODUCT },

  "billing.membership_activated": {
    category: EMAIL_CATEGORIES.ESSENTIAL,
  },
  "billing.renewal_paid": { category: EMAIL_CATEGORIES.ESSENTIAL },
  "billing.plan_changed": { category: EMAIL_CATEGORIES.ESSENTIAL },
  "billing.payment_failed": { category: EMAIL_CATEGORIES.ESSENTIAL },
  "billing.renewal_reminder": {
    category: EMAIL_CATEGORIES.SUBSCRIPTION_REMINDER,
  },
  "billing.cancellation_scheduled": {
    category: EMAIL_CATEGORIES.ESSENTIAL,
  },
  "billing.reactivated": { category: EMAIL_CATEGORIES.ESSENTIAL },
  "billing.access_expiring": {
    category: EMAIL_CATEGORIES.SUBSCRIPTION_REMINDER,
  },
  "billing.access_revoked": { category: EMAIL_CATEGORIES.ESSENTIAL },
  "billing.refund_processed": { category: EMAIL_CATEGORIES.ESSENTIAL },

  "project.created": { category: EMAIL_CATEGORIES.PRODUCT },
  "project.status_changed": { category: EMAIL_CATEGORIES.PRODUCT },
  "project.archived": { category: EMAIL_CATEGORIES.PRODUCT },
  "project.restored": { category: EMAIL_CATEGORIES.PRODUCT },
  "project.deleted": { category: EMAIL_CATEGORIES.PRODUCT },
  "project.invitation": { category: EMAIL_CATEGORIES.PRODUCT },
  "project.admin_role_changed": { category: EMAIL_CATEGORIES.PRODUCT },
  "project.member_removed": { category: EMAIL_CATEGORIES.PRODUCT },

  "application.submitted": { category: EMAIL_CATEGORIES.PRODUCT },
  "application.received": { category: EMAIL_CATEGORIES.PRODUCT },
  "application.approved": { category: EMAIL_CATEGORIES.PRODUCT },
  "application.rejected": { category: EMAIL_CATEGORIES.PRODUCT },
  "application.cancelled": { category: EMAIL_CATEGORIES.PRODUCT },
  "application.member_removed": { category: EMAIL_CATEGORIES.PRODUCT },

  "package.published": { category: EMAIL_CATEGORIES.PACKAGE },
  "newsletter.confirm": { category: EMAIL_CATEGORIES.ESSENTIAL },
  "newsletter.campaign": { category: EMAIL_CATEGORIES.MARKETING },

  "admin.project_review_required": { category: EMAIL_CATEGORIES.ADMIN },
  "admin.membership_activated": { category: EMAIL_CATEGORIES.ADMIN },
  "admin.subscription_cancelled": { category: EMAIL_CATEGORIES.ADMIN },
  "admin.refund_processed": { category: EMAIL_CATEGORIES.ADMIN },
  "admin.payment_failure": { category: EMAIL_CATEGORIES.ADMIN },
  "admin.email_failure_digest": { category: EMAIL_CATEGORIES.ADMIN },
  "admin.onboarding_note": { category: EMAIL_CATEGORIES.ADMIN },
});

export function getEmailEventDefinition(type) {
  const definition = EMAIL_EVENTS[type];
  if (!definition) {
    throw new Error(`Unsupported email event: ${String(type || "")}`);
  }
  return definition;
}

export function validateEmailEvent(event) {
  if (!event || typeof event !== "object") {
    throw new Error("Email event is required");
  }
  if (typeof event.type !== "string" || !event.type.trim()) {
    throw new Error("Email event type is required");
  }
  if (typeof event.eventId !== "string" || !event.eventId.trim()) {
    throw new Error("Email eventId is required");
  }
  if (typeof event.recipient !== "string" || !event.recipient.trim()) {
    throw new Error("Email recipient is required");
  }

  const definition = getEmailEventDefinition(event.type);
  const data =
    event.data && typeof event.data === "object" && !Array.isArray(event.data)
      ? event.data
      : {};
  let serialized;
  try {
    serialized = JSON.stringify(data);
  } catch {
    throw new Error("Email template data must be serializable");
  }
  if (serialized.length > 50_000) {
    throw new Error("Email template data is too large");
  }
  const forbiddenKey = Object.keys(data).find((key) =>
    /password|card|cvSnapshot|confirmationToken|rawPayload/i.test(key)
  );
  if (forbiddenKey) {
    throw new Error(`Sensitive email template field is not allowed: ${forbiddenKey}`);
  }
  if (
    event.scheduledFor !== undefined &&
    (!(event.scheduledFor instanceof Date) ||
      Number.isNaN(event.scheduledFor.getTime()))
  ) {
    throw new Error("Email scheduledFor must be a valid Date");
  }
  return {
    ...event,
    type: event.type.trim(),
    eventId: event.eventId.trim(),
    category: definition.category,
    data,
  };
}
