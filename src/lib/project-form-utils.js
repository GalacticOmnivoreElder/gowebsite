export function normalizeOptionalProjectNumber(value) {
  if (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return undefined;
  }

  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : value;
}

const PROJECT_FORM_FIELDS_BY_STEP = [
  [
    "title",
    "thumbnail",
    "categoryTags",
    "type",
    "sourceProjectOption",
    "sourceProjectName",
    "existingSourceProjectId",
  ],
  ["description", "goal"],
  ["visibility", "duration", "budget", "compensationType"],
  ["requiredRoles"],
];

export function getProjectFormStepForField(field) {
  const index = PROJECT_FORM_FIELDS_BY_STEP.findIndex((fields) =>
    fields.includes(field)
  );

  return index >= 0 ? index + 1 : 1;
}
