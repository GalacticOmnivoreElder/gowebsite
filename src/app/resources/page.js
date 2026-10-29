import Link from "next/link";
import { FileText, PackageOpen } from "lucide-react";
import { adminDb } from "@/lib/firebase-admin";
import { getProductConfig } from "@/lib/product-config";
import { isPublicResourceStatus, toPublicResourceDto } from "@/lib/content-visibility";
import { AssetPackDirectory } from "@/components/asset-packs/AssetPackDirectory";
import { LearningCategoryNav } from "@/components/learning/LearningCategoryNav";
import { LearningPageHeader } from "@/components/learning/LearningPageHeader";
import { ProtectedResourceOpenButton } from "@/components/packages/ProtectedResourceOpenButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = createMetadata({
  title: "Game Development Resources",
  description: "Discover community-created assets and practical game-development resources available through Galactic Omnivore.",
  path: "/resources",
});

async function getResources() {
  try {
    const snapshot = await adminDb.collection("packages").get();
    const resources = snapshot.docs
      .filter((doc) => isPublicResourceStatus(doc.data().status))
      .map((doc) => toPublicResourceDto({ id: doc.id, ...doc.data() }));
    return { resources, failed: false };
  } catch (error) {
    console.error("resource_list_failed", { code: error?.code || "unknown" });
    return { resources: [], failed: true };
  }
}

export default async function ResourcesPage() {
  const { resources, failed } = await getResources();
  const assetPacksEnabled = getProductConfig().featureFlags.communityAssetSubmissions;
  return (
    <main className="container mx-auto max-w-6xl px-4 py-12 md:py-16">
      <LearningPageHeader icon={FileText} title="Resources" description="Explore practical game-development material shared or selected by Galactic Omnivore. Community members can access published resources with an active membership." />
      <LearningCategoryNav activeItem="Resources" className="mt-10" />
      <section className="mt-12" aria-labelledby="community-resources-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Made by the community</p><h2 id="community-resources-heading" className="mt-2 text-3xl font-bold">Community asset packs</h2></div>
          <Button variant="outline" asChild><Link href="/asset-packs">About contributing <PackageOpen className="ml-2 h-4 w-4" aria-hidden="true" /></Link></Button>
        </div>
        <p className="mt-3 max-w-3xl text-muted-foreground">Discover reviewed assets from GO creators. Check each pack’s licence and compatibility before using it in your project.</p>
        <div className="mt-6">{assetPacksEnabled ? <AssetPackDirectory returnTo="/resources" /> : <Card><CardContent className="p-8 text-muted-foreground">Community asset packs are not currently available.</CardContent></Card>}</div>
      </section>
      <section className="mt-16" aria-labelledby="go-resources-heading">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">From the GO library</p>
        <h2 id="go-resources-heading" className="mt-2 text-3xl font-bold">GO resources</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">Browse published GO resources and open their files with an active Community membership.</p>
        {failed ? <Card className="mt-6"><CardContent className="p-8"><p role="alert">GO resources could not be loaded. Please try again later.</p></CardContent></Card> : resources.length ? (
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {resources.map((resource) => <Card key={resource.id} className="flex flex-col"><CardHeader><Badge variant="outline" className="w-fit">Member resource</Badge><CardTitle className="mt-3">{resource.title}</CardTitle>{(resource.month || resource.year) && <p className="text-sm text-muted-foreground">{[resource.month, resource.year].filter(Boolean).join(" ")}</p>}</CardHeader><CardContent className="flex flex-1 flex-col gap-4"><p className="text-sm leading-6 text-muted-foreground">{resource.shortDescription || resource.description}</p>{resource.assets.length ? <ul className="space-y-4">{resource.assets.map((asset) => <li key={asset.assetIndex} className="rounded-lg border p-4"><h3 className="font-semibold">{asset.title}</h3>{asset.description && <p className="mt-1 text-sm text-muted-foreground">{asset.description}</p>}<div className="mt-3"><ProtectedResourceOpenButton resourceId={resource.id} assetIndex={asset.assetIndex} /></div></li>)}</ul> : <p className="text-sm text-muted-foreground">No downloadable files are listed for this resource.</p>}</CardContent></Card>)}
          </div>
        ) : <Card className="mt-6"><CardContent className="p-8 text-muted-foreground">No GO resources are published right now.</CardContent></Card>}
      </section>
      <section className="mt-16 rounded-lg border border-primary/30 bg-primary/5 p-6 md:p-8"><h2 className="text-2xl font-bold">Ready to explore?</h2><p className="mt-3 max-w-2xl text-muted-foreground">Sign in to access resources included with your active membership, or learn more about joining the GO community.</p><div className="mt-6 flex flex-wrap gap-3"><Button asChild><Link href="/login?redirect=%2Fresources">Sign in</Link></Button><Button variant="outline" asChild><Link href="/membership">Review membership</Link></Button></div></section>
    </main>
  );
}
