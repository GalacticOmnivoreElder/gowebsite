import { EMAIL_CATEGORIES, getEmailEventDefinition } from "../events";
import { absoluteSiteUrl, escapeHtml, firestoreDateToDate } from "../utils";
import { renderEmailLayout } from "./base";

function paragraph(value) {
  return `<p style="margin:0 0 16px;">${escapeHtml(value)}</p>`;
}

function formatDate(value) {
  const date = firestoreDateToDate(value);
  if (!date) return null;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "Europe/Skopje",
  }).format(date);
}

function formatMoney(amount, currency) {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return null;
  const normalizedAmount = Number.isInteger(numeric) ? numeric / 100 : numeric;
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: String(currency || "EUR").toUpperCase(),
    }).format(normalizedAmount);
  } catch {
    return `${normalizedAmount} ${String(currency || "").toUpperCase()}`.trim();
  }
}

function eventCopy(type, data) {
  const displayName = data.displayName || data.username || "Creator";
  const projectTitle = data.projectTitle || "your project";
  const projectUrl = absoluteSiteUrl(
    data.projectId ? `/project/${encodeURIComponent(data.projectId)}` : "/projects"
  );
  const billingUrl = absoluteSiteUrl("/billing");
  const profileUrl = absoluteSiteUrl("/onboarding");
  const endsAt = formatDate(data.endsAt || data.subscriptionEndsAt);
  const amount = formatMoney(data.amount, data.currency);
  const effectiveAt = formatDate(data.effectiveAt);
  const submittedAt = formatDate(data.submittedAt);

  switch (type) {
    case "account.welcome":
      return {
        subject: "Welcome to Galactic Omnivore",
        heading: `Welcome, ${displayName}`,
        preheader: "Your Galactic Omnivore account is ready.",
        body:
          paragraph(
            "Your account is ready. Complete your profile so project creators and collaborators can discover your work, skills, and experience."
          ) +
          paragraph(
            "You can browse public projects now and choose a membership whenever you are ready to apply or create a project."
          ),
        text: `Welcome to Galactic Omnivore, ${displayName}.\n\nYour account is ready. Complete your profile to share your work, skills, and experience.`,
        ctaLabel: "Complete your profile",
        ctaUrl: profileUrl,
      };
    case "onboarding.incomplete_reminder":
      return {
        subject: "Finish your Galactic Omnivore profile",
        heading: "Your profile is waiting",
        preheader: "Continue your Galactic Omnivore onboarding.",
        body: paragraph(
          "You started building your Galactic Omnivore profile but have not finished it yet. Continue where you left off."
        ),
        text: "Continue your Galactic Omnivore onboarding and finish your profile.",
        ctaLabel: "Continue onboarding",
        ctaUrl: profileUrl,
      };
    case "onboarding.completed":
      return {
        subject: "Your GO profile is complete",
        heading: "Profile complete",
        preheader: "Your profile details have been saved.",
        body: paragraph(
          "Your onboarding details are saved. You can now review, generate, and publish your GO CV."
        ),
        text: "Your onboarding details are saved. Review and publish your GO CV.",
        ctaLabel: "Review your CV",
        ctaUrl: absoluteSiteUrl("/cv"),
      };
    case "billing.membership_activated":
      return {
        subject: "Your Galactic Omnivore membership is active",
        heading: "Membership activated",
        preheader: "Your membership benefits are ready.",
        body:
          paragraph(
            `Your ${data.tier === "company" ? "GO Business" : "GO Community"} membership${data.interval ? ` (${data.interval})` : ""} is active${amount ? ` following a payment of ${amount}` : ""}.`
          ) +
          paragraph(
            data.tier === "company"
              ? "You can create projects, review applicants, access member resources, and build project teams."
              : "You can apply to open projects and access member resources and monthly packages."
          ),
        text: `Your ${data.tier || "GO"} membership is active${amount ? ` following a payment of ${amount}` : ""}.`,
        ctaLabel: "Complete your GO profile",
        ctaUrl: profileUrl,
      };
    case "billing.renewal_paid":
      return {
        subject: "Your GO membership has renewed",
        heading: "Membership renewed",
        preheader: "Your membership access continues.",
        body: paragraph(
          `Your Galactic Omnivore membership renewed successfully${amount ? ` for ${amount}` : ""}. You can review payment history and invoices in the billing portal.`
        ),
        text: `Your Galactic Omnivore membership renewed successfully${amount ? ` for ${amount}` : ""}.`,
        ctaLabel: "View billing",
        ctaUrl: billingUrl,
      };
    case "billing.plan_changed":
      return {
        subject: "Your GO membership plan changed",
        heading: "Membership updated",
        preheader: "Your membership plan has changed.",
        body: paragraph(
          `Your membership changed from ${data.previousTier || "your previous plan"} to ${data.tier || "your new plan"}${effectiveAt ? ` effective ${effectiveAt}` : ""}.`
        ),
        text: `Your GO membership changed from ${data.previousTier || "your previous plan"} to ${data.tier || "your new plan"}.`,
        ctaLabel: "Review membership",
        ctaUrl: billingUrl,
      };
    case "billing.payment_failed":
      return {
        subject: "Action needed: GO membership payment",
        heading: "Payment needs attention",
        preheader: "Update your billing details to keep your membership active.",
        body: paragraph(
          "A membership payment could not be completed. Your access remains available during the current grace period, but please review your billing details."
        ),
        text: "A GO membership payment could not be completed. Review your billing details.",
        ctaLabel: "Update billing",
        ctaUrl: billingUrl,
      };
    case "billing.renewal_reminder":
      return {
        subject: "Your GO membership renews soon",
        heading: "Upcoming membership renewal",
        preheader: "A reminder about your upcoming renewal.",
        body: paragraph(
          `Your membership is scheduled to renew${endsAt ? ` on ${endsAt}` : " soon"}.`
        ),
        text: `Your GO membership is scheduled to renew${endsAt ? ` on ${endsAt}` : " soon"}.`,
        ctaLabel: "Manage billing",
        ctaUrl: billingUrl,
      };
    case "billing.cancellation_scheduled":
      return {
        subject: "Your GO membership cancellation is scheduled",
        heading: "Cancellation confirmed",
        preheader: "Your membership will not renew.",
        body: paragraph(
          `Your membership will not renew. You will keep access${endsAt ? ` through ${endsAt}` : " until the end of your current billing period"}.`
        ),
        text: `Your membership will not renew. Access continues${endsAt ? ` through ${endsAt}` : " until the period ends"}.`,
        ctaLabel: "Review billing",
        ctaUrl: billingUrl,
      };
    case "billing.reactivated":
      return {
        subject: "Your GO membership is active again",
        heading: "Membership reactivated",
        preheader: "Automatic renewal has been restored.",
        body: paragraph(
          `Automatic renewal is active again${endsAt ? `, with the next billing period ending ${endsAt}` : ""}.`
        ),
        text: "Your GO membership and automatic renewal are active again.",
        ctaLabel: "Review billing",
        ctaUrl: billingUrl,
      };
    case "billing.access_expiring":
      return {
        subject: "Your GO membership access ends soon",
        heading: "Membership access ending",
        preheader: "Your current membership period is almost over.",
        body: paragraph(
          `Your membership access ends${endsAt ? ` on ${endsAt}` : " soon"}. You can choose a new plan at any time.`
        ),
        text: `Your GO membership access ends${endsAt ? ` on ${endsAt}` : " soon"}.`,
        ctaLabel: "View membership options",
        ctaUrl: absoluteSiteUrl("/membership"),
      };
    case "billing.access_revoked":
      return {
        subject: "Your GO membership access has ended",
        heading: "Membership access ended",
        preheader: "An update about your Galactic Omnivore membership.",
        body: paragraph(
          "Your membership access has ended. Member packages, project applications, and company project tools now require a new active membership."
        ),
        text: "Your Galactic Omnivore membership access has ended.",
        ctaLabel: "View membership options",
        ctaUrl: absoluteSiteUrl("/membership"),
      };
    case "billing.refund_processed":
      return {
        subject: "Your GO refund was processed",
        heading: "Refund processed",
        preheader: "Your refund status has been updated.",
        body: paragraph(
          `${data.isFullRefund ? "A full" : "A partial"} refund${amount ? ` of ${amount}` : ""} was processed.${data.isFullRefund ? " Membership access associated with the refunded purchase has ended." : " Your membership access is unchanged."}`
        ),
        text: `${data.isFullRefund ? "A full" : "A partial"} refund${amount ? ` of ${amount}` : ""} was processed.`,
        ctaLabel: "View billing",
        ctaUrl: billingUrl,
      };
    case "project.created":
      return {
        subject: `Project draft created: ${projectTitle}`,
        heading: "Project draft created",
        preheader: `${projectTitle} is saved as a draft.`,
        body: paragraph(
          `${projectTitle} has been created with status “${data.status || "draft"}”. It is not public until its stored status and visibility allow discovery.`
        ),
        text: `${projectTitle} has been created as ${data.status || "draft"}.`,
        ctaLabel: "Review project",
        ctaUrl: projectUrl,
      };
    case "project.status_changed":
      return {
        subject: `Project update: ${projectTitle}`,
        heading: "Project status changed",
        preheader: `${projectTitle} is now ${data.status || "updated"}.`,
        body:
          paragraph(
            `${projectTitle} is now “${data.status || "updated"}”.`
          ) +
          (data.adminNotes
            ? paragraph(`Moderator note: ${data.adminNotes}`)
            : ""),
        text: `${projectTitle} is now ${data.status || "updated"}.${data.adminNotes ? ` Moderator note: ${data.adminNotes}` : ""}`,
        ctaLabel: "View project",
        ctaUrl: projectUrl,
      };
    case "project.archived":
    case "project.restored": {
      const archived = type === "project.archived";
      return {
        subject: `${projectTitle} was ${archived ? "archived" : "restored"}`,
        heading: `Project ${archived ? "archived" : "restored"}`,
        preheader: `${projectTitle} was ${archived ? "archived" : "restored"}.`,
        body: paragraph(
          archived
            ? `${projectTitle} is archived and hidden from normal discovery.`
            : `${projectTitle} has been restored. Its visibility still depends on its current status and visibility settings.`
        ),
        text: `${projectTitle} was ${archived ? "archived" : "restored"}.`,
        ctaLabel: "View project",
        ctaUrl: projectUrl,
      };
    }
    case "project.deleted":
      return {
        subject: `Project removed: ${projectTitle}`,
        heading: "Project removed",
        preheader: `${projectTitle} has been removed.`,
        body: paragraph(
          `${projectTitle} has been deleted from Galactic Omnivore and is no longer available to its team or applicants.`
        ),
        text: `${projectTitle} has been deleted from Galactic Omnivore.`,
      };
    case "project.invitation":
      return {
        subject: `Invitation to join ${projectTitle}`,
        heading: "You have a project invitation",
        preheader: `You were invited to ${projectTitle}.`,
        body: paragraph(
          `You have been invited to view and join ${projectTitle}. Sign in to review the project and invitation.`
        ),
        text: `You were invited to ${projectTitle}.`,
        ctaLabel: "Review invitation",
        ctaUrl: projectUrl,
      };
    case "project.admin_role_changed":
      return {
        subject: `Project role updated: ${projectTitle}`,
        heading: "Your project role changed",
        preheader: `Your access to ${projectTitle} was updated.`,
        body: paragraph(
          `Project administrator access for ${projectTitle} was ${data.granted ? "granted" : "removed"}.`
        ),
        text: `Project administrator access for ${projectTitle} was ${data.granted ? "granted" : "removed"}.`,
        ctaLabel: "View project",
        ctaUrl: projectUrl,
      };
    case "project.member_removed":
    case "application.member_removed":
      return {
        subject: `Team membership update: ${projectTitle}`,
        heading: "Project membership changed",
        preheader: `You are no longer a member of ${projectTitle}.`,
        body: paragraph(
          `You are no longer listed as a team member of ${projectTitle}. Contact the project owner if you believe this was unexpected.`
        ),
        text: `You are no longer a team member of ${projectTitle}.`,
        ctaLabel: "View projects",
        ctaUrl: absoluteSiteUrl("/projects"),
      };
    case "application.submitted":
      return {
        subject: `Application submitted: ${projectTitle}`,
        heading: "Application submitted",
        preheader: `Your application to ${projectTitle} was received.`,
        body: paragraph(
          `Your application for ${data.roleAppliedFor || "a project role"} on ${projectTitle} was submitted successfully${submittedAt ? ` on ${submittedAt}` : ""}.`
        ),
        text: `Your application to ${projectTitle} was submitted successfully${submittedAt ? ` on ${submittedAt}` : ""}.`,
        ctaLabel: "View application",
        ctaUrl: absoluteSiteUrl("/profile?tab=applications"),
      };
    case "application.received":
      return {
        subject: `New application for ${projectTitle}`,
        heading: "New project application",
        preheader: `${data.applicantName || "A creator"} applied to ${projectTitle}.`,
        body: paragraph(
          `${data.applicantName || "A creator"} applied for ${data.roleAppliedFor || "a role"} on ${projectTitle}. Review the application securely in Galactic Omnivore.`
        ),
        text: `${data.applicantName || "A creator"} applied to ${projectTitle}.`,
        ctaLabel: "Review application",
        ctaUrl: projectUrl,
      };
    case "application.approved":
      return {
        subject: `Application approved: ${projectTitle}`,
        heading: "Your application was approved",
        preheader: `Welcome to the ${projectTitle} team.`,
        body: paragraph(
          `Your application to ${projectTitle} was approved. You are now listed as a project team member.`
        ),
        text: `Your application to ${projectTitle} was approved.`,
        ctaLabel: "Open project",
        ctaUrl: projectUrl,
      };
    case "application.rejected":
      return {
        subject: `Application update: ${projectTitle}`,
        heading: "Application decision",
        preheader: `There is an update to your ${projectTitle} application.`,
        body: paragraph(
          `Your application to ${projectTitle} was not selected. Thank you for taking the time to apply.`
        ),
        text: `Your application to ${projectTitle} was not selected.`,
        ctaLabel: "Browse projects",
        ctaUrl: absoluteSiteUrl("/projects"),
      };
    case "application.cancelled":
      return {
        subject: `Application withdrawn: ${projectTitle}`,
        heading: "Application withdrawn",
        preheader: `An application to ${projectTitle} was withdrawn.`,
        body: paragraph(
          `${data.applicantName || "An applicant"} withdrew their application to ${projectTitle}.`
        ),
        text: `${data.applicantName || "An applicant"} withdrew their application to ${projectTitle}.`,
        ctaLabel: "View project",
        ctaUrl: projectUrl,
      };
    case "package.published":
      return {
        subject: `New member package: ${data.packageTitle || "Monthly resources"}`,
        heading: "A new member package is available",
        preheader: `${data.packageTitle || "A new package"} is ready to download.`,
        body: paragraph(
          data.description ||
            `${data.packageTitle || "A new monthly package"} is now available to active Galactic Omnivore members.`
        ),
        text: `${data.packageTitle || "A new monthly package"} is now available.`,
        ctaLabel: "View package",
        ctaUrl: absoluteSiteUrl(
          data.slug
            ? `/packages/${encodeURIComponent(data.slug)}`
            : "/resources"
        ),
      };
    case "newsletter.confirm":
      return {
        subject: "Confirm your Galactic Omnivore newsletter signup",
        heading: "Confirm your newsletter signup",
        preheader: "One click confirms your newsletter subscription.",
        body: paragraph(
          "You requested news, community updates, and opportunities from Galactic Omnivore. Confirm your address to complete the subscription."
        ),
        text: `Confirm your Galactic Omnivore newsletter signup: ${data.confirmationUrl}`,
        ctaLabel: "Confirm subscription",
        ctaUrl: data.confirmationUrl,
      };
    case "newsletter.campaign":
      return {
        subject: data.subject || "News from Galactic Omnivore",
        heading: data.heading || "Galactic Omnivore newsletter",
        preheader: data.preheader || "Community news and opportunities.",
        body: paragraph(data.body || ""),
        text: data.text || data.body || "",
        ctaLabel: data.ctaLabel,
        ctaUrl: data.ctaUrl,
        marketing: true,
        preferencesUrl: data.preferencesUrl,
        unsubscribeUrl: data.unsubscribeUrl,
      };
    case "admin.project_review_required":
      return {
        subject: `Project review required: ${projectTitle}`,
        heading: "Project review required",
        preheader: `${projectTitle} entered the moderation queue.`,
        body: paragraph(
          `${projectTitle}, owned by ${data.ownerName || "a creator"}, is ready for administrative review.`
        ),
        text: `${projectTitle} is ready for administrative review.`,
        ctaLabel: "Open admin projects",
        ctaUrl: absoluteSiteUrl("/admin/projects"),
      };
    case "admin.membership_activated":
    case "admin.subscription_cancelled":
    case "admin.refund_processed":
    case "admin.payment_failure":
    case "admin.email_failure_digest":
      return {
        subject: data.subject || `Admin notification: ${type}`,
        heading: data.heading || "Galactic Omnivore admin notification",
        preheader: data.preheader || "An administrative event needs review.",
        body: paragraph(data.message || `Event received: ${type}`),
        text: data.message || `Event received: ${type}`,
        ctaLabel: data.ctaLabel || "Open admin",
        ctaUrl: data.ctaUrl || absoluteSiteUrl("/admin/dashboard"),
      };
    case "admin.onboarding_note":
      return {
        subject: `Onboarding note: ${data.subject || "No subject"}`,
        heading: "Onboarding note",
        preheader: "A Galactic Omnivore onboarding note.",
        body:
          paragraph(`Name: ${data.name || "Unknown"}`) +
          paragraph(`Contact email: ${data.contactEmail || "Not provided"}`) +
          paragraph(data.message || ""),
        text: `Name: ${data.name || "Unknown"}\nContact email: ${data.contactEmail || "Not provided"}\n\n${data.message || ""}`,
      };
    default:
      throw new Error(`No email template for event: ${type}`);
  }
}

export function renderEmailEventTemplate(type, data = {}) {
  const copy = eventCopy(type, data);
  const { category } = getEmailEventDefinition(type);
  const marketing =
    copy.marketing || category === EMAIL_CATEGORIES.MARKETING;

  return {
    subject: copy.subject,
    text: `${copy.text}\n\n${copy.ctaLabel && copy.ctaUrl ? `${copy.ctaLabel}: ${copy.ctaUrl}\n\n` : ""}Galactic Omnivore\n${absoluteSiteUrl("/contact")}`,
    html: renderEmailLayout({
      ...copy,
      marketing,
      preferencesUrl: copy.preferencesUrl,
      unsubscribeUrl: copy.unsubscribeUrl,
    }),
  };
}
