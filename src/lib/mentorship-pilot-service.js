// @ts-check

import crypto from "node:crypto";
import { adminDb } from "@/lib/firebase-admin";
import { enqueueEmailEventForUsers } from "@/lib/email";
import { cleanProductNotification } from "@/lib/product-notifications";
import { getMentorshipPilotConfig } from "@/lib/product-config";
import {
  ENGAGEMENT_CAPACITY_STATUSES,
  MENTOR_CONDUCT_VERSION,
  MENTOR_TERMS_VERSION,
  MENTOR_PROFILE_STATUSES,
  PILOT_APPLICATION_STATUSES,
  PILOT_ENGAGEMENT_STATUSES,
  PILOT_REQUEST_STATUSES,
  REQUEST_ACTIVE_STATUSES,
  SUGGESTION_STATUSES,
  authorizeMentorshipAction,
  cleanCheckIn,
  cleanClosingFeedback,
  cleanMentorPilotProfile,
  cleanMentorshipAgreement,
  cleanMentorshipPilotRequest,
  serializeMentorPilotProfile,
  serializeMentorApplicationSummary,
  serializePilotApplication,
  serializePilotCheckIn,
  serializePilotEngagement,
  serializePilotRequest,
  serializeSuggestion,
  stableId,
} from "@/lib/mentorship-pilot";
import {
  canonicalMentorProfileFields,
  getMentorCapacity,
  isMentorProfileComplete,
  normalizeMentorProfile,
  toPublicMentorProfileDto,
} from "@/lib/mentor-profiles";

function workflowError(message, code = "invalid_request", status = 400) {
  return Object.assign(new Error(message), { code, status });
}

function displayName(userData = {}) {
  return userData.displayName || userData.username || userData.name || "GO member";
}

