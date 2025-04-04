"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  Music,
  Image as ImageIcon,
  Code,
  Video,
  ArrowLeft,
  Lock,
  ShoppingCart,
  Loader2,
  Palette,
  Gamepad2,
} from "lucide-react";
import Link from "next/link";
import { auth } from "@/firebase";

export default function PackageDetailPage({ params }) {
  const [packageData, setPackageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCurrentMonth, setIsCurrentMonth] = useState(false);
  const router = useRouter();
  const { slug } = params;
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Listen to auth state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authChecked) return;

    const fetchPackageData = async () => {
      setPermissionsLoading(true);
      try {
        let headers = {};

        // Add auth token if user is logged in
        if (user) {
          const idToken = await user.getIdToken();
          headers.Authorization = `Bearer ${idToken}`;
        }

        const response = await fetch(`/api/packages/${slug}`, { headers });

        if (!response.ok) {
          if (response.status === 404) {
            setError("Package not found");
          } else {
            setError("Failed to load package data. Please try again later.");
          }
          setLoading(false);
          setPermissionsLoading(false);
          return;
        }

        const data = await response.json();
        setPackageData(data);

        const currentDate = new Date();
        const currentMonth = currentDate.toLocaleString("en-US", {
          month: "long",
        });
        const currentYear = currentDate.getFullYear().toString();

        setIsCurrentMonth(
          data.month === currentMonth && data.year === currentYear
        );

        setLoading(false);
        setPermissionsLoading(false);
      } catch (err) {
        console.error("Error fetching package:", err);
        setError(
          "An error occurred while loading the package. Please try again."
        );
        setLoading(false);
        setPermissionsLoading(false);
      }
    };

    fetchPackageData();
  }, [slug, user, authChecked]);

  if (loading) {
    return <PackageDetailSkeleton />;
  }

  if (error) {
    return (
      <div className="container py-10">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/packages">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Packages
          </Link>
        </Button>

        <Card className="p-6 text-center">
          <div className="text-destructive mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto mb-2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <h2 className="text-xl font-bold">{error}</h2>
          </div>
          <Button asChild>
            <Link href="/packages">View All Packages</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (!packageData) {
    return null;
  }

  const getAssetIcon = (type) => {
    switch (type.toLowerCase()) {
      case "music":
        return <Music className="h-5 w-5" />;
      case "art":
        return <ImageIcon className="h-5 w-5" />;
      case "code":
        return <Code className="h-5 w-5" />;
      case "video":
        return <Video className="h-5 w-5" />;
      case "design":
        return <Palette className="h-5 w-5" />;
      case "game":
        return <Gamepad2 className="h-5 w-5" />;
      default:
        return <Download className="h-5 w-5" />;
    }
  };

  const renderAssetButton = (asset) => {
    if (permissionsLoading) {
      return (
        <Button disabled className="w-full">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Loading...
        </Button>
      );
    }

    if (packageData.hasAccess) {
      return (
        <Button asChild className="w-full">
          <a href={asset.downloadUrl} target="_blank" rel="noopener noreferrer">
            <Download className="h-4 w-4 mr-2" />
            Download
          </a>
        </Button>
      );
    } else if (isCurrentMonth) {
      return (
        <Button asChild variant="secondary" className="w-full">
          <Link href="/membership">
            <Lock className="h-4 w-4 mr-2" />
            Subscribe to Unlock
          </Link>
        </Button>
      );
    } else {
      return (
        <Button asChild variant="secondary" className="w-full">
          <Link href="/shop">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Buy in Shop
          </Link>
        </Button>
      );
    }
  };

  const renderSidebarContent = () => {
    if (permissionsLoading) {
      return (
        <div className="pt-2">
          <p className="text-sm text-muted-foreground mb-2">
            Checking access status...
          </p>
          <Button disabled className="w-full">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Loading...
          </Button>
        </div>
      );
    }

    if (packageData.hasAccess) {
      return (
        <>
          <p className="text-sm text-muted-foreground mb-2">
            This package is part of your collection.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/profile?tab=downloads">View All Packages</Link>
          </Button>
        </>
      );
    } else if (isCurrentMonth) {
      return packageData.isAuthenticated ? (
        <>
          <p className="text-sm text-muted-foreground mb-2">
            Subscribe to get this month&apos;s package and future releases.
          </p>
          <Button asChild className="w-full">
            <Link href="/membership">Subscribe Now</Link>
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-2">
            Sign up and subscribe to access this month&apos;s package.
          </p>
          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link href="/membership">View Membership Options</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </>
      );
    } else {
      return packageData.isAuthenticated ? (
        <>
          <p className="text-sm text-muted-foreground mb-2">
            This is a past package available for individual purchase.
          </p>
          <Button asChild className="w-full">
            <Link href="/shop">Buy in Shop</Link>
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-2">
            This is a past package available for individual purchase.
          </p>
          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link href="/shop">Buy in Shop</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </>
      );
    }
  };

  return (
    <div className="container py-10">
      <Button variant="ghost" asChild className="mb-6">
        <Link href="/packages">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Packages
        </Link>
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="relative w-full aspect-square max-w-[500px] mx-auto rounded-lg overflow-hidden mb-6">
            <Image
              // src={`/g1/${packageData.coverImage}.png`}
              src={`/g1/g1-mvp.png`}
              alt={packageData.title}
              fill
              className="object-cover"
              priority
            />
          </div>

          <h1 className="text-3xl font-bold mb-2">{packageData.title}</h1>

          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="outline">
              {packageData.month} {packageData.year}
            </Badge>
            <Badge variant="secondary">{packageData.theme}</Badge>
            {isCurrentMonth && (
              <Badge variant="default" className="bg-green-600">
                Current Month
              </Badge>
            )}
          </div>

          <p className="text-muted-foreground mb-6">
            {packageData.description}
          </p>

          <Separator className="my-6" />

          <h2 className="text-2xl font-bold mb-4">Package Contents</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {packageData.assets.map((asset, index) => (
              <Card key={index} className="overflow-hidden">
                <div className="relative w-full aspect-square">
                  <Image
                    src={`/g1/${asset.image}.png`}
                    alt={asset.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {getAssetIcon(asset.type)}
                    <Badge variant="outline" className="capitalize">
                      {asset.type}
                    </Badge>
                  </div>

                  <h3 className="font-bold mb-1">{asset.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {asset.description}
                  </p>

                  {renderAssetButton(asset)}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <Card className="sticky top-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold mb-4">About This Package</h3>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Theme
                  </p>
                  <p>{packageData.theme}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Release Date
                  </p>
                  <p>
                    {packageData.month} {packageData.year}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Contents
                  </p>
                  <ul className="space-y-1 mt-1">
                    {packageData.assets.map((asset, index) => (
                      <li
                        key={index}
                        className="flex items-center gap-2 text-sm"
                      >
                        {getAssetIcon(asset.type)}
                        <span>{asset.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Separator />

                <div className="pt-2">{renderSidebarContent()}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PackageDetailSkeleton() {
  return (
    <div className="container py-10">
      <div className="h-10 w-32 mb-6">
        <Skeleton className="h-full w-full" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Skeleton className="h-[300px] w-full mb-6" />

          <Skeleton className="h-10 w-3/4 mb-2" />

          <div className="flex gap-2 mb-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-24" />
          </div>

          <Skeleton className="h-20 w-full mb-6" />

          <Skeleton className="h-1 w-full my-6" />

          <Skeleton className="h-8 w-48 mb-4" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="border rounded-lg overflow-hidden">
                <Skeleton className="h-40 w-full" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="border rounded-lg">
            <div className="p-6 space-y-4">
              <Skeleton className="h-6 w-48 mb-4" />

              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ))}

              <Skeleton className="h-1 w-full" />

              <div className="pt-2 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
