const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export const NEWSLETTER_FORM_MESSAGES = Object.freeze({
  invalidEmail: "Enter a valid email address.",
  missingConsent:
    "Please confirm that you agree to receive email updates.",
  loading: "Subscribing…",
  success:
    "Your request was accepted. Check your email to confirm and join the Galactic Omnivore mailing list.",
  genericError:
    "We could not complete the subscription. Please try again.",
});

export function validateNewsletterSubmission({ email, consent }) {
  const normalizedEmail =
    typeof email === "string" ? email.trim() : "";

  return {
    email: normalizedEmail,
    emailError: EMAIL_PATTERN.test(normalizedEmail)
      ? ""
      : NEWSLETTER_FORM_MESSAGES.invalidEmail,
    consentError:
      consent === true ? "" : NEWSLETTER_FORM_MESSAGES.missingConsent,
  };
}
