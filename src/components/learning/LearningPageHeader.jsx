import { cn } from "@/lib/utils";

export function LearningPageHeader({
  icon: Icon,
  title,
  description,
  className,
}) {
  return (
    <header className={cn("max-w-4xl", className)}>
      <div className="flex items-start gap-4">
        {Icon ? (
          <Icon className="mt-1 h-9 w-9 shrink-0 text-primary" aria-hidden="true" />
        ) : null}
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            GO Learning
          </p>
          <h1 className="mt-1 text-4xl font-bold md:text-5xl">{title}</h1>
          <div className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">
            {description}
          </div>
        </div>
      </div>
    </header>
  );
}
