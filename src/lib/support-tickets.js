// @ts-check

import crypto from "crypto";
import { adminDb } from "@/lib/firebase-admin";
import { addProductNotificationToBatch } from "@/lib/product-notifications";

export const SUPPORT_CATEGORIES = Object.freeze(["account", "billing", "membership", "mentorship", "learning", "projects", "resources", "technical", "other"]);
export const SUPPORT_STATUSES = Object.freeze(["open", "in_progress", "waiting_on_member", "waiting_on_staff", "resolved", "closed"]);

function workflowError(message, code = "validation_error", status = 400) {
  return Object.assign(new Error(message), { code, status });
}

function text(value, max = 5000) {
  return String(value || "").trim().slice(0, max);
}

function cleanAttachments(values) {
  if (!Array.isArray(values)) return [];
  return values.slice(0, 5).map((value) => {
    try {
      const url = new URL(text(value, 2000));
      if (url.protocol !== "https:") throw new Error();
      return url.toString();
    } catch {
      throw workflowError("Attachments must use valid HTTPS URLs");
    }
  });
}

function iso(value) {
  if (!value) return null;
  const date = value?.toDate?.() || (value instanceof Date ? value : new Date(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function serializeSupportTicket(id, data = {}, { admin = false } = {}) {
  const result = {
    id,
    category: data.category,
    subject: data.subject,
    status: data.status,
    createdAt: iso(data.createdAt),
    updatedAt: iso(data.updatedAt),
    lastMessageAt: iso(data.lastMessageAt),
    resolvedAt: iso(data.resolvedAt),
    closedAt: iso(data.closedAt),
  };
  if (admin) {
    result.requesterId = data.requesterId;
    result.requesterEmail = data.requesterEmail || null;
    result.membershipTierAtCreation = data.membershipTierAtCreation || null;
    result.jiraIssueKey = data.jiraIssueKey || null;
    result.jiraSyncStatus = data.jiraSyncStatus || "not_configured";
    result.jiraSyncError = data.jiraSyncError || null;
  }
  return result;
}

export function serializeSupportMessage(id, data = {}) {
  return {
    id,
    authorRole: data.authorRole === "staff" ? "staff" : "member",
    body: data.body,
    attachments: Array.isArray(data.attachments) ? data.attachments : [],
    createdAt: iso(data.createdAt),
  };
}

export async function createSupportRequest({ user, input, db = adminDb, now = new Date() }) {
  if (!user?.activeMember) throw workflowError("An active Community, Mentor, or Business membership is required to create a support request", "membership_required", 403);
  const category = SUPPORT_CATEGORIES.includes(input.category) ? input.category : "";
  const subject = text(input.subject, 160);
  const body = text(input.message, 8000);
  const attachments = cleanAttachments(input.attachments);
  if (!category || subject.length < 5 || body.length < 10) throw workflowError("Choose a category and provide a clear subject and message");

  const ticketId = crypto.randomUUID();
  const messageId = crypto.randomUUID();
  const ticketRef = db.collection("support_requests").doc(ticketId);
  const messageRef = db.collection("support_request_messages").doc(messageId);
  const auditRef = db.collection("support_audit_events").doc();
  const batch = db.batch();
  batch.create(ticketRef, {
    requesterId: user.uid,
    requesterEmail: user.email || null,
    membershipTierAtCreation: user.membershipTier || "member",
    entitledAtCreation: true,
    category,
    subject,
    status: "open",
    messageCount: 1,
    jiraIssueKey: null,
    jiraSyncStatus: "pending",
    jiraSyncVersion: 1,
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
  });
  batch.create(messageRef, { ticketId, authorId: user.uid, authorRole: "member", body, attachments, createdAt: now });
  batch.create(auditRef, { ticketId, actorId: user.uid, action: "support.request_created", previousValue: null, newValue: { category, status: "open" }, createdAt: now });
  await batch.commit();
  return { ticket: serializeSupportTicket(ticketId, (await ticketRef.get()).data()), initialMessage: { body, attachments } };
}

export async function listSupportRequests({ user, admin = false, db = adminDb }) {
  let query = db.collection("support_requests").orderBy("lastMessageAt", "desc").limit(admin ? 200 : 100);
  if (!admin) query = db.collection("support_requests").where("requesterId", "==", user.uid).orderBy("lastMessageAt", "desc").limit(100);
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => serializeSupportTicket(doc.id, doc.data(), { admin }));
}

export async function getSupportRequest({ user, ticketId, admin = false, db = adminDb }) {
  const ref = db.collection("support_requests").doc(ticketId);
  const doc = await ref.get();
  if (!doc.exists || (!admin && doc.data().requesterId !== user.uid)) throw workflowError("Support request not found", "not_found", 404);
  const messages = await db.collection("support_request_messages").where("ticketId", "==", ticketId).orderBy("createdAt", "asc").limit(500).get();
  return {
    ticket: serializeSupportTicket(doc.id, doc.data(), { admin }),
    messages: messages.docs.map((message) => serializeSupportMessage(message.id, message.data())),
  };
}

/**
 * @param {{ user: any, ticketId: string, action: string, input?: any, admin?: boolean, db?: any, now?: Date }} options
 */
export async function updateSupportRequest({ user, ticketId, action, input = {}, admin = false, db = adminDb, now = new Date() }) {
  const ticketRef = db.collection("support_requests").doc(ticketId);
  const ticketDoc = await ticketRef.get();
  if (!ticketDoc.exists || (!admin && ticketDoc.data().requesterId !== user.uid)) throw workflowError("Support request not found", "not_found", 404);
  const current = ticketDoc.data();
  const batch = db.batch();
  const auditRef = db.collection("support_audit_events").doc();
  const update = { updatedAt: now, jiraSyncStatus: "pending", jiraSyncVersion: Number(current.jiraSyncVersion || 0) + 1 };

  if (action === "reply") {
    if (!admin && !user.activeMember) throw workflowError("Your paid-through membership period must be active to add a reply", "membership_required", 403);
    if (current.status === "closed") throw workflowError("Reopen this request before replying", "request_closed", 409);
    const body = text(input.message, 8000);
    const attachments = cleanAttachments(input.attachments);
    if (body.length < 2) throw workflowError("A reply is required");
    const messageRef = db.collection("support_request_messages").doc();
    batch.create(messageRef, { ticketId, authorId: user.uid, authorRole: admin ? "staff" : "member", body, attachments, createdAt: now });
    update.status = admin ? "waiting_on_member" : "waiting_on_staff";
    update.lastMessageAt = now;
    update.messageCount = Number(current.messageCount || 0) + 1;
    if (admin) addProductNotificationToBatch(batch, { recipientUserId: current.requesterId, type: "support_update", title: "GO replied to your support request", message: `A staff reply was added to “${current.subject}”.`, actionUrl: `/profile?tab=support&ticket=${ticketId}` }, now);
  } else if (action === "close") {
    if (current.status === "closed") return serializeSupportTicket(ticketId, current, { admin });
    update.status = "closed";
    update.closedAt = now;
  } else if (action === "reopen") {
    if (!admin && !user.activeMember) throw workflowError("Your paid-through membership period must be active to reopen a support request", "membership_required", 403);
    if (!['resolved', 'closed'].includes(current.status)) throw workflowError("Only resolved or closed requests can be reopened", "invalid_status", 409);
    update.status = "open";
    update.closedAt = null;
    update.resolvedAt = null;
  } else if (action === "set_status" && admin) {
    if (!SUPPORT_STATUSES.includes(input.status)) throw workflowError("Unsupported support status");
    update.status = input.status;
    update.resolvedAt = input.status === "resolved" ? now : current.resolvedAt || null;
    update.closedAt = input.status === "closed" ? now : input.status !== "closed" ? null : current.closedAt || null;
    addProductNotificationToBatch(batch, { recipientUserId: current.requesterId, type: "support_update", title: "Support request status updated", message: `“${current.subject}” is now ${input.status.replaceAll("_", " ")}.`, actionUrl: `/profile?tab=support&ticket=${ticketId}` }, now);
  } else {
    throw workflowError("Unsupported support request action");
  }

  batch.update(ticketRef, update);
  batch.create(auditRef, { ticketId, actorId: user.uid, action: `support.${action}`, previousValue: { status: current.status }, newValue: { status: update.status || current.status }, createdAt: now });
  await batch.commit();
  const updated = await ticketRef.get();
  return serializeSupportTicket(ticketId, updated.data(), { admin });
}

export function supportRouteError(error, fallback = "Support request could not be processed") {
  return Response.json({ error: error?.message || fallback, code: error?.code || "support_error" }, { status: error?.status || 500 });
}
