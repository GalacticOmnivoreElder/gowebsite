// @ts-check

import { adminDb } from "@/lib/firebase-admin";
import { createProductNotification } from "@/lib/product-notifications";
import { enqueueEmailEventForUsers } from "@/lib/email";
import {
  canShowcaseMentorReference,
  cleanMentorshipFeedback,
  getFeedbackEligibility,
  mentorshipFeedbackId,
  serializeMentorshipFeedback,
  toPublicMentorReference,
} from "@/lib/mentorship-feedback";

function workflowError(message, code, status = 400) {
  return Object.assign(new Error(message), { code, status });
}

async function notifyFeedback(userId, eventId, title, message) {
  await Promise.allSettled([
    createProductNotification({ recipientUserId: userId, type: "mentorship_feedback", title, message, actionUrl: "/profile?tab=mentorships" }),
    enqueueEmailEventForUsers({ type: "mentorship.feedback", eventId, userIds: [userId], data: { title, message }, scheduledFor: null }),
  ]);
}

export async function submitMentorshipFeedback({ engagementId, author, input, deadlineDays = 14, db = adminDb, now = new Date() }) {
  if (!author?.uid) throw workflowError("Authentication required", "authentication_required", 401);
  if (!String(engagementId || "").trim()) throw workflowError("Mentorship engagement is required", "validation_error");
  const engagementRef = db.collection("mentorship_engagements").doc(engagementId);
  const feedbackId = mentorshipFeedbackId(engagementId, author.uid);
  const feedbackRef = db.collection("mentorship_feedback").doc(feedbackId);
  const auditRef = db.collection("mentorship_feedback_audit").doc();
  const data = await db.runTransaction(async (transaction) => {
    const [engagementDoc, existingFeedback] = await Promise.all([transaction.get(engagementRef), transaction.get(feedbackRef)]);
    if (!engagementDoc.exists) throw workflowError("Mentorship engagement not found", "not_found", 404);
    const engagement = engagementDoc.data();
    if (![engagement.studentId, engagement.mentorId].includes(author.uid)) throw workflowError("Mentorship engagement not found", "not_found", 404);
    const eligibility = getFeedbackEligibility(engagement, now, deadlineDays);
    if (!eligibility.eligible) throw workflowError(eligibility.reason === "feedback_window_closed" ? "The feedback window has closed" : "Feedback is available only after completion", eligibility.reason, 409);
    if (existingFeedback.exists) throw workflowError("Feedback has already been submitted for this engagement", "duplicate_feedback", 409);
    const direction = author.uid === engagement.studentId ? "student_to_mentor" : "mentor_to_student";
    const clean = cleanMentorshipFeedback(input, direction);
    const result = {
      ...clean,
      engagementId,
      requestId: engagement.requestId || null,
      authorId: author.uid,
      recipientId: direction === "student_to_mentor" ? engagement.mentorId : engagement.studentId,
      studentId: engagement.studentId,
      mentorId: engagement.mentorId,
      direction,
      mentorShowcase: false,
      moderationStatus: clean.publicSharingConsent ? "pending" : "not_required",
      reportStatus: "none",
      reportDetails: "",
      correctionStatus: "none",
      correctionDetails: "",
      adminNotes: "",
      createdAt: now,
      updatedAt: now,
    };
    transaction.create(feedbackRef, result);
    transaction.create(auditRef, { feedbackId, engagementId, action: "feedback.submitted", actorId: author.uid, createdAt: now });
    return result;
  });
  await notifyFeedback(data.recipientId, `${feedbackId}:submitted`, "Mentorship feedback received", "Feedback from a completed mentorship is available in your private dashboard.");
  if (data.publicSharingConsent) {
    const admins = await db.collection("users").where("admin", "==", true).limit(100).get();
    await Promise.allSettled(admins.docs.map((doc) => createProductNotification({ recipientUserId: doc.id, type: "mentorship_feedback", title: "Mentor reference awaiting moderation", message: "A consented mentorship reference requires administrator review before it can be showcased.", actionUrl: "/admin/mentorships" })));
  }
  return serializeMentorshipFeedback(feedbackId, data, { viewerId: author.uid });
}

