// @ts-check

import crypto from "crypto";
import { hasCommunityContentAccess } from "@/lib/content-entitlements";
import { MENTOR_FORMATS, MENTOR_LEVELS } from "@/lib/mentor-profiles";

export const MENTORSHIP_REQUEST_STATUSES = Object.freeze([
  "assistance_requested",
  "awaiting_mentor_response",
  "clarification_requested",
  "accepted",
  "declined",
  "expired",
  "canceled",
]);
export const ENGAGEMENT_STATUSES = Object.freeze([
  "scheduling",
  "scheduled",
  "attended",
  "missed",
  "active",
  "completed",
  "canceled",
  "reported",
]);
export const ACTIVE_REQUEST_STATUSES = Object.freeze([
  "assistance_requested",
  "awaiting_mentor_response",
  "clarification_requested",
]);
export const ACTIVE_ENGAGEMENT_STATUSES = Object.freeze([
  "scheduling",
  "scheduled",
  "attended",
  "active",
  "reported",
]);
export const EXPECTED_DURATIONS = Object.freeze([
  "single_session",
  "two_to_four_weeks",
  "one_to_three_months",
]);

function validationError(message) {
  return Object.assign(new Error(message), { code: "validation_error" });
}

function text(value, max = 5000) {
  return String(value || "").trim().slice(0, max);
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

export function mentorshipRequestId(studentId, nonce = crypto.randomUUID()) {
  return crypto.createHash("sha256").update(`go-mentorship-request:v1:${studentId}:${nonce}`).digest("hex");
}

export function mentorshipEngagementId(requestId) {
  return crypto.createHash("sha256").update(`go-mentorship-engagement:v1:${requestId}`).digest("hex");
}

export function cleanMentorshipRequest(input = {}) {
  const availabilityDays = Array.isArray(input.availabilityDays)
    ? [...new Set(input.availabilityDays.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))]
    : [];
  const result = {
    learningObjective: text(input.learningObjective, 3000),
    discipline: text(input.discipline, 120),
    skillLevel: MENTOR_LEVELS.includes(input.skillLevel) ? input.skillLevel : "",
    preferredLanguage: text(input.preferredLanguage, 80),
    preferredFormat: MENTOR_FORMATS.includes(input.preferredFormat) ? input.preferredFormat : "",
    availabilityDays,
    generalAvailability: text(input.generalAvailability, 1000),
    timeZone: validTimeZone(input.timeZone),
    expectedDuration: EXPECTED_DURATIONS.includes(input.expectedDuration) ? input.expectedDuration : "",
    portfolioUrl: httpsUrl(input.portfolioUrl, "Portfolio or project link"),
    note: text(input.note, 2000),
  };
  if (!result.learningObjective || !result.discipline || !result.skillLevel || !result.preferredLanguage || !result.preferredFormat || !result.expectedDuration || (!result.availabilityDays.length && !result.generalAvailability)) {
    throw validationError("Objective, subject, level, language, format, availability, and expected duration are required");
  }
  return result;
}

export function canSubmitMentorshipRequest(user, { isAdult = false, now = new Date() } = {}) {
  if (!user) return { allowed: false, reason: "authentication_required" };
  if (!isAdult) return { allowed: false, reason: "adult_confirmation_required" };
  if (!hasCommunityContentAccess(user.userData || {}, { admin: user.admin, now })) {
    return { allowed: false, reason: "community_membership_required" };
  }
  return { allowed: true };
}

export function addWorkingDays(value, workingDays = 5) {
  const result = new Date(value);
  let remaining = Math.max(1, Math.floor(Number(workingDays) || 5));
  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    const day = result.getUTCDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return result;
}

export function cleanTimeProposals(input, now = new Date()) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 5) {
    throw validationError("Propose between one and five time windows");
  }
  return input.map((slot, index) => {
    const startsAt = new Date(slot?.startsAt);
    const endsAt = new Date(slot?.endsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || startsAt <= now || endsAt <= startsAt) {
      throw validationError(`Time window ${index + 1} must be a valid future window`);
    }
    if (endsAt.getTime() - startsAt.getTime() > 8 * 60 * 60 * 1000) {
      throw validationError(`Time window ${index + 1} cannot exceed eight hours`);
    }
    return {
      startsAt,
      endsAt,
      timeZone: validTimeZone(slot?.timeZone),
      meetingUrl: httpsUrl(slot?.meetingUrl, `Time window ${index + 1} meeting link`),
    };
  });
}

