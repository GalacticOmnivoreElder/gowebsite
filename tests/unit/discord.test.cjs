const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");
const { NextResponse, createRequest } = require("../helpers/route-test-utils.cjs");

const config = { enabled: true, clientId: "100000000000000001", clientSecret: "secret", botToken: "bot", guildId: "100000000000000002", memberRoleId: "100000000000000003", redirectUri: "https://go.example/api/discord/callback" };
const identity = { id: "100000000000000004", username: "creator" };
const { hasActiveSubscription } = loadSourceModule("src/lib/auth-utils.js", ["hasActiveSubscription"], { stripImports: true });
const { discordError } = loadSourceModule("src/lib/discord-api.js", ["discordError"]);

function harness({ seed = {}, request = async () => null, settings = {} } = {}) {
  const docs = new Map(Object.entries(seed));
  const calls = [];
  function ref(path) {
    return { path, id: path.split("/").at(-1),
      async get() { return { exists: docs.has(path), data: () => docs.get(path) }; },
      async update(data) { assert.ok(docs.has(path)); docs.set(path, { ...docs.get(path), ...data }); },
    };
  }
  const db = {
    collection: (name) => ({ doc: (id) => ref(`${name}/${id}`) }),
    async runTransaction(callback) {
      const operations = [];
      const result = await callback({
        get: (target) => target.get(),
        set: (target, data, options) => operations.push(() => docs.set(target.path, options?.merge ? { ...docs.get(target.path), ...data } : data)),
        update: (target, data) => operations.push(() => target.update(data)),
        delete: (target) => operations.push(() => docs.delete(target.path)),
      });
      for (const operation of operations) await operation();
      return result;
    },
    batch() { const targets = []; return { delete: (target) => targets.push(target.path), commit: async () => targets.forEach((path) => docs.delete(path)) }; },
  };
  const api = loadSourceModule("src/lib/discord.js", ["startDiscordConnection", "captureDiscordCode", "consumeDiscordCode", "claimDiscordIdentity", "completeDiscordConnection", "syncDiscordConnection", "disconnectDiscord", "discordConnectionStatus"], {
    stripImports: true,
    sandbox: { ...crypto, URLSearchParams, adminDb: db, hasActiveSubscription, discordError,
      requireDiscordConfig: () => ({ ...config, ...settings }),
      discordRequest: async (path, options) => { calls.push({ path, ...options }); return request(path, options); },
    },
  });
  return { ...api, docs, calls };
}
const linked = (overrides = {}) => ({ discordId: identity.id, username: identity.username, guildId: config.guildId, managedRoleId: config.memberRoleId, ...overrides });
const member = (overrides = {}) => ({ roles: [], pending: false, ...overrides });

test("OAuth binds browser state and GO identity and consumes a code exactly once", async () => {
  const h = harness({ seed: { "users/u1": {} } });
  const { state, url } = await h.startDiscordConnection("u1");
  assert.equal(new URL(url).searchParams.get("scope"), "identify guilds.join");
  await assert.rejects(h.captureDiscordCode(state, "wrong-browser", "code"), { code: "invalid_state" });
  await h.captureDiscordCode(state, state, "code");
  await assert.rejects(h.captureDiscordCode(state, state, "another-code"), { code: "invalid_state" });
  await assert.rejects(h.consumeDiscordCode("u2", state), { code: "invalid_state" });
  assert.equal(await h.consumeDiscordCode("u1", state), "code");
  await assert.rejects(h.consumeDiscordCode("u1", state), { code: "invalid_state" });
});

test("expired authorization and repeated starts are rejected", async () => {
  const h = harness({ seed: { "users/u1": {} } });
  const { state } = await h.startDiscordConnection("u1");
  await assert.rejects(h.startDiscordConnection("u1"), { code: "rate_limited" });
  await h.captureDiscordCode(state, state, "code");
  h.docs.get(`discord_oauth_states/${crypto.createHash("sha256").update(state).digest("hex")}`).expiresAt = new Date(0);
  await assert.rejects(h.consumeDiscordCode("u1", state), { code: "invalid_state" });
});

test("a Discord identity cannot be claimed by two GO users or silently switched", async () => {
  const h = harness();
  await h.claimDiscordIdentity("u1", identity, config);
  await assert.rejects(h.claimDiscordIdentity("u2", identity, config), { code: "already_linked" });
  await assert.rejects(h.claimDiscordIdentity("u1", { ...identity, id: "100000000000000005" }, config), { code: "disconnect_first" });
  assert.equal(h.docs.get(`discord_identities/${identity.id}`).uid, "u1");
});

test("OAuth completion joins members and never persists tokens", async () => {
  const h = harness({ seed: { "users/u1": { activeMember: true } }, request: async (path, options) => {
    if (path === "/oauth2/token") return { access_token: "PRIVATE_ACCESS", refresh_token: "PRIVATE_REFRESH", scope: "identify guilds.join" };
    if (path === "/users/@me") return identity;
    if (options.method === "PUT") return null;
    return member();
  } });
  const { state } = await h.startDiscordConnection("u1");
  await h.captureDiscordCode(state, state, "oauth-code");
  await h.completeDiscordConnection("u1", state);
  assert.ok(h.calls.some((call) => call.body?.access_token === "PRIVATE_ACCESS" && call.token === "Bot bot"));
  assert.ok(h.calls.some((call) => call.path.endsWith(`/roles/${config.memberRoleId}`) && call.method === "PUT"));
  assert.equal(h.docs.get("discord_connections/u1").status, "joined");
  assert.doesNotMatch(JSON.stringify([...h.docs]), /PRIVATE_ACCESS|PRIVATE_REFRESH|oauth-code/);
});

