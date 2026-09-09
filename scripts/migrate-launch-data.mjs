import { readFileSync } from "node:fs";
import crypto from "node:crypto";
import { db } from "./lib/firebase-admin.mjs";

const apply = process.argv.includes("--apply");
const mapArg = process.argv.find((value) => value.startsWith("--resource-map="));
const explicitMap = mapArg ? JSON.parse(readFileSync(mapArg.split("=")[1], "utf8")) : {};
const now = new Date();

function timestamp(value) {
  const date = value?.toDate?.() || (value instanceof Date ? value : value ? new Date(value) : null);
  return date && Number.isFinite(date.getTime()) ? date : null;
}

function safeId(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, 16);
}

const [packages, assetPacks, learningItems, profiles, subscriptions, users] = await Promise.all([
  db.collection("packages").get(), db.collection("asset_packs").get(), db.collection("learning_items").get(), db.collection("user_profiles").get(), db.collection("subscriptions").get(), db.collection("users").get(),
]);

const report = {
  mode: apply ? "apply" : "dry-run",
  counts: { packages: packages.size, assetPacks: assetPacks.size, learningItems: learningItems.size, profiles: profiles.size, subscriptions: subscriptions.size, users: users.size },
  resources: { obsoleteStatus: [], mapped: [], unresolved: [] },
  learningLocations: [],
  profileSchema: [],
  subscriptionParity: { activeStoredSubscriptions: 0, usersWithActiveResolverData: 0, subscriptionWithoutUser: [], tierMismatches: [] },
};

const writes = [];
for (const [kind, snapshot] of [["packages", packages], ["asset_packs", assetPacks]]) {
  for (const doc of snapshot.docs) {
    if (doc.data().status !== "legacy") continue;
    report.resources.obsoleteStatus.push({ kind, id: doc.id });
    const mapped = explicitMap?.[kind]?.[doc.id];
    if (!["published", "archived"].includes(mapped)) report.resources.unresolved.push({ kind, id: doc.id, requiredMapping: ["published", "archived"] });
    else {
      report.resources.mapped.push({ kind, id: doc.id, destinationStatus: mapped });
      writes.push(() => doc.ref.update({ status: mapped, lifecycleMigration: { migratedAt: now, previousStatus: "legacy" }, updatedAt: now }));
    }
  }
}

for (const doc of learningItems.docs) {
  const data = doc.data();
  if (!data.location || data.publicLocation || data.privateSessionUrl) continue;
  let isUrl = false;
  try { isUrl = new URL(data.location).protocol === "https:"; } catch {}
  const update = isUrl ? { privateSessionUrl: data.location, publicLocation: "Online", location: null } : { publicLocation: data.location, location: null };
  report.learningLocations.push({ id: doc.id, destination: isUrl ? "privateSessionUrl" : "publicLocation" });
  writes.push(() => doc.ref.update({ ...update, locationSchemaVersion: 2, updatedAt: now }));
}

for (const doc of profiles.docs) {
  if (Number(doc.data().schemaVersion || 0) >= 2) continue;
    report.profileSchema.push({ idHash: safeId(doc.id), from: Number(doc.data().schemaVersion || 0), to: 2 });
  writes.push(() => doc.ref.update({ schemaVersion: 2, schemaMigratedAt: now }));
}

const userById = new Map(users.docs.map((doc) => [doc.id, doc.data()]));
for (const doc of subscriptions.docs) {
  const data = doc.data();
  const end = timestamp(data.subscriptionEndsAt || data.currentPeriodEnd || data.endsAt);
  const status = String(data.status || data.subscriptionStatus || "").toLowerCase();
  const active = ["active", "trialing"].includes(status) || (status === "canceled" && end && end > now);
  if (!active) continue;
  report.subscriptionParity.activeStoredSubscriptions += 1;
  const userId = data.userId || data.uid;
  const user = userById.get(userId);
  if (!user) report.subscriptionParity.subscriptionWithoutUser.push(safeId(doc.id));
  else if (data.membershipTier && user.membershipTier && data.membershipTier !== user.membershipTier) report.subscriptionParity.tierMismatches.push({ subscriptionIdHash: safeId(doc.id), userIdHash: safeId(userId), subscriptionTier: data.membershipTier, userTier: user.membershipTier });
}
for (const user of userById.values()) {
  const end = timestamp(user.subscriptionEndsAt);
  const status = String(user.subscriptionStatus || "").toLowerCase();
  if (!["incomplete", "incomplete_expired", "refunded", "revoked", "unpaid"].includes(status) && (end ? end > now : user.activeMember === true)) report.subscriptionParity.usersWithActiveResolverData += 1;
}

console.log(JSON.stringify(report, null, 2));
if (apply) {
  if (report.resources.unresolved.length) throw new Error("Every obsolete resource status needs an explicit mapping file before --apply");
  for (const write of writes) await write();
  console.log(`Applied ${writes.length} idempotent launch-data updates. No records were deleted.`);
} else {
  console.log("Dry run only. Provide --resource-map=<json> and --apply after owner review. No records were changed.");
}
