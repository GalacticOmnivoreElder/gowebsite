import Link from "next/link";
import impact from "@/data/go-impact.json";

export function ImpactMetrics() {
  return (
    <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {impact.metrics.map((metric) => (
        <div key={metric.id} className="flex min-w-0 flex-col rounded-xl border border-primary/25 bg-card p-6">
          <dt className="order-2 mt-3 text-lg font-semibold leading-6">{metric.label}</dt>
          <dd className="order-1 font-mono text-5xl font-bold tracking-tight text-primary sm:text-6xl">
            {metric.value.toLocaleString("en-GB")}
          </dd>
          <dd className="order-3 mt-3 text-xs font-medium leading-5 text-muted-foreground">{metric.period}</dd>
          <dd className="order-4 mt-3 flex-1 text-sm leading-6 text-muted-foreground">{metric.note}</dd>
          <dd className="order-5 mt-5">
            <Link href={metric.href} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline">
              How we count<span className="sr-only"> {metric.label.toLowerCase()}</span><span aria-hidden="true" className="ml-2">↗</span>
            </Link>
          </dd>
        </div>
      ))}
    </dl>
  );
}
