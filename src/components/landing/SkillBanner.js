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
        const popularSkills = [
          ...new Set(
            data.skills
              ?.map((skill) => skill.name)
              .filter(Boolean) ?? []
          ),
        ];
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

  const skillGroup = (duplicate = false) => (
    <div
      className="go-skill-marquee-group"
      aria-hidden={duplicate || undefined}
    >
      {skills.map((skill) => (
        <span
          key={`${duplicate ? "duplicate-" : ""}${skill}`}
          className="shrink-0 rounded-full border border-white/5 bg-neutral-800 px-4 py-1.5 text-sm font-medium text-neutral-300 transition-colors hover:border-primary/35 hover:text-white"
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
      <div className="go-skill-marquee">
        {skillGroup()}
        {skillGroup(true)}
      </div>
    </section>
  );
};
