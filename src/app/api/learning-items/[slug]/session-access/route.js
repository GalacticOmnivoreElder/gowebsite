export const dynamic = "force-dynamic";

import { adminDb } from "@/lib/firebase-admin";
import { getRequestUser } from "@/lib/auth-utils";
import { hasCommunityContentAccess } from "@/lib/content-entitlements";
import { enrollmentDocumentId } from "@/lib/learning-enrollment";
import { isLearningManager } from "@/lib/learning-items";

const SESSION_ACCESS_STATES = new Set([
  "confirmed",
  "attended",
  "did_not_attend",
  "completed",
]);

export async function GET(request, { params }) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });

  const { slug } = await params;
  const query = await adminDb.collection("learning_items").where("slug", "==", slug).limit(1).get();
  if (query.empty) return Response.json({ error: "Learning item not found" }, { status: 404 });

  const itemDoc = query.docs[0];
  const item = { id: itemDoc.id, ...itemDoc.data() };
  const manager = isLearningManager(item, user);
  if (!manager) {
    const enrollmentDoc = await adminDb
      .collection("learning_enrollments")
      .doc(enrollmentDocumentId(item.id, user.uid))
      .get();
    if (!enrollmentDoc.exists || !SESSION_ACCESS_STATES.has(enrollmentDoc.data().state)) {
      return Response.json({ error: "Confirmed enrollment is required" }, { status: 403 });
    }
    if (
      item.accessType === "community_member_only" &&
      !hasCommunityContentAccess(user.userData || {}, { admin: user.admin })
    ) {
      return Response.json({ error: "Active membership is required" }, { status: 403 });
    }
  }

  const privateSessionUrl = item.privateSessionUrl ||
    (/^https:\/\//i.test(String(item.location || "")) ? item.location : null);
  return Response.json(
    { privateSessionUrl },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
