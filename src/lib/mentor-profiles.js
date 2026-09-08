// @ts-check

export const MENTOR_STATUSES = Object.freeze([
  "none",
  "applicant",
  "approved",
  "temporarily_unavailable",
  "suspended",
  "inactive",
  "rejected",
]);

export const MENTOR_FORMATS = Object.freeze(["online", "gohq", "hybrid"]);
export const MENTOR_LEVELS = Object.freeze([
  "beginner",
  "intermediate",
  "advanced",
  "professional",
  "all_levels",
]);
export const MENTORING_MODES = Object.freeze(["individual", "group"]);
export const AVAILABILITY_STATUSES = Object.freeze(["accepting", "limited", "unavailable"]);

function validationError(message) {
  return Object.assign(new Error(message), { code: "validation_error" });
}

function text(value, max = 5000) {
  return String(value || "").trim().slice(0, max);
}

function stringArray(value, maxItems = 50, maxLength = 120) {
  return Array.isArray(value)
    ? [...new Set(value.map((item) => text(item, maxLength)).filter(Boolean))].slice(0, maxItems)
    : [];
}

function enumArray(value, allowed) {
  return stringArray(value).filter((item) => allowed.includes(item));
}

function httpsUrl(value, label, optional = true) {
  const clean = text(value, 2000);
  if (!clean && optional) return null;
  try {
    const url = new URL(clean);
    if (url.protocol !== "https:") throw new Error();
    return url.toString();
  } catch {
    throw validationError(`${label} must be a valid HTTPS URL`);
  }
}

function validTimeZone(value) {
  const zone = text(value, 100) || "Europe/Skopje";
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone }).format();
    return zone;
  } catch {
    throw validationError("Time zone is not recognized");
  }
}

function preferredArray(...values) {
  return values.find((value) => Array.isArray(value) && value.length > 0) || [];
}

function positiveInteger(...values) {
  const value = values.find((item) => Number.isFinite(Number(item)) && Number(item) > 0);
  return Math.max(1, Math.floor(Number(value) || 1));
}

function nonNegativeInteger(...values) {
  const value = values.find((item) => Number.isFinite(Number(item)) && Number(item) >= 0);
  return Math.max(0, Math.floor(Number(value) || 0));
}

function validClock(value, label) {
  const clock = text(value, 5);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(clock)) {
    throw validationError(`${label} must use 24-hour HH:mm format`);
  }
  return clock;
}

function portfolioLinks(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).map((link, index) => ({
    label: text(link?.label, 100) || `Portfolio ${index + 1}`,
    url: httpsUrl(link?.url, `Portfolio link ${index + 1}`, false),
  }));
}

export function cleanMentorProfile(input = {}) {
  return {
    displayName: text(input.displayName, 160),
    profileImage: httpsUrl(input.profileImage, "Profile image"),
    professionalHeadline: text(input.professionalHeadline || input.headline, 180),
    biography: text(input.biography, 8000),
    disciplines: stringArray(preferredArray(input.disciplines, input.supportedDisciplines, input.areasOfExpertise), 30, 100),
    skills: stringArray(preferredArray(input.skills, input.toolsAndTechnologies, input.areasOfExpertise), 60, 100),
    supportedStudentLevels: enumArray(preferredArray(input.supportedStudentLevels, input.preferredMenteeLevels), MENTOR_LEVELS),
    languages: stringArray(input.languages, 20, 80),
    mentorshipFormats: enumArray(preferredArray(input.mentorshipFormats, input.availableFormats), MENTOR_FORMATS),
    locationPreference: MENTOR_FORMATS.includes(input.locationPreference)
      ? input.locationPreference
      : "online",
    timeZone: validTimeZone(input.timeZone),
    portfolioLinks: portfolioLinks(preferredArray(input.portfolioLinks, input.evidenceLinks)),
    mentorshipTopics: stringArray(input.mentorshipTopics, 30, 120),
    relatedLearningSlugs: stringArray(input.relatedLearningSlugs, 30, 160),
    relatedVideoBundleSlugs: stringArray(input.relatedVideoBundleSlugs, 30, 160),
    availabilitySummary: AVAILABILITY_STATUSES.includes(input.availabilitySummary)
      ? input.availabilitySummary
      : "unavailable",
    currentlyAcceptingStudents: input.currentlyAcceptingStudents === true,
    maximumActiveStudents: Math.min(100, positiveInteger(input.maximumActiveStudents, input.maximumActiveMentees)),
  };
}