function asDate(value) {
  const date = value?.toDate?.() || (value instanceof Date ? value : new Date(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(value, days) {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + Math.max(1, Number(days) || 1));
  return date;
}

function cleanReason(value, max = 1000) {
  return String(value || "").trim().slice(0, max);
}

function actorAllowed(user, config, action) {
  const result = authorizeMentorshipAction(user, action, config);
  if (!result.allowed) throw workflowError(result.reason, result.reason, result.reason === "authentication_required" ? 401 : 403);
  return result;
}

function audit(transaction, db, { actor, action, entityType, entityId, previousStatus = null, newStatus = null, metadata = {} }) {
  const ref = db.collection("mentorship_audit_events").doc();
  transaction.create(ref, {
    actorUserId: actor?.uid || "system",
    actorRole: actor?.admin ? "staff" : "participant",
    action,
    entityType,
    entityId,
    previousStatus,
    newStatus,
    metadata: Object.fromEntries(Object.entries(metadata).filter(([, value]) => ["string", "number", "boolean"].includes(typeof value)).slice(0, 12)),
    createdAt: new Date(),
  });
}

async function notify({ db = adminDb, recipientUserId, type, title, message, eventId, actionUrl = "/profile?tab=mentorships", emailType = "mentorship.update" }) {
  if (!recipientUserId) return;
  const now = new Date();
  const notification = cleanProductNotification({ recipientUserId, type, title, message, actionUrl }, now);
  const notificationRef = db.collection("product_notifications").doc(stableId("notification", eventId, recipientUserId));
  try {
    await notificationRef.create(notification);
  } catch (error) {
    if (error?.code !== 6 && error?.code !== "already-exists") console.error("Mentorship notification failed", error);
  }
  await enqueueEmailEventForUsers({ type: emailType, eventId, userIds: [recipientUserId], data: { title, message }, scheduledFor: null }).catch(() => null);
}

function participant(engagement, user) {
  return Boolean(user?.admin || user?.uid === engagement.mentorId || user?.uid === engagement.menteeUserId);
}

async function getAvailablePublicMentor(mentorId, db = adminDb) {
  const cleanId = String(mentorId || "").trim();
  if (!cleanId) return null;
  const [userDoc, profileDoc] = await Promise.all([
    db.collection("users").doc(cleanId).get(),
    db.collection("mentor_profiles").doc(cleanId).get(),
  ]);
  if (
    !userDoc.exists ||
    !profileDoc.exists ||
    userDoc.data().mentorStatus !== "approved" ||
    userDoc.data().mentorPublicProfileEnabled !== true
  ) {
    throw workflowError("The selected mentor is no longer available", "mentor_unavailable", 409);
  }
  const profile = normalizeMentorProfile(profileDoc.data());
  if (!isMentorProfileComplete(profile) || !getMentorCapacity(profile).accepting) {
    throw workflowError("The selected mentor has no available mentorship slots", "mentor_capacity_full", 409);
  }
  return toPublicMentorProfileDto(cleanId, profile);
}

function lockRef(db, userId) {
  return db.collection("mentorship_pilot_active_requests").doc(userId);
}

function releaseRequestLock(transaction, db, userId, requestId, lockDoc, now) {
  if (!lockDoc?.exists) return;
  const ids = Array.isArray(lockDoc.data()?.requestIds) ? lockDoc.data().requestIds : [];
  const remaining = ids.filter((id) => id !== requestId);
  if (!remaining.length) transaction.delete(lockRef(db, userId));
  else transaction.set(lockRef(db, userId), { requestIds: remaining, updatedAt: now }, { merge: true });
}

export async function saveMentorPilotApplication({ user, input = {}, action = "save", db = adminDb, now = new Date() }) {
  const config = getMentorshipPilotConfig();
  actorAllowed(user, config, "apply_mentor");
  const submitting = action === "submit";
  const ref = db.collection("mentor_profiles").doc(user.uid);
  const applicationRef = db.collection("mentor_applications").doc(user.uid);
  const result = await db.runTransaction(async (transaction) => {
    const [profileDoc, applicationDoc] = await Promise.all([transaction.get(ref), transaction.get(applicationRef)]);
    const previous = profileDoc.exists ? profileDoc.data() : {};
    const clean = cleanMentorPilotProfile({ ...previous, ...input }, { submitting });
    const previousStatus = previous.status || "draft";
    const status = submitting ? "submitted" : previousStatus === "approved" ? "approved" : previousStatus;
    const profile = {
      ...clean,
      userId: user.uid,
      status,
      createdAt: previous.createdAt || now,
      updatedAt: now,
      ...(submitting ? { submittedAt: now } : {}),
    };
    const application = {
      id: user.uid,
      userId: user.uid,
      status,
      profileId: user.uid,
      submittedAt: submitting ? now : applicationDoc.data()?.submittedAt || null,
      createdAt: applicationDoc.data()?.createdAt || now,
      updatedAt: now,
    };
    transaction.set(ref, profile, { merge: true });
    transaction.set(applicationRef, application, { merge: true });
    transaction.set(db.collection("users").doc(user.uid), {
      mentorStatus: status === "approved" ? "approved" : "applicant",
      mentorStatusUpdatedAt: now,
      ...(status === "approved" ? {} : { mentorPublicProfileEnabled: false }),
    }, { merge: true });
    audit(transaction, db, { actor: user, action: submitting ? "mentor_application.submitted" : "mentor_application.saved", entityType: "mentor_profile", entityId: user.uid, previousStatus, newStatus: status });
    return { profile, application };
  });
  if (submitting) {
    await notify({ recipientUserId: user.uid, type: "mentorship_review", title: "Mentor application submitted", message: "GO received your mentor application. A reviewer will follow up if more information is needed.", eventId: `mentor-application-submitted:${user.uid}` });
  }
  return { profile: serializeMentorPilotProfile(user.uid, result.profile, { admin: false }), status: result.profile.status };
}

export async function reviewMentorPilotApplication({ actor, userId, decision, internalNotes = "", customerMessage = "", db = adminDb, now = new Date() }) {
  if (!actor?.admin) throw workflowError("Platform admin access required", "staff_required", 403);
  if (!MENTOR_PROFILE_STATUSES.includes(decision) || !["approved", "needs_information", "rejected", "paused", "suspended", "archived"].includes(decision)) throw workflowError("Unsupported mentor review decision");
  const profileRef = db.collection("mentor_profiles").doc(userId);
  const applicationRef = db.collection("mentor_applications").doc(userId);
  const result = await db.runTransaction(async (transaction) => {
    const [profileDoc, userDoc, applicationDoc] = await Promise.all([transaction.get(profileRef), transaction.get(db.collection("users").doc(userId)), transaction.get(applicationRef)]);
    if (!profileDoc.exists || !userDoc.exists) throw workflowError("Mentor application not found", "not_found", 404);
    const previousProfile = profileDoc.data();
    const previousStatus = previousProfile.status || "draft";
    const mappedUserStatus = decision === "approved" ? "approved" : decision === "paused" ? "temporarily_unavailable" : decision === "suspended" ? "suspended" : decision === "rejected" ? "rejected" : "applicant";
    const customerCopy = cleanReason(customerMessage, 1200);
    const canonicalProfile = decision === "approved" ? canonicalMentorProfileFields(previousProfile) : {};
    transaction.set(profileRef, { ...canonicalProfile, status: decision, customerMessage: customerCopy, internalReviewNotes: cleanReason(internalNotes, 4000), reviewedBy: actor.uid, reviewedAt: now, updatedAt: now, ...(decision === "paused" ? { pausedAt: now } : {}), ...(decision === "archived" ? { archivedAt: now } : {}) }, { merge: true });
    transaction.set(applicationRef, { status: decision, customerMessage: customerCopy, internalReviewNotes: cleanReason(internalNotes, 4000), reviewedBy: actor.uid, reviewedAt: now, updatedAt: now }, { merge: true });
    transaction.set(db.collection("users").doc(userId), { mentorStatus: mappedUserStatus, mentorStatusUpdatedBy: actor.uid, mentorStatusUpdatedAt: now, mentorPublicProfileEnabled: decision === "approved" && userDoc.data().mentorPublicProfileEnabled === true }, { merge: true });
    audit(transaction, db, { actor, action: `mentor_application.${decision}`, entityType: "mentor_profile", entityId: userId, previousStatus, newStatus: decision });
    return { userId, previousStatus, decision, applicationExists: applicationDoc.exists };
  });
  await notify({ recipientUserId: userId, type: "mentorship_review", title: `Mentor application ${decision.replaceAll("_", " ")}`, message: cleanReason(customerMessage, 1200) || (decision === "approved" ? "Your mentor application was approved. Review your profile and availability in Profile → Mentor." : decision === "needs_information" ? "GO needs more information before it can finish reviewing your mentor application." : `Your mentor application was ${decision.replaceAll("_", " ")}.`), eventId: `mentor-application-review:${userId}:${decision}:${now.toISOString()}`, actionUrl: "/profile?tab=mentor" });
  return result;
}

const DELETABLE_MENTOR_APPLICATION_STATUSES = new Set([
  "draft",
  "submitted",
  "needs_information",
  "rejected",
  "archived",
]);

export async function deleteMentorPilotApplication({ actor, userId, reason = "", db = adminDb, now = new Date() }) {
  if (!actor?.admin) throw workflowError("Platform admin access required", "staff_required", 403);
  const cleanUserId = String(userId || "").trim();
  const cleanDeletionReason = cleanReason(reason, 1200);
  if (!cleanUserId) throw workflowError("Mentor applicant is required");
  if (!cleanDeletionReason) throw workflowError("A deletion reason is required");

  const [relatedApplications, relatedEngagements, legacyRequests, legacyEngagements, learningItems, assetPacks] = await Promise.all([
    db.collection("mentorship_applications").where("mentorId", "==", cleanUserId).limit(1).get(),
    db.collection("mentorship_pilot_engagements").where("mentorId", "==", cleanUserId).limit(1).get(),
    db.collection("mentorship_requests").where("targetMentorId", "==", cleanUserId).limit(1).get(),
    db.collection("mentorship_engagements").where("mentorId", "==", cleanUserId).limit(1).get(),
    db.collection("learning_items").where("instructorUserId", "==", cleanUserId).limit(100).get(),
    db.collection("asset_packs").where("contributorId", "==", cleanUserId).limit(100).get(),
  ]);
  const hasPublishedLearning = learningItems.docs.some((doc) =>
    ["enrollment_open", "enrollment_closed", "full", "waitlist_available", "in_progress", "completed"].includes(doc.data().status)
  );
  const hasPublishedAssets = assetPacks.docs.some((doc) =>
    ["published", "legacy"].includes(doc.data().status)
  );
  if (!relatedApplications.empty || !relatedEngagements.empty || !legacyRequests.empty || !legacyEngagements.empty || hasPublishedLearning || hasPublishedAssets) {
    throw workflowError(
      "This mentor submission is connected to mentorship or published content. Archive or suspend the mentor instead.",
      "mentor_application_in_use",
      409
    );
  }

  const applicationRef = db.collection("mentor_applications").doc(cleanUserId);
  const profileRef = db.collection("mentor_profiles").doc(cleanUserId);
  const userRef = db.collection("users").doc(cleanUserId);
  return db.runTransaction(async (transaction) => {
    const [applicationDoc, profileDoc, userDoc] = await Promise.all([
      transaction.get(applicationRef),
      transaction.get(profileRef),
      transaction.get(userRef),
    ]);
    if (!applicationDoc.exists && !profileDoc.exists) {
      throw workflowError("Mentor application not found", "not_found", 404);
    }
    const previousStatus = applicationDoc.data()?.status || profileDoc.data()?.status || "draft";
    if (!DELETABLE_MENTOR_APPLICATION_STATUSES.has(previousStatus)) {
      throw workflowError(
        "Approved, paused, or suspended mentors must be archived or suspended instead of deleted.",
        "mentor_application_in_use",
        409
      );
    }
    if (applicationDoc.exists) transaction.delete(applicationRef);
    if (profileDoc.exists) transaction.delete(profileRef);
    if (userDoc.exists) {
      transaction.set(userRef, {
        mentorStatus: "none",
        mentorPublicProfileEnabled: false,
        mentorStatusUpdatedBy: actor.uid,
        mentorStatusUpdatedAt: now,
      }, { merge: true });
    }
    audit(transaction, db, {
      actor,
      action: "mentor_application.deleted",
      entityType: "mentor_application",
      entityId: cleanUserId,
      previousStatus,
      newStatus: "deleted",
      metadata: { affectedUserId: cleanUserId, reason: cleanDeletionReason },
    });
    return { id: cleanUserId, deleted: true, previousStatus };
  });
}

export async function saveMentorshipPilotRequest({ user, requestId = "", input = {}, mode = "submit", db = adminDb, now = new Date() }) {
  const config = getMentorshipPilotConfig();
  actorAllowed(user, config, "create_request");
  if (!config.under18MentorshipEnabled && input.isAdult !== true) throw workflowError("Mentorship pilot access is limited to members aged 18 or older", "adult_confirmation_required", 403);
  const submitting = mode === "submit";
  const requestedMentor = input.requestedMentorId
    ? await getAvailablePublicMentor(input.requestedMentorId, db)
    : null;
  const requestRef = requestId ? db.collection("mentorship_pilot_requests").doc(requestId) : db.collection("mentorship_pilot_requests").doc(stableId("request", user.uid, crypto.randomUUID()));
  const result = await db.runTransaction(async (transaction) => {
    const lock = lockRef(db, user.uid);
    const [requestDoc, lockDoc] = await Promise.all([transaction.get(requestRef), transaction.get(lock)]);
    const previous = requestDoc.exists ? requestDoc.data() : {};
    if (requestDoc.exists && previous.menteeUserId !== user.uid) throw workflowError("Mentorship request not found", "not_found", 404);
    const ids = Array.isArray(lockDoc.data()?.requestIds) ? lockDoc.data().requestIds : [];
    if (!requestDoc.exists && ids.length >= config.maxActiveRequestsPerUser) throw workflowError("You have reached the active mentorship request limit", "request_limit_reached", 409);
    if (requestDoc.exists && !REQUEST_ACTIVE_STATUSES.includes(previous.status) && previous.status !== "draft") throw workflowError("This mentorship request can no longer be edited", "request_not_editable", 409);
    const clean = cleanMentorshipPilotRequest({ ...previous, ...input }, { submitting });
    const status = submitting ? "submitted" : previous.status || "draft";
    const data = { ...clean, requestedMentorProfile: clean.requestedMentorId ? requestedMentor || previous.requestedMentorProfile || null : null, menteeUserId: user.uid, menteeDisplayName: displayName(user.userData), status, createdAt: previous.createdAt || now, updatedAt: now, reviewDueAt: submitting ? addDays(now, config.requestReviewTargetWorkingDays) : previous.reviewDueAt || null, ...(submitting ? { submittedAt: now } : {}) };
    transaction.set(requestRef, data, { merge: true });
    if (!ids.includes(requestRef.id)) transaction.set(lock, { userId: user.uid, requestIds: [...ids, requestRef.id], createdAt: lockDoc.data()?.createdAt || now, updatedAt: now }, { merge: true });
    audit(transaction, db, { actor: user, action: submitting ? "mentorship_request.submitted" : "mentorship_request.saved", entityType: "mentorship_request", entityId: requestRef.id, previousStatus: previous.status || null, newStatus: status, metadata: { discipline: data.discipline } });
    return { id: requestRef.id, data };
  });
  if (submitting) {
    await notify({ recipientUserId: user.uid, type: "mentorship_review", title: "Mentorship request submitted", message: "GO received your request and will review it manually. A mentor is not guaranteed.", eventId: `request-submitted:${result.id}` });
  }
  return serializePilotRequest(result.id, result.data);
}

export async function updateMentorshipPilotRequest({ user, requestId, action, message = "", db = adminDb, now = new Date() }) {
  const ref = db.collection("mentorship_pilot_requests").doc(requestId);
  const result = await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(ref);
    if (!doc.exists || doc.data().menteeUserId !== user.uid) throw workflowError("Mentorship request not found", "not_found", 404);
    const current = doc.data();
    if (action === "withdraw") {
      if (![...REQUEST_ACTIVE_STATUSES, "draft"].includes(current.status)) throw workflowError("This request can no longer be withdrawn", "request_not_editable", 409);
      const lock = lockRef(db, user.uid);
      const lockDoc = await transaction.get(lock);
      transaction.update(ref, { status: "withdrawn", withdrawnAt: now, closedAt: now, updatedAt: now });
      releaseRequestLock(transaction, db, user.uid, requestId, lockDoc, now);
      audit(transaction, db, { actor: user, action: "mentorship_request.withdrawn", entityType: "mentorship_request", entityId: requestId, previousStatus: current.status, newStatus: "withdrawn" });
      return { status: "withdrawn" };
    }
    if (action === "respond_to_information") {
      if (current.status !== "needs_information") throw workflowError("This request is not waiting for information", "invalid_status", 409);
      const response = cleanReason(message, 2000);
      if (!response) throw workflowError("A response is required");
      transaction.update(ref, { informationResponse: response, status: "under_review", updatedAt: now });
      audit(transaction, db, { actor: user, action: "mentorship_request.information_received", entityType: "mentorship_request", entityId: requestId, previousStatus: current.status, newStatus: "under_review" });
      return { status: "under_review" };
    }
    throw workflowError("Unsupported mentorship request action");
  });
  return result;
}

