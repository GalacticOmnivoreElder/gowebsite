import { getRequestUser } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";
import { loadCourseContext } from "@/lib/learning-course-server";
import { cleanCourseSubmission, cleanCourseAssessment, COURSE_ACCESS_STATES, courseError } from "@/lib/learning-courses";
import { enrollmentDocumentId } from "@/lib/learning-enrollment";
import { createProductNotification } from "@/lib/product-notifications";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
async function context(request, params) {
  const user = await getRequestUser(request);
  if (!user) throw courseError("Sign in to open coursework", 401);
  const { slug } = await params;
  const ctx = await loadCourseContext(slug, user);
  if (!ctx) throw courseError("Course not found", 404);
  if (!ctx.manager && !ctx.enrolled) throw courseError("Confirmed enrollment is required", 403);
  return { ...ctx, user };
}
function failure(error) { return Response.json({ error: error.status ? error.message : "Coursework could not be updated" }, { status: error.status || 500 }); }
export async function GET(request, { params }) {
  try {
    const ctx = await context(request, params);
    // Live access survives expiry for a confirmed seat; recordings require current membership.
    const recordingAccess = ctx.manager || ctx.member || ctx.internal;
    const resources = [...(ctx.course.resources || []), ...(ctx.item.resources || [])].filter(r => r.approved && (r.kind !== "recording" || recordingAccess));
    return Response.json({ submission: ctx.enrollment?.submission || {}, assessment: ctx.enrollment?.assessment || null, badge: ctx.enrollment?.badge || null, modules: ctx.item.curriculumSnapshot || ctx.course.modules, sessions: ctx.item.sessions || [], resources, recordingAccess, canManage: ctx.manager }, { headers });
  } catch (error) { return failure(error); }
}
export async function PUT(request, { params }) {
  try {
    const ctx = await context(request, params);
    if (!ctx.enrolled) throw courseError("Enroll before submitting coursework", 403);
    const submission = cleanCourseSubmission(await request.json());
    await adminDb.runTransaction(async tx => {
      const current = await tx.get(ctx.enrollmentRef);
      if (!current.exists || !COURSE_ACCESS_STATES.includes(current.data().state)) throw courseError("Enrollment is no longer active", 409);
      if (current.data().badge) throw courseError("Approved evidence is locked. Contact your instructor for a reassessment.", 409);
      tx.update(ctx.enrollmentRef, { submission, submissionVersion: (Number(current.data().submissionVersion) || 0) + 1, updatedAt: new Date() });
    });
    return Response.json({ submission }, { headers });
  } catch (error) { return failure(error); }
}
export async function PATCH(request, { params }) {
  try {
    const ctx = await context(request, params);
    if (!ctx.manager) throw courseError("Instructor or administrator access is required", 403);
    const body = await request.json();
    if (typeof body.userId !== "string" || !body.userId) throw courseError("Choose a participant");
    const ref = adminDb.collection("learning_enrollments").doc(enrollmentDocumentId(ctx.item.id, body.userId));
    let awarded = false;
    await adminDb.runTransaction(async tx => {
      const doc = await tx.get(ref);
      if (!doc.exists || !COURSE_ACCESS_STATES.includes(doc.data().state)) throw courseError("Participant has no confirmed enrollment", 409);
      const data = doc.data();
      if (Number(body.submissionVersion || 0) !== Number(data.submissionVersion || 0)) throw courseError("The submission changed. Reload before reviewing.", 409);
      const assessment = { ...cleanCourseAssessment(body, data.submission), reviewerId: ctx.user.uid, reviewedAt: new Date().toISOString() };
      const badge = assessment.approved ? { id: "go-prototype-creator-level-1", title: ctx.course.badgeTitle, awardedAt: data.badge?.awardedAt || new Date().toISOString() } : null;
      awarded = !!badge && !data.badge;
      tx.update(ref, { assessment, badge, state: badge ? "completed" : data.state === "completed" ? "attended" : data.state, updatedAt: new Date() });
      tx.create(adminDb.collection("admin_audit_events").doc(), { action: "learning_course.assessed", actorId: ctx.user.uid, target: { type: "learning_enrollment", id: ref.id }, previousValue: data.assessment || null, newValue: assessment, createdAt: new Date() });
    });
    if (awarded) await createProductNotification({ recipientUserId: body.userId, type: "course_update", title: "GO Prototype Creator — Level 1 earned", message: "Your instructor approved your prototype and playtest evidence.", actionUrl: `/education/${ctx.item.slug}` }).catch(error => console.error("course_award_notification_failed", { code: error.code || "unknown" }));
    return Response.json({ saved: true }, { headers });
  } catch (error) { return failure(error); }
}
