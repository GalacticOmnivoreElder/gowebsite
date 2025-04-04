import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UnlockIcon, LockIcon, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function FeaturedPackageCard({
  package: pkg,
  isUnlocked = false,
}) {
  return (
    <Link href={`/packages/${pkg.slug}`} className="block">
      <div className="rounded-lg overflow-hidden border bg-card text-card-foreground shadow transition-all duration-200 hover:shadow-md">
        {/* Desktop layout: image left, content right */}
        <div className="hidden md:grid md:grid-cols-2">
          <div className="relative h-80">
            <Image
              src={`/g1/${pkg.coverImage}-h.png`}
              alt={pkg.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 50vw"
              srcSet={`/g1/${pkg.coverImage}.png 640w, /g1/${pkg.coverImage}-h.png 1280w`}
            />
          </div>

          <div className="p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-2xl font-bold">{pkg.title}</h3>
                <Badge variant={isUnlocked ? "success" : "secondary"}>
                  {isUnlocked ? "Owned" : "Locked"}
                </Badge>
              </div>
              <p className="text-lg text-muted-foreground mb-4">
                {pkg.month} {pkg.year}
              </p>
              <p className="mb-6">{pkg.description}</p>

              {pkg.assets && pkg.assets.length > 0 && (
                <div className="mb-6">
                  <p className="font-medium mb-2">Includes:</p>
                  <ul className="list-disc pl-5">
                    {pkg.assets.slice(0, 3).map((asset, index) => (
                      <li key={index} className="text-sm">
                        {asset.title}
                      </li>
                    ))}
                    {pkg.assets.length > 3 && (
                      <li className="text-sm text-muted-foreground">
                        +{pkg.assets.length - 3} more assets
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            <Button className="w-full md:w-auto">
              View Package <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Mobile layout: vertical card */}
        <div className="md:hidden">
          <div className="relative h-64 w-full">
            <Image
              src={`/g1/${pkg.coverImage}.png`}
              alt={pkg.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 50vw"
              srcSet={`/g1/${pkg.coverImage}.png 640w, /g1/${pkg.coverImage}-h.png 1280w`}
            />
            <div className="absolute top-2 right-2">
              <Badge variant={isUnlocked ? "success" : "secondary"}>
                {isUnlocked ? "Owned" : "Locked"}
              </Badge>
            </div>
          </div>

          <div className="p-4">
            <h3 className="text-xl font-bold mb-1">{pkg.title}</h3>
            <p className="text-muted-foreground mb-3">
              {pkg.month} {pkg.year}
            </p>
            <p className="mb-4">{pkg.description}</p>

            {isUnlocked ? (
              <Button className="w-full">
                View Package <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button variant="default" className="w-full">
                <LockIcon className="h-4 w-4 mr-2" />
                Subscribe to Unlock
              </Button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
