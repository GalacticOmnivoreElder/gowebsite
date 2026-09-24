import { adminDb } from "@/lib/firebase-admin";
import { getRequestUser } from "@/lib/auth-utils";
import { getBootcampCourse, getBootcampCohorts } from "@/lib/learning-course-server";
import { bootcampCourse, firstBootcampCohort, cleanCourse, courseError, courseSeatCount } from "@/lib/learning-courses";
import { cleanLearningItem, serializeLearningDate } from "@/lib/learning-items";
import { hasMentorToolAccess } from "@/lib/content-entitlements";
export const dynamic = "force-dynamic";
async function admin(request) {
  const user = await getRequestUser(request);
  if (!user) throw courseError("Authentication required", 401);
  if (!user.admin) throw courseError("Administrator access required", 403);
  return user;
}
const failure = error => Response.json({ error: error.status || error.code === "validation_error" ? error.message : "Course administration unavailable" }, { status: error.status || (error.code === "validation_error" ? 400 : 500) });
function cohortDto(item) {
  const data = { ...item };
  for (const key of ["startsAt", "endsAt", "enrollmentOpensAt", "enrollmentClosesAt", "cancellationDeadline", "createdAt", "updatedAt"]) data[key] = serializeLearningDate(data[key]);
  return data;
}
export async function GET(request) {
  try {
    await admin(request);
    const [course, cohorts, interests] = await Promise.all([getBootcampCourse(), getBootcampCohorts(), adminDb.collection("learning_course_interest").where("courseId", "==", bootcampCourse.id).get()]);
    return Response.json({ course, cohorts: cohorts.map(cohortDto), interests: interests.docs.filter(doc => doc.data().active).map(doc => ({ userId: doc.data().userId, email: doc.data().email, joinedAt: serializeLearningDate(doc.data().createdAt) })) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return failure(error); }
}
export async function POST(request) {
  try {
    const user = await admin(request);
    const course = cleanCourse(await request.json());
    const batch = adminDb.batch();
    batch.set(adminDb.collection("learning_courses").doc(bootcampCourse.id), { ...course, updatedAt: new Date(), lastModifiedBy: user.uid });
    batch.create(adminDb.collection("admin_audit_events").doc(), { action: "learning_course.saved", actorId: user.uid, target: { type: "learning_course", id: course.id }, createdAt: new Date() });
    await batch.commit();
    return Response.json({ saved: true });
  } catch (error) { return failure(error); }
}
export async function PUT(request) {
  try {
    const user = await admin(request);
    const body = await request.json();
    if (body.instructorUserId) {
      const instructor = await adminDb.collection("users").doc(String(body.instructorUserId)).get();
      if (!instructor.exists || !(instructor.data().admin || hasMentorToolAccess(instructor.data()))) throw courseError("Choose an administrator or approved active mentor as instructor");
    }
    const course = await getBootcampCourse();
    const id = String(body.id || body.slug || "");
    if (!/^[a-z0-9-]{1,160}$/.test(id) || !id.startsWith(`${bootcampCourse.slug}-`)) throw courseError("Use a unique cohort identifier such as from-idea-to-playable-2026-10-12");
    const ref = adminDb.collection("learning_items").doc(id);
    await adminDb.runTransaction(async tx => {
      const [doc, duplicates] = await Promise.all([tx.get(ref), tx.get(adminDb.collection("learning_items").where("slug", "==", id))]);
      if (duplicates.docs.some(other => other.id !== id)) throw courseError("This cohort URL already exists");
      const previous = doc.exists ? doc.data() : {};
      if (doc.exists && body.createOnly) throw courseError("A cohort with this identifier already exists. Choose another week or edit the existing cohort.", 409);
      if (doc.exists && previous.courseId !== bootcampCourse.id) throw courseError("This identifier belongs to another learning item");
      const item = cleanLearningItem({ ...firstBootcampCohort, ...body, courseId: bootcampCourse.id, slug: id,
        accessType: "community_member_only", enrollmentMode: "automatic", capacityMode: "in_person", waitlistEnabled: true,
        confirmedCount: previous.confirmedCount || 0, onlineConfirmedCount: previous.onlineConfirmedCount || 0, reservedCount: previous.reservedCount || 0, waitlistCount: previous.waitlistCount || 0,
        curriculumSnapshot: previous.curriculumSnapshot || course.modules, curriculumVersion: previous.curriculumVersion || course.curriculumVersion,
      });
      if (!item.capacity || item.capacity < courseSeatCount(item) + item.reservedCount) throw courseError("In-person capacity must cover confirmed and reserved places");
      if (item.endsAt <= item.startsAt) throw courseError("Cohort must end after it starts");
      if (item.sessions.some((s, i) => new Date(s.startsAt) < item.startsAt || new Date(s.endsAt) > item.endsAt || (i && new Date(s.startsAt) < new Date(item.sessions[i-1].endsAt)))) throw courseError("Sessions must be ordered and within the cohort dates");
      tx.set(ref, { ...item, createdAt: previous.createdAt || new Date(), updatedAt: new Date(), lastModifiedBy: user.uid });
      tx.create(adminDb.collection("admin_audit_events").doc(), { action: "learning_cohort.saved", actorId: user.uid, target: { type: "learning_item", id }, createdAt: new Date() });
    });
    return Response.json({ saved: true });
  } catch (error) { return failure(error); }
}
