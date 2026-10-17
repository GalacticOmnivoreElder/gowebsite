export const APPETITE_ROLES = Object.freeze([
  { id: "hungry", label: "Hungry", color: "green" },
  { id: "one_more_bite", label: "One More Bite", color: "yellow" },
  { id: "full", label: "Full", color: "red" },
]);

export function appetiteConfigHash(roleIds = {}) {
  return APPETITE_ROLES.map((role) => `${role.id}:${roleIds[role.id] || ""}`).join("|");
}

export function appetiteFromDiscordRoles(memberRoles = [], roleIds = {}) {
  const selected = APPETITE_ROLES.filter((role) => roleIds[role.id] && memberRoles.includes(roleIds[role.id]));
  return selected.length === 1 ? selected[0].id : null;
}

function dateMillis(value) {
  if (value?.toDate) return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  return new Date(value || 0).getTime();
}

export function summarizeAppetite(connections = [], now = new Date(), mapHash, freshnessMs = 30 * 60 * 1000) {
  const nowMs = new Date(now).getTime();
  const counts = Object.fromEntries(APPETITE_ROLES.map((role) => [role.id, 0]));
  for (const connection of connections) {
    if (connection.status !== "joined" || connection.appetiteRoleMapHash !== mapHash) continue;
    if (nowMs - dateMillis(connection.lastSyncedAt) > freshnessMs) continue;
    if (Object.hasOwn(counts, connection.appetiteStatus)) counts[connection.appetiteStatus]++;
  }

  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  if (!total) return { status: "quiet", counts, total };
  const highest = Math.max(...Object.values(counts));
  const leaders = APPETITE_ROLES.filter((role) => counts[role.id] === highest);
  return { status: leaders.length === 1 ? leaders[0].id : "mixed", counts, total };
}
