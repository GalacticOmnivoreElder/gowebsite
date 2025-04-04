"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import PackageCard from "./PackageCard";

export default function Downloads({ userId, unlockedPackages = [] }) {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const response = await fetch("/api/packages");
        const data = await response.json();
        setPackages(data || []);
      } catch (error) {
        console.error("Error fetching packages:", error);
        setPackages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, []);

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-4">Monthly Packages</h2>
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
        <h2 className="text-2xl font-bold mb-4">Monthly Packages</h2>
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">No packages available yet.</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Monthly Packages</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <PackageCard
            key={pkg.id}
            package={pkg}
            isUnlocked={unlockedPackages.includes(pkg.id)}
          />
        ))}
      </div>
    </div>
  );
}
