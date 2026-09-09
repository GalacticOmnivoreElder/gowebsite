// @ts-check

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

export function parseBooleanEnv(value, fallback = false) {
  if (typeof value !== "string" || !value.trim()) return fallback;
  return TRUE_VALUES.has(value.trim().toLowerCase());
}

export function getProductConfig(env = process.env) {
  const runtimeDefaults = env === process.env;
  const featureFlags = {
    productNavigation: parseBooleanEnv(env.PRODUCT_NAVIGATION_ENABLED, true),
    courseEnrollment: parseBooleanEnv(env.COURSE_ENROLLMENT_ENABLED, false),
    userNotifications: parseBooleanEnv(env.USER_NOTIFICATIONS_ENABLED, false),
    videoBundles: parseBooleanEnv(env.VIDEO_BUNDLES_ENABLED, false),
    mentorDirectory: parseBooleanEnv(env.MENTOR_DIRECTORY_ENABLED, runtimeDefaults),
    mentorAvailability: parseBooleanEnv(env.MENTOR_AVAILABILITY_ENABLED, runtimeDefaults),
    communityAssetSubmissions: parseBooleanEnv(env.COMMUNITY_ASSET_SUBMISSIONS_ENABLED, env.NODE_ENV === "production"),
    under18Mentorship: parseBooleanEnv(env.UNDER_18_MENTORSHIP_ENABLED, false),
    individuallyPaidCourses: parseBooleanEnv(env.INDIVIDUALLY_PAID_COURSES_ENABLED, false),
  };

  return {
    featureFlags,
    mentorCheckoutEnabled: parseBooleanEnv(env.MENTOR_CHECKOUT_ENABLED, true),
  };
}

export function getSafeProductConfig(env = process.env) {
  const config = getProductConfig(env);
  return {
    featureFlags: config.featureFlags,
    mentorCheckoutEnabled: config.mentorCheckoutEnabled,
  };
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
  const requestReviewDays = Number.parseInt(env.MENTORSHIP_REQUEST_REVIEW_TARGET_WORKING_DAYS || "5", 10);
  const applicationResponseDays = Number.parseInt(env.MENTORSHIP_APPLICATION_RESPONSE_TARGET_WORKING_DAYS || "5", 10);
  const maxActiveRequests = Number.parseInt(env.MENTORSHIP_MAX_ACTIVE_REQUESTS_PER_USER || "1", 10);
  const maxActiveMentorships = Number.parseInt(env.MENTORSHIP_MAX_ACTIVE_MENTORSHIPS_PER_MENTOR || "2", 10);
  const suggestionsAllowed = Number.parseInt(env.MENTORSHIP_SUGGESTIONS_PER_REQUEST || "3", 10);
  const defaultDurationWeeks = Number.parseInt(env.MENTORSHIP_DEFAULT_DURATION_WEEKS || "8", 10);
  const checkInFrequencyDays = Number.parseInt(env.MENTORSHIP_CHECKIN_FREQUENCY_DAYS || "14", 10);
  return {
    responseDeadlineWorkingDays:
      Number.isInteger(responseDays) && responseDays >= 1 && responseDays <= 20
        ? responseDays
        : 5,
    requestReviewTargetWorkingDays:
      Number.isInteger(requestReviewDays) && requestReviewDays >= 1 && requestReviewDays <= 20
        ? requestReviewDays
        : 5,
    applicationResponseTargetWorkingDays:
      Number.isInteger(applicationResponseDays) && applicationResponseDays >= 1 && applicationResponseDays <= 20
        ? applicationResponseDays
        : 5,
    maxActiveRequestsPerUser:
      Number.isInteger(maxActiveRequests) && maxActiveRequests >= 1 && maxActiveRequests <= 5
        ? maxActiveRequests
        : 1,
    maxActiveMentorshipsPerMentor:
      Number.isInteger(maxActiveMentorships) && maxActiveMentorships >= 1 && maxActiveMentorships <= 20
        ? maxActiveMentorships
        : 2,
    suggestionsPerRequest:
      Number.isInteger(suggestionsAllowed) && suggestionsAllowed >= 1 && suggestionsAllowed <= 10
        ? suggestionsAllowed
        : 3,
    defaultDurationWeeks:
      Number.isInteger(defaultDurationWeeks) && defaultDurationWeeks >= 1 && defaultDurationWeeks <= 52
        ? defaultDurationWeeks
        : 8,
    checkInFrequencyDays:
      Number.isInteger(checkInFrequencyDays) && checkInFrequencyDays >= 7 && checkInFrequencyDays <= 90
        ? checkInFrequencyDays
        : 14,
    under18MentorshipEnabled: parseBooleanEnv(env.UNDER_18_MENTORSHIP_ENABLED, false),
  };
}

export function getMentorshipConfig(env = process.env) {
  const mentorship = getMentorshipProductConfig(env);
  return {
    ...mentorship,
    featureFlags: {
      mentorshipSystem: parseBooleanEnv(env.MENTORSHIP_SYSTEM_ENABLED, true),
      publicMentorBrowsing: parseBooleanEnv(env.MENTORSHIP_PUBLIC_MENTOR_BROWSING_ENABLED, true),
      mentorshipRequests: parseBooleanEnv(env.MENTORSHIP_REQUESTS_ENABLED, true),
      mentorApplications: parseBooleanEnv(env.MENTORSHIP_MENTOR_APPLICATIONS_ENABLED, true),
    },
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
