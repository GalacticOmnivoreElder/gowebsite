// @ts-check

import { adminDb } from "@/lib/firebase-admin";
import { safeInternalRedirect } from "@/lib/safe-redirect";

export const PRODUCT_NOTIFICATION_TYPES = Object.freeze([
  "course_enrollment",
  "course_update",
  "waitlist_promotion",
  "course_cancellation",
  "mentor_request",
  "mentor_response",
  "mentorship_scheduling",
  "mentorship_update",
  "mentorship_feedback",
  "asset_pack_update",
  "training_assignment",
]);

function validationError(message) {
  return Object.assign(new Error(message), { code: "validation_error" });
}

export function cleanProductNotification(input = {}, now = new Date()) {
  if (!PRODUCT_NOTIFICATION_TYPES.includes(input.type)) {
    throw validationError("Unsupported notification type");
  }
  const recipientUserId = String(input.recipientUserId || "").trim();
  const title = String(input.title || "").trim().slice(0, 160);
  const message = String(input.message || "").trim().slice(0, 1000);
  const actionUrl = safeInternalRedirect(input.actionUrl, null);
  if (!recipientUserId || !title || !message || !actionUrl) {
    throw validationError("Notification recipient, content, and approved internal action are required");
  }
  return {
    recipientUserId,
    type: input.type,
    title,
    message,
    actionUrl,
    readAt: null,
    createdAt: now,
  };
}

export function addProductNotificationToBatch(batch, input, now = new Date()) {
  const notification = cleanProductNotification(input, now);
  const ref = adminDb.collection("product_notifications").doc();
  batch.create(ref, notification);
  return { id: ref.id, ...notification };
}

export async function createProductNotification(input, now = new Date()) {
  const notification = cleanProductNotification(input, now);
  const ref = adminDb.collection("product_notifications").doc();
  await ref.create(notification);
  return { id: ref.id, ...notification };
}

export function serializeProductNotification(id, data = {}) {
  const asIso = (value) => value?.toDate?.()?.toISOString() || (value instanceof Date ? value.toISOString() : value || null);
  return {
    id,
    type: data.type,
    title: data.title,
    message: data.message,
    actionUrl: safeInternalRedirect(data.actionUrl, "/profile"),
    readAt: asIso(data.readAt),
    createdAt: asIso(data.createdAt),
  };
}
