// @ts-check

export const dynamic = "force-dynamic";

import crypto from "crypto";
import { adminDb } from "@/lib/firebase-admin";
import { getRequestUser } from "@/lib/auth-utils";
import { cleanLearningItem, ENROLLMENT_STATES, isLearningManager, serializeLearningDate } from "@/lib/learning-items";
import { cancelLearningEnrollment, offerNextWaitlisted } from "@/lib/learning-enrollment";
import { addProductNotificationToBatch, createProductNotification } from "@/lib/product-notifications";
import { enqueueEmailEventForUsers } from "@/lib/email";
import { getProductConfig } from "@/lib/product-config";

async function context(request, slug) {
  const user = await getRequestUser(request);
  if (!user) return { response: Response.json({ error: "Authentication required" }, { status: 401 }) };
  const query = await adminDb.collection("learning_items").where("slug", "==", slug).limit(1).get();
  if (query.empty) return { response: Response.json({ error: "Learning item not found" }, { status: 404 }) };
  const doc = query.docs[0];
  const item = { id: doc.id, ...doc.data() };
  if (!isLearningManager(item, user)) return { response: Response.json({ error: "Learning manager access required" }, { status: 403 }) };
  return { user, item, ref: doc.ref };
}

function serializeParticipant(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    userId: data.userId,
    displayName: data.participantDisplayName || "GO participant",
    profileUrl: `/user/${encodeURIComponent(data.userId)}`,
    state: data.state,
    enrollmentDate: serializeLearningDate(data.enrolledAt || data.createdAt),
    attendanceState: ["attended", "did_not_attend"].includes(data.state) ? data.state : null,
    completionState: data.state === "completed" ? "completed" : null,
    accessibilityAnswers: data.accessibilityAnswers || {},
    waitlistOfferStatus: data.waitlistOfferStatus || null,
    waitlistOfferExpiresAt: serializeLearningDate(data.waitlistOfferExpiresAt),
  };
}

