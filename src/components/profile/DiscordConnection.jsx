"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const statusLabels = {
  joined: "Your Discord account is connected and you have joined the GO server.",
  screening_required: "You have joined. Open Discord and accept the server rules to finish gaining access.",
  join_required: "Your account is connected. Connect again to authorize joining the GO server.",
  join_pending: "Your account is connected, but joining the server is not confirmed. Connect again to retry.",
  sync_pending: "Your account is connected. We are waiting to confirm your server access.",
};

export default function DiscordConnection({ callback = false }) {
  const [account, setAccount] = useState(undefined);
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const callbackPromise = useRef(null);

  async function request(action) {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Sign in to GO to connect your Discord account.");
    const response = await fetch("/api/discord", {
      method: action ? "POST" : "GET", cache: "no-store",
      headers: { Authorization: `Bearer ${token}`, ...(action ? { "Content-Type": "application/json" } : {}) },
      ...(action ? { body: JSON.stringify({ action }) } : {}),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Discord connection failed.");
    return result;
  }

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
            window.history.replaceState(null, "", "/discord");
            callbackPromise.current = result === "complete" ? request("complete") : Promise.resolve();
            if (result === "cancelled") setError("Discord authorization was cancelled. You can connect whenever you are ready.");
            if (result === "failed") setError("This connection attempt could not be verified. Please connect again.");
          }
          await callbackPromise.current;
        }
      } catch (err) { if (active) setError(err.message); }
      try {
        const result = await request();
        if (active) setData(result);
      } catch (err) { if (active) setError(err.message); }
      finally { if (active) setBusy(false); }
    }
    load();
    return () => { active = false; };
  }, [account, callback]);

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

  const connection = data?.connection;
  return (
    <Card>
      <CardHeader><CardTitle>Discord community</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Connect your Discord account and authorize GO to add you to our server. Active GO members receive access to member channels.</p>
        {account === undefined && <p role="status">Loading your account…</p>}
        {account === null && <Button asChild><Link href="/login?redirect=%2Fdiscord">Sign in to connect Discord</Link></Button>}
        {account && !data && busy && <p role="status">Loading your Discord connection…</p>}
        {data && !data.available && <p className="text-sm text-muted-foreground">Discord account connection is being set up. Please check back soon.</p>}
        {connection && <div className="space-y-2" aria-live="polite">
          <p className="font-medium">Connected as @{connection.username}</p>
          <p className="text-sm">{statusLabels[connection.status] || "Your Discord account is connected."}</p>
          {connection.status === "joined" && <p className="text-sm text-muted-foreground">{connection.memberAccess ? "Member channel access is active." : "Member channel access depends on your GO membership."}</p>}
          <Button asChild variant="outline"><a href={connection.serverUrl} target="_blank" rel="noreferrer">Open GO Discord</a></Button>
        </div>}
        {data?.available && <div className="flex flex-wrap gap-3">
          <Button disabled={busy} onClick={() => act("connect")}>{busy ? "Please wait…" : connection ? "Reconnect Discord" : "Connect Discord & join server"}</Button>
          {connection && <Button variant="outline" disabled={busy} onClick={() => act("sync")}>Refresh access</Button>}
          {connection && <Button variant="ghost" disabled={busy} onClick={() => act("disconnect")}>Disconnect</Button>}
        </div>}
        {connection && <p className="text-xs text-muted-foreground">Disconnecting removes GO-managed member access. You can remain in the public server channels.</p>}
        {data?.membersOnly && <p className="text-sm text-muted-foreground">An active GO membership is required to join through the platform.</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
