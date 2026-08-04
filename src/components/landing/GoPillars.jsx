import { ArrowRight, BookOpen, FileText, FolderKanban } from "lucide-react";

const pillars = [
  {
    title: "Learn",
    icon: BookOpen,
    description:
      "Build practical game-development skills through courses, workshops, video bundles, shared resources, and community knowledge.",
  },
  {
    title: "Portfolio",
    icon: FileText,
    description:
      "Turn real contributions, completed work, and project experience into credited evidence through your profile and GameDev Passport.",
  },
  {
    title: "Business",
    icon: FolderKanban,
    description:
      "Create clear project briefs, find the right collaborators, manage production, and move promising work toward sustainable opportunities.",
  },
];

export function GoPillars() {
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
            Learn. Build your portfolio. Move toward business.
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
            return (
              <li key={pillar.title} className="contents">
                <article className="relative flex min-w-0 flex-col overflow-hidden rounded-lg border border-white/15 bg-card/75 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-7">
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
                  <div
                    aria-hidden="true"
                    className="mt-8 h-1 w-12 bg-primary shadow-[0_0_18px_hsl(var(--primary)/0.55)]"
                  />
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
