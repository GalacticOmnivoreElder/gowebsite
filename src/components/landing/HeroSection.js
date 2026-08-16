"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import heroImg from "@/assets/HERO.png";
import { trackEvent } from "@/lib/analytics/client";

const discordInviteUrl = "https://discord.gg/ZbSShxu6K4";
const bookingUrl = "https://calendar.app.google/Ge6GvfiaaaMhAHHf6";

export const HeroSection = () => (
  <section
    aria-labelledby="landing-hero-heading"
    className="relative isolate flex min-h-[580px] items-center justify-center overflow-hidden bg-black py-20 text-center text-white sm:min-h-[620px] md:py-28 lg:min-h-[680px] lg:py-32"
  >
    <Image
      src={heroImg}
      alt=""
      fill
      sizes="100vw"
      priority
      className="-z-20 object-cover"
    />
    <div
      aria-hidden="true"
      className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(8,2,6,0.76),rgba(24,3,16,0.84)),radial-gradient(circle_at_50%_42%,rgba(202,34,128,0.18),transparent_52%)]"
    />

    <div className="mx-auto w-full max-w-5xl px-5 sm:px-8">
      <p className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-white/80 sm:text-sm sm:tracking-[0.3em]">
        From game creators, for game creators-and more.
      </p>

      <h1
        id="landing-hero-heading"
        className="text-balance text-4xl font-extrabold leading-[1.05] sm:text-5xl md:text-6xl lg:text-7xl"
      >
        Unite. Create. <span className="text-primary">Evolve.</span>
      </h1>

      <p className="mx-auto mt-6 max-w-3xl text-pretty text-base leading-7 text-white/80 sm:text-lg sm:leading-8 md:text-xl">
        Galactic Omnivore is a nonprofit game-development community and
        platform from North Macedonia. Learn practical skills, find
        collaborators and projects, share your work, and move toward your next
        playable milestone.
      </p>

      <div className="mx-auto mt-9 flex w-full max-w-sm flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:items-center">
        <Button
          asChild
          size="lg"
          className="min-h-12 w-full rounded-sm bg-primary px-7 text-white shadow-[0_0_30px_rgba(202,34,128,0.22)] hover:bg-primary/90 focus-visible:ring-white focus-visible:ring-offset-black sm:w-auto"
        >
          <a
            href={discordInviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              trackEvent("external_link_clicked", {
                destination_category: "discord",
                link_context: "hero_join",
              })
            }
          >
            <Image
              src="/discord-logo.svg"
              alt=""
              width={22}
              height={22}
              className="mr-2"
            />
            Join Our Discord
          </a>
        </Button>

        <Button
          asChild
          size="lg"
          className="min-h-12 w-full rounded-sm bg-white px-7 text-black hover:bg-neutral-200 focus-visible:ring-primary focus-visible:ring-offset-black sm:w-auto"
        >
          <a href={bookingUrl} target="_blank" rel="noopener noreferrer"
            onClick={() =>
              trackEvent("external_link_clicked", {
                destination_category: "booking",
                link_context: "hero_schedule",
              })
            }
          >
            Schedule a Call
          </a>
        </Button>

        <Button
          asChild
          variant="outline"
          size="lg"
          onClick={() =>
            trackEvent("navigation_clicked", {
              cta_id: "hero_explore",
              destination_path: "/about",
              navigation_area: "hero",
            })
          }
          className="min-h-12 w-full rounded-sm border-primary bg-black/20 px-7 text-primary hover:bg-primary/10 hover:text-primary focus-visible:ring-primary focus-visible:ring-offset-black sm:w-auto"
        >
          <Link href="/about">Learn More</Link>
        </Button>
      </div>
    </div>
  </section>
);
