import { adminDb } from "@/lib/firebase-admin";
import { getProductConfig } from "@/lib/product-config";
import { isPublicVideoBundleStatus, toPublicVideoBundleDto } from "@/lib/video-bundles";

export async function GET() {
  if (!getProductConfig().featureFlags.videoBundles) {
    return Response.json({ error: "Video bundles are not available yet" }, { status: 503 });
  }
  const snapshot = await adminDb.collection("video_bundles").get();
  const bundles = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((bundle) => isPublicVideoBundleStatus(bundle.status))
    .map(toPublicVideoBundleDto)
    .sort((left, right) => String(right.publishedAt || "").localeCompare(String(left.publishedAt || "")));
  return Response.json(bundles);
}
