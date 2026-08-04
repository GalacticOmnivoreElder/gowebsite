// @ts-check

import crypto from "crypto";
import { hasCommunityContentAccess } from "@/lib/content-entitlements";

export const ASSET_PACK_STATUSES = Object.freeze(["draft", "submitted", "changes_requested", "approved", "published", "legacy", "archived", "removed"]);
export const ASSET_PACK_LICENSES = Object.freeze(["CC0", "CC BY", "CC BY-SA", "MIT", "Other"]);
export const ASSET_PACK_ACCESS_TYPES = Object.freeze(["public", "community", "individual"]);
export const PUBLIC_ASSET_PACK_STATUSES = Object.freeze(["published", "legacy"]);
export const ACTIVE_ASSET_PACK_VERSION_STATUSES = Object.freeze(["draft", "submitted", "changes_requested", "approved"]);

function validationError(message) {
  return Object.assign(new Error(message), { code: "validation_error" });
}

function text(value, max = 5000) {
  return String(value || "").trim().slice(0, max);
}

function httpsUrl(value, label, { driveOnly = false, optional = false } = {}) {
  const clean = text(value, 2000);
  if (!clean && optional) return null;
  try {
    const url = new URL(clean);
    if (url.protocol !== "https:" || (driveOnly && url.hostname !== "drive.google.com")) throw new Error();
    return url.toString();
  } catch {
    throw validationError(`${label} must be a valid ${driveOnly ? "Google Drive " : ""}HTTPS URL`);
  }
}

export function assetPackId(userId, nonce = crypto.randomUUID()) {
  return crypto.createHash("sha256").update(`go-asset-pack:v1:${userId}:${nonce}`).digest("hex");
}

export function assetPackVersionId(packId, version, nonce = crypto.randomUUID()) {
  return crypto.createHash("sha256").update(`go-asset-pack-version:v1:${packId}:${version}:${nonce}`).digest("hex");
}

export function assetPackGrantId(packId, userId) {
  return crypto.createHash("sha256").update(`go-asset-pack-grant:v1:${packId}:${userId}`).digest("hex");
}

export function cleanAssetPackVersion(input = {}, { requireSubmission = false } = {}) {
  const license = ASSET_PACK_LICENSES.includes(input.license) ? input.license : "";
  const result = {
    title: text(input.title, 180),
    description: text(input.description, 8000),
    contributorProfile: text(input.contributorProfile, 2000),
    previewImage: httpsUrl(input.previewImage, "Preview image", { optional: !requireSubmission }),
    downloadUrl: httpsUrl(input.downloadUrl, "Download link", { driveOnly: true, optional: !requireSubmission }),
    fileManifest: Array.isArray(input.fileManifest) ? input.fileManifest.map((item) => text(item, 300)).filter(Boolean).slice(0, 300) : [],
    compatibility: Array.isArray(input.compatibility) ? input.compatibility.map((item) => text(item, 120)).filter(Boolean).slice(0, 50) : [],
    version: text(input.version, 60),
    license,
    otherLicense: license === "Other" ? text(input.otherLicense, 500) : "",
    attributionRequirements: text(input.attributionRequirements, 2000),
    commercialUseAllowed: input.commercialUseAllowed === true,
    dependencies: Array.isArray(input.dependencies) ? input.dependencies.map((item) => text(item, 200)).filter(Boolean).slice(0, 100) : [],
    rightsDeclared: input.rightsDeclared === true,
    manifestDeclaredComplete: input.manifestDeclaredComplete === true,
    safeFilesDeclared: input.safeFilesDeclared === true,
  };
  if (!result.title || !result.description || !result.contributorProfile || !result.version) {
    throw validationError("Title, description, contributor profile, and version are required");
  }
  if (requireSubmission && (!result.previewImage || !result.downloadUrl || !result.fileManifest.length || !result.license || (result.license === "Other" && !result.otherLicense) || !result.rightsDeclared || !result.manifestDeclaredComplete || !result.safeFilesDeclared)) {
    throw validationError("Submission requires a preview, Google Drive link, complete manifest, license, and contributor declarations");
  }
  return result;
}

function iso(value) {
  if (!value) return null;
  const date = value?.toDate?.() || (value instanceof Date ? value : new Date(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function isPublicAssetPack(pack = {}) {
  return PUBLIC_ASSET_PACK_STATUSES.includes(pack.status) && !!pack.currentVersionId;
}

export function hasAssetPackAccess(pack, user, { individuallyGranted = false, now = new Date() } = {}) {
  if (!isPublicAssetPack(pack)) return false;
  if (pack.accessType === "public") return true;
  if (!user) return false;
  if (user.admin) return true;
  if (pack.accessType === "community") return hasCommunityContentAccess(user.userData || {}, { admin: user.admin, now });
  return pack.accessType === "individual" && individuallyGranted;
}

export function toPublicAssetPackDto(id, pack = {}) {
  return {
    id,
    title: pack.title,
    description: pack.description,
    contributorDisplayName: pack.contributorDisplayName || "GO contributor",
    previewImage: pack.previewImage || null,
    fileManifest: pack.fileManifest || [],
    compatibility: pack.compatibility || [],
    version: pack.version,
    license: pack.license,
    otherLicense: pack.license === "Other" ? pack.otherLicense || "Administrator-reviewed license" : "",
    attributionRequirements: pack.attributionRequirements || "",
    commercialUseAllowed: pack.commercialUseAllowed === true,
    dependencies: pack.dependencies || [],
    accessType: pack.accessType || "community",
    status: pack.status,
    publishedAt: iso(pack.publishedAt),
  };
}

export function serializeAssetPackVersion(id, data = {}) {
  const { downloadUrl: _downloadUrl, ...publicData } = data;
  return {
    id,
    ...publicData,
    hasDownloadUrl: !!data.downloadUrl,
    createdAt: iso(data.createdAt),
    updatedAt: iso(data.updatedAt),
    submittedAt: iso(data.submittedAt),
    reviewedAt: iso(data.reviewedAt),
    publishedAt: iso(data.publishedAt),
  };
}
