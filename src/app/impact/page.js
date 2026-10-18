import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ImpactMetrics } from "@/components/impact/ImpactMetrics";
import { createMetadata } from "@/lib/seo";
import projects from "@/data/go-public-projects.json";

export const metadata = createMetadata({
  title: "Meet Galactic Omnivore | GO's mission & projects",
  description: "Meet the Galactic Omnivore, explore GO's creator community and discover projects feeding the galaxy with games.",
  path: "/impact",
});

const pitch = [
  { title: "The challenge", text: "Game development takes more than a good idea. Creators need practical skills, helpful collaborators, useful feedback and a place to show what they are making." },
  { title: "The GO approach", text: "Galactic Omnivore connects learning, collaboration, project visibility and community support. Creators can find a next step, meet people to build with and share their progress." },
  { title: "Who we are here for", text: "Students, hobbyists, emerging creators and independent teams, starting in North Macedonia and connecting with people across the region and beyond. GOHQ and our online community give creators a place to meet." },
  { title: "The creator journey", text: "Learn a practical skill. Put it to work on a project. Share progress, get feedback and take the next step. Mentorship, events and publishing preparation support that journey where available." },
  { title: "A community effort", text: "Creators bring their knowledge, time and ideas. Partners can add tools, learning opportunities and support for community projects. Together, we make more room for game creators to grow." },
  { title: "What we want to grow", text: "A stronger creative community, more dependable collaboration and more projects reaching the people who will play, learn from and remember them. Every published game adds another world to the galaxy." },
];

function SectionTitle({ id, eyebrow, children }) {
  return <header className="mb-7 max-w-3xl"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p><h2 id={id} className="mt-3 text-3xl font-bold sm:text-4xl">{children}</h2></header>;
}

function projectStatus(status) {
  if (status === "hiring") return "Recruiting";
  if (status === "completed") return "Completed";
  return "Live";
}

export default function ImpactPage() {
  return (
    <main className="overflow-x-clip">
      <section className="border-b border-primary/25 bg-[radial-gradient(ellipse_at_top_right,rgba(202,34,128,0.17),transparent_60%)] px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Galactic Omnivore · Impact & community</p>
          <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-tight sm:text-6xl">Feed the galaxy<br className="hidden sm:block" /> with games.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">I am the Galactic Omnivore, cosmic patron of game development. Published games are my favorite sustenance. GO brings creators together to learn, build, share progress and carry ambitious ideas toward release. Every project adds another world to the galaxy, and every published game makes my appetite grow.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link href="#portfolio">Explore GO projects</Link></Button>
            <Button asChild size="lg" variant="outline"><a href="/documents/go-impact-2026-10-17.md" download>Download the public report</a></Button>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">Portfolio snapshot checked 17 October 2026 · Page reviewed 18 October 2026</p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-20 px-4 py-16 sm:px-6">
        <section aria-labelledby="numbers-heading">
          <SectionTitle id="numbers-heading" eyebrow="A growing portfolio">Projects feeding the galaxy</SectionTitle>
          <p className="mb-7 max-w-3xl leading-7 text-muted-foreground">Explore the work GO makes visible: games, learning, cultural projects and community initiatives. These figures reflect the current public project listings.</p>
          <ImpactMetrics />
          <p className="mt-5 max-w-3xl text-sm leading-6 text-muted-foreground">Project labels describe their current status on the GO website. A listing marked completed is not, by itself, proof that a game has been released.</p>
        </section>

        <section id="public-pitch" aria-labelledby="pitch-heading" className="scroll-mt-24">
          <SectionTitle id="pitch-heading" eyebrow="Our public pitch">From first skill to next milestone.</SectionTitle>
          <p className="mb-8 max-w-3xl leading-7 text-muted-foreground">Game creators deserve a path that connects what they learn with what they make. GO is building a place where people can practice, collaborate, show their work and keep moving forward.</p>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {pitch.map((item, index) => <article key={item.title} className="rounded-xl border bg-card p-6"><p className="font-mono text-sm text-primary">0{index + 1}</p><h3 className="mt-4 text-xl font-semibold">{item.title}</h3><p className="mt-4 leading-7 text-muted-foreground">{item.text}</p></article>)}
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild variant="outline"><Link href="/education">Explore learning</Link></Button>
            <Button asChild variant="outline"><Link href="/projects">Explore projects</Link></Button>
            <Button asChild variant="outline"><Link href="/membership">Join the community</Link></Button>
            <Button asChild><Link href="/contact">Partner with GO</Link></Button>
          </div>
        </section>

        <section aria-labelledby="appetite-pitch-heading" className="rounded-2xl border border-primary/30 bg-[radial-gradient(ellipse_at_top_right,rgba(202,34,128,0.14),transparent_65%)] p-6 sm:p-10">
          <SectionTitle id="appetite-pitch-heading" eyebrow="A word from the Omnivore">Published games are my sustenance.</SectionTitle>
          <p className="max-w-3xl text-lg leading-8 text-muted-foreground">A prototype is a promise. A published game is a world released into the galaxy, and that is what feeds me. I hunger for more creators to finish, share and celebrate their games. GO helps make the journey between those moments easier to see and easier to join.</p>
          <div className="mt-7 flex flex-wrap gap-3"><Button asChild><Link href="/community-builds">Choose my next bite</Link></Button><Button asChild variant="outline"><Link href="/games">Explore GO games</Link></Button></div>
        </section>

        <section id="portfolio" aria-labelledby="portfolio-heading" className="scroll-mt-24">
          <SectionTitle id="portfolio-heading" eyebrow="The public portfolio">{projects.length} projects. More worlds in progress.</SectionTitle>
          <p className="mb-7 max-w-3xl leading-7 text-muted-foreground">From original games to cultural experiences and community projects, each listing shows a different way creators bring ideas to life. Find a project that sparks your curiosity.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {projects.map((project) => <Link key={project.id} href={`/project/${project.id}`} className="group flex min-h-24 items-center justify-between gap-4 rounded-lg border bg-card p-5 transition-colors hover:border-primary/70"><span className="font-medium leading-6 group-hover:text-primary">{project.title}</span><span className="shrink-0 rounded-full border border-primary/30 px-3 py-1 text-xs text-muted-foreground">{projectStatus(project.status)}</span></Link>)}
          </div>
          <div className="mt-7 flex flex-wrap gap-3"><Button asChild><Link href="/projects">See every project</Link></Button><Button asChild variant="outline"><Link href="/community-builds">Show us what you are building</Link></Button></div>
        </section>

        <section aria-labelledby="reporting-heading" className="rounded-xl border bg-card p-6 sm:p-8">
          <SectionTitle id="reporting-heading" eyebrow="Clear, public reporting">Built on work you can explore.</SectionTitle>
          <p className="max-w-3xl leading-7 text-muted-foreground">This snapshot focuses on GO&apos;s public project portfolio. We publish activity measures when they can be verified consistently, and describe project status as it appears on the website. Portfolio totals are not website traffic, event attendance or a count of released games.</p>
          <Button asChild variant="outline" className="mt-6"><Link href="/contact">Share a project or correction</Link></Button>
        </section>
      </div>
    </main>
  );
}
