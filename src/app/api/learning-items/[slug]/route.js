export const dynamic = "force-dynamic";

import { adminDb } from "@/lib/firebase-admin";
import { getRequestUser } from "@/lib/auth-utils";
import { canListLearningItem, isLearningManager, serializeLearningDate, toPublicLearningItemDto } from "@/lib/learning-items";
import { enrollmentDocumentId, getLearningEligibility } from "@/lib/learning-enrollment";
import { isTrainingAssignmentActive, trainingAssignmentId } from "@/lib/training-assignments";

export async function GET(request, { params }) {
  const { slug } = await params;
  const query = await adminDb.collection("learning_items").where("slug", "==", slug).limit(1).get();
  if (query.empty) return Response.json({ error: "Learning item not found" }, { status: 404 });
  const doc = query.docs[0];
  const item = { id: doc.id, ...doc.data() };
  const user = await getRequestUser(request);
  const manager = isLearningManager(item, user);
  if (!canListLearningItem(item) && !manager) return Response.json({ error: "Learning item not found" }, { status: 404 });

  let enrollment = null;
  let trainingAssigned = false;
  if (user) {
    const [enrollmentDoc, trainingDoc] = await Promise.all([
      adminDb.collection("learning_enrollments").doc(enrollmentDocumentId(item.id, user.uid)).get(),
      adminDb.collection("training_assignments").doc(trainingAssignmentId(user.uid, "learning_item", item.id)).get(),
    ]);
    trainingAssigned = trainingDoc.exists && isTrainingAssignmentActive(trainingDoc.data());
    if (enrollmentDoc.exists) {
      const data = enrollmentDoc.data();
      enrollment = {
        id: enrollmentDoc.id,
        state: data.state,
        enrolledAt: serializeLearningDate(data.enrolledAt),
        canceledAt: serializeLearningDate(data.canceledAt),
        waitlistOfferStatus: data.waitlistOfferStatus || null,
        waitlistOfferExpiresAt: serializeLearningDate(data.waitlistOfferExpiresAt),
      };
    }
  }

  return Response.json({
    ...toPublicLearningItemDto(item),
    eligibility: getLearningEligibility(item, user, new Date(), { trainingAssigned }),
    trainingAssigned,
    enrollment,
    isAuthenticated: !!user,
    canManage: manager,
  }, { headers: { "Cache-Control": "no-store" } });
}
