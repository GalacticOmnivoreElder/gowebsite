"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const FullCTA = () => {
  return (
    <section className="bg-[#CA2380] text-white text-center py-16 md:py-24">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
          Level up your game development journey!

        </h2>
        <p className="text-lg text-neutral-200 mb-8 max-w-2xl mx-auto">
          Join a vibrant community of creators, access exclusive resources, and collaborate on exciting projects.
        </p>
        <Button
          asChild
          size="lg"
          className="bg-white text-black hover:bg-neutral-200 rounded-sm px-10 py-3 text-lg"
        >
          <Link href="/membership">ENGAGE 🖖</Link>
        </Button>
      </div>
    </section>
  );
};
