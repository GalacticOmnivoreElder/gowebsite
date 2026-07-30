import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Game Development Projects",
  description:
    "Review approved Galactic Omnivore project briefs, open roles, terms, and current status.",
  path: "/projects",
});

export default function ProjectsLayout({ children }) {
  return children;
}