export async function reviewMentorshipPilotRequest({ actor, requestId, decision, customerMessage = "", internalNotes = "", db = adminDb, now = new Date() }) {
  if (!actor?.admin) throw workflowError("Platform admin access required", "staff_required", 403);
  const allowed = ["under_review", "needs_information", "ready_for_suggestions", "no_match_available", "closed"];
  if (!allowed.includes(decision)) throw workflowError("Unsupported request review decision");
  const ref = db.collection("mentorship_pilot_requests").doc(requestId);
  const result = await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(ref);
    if (!doc.exists) throw workflowError("Mentorship request not found", "not_found", 404);
    const current = doc.data();
    const update = { status: decision, customerMessage: cleanReason(customerMessage, 1200), internalReviewNotes: cleanReason(internalNotes, 4000), reviewedBy: actor.uid, reviewedAt: now, updatedAt: now };
    if (["no_match_available", "closed"].includes(decision)) update.closedAt = now;
    transaction.update(ref, update);
    if (["no_match_available", "closed"].includes(decision)) {
      const lock = lockRef(db, current.menteeUserId);
      const lockDoc = await transaction.get(lock);
      releaseRequestLock(transaction, db, current.menteeUserId, requestId, lockDoc, now);
    }
    audit(transaction, db, { actor, action: `mentorship_request.reviewed_${decision}`, entityType: "mentorship_request", entityId: requestId, previousStatus: current.status, newStatus: decision });
    return { menteeUserId: current.menteeUserId, status: decision };
  });
  await notify({ recipientUserId: result.menteeUserId, type: "mentorship_review", title: decision === "needs_information" ? "GO needs more information" : decision === "ready_for_suggestions" ? "Your request is ready for mentor suggestions" : decision === "no_match_available" ? "No suitable mentor is available right now" : "Mentorship request updated", message: cleanReason(customerMessage) || (decision === "no_match_available" ? "Your request was closed without being shared outside the GO review team." : "Open your mentorship dashboard for the next step."), eventId: `request-review:${requestId}:${decision}:${now.toISOString()}` });
  return result;
}

