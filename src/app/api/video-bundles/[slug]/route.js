export const dynamic = "force-dynamic";

import { adminDb } from "@/lib/firebase-admin";
import { getRequestUser } from "@/lib/auth-utils";
import { getProductConfig } from "@/lib/product-config";
import { calculateVideoCompletion, hasVideoBundleAccess, isPublicVideoBundleStatus, toPublicVideoBundleDto, videoProgressId } from "@/lib/video-bundles";

export async function GET(request, { params }) {
  if (!getProductConfig().featureFlags.videoBundles) {
    return Response.json({ error: "Video bundles are not available yet" }, { status: 503 });
  }
  const { slug } = await params;
  const query = await adminDb.collection("video_bundles").where("slug", "==", slug).limit(1).get();
  if (query.empty) return Response.json({ error: "Video bundle not found" }, { status: 404 });
  const doc = query.docs[0];
  const bundle = { id: doc.id, ...doc.data() };
  const user = await getRequestUser(request);
  if (!isPublicVideoBundleStatus(bundle.status) && !user?.admin) return Response.json({ error: "Video bundle not found" }, { status: 404 });
  const hasAccess = await hasVideoBundleAccess(bundle.id, user);
  let progress = null;
  if (user && hasAccess) {
    const progressDoc = await adminDb.collection("video_bundle_progress").doc(videoProgressId(bundle.id, user.uid)).get();
    const data = progressDoc.exists ? progressDoc.data() : {};
    progress = {
      completedLessonIndexes: data.completedLessonIndexes || [],
      manuallyCompleted: data.manuallyCompleted === true,
      completionPercentage: calculateVideoCompletion(bundle.lessons?.length || 0, data.completedLessonIndexes || [], data.manuallyCompleted === true),
    };
  }
  return Response.json({ ...toPublicVideoBundleDto(bundle), hasAccess, isAuthenticated: !!user, progress }, { headers: { "Cache-Control": "no-store" } });
}
