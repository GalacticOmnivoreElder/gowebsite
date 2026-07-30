import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Signal",
  description:
    "Read practical notes, project updates, and lessons from Galactic Omnivore.",
  path: "/blog",
});

export default function BlogLayout({ children }) {
  return children;
}
