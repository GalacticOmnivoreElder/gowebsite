export const dynamic = "force-dynamic";

import { getRequestUser } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";
import { ASSET_PACK_ACCESS_TYPES, assetPackGrantId, serializeAssetPackVersion } from "@/lib/asset-packs";
import { createProductNotification } from "@/lib/product-notifications";
import { enqueueEmailEventForUsers } from "@/lib/email";

async function requireAdmin(request) {
  const user = await getRequestUser(request);
  if (!user) return { response: Response.json({ error: "Authentication required" }, { status: 401 }) };
  if (!user.admin) return { response: Response.json({ error: "Platform admin access required" }, { status: 403 }) };
  return { user };
}

function cleanReason(value) {
  return String(value || "").trim().slice(0, 2000);
}

function addAuditToBatch(batch, { actorId, action, targetType, targetId, previousValue, newValue, reason }, now) {
  const ref = adminDb.collection("admin_audit_events").doc();
  batch.create(ref, { actorId, action, target: { type: targetType, id: targetId }, previousValue: previousValue ?? null, newValue: newValue ?? null, reason: cleanReason(reason), createdAt: now });
}

export async function GET(request) {
  const gate = await requireAdmin(request);
  if (gate.response) return gate.response;
  const [packs, versions, grants] = await Promise.all([
    adminDb.collection("asset_packs").limit(500).get(),
    adminDb.collection("asset_pack_versions").limit(1000).get(),
    adminDb.collection("asset_pack_grants").limit(1000).get(),
  ]);
  return Response.json({
    packs: packs.docs.map((doc) => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null, updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null })),
    versions: versions.docs.map((doc) => ({ ...serializeAssetPackVersion(doc.id, doc.data()), downloadUrl: doc.data().downloadUrl || "" })),
    grants: grants.docs.map((doc) => ({ id: doc.id, packId: doc.data().packId, userId: doc.data().userId, status: doc.data().status })),
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request) {
  const gate = await requireAdmin(request);
  if (gate.response) return gate.response;
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "");
  const now = new Date();
  if (action === "grant_access") {
    const packId = String(body.packId || "");
    const userId = String(body.userId || "");
    if (!packId || !userId) return Response.json({ error: "Pack and user are required" }, { status: 400 });
    const id = assetPackGrantId(packId, userId);
    const grantRef = adminDb.collection("asset_pack_grants").doc(id);
    const [packDoc, userDoc, previousGrant] = await Promise.all([adminDb.collection("asset_packs").doc(packId).get(), adminDb.collection("users").doc(userId).get(), grantRef.get()]);
    if (!packDoc.exists || !userDoc.exists) return Response.json({ error: "Pack or user not found" }, { status: 404 });
    const reason = cleanReason(body.reason);
    if (!reason) return Response.json({ error: "A reason is required for individual access changes" }, { status: 400 });
    const status = body.revoked === true ? "revoked" : "active";
    const batch = adminDb.batch();
    batch.set(grantRef, { packId, userId, status, grantedBy: gate.user.uid, createdAt: previousGrant.data()?.createdAt || now, updatedAt: now }, { merge: true });
    addAuditToBatch(batch, { actorId: gate.user.uid, action: `asset_pack.access_${status}`, targetType: "asset_pack_grant", targetId: id, previousValue: previousGrant.exists ? { status: previousGrant.data().status } : null, newValue: { packId, userId, status }, reason }, now);
    await batch.commit();
    return Response.json({ id, status });
  }
  if (action === "set_access_type") {
    const accessType = ASSET_PACK_ACCESS_TYPES.includes(body.accessType) ? body.accessType : null;
    if (!accessType) return Response.json({ error: "Unsupported asset-pack access type" }, { status: 400 });
    const reason = cleanReason(body.reason);
    if (!reason) return Response.json({ error: "A reason is required for access-type changes" }, { status: 400 });
    const ref = adminDb.collection("asset_packs").doc(String(body.packId || ""));
    const doc = await ref.get();
    if (!doc.exists || !doc.data().currentVersionId) return Response.json({ error: "Published asset pack not found" }, { status: 404 });
    const batch = adminDb.batch();
    batch.update(ref, { accessType, updatedAt: now, lastReviewedBy: gate.user.uid });
    addAuditToBatch(batch, { actorId: gate.user.uid, action: "asset_pack.access_type_changed", targetType: "asset_pack", targetId: doc.id, previousValue: { accessType: doc.data().accessType || "community" }, newValue: { accessType }, reason }, now);
    await batch.commit();
    return Response.json({ id: doc.id, accessType });
  }
  if (action === "set_pack_status") {
    const status = ["legacy", "archived", "removed", "published"].includes(body.status) ? body.status : null;
    if (!status) return Response.json({ error: "Unsupported asset-pack status" }, { status: 400 });
    const ref = adminDb.collection("asset_packs").doc(String(body.packId || ""));
    const doc = await ref.get();
    if (!doc.exists) return Response.json({ error: "Asset pack not found" }, { status: 404 });
    if (status === "published" && !doc.data().currentVersionId) return Response.json({ error: "A reviewed version must be published first" }, { status: 409 });
    const reason = cleanReason(body.reason);
    if (!reason) return Response.json({ error: "A reason is required for asset-pack status changes" }, { status: 400 });
    const batch = adminDb.batch();
    batch.update(ref, { status, updatedAt: now, lastReviewedBy: gate.user.uid });
    addAuditToBatch(batch, { actorId: gate.user.uid, action: `asset_pack.status_${status}`, targetType: "asset_pack", targetId: doc.id, previousValue: { status: doc.data().status }, newValue: { status }, reason }, now);
    await batch.commit();
    return Response.json({ id: doc.id, status });
  }
  if (action === "delete_pack") {
    const packId = String(body.packId || "").trim();
    if (!packId) return Response.json({ error: "Asset pack is required" }, { status: 400 });
    const reason = cleanReason(body.reason);
    if (!reason) return Response.json({ error: "A reason is required for permanent deletion" }, { status: 400 });
    const packRef = adminDb.collection("asset_packs").doc(packId);
    try {
      const result = await adminDb.runTransaction(async (transaction) => {
        const packDoc = await transaction.get(packRef);
        if (!packDoc.exists) throw Object.assign(new Error("Asset pack not found"), { status: 404 });
        const versionSnapshot = await transaction.get(adminDb.collection("asset_pack_versions").where("packId", "==", packId));
        const grantSnapshot = await transaction.get(adminDb.collection("asset_pack_grants").where("packId", "==", packId));
        const ticketSnapshot = await transaction.get(adminDb.collection("protected_link_tickets").where("assetPackId", "==", packId));
        const ticketDocs = ticketSnapshot.docs.filter((doc) => doc.data().contentType === "asset_pack");
        const recordsToDelete = 1 + versionSnapshot.size + grantSnapshot.size + ticketDocs.length;
        if (recordsToDelete > 450) throw Object.assign(new Error("This asset pack has too many linked records for one deletion action; remove it instead"), { status: 409 });

        const auditRef = adminDb.collection("admin_audit_events").doc();
        transaction.create(auditRef, { actorId: gate.user.uid, action: "asset_pack.deleted", target: { type: "asset_pack", id: packId }, previousValue: { status: packDoc.data().status, title: packDoc.data().title || "", currentVersionId: packDoc.data().currentVersionId || null, versionCount: versionSnapshot.size, grantCount: grantSnapshot.size, ticketCount: ticketDocs.length }, newValue: null, reason, createdAt: now });
        for (const snapshot of [versionSnapshot, grantSnapshot]) {
          snapshot.docs.forEach((doc) => transaction.delete(doc.ref));
        }
        ticketDocs.forEach((doc) => transaction.delete(doc.ref));
        transaction.delete(packRef);
        return { versionCount: versionSnapshot.size, grantCount: grantSnapshot.size, ticketCount: ticketDocs.length };
      });
      return Response.json({ id: packId, deleted: true, ...result });
    } catch (error) {
      return Response.json({ error: error.status ? error.message : "Asset pack could not be permanently deleted" }, { status: error.status || 500 });
    }
  }
  const versionRef = adminDb.collection("asset_pack_versions").doc(String(body.versionId || ""));
  const versionDoc = await versionRef.get();
  if (!versionDoc.exists) return Response.json({ error: "Asset-pack version not found" }, { status: 404 });
  const version = versionDoc.data();
  const packRef = adminDb.collection("asset_packs").doc(version.packId);
  const packDoc = await packRef.get();
  if (!packDoc.exists) return Response.json({ error: "Asset pack not found" }, { status: 404 });
  if (packDoc.data().pendingVersionId !== versionRef.id) return Response.json({ error: "Only the current pending version can be reviewed or published" }, { status: 409 });
  const hasPublishedVersion = !!packDoc.data().currentVersionId;
  if (action === "request_changes") {
    if (version.status !== "submitted") return Response.json({ error: "Only submitted versions can receive change requests" }, { status: 409 });
    const reviewMessage = String(body.reviewMessage || "").trim().slice(0, 3000);
    if (!reviewMessage) return Response.json({ error: "Review guidance is required" }, { status: 400 });
    const batch = adminDb.batch();
    batch.update(versionRef, { status: "changes_requested", reviewMessage, reviewedBy: gate.user.uid, reviewedAt: now, updatedAt: now });
    batch.update(packRef, { ...(!hasPublishedVersion ? { status: "changes_requested" } : {}), updatedAt: now });
    addAuditToBatch(batch, { actorId: gate.user.uid, action: "asset_pack_version.changes_requested", targetType: "asset_pack_version", targetId: versionRef.id, previousValue: { status: version.status }, newValue: { status: "changes_requested" }, reason: reviewMessage }, now);
    await batch.commit();
    await notifyContributor(version, versionRef.id, "Changes requested", reviewMessage);
    return Response.json({ id: versionRef.id, status: "changes_requested" });
  }
  if (action === "approve") {
    if (version.status !== "submitted") return Response.json({ error: "Only submitted versions can be approved" }, { status: 409 });
    const reason = cleanReason(body.reason);
    if (!reason) return Response.json({ error: "An approval reason is required" }, { status: 400 });
    const batch = adminDb.batch();
    batch.update(versionRef, { status: "approved", reviewMessage: "", reviewedBy: gate.user.uid, reviewedAt: now, updatedAt: now });
    batch.update(packRef, { ...(!hasPublishedVersion ? { status: "approved" } : {}), updatedAt: now });
    addAuditToBatch(batch, { actorId: gate.user.uid, action: "asset_pack_version.approved", targetType: "asset_pack_version", targetId: versionRef.id, previousValue: { status: version.status }, newValue: { status: "approved" }, reason }, now);
    await batch.commit();
    await notifyContributor(version, versionRef.id, "Asset pack approved", "Your asset-pack version is approved and ready for administrator publication.");
    return Response.json({ id: versionRef.id, status: "approved" });
  }
  if (action === "publish") {
    if (version.status !== "approved") return Response.json({ error: "Only approved versions can be published" }, { status: 409 });
    const accessType = ASSET_PACK_ACCESS_TYPES.includes(body.accessType) ? body.accessType : "community";
    const reason = cleanReason(body.reason);
    if (!reason) return Response.json({ error: "A publication reason is required" }, { status: 400 });
    const publicFields = {
      title: version.title,
      description: version.description,
      contributorProfile: version.contributorProfile,
      previewImage: version.previewImage,
      fileManifest: version.fileManifest || [],
      compatibility: version.compatibility || [],
      version: version.version,
      license: version.license,
      otherLicense: version.otherLicense || "",
      attributionRequirements: version.attributionRequirements || "",
      commercialUseAllowed: version.commercialUseAllowed === true,
      dependencies: version.dependencies || [],
    };
    const batch = adminDb.batch();
    batch.update(versionRef, { status: "published", publishedAt: now, updatedAt: now });
    batch.set(packRef, { ...publicFields, contributorId: version.contributorId, contributorDisplayName: version.contributorDisplayName, status: "published", accessType, currentVersionId: versionRef.id, pendingVersionId: null, publishedAt: now, updatedAt: now, lastReviewedBy: gate.user.uid }, { merge: true });
    addAuditToBatch(batch, { actorId: gate.user.uid, action: "asset_pack_version.published", targetType: "asset_pack", targetId: version.packId, previousValue: { status: packDoc.data().status, currentVersionId: packDoc.data().currentVersionId || null, accessType: packDoc.data().accessType || "community" }, newValue: { status: "published", currentVersionId: versionRef.id, accessType }, reason }, now);
    await batch.commit();
    await notifyContributor(version, versionRef.id, "Asset pack published", "Your approved asset-pack version is now published.");
    return Response.json({ id: version.packId, status: "published", accessType });
  }
  return Response.json({ error: "Unsupported asset-pack action" }, { status: 400 });
}

async function notifyContributor(version, eventId, title, message) {
  await Promise.allSettled([
    createProductNotification({ recipientUserId: version.contributorId, type: "asset_pack_update", title, message, actionUrl: "/profile?tab=asset-packs" }),
    enqueueEmailEventForUsers({ type: "asset_pack.review_update", eventId: `${eventId}:${title}`, userIds: [version.contributorId], data: { title, message }, scheduledFor: null }),
  ]);
}
