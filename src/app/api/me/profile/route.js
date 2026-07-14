import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getRequestUser } from "@/lib/auth-utils";
import { serializeFirestoreDate } from "@/lib/project-utils";

export const dynamic = "force-dynamic";

// Fields a member may edit on their own GO profile.
const EDITABLE_FIELDS = [
  "display_name",
  "full_name",
  "location",
  "timezone",
  "preferred_language",
  "discord_username",
  "primary_role",
  "secondary_roles",
  "skill_level",
  "tools",
  "experience_level",
  "portfolio_links",
  "past_projects",
  "current_goal",
  "looking_for_projects",
  "looking_for_paid_work",
  "looking_for_team",
  "looking_for_mentorship",
  "looking_for_jobs",
  "can_help_with",
  "needs_help_with",
  "is_blocked",
  "blocker_description",
  "visibility_public",
  "visibility_project_creators",
  "visibility_job_matching",
];

export async function GET(request) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const snap = await adminDb.collection("user_profiles").doc(user.uid).get();
  if (!snap.exists) {
    return NextResponse.json({ profile: null });
  }
  const data = snap.data();
  return NextResponse.json({
    profile: {
      ...data,
      onboarding_completed_at: serializeFirestoreDate(data.onboarding_completed_at),
      updated_at: serializeFirestoreDate(data.updated_at),
    },
  });
}

export async function PATCH(request) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const update = {};
  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) update[field] = body[field];
  }
  update.updated_at = new Date();

  await adminDb
    .collection("user_profiles")
    .doc(user.uid)
    .set({ user_id: user.uid, ...update }, { merge: true });

  return NextResponse.json({ ok: true });
}
