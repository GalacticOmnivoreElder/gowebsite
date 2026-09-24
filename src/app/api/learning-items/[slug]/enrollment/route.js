// @ts-check

export const dynamic = "force-dynamic";

import { adminDb } from "@/lib/firebase-admin";
import { getRequestUser } from "@/lib/auth-utils";
import { getProductConfig } from "@/lib/product-config";
import { cancelLearningEnrollment, confirmWaitlistOffer, createLearningEnrollment } from "@/lib/learning-enrollment";
import { ensurePilotCohort } from "@/lib/learning-course-server";
import { BOOTCAMP_ID } from "@/content/idea-to-playable";

async function loadItem(slug) {
  const query = await adminDb.collection("learning_items").where("slug", "==", slug).limit(1).get();
  return query.empty ? null : { id: query.docs[0].id, ...query.docs[0].data() };
}

function featureUnavailable() {
  return Response.json({ error: "Course enrollment is not available yet" }, { status: 503 });
}

export async function POST(request, { params }) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  const { slug } = await params;
  await ensurePilotCohort(slug);
  const item = await loadItem(slug);
  if (!getProductConfig().featureFlags.courseEnrollment && item?.courseId !== BOOTCAMP_ID) return featureUnavailable();
  if (!item) return Response.json({ error: "Learning item not found" }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  if (body.action === "confirm_waitlist_offer" && item.courseId) {
    const { getLearningEligibility } = await import("@/lib/learning-enrollment");
    if (!getLearningEligibility(item, user).allowed) return Response.json({ error: "Active membership or a team invitation is required to accept this place" }, { status: 403 });
  }
  if (body.action && body.action !== "confirm_waitlist_offer") {
    return Response.json({ error: "Unsupported enrollment action" }, { status: 400 });
  }
  try {
    const enrollment = body.action === "confirm_waitlist_offer"
      ? await confirmWaitlistOffer({ itemId: item.id, userId: user.uid })
      : await createLearningEnrollment({ itemId: item.id, user, answers: body.answers || {}, attendanceMode: body.attendanceMode });
    return Response.json({ enrollment }, { status: body.action === "confirm_waitlist_offer" ? 200 : 201 });
  } catch (error) {
    return Response.json({ error: error.message, code: error.code || "enrollment_failed" }, { status: error.status || 500 });
  }
}

export async function DELETE(request, { params }) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  const { slug } = await params;
  const item = await loadItem(slug);
  if (!getProductConfig().featureFlags.courseEnrollment && item?.courseId !== BOOTCAMP_ID) return featureUnavailable();
  if (!item) return Response.json({ error: "Learning item not found" }, { status: 404 });
  try {
    return Response.json(await cancelLearningEnrollment({ itemId: item.id, userId: user.uid }));
  } catch (error) {
    return Response.json({ error: error.message, code: error.code || "cancellation_failed", organizerContactRoute: item.organizerContactRoute || "/contact" }, { status: error.status || 500 });
  }
}
