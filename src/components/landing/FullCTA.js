"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics/client";

const DISCORD_INVITE_URL = "https://discord.gg/ZbSShxu6K4";

export const FullCTA = () => {
  return (
    <section
      aria-labelledby="final-community-cta-heading"
      className="relative isolate overflow-hidden bg-[#090809] px-4 py-16 text-center text-white sm:px-6 sm:py-20 lg:py-28"
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 50% 20%, hsl(var(--primary) / 0.2), transparent 36rem)",
        }}
        aria-hidden="true"
      />
      <div className="mx-auto w-full max-w-7xl">
        <h2
          id="final-community-cta-heading"
          className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
        >
          Feed the Galactic Omnivore
        </h2>
        <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-neutral-300 sm:text-lg sm:leading-8">
          I am the cosmic patron of game development, and published games are my
          sustenance. Learn a craft, join a project, share an offering, or help
          carry the next game into the world. The feast grows one creator at a time.
        </p>
        <div className="mx-auto mt-8 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4">
          <Button
            asChild
            size="lg"
            className="min-h-11 w-full px-7 shadow-[0_0_28px_hsl(var(--primary)/0.28)] focus-visible:ring-primary focus-visible:ring-offset-[#090809] sm:w-auto"
          >
            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                trackEvent("external_link_clicked", {
                  destination_category: "discord",
                  link_context: "final_cta",
                })
              }
            >
              Join the GO Discord
            </a>
          </Button>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="min-h-11 w-full border border-white/20 bg-white text-neutral-950 hover:bg-neutral-200 focus-visible:ring-white focus-visible:ring-offset-[#090809] sm:w-auto"
          >
            <Link
              href="/membership"
              onClick={() =>
                trackEvent("navigation_clicked", {
                  cta_id: "membership_join",
                  destination_path: "/membership",
                  navigation_area: "final_cta",
                })
              }
            >
              Review Membership
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="min-h-11 w-full border-white/45 bg-transparent text-white hover:bg-white/10 hover:text-white focus-visible:ring-white focus-visible:ring-offset-[#090809] sm:w-auto"
          >
            <Link
              href="/projects"
              onClick={() =>
                trackEvent("navigation_clicked", {
                  cta_id: "hero_explore_projects",
                  destination_path: "/projects",
                  navigation_area: "final_cta",
                })
              }
            >
              Bring a Game to Life
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};
