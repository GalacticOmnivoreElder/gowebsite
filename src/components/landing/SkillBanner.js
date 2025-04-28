"use client";
import React from "react";

const skills = [
  "2D Art",
  "3D Modeling",
  "Programming",
  "Game Design",
  "Audio Design",
  "Scripting",
  "Level Design",
  "UI/UX",
  "Project Management",
  "Marketing",
  "Animation",
  "Visual Effects",
  "Narrative Design",
  "QA Testing",
];

// Duplicate the skills array to create a seamless loop
const doubledSkills = [...skills, ...skills];

export const SkillBanner = () => {
  return (
    <section className="bg-neutral-900 py-4 overflow-hidden whitespace-nowrap relative">
      <div className="animate-marquee inline-block">
        {doubledSkills.map((skill, index) => (
          <span
            key={`skill-${index}`}
            className="inline-block mx-4 px-4 py-1 bg-neutral-800 text-muted-foreground rounded-full text-sm font-medium"
          >
            {skill}
          </span>
        ))}
      </div>
      {/* CSS for animation - Add this to your globals.css or style tag */}
      <style jsx global>{`
        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          } /* Move by half the total width */
        }
        .animate-marquee {
          animation: marquee 40s linear infinite; /* Adjust duration as needed */
          will-change: transform;
        }
        /* Optional: Pause on hover */
        /* .animate-marquee:hover {
          animation-play-state: paused;
        } */
      `}</style>
    </section>
  );
};
