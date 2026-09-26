import { createHash, randomBytes } from "node:crypto";
import { adminDb } from "@/lib/firebase-admin";
import { hasActiveSubscription } from "@/lib/auth-utils";
import { discordError, discordRequest, requireDiscordConfig } from "@/lib/discord-api";

export const DISCORD_COOKIE = "go_discord_oauth";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const millis = (value) => value?.toDate ? value.toDate().getTime() : new Date(value || 0).getTime();
const connectionRef = (uid) => adminDb.collection("discord_connections").doc(uid);

export function discordCookieOptions(config) {
  return { httpOnly: true, secure: new URL(config.redirectUri).protocol === "https:", sameSite: "lax", path: "/api/discord", maxAge: 600 };
}

export async function startDiscordConnection(uid) {
  const config = requireDiscordConfig();
  const user = await adminDb.collection("users").doc(uid).get();
  if (!user.exists) throw discordError("account_missing", 403);
  if (config.membersOnly && !hasActiveSubscription(user.data())) throw discordError("membership_required", 403);
  const state = randomBytes(32).toString("hex");
  const rateRef = adminDb.collection("discord_oauth_limits").doc(uid);
  await adminDb.runTransaction(async (tx) => {
    const previous = await tx.get(rateRef);
    if (millis(previous.data()?.nextStartAt) > Date.now()) throw discordError("rate_limited", 429, 10);
    tx.set(rateRef, { nextStartAt: new Date(Date.now() + 10000) });
    tx.set(adminDb.collection("discord_oauth_states").doc(hash(state)), {
      uid, expiresAt: new Date(Date.now() + 600000), code: null,
    });
  });
  const url = new URL("https://discord.com/oauth2/authorize");
  url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirectUri,
    response_type: "code", scope: "identify guilds.join", state, prompt: "consent" }).toString();
  return { state, url: url.toString() };
}

function oauthRef(state) {
  if (!/^[a-f0-9]{64}$/.test(state || "")) throw discordError("invalid_state");
  return adminDb.collection("discord_oauth_states").doc(hash(state));
}

// The callback captures the code; completion still requires the original GO user's Firebase token.
export async function captureDiscordCode(state, cookie, code) {
  if (!cookie || state !== cookie || typeof code !== "string" || !code || code.length > 2048) {
    throw discordError("invalid_state");
  }
  const ref = oauthRef(state);
  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || millis(snap.data().expiresAt) <= Date.now() || snap.data().code) throw discordError("invalid_state");
    tx.update(ref, { code });
  });
}

export async function consumeDiscordCode(uid, state) {
  const ref = oauthRef(state);
  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data();
    if (!data || data.uid !== uid || millis(data.expiresAt) <= Date.now() || !data.code) throw discordError("invalid_state");
    tx.delete(ref);
    return data.code;
  });
}

// Serialize connect, reconciliation, and disconnect so a stale worker cannot re-grant a removed role.
async function withConnectionLock(uid, operation) {
  const ref = adminDb.collection("discord_locks").doc(uid);
  const owner = randomBytes(16).toString("hex");
  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (millis(snap.data()?.expiresAt) > Date.now()) throw discordError("sync_busy", 409);
    tx.set(ref, { owner, expiresAt: new Date(Date.now() + 120000) });
  });
  try { return await operation(); }
  finally {
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.data()?.owner === owner) tx.delete(ref);
    });
  }
}

export async function claimDiscordIdentity(uid, identity, config) {
  if (!/^\d{17,20}$/.test(identity?.id || "")) throw discordError("authorization_failed");
  const ref = connectionRef(uid);
  const ownerRef = adminDb.collection("discord_identities").doc(identity.id);
  await adminDb.runTransaction(async (tx) => {
    const [connection, owner] = await Promise.all([tx.get(ref), tx.get(ownerRef)]);
    if (owner.exists && owner.data().uid !== uid) throw discordError("already_linked", 409);
    if (connection.exists && (connection.data().discordId !== identity.id || connection.data().guildId !== config.guildId)) {
      throw discordError("disconnect_first", 409);
    }
    tx.set(ownerRef, { uid });
    tx.set(ref, {
      discordId: identity.id, username: identity.username, guildId: config.guildId,
      status: "join_pending", linkedAt: connection.data()?.linkedAt || new Date(),
      nextSyncAt: new Date(), managedRoleId: connection.data()?.managedRoleId || null,
    }, { merge: true });
  });
}

