import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getRequestUser } from "@/lib/auth-utils";
import { serializeFirestoreDate } from "@/lib/project-utils";
import {
  ONBOARDING_STEPS,
  DEFAULT_PROFILE_VISIBILITY,
  isValidOnboardingStep,
} from "@/constants/onboarding";
import { buildCvFromProfile, improveSummaryWithAI } from "@/lib/cv-generator";
import { sanitizeSkills } from "@/lib/skills";
import { syncUserSkillUsage } from "@/lib/skill-catalog";
import {
  cancelPendingEmailEvents,
  enqueueEmailEvent,
} from "@/lib/email";

export const dynamic = "force-dynamic";
const ONBOARDING_REMINDER_DELAY_MS = 48 * 60 * 60 * 1000;

async function requireUser(request) {
  const user = await getRequestUser(request);
  if (!user) return { error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  return { user };
}

// GET /api/onboarding — current session (+ whether onboarding is complete).
export async function GET(request) {
  const { user, error } = await requireUser(request);
  if (error) return error;

  const [sessionSnap, profileSnap, userSnap] = await Promise.all([
    adminDb.collection("onboarding_sessions").doc(user.uid).get(),
    adminDb.collection("user_profiles").doc(user.uid).get(),
    adminDb.collection("users").doc(user.uid).get(),
  ]);

  return NextResponse.json({
    session: sessionSnap.exists
      ? {
          id: sessionSnap.id,
          ...serializeSession(
            sessionSnap.data(),
            userSnap.exists ? userSnap.data().skills : []
          ),
        }
      : null,
    onboardingCompleted: profileSnap.exists
      ? !!profileSnap.data().onboarding_completed
      : false,
    steps: ONBOARDING_STEPS,
  });
}

// POST /api/onboarding — start (or resume) an onboarding session.
export async function POST(request) {
  const { user, error } = await requireUser(request);
  if (error) return error;

  const ref = adminDb.collection("onboarding_sessions").doc(user.uid);
  const [existing, userSnap] = await Promise.all([
    ref.get(),
    adminDb.collection("users").doc(user.uid).get(),
  ]);
  if (existing.exists && existing.data().status !== "completed") {
    return NextResponse.json({
      id: existing.id,
      ...serializeSession(
        existing.data(),
        userSnap.exists ? userSnap.data().skills : []
      ),
    });
  }

  const now = new Date();
  const existingSkills = sanitizeSkills(
    userSnap.exists ? userSnap.data().skills : []
  );
  const session = {
    user_id: user.uid,
    current_step: ONBOARDING_STEPS[0],
    status: "in_progress",
    draft_data_json: {
      identity: { email: user.email || "" },
      ...(existingSkills.length > 0
        ? { "role-skills": { skills: existingSkills } }
        : {}),
    },
    created_at: now,
    updated_at: now,
    completed_at: null,
  };
  const batch = adminDb.batch();
  batch.set(ref, session, { merge: true });
  await batch.commit();
  const userData = userSnap.exists ? userSnap.data() : {};
  if (user.email && userData.activeMember === true) {
    await enqueueEmailEvent({
      type: "onboarding.incomplete_reminder",
      eventId: `${user.uid}-membership-onboarding`,
      userId: user.uid,
      recipient: user.email,
      scheduledFor: new Date(
        now.getTime() + ONBOARDING_REMINDER_DELAY_MS
      ),
      data: {
        displayName: userData.username || null,
        tier: userData.membershipTier || null,
      },
    }).catch((emailError) => {
      console.error("Could not queue onboarding reminder email:", emailError);
    });
  }
  return NextResponse.json({ id: user.uid, ...serializeSession(session) });
}

// PATCH /api/onboarding — save one step: body { step, data, nextStep? }.
export async function PATCH(request) {
  const { user, error } = await requireUser(request);
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const { step, data, nextStep } = body;
  if (!isValidOnboardingStep(step)) {
    return NextResponse.json({ error: "Invalid onboarding step" }, { status: 400 });
  }

  const ref = adminDb.collection("onboarding_sessions").doc(user.uid);
  const snap = await ref.get();
  const draft = snap.exists ? snap.data().draft_data_json || {} : {};
  draft[step] = data || {};

  const update = {
    user_id: user.uid,
    draft_data_json: draft,
    current_step:
      nextStep && isValidOnboardingStep(nextStep) ? nextStep : step,
    status: "in_progress",
    updated_at: new Date(),
  };
  await ref.set(update, { merge: true });

  return NextResponse.json({ ok: true, current_step: update.current_step });
}

// PUT /api/onboarding — complete: validate consent, build GO Profile + GO CV.
export async function PUT(request) {
  const { user, error } = await requireUser(request);
  if (error) return error;

  const ref = adminDb.collection("onboarding_sessions").doc(user.uid);
  const cvRef = adminDb.collection("go_cvs").doc(user.uid);
  const userRef = adminDb.collection("users").doc(user.uid);
  const [snap, existingCvSnap, existingUserSnap, existingProfileSnap] = await Promise.all([
    ref.get(),
    cvRef.get(),
    userRef.get(),
    adminDb.collection("user_profiles").doc(user.uid).get(),
  ]);
  if (!snap.exists) {
    return NextResponse.json({ error: "No onboarding session found" }, { status: 400 });
  }

  const draft = snap.data().draft_data_json || {};
  const identity = draft.identity || {};
  const roleSkills = draft["role-skills"] || {};
  const goals = draft.goals || {};
  const help = draft.help || {};
  const consent = draft.consent || {};
  const portfolio = draft.portfolio || {};

  // Required consent gates (spec: cannot complete without consent).
  if (
    !consent.consent_store_data ||
    !consent.consent_ai_generation ||
    !consent.consent_share_with_admins
  ) {
    return NextResponse.json(
      { error: "All required consent checkboxes must be accepted." },
      { status: 400 }
    );
  }
  if (
    !String(identity.full_name || "").trim() ||
    !String(identity.display_name || "").trim() ||
    !String(roleSkills.primary_role || "").trim()
  ) {
    return NextResponse.json(
      { error: "Full name, display name, and primary role are required." },
      { status: 400 }
    );
  }
  if (String(identity.bio || "").length > 150) {
    return NextResponse.json(
      { error: "Short bio must be 150 characters or less." },
      { status: 400 }
    );
  }
  const aboutWordCount = String(identity.about_me || "")
    .trim()
    .split(/\s+/u)
    .filter(Boolean).length;
  if (aboutWordCount > 10000) {
    return NextResponse.json(
      { error: "About Me must be 10,000 words or less." },
      { status: 400 }
    );
  }

  const now = new Date();
  const existingCv = existingCvSnap.exists ? existingCvSnap.data() : null;
  const existingProfile = existingProfileSnap.exists
    ? existingProfileSnap.data()
    : {};
  const normalizeTags = (values, max = 20) =>
    sanitizeSkills(values, { max });
  const primaryRole = String(roleSkills.primary_role || "")
    .trim()
    .replace(/\s+/gu, " ");
  const secondaryRoles = normalizeTags(roleSkills.secondary_roles, 8);
  const tools = normalizeTags(roleSkills.tools, 20);
  const skills = sanitizeSkills(
    Array.isArray(roleSkills.skills)
      ? roleSkills.skills
      : [
          roleSkills.primary_role,
          ...secondaryRoles,
          ...tools,
        ]
  );
  const profileTags = sanitizeSkills([
    primaryRole,
    ...secondaryRoles,
    ...skills,
    ...tools,
  ]);
  const portfolioLinks = Array.isArray(portfolio.links)
    ? portfolio.links.filter((link) => link?.url)
    : [
        portfolio.portfolio
          ? { type: "portfolio", url: portfolio.portfolio }
          : null,
        portfolio.github ? { type: "github", url: portfolio.github } : null,
        portfolio.other_link
          ? { type: "other", url: portfolio.other_link }
          : null,
      ].filter(Boolean);
  const discord = draft.discord || {};
  const profile = {
    user_id: user.uid,
    display_name: identity.display_name,
    full_name: identity.full_name,
    bio:
      identity.bio !== undefined ? identity.bio : existingProfile.bio || null,
    about_me:
      identity.about_me !== undefined
        ? identity.about_me
        : existingProfile.about_me || null,
    email: identity.email || user.email || null,
    location: identity.location || null,
    timezone: identity.timezone || null,
    preferred_language: identity.preferred_language || null,
    discord_username: discord.discord_username || null,
    discord_joined: !!discord.already_joined,
    discord_invitation_eligible: !discord.already_joined,
    primary_role: primaryRole,
    secondary_roles: secondaryRoles,
    skills,
    skill_level: roleSkills.skill_level || "beginner",
    tools,
    experience_level: roleSkills.experience_level || null,
    portfolio_links: portfolioLinks,
    past_projects: portfolio.past_projects || [],
    current_goal: goals.current_goal || null,
    looking_for_projects: !!goals.looking_for_projects,
    looking_for_paid_work: !!goals.looking_for_paid_work,
    looking_for_team: !!goals.looking_for_team,
    looking_for_mentorship: !!goals.looking_for_mentorship,
    looking_for_jobs: !!goals.looking_for_jobs,
    can_help_with: help.can_help_with || [],
    needs_help_with: help.needs_help_with || [],
    is_blocked: !!help.is_blocked,
    blocker_description: help.blocker_description || null,
    visibility_public:
      consent.visibility_public ?? DEFAULT_PROFILE_VISIBILITY.visibility_public,
    visibility_project_creators:
      consent.visibility_project_creators ??
      DEFAULT_PROFILE_VISIBILITY.visibility_project_creators,
    visibility_job_matching:
      consent.visibility_job_matching ??
      DEFAULT_PROFILE_VISIBILITY.visibility_job_matching,
    onboarding_completed: true,
    onboarding_completed_at: now,
    updated_at: now,
  };

  // Generate the GO CV (deterministic + optional AI wording).
  const cvDraft = buildCvFromProfile(profile);
  cvDraft.summary = await improveSummaryWithAI(profile, cvDraft.summary);
  cvDraft.sections = cvDraft.sections.map((s) =>
    s.section_type === "summary"
      ? { ...s, content_json: { text: cvDraft.summary } }
      : s
  );

  const cv = {
    user_id: user.uid,
    status: existingCv?.status || "draft",
    title: cvDraft.title,
    summary: cvDraft.summary,
    sections: cvDraft.sections,
    suggested_improvements: cvDraft.suggested_improvements,
    missing_information: cvDraft.missing_information,
    primary_role: profile.primary_role,
    skill_level: profile.skill_level,
    visibility_public: profile.visibility_public,
    visibility_project_creators: profile.visibility_project_creators,
    visibility_job_matching: profile.visibility_job_matching,
    generated_from_onboarding_id: user.uid,
    created_at: existingCv?.created_at || now,
    updated_at: now,
    published_at: existingCv?.published_at || null,
  };

  const batch = adminDb.batch();
  batch.set(adminDb.collection("user_profiles").doc(user.uid), profile, { merge: true });
  batch.set(cvRef, cv, { merge: true });
  batch.set(
    ref,
    { status: "completed", completed_at: now, updated_at: now },
    { merge: true }
  );
  // Mirror a couple of flags onto the user doc for quick gating/UX.
  batch.set(
    userRef,
    {
      onboardingCompleted: true,
      hasCv: true,
      username: profile.display_name,
      bio: profile.bio || "",
      aboutMe: profile.about_me || "",
      profilePrivacy: profile.visibility_public ? "public" : "private",
      profileEditedAt: now,
      skills,
      profileTags,
      updatedAt: now,
    },
    { merge: true }
  );
  await batch.commit();
  await syncUserSkillUsage({
    previousSkills: existingUserSnap.exists
      ? existingUserSnap.data().profileTags ||
        existingUserSnap.data().skills ||
        []
      : [],
    nextSkills: profileTags,
    userId: user.uid,
  });
  await cancelPendingEmailEvents({
    userId: user.uid,
    eventType: "onboarding.incomplete_reminder",
    reason: "onboarding_completed",
  }).catch((emailError) => {
    console.error("Could not cancel onboarding reminder emails:", emailError);
  });

  return NextResponse.json({
    ok: true,
    profile: serializeProfile(profile),
    cv: serializeCv(cv),
  });
}

function serializeSession(s, userSkills = []) {
  const session = {
    ...s,
    created_at: serializeFirestoreDate(s.created_at),
    updated_at: serializeFirestoreDate(s.updated_at),
    completed_at: serializeFirestoreDate(s.completed_at),
  };
  const savedRoleSkills = session.draft_data_json?.["role-skills"] || {};
  const existingSkills = sanitizeSkills(userSkills);

  if (Array.isArray(savedRoleSkills.skills) || existingSkills.length === 0) {
    return session;
  }

  return {
    ...session,
    draft_data_json: {
      ...(session.draft_data_json || {}),
      "role-skills": {
        ...savedRoleSkills,
        skills: existingSkills,
      },
    },
  };
}

function serializeProfile(p) {
  return {
    ...p,
    onboarding_completed_at: serializeFirestoreDate(p.onboarding_completed_at),
    updated_at: serializeFirestoreDate(p.updated_at),
  };
}

function serializeCv(c) {
  return {
    ...c,
    created_at: serializeFirestoreDate(c.created_at),
    updated_at: serializeFirestoreDate(c.updated_at),
    published_at: serializeFirestoreDate(c.published_at),
  };
}
