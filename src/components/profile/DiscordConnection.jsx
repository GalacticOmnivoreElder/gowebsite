"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const statusLabels = {
  disconnect_pending: "Your connection is being removed. GO is cleaning up its roles before releasing the account link.",
  joined: "Your Discord account is connected and you have joined the GO server.",
  screening_required: "You have joined. Open Discord and accept the server rules to finish gaining access.",
  join_required: "Your account is connected. Connect again to authorize joining the GO server.",
  join_pending: "Your account is connected, but joining the server is not confirmed. Connect again to retry.",
  sync_pending: "Your account is connected. We are waiting to confirm your server access.",
};

export default function DiscordConnection({ callback = false, returnTo = "/discord" }) {
  const [account, setAccount] = useState(undefined);
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [appetite, setAppetite] = useState("");
  const callbackPromise = useRef(null);

  const request = useCallback(async (action) => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Sign in to GO to connect your Discord account.");
    const response = await fetch("/api/discord", {
      method: action ? "POST" : "GET", cache: "no-store",
      headers: { Authorization: `Bearer ${token}`, ...(action ? { "Content-Type": "application/json" } : {}) },
      ...(action ? { body: JSON.stringify({ action, ...(action === "connect" ? { returnTo } : {}) }) } : {}),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Discord connection failed.");
    return result;
  }, [returnTo]);

  useEffect(() => onAuthStateChanged(auth, setAccount), []);

  useEffect(() => {
    if (!account) { setData(null); return; }
    let active = true;
    async function load() {
      setBusy(true);
      try {
        if (callback) {
          if (!callbackPromise.current) {
            const result = new URL(window.location.href).searchParams.get("discord");
            const cleanUrl = new URL(window.location.href);
            cleanUrl.searchParams.delete("discord");
            window.history.replaceState(null, "", cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
            callbackPromise.current = result === "complete" ? request("complete") : Promise.resolve();
            if (result === "cancelled") setError("Discord authorization was cancelled. You can connect whenever you are ready.");
            if (result === "failed") setError("This connection attempt could not be verified. Please connect again.");
          }
          await callbackPromise.current;
        }
      } catch (err) { if (active) setError(err.message); }
      try {
        const result = await request();
        if (active) { setData(result); setAppetite(result.profileAppetite || ""); }
      } catch (err) { if (active) setError(err.message); }
      finally { if (active) setBusy(false); }
    }
    load();
    return () => { active = false; };
  }, [account, callback, request]);

  async function act(action) {
    setBusy(true);
    setError("");
    try {
      const result = await request(action);
      if (result.url) { window.location.assign(result.url); return; }
      setData((current) => ({ ...current, ...result }));
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function saveAppetite() {
    setBusy(true); setError("");
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/me/profile", { method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ community_appetite: appetite || null }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save community status.");
      setData((current) => ({ ...current, profileAppetite: appetite }));
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  const connection = data?.connection;
  return (
    <Card>
      <CardHeader><CardTitle>Discord community</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Connect your Discord account and authorize GO to add you to our server. Manage your skills and community profile on GO; mapped Discord roles follow your saved profile and eligibility.</p>
        {account === undefined && <p role="status">Loading your account…</p>}
        {account === null && <Button asChild><Link href="/login?redirect=%2Fdiscord">Sign in to connect Discord</Link></Button>}
        {account && !data && busy && <p role="status">Loading your Discord connection…</p>}
        {data && !data.available && <p className="text-sm text-muted-foreground">Discord account connection is being set up. Please check back soon.</p>}
        {connection && <div className="space-y-2" aria-live="polite">
          <p className="font-medium">Connected as @{connection.username}</p>
          <p className="text-sm">{statusLabels[connection.status] || "Your Discord account is connected."}</p>
          {connection.status === "joined" && <p className="text-sm text-muted-foreground">{connection.memberAccess ? "Paid member role confirmed in the GO server." : "Paid member role is not active. It is granted when your GO membership is active."}</p>}
          {connection.lastSyncedAt && <p className="text-xs text-muted-foreground">Last checked: {new Date(connection.lastSyncedAt).toLocaleString()}</p>}
          {connection.roleSyncState === "preview" && <p className="text-sm">Role synchronization is being previewed by GO. Your Discord roles have not been changed by this preview.</p>}
          {connection.roleSyncState === "pending" && <p className="text-sm">Your role changes are queued. Refresh access shortly to check progress.</p>}
          {connection.roleSyncState === "error" && <p className="text-sm">GO could not finish checking your roles. We will retry automatically; contact support if this persists.</p>}
          {connection.roleSyncMode !== "legacy" && !connection.onboardingComplete && <p className="text-sm"><Link className="underline" href="/onboarding">Complete your GO onboarding</Link> to qualify for community access.</p>}
          {connection.roleSyncState === "synced" && <p className="text-sm">Synchronized roles: {connection.roles?.map((role) => role.name).join(", ") || "No mapped roles currently apply."}</p>}
          <p className="text-sm"><Link className="underline" href="/profile">Edit your skills and profile on GO</Link></p>
          <Button asChild variant="outline"><a href={connection.serverUrl} target="_blank" rel="noreferrer">Open GO Discord</a></Button>
        </div>}
        {connection && <div className="space-y-2 border-t pt-4">
          <label className="block text-sm" htmlFor="community-appetite">Community availability (appetite)</label>
          <select id="community-appetite" className="rounded border bg-background px-3 py-2 text-sm" value={appetite} onChange={(event) => setAppetite(event.target.value)}>
            <option value="">Not selected / clear status</option><option value="hungry">Hungry — open to opportunities</option><option value="one_more_bite">One more bite — limited capacity</option><option value="full">Full — at capacity</option>
          </select>
          <Button variant="outline" className="ml-3" disabled={busy} onClick={saveAppetite}>Save status on GO</Button>
          <p className="text-xs text-muted-foreground">This status is reflected on Discord when GO has enabled the corresponding role mapping.</p>
        </div>}
        {data?.available && <div className="flex flex-wrap gap-3">
          <Button disabled={busy} onClick={() => act("connect")}>{busy ? "Please wait…" : connection ? "Reconnect Discord" : "Connect Discord & join server"}</Button>
          {connection && <Button variant="outline" disabled={busy} onClick={() => act("sync")}>Refresh access</Button>}
          {connection && <Button variant="ghost" disabled={busy} onClick={() => act("disconnect")}>Disconnect</Button>}
        </div>}
        {connection && <p className="text-xs text-muted-foreground">Mapped skills and community status become visible as Discord roles. Disconnecting removes GO-managed roles and access. You can remain in the public server channels.</p>}
        {data?.membersOnly && <p className="text-sm text-muted-foreground">An active GO membership is required to join through the platform.</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
