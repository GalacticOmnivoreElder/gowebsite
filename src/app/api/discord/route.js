import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth-utils";
import { getDiscordConfig } from "@/lib/discord-api";
import { DISCORD_COOKIE, discordCookieOptions, startDiscordConnection, completeDiscordConnection,
  disconnectDiscord, discordConnectionStatus, syncDiscordConnection } from "@/lib/discord";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 90;

const messages = {
  not_configured: "Discord connection is not available yet.",
  membership_required: "An active GO membership is required to join this server.",
  account_missing: "Finish setting up your GO account first.",
  invalid_state: "This connection attempt expired or belongs to another GO account. Please connect again.",
  already_linked: "This Discord account is connected to another GO account.",
  disconnect_first: "Disconnect your current Discord account before connecting a different one.",
  sync_busy: "Your Discord connection is being updated. Try again shortly.",
  rate_limited: "Discord connection is temporarily busy. Please try again shortly.",
  discord_forbidden: "Discord could not grant access. Please contact GO support to check the bot permissions or server restrictions.",
  server_changed: "The configured Discord server changed. Please contact GO support.",
};

function json(data, status = 200, headers = {}) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export async function GET(request) {
  const user = await getRequestUser(request);
  if (!user) return json({ error: "Authentication required" }, 401);
  try {
    const config = getDiscordConfig();
    return json({ available: config.enabled, membersOnly: config.membersOnly,
      connection: await discordConnectionStatus(user.uid) });
  } catch { return json({ error: "Unable to load Discord connection." }, 500); }
}

export async function POST(request) {
  const user = await getRequestUser(request);
  if (!user) return json({ error: "Authentication required" }, 401);
  const body = await request.json().catch(() => ({}));
  try {
    if (body.action === "connect") {
      const result = await startDiscordConnection(user.uid);
      const response = json({ url: result.url });
      response.cookies.set(DISCORD_COOKIE, result.state, discordCookieOptions(getDiscordConfig()));
      return response;
    }
    if (body.action === "complete") {
      await completeDiscordConnection(user.uid, request.cookies.get(DISCORD_COOKIE)?.value);
      const response = json({ connection: await discordConnectionStatus(user.uid) });
      response.cookies.set(DISCORD_COOKIE, "", { ...discordCookieOptions(getDiscordConfig()), maxAge: 0 });
      return response;
    }
    if (body.action === "sync") await syncDiscordConnection(user.uid);
    else if (body.action === "disconnect") await disconnectDiscord(user.uid);
    else return json({ error: "Unknown Discord action" }, 400);
    return json({ connection: await discordConnectionStatus(user.uid) });
  } catch (error) {
    // Never log provider responses: they can contain authorization codes or tokens.
    return json({ error: messages[error.code] || "Discord could not finish connecting. Please try connecting again.",
      code: error.code || "connection_failed" }, error.status || 500,
      error.retryAfter ? { "Retry-After": String(Math.ceil(error.retryAfter)) } : {});
  }
}
