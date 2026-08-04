export const dynamic = "force-dynamic";

import { getRequestUser } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";

const REVIEW_STATES = ["pending", "in_review", "cleared", "changes_required"];
const CHECKLIST_KEYS = ["files", "contributorRights", "license", "compatibility", "previewImage", "downloadUrl", "entitlement", "supportStatus"];

async function requireAdmin(request) {
  const user = await getRequestUser(request);
  if (!user) return { response: Response.json({ error: "Authentication required" }, { status: 401 }) };
  if (!user.admin) return { response: Response.json({ error: "Platform admin access required" }, { status: 403 }) };
  return { user };
}

export async function GET(request) {
  const gate = await requireAdmin(request);
  if (gate.response) return gate.response;
  const search = new URL(request.url).searchParams;
  const snapshot = await adminDb.collection("packages").get();
  const contains = (value, query) => !query || String(value || "").toLowerCase().includes(query.toLowerCase());
  const resources = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((resource) =>
    contains(resource.title, search.get("title")) &&
    contains(`${resource.month || ""} ${resource.year || ""}`, search.get("date")) &&
    (!search.get("status") || resource.status === search.get("status")) &&
    contains(resource.contributorName, search.get("contributor")) &&
    contains(resource.id, search.get("id"))
  ).map((resource) => ({ id: resource.id, title: resource.title, month: resource.month || "", year: resource.year || "", status: resource.status || "draft", contributorName: resource.contributorName || "", reviewState: resource.reviewState || "pending", reviewChecklist: resource.reviewChecklist || {}, currentSupportStatus: resource.currentSupportStatus || "", updatedAt: resource.updatedAt?.toDate?.()?.toISOString() || null }));
  return Response.json({ resources }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request) {
  const gate = await requireAdmin(request);
  if (gate.response) return gate.response;
  const body = await request.json().catch(() => ({}));
  if (!["save_review", "mark_legacy"].includes(body.action)) return Response.json({ error: "Unsupported resource-review action" }, { status: 400 });
  const ref = adminDb.collection("packages").doc(String(body.resourceId || ""));
  const doc = await ref.get();
  if (!doc.exists) return Response.json({ error: "Resource not found" }, { status: 404 });
  const now = new Date();
  const update = { updatedAt: now, legacyReviewedBy: gate.user.uid };
  if (body.reviewState !== undefined) {
    if (!REVIEW_STATES.includes(body.reviewState)) return Response.json({ error: "Unsupported review state" }, { status: 400 });
    update.reviewState = body.reviewState;
  }
  if (body.reviewChecklist && typeof body.reviewChecklist === "object") update.reviewChecklist = Object.fromEntries(CHECKLIST_KEYS.map((key) => [key, body.reviewChecklist[key] === true]));
  if (body.currentSupportStatus !== undefined) update.currentSupportStatus = String(body.currentSupportStatus || "").trim().slice(0, 1000);
  const resultingState = update.reviewState || doc.data().reviewState || "pending";
  const resultingChecklist = update.reviewChecklist || doc.data().reviewChecklist || {};
  const reason = String(body.reason || "").trim().slice(0, 2000);
  if (!reason) return Response.json({ error: "A reason is required for resource review changes" }, { status: 400 });
  if (body.action === "mark_legacy") {
    if (resultingState !== "cleared" || !CHECKLIST_KEYS.every((key) => resultingChecklist[key] === true)) return Response.json({ error: "Clear the review and complete every checklist item before marking this resource Legacy" }, { status: 409 });
    update.status = "legacy";
  }
  const auditRef = adminDb.collection("admin_audit_events").doc();
  const batch = adminDb.batch();
  batch.update(ref, update);
  batch.create(auditRef, {
    action: body.action === "mark_legacy" ? "resource.marked_legacy" : "resource.legacy_review_updated",
    actorId: gate.user.uid,
    target: { type: "resource", id: doc.id },
    previousValue: { status: doc.data().status || "draft", reviewState: doc.data().reviewState || "pending", reviewChecklist: doc.data().reviewChecklist || {}, currentSupportStatus: doc.data().currentSupportStatus || "" },
    newValue: { status: update.status || doc.data().status || "draft", reviewState: resultingState, reviewChecklist: resultingChecklist, currentSupportStatus: update.currentSupportStatus ?? doc.data().currentSupportStatus ?? "" },
    reason,
    createdAt: now,
  });
  await batch.commit();
  return Response.json({ id: doc.id, status: update.status || doc.data().status, reviewState: update.reviewState || doc.data().reviewState || "pending" });
}
