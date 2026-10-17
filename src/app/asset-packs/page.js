import { PackageOpen } from "lucide-react";
import { getProductConfig } from "@/lib/product-config";
import { AssetPackDirectory } from "@/components/asset-packs/AssetPackDirectory";
import { Card, CardContent } from "@/components/ui/card";
import { createMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = createMetadata({ title: "Feed the Omnivore · Community Asset Packs", description: "Publish original game-development assets through GO review, earn Passport recognition, and help build the next game.", path: "/asset-packs" });
export default function AssetPacksPage() {
  const enabled = getProductConfig().featureFlags.communityAssetSubmissions;
  return <main className="container mx-auto max-w-6xl px-4 py-12 md:py-16"><div className="flex items-start gap-4"><PackageOpen className="mt-1 h-9 w-9 text-primary" /><div><p className="text-sm font-semibold uppercase text-primary">Offerings for the next game</p><h1 className="mt-2 text-4xl font-bold md:text-5xl">Give the galaxy something to build with.</h1><p className="mt-4 max-w-3xl leading-7 text-muted-foreground">The Galactic Omnivore feasts on published games. It grows between releases on the craft that makes them possible. Share an original, useful asset pack and put a new tool in the hands of the next creator.</p></div></div><div className="mt-7 rounded-xl border border-primary/25 bg-primary/5 p-5"><p className="leading-7">Your GameDev Passport is free. Publish an original pack through GO&apos;s review process, then keep an active Community membership to unlock one weekly vote on what GO builds next and earn an official contribution stamp.</p></div><div className="mt-10">{enabled ? <><p className="mb-6 text-sm text-muted-foreground">Browse GO-reviewed packs with clear provenance, licensing, compatibility and access details. Active members can submit an original pack from the Asset Packs section of their profile.</p><AssetPackDirectory /></> : <Card className="border-primary/30"><CardContent className="p-8"><h2 className="text-xl font-semibold">The pantry is being prepared</h2><p className="mt-2 text-muted-foreground">Community asset-pack submissions are not enabled in this environment yet.</p></CardContent></Card>}</div></main>;
}
