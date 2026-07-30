import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "About Galactic Omnivore",
  description:
    "Learn how Galactic Omnivore helps game creators across North Macedonia learn, collaborate, build visible experience, and take a practical next step.",
  path: "/about",
});

const DISCORD_INVITE_URL = "https://discord.gg/ZbSShxu6K4";
const STATUTE_VIEW_URL =
  "https://drive.google.com/file/d/1DRFhgeRC7GwwnC5u2W1IJOBc8SgOSxIm/view?usp=sharing";
const STATUTE_DOWNLOAD_URL =
  "https://drive.google.com/uc?export=download&id=1DRFhgeRC7GwwnC5u2W1IJOBc8SgOSxIm";

const routes = [
  {
    title: "Learn",
    description:
      "Build practical game-development skills through resources, education, feedback, and shared experience.",
    href: "/education",
    cta: "Explore learning",
  },
  {
    title: "Find a project",
    description:
      "Review clear project briefs and discover suitable open roles.",
    href: "/projects",
    cta: "Browse project roles",
  },
  {
    title: "Create a project",
    description:
      "Publish a structured project brief and explain what your team needs.",
    href: "/project/create",
    cta: "Create project brief",
  },
  {
    title: "Join the community",
    description:
      "Connect with creators, participate in activities, and review available membership options.",
    href: "/membership",
    cta: "Review membership",
  },
];

const values = [
  {
    title: "Honesty",
    description:
      "We communicate clearly about opportunities, expectations, limitations, ownership, and compensation.",
  },
  {
    title: "Evolution",
    description:
      "We treat every project, mistake, and experiment as an opportunity to improve.",
  },
  {
    title: "Knowledge",
    description:
      "We encourage practical learning, shared experience, accessible resources, and informed decision-making.",
  },
  {
    title: "Accountability",
    description:
      "We take responsibility for our commitments, contributions, decisions, and impact on others.",
  },
  {
    title: "Commitment",
    description:
      "We support consistent participation, dependable collaboration, and work that moves toward completion.",
  },
  {
    title: "Egalitarianism",
    description:
      "We believe every contributor deserves respect, visible credit, understandable terms, and a fair opportunity to participate.",
  },
];

const impactAreas = [
  {
    title: "Education and mentorship",
    description:
      "Practical workshops, learning activities, portfolio feedback, and guidance for emerging creators.",
  },
  {
    title: "Projects and collaboration",
    description:
      "Clear project briefs, role discovery, contributor matchmaking, and community-led production.",
  },
  {
    title: "Events and visibility",
    description:
      "Meetups, demonstrations, exhibitions, game jams, showcases, and public opportunities.",
  },
  {
    title: "Publishing and professional development",
    description:
      "Preparation for storefronts, project presentation, industry connections, and pathways toward sustainable work.",
  },
];

const SectionHeading = ({ id, eyebrow, title, description }) => (
  <div className="max-w-3xl">
    {eyebrow && (
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
        {eyebrow}
      </p>
    )}
    <h2 id={id} className="mt-2 text-3xl font-bold sm:text-4xl">
      {title}
    </h2>
    {description && (
      <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
        {description}
      </p>
    )}
  </div>
);

