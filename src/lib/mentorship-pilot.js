// @ts-check

import crypto from "node:crypto";
import { hasCommunityContentAccess } from "@/lib/content-entitlements";

export const MENTOR_PROFILE_STATUSES = Object.freeze([
  "draft", "submitted", "needs_information", "approved", "paused", "rejected", "suspended", "archived",
]);
export const PILOT_REQUEST_STATUSES = Object.freeze([
  "draft", "submitted", "under_review", "needs_information", "ready_for_suggestions", "suggestions_sent",
  "application_submitted", "matched", "no_match_available", "withdrawn", "closed",
]);
export const SUGGESTION_STATUSES = Object.freeze([
  "proposed", "visible", "selected", "declined_by_mentee", "withdrawn_by_go", "expired",
]);
export const PILOT_APPLICATION_STATUSES = Object.freeze([
  "pending", "accepted", "declined", "withdrawn", "expired", "cancelled_by_go",
]);
export const PILOT_ENGAGEMENT_STATUSES = Object.freeze([
  "awaiting_agreement", "ready_to_start", "active", "paused", "completion_pending", "completed", "ended_early", "cancelled", "under_review",
]);

export const MENTORSHIP_CONSENT_VERSION = "mentorship-pilot-v1";
export const MENTOR_TERMS_VERSION = "mentor-terms-pilot-v1";
export const MENTOR_CONDUCT_VERSION = "go-code-of-conduct-v1";

export const REQUEST_ACTIVE_STATUSES = Object.freeze([
  "submitted", "under_review", "needs_information", "ready_for_suggestions", "suggestions_sent", "application_submitted", "matched",
]);
export const ENGAGEMENT_CAPACITY_STATUSES = Object.freeze([
  "awaiting_agreement", "ready_to_start", "active", "paused", "completion_pending", "under_review",
]);

function validationError(message) {
  return Object.assign(new Error(message), { code: "validation_error", status: 400 });
}

function text(value, max = 5000) {
  return String(value ?? "").trim().slice(0, max);
}

function list(value, maxItems = 10, maxLength = 120) {
  return Array.isArray(value)
    ? [...new Set(value.map((item) => text(item, maxLength)).filter(Boolean))].slice(0, maxItems)
    : [];
}

function httpsUrl(value, label) {
  const clean = text(value, 2000);
  if (!clean) throw validationError(`${label} must be a valid HTTPS URL`);
  try {
    const parsed = new URL(clean);
    if (parsed.protocol !== "https:") throw new Error();
    return parsed.toString();
  } catch {
    throw validationError(`${label} must be a valid HTTPS URL`);
  }
}

function optionalHttpsUrl(value, label) {
  const clean = text(value, 2000);
  return clean ? httpsUrl(clean, label) : null;
}

function validTimeZone(value) {
  const zone = text(value, 100) || "Europe/Warsaw";
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone }).format();
    return zone;
  } catch {
    throw validationError("Time zone is not recognized");
  }
}

const allowedFormats = ["online", "gohq", "hybrid"];
const allowedLevels = ["beginner", "intermediate", "advanced", "professional", "all_levels"];

