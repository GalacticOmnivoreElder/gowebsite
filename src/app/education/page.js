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
              "Failed to load education posts.";
          }
        });

        setPostsByStream(nextPostsByStream);

        if (fetchError) {
          setError(fetchError);
        }
      } catch (error) {
        console.error("Error fetching education posts:", error);
        setError("Failed to load education posts. Please try again later.");
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
            Try Again
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
          <p className="text-xl mb-3">No {streamTitle.toLowerCase()} found yet.</p>
          <p className="text-muted-foreground">
            Add the #{streamSlug} tag or category to WordPress posts to publish
            them here.
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
            Learn game development by building, testing, and improving real
            projects.
          </p>
          <p>
            Galactic Omnivore Education is where we collect our courses,
            workshops, learning programs, and practical resources for game
            developers, artists, designers, writers, producers, and students.
          </p>
          <p>
            Here you can discover upcoming learning opportunities, follow
            community workshops, and access practical material created to help
            you move from curiosity to playable projects.
          </p>
          <p>
            Whether you are starting your first game, improving your portfolio,
            or preparing to work with a team, this page will help you find the
            right next step.
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
