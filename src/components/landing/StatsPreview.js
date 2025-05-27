"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const stats = [
  { value: "294+", label: "Members" },
  { value: "20+", label: "Projects" },
  { value: "50+", label: "Games Released" }, // Changed label slightly
  { value: "45+", label: "Events Hosted" }, // Changed label slightly
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
            <Link href="/about">Find Out More</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};
