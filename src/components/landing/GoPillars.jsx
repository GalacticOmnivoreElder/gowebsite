"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  FileText,
  FolderKanban,
} from "lucide-react";

const pillars = [
  {
    title: "Learn",
    slug: "learn",
    icon: BookOpen,
    description:
      "Build practical game-development skills through courses, workshops, video bundles, shared resources, and community knowledge.",
    paths: [
      {
        title: "Ask for mentorship",
        description: "Get matched with guidance for your next practical milestone.",
        href: "/learn",
      },
      {
        title: "Become a mentor",
        description: "Share your experience and help another creator progress.",
        href: "/membership",
      },
    ],
  },
  {
    title: "Portfolio",
    slug: "portfolio",
    icon: FileText,
    description:
      "Turn real contributions, completed work, and project experience into credited evidence through your profile and GameDev Passport.",
    paths: [
      {
        title: "Publish solo",
        description: "Create and publish your game as a GO Community member.",
        href: "/membership",
      },
      {
        title: "Find a team",
        description: "Meet collaborators and build a portfolio together.",
        href: "/membership",
      },
    ],
  },
  {
    // Legacy analytics label: title: "Business". The public pillar is now OUTSOURCE.
    title: "Outsource",
    slug: "outsource",
    icon: FolderKanban,
    description:
      "Create clear project briefs, find the right collaborators, manage production, and move promising work toward sustainable opportunities.",
    paths: [
      {
        title: "Create and earn",
        description: "Browse projects and find paid opportunities.",
        href: "/projects",
      },
      {
        title: "Pay 2 win",
        description: "Create a project brief and hire approved GO talent.",
        href: "/project/create",
      },
    ],
  },
];

export function GoPillars() {
  const [activePillar, setActivePillar] = useState(null);

  return (
    <section
      id="pillars"
      aria-labelledby="go-pillars-heading"
      className="relative isolate overflow-hidden border-y border-primary/25 bg-[#090709] px-4 py-16 sm:px-6 sm:py-20 lg:py-24"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_16%_0%,rgba(202,34,128,0.22),transparent_34rem),radial-gradient(circle_at_88%_90%,rgba(109,40,217,0.13),transparent_30rem)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:52px_52px] [mask-image:linear-gradient(to_bottom,black,transparent_92%)]"
      />

      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-primary">
            The GO path
          </p>
          <h2
            id="go-pillars-heading"
            className="mt-3 text-3xl font-bold text-white sm:text-4xl lg:text-5xl"
          >
            {/* Legacy heading copy: Learn. Build your portfolio. Move toward business. */}
            Learn. Build your portfolio. Find work or hire.
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-white/70 sm:text-lg">
            Galactic Omnivore helps game creators develop practical skills,
            turn real work into visible experience, and build the foundations
            needed to launch and sustain projects.
          </p>
        </div>

        <ol className="mt-12 grid gap-4 lg:mt-16 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-stretch lg:gap-5">
          {pillars.map((pillar, index) => {
            const PillarIcon = pillar.icon;
            const isActive = activePillar === pillar.slug;
            const pathsId = `go-paths-${pillar.slug}`;

            return (
              <li key={pillar.title} className="contents">
                <article
                  className={`relative flex min-w-0 flex-col overflow-hidden rounded-lg border bg-card/75 shadow-[0_20px_60px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors duration-300 ${
                    isActive
                      ? "border-primary/70 shadow-[0_20px_60px_rgba(202,34,128,0.18),inset_0_1px_0_rgba(255,255,255,0.1)]"
                      : "border-white/15"
                  }`}
                >
                  <button
                    type="button"
                    aria-expanded={isActive}
                    aria-controls={pathsId}
                    onClick={() =>
                      setActivePillar(isActive ? null : pillar.slug)
                    }
                    className="group flex min-h-full w-full flex-col p-6 text-left outline-none transition-colors hover:bg-white/[0.03] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:p-7"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/45">
                        Pillar 0{index + 1}
                      </span>
                      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/45 bg-primary/10 text-primary">
                        <PillarIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    </div>
                    <h3 className="mt-7 text-2xl font-bold uppercase tracking-tight text-white sm:text-3xl">
                      {pillar.title}
                    </h3>
                    <p className="mt-4 text-sm leading-7 text-white/68 sm:text-base">
                      {pillar.description}
                    </p>
                    <div className="mt-8 flex items-center justify-between gap-4">
                      <span
                        aria-hidden="true"
                        className="h-1 w-12 bg-primary shadow-[0_0_18px_hsl(var(--primary)/0.55)]"
                      />
                      <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
                        {isActive ? "Choose a route" : "Explore paths"}
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-300 ${
                            isActive ? "rotate-180" : ""
                          }`}
                          aria-hidden="true"
                        />
                      </span>
                    </div>
                  </button>

                  {isActive && (
                    <div
                      id={pathsId}
                      role="group"
                      aria-label={`${pillar.title} paths`}
                      className="grid gap-3 border-t border-primary/25 bg-black/25 p-4 sm:grid-cols-2 sm:p-5"
                    >
                      {pillar.paths.map((path) => (
                        <Link
                          key={path.title}
                          href={path.href}
                          className="group/path rounded-md border border-white/10 bg-white/[0.035] p-4 outline-none transition-colors hover:border-primary/60 hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <span className="flex items-start justify-between gap-3 text-base font-semibold text-white">
                            {path.title}
                            <ArrowUpRight
                              className="mt-0.5 h-4 w-4 shrink-0 text-primary transition-transform group-hover/path:-translate-y-0.5 group-hover/path:translate-x-0.5"
                              aria-hidden="true"
                            />
                          </span>
                          <span className="mt-2 block text-sm leading-6 text-white/65">
                            {path.description}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </article>

                {index < pillars.length - 1 && (
                  <div
                    aria-hidden="true"
                    className="flex items-center justify-center py-1 text-primary lg:py-0"
                  >
                    <ArrowRight className="h-6 w-6 rotate-90 lg:rotate-0" />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
