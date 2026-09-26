const API = "https://discord.com/api/v10";

export function discordError(code, status = 400, retryAfter = 0) {
  return Object.assign(new Error(code), { code, status, retryAfter });
}

export function getDiscordConfig() {
  const config = {
    clientId: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    botToken: process.env.DISCORD_BOT_TOKEN,
    guildId: process.env.DISCORD_GUILD_ID,
    memberRoleId: process.env.DISCORD_MEMBER_ROLE_ID || null,
    redirectUri: process.env.DISCORD_REDIRECT_URI,
    membersOnly: process.env.DISCORD_JOIN_MEMBERS_ONLY === "true",
  };
  let validRedirect = false;
  try {
    const url = new URL(config.redirectUri);
    validRedirect = (url.protocol === "https:" ||
      (process.env.NODE_ENV !== "production" && url.hostname === "localhost" && url.protocol === "http:")) &&
      url.pathname === "/api/discord/callback" && !url.search && !url.hash && !url.username && !url.password;
  } catch { /* Configuration remains disabled. */ }
  config.enabled = process.env.DISCORD_ENABLED === "true" && validRedirect &&
    /^\d{17,20}$/.test(config.clientId || "") && /^\d{17,20}$/.test(config.guildId || "") &&
    !!config.clientSecret && !!config.botToken &&
    (!config.memberRoleId || (/^\d{17,20}$/.test(config.memberRoleId) && config.memberRoleId !== config.guildId));
  return config;
}

export function requireDiscordConfig() {
  const config = getDiscordConfig();
  if (!config.enabled) throw discordError("not_configured", 503);
  return config;
}

export async function discordRequest(path, { token, method = "GET", body, form = false } = {}) {
  let response;
  try {
    response = await fetch(`${API}${path}`, {
      method,
      headers: {
        ...(token ? { Authorization: token } : {}),
        ...(body ? { "Content-Type": form ? "application/x-www-form-urlencoded" : "application/json" } : {}),
      },
      body: body ? (form ? new URLSearchParams(body).toString() : JSON.stringify(body)) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch { throw discordError("discord_unavailable", 502); }
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 429) throw discordError("rate_limited", 429,
      Math.max(1, Number(data.retry_after) || Number(response.headers.get("retry-after")) || 60));
    if (response.status === 404 && data.code === 10007) throw discordError("not_in_server", 404);
    if (response.status === 403) throw discordError("discord_forbidden", 502);
    throw discordError(response.status === 400 ? "authorization_failed" : "discord_unavailable", 502);
  }
  return data;
}
