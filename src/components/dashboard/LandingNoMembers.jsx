"use client";

import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import Image from "next/image";

const LandingNoMembers = () => {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="container min-h-[60vh] py-12 flex flex-col lg:flex-row items-center gap-8">
        <div className="flex-1 space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Review current{" "}
            <span className="text-primary">GO membership</span>
          </h1>

          <ul className="space-y-4">
            {[
              "Apply to open community projects",
              "Periodic asset, music, and code resources",
              "Tutorials and learning resources",
              "Community events and member Discord access",
            ].map((perk, index) => (
              <li key={index} className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="h-4 w-4 text-primary" />
                </div>
                <span className="text-lg">{perk}</span>
              </li>
            ))}
          </ul>

          <Button size="lg" className="text-lg px-8">
            Review membership
          </Button>
        </div>

        <div className="flex-1 relative h-[400px] w-full">
          <Image
            src="/images/hero-game.jpg" // You'll need to add this image
            alt="Galactic Omnivore membership resources"
            fill
            className="object-cover rounded-lg"
            priority
          />
        </div>
      </section>

      {/* Monthly Content Sections */}
      <section className="bg-muted/50">
        <div className="container py-16 space-y-16">
          {/* Game Section */}
          <div className="space-y-8">
            <h2 className="text-3xl font-bold text-center">
              Project access
            </h2>
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div className="relative h-[300px] w-full">
                <Image
                  src="/images/current-game.jpg" // You'll need to add this image
                  alt="A listed community project"
                  fill
                  className="object-cover rounded-lg"
                />
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-semibold">Open project roles</h3>
                <p className="text-muted-foreground">
                  Community members can review approved briefs and apply to
                  suitable open roles.
                </p>
              </div>
            </div>
          </div>

          {/* Music Pack Section */}
          <div className="space-y-8">
            <h2 className="text-3xl font-bold text-center">
              Periodic resources
            </h2>
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div className="relative h-[300px] w-full">
                <Image
                  src="/images/music-pack.jpg" // You'll need to add this image
                  alt="A GO audio resource"
                  fill
                  className="object-cover rounded-lg"
                />
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-semibold">Asset, music, and code files</h3>
                <p className="text-muted-foreground">
                  Review each available item for its format, access, source, and
                  usage terms.
                </p>
              </div>
            </div>
          </div>

          {/* Asset Pack Section */}
          <div className="space-y-8">
            <h2 className="text-3xl font-bold text-center">
              Community access
            </h2>
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div className="relative h-[300px] w-full">
                <Image
                  src="/images/asset-pack.jpg" // You'll need to add this image
                  alt="A GO community resource"
                  fill
                  className="object-cover rounded-lg"
                />
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-semibold">
                  Member Discord access
                </h3>
                <p className="text-muted-foreground">
                  Community membership includes member Discord access and
                  current community events.
                </p>
              </div>
            </div>
          </div>

          {/* Tutorial Section */}
          <div className="space-y-8">
            <h2 className="text-3xl font-bold text-center">
              Learning resources
            </h2>
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div className="relative h-[300px] w-full">
                <Image
                  src="/images/tutorials.jpg" // You'll need to add this image
                  alt="GO learning material"
                  fill
                  className="object-cover rounded-lg"
                />
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-semibold">Tutorials and practical material</h3>
                <p className="text-muted-foreground">
                  Choose material that matches your current role, level, and
                  next useful task.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Previous Months Section */}
      <section className="container py-16">
        <h2 className="text-3xl font-bold text-center mb-12">
          Earlier listed resources
        </h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[
            { month: "April 2025", image: "/images/april-2025.jpg" },
            { month: "March 2025", image: "/images/march-2025.jpg" },
            { month: "February 2025", image: "/images/february-2025.jpg" },
            { month: "January 2025", image: "/images/january-2025.jpg" },
          ].map((item, index) => (
            <div
              key={index}
              className="group cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className="relative h-[200px] w-full mb-3">
                <Image
                  src={item.image} // You'll need to add these images
                  alt={item.month}
                  fill
                  className="object-cover rounded-lg"
                />
              </div>
              <h3 className="text-lg font-semibold text-center">
                {item.month}
              </h3>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default LandingNoMembers;
