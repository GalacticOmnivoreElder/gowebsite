export const dynamic = "force-dynamic";

import { getRequestUser } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";
import { canListLearningItem } from "@/lib/learning-items";
import { isPublicVideoBundleStatus } from "@/lib/content-visibility";
import { createProductNotification } from "@/lib/product-notifications";
import { enqueueEmailEventForUsers } from "@/lib/email";
import { isTrainingAssignmentActive, serializeTrainingAssignment, trainingAssignmentId, TRAINING_CONTENT_TYPES } from "@/lib/training-assignments";

async function requireAdmin(request) {
  const user = await getRequestUser(request);
  if (!user) return { response: Response.json({ error: "Authentication required" }, { status: 401 }) };
  if (!user.admin) return { response: Response.json({ error: "Platform admin access required" }, { status: 403 }) };
  return { user };
}

function asDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request) {
  const gate = await requireAdmin(request);
  if (gate.response) return gate.response;
  const [assignmentSnapshot, userSnapshot, learningSnapshot, videoSnapshot] = await Promise.all([
    adminDb.collection("training_assignments").get(),
    adminDb.collection("users").get(),
    adminDb.collection("learning_items").get(),
    adminDb.collection("video_bundles").get(),
  ]);
  return Response.json({
    assignments: assignmentSnapshot.docs.map((doc) => serializeTrainingAssignment(doc.id, doc.data())),
    users: userSnapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name || doc.data().displayName || doc.data().username || "GO user",
      email: doc.data().email || "",
      mentorStatus: doc.data().mentorStatus || "none",
    })).sort((left, right) => left.name.localeCompare(right.name)),
    content: [
      ...learningSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter(canListLearningItem).map((item) => ({ id: item.id, contentType: "learning_item", title: item.title, slug: item.slug, status: item.status })),
      ...videoSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((item) => isPublicVideoBundleStatus(item.status)).map((item) => ({ id: item.id, contentType: "video_bundle", title: item.title, slug: item.slug, status: item.status })),
    ],
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request) {
  const gate = await requireAdmin(request);
  if (gate.response) return gate.response;
  const body = await request.json().catch(() => ({}));
  const userId = String(body.userId || "").trim();
  const contentType = String(body.contentType || "").trim();
  const contentId = String(body.contentId || "").trim();
  const reason = String(body.reason || "").trim().slice(0, 1000);
  const expiresAt = asDate(body.expiresAt);
  if (!userId || !TRAINING_CONTENT_TYPES.includes(contentType) || !contentId || !reason) {
    return Response.json({ error: "User, content, and assignment reason are required" }, { status: 400 });
  }
  if (body.expiresAt && (!expiresAt || expiresAt <= new Date())) {
    return Response.json({ error: "Expiry must be a valid future date" }, { status: 400 });
  }
  const collection = contentType === "video_bundle" ? "video_bundles" : "learning_items";
  const [userDoc, contentDoc] = await Promise.all([
    adminDb.collection("users").doc(userId).get(),
    adminDb.collection(collection).doc(contentId).get(),
  ]);
  if (!userDoc.exists || !contentDoc.exists) return Response.json({ error: "User or training content not found" }, { status: 404 });
  const content = contentDoc.data();
  const published = contentType === "video_bundle" ? isPublicVideoBundleStatus(content.status) : canListLearningItem(content);
  if (!published) return Response.json({ error: "Only published or explicitly public learning content can be assigned" }, { status: 409 });

  const id = trainingAssignmentId(userId, contentType, contentId);
  const ref = adminDb.collection("training_assignments").doc(id);
  const previousDoc = await ref.get();
  if (previousDoc.exists && isTrainingAssignmentActive(previousDoc.data())) {
    return Response.json({ error: "This preparation is already actively assigned" }, { status: 409 });
  }
  const now = new Date();
  const data = {
    userId,
    contentType,
    contentId,
    contentTitle: content.title,
    contentSlug: content.slug,
    status: "active",
    reason,
    expiresAt,
    grantedBy: gate.user.uid,
    grantedAt: now,
    completedAt: null,
    revokedAt: null,
    updatedAt: now,
  };
  await ref.set(data, { merge: true });
  await adminDb.collection("admin_audit_events").add({
    action: "training_assignment.granted",
    actorId: gate.user.uid,
    target: { type: "training_assignment", id },
    assignmentId: id,
    targetUserId: userId,
    previousValue: previousDoc.exists ? { status: previousDoc.data().status, expiresAt: previousDoc.data().expiresAt || null } : null,
    newValue: { status: data.status, userId, contentType, contentId, expiresAt },
    reason,
    createdAt: now,
  });
  const actionUrl = contentType === "video_bundle" ? `/video-bundles/${encodeURIComponent(content.slug)}` : `/education/${encodeURIComponent(content.slug)}`;
  await Promise.allSettled([
    createProductNotification({ recipientUserId: userId, type: "training_assignment", title: "Mentor preparation assigned", message: `You have free access to ${content.title}.`, actionUrl }),
    enqueueEmailEventForUsers({ type: "training.assignment", eventId: id, userIds: [userId], data: { contentTitle: content.title, contentSlug: content.slug, contentType }, scheduledFor: null }),
  ]);
  return Response.json(serializeTrainingAssignment(id, data), { status: 201 });
}

export async function DELETE(request) {
  const gate = await requireAdmin(request);
  if (gate.response) return gate.response;
  const body = await request.json().catch(() => ({}));
  const assignmentId = String(body.assignmentId || "").trim();
  if (!assignmentId) return Response.json({ error: "assignmentId is required" }, { status: 400 });
  const ref = adminDb.collection("training_assignments").doc(assignmentId);
  const doc = await ref.get();
  if (!doc.exists) return Response.json({ error: "Training assignment not found" }, { status: 404 });
  const now = new Date();
  await ref.update({ status: "revoked", revokedAt: now, revokedBy: gate.user.uid, updatedAt: now });
  await adminDb.collection("admin_audit_events").add({
    action: "training_assignment.revoked",
    actorId: gate.user.uid,
    target: { type: "training_assignment", id: assignmentId },
    assignmentId,
    targetUserId: doc.data().userId,
    previousValue: { status: doc.data().status, revokedAt: doc.data().revokedAt || null },
    newValue: { status: "revoked", revokedAt: now },
    reason: String(body.reason || "Administrator revoked this training assignment").trim().slice(0, 2000),
    createdAt: now,
  });
  return Response.json({ id: assignmentId, status: "revoked" });
}
