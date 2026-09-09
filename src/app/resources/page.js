import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  FileText,
  Package,
  Sparkles,
  Workflow,
} from "lucide-react";
import { adminDb } from "@/lib/firebase-admin";
import { getProductConfig } from "@/lib/product-config";
import {
  isPublicResourceStatus,
  toPublicResourceDto,
} from "@/lib/content-visibility";
import { LearningCategoryNav } from "@/components/learning/LearningCategoryNav";
import { LearningPageHeader } from "@/components/learning/LearningPageHeader";
import FeaturedPackageCardWrapper from "@/components/packages/FeaturedPackageCardWrapper";
import PackageList from "@/components/packages/PackageList";
import { LandingTestimonials } from "@/components/landing/LandingTestimonials";
import { FullCTA } from "@/components/landing/FullCTA";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createMetadata } from "@/lib/seo";

export const revalidate = 3600;
export const metadata = createMetadata({
  title: "Game Development Resources",
  description:
    "Explore practical game-development material shared or selected by Galactic Omnivore.",
  path: "/resources",
});

async function getResources() {
  try {
    const resourcesSnapshot = await adminDb.collection("packages").get();
    return resourcesSnapshot.docs
      .filter((doc) => isPublicResourceStatus(doc.data().status))
      .map((doc) => toPublicResourceDto({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("resource_list_failed", { code: error?.code || "unknown" });
    return [];
  }
}

function resourceDate(resource) {
  const monthIndex = resource.month
    ? new Date(Date.parse(`${resource.month} 1, 2012`)).getMonth()
    : -1;
  const year = Number(resource.year) || 0;
  const date = new Date(year, monthIndex);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

export default async function ResourcesPage() {
  const resources = await getResources();
  const assetPacksEnabled =
    getProductConfig().featureFlags.communityAssetSubmissions;
  const sortedResources = [...resources].sort(
    (left, right) => resourceDate(right) - resourceDate(left)
  );
  const featuredResource = sortedResources[0] || null;
  const otherResources = featuredResource
    ? sortedResources.filter((resource) => resource.id !== featuredResource.id)
    : [];

  return (
    <main className="container mx-auto max-w-6xl px-4 py-12 md:py-16">
      <LearningPageHeader
        icon={FileText}
        title="Resources"
        description="Explore practical game-development material shared or selected by Galactic Omnivore. Review each resource for its format, access requirements, usage terms, and supporting details."
      />

      <LearningCategoryNav activeItem="Resources" className="mt-10" />

      {featuredResource ? (
        <section
          className="mt-12 md:mt-16"
          aria-labelledby="featured-resource-heading"
        >
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                Published resource
              </p>
              <h2
                id="featured-resource-heading"
                className="mt-1 text-3xl font-semibold"
              >
                Latest published resource
              </h2>
            </div>
          </div>
          <FeaturedPackageCardWrapper package={featuredResource} />
        </section>
      ) : (
        <section
          className="mt-12 md:mt-16"
          aria-labelledby="published-resources-heading"
        >
          <h2 id="published-resources-heading" className="text-3xl font-semibold">
            Published resources
          </h2>
          <Card className="mt-6 border-primary/20">
            <CardContent className="p-8 text-center text-muted-foreground">
              No published resources are available right now.
            </CardContent>
          </Card>
        </section>
      )}

      <section
        className="mt-12 grid gap-6 md:mt-16 md:grid-cols-2"
        aria-label="Resource information"
      >
        <Card className="overflow-hidden border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl md:text-3xl">
              <Package className="h-8 w-8 text-primary" aria-hidden="true" />
              Community asset packs
            </CardTitle>
            <CardDescription>
              {assetPacksEnabled
                ? "Review community-contributed game-development assets selected by GO."
                : "Community asset-pack submissions are not currently available."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-6 text-muted-foreground">
              Every published pack states its contributor, licence, manifest,
              compatibility, version, and access requirements.
            </p>
            <div className="mb-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" aria-hidden="true" /> Guides
              </span>
              <span className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" aria-hidden="true" /> Books
              </span>
              <span className="flex items-center gap-2">
                <Package className="h-4 w-4" aria-hidden="true" /> Asset packs
              </span>
              <span className="flex items-center gap-2">
                <Workflow className="h-4 w-4" aria-hidden="true" /> Pipelines
              </span>
            </div>
            {assetPacksEnabled ? (
              <Button asChild variant="outline">
                <Link href="/asset-packs">
                  Browse asset packs
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            ) : (
              <Badge variant="secondary">Not currently available</Badge>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border border-primary/30 bg-gradient-to-br from-primary/10 to-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl md:text-3xl">
              <Sparkles className="h-8 w-8 text-primary" aria-hidden="true" />
              Resource access and details
            </CardTitle>
            <CardDescription>
              Check the information attached to each published item before use.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-6 text-muted-foreground">
              Open a resource to review its contents and any available access,
              usage, licence, compatibility, version, and file details. Some
              resources may require a GO account or membership.
            </p>
            <Button asChild>
              <Link href="/membership">
                Review membership
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {otherResources.length > 0 && (
        <section
          className="mt-12 md:mt-16"
          aria-labelledby="earlier-resources-heading"
        >
          <h2
            id="earlier-resources-heading"
            className="mb-6 text-center text-3xl font-semibold md:text-left"
          >
            Other listed resources
          </h2>
          <PackageList packages={otherResources} />
        </section>
      )}

      <LandingTestimonials />
      <FullCTA />
    </main>
  );
}
