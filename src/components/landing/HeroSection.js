"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import heroImg from "@/assets/HERO.png"; // Assuming you want to use the existing hero image

export const HeroSection = () => {
  return (
    <section className="relative flex items-center justify-center text-center text-white bg-black py-20 md:py-32 lg:py-40 overflow-hidden">
      {/* Optional Background Image/Effect */}
      <Image
        src={heroImg}
        alt="Background"
        layout="fill"
        objectFit="cover"
        className="opacity-30 z-0" // Adjust opacity as needed
      />
      <div className="relative z-10 max-w-4xl mx-auto px-4">
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-4 leading-tight">
          From game creators, for game creators{" "}
          <span className="text-primary">and more</span>
        </h1>
        <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-8">
          The only game development community in Macedonia
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {/* <Button
            asChild
            size="lg"
            className="bg-primary hover:bg-primary/90 rounded-sm w-full sm:w-auto"
          >
            <Link href="/signup">Join Our Platform</Link>
          </Button> */}
          <Button
            asChild
            size="lg"
            className="bg-white text-black hover:bg-neutral-200 rounded-sm px-8 w-full sm:w-auto"
          >
            <Link
              href="https://discord.gg/ZbSShxu6K4"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2" // Added flex for icon alignment
            >
              <Image
                src="/discord-logo.svg"
                alt="Discord Logo"
                width={24}
                height={24}
              />
              Join Our Discord
            </Link>
          </Button>

          <Button
          asChild
          size="lg"
          className="bg-primary hover:bg-primary/90 rounded-sm"
        >
          <Link
            target="_blank"
            href="https://calendar.app.google/Ge6GvfiaaaMhAHHf6"
          >
            Schedule a Call
          </Link>
        </Button>


          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-primary text-primary hover:bg-primary/10 hover:text-primary rounded-sm w-full sm:w-auto"
          >
            {/* Linking to signup for now as requested */}
            <Link href="/about">Learn More</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};
