export const MAX_PROFILE_SKILLS = 20;
export const MAX_SKILL_NAME_LENGTH = 40;

export function normalizeSkillName(value) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
}

export function getSkillKey(value) {
  return normalizeSkillName(value).toLocaleLowerCase("en-US");
}

export function getSkillDocumentId(value) {
  return encodeURIComponent(getSkillKey(value)).replaceAll("%", "_");
}

export function sanitizeSkills(
  values,
  { max = MAX_PROFILE_SKILLS, maxLength = MAX_SKILL_NAME_LENGTH } = {}
) {
  if (!Array.isArray(values)) return [];

  const seen = new Set();
  const result = [];

  for (const value of values) {
    const name = normalizeSkillName(value);
    const key = getSkillKey(name);
    if (!name || name.length > maxLength || seen.has(key)) continue;

    seen.add(key);
    result.push(name);
    if (result.length === max) break;
  }

  return result;
}

export function aggregateSkillUsage(users = []) {
  const skills = new Map();

  for (const user of users) {
    const uniqueSkills = sanitizeSkills(user?.skills);
    for (const name of uniqueSkills) {
      const key = getSkillKey(name);
      const current = skills.get(key);
      skills.set(key, {
        name: current?.name || name,
        count: (current?.count || 0) + 1,
      });
    }
  }

  return skills;
}

export function sortPopularSkills(skills = []) {
  return [...skills].sort(
    (a, b) =>
      (Number(b.usageCount) || 0) - (Number(a.usageCount) || 0) ||
      a.name.localeCompare(b.name)
  );
}
