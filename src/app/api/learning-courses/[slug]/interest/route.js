import { adminDb } from "@/lib/firebase-admin";
import { getRequestUser } from "@/lib/auth-utils";
import { bootcampCourse } from "@/lib/learning-courses";
export const dynamic = "force-dynamic";
async function save(request, params, active) {
  const { slug } = await params;
  if (slug !== bootcampCourse.slug) return Response.json({ error: "Course not found" }, { status: 404 });
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Sign in to join the price announcement waitlist" }, { status: 401 });
  if (active) {
    const body = await request.json().catch(() => ({}));
    if (body.consent !== true) return Response.json({ error: "Please agree to course price and availability announcements" }, { status: 400 });
  }
  const ref = adminDb.collection("learning_course_interest").doc(`${bootcampCourse.id}_${user.uid}`);
  await adminDb.runTransaction(async tx => {
    const doc = await tx.get(ref);
    tx.set(ref, { courseId: bootcampCourse.id, userId: user.uid, email: user.email, active, consent: active ? "Course price and availability announcements" : null, createdAt: doc.exists ? doc.data().createdAt : new Date(), updatedAt: new Date() });
  });
  return Response.json({ interested: active }, { headers: { "Cache-Control": "private, no-store" } });
}
export async function POST(request, { params }) { return save(request, params, true); }
export async function DELETE(request, { params }) { return save(request, params, false); }
