"use client";
import React, { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Video,
  Package,
  Workflow,
  Search,
  Download,
  Eye,
} from "lucide-react";

// Dummy Data for Media Items
const mediaData = [
  {
    id: 1,
    type: "video",
    title: "Intro to Game Design Principles",
    description: "Learn the fundamentals of engaging game design.",
    link: "#",
    thumbnail: "/placeholder.png",
  },
  {
    id: 2,
    type: "video",
    title: "Unity Basics Tutorial",
    description: "Getting started with the Unity game engine.",
    link: "#",
    thumbnail: "/placeholder.png",
  },
  {
    id: 3,
    type: "book",
    title: "The Art of Game Design: A Book of Lenses",
    description: "A highly recommended read for aspiring designers.",
    link: "#",
    thumbnail: "/placeholder.png",
  },
  {
    id: 4,
    type: "asset pack",
    title: "Pixel Art Starter Kit",
    description: "Essential sprites and tiles for your retro game.",
    link: "#",
    thumbnail: "/placeholder.png",
  },
  {
    id: 5,
    type: "pipeline",
    title: "Agile Development Workflow",
    description: "Example pipeline for managing game projects.",
    link: "#",
    thumbnail: "/placeholder.png",
  },
  {
    id: 6,
    type: "video",
    title: "Advanced Shader Techniques",
    description: "Creating stunning visual effects with shaders.",
    link: "#",
    thumbnail: "/placeholder.png",
  },
  {
    id: 7,
    type: "book",
    title: "Game Programming Patterns",
    description: "Effective patterns for structuring game code.",
    link: "#",
    thumbnail: "/placeholder.png",
  },
  {
    id: 8,
    type: "asset pack",
    title: "Sci-Fi UI Elements",
    description: "Futuristic UI components for your game interface.",
    link: "#",
    thumbnail: "/placeholder.png",
  },
  {
    id: 9,
    type: "asset pack",
    title: "Fantasy Environment Props",
    description: "Models for building immersive fantasy worlds.",
    link: "#",
    thumbnail: "/placeholder.png",
  },
];

const typeFilters = [
  { label: "All", value: "all", icon: null },
  { label: "Videos", value: "video", icon: Video },
  { label: "Books", value: "book", icon: BookOpen },
  { label: "Asset Packs", value: "asset pack", icon: Package },
  { label: "Pipelines", value: "pipeline", icon: Workflow },
];

// Media Item Card Component
const MediaItemCard = ({ item }) => {
  const TypeIcon =
    typeFilters.find((f) => f.value === item.type)?.icon || Package;
  return (
    <Card className="overflow-hidden h-full flex flex-col">
      <CardHeader className="p-0">
        <div className="relative aspect-video">
          <Image
            src={item.thumbnail}
            alt={item.title}
            fill
            className="object-cover"
          />
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <Badge variant="secondary" className="mb-2 capitalize">
          <TypeIcon className="h-3 w-3 mr-1" />
          {item.type}
        </Badge>
        <CardTitle className="text-lg mb-1 line-clamp-2">
          {item.title}
        </CardTitle>
        <CardDescription className="text-sm line-clamp-3">
          {item.description}
        </CardDescription>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button asChild size="sm" className="w-full">
          {/* Link needs to go somewhere meaningful */}
          <Link href={item.link} target="_blank" rel="noopener noreferrer">
            {item.type === "video" || item.type === "book"
              ? "View"
              : "Download"}
            {item.type === "video" || item.type === "book" ? (
              <Eye className="ml-2 h-4 w-4" />
            ) : (
              <Download className="ml-2 h-4 w-4" />
            )}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

// Media Library Page Component
export default function MediaLibraryPage() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const mediaLibraryAvailable =
    process.env.NEXT_PUBLIC_MEDIA_LIBRARY_ENABLED === "true";

  const filteredMedia = useMemo(() => {
    return mediaData.filter((item) => {
      const matchesFilter =
        activeFilter === "all" || item.type === activeFilter;
      const matchesSearch =
        searchTerm === "" ||
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, searchTerm]);

  if (!mediaLibraryAvailable) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-4xl font-bold">Planned media library</h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          This route is not available yet. When it opens, each item should state
          its source, usage terms, format, and access requirements.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/resources">Back to resources</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 md:py-16">
      <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center">
        Media Library
      </h1>
      <p className="text-xl text-muted-foreground text-center mb-8 md:mb-12 max-w-3xl mx-auto">
        Browse videos, books, asset packs, and workflow examples shared by the
        community.
      </p>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 md:mb-12">
        {/* Type Filters */}
        <div className="flex flex-wrap gap-2">
          {typeFilters.map((filter) => {
            const Icon = filter.icon;
            return (
              <Button
                key={filter.value}
                variant={activeFilter === filter.value ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter(filter.value)}
              >
                {Icon && <Icon className="mr-2 h-4 w-4" />}
                {filter.label}
              </Button>
            );
          })}
        </div>
        {/* Search Input */}
        <div className="relative md:ml-auto md:w-1/3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search media..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Media Grid */}
      {filteredMedia.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredMedia.map((item) => (
            <MediaItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-xl mb-4">No media found matching your criteria.</p>
          <p className="text-muted-foreground">
            Try adjusting your filters or search term.
          </p>
        </div>
      )}
    </div>
  );
}
