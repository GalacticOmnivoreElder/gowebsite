import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Game Development Projects",
  description:
    "Discover community game development projects, open roles, collaboration opportunities, and portfolio-building work at Galactic Omnivore.",
  path: "/projects",
});

export default function ProjectsLayout({ children }) {
  return children;
}
