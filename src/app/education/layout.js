import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Game Development Education",
  description:
    "Find Galactic Omnivore courses, workshops, tutorials, and practical learning resources for game developers, artists, designers, and students.",
  path: "/education",
});

export default function EducationLayout({ children }) {
  return children;
}
