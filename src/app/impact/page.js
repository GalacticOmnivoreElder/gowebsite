import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ImpactMetrics } from "@/components/impact/ImpactMetrics";
import { createMetadata } from "@/lib/seo";
import impact from "@/data/go-impact.json";
import projects from "@/data/go-public-projects.json";

export const metadata = createMetadata({
  title: "GO in numbers & our public pitch",
  description: "Explore Galactic Omnivore's mission, recorded activity, public projects and the evidence behind our impact figures.",
  path: "/impact",
});

const pitch = [
  { title: "The challenge", text: "Learning a game engine is only one part of becoming a creator. People also need collaborators, feedback, a place to show their work and a practical route to their next opportunity. Those steps can feel disconnected." },
  { title: "The GO approach", text: "Galactic Omnivore brings learning, collaboration, project visibility and community support into a shared journey. We help a creator identify a useful next step, find people to work with and move toward a playable milestone." },
  { title: "Who we are here for", text: "Students, hobbyists, emerging creators and independent teams, starting in North Macedonia and connecting with people across the region and beyond. GOHQ gives this online community a place to meet and work together." },
  { title: "How the journey works", text: "Learn a practical skill. Apply it to a clear project brief. Collaborate with visible roles and credit. Share the result, ask for feedback and prepare the next milestone. Mentorship and publishing preparation support that journey where available." },
  { title: "How support creates value", text: "Members contribute knowledge, time and creative work. Partners can support workshops, mentorship, community projects and access to tools. Membership and suitable professional services help sustain the work; current terms are published on the website." },
  { title: "What we want to grow", text: "More creators able to show what they can do, more dependable collaboration and more projects reaching useful outcomes. We will extend this record as completion evidence, attendance and website analytics become available." },
];

function SectionTitle({ id, eyebrow, children }) {
  return <header className="mb-7 max-w-3xl"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p><h2 id={id} className="mt-3 text-3xl font-bold sm:text-4xl">{children}</h2></header>;
}

