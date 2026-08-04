export const dynamic = "force-dynamic";

import { getRequestUser } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";
import { addWorkingDays, serializeMentorshipEngagement, serializeMentorshipRequest } from "@/lib/mentorship";
import { getMentorshipProductConfig } from "@/lib/product-config";
import { createProductNotification } from "@/lib/product-notifications";
import { updateMentorshipEngagement } from "@/lib/mentorship-service";
import { serializeMentorshipFeedback } from "@/lib/mentorship-feedback";
import { moderateMentorshipFeedback } from "@/lib/mentorship-feedback-service";

async function requireAdmin(request) {
  const user = await getRequestUser(request);
  if (!user) return { response: Response.json({ error: "Authentication required" }, { status: 401 }) };
  if (!user.admin) return { response: Response.json({ error: "Platform admin access required" }, { status: 403 }) };
  return { user };
}

export async function GET(request) {
  const gate = await requireAdmin(request);
  if (gate.response) return gate.response;
  const [requests, engagements, concerns, mentors, overrides, feedback, feedbackAudit] = await Promise.all([
    adminDb.collection("mentorship_requests").limit(500).get(),
    adminDb.collection("mentorship_engagements").limit(500).get(),
    adminDb.collection("mentorship_concerns").limit(500).get(),
    adminDb.collection("users").where("mentorStatus", "==", "approved").limit(200).get(),
    adminDb.collection("mentorship_request_overrides").limit(500).get(),
    adminDb.collection("mentorship_feedback").limit(500).get(),
    adminDb.collection("mentorship_feedback_audit").limit(1000).get(),
  ]);
  return Response.json({
    requests: requests.docs.map((doc) => serializeMentorshipRequest(doc.id, doc.data())),
    engagements: engagements.docs.map((doc) => serializeMentorshipEngagement(doc.id, doc.data(), { includePrivateSchedule: true })),
    concerns: concerns.docs.map((doc) => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null, updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null })),
    mentors: mentors.docs.map((doc) => ({ id: doc.id, name: doc.data().displayName || doc.data().username || doc.data().name || "GO mentor", publicProfileEnabled: doc.data().mentorPublicProfileEnabled === true })),
    requestOverrides: overrides.docs.map((doc) => ({ userId: doc.id, remaining: Math.max(0, Number(doc.data().remaining) || 0) })),
    feedback: feedback.docs.map((doc) => serializeMentorshipFeedback(doc.id, doc.data(), { admin: true })),
    feedbackAudit: feedbackAudit.docs.map((doc) => ({
      id: doc.id,
      feedbackId: doc.data().feedbackId,
      engagementId: doc.data().engagementId,
      action: doc.data().action,
      actorId: doc.data().actorId,
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
    })).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request) {
  const gate = await requireAdmin(request);
  if (gate.response) return gate.response;
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "");
  const now = new Date();
  if (action === "allow_additional_request") {
    const userId = String(body.userId || "").trim();
    if (!userId) return Response.json({ error: "User ID is required" }, { status: 400 });
    const userRef = adminDb.collection("users").doc(userId);
    const overrideRef = adminDb.collection("mentorship_request_overrides").doc(userId);
    const remaining = await adminDb.runTransaction(async (transaction) => {
      const [userDoc, overrideDoc] = await Promise.all([transaction.get(userRef), transaction.get(overrideRef)]);
      if (!userDoc.exists) throw Object.assign(new Error("User not found"), { status: 404 });
      const next = Math.min(10, Math.max(0, Number(overrideDoc.data()?.remaining) || 0) + 1);
      transaction.set(overrideRef, { userId, remaining: next, grantedBy: gate.user.uid, createdAt: overrideDoc.data()?.createdAt || now, updatedAt: now }, { merge: true });
      return next;
    }).catch((error) => error);
    if (remaining instanceof Error) return Response.json({ error: remaining.message }, { status: remaining.status || 500 });
    await createProductNotification({ recipientUserId: userId, type: "mentorship_update", title: "Additional mentorship request allowed", message: "GO granted a one-time exception to the active mentorship request limit.", actionUrl: "/matchmaking" }).catch(() => null);
    return Response.json({ userId, remaining });
  }
  if (action === "assign_mentor") {
    const requestRef = adminDb.collection("mentorship_requests").doc(String(body.requestId || ""));
    const mentorId = String(body.mentorId || "");
    const [requestDoc, mentorDoc, profileDoc, availabilityDoc] = await Promise.all([
      requestRef.get(),
      adminDb.collection("users").doc(mentorId).get(),
      adminDb.collection("mentor_profiles").doc(mentorId).get(),
      adminDb.collection("mentor_availability").doc(mentorId).get(),
    ]);
    if (!requestDoc.exists || requestDoc.data().status !== "assistance_requested") return Response.json({ error: "Assistance request not found" }, { status: 404 });
    if (!mentorDoc.exists || mentorDoc.data().mentorStatus !== "approved" || !profileDoc.exists || !availabilityDoc.exists || availabilityDoc.data().currentlyAcceptingStudents !== true || availabilityDoc.data().temporaryPause === true || (Number(profileDoc.data().activeEngagementCount) || 0) >= Math.max(1, Number(profileDoc.data().maximumActiveStudents) || 1)) return Response.json({ error: "Selected mentor is not available" }, { status: 409 });
    const deadline = addWorkingDays(now, getMentorshipProductConfig().responseDeadlineWorkingDays);
    await requestRef.update({ targetMentorId: mentorId, mentorDisplayName: profileDoc.data().displayName, assistanceRequested: false, status: "awaiting_mentor_response", responseDeadline: deadline, assignedBy: gate.user.uid, assignedAt: now, updatedAt: now });
    await Promise.allSettled([
      createProductNotification({ recipientUserId: mentorId, type: "mentor_request", title: "New mentorship request", message: "GO assigned an eligible mentorship request for your response.", actionUrl: "/profile?tab=mentorships" }),
      createProductNotification({ recipientUserId: requestDoc.data().studentId, type: "mentor_response", title: "Mentor selected", message: "GO selected a mentor and sent your request for review.", actionUrl: "/profile?tab=mentorships" }),
    ]);
    return Response.json({ requestId: requestDoc.id, status: "awaiting_mentor_response" });
  }
  if (action === "resolve_concern") {
    const ref = adminDb.collection("mentorship_concerns").doc(String(body.concernId || ""));
    const doc = await ref.get();
    if (!doc.exists) return Response.json({ error: "Concern not found" }, { status: 404 });
    const status = ["reviewing", "resolved", "dismissed"].includes(body.status) ? body.status : "reviewing";
    await ref.update({ status, adminNotes: String(body.adminNotes || "").trim().slice(0, 5000), reviewedBy: gate.user.uid, updatedAt: now });
    return Response.json({ id: doc.id, status });
  }
  if (action === "engagement_action") {
    return Response.json(await updateMentorshipEngagement({ engagementId: String(body.engagementId || ""), actor: gate.user, action: String(body.engagementAction || ""), payload: body }));
  }
  if (action === "moderate_feedback") {
    try {
      return Response.json(await moderateMentorshipFeedback({
        feedbackId: String(body.feedbackId || ""),
        admin: gate.user,
        moderationStatus: String(body.moderationStatus || ""),
        adminNotes: String(body.adminNotes || ""),
      }));
    } catch (error) {
      return Response.json({ error: error.message || "Feedback moderation could not be saved", code: error.code || "unknown" }, { status: error.status || 500 });
    }
  }
  return Response.json({ error: "Unsupported admin mentorship action" }, { status: 400 });
}