export function cleanMentorPilotProfile(input = {}, { submitting = false } = {}) {
  const evidence = Array.isArray(input.evidenceLinks || input.portfolioLinks) ? (input.evidenceLinks || input.portfolioLinks).slice(0, 8) : [];
  const profile = {
    displayName: text(input.displayName, 160),
    professionalHeadline: text(input.professionalHeadline || input.headline, 180),
    biography: text(input.biography, 5000),
    areasOfExpertise: list(input.areasOfExpertise || input.expertise || input.disciplines, 20, 100),
    supportedDisciplines: list(input.supportedDisciplines || input.disciplines, 20, 100),
    toolsAndTechnologies: list(input.toolsAndTechnologies || input.skills, 30, 100),
    experienceLevel: text(input.experienceLevel, 80),
    experienceYears: Math.min(80, Math.max(0, Math.floor(Number(input.experienceYears) || 0))),
    evidenceLinks: evidence.map((value, index) => typeof value === "string" ? { label: `Evidence ${index + 1}`, url: httpsUrl(value, `Evidence link ${index + 1}`) } : { label: text(value?.label, 100) || `Evidence ${index + 1}`, url: httpsUrl(value?.url, `Evidence link ${index + 1}`) }),
    languages: list(input.languages, 10, 80),
    timeZone: validTimeZone(input.timeZone),
    availableFormats: list(input.availableFormats || input.mentorshipFormats, 5, 40).filter((value) => allowedFormats.includes(value)),
    generalAvailability: text(input.generalAvailability || input.availabilitySummary, 240),
    preferredMenteeLevels: list(input.preferredMenteeLevels || input.supportedStudentLevels, 5, 40).filter((value) => allowedLevels.includes(value)),
    maximumActiveMentees: Math.min(20, Math.max(1, Math.floor(Number(input.maximumActiveMentees || input.maximumActiveStudents) || 1))),
    mentorshipTopics: list(input.mentorshipTopics, 20, 100),
    topicsNotOffered: list(input.topicsNotOffered, 20, 100),
    accessibilityInformation: text(input.accessibilityInformation, 1000),
    conflictOfInterestDeclaration: text(input.conflictOfInterestDeclaration, 1200),
    publicProfileConsent: input.publicProfileConsent === true,
    conductVersion: text(input.conductVersion, 80),
    termsVersion: text(input.termsVersion, 80),
  };
  if (submitting) {
    if (!profile.displayName || !profile.professionalHeadline || !profile.biography || !profile.areasOfExpertise.length || !profile.supportedDisciplines.length || !profile.toolsAndTechnologies.length || !profile.languages.length || !profile.availableFormats.length || !profile.generalAvailability || !profile.preferredMenteeLevels.length || !profile.conflictOfInterestDeclaration || !profile.publicProfileConsent) {
      throw validationError("Complete the required mentor profile fields before submitting");
    }
    if (profile.conductVersion !== MENTOR_CONDUCT_VERSION || profile.termsVersion !== MENTOR_TERMS_VERSION) throw validationError("Accept the current Code of Conduct and mentor terms before submitting");
  }
  return profile;
}

export function cleanMentorshipPilotRequest(input = {}, { submitting = false } = {}) {
  const allowedTimeframes = ["single_session", "two_to_four_weeks", "one_to_three_months", "custom"];
  const projectLinks = Array.isArray(input.projectLinks || input.portfolioLinks) ? (input.projectLinks || input.portfolioLinks).slice(0, 5) : [];
  const request = {
    title: text(input.title, 160),
    goal: text(input.goal || input.learningObjective, 3000),
    discipline: text(input.discipline, 120),
    currentLevel: allowedLevels.includes(input.currentLevel || input.skillLevel) ? (input.currentLevel || input.skillLevel) : "",
    desiredOutcome: text(input.desiredOutcome, 1600),
    projectLinks: projectLinks.map((value, index) => typeof value === "string" ? { label: `Project ${index + 1}`, url: httpsUrl(value, `Project link ${index + 1}`) } : { label: text(value?.label, 100) || `Project ${index + 1}`, url: httpsUrl(value?.url, `Project link ${index + 1}`) }),
    preferredTimeframe: allowedTimeframes.includes(input.preferredTimeframe || input.expectedDuration) ? (input.preferredTimeframe || input.expectedDuration) : "",
    timeframeDetails: text(input.timeframeDetails, 240),
    languagePreferences: list(input.languagePreferences || (input.preferredLanguage ? [input.preferredLanguage] : []), 5, 80),
    timeZone: validTimeZone(input.timeZone),
    availability: text(input.availability || input.generalAvailability, 1000),
    preferredFormat: allowedFormats.includes(input.preferredFormat) ? input.preferredFormat : "",
    accessibilityRequest: text(input.accessibilityRequest, 1000),
    consentVersion: text(input.consentVersion || MENTORSHIP_CONSENT_VERSION, 80),
    dataSharingConsent: input.dataSharingConsent === true,
    expectationsAcknowledged: input.expectationsAcknowledged === true,
  };
  if (submitting) {
    if (!request.title || !request.goal || !request.discipline || !request.currentLevel || !request.desiredOutcome || !request.preferredTimeframe || !request.languagePreferences.length || !request.availability || !request.preferredFormat) throw validationError("Complete the required mentorship request fields before submitting");
    if (request.consentVersion !== MENTORSHIP_CONSENT_VERSION || !request.dataSharingConsent || !request.expectationsAcknowledged) throw validationError("Confirm the mentorship privacy notice and expectations before submitting");
  }
  return request;
}

