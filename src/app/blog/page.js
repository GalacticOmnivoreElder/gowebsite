"use client";

import { observer } from "mobx-react-lite";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Clock, User } from "lucide-react";
import Link from "next/link";
import he from "he";
import { LoadingSpinner } from "@/reusable-ui/LoadingSpinner";
import Image from "next/image";

const BlogPage = observer(() => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/wordpress?category=blog");

        if (!response.ok) {
          throw new Error("Failed to fetch blogs");
        }

        const data = await response.json();
        setBlogs(data);
      } catch (error) {
        console.error("Error fetching blogs:", error);
        setError("Failed to load blogs. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-4xl font-bold mb-8">Blog</h1>
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const filteredPosts = blogs.filter((post) => {
    return post.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-4">Blog</h1>
      <p className="text-muted-foreground mb-8">
        Explore our latest articles, tutorials, and insights from the Galactic
        Omnivore team.
      </p>

      {/* Search Filter */}
      <div className="flex gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search posts..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Blog Grid */}
      {filteredPosts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-xl mb-4">No blog posts found.</p>
          <p className="text-muted-foreground">
            Check back soon for our latest articles!
          </p>
        </div>
      )}
    </div>
  );
});

export const BlogCard = ({ post }) => {
  // Calculate read time (rough estimate)
  const wordCount = post.content.split(" ").length;
  const readTime = Math.ceil(wordCount / 200);

  // Decode the title and excerpt
  const decodedTitle = he.decode(post.title);
  const decodedExcerpt = he.decode(post.excerpt);

  return (
    <Link href={`/blog/${post.slug}`} className="block">
      <Card className="overflow-hidden cursor-pointer transition-all hover:shadow-md">
        <div className="relative h-48 overflow-hidden">
          <Image
            src={post.thumbnail}
            alt={decodedTitle}
            width={500}
            height={500}
            className="object-cover w-full h-full transition-transform hover:scale-105"
          />
        </div>
        <CardHeader>
          <div className="flex gap-2 mb-2 flex-wrap">
            {post.categories.map((category) => (
              <span
                key={category}
                className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full"
              >
                {category}
              </span>
            ))}
          </div>
          <h2 className="text-xl font-semibold line-clamp-2">{decodedTitle}</h2>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{readTime} min read</span>
            </div>
            <div className="flex items-center gap-1">
              <span>{post.date}</span>
            </div>
          </div>
          <div
            className="line-clamp-3 text-sm text-muted-foreground prose prose-sm"
            dangerouslySetInnerHTML={{ __html: decodedExcerpt }}
          />
        </CardContent>
        <CardFooter>
          <Button className="w-full">Read More</Button>
        </CardFooter>
      </Card>
    </Link>
  );
};

export default BlogPage;
