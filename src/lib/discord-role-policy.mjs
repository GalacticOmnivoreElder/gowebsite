export const ROLE_SOURCES = ["linked", "onboarded", "skill", "profile_role", "language", "interest", "appetite", "member", "mentor", "business", "project", "manual"];
export const INTEREST_FIELDS = ["looking_for_projects", "looking_for_paid_work", "looking_for_team", "looking_for_mentorship", "looking_for_jobs"];
export const APPETITE_VALUES = ["hungry", "one_more_bite", "full"];
const idPattern = /^\d{17,20}$/;
const key = (value) => typeof value === "string" ? value.trim().replace(/\s+/g, " ").toLowerCase() : "";
const list = (values) => Array.isArray(values) ? values.filter((v) => typeof v === "string") : [];
// Administrative powers can never be obtained through a GO profile or mapping.
const unsafePermissions = 8n | 32n | 268435456n | 16n | 4n | 2n | 536870912n | 1099511627776n | 8192n | 128n;

export function roleSafety(role, guildId, botTopPosition, botCanManage = true) {
  if (!role || role.id === guildId || role.managed) return "missing_or_managed_role";
  if ((BigInt(role.permissions || "0") & unsafePermissions) !== 0n) return "privileged_role";
  if (!botCanManage || role.position >= botTopPosition) return "role_hierarchy";
  return null;
}

export function validateRolePolicy(input = {}) {
  const pilotUserIds = input.pilotUserIds === undefined ? [] : input.pilotUserIds;
  if (!Array.isArray(pilotUserIds) || pilotUserIds.length > 100 || pilotUserIds.some((uid) => typeof uid !== "string" || !uid.trim() || uid.length > 128 || uid.includes("/") || [".", ".."].includes(uid))) throw new Error("Provide up to 100 valid pilot GO user IDs.");
  if (!["preview", "apply"].includes(input.mode)) throw new Error("Choose preview or apply mode.");
  if (!Array.isArray(input.mappings) || input.mappings.length > 150) throw new Error("Provide up to 150 role mappings.");
  const ids = new Set();
  const mappings = input.mappings.map((mapping) => {
    if (!mapping || !idPattern.test(mapping.roleId || "") || ids.has(mapping.roleId)) throw new Error("Each mapping needs a unique Discord role ID.");
    ids.add(mapping.roleId);
    if (!ROLE_SOURCES.includes(mapping.source)) throw new Error("Invalid role source.");
    const value = typeof mapping.value === "string" ? mapping.value.trim() : "";
    if (value.length > 120 || (["skill", "profile_role", "language", "project"].includes(mapping.source) && !value)) throw new Error("This source requires a value (up to 120 characters).");
    if (mapping.source === "interest" && !INTEREST_FIELDS.includes(value)) throw new Error("Select a supported interest.");
    if (mapping.source === "appetite" && !APPETITE_VALUES.includes(value)) throw new Error("Select a supported appetite status.");
    if (mapping.source === "project" && (value.includes("/") || value === "." || value === "..")) throw new Error("Invalid project ID.");
    return { roleId: mapping.roleId, source: mapping.source, value, enabled: mapping.enabled === true };
  });
  return { mode: input.mode, requireOnboarding: input.requireOnboarding !== false, pilotUserIds: [...new Set(pilotUserIds.map((uid) => uid.trim()))], mappings };
}

export function eligibleRole(mapping, context = {}) {
  const { user = {}, profile = {}, active = false, tier = null, mentorAddon = false, grants = {}, now = new Date() } = context;
  switch (mapping.source) {
    case "linked": return context.accountExists === true;
    case "onboarded": return profile.onboarding_completed === true;
    case "skill": return list(user.skills).some((skill) => String(mapping.value).split("|").some((alias) => key(skill) === key(alias)));
    case "profile_role": return [profile.primary_role, ...list(profile.secondary_roles)].some((role) => key(role) === key(mapping.value));
    case "language": return key(profile.preferred_language) === key(mapping.value);
    case "interest": return INTEREST_FIELDS.includes(mapping.value) && profile[mapping.value] === true;
    case "appetite": return profile.community_appetite === mapping.value;
    case "member": return active;
    case "mentor": return active && user.mentorStatus === "approved" && (tier === "mentor" || (tier === "company" && mentorAddon));
    case "business": return active && tier === "company";
    case "project": return list(context.projectIds).includes(mapping.value);
    case "manual": {
      const expires = grants.expiresAt?.toDate?.() || (grants.expiresAt ? new Date(grants.expiresAt) : null);
      return list(grants.roleIds).includes(mapping.roleId) && (!expires || expires > now);
    }
    default: return false;
  }
}

export function effectiveRoleMode(policy, uid) {
  return policy.mode === "apply" && policy.pilotUserIds?.length && !policy.pilotUserIds.includes(uid) ? "preview" : policy.mode;
}

export function planDiscordRoles({ policy, currentRoleIds = [], ownedRoleIds = [], context = {}, screening = false }) {
  const rules = policy.mappings.filter((rule) => rule.enabled);
  const desired = !screening && context.accountExists && (!policy.requireOnboarding || context.profile?.onboarding_completed === true)
    ? rules.filter((rule) => eligibleRole(rule, context)).map((rule) => rule.roleId) : [];
  const desiredSet = new Set(desired);
  const managed = [...new Set([...ownedRoleIds, ...rules.map((rule) => rule.roleId)])];
  return { desired, managed, add: desired.filter((id) => !currentRoleIds.includes(id)),
    remove: managed.filter((id) => currentRoleIds.includes(id) && !desiredSet.has(id)) };
}
