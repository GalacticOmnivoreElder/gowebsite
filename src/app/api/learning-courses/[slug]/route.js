import { getRequestUser } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";
import { getBootcampCourse, getBootcampCohorts } from "@/lib/learning-course-server";
import { bootcampCourse, publicCourse } from "@/lib/learning-courses";
import { canListLearningItem, toPublicLearningItemDto, serializeLearningDate, isLearningManager } from "@/lib/learning-items";
import { enrollmentDocumentId, getLearningEligibility } from "@/lib/learning-enrollment";
export const dynamic = "force-dynamic";
export async function GET(request, { params }) {
  const { slug } = await params;
  if (slug !== bootcampCourse.slug) return Response.json({ error: "Course not found" }, { status: 404 });
  try {
    const [course, items, user] = await Promise.all([getBootcampCourse(), getBootcampCohorts(), getRequestUser(request)]);
    if (course.status !== "published" && !user?.admin) return Response.json({ error: "Course not found" }, { status: 404 });
    const cohorts = await Promise.all(items.filter(item => canListLearningItem(item) || isLearningManager(item, user)).map(async item => {
      const doc = user ? await adminDb.collection("learning_enrollments").doc(enrollmentDocumentId(item.id, user.uid)).get() : null;
      const data = doc?.exists ? doc.data() : null;
      return { ...toPublicLearningItemDto(item), canManage: isLearningManager(item, user), eligibility: course.memberAccess ? getLearningEligibility(item, user) : { allowed: false, reason: "coming_soon" }, enrollment: data ? { state: data.state, attendanceMode: data.attendanceMode, waitlistOfferStatus: data.waitlistOfferStatus || null, waitlistOfferExpiresAt: serializeLearningDate(data.waitlistOfferExpiresAt) } : null };
    }));
    const interest = user ? await adminDb.collection("learning_course_interest").doc(`${bootcampCourse.id}_${user.uid}`).get() : null;
    return Response.json({ course: publicCourse(course), cohorts: cohorts.sort((a,b) => String(a.startsAt).localeCompare(String(b.startsAt))), authenticated: !!user, interested: interest?.exists && interest.data().active === true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return Response.json({ error: "Course information could not be loaded. Please try again." }, { status: 503 }); }
}
