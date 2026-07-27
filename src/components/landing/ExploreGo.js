"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Gamepad2,
  Newspaper,
  Users,
} from "lucide-react";
import he from "he";

import achievementImg2 from "@/assets/A2.png";
import gamesImg from "@/assets/A3.png";
import communityImg from "@/assets/joinus.png";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

/**
 * @typedef {Object} ExploreItem
 * @property {string} id
 * @property {string} tabLabel
 * @property {import("lucide-react").LucideIcon} icon
 * @property {string} eyebrow
 * @property {string} title
 * @property {string} description
 * @property {string[]} highlights
 * @property {string} href
 * @property {string} cta
 * @property {string | import("next/image").StaticImageData} image
 * @property {string} imageAlt
 * @property {string} imageLabel
 * @property {string} imagePosition
 */

/** @type {ExploreItem[]} */
const exploreItems = [
  {
    id: "blog",
    tabLabel: "Blog",
    icon: Newspaper,
    eyebrow: "Latest from the blog",
    title: "Ideas, lessons, and stories from the G.O. community",
    description:
      "Follow the people, projects, and practical discoveries shaping game development inside Galactic Omnivore.",
    highlights: ["Community stories", "Game-dev insights", "Project updates"],
    href: "/blog",
    cta: "Visit the blog",
    image: achievementImg2,
    imageAlt: "Galactic Omnivore community artwork",
    imageLabel: "Fresh from G.O.",
    imagePosition: "center",
  },
  {
    id: "games",
    tabLabel: "Games",
    icon: Gamepad2,
    eyebrow: "Community-made games",
    title: "Play what the community is creating",
    description:
      "Discover original digital and tabletop games built by G.O. creators, from early experiments to finished releases.",
    highlights: ["Original games", "Creator spotlights", "Playable projects"],
    href: "/games",
    cta: "Explore games",
    image: gamesImg,
    imageAlt: "A collection of printable tabletop games by G.O. creators",
    imageLabel: "Made in the community",
    imagePosition: "center",
  },
  {
    id: "resources",
    tabLabel: "Resources",
    icon: BookOpen,
    eyebrow: "Tools for game makers",
    title: "Learn, prototype, and build with G.O. resources",
    description:
      "Browse educational material, asset packs, source files, and practical tools made to move your next game forward.",
    highlights: ["Learning materials", "Asset packs", "Source files"],
    href: "/resources",
    cta: "Browse resources",
    image: "/g1/g1-mvp.gif",
    imageAlt: "Mrale the rat in the G.O. platformer prototype",
    imageLabel: "Built to help you create",
    imagePosition: "center",
  },
  {
    id: "membership",
    tabLabel: "Community",
    icon: Users,
    eyebrow: "Join Galactic Omnivore",
    title: "Meet collaborators. Build something real.",
    description:
      "Join a game-development community where learners, creators, and studios share skills, form teams, and bring ideas to life.",
    highlights: ["Meet collaborators", "Join projects", "Grow your skills"],
    href: "/membership",
    cta: "Explore membership",
    image: communityImg,
    imageAlt: "Galactic Omnivore community illustration",
    imageLabel: "Create together",
    imagePosition: "center",
  },
];

