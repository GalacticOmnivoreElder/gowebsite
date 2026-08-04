// @ts-check

import { adminDb } from "@/lib/firebase-admin";
import { createProductNotification } from "@/lib/product-notifications";
import { enqueueEmailEventForUsers } from "@/lib/email";
import { isMentorProfileComplete, toPublicMentorProfileDto } from "@/lib/mentor-profiles";
import { getFeedbackEligibility } from "@/lib/mentorship-feedback";
import { listParticipantFeedback } from "@/lib/mentorship-feedback-service";
import {
  ACTIVE_ENGAGEMENT_STATUSES,
  ACTIVE_REQUEST_STATUSES,
  addWorkingDays,
  cleanMentorshipRequest,
  cleanTimeProposals,
  mentorshipEngagementId,
  mentorshipRequestId,
  scoreMentorCompatibility,
  serializeMentorshipEngagement,
  serializeMentorshipRequest,
} from "@/lib/mentorship";

function workflowError(message, code, status = 400) {
  return Object.assign(new Error(message), { code, status });
}

function displayName(userData = {}) {
  return userData.displayName || userData.username || userData.name || "GO member";
}

function requestLockRef(db, studentId) {
  return db.collection("mentorship_active_requests").doc(studentId);
}

function engagementLockRef(db, studentId) {
  return db.collection("mentorship_active_engagements").doc(studentId);
}

function requestOverrideRef(db, studentId) {
  return db.collection("mentorship_request_overrides").doc(studentId);
}

function activeRequestIds(lockData = {}) {
  if (Array.isArray(lockData.requestIds)) return lockData.requestIds.filter(Boolean);
  return lockData.requestId ? [lockData.requestId] : [];
}

function releaseRequestLock(transaction, lock, lockDoc, requestId, now) {
  if (!lockDoc.exists) return;
  const remaining = activeRequestIds(lockDoc.data()).filter((id) => id !== requestId);
  if (!remaining.length) {
    transaction.delete(lock);
    return;
  }
  transaction.set(lock, { requestId: remaining[0], requestIds: remaining, updatedAt: now }, { merge: true });
}

async function communicate(items) {
  await Promise.allSettled(items.flatMap((item) => [
    createProductNotification({
      recipientUserId: item.userId,
      type: item.type,
      title: item.title,
      message: item.message,
      actionUrl: item.actionUrl || "/profile?tab=mentorships",
    }),
    enqueueEmailEventForUsers({
      type: item.emailType,
      eventId: item.eventId,
      userIds: [item.userId],
      data: { title: item.title, message: item.message },
      scheduledFor: null,
    }),
  ]));
}

export async function suggestCompatibleMentors(requestInput, { db = adminDb } = {}) {
  const request = cleanMentorshipRequest(requestInput);
  const [users, activeEngagements] = await Promise.all([
    db.collection("users").where("mentorStatus", "==", "approved").limit(200).get(),
    db.collection("mentorship_engagements").where("status", "in", ACTIVE_ENGAGEMENT_STATUSES).limit(1000).get(),
  ]);
  const counts = new Map();
  activeEngagements.docs.forEach((doc) => counts.set(doc.data().mentorId, (counts.get(doc.data().mentorId) || 0) + 1));
  const eligible = users.docs.filter((doc) => doc.data().mentorPublicProfileEnabled === true);
  const suggestions = await Promise.all(eligible.map(async (userDoc) => {
    const [profileDoc, availabilityDoc] = await Promise.all([
      db.collection("mentor_profiles").doc(userDoc.id).get(),
      db.collection("mentor_availability").doc(userDoc.id).get(),
    ]);
    if (!profileDoc.exists || !availabilityDoc.exists || !isMentorProfileComplete(profileDoc.data())) return null;
    const compatibility = scoreMentorCompatibility(request, profileDoc.data(), availabilityDoc.data(), counts.get(userDoc.id) || 0);
    if (!compatibility || compatibility.score <= 0) return null;
    return { mentor: toPublicMentorProfileDto(userDoc.id, profileDoc.data()), ...compatibility };
  }));
  return suggestions.filter(Boolean).sort((left, right) => right.score - left.score || left.mentor.displayName.localeCompare(right.mentor.displayName)).slice(0, 20);
}