export async function sendMentorSuggestions({ actor, requestId, suggestions = [], db = adminDb, now = new Date() }) {
  if (!actor?.admin) throw workflowError("Platform admin access required", "staff_required", 403);
  const config = getMentorshipPilotConfig();
  if (!Array.isArray(suggestions) || !suggestions.length || suggestions.length > config.suggestionsPerRequest) throw workflowError(`Add between one and ${config.suggestionsPerRequest} mentor suggestions`);
  const requestRef = db.collection("mentorship_pilot_requests").doc(requestId);
  const mentorIds = suggestions.map((item) => String(item.mentorId || "").trim()).filter(Boolean);
  if (new Set(mentorIds).size !== mentorIds.length) throw workflowError("Each suggested mentor must be unique");
  const mentorDocs = await Promise.all(mentorIds.map(async (mentorId) => {
    const [userDoc, profileDoc, availabilityDoc] = await Promise.all([db.collection("users").doc(mentorId).get(), db.collection("mentor_profiles").doc(mentorId).get(), db.collection("mentor_availability").doc(mentorId).get()]);
    return { mentorId, userDoc, profileDoc, availabilityDoc };
  }));
  const result = await db.runTransaction(async (transaction) => {
    const requestDoc = await transaction.get(requestRef);
    if (!requestDoc.exists) throw workflowError("Mentorship request not found", "not_found", 404);
    const request = requestDoc.data();
    if (!["ready_for_suggestions", "suggestions_sent", "application_submitted"].includes(request.status)) throw workflowError("This request is not ready for mentor suggestions", "invalid_status", 409);
    const created = [];
    for (const [index, item] of mentorDocs.entries()) {
      const profile = normalizeMentorProfile({
        ...(item.profileDoc.data() || {}),
        ...(item.availabilityDoc.exists ? item.availabilityDoc.data() : {}),
      });
      const user = item.userDoc.data() || {};
      const accepting = user.mentorStatus === "approved" && (profile.publicProfileConsent === true || user.mentorPublicProfileEnabled === true) && getMentorCapacity(profile).accepting;
      if (!item.userDoc.exists || !item.profileDoc.exists || !accepting) throw workflowError(`Mentor ${item.mentorId} is not currently available`, "mentor_unavailable", 409);
      const suggestionId = stableId("suggestion", requestId, item.mentorId);
      const ref = db.collection("mentorship_suggestions").doc(suggestionId);
      const data = { id: suggestionId, requestId, mentorId: item.mentorId, createdBy: actor.uid, mentorProfile: serializeMentorPilotProfile(item.mentorId, profile), reasonSummary: cleanReason(suggestions[index]?.reasonSummary, 500), privateStaffNotes: cleanReason(suggestions[index]?.privateStaffNotes, 3000), status: "visible", shownAt: now, expiresAt: addDays(now, config.applicationResponseTargetWorkingDays * 2), createdAt: now, updatedAt: now };
      if (!data.reasonSummary) throw workflowError("A customer-facing reason is required for every suggestion");
      transaction.set(ref, data, { merge: true });
      audit(transaction, db, { actor, action: "mentor_suggestions.sent", entityType: "mentorship_suggestion", entityId: suggestionId, newStatus: "visible", metadata: { requestId, position: index + 1 } });
      created.push({ suggestionId, mentorId: item.mentorId });
    }
    transaction.update(requestRef, { status: "suggestions_sent", suggestionsSentAt: now, updatedAt: now });
    audit(transaction, db, { actor, action: "mentorship_request.suggestions_sent", entityType: "mentorship_request", entityId: requestId, previousStatus: request.status, newStatus: "suggestions_sent", metadata: { count: created.length } });
    return { menteeUserId: request.menteeUserId, created };
  });
  await notify({ recipientUserId: result.menteeUserId, type: "mentorship_suggestion", title: "Mentor suggestions are ready", message: "GO reviewed your request and prepared mentor suggestions for you to review.", eventId: `suggestions-sent:${requestId}` });
  return result;
}

export async function forwardRequestToRequestedMentor({ actor, requestId, customerMessage = "", db = adminDb, now = new Date() }) {
  if (!actor?.admin) throw workflowError("Platform admin access required", "staff_required", 403);
  const requestRef = db.collection("mentorship_pilot_requests").doc(requestId);
  const result = await db.runTransaction(async (transaction) => {
    const requestDoc = await transaction.get(requestRef);
    if (!requestDoc.exists) throw workflowError("Mentorship request not found", "not_found", 404);
    const request = requestDoc.data();
    if (!["submitted", "under_review", "ready_for_suggestions", "application_submitted"].includes(request.status)) {
      throw workflowError("This request cannot be forwarded in its current state", "invalid_status", 409);
    }
    if (!request.requestedMentorId || request.dataSharingConsent !== true) {
      throw workflowError("This request does not include a consented selected mentor", "invalid_request", 409);
    }

    const mentorId = request.requestedMentorId;
    const suggestionId = stableId("suggestion", requestId, mentorId);
    const applicationId = stableId("mentorship-application", suggestionId);
    const mentorUserRef = db.collection("users").doc(mentorId);
    const mentorProfileRef = db.collection("mentor_profiles").doc(mentorId);
    const mentorAvailabilityRef = db.collection("mentor_availability").doc(mentorId);
    const suggestionRef = db.collection("mentorship_suggestions").doc(suggestionId);
    const applicationRef = db.collection("mentorship_applications").doc(applicationId);
    const [mentorUserDoc, mentorProfileDoc, mentorAvailabilityDoc, suggestionDoc, applicationDoc] = await Promise.all([
      transaction.get(mentorUserRef),
      transaction.get(mentorProfileRef),
      transaction.get(mentorAvailabilityRef),
      transaction.get(suggestionRef),
      transaction.get(applicationRef),
    ]);
    if (applicationDoc.exists) {
      return {
        id: applicationId,
        mentorId,
        menteeUserId: request.menteeUserId,
        status: applicationDoc.data().status,
        idempotent: true,
      };
    }
    if (
      !mentorUserDoc.exists ||
      !mentorProfileDoc.exists ||
      mentorUserDoc.data().mentorStatus !== "approved" ||
      mentorUserDoc.data().mentorPublicProfileEnabled !== true
    ) {
      throw workflowError("The requested mentor is no longer available", "mentor_unavailable", 409);
    }
    const profile = normalizeMentorProfile({
      ...mentorProfileDoc.data(),
      ...(mentorAvailabilityDoc.exists ? mentorAvailabilityDoc.data() : {}),
    });
    if (!isMentorProfileComplete(profile) || !getMentorCapacity(profile).accepting) {
      throw workflowError("The requested mentor has no available mentorship slots", "mentor_capacity_full", 409);
    }

    const mentorProfile = serializeMentorPilotProfile(mentorId, profile);
    const suggestion = {
      id: suggestionId,
      requestId,
      mentorId,
      createdBy: actor.uid,
      mentorProfile,
      reasonSummary: cleanReason(customerMessage, 500) || "You selected this official GO mentor from the Mentorship directory.",
      privateStaffNotes: "",
      status: "selected",
      shownAt: now,
      selectedAt: now,
      expiresAt: addDays(now, getMentorshipPilotConfig().applicationResponseTargetWorkingDays),
      createdAt: suggestionDoc.data()?.createdAt || now,
      updatedAt: now,
    };
    const sharedRequest = {
      title: request.title,
      goal: request.goal,
      discipline: request.discipline,
      currentLevel: request.currentLevel,
      desiredOutcome: request.desiredOutcome,
      projectLinks: request.projectLinks || [],
      preferredTimeframe: request.preferredTimeframe,
      timeframeDetails: request.timeframeDetails,
      languagePreferences: request.languagePreferences,
      timeZone: request.timeZone,
      availability: request.availability,
      preferredFormat: request.preferredFormat,
    };
    const application = {
      requestId,
      suggestionId,
      mentorId,
      menteeUserId: request.menteeUserId,
      message: "",
      sharedRequest,
      consentVersion: request.consentVersion,
      dataSharingConsent: true,
      relevantProfileSnapshot: {
        displayName: request.menteeDisplayName || "GO member",
        publicProfileId: request.menteeUserId,
      },
      status: "pending",
      submittedAt: now,
      expiresAt: addDays(now, getMentorshipPilotConfig().applicationResponseTargetWorkingDays),
      createdAt: now,
      updatedAt: now,
    };
    transaction.set(suggestionRef, suggestion, { merge: true });
    transaction.create(applicationRef, application);
    transaction.update(requestRef, {
      status: "application_submitted",
      requestedMentorForwardedAt: now,
      customerMessage: cleanReason(customerMessage, 1200),
      updatedAt: now,
    });
    audit(transaction, db, { actor, action: "mentorship_request.forwarded_to_requested_mentor", entityType: "mentorship_request", entityId: requestId, previousStatus: request.status, newStatus: "application_submitted", metadata: { mentorId, applicationId } });
    audit(transaction, db, { actor, action: "mentor_application.submitted", entityType: "mentor_application", entityId: applicationId, newStatus: "pending", metadata: { suggestionId, requestedByMentee: true } });
    return { id: applicationId, mentorId, menteeUserId: request.menteeUserId, status: "pending", idempotent: false };
  });

  if (!result.idempotent) {
    await Promise.all([
      notify({ recipientUserId: result.mentorId, type: "mentorship_application", title: "A mentorship application is ready", message: "GO reviewed a member request for your mentorship. Review it in your profile.", eventId: `requested-mentor-application:${result.id}:mentor`, actionUrl: "/profile?tab=mentorships" }),
      notify({ recipientUserId: result.menteeUserId, type: "mentorship_review", title: "Your request was sent to the mentor", message: "GO reviewed your request. The mentor can now accept or decline it from their private workspace.", eventId: `requested-mentor-application:${result.id}:mentee`, actionUrl: "/profile?tab=mentorships" }),
    ]);
  }
  return result;
}