/**
 * Read both mentor profile shapes that have existed in the platform. Canonical
 * fields win when they contain data, while pilot application fields remain a
 * fallback for records created before the public profile editor was available.
 */
export function normalizeMentorProfile(profile = {}) {
  const maximumActiveStudents = Math.min(
    100,
    positiveInteger(profile.maximumActiveStudents, profile.maximumActiveMentees)
  );
  const canonicalActiveEngagementCount = nonNegativeInteger(
    profile.canonicalActiveEngagementCount,
    profile.activeEngagementCount
  );
  const activeEngagementCount =
    nonNegativeInteger(profile.pilotActiveEngagementCount) +
    canonicalActiveEngagementCount;
  const availableSlots = Math.max(0, maximumActiveStudents - activeEngagementCount);
  const currentlyAcceptingStudents =
    profile.currentlyAcceptingStudents === true &&
    profile.temporaryPause !== true &&
    availableSlots > 0;
  const requestedAvailability = AVAILABILITY_STATUSES.includes(profile.availabilitySummary)
    ? profile.availabilitySummary
    : profile.availabilityStatus === "limited"
      ? "limited"
      : currentlyAcceptingStudents
        ? "accepting"
        : "unavailable";

  return {
    ...profile,
    displayName: text(profile.displayName, 160),
    profileImage: profile.profileImage || null,
    professionalHeadline: text(profile.professionalHeadline || profile.headline, 180),
    biography: text(profile.biography, 8000),
    disciplines: stringArray(
      preferredArray(profile.disciplines, profile.supportedDisciplines, profile.areasOfExpertise),
      30,
      100
    ),
    skills: stringArray(
      preferredArray(profile.skills, profile.toolsAndTechnologies, profile.areasOfExpertise),
      60,
      100
    ),
    supportedStudentLevels: enumArray(
      preferredArray(profile.supportedStudentLevels, profile.preferredMenteeLevels),
      MENTOR_LEVELS
    ),
    languages: stringArray(profile.languages, 20, 80),
    mentorshipFormats: enumArray(
      preferredArray(profile.mentorshipFormats, profile.availableFormats),
      MENTOR_FORMATS
    ),
    locationPreference: MENTOR_FORMATS.includes(profile.locationPreference)
      ? profile.locationPreference
      : preferredArray(profile.mentorshipFormats, profile.availableFormats)[0] || "online",
    timeZone: text(profile.timeZone, 100) || "Europe/Skopje",
    portfolioLinks: preferredArray(profile.portfolioLinks, profile.evidenceLinks),
    mentorshipTopics: stringArray(profile.mentorshipTopics, 30, 120),
    relatedLearningSlugs: stringArray(profile.relatedLearningSlugs, 30, 160),
    relatedVideoBundleSlugs: stringArray(profile.relatedVideoBundleSlugs, 30, 160),
    availabilitySummary: currentlyAcceptingStudents ? requestedAvailability : "unavailable",
    currentlyAcceptingStudents,
    maximumActiveStudents,
    canonicalActiveEngagementCount,
    activeEngagementCount,
    availableSlots,
  };
}

export function canonicalMentorProfileFields(profile = {}) {
  const normalized = normalizeMentorProfile(profile);
  return {
    displayName: normalized.displayName,
    profileImage: normalized.profileImage,
    professionalHeadline: normalized.professionalHeadline,
    biography: normalized.biography,
    disciplines: normalized.disciplines,
    skills: normalized.skills,
    supportedStudentLevels: normalized.supportedStudentLevels,
    languages: normalized.languages,
    mentorshipFormats: normalized.mentorshipFormats,
    locationPreference: normalized.locationPreference,
    timeZone: normalized.timeZone,
    portfolioLinks: normalized.portfolioLinks,
    mentorshipTopics: normalized.mentorshipTopics,
    relatedLearningSlugs: normalized.relatedLearningSlugs,
    relatedVideoBundleSlugs: normalized.relatedVideoBundleSlugs,
    availabilitySummary: normalized.availabilitySummary,
    currentlyAcceptingStudents: normalized.currentlyAcceptingStudents,
    maximumActiveStudents: normalized.maximumActiveStudents,
  };
}

export function getMentorCapacity(profile = {}) {
  const normalized = normalizeMentorProfile(profile);
  return {
    maximum: normalized.maximumActiveStudents,
    active: normalized.activeEngagementCount,
    availableSlots: normalized.availableSlots,
    accepting:
      normalized.currentlyAcceptingStudents === true &&
      normalized.availabilitySummary !== "unavailable" &&
      normalized.availableSlots > 0,
  };
}

