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
    biography: text(input.biography, 8000),
    disciplines: stringArray(input.disciplines, 30, 100),
    skills: stringArray(input.skills, 60, 100),
    supportedStudentLevels: enumArray(input.supportedStudentLevels, MENTOR_LEVELS),
    languages: stringArray(input.languages, 20, 80),
    mentorshipFormats: enumArray(input.mentorshipFormats, MENTOR_FORMATS),
    locationPreference: MENTOR_FORMATS.includes(input.locationPreference)
      ? input.locationPreference
      : "online",
    timeZone: validTimeZone(input.timeZone),
    portfolioLinks: portfolioLinks(input.portfolioLinks),
    relatedLearningSlugs: stringArray(input.relatedLearningSlugs, 30, 160),
    relatedVideoBundleSlugs: stringArray(input.relatedVideoBundleSlugs, 30, 160),
    availabilitySummary: AVAILABILITY_STATUSES.includes(input.availabilitySummary)
      ? input.availabilitySummary
      : "unavailable",
    currentlyAcceptingStudents: input.currentlyAcceptingStudents === true,
    maximumActiveStudents: Math.min(100, Math.max(1, Math.floor(Number(input.maximumActiveStudents) || 1))),
  };
}

export function isMentorProfileComplete(profile = {}) {
  return Boolean(
    profile.displayName &&
    profile.biography &&
    profile.disciplines?.length &&
    profile.skills?.length &&
    profile.supportedStudentLevels?.length &&
    profile.languages?.length &&
    profile.mentorshipFormats?.length
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
  return {
    id,
    displayName: profile.displayName,
    profileImage: profile.profileImage || null,
    biography: profile.biography,
    disciplines: profile.disciplines || [],
    skills: profile.skills || [],
    supportedStudentLevels: profile.supportedStudentLevels || [],
    languages: profile.languages || [],
    mentorshipFormats: profile.mentorshipFormats || [],
    locationPreference: profile.locationPreference || "online",
    generalAvailability: profile.availabilitySummary || "unavailable",
    generalAvailabilityLabel: availabilityLabel(profile.availabilitySummary),
    timeZone: profile.timeZone || "Europe/Skopje",
    maximumActiveStudents: Math.max(1, Number(profile.maximumActiveStudents) || 1),
    currentlyAcceptingStudents: profile.currentlyAcceptingStudents === true,
    portfolioLinks: profile.portfolioLinks || [],
    relatedLearningSlugs: profile.relatedLearningSlugs || [],
    relatedVideoBundleSlugs: profile.relatedVideoBundleSlugs || [],
  };
}

export function serializeMentorDate(value) {
  if (!value) return null;
  const date = value?.toDate?.() || (value instanceof Date ? value : new Date(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