export default function AboutPage() {
  return (
    <div className="overflow-x-clip bg-background">
      <section
        aria-labelledby="about-page-heading"
        className="border-b border-border/80 px-4 py-16 sm:px-6 sm:py-20"
      >
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            Unite. Create. Evolve.
          </p>
          <h1
            id="about-page-heading"
            className="mt-4 text-4xl font-bold leading-tight sm:text-5xl"
          >
            About Galactic Omnivore
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-muted-foreground sm:text-xl">
            Galactic Omnivore is an independent, nonpartisan, nonprofit
            game-development community and platform based in Skopje and active
            across North Macedonia.
          </p>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
            We help creators learn practical skills, find collaborators and
            suitable project roles, publish clear project needs, build visible
            experience, and move their work toward the next playable milestone.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-20 px-4 py-16 sm:px-6 sm:py-20 lg:space-y-24">
        <section aria-labelledby="purpose-heading">
          <Card className="border-primary/30 bg-card/95 shadow-[0_18px_60px_rgba(0,0,0,0.2)]">
            <CardContent className="p-6 sm:p-8 lg:p-10">
              <SectionHeading id="purpose-heading" title="Our purpose" />
              <div className="mt-7 max-w-4xl space-y-5 text-base leading-8 text-muted-foreground sm:text-lg">
                <p className="font-medium text-foreground">
                  GO turns useful signals into practical routes.
                </p>
                <p>
                  We connect game creators with knowledge, collaborators,
                  projects, mentorship, community activities, and publishing
                  preparation. We make opportunities easier to understand by
                  encouraging clear briefs, visible credit, stated ownership,
                  honest availability, and respectful feedback.
                </p>
                <p>
                  Our goal is not simply to gather people in one place. It is to
                  help creators take a sensible next step.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="choose-route-heading">
          <SectionHeading
            id="choose-route-heading"
            eyebrow="Practical paths"
            title="Choose your route"
          />
          <div
            data-testid="about-routes"
            role="list"
            className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {routes.map((route, index) => (
              <Card
                key={route.title}
                role="listitem"
                className="flex min-w-0 border-border/90 bg-card"
              >
                <CardContent className="flex w-full flex-col p-6">
                  <span className="font-mono text-xs text-primary">
                    0{index + 1}
                  </span>
                  <h3 className="mt-3 text-xl font-semibold">{route.title}</h3>
                  <p className="mt-3 flex-1 leading-7 text-muted-foreground">
                    {route.description}
                  </p>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="mt-6 min-h-11 w-full"
                  >
                    <Link href={route.href}>{route.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section aria-labelledby="values-heading">
          <SectionHeading
            id="values-heading"
            eyebrow="How we work"
            title="Our values"
          />
          <div
            data-testid="about-values"
            role="list"
            className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {values.map((value, index) => (
              <Card
                key={value.title}
                role="listitem"
                className="min-w-0 bg-card"
              >
                <CardContent className="h-full p-6">
                  <div
                    aria-hidden="true"
                    className="mb-5 flex items-center gap-3"
                  >
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    <span className="h-px flex-1 bg-border" />
                    <span className="font-mono text-xs text-muted-foreground">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold">{value.title}</h3>
                  <p className="mt-3 leading-7 text-muted-foreground">
                    {value.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="governance-heading"
          className="relative overflow-hidden rounded-xl border border-primary/45 bg-[radial-gradient(circle_at_90%_10%,rgba(202,34,128,0.16),transparent_35%),linear-gradient(135deg,rgba(202,34,128,0.08),rgba(0,0,0,0.08))] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.25)] sm:p-8 lg:p-10"
        >
          <SectionHeading
            id="governance-heading"
            eyebrow="Official foundations"
            title="Governance and transparency"
          />
          <div className="mt-7 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div className="space-y-5 text-base leading-8 text-muted-foreground sm:text-lg">
              <p>
                Galactic Omnivore operates according to its Statute, which
                defines the organization&apos;s formal purpose, objectives,
                structure, membership rules, governance, responsibilities, and
                decision-making procedures.
              </p>
              <p>
                We believe community trust depends on making these foundations
                visible and accessible.
              </p>
            </div>

            <Card
              data-testid="statute-panel"
              className="border-primary/35 bg-background/80 backdrop-blur-sm"
            >
              <CardContent className="p-6">
                <span className="inline-flex rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Official document
                </span>
                <h3 className="mt-5 text-2xl font-semibold">
                  Galactic Omnivore Statute
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Official organizational document · PDF
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                  <Button
                    asChild
                    size="lg"
                    className="min-h-11 w-full sm:flex-1 lg:flex-none xl:flex-1"
                  >
                    <a
                      href={STATUTE_VIEW_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Read the GO Statute PDF in a new tab"
                    >
                      Read the GO Statute
                    </a>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="min-h-11 w-full sm:flex-1 lg:flex-none xl:flex-1"
                  >
                    <a
                      href={STATUTE_DOWNLOAD_URL}
                      download="GO Statute (25.09.2025).pdf"
                      rel="noopener noreferrer"
                      aria-label="Download the GO Statute PDF"
                    >
                      Download the Statute
                    </a>
                  </Button>
                </div>
                <Link
                  href="/contact"
                  className="mt-3 inline-flex h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  Contact GO about governance
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>

        <section aria-labelledby="story-heading">
          <Card className="bg-card">
            <CardContent className="p-6 sm:p-8 lg:p-10">
              <SectionHeading id="story-heading" title="Our story" />
              <div className="mt-7 max-w-4xl space-y-5 text-base leading-8 text-muted-foreground sm:text-lg">
                <p>
                  Galactic Omnivore began as a shared belief that game creators
                  in North Macedonia needed clearer paths to learn, collaborate,
                  build projects, and make their work visible.
                </p>
                <p>
                  The initiative began in 2022, and Galactic Omnivore was
                  formally established in 2023. Since then, it has developed
                  into a community and platform connecting creators with
                  practical education, collaborative projects, events,
                  mentorship, publishing preparation, and opportunities for
                  professional growth.
                </p>
              </div>
              <blockquote className="mt-8 border-l-2 border-primary pl-5 text-xl font-semibold leading-8 text-foreground sm:text-2xl">
                Begin with the truth. Build the useful path. Then send the
                signal.
              </blockquote>
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="impact-heading">
          <SectionHeading
            id="impact-heading"
            eyebrow="What GO supports"
            title="Our impact"
          />
          <div
            data-testid="about-impact"
            role="list"
            className="mt-8 grid gap-5 sm:grid-cols-2"
          >
            {impactAreas.map((impact, index) => (
              <Card
                key={impact.title}
                role="listitem"
                className="min-w-0 bg-card"
              >
                <CardContent className="h-full p-6">
                  <span className="font-mono text-xs text-primary">
                    Impact 0{index + 1}
                  </span>
                  <h3 className="mt-3 text-xl font-semibold">{impact.title}</h3>
                  <p className="mt-3 leading-7 text-muted-foreground">
                    {impact.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Button asChild size="lg" variant="outline" className="mt-7 min-h-11">
            <Link href="/projects">View our work</Link>
          </Button>
        </section>

        <section
          aria-labelledby="about-cta-heading"
          className="rounded-xl border border-primary/40 bg-[radial-gradient(circle_at_50%_0%,rgba(202,34,128,0.2),transparent_45%),linear-gradient(180deg,rgba(202,34,128,0.06),rgba(0,0,0,0.04))] px-6 py-12 text-center sm:px-10 sm:py-16"
        >
          <div className="mx-auto max-w-3xl">
            <h2
              id="about-cta-heading"
              className="text-3xl font-bold sm:text-4xl"
            >
              Find your place in Galactic Omnivore
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Whether you want to learn, contribute to a project, find
              collaborators, present your work, or support the community, there
              is a practical route into GO.
            </p>
            <div className="mx-auto mt-8 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="min-h-11 w-full sm:w-auto">
                <a
                  href={DISCORD_INVITE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Join Our Discord
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="min-h-11 w-full sm:w-auto"
              >
                <Link href="/membership">Review Membership</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="min-h-11 w-full sm:w-auto"
              >
                <Link href="/projects">Explore Projects</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
