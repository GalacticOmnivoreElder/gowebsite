import { PackageOpen } from "lucide-react";
import { getProductConfig } from "@/lib/product-config";
import { AssetPackDirectory } from "@/components/asset-packs/AssetPackDirectory";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = createMetadata({ title: "Community Asset Packs", description: "Browse administrator-reviewed community asset packs with clear licenses and protected downloads.", path: "/asset-packs" });
export default function AssetPacksPage() {
  const enabled = getProductConfig().featureFlags.communityAssetSubmissions;
  return <main className="container mx-auto max-w-6xl px-4 py-12 md:py-16"><div className="flex items-start gap-4"><PackageOpen className="mt-1 h-9 w-9 text-primary" /><div><p className="text-sm font-semibold uppercase text-primary">Community resources</p><h1 className="mt-2 text-4xl font-bold md:text-5xl">Community asset packs</h1><p className="mt-4 max-w-3xl text-muted-foreground">Every published pack has administrator-reviewed provenance, licensing, compatibility, and access information. Download destinations remain protected.</p></div></div><div className="mt-10">{enabled ? <><p className="mb-6 text-sm text-muted-foreground">Browse approved packs here, or submit an original pack from the Asset Packs section of your profile if you have an active GO membership.</p><AssetPackDirectory /></> : <Card className="border-primary/30"><CardContent className="flex items-center justify-between gap-4 p-8"><div><h2 className="text-xl font-semibold">Asset-pack library</h2><p className="mt-2 text-muted-foreground">Community submissions will open after review operations are ready.</p></div><Badge>Coming Soon</Badge></CardContent></Card>}</div></main>;
}