export function cleanMentorshipAgreement(input = {}) {
  const agreement = {
    goal: text(input.goal, 2000),
    scope: text(input.scope, 2000),
    outOfScope: text(input.outOfScope, 1200),
    format: allowedFormats.includes(input.format) ? input.format : "",
    communicationChannel: text(input.communicationChannel, 200),
    frequency: text(input.frequency, 160),
    startDate: text(input.startDate, 30),
    targetEndDate: text(input.targetEndDate, 30),
    responseExpectations: text(input.responseExpectations, 500),
    confidentiality: input.confidentiality === true,
    boundaries: text(input.boundaries, 1200),
    cancellation: text(input.cancellation, 800),
    reporting: text(input.reporting, 800),
    facilitationRoleAcknowledged: input.facilitationRoleAcknowledged === true,
  };
  if (!agreement.goal || !agreement.scope || !agreement.outOfScope || !agreement.format || !agreement.communicationChannel || !agreement.frequency || !agreement.startDate || !agreement.targetEndDate || !agreement.responseExpectations || !agreement.boundaries || !agreement.cancellation || !agreement.reporting || !agreement.confidentiality || !agreement.facilitationRoleAcknowledged) throw validationError("Complete every mentorship agreement field before confirming");
  return agreement;
}

export function cleanCheckIn(input = {}) {
  const allowed = (values) => ["on_track", "needs_rescheduling", "goal_needs_clarification", "support_from_go_requested", "considering_ending"].includes(input[values]) ? input[values] : "";
  const result = { statusCategory: allowed("statusCategory"), progressCategory: allowed("progressCategory"), supportNeededCategory: allowed("supportNeededCategory"), nextAction: text(input.nextAction, 300) };
  if (!result.statusCategory || !result.progressCategory || !result.supportNeededCategory || !result.nextAction) throw validationError("Choose a check-in status, progress, support need, and next action");
  return result;
}

export function cleanClosingFeedback(input = {}) {
  return {
    satisfactionCategory: text(input.satisfactionCategory, 80),
    outcomeCategory: text(input.outcomeCategory, 120),
    privateNote: text(input.privateNote, 1200),
    testimonialText: text(input.testimonialText, 800),
    testimonialConsent: input.testimonialConsent === true,
  };
}

export function isPilotUserAllowed(user, config) {
  return user?.admin === true || config.featureFlags.pilotOnly !== true || config.pilotUserIds.includes(user?.uid);
}

export function authorizeMentorshipAction(user, action, config) {
  if (!user?.uid) return { allowed: false, reason: "authentication_required" };
  if (user.admin) return { allowed: true };
  if (!config.featureFlags.mentorshipSystem) return { allowed: false, reason: "mentorship_not_available" };
  if (!isPilotUserAllowed(user, config)) return { allowed: false, reason: "pilot_access_required" };
  if (action === "browse_mentors" && !config.featureFlags.publicMentorBrowsing) return { allowed: false, reason: "public_browsing_disabled" };
  if (action === "create_request" && (!config.featureFlags.mentorshipRequests || !hasCommunityContentAccess(user.userData || {}, { admin: user.admin }))) return { allowed: false, reason: "mentorship_membership_required" };
  if (action === "apply_mentor" && !config.featureFlags.mentorApplications) return { allowed: false, reason: "mentor_applications_disabled" };
  if (action === "apply_to_suggestion" && !config.featureFlags.mentorshipRequests) return { allowed: false, reason: "mentorship_requests_disabled" };
  return { allowed: true };
}

export function stableId(prefix, ...parts) {
  return `${prefix}_${crypto.createHash("sha256").update(parts.join(":"), "utf8").digest("hex").slice(0, 40)}`;
}

