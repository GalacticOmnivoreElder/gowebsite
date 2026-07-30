import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BookOpen,
  Video,
  Package,
  Workflow,
  Sparkles,
  ArrowRight,
} from "lucide-react"; // Icons

// Imports for fetching and displaying Firebase data
import { adminDb } from "@/lib/firebase-admin";
import FeaturedPackageCardWrapper from "@/components/packages/FeaturedPackageCardWrapper"; // Reverted import path
import PackageList from "@/components/packages/PackageList"; // Reverted import path & name
import { LandingTestimonials } from "@/components/landing/LandingTestimonials";
import { FullCTA } from "@/components/landing/FullCTA";
import { createMetadata } from "@/lib/seo";

// This enables Static Site Generation / Incremental Static Regeneration
export const revalidate = 3600; // Revalidate every hour
export const metadata = createMetadata({
  title: "Game Development Resources",
  description:
    "Review learning material and available member resources from Galactic Omnivore.",
  path: "/resources",
});

// Fetching function (renamed from getPackages)
async function getResources() {
  try {
    const resourcesSnapshot = await adminDb.collection("packages").get();

    if (resourcesSnapshot.empty) {
      console.log("No matching documents in 'packages' collection.");
      return [];
    }

    return resourcesSnapshot.docs
      .filter((doc) => doc.data().status !== "draft")
      .map((doc) => {
      const data = doc.data();
      const assets =
        data.assets?.map((asset) => ({
          title: asset.title,
          description: asset.description,
          type: asset.type,
          image: asset.image,
          downloadUrl: asset.downloadUrl || "#",
        })) || [];

      return {
        id: doc.id,
        // Revert to original field names expected by components
        title: data.title, // Reverted from name
        description: data.description,
        theme: data.theme,
        month: data.month,
        year: data.year,
        coverImage: data.coverImage,
        slug: data.slug,
        assets,
        brandColor: data.brandColor,
        shortDescription: data.shortDescription,
      };
      });
  } catch (error) {
    console.error("Error fetching resources from Firestore:", error);
    return [];
  }
}

// Main Resources Page Component - Now Async Server Component
export default async function ResourcesPage() {
  const packages = await getResources(); // Reverted variable name

  // Sort packages by date to find the latest one
  const sortedPackages = [...packages].sort((a, b) => {
    // Reverted variable name
    // Handle potential undefined month/year
    const monthAIndex = a.month
      ? new Date(Date.parse(a.month + " 1, 2012")).getMonth()
      : -1;
    const monthBIndex = b.month
      ? new Date(Date.parse(b.month + " 1, 2012")).getMonth()
      : -1;
    const yearA = a.year || 0;
    const yearB = b.year || 0;
    const dateA = new Date(yearA, monthAIndex);
    const dateB = new Date(yearB, monthBIndex);

    // Handle invalid dates if necessary
    if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;

    return dateB - dateA; // Sort descending (latest first)
  });

  const latestPackage = sortedPackages[0]; // Reverted variable name
  const pastPackages = sortedPackages.slice(1); // Reverted variable name

  return (
    <div className="container mx-auto px-4 py-12 md:py-16">
      <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center">
        Resources
      </h1>
      <p className="text-xl text-muted-foreground text-center mb-12 md:mb-16 max-w-3xl mx-auto">
        Find material for the task in front of you. Check each item for access,
        usage terms, and file details before you use it.
      </p>

      {/* Featured Latest Package */}
      {latestPackage && (
        <div className="mb-12 md:mb-16">
          <h2 className="text-3xl font-semibold mb-6 text-center md:text-left">
            Latest listed resource
          </h2>
          <FeaturedPackageCardWrapper package={latestPackage} />{" "}
          {/* Reverted prop name */}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-1 gap-12 md:gap-16">
        {/* Section 1: Educational Content / (Placeholder) */}
        <Card className="overflow-hidden bg-card border">
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-primary" />
              Learning material
            </CardTitle>
            <CardDescription>
              Review listed guides, workshops, courses, and practical notes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Choose material that matches your role, current level, and next
              test. The learning page shows what is available now.
            </p>
            <Button asChild variant="outline">
              <Link href="/education">
                Explore learning <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Section 2: License-Free Media Bundle */}
        <Card className="overflow-hidden bg-card border">
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl flex items-center gap-3">
              <Package className="h-8 w-8 text-primary" />
              Planned media library
            </CardTitle>
            <CardDescription>
              This route is not available yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              When the library opens, each item should state its source, usage
              terms, format, and access requirements.
            </p>
            <div className="flex flex-wrap gap-4 mb-6">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Video className="h-4 w-4" /> Videos
              </span>
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <BookOpen className="h-4 w-4" /> Books
              </span>
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="h-4 w-4" /> Asset packs
              </span>
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Workflow className="h-4 w-4" /> Pipelines
              </span>
            </div>
            <Button variant="outline" disabled>
              <Link href="/resources/media">
                Media library unavailable{" "}
                {/* <ArrowRight className="ml-2 h-4 w-4" /> */}
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Section 3: Member resources */}
        <Card className="overflow-hidden bg-gradient-to-r from-primary/10 to-background border border-primary/30">
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-primary" />
              Member resources
            </CardTitle>
            <CardDescription>
              Review the resource access included with current GO membership.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Community membership currently includes periodic asset, music,
              and code resource drops, plus tutorials and learning resources.
            </p>
            <Button asChild>
              <Link href="/membership">
                Review membership <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* --- Fetched Firebase Packages --- */}

      {/* Past Packages List */}
      {pastPackages.length > 0 && (
        <div className="mt-12 md:mt-16">
          <h2 className="text-3xl font-semibold mb-6 text-center md:text-left">
            Earlier listed resources
          </h2>
          <PackageList packages={pastPackages} />{" "}
          {/* Reverted component name & prop name */}
        </div>
      )}
      <LandingTestimonials />
      <FullCTA />
    </div>
  );
}
