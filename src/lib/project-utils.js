export const PROJECT_TYPES = [
  "Game Development",
  "Art & Design",
  "Programming",
  "Music & Audio",
  "Writing & Narrative",
  "Marketing",
  "Other",
];

export const COMPENSATION_TYPES = [
  "Paid",
  "Revenue Share",
  "Portfolio/Experience",
  "Volunteer",
  "Equity",
  "Hybrid",
];

export const REQUIRED_ROLES = [
  "Game Designer",
  "Programmer",
  "C# Developer",
  "Unity Developer",
  "Unreal Developer",
  "2D Artist",
  "3D Artist",
  "UI/UX Designer",
  "Animator",
  "Sound Designer",
  "Composer",
  "Writer",
  "Narrative Designer",
  "Project Manager",
  "Producer",
  "QA Tester",
  "Marketing Specialist",
  "Other",
];

export const VISIBILITY_OPTIONS = ["Public", "Private", "Invite Only"];
export const PROJECT_STATUSES = [
  "draft",
  "pending",
  "hiring",
  "live",
  "completed",
  "rejected",
];
export const PUBLIC_PROJECT_STATUSES = ["hiring", "live", "completed"];
export const OWNER_MANAGED_STATUSES = ["draft", "pending"];

export function isPlatformAdmin(user) {
  return !!user?.admin;
}

export function isProjectMember(project, user) {
  if (!user?.uid || !project) return false;
  return (
    project.owner === user.uid ||
    project.admins?.includes(user.uid) ||
    project.teamMembers?.includes(user.uid)
  );
}

export function isInvitedToProject(project, user) {
  if (!user?.uid || !project) return false;
  return project.invitedUsers?.includes(user.uid);
}

export function canViewProject(project, user) {
  if (!project) return false;

  // Archived projects are hidden from public discovery. Platform admins and the
  // project's own members (owner/admins/team) can still reach it — e.g. to
  // review or restore it — but it never surfaces to anyone else.
  if (project.archived) {
    return isPlatformAdmin(user) || isProjectMember(project, user);
  }

  if (isPlatformAdmin(user) || isProjectMember(project, user)) return true;

  if (project.visibility === "Public") {
    return PUBLIC_PROJECT_STATUSES.includes(project.status);
  }

  if (project.visibility === "Invite Only") {
    return isInvitedToProject(project, user);
  }

  return false;
}

export function canEditProject(project, user) {
  if (!project || !user?.uid) return false;
  return isPlatformAdmin(user) || project.owner === user.uid || project.admins?.includes(user.uid);
}

export function serializeFirestoreDate(value) {
  return value?.toDate?.()?.toISOString() || value;
}

export function validateArrayValues(values, allowedValues, fieldName) {
  if (!Array.isArray(values) || values.length === 0) {
    return `${fieldName} must include at least one value`;
  }

  const invalidValues = values.filter(
    (value) => typeof value !== "string" || !allowedValues.includes(value)
  );

  if (invalidValues.length > 0) {
    return `${fieldName} contains invalid values`;
  }

  return null;
}
