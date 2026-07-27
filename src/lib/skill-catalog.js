import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import {
  DEFAULT_SKILL_DIRECTORY,
  LANDING_FALLBACK_SKILLS,
} from "@/constants/skills";
import {
  aggregateSkillUsage,
  getSkillDocumentId,
  getSkillKey,
  normalizeSkillName,
  sanitizeSkills,
  sortPopularSkills,
} from "@/lib/skills";

const COLLECTION = "skill_catalog";
const DEFAULTS_MARKER = "_defaults";

function publicSkill(id, data) {
  return {
    id,
    name: data.name,
    category: data.category || "Other",
    active: data.active === true,
    status: data.status || (data.active ? "approved" : "pending"),
    source: data.source || "user",
    usageCount: Math.max(0, Number(data.usageCount) || 0),
  };
}

function defaultSkillData(skill) {
  return {
    name: skill.name,
    normalizedName: getSkillKey(skill.name),
    category: skill.category,
    active: true,
    status: "approved",
    source: "default",
    usageCount: FieldValue.increment(0),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

export async function ensureDefaultSkillCatalog() {
  const collection = adminDb.collection(COLLECTION);
  const marker = await collection.doc(DEFAULTS_MARKER).get();
  if (marker.exists) return;

  const batch = adminDb.batch();
  for (const skill of DEFAULT_SKILL_DIRECTORY) {
    batch.set(
      collection.doc(getSkillDocumentId(skill.name)),
      defaultSkillData(skill),
      { merge: true }
    );
  }
  batch.set(collection.doc(DEFAULTS_MARKER), {
    initializedAt: FieldValue.serverTimestamp(),
    version: 1,
  });
  await batch.commit();
}

export async function getSkillCatalog({ includeInactive = false } = {}) {
  await ensureDefaultSkillCatalog();
  const snapshot = await adminDb.collection(COLLECTION).get();
  const skills = snapshot.docs
    .filter((doc) => doc.id !== DEFAULTS_MARKER)
    .map((doc) => publicSkill(doc.id, doc.data()));

  return skills
    .filter((skill) => includeInactive || skill.active)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getPopularSkills(limit = 14) {
  const skills = await getSkillCatalog();
  const popular = sortPopularSkills(skills).slice(0, limit);

  if (popular.some((skill) => skill.usageCount > 0)) return popular;

  return LANDING_FALLBACK_SKILLS.slice(0, limit).map((name) => {
    const match = skills.find((skill) => getSkillKey(skill.name) === getSkillKey(name));
    return match || {
      id: getSkillDocumentId(name),
      name,
      category: "Other",
      active: true,
      status: "approved",
      source: "default",
      usageCount: 0,
    };
  });
}

export async function syncUserSkillUsage({
  previousSkills = [],
  nextSkills = [],
  userId,
}) {
  const previous = new Map(
    sanitizeSkills(previousSkills).map((name) => [getSkillDocumentId(name), name])
  );
  const next = new Map(
    sanitizeSkills(nextSkills).map((name) => [getSkillDocumentId(name), name])
  );
  const added = [...next].filter(([id]) => !previous.has(id));
  const removed = [...previous].filter(([id]) => !next.has(id));

  if (added.length === 0 && removed.length === 0) return;

  const collection = adminDb.collection(COLLECTION);
  await adminDb.runTransaction(async (transaction) => {
    const changed = [...added, ...removed];
    const snapshots = await Promise.all(
      changed.map(([id]) => transaction.get(collection.doc(id)))
    );
    const snapshotById = new Map(
      changed.map(([entryId], index) => [entryId, snapshots[index]])
    );

    for (const [id, name] of added) {
      const reference = collection.doc(id);
      const snapshot = snapshotById.get(id);
      if (snapshot.exists) {
        transaction.update(reference, {
          usageCount: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        transaction.set(reference, {
          name,
          normalizedName: getSkillKey(name),
          category: "Other",
          active: false,
          status: "pending",
          source: "user",
          usageCount: 1,
          createdBy: userId,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    for (const [id] of removed) {
      const reference = collection.doc(id);
      const snapshot = snapshotById.get(id);
      if (snapshot.exists && Number(snapshot.data().usageCount) > 0) {
        transaction.update(reference, {
          usageCount: FieldValue.increment(-1),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }
  });
}

export async function createCatalogSkill({ name, category, adminUserId }) {
  const normalizedName = normalizeSkillName(name);
  if (!normalizedName) throw new Error("Skill name is required.");

  const reference = adminDb
    .collection(COLLECTION)
    .doc(getSkillDocumentId(normalizedName));
  const snapshot = await reference.get();
  const now = FieldValue.serverTimestamp();

  await reference.set(
    {
      name: normalizedName,
      normalizedName: getSkillKey(normalizedName),
      category: category || "Other",
      active: true,
      status: "approved",
      source: snapshot.exists ? snapshot.data().source || "admin" : "admin",
      usageCount: snapshot.exists ? Number(snapshot.data().usageCount) || 0 : 0,
      reviewedBy: adminUserId,
      reviewedAt: now,
      createdAt: snapshot.exists ? snapshot.data().createdAt || now : now,
      updatedAt: now,
    },
    { merge: true }
  );

  const updated = await reference.get();
  return publicSkill(updated.id, updated.data());
}

export async function updateCatalogSkill({
  id,
  category,
  active,
  adminUserId,
}) {
  const reference = adminDb.collection(COLLECTION).doc(id);
  const snapshot = await reference.get();
  if (!snapshot.exists) throw new Error("Skill not found.");

  const update = {
    reviewedBy: adminUserId,
    reviewedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (category) update.category = category;
  if (typeof active === "boolean") {
    update.active = active;
    update.status = active ? "approved" : "inactive";
  }

  await reference.update(update);
  return publicSkill(id, { ...snapshot.data(), ...update });
}

export async function rebuildSkillUsage({ adminUserId }) {
  await ensureDefaultSkillCatalog();
  const users = await adminDb.collection("users").get();
  const usage = aggregateSkillUsage(users.docs.map((doc) => doc.data()));
  const catalog = await adminDb.collection(COLLECTION).get();
  const batch = adminDb.batch();
  const catalogDocs = catalog.docs.filter((doc) => doc.id !== DEFAULTS_MARKER);
  const existingIds = new Set(catalogDocs.map((doc) => doc.id));
  const now = FieldValue.serverTimestamp();

  for (const doc of catalogDocs) {
    const count = usage.get(getSkillKey(doc.data().name))?.count || 0;
    batch.update(doc.ref, { usageCount: count, updatedAt: now });
  }

  for (const { name, count } of usage.values()) {
    const id = getSkillDocumentId(name);
    if (existingIds.has(id)) continue;
    batch.set(adminDb.collection(COLLECTION).doc(id), {
      name,
      normalizedName: getSkillKey(name),
      category: "Other",
      active: false,
      status: "pending",
      source: "user",
      usageCount: count,
      createdBy: "existing-profile-import",
      reviewedBy: null,
      rebuiltBy: adminUserId,
      createdAt: now,
      updatedAt: now,
    });
  }

  await batch.commit();
  return getSkillCatalog({ includeInactive: true });
}
