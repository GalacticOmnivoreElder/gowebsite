import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getRequestUser } from "@/lib/auth-utils";
import { serializeFirestoreDate } from "@/lib/project-utils";
import { buildCvFromProfile, improveSummaryWithAI } from "@/lib/cv-generator";

export const dynamic = "force-dynamic";

function serializeCv(c) {
  if (!c) return null;
  return {
    ...c,
    created_at: serializeFirestoreDate(c.created_at),
    updated_at: serializeFirestoreDate(c.updated_at),
    published_at: serializeFirestoreDate(c.published_at),
  };
}

async function auth(request) {
  const user = await getRequestUser(request);
  if (!user) return { error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  return { user };
}

// GET /api/me/cv — the member's own CV.
export async function GET(request) {
  const { user, error } = await auth(request);
  if (error) return error;
  const snap = await adminDb.collection("go_cvs").doc(user.uid).get();
  return NextResponse.json({ cv: snap.exists ? serializeCv(snap.data()) : null });
}

// POST /api/me/cv — (re)generate the CV from the current GO profile.
export async function POST(request) {
  const { user, error } = await auth(request);
  if (error) return error;

  const profileSnap = await adminDb.collection("user_profiles").doc(user.uid).get();
  if (!profileSnap.exists) {
    return NextResponse.json(
      { error: "Complete onboarding before generating a CV." },
      { status: 400 }
    );
  }

  const profile = profileSnap.data();
  const draft = buildCvFromProfile(profile);
  if (profile.consent_ai_generation === true) {
    draft.summary = await improveSummaryWithAI(profile, draft.summary);
  }
  draft.sections = draft.sections.map((s) =>
    s.section_type === "summary" ? { ...s, content_json: { text: draft.summary } } : s
  );

  const existing = await adminDb.collection("go_cvs").doc(user.uid).get();
  const now = new Date();
  const cv = {
    user_id: user.uid,
    status: existing.exists ? existing.data().status || "draft" : "draft",
    title: draft.title,
    summary: draft.summary,
    sections: draft.sections,
    suggested_improvements: draft.suggested_improvements,
    missing_information: draft.missing_information,
    primary_role: profile.primary_role,
    skill_level: profile.skill_level,
    visibility_public: profile.visibility_public ?? false,
    visibility_project_creators: profile.visibility_project_creators ?? true,
    visibility_job_matching: profile.visibility_job_matching ?? true,
    generated_from_onboarding_id: user.uid,
    created_at: existing.exists ? existing.data().created_at || now : now,
    updated_at: now,
    published_at: existing.exists ? existing.data().published_at || null : null,
  };

  await adminDb.collection("go_cvs").doc(user.uid).set(cv, { merge: true });
  await adminDb.collection("users").doc(user.uid).set({ hasCv: true }, { merge: true });
  return NextResponse.json({ cv: serializeCv(cv) });
}

// PATCH /api/me/cv — user edits to the generated CV (title/summary/sections/visibility).
export async function PATCH(request) {
  const { user, error } = await auth(request);
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const update = { updated_at: new Date() };
  for (const field of [
    "primary_role",
    "skill_level",
    "title",
    "summary",
    "sections",
    "visibility_public",
    "visibility_project_creators",
    "visibility_job_matching",
  ]) {
    if (body[field] !== undefined) update[field] = body[field];
  }

  const writes = [
    adminDb
      .collection("go_cvs")
      .doc(user.uid)
      .set({ user_id: user.uid, ...update }, { merge: true }),
  ];

  if (body.visibility_public !== undefined) {
    const visibilityPublic = body.visibility_public === true;
    writes.push(
      adminDb
        .collection("user_profiles")
        .doc(user.uid)
        .set({ visibility_public: visibilityPublic }, { merge: true }),
      adminDb
        .collection("users")
        .doc(user.uid)
        .set(
          { profilePrivacy: visibilityPublic ? "public" : "private" },
          { merge: true }
        )
    );
  }

  await Promise.all(writes);

  const snap = await adminDb.collection("go_cvs").doc(user.uid).get();
  return NextResponse.json({ cv: serializeCv(snap.data()) });
}

// PUT /api/me/cv — publish (activate) the CV so it can be used for applications.
export async function PUT(request) {
  const { user, error } = await auth(request);
  if (error) return error;

  const now = new Date();
  await adminDb
    .collection("go_cvs")
    .doc(user.uid)
    .set(
      { user_id: user.uid, status: "active", published_at: now, updated_at: now },
      { merge: true }
    );
  const snap = await adminDb.collection("go_cvs").doc(user.uid).get();
  return NextResponse.json({ cv: serializeCv(snap.data()) });
}
