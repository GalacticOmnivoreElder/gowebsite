import { adminDb } from "@/lib/firebase-admin";
import { discordRequest, discordError } from "@/lib/discord-api";
import { getEffectiveMembership } from "@/lib/auth-utils";
import { hasMentorAddon } from "@/lib/go-policy";
import { effectiveRoleMode, planDiscordRoles, roleSafety, validateRolePolicy } from "@/lib/discord-role-policy.mjs";

export const discordPolicyRef = () => adminDb.collection("site_settings").doc("discord_role_policy");

export async function getDiscordRolePolicy() {
  const snap = await discordPolicyRef().get();
  if (!snap.exists) return null; // Preserve existing single-role behavior until a policy is saved.
  return { ...validateRolePolicy(snap.data()), revision: snap.data().revision || 1 };
}

export async function discordRoleInventory(config) {
  const token = `Bot ${config.botToken}`;
  const bot = await discordRequest("/users/@me", { token });
  const [roles, member] = await Promise.all([
    discordRequest(`/guilds/${config.guildId}/roles`, { token }),
    discordRequest(`/guilds/${config.guildId}/members/${bot.id}`, { token }),
  ]);
  const botRoles = roles.filter((role) => member.roles.includes(role.id));
  const botTopPosition = Math.max(0, ...botRoles.map((role) => role.position));
  const botPermissions = botRoles.reduce((value, role) => value | BigInt(role.permissions || "0"), BigInt(roles.find((r) => r.id === config.guildId)?.permissions || "0"));
  const botCanManage = (botPermissions & (8n | 268435456n)) !== 0n;
  return { guildId: config.guildId, botTopPosition, botCanManage,
    roles: roles.map((role) => ({ id: role.id, name: role.name, position: role.position, managed: role.managed,
      permissions: role.permissions, blocked: roleSafety(role, config.guildId, botTopPosition, botCanManage) })) };
}

export async function discordRoleContext(uid) {
  const [userSnap, profileSnap, grantSnap] = await Promise.all([
    adminDb.collection("users").doc(uid).get(), adminDb.collection("user_profiles").doc(uid).get(),
    adminDb.collection("discord_role_grants").doc(uid).get(),
  ]);
  const user = userSnap.data() || {};
  const membership = getEffectiveMembership(user);
  return { user, profile: profileSnap.data() || {}, grants: grantSnap.data() || {}, accountExists: userSnap.exists,
    active: membership.subscribed, tier: membership.membershipTier, mentorAddon: hasMentorAddon(user), projectIds: [] };
}

export async function resolveProjectRoles(context, policy, uid) {
  // Verify actual project records, not user-supplied role names or stale profile mirrors.
  const ids = [...new Set(policy.mappings.filter((r) => r.enabled && r.source === "project").map((r) => r.value))];
  const snapshots = await Promise.all(ids.map((id) => adminDb.collection("projects").doc(id).get()));
  context.projectIds = snapshots.filter((snap) => {
    const project = snap.data() || {};
    return snap.exists && project.status !== "archived" && (project.owner === uid || project.admins?.includes(uid) ||
      (Array.isArray(project.teamMembers) && project.teamMembers.some((member) => member === uid || member?.userId === uid)));
  }).map((snap) => snap.id);
}

export async function buildDiscordRolePreview(uid, config, policy, member, connection) {
  const context = await discordRoleContext(uid);
  await resolveProjectRoles(context, policy, uid);
  const inventory = await discordRoleInventory(config);
  const plan = planDiscordRoles({ policy, currentRoleIds: member.roles || [],
    ownedRoleIds: [...(connection.managedRoleIds || []), connection.managedRoleId].filter(Boolean), context, screening: member.pending });
  const blocked = plan.managed.map((id) => inventory.roles.find((role) => role.id === id))
    .filter((role) => role?.blocked || !role);
  // A deleted retired role needs no operation; mapped missing roles are configuration errors.
  const invalid = policy.mappings.filter((rule) => rule.enabled).some((rule) => !inventory.roles.some((role) => role.id === rule.roleId && !role.blocked)) ||
    blocked.some((role) => role?.blocked && [...plan.add, ...plan.remove].includes(role.id));
  if (invalid) throw discordError("unsafe_role_mapping", 409);
  const mode = effectiveRoleMode(policy, uid);
  return { ...plan, mode, revision: policy.revision, onboardingComplete: context.profile.onboarding_completed === true,
    roles: inventory.roles.filter((role) => plan.desired.includes(role.id)).map(({ id, name }) => ({ id, name })) };
}

export async function applyDiscordRolePlan(uid, config, connection, plan, deadline = Date.now() + 25000) {
  const ref = adminDb.collection("discord_connections").doc(uid);
  const path = `/guilds/${connection.guildId}/members/${connection.discordId}/roles`;
  const token = `Bot ${config.botToken}`;
  // Persist ownership before external writes so crashes and retired mappings remain recoverable.
  await ref.update({ managedRoleIds: plan.managed });
  let changes = 0;
  for (const [method, ids] of [["DELETE", plan.remove], ["PUT", plan.add]]) {
    for (const id of ids) {
      if (changes >= 6 || Date.now() >= deadline) return false;
      await discordRequest(`${path}/${id}`, { token, method });
      changes++;
    }
  }
  await ref.update({ managedRoleIds: plan.desired });
  return true;
}