export async function getPilotSuggestionsForUser({ user, db = adminDb }) {
  const requests = await db.collection("mentorship_pilot_requests").where("menteeUserId", "==", user.uid).limit(100).get();
  const suggestions = (await Promise.all(requests.docs.map((doc) => db.collection("mentorship_suggestions").where("requestId", "==", doc.id).limit(20).get()))).flatMap((snapshots) => snapshots.docs.map((doc) => serializeSuggestion(doc.id, doc.data())));
  return suggestions;
}

export async function declineMentorSuggestion({ user, suggestionId, db = adminDb, now = new Date() }) {
  const suggestionRef = db.collection("mentorship_suggestions").doc(suggestionId);
  const result = await db.runTransaction(async (transaction) => {
    const suggestionDoc = await transaction.get(suggestionRef);
    if (!suggestionDoc.exists) throw workflowError("Mentor suggestion not found", "not_found", 404);
    const suggestion = suggestionDoc.data();
    const requestRef = db.collection("mentorship_pilot_requests").doc(suggestion.requestId);
    const requestDoc = await transaction.get(requestRef);
    if (!requestDoc.exists || requestDoc.data().menteeUserId !== user.uid) throw workflowError("Mentor suggestion not found", "not_found", 404);
    if (!["visible", "proposed"].includes(suggestion.status)) throw workflowError("This mentor suggestion is no longer available", "invalid_status", 409);
    transaction.update(suggestionRef, { status: "declined_by_mentee", declinedAt: now, updatedAt: now });
    audit(transaction, db, { actor: user, action: "mentor_suggestion.declined", entityType: "mentorship_suggestion", entityId: suggestionId, previousStatus: suggestion.status, newStatus: "declined_by_mentee" });
    return { status: "declined_by_mentee" };
  });
  return result;
}

export async function applyToMentorSuggestion({ user, suggestionId, message = "", dataSharingConsent = false, db = adminDb, now = new Date() }) {
  const config = getMentorshipPilotConfig();
  actorAllowed(user, config, "apply_to_suggestion");
  if (!dataSharingConsent) throw workflowError("Confirm the exact request information that will be shared with the mentor");
  const suggestionRef = db.collection("mentorship_suggestions").doc(suggestionId);
  const applicationRef = db.collection("mentorship_applications").doc(stableId("mentorship-application", suggestionId));
  const result = await db.runTransaction(async (transaction) => {
    const suggestionDoc = await transaction.get(suggestionRef);
    if (!suggestionDoc.exists) throw workflowError("Mentor suggestion not found", "not_found", 404);
    const suggestion = suggestionDoc.data();
    const requestRef = db.collection("mentorship_pilot_requests").doc(suggestion.requestId);
    const [requestDoc, mentorDoc, existingApplication] = await Promise.all([transaction.get(requestRef), transaction.get(db.collection("users").doc(suggestion.mentorId)), transaction.get(applicationRef)]);
    if (!requestDoc.exists || requestDoc.data().menteeUserId !== user.uid) throw workflowError("Mentor suggestion not found", "not_found", 404);
    if (!["visible", "proposed"].includes(suggestion.status) || (asDate(suggestion.expiresAt) && asDate(suggestion.expiresAt) <= now)) throw workflowError("This mentor suggestion is no longer available", "suggestion_expired", 409);
    if (!mentorDoc.exists || mentorDoc.data().mentorStatus !== "approved") throw workflowError("This mentor is no longer available", "mentor_unavailable", 409);
    if (existingApplication.exists && ["pending", "accepted"].includes(existingApplication.data().status)) return { id: applicationRef.id, data: existingApplication.data(), idempotent: true };
    const request = requestDoc.data();
    const sharedRequest = { title: request.title, goal: request.goal, discipline: request.discipline, currentLevel: request.currentLevel, desiredOutcome: request.desiredOutcome, projectLinks: request.projectLinks || [], preferredTimeframe: request.preferredTimeframe, timeframeDetails: request.timeframeDetails, languagePreferences: request.languagePreferences, timeZone: request.timeZone, availability: request.availability, preferredFormat: request.preferredFormat };
    const data = { requestId: suggestion.requestId, suggestionId, mentorId: suggestion.mentorId, menteeUserId: user.uid, message: cleanReason(message, 1200), sharedRequest, consentVersion: request.consentVersion, dataSharingConsent: true, relevantProfileSnapshot: { displayName: displayName(user.userData), publicProfileId: user.uid }, status: "pending", submittedAt: now, expiresAt: addDays(now, getMentorshipPilotConfig().applicationResponseTargetWorkingDays), createdAt: now, updatedAt: now };
    transaction.set(applicationRef, data, { merge: true });
    transaction.update(suggestionRef, { status: "selected", selectedAt: now, updatedAt: now });
    transaction.update(requestRef, { status: "application_submitted", updatedAt: now });
    audit(transaction, db, { actor: user, action: "mentor_application.submitted", entityType: "mentor_application", entityId: applicationRef.id, newStatus: "pending", metadata: { suggestionId } });
    return { id: applicationRef.id, data, mentorId: suggestion.mentorId, idempotent: false };
  });
  if (!result.idempotent) await notify({ recipientUserId: result.mentorId, type: "mentorship_application", title: "A mentorship application is ready", message: "A GO member applied to one of your approved mentor suggestions. Review the application in your profile.", eventId: `application-submitted:${result.id}`, actionUrl: "/profile?tab=mentorships" });
  return serializePilotApplication(result.id, result.data);
}

