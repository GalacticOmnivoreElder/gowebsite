import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ImpactMetrics } from "@/components/impact/ImpactMetrics";

export function StatsPreview() {
  return (
    <section aria-labelledby="go-numbers-heading" className="bg-black px-4 py-16 text-white sm:px-6 md:py-24">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">A record of the work</p>
        <div className="mb-8 mt-3 max-w-3xl">
          <h2 id="go-numbers-heading" className="text-3xl font-bold sm:text-4xl">GO in numbers</h2>
          <p className="mt-4 leading-7 text-muted-foreground">The conversations, completed work and projects behind Galactic Omnivore. Each number has a source, a date and a clear definition.</p>
        </div>
        <ImpactMetrics />
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button asChild size="lg"><Link href="/impact">Read our story &amp; public pitch</Link></Button>
          <p className="text-sm text-muted-foreground">Evidence reviewed 17 October 2026 · Organization activity</p>
        </div>
      </div>
    </section>
  );
}
