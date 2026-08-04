// @ts-check

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

export const MENTOR_APPLICATIONS_CLOSED_MESSAGE =
  "Mentor applications are currently closed. The application form will become available when the next mentor intake opens.";

export function parseBooleanEnv(value, fallback = false) {
  if (typeof value !== "string" || !value.trim()) return fallback;
  return TRUE_VALUES.has(value.trim().toLowerCase());
}

export function isValidHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function getProductConfig(env = process.env) {
  const mentorApplicationUrl = String(env.MENTOR_APPLICATION_URL || "").trim();
  const featureFlags = {
    productNavigation: parseBooleanEnv(env.PRODUCT_NAVIGATION_ENABLED, true),
    courseEnrollment: parseBooleanEnv(env.COURSE_ENROLLMENT_ENABLED, false),
    userNotifications: parseBooleanEnv(env.USER_NOTIFICATIONS_ENABLED, false),
    videoBundles: parseBooleanEnv(env.VIDEO_BUNDLES_ENABLED, false),
    mentorApplications: parseBooleanEnv(env.MENTOR_APPLICATIONS_OPEN, false),
    mentorDirectory: parseBooleanEnv(env.MENTOR_DIRECTORY_ENABLED, false),
    mentorAvailability: parseBooleanEnv(env.MENTOR_AVAILABILITY_ENABLED, false),
    mentorMatchmaking: parseBooleanEnv(env.MENTOR_MATCHMAKING_ENABLED, false),
    mentorFeedback: parseBooleanEnv(env.MENTOR_FEEDBACK_ENABLED, false),
    publicMentorStrengths: parseBooleanEnv(env.PUBLIC_MENTOR_STRENGTHS_ENABLED, false),
    communityAssetSubmissions: parseBooleanEnv(env.COMMUNITY_ASSET_SUBMISSIONS_ENABLED, false),
    under18Mentorship: parseBooleanEnv(env.UNDER_18_MENTORSHIP_ENABLED, false),
    individuallyPaidCourses: parseBooleanEnv(env.INDIVIDUALLY_PAID_COURSES_ENABLED, false),
  };

  return {
    featureFlags,
    mentorApplicationUrl,
    mentorApplicationsConfigured:
      featureFlags.mentorApplications && isValidHttpsUrl(mentorApplicationUrl),
    mentorCheckoutEnabled: parseBooleanEnv(env.MENTOR_CHECKOUT_ENABLED, false),
  };
}

export function getSafeProductConfig(env = process.env) {
  const config = getProductConfig(env);
  return {
    featureFlags: config.featureFlags,
    mentorApplicationsConfigured: config.mentorApplicationsConfigured,
    mentorCheckoutEnabled: config.mentorCheckoutEnabled,
  };
}

export function areMentorApplicationsOpen(config, settings = {}) {
  return (
    config.mentorApplicationsConfigured === true &&
    settings.mentorApplicationsOpen === true
  );
}

export function getLearningProductConfig(env = process.env) {
  const waitlistHours = Number.parseInt(env.WAITLIST_CONFIRMATION_HOURS || "48", 10);
  return {
    defaultTimeZone: String(env.DEFAULT_PLATFORM_TIMEZONE || "Europe/Skopje").trim() || "Europe/Skopje",
    waitlistConfirmationHours:
      Number.isInteger(waitlistHours) && waitlistHours >= 1 && waitlistHours <= 168
        ? waitlistHours
        : 48,
  };
}

export function getMentorshipProductConfig(env = process.env) {
  const responseDays = Number.parseInt(env.MENTOR_RESPONSE_DEADLINE_WORKING_DAYS || "5", 10);
  return {
    responseDeadlineWorkingDays:
      Number.isInteger(responseDays) && responseDays >= 1 && responseDays <= 20
        ? responseDays
        : 5,
  };
}

export function getMentorshipFeedbackConfig(env = process.env) {
  const deadlineDays = Number.parseInt(env.MENTOR_FEEDBACK_DEADLINE_DAYS || "14", 10);
  return {
    feedbackDeadlineDays:
      Number.isInteger(deadlineDays) && deadlineDays >= 1 && deadlineDays <= 90
        ? deadlineDays
        : 14,
  };
}
