"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BookOpen, CalendarDays, Clock, Users } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LearningCategoryNav } from "@/components/learning/LearningCategoryNav";

const STREAMS = Object.freeze({
  course: "Courses",
  workshop: "Workshops",
});

function EducationContent() {
  const searchParams = useSearchParams();
  const requestedFormat = searchParams.get("format");
  const activeFormat = Object.hasOwn(STREAMS, requestedFormat)
    ? requestedFormat
    : "course";
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setStatus("loading");
      setError("");
      try {
        const response = await fetch("/api/learning-items", {
          cache: "no-store",
        });
        const result = await response.json().catch(() => []);
        if (!response.ok) {
          throw new Error(result?.error || "Learning activities could not be loaded.");
        }
        if (active) {
          setItems(Array.isArray(result) ? result : []);
          setStatus("ready");
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Learning activities could not be loaded.");
          setStatus("error");
        }
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const visibleItems = useMemo(
    () => items.filter((item) => item.learningType === activeFormat),
    [activeFormat, items],
  );

  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <div className="mb-4 flex items-center gap-3">
          <BookOpen className="h-9 w-9 text-primary" aria-hidden="true" />
          <h1 className="text-4xl font-bold">Education</h1>
        </div>
        <div className="max-w-3xl space-y-4 text-muted-foreground">
          <p>Build practical skills through GO courses and workshops.</p>
          <p>
            Open an activity to review its topic, level, schedule, eligibility,
            available places, and application requirements. Enrollment and
            application status are managed directly in your GO account.
          </p>
        </div>
      </header>

      <LearningCategoryNav activeItem={STREAMS[activeFormat]} className="mb-8" />

      <nav className="mb-8 grid grid-cols-2 gap-2" aria-label="Education type">
        {Object.entries(STREAMS).map(([format, label]) => (
          <Button
            key={format}
            asChild
            variant={activeFormat === format ? "default" : "outline"}
          >
            <Link href={`/education?format=${format}`}>{label}</Link>
          </Button>
        ))}
      </nav>

      <section aria-labelledby="learning-list-heading">
        <div className="mb-5">
          <p className="text-sm font-semibold uppercase text-primary">GO Learning</p>
          <h2 id="learning-list-heading" className="mt-1 text-2xl font-bold">
            Available {STREAMS[activeFormat].toLowerCase()}
          </h2>
        </div>

        {status === "loading" ? <EducationGridSkeleton /> : null}

        {status === "error" ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p role="alert" className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        ) : null}

        {status === "ready" && visibleItems.length ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {visibleItems.map((item) => (
              <Card key={item.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="outline">{STREAMS[item.learningType] || item.learningType}</Badge>
                    <Badge>{String(item.status || "available").replaceAll("_", " ")}</Badge>
                  </div>
                  <CardTitle className="mt-3">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <p className="line-clamp-3 text-sm text-muted-foreground">{item.description}</p>
                  <div className="mt-5 space-y-2 text-sm text-muted-foreground">
                    {item.startsAt ? (
                      <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4" aria-hidden="true" />{new Date(item.startsAt).toLocaleString()}</p>
                    ) : null}
                    {item.durationMinutes > 0 ? (
                      <p className="flex items-center gap-2"><Clock className="h-4 w-4" aria-hidden="true" />{item.durationMinutes} minutes</p>
                    ) : null}
                    {item.placesRemaining !== null ? (
                      <p className="flex items-center gap-2"><Users className="h-4 w-4" aria-hidden="true" />{item.placesRemaining} places remaining</p>
                    ) : null}
                  </div>
                  <Button asChild className="mt-6 w-full">
                    <Link href={`/education/${item.slug}`}>View and enroll</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}

        {status === "ready" && !visibleItems.length ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No {STREAMS[activeFormat].toLowerCase()} are published right now.
            </CardContent>
          </Card>
        ) : null}
      </section>
    </main>
  );
}

function EducationGridSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" aria-label="Loading learning activities">
      {[0, 1, 2].map((item) => <Skeleton key={item} className="h-64 w-full" />)}
    </div>
  );
}

export default function EducationPage() {
  return (
    <Suspense fallback={<EducationGridSkeleton />}>
      <EducationContent />
    </Suspense>
  );
}
