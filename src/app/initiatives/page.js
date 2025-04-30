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
import { BlogCard } from "../blog/page"; // Import BlogCard

const logger = new Logger({ debugEnabled: true });

const CATEGORIES = {
  OPEN_CALLS: { slug: "open-calls", title: "Open Calls" },
  REAL_PROJECTS: { slug: "real-projects", title: "Real Projects" },
  LOOKING_FOR_JOB: { slug: "looking-for-job", title: "Looking for Job" },
  TALENT_SEEK: { slug: "talent-seek", title: "Talent Seek" },
};

// Main Page Component
const InitiativesPage = () => {
  const [allPosts, setAllPosts] = useState({}); // Store posts keyed by category slug
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAllPosts = async () => {
      setLoading(true);
      setError(null);
      logger.debug("Fetching posts for all initiative categories...");
      try {
        const categorySlugs = Object.values(CATEGORIES).map((cat) => cat.slug);
        const fetchPromises = categorySlugs.map((slug) =>
          fetch("/api/wordpress", {
            // Using POST as before, but can switch to GET if API supports it well
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ category: slug }),
          }).then((res) => {
            if (!res.ok) {
              // Try to get details, but still throw a general error for the category
              return res
                .json()
                .catch(() => ({})) // Catch potential JSON parsing error
                .then((errorData) => {
                  throw new Error(
                    `HTTP error for ${slug}! Status: ${res.status}. Details: ${
                      errorData?.details || "N/A"
                    }`
                  );
                });
            }
            return res.json();
          })
        );

        const results = await Promise.allSettled(fetchPromises);

        const postsByCategory = {};
        let fetchError = null;

        results.forEach((result, index) => {
          const slug = categorySlugs[index];
          if (result.status === "fulfilled") {
            postsByCategory[slug] = result.value;
            logger.debug(
              `Successfully fetched posts for ${slug}:`,
              result.value.length
            );
          } else {
            logger.error(`Failed to fetch posts for ${slug}:`, result.reason);
            // Store the first error encountered
            if (!fetchError) {
              fetchError =
                result.reason.message || `Failed to fetch data for ${slug}.`;
            }
            postsByCategory[slug] = []; // Set empty array on error for this category
          }
        });

        setAllPosts(postsByCategory);

        if (fetchError) {
          setError(fetchError); // Set the overall error state if any fetch failed
        }
      } catch (err) {
        // Catch errors from Promise.allSettled setup or other unexpected issues
        logger.error("Unexpected error fetching all posts:", err);
        setError(
          err.message || "An unexpected error occurred while fetching posts."
        );
        // Ensure allPosts is an object even on catastrophic failure
        setAllPosts(
          Object.values(CATEGORIES).reduce((acc, cat) => {
            acc[cat.slug] = [];
            return acc;
          }, {})
        );
      } finally {
        setLoading(false);
        logger.debug("Finished fetching all posts.");
      }
    };

    fetchAllPosts();
  }, []); // Empty dependency array ensures this runs only once on mount

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

  // Helper to render content for a specific tab
  const renderTabContent = (categorySlug, categoryTitle) => {
    if (loading) {
      // Show skeleton loaders while initial fetch is in progress
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            // Use a skeleton structure similar to BlogCard
            <div key={i} className="space-y-3">
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

    const posts = allPosts[categorySlug] || [];

    if (posts.length === 0) {
      return (
        <p className="text-muted-foreground text-center py-8">
          No {categoryTitle.toLowerCase()} found currently.
        </p>
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

      {/* Error Alert Section */}
      {error && !loading && (
        <Alert variant="destructive" className="mb-8">
          <FaExclamationTriangle className="h-4 w-4" />
          <AlertTitle>Error Fetching Initiatives</AlertTitle>
          <AlertDescription>
            {error} Some categories might be unavailable. Please try refreshing
            the page later.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs Section */}
      <section className="mb-16">
        <Tabs defaultValue={CATEGORIES.OPEN_CALLS.slug} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto mb-6">
            {Object.values(CATEGORIES).map((cat) => (
              <TabsTrigger
                key={cat.slug}
                value={cat.slug}
                className="py-2 px-1 text-center data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" // Added active state styling
              >
                {cat.title}
              </TabsTrigger>
            ))}
          </TabsList>
          {Object.values(CATEGORIES).map((cat) => (
            <TabsContent key={cat.slug} value={cat.slug}>
              {renderTabContent(cat.slug, cat.title)}
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
