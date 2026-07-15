import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const Badge = ({ children, className }) => (
  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
    {children}
  </span>
);

export const GameOfTheMonth = ({ fromLanding }) => (
  <div className="border-b py-4">
    <div className="flex flex-col items-center gap-8 md:flex-row">
      <div className="order-1 w-full md:order-2 md:w-1/2">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
          <Link href="/membership">
            <Image
              src="/g1/g1-mvp.gif"
              alt="Top Rat Game"
              fill
              className="cursor-pointer object-cover transition-transform duration-500 hover:scale-105"
              priority
            />
          </Link>
          <div className="absolute bottom-4 left-4 right-4">
            <Badge className="mb-2 bg-primary/90 text-white">
              Game of the Month
            </Badge>
            <p className="text-sm text-white">
              Available exclusively to this month&rsquo;s community members!
            </p>
          </div>
        </div>
      </div>

      <div className="order-2 w-full space-y-6 md:order-1 md:w-1/2">
        <div>
          <h2 className="mb-2 text-lg font-medium text-primary">
            FEATURED THIS MONTH
          </h2>
          <h3 className="mb-4 text-3xl font-bold">
            G.O. Platformer Asset Pack - April 2025
          </h3>
          <p className="mb-6 text-lg text-muted-foreground">
            Dive into the toxic sewers with Mrale, a courageous rat on an
            endless platforming adventure. Jump, dash, wall slide, and survive
            in this challenging game where a single misstep can take you for a
            swim with the radioactive fishes.
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold">Includes:</h4>
          <ul className="space-y-2">
            {[
              "Playable prototype with endless platforming",
              "Tons of hand-drawn sprite frames",
              "Original atmospheric soundtrack",
              "Secret Game Design scroll",
              "Unity Source code file",
            ].map((item) => (
              <li key={item} className="flex items-start">
                <Check className="mr-2 mt-0.5 h-5 w-5 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <Button size="lg" asChild className="mt-4">
          <Link href={fromLanding ? "/resources" : "/membership"}>
            {fromLanding ? "Learn More" : "Become a Member"}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      </div>
    </div>
  </div>
);
