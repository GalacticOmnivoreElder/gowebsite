"use client";
import React from "react";
import Image from "next/image";

// Placeholder logos - Replace with actual logo paths when available
const partnerLogos = [
  { src: "/logos/logo1.png", alt: "Partner 1" },
  { src: "/logos/logo2.png", alt: "Partner 2" },
  { src: "/logos/logo5.png", alt: "Partner 5" },
  { src: "/logos/logo6.png", alt: "Partner 6" },
  { src: "/logos/logo7.png", alt: "Partner 7" },
  { src: "/logos/logo8.png", alt: "Partner 8" },
  { src: "/logos/logo9.png", alt: "Partner 9" },
];

export const PartnerBanner = () => {
  const logoGroup = (duplicate = false) => (
    <div
      className="go-partner-marquee-group"
      aria-hidden={duplicate || undefined}
    >
      {partnerLogos.map((logo) => (
        <div
          key={`${duplicate ? "duplicate-" : ""}${logo.src}`}
          className="flex h-16 w-32 shrink-0 items-center justify-center opacity-70 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
        >
          <Image
            src={logo.src}
            alt={duplicate ? "" : logo.alt}
            width={128}
            height={64}
            className="h-16 w-32 object-contain"
          />
        </div>
      ))}
    </div>
  );

  return (
    <section
      className="go-partner-banner relative overflow-hidden bg-black py-12"
      aria-label="Galactic Omnivore collaborators"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-black to-transparent sm:w-24" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-black to-transparent sm:w-24" />
      <div className="go-partner-marquee">
        {logoGroup()}
        {logoGroup(true)}
      </div>
    </section>
  );
};
