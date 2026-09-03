export const PROJECT_TYPES = [
  "Game Development",
  "Art & Design",
  "Programming",
  "Music & Audio",
  "Writing & Narrative",
  "Marketing",
  "Community & Industry Development",
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
export const APPLICATION_ACCESS_OPTIONS = [
  "members_only",
  "all_signed_in_users",
];
export const DEFAULT_APPLICATION_ACCESS = "members_only";
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
export const PROJECT_DISCOVERY_SORT_OPTIONS = [
  "status_priority",
  "created_desc",
  "created_asc",
  "budget_desc",
  "budget_asc",
  "duration_desc",
  "duration_asc",
];

export const DEFAULT_PROJECT_DISCOVERY_SORT = "status_priority";

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

export function normalizeApplicationAccess(value) {
  return APPLICATION_ACCESS_OPTIONS.includes(value)
    ? value
    : DEFAULT_APPLICATION_ACCESS;
}

export function canApplyToProject(project, user) {
  if (!project || !user?.uid) return false;
  if (isPlatformAdmin(user)) return true;
  if (normalizeApplicationAccess(project.applicationAccess) === "all_signed_in_users") {
    return true;
  }
  return user.activeMember === true;
}

export function canViewProject(project, user) {
  if (!project) return false;

  // Archived projects are hidden from public discovery. Platform admins and the
  // project's own members (owner/admins/team) can still reach it - e.g. to
  // review or restore it - but it never surfaces to anyone else.
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

export function normalizeProjectDiscoveryStatus(value) {
  const normalized = String(value || "all").trim().toLowerCase();
  if (normalized === "all") return "all";
  return PUBLIC_PROJECT_STATUSES.includes(normalized) ? normalized : null;
}

function normalizeFilterValue(value) {
  return String(value || "").trim().toLowerCase();
}

function toSortableNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toSortableDate(value) {
  if (!value) return null;

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (typeof value.toDate === "function") {
    return value.toDate().getTime();
  }

  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function compareOptionalValues(left, right, direction) {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return direction === "asc" ? left - right : right - left;
}

export function filterAndSortProjectsForDiscovery(
  projects,
  filters = {},
  user = null
) {
  const status = normalizeProjectDiscoveryStatus(filters.status);
  if (status === null) return [];

  const search = normalizeFilterValue(filters.search);
  const category = normalizeFilterValue(filters.category);
  const requestedType = normalizeFilterValue(filters.type);
  const requestedVisibility = normalizeFilterValue(filters.visibility);
  const sortBy = PROJECT_DISCOVERY_SORT_OPTIONS.includes(filters.sortBy)
    ? filters.sortBy
    : DEFAULT_PROJECT_DISCOVERY_SORT;
  const [sortField, sortDirection] = sortBy.split("_");
  const statusPriority = {
    hiring: 0,
    live: 1,
    completed: 2,
  };

  return (Array.isArray(projects) ? projects : [])
    .filter((project) => {
      // Discovery is approved content only. Admins and project owners review
      // pending work through their dedicated management pages.
      if (
        project?.archived ||
        !PUBLIC_PROJECT_STATUSES.includes(project?.status) ||
        !canViewProject(project, user)
      ) {
        return false;
      }

      if (status !== "all" && project.status !== status) return false;

      if (
        requestedType &&
        requestedType !== "all" &&
        normalizeFilterValue(project.type) !== requestedType
      ) {
        return false;
      }

      if (
        category &&
        category !== "all" &&
        !project.categoryTags?.some(
          (tag) => normalizeFilterValue(tag) === category
        )
      ) {
        return false;
      }

      if (
        requestedVisibility &&
        requestedVisibility !== "all" &&
        normalizeFilterValue(project.visibility) !== requestedVisibility
      ) {
        return false;
      }

      if (!search) return true;

      return [
        project.title,
        project.description,
        project.goal,
        project.type,
        ...(project.categoryTags || []),
      ].some((value) => normalizeFilterValue(value).includes(search));
    })
    .sort((left, right) => {
      let comparison = 0;

      if (sortBy === "status_priority") {
        comparison =
          (statusPriority[left.status] ?? Number.MAX_SAFE_INTEGER) -
          (statusPriority[right.status] ?? Number.MAX_SAFE_INTEGER);
      } else if (sortField === "created") {
        comparison = compareOptionalValues(
          toSortableDate(left.createdAt),
          toSortableDate(right.createdAt),
          sortDirection
        );
      } else {
        comparison = compareOptionalValues(
          toSortableNumber(left[sortField]),
          toSortableNumber(right[sortField]),
          sortDirection
        );
      }

      if (comparison !== 0) return comparison;

      const createdComparison = compareOptionalValues(
        toSortableDate(left.createdAt),
        toSortableDate(right.createdAt),
        "desc"
      );
      if (createdComparison !== 0) return createdComparison;

      return String(left.id || left.title || "").localeCompare(
        String(right.id || right.title || "")
      );
    });
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
