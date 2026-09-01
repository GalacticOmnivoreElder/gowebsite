"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { auth } from "@/firebase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const accessOptions = [
  ["community", "Community and Business"],
  ["public", "Public"],
  ["individual", "Individually granted"],
];

export default function AdminAssetPacksPage() {
  const [data, setData] = useState(null);
  const [message, setMessage] = useState("");
  const [guidance, setGuidance] = useState({});
  const [reasons, setReasons] = useState({});
  const [access, setAccess] = useState({});
  const [grant, setGrant] = useState({ packId: "", userId: "", reason: "" });
  const [busy, setBusy] = useState(false);

  const call = useCallback(async (options = {}) => {
    const token = await auth.currentUser?.getIdToken();
    return fetch("/api/admin/asset-packs", {
      ...options,
      headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  }, []);

  const load = useCallback(async () => {
    const response = await call();
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Asset-pack reviews could not be loaded");
    setData(result);
  }, [call]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(() => load().catch((error) => setMessage(error.message)));
    return unsubscribe;
  }, [load]);

  const act = async (body, successMessage = "Asset-pack review updated and audited.") => {
    setBusy(true);
    setMessage("");
    try {
      const response = await call({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Review action failed");
      setMessage(successMessage);
      await load();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const deletePack = (pack) => {
    const reason = reasons[`pack:${pack.id}`] || "";
    if (!reason.trim()) {
      setMessage("Enter a reason before permanently deleting an asset pack.");
      return;
    }
    if (!window.confirm(`Permanently delete “${pack.title || pack.id}”? This removes the pack, all versions, access grants, and active download links.`)) return;
    return act({ action: "delete_pack", packId: pack.id, reason }, "Asset pack permanently deleted and audited.");
  };

  if (!data) return <p className="p-8 text-center">{message || "Loading asset-pack reviews..."}</p>;
  const reviewVersions = data.versions.filter((item) => ["submitted", "approved", "changes_requested"].includes(item.status));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Asset Pack Reviews</h1>
        <p className="mt-2 text-muted-foreground">Approve, publish, configure access, and retain a reasoned audit history for community contributions.</p>
      </div>
      {message ? <p role="status" className="rounded-md border p-3 text-sm">{message}</p> : null}

      <section>
        <h2 className="mb-3 text-xl font-semibold">Versions awaiting review</h2>
        <div className="space-y-4">
          {reviewVersions.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex justify-between gap-3">
                  <CardTitle>{item.title} - {item.version}</CardTitle>
                  <Badge>{item.status.replaceAll("_", " ")}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p>{item.description}</p>
                <p className="text-sm text-muted-foreground">License: {item.license} - manifest: {item.fileManifest?.length || 0} files - protected URL present: {item.hasDownloadUrl ? "yes" : "no"}</p>
                <Input aria-label={`Change guidance for ${item.title}`} placeholder="Required guidance when requesting changes" value={guidance[item.id] || ""} onChange={(event) => setGuidance((current) => ({ ...current, [item.id]: event.target.value }))} />
                <Input aria-label={`Review reason for ${item.title}`} placeholder="Reason required for approval or publication" value={reasons[item.id] || ""} onChange={(event) => setReasons((current) => ({ ...current, [item.id]: event.target.value }))} />
                <div className="flex flex-wrap gap-2">
                  {item.status === "submitted" ? (
                    <>
                      <Button disabled={busy || !guidance[item.id]?.trim()} variant="outline" onClick={() => act({ action: "request_changes", versionId: item.id, reviewMessage: guidance[item.id] })}>Request changes</Button>
                      <Button disabled={busy || !reasons[item.id]?.trim()} onClick={() => act({ action: "approve", versionId: item.id, reason: reasons[item.id] })}>Approve</Button>
                    </>
                  ) : null}
                  {item.status === "approved" ? (
                    <>
                      <select aria-label={`Access type for ${item.title}`} className="rounded-md border bg-background px-3 py-2" value={access[item.id] || "community"} onChange={(event) => setAccess((current) => ({ ...current, [item.id]: event.target.value }))}>
                        {accessOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                      <Button disabled={busy || !reasons[item.id]?.trim()} onClick={() => act({ action: "publish", versionId: item.id, accessType: access[item.id] || "community", reason: reasons[item.id] })}>Publish version</Button>
                    </>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
          {!reviewVersions.length ? <p className="rounded-md border p-6 text-center text-muted-foreground">No versions need review.</p> : null}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Individual access grants</h2>
        <div className="grid gap-3 rounded-md border p-4 md:grid-cols-[1fr_1fr_1fr_auto]">
          <Input aria-label="Asset pack ID for grant" placeholder="Asset pack ID" value={grant.packId} onChange={(event) => setGrant((current) => ({ ...current, packId: event.target.value }))} />
          <Input aria-label="User ID for grant" placeholder="User ID" value={grant.userId} onChange={(event) => setGrant((current) => ({ ...current, userId: event.target.value }))} />
          <Input aria-label="Individual access reason" placeholder="Reason" value={grant.reason} onChange={(event) => setGrant((current) => ({ ...current, reason: event.target.value }))} />
          <Button disabled={busy || !grant.packId || !grant.userId || !grant.reason.trim()} onClick={() => act({ action: "grant_access", ...grant })}>Grant access</Button>
        </div>
        <div className="mt-3 space-y-2">
          {data.grants.map((item) => {
            const reasonKey = `grant:${item.id}`;
            return (
              <div key={item.id} className="grid gap-3 rounded-md border p-3 text-sm md:grid-cols-[1fr_1fr_auto] md:items-center">
                <span>{item.packId} - {item.userId} - {item.status}</span>
                <Input aria-label={`Reason to ${item.status === "active" ? "revoke" : "restore"} grant ${item.id}`} placeholder="Reason required" value={reasons[reasonKey] || ""} onChange={(event) => setReasons((current) => ({ ...current, [reasonKey]: event.target.value }))} />
                <Button disabled={busy || !reasons[reasonKey]?.trim()} size="sm" variant="outline" onClick={() => act({ action: "grant_access", packId: item.packId, userId: item.userId, revoked: item.status === "active", reason: reasons[reasonKey] })}>{item.status === "active" ? "Revoke" : "Restore"}</Button>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Published and historical packs</h2>
        <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-muted-foreground"><strong>Remove pack</strong> hides the pack while preserving its history. <strong>Delete permanently</strong> erases the pack, versions, grants, and active protected download links and cannot be undone.</p>
        <div className="space-y-3">
          {data.packs.map((pack) => {
            const reasonKey = `pack:${pack.id}`;
            const accessKey = `pack:${pack.id}`;
            return (
              <div key={pack.id} className="space-y-3 rounded-md border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><p className="font-semibold">{pack.title || pack.id}</p><p className="text-xs text-muted-foreground">{pack.id}</p></div>
                  <Badge>{pack.status}</Badge>
                </div>
                <Input aria-label={`Administrative reason for ${pack.title || pack.id}`} placeholder="Reason for access, removal, or deletion" value={reasons[reasonKey] || ""} onChange={(event) => setReasons((current) => ({ ...current, [reasonKey]: event.target.value }))} />
                <div className="flex flex-wrap gap-2">
                  <select aria-label={`Current access type for ${pack.title || pack.id}`} className="rounded-md border bg-background px-3 py-2" value={access[accessKey] || pack.accessType || "community"} onChange={(event) => setAccess((current) => ({ ...current, [accessKey]: event.target.value }))}>
                    {accessOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <Button disabled={busy || !pack.currentVersionId || !reasons[reasonKey]?.trim()} size="sm" variant="outline" onClick={() => act({ action: "set_access_type", packId: pack.id, accessType: access[accessKey] || pack.accessType || "community", reason: reasons[reasonKey] })}>Save access</Button>
                  {pack.status !== "removed" ? <Button disabled={busy || !reasons[reasonKey]?.trim()} size="sm" variant="outline" onClick={() => act({ action: "set_pack_status", packId: pack.id, status: "removed", reason: reasons[reasonKey] }, "Asset pack removed and audited; its history was preserved.")}>Remove pack</Button> : null}
                  {["published", "legacy", "archived"].filter((status) => status !== pack.status).map((status) => (
                    <Button key={status} disabled={busy || !reasons[reasonKey]?.trim()} size="sm" variant="outline" onClick={() => act({ action: "set_pack_status", packId: pack.id, status, reason: reasons[reasonKey] })}>Mark {status}</Button>
                  ))}
                  <Button disabled={busy || !reasons[reasonKey]?.trim()} size="sm" variant="destructive" onClick={() => deletePack(pack)}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete permanently</Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
