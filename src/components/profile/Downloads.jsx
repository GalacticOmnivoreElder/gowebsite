"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import PackageCard from "./PackageCard";
import { auth } from "@/firebase";

export default function Downloads() {
  const [packages, setPackages] = useState([]);
  const [unlockedPackageIds, setUnlockedPackageIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        setError("");
        const currentUser = auth.currentUser;
        const token = currentUser ? await currentUser.getIdToken() : null;
        const [publicResponse, entitlementResponse] = await Promise.all([
          fetch("/api/packages"),
          token
            ? fetch("/api/user/packages", {
                headers: { Authorization: `Bearer ${token}` },
              })
            : Promise.resolve(null),
        ]);
        const publicPackages = await publicResponse.json().catch(() => []);
        if (!publicResponse.ok) {
          throw new Error(
            publicPackages.error || "Resource releases could not be loaded."
          );
        }

        let entitledPackages = [];
        if (entitlementResponse) {
          entitledPackages = await entitlementResponse.json().catch(() => []);
          if (!entitlementResponse.ok) {
            throw new Error(
              entitledPackages.error ||
                "Your resource access could not be verified."
            );
          }
        }

        setPackages(Array.isArray(publicPackages) ? publicPackages : []);
        setUnlockedPackageIds(
          new Set(
            (Array.isArray(entitledPackages) ? entitledPackages : []).map(
              (pkg) => pkg.id
            )
          )
        );
      } catch (error) {
        console.error("Error fetching packages:", error);
        setPackages([]);
        setError(error.message || "Resource releases could not be loaded.");
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, []);

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-4">Community Resource Drops</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <CardContent className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!packages || packages.length === 0) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-4">Community Resource Drops</h2>
        <Card className="p-6 text-center">
          <p className={error ? "text-destructive" : "text-muted-foreground"}>
            {error || "No resource drops are available yet."}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Community Resource Drops</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <PackageCard
            key={pkg.id}
            package={pkg}
            isUnlocked={unlockedPackageIds.has(pkg.id)}
          />
        ))}
      </div>
    </div>
  );
}
