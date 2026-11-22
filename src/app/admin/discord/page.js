"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "@/firebase";
import { ROLE_SOURCES } from "@/lib/discord-role-policy.mjs";
import { Button } from "@/components/ui/button";

async function api(body) {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch("/api/admin/discord", { method: body ? "POST" : "GET", cache: "no-store",
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Discord request failed.");
  return result;
}

const control = "rounded border bg-background px-3 py-2 text-sm";
export default function DiscordAdministration() {
  const [data, setData] = useState(null);
  const [policy, setPolicy] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [uid, setUid] = useState("");
  const [preview, setPreview] = useState(null);
  const [takeover, setTakeover] = useState(false);
  const [grants, setGrants] = useState([]);
  const [expiry, setExpiry] = useState("");
  const load = useCallback(async () => {
    const result = await api();
    setData(result); setPolicy(result.policy);
  }, []);
  useEffect(() => { load().catch((error) => setMessage(error.message)); }, [load]);

  async function act(body) {
    setBusy(true); setMessage(""); setPreview(null);
    try {
      const result = await api(body);
      if (result.preview) setPreview(result.preview);
      else { await load(); setMessage(result.queued ? "Role changes queued for reconciliation." : "Saved successfully."); }
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  function edit(index, patch) {
    setPolicy((current) => ({ ...current, mappings: current.mappings.map((row, i) => i === index ? { ...row, ...patch } : row) }));
  }

  return <div className="space-y-6">
    <h1 className="text-3xl font-bold">Discord access & roles</h1>
    <p className="text-muted-foreground">GO owns the role IDs you enable here. Start with preview, inspect a linked test user, then enable apply. Roles without mappings stay under their existing management.</p>
    <p role="status" className="text-sm">{message}</p>
    {!data || !policy ? <Button onClick={() => load().catch((error) => setMessage(error.message))}>Load Discord settings</Button> : <>
      <section className="space-y-4 rounded-lg border p-4">
        <h2 className="text-xl font-semibold">Role mapping — revision {policy.revision}</h2>
        <div className="flex flex-wrap gap-5">
          <label>Mode <select className={control} value={policy.mode} onChange={(event) => setPolicy({ ...policy, mode: event.target.value })}><option value="preview">Preview — no role changes</option><option value="apply">Apply — synchronize roles</option></select></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={policy.requireOnboarding} onChange={(event) => setPolicy({ ...policy, requireOnboarding: event.target.checked })} />Require completed GO onboarding for mapped roles</label>
        </div>
        <label className="block text-sm">Pilot GO user IDs (comma-separated; empty means all linked users in apply mode)
          <input className={`${control} ml-3 w-full max-w-xl`} value={(policy.pilotUserIds || []).join(", ")} onChange={(event) => setPolicy({ ...policy, pilotUserIds: event.target.value.split(",").map((uid) => uid.trim()).filter(Boolean) })} />
        </label>
        <p className="text-sm text-muted-foreground">Skill values match profile skill names; use | between aliases. Project values are GO project IDs. Mentor requires active eligible membership plus GO approval. Manual roles require an explicit grant below. Administrative Discord roles are excluded.</p>
        <label className="block text-sm">Import a proposed mapping file <input className="ml-3" type="file" accept=".json,application/json" onChange={async (event) => {
          try {
            const file = event.target.files?.[0];
            if (!file) return;
            const imported = JSON.parse(await file.text());
            if (!Array.isArray(imported.mappings)) throw new Error("The file must contain a mappings array.");
            setPolicy({ ...policy, mode: "preview", requireOnboarding: imported.requireOnboarding !== false, mappings: imported.mappings });
            setTakeover(false); setMessage("Draft loaded locally. Review and save preview to validate against live Discord roles.");
          } catch (error) { setMessage(error.message); }
        }} /></label>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Discord role</th><th>Eligibility source</th><th>Value</th><th>Enabled</th><th>Actions</th></tr></thead><tbody>
          {policy.mappings.map((row, index) => <tr key={index} className="border-t">
            <td className="py-2"><select aria-label={`Discord role ${index + 1}`} className={control} value={row.roleId} onChange={(event) => edit(index, { roleId: event.target.value })}><option value="">Select role</option>{data.inventory.roles.map((role) => <option key={role.id} value={role.id} disabled={!!role.blocked}>{role.name} · {role.id}{role.blocked ? ` (${role.blocked})` : ""}</option>)}</select></td>
            <td><select aria-label={`Eligibility source ${index + 1}`} className={control} value={row.source} onChange={(event) => edit(index, { source: event.target.value, value: "" })}>{ROLE_SOURCES.map((source) => <option key={source}>{source}</option>)}</select></td>
            <td><input aria-label={`Mapping value ${index + 1}`} className={control} value={row.value} maxLength={120} onChange={(event) => edit(index, { value: event.target.value })} /></td>
            <td><input aria-label={`Enable mapping ${index + 1}`} type="checkbox" checked={row.enabled} onChange={(event) => edit(index, { enabled: event.target.checked })} /></td>
            <td><Button variant="ghost" onClick={() => setPolicy({ ...policy, mappings: policy.mappings.filter((_, i) => i !== index) })}>Remove</Button></td>
          </tr>)}
        </tbody></table></div>
        <Button variant="outline" onClick={() => setPolicy({ ...policy, mappings: [...policy.mappings, { roleId: "", source: "skill", value: "", enabled: false }] })}>Add role mapping</Button>
        {policy.mode === "apply" && <label className="flex items-center gap-2"><input type="checkbox" checked={takeover} onChange={(event) => setTakeover(event.target.checked)} />I reviewed the role access and disabled competing role writers for these IDs.</label>}
        <Button className="ml-3" disabled={busy || (policy.mode === "apply" && !takeover)} onClick={() => act({ action: "save", policy, expectedRevision: policy.revision, acknowledgeTakeover: takeover })}>Save {policy.mode} policy</Button>
      </section>
      <section className="space-y-4 rounded-lg border p-4">
        <h2 className="text-xl font-semibold">Linked user preview & grants</h2>
        <label className="block">GO user ID <input className={control} value={uid} onChange={(event) => { setUid(event.target.value); setGrants([]); setPreview(null); }} /></label>
        <div className="flex gap-3"><Button disabled={busy || !uid} onClick={() => act({ action: "preview", uid })}>Preview saved policy</Button><Button variant="outline" disabled={busy || !uid} onClick={() => act({ action: "sync", uid })}>Synchronize user</Button></div>
        {preview && <div role="status" className="space-y-2 text-sm"><p>Mode: {preview.mode}; onboarding complete: {String(preview.onboardingComplete)}</p><p>Add role IDs: {preview.add.join(", ") || "none"}</p><p>Remove role IDs: {preview.remove.join(", ") || "none"}</p><p>Desired roles: {preview.roles.map((role) => role.name).join(", ") || "none"}</p></div>}
        <p className="text-sm">Replace this user’s explicit manual-role grants. An empty selection revokes all manual grants; automatic eligibility is unaffected.</p>
        {policy.mappings.filter((rule) => rule.enabled && rule.source === "manual").map((rule) => <label key={rule.roleId} className="mr-4 inline-flex gap-2"><input type="checkbox" checked={grants.includes(rule.roleId)} onChange={(event) => setGrants(event.target.checked ? [...grants, rule.roleId] : grants.filter((id) => id !== rule.roleId))} />{data.inventory.roles.find((role) => role.id === rule.roleId)?.name || rule.roleId}</label>)}
        <label className="block">Grant expiry (optional) <input className={control} type="datetime-local" value={expiry} onChange={(event) => setExpiry(event.target.value)} /></label>
        <Button variant="outline" disabled={busy || !uid} onClick={() => act({ action: "grants", uid, roleIds: grants, expiresAt: expiry ? new Date(expiry).toISOString() : null })}>Replace manual grants</Button>
      </section>
      <section className="space-y-3"><h2 className="text-xl font-semibold">Next 30 connections due for reconciliation</h2>
        {data.connections.map((connection) => <div key={connection.uid} className="flex flex-wrap items-center gap-4 rounded border p-3 text-sm"><span>@{connection.username} · {connection.status} · {connection.roleSyncState}{connection.lastError ? ` · ${connection.lastError}` : ""}</span><code>{connection.uid}</code><Button variant="outline" onClick={() => { setUid(connection.uid); setGrants([]); setPreview(null); }}>Select user</Button></div>)}
      </section>
    </>}
  </div>;
}
