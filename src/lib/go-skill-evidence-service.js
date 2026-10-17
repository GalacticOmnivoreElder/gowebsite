import "server-only";
import { createHash } from "node:crypto";
import { adminDb } from "@/lib/firebase-admin";
import { getSkillKey, sanitizeSkills } from "@/lib/skills";
import { isProjectMember } from "@/lib/project-utils";
import { appendJourneyEvent } from "@/lib/go-journey-service";
import { passportIsVisible } from "@/lib/monday-builds.mjs";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const evidenceId = (userId, skill, sourceType, sourceId) => hash(`go-skill-evidence:v1:${userId}:${getSkillKey(skill)}:${sourceType}:${sourceId}`);
const unavailable = (message, status = 400) => Object.assign(new Error(message), { status });

async function skillOwner(userId) {
  const userDoc = await adminDb.collection("users").doc(userId).get();
  if (!userDoc.exists) throw unavailable("GO account not found.", 404);
  return { user: userDoc.data() || {}, skills: sanitizeSkills(userDoc.data()?.skills || []) };
}

async function canReviewFor(userId, reviewerId, sourceType, sourceId) {
  if (!reviewerId || reviewerId === userId) return false;
  if (sourceType === "project") {
    const projectDoc = await adminDb.collection("projects").doc(sourceId).get();
    return projectDoc.exists && isProjectMember(projectDoc.data(), { uid: reviewerId }) &&
      isProjectMember(projectDoc.data(), { uid: userId });
  }
  if (sourceType === "mentorship") {
    const engagement = await adminDb.collection("mentorship_engagements").doc(sourceId).get();
    const value = engagement.data() || {};
    return engagement.exists && value.status === "active" && value.menteeUserId === userId && value.mentorId === reviewerId;
  }
  return false;
}

async function identityFor(userId, ownerView) {
  const [userDoc, cvDoc] = await Promise.all([
    adminDb.collection("users").doc(userId).get(),
    adminDb.collection("go_cvs").doc(userId).get(),
  ]);
  const user = userDoc.data() || {};
  if (ownerView) return String(user.username || user.displayName || "GO member").slice(0, 80);
  const cv = cvDoc.data() || {};
  const publicProfile = passportIsVisible({
    hasCv: cvDoc.exists,
    publicCv: cv.status === "active" && cv.visibility_public === true,
    profilePrivacy: user.profilePrivacy,
  });
  return publicProfile ? String(user.username || user.displayName || "GO member").slice(0, 80) : null;
}

export async function readSkillEvidence(userId, viewer) {
  const { user, skills } = await skillOwner(userId);
  const owner = viewer?.uid === userId;
  if (!owner) {
    const [cvDoc] = await Promise.all([adminDb.collection("go_cvs").doc(userId).get()]);
    const cv = cvDoc.data() || {};
    if (!passportIsVisible({ hasCv: cvDoc.exists, publicCv: cv.status === "active" && cv.visibility_public === true, profilePrivacy: user.profilePrivacy })) {
      throw unavailable("This skill record is private.", 404);
    }
  }
  const snapshot = await adminDb.collection("go_skill_evidence").where("userId", "==", userId).limit(100).get();
  const mentorshipSources = owner
    ? await adminDb.collection("mentorship_engagements").where("menteeUserId", "==", userId).limit(100).get()
    : { docs: [] };
  const evidence = [];
  for (const doc of snapshot.docs) {
    const data = doc.data();
    let canValidate = false;
    if (data.status === "pending" && viewer?.uid && !owner) {
      canValidate = await canReviewFor(userId, viewer.uid, data.sourceType, data.sourceId);
    }
    if (data.status === "pending" && !owner && !canValidate) continue;
    if (data.status !== "pending" && data.status !== "validated") continue;
    let sourceLabel = data.sourceType === "mentorship" ? "Active GO mentorship" : "GO project contribution";
    if (data.sourceType === "project") {
      const projectDoc = await adminDb.collection("projects").doc(data.sourceId).get();
      const project = projectDoc.data() || {};
      sourceLabel = project.visibility === "Public" && ["hiring", "live", "completed"].includes(project.status)
        ? String(project.title || "GO project").slice(0, 120)
        : "Private GO project contribution";
    }
    const validatorName = data.status === "validated"
      ? await identityFor(data.validatedBy, owner)
      : null;
    evidence.push({
      id: doc.id,
      skill: String(data.skill || "").slice(0, 80),
      status: data.status,
      sourceType: data.sourceType,
      sourceLabel,
      validatedAt: data.validatedAt?.toDate?.()?.toISOString() || data.validatedAt?.toISOString?.() || null,
      validator: owner ? { id: data.validatedBy || null, name: validatorName || "GO reviewer" } : validatorName ? { name: validatorName } : { name: data.sourceType === "mentorship" ? "GO mentor" : "GO project collaborator" },
      canValidate,
    });
  }
  evidence.sort((a, b) => String(b.validatedAt || "").localeCompare(String(a.validatedAt || "")));
  const verifiedUse = new Map();
  const validationCounts = new Map();
  for (const item of evidence) if (item.status === "validated") {
    const key = getSkillKey(item.skill);
    validationCounts.set(key, (validationCounts.get(key) || 0) + 1);
    if (item.sourceType === "project") verifiedUse.set(key, (verifiedUse.get(key) || 0) + 1);
  }
  return {
    selfReportedSkills: skills,
    evidence,
    skillSummary: [...new Set([...skills, ...evidence.map((item) => item.skill)])].map((skill) => ({
      skill,
      selfReported: skills.some((value) => getSkillKey(value) === getSkillKey(skill)),
      verifiedUseCount: verifiedUse.get(getSkillKey(skill)) || 0,
      validationCount: validationCounts.get(getSkillKey(skill)) || 0,
    })).sort((a, b) => b.verifiedUseCount - a.verifiedUseCount || a.skill.localeCompare(b.skill)),
    mentorshipSources: mentorshipSources.docs.filter((doc) => doc.data().status === "active").map((doc) => ({ id: doc.id, label: "Active GO mentorship" })),
    owner,
  };
}

