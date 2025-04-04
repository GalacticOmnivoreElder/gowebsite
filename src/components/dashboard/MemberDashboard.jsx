"use client";

import { observer } from "mobx-react";
import MobxStore from "@/mobx";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CalendarIcon,
  PackageIcon,
  ClockIcon,
  TrophyIcon,
  CreditCardIcon,
  ArrowRight,
} from "lucide-react";
import Image from "next/image";

const MemberDashboard = observer(() => {
  const { user, permissions } = MobxStore;

  // Calculate membership duration in months
  const getMembershipDuration = () => {
    if (!user?.joined) return 0;
    
    // Handle Firebase Timestamp objects
    const joinedDate = user.joined?.toDate ? user.joined.toDate() : new Date(user.joined);
    
    // Check if the date is valid
    if (isNaN(joinedDate.getTime())) return 0;
    
    const now = new Date();
    return Math.floor((now - joinedDate) / (1000 * 60 * 60 * 24 * 30));
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    
    // Handle Firebase Timestamp objects with _seconds and _nanoseconds
    if (date._seconds) {
      return new Date(date._seconds * 1000).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    
    // Handle Firebase Timestamp objects with toDate method
    const dateObj = date?.toDate ? date.toDate() : new Date(date);
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) return "N/A";
    
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">
        Welcome back, {user?.username || "Member"}!
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Subscription Card */}
        <Link href="/profile">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Subscription
              </CardTitle>
              <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-2xl font-bold">
                  {permissions?.subscription?.active ? "Active" : "Inactive"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Started: {formatDate(permissions?.subscription?.startDate)}
                </p>
                {permissions?.subscription?.endDate && (
                  <p className="text-xs text-muted-foreground">
                    Renews: {formatDate(permissions?.subscription?.endDate)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Auto-renew:{" "}
                  {permissions?.subscription?.autoRenew ? "Yes" : "No"}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Membership Stats */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Member Since</CardTitle>
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">
                {getMembershipDuration()} months
              </p>
              <p className="text-xs text-muted-foreground">
                Joined: {formatDate(user?.joined)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Unlocked Packages Preview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Unlocked Packages
            </CardTitle>
            <PackageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">
                {user?.unlockedPackages?.length || 0}
              </p>
              <div className="flex flex-wrap gap-1">
                {user?.unlockedPackages?.slice(0, 3).map((pkg) => (
                  <span
                    key={pkg}
                    className="text-xs bg-muted px-2 py-1 rounded-full"
                  >
                    {pkg}
                  </span>
                ))}
                {(user?.unlockedPackages?.length || 0) > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{user.unlockedPackages.length - 3} more
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Placeholder Stats - Can be implemented later */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Events Attended
            </CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Coming soon</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Approved Submissions
            </CardTitle>
            <TrophyIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Coming soon</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Packages Section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Recent Packages</h2>
          <Button variant="outline" size="sm" asChild>
            <Link href="/packages">View All Packages</Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {user?.unlockedPackages?.slice(0, 3).map((packageId) => (
            <Card key={packageId} className="overflow-hidden">
              <div className="relative h-40 w-full">
                <Image
                  src="/g1/g1-mvp.png"
                  alt="Top Rat Game"
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  priority
                  className="object-cover transition-transform duration-300 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-white text-xs font-medium">Top Rat</p>
                </div>
              </div>
              <CardContent className="pt-4">
                <h3 className="font-medium">Top Rat</h3>
                <p className="text-sm text-muted-foreground mb-2">May 2024</p>
                <p className="text-sm mb-3 line-clamp-2">
                  Dive into the toxic sewers with Mrale, a courageous rat on an endless platforming adventure.
                </p>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href={`/packages/${packageId}`}>
                    View Details
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
});

export default MemberDashboard;
