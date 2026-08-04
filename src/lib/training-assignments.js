// @ts-check

import crypto from "crypto";
import { adminDb } from "@/lib/firebase-admin";

export const TRAINING_CONTENT_TYPES = Object.freeze(["learning_item", "video_bundle"]);
export const TRAINING_ASSIGNMENT_STATUSES = Object.freeze(["active", "completed", "revoked"]);

export function trainingAssignmentId(userId, contentType, contentId) {
  return crypto
    .createHash("sha256")
    .update(`go-training-assignment:v1:${userId}:${contentType}:${contentId}`)
    .digest("hex");
}

function asDate(value) {
  if (!value) return null;
  const date = value?.toDate?.() || (value instanceof Date ? value : new Date(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isTrainingAssignmentActive(assignment = {}, now = new Date()) {
  if (assignment.status !== "active") return false;
  const expiresAt = asDate(assignment.expiresAt);
  return !expiresAt || expiresAt > now;
}

export async function hasActiveTrainingAssignment({
  userId,
  contentType,
  contentId,
  db = adminDb,
  now = new Date(),
}) {
  if (!userId || !TRAINING_CONTENT_TYPES.includes(contentType) || !contentId) return false;
  const assignment = await db.collection("training_assignments")
    .doc(trainingAssignmentId(userId, contentType, contentId))
    .get();
  return assignment.exists && isTrainingAssignmentActive(assignment.data(), now);
}

export function serializeTrainingAssignment(id, data = {}) {
  const iso = (value) => asDate(value)?.toISOString() || null;
  return {
    id,
    userId: data.userId,
    contentType: data.contentType,
    contentId: data.contentId,
    contentSlug: data.contentSlug,
    contentTitle: data.contentTitle,
    status: data.status,
    reason: data.reason || "",
    grantedBy: data.grantedBy,
    grantedAt: iso(data.grantedAt),
    expiresAt: iso(data.expiresAt),
    completedAt: iso(data.completedAt),
    revokedAt: iso(data.revokedAt),
    updatedAt: iso(data.updatedAt),
  };
}
