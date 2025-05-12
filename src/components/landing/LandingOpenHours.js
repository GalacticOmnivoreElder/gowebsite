"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Clock } from "lucide-react";
import Image from "next/image";
import hqImg from "@/assets/openhours.png";

export const LandingOpenHours = () => {
  return (
    <section className="relative text-white py-16 md:py-24 min-h-[450px] flex items-center justify-center">
      <Image
        src={hqImg}
        alt="Galactic Omnivore HQ"
        layout="fill"
        objectFit="cover"
        className="z-0"
      />
      <div className="absolute inset-0 bg-black/60 z-10"></div>

      <div className="relative z-20 container mx-auto px-4 text-center">
        <Clock className="h-12 w-12 mx-auto mb-4 text-primary" />
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Want to Visit Us?
        </h2>
        <p className="text-xl font-semibold mb-4">HQ Open Hours</p>
        <p className="text-neutral-200 mb-6 max-w-2xl mx-auto">
          Located on the eleventh floor next to the Macedonian Archbishop
          Cathedral, our 60 sqm community space offers a cool view to inspire
          your best game ideas.
        </p>

        <div className="text-2xl md:text-3xl font-bold mb-8 bg-black/50 p-6 rounded-lg max-w-md mx-auto border-2 border-primary">
          <p className="text-white">Monday - Friday</p>
          <p className="text-primary text-3xl md:text-4xl">12:00 - 20:00</p>
        </div>

        <Button
          asChild
          size="lg"
          className="bg-primary hover:bg-primary/90 rounded-sm"
        >
          <Link
            target="_blank"
            href="https://calendar.app.google/Ge6GvfiaaaMhAHHf6"
          >
            Schedule a Visit
          </Link>
        </Button>
      </div>
    </section>
  );
};