function iso(value) {
  if (!value) return null;
  const date = value?.toDate?.() || (value instanceof Date ? value : new Date(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function serializeMentorPilotProfile(id, data = {}, { admin = false } = {}) {
  const publicFields = {
    id,
    displayName: data.displayName || "GO mentor",
    professionalHeadline: data.professionalHeadline || "",
    biography: data.biography || "",
    areasOfExpertise: data.areasOfExpertise || [],
    supportedDisciplines: data.supportedDisciplines || [],
    toolsAndTechnologies: data.toolsAndTechnologies || [],
    experienceLevel: data.experienceLevel || "",
    experienceYears: data.experienceYears || 0,
    evidenceLinks: data.evidenceLinks || [],
    languages: data.languages || [],
    timeZone: data.timeZone || "Europe/Warsaw",
    availableFormats: data.availableFormats || [],
    generalAvailability: data.generalAvailability || "",
    preferredMenteeLevels: data.preferredMenteeLevels || [],
    maximumActiveMentees: data.maximumActiveMentees || 1,
    mentorshipTopics: data.mentorshipTopics || [],
    status: data.status || "draft",
    customerMessage: data.customerMessage || "",
    informationRequest: data.informationRequest || "",
    publicProfileConsent: data.publicProfileConsent === true,
    createdAt: iso(data.createdAt),
    updatedAt: iso(data.updatedAt),
  };
  return admin ? { ...publicFields, accessibilityInformation: data.accessibilityInformation || "", conflictOfInterestDeclaration: data.conflictOfInterestDeclaration || "", conductVersion: data.conductVersion || "", termsVersion: data.termsVersion || "", internalReviewNotes: data.internalReviewNotes || "", reviewedBy: data.reviewedBy || null, reviewedAt: iso(data.reviewedAt) } : publicFields;
}

export function serializePilotRequest(id, data = {}, { includeInternal = false } = {}) {
  const value = {
    id,
    menteeUserId: data.menteeUserId,
    title: data.title || "Mentorship request",
    goal: data.goal || "",
    discipline: data.discipline || "",
    currentLevel: data.currentLevel || "",
    desiredOutcome: data.desiredOutcome || "",
    projectLinks: data.projectLinks || [],
    preferredTimeframe: data.preferredTimeframe || "",
    timeframeDetails: data.timeframeDetails || "",
    languagePreferences: data.languagePreferences || [],
    timeZone: data.timeZone || "",
    availability: data.availability || "",
    preferredFormat: data.preferredFormat || "",
    accessibilityRequest: data.accessibilityRequest || "",
    status: data.status || "draft",
    reviewDueAt: iso(data.reviewDueAt),
    createdAt: iso(data.createdAt),
    updatedAt: iso(data.updatedAt),
    closedAt: iso(data.closedAt),
  };
  if (includeInternal) return { ...value, reviewedBy: data.reviewedBy || null, internalReviewNotes: data.internalReviewNotes || "", consentVersion: data.consentVersion || "", dataSharingConsent: data.dataSharingConsent === true };
  return value;
}

export function serializeSuggestion(id, data = {}) {
  return { id, requestId: data.requestId, mentorId: data.mentorId, mentorProfile: data.mentorProfile || null, reasonSummary: data.reasonSummary || "", status: data.status || "proposed", shownAt: iso(data.shownAt), expiresAt: iso(data.expiresAt), selectedAt: iso(data.selectedAt), declinedAt: iso(data.declinedAt), createdAt: iso(data.createdAt) };
}

export function serializePilotApplication(id, data = {}, { includePrivate = false } = {}) {
  const result = { id, requestId: data.requestId, suggestionId: data.suggestionId, mentorId: data.mentorId, menteeUserId: data.menteeUserId, status: data.status || "pending", message: data.message || "", sharedRequest: data.sharedRequest || null, mentorResponse: data.mentorResponse || "", submittedAt: iso(data.submittedAt), respondedAt: iso(data.respondedAt), expiresAt: iso(data.expiresAt), createdAt: iso(data.createdAt) };
  if (includePrivate) result.internalNotes = data.internalNotes || "";
  return result;
}

export function serializePilotEngagement(id, data = {}, { includePrivate = false } = {}) {
  const result = { id, requestId: data.requestId, applicationId: data.applicationId, mentorId: data.mentorId, menteeUserId: data.menteeUserId, mentorDisplayName: data.mentorDisplayName || "GO mentor", menteeDisplayName: data.menteeDisplayName || "GO member", status: data.status || "awaiting_agreement", agreement: data.agreement || null, agreementConfirmations: data.agreementConfirmations || {}, startDate: data.startDate || null, targetEndDate: data.targetEndDate || null, nextCheckInDate: iso(data.nextCheckInDate), lastCheckInDate: iso(data.lastCheckInDate), completionRequestBy: data.completionRequestBy || null, endReasonCategory: data.endReasonCategory || null, createdAt: iso(data.createdAt), updatedAt: iso(data.updatedAt), completedAt: iso(data.completedAt), endedAt: iso(data.endedAt) };
  if (includePrivate) result.communicationChannel = data.communicationChannel || null;
  return result;
}

export function serializePilotCheckIn(id, data = {}) {
  return { id, engagementId: data.engagementId, submittedBy: data.submittedBy, statusCategory: data.statusCategory, progressCategory: data.progressCategory, supportNeededCategory: data.supportNeededCategory, nextAction: data.nextAction, submittedAt: iso(data.submittedAt) };
}
