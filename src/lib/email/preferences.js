import { EMAIL_CATEGORIES, getEmailEventDefinition } from "./events";

export function getEmailPreferenceDecision({
  eventType,
  userData = {},
  newsletterSubscriber = null,
  emailSuppression = null,
}) {
  const { category } = getEmailEventDefinition(eventType);
  const settings = userData?.settings || {};
  const isHardSuppressed = ["bounced", "complained", "suppressed"].includes(
    emailSuppression?.status
  );

  switch (category) {
    case EMAIL_CATEGORIES.ESSENTIAL:
    case EMAIL_CATEGORIES.ADMIN:
      return { allowed: true, category };
    case EMAIL_CATEGORIES.PRODUCT:
      return {
        allowed: !isHardSuppressed && settings.emailNotifications !== false,
        category,
        reason:
          isHardSuppressed
            ? "address_suppressed"
            : settings.emailNotifications === false
            ? "product_notifications_disabled"
            : null,
      };
    case EMAIL_CATEGORIES.SUBSCRIPTION_REMINDER:
      return {
        allowed: !isHardSuppressed && settings.subscriptionReminders !== false,
        category,
        reason:
          isHardSuppressed
            ? "address_suppressed"
            : settings.subscriptionReminders === false
            ? "subscription_reminders_disabled"
            : null,
      };
    case EMAIL_CATEGORIES.PACKAGE:
      return {
        allowed: !isHardSuppressed && settings.newPackageAlerts !== false,
        category,
        reason:
          isHardSuppressed
            ? "address_suppressed"
            : settings.newPackageAlerts === false
            ? "package_alerts_disabled"
            : null,
      };
    case EMAIL_CATEGORIES.MARKETING: {
      const hasNewsletterConsent =
        newsletterSubscriber?.status === "subscribed";
      const hasAccountConsent = settings.marketingEmails === true;
      return {
        allowed:
          !isHardSuppressed && (hasNewsletterConsent || hasAccountConsent),
        category,
        reason:
          isHardSuppressed
            ? "address_suppressed"
            : hasNewsletterConsent || hasAccountConsent
            ? null
            : "marketing_consent_missing",
      };
    }
    default:
      return { allowed: false, category, reason: "unknown_category" };
  }
}

export function isEssentialEmailEvent(eventType) {
  return (
    getEmailEventDefinition(eventType).category === EMAIL_CATEGORIES.ESSENTIAL
  );
}
