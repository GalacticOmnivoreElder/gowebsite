// @ts-check

import { isPublicLearningStatus } from "@/lib/content-visibility";

export const LEARNING_TYPES = Object.freeze(["course", "workshop"]);
export const LEARNING_ACCESS_TYPES = Object.freeze([
  "free",
  "community_member_only",
  "invitation_only",
  "administrator_approved",
  "public_event_registration",
]);
export const LEARNING_STATUSES = Object.freeze([
  "draft",
  "enrollment_open",
  "enrollment_closed",
  "full",
  "waitlist_available",
  "in_progress",
  "completed",
  "canceled",
  "archived",
]);
export const ENROLLMENT_STATES = Object.freeze([
  "started",
  "pending_profile_completion",
  "pending_approval",
  "confirmed",
  "waitlisted",
  "declined",
  "canceled_by_participant",
  "canceled_by_organizer",
  "attended",
  "did_not_attend",
  "completed",
]);
export const ACTIVE_ENROLLMENT_STATES = Object.freeze([
  "started",
  "pending_profile_completion",
  "pending_approval",
  "confirmed",
  "waitlisted",
  "attended",
  "completed",
]);
export const ENROLLMENT_QUESTION_TYPES = Object.freeze([
  "short_text",
  "long_text",
  "multiple_choice",
  "checkboxes",
  "portfolio_link",
  "experience_level",
  "accessibility_request",
]);

const activeEnrollmentStates = new Set(ACTIVE_ENROLLMENT_STATES);

export function isActiveEnrollmentState(state) {
  return activeEnrollmentStates.has(state);
}

export function serializeLearningDate(value) {
  if (!value) return null;
  const date = value?.toDate?.() || (value instanceof Date ? value : new Date(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function cleanText(value, maxLength = 5000) {
  return String(value || "").trim().slice(0, maxLength);
}

function validationError(message) {
  return Object.assign(new Error(message), { code: "validation_error" });
}

function cleanStringArray(value, maxItems = 50, itemLength = 100) {
  return Array.isArray(value)
    ? [...new Set(value.map((item) => cleanText(item, itemLength)).filter(Boolean))].slice(0, maxItems)
    : [];
}

function cleanOptionalDate(value, field) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw validationError(`${field} must be a valid date`);
  }
  return date;
}

function cleanQuestions(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 30).map((question, index) => {
    const type = ENROLLMENT_QUESTION_TYPES.includes(question?.type)
      ? question.type
      : "short_text";
    const label = cleanText(question?.label, 240);
    if (!label) {
      throw validationError(`Enrollment question ${index + 1} needs a label`);
    }
    return {
      id: cleanText(question?.id, 80) || `question_${index + 1}`,
      label,
      type,
      required: question?.required === true,
      options: ["multiple_choice", "checkboxes"].includes(type)
        ? cleanStringArray(question?.options, 30, 160)
        : [],
    };
  });
}

export function cleanLearningItem(input = {}) {
  const learningType = LEARNING_TYPES.includes(input.learningType)
    ? input.learningType
    : "course";
  const accessType = LEARNING_ACCESS_TYPES.includes(input.accessType)
    ? input.accessType
    : "free";
  const status = LEARNING_STATUSES.includes(input.status) ? input.status : "draft";
  const capacityValue = input.capacity === "" || input.capacity == null
    ? null
    : Number(input.capacity);
  if (capacityValue !== null && (!Number.isInteger(capacityValue) || capacityValue < 1)) {
    throw validationError("Capacity must be a positive whole number or left empty");
  }

  const item = {
    slug: cleanText(input.slug, 160).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    title: cleanText(input.title, 200),
    description: cleanText(input.description, 10000),
    instructorName: cleanText(input.instructorName, 160),
    instructorUserId: cleanText(input.instructorUserId, 160) || null,
    learningType,
    level: cleanText(input.level, 100),
    prerequisites: cleanText(input.prerequisites, 3000),
    language: cleanText(input.language, 100),
    startsAt: cleanOptionalDate(input.startsAt, "Start date"),
    endsAt: cleanOptionalDate(input.endsAt, "End date"),
    timeZone: cleanText(input.timeZone, 100) || "Europe/Skopje",
    durationMinutes: Math.max(0, Math.floor(Number(input.durationMinutes) || 0)),
    format: cleanText(input.format, 100),
    location: cleanText(input.location, 500),
    capacity: capacityValue,
    confirmedCount: Math.max(0, Math.floor(Number(input.confirmedCount) || 0)),
    reservedCount: Math.max(0, Math.floor(Number(input.reservedCount) || 0)),
    waitlistCount: Math.max(0, Math.floor(Number(input.waitlistCount) || 0)),
    enrollmentOpensAt: cleanOptionalDate(input.enrollmentOpensAt, "Enrollment opening date"),
    enrollmentClosesAt: cleanOptionalDate(input.enrollmentClosesAt, "Enrollment closing date"),
    cancellationDeadline: cleanOptionalDate(input.cancellationDeadline, "Cancellation deadline"),
    accessType,
    membershipRequirement: cleanText(input.membershipRequirement, 100) || null,
    expectedOutcome: cleanText(input.expectedOutcome, 3000),
    accessibilityInformation: cleanText(input.accessibilityInformation, 3000),
    organizerContactRoute: cleanText(input.organizerContactRoute, 300) || "/contact",
    waitlistEnabled: input.waitlistEnabled === true,
    enrollmentMode: input.enrollmentMode === "approval" ? "approval" : "automatic",
    customQuestions: cleanQuestions(input.customQuestions),
    invitedUserIds: cleanStringArray(input.invitedUserIds, 500, 160),
    status,
  };
  if (!item.title || !item.slug || !item.description) {
    throw validationError("Title, slug, and description are required");
  }
  return item;
}