export default function ImpactPage() {
  return (
    <main className="overflow-x-clip">
      <section className="border-b border-primary/25 bg-[radial-gradient(ellipse_at_top_right,rgba(202,34,128,0.17),transparent_60%)] px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Galactic Omnivore · Open record</p>
          <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-tight sm:text-6xl">A community built<br className="hidden sm:block" /> through doing.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">From a first conversation to a shared project, GO helps game creators learn, collaborate and show their work. This is our public pitch and the evidence behind it.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><a href="#public-pitch">Read the public pitch</a></Button>
            <Button asChild size="lg" variant="outline"><a href="/documents/go-impact-2026-10-17.md" download>Download the report · Markdown</a></Button>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">Reviewed 17 October 2026 · A dated snapshot, updated as evidence grows</p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-20 px-4 py-16 sm:px-6">
        <section aria-labelledby="numbers-heading">
          <SectionTitle id="numbers-heading" eyebrow="The evidence">GO in numbers</SectionTitle>
          <p className="mb-7 max-w-3xl leading-7 text-muted-foreground">Our three-year activity window is {impact.window.label}, in {impact.window.timezone}. Task records cover only part of that window; project figures show the current public portfolio. These figures describe GO activity, not website visitor traffic.</p>
          <ImpactMetrics />
        </section>

        <section id="public-pitch" aria-labelledby="pitch-heading" className="scroll-mt-24">
          <SectionTitle id="pitch-heading" eyebrow="Our public pitch">From learning to a playable milestone.</SectionTitle>
          <p className="mb-8 max-w-3xl leading-7 text-muted-foreground">A public edition of GO&apos;s April 2025 platform pitch, adapted on 17 October 2026. It preserves the mission and creator journey, with measured activity replacing unverified traction claims. Historical funding targets, prices and market forecasts are not current offers.</p>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {pitch.map((item, index) => <article key={item.title} className="rounded-xl border bg-card p-6"><p className="font-mono text-sm text-primary">0{index + 1}</p><h3 className="mt-4 text-xl font-semibold">{item.title}</h3><p className="mt-4 leading-7 text-muted-foreground">{item.text}</p></article>)}
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild variant="outline"><Link href="/education">Explore learning</Link></Button>
            <Button asChild variant="outline"><Link href="/projects">Explore projects</Link></Button>
            <Button asChild variant="outline"><Link href="/membership">Membership options</Link></Button>
            <Button asChild><Link href="/contact">Support or partner with GO</Link></Button>
          </div>
        </section>

        <section aria-labelledby="history-heading">
          <SectionTitle id="history-heading" eyebrow="Our history">What the records establish</SectionTitle>
          <ol className="grid gap-6 border-l-2 border-primary/40 pl-6 md:grid-cols-3 md:border-l-0 md:border-t-2 md:pl-0 md:pt-6">
            <li><p className="font-mono text-xl text-primary">2022</p><h3 className="mt-2 text-lg font-semibold">Early work is recorded</h3><p className="mt-3 leading-7 text-muted-foreground">The Jira archive contains completed GO work from 2022. That establishes an early activity record, without asserting an exact founding date.</p></li>
            <li><p className="font-mono text-xl text-primary">2025</p><h3 className="mt-2 text-lg font-semibold">A platform vision and consolidated statute</h3><p className="mt-3 leading-7 text-muted-foreground">The April pitch describes a connected creator journey. The supplied consolidated statute names an assembly on 20 August 2025. This document date does not settle GO&apos;s earlier origin.</p></li>
            <li><p className="font-mono text-xl text-primary">2026</p><h3 className="mt-2 text-lg font-semibold">An open activity record</h3><p className="mt-3 leading-7 text-muted-foreground">This snapshot brings calendar records, archived completions and the public project portfolio together. Original founding and registration documents will complete the timeline.</p></li>
          </ol>
          <Link href="/about" className="mt-6 inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">Read about GO and its statute →</Link>
        </section>

        <section id="portfolio" aria-labelledby="portfolio-heading" className="scroll-mt-24">
          <SectionTitle id="portfolio-heading" eyebrow="The public portfolio">13 listings. Different kinds of progress.</SectionTitle>
          <p className="mb-7 max-w-3xl leading-7 text-muted-foreground">As of 17 October 2026, seven listings are marked completed, five are live and one is recruiting. This portfolio includes games, educational work, cultural projects and community initiatives. A completed listing is a recorded status; it is not by itself evidence of a released game or a completion date within the three-year window.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {projects.map((project) => <Link key={project.id} href={`/project/${project.id}`} className="group flex min-h-24 items-center justify-between gap-4 rounded-lg border bg-card p-5 transition-colors hover:border-primary/70"><span className="font-medium leading-6 group-hover:text-primary">{project.title}</span><span className="shrink-0 rounded-full border border-primary/30 px-3 py-1 text-xs text-muted-foreground">{project.status === "hiring" ? "Recruiting" : project.status === "completed" ? "Completed" : "Live"}</span></Link>)}
          </div>
        </section>

        <section aria-labelledby="method-heading">
          <SectionTitle id="method-heading" eyebrow="Definitions & coverage">How we count</SectionTitle>
          <div className="grid gap-6 lg:grid-cols-2">
            <article id="calendar-method" className="scroll-mt-24 rounded-xl border bg-card p-6 sm:p-8">
              <h3 className="text-2xl font-semibold">Meetings and appointments</h3>
              <p className="mt-4 leading-7 text-muted-foreground">We queried GO Core Team, GO Meetings, GO Events and GO Weekly Community Meetings, including recurring occurrences. All four queries completed pagination.</p>
              <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-6 text-muted-foreground">
                <li>944 calendar records became 904 unique entries after 40 duplicate copies were removed.</li>
                <li>263 clearly named meetings, calls, appointments, interviews, mentoring sessions and coordination sessions fall within the window.</li>
                <li>217 ambiguous entries remain outside the headline count. Another 424 entries are office/availability blocks, reminders, other exclusions or declined invitations.</li>
                <li>146 counted entries are recurring occurrences. A recurring schedule or an accepted invitation does not verify attendance.</li>
                <li>These are organizational calendar records; they do not establish a personal attendance total for any individual.</li>
              </ul>
              <table className="mt-6 w-full text-left text-sm"><caption className="mb-3 text-left font-semibold">Recorded meetings by calendar year</caption><thead><tr className="border-b"><th scope="col" className="py-2">Year</th><th scope="col" className="py-2 text-right">Count</th></tr></thead><tbody>{impact.calendar.byYear.map((row) => <tr key={row.year} className="border-b border-border/50"><th scope="row" className="py-3 font-normal">{row.year}{row.year === 2026 ? " (through 16 Oct)" : ""}</th><td className="py-3 text-right">{row.count === null ? "No records returned" : row.count}</td></tr>)}</tbody></table>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">The additional search back to 1 January 2022 returned no earlier calendar entries. This reflects available coverage, not an absence of activity.</p>
            </article>

            <article id="work-method" className="scroll-mt-24 rounded-xl border bg-card p-6 sm:p-8">
              <h3 className="text-2xl font-semibold">Completed work</h3>
              <p className="mt-4 leading-7 text-muted-foreground">The 29 January 2025 export, “All Jira Tasks Done Until Now,” contains 637 unique items with both status and resolution set to Done. We use resolution dates, rather than creation dates, to select the reporting window.</p>
              <table className="mt-6 w-full text-left text-sm"><caption className="mb-3 text-left font-semibold">Completed work items within the window</caption><thead><tr className="border-b"><th scope="col" className="py-2">Type</th><th scope="col" className="py-2 text-right">Count</th></tr></thead><tbody>{impact.work.types.map((row) => <tr key={row.label} className="border-b border-border/50"><th scope="row" className="py-3 font-normal">{row.label}</th><td className="py-3 text-right">{row.count}</td></tr>)}</tbody><tfoot><tr><th scope="row" className="pt-3">Total</th><td className="pt-3 text-right font-semibold">558</td></tr></tfoot></table>
              <p className="mt-5 leading-7 text-muted-foreground">A further 13 completed epics bring the window total to 571 Jira items. Epics can describe milestones or organizational work, so they are kept separate from completed projects. Parent stories and their subtasks are separate issue records, not independent delivered outcomes.</p>
              <p className="mt-4 leading-7 text-muted-foreground">Across the full archive from 2022 to January 2025, there are 622 completed work items and 15 completed epics. The April 2025 export contains 110 open items and adds no verified completions.</p>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">Task completions after 29 January 2025 are missing from this snapshot. Historical Done status does not establish that an issue has never been reopened.</p>
            </article>
          </div>
        </section>

        <section aria-labelledby="gaps-heading" className="rounded-xl border border-primary/30 bg-primary/5 p-6 sm:p-9">
          <SectionTitle id="gaps-heading" eyebrow="An expanding record">What we will add next</SectionTitle>
          <dl className="grid gap-6 md:grid-cols-2">{impact.gaps.map((gap) => <div key={gap.title}><dt className="text-lg font-semibold">{gap.title}</dt><dd className="mt-2 leading-7 text-muted-foreground">{gap.detail}</dd></div>)}</dl>
          <p className="mt-8 text-sm leading-6 text-muted-foreground">Public reporting uses aggregate figures and already-public project listings. Calendar participants, private meeting links, task descriptions and internal notes are not part of this public report.</p>
          <Button asChild className="mt-6"><Link href="/contact">Contribute a correction or missing record</Link></Button>
        </section>
      </div>
    </main>
  );
}