export async function requestSkillEvidence(userId, body) {
  const skill = sanitizeSkills([body.skill], { max: 1 })[0];
  const sourceType = body.sourceType;
  const sourceId = String(body.sourceId || "").trim();
  if (!skill || !["project", "mentorship"].includes(sourceType) || !/^[A-Za-z0-9_-]{1,180}$/.test(sourceId)) {
    throw unavailable("Choose a GO skill tag and a valid project or active mentorship.");
  }
  const { skills } = await skillOwner(userId);
  if (!skills.some((value) => getSkillKey(value) === getSkillKey(skill))) throw unavailable("Only a skill already listed on your GO profile can be validated.", 403);
  if (sourceType === "project") {
    const project = await adminDb.collection("projects").doc(sourceId).get();
    if (!project.exists || !isProjectMember(project.data(), { uid: userId })) throw unavailable("You need to be part of the project before requesting skill validation.", 403);
  } else {
    const engagement = await adminDb.collection("mentorship_engagements").doc(sourceId).get();
    if (!engagement.exists || engagement.data().status !== "active" || engagement.data().menteeUserId !== userId) throw unavailable("Choose an active GO mentorship where you are the mentee.", 403);
  }
  const ref = adminDb.collection("go_skill_evidence").doc(evidenceId(userId, skill, sourceType, sourceId));
  const existing = await ref.get();
  if (existing.exists) throw unavailable(existing.data().status === "validated" ? "This skill already has verified evidence for that collaboration." : "A validation request already exists for that collaboration.", 409);
  const pending = await adminDb.collection("go_skill_evidence")
    .where("userId", "==", userId)
    .where("status", "==", "pending")
    .limit(20)
    .get();
  if (pending.docs.length >= 20) throw unavailable("Resolve existing skill validation requests before creating more.", 429);
  await ref.create({ userId, skill, sourceType, sourceId, status: "pending", requestedAt: new Date() });
  return { id: ref.id, status: "pending" };
}

export async function validateSkillEvidence(reviewer, evidenceKey) {
  if (!/^[a-f\d]{64}$/i.test(evidenceKey || "")) throw unavailable("Choose a valid skill evidence request.");
  const ref = adminDb.collection("go_skill_evidence").doc(evidenceKey);
  return adminDb.runTransaction(async (transaction) => {
    const evidenceDoc = await transaction.get(ref);
    if (!evidenceDoc.exists || evidenceDoc.data().status !== "pending") throw unavailable("This validation request is no longer available.", 409);
    const evidence = evidenceDoc.data();
    if (reviewer.uid === evidence.userId) throw unavailable("You cannot validate your own skill evidence.", 403);
    const sourceRef = adminDb.collection(evidence.sourceType === "project" ? "projects" : "mentorship_engagements").doc(evidence.sourceId);
    const [sourceDoc, memberDoc] = await Promise.all([
      transaction.get(sourceRef),
      transaction.get(adminDb.collection("users").doc(evidence.userId)),
    ]);
    if (!sourceDoc.exists || !memberDoc.exists) throw unavailable("The collaboration record is no longer available.", 409);
    const permitted = evidence.sourceType === "project"
      ? isProjectMember(sourceDoc.data(), { uid: reviewer.uid }) && isProjectMember(sourceDoc.data(), { uid: evidence.userId })
      : sourceDoc.data().status === "active" && sourceDoc.data().mentorId === reviewer.uid && sourceDoc.data().menteeUserId === evidence.userId;
    if (!permitted) throw unavailable("Only a collaborator on this project or the active GO mentor can validate this request.", 403);
    if (!sanitizeSkills(memberDoc.data()?.skills || []).some((skill) => getSkillKey(skill) === getSkillKey(evidence.skill))) {
      throw unavailable("This skill is no longer listed on the creator’s GO profile.", 409);
    }
    const now = new Date();
    transaction.update(ref, { status: "validated", validatedBy: reviewer.uid, validatedAt: now });
    appendJourneyEvent(transaction, {
      uid: evidence.userId,
      type: "skill_validated",
      sourceId: evidenceKey,
      title: "GO skill evidence validated",
      summary: `${evidence.skill} was validated through ${evidence.sourceType === "mentorship" ? "an active GO mentorship" : "project collaboration"}.`,
      publicTitle: "A GO skill was validated",
      publicSummary: "A skill was validated through a GO project or mentorship collaboration.",
      occurredAt: now,
      metadata: { skill: evidence.skill, sourceType: evidence.sourceType },
    });
    return { id: evidenceKey, status: "validated", validatedAt: now.toISOString() };
  });
}
