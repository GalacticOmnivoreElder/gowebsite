import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Game Development Education",
  description:
    "Review current Galactic Omnivore courses, workshops, and practical learning material.",
  path: "/education",
});

export default function EducationLayout({ children }) {
  return children;
}