export async function GET(request, { params }) {
  const { slug } = await params;
  const gate = await context(request, slug);
  if (gate.response) return gate.response;
  const snapshot = await adminDb.collection("learning_enrollments").where("itemId", "==", gate.item.id).get();
  return Response.json({
    item: { id: gate.item.id, slug: gate.item.slug, title: gate.item.title, customQuestions: gate.item.customQuestions || [] },
    participants: snapshot.docs.map(serializeParticipant).sort((a, b) => String(b.enrollmentDate).localeCompare(String(a.enrollmentDate))),
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request, { params }) {
  const { slug } = await params;
  const gate = await context(request, slug);
  if (gate.response) return gate.response;
  const body = await request.json().catch(() => ({}));
  try {
    const cleaned = cleanLearningItem({ ...gate.item, customQuestions: body.customQuestions });
    await gate.ref.update({ customQuestions: cleaned.customQuestions, updatedAt: new Date(), lastModifiedBy: gate.user.uid });
    return Response.json({ customQuestions: cleaned.customQuestions });
  } catch (error) {
    return Response.json({ error: error.message }, { status: error.code === "validation_error" ? 400 : 500 });
  }
}

export async function PATCH(request, { params }) {
  const { slug } = await params;
  const gate = await context(request, slug);
  if (gate.response) return gate.response;
  const body = await request.json().catch(() => ({}));
  const enrollmentId = String(body.enrollmentId || "").trim();
  const state = String(body.state || "").trim();
  if (!enrollmentId || !ENROLLMENT_STATES.includes(state)) {
    return Response.json({ error: "A valid enrollment and state are required" }, { status: 400 });
  }
  if (state === "canceled_by_participant") {
    return Response.json({ error: "Participant cancellations must use the self-service cancellation route" }, { status: 400 });
  }
  const enrollmentRef = adminDb.collection("learning_enrollments").doc(enrollmentId);
  const enrollmentDoc = await enrollmentRef.get();
  if (!enrollmentDoc.exists || enrollmentDoc.data().itemId !== gate.item.id) return Response.json({ error: "Enrollment not found" }, { status: 404 });
  if (state === "canceled_by_organizer") {
    try {
      return Response.json(await cancelLearningEnrollment({ itemId: gate.item.id, userId: enrollmentDoc.data().userId, organizer: true }));
    } catch (error) {
      return Response.json({ error: error.message }, { status: error.status || 500 });
    }
  }

  try {
    const updateResult = await adminDb.runTransaction(async (transaction) => {
      const [currentDoc, itemDoc] = await Promise.all([transaction.get(enrollmentRef), transaction.get(gate.ref)]);
      if (!currentDoc.exists || !itemDoc.exists) throw new Error("Enrollment unavailable");
      const current = currentDoc.data();
      const item = itemDoc.data();
      const auditRef = adminDb.collection("admin_audit_events").doc();
      const now = new Date();
      const capacityStates = new Set(["confirmed", "attended", "did_not_attend", "completed"]);
      const currentUsesCapacity = capacityStates.has(current.state);
      const targetUsesCapacity = capacityStates.has(state);
      if ((!currentUsesCapacity && ["attended", "did_not_attend", "completed"].includes(state))
        || (currentUsesCapacity && state === "waitlisted")) {
        throw Object.assign(new Error("That participant state transition is not allowed"), {
          code: "invalid_transition",
        });
      }
      const confirmed = Math.max(0, Number(item.confirmedCount) || 0);
      const reserved = Math.max(0, Number(item.reservedCount) || 0);
      const waitlisted = Math.max(0, Number(item.waitlistCount) || 0);
      const currentWaitlisted = current.state === "waitlisted";
      const targetWaitlisted = state === "waitlisted";
      const usesReservation = currentWaitlisted && current.waitlistOfferStatus === "offered";
      const itemUpdates = { updatedAt: now };
      let releasedCapacity = false;
      if (!currentUsesCapacity && targetUsesCapacity) {
        if (Number.isInteger(item.capacity) && confirmed + reserved - (usesReservation ? 1 : 0) >= item.capacity) {
          throw Object.assign(new Error("No capacity is available"), { code: "capacity_full" });
        }
        itemUpdates.confirmedCount = confirmed + 1;
      } else if (currentUsesCapacity && !targetUsesCapacity) {
        itemUpdates.confirmedCount = Math.max(0, confirmed - 1);
        releasedCapacity = true;
      }

      if (currentWaitlisted && !targetWaitlisted) {
        itemUpdates.waitlistCount = Math.max(0, waitlisted - 1);
        if (usesReservation) {
          itemUpdates.reservedCount = Math.max(0, reserved - 1);
          releasedCapacity = !targetUsesCapacity;
        }
      } else if (!currentWaitlisted && targetWaitlisted) {
        itemUpdates.waitlistCount = waitlisted + 1;
      }
      transaction.update(gate.ref, itemUpdates);
      transaction.update(enrollmentRef, {
        state,
        updatedAt: now,
        lastUpdatedBy: gate.user.uid,
        ...(currentWaitlisted && !targetWaitlisted
          ? { waitlistOfferStatus: targetUsesCapacity ? "accepted" : "removed", waitlistOfferExpiresAt: null }
          : {}),
        ...(!currentWaitlisted && targetWaitlisted
          ? { waitlistOfferStatus: null, waitlistOfferExpiresAt: null }
          : {}),
      });
      if (["attended", "did_not_attend", "completed"].includes(state) || ["attended", "did_not_attend", "completed"].includes(current.state)) {
        transaction.create(auditRef, {
          action: "learning_enrollment.attendance_or_completion_updated",
          actorId: gate.user.uid,
          target: { type: "learning_enrollment", id: enrollmentId },
          previousValue: { state: current.state },
          newValue: { state },
          reason: String(body.reason || "Participant attendance or completion updated").trim().slice(0, 2000),
          createdAt: now,
        });
      }
      return { userId: current.userId, releasedCapacity };
    });
    if (updateResult.releasedCapacity) {
      await offerNextWaitlisted({ itemId: gate.item.id });
    }
    const communication = state === "confirmed"
      ? {
          type: "course_enrollment",
          title: "Enrollment confirmed",
          message: `Your place is confirmed for ${gate.item.title}.`,
          emailType: "learning.enrollment_confirmed",
        }
      : state === "declined"
        ? {
            type: "course_update",
            title: "Enrollment request update",
            message: `Your enrollment request for ${gate.item.title} was not approved.`,
          }
        : null;
    if (communication) {
      /** @type {Promise<unknown>[]} */
      const jobs = [createProductNotification({
        recipientUserId: updateResult.userId,
        type: communication.type,
        title: communication.title,
        message: communication.message,
        actionUrl: `/education/${encodeURIComponent(gate.item.slug)}`,
      })];
      if (communication.emailType) {
        jobs.push(enqueueEmailEventForUsers({
          type: communication.emailType,
          eventId: `${enrollmentId}:${state}`,
          userIds: [updateResult.userId],
          data: { learningTitle: gate.item.title, learningSlug: gate.item.slug, state },
          scheduledFor: null,
        }));
      }
      await Promise.allSettled(jobs);
    }
    return Response.json({ id: enrollmentId, state });
  } catch (error) {
    return Response.json(
      { error: error.message, code: error.code || "participant_update_failed" },
      { status: ["capacity_full", "invalid_transition"].includes(error.code) ? 409 : 500 }
    );
  }
}

export async function POST(request, { params }) {
  if (!getProductConfig().featureFlags.userNotifications) {
    return Response.json({ error: "Course announcements are not available yet" }, { status: 503 });
  }
  const { slug } = await params;
  const gate = await context(request, slug);
  if (gate.response) return gate.response;
  const body = await request.json().catch(() => ({}));
  const subject = String(body.subject || "").trim().slice(0, 160);
  const message = String(body.message || "").trim().slice(0, 1500);
  const audience = String(body.audience || "confirmed");
  if (!subject || !message) return Response.json({ error: "Announcement subject and message are required" }, { status: 400 });

  const snapshot = await adminDb.collection("learning_enrollments").where("itemId", "==", gate.item.id).get();
  const selectedIds = new Set(Array.isArray(body.selectedEnrollmentIds) ? body.selectedEnrollmentIds.slice(0, 400) : []);
  const audienceStates = {
    confirmed: new Set(["confirmed"]),
    waitlisted: new Set(["waitlisted"]),
    attended: new Set(["attended"]),
    did_not_attend: new Set(["did_not_attend"]),
    completed: new Set(["completed"]),
  };
  const recipients = snapshot.docs
    .filter((doc) => audience === "selected" ? selectedIds.has(doc.id) : audienceStates[audience]?.has(doc.data().state))
    .slice(0, 400);
  if (!recipients.length) return Response.json({ error: "No participants match this announcement audience" }, { status: 400 });

  const now = new Date();
  const batch = adminDb.batch();
  recipients.forEach((doc) => addProductNotificationToBatch(batch, {
    recipientUserId: doc.data().userId,
    type: "course_update",
    title: subject,
    message,
    actionUrl: `/education/${encodeURIComponent(gate.item.slug)}`,
  }, now));
  await batch.commit();

  let emailQueued = true;
  try {
    await enqueueEmailEventForUsers({
      type: "learning.announcement",
      eventId: `${gate.item.id}:${crypto.randomUUID()}`,
      userIds: recipients.map((doc) => doc.data().userId),
      data: { learningTitle: gate.item.title, learningSlug: gate.item.slug, subject, message },
      scheduledFor: null,
    });
  } catch (error) {
    emailQueued = false;
    console.error("learning_announcement_email_queue_failed", { itemId: gate.item.id, code: error?.code || "unknown" });
  }
  return Response.json({ notified: recipients.length, emailQueued });
}