function equals(value, expected) {
  return text(value, 200).toLowerCase() === text(expected, 200).toLowerCase();
}

function contains(values, expected) {
  return Array.isArray(values) && values.some((value) => equals(value, expected));
}

export function scoreMentorCompatibility(request, profile, availability, activeEngagementCount = 0) {
  if (
    availability?.temporaryPause === true ||
    availability?.currentlyAcceptingStudents !== true ||
    profile?.currentlyAcceptingStudents !== true ||
    profile?.availabilitySummary === "unavailable" ||
    activeEngagementCount >= Math.max(1, Number(profile?.maximumActiveStudents) || 1)
  ) return null;

  let score = 0;
  const reasons = [];
  if (contains(profile.disciplines, request.discipline) || contains(profile.skills, request.discipline)) {
    score += 30; reasons.push("Subject match");
  }
  if (contains(profile.supportedStudentLevels, request.skillLevel) || contains(profile.supportedStudentLevels, "all_levels")) {
    score += 20; reasons.push("Supports your level");
  }
  if (contains(profile.languages, request.preferredLanguage)) {
    score += 20; reasons.push("Language match");
  }
  if (contains(profile.mentorshipFormats, request.preferredFormat) && contains(availability?.sessionFormats, request.preferredFormat)) {
    score += 15; reasons.push("Format match");
  }
  const mentorDays = new Set((availability?.recurringWindows || []).map((window) => Number(window.dayOfWeek)));
  if ((request.availabilityDays || []).some((day) => mentorDays.has(Number(day)))) {
    score += 15; reasons.push("General availability overlaps");
  }
  return { score, reasons, capacityRemaining: Math.max(0, Math.max(1, Number(profile.maximumActiveStudents) || 1) - activeEngagementCount) };
}

function iso(value) {
  if (!value) return null;
  const date = value?.toDate?.() || (value instanceof Date ? value : new Date(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function serializeSlots(slots = [], includeMeetingUrl = false) {
  return Array.isArray(slots) ? slots.map((slot, index) => ({
    index,
    startsAt: iso(slot.startsAt),
    endsAt: iso(slot.endsAt),
    timeZone: slot.timeZone,
    ...(includeMeetingUrl ? { meetingUrl: slot.meetingUrl || null } : {}),
  })) : [];
}

export function serializeMentorshipRequest(id, data = {}) {
  return {
    id,
    studentId: data.studentId,
    studentDisplayName: data.studentDisplayName || "GO member",
    targetMentorId: data.targetMentorId || null,
    mentorDisplayName: data.mentorDisplayName || null,
    assistanceRequested: data.assistanceRequested === true,
    learningObjective: data.learningObjective,
    discipline: data.discipline,
    skillLevel: data.skillLevel,
    preferredLanguage: data.preferredLanguage,
    preferredFormat: data.preferredFormat,
    availabilityDays: data.availabilityDays || [],
    generalAvailability: data.generalAvailability || "",
    timeZone: data.timeZone,
    expectedDuration: data.expectedDuration,
    portfolioUrl: data.portfolioUrl || null,
    note: data.note || "",
    status: data.status,
    clarificationQuestion: data.clarificationQuestion || null,
    clarificationResponse: data.clarificationResponse || null,
    responseDeadline: iso(data.responseDeadline),
    createdAt: iso(data.createdAt),
    updatedAt: iso(data.updatedAt),
  };
}

export function serializeMentorshipEngagement(id, data = {}, { includePrivateSchedule = false } = {}) {
  return {
    id,
    requestId: data.requestId,
    studentId: data.studentId,
    mentorId: data.mentorId,
    studentDisplayName: data.studentDisplayName || "GO member",
    mentorDisplayName: data.mentorDisplayName || "GO mentor",
    learningObjective: data.learningObjective,
    discipline: data.discipline,
    status: data.status,
    proposedSlots: serializeSlots(data.proposedSlots, includePrivateSchedule),
    agreedSchedule: data.agreedSchedule ? serializeSlots([data.agreedSchedule], includePrivateSchedule)[0] : null,
    cancellation: data.cancellation ? { actorId: data.cancellation.actorId, reason: data.cancellation.reason || "", status: data.cancellation.status || "canceled", createdAt: iso(data.cancellation.createdAt) } : null,
    completionConfirmations: Array.isArray(data.completionConfirmations) ? data.completionConfirmations : [],
    completedAt: iso(data.completedAt),
    createdAt: iso(data.createdAt),
    updatedAt: iso(data.updatedAt),
  };
}