export async function respondToMentorApplication({ user, applicationId, action, response = "", db = adminDb, now = new Date() }) {
  const applicationRef = db.collection("mentorship_applications").doc(applicationId);
  const result = await db.runTransaction(async (transaction) => {
    const appDoc = await transaction.get(applicationRef);
    if (!appDoc.exists) throw workflowError("Mentor application not found", "not_found", 404);
    const application = appDoc.data();
    if (action === "withdraw") {
      if (application.menteeUserId !== user?.uid || application.status !== "pending") throw workflowError("Mentor application not found", "not_found", 404);
      transaction.update(applicationRef, { status: "withdrawn", withdrawnAt: now, updatedAt: now });
      transaction.update(db.collection("mentorship_suggestions").doc(application.suggestionId), { status: "visible", updatedAt: now });
      transaction.update(db.collection("mentorship_pilot_requests").doc(application.requestId), { status: "suggestions_sent", updatedAt: now });
      audit(transaction, db, { actor: user, action: "mentor_application.withdrawn", entityType: "mentor_application", entityId: applicationId, previousStatus: "pending", newStatus: "withdrawn" });
      return { status: "withdrawn", menteeUserId: application.menteeUserId, mentorId: application.mentorId };
    }
    if (!user?.admin && application.mentorId !== user?.uid) throw workflowError("Mentor application not found", "not_found", 404);
    if (application.status !== "pending") throw workflowError("This application is no longer awaiting a response", "invalid_status", 409);
    if (asDate(application.expiresAt) && asDate(application.expiresAt) <= now) {
      transaction.update(applicationRef, { status: "expired", respondedAt: now, updatedAt: now });
      return { status: "expired", menteeUserId: application.menteeUserId, mentorId: application.mentorId };
    }
    const actionStatus = action === "accept" ? "accepted" : action === "decline" ? "declined" : null;
    if (!actionStatus) throw workflowError("Choose accept or decline");
    const requestRef = db.collection("mentorship_pilot_requests").doc(application.requestId);
    const requestDoc = await transaction.get(requestRef);
    if (!requestDoc.exists) throw workflowError("Mentorship request not found", "not_found", 404);
    if (actionStatus === "declined") {
      transaction.update(applicationRef, { status: "declined", mentorResponse: cleanReason(response), respondedAt: now, updatedAt: now });
      transaction.update(requestRef, { status: "suggestions_sent", updatedAt: now });
      audit(transaction, db, { actor: user, action: "mentor_application.declined", entityType: "mentor_application", entityId: applicationId, previousStatus: "pending", newStatus: "declined" });
      return { status: "declined", menteeUserId: application.menteeUserId, mentorId: application.mentorId };
    }
    const profileRef = db.collection("mentor_profiles").doc(application.mentorId);
    const profileDoc = await transaction.get(profileRef);
    if (!profileDoc.exists) throw workflowError("Mentor profile not found", "mentor_unavailable", 409);
    const profile = normalizeMentorProfile(profileDoc.data());
    const capacity = getMentorCapacity(profile);
    if (!capacity.accepting) throw workflowError("Mentor capacity is full", "mentor_capacity_full", 409);
    const engagementId = stableId("engagement", applicationId);
    const engagementRef = db.collection("mentorship_pilot_engagements").doc(engagementId);
    const engagementDoc = await transaction.get(engagementRef);
    if (engagementDoc.exists) return { status: "accepted", engagementId, engagement: engagementDoc.data(), menteeUserId: application.menteeUserId, mentorId: application.mentorId, idempotent: true };
    const request = requestDoc.data();
    const engagement = { requestId: application.requestId, applicationId, mentorId: application.mentorId, menteeUserId: application.menteeUserId, mentorDisplayName: profile.displayName || "GO mentor", menteeDisplayName: request.menteeDisplayName || "GO member", status: "awaiting_agreement", agreement: null, agreementVersion: null, agreementConfirmations: {}, startDate: null, targetEndDate: null, nextCheckInDate: null, lastCheckInDate: null, createdAt: now, updatedAt: now };
    transaction.create(engagementRef, engagement);
    transaction.update(applicationRef, { status: "accepted", mentorResponse: cleanReason(response), respondedAt: now, engagementId, updatedAt: now });
    transaction.update(requestRef, { status: "matched", engagementId, updatedAt: now });
    transaction.update(profileRef, { pilotActiveEngagementCount: Math.max(0, Number(profileDoc.data().pilotActiveEngagementCount) || 0) + 1, updatedAt: now });
    audit(transaction, db, { actor: user, action: "mentor_application.accepted", entityType: "mentor_application", entityId: applicationId, previousStatus: "pending", newStatus: "accepted" });
    return { status: "accepted", engagementId, engagement, menteeUserId: application.menteeUserId, mentorId: application.mentorId, idempotent: false };
  });
  await notify({ recipientUserId: result.menteeUserId, type: "mentorship_agreement", title: result.status === "accepted" ? "Your mentorship application was accepted" : "Your mentorship application was declined", message: result.status === "accepted" ? "The next step is a shared expectations agreement. Open your mentorship dashboard to review it." : "GO will keep your request available for another suggestion where possible.", eventId: `application-response:${applicationId}:${result.status}`, actionUrl: "/profile?tab=mentorships" });
  return result;
}

async function releaseMentorCapacity(transaction, db, engagement, now) {
  const profileRef = db.collection("mentor_profiles").doc(engagement.mentorId);
  const profileDoc = await transaction.get(profileRef);
  if (profileDoc.exists) transaction.update(profileRef, { pilotActiveEngagementCount: Math.max(0, (Number(profileDoc.data().pilotActiveEngagementCount) || 0) - 1), updatedAt: now });
}