export async function createMentorshipRequest({
  student,
  input,
  targetMentorId = null,
  assistanceRequested = false,
  responseWorkingDays = 5,
  overrideLimit = false,
  db = adminDb,
  now = new Date(),
}) {
  if (!student?.uid) throw workflowError("Authentication required", "authentication_required", 401);
  if (!targetMentorId && !assistanceRequested) throw workflowError("Choose one mentor or request GO assistance", "mentor_choice_required");
  const clean = cleanMentorshipRequest(input);
  const id = mentorshipRequestId(student.uid);
  const requestRef = db.collection("mentorship_requests").doc(id);
  const result = await db.runTransaction(async (transaction) => {
    const lock = requestLockRef(db, student.uid);
    const engagementLock = engagementLockRef(db, student.uid);
    const overrideRef = requestOverrideRef(db, student.uid);
    const reads = [transaction.get(lock), transaction.get(engagementLock), transaction.get(overrideRef)];
    let mentorUserRef;
    let mentorProfileRef;
    let mentorAvailabilityRef;
    if (targetMentorId) {
      mentorUserRef = db.collection("users").doc(targetMentorId);
      mentorProfileRef = db.collection("mentor_profiles").doc(targetMentorId);
      mentorAvailabilityRef = db.collection("mentor_availability").doc(targetMentorId);
      reads.push(transaction.get(mentorUserRef), transaction.get(mentorProfileRef), transaction.get(mentorAvailabilityRef));
    }
    const snapshots = await Promise.all(reads);
    const hasPendingRequest = snapshots[0].exists && activeRequestIds(snapshots[0].data()).length > 0;
    const hasActiveEngagement = snapshots[1].exists;
    const overrideRemaining = Math.max(0, Number(snapshots[2].data()?.remaining) || 0);
    const overrideUsed = (hasPendingRequest || hasActiveEngagement) && (overrideLimit || overrideRemaining > 0);
    if (!overrideUsed && hasPendingRequest) throw workflowError("Only one pending mentorship request is allowed", "duplicate_request", 409);
    if (!overrideUsed && hasActiveEngagement) throw workflowError("Only one active mentorship engagement is allowed", "active_engagement_exists", 409);

    let mentorDisplayName = null;
    if (targetMentorId) {
      const mentorUser = snapshots[3];
      const profile = snapshots[4];
      const availability = snapshots[5];
      if (!mentorUser.exists || mentorUser.data().mentorStatus !== "approved" || mentorUser.data().mentorPublicProfileEnabled !== true || !profile.exists || !availability.exists) {
        throw workflowError("The selected mentor is not available", "mentor_unavailable", 409);
      }
      const capacity = scoreMentorCompatibility(clean, profile.data(), availability.data(), Number(profile.data().activeEngagementCount) || 0);
      if (!capacity) throw workflowError("The selected mentor is not accepting requests", "mentor_unavailable", 409);
      mentorDisplayName = profile.data().displayName;
    }

    const responseDeadline = targetMentorId ? addWorkingDays(now, responseWorkingDays) : null;
    const data = {
      ...clean,
      studentId: student.uid,
      studentDisplayName: displayName(student.userData),
      targetMentorId: targetMentorId || null,
      mentorDisplayName,
      assistanceRequested: assistanceRequested === true,
      status: targetMentorId ? "awaiting_mentor_response" : "assistance_requested",
      responseDeadline,
      clarificationQuestion: null,
      clarificationResponse: null,
      limitOverrideUsed: overrideUsed,
      createdAt: now,
      updatedAt: now,
    };
    transaction.create(requestRef, data);
    const requestIds = [...new Set([...activeRequestIds(snapshots[0].data()), id])];
    transaction.set(lock, { requestId: requestIds[0], requestIds, studentId: student.uid, createdAt: snapshots[0].data()?.createdAt || now, updatedAt: now }, { merge: true });
    if (overrideUsed && !overrideLimit) {
      if (overrideRemaining <= 1) transaction.delete(overrideRef);
      else transaction.update(overrideRef, { remaining: overrideRemaining - 1, updatedAt: now });
    }
    return data;
  });

  if (targetMentorId) {
    await communicate([{ userId: targetMentorId, type: "mentor_request", emailType: "mentorship.request_received", eventId: id, title: "New mentorship request", message: `${result.studentDisplayName} requested mentorship in ${result.discipline}.` }]);
  } else {
    await db.collection("admin_audit_events").add({ action: "mentorship.assistance_requested", requestId: id, targetUserId: student.uid, createdAt: now });
  }
  return serializeMentorshipRequest(id, result);
}

