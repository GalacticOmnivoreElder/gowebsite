"use client";

import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import {
  CalendarDays,
  Clock,
  User,
  Tag,
  ChevronLeft,
  Twitter,
  Facebook,
  Linkedin,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/reusable-ui/LoadingSpinner";
import MobxStore from "@/mobx";
import Image from "next/image";
import DOMPurify from "dompurify";
import { marked } from "marked";
import he from "he"; // HTML entity decoder

const BlogPost = observer(() => {
  const { slug } = useParams();
  const [readingProgress, setReadingProgress] = useState(0);

  useEffect(() => {
    MobxStore.fetchBlogDetails(slug);

    // Reading progress calculation
    const calculateReadingProgress = () => {
      const element = document.documentElement;
      const percentageScrolled =
        (element.scrollTop / (element.scrollHeight - element.clientHeight)) *
        100;
      setReadingProgress(Math.min(percentageScrolled, 100));
    };

    window.addEventListener("scroll", calculateReadingProgress);
    return () => window.removeEventListener("scroll", calculateReadingProgress);
  }, [slug]);

  const handleShare = (platform) => {
    const url = window.location.href;
    const title = MobxStore.blogDetails.get(slug)?.title || "Blog Post";

    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        title
      )}&url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        url
      )}`,
      linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(
        url
      )}&title=${encodeURIComponent(title)}`,
    };

    window.open(shareUrls[platform], "_blank", "width=600,height=400");
  };

  if (MobxStore.isBlogDetailsLoading(slug)) {
    return <LoadingSpinner />;
  }

  const post = MobxStore.blogDetails.get(slug);
  if (!post) return <div>Post not found</div>;

  // Calculate read time
  const wordCount = post.content.split(" ").length;
  const readTime = Math.ceil(wordCount / 200);

  const formatContent = (content) => {
    // Since content is already cleaned in the API, we just need to sanitize it
    const sanitizedContent = DOMPurify.sanitize(content, {
      ADD_TAGS: ["img", "iframe", "figure", "figcaption"],
      ADD_ATTR: ["src", "alt", "width", "height", "class"],
    });

    return sanitizedContent;
  };

  // Format the title
  const formattedTitle = he.decode(post.title);

  return (
    <>
      {/* Reading Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-muted z-50">
        <div
          className="h-full bg-primary transition-all duration-200"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      <article className="min-h-screen relative">
        {/* Hero Section */}
        <div className="relative h-[35vh] min-h-[350px] w-full">
          <div className="absolute inset-0">
            <Image
              src={
                post.thumbnail.startsWith("http")
                  ? post.thumbnail
                  : "/default-thumbnail.jpg"
              }
              alt={he.decode(post.title)}
              width={1920}
              height={1080}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
          </div>

          <div className="relative container mx-auto h-full flex items-end pb-12 px-4">
            <div className="max-w-3xl w-full">
              {/* Breadcrumbs */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                <Link
                  href="/blog"
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Blog
                </Link>
                <span>/</span>
                <span className="truncate">{he.decode(post.title)}</span>
              </div>

              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                {formattedTitle}
              </h1>

              <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Admin</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  <span>{post.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{readTime} min read</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Separator under hero */}
        <div className="w-full border-b border-border" />

        {/* Content Section */}
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto">
            {/* Categories */}
            <div className="flex flex-wrap gap-2 mb-8">
              {post.categories.map((category) => (
                <Badge
                  key={category}
                  variant="secondary"
                  className="bg-primary/10 text-primary hover:bg-primary/20"
                >
                  {category}
                </Badge>
              ))}
            </div>

            {/* Share buttons - Floating */}
            <div className="fixed left-[15%] top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-primary/10 hover:text-primary"
                onClick={() => handleShare("twitter")}
              >
                <Twitter className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-primary/10 hover:text-primary"
                onClick={() => handleShare("facebook")}
              >
                <Facebook className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-primary/10 hover:text-primary"
                onClick={() => handleShare("linkedin")}
              >
                <Linkedin className="h-5 w-5" />
              </Button>
            </div>

            {/* Main Content */}
            <div
              className="prose prose-lg dark:prose-invert max-w-none
                        prose-headings:text-foreground
                        prose-h1:mt-16 prose-h1:mb-8
                        prose-h2:mt-12 prose-h2:mb-6
                        prose-p:text-muted-foreground prose-p:my-4
                        prose-strong:text-foreground
                        prose-em:italic prose-em:text-foreground
                        prose-a:text-primary hover:prose-a:text-primary/80
                        prose-blockquote:border-primary
                        prose-hr:my-12 prose-hr:border-border
                        
                        /* Image and Figure Styling */
                        prose-figure:my-16                    /* Increased margin around figures */
                        [&_.wp-block-image]:my-16            /* Specific to WordPress image blocks */
                        prose-img:rounded-lg
                        [&_figure_img]:w-full                /* Make images full width */
                        [&_figure_img]:object-cover          /* Better image fitting */
                        [&_figure]:text-center               /* Center figure and captions */
                        [&_figcaption]:mt-4                  /* Space between image and caption */
                        [&_figcaption]:text-sm               /* Smaller caption text */
                        [&_figcaption]:text-muted-foreground /* Caption color */
                        
                        /* Other elements */
                        prose-ul:my-6 prose-ul:list-disc prose-ul:pl-6
                        prose-li:my-1
                        [&_.wp-block-separator]:my-12
                        [&_p]:leading-relaxed
                        [&_ul]:space-y-2
                        
                        /* Additional spacing for consecutive elements */
                        [&_figure+p]:mt-16                   /* Space after figure before paragraph */
                        [&_p+figure]:mt-16                   /* Space before figure after paragraph */
                        [&_figure+figure]:mt-16              /* Space between consecutive figures */"
              dangerouslySetInnerHTML={{
                __html: post.content,
              }}
            />

            {/* Mobile Share Section */}
            <div className="mt-12 flex flex-col items-center gap-4 lg:hidden">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Share2 className="h-4 w-4" />
                <span className="font-medium">Share this post</span>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-primary/10 hover:text-primary"
                  onClick={() => handleShare("twitter")}
                >
                  <Twitter className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-primary/10 hover:text-primary"
                  onClick={() => handleShare("facebook")}
                >
                  <Facebook className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-primary/10 hover:text-primary"
                  onClick={() => handleShare("linkedin")}
                >
                  <Linkedin className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </article>
    </>
  );
});

export default BlogPost;
