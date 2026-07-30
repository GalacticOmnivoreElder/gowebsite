"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const stats = [
  { value: "4", label: "Creator routes" },
  { value: "1", label: "Useful next step" },
  { value: "GO", label: "North Macedonian nonprofit" },
  { value: "GOHQ", label: "Human ground station" },
];

export const StatsPreview = () => {
  return (
    <section className="bg-black text-white py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-center mb-12">
          {stats.map((stat, index) => (
            <div key={index}>
              <div className="text-5xl md:text-6xl lg:text-7xl font-bold text-primary mb-2">
                {stat.value}
              </div>
              <p className="text-lg text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
        <div className="text-center">
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-primary text-primary hover:bg-primary/10 hover:text-primary rounded-sm"
          >
            <Link href="/about">About Galactic Omnivore</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};
