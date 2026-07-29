export const AVAILABILITY_STATUSES = ["available", "unavailable"];

function hasOwn(value, key) {
  return Boolean(
    value &&
      typeof value === "object" &&
      Object.prototype.hasOwnProperty.call(value, key)
  );
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStatus(value) {
  const status = cleanText(value).toLowerCase().replace(/[\s-]+/gu, "_");
  if (["available", "open", "open_to_work"].includes(status)) {
    return "available";
  }
  if (
    ["unavailable", "not_available", "closed", "not_looking"].includes(status)
  ) {
    return "unavailable";
  }
  return null;
}

export function normalizeAvailability({
  availability = {},
  profile = {},
} = {}) {
  const section =
    availability && typeof availability === "object" ? availability : {};
  const sourceProfile =
    profile && typeof profile === "object" ? profile : {};

  const answeredMarker = hasOwn(section, "availability_answered")
    ? section.availability_answered
    : hasOwn(sourceProfile, "availability_answered")
      ? sourceProfile.availability_answered
      : undefined;
  const requestedStatus =
    section.availability_status ??
    section.status ??
    sourceProfile.availability_status;
  const normalizedStatus = normalizeStatus(requestedStatus);
  const preferredTimeCommitment = cleanText(
    hasOwn(section, "preferred_time_commitment")
      ? section.preferred_time_commitment
      : sourceProfile.preferred_time_commitment
  );
  const availableForProjects = hasOwn(section, "available_for_projects")
    ? section.available_for_projects === true
    : sourceProfile.looking_for_projects === true;
  const availableForPaidWork = hasOwn(section, "available_for_paid_work")
    ? section.available_for_paid_work === true
    : sourceProfile.looking_for_paid_work === true;
  const hasLegacyStructuredSelection = Boolean(
    availableForProjects ||
      availableForPaidWork ||
      preferredTimeCommitment
  );
  const hasExplicitSelection =
    typeof answeredMarker === "boolean"
      ? answeredMarker
      : Boolean(normalizedStatus || hasLegacyStructuredSelection);

  if (!hasExplicitSelection) {
    return {
      availableForPaidWork: false,
      availableForProjects: false,
      hasExplicitSelection: false,
      labels: [],
      preferredTimeCommitment: null,
      status: null,
    };
  }

  const status =
    normalizedStatus ||
    (availableForProjects ||
    availableForPaidWork ||
    preferredTimeCommitment
      ? "available"
      : "unavailable");

  if (status === "unavailable") {
    return {
      availableForPaidWork: false,
      availableForProjects: false,
      hasExplicitSelection: true,
      labels: ["Not currently available"],
      preferredTimeCommitment: null,
      status,
    };
  }

  const labels = [
    availableForProjects ? "Available for projects" : null,
    availableForPaidWork ? "Open to paid work" : null,
    preferredTimeCommitment || null,
  ].filter(Boolean);

  return {
    availableForPaidWork,
    availableForProjects,
    hasExplicitSelection: true,
    labels: labels.length ? labels : ["Available for opportunities"],
    preferredTimeCommitment: preferredTimeCommitment || null,
    status,
  };
}

export function buildAvailabilityContent(profile = {}) {
  const availability = normalizeAvailability({ profile });

  return {
    availability_answered: availability.hasExplicitSelection,
    availability_status: availability.status,
    available_for_projects: availability.availableForProjects,
    available_for_paid_work: availability.availableForPaidWork,
    preferred_time_commitment: availability.preferredTimeCommitment,
  };
}

export function reconcileAvailabilityMissingInformation(
  missingInformation,
  availability
) {
  const missing = (Array.isArray(missingInformation)
    ? missingInformation
    : []
  ).filter(
    (item) => cleanText(item).toLowerCase() !== "availability"
  );

  if (!availability?.hasExplicitSelection) {
    missing.push("availability");
  }

  return [
    ...new Set(
      missing
        .map((item) => cleanText(item))
        .filter(Boolean)
    ),
  ];
}
