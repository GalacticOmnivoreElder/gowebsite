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

// Duplicate for seamless loop
const doubledLogos = [...partnerLogos, ...partnerLogos];

export const PartnerBanner = () => {
  return (
    <section className="bg-black py-12 overflow-hidden whitespace-nowrap relative">
      {/* <h2 className="text-center text-2xl text-muted-foreground font-semibold mb-8">
        Our Collaborators
      </h2> */}
      <div className="animate-marquee-slow inline-block">
        {doubledLogos.map((logo, index) => (
          <div
            key={`logo-${index}`}
            className="inline-flex items-center justify-center mx-8 h-16 w-32 filter grayscale hover:filter-none transition-all duration-300 opacity-70 hover:opacity-100"
          >
            <Image
              src={logo.src}
              alt={logo.alt}
              width={128} // Adjust width as needed
              height={64} // Adjust height as needed
              objectFit="contain"
            />
          </div>
        ))}
      </div>
      {/* CSS for animation - Add this to your globals.css or style tag */}
      <style jsx global>{`
        @keyframes marqueeSlow {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee-slow {
          animation: marqueeSlow 60s linear infinite; /* Slower duration */
          will-change: transform;
        }
        /* Optional: Pause on hover */
        /* .animate-marquee-slow:hover {
          animation-play-state: paused;
        } */
      `}</style>
    </section>
  );
};
