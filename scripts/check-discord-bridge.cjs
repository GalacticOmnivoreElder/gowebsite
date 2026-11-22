// Read-only readiness check. Never prints credential values or changes Discord.
const { loadEnvConfig } = require('@next/env');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function main() {
  loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
  const keys = ['DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET', 'DISCORD_BOT_TOKEN', 'DISCORD_GUILD_ID', 'DISCORD_MEMBER_ROLE_ID', 'CRON_SECRET'];
  const result = { enabled: process.env.DISCORD_ENABLED === 'true', missing: keys.filter((key) => !process.env[key]) };
  if (process.argv.includes('--live') && process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_GUILD_ID) {
    const request = async (endpoint) => {
      const response = await fetch(`https://discord.com/api/v10${endpoint}`, { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` }, signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`Discord read-only readiness request failed (HTTP ${response.status})`);
      return response.json();
    };
    const application = await request('/oauth2/applications/@me');
    const bot = await request('/users/@me');
    const [roles, member] = await Promise.all([request(`/guilds/${process.env.DISCORD_GUILD_ID}/roles`), request(`/guilds/${process.env.DISCORD_GUILD_ID}/members/${bot.id}`)]);
    const owned = roles.filter((role) => member.roles.includes(role.id));
    const permissions = owned.reduce((p, role) => p | BigInt(role.permissions), BigInt(roles.find((role) => role.id === process.env.DISCORD_GUILD_ID)?.permissions || '0'));
    const top = Math.max(0, ...owned.map((role) => role.position));
    const { validateRolePolicy, roleSafety } = await import(pathToFileURL(path.resolve('src/lib/discord-role-policy.mjs')).href);
    const draft = validateRolePolicy(JSON.parse(fs.readFileSync('docs/discord-role-mapping.draft.json', 'utf8')));
    result.live = {
      applicationMatchesClientId: application.id === process.env.DISCORD_CLIENT_ID,
      botCanManageRoles: (permissions & (8n | 268435456n)) !== 0n,
      roleCount: roles.length, proposedMappingCount: draft.mappings.length,
      blockedMappings: draft.mappings.map((mapping) => ({ roleId: mapping.roleId,
        problem: roleSafety(roles.find((role) => role.id === mapping.roleId), process.env.DISCORD_GUILD_ID, top, (permissions & (8n | 268435456n)) !== 0n) })).filter((item) => item.problem),
      scope: 'Read-only role hierarchy and permissions; channel visibility and role ownership still require review.',
    };
  }
  console.log(JSON.stringify(result, null, 2));
  if (result.missing.length || result.live?.applicationMatchesClientId === false || result.live?.blockedMappings.length) process.exitCode = 2;
}
main().catch(() => { console.error('Readiness check failed; check connectivity and local Discord configuration. No credentials were printed.'); process.exitCode = 1; });
