export const dynamic = "force-dynamic";

import { getRequestUser } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";
import { getProductConfig } from "@/lib/product-config";
import { hasCommunityContentAccess } from "@/lib/content-entitlements";
import { ACTIVE_ASSET_PACK_VERSION_STATUSES, assetPackId, assetPackVersionId, cleanAssetPackVersion, isPublicAssetPack, serializeAssetPackVersion, toPublicAssetPackDto } from "@/lib/asset-packs";

function unavailable() {
  return Response.json({ error: "Community asset-pack submissions are not available yet" }, { status: 503 });
}

export async function GET(request) {
  if (!getProductConfig().featureFlags.communityAssetSubmissions) return unavailable();
  const user = await getRequestUser(request);
  const publicSnapshot = await adminDb.collection("asset_packs").limit(200).get();
  const publicPacks = publicSnapshot.docs.filter((doc) => isPublicAssetPack(doc.data())).map((doc) => toPublicAssetPackDto(doc.id, doc.data()));
  if (!user) return Response.json({ publicPacks, ownedPacks: [], ownedVersions: [], canSubmit: false }, { headers: { "Cache-Control": "no-store" } });
  const [ownedPacks, ownedVersions] = await Promise.all([
    adminDb.collection("asset_packs").where("contributorId", "==", user.uid).limit(100).get(),
    adminDb.collection("asset_pack_versions").where("contributorId", "==", user.uid).limit(200).get(),
  ]);
  return Response.json({
    publicPacks,
    canSubmit: hasCommunityContentAccess(user.userData || {}, { admin: user.admin }),
    ownedPacks: ownedPacks.docs.map((doc) => ({ id: doc.id, title: doc.data().title, status: doc.data().status, currentVersionId: doc.data().currentVersionId || null, pendingVersionId: doc.data().pendingVersionId || null, createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null })),
    ownedVersions: ownedVersions.docs.map((doc) => ({ ...serializeAssetPackVersion(doc.id, doc.data()), downloadUrl: doc.data().downloadUrl || "" })),
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request) {
  if (!getProductConfig().featureFlags.communityAssetSubmissions) return unavailable();
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  if (!hasCommunityContentAccess(user.userData || {}, { admin: user.admin })) return Response.json({ error: "Active Community or Business membership is required" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const submit = body.submit === true;
  try {
    let packId = String(body.packId || "").trim();
    const isNewVersion = !!packId;
    if (!packId) packId = assetPackId(user.uid);
    const clean = cleanAssetPackVersion(body, { requireSubmission: submit });
    const versionId = assetPackVersionId(packId, clean.version);
    const now = new Date();
    const version = { ...clean, packId, contributorId: user.uid, contributorDisplayName: user.userData?.displayName || user.userData?.username || user.userData?.name || "GO contributor", status: submit ? "submitted" : "draft", reviewMessage: "", createdAt: now, updatedAt: now, submittedAt: submit ? now : null };
    const packRef = adminDb.collection("asset_packs").doc(packId);
    const versionRef = adminDb.collection("asset_pack_versions").doc(versionId);
    await adminDb.runTransaction(async (transaction) => {
      if (!isNewVersion) {
        transaction.create(versionRef, version);
        transaction.create(packRef, { contributorId: user.uid, contributorDisplayName: version.contributorDisplayName, title: clean.title, status: submit ? "submitted" : "draft", currentVersionId: null, pendingVersionId: versionId, accessType: "community", createdAt: now, updatedAt: now });
        return;
      }
      const packDoc = await transaction.get(packRef);
      if (!packDoc.exists || packDoc.data().contributorId !== user.uid) throw Object.assign(new Error("Asset pack not found"), { code: "not_found", status: 404 });
      if (!["published", "legacy"].includes(packDoc.data().status)) throw Object.assign(new Error("A new version is not available for this pack state"), { code: "invalid_pack_state", status: 409 });
      const pendingVersionId = packDoc.data().pendingVersionId;
      if (pendingVersionId) {
        const pendingDoc = await transaction.get(adminDb.collection("asset_pack_versions").doc(pendingVersionId));
        if (pendingDoc.exists && ACTIVE_ASSET_PACK_VERSION_STATUSES.includes(pendingDoc.data().status)) {
          throw Object.assign(new Error("Finish the existing pending version before creating another"), { code: "pending_version_exists", status: 409 });
        }
      }
      transaction.create(versionRef, version);
      transaction.update(packRef, { pendingVersionId: versionId, updatedAt: now });
    });
    return Response.json({ packId, version: serializeAssetPackVersion(versionId, version) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.code === "validation_error" || error.status ? error.message : "Asset pack could not be saved" }, { status: error.status || (error.code === "validation_error" ? 400 : 500) });
  }
}

export async function PATCH(request) {
  if (!getProductConfig().featureFlags.communityAssetSubmissions) return unavailable();
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  if (!hasCommunityContentAccess(user.userData || {}, { admin: user.admin })) return Response.json({ error: "Active Community or Business membership is required" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const versionId = String(body.versionId || "").trim();
  if (!versionId) return Response.json({ error: "Asset-pack version is required" }, { status: 400 });
  const submit = body.submit === true;
  try {
    const now = new Date();
    const result = await adminDb.runTransaction(async (transaction) => {
      const versionRef = adminDb.collection("asset_pack_versions").doc(versionId);
      const versionDoc = await transaction.get(versionRef);
      if (!versionDoc.exists || versionDoc.data().contributorId !== user.uid) throw Object.assign(new Error("Asset-pack version not found"), { status: 404 });
      if (!["draft", "changes_requested"].includes(versionDoc.data().status)) throw Object.assign(new Error("This version can no longer be edited"), { status: 409 });
      const packRef = adminDb.collection("asset_packs").doc(versionDoc.data().packId);
      const packDoc = await transaction.get(packRef);
      if (!packDoc.exists || packDoc.data().contributorId !== user.uid) throw Object.assign(new Error("Asset pack not found"), { status: 404 });
      if (packDoc.data().pendingVersionId !== versionDoc.id) throw Object.assign(new Error("This version is no longer the active pending version"), { status: 409 });
      const clean = cleanAssetPackVersion({ ...versionDoc.data(), ...body }, { requireSubmission: submit });
      const status = submit ? "submitted" : versionDoc.data().status;
      transaction.update(versionRef, { ...clean, status, submittedAt: submit ? now : versionDoc.data().submittedAt || null, updatedAt: now });
      transaction.update(packRef, {
        title: clean.title,
        ...(submit && !packDoc.data().currentVersionId ? { status: "submitted" } : {}),
        updatedAt: now,
      });
      return { id: versionDoc.id, status };
    });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.code === "validation_error" || error.status ? error.message : "Asset-pack version could not be updated" }, { status: error.status || (error.code === "validation_error" ? 400 : 500) });
  }
}

export async function DELETE(request) {
  if (!getProductConfig().featureFlags.communityAssetSubmissions) return unavailable();
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  if (!hasCommunityContentAccess(user.userData || {}, { admin: user.admin })) return Response.json({ error: "Active Community or Business membership is required" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const versionId = String(body.versionId || "").trim();
  if (!versionId) return Response.json({ error: "Asset-pack version is required" }, { status: 400 });

  try {
    const now = new Date();
    const result = await adminDb.runTransaction(async (transaction) => {
      const versionRef = adminDb.collection("asset_pack_versions").doc(versionId);
      const versionDoc = await transaction.get(versionRef);
      if (!versionDoc.exists || versionDoc.data().contributorId !== user.uid) throw Object.assign(new Error("Asset-pack version not found"), { status: 404 });
      if (versionDoc.data().status !== "draft") throw Object.assign(new Error("Only draft versions can be deleted"), { status: 409 });

      const packRef = adminDb.collection("asset_packs").doc(versionDoc.data().packId);
      const packDoc = await transaction.get(packRef);
      if (!packDoc.exists || packDoc.data().contributorId !== user.uid) throw Object.assign(new Error("Asset pack not found"), { status: 404 });
      if (packDoc.data().pendingVersionId !== versionDoc.id) throw Object.assign(new Error("This draft is no longer the active pending version"), { status: 409 });

      const auditRef = adminDb.collection("admin_audit_events").doc();
      transaction.create(auditRef, {
        actorId: user.uid,
        action: "asset_pack_version.deleted",
        target: { type: "asset_pack_version", id: versionRef.id },
        previousValue: { packId: versionDoc.data().packId, status: versionDoc.data().status, title: versionDoc.data().title || "" },
        newValue: null,
        reason: "Contributor deleted draft",
        createdAt: now,
      });
      transaction.delete(versionRef);

      if (!packDoc.data().currentVersionId && packDoc.data().status === "draft") {
        transaction.delete(packRef);
        return { packDeleted: true };
      }

      transaction.update(packRef, { pendingVersionId: null, updatedAt: now });
      return { packDeleted: false };
    });
    return Response.json({ id: versionId, deleted: true, ...result });
  } catch (error) {
    return Response.json({ error: error.status ? error.message : "Asset-pack draft could not be deleted" }, { status: error.status || 500 });
  }
}
