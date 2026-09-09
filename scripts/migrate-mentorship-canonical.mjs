import crypto from "node:crypto";
import { db } from "./lib/firebase-admin.mjs";

const apply = process.argv.includes("--apply");
const rollback = process.argv.includes("--rollback");
const batchIdArg = process.argv.find((value) => value.startsWith("--batch-id="));
const batchId = batchIdArg?.split("=")[1] || `mentorship-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const pairs = [
  ["mentorship_pilot_requests", "mentorship_requests"],
  ["mentorship_pilot_active_requests", "mentorship_active_requests"],
  ["mentorship_pilot_engagements", "mentorship_engagements"],
];

function comparable(data = {}) {
  const copy = { ...data };
  delete copy.canonicalMigration;
  return JSON.stringify(copy, Object.keys(copy).sort());
}

async function rollbackBatch() {
  if (!batchIdArg) throw new Error("Rollback requires --batch-id=<the exact applied batch id>");
  const collections = [...new Set(pairs.map(([, destination]) => destination))];
  let removed = 0;
  for (const collection of collections) {
    const snapshot = await db.collection(collection).where("canonicalMigration.batchId", "==", batchId).get();
    console.log(`${collection}: ${snapshot.size} records created by ${batchId}`);
    if (apply) {
      for (let offset = 0; offset < snapshot.docs.length; offset += 400) {
        const batch = db.batch();
        snapshot.docs.slice(offset, offset + 400).forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }
      removed += snapshot.size;
    }
  }
  console.log(JSON.stringify({ mode: apply ? "rollback" : "rollback-dry-run", batchId, removed }, null, 2));
}

async function migrate() {
  const report = { mode: apply ? "apply" : "dry-run", batchId, collections: [], totals: { source: 0, create: 0, identical: 0, collisions: 0 } };
  for (const [sourceName, destinationName] of pairs) {
    const [source, destination] = await Promise.all([db.collection(sourceName).get(), db.collection(destinationName).get()]);
    const destinationById = new Map(destination.docs.map((doc) => [doc.id, doc.data()]));
    const creates = [];
    const collisions = [];
    let identical = 0;
    for (const doc of source.docs) {
      const existing = destinationById.get(doc.id);
      if (!existing) creates.push(doc);
      else if (comparable(existing) === comparable(doc.data())) identical += 1;
      else collisions.push({ idHash: crypto.createHash("sha256").update(doc.id).digest("hex").slice(0, 16), source: sourceName, destination: destinationName });
    }
    const item = { source: sourceName, destination: destinationName, sourceCount: source.size, destinationCount: destination.size, createCount: creates.length, identicalCount: identical, collisionCount: collisions.length, collisions };
    report.collections.push(item);
    report.totals.source += source.size; report.totals.create += creates.length; report.totals.identical += identical; report.totals.collisions += collisions.length;
    if (apply && collisions.length) throw new Error(`${sourceName} has ${collisions.length} collision(s); resolve them before applying`);
    if (apply) {
      for (let offset = 0; offset < creates.length; offset += 400) {
        const batch = db.batch();
        creates.slice(offset, offset + 400).forEach((doc) => batch.create(db.collection(destinationName).doc(doc.id), { ...doc.data(), canonicalMigration: { batchId, sourceCollection: sourceName, sourceId: doc.id, copiedAt: new Date() } }));
        await batch.commit();
      }
    }
  }
  console.log(JSON.stringify(report, null, 2));
  if (!apply) console.log("Dry run only. Re-run with --apply after reviewing this collision report. Source records are never deleted.");
}

if (rollback) await rollbackBatch(); else await migrate();
