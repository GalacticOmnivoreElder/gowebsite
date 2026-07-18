import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Community Games",
  description:
    "Explore games created by the Galactic Omnivore team and community, including releases, prototypes, and featured projects.",
  path: "/games",
});

export default function GamesLayout({ children }) {
  return children;
}
