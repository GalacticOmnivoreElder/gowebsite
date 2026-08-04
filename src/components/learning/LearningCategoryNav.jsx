import Link from "next/link";
import { BookOpen, Clapperboard, FileText, Workflow } from "lucide-react";
import { learningNavigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const learningIcons = {
  Courses: BookOpen,
  Workshops: Workflow,
  "Video Bundles": Clapperboard,
  Resources: FileText,
};

export function LearningCategoryNav({ activeItem, className }) {
  return (
    <nav
      aria-label="Learning categories"
      className={cn(
        "mx-auto grid w-full max-w-5xl grid-cols-2 gap-2 rounded-lg border border-primary/20 bg-card/50 p-2 lg:grid-cols-4",
        className
      )}
    >
      {learningNavigation.map((item) => {
        const ItemIcon = learningIcons[item.label];
        const active = item.label === activeItem;
        const classes = cn(
          "flex min-h-14 items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          active
            ? "border-primary bg-primary/15 text-foreground shadow-[inset_3px_0_0_hsl(var(--primary))]"
            : "border-transparent text-muted-foreground hover:border-primary/35 hover:bg-primary/10 hover:text-foreground"
        );

        return active ? (
          <span key={item.label} aria-current="page" className={classes}>
            <ItemIcon
              className="h-4 w-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            {item.label}
          </span>
        ) : (
          <Link key={item.label} href={item.href} className={classes}>
            <ItemIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
