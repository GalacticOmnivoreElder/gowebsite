import { EMAIL_EVENTS } from "../events";

const base = Object.freeze({
  displayName: "Ada Creator",
  firstName: "Ada",
  projectId: "demo-project",
  projectTitle: "Nebula Garden",
  status: "hiring",
  applicantName: "Demo Applicant",
  roleAppliedFor: "Programmer",
  tier: "member",
  previousTier: "member",
  interval: "year",
  amount: 4900,
  currency: "eur",
  activationDate: new Date("2030-07-15T12:00:00.000Z"),
  nextRenewalDate: new Date("2030-08-15T12:00:00.000Z"),
  endsAt: new Date("2030-08-15T12:00:00.000Z"),
  packageId: "demo-package",
  packageTitle: "Pixel Worlds",
  slug: "pixel-worlds",
  description: "A fictional package used only for template previews.",
});

/**
 * Fake-only preview payloads. A preview script can render any registered event
 * without copying production users, CVs, payment payloads, or action tokens.
 */
export const EMAIL_TEMPLATE_FIXTURES = Object.freeze(
  Object.fromEntries(
    Object.keys(EMAIL_EVENTS).map((eventType) => [
      eventType,
      {
        ...base,
        ...(eventType === "newsletter.confirm"
          ? {
              confirmationUrl:
                "https://example.invalid/newsletter/confirm/demo-token",
            }
          : {}),
        ...(eventType === "merch.confirm"
          ? { requestId: "a".repeat(64), version: "fixture-version", manageVersion: "fixture-manage", expires: Date.now() + 48 * 60 * 60 * 1000, confirmationUrl: "https://example.invalid/merch/confirm#token=fake", manageUrl: "https://example.invalid/merch/manage#token=fake" }
          : {}),
        ...(eventType === "merch.available"
          ? { requestId: "a".repeat(64), manageVersion: "fixture-manage", manageUrl: "https://example.invalid/merch/manage#token=fake", productName: "GO T-shirt", batch: { details: "Demo price and order instructions; this is fictional sample content only." } }
          : {}),
        ...(eventType === "newsletter.campaign"
          ? {
              subject: "Demo Galactic Omnivore newsletter",
              heading: "A fictional newsletter preview",
              body: "This is fake preview content and is never sent to a real user.",
              preferencesUrl:
                "https://example.invalid/newsletter/preferences/demo",
              unsubscribeUrl:
                "https://example.invalid/newsletter/unsubscribe/demo",
            }
          : {}),
        ...(eventType.startsWith("admin.")
          ? {
              subject: "Demo admin notification",
              heading: "Demo admin event",
              message: "A fictional operational event used for previewing.",
            }
          : {}),
      },
    ])
  )
);