export async function updateMentorshipPilotEngagement({ user, engagementId, action, payload = {}, db = adminDb, now = new Date() }) {
  const ref = db.collection("mentorship_pilot_engagements").doc(engagementId);
  const result = await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(ref);
    if (!doc.exists || !participant(doc.data(), user)) throw workflowError("Mentorship engagement not found", "not_found", 404);
    const current = doc.data();
    if (!PILOT_ENGAGEMENT_STATUSES.includes(current.status)) throw workflowError("This engagement is no longer available", "invalid_status", 409);
    if (action === "confirm_agreement") {
      const agreement = cleanMentorshipAgreement(payload.agreement || payload);
      const version = stableId("agreement", JSON.stringify(agreement));
      if (current.agreementVersion && current.agreementVersion !== version) throw workflowError("Both participants must confirm the same agreement", "agreement_mismatch", 409);
      const confirmations = { ...(current.agreementConfirmations || {}), [user.uid]: true };
      const active = confirmations[current.mentorId] === true && confirmations[current.menteeUserId] === true;
      transaction.update(ref, { agreement, agreementVersion: version, agreementConfirmations: confirmations, status: active ? "active" : "ready_to_start", startDate: agreement.startDate, targetEndDate: agreement.targetEndDate, nextCheckInDate: active ? addDays(now, getMentorshipPilotConfig().checkInFrequencyDays) : null, activatedAt: active ? now : null, updatedAt: now });
      audit(transaction, db, { actor: user, action: "mentorship_agreement.confirmed", entityType: "mentorship_engagement", entityId: engagementId, previousStatus: current.status, newStatus: active ? "active" : "ready_to_start" });
      return { recipientUserId: user.uid === current.mentorId ? current.menteeUserId : current.mentorId, status: active ? "active" : "ready_to_start" };
    }
    if (action === "submit_checkin") {
      if (current.status !== "active") throw workflowError("Check-ins are available for active mentorships", "invalid_status", 409);
      const checkIn = cleanCheckIn(payload);
      const checkInId = stableId("checkin", engagementId, user.uid, String(payload.idempotencyKey || new Date(now).toISOString().slice(0, 10)));
      const checkInRef = db.collection("mentorship_checkins").doc(checkInId);
      const existing = await transaction.get(checkInRef);
      if (existing.exists) return { recipientUserId: user.uid === current.mentorId ? current.menteeUserId : current.mentorId, status: "checkin_saved", checkIn: serializePilotCheckIn(checkInId, existing.data()), idempotent: true };
      const data = { ...checkIn, id: checkInId, engagementId, submittedBy: user.uid, submittedAt: now };
      transaction.create(checkInRef, data);
      transaction.update(ref, { lastCheckInDate: now, nextCheckInDate: addDays(now, getMentorshipPilotConfig().checkInFrequencyDays), updatedAt: now });
      if (["support_from_go_requested", "considering_ending"].includes(checkIn.supportNeededCategory)) transaction.create(db.collection("mentorship_staff_alerts").doc(stableId("alert", checkInId)), { type: "checkin", engagementId, checkInId, status: "open", createdAt: now });
      audit(transaction, db, { actor: user, action: "mentorship_checkin.submitted", entityType: "mentorship_checkin", entityId: checkInId, newStatus: "submitted" });
      return { recipientUserId: user.uid === current.mentorId ? current.menteeUserId : current.mentorId, status: "checkin_saved", checkIn: serializePilotCheckIn(checkInId, data), idempotent: false };
    }
    if (action === "request_completion") {
      transaction.update(ref, { status: "completion_pending", completionRequestBy: user.uid, updatedAt: now });
      audit(transaction, db, { actor: user, action: "mentorship_completion.requested", entityType: "mentorship_engagement", entityId: engagementId, previousStatus: current.status, newStatus: "completion_pending" });
      return { recipientUserId: user.uid === current.mentorId ? current.menteeUserId : current.mentorId, status: "completion_pending" };
    }
    if (action === "confirm_completion") {
      if (current.status !== "completion_pending") throw workflowError("Completion has not been requested", "invalid_status", 409);
      if (current.completionRequestBy === user.uid && !user.admin) throw workflowError("The other participant must confirm completion", "confirmation_required", 409);
      await releaseMentorCapacity(transaction, db, current, now);
      transaction.update(ref, { status: "completed", completedAt: now, endedAt: now, updatedAt: now, completionConfirmedBy: user.uid });
      audit(transaction, db, { actor: user, action: "mentorship.completed", entityType: "mentorship_engagement", entityId: engagementId, previousStatus: current.status, newStatus: "completed" });
      return { recipientUserId: user.uid === current.mentorId ? current.menteeUserId : current.mentorId, status: "completed" };
    }
    if (action === "end_early") {
      const reason = ["goal_changed", "scheduling_conflict", "mentor_unavailable", "mentee_unavailable", "fit_not_appropriate", "expectations_not_aligned", "boundary_or_conduct_concern", "ended_by_go", "other"].includes(payload.reasonCategory) ? payload.reasonCategory : "other";
      await releaseMentorCapacity(transaction, db, current, now);
      transaction.update(ref, { status: "ended_early", endedAt: now, endReasonCategory: reason, endedBy: user.admin ? "go" : "participant", updatedAt: now });
      audit(transaction, db, { actor: user, action: "mentorship.ended_early", entityType: "mentorship_engagement", entityId: engagementId, previousStatus: current.status, newStatus: "ended_early", metadata: { reasonCategory: reason } });
      return { recipientUserId: user.uid === current.mentorId ? current.menteeUserId : current.mentorId, status: "ended_early" };
    }
    if (action === "pause" || action === "resume") {
      const nextStatus = action === "pause" ? "paused" : "active";
      if (action === "resume" && current.status !== "paused") throw workflowError("This engagement is not paused", "invalid_status", 409);
      transaction.update(ref, { status: nextStatus, updatedAt: now });
      audit(transaction, db, { actor: user, action: `mentorship.${action}`, entityType: "mentorship_engagement", entityId: engagementId, previousStatus: current.status, newStatus: nextStatus });
      return { recipientUserId: user.uid === current.mentorId ? current.menteeUserId : current.mentorId, status: nextStatus };
    }
    throw workflowError("Unsupported mentorship engagement action");
  });
  if (result.recipientUserId) await notify({ recipientUserId: result.recipientUserId, type: result.status === "checkin_saved" ? "mentorship_checkin" : "mentorship_agreement", title: result.status === "active" ? "Mentorship is active" : "Mentorship updated", message: result.status === "active" ? "Both participants confirmed the agreement. Your mentorship is now active." : "There is a new update in your mentorship workspace.", eventId: `engagement-update:${engagementId}:${result.status}:${now.toISOString()}` });
  return result;
}

export async function submitMentorshipReport({ user, engagementId, category, details, requestNoFurtherContact = false, db = adminDb, now = new Date() }) {
  const ref = db.collection("mentorship_pilot_engagements").doc(engagementId);
  const engagementDoc = await ref.get();
  if (!engagementDoc.exists || !participant(engagementDoc.data(), user)) throw workflowError("Mentorship engagement not found", "not_found", 404);
  const cleanDetails = cleanReason(details, 4000);
  if (!cleanDetails) throw workflowError("Report details are required");
  const reportId = stableId("report", engagementId, user.uid, crypto.randomUUID());
  await db.collection("mentorship_reports").doc(reportId).create({ engagementId, reporterUserId: user.uid, category: cleanReason(category, 80) || "other", details: cleanDetails, requestNoFurtherContact: requestNoFurtherContact === true, status: "open", createdAt: now, updatedAt: now });
  await db.collection("mentorship_staff_alerts").doc(reportId).create({ type: "report", reportId, engagementId, status: "open", createdAt: now }).catch(() => null);
  return { id: reportId, status: "open", message: "Your report was submitted privately to GO staff." };
}

export async function submitMentorshipClosingFeedback({ user, engagementId, input, db = adminDb, now = new Date() }) {
  const engagement = await db.collection("mentorship_pilot_engagements").doc(engagementId).get();
  if (!engagement.exists || !participant(engagement.data(), user)) throw workflowError("Mentorship engagement not found", "not_found", 404);
  if (!["completed", "ended_early"].includes(engagement.data().status)) throw workflowError("Closing feedback is available after an engagement ends", "invalid_status", 409);
  const feedback = cleanClosingFeedback(input);
  const feedbackId = stableId("closing-feedback", engagementId, user.uid);
  await db.collection("mentorship_closing_feedback").doc(feedbackId).set({ ...feedback, id: feedbackId, engagementId, submittedBy: user.uid, status: "private", createdAt: now, updatedAt: now }, { merge: true });
  return { id: feedbackId, status: "private" };
}

