const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

function parseDateOnly(value) {
  if (typeof value !== "string" || !DATE_ONLY_PATTERN.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function invalidSchedule(field, error) {
  return { ok: false, field, error };
}

export function normalizeProjectSchedule(input = {}, { allowLegacy = true } = {}) {
  const rawStartDate = input.startDate;
  const rawEndDate = input.endDate;

  if (
    Object.prototype.hasOwnProperty.call(input, "isOngoing") &&
    typeof input.isOngoing !== "boolean"
  ) {
    return invalidSchedule("isOngoing", "isOngoing must be true or false");
  }

  const hasStartDate =
    rawStartDate !== undefined && rawStartDate !== null && rawStartDate !== "";
  const hasEndDate =
    rawEndDate !== undefined && rawEndDate !== null && rawEndDate !== "";
  const isOngoing = input.isOngoing === true;
  const hasSchedule = hasStartDate || hasEndDate || isOngoing;

  if (!hasSchedule) {
    if (!allowLegacy) {
      return invalidSchedule("startDate", "A start date is required");
    }

    const duration = Number(input.duration);
    if (!Number.isFinite(duration) || duration < 1 || duration > 3650) {
      return invalidSchedule(
        "duration",
        "Duration must be between 1 and 3650 days"
      );
    }

    return {
      ok: true,
      hasSchedule: false,
      duration,
      startDate: null,
      endDate: null,
      isOngoing: false,
    };
  }

  if (!hasStartDate) {
    return invalidSchedule("startDate", "A start date is required");
  }
  if (typeof rawStartDate !== "string" || !parseDateOnly(rawStartDate)) {
    return invalidSchedule("startDate", "Enter a valid start date");
  }

  const startDate = rawStartDate.trim();
  if (isOngoing) {
    return {
      ok: true,
      hasSchedule: true,
      duration: null,
      startDate,
      endDate: null,
      isOngoing: true,
    };
  }

  if (!hasEndDate) {
    return invalidSchedule(
      "endDate",
      "Choose an end date or select Ongoing"
    );
  }
  if (typeof rawEndDate !== "string" || !parseDateOnly(rawEndDate)) {
    return invalidSchedule("endDate", "Enter a valid end date");
  }

  const endDate = rawEndDate.trim();
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (end < start) {
    return invalidSchedule(
      "endDate",
      "The end date must be on or after the start date"
    );
  }

  const duration =
    Math.floor((end.getTime() - start.getTime()) / DAY_IN_MILLISECONDS) + 1;
  if (duration > 3650) {
    return invalidSchedule(
      "endDate",
      "The project schedule cannot be longer than 3650 days"
    );
  }

  return {
    ok: true,
    hasSchedule: true,
    duration,
    startDate,
    endDate,
    isOngoing: false,
  };
}

function formatDateOnly(value) {
  const date = parseDateOnly(value);
  if (!date) return value || "";

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatLegacyDuration(days) {
  if (days >= 365) {
    return `${Math.round(days / 365)} year${days >= 730 ? "s" : ""}`;
  }
  if (days >= 30) {
    return `${Math.round(days / 30)} month${days >= 60 ? "s" : ""}`;
  }
  return `${days} day${days !== 1 ? "s" : ""}`;
}

export function getProjectScheduleLabel(project = {}) {
  if (project.isOngoing === true) {
    return project.startDate
      ? `Ongoing · from ${formatDateOnly(project.startDate)}`
      : "Ongoing";
  }

  if (project.startDate && project.endDate) {
    return `${formatDateOnly(project.startDate)} – ${formatDateOnly(
      project.endDate
    )}`;
  }

  const duration = Number(project.duration);
  return Number.isFinite(duration) && duration > 0
    ? formatLegacyDuration(duration)
    : "Not specified";
}
