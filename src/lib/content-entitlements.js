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

export function hasMentorToolAccess(userData = {}) {
  return userData.mentorStatus === "approved";
}
