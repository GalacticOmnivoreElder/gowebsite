export const PUBLIC_RESOURCE_STATUSES = Object.freeze(["published", "legacy"]);
export const PUBLIC_VIDEO_BUNDLE_STATUSES = Object.freeze(["published"]);
export const PUBLIC_LEARNING_STATUSES = Object.freeze([
  "enrollment_open",
  "enrollment_closed",
  "full",
  "waitlist_available",
  "in_progress",
  "completed",
  "canceled",
]);

const publicResourceStatuses = new Set(PUBLIC_RESOURCE_STATUSES);
const publicVideoBundleStatuses = new Set(PUBLIC_VIDEO_BUNDLE_STATUSES);
const publicLearningStatuses = new Set(PUBLIC_LEARNING_STATUSES);

export function isPublicResourceStatus(status) {
  return typeof status === "string" && publicResourceStatuses.has(status);
}

export function isPublicVideoBundleStatus(status) {
  return typeof status === "string" && publicVideoBundleStatuses.has(status);
}

export function isPublicLearningStatus(status) {
  return typeof status === "string" && publicLearningStatuses.has(status);
}

export function isPublicMentorProfile(mentor = {}) {
  return (
    mentor.mentorStatus === "approved" &&
    mentor.publicProfileEnabled === true
  );
}

export function toPublicResourceAssetDto(asset = {}, assetIndex) {
  return {
    assetIndex,
    title: asset.title || "Resource file",
    description: asset.description || "",
    type: asset.type || "file",
    image: asset.image || null,
  };
}

export function toPublicResourceDto(resource = {}) {
  return {
    id: resource.id,
    title: resource.title || "Resource",
    description: resource.description || "",
    shortDescription: resource.shortDescription || "",
    theme: resource.theme || "",
    month: resource.month || "",
    year: resource.year || "",
    coverImage: resource.coverImage || null,
    slug: resource.slug || "",
    brandColor: resource.brandColor || null,
    status: resource.status,
    assets: Array.isArray(resource.assets)
      ? resource.assets.map((asset, index) => toPublicResourceAssetDto(asset, index))
      : [],
  };
}
