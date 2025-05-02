"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import joinusImg from "@/assets/joinus.png"; // Import background
import { DiscordIcon, Users } from "lucide-react"; // Assuming DiscordIcon exists or similar

// If DiscordIcon doesn't exist in lucide-react, you might need a different icon library
// or manually add a high-quality SVG. For now, let's use Users as a placeholder if needed.
// const ActualDiscordIcon = DiscordIcon || Users; // Placeholder logic

export const LandingDiscordJoin = () => {
  return (
    // Added relative positioning and minimum height
    <section className="relative text-white py-16 md:py-24 min-h-[450px] flex items-center justify-center">
      {/* Background Image */}
      <Image
        src={joinusImg}
        alt="Join the Galactic Omnivore community"
        layout="fill"
        objectFit="cover"
        className="z-0"
      />
      {/* Overlay for contrast */}
      <div className="absolute inset-0 bg-primary/80 z-10"></div>

      {/* Content Container */}
      <div className="relative z-20 container mx-auto px-4 text-center">
        {/* Using Lucide Icon instead of Image */}
        {/* <ActualDiscordIcon className="h-16 w-16 mx-auto mb-4 filter brightness-0 invert" />  */}
        {/* Placeholder with Users icon until a proper Discord icon is confirmed/added */}
        <Image
          src="/discord.png"
          alt="Discord Logo"
          width={64}
          height={64}
          className="mx-auto mb-4"
        />

        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Over 280+ Omnivores in our Discord!
        </h2>
        <p className="text-lg text-primary-foreground/90 mb-8 max-w-3xl mx-auto">
          From junior game developers to senior app developers, artists
          switching to digital, and writers crafting game narratives... everyone
          is welcome, regardless of industry or experience level.
        </p>
        <Button
          asChild
          size="lg"
          className="bg-white text-black hover:bg-neutral-200 rounded-sm px-8"
        >
          <Link
            href="https://discord.gg/ZbSShxu6K4"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2" // Added flex for icon alignment
          >
            {/* <ActualDiscordIcon className="h-5 w-5" /> */}
            <Image
              src="/discord-logo.svg"
              alt="Discord Logo"
              width={24}
              height={24}
              className="mx-auto"
            />
            Join Our Discord
          </Link>
        </Button>
      </div>
    </section>
  );
};
