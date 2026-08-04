export const dynamic = "force-dynamic";

import crypto from "crypto";
import { adminDb } from "@/lib/firebase-admin";
import { getRequestUser } from "@/lib/auth-utils";
import { hasCommunityContentAccess } from "@/lib/content-entitlements";
import { getProductConfig } from "@/lib/product-config";
import {
  hasVideoBundleAccess,
  isPublicVideoBundleStatus,
  videoProgressId,
} from "@/lib/video-bundles";
import { isTrainingAssignmentActive, trainingAssignmentId } from "@/lib/training-assignments";

const TICKET_LIFETIME_MS = 2 * 60 * 1000;
const TARGET_TYPES = new Set(["bundle", "lesson", "supporting_file"]);

function unavailable() {
  return Response.json({ error: "Video bundle unavailable" }, { status: 404, headers: { "Cache-Control": "no-store" } });
}

function targetUrl(bundle, targetType, linkIndex) {
  const value = targetType === "bundle"
    ? bundle.bundleUrl
    : targetType === "lesson"
      ? bundle.lessons?.[linkIndex]?.externalUrl
      : bundle.supportingFiles?.[linkIndex]?.externalUrl;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export async function POST(request, { params }) {
  if (!getProductConfig().featureFlags.videoBundles) return Response.json({ error: "Video bundles are not available yet" }, { status: 503 });
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  const { slug: bundleId } = await params;
  const body = await request.json().catch(() => ({}));
  const targetType = String(body.targetType || "bundle");
  const linkIndex = Number(body.linkIndex ?? 0);
  if (!TARGET_TYPES.has(targetType) || (!Number.isInteger(linkIndex) && targetType !== "bundle")) return unavailable();

  const bundleDoc = await adminDb.collection("video_bundles").doc(bundleId).get();
  if (!bundleDoc.exists) return unavailable();
  const bundle = bundleDoc.data();
  if (!isPublicVideoBundleStatus(bundle.status) || !(await hasVideoBundleAccess(bundleId, user))) {
    return Response.json({ error: "Community membership or assigned training access is required" }, { status: 403 });
  }
  if (!targetUrl(bundle, targetType, linkIndex)) return unavailable();

  const ticket = crypto.randomBytes(32).toString("base64url");
  const now = new Date();
  await adminDb.collection("protected_link_tickets").doc(ticket).set({
    contentType: "video_bundle",
    videoBundleId: bundleId,
    targetType,
    linkIndex,
    userId: user.uid,
    consumedAt: null,
    createdAt: now,
    expiresAt: new Date(now.getTime() + TICKET_LIFETIME_MS),
  });
  return Response.json({ openUrl: `/video-bundles/${encodeURIComponent(bundleId)}/open?ticket=${encodeURIComponent(ticket)}` }, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(request, { params }) {
  const { slug: bundleId } = await params;
  const ticket = new URL(request.url).searchParams.get("ticket");
  if (!ticket || !/^[A-Za-z0-9_-]{40,}$/.test(ticket)) return unavailable();
  const ticketRef = adminDb.collection("protected_link_tickets").doc(ticket);
  const opened = await adminDb.runTransaction(async (transaction) => {
    const ticketDoc = await transaction.get(ticketRef);
    if (!ticketDoc.exists) return null;
    const ticketData = ticketDoc.data();
    const expiresAt = ticketData.expiresAt?.toDate?.() || new Date(ticketData.expiresAt);
    if (ticketData.contentType !== "video_bundle" || ticketData.videoBundleId !== bundleId || ticketData.consumedAt || !Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date()) return null;

    const bundleRef = adminDb.collection("video_bundles").doc(bundleId);
    const userRef = adminDb.collection("users").doc(ticketData.userId);
    const assignmentRef = adminDb.collection("training_assignments")
      .doc(trainingAssignmentId(ticketData.userId, "video_bundle", bundleId));
    const [bundleDoc, userDoc, assignmentDoc] = await Promise.all([
      transaction.get(bundleRef), transaction.get(userRef), transaction.get(assignmentRef),
    ]);
    if (!bundleDoc.exists || !userDoc.exists) return null;
    const bundle = bundleDoc.data();
    const userData = userDoc.data();
    const hasMembership = hasCommunityContentAccess(userData, { admin: userData.admin === true });
    const hasAssignment = assignmentDoc.exists && isTrainingAssignmentActive(assignmentDoc.data());
    if (!isPublicVideoBundleStatus(bundle.status) || (!hasMembership && !hasAssignment)) return null;
    const destination = targetUrl(bundle, ticketData.targetType, ticketData.linkIndex);
    if (!destination) return null;
    transaction.update(ticketRef, { consumedAt: new Date() });
    return {
      destination: destination.toString(),
      targetType: ticketData.targetType,
      linkIndex: ticketData.linkIndex,
      userId: ticketData.userId,
      bundleSlug: bundle.slug,
      bundleTitle: bundle.title,
    };
  });
  if (!opened) return unavailable();

  try {
    const progressRef = adminDb.collection("video_bundle_progress").doc(videoProgressId(bundleId, opened.userId));
    await adminDb.runTransaction(async (transaction) => {
      const progressDoc = await transaction.get(progressRef);
      const previous = progressDoc.exists ? progressDoc.data() : {};
      const openedLessons = new Set(previous.openedLessonIndexes || []);
      if (opened.targetType === "lesson") openedLessons.add(opened.linkIndex);
      transaction.set(progressRef, {
        bundleId,
        bundleSlug: opened.bundleSlug,
        bundleTitle: opened.bundleTitle,
        userId: opened.userId,
        openedAt: previous.openedAt || new Date(),
        lastOpenedAt: new Date(),
        openedLessonIndexes: [...openedLessons].sort((a, b) => a - b),
        completedLessonIndexes: previous.completedLessonIndexes || [],
        manuallyCompleted: previous.manuallyCompleted === true,
        updatedAt: new Date(),
      }, { merge: true });
    });
  } catch (error) {
    console.error("video_bundle_progress_open_failed", { bundleId, code: error?.code || "unknown" });
  }

  return new Response(null, { status: 303, headers: { Location: opened.destination, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