const getPlainText = (value) =>
  he
    .decode((value || "").replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

export const ExploreGo = () => {
  const [latestPost, setLatestPost] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadLatestPost = async () => {
      try {
        const response = await fetch("/api/wordpress?category=blog", {
          signal: controller.signal,
        });

        if (!response.ok) return;

        const posts = await response.json();
        if (Array.isArray(posts) && posts.length > 0) {
          setLatestPost(posts[0]);
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Unable to load the latest blog post:", error);
        }
      }
    };

    loadLatestPost();

    return () => controller.abort();
  }, []);

  const items = exploreItems.map((item) => {
    if (item.id !== "blog" || !latestPost) return item;

    const excerpt = getPlainText(latestPost.excerpt);

    return {
      ...item,
      title: getPlainText(latestPost.title) || item.title,
      description: excerpt || item.description,
      href: `/blog/${latestPost.slug}`,
      cta: "Read the latest post",
      image: latestPost.thumbnail || item.image,
      imageAlt: getPlainText(latestPost.title) || item.imageAlt,
      imageLabel: latestPost.date || item.imageLabel,
    };
  });

  return (
    <section
      aria-labelledby="explore-go-heading"
      className="border-y border-white/10 bg-black py-14 text-white md:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <div className="grid gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(20rem,1fr)] md:items-end md:gap-12">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-primary">
              Find your way in
            </p>
            <h2
              id="explore-go-heading"
              className="text-4xl font-bold tracking-tight sm:text-5xl"
            >
              EXPLORE G.O.
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-relaxed text-white/65 md:text-lg">
            Step inside Galactic Omnivore&mdash;read the latest stories, play
            community-made games, find tools for your next project, or meet the
            people building alongside you.
          </p>
        </div>

        <Tabs defaultValue="blog" className="mt-9 md:mt-12">
          <TabsList
            aria-label="Explore Galactic Omnivore"
            className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-white/15 bg-transparent p-0"
          >
            {items.map(({ id, tabLabel, icon: Icon }) => (
              <TabsTrigger
                key={id}
                value={id}
                className="group relative min-h-12 flex-1 gap-2 rounded-none border-b-2 border-transparent px-4 py-3 text-white/55 shadow-none transition-colors hover:text-white focus-visible:ring-primary focus-visible:ring-offset-0 data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-white data-[state=active]:shadow-none sm:min-w-32 sm:flex-none motion-reduce:transition-none"
              >
                <Icon
                  aria-hidden="true"
                  className="h-4 w-4 text-white/45 transition-colors group-data-[state=active]:text-primary motion-reduce:transition-none"
                />
                {tabLabel}
              </TabsTrigger>
            ))}
          </TabsList>

          {items.map((item, index) => (
            <TabsContent
              key={item.id}
              value={item.id}
              className="mt-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-500 motion-reduce:animate-none md:mt-8"
            >
              <div className="grid overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl shadow-black/30 lg:min-h-[31rem] lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
                <div className="order-2 flex flex-col justify-center p-6 sm:p-9 lg:order-1 lg:p-12">
                  <Badge className="mb-5 w-fit border-primary/30 bg-primary/10 text-primary hover:bg-primary/10">
                    {item.eyebrow}
                  </Badge>
                  <h3 className="max-w-xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                    {item.title}
                  </h3>
                  <p className="mt-5 max-w-xl text-base leading-relaxed text-white/65 sm:text-lg">
                    {item.description}
                  </p>

                  <ul
                    aria-label={`${item.tabLabel} highlights`}
                    className="mt-6 flex flex-wrap gap-2"
                  >
                    {item.highlights.map((highlight) => (
                      <li
                        key={highlight}
                        className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs font-medium text-white/70"
                      >
                        {highlight}
                      </li>
                    ))}
                  </ul>

                  <Button asChild size="lg" className="mt-8 w-fit">
                    <Link href={item.href}>
                      {item.cta}
                      <ArrowRight
                        aria-hidden="true"
                        className="ml-2 h-4 w-4"
                      />
                    </Link>
                  </Button>
                </div>

                <Link
                  href={item.href}
                  aria-label={`${item.cta}: ${item.title}`}
                  className="group relative order-1 min-h-72 overflow-hidden bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary lg:order-2 lg:min-h-full"
                >
                  <Image
                    src={item.image}
                    alt={item.imageAlt}
                    fill
                    sizes="(min-width: 1024px) 55vw, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.025] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    style={{ objectPosition: item.imagePosition }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-transparent" />
                  <div className="absolute left-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/55 text-xs font-semibold tabular-nums backdrop-blur-sm">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div className="absolute inset-x-5 bottom-5 flex items-center justify-between gap-4">
                    <p className="text-sm font-medium text-white">
                      {item.imageLabel}
                    </p>
                    <ArrowRight
                      aria-hidden="true"
                      className="h-5 w-5 shrink-0 text-primary transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                    />
                  </div>
                </Link>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
};
