import nextEnv from "@next/env";
import { createHash } from "node:crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import {
  deterministicProjectId,
  deterministicSourceProjectId,
  LEGACY_PROJECTS,
  LEGACY_SCHEMA_VERSION,
  LEGACY_SOURCE,
} from "./legacy-projects.mjs";

const { loadEnvConfig } = nextEnv;

process.env.NODE_ENV ||= "production";
loadEnvConfig(process.cwd(), false, { info: () => {}, error: () => {} });

const apply = process.argv.includes("--apply");
const ownerUid = process.env.LEGACY_PROJECT_OWNER_UID?.trim();
const importedBy = process.env.LEGACY_IMPORT_ADMIN_UID?.trim() || ownerUid;

if (!ownerUid) {
  throw new Error(
    "Set LEGACY_PROJECT_OWNER_UID to the resolved Firebase owner UID before running the importer."
  );
}

if (apply && !importedBy) {
  throw new Error(
    "Set LEGACY_IMPORT_ADMIN_UID (or LEGACY_PROJECT_OWNER_UID) before applying the import."
  );
}

const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
const app =
  getApps()[0] ||
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
const db = getFirestore(app);

function normalizedSourceRow(project) {
  return JSON.stringify({
    submissionId: project.submissionId,
    title: project.title,
    sourceGroup: project.sourceGroup,
    sourceTitle: project.sourceTitle,
    location: project.location,
    period: project.period,
    startedOn: project.startedOn,
    completedOn: project.completedOn,
    type: project.type,
    categoryTags: project.categoryTags,
    description: project.description,
    goal: project.goal,
    duration: project.duration,
    budget: project.budget,
    budgetCurrency: project.budgetCurrency,
    donors: project.donors,
    compensationType: project.compensationType,
    requiredRoles: project.requiredRoles,
    results: project.results,
  });
}

function sourceRowHash(project) {
  return createHash("sha256")
    .update(normalizedSourceRow(project))
    .digest("hex");
}

function projectDate(value, fallback) {
  return value ? new Date(`${value}T00:00:00.000Z`) : fallback;
}

function publicLegacyDetails(project) {
  return {
    sourceTitle: project.sourceTitle,
    location: project.location,
    period: project.period,
    donors: project.donors,
    results: project.results,
  };
}

function legacyImportDetails(project, now) {
  return {
    schemaVersion: LEGACY_SCHEMA_VERSION,
    source: LEGACY_SOURCE,
    submissionId: project.submissionId,
    sourceRowHash: sourceRowHash(project),
    unresolvedContributors: [],
    startedOn: project.startedOn || null,
    completedOn: project.completedOn || null,
    projectLinks: [],
    media: [],
    mediaPermission: "not_granted",
    consentRecordedAt: now.toISOString(),
    importedAt: now,
    importedBy,
  };
}

function findExistingProject(project, projectDocs) {
  const deterministicId = deterministicProjectId(project.submissionId);
  const bySubmission = projectDocs.find(
    (candidate) => candidate.id === deterministicId
  );
  if (bySubmission) return bySubmission;

  return projectDocs.find(
    (candidate) =>
      candidate.owner === ownerUid &&
      (candidate.legacyImport?.submissionId === project.submissionId ||
        candidate.title === project.existingProjectTitle)
  );
}

