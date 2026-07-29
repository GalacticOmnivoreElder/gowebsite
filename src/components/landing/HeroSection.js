"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import heroImg from "@/assets/HERO.png";

export const HeroSection = () => {
  return (
    <section className="relative flex items-center justify-center text-center text-white bg-black py-20 md:py-32 lg:py-40 overflow-hidden">
      <Image
        src={heroImg}
        alt=""
        fill
        sizes="100vw"
        priority
        className="z-0 object-cover opacity-30"
      />
      <div className="relative z-10 max-w-4xl mx-auto px-4">
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-4 leading-tight">
          Unite. Create. <span className="text-primary">Evolve.</span>
        </h1>
        <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-8">
          An independent nonprofit game-development association and platform
          helping creators across North Macedonia learn, collaborate, publish
          projects, and build visible experience.
        </p>
        <div className="flex items-center justify-center">
          <Button
            asChild
            size="lg"
            className="w-full rounded-sm bg-primary px-8 hover:bg-primary/90 sm:w-auto"
          >
            <Link href="#routes">Explore your route</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};
