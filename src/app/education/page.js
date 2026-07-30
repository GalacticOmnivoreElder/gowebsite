"use client";

import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { BlogCard } from "../blog/page";
import { BookOpen } from "lucide-react";

const EDUCATION_STREAMS = {
  COURSES: { slug: "course", title: "Courses" },
  WORKSHOPS: { slug: "workshop", title: "Workshops" },
};

const EducationPage = observer(() => {
  const [postsByStream, setPostsByStream] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

        const results = await Promise.allSettled(fetchPromises);
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

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-4xl font-bold mb-8">Education</h1>
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Try again
          </Button>
        </div>
      </div>
    );
  }

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

      <Tabs defaultValue={EDUCATION_STREAMS.COURSES.slug} className="w-full">
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

export default EducationPage;