export async function updateMentorshipFeedback({ feedbackId, actor, action, input = {}, db = adminDb, now = new Date() }) {
  if (!actor?.uid) throw workflowError("Authentication required", "authentication_required", 401);
  const actionInput = /** @type {any} */ (input);
  const ref = db.collection("mentorship_feedback").doc(feedbackId);
  const auditRef = db.collection("mentorship_feedback_audit").doc();
  const result = await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(ref);
    if (!doc.exists) throw workflowError("Mentorship feedback not found", "not_found", 404);
    const data = doc.data();
    if (![data.authorId, data.recipientId].includes(actor.uid)) throw workflowError("Mentorship feedback not found", "not_found", 404);
    let update;
    if (action === "set_public_consent") {
      if (actor.uid !== data.authorId || data.direction !== "student_to_mentor") throw workflowError("Only the student author can change public sharing consent", "author_required", 403);
      const enabled = actionInput.publicSharingConsent === true;
      const publicReferenceText = enabled ? String(actionInput.publicReferenceText || "").trim().slice(0, 1200) : "";
      if (enabled && publicReferenceText.length < 20) throw workflowError("A consented public mentor reference must contain at least 20 characters", "validation_error");
      update = { publicSharingConsent: enabled, publicReferenceText, mentorShowcase: false, moderationStatus: enabled ? "pending" : "not_required", updatedAt: now };
    } else if (action === "set_showcase") {
      if (actor.uid !== data.mentorId || data.direction !== "student_to_mentor") throw workflowError("Only the reviewed mentor can choose showcased references", "mentor_required", 403);
      const enabled = actionInput.mentorShowcase === true;
      if (enabled && !canShowcaseMentorReference(data)) throw workflowError("This reference is not approved for public showcasing", "reference_not_approved", 409);
      update = { mentorShowcase: enabled, updatedAt: now };
    } else if (action === "report") {
      if (actor.uid !== data.recipientId) throw workflowError("Only the feedback recipient can report it", "recipient_required", 403);
      const reportDetails = String(actionInput.details || "").trim().slice(0, 3000);
      if (!reportDetails) throw workflowError("Report details are required", "validation_error");
      update = { reportStatus: "reported", reportDetails, moderationStatus: "reported", mentorShowcase: false, updatedAt: now };
    } else if (action === "request_correction") {
      if (actor.uid !== data.recipientId) throw workflowError("Only the feedback recipient can request a correction", "recipient_required", 403);
      const correctionDetails = String(actionInput.details || "").trim().slice(0, 3000);
      if (!correctionDetails) throw workflowError("Correction or appeal details are required", "validation_error");
      update = { correctionStatus: "requested", correctionDetails, moderationStatus: "disputed", mentorShowcase: false, updatedAt: now };
    } else if (action === "withdraw") {
      if (actor.uid !== data.authorId) throw workflowError("Only the feedback author can withdraw it", "author_required", 403);
      update = { moderationStatus: "removed", publicSharingConsent: false, publicReferenceText: "", mentorShowcase: false, updatedAt: now };
    } else throw workflowError("Unsupported feedback action", "invalid_action");
    transaction.update(ref, update);
    transaction.create(auditRef, { feedbackId, engagementId: data.engagementId, action: `feedback.${action}`, actorId: actor.uid, createdAt: now });
    return { data: { ...data, ...update }, notifyAdmins: ["report", "request_correction", "set_public_consent"].includes(action) && update.moderationStatus !== "not_required" };
  });
  if (result.notifyAdmins) {
    const admins = await db.collection("users").where("admin", "==", true).limit(100).get();
    await Promise.allSettled(admins.docs.map((doc) => createProductNotification({ recipientUserId: doc.id, type: "mentorship_feedback", title: "Mentorship feedback needs review", message: "A reference, report, or correction request requires moderation.", actionUrl: "/admin/mentorships" })));
  }
  return serializeMentorshipFeedback(feedbackId, result.data, { viewerId: actor.uid });
}