export function isMentorProfileComplete(profile = {}) {
  const normalized = normalizeMentorProfile(profile);
  return Boolean(
    normalized.displayName &&
    normalized.biography &&
    normalized.disciplines?.length &&
    normalized.skills?.length &&
    normalized.supportedStudentLevels?.length &&
    normalized.languages?.length &&
    normalized.mentorshipFormats?.length
  );
}

export function cleanMentorAvailability(input = {}) {
  const recurringWindows = Array.isArray(input.recurringWindows)
    ? input.recurringWindows.slice(0, 30).map((window, index) => {
        const dayOfWeek = Number(window?.dayOfWeek);
        if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
          throw validationError(`Recurring window ${index + 1} needs a valid weekday`);
        }
        const startsAt = validClock(window?.startsAt, `Recurring window ${index + 1} start`);
        const endsAt = validClock(window?.endsAt, `Recurring window ${index + 1} end`);
        if (startsAt >= endsAt) throw validationError(`Recurring window ${index + 1} must end after it starts`);
        return {
          dayOfWeek,
          startsAt,
          endsAt,
          formats: enumArray(window?.formats, MENTOR_FORMATS),
        };
      })
    : [];

  const individualDates = Array.isArray(input.individualDates)
    ? input.individualDates.slice(0, 60).map((window, index) => {
        const date = text(window?.date, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00Z`).getTime())) {
          throw validationError(`Individual date ${index + 1} needs a valid date`);
        }
        const startsAt = validClock(window?.startsAt, `Individual date ${index + 1} start`);
        const endsAt = validClock(window?.endsAt, `Individual date ${index + 1} end`);
        if (startsAt >= endsAt) throw validationError(`Individual date ${index + 1} must end after it starts`);
        return { date, startsAt, endsAt, formats: enumArray(window?.formats, MENTOR_FORMATS) };
      })
    : [];

  return {
    timeZone: validTimeZone(input.timeZone),
    sessionFormats: enumArray(input.sessionFormats, MENTOR_FORMATS),
    subjectsCurrentlyAccepted: stringArray(input.subjectsCurrentlyAccepted, 40, 120),
    mentoringModes: enumArray(input.mentoringModes, MENTORING_MODES),
    maximumActiveStudents: Math.min(100, Math.max(1, Math.floor(Number(input.maximumActiveStudents) || 1))),
    currentlyAcceptingStudents: input.currentlyAcceptingStudents === true,
    availabilityStatus: AVAILABILITY_STATUSES.includes(input.availabilityStatus)
      ? input.availabilityStatus
      : "unavailable",
    temporaryPause: input.temporaryPause === true,
    recurringWindows,
    individualDates,
  };
}

export function publicAvailabilitySummary(availability = {}) {
  if (availability.temporaryPause === true || availability.currentlyAcceptingStudents !== true) {
    return "unavailable";
  }
  return availability.availabilityStatus === "limited" ? "limited" : "accepting";
}

export function availabilityLabel(status) {
  return status === "accepting"
    ? "Accepting students"
    : status === "limited"
      ? "Limited availability"
      : "Currently unavailable";
}

export function toPublicMentorProfileDto(id, profile = {}) {
  const normalized = normalizeMentorProfile(profile);
  const capacity = getMentorCapacity(normalized);
  return {
    id,
    displayName: normalized.displayName,
    profileImage: normalized.profileImage || null,
    professionalHeadline: normalized.professionalHeadline,
    biography: normalized.biography,
    disciplines: normalized.disciplines,
    skills: normalized.skills,
    mentorshipTopics: normalized.mentorshipTopics,
    supportedStudentLevels: normalized.supportedStudentLevels,
    languages: normalized.languages,
    mentorshipFormats: normalized.mentorshipFormats,
    locationPreference: normalized.locationPreference,
    generalAvailability: capacity.accepting ? normalized.availabilitySummary : "unavailable",
    generalAvailabilityLabel: availabilityLabel(capacity.accepting ? normalized.availabilitySummary : "unavailable"),
    timeZone: normalized.timeZone,
    maximumActiveStudents: capacity.maximum,
    availableSlots: capacity.availableSlots,
    hasAvailableSlots: capacity.accepting,
    currentlyAcceptingStudents: capacity.accepting,
    portfolioLinks: normalized.portfolioLinks,
    relatedLearningSlugs: normalized.relatedLearningSlugs,
    relatedVideoBundleSlugs: normalized.relatedVideoBundleSlugs,
  };
}

export function serializeMentorDate(value) {
  if (!value) return null;
  const date = value?.toDate?.() || (value instanceof Date ? value : new Date(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
