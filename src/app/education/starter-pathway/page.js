import Link from "next/link";
import StarterPathway from "@/components/omnivore/StarterPathway";
import { LearningCategoryNav } from "@/components/learning/LearningCategoryNav";
import { createMetadata } from "@/lib/seo";
import { learningCatalog } from "@/content/evergreen-curriculum.mjs";

export const metadata = createMetadata({
  title: learningCatalog.starterPathway.title,
  description: "Learn the logic of making games in six practical steps. No specific tool or engine required. Your first step is free.",
  path: "/education/starter-pathway",
});

export default function StarterCoursePage() {
  return (
    <main className="container mx-auto max-w-6xl px-4 py-12 md:py-16">
      <Link href="/education" className="text-primary underline underline-offset-4">Back to courses</Link>
      <h1 className="my-6 text-3xl font-bold md:text-4xl">{learningCatalog.starterPathway.title}</h1>
      <LearningCategoryNav activeItem="Courses" className="mb-10" />
      <StarterPathway />
    </main>
  );
}
