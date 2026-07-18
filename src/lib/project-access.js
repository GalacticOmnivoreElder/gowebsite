export const CREATOR_MEMBERSHIP_URL = "/membership?reason=creator";

export function getProjectCreationDestination({
  isAuthenticated,
  canCreateProjects,
}) {
  if (!isAuthenticated) {
    return "/login?redirect=/project/create";
  }

  return canCreateProjects ? "/project/create" : CREATOR_MEMBERSHIP_URL;
}