export async function respondToMentorshipRequest({ requestId, mentor, action, message = "", responseWorkingDays = 5, db = adminDb, now = new Date() }) {
  if (!mentor?.uid || mentor.userData?.mentorStatus !== "approved") throw workflowError("Approved mentor status is required", "mentor_required", 403);
  if (!["accept", "decline", "clarification"].includes(action)) throw workflowError("Unsupported mentor response", "invalid_action");
  const requestRef = db.collection("mentorship_requests").doc(requestId);
  const result = await db.runTransaction(async (transaction) => {
    const requestDoc = await transaction.get(requestRef);
    if (!requestDoc.exists) throw workflowError("Mentorship request not found", "not_found", 404);
    const request = requestDoc.data();
    if (request.targetMentorId !== mentor.uid) throw workflowError("Mentorship request not found", "not_found", 404);
    if (!["awaiting_mentor_response", "clarification_requested"].includes(request.status)) throw workflowError("This request is no longer awaiting a response", "inactive_request", 409);
    const lock = requestLockRef(db, request.studentId);
    const lockDoc = await transaction.get(lock);
    const deadline = request.responseDeadline?.toDate?.() || (request.responseDeadline ? new Date(request.responseDeadline) : null);
    if (deadline && deadline <= now) {
      transaction.update(requestRef, { status: "expired", expiredAt: now, updatedAt: now });
      releaseRequestLock(transaction, lock, lockDoc, requestId, now);
      return { kind: "expired", request };
    }
    if (action === "clarification") {
      const question = String(message || "").trim().slice(0, 2000);
      if (!question) throw workflowError("A clarification question is required", "validation_error");
      transaction.update(requestRef, { status: "clarification_requested", clarificationQuestion: question, clarificationResponse: null, responseDeadline: addWorkingDays(now, responseWorkingDays), updatedAt: now });
      return { kind: "clarification", request };
    }
    if (action === "decline") {
      transaction.update(requestRef, { status: "declined", responseMessage: String(message || "").trim().slice(0, 1000), respondedAt: now, updatedAt: now });
      releaseRequestLock(transaction, lock, lockDoc, requestId, now);
      return { kind: "declined", request };
    }

    const profileRef = db.collection("mentor_profiles").doc(mentor.uid);
    const studentLock = engagementLockRef(db, request.studentId);
    const [profileDoc, activeEngagement] = await Promise.all([transaction.get(profileRef), transaction.get(studentLock)]);
    if (!profileDoc.exists) throw workflowError("Mentor profile unavailable", "mentor_unavailable", 409);
    const profile = profileDoc.data();
    const activeCount = Math.max(0, Number(profile.activeEngagementCount) || 0);
    const maximum = Math.max(1, Number(profile.maximumActiveStudents) || 1);
    if (activeCount >= maximum) throw workflowError("Mentor capacity is full", "mentor_capacity_full", 409);
    if (activeEngagement.exists) throw workflowError("The student already has an active engagement", "active_engagement_exists", 409);
    const engagementId = mentorshipEngagementId(requestId);
    const engagementRef = db.collection("mentorship_engagements").doc(engagementId);
    const engagement = {
      requestId,
      studentId: request.studentId,
      mentorId: mentor.uid,
      studentDisplayName: request.studentDisplayName,
      mentorDisplayName: request.mentorDisplayName || profile.displayName,
      learningObjective: request.learningObjective,
      discipline: request.discipline,
      status: "scheduling",
      proposedSlots: [],
      agreedSchedule: null,
      completionConfirmations: [],
      cancellation: null,
      createdAt: now,
      updatedAt: now,
    };
    transaction.create(engagementRef, engagement);
    transaction.set(studentLock, { engagementId, studentId: request.studentId, mentorId: mentor.uid, createdAt: now });
    transaction.update(profileRef, { activeEngagementCount: activeCount + 1, updatedAt: now });
    transaction.update(requestRef, { status: "accepted", engagementId, respondedAt: now, updatedAt: now });
    releaseRequestLock(transaction, lock, lockDoc, requestId, now);
    return { kind: "accepted", request, engagementId, engagement };
  });

  const copy = result.kind === "accepted" ? ["Mentorship request accepted", "Your mentor accepted the request. Continue to scheduling."] : result.kind === "declined" ? ["Mentorship request declined", "The mentor declined this request. You may choose another mentor."] : result.kind === "clarification" ? ["Mentor requested clarification", "Open your mentorship dashboard and respond to the mentor's question."] : ["Mentorship request expired", "The response deadline passed. You may choose another mentor."];
  const updates = [{ userId: result.request.studentId, type: "mentor_response", emailType: "mentorship.response", eventId: `${requestId}:${result.kind}`, title: copy[0], message: copy[1] }];
  if (result.kind === "accepted") updates.push({ userId: mentor.uid, type: "mentorship_update", emailType: "mentorship.update", eventId: `${requestId}:accepted:mentor`, title: "Mentorship engagement created", message: "The accepted request is ready for scheduling in your mentorship dashboard." });
  await communicate(updates);
  return result;
}

