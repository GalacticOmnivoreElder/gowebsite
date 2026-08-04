import Link from "next/link";
import { Clapperboard, Clock } from "lucide-react";
import { adminDb } from "@/lib/firebase-admin";
import { getProductConfig } from "@/lib/product-config";
import { isPublicVideoBundleStatus, toPublicVideoBundleDto } from "@/lib/video-bundles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LearningCategoryNav } from "@/components/learning/LearningCategoryNav";
import { createMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = createMetadata({
  title: "Video Bundles",
  description: "Member learning video bundles from Galactic Omnivore.",
  path: "/video-bundles",
});

export default async function VideoBundlesPage() {
  const enabled = getProductConfig().featureFlags.videoBundles;
  let bundles = [];
  if (enabled) {
    try {
      const snapshot = await adminDb.collection("video_bundles").get();
      bundles = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((bundle) => isPublicVideoBundleStatus(bundle.status)).map(toPublicVideoBundleDto);
    } catch (error) {
      console.error("video_bundle_list_failed", { code: error?.code || "unknown" });
    }
  }
  return (
    <main className="container mx-auto max-w-6xl px-4 py-12 md:py-16">
      <div className="flex items-start gap-4"><Clapperboard className="mt-1 h-9 w-9 text-primary" /><div><p className="text-sm font-semibold uppercase text-primary">Member learning</p><h1 className="mt-1 text-4xl font-bold">Video Bundles</h1><p className="mt-3 max-w-3xl text-muted-foreground">Explore focused collections of game-development videos selected by GO and supported with practical notes, exercises, or downloadable materials where available.</p></div></div>
      <LearningCategoryNav activeItem="Video Bundles" className="mt-10" />
      {enabled && bundles.length > 0 ? (
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{bundles.map((bundle) => <Card key={bundle.id} className="flex flex-col"><CardHeader><Badge className="w-fit">Community access</Badge><CardTitle className="mt-3">{bundle.title}</CardTitle></CardHeader><CardContent className="flex flex-1 flex-col"><p className="line-clamp-4 text-sm text-muted-foreground">{bundle.description}</p><div className="mt-5 flex flex-wrap gap-2">{bundle.relatedTopics.map((topic) => <Badge key={topic} variant="outline">{topic}</Badge>)}</div>{bundle.durationMinutes > 0 && <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"><Clock className="h-4 w-4" />{bundle.durationMinutes} minutes</p>}<Button asChild className="mt-6"><Link href={`/video-bundles/${bundle.slug}`}>View bundle</Link></Button></CardContent></Card>)}</div>
      ) : (
        <Card className="mt-10 border-primary/30"><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle>Video Bundles</CardTitle><Badge>Coming soon</Badge></div></CardHeader><CardContent className="space-y-4 text-muted-foreground"><p>No video bundles are available yet. New collections will appear here as they are published.</p><Button variant="outline" asChild><Link href="/education">Browse courses and workshops</Link></Button></CardContent></Card>
      )}
    </main>
  );
}