export async function moderateMentorshipFeedback({ feedbackId, admin, moderationStatus, adminNotes = "", db = adminDb, now = new Date() }) {
  if (!admin?.uid || !admin.admin) throw workflowError("Platform admin access required", "admin_required", 403);
  if (!["approved", "removed"].includes(moderationStatus)) throw workflowError("Unsupported moderation status", "validation_error");
  const ref = db.collection("mentorship_feedback").doc(feedbackId);
  const auditRef = db.collection("mentorship_feedback_audit").doc();
  const result = await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(ref);
    if (!doc.exists) throw workflowError("Mentorship feedback not found", "not_found", 404);
    const data = doc.data();
    const update = {
      moderationStatus,
      mentorShowcase: moderationStatus === "removed" ? false : data.mentorShowcase === true,
      reportStatus: data.reportStatus === "reported" ? (moderationStatus === "removed" ? "upheld" : "dismissed") : data.reportStatus || "none",
      correctionStatus: data.correctionStatus === "requested" ? (moderationStatus === "removed" ? "upheld" : "resolved") : data.correctionStatus || "none",
      adminNotes: String(adminNotes || "").trim().slice(0, 5000),
      moderatedBy: admin.uid,
      moderatedAt: now,
      updatedAt: now,
    };
    transaction.update(ref, update);
    transaction.create(auditRef, {
      feedbackId,
      engagementId: data.engagementId,
      action: `feedback.moderated_${moderationStatus}`,
      actorId: admin.uid,
      target: { type: "mentorship_feedback", id: feedbackId },
      previousValue: { moderationStatus: data.moderationStatus, reportStatus: data.reportStatus || "none", correctionStatus: data.correctionStatus || "none", mentorShowcase: data.mentorShowcase === true },
      newValue: { moderationStatus: update.moderationStatus, reportStatus: update.reportStatus, correctionStatus: update.correctionStatus, mentorShowcase: update.mentorShowcase },
      reason: update.adminNotes || "Administrator moderation decision",
      createdAt: now,
    });
    return { ...data, ...update };
  });
  const notifications = [
    notifyFeedback(result.authorId, `${feedbackId}:moderated:${moderationStatus}`, "Mentorship feedback moderation updated", `Your feedback moderation status is now ${moderationStatus}.`),
  ];
  if (result.recipientId !== result.authorId) notifications.push(notifyFeedback(result.recipientId, `${feedbackId}:moderated:${moderationStatus}:recipient`, "Mentorship feedback moderation updated", `Feedback connected to your mentorship is now ${moderationStatus}.`));
  await Promise.allSettled(notifications);
  return serializeMentorshipFeedback(feedbackId, result, { admin: true });
}

export async function listParticipantFeedback(userId, { db = adminDb } = {}) {
  const [asStudent, asMentor] = await Promise.all([
    db.collection("mentorship_feedback").where("studentId", "==", userId).limit(200).get(),
    db.collection("mentorship_feedback").where("mentorId", "==", userId).limit(200).get(),
  ]);
  const docs = new Map([...asStudent.docs, ...asMentor.docs].map((doc) => [doc.id, doc]));
  return [...docs.values()].map((doc) => serializeMentorshipFeedback(doc.id, doc.data(), { viewerId: userId })).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function listPublicMentorReferences(mentorId, { db = adminDb } = {}) {
  const snapshot = await db.collection("mentorship_feedback").where("mentorId", "==", mentorId).limit(100).get();
  return snapshot.docs.map((doc) => toPublicMentorReference(doc.data())).filter(Boolean).sort((a, b) => (b.sharedAt || "").localeCompare(a.sharedAt || ""));
}
