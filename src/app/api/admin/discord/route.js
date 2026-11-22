import { randomUUID } from "node:crypto";
import { getRequestUser } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";
import { requireDiscordConfig, discordRequest } from "@/lib/discord-api";
import { getDiscordRolePolicy, discordPolicyRef, discordRoleInventory, buildDiscordRolePreview } from "@/lib/discord-role-bridge";
import { validateRolePolicy } from "@/lib/discord-role-policy.mjs";
import { enqueueDiscordSync, syncDiscordConnection } from "@/lib/discord";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;
const json = (data, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const validUid = (uid) => typeof uid === "string" && uid.length > 0 && uid.length <= 128 && !uid.includes("/") && ![".", ".."].includes(uid);

async function authorize(request) {
  const user = await getRequestUser(request);
  return !user ? { response: json({ error: "Authentication required" }, 401) } : !user.admin
    ? { response: json({ error: "Administrator access required" }, 403) } : { user };
}

export async function GET(request) {
  const gate = await authorize(request);
  if (gate.response) return gate.response;
  try {
    const config = requireDiscordConfig();
    const [policy, inventory, connections] = await Promise.all([
      getDiscordRolePolicy(), discordRoleInventory(config),
      adminDb.collection("discord_connections").orderBy("nextSyncAt").limit(30).get(),
    ]);
    return json({ policy: policy || { mode: "preview", requireOnboarding: true, revision: 0,
      mappings: [{ roleId: config.memberRoleId, source: "member", value: "", enabled: true }] }, inventory,
      connections: connections.docs.map((doc) => { const data = doc.data(); return {
        uid: doc.id, username: data.username, status: data.status, roleSyncState: data.roleSyncState || "legacy",
        lastError: data.lastError || null, policyRevision: data.policyRevision || null,
      }; }) });
  } catch (error) { return json({ error: error.code === "not_configured" ? "Configure the Discord application, server, and member role first." : "Unable to load Discord configuration." }, 503); }
}

export async function POST(request) {
  const gate = await authorize(request);
  if (gate.response) return gate.response;
  const body = await request.json().catch(() => ({}));
  try {
    const config = requireDiscordConfig();
    if (body.action === "save") {
      const policy = validateRolePolicy(body.policy);
      const inventory = await discordRoleInventory(config);
      for (const rule of policy.mappings.filter((rule) => rule.enabled)) {
        const role = inventory.roles.find((role) => role.id === rule.roleId);
        if (!role || role.blocked) return json({ error: `Role ${role?.name || rule.roleId} cannot be managed: ${role?.blocked || "missing"}.` }, 400);
        if (rule.roleId === config.memberRoleId && rule.source !== "member") return json({ error: "The paid member role must use the member source." }, 400);
      }
      if (policy.mode === "apply" && body.acknowledgeTakeover !== true) return json({ error: "Confirm that GO owns the enabled role IDs and competing role writers have been disabled." }, 400);
      const result = await adminDb.runTransaction(async (tx) => {
        const ref = discordPolicyRef();
        const old = await tx.get(ref);
        const revision = old.data()?.revision || 0;
        if (body.expectedRevision !== revision) throw new Error("configuration_conflict");
        const next = { ...policy, revision: revision + 1, updatedAt: new Date(), updatedBy: gate.user.uid };
        tx.set(ref, next);
        tx.set(adminDb.collection("discord_admin_events").doc(randomUUID()), {
          action: "policy_saved", actor: gate.user.uid, revision: next.revision, mode: policy.mode,
          mappings: policy.mappings, createdAt: new Date(),
        });
        return next.revision;
      });
      return json({ ok: true, revision: result });
    }
    if (!validUid(body.uid)) return json({ error: "A valid GO user ID is required." }, 400);
    const connection = await adminDb.collection("discord_connections").doc(body.uid).get();
    if (!connection.exists) return json({ error: "This user has not connected Discord." }, 404);
    const policy = await getDiscordRolePolicy();
    if (body.action === "preview") {
      if (!policy) return json({ error: "Save a preview policy first." }, 400);
      const data = connection.data();
      if (data.guildId !== config.guildId) return json({ error: "The connection belongs to another server." }, 409);
      const member = await discordRequest(`/guilds/${config.guildId}/members/${data.discordId}`, { token: `Bot ${config.botToken}` });
      return json({ preview: await buildDiscordRolePreview(body.uid, config, policy, member, data) });
    }
    if (body.action === "grants") {
      const roleIds = [...new Set(Array.isArray(body.roleIds) ? body.roleIds : [])];
      const allowed = policy?.mappings.filter((rule) => rule.enabled && rule.source === "manual").map((rule) => rule.roleId) || [];
      if (roleIds.length > 40 || roleIds.some((id) => !allowed.includes(id))) return json({ error: "Only enabled manual role mappings may be granted." }, 400);
      const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
      if (expiresAt && (!Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date())) return json({ error: "Expiry must be a future date." }, 400);
      const batch = adminDb.batch();
      batch.set(adminDb.collection("discord_role_grants").doc(body.uid), { roleIds, expiresAt, updatedBy: gate.user.uid, updatedAt: new Date() });
      batch.set(adminDb.collection("discord_admin_events").doc(randomUUID()), { action: "grants_changed", actor: gate.user.uid, uid: body.uid, roleIds, expiresAt, createdAt: new Date() });
      await batch.commit();
      await enqueueDiscordSync(body.uid);
      return json({ ok: true, queued: true });
    }
    if (body.action === "sync") {
      await syncDiscordConnection(body.uid);
      return json({ ok: true });
    }
    return json({ error: "Unknown action." }, 400);
  } catch (error) {
    if (error.message === "configuration_conflict") return json({ error: "Another administrator changed the policy. Reload before saving." }, 409);
    return json({ error: error.code ? `Discord operation failed: ${error.code}` : error.message || "Discord operation failed." }, error.status || 400);
  }
}
