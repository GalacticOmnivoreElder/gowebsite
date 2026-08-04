// @ts-check

export const dynamic = "force-dynamic";

import { adminDb } from "@/lib/firebase-admin";
import { getRequestUser } from "@/lib/auth-utils";
import { getProductConfig } from "@/lib/product-config";
import { calculateVideoCompletion, hasVideoBundleAccess, isPublicVideoBundleStatus, videoProgressId } from "@/lib/video-bundles";

export async function POST(request, { params }) {
  if (!getProductConfig().featureFlags.videoBundles) {
    return Response.json({ error: "Video bundles are not available yet" }, { status: 503 });
  }
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  const { slug } = await params;
  const query = await adminDb.collection("video_bundles").where("slug", "==", slug).limit(1).get();
  if (query.empty) return Response.json({ error: "Video bundle not found" }, { status: 404 });
  const doc = query.docs[0];
  const bundle = { id: doc.id, ...doc.data() };
  if (!isPublicVideoBundleStatus(bundle.status) || !(await hasVideoBundleAccess(bundle.id, user))) return Response.json({ error: "Video bundle access required" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const action = body.action;
  const lessonIndex = Number(body.lessonIndex);
  if (!["complete_lesson", "uncomplete_lesson", "complete_bundle", "uncomplete_bundle"].includes(action)) return Response.json({ error: "Unsupported progress action" }, { status: 400 });
  if (action.includes("lesson") && (!Number.isInteger(lessonIndex) || lessonIndex < 0 || lessonIndex >= (bundle.lessons?.length || 0))) return Response.json({ error: "Invalid lesson" }, { status: 400 });

  const ref = adminDb.collection("video_bundle_progress").doc(videoProgressId(bundle.id, user.uid));
  const result = await adminDb.runTransaction(async (transaction) => {
    const currentDoc = await transaction.get(ref);
    const current = currentDoc.exists ? currentDoc.data() : {};
    const completed = new Set(current.completedLessonIndexes || []);
    if (action === "complete_lesson") completed.add(lessonIndex);
    if (action === "uncomplete_lesson") completed.delete(lessonIndex);
    const manuallyCompleted = action === "complete_bundle" ? true : action === "uncomplete_bundle" ? false : current.manuallyCompleted === true;
    const data = {
      bundleId: bundle.id,
      bundleSlug: bundle.slug,
      bundleTitle: bundle.title,
      userId: user.uid,
      completedLessonIndexes: [...completed].sort((a, b) => a - b),
      manuallyCompleted,
      updatedAt: new Date(),
    };
    transaction.set(ref, data, { merge: true });
    return { ...data, completionPercentage: calculateVideoCompletion(bundle.lessons?.length || 0, data.completedLessonIndexes, manuallyCompleted) };
  });
  return Response.json(result);
}