export async function resolveMentorshipPilotReport({ actor, reportId, status = "resolved", notes = "", db = adminDb, now = new Date() }) {
  if (!actor?.admin) throw workflowError("Platform admin access required", "staff_required", 403);
  const allowed = ["reviewing", "resolved", "dismissed"];
  if (!allowed.includes(status)) throw workflowError("Unsupported report status");
  const ref = db.collection("mentorship_reports").doc(reportId);
  const report = await ref.get();
  if (!report.exists) throw workflowError("Report not found", "not_found", 404);
  await ref.update({ status, staffNotes: cleanReason(notes, 4000), reviewedBy: actor.uid, reviewedAt: now, updatedAt: now });
  await db.collection("mentorship_audit_events").add({ actorUserId: actor.uid, actorRole: "staff", action: `mentorship_report.${status}`, entityType: "mentorship_report", entityId: reportId, previousStatus: report.data().status || "open", newStatus: status, metadata: {}, createdAt: now });
  await notify({ recipientUserId: report.data().reporterUserId, type: "mentorship_report", title: "Your private report was updated", message: "GO reviewed the concern you reported. Open your mentorship workspace for the latest status.", eventId: `report-review:${reportId}:${status}`, actionUrl: "/profile?tab=mentorships" });
  return { id: reportId, status };
}

export async function getMentorshipPilotDashboard(user, { db = adminDb } = {}) {
  if (!user?.uid) throw workflowError("Authentication required", "authentication_required", 401);
  const [requests, menteeApplications, mentorApplications, menteeEngagements, mentorEngagements, mentorProfile, mentorApplication] = await Promise.all([
    db.collection("mentorship_pilot_requests").where("menteeUserId", "==", user.uid).limit(100).get(),
    db.collection("mentorship_applications").where("menteeUserId", "==", user.uid).limit(100).get(),
    db.collection("mentorship_applications").where("mentorId", "==", user.uid).limit(100).get(),
    db.collection("mentorship_pilot_engagements").where("menteeUserId", "==", user.uid).limit(100).get(),
    db.collection("mentorship_pilot_engagements").where("mentorId", "==", user.uid).limit(100).get(),
    db.collection("mentor_profiles").doc(user.uid).get(),
    db.collection("mentor_applications").doc(user.uid).get(),
  ]);
  const requestDtos = requests.docs.map((doc) => serializePilotRequest(doc.id, doc.data()));
  const suggestions = (await Promise.all(requests.docs.map((doc) => db.collection("mentorship_suggestions").where("requestId", "==", doc.id).limit(20).get()))).flatMap((snapshots) => snapshots.docs.map((doc) => serializeSuggestion(doc.id, doc.data())));
  const appDocs = new Map([...menteeApplications.docs, ...mentorApplications.docs].map((doc) => [doc.id, doc]));
  const engagementDocs = new Map([...menteeEngagements.docs, ...mentorEngagements.docs].map((doc) => [doc.id, doc]));
  const checkIns = (await Promise.all([...engagementDocs.keys()].map((id) => db.collection("mentorship_checkins").where("engagementId", "==", id).limit(20).get()))).flatMap((snapshots) => snapshots.docs.map((doc) => serializePilotCheckIn(doc.id, doc.data())));
  return { mentorProfile: mentorProfile.exists ? serializeMentorPilotProfile(user.uid, mentorProfile.data()) : null, mentorApplication: mentorApplication.exists ? serializeMentorApplicationSummary(mentorApplication.id, mentorApplication.data(), mentorProfile.exists ? mentorProfile.data() : {}) : mentorProfile.exists ? serializeMentorApplicationSummary(user.uid, {}, mentorProfile.data()) : null, requests: requestDtos, suggestions, applications: [...appDocs.values()].map((doc) => serializePilotApplication(doc.id, doc.data())), engagements: [...engagementDocs.values()].map((doc) => serializePilotEngagement(doc.id, doc.data())), checkIns };
}

export async function getMentorshipPilotAdminDashboard({ actor, db = adminDb }) {
  if (!actor?.admin) throw workflowError("Platform admin access required", "staff_required", 403);
  const [mentorApplications, requests, suggestions, applications, engagements, reports, alerts, auditEvents] = await Promise.all([
    db.collection("mentor_applications").limit(500).get(),
    db.collection("mentorship_pilot_requests").limit(500).get(),
    db.collection("mentorship_suggestions").limit(500).get(),
    db.collection("mentorship_applications").limit(500).get(),
    db.collection("mentorship_pilot_engagements").limit(500).get(),
    db.collection("mentorship_reports").limit(500).get(),
    db.collection("mentorship_staff_alerts").limit(500).get(),
    db.collection("mentorship_audit_events").limit(1000).get(),
  ]);
  const profiles = await Promise.all(mentorApplications.docs.map((doc) => db.collection("mentor_profiles").doc(doc.id).get()));
  const mentorRows = mentorApplications.docs.map((doc, index) => ({ id: doc.id, application: serializeMentorApplicationSummary(doc.id, doc.data(), profiles[index].exists ? profiles[index].data() : {}), profile: profiles[index].exists ? serializeMentorPilotProfile(doc.id, profiles[index].data(), { admin: true }) : null }));
  const config = getMentorshipPilotConfig();
  const counts = { approvedMentors: mentorRows.filter((row) => row.profile?.status === "approved").length, availableMentors: mentorRows.filter((row) => row.profile?.status === "approved" && row.profile?.publicProfileConsent).length, totalMentorCapacity: mentorRows.reduce((sum, row) => sum + (Number(row.profile?.maximumActiveMentees) || 0), 0), activeMentorships: engagements.docs.filter((doc) => ENGAGEMENT_CAPACITY_STATUSES.includes(doc.data().status)).length, openRequests: requests.docs.filter((doc) => REQUEST_ACTIVE_STATUSES.includes(doc.data().status)).length, requestsAwaitingReview: requests.docs.filter((doc) => ["submitted", "under_review", "needs_information"].includes(doc.data().status)).length, applicationsAwaitingResponse: applications.docs.filter((doc) => doc.data().status === "pending").length, engagementsRequiringAttention: engagements.docs.filter((doc) => ["paused", "completion_pending", "under_review"].includes(doc.data().status)).length };
  return { config: { ...config, pilotUserIds: config.pilotUserIds.length }, counts, mentorApplications: mentorRows, requests: requests.docs.map((doc) => serializePilotRequest(doc.id, doc.data(), { includeInternal: true })), suggestions: suggestions.docs.map((doc) => ({ ...serializeSuggestion(doc.id, doc.data()), privateStaffNotes: doc.data().privateStaffNotes || "" })), applications: applications.docs.map((doc) => serializePilotApplication(doc.id, doc.data(), { includePrivate: true })), engagements: engagements.docs.map((doc) => serializePilotEngagement(doc.id, doc.data(), { includePrivate: true })), reports: reports.docs.map((doc) => ({ id: doc.id, engagementId: doc.data().engagementId, category: doc.data().category, details: doc.data().details, status: doc.data().status, createdAt: asDate(doc.data().createdAt)?.toISOString() || null })), alerts: alerts.docs.map((doc) => ({ id: doc.id, ...doc.data(), createdAt: asDate(doc.data().createdAt)?.toISOString() || null })), audit: auditEvents.docs.map((doc) => ({ id: doc.id, ...doc.data(), createdAt: asDate(doc.data().createdAt)?.toISOString() || null })).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")) };
}

export const __pilotInternals = Object.freeze({ actorAllowed, releaseRequestLock });
