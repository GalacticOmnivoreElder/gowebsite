import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Game Dev Blog",
  description:
    "Read Galactic Omnivore articles, tutorials, project stories, and game development insights from Macedonia's game dev community.",
  path: "/blog",
});

export default function BlogLayout({ children }) {
  return children;
}
