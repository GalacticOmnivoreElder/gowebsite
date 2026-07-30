import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Community Games",
  description:
    "Review games and playable work listed by Galactic Omnivore, with project details and creator credit.",
  path: "/games",
});

export default function GamesLayout({ children }) {
  return children;
}
