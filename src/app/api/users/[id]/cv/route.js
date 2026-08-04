import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getRequestUser } from "@/lib/auth-utils";
import { serializeFirestoreDate } from "@/lib/project-utils";

export const dynamic = "force-dynamic";

function serializeCv(c) {
  return {
    ...c,
    created_at: serializeFirestoreDate(c.created_at),
    updated_at: serializeFirestoreDate(c.updated_at),
    published_at: serializeFirestoreDate(c.published_at),
  };
}

// Has the target member applied to a project owned/admined by the viewer?
async function viewerReviewsAnApplicationFrom(targetUid, viewerUid) {
  const apps = await adminDb
    .collection("applications")
    .where("userId", "==", targetUid)
    .limit(50)
    .get();
  if (apps.empty) return false;

  const projectIds = [...new Set(apps.docs.map((d) => d.data().projectId).filter(Boolean))];
  for (const pid of projectIds) {
    const proj = await adminDb.collection("projects").doc(pid).get();
    if (!proj.exists) continue;
    const p = proj.data();
    if (p.owner === viewerUid || p.admins?.includes(viewerUid)) return true;
  }
  return false;
}

// GET /api/users/:id/cv - visibility-gated per spec.
export async function GET(request, { params }) {
  const { id: targetUid } = await params;
  const viewer = await getRequestUser(request);

  const snap = await adminDb.collection("go_cvs").doc(targetUid).get();
  if (!snap.exists) {
    return NextResponse.json({ error: "CV not found" }, { status: 404 });
  }
  const cv = snap.data();

  // Own CV.
  if (viewer?.uid === targetUid) {
    return NextResponse.json({ cv: serializeCv(cv) });
  }
  // Only active/published CVs are shareable at all.
  if (cv.status !== "active") {
    return NextResponse.json({ error: "This CV is not published." }, { status: 403 });
  }
  // Platform admin (consent to share with admins is required at onboarding).
  if (viewer?.admin) {
    return NextResponse.json({ cv: serializeCv(cv) });
  }
  // Public sharing.
  if (cv.visibility_public) {
    return NextResponse.json({ cv: serializeCv(cv) });
  }
  // Project creator who has received an application from this member.
  if (
    viewer &&
    cv.visibility_project_creators &&
    (await viewerReviewsAnApplicationFrom(targetUid, viewer.uid))
  ) {
    return NextResponse.json({ cv: serializeCv(cv) });
  }

  return NextResponse.json({ error: "Access denied" }, { status: 403 });
}