async function main() {
  const [projectSnapshot, sourceSnapshot] = await Promise.all([
    db.collection("projects").limit(500).get(),
    db.collection("sourceProjects").limit(500).get(),
  ]);
  const projectDocs = projectSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  const sourceDocs = new Map(
    sourceSnapshot.docs.map((doc) => [doc.id, { id: doc.id, ...doc.data() }])
  );
  const now = new Date();
  const plans = [];
  const plannedProjectIds = new Map();

  for (const project of LEGACY_PROJECTS) {
    const deterministicId = deterministicProjectId(project.submissionId);
    const existing = findExistingProject(project, projectDocs);
    const id = existing?.id || deterministicId;
    plannedProjectIds.set(project.submissionId, id);
    const hash = sourceRowHash(project);
    const unchanged = existing?.legacyImport?.sourceRowHash === hash;
    plans.push({ project, existing, id, hash, unchanged });
  }

  const sourcePlans = new Map();
  for (const plan of plans) {
    const { project, id } = plan;
    const sourceId =
      plan.existing?.sourceProject ||
      deterministicSourceProjectId(project.sourceGroup);
    const existingSource = sourceDocs.get(sourceId);
    if (!sourcePlans.has(sourceId)) {
      sourcePlans.set(sourceId, {
        id: sourceId,
        name: project.sourceGroup,
        existing: existingSource,
        projectIds: new Set(existingSource?.projectIds || []),
      });
    }
    sourcePlans.get(sourceId).projectIds.add(id);
  }

  const rows = plans.map(({ project, existing, id, unchanged }) => ({
    submissionId: project.submissionId,
    id,
    title: project.title,
    action: unchanged ? "unchanged" : existing ? "update" : "create",
    status: "completed",
    sourceGroup: project.sourceGroup,
    ownerUid,
  }));

  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "dry-run",
        projectCount: rows.length,
        sourceProjectCount: sourcePlans.size,
        rows,
      },
      null,
      2
    )
  );

  if (!apply) return;

  const batch = db.batch();
  for (const plan of plans) {
    const { project, existing, id } = plan;
    const linkedProjects = (project.linkedSubmissionIds || [])
      .map((submissionId) => plannedProjectIds.get(submissionId))
      .filter(Boolean);
    const sourceId =
      existing?.sourceProject ||
      deterministicSourceProjectId(project.sourceGroup);
    const projectRef = db.collection("projects").doc(id);
    const preservedMembers = existing?.teamMembers || [ownerUid];
    const preservedAdmins = existing?.admins || [ownerUid];
    const payload = {
      title: existing?.title || project.title,
      thumbnail: existing?.thumbnail || "",
      categoryTags: existing?.categoryTags?.length
        ? existing.categoryTags
        : project.categoryTags,
      type: existing?.type || project.type,
      description: existing?.description || project.description,
      visibility: existing?.visibility || "Public",
      applicationAccess: existing?.applicationAccess || "all_signed_in_users",
      goal: existing?.goal || project.goal,
      duration: existing?.duration || project.duration,
      budget: existing?.budget ?? project.budget,
      budgetCurrency: existing?.budgetCurrency || project.budgetCurrency,
      compensationType: existing?.compensationType || project.compensationType,
      requiredRoles: existing?.requiredRoles?.length
        ? existing.requiredRoles
        : project.requiredRoles,
      linkedProjects: linkedProjects.length
        ? linkedProjects
        : existing?.linkedProjects || [],
      owner: existing?.owner || ownerUid,
      admins: preservedAdmins,
      teamMembers: preservedMembers,
      status: "completed",
      sourceProject: sourceId,
      archived: existing?.archived === true,
      legacyDetails: existing?.legacyDetails || publicLegacyDetails(project),
      legacyImport: legacyImportDetails(project, now),
      createdAt: existing?.createdAt || projectDate(project.startedOn, now),
      updatedAt: now,
    };
    batch.set(projectRef, payload, { merge: true });
  }

  for (const sourcePlan of sourcePlans.values()) {
    const ref = db.collection("sourceProjects").doc(sourcePlan.id);
    batch.set(
      ref,
      {
        name: sourcePlan.existing?.name || sourcePlan.name,
        sourceOwner: sourcePlan.existing?.sourceOwner || ownerUid,
        projectIds: [...sourcePlan.projectIds],
        createdAt: sourcePlan.existing?.createdAt || now,
        updatedAt: now,
      },
      { merge: true }
    );
  }

  const userRef = db.collection("users").doc(ownerUid);
  batch.set(
    userRef,
    {
      uid: ownerUid,
      ownerOfProjects: FieldValue.arrayUnion(...plans.map((plan) => plan.id)),
      adminOfProjects: FieldValue.arrayUnion(...plans.map((plan) => plan.id)),
      teamMemberOfProjects: FieldValue.arrayUnion(
        ...plans.map((plan) => plan.id)
      ),
      updatedAt: now,
    },
    { merge: true }
  );

  await batch.commit();
  console.log(
    JSON.stringify(
      {
        applied: true,
        projectIds: plans.map((plan) => plan.id),
        sourceProjectIds: [...sourcePlans.keys()],
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
