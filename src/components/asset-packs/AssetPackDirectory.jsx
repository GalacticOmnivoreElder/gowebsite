"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { auth } from "@/firebase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AssetPackDirectory() {
  const [packs, setPacks] = useState(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/asset-packs", { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Asset packs could not be loaded");
    setPacks(result.publicPacks || []);
  }, []);

  useEffect(() => {
    load().catch((error) => setMessage(error.message));
  }, [load]);

  const open = async (pack) => {
    setMessage("");
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`/asset-packs/${pack.id}/open`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) return window.location.assign(`/login?redirect=${encodeURIComponent("/asset-packs")}`);
      if (response.status === 403 && pack.accessType === "community") return window.location.assign("/membership");
      if (!response.ok) throw new Error(result.error || "Asset pack could not be opened");
      window.location.assign(result.openUrl);
    } catch (error) {
      setMessage(error.message);
    }
  };

  if (!packs && !message) return <p className="py-16 text-center text-muted-foreground">Loading published asset packs...</p>;
  if (!packs) return <Card><CardContent className="p-8 text-center"><p role="alert">{message}</p><Button className="mt-4" onClick={() => load().catch((error) => setMessage(error.message))}>Try again</Button></CardContent></Card>;

  return (
    <div className="space-y-6">
      {message ? <p className="rounded-md border p-3 text-sm" role="status">{message}</p> : null}
      {packs.length ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {packs.map((pack) => (
            <Card key={pack.id} className="overflow-hidden">
              {pack.previewImage ? <div className="relative aspect-video"><Image unoptimized fill sizes="(max-width: 768px) 100vw, 33vw" src={pack.previewImage} alt={`${pack.title} preview`} className="object-cover" /></div> : null}
              <CardHeader>
                <div className="flex items-start justify-between gap-3"><CardTitle>{pack.title}</CardTitle>{pack.status === "legacy" ? <Badge variant="secondary">Legacy</Badge> : null}</div>
                <p className="text-sm text-muted-foreground">Version {pack.version} - {pack.contributorDisplayName}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="line-clamp-4 text-sm text-muted-foreground">{pack.description}</p>
                <div className="flex flex-wrap gap-2"><Badge variant="outline">{pack.license}</Badge><Badge variant="outline" className="capitalize">{pack.accessType} access</Badge></div>
                <p className="text-xs text-muted-foreground">Review the license, attribution requirements, compatibility, and dependencies before use.</p>
                <Button className="w-full" onClick={() => open(pack)}>Open protected download</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : <Card><CardContent className="p-10 text-center text-muted-foreground">No community asset packs are published yet.</CardContent></Card>}
    </div>
  );
}
