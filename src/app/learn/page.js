import Omnivore from "@/components/omnivore/Omnivore";
import "@/components/omnivore/single-lab.css";
import Link from "next/link";

export const metadata = {
  title: "GO Game Development Lab",
  description: "Ask the Galactic Omnivore to find your next game-development learning step.",
  alternates: { canonical: "/learn" },
};

export default async function LearnPage({ searchParams }) {
  const params = await searchParams;
  const mentorshipIntent = params?.intent === "mentorship";

  return (
    <>
      {mentorshipIntent && (
        <section
          className="border-b border-primary/30 bg-primary/[0.06] px-5 py-8 text-foreground sm:px-6 sm:py-10"
          aria-labelledby="mentorship-intent-heading"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Your selected GO path
              </p>
              <h1 id="mentorship-intent-heading" className="mt-2 text-2xl font-bold sm:text-3xl">
                Request mentorship for your next milestone
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Ask GO a public learning question below, or browse reviewed mentors for ongoing, personal guidance. Structured mentorship is available to active GO members.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link
                href="/mentorship?intent=mentorship"
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Browse mentors
              </Link>
              <Link
                href="/membership?intent=mentorship"
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-semibold transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Review membership
              </Link>
            </div>
          </div>
        </section>
      )}
      <Omnivore />
    </>
  );
}