export function learningPlacesRemaining(item = {}) {
  if (!Number.isInteger(item.capacity)) return null;
  return Math.max(0, item.capacity - (Number(item.confirmedCount) || 0) - (Number(item.reservedCount) || 0));
}

export function toPublicLearningItemDto(item = {}) {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    description: item.description,
    instructorName: item.instructorName || "Galactic Omnivore",
    learningType: item.learningType,
    level: item.level || "All levels",
    prerequisites: item.prerequisites || "",
    language: item.language || "",
    startsAt: serializeLearningDate(item.startsAt),
    endsAt: serializeLearningDate(item.endsAt),
    timeZone: item.timeZone || "Europe/Skopje",
    durationMinutes: Number(item.durationMinutes) || 0,
    format: item.format || "",
    location: item.location || "",
    capacity: Number.isInteger(item.capacity) ? item.capacity : null,
    placesRemaining: learningPlacesRemaining(item),
    enrollmentOpensAt: serializeLearningDate(item.enrollmentOpensAt),
    enrollmentClosesAt: serializeLearningDate(item.enrollmentClosesAt),
    cancellationDeadline: serializeLearningDate(item.cancellationDeadline),
    accessType: item.accessType,
    membershipRequirement: item.membershipRequirement || null,
    expectedOutcome: item.expectedOutcome || "",
    accessibilityInformation: item.accessibilityInformation || "",
    organizerContactRoute: item.organizerContactRoute || "/contact",
    waitlistEnabled: item.waitlistEnabled === true,
    enrollmentMode: item.enrollmentMode || "automatic",
    customQuestions: Array.isArray(item.customQuestions) ? item.customQuestions : [],
    status: item.status,
  };
}

export function canListLearningItem(item = {}) {
  return isPublicLearningStatus(item.status);
}

export function validateEnrollmentAnswers(questions = [], answers = {}) {
  const clean = {};
  for (const question of questions) {
    const value = answers?.[question.id];
    const empty = Array.isArray(value) ? value.length === 0 : !String(value || "").trim();
    if (question.required && empty) {
      throw validationError(`${question.label} is required`);
    }
    if (empty) continue;
    if (question.type === "checkboxes") {
      const selected = cleanStringArray(value, 30, 300);
      if (selected.some((option) => !question.options.includes(option))) {
        throw validationError(`Invalid answer for ${question.label}`);
      }
      clean[question.id] = selected;
      continue;
    }
    const text = cleanText(value, question.type === "long_text" || question.type === "accessibility_request" ? 5000 : 1000);
    if (question.type === "multiple_choice" && !question.options.includes(text)) {
      throw validationError(`Invalid answer for ${question.label}`);
    }
    if (question.type === "portfolio_link") {
      try {
        if (new URL(text).protocol !== "https:") throw new Error();
      } catch {
        throw validationError(`${question.label} must be a valid HTTPS link`);
      }
    }
    clean[question.id] = text;
  }
  return clean;
}

export function isLearningManager(item, user) {
  return user?.admin === true || (!!user?.uid && item?.instructorUserId === user.uid);
}
