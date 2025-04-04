import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function PackageCard({ package: pkg }) {
  return (
    <Link href={`/packages/${pkg.slug}`} className="block h-full">
      <Card className="overflow-hidden h-full transition-all duration-200 hover:shadow-md flex flex-col">
        <div className="relative h-[200px]">
          <Image
            src={pkg.coverImage}
            alt={pkg.title}
            fill
            className="object-cover"
          />
        </div>
        <CardHeader>
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold">{pkg.title}</h3>
            <span className="text-muted-foreground">
              {pkg.month} {pkg.year}
            </span>
          </div>
          <p className="text-muted-foreground">{pkg.theme}</p>
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="mb-4 line-clamp-3">{pkg.description}</p>

          <h4 className="font-semibold text-sm mb-2">Package Includes:</h4>
          <ul className="space-y-1">
            {pkg.assets.slice(0, 2).map((asset, index) => (
              <li key={index} className="flex items-start gap-1 text-sm">
                <span className="text-primary">•</span>
                <p className="line-clamp-1">{asset.title}</p>
              </li>
            ))}
            {pkg.assets.length > 2 && (
              <li className="text-sm text-muted-foreground">
                +{pkg.assets.length - 2} more assets
              </li>
            )}
          </ul>
        </CardContent>
        <CardFooter>
          <Button className="w-full">
            View Package <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}
