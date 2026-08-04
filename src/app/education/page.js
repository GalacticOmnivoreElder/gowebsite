"use client";

import { observer } from "mobx-react-lite";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { BlogCard } from "../blog/page";
import { BookOpen, CalendarDays, Clock, Users } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LearningCategoryNav } from "@/components/learning/LearningCategoryNav";

const EDUCATION_STREAMS = {
  COURSES: { slug: "course", title: "Courses" },
  WORKSHOPS: { slug: "workshop", title: "Workshops" },
};

const EducationContent = observer(() => {
  const searchParams = useSearchParams();
  const requestedStream = searchParams.get("format");
  const normalizedStream = Object.values(EDUCATION_STREAMS).some(
    (stream) => stream.slug === requestedStream
  )
    ? requestedStream
    : EDUCATION_STREAMS.COURSES.slug;
  const [postsByStream, setPostsByStream] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [learningItems, setLearningItems] = useState([]);
  const [activeStream, setActiveStream] = useState(normalizedStream);

  useEffect(() => {
    setActiveStream(normalizedStream);
  }, [normalizedStream]);

  useEffect(() => {
    const fetchEducationPosts = async () => {
      try {
        setLoading(true);
        setError(null);

        const streamSlugs = Object.values(EDUCATION_STREAMS).map(
          (stream) => stream.slug
        );
        const fetchPromises = streamSlugs.map((slug) =>
          fetch(`/api/wordpress?tag=${slug}`).then((response) => {
            if (!response.ok) {
              throw new Error(`Failed to fetch ${slug} posts`);
            }

            return response.json();
          })
        );

        const [results, platformResponse] = await Promise.all([
          Promise.allSettled(fetchPromises),
          fetch("/api/learning-items").then((response) => response.ok ? response.json() : []),
        ]);
        setLearningItems(Array.isArray(platformResponse) ? platformResponse : []);
        const nextPostsByStream = {};
        let fetchError = null;

        results.forEach((result, index) => {
          const slug = streamSlugs[index];

          if (result.status === "fulfilled") {
            nextPostsByStream[slug] = result.value;
          } else {
            nextPostsByStream[slug] = [];
            fetchError =
              fetchError ||
              result.reason?.message ||
              "Some learning material could not be loaded.";
          }
        });

        setPostsByStream(nextPostsByStream);

        if (fetchError) {
          setError(fetchError);
        }
      } catch (error) {
        console.error("Error fetching education posts:", error);
        setError("Learning material could not be loaded. Try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchEducationPosts();
  }, []);

  const renderStreamContent = (streamSlug, streamTitle) => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="space-y-3">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ))}
        </div>
      );
    }

    const posts = postsByStream[streamSlug] || [];

    if (posts.length === 0) {
      return (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-xl mb-3">
            No {streamTitle.toLowerCase()} are available now.
          </p>
          <p className="text-muted-foreground">
            Return to this page to review newly listed material.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => (
          <BlogCard key={post.id} post={post} />
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="h-9 w-9 text-primary" />
          <h1 className="text-4xl font-bold">Education</h1>
        </div>
        <div className="text-muted-foreground max-w-3xl space-y-4">
          <p>
            Build one practical skill, test it in context, and keep the result
            visible.
          </p>
          <p>
            Review the courses and workshops currently listed by GO. Open an
            item to check its topic, level, timing, and next action.
          </p>
        </div>
      </div>

      <LearningCategoryNav
        activeItem={
          activeStream === EDUCATION_STREAMS.WORKSHOPS.slug
            ? EDUCATION_STREAMS.WORKSHOPS.title
            : EDUCATION_STREAMS.COURSES.title
        }
        className="mb-12"
      />

      <section className="mb-12" aria-labelledby="direct-enrollment-heading">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">Direct enrollment</p>
            <h2 id="direct-enrollment-heading" className="mt-1 text-2xl font-bold">GO courses and workshops</h2>
          </div>
        </div>
        {learningItems.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {learningItems.map((item) => (
              <Card key={item.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3"><Badge variant="outline" className="capitalize">{item.learningType}</Badge><Badge>{item.status.replaceAll("_", " ")}</Badge></div>
                  <CardTitle className="mt-3">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <p className="line-clamp-3 text-sm text-muted-foreground">{item.description}</p>
                  <div className="mt-5 space-y-2 text-sm text-muted-foreground">
                    {item.startsAt && <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />{new Date(item.startsAt).toLocaleString()}</p>}
                    {item.durationMinutes > 0 && <p className="flex items-center gap-2"><Clock className="h-4 w-4" />{item.durationMinutes} minutes</p>}
                    {item.placesRemaining !== null && <p className="flex items-center gap-2"><Users className="h-4 w-4" />{item.placesRemaining} places remaining</p>}
                  </div>
                  <Button asChild className="mt-6 w-full"><Link href={`/education/${item.slug}`}>View and enroll</Link></Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No direct-enrollment activities are published right now.</CardContent></Card>
        )}
      </section>

      {error && <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">Some article-based learning material could not be loaded. Direct-enrollment activities remain available above.</div>}

      <Tabs value={activeStream} onValueChange={setActiveStream} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-auto mb-6">
          {Object.values(EDUCATION_STREAMS).map((stream) => (
            <TabsTrigger
              key={stream.slug}
              value={stream.slug}
              className="py-2 px-1 text-center data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {stream.title}
            </TabsTrigger>
          ))}
        </TabsList>
        {Object.values(EDUCATION_STREAMS).map((stream) => (
          <TabsContent key={stream.slug} value={stream.slug}>
            {renderStreamContent(stream.slug, stream.title)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
});

export default function EducationPage() {
  return (
    <Suspense fallback={<EducationPageSkeleton />}>
      <EducationContent />
    </Suspense>
  );
}

function EducationPageSkeleton() {
  return (
    <div className="container mx-auto space-y-8 px-4 py-8">
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-full max-w-3xl" />
        <Skeleton className="h-5 w-full max-w-2xl" />
      </div>
      <Skeleton className="h-40 w-full" />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
