import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, Clapperboard, Compass, FileText, HeartHandshake, Newspaper, Route, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const routes = [
  { title: "Starter Pathway", eyebrow: "Start here", description: "Explore the foundations of making games in six practical, self-paced steps. Your first mission is free.", href: "/education/starter-pathway", icon: Route },
  { title: "Courses", eyebrow: "Go deeper", description: "Build practical game-development skills with structured learning, from self-paced pathways to live bootcamps.", href: "/education?format=course", icon: BookOpen },
  { title: "Workshops", eyebrow: "Learn by doing", description: "Find focused sessions where you can apply a skill, explore a topic, and learn alongside others.", href: "/education?format=workshop", icon: Workflow },
  { title: "Video Bundles", eyebrow: "Watch and practice", description: "Explore curated video collections and the notes, exercises, or downloads that accompany them.", href: "/video-bundles", icon: Clapperboard },
  { title: "Resources", eyebrow: "Find your tools", description: "Browse practical guides, files, and other game-development materials shared or selected by GO.", href: "/resources", icon: FileText },
  { title: "Ask the Omnivore", eyebrow: "Find your next step", description: "Bring a game-development question and explore a useful next step for your own journey.", href: "/learn", icon: Compass },
  { title: "Mentorship", eyebrow: "Get guidance", description: "Explore mentor routes and find support for a specific challenge or milestone.", href: "/mentorship", icon: HeartHandshake },
  { title: "Events", eyebrow: "Learn together", description: "Discover workshops, meetups, and other opportunities to connect and learn with GO.", href: "/events", icon: CalendarDays },
  { title: "GO Signal", eyebrow: "Learn from the journey", description: "Read creator stories, project updates, practical notes, and lessons from the community.", href: "/blog", icon: Newspaper },
];

export function EducationDirectory() {
  return (
    <main className="relative isolate overflow-hidden bg-[#080609] text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_0%,rgba(202,34,128,0.18),transparent_34rem),linear-gradient(180deg,#100610_0%,#080609_52%,#0d090e_100%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_86%)]" />
      <section className="border-b border-primary/25 px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.3em] text-primary">GO Learning / education</p>
          <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-end">
            <h1 className="max-w-4xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">Learn, make, and grow with GO.</h1>
            <p className="max-w-xl text-base leading-8 text-white/65 sm:text-lg">From your first idea to your next playable milestone, find courses, practical resources, guidance, and people to learn with.</p>
          </div>
          <div className="mt-8 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-white/50">
            <span className="border border-primary/35 bg-primary/10 px-3 py-2 text-primary">Discover</span>
            <span className="border border-white/15 bg-white/[0.03] px-3 py-2">Practice</span>
            <span className="border border-white/15 bg-white/[0.03] px-3 py-2">Create</span>
            <span className="border border-white/15 bg-white/[0.03] px-3 py-2">Share</span>
          </div>
        </div>
      </section>
      <section aria-labelledby="learning-routes-heading" className="px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">Learning directory</p><h2 id="learning-routes-heading" className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Choose how you want to learn</h2></div>
            <p className="max-w-xl text-sm leading-6 text-white/55">Start with a pathway, find a focused lesson, or get guidance on the challenge in front of you.</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {routes.map(({ title, eyebrow, description, href, icon: Icon }) => (
              <Card key={title} className="group flex flex-col overflow-hidden rounded-xl border-white/10 bg-[#111014]/90 text-white shadow-[0_18px_55px_rgba(0,0,0,0.24)] transition-colors hover:border-primary/55 hover:bg-primary/[0.06]">
                <CardHeader className="border-b border-white/10 p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">{eyebrow}</p><CardTitle className="mt-3 text-xl text-white">{title}</CardTitle></div><Icon className="h-6 w-6 shrink-0 text-primary transition-transform duration-300 group-hover:-translate-y-1" aria-hidden="true" /></div></CardHeader>
                <CardContent className="flex flex-1 flex-col p-5 sm:p-6"><p className="text-sm leading-7 text-white/60">{description}</p><Button className="mt-6 w-full rounded-sm border-white/15 bg-transparent text-white hover:border-primary hover:bg-primary/10 hover:text-white" variant="outline" asChild><Link href={href}>Explore {title}<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></Link></Button></CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