test("active members receive the managed role; unrelated roles remain untouched", async () => {
  const h = harness({ seed: { "users/u1": { activeMember: true }, "discord_connections/u1": linked() }, request: async () => member({ roles: ["unrelated-role"] }) });
  await h.syncDiscordConnection("u1");
  assert.equal(h.calls.filter((c) => c.method === "PUT").length, 1);
  assert.equal(h.calls.filter((c) => c.method === "DELETE").length, 0);
  assert.equal(h.docs.get("discord_connections/u1").memberAccess, true);
});

test("canceled membership keeps paid-through access; expiry removes only the GO role", async () => {
  const h = harness({ seed: { "users/u1": { subscriptionStatus: "canceled", subscriptionEndsAt: new Date(Date.now() + 60000) }, "discord_connections/u1": linked() }, request: async () => member({ roles: [config.memberRoleId, "staff-role"] }) });
  await h.syncDiscordConnection("u1");
  assert.equal(h.calls.filter((c) => c.method === "DELETE").length, 0);
  h.docs.get("users/u1").subscriptionEndsAt = new Date(0);
  await h.syncDiscordConnection("u1");
  const removed = h.calls.filter((c) => c.method === "DELETE");
  assert.equal(removed.length, 1);
  assert.ok(removed[0].path.endsWith(`/roles/${config.memberRoleId}`));
  assert.equal(h.docs.get("discord_connections/u1").memberAccess, false);
});

test("screening must finish before granting a paid role", async () => {
  const h = harness({ seed: { "users/u1": { activeMember: true }, "discord_connections/u1": linked() }, request: async () => member({ pending: true }) });
  await h.syncDiscordConnection("u1");
  assert.equal(h.calls.filter((c) => c.method === "PUT").length, 0);
  assert.equal(h.docs.get("discord_connections/u1").status, "screening_required");
});

test("leavers are never automatically rejoined; 429 delays retries", async () => {
  let failure = discordError("not_in_server", 404);
  const h = harness({ seed: { "discord_connections/u1": linked() }, request: async () => { throw failure; } });
  await h.syncDiscordConnection("u1");
  assert.equal(h.docs.get("discord_connections/u1").status, "join_required");
  assert.ok(h.calls.every((c) => !c.method));
  failure = discordError("rate_limited", 429, 120);
  await assert.rejects(h.syncDiscordConnection("u1"), { code: "rate_limited" });
  assert.ok(h.docs.get("discord_connections/u1").nextSyncAt.getTime() >= Date.now() + 119000);
});

test("disconnect retains identity on failure and releases it only after cleanup", async () => {
  let fail = true;
  const h = harness({ seed: { "discord_connections/u1": linked(), [`discord_identities/${identity.id}`]: { uid: "u1" } }, request: async () => { if (fail) throw discordError("discord_forbidden", 502); } });
  await assert.rejects(h.disconnectDiscord("u1"), { code: "discord_forbidden" });
  assert.ok(h.docs.has("discord_connections/u1"));
  assert.ok(h.docs.has(`discord_identities/${identity.id}`));
  fail = false;
  await h.disconnectDiscord("u1");
  assert.ok(!h.docs.has("discord_connections/u1"));
  assert.ok(!h.docs.has(`discord_identities/${identity.id}`));
  assert.ok(h.calls.every((c) => c.path.endsWith(`/roles/${config.memberRoleId}`)));
});

test("a worker cannot modify a connection locked for disconnect", async () => {
  const h = harness({ seed: { "discord_locks/u1": { owner: "other-worker", expiresAt: new Date(Date.now() + 60000) } } });
  await assert.rejects(h.syncDiscordConnection("u1"), { code: "sync_busy" });
  assert.equal(h.calls.length, 0);
});

test("members-only join gating uses authoritative membership", async () => {
  const h = harness({ seed: { "users/u1": { activeMember: true, subscriptionStatus: "revoked" } }, settings: { membersOnly: true } });
  await assert.rejects(h.startDiscordConnection("u1"), { code: "membership_required" });
});

test("API routes require authentication before all connection actions", async () => {
  const route = loadSourceModule("src/app/api/discord/route.js", ["GET", "POST"], { stripImports: true, sandbox: { NextResponse, getRequestUser: async () => null } });
  assert.equal((await route.GET(createRequest())).status, 401);
  for (const action of ["connect", "complete", "disconnect", "sync"]) assert.equal((await route.POST(createRequest({ jsonBody: { action } }))).status, 401);
});

test("Discord API handles 204 and rate limits without echoing secrets", async () => {
  let response = new Response(null, { status: 204 });
  const api = loadSourceModule("src/lib/discord-api.js", ["discordRequest"], { sandbox: { AbortSignal, URLSearchParams, fetch: async () => response } });
  assert.equal(await api.discordRequest("/test", { token: "Bot private" }), null);
  response = new Response(JSON.stringify({ retry_after: 2.5, message: "PRIVATE" }), { status: 429 });
  await assert.rejects(api.discordRequest("/test"), (error) => error.code === "rate_limited" && error.retryAfter === 2.5 && !error.message.includes("PRIVATE"));
});
