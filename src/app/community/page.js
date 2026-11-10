import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Briefcase,
  CalendarDays,
  Clapperboard,
  FolderKanban,
  Gamepad2,
  HeartHandshake,
  MessageCircle,
  Newspaper,
  PackageOpen,
  ShoppingBag,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Game Development Community",
  description:
    "Explore everything Galactic Omnivore provides for game creators: projects, learning, mentorship, events, resources, games, membership, and community connection.",
  path: "/community",
});

const routes = [
  { title: "Monday Builds", eyebrow: "Shape GO together", description: "Use your weekly contributor vote to help choose our Monday morning platform improvement.", href: "/community-builds", icon: Gamepad2 },
  {
    title: "GO Merch",
    eyebrow: "Shape the collection",
    description: "Reserve the first GO T-shirt collection or suggest future GO merchandise.",
    href: "/merch",
    icon: ShoppingBag,
  },
  {
    title: "Projects",
    eyebrow: "Collaborate",
    description: "Find a team, follow current work, or contribute to a suitable game-development brief.",
    href: "/projects",
    icon: FolderKanban,
  },
  {
    title: "Learn",
    eyebrow: "Develop",
    description: "Build practical skills through courses, workshops, and community knowledge.",
    href: "/education",
    icon: BookOpen,
  },
  {
    title: "Video Bundles",
    eyebrow: "Watch",
    description: "Follow focused video collections and supporting material when they are available.",
    href: "/video-bundles",
    icon: Clapperboard,
  },
  {
    title: "GO Mentorship",
    eyebrow: "Guidance",
    description: "Find focused support, review mentor routes, and connect your current challenge to a next step.",
    href: "/mentorship",
    icon: HeartHandshake,
  },
  {
    title: "GO Signal",
    eyebrow: "Learn from the journey",
    description: "Read creator stories, project updates, practical notes, and lessons from the community.",
    href: "/blog",
    icon: Newspaper,
  },
  {
    title: "Games",
    eyebrow: "See what is being made",
    description: "Discover digital and tabletop games connected to GO and review their creator context.",
    href: "/games",
    icon: Gamepad2,
  },
  {
    title: "Resources",
    eyebrow: "Use what helps",
    description: "Review public and member resources, practical files, and community asset packs.",
    href: "/resources",
    icon: PackageOpen,
  },
  {
    title: "Events",
    eyebrow: "Live transmissions",
    description: "Join workshops, meetups, mentorship sessions, project conversations, and GOHQ visits.",
    href: "/events",
    icon: CalendarDays,
    id: "events",
  },
  {
    title: "Membership",
    eyebrow: "Choose your access",
    description: "Review the current Community and Business routes, benefits, requirements, and next steps.",
    href: "/membership",
    icon: BadgeCheck,
  },
  {
    title: "Business & Collaboration",
    eyebrow: "Move toward opportunity",
    description: "Talk with GO about project support, collaboration, production needs, or a partnership idea.",
    href: "/contact",
    icon: Briefcase,
  },
  {
    title: "GO Community",
    eyebrow: "Stay connected",
    description: "Join the Discord conversation, introduce your current craft, and find the next useful signal.",
    href: "https://discord.gg/ZbSShxu6K4",
    icon: MessageCircle,
    external: true,
  },
  {
    title: "Creator Profile & Passport",
    eyebrow: "Show your progress",
    description: "Build a visible record of skills, work, credits, learning, and project experience.",
    href: "/cv",
    icon: Users,
  },
];

export default function CommunityPage() {
  return (
    <main className="relative isolate overflow-hidden bg-[#080609] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_0%,rgba(202,34,128,0.18),transparent_34rem),linear-gradient(180deg,#100610_0%,#080609_52%,#0d090e_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_86%)]"
      />

      <section className="border-b border-primary/25 px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            Community / all GO routes
          </p>
          <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Everything GO provides for the game-development journey.
              </h1>
            </div>
            <p className="max-w-xl text-base leading-8 text-white/65 sm:text-lg">
              Move between live projects, learning, mentorship, events, creator
              stories, games, resources, membership, and the people who make
              the journey worth taking.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-white/50">
            <span className="border border-primary/35 bg-primary/10 px-3 py-2 text-primary">Learn</span>
            <span className="border border-white/15 bg-white/[0.03] px-3 py-2">Build</span>
            <span className="border border-white/15 bg-white/[0.03] px-3 py-2">Connect</span>
            <span className="border border-white/15 bg-white/[0.03] px-3 py-2">Grow</span>
          </div>
        </div>
      </section>

      <section
        id="community-routes"
        aria-labelledby="community-routes-heading"
        className="px-4 py-14 sm:px-6 sm:py-20"
      >
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">
                GO directory
              </p>
              <h2 id="community-routes-heading" className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                Choose your next route
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-white/55">
              Start wherever your work is right now. Every route is designed to
              move you toward a clearer skill, stronger portfolio, better
              collaboration, or next playable milestone.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {routes.map(({ title, eyebrow, description, href, icon: Icon, external, id }) => (
              <Card
                key={title}
                id={id}
                className="group flex scroll-mt-24 flex-col overflow-hidden rounded-lg border-white/15 bg-card/75 text-white shadow-[0_20px_60px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors hover:border-primary/55"
              >
                <CardHeader className="p-6 pb-0 sm:p-7 sm:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/45">
                        {eyebrow}
                      </p>
                      <CardTitle className="mt-7 text-2xl font-bold uppercase leading-tight tracking-tight text-white">{title}</CardTitle>
                    </div>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/45 bg-primary/10 text-primary"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col p-6 pt-4 sm:p-7 sm:pt-4">
                  <p className="text-sm leading-7 text-white/70">{description}</p>
                  <Button
                    className="mt-6 w-full border-primary/30 bg-transparent text-primary hover:border-primary hover:bg-primary/10 hover:text-white"
                    variant="outline"
                    asChild
                  >
                    <Link
                      href={href}
                      target={external ? "_blank" : undefined}
                      rel={external ? "noopener noreferrer" : undefined}
                    >
                      Explore {title}
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
