"use client";

import { useEffect, useState } from "react";
import { LANDING_FALLBACK_SKILLS } from "@/constants/skills";

export const SkillBanner = () => {
  const [skills, setSkills] = useState(LANDING_FALLBACK_SKILLS);

  useEffect(() => {
    let active = true;

    const loadPopularSkills = async () => {
      try {
        const response = await fetch("/api/skills?popular=true&limit=14");
        if (!response.ok) return;
        const data = await response.json();
        const popularSkills = data.skills
          ?.map((skill) => skill.name)
          .filter(Boolean);
        if (active && popularSkills?.length) setSkills(popularSkills);
      } catch (error) {
        console.error("Unable to load popular skills:", error);
      }
    };

    loadPopularSkills();
    return () => {
      active = false;
    };
  }, []);

  const skillGroup = (hidden = false) => (
    <div
      className="flex shrink-0 items-center gap-5 px-2 sm:gap-8 sm:px-4"
      aria-hidden={hidden || undefined}
    >
      {skills.map((skill) => (
        <span
          key={`${hidden ? "duplicate-" : ""}${skill}`}
          className="rounded-full border border-white/5 bg-neutral-800 px-4 py-1.5 text-sm font-medium text-neutral-300 transition-colors hover:border-primary/35 hover:text-white"
        >
          {skill}
        </span>
      ))}
    </div>
  );

  return (
    <section
      className="skill-banner relative overflow-hidden border-y border-white/5 bg-neutral-950 py-4"
      aria-label="Most popular community skills"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-neutral-950 to-transparent sm:w-24" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-neutral-950 to-transparent sm:w-24" />
      <div className="go-skill-marquee flex w-max">
        {skillGroup()}
        {skillGroup(true)}
      </div>
      <style jsx global>{`
        .go-skill-marquee {
          animation: go-skill-marquee-scroll 40s linear infinite;
          will-change: transform;
        }

        @keyframes go-skill-marquee-scroll {
          from {
            transform: translate3d(0, 0, 0);
          }
          to {
            transform: translate3d(-50%, 0, 0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .go-skill-marquee {
            animation: none;
            flex-wrap: wrap;
            width: 100%;
            row-gap: 0.75rem;
          }

          .go-skill-marquee > [aria-hidden="true"] {
            display: none;
          }
        }
      `}</style>
    </section>
  );
};
