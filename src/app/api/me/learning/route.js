export const dynamic = "force-dynamic";

import { getRequestUser } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";
import { serializeLearningDate } from "@/lib/learning-items";
import { isTrainingAssignmentActive, serializeTrainingAssignment } from "@/lib/training-assignments";

export async function GET(request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  const [enrollments, progress, assignments] = await Promise.all([
    adminDb.collection("learning_enrollments").where("userId", "==", user.uid).get(),
    adminDb.collection("video_bundle_progress").where("userId", "==", user.uid).get(),
    adminDb.collection("training_assignments").where("userId", "==", user.uid).get(),
  ]);
  return Response.json({
    enrollments: enrollments.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        itemId: data.itemId,
        itemSlug: data.itemSlug,
        itemTitle: data.itemTitle,
        state: data.state,
        enrolledAt: serializeLearningDate(data.enrolledAt),
        waitlistOfferStatus: data.waitlistOfferStatus || null,
        waitlistOfferExpiresAt: serializeLearningDate(data.waitlistOfferExpiresAt),
      };
    }),
    videoProgress: progress.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        bundleId: data.bundleId,
        bundleSlug: data.bundleSlug,
        bundleTitle: data.bundleTitle,
        openedAt: serializeLearningDate(data.openedAt),
        lastOpenedAt: serializeLearningDate(data.lastOpenedAt),
        openedLessonIndexes: Array.isArray(data.openedLessonIndexes) ? data.openedLessonIndexes : [],
        completedLessonIndexes: Array.isArray(data.completedLessonIndexes) ? data.completedLessonIndexes : [],
        manuallyCompleted: data.manuallyCompleted === true,
        updatedAt: serializeLearningDate(data.updatedAt),
      };
    }),
    trainingAssignments: assignments.docs
      .filter((doc) => isTrainingAssignmentActive(doc.data()))
      .map((doc) => serializeTrainingAssignment(doc.id, doc.data())),
  }, { headers: { "Cache-Control": "no-store" } });
}
