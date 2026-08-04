// @ts-check

import crypto from "crypto";
import { adminDb } from "@/lib/firebase-admin";
import { hasCommunityContentAccess } from "@/lib/content-entitlements";
import {
  ACTIVE_ENROLLMENT_STATES,
  isActiveEnrollmentState,
  validateEnrollmentAnswers,
} from "@/lib/learning-items";
import { createProductNotification } from "@/lib/product-notifications";
import { enqueueEmailEventForUsers } from "@/lib/email";
import { getLearningProductConfig } from "@/lib/product-config";
import { isTrainingAssignmentActive, trainingAssignmentId } from "@/lib/training-assignments";

export function enrollmentDocumentId(itemId, userId) {
  return crypto
    .createHash("sha256")
    .update(`go-learning-enrollment:v1:${itemId}:${userId}`)
    .digest("hex");
}

function enrollmentError(message, code, status = 400) {
  return Object.assign(new Error(message), { code, status });
}

function asDate(value) {
  if (!value) return null;
  const date = value?.toDate?.() || (value instanceof Date ? value : new Date(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getLearningEligibility(item, user, now = new Date(), { trainingAssigned = false } = {}) {
  if (!user) return { allowed: false, reason: "authentication_required" };
  if (!["enrollment_open", "waitlist_available", "full"].includes(item.status)) {
    return { allowed: false, reason: "enrollment_closed" };
  }
  const opensAt = asDate(item.enrollmentOpensAt);
  const closesAt = asDate(item.enrollmentClosesAt);
  if (opensAt && now < opensAt) return { allowed: false, reason: "enrollment_not_open" };
  if (closesAt && now > closesAt) return { allowed: false, reason: "enrollment_closed" };
  if (trainingAssigned) return { allowed: true, reason: "training_assignment" };

  switch (item.accessType) {
    case "community_member_only":
      return hasCommunityContentAccess(user.userData || {}, { admin: user.admin, now })
        ? { allowed: true }
        : { allowed: false, reason: "community_membership_required" };
    case "invitation_only":
      return user.admin || item.invitedUserIds?.includes(user.uid)
        ? { allowed: true }
        : { allowed: false, reason: "invitation_required" };
    case "free":
    case "administrator_approved":
    case "public_event_registration":
      return { allowed: true };
    default:
      return { allowed: false, reason: "unsupported_access_type" };
  }
}

function stateCommunication(state) {
  if (state === "confirmed") {
    return {
      type: "course_enrollment",
      emailType: "learning.enrollment_confirmed",
      title: "Enrollment confirmed",
      message: "Your place is confirmed.",
    };
  }
  if (state === "waitlisted") {
    return {
      type: "course_enrollment",
      emailType: "learning.waitlisted",
      title: "Added to the waiting list",
      message: "You are on the waiting list. We will notify you if a place opens.",
    };
  }
  return {
    type: "course_enrollment",
    emailType: "learning.enrollment_pending",
    title: "Enrollment request received",
    message: "Your enrollment is waiting for organizer approval.",
  };
}

async function communicateEnrollment({ item, userId, state, eventId }) {
  const copy = stateCommunication(state);
  const actionUrl = `/education/${encodeURIComponent(item.slug)}`;
  const results = await Promise.allSettled([
    createProductNotification({
      recipientUserId: userId,
      type: copy.type,
      title: copy.title,
      message: `${copy.message} ${item.title}`,
      actionUrl,
    }),
    enqueueEmailEventForUsers({
      type: copy.emailType,
      eventId,
      userIds: [userId],
      data: { learningTitle: item.title, learningSlug: item.slug, state },
      scheduledFor: null,
    }),
  ]);
  return results;
}

export async function createLearningEnrollment({ itemId, user, answers = {}, db = adminDb, now = new Date() }) {
  if (!user?.uid) throw enrollmentError("Authentication required", "authentication_required", 401);
  const itemRef = db.collection("learning_items").doc(itemId);
  const enrollmentId = enrollmentDocumentId(itemId, user.uid);
  const enrollmentRef = db.collection("learning_enrollments").doc(enrollmentId);
  const trainingRef = db.collection("training_assignments")
    .doc(trainingAssignmentId(user.uid, "learning_item", itemId));

  const result = await db.runTransaction(async (transaction) => {
    const [itemDoc, existingDoc, trainingDoc] = await Promise.all([
      transaction.get(itemRef),
      transaction.get(enrollmentRef),
      transaction.get(trainingRef),
    ]);
    if (!itemDoc.exists) throw enrollmentError("Learning item unavailable", "not_found", 404);
    const item = { id: itemDoc.id, ...itemDoc.data() };
    const trainingAssigned = trainingDoc.exists && isTrainingAssignmentActive(trainingDoc.data(), now);
    const eligibility = getLearningEligibility(item, user, now, { trainingAssigned });
    if (!eligibility.allowed) throw enrollmentError("Enrollment is not available for this account", eligibility.reason, 403);
    if (existingDoc.exists && isActiveEnrollmentState(existingDoc.data().state)) {
      throw enrollmentError("You already have an active enrollment for this item", "duplicate_enrollment", 409);
    }

    const cleanAnswers = validateEnrollmentAnswers(item.customQuestions || [], answers);
    let state = item.enrollmentMode === "approval" || item.accessType === "administrator_approved"
      ? "pending_approval"
      : "confirmed";
    const confirmedCount = Math.max(0, Number(item.confirmedCount) || 0);
    const reservedCount = Math.max(0, Number(item.reservedCount) || 0);
    const hasCapacity = !Number.isInteger(item.capacity) || confirmedCount + reservedCount < item.capacity;
    if (state === "confirmed" && !hasCapacity) {
      if (!item.waitlistEnabled) throw enrollmentError("This learning item is full", "capacity_full", 409);
      state = "waitlisted";
    }

    const enrollment = {
      itemId,
      itemSlug: item.slug,
      itemTitle: item.title,
      userId: user.uid,
      participantDisplayName:
        user.userData?.username || user.userData?.displayName || user.userData?.name || "GO participant",
      state,
      answers: cleanAnswers,
      accessibilityAnswers: Object.fromEntries(
        (item.customQuestions || [])
          .filter((question) => question.type === "accessibility_request" && cleanAnswers[question.id] !== undefined)
          .map((question) => [question.id, cleanAnswers[question.id]])
      ),
      enrollmentMode: item.enrollmentMode || "automatic",
      trainingAssignmentId: trainingAssigned ? trainingRef.id : null,
      waitlistOfferStatus: null,
      waitlistOfferExpiresAt: null,
      createdAt: existingDoc.exists ? existingDoc.data().createdAt || now : now,
      updatedAt: now,
      enrolledAt: now,
      canceledAt: null,
    };
    transaction.set(enrollmentRef, enrollment);
    if (state === "confirmed") {
      transaction.update(itemRef, { confirmedCount: confirmedCount + 1, updatedAt: now });
    } else if (state === "waitlisted") {
      transaction.update(itemRef, { waitlistCount: Math.max(0, Number(item.waitlistCount) || 0) + 1, updatedAt: now });
    }
    return { enrollment: { id: enrollmentId, ...enrollment }, item };
  });

  await communicateEnrollment({
    item: result.item,
    userId: user.uid,
    state: result.enrollment.state,
    eventId: result.enrollment.id,
  });
  return result.enrollment;
}

export async function offerNextWaitlisted({ itemId, db = adminDb, now = new Date() }) {
  const itemRef = db.collection("learning_items").doc(itemId);
  const offer = await db.runTransaction(async (transaction) => {
    const itemDoc = await transaction.get(itemRef);
    if (!itemDoc.exists) return null;
    const item = { id: itemDoc.id, ...itemDoc.data() };
    const confirmedCount = Math.max(0, Number(item.confirmedCount) || 0);
    const reservedCount = Math.max(0, Number(item.reservedCount) || 0);
    if (Number.isInteger(item.capacity) && confirmedCount + reservedCount >= item.capacity) return null;

    const waitlist = await transaction.get(
      db.collection("learning_enrollments")
        .where("itemId", "==", itemId)
        .where("state", "==", "waitlisted")
        .orderBy("createdAt", "asc")
        .limit(50)
    );
    const candidate = waitlist.docs.find((doc) => !doc.data().waitlistOfferStatus);
    if (!candidate) return null;
    const hours = getLearningProductConfig().waitlistConfirmationHours;
    const expiresAt = new Date(now.getTime() + hours * 60 * 60 * 1000);
    transaction.update(candidate.ref, {
      waitlistOfferStatus: "offered",
      waitlistOfferExpiresAt: expiresAt,
      updatedAt: now,
    });
    transaction.update(itemRef, { reservedCount: reservedCount + 1, updatedAt: now });
    return { enrollmentId: candidate.id, enrollment: candidate.data(), expiresAt, item };
  });

  if (offer) {
    const actionUrl = `/education/${encodeURIComponent(offer.item.slug)}?offer=1`;
    await Promise.allSettled([
      createProductNotification({
        recipientUserId: offer.enrollment.userId,
        type: "waitlist_promotion",
        title: "A learning place is available",
        message: `Confirm your place for ${offer.item.title} before the offer expires.`,
        actionUrl,
      }),
      enqueueEmailEventForUsers({
        type: "learning.waitlist_promoted",
        eventId: `${offer.enrollmentId}:${offer.expiresAt.toISOString()}`,
        userIds: [offer.enrollment.userId],
        data: {
          learningTitle: offer.item.title,
          learningSlug: offer.item.slug,
          expiresAt: offer.expiresAt,
        },
        scheduledFor: null,
      }),
    ]);
  }
  return offer;
}

export async function cancelLearningEnrollment({ itemId, userId, db = adminDb, now = new Date(), organizer = false }) {
  const itemRef = db.collection("learning_items").doc(itemId);
  const enrollmentRef = db.collection("learning_enrollments").doc(enrollmentDocumentId(itemId, userId));
  const result = await db.runTransaction(async (transaction) => {
    const [itemDoc, enrollmentDoc] = await Promise.all([
      transaction.get(itemRef),
      transaction.get(enrollmentRef),
    ]);
    if (!itemDoc.exists || !enrollmentDoc.exists) throw enrollmentError("Enrollment not found", "not_found", 404);
    const item = { id: itemDoc.id, ...itemDoc.data() };
    const enrollment = enrollmentDoc.data();
    if (!organizer) {
      const deadline = asDate(item.cancellationDeadline);
      if (deadline && now > deadline) throw enrollmentError("The self-service cancellation deadline has passed", "cancellation_deadline_passed", 409);
    }
    if (!isActiveEnrollmentState(enrollment.state)) throw enrollmentError("Enrollment is already inactive", "enrollment_inactive", 409);

    const updates = { updatedAt: now };
    let releasedCapacity = false;
    if (["confirmed", "attended", "completed"].includes(enrollment.state)) {
      updates.confirmedCount = Math.max(0, (Number(item.confirmedCount) || 0) - 1);
      releasedCapacity = true;
    }
    if (enrollment.state === "waitlisted") {
      updates.waitlistCount = Math.max(0, (Number(item.waitlistCount) || 0) - 1);
      if (enrollment.waitlistOfferStatus === "offered") {
        updates.reservedCount = Math.max(0, (Number(item.reservedCount) || 0) - 1);
        releasedCapacity = true;
      }
    }
    transaction.update(itemRef, updates);
    transaction.update(enrollmentRef, {
      state: organizer ? "canceled_by_organizer" : "canceled_by_participant",
      canceledAt: now,
      updatedAt: now,
      waitlistOfferStatus: enrollment.waitlistOfferStatus === "offered" ? "canceled" : enrollment.waitlistOfferStatus || null,
    });
    return { item, enrollment, releasedCapacity };
  });

  await Promise.allSettled([
    createProductNotification({
      recipientUserId: userId,
      type: "course_cancellation",
      title: "Enrollment canceled",
      message: `Your enrollment for ${result.item.title} has been canceled.`,
      actionUrl: `/education/${encodeURIComponent(result.item.slug)}`,
    }),
    enqueueEmailEventForUsers({
      type: "learning.enrollment_canceled",
      eventId: `${enrollmentRef.id}:${now.toISOString()}`,
      userIds: [userId],
      data: { learningTitle: result.item.title, learningSlug: result.item.slug },
      scheduledFor: null,
    }),
  ]);
  if (result.releasedCapacity) await offerNextWaitlisted({ itemId, db, now });
  return { state: organizer ? "canceled_by_organizer" : "canceled_by_participant" };
}

export async function confirmWaitlistOffer({ itemId, userId, db = adminDb, now = new Date() }) {
  const itemRef = db.collection("learning_items").doc(itemId);
  const enrollmentRef = db.collection("learning_enrollments").doc(enrollmentDocumentId(itemId, userId));
  const result = await db.runTransaction(async (transaction) => {
    const [itemDoc, enrollmentDoc] = await Promise.all([
      transaction.get(itemRef),
      transaction.get(enrollmentRef),
    ]);
    if (!itemDoc.exists || !enrollmentDoc.exists) throw enrollmentError("Offer unavailable", "not_found", 404);
    const item = { id: itemDoc.id, ...itemDoc.data() };
    const enrollment = enrollmentDoc.data();
    const expiresAt = asDate(enrollment.waitlistOfferExpiresAt);
    if (enrollment.state !== "waitlisted" || enrollment.waitlistOfferStatus !== "offered" || !expiresAt || now > expiresAt) {
      throw enrollmentError("This waiting-list offer has expired", "waitlist_offer_expired", 409);
    }
    transaction.update(enrollmentRef, {
      state: "confirmed",
      waitlistOfferStatus: "accepted",
      confirmedAt: now,
      updatedAt: now,
    });
    transaction.update(itemRef, {
      confirmedCount: Math.max(0, Number(item.confirmedCount) || 0) + 1,
      reservedCount: Math.max(0, Number(item.reservedCount) || 0) - 1,
      waitlistCount: Math.max(0, Number(item.waitlistCount) || 0) - 1,
      updatedAt: now,
    });
    return { state: "confirmed", item };
  });

  await communicateEnrollment({
    item: result.item,
    userId,
    state: "confirmed",
    eventId: `${enrollmentRef.id}:waitlist-confirmed`,
  });
  return { state: result.state };
}

export async function processExpiredWaitlistOffers({ db = adminDb, now = new Date(), limit = 100 } = {}) {
  const snapshot = await db.collection("learning_enrollments")
    .where("state", "==", "waitlisted")
    .where("waitlistOfferStatus", "==", "offered")
    .limit(limit)
    .get();
  let expired = 0;
  const affectedItems = new Set();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const expiresAt = asDate(data.waitlistOfferExpiresAt);
    if (!expiresAt || expiresAt > now) continue;
    const itemRef = db.collection("learning_items").doc(data.itemId);
    await db.runTransaction(async (transaction) => {
      const [current, itemDoc] = await Promise.all([transaction.get(doc.ref), transaction.get(itemRef)]);
      if (!current.exists || !itemDoc.exists) return;
      const currentData = current.data();
      const currentExpiry = asDate(currentData.waitlistOfferExpiresAt);
      if (currentData.waitlistOfferStatus !== "offered" || !currentExpiry || currentExpiry > now) return;
      transaction.update(doc.ref, { waitlistOfferStatus: "expired", updatedAt: now });
      transaction.update(itemRef, {
        reservedCount: Math.max(0, Number(itemDoc.data().reservedCount) || 0) - 1,
        updatedAt: now,
      });
      expired += 1;
      affectedItems.add(data.itemId);
    });
  }
  for (const itemId of affectedItems) await offerNextWaitlisted({ itemId, db, now });
  return { expired, scanned: snapshot.size };
}

export { ACTIVE_ENROLLMENT_STATES };
