"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FaExclamationTriangle } from "react-icons/fa";
import Logger from "@/utils/logger"; // Assuming Logger utility exists
import { LandingTestimonials } from "@/components/landing/LandingTestimonials";
import { FullCTA } from "@/components/landing/FullCTA";

const logger = new Logger({ debugEnabled: true });

const CATEGORIES = {
  OPEN_CALLS: { slug: "open-calls", title: "Open Calls" },
  REAL_PROJECTS: { slug: "real-projects", title: "Real Projects" },
  LOOKING_FOR_JOB: { slug: "looking-for-job", title: "Looking for Job" },
  TALENT_SEEK: { slug: "talent-seek", title: "Talent Seek" },
};

// Reusable component to fetch and display posts for a category
const CategoryPosts = ({ categorySlug, categoryTitle }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      setError(null);
      logger.debug(`Fetching posts for category: ${categorySlug}`);
      try {
        // Using POST request as potentially done in other parts of the app
        // Or switch to GET: /api/wordpress?category=${categorySlug}
        const response = await fetch("/api/wordpress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category: categorySlug }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.details || `HTTP error! status: ${response.status}`
          );
        }
        const data = await response.json();
        logger.debug(`Posts fetched for ${categorySlug}:`, data);
        setPosts(data);
      } catch (err) {
        logger.error(`Error fetching posts for ${categorySlug}:`, err);
        setError(err.message || `Failed to fetch posts for ${categoryTitle}.`);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [categorySlug, categoryTitle]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <FaExclamationTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (posts.length === 0) {
    return (
      <p className="text-muted-foreground">
        No {categoryTitle.toLowerCase()} found currently.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {posts.map((post) => (
        <Link key={post.id} href={`/blog/${post.slug}`} passHref>
          <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer h-full flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg leading-tight">
                {post.title}
              </CardTitle>
              {post.categories && post.categories.length > 0 && (
                <div className="mt-2">
                  {/* Filter out the main category slug itself from badges if desired */}
                  {post.categories
                    .filter(
                      (cat) => cat.toLowerCase() !== categoryTitle.toLowerCase()
                    )
                    .map((cat) => (
                      <Badge
                        key={cat}
                        variant="secondary"
                        className="mr-1 mb-1"
                      >
                        {cat}
                      </Badge>
                    ))}
                </div>
              )}
            </CardHeader>
            <CardContent className="flex-grow">
              {/* Optional: Add excerpt or other info */}
              {/* <p className="text-sm text-muted-foreground line-clamp-3" dangerouslySetInnerHTML={{ __html: post.excerpt }}></p> */}
            </CardContent>
            {/* Optional Footer with date? */}
            {/* <CardFooter><p className="text-xs text-muted-foreground">{post.date}</p></CardFooter> */}
          </Card>
        </Link>
      ))}
    </div>
  );
};

// Main Page Component
const InitiativesPage = () => {
  const faqItems = [
    {
      question: "What kind of initiatives are listed here?",
      answer:
        "This section features various opportunities including open calls for collaborations, real-world projects seeking participants, job openings, and individuals seeking talent.",
    },
    {
      question: "How can I post my own initiative?",
      answer:
        "Currently, posting is managed by administrators. Please contact us if you have an initiative you'd like to feature.",
    },
    {
      question: "How often is this section updated?",
      answer:
        "We aim to update the listings regularly as new opportunities arise. Check back often!",
    },
    {
      question: "Is there a cost to participate?",
      answer:
        "Participation details vary by initiative. Please refer to the specific post for information on any costs, requirements, or compensation.",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Page Header */}
      <h1 className="text-4xl font-bold text-center mb-6">
        Community Initiatives
      </h1>
      <p className="text-xl text-muted-foreground text-center mb-12">
        Connect, collaborate, and grow with opportunities from the community.
      </p>

      {/* Summary Section */}
      <section className="mb-16 bg-muted p-8 rounded-lg shadow">
        <h2 className="text-2xl font-semibold mb-4 text-center">
          Project Hub Summary
        </h2>
        <p className="text-muted-foreground text-center max-w-3xl mx-auto">
          Explore a dynamic range of activities within our community. From past
          successful collaborations to ongoing projects seeking contributors,
          and upcoming opportunities to get involved. This is your central hub
          for finding projects, job openings, talent, and calls for
          participation.
        </p>
      </section>

      {/* Tabs Section */}
      <section className="mb-16">
        <Tabs defaultValue={CATEGORIES.OPEN_CALLS.slug} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto mb-6">
            {Object.values(CATEGORIES).map((cat) => (
              <TabsTrigger
                key={cat.slug}
                value={cat.slug}
                className="py-2 px-1 text-center"
              >
                {cat.title}
              </TabsTrigger>
            ))}
          </TabsList>
          {Object.values(CATEGORIES).map((cat) => (
            <TabsContent key={cat.slug} value={cat.slug}>
              <CategoryPosts
                categorySlug={cat.slug}
                categoryTitle={cat.title}
              />
            </TabsContent>
          ))}
        </Tabs>
      </section>

      {/* FAQ Section */}
      <section>
        <h2 className="text-3xl font-semibold text-center mb-8">
          Questions and Answers
        </h2>
        <Accordion
          type="single"
          collapsible
          className="w-full max-w-3xl mx-auto"
        >
          {faqItems.map((item, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-lg text-left">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
      <LandingTestimonials />
      <FullCTA />
    </div>
  );
};

export default InitiativesPage;
