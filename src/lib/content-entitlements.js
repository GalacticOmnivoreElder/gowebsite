import { getEffectiveMembership } from "@/lib/auth-utils";

export function hasCommunityContentAccess(userData = {}, { admin = false, now = new Date() } = {}) {
  const membership = getEffectiveMembership(userData, { admin, now });
  return membership.activeMember === true;
}

export function hasResourceAccess(resourceId, userData = {}, options = {}) {
  if (hasCommunityContentAccess(userData, options)) return true;
  return (
    typeof resourceId === "string" &&
    Array.isArray(userData.unlockedPackages) &&
    userData.unlockedPackages.includes(resourceId)
  );
}

export function hasAssetContributionAccess(userData = {}, options = {}) {
  if (!hasCommunityContentAccess(userData, options)) return false;
  return options.admin === true || userData.membershipTier !== "mentor" || hasMentorToolAccess(userData, options);
}

export function hasMentorToolAccess(userData = {}, { admin = false, now = new Date() } = {}) {
  if (admin) return true;
  const membership = getEffectiveMembership(userData, { now });
  return (
    membership.activeMember === true &&
    membership.membershipTier === "mentor" &&
    userData.mentorStatus === "approved"
  );
}