export async function answerMentorshipClarification({ requestId, studentId, response, responseWorkingDays = 5, db = adminDb, now = new Date() }) {
  const clean = String(response || "").trim().slice(0, 2000);
  if (!clean) throw workflowError("A clarification response is required", "validation_error");
  const ref = db.collection("mentorship_requests").doc(requestId);
  const doc = await ref.get();
  if (!doc.exists || doc.data().studentId !== studentId || doc.data().status !== "clarification_requested") throw workflowError("Clarification request not found", "not_found", 404);
  await ref.update({ status: "awaiting_mentor_response", clarificationResponse: clean, responseDeadline: addWorkingDays(now, responseWorkingDays), updatedAt: now });
  await communicate([{ userId: doc.data().targetMentorId, type: "mentor_response", emailType: "mentorship.response", eventId: `${requestId}:clarified`, title: "Mentorship clarification received", message: "The student responded to your clarification request." }]);
  return { status: "awaiting_mentor_response" };
}

async function releaseEngagement(transaction, db, engagement, now) {
  const profileRef = db.collection("mentor_profiles").doc(engagement.mentorId);
  const profileDoc = await transaction.get(profileRef);
  if (profileDoc.exists) transaction.update(profileRef, { activeEngagementCount: Math.max(0, (Number(profileDoc.data().activeEngagementCount) || 0) - 1), updatedAt: now });
  transaction.delete(engagementLockRef(db, engagement.studentId));
}

export async function updateMentorshipEngagement({ engagementId, actor, action, payload = {}, db = adminDb, now = new Date() }) {
  const actionPayload = /** @type {any} */ (payload);
  const ref = db.collection("mentorship_engagements").doc(engagementId);
  const result = await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(ref);
    if (!doc.exists) throw workflowError("Mentorship engagement not found", "not_found", 404);
    const engagement = doc.data();
    const participant = actor?.admin || actor?.uid === engagement.studentId || actor?.uid === engagement.mentorId;
    if (!participant) throw workflowError("Mentorship engagement not found", "not_found", 404);
    if (!ACTIVE_ENGAGEMENT_STATUSES.includes(engagement.status)) throw workflowError("This engagement is no longer active", "inactive_engagement", 409);

    if (action === "propose_times") {
      if (actor.uid !== engagement.mentorId && !actor.admin) throw workflowError("Only the mentor can propose times", "mentor_required", 403);
      const proposedSlots = cleanTimeProposals(actionPayload.proposedSlots, now);
      transaction.update(ref, { proposedSlots, agreedSchedule: null, status: "scheduling", updatedAt: now });
      return { engagement, recipientId: engagement.studentId, kind: "times_proposed" };
    }
    if (action === "confirm_time") {
      if (actor.uid !== engagement.studentId && !actor.admin) throw workflowError("Only the student can confirm a time", "student_required", 403);
      const index = Number(actionPayload.slotIndex);
      if (!Number.isInteger(index) || !engagement.proposedSlots?.[index]) throw workflowError("Choose a proposed time window", "invalid_time");
      transaction.update(ref, { agreedSchedule: engagement.proposedSlots[index], status: "scheduled", scheduledAt: now, updatedAt: now });
      return { engagement, recipientId: engagement.mentorId, kind: "time_confirmed" };
    }
    if (action === "mark_attended") {
      if (actor.uid !== engagement.mentorId && !actor.admin) throw workflowError("Only the mentor can mark attendance", "mentor_required", 403);
      transaction.update(ref, { status: "active", attendedAt: now, updatedAt: now });
      return { engagement, recipientId: engagement.studentId, kind: "attended" };
    }
    if (action === "complete") {
      const confirmations = new Set(engagement.completionConfirmations || []);
      if (actor.admin) {
        confirmations.add(engagement.studentId); confirmations.add(engagement.mentorId);
      } else confirmations.add(actor.uid);
      const completed = confirmations.has(engagement.studentId) && confirmations.has(engagement.mentorId);
      if (completed) await releaseEngagement(transaction, db, engagement, now);
      transaction.update(ref, { completionConfirmations: [...confirmations], status: completed ? "completed" : engagement.status, completedAt: completed ? now : null, updatedAt: now });
      return { engagement, recipientId: actor.uid === engagement.studentId ? engagement.mentorId : engagement.studentId, kind: completed ? "completed" : "completion_requested" };
    }
    if (action === "cancel") {
      const reason = String(actionPayload.reason || "").trim().slice(0, 1000);
      await releaseEngagement(transaction, db, engagement, now);
      transaction.update(ref, { status: "canceled", cancellation: { actorId: actor.uid, reason, status: "canceled", createdAt: now }, canceledAt: now, updatedAt: now });
      return { engagement, recipientId: actor.uid === engagement.studentId ? engagement.mentorId : engagement.studentId, kind: "canceled" };
    }
    if (action === "mark_missed" && (actor.admin || actor.uid === engagement.mentorId)) {
      await releaseEngagement(transaction, db, engagement, now);
      transaction.update(ref, { status: "missed", missedAt: now, updatedAt: now });
      return { engagement, recipientId: engagement.studentId, kind: "missed" };
    }
    throw workflowError("Unsupported engagement action", "invalid_action");
  });

  const titles = { times_proposed: "Mentor proposed session times", time_confirmed: "Mentorship time confirmed", attended: "Mentorship session marked attended", completion_requested: "Mentorship completion confirmation requested", completed: "Mentorship completed", canceled: "Mentorship canceled", missed: "Mentorship session marked missed" };
  await communicate([{ userId: result.recipientId, type: result.kind.includes("time") ? "mentorship_scheduling" : "mentorship_update", emailType: result.kind.includes("time") ? "mentorship.scheduling" : "mentorship.update", eventId: `${engagementId}:${result.kind}:${now.toISOString()}`, title: titles[result.kind], message: titles[result.kind] }]);
  return { status: result.kind };
}

