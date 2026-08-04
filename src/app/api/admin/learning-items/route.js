export const dynamic = "force-dynamic";

import { getRequestUser } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";
import { cleanLearningItem, serializeLearningDate } from "@/lib/learning-items";

async function requireAdmin(request) {
  const user = await getRequestUser(request);
  if (!user) return { response: Response.json({ error: "Authentication required" }, { status: 401 }) };
  if (!user.admin) return { response: Response.json({ error: "Platform admin access required" }, { status: 403 }) };
  return { user };
}

function serializeAdminItem(id, data) {
  return {
    id,
    ...data,
    startsAt: serializeLearningDate(data.startsAt),
    endsAt: serializeLearningDate(data.endsAt),
    enrollmentOpensAt: serializeLearningDate(data.enrollmentOpensAt),
    enrollmentClosesAt: serializeLearningDate(data.enrollmentClosesAt),
    cancellationDeadline: serializeLearningDate(data.cancellationDeadline),
    createdAt: serializeLearningDate(data.createdAt),
    updatedAt: serializeLearningDate(data.updatedAt),
  };
}

export async function GET(request) {
  const gate = await requireAdmin(request);
  if (gate.response) return gate.response;
  const snapshot = await adminDb.collection("learning_items").get();
  return Response.json(snapshot.docs.map((doc) => serializeAdminItem(doc.id, doc.data())));
}

export async function POST(request) {
  const gate = await requireAdmin(request);
  if (gate.response) return gate.response;
  try {
    const body = await request.json();
    const id = String(body.id || "").trim() || adminDb.collection("learning_items").doc().id;
    const ref = adminDb.collection("learning_items").doc(id);
    const previousDoc = await ref.get();
    const previous = previousDoc.exists ? previousDoc.data() : {};
    const clean = cleanLearningItem({ ...previous, ...body, confirmedCount: previous.confirmedCount, reservedCount: previous.reservedCount, waitlistCount: previous.waitlistCount });
    const now = new Date();
    const data = {
      ...clean,
      confirmedCount: Math.max(0, Number(previous.confirmedCount) || 0),
      reservedCount: Math.max(0, Number(previous.reservedCount) || 0),
      waitlistCount: Math.max(0, Number(previous.waitlistCount) || 0),
      createdAt: previous.createdAt || now,
      updatedAt: now,
      lastModifiedBy: gate.user.uid,
    };
    const auditRef = adminDb.collection("admin_audit_events").doc();
    const batch = adminDb.batch();
    batch.set(ref, data, { merge: true });
    batch.create(auditRef, {
      action: "learning_item.saved",
      actorId: gate.user.uid,
      target: { type: "learning_item", id },
      itemId: id,
      previousValue: previousDoc.exists ? { status: previous.status || "draft", accessType: previous.accessType || null } : null,
      newValue: { status: data.status, accessType: data.accessType, title: data.title, slug: data.slug },
      reason: String(body.reason || "Learning item saved through the administrator interface").trim().slice(0, 2000),
      createdAt: now,
    });
    await batch.commit();
    return Response.json(serializeAdminItem(id, data), { status: previousDoc.exists ? 200 : 201 });
  } catch (error) {
    return Response.json({ error: error.code === "validation_error" ? error.message : "Failed to save learning item" }, { status: error.code === "validation_error" ? 400 : 500 });
  }
}
