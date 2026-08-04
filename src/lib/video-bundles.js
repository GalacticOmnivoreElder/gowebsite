// @ts-check

import crypto from "crypto";
import { adminDb } from "@/lib/firebase-admin";
import { hasCommunityContentAccess } from "@/lib/content-entitlements";
import { isPublicVideoBundleStatus } from "@/lib/content-visibility";
import { hasActiveTrainingAssignment } from "@/lib/training-assignments";

export const VIDEO_BUNDLE_STATUSES = Object.freeze(["draft", "published", "archived"]);

function validationError(message) {
  return Object.assign(new Error(message), { code: "validation_error" });
}

function text(value, max = 5000) {
  return String(value || "").trim().slice(0, max);
}

function httpsUrl(value, field, { optional = true } = {}) {
  const clean = text(value, 2000);
  if (!clean && optional) return null;
  try {
    const url = new URL(clean);
    if (url.protocol !== "https:") throw new Error();
    return url.toString();
  } catch {
    throw validationError(`${field} must be a valid HTTPS URL`);
  }
}

function cleanLinks(value, kind) {
  return Array.isArray(value) ? value.slice(0, 100).map((link, index) => ({
    title: text(link?.title, 200) || `${kind} ${index + 1}`,
    description: text(link?.description, 1000),
    durationMinutes: Math.max(0, Math.floor(Number(link?.durationMinutes) || 0)),
    externalUrl: httpsUrl(link?.externalUrl, `${kind} ${index + 1} URL`, { optional: false }),
  })) : [];
}

export function cleanVideoBundle(input = {}) {
  const status = VIDEO_BUNDLE_STATUSES.includes(input.status) ? input.status : "draft";
  const lessons = cleanLinks(input.lessons, "Lesson");
  const bundleUrl = httpsUrl(input.bundleUrl, "Bundle URL");
  if (status === "published" && !bundleUrl && lessons.length === 0) {
    throw validationError("A complete-bundle URL or at least one lesson URL is required");
  }
  const result = {
    slug: text(input.slug, 160).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    title: text(input.title, 200),
    description: text(input.description, 10000),
    thumbnail: httpsUrl(input.thumbnail, "Thumbnail URL"),
    instructorName: text(input.instructorName, 160),
    intendedLevel: text(input.intendedLevel, 100),
    learningObjective: text(input.learningObjective, 3000),
    bundleUrl,
    lessons,
    supportingFiles: cleanLinks(input.supportingFiles, "Supporting file"),
    durationMinutes: Math.max(0, Math.floor(Number(input.durationMinutes) || 0)),
    relatedTopics: Array.isArray(input.relatedTopics) ? [...new Set(input.relatedTopics.map((topic) => text(topic, 100)).filter(Boolean))].slice(0, 50) : [],
    publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
    status,
    requiredEntitlement: "community",
  };
  if (!result.title || !result.slug || !result.description) {
    throw validationError("Title, slug, and description are required");
  }
  if (result.publishedAt && Number.isNaN(result.publishedAt.getTime())) {
    throw validationError("Publication date must be valid");
  }
  return result;
}

function iso(value) {
  if (!value) return null;
  const date = value?.toDate?.() || (value instanceof Date ? value : new Date(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function toPublicVideoBundleDto(bundle = {}) {
  return {
    id: bundle.id,
    slug: bundle.slug,
    title: bundle.title,
    description: bundle.description,
    thumbnail: bundle.thumbnail || null,
    instructorName: bundle.instructorName || "Galactic Omnivore",
    intendedLevel: bundle.intendedLevel || "All levels",
    learningObjective: bundle.learningObjective || "",
    durationMinutes: Number(bundle.durationMinutes) || 0,
    relatedTopics: Array.isArray(bundle.relatedTopics) ? bundle.relatedTopics : [],
    publishedAt: iso(bundle.publishedAt),
    status: bundle.status,
    requiredEntitlement: bundle.requiredEntitlement || "community",
    hasCompleteBundleLink: !!bundle.bundleUrl,
    lessons: Array.isArray(bundle.lessons) ? bundle.lessons.map((lesson, linkIndex) => ({
      linkIndex,
      title: lesson.title,
      description: lesson.description || "",
      durationMinutes: Number(lesson.durationMinutes) || 0,
    })) : [],
    supportingFiles: Array.isArray(bundle.supportingFiles) ? bundle.supportingFiles.map((file, linkIndex) => ({
      linkIndex,
      title: file.title,
      description: file.description || "",
    })) : [],
  };
}

export async function hasVideoBundleAccess(bundleId, user, { db = adminDb, now = new Date() } = {}) {
  if (!user) return false;
  if (hasCommunityContentAccess(user.userData || {}, { admin: user.admin, now })) return true;
  return hasActiveTrainingAssignment({
    userId: user.uid,
    contentType: "video_bundle",
    contentId: bundleId,
    db,
    now,
  });
}

export function videoProgressId(bundleId, userId) {
  return crypto.createHash("sha256").update(`go-video-progress:v1:${bundleId}:${userId}`).digest("hex");
}

export function calculateVideoCompletion(lessonCount, completedLessonIndexes = [], manuallyCompleted = false) {
  if (manuallyCompleted) return 100;
  if (!Number.isInteger(lessonCount) || lessonCount <= 0) return 0;
  const unique = new Set(completedLessonIndexes.filter((index) => Number.isInteger(index) && index >= 0 && index < lessonCount));
  return Math.round((unique.size / lessonCount) * 100);
}

export { isPublicVideoBundleStatus };