export async function getMentorshipDashboard(user, { db = adminDb, includeFeedback = false, feedbackDeadlineDays = 14 } = {}) {
  if (!user?.uid) throw workflowError("Authentication required", "authentication_required", 401);
  const [studentRequests, mentorRequests, studentEngagements, mentorEngagements, concerns, feedback] = await Promise.all([
    db.collection("mentorship_requests").where("studentId", "==", user.uid).limit(100).get(),
    db.collection("mentorship_requests").where("targetMentorId", "==", user.uid).limit(100).get(),
    db.collection("mentorship_engagements").where("studentId", "==", user.uid).limit(100).get(),
    db.collection("mentorship_engagements").where("mentorId", "==", user.uid).limit(100).get(),
    db.collection("mentorship_concerns").where("reporterId", "==", user.uid).limit(100).get(),
    includeFeedback ? listParticipantFeedback(user.uid, { db }) : Promise.resolve([]),
  ]);
  const requests = new Map([...studentRequests.docs, ...mentorRequests.docs].map((doc) => [doc.id, serializeMentorshipRequest(doc.id, doc.data())]));
  const engagementDocs = new Map([...studentEngagements.docs, ...mentorEngagements.docs].map((doc) => [doc.id, doc]));
  const engagements = new Map([...engagementDocs.values()].map((doc) => [doc.id, {
    ...serializeMentorshipEngagement(doc.id, doc.data(), { includePrivateSchedule: true }),
    feedbackEligibility: includeFeedback
      ? getFeedbackEligibility(doc.data(), new Date(), feedbackDeadlineDays)
      : { eligible: false, reason: "feature_disabled", deadline: null },
  }]));
  return {
    requests: [...requests.values()].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    engagements: [...engagements.values()].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    concerns: concerns.docs.map((doc) => ({ id: doc.id, engagementId: doc.data().engagementId, status: doc.data().status, createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null })),
    feedbackEnabled: includeFeedback,
    feedback,
  };
}

export async function processExpiredMentorRequests({ db = adminDb, now = new Date(), limit = 100 } = {}) {
  const snapshot = await db.collection("mentorship_requests").where("status", "in", ["awaiting_mentor_response", "clarification_requested"]).where("responseDeadline", "<=", now).limit(limit).get();
  let expired = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    await db.runTransaction(async (transaction) => {
      const current = await transaction.get(doc.ref);
      if (!current.exists || current.data().status !== "awaiting_mentor_response") return;
      const lock = requestLockRef(db, current.data().studentId);
      const lockDoc = await transaction.get(lock);
      transaction.update(doc.ref, { status: "expired", expiredAt: now, updatedAt: now });
      releaseRequestLock(transaction, lock, lockDoc, doc.id, now);
      expired += 1;
    });
    await communicate([{ userId: data.studentId, type: "mentor_response", emailType: "mentorship.response", eventId: `${doc.id}:expired`, title: "Mentorship request expired", message: "The mentor response deadline passed. You can choose another mentor." }]);
  }
  return { scanned: snapshot.size, expired };
}
