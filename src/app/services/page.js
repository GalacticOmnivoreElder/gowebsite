import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Clapperboard,
  Compass,
  Gamepad2,
  MessageCircle,
  Rocket,
  Sparkles,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Services",
  description:
    "Work with GO on games, animated video, gamification, consulting, learning experiences, and creator team support.",
  path: "/services",
});

const services = [
  {
    title: "Create a game",
    eyebrow: "Game production",
    description:
      "Shape an idea into a playable prototype or a focused production plan, with the right mix of design, art, development, and testing support.",
    deliverables: ["Concept and scope", "Prototype or vertical slice", "Production roadmap"],
    icon: Gamepad2,
  },
  {
    title: "Create an animated video",
    eyebrow: "Motion storytelling",
    description:
      "Explain a product, world, or idea through a concise animated video made for a launch, campaign, classroom, or community audience.",
    deliverables: ["Story and script direction", "2D motion and editing", "Delivery-ready video"],
    icon: Clapperboard,
  },
  {
    title: "Build a gamified experience",
    eyebrow: "Gamification",
    description:
      "Use game mechanics with a clear purpose: help people learn, participate, practise, or return to an experience that matters to them.",
    deliverables: ["Audience and goal mapping", "Mechanics and progression", "Prototype and iteration"],
    icon: Sparkles,
  },
  {
    title: "Game consulting",
    eyebrow: "Strategy and direction",
    description:
      "Get a practical outside view on a game, team, or production decision before you spend more time and budget moving forward.",
    deliverables: ["Project review", "Design and scope feedback", "Actionable next steps"],
    icon: Compass,
  },
  {
    title: "Learning experiences and workshops",
    eyebrow: "Education design",
    description:
      "Plan a hands-on workshop, course, or learning activity that gives a team, school, or community something useful to make and practise.",
    deliverables: ["Learning goals", "Workshop structure", "Exercises and materials"],
    icon: BookOpen,
  },
  {
    title: "Team and talent matchmaking",
    eyebrow: "Find the right people",
    description:
      "Tell GO what you need and we can help you find community members, mentors, or approved community experts for a defined project brief.",
    deliverables: ["Role and skill brief", "GO community matching", "Clear collaboration scope"],
    icon: Users,
  },
  {
    title: "Interactive prototypes",
    eyebrow: "Test the idea",
    description:
      "Make a small, useful version of an interaction so you can test the experience, gather feedback, and decide what deserves a larger build.",
    deliverables: ["Experience mapping", "Clickable or playable prototype", "Feedback session"],
    icon: Rocket,
  },
  {
    title: "Publishing and launch support",
    eyebrow: "Prepare the next step",
    description:
      "Get help presenting a project clearly, preparing a storefront or showcase, and turning the work you have into a stronger public signal.",
    deliverables: ["Project presentation", "Launch checklist", "Showcase preparation"],
    icon: MessageCircle,
  },
];

const process = [
  {
    number: "01",
    title: "Share the brief",
    description: "Tell us what you are making, who it is for, and where you are stuck.",
  },
  {
    number: "02",
    title: "Find the fit",
    description: "GO clarifies the scope and matches the request to the right experience and people.",
  },
  {
    number: "03",
    title: "Make the next milestone",
    description: "You leave with a concrete plan, a useful deliverable, or a team ready to move.",
  },
];

export default function ServicesPage() {
  return (
    <main className="relative isolate overflow-hidden bg-[#080609] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_0%,rgba(202,34,128,0.22),transparent_31rem),linear-gradient(180deg,#100610_0%,#080609_48%,#0d090e_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_86%)]"
      />

      <section className="border-b border-primary/25 px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            GO Services / practical support
          </p>
          <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_0.72fr] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Bring the right people and the next useful step together.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/65">
                GO can help you make a game, explain an idea, design a
                gamified experience, or find the expertise to move a project
                forward.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Button asChild size="lg" className="min-h-12 w-full sm:flex-1 lg:flex-none">
                <Link href="/contact?intent=services">
                  Start a service conversation
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="min-h-12 w-full border-white/20 bg-transparent text-white hover:border-primary hover:bg-primary/10 hover:text-white sm:flex-1 lg:flex-none"
              >
                <Link href="/projects">See GO project work</Link>
              </Button>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-white/50">
            <Badge variant="outline" className="rounded-sm border-primary/40 bg-primary/10 px-3 py-2 text-primary">
              Create
            </Badge>
            <Badge variant="outline" className="rounded-sm border-white/15 bg-white/[0.03] px-3 py-2 text-white/60">
              Explain
            </Badge>
            <Badge variant="outline" className="rounded-sm border-white/15 bg-white/[0.03] px-3 py-2 text-white/60">
              Gamify
            </Badge>
            <Badge variant="outline" className="rounded-sm border-white/15 bg-white/[0.03] px-3 py-2 text-white/60">
              Match
            </Badge>
          </div>
        </div>
      </section>

      <section
        id="services"
        aria-labelledby="services-heading"
        className="px-4 py-14 sm:px-6 sm:py-20"
      >
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">
                What GO can help with
              </p>
              <h2 id="services-heading" className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                Services for ideas in motion
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-white/55">
              Start with the service that sounds closest to your need. We can
              shape the scope together before any work begins.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {services.map(({ title, eyebrow, description, deliverables, icon: Icon }, index) => (
              <Card
                key={title}
                className="group flex min-w-0 flex-col overflow-hidden rounded-xl border-white/10 bg-[#111014]/90 text-white shadow-[0_18px_55px_rgba(0,0,0,0.24)] transition-colors hover:border-primary/55 hover:bg-primary/[0.06]"
              >
                <CardHeader className="border-b border-white/10 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
                        {eyebrow}
                      </p>
                      <CardTitle className="mt-3 text-xl leading-tight text-white">
                        {title}
                      </CardTitle>
                    </div>
                    <Icon
                      className="h-6 w-6 shrink-0 text-primary transition-transform duration-300 group-hover:-translate-y-1"
                      aria-hidden="true"
                    />
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col p-5">
                  <p className="text-sm leading-7 text-white/60">{description}</p>
                  <ul className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm text-white/75">
                    {deliverables.map((deliverable) => (
                      <li key={deliverable} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                        <span>{deliverable}</span>
                      </li>
                    ))}
                  </ul>
                  <span className="mt-auto pt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">
                    Service 0{index + 1}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-primary/20 bg-white/[0.02] px-4 py-14 sm:px-6 sm:py-20" aria-labelledby="process-heading">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">
              How it starts
            </p>
            <h2 id="process-heading" className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              A clear route from request to result
            </h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {process.map(({ number, title, description }) => (
              <Card key={number} className="border-white/10 bg-[#111014]/75 text-white">
                <CardContent className="p-6">
                  <span className="font-mono text-sm text-primary">{number}</span>
                  <h3 className="mt-5 text-xl font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-white/60">{description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl rounded-xl border border-primary/40 bg-[radial-gradient(circle_at_50%_0%,rgba(202,34,128,0.2),transparent_50%),linear-gradient(180deg,rgba(202,34,128,0.08),rgba(0,0,0,0.04))] px-6 py-12 text-center sm:px-10 sm:py-16">
          <h2 className="text-3xl font-bold sm:text-4xl">Have a different need?</h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
            Share the outcome you are aiming for. GO will help you find the
            most useful route, even when it does not fit one service card.
          </p>
          <Button asChild size="lg" className="mt-8 min-h-12">
            <Link href="/contact?intent=services">
              Talk to GO
              <MessageCircle className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
