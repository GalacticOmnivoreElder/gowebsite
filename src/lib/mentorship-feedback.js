// @ts-check

import crypto from "crypto";

export const MENTOR_FEEDBACK_QUALITIES = Object.freeze([
  "clarity",
  "reliability",
  "practical_usefulness",
  "respect_and_safety",
  "quality_of_feedback",
  "support_for_objective",
]);

export const STUDENT_FEEDBACK_QUALITIES = Object.freeze([
  "preparation",
  "communication",
  "follow_through",
  "respect",
  "receptiveness",
  "reliability",
]);

export const FEEDBACK_MODERATION_STATUSES = Object.freeze([
  "not_required",
  "pending",
  "approved",
  "reported",
  "disputed",
  "removed",
]);

function validationError(message) {
  return Object.assign(new Error(message), { code: "validation_error" });
}

function text(value, max = 5000) {
  return String(value || "").trim().slice(0, max);
}

function iso(value) {
  if (!value) return null;
  const date = value?.toDate?.() || (value instanceof Date ? value : new Date(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function mentorshipFeedbackId(engagementId, authorId) {
  return crypto.createHash("sha256").update(`go-mentorship-feedback:v1:${engagementId}:${authorId}`).digest("hex");
}

export function feedbackDeadline(completedAt, deadlineDays = 14) {
  const completed = completedAt?.toDate?.() || (completedAt instanceof Date ? completedAt : new Date(completedAt));
  if (Number.isNaN(completed.getTime())) return null;
  const days = Math.min(90, Math.max(1, Math.floor(Number(deadlineDays) || 14)));
  return new Date(completed.getTime() + days * 24 * 60 * 60 * 1000);
}

export function getFeedbackEligibility(engagement = {}, now = new Date(), deadlineDays = 14) {
  if (engagement.status !== "completed" || !engagement.completedAt) return { eligible: false, reason: "engagement_not_completed", deadline: null };
  const deadline = feedbackDeadline(engagement.completedAt, deadlineDays);
  if (!deadline || deadline <= now) return { eligible: false, reason: "feedback_window_closed", deadline: deadline?.toISOString() || null };
  return { eligible: true, reason: "completed_engagement", deadline: deadline.toISOString() };
}

export function cleanMentorshipFeedback(input = {}, direction) {
  const allowed = direction === "student_to_mentor" ? MENTOR_FEEDBACK_QUALITIES : STUDENT_FEEDBACK_QUALITIES;
  const qualities = Array.isArray(input.qualities)
    ? [...new Set(input.qualities.filter((quality) => allowed.includes(quality)))]
    : [];
  if (!qualities.length) throw validationError("Select at least one demonstrated quality");
  const publicSharingConsent = direction === "student_to_mentor" && input.publicSharingConsent === true;
  const publicReferenceText = publicSharingConsent ? text(input.publicReferenceText, 1200) : "";
  if (publicSharingConsent && publicReferenceText.length < 20) {
    throw validationError("A consented public mentor reference must contain at least 20 characters");
  }
  return {
    qualities,
    privateWrittenFeedback: text(input.privateWrittenFeedback, 4000),
    publicSharingConsent,
    publicReferenceText,
  };
}

export function canShowcaseMentorReference(data = {}) {
  return data.direction === "student_to_mentor" &&
    data.publicSharingConsent === true &&
    !!text(data.publicReferenceText, 1200) &&
    data.moderationStatus === "approved" &&
    !["reported", "upheld"].includes(data.reportStatus) &&
    !["requested", "upheld"].includes(data.correctionStatus);
}

export function serializeMentorshipFeedback(id, data = {}, { viewerId = null, admin = false } = {}) {
  const isAuthor = viewerId === data.authorId;
  const isRecipient = viewerId === data.recipientId;
  const recipientMayReadPrivate = data.direction === "mentor_to_student" && viewerId === data.studentId;
  const mayReadPrivate = admin || isAuthor || recipientMayReadPrivate;
  const mayReadReference = admin || isAuthor || (isRecipient && data.direction === "student_to_mentor");
  return {
    id,
    engagementId: data.engagementId,
    authorId: data.authorId,
    recipientId: data.recipientId,
    studentId: data.studentId,
    mentorId: data.mentorId,
    direction: data.direction,
    qualities: Array.isArray(data.qualities) ? data.qualities : [],
    ...(mayReadPrivate ? { privateWrittenFeedback: data.privateWrittenFeedback || "" } : {}),
    publicSharingConsent: data.publicSharingConsent === true,
    ...(mayReadReference ? { publicReferenceText: data.publicReferenceText || "" } : {}),
    mentorShowcase: data.mentorShowcase === true,
    moderationStatus: data.moderationStatus || "not_required",
    reportStatus: data.reportStatus || "none",
    correctionStatus: data.correctionStatus || "none",
    ...(admin ? { reportDetails: data.reportDetails || "", correctionDetails: data.correctionDetails || "", adminNotes: data.adminNotes || "" } : {}),
    createdAt: iso(data.createdAt),
    updatedAt: iso(data.updatedAt),
  };
}

export function toPublicMentorReference(data = {}) {
  if (!canShowcaseMentorReference(data) || data.mentorShowcase !== true) return null;
  return {
    text: text(data.publicReferenceText, 1200),
    qualities: Array.isArray(data.qualities) ? data.qualities.filter((quality) => MENTOR_FEEDBACK_QUALITIES.includes(quality)) : [],
    attribution: "Verified mentorship participant",
    sharedAt: iso(data.updatedAt || data.createdAt),
  };
}