async function syncConnection(uid, config) {
  const ref = connectionRef(uid);
  const snap = await ref.get();
  if (!snap.exists) return;
  const connection = snap.data();
  if (millis(connection.retryNotBefore) > Date.now()) {
    throw discordError("rate_limited", 429, Math.ceil((millis(connection.retryNotBefore) - Date.now()) / 1000));
  }
  if (connection.guildId !== config.guildId) throw discordError("server_changed", 409);
  const path = `/guilds/${connection.guildId}/members/${connection.discordId}`;
  const token = `Bot ${config.botToken}`;
  try {
    const member = await discordRequest(path, { token });
    const user = await adminDb.collection("users").doc(uid).get();
    const eligible = user.exists && hasActiveSubscription(user.data());
    const wantedRole = eligible && !member.pending ? config.memberRoleId : null;
    // Preserve the previously managed ID so changing configuration cannot strand old access.
    const managed = new Set([connection.managedRoleId, config.memberRoleId].filter(Boolean));
    for (const role of managed) {
      if (role !== wantedRole && member.roles.includes(role)) {
        await discordRequest(`${path}/roles/${role}`, { token, method: "DELETE" });
      }
    }
    // Record ownership before the external write, allowing cleanup after a crash.
    if (wantedRole) {
      await ref.update({ managedRoleId: wantedRole });
      if (!member.roles.includes(wantedRole)) await discordRequest(`${path}/roles/${wantedRole}`, { token, method: "PUT" });
    }
    await ref.update({ status: member.pending ? "screening_required" : "joined", memberAccess: !!wantedRole,
      managedRoleId: wantedRole, lastError: null, retryNotBefore: null, lastSyncedAt: new Date(), nextSyncAt: new Date(Date.now() + 300000) });
  } catch (error) {
    await ref.update({ status: error.code === "not_in_server" ? "join_required" : "sync_pending",
      memberAccess: false, lastError: error.code || "sync_failed",
      retryNotBefore: error.code === "rate_limited" ? new Date(Date.now() + (error.retryAfter || 60) * 1000) : null,
      nextSyncAt: new Date(Date.now() + Math.max(60000, (error.retryAfter || 0) * 1000)) });
    if (error.code !== "not_in_server") throw error;
  }
}

export async function completeDiscordConnection(uid, state) {
  const config = requireDiscordConfig();
  return withConnectionLock(uid, async () => {
    const code = await consumeDiscordCode(uid, state);
    const user = await adminDb.collection("users").doc(uid).get();
    if (!user.exists) throw discordError("account_missing", 403);
    if (config.membersOnly && !hasActiveSubscription(user.data())) throw discordError("membership_required", 403);
    const tokens = await discordRequest("/oauth2/token", { method: "POST", form: true, body: {
      client_id: config.clientId, client_secret: config.clientSecret, grant_type: "authorization_code",
      code, redirect_uri: config.redirectUri,
    } });
    if (!tokens.access_token || !["identify", "guilds.join"].every((scope) => (tokens.scope || "").split(" ").includes(scope))) {
      throw discordError("authorization_failed");
    }
    const identity = await discordRequest("/users/@me", { token: `Bearer ${tokens.access_token}` });
    await claimDiscordIdentity(uid, identity, config);
    // Tokens live only in this request. Rejoining requires fresh consent, rather than silently adding leavers back.
    try {
      await discordRequest(`/guilds/${config.guildId}/members/${identity.id}`, {
        token: `Bot ${config.botToken}`, method: "PUT", body: { access_token: tokens.access_token },
      });
      await syncConnection(uid, config);
    } catch (error) {
      await connectionRef(uid).update({ lastError: error.code || "join_failed" });
      throw error;
    }
  });
}

export async function syncDiscordConnection(uid) {
  const config = requireDiscordConfig();
  return withConnectionLock(uid, () => syncConnection(uid, config));
}

export async function disconnectDiscord(uid) {
  const config = requireDiscordConfig();
  return withConnectionLock(uid, async () => {
    const ref = connectionRef(uid);
    const snap = await ref.get();
    if (!snap.exists) return;
    const data = snap.data();
    const roles = new Set([data.managedRoleId, data.guildId === config.guildId ? config.memberRoleId : null].filter(Boolean));
    for (const role of roles) {
      try {
        await discordRequest(`/guilds/${data.guildId}/members/${data.discordId}/roles/${role}`, {
          token: `Bot ${config.botToken}`, method: "DELETE",
        });
      } catch (error) { if (error.code !== "not_in_server") throw error; }
    }
    // Retain the identity if Discord cleanup fails, so the operation can safely be retried.
    const batch = adminDb.batch();
    batch.delete(ref);
    batch.delete(adminDb.collection("discord_identities").doc(data.discordId));
    await batch.commit();
  });
}

export async function discordConnectionStatus(uid) {
  const snap = await connectionRef(uid).get();
  if (!snap.exists) return null;
  const data = snap.data();
  return { username: data.username, status: data.status, memberAccess: data.memberAccess === true,
    lastError: data.lastError || null, serverUrl: `https://discord.com/channels/${data.guildId}` };
}

export async function processDiscordSyncs() {
  requireDiscordConfig();
  const due = await adminDb.collection("discord_connections").where("nextSyncAt", "<=", new Date())
    .orderBy("nextSyncAt").limit(50).get();
  const started = Date.now();
  let processed = 0;
  let failed = 0;
  for (const snap of due.docs) {
    if (Date.now() - started > 30000) break;
    try { await syncDiscordConnection(snap.id); processed++; }
    catch (error) {
      failed++;
      if (error.code === "rate_limited") break;
    }
  }
  return { processed, failed };
}

export async function enqueueDiscordSync(uid) {
  const ref = connectionRef(uid);
  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) tx.update(ref, { nextSyncAt: new Date(Math.max(Date.now(), millis(snap.data().retryNotBefore))) });
  });
}
