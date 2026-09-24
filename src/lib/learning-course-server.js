import { adminDb } from "@/lib/firebase-admin";
import { bootcampCourse, firstBootcampCohort, COURSE_ACCESS_STATES } from "@/lib/learning-courses";
import { hasCommunityContentAccess } from "@/lib/content-entitlements";
import { isLearningManager } from "@/lib/learning-items";
import { enrollmentDocumentId } from "@/lib/learning-enrollment";

export async function getBootcampCourse(db = adminDb) {
  const doc = await db.collection("learning_courses").doc(bootcampCourse.id).get();
  return doc.exists ? { ...bootcampCourse, ...doc.data() } : bootcampCourse;
}
export async function getBootcampCohorts(db = adminDb) {
  const snapshot = await db.collection("learning_items").where("courseId", "==", bootcampCourse.id).get();
  const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  if (!items.some(item => item.id === firstBootcampCohort.id)) items.push(firstBootcampCohort);
  return items;
}
// The approved pilot exists as a versioned default until its first admin edit or enrollment.
// Creation is transactional and never overwrites an operator's changes.
export async function ensurePilotCohort(slug, db = adminDb) {
  if (slug !== firstBootcampCohort.slug) return;
  const ref = db.collection("learning_items").doc(firstBootcampCohort.id);
  await db.runTransaction(async tx => {
    const doc = await tx.get(ref);
    if (!doc.exists) tx.create(ref, { ...firstBootcampCohort, createdAt: new Date(), updatedAt: new Date() });
  });
}
export async function loadCourseContext(slug, user, db = adminDb) {
  const snapshot = await db.collection("learning_items").where("slug", "==", slug).limit(1).get();
  const item = snapshot.empty ? (slug === firstBootcampCohort.slug ? firstBootcampCohort : null) : { ...snapshot.docs[0].data(), id: snapshot.docs[0].id };
  if (!item?.courseId || item.courseId !== bootcampCourse.id) return null;
  const course = await getBootcampCourse(db);
  const manager = isLearningManager(item, user);
  const enrollmentRef = user ? db.collection("learning_enrollments").doc(enrollmentDocumentId(item.id, user.uid)) : null;
  const enrollmentDoc = enrollmentRef ? await enrollmentRef.get() : null;
  const enrollment = enrollmentDoc?.exists ? enrollmentDoc.data() : null;
  const enrolled = COURSE_ACCESS_STATES.includes(enrollment?.state);
  const member = !!user && hasCommunityContentAccess(user.userData || {}, { admin: user.admin });
  const internal = !!user && item.invitedUserIds?.includes(user.uid);
  return { item, course, manager, enrollment, enrollmentRef, enrolled, member, internal };
}
