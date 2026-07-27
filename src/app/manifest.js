import { DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export default function manifest() {
  return {
    name: SITE_NAME,
    short_name: "GO",
    description: DEFAULT_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#050505",
    theme_color: "#CA2280",
    icons: [
      {
        src: "/galactic-omnivore-skull-v1-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/galactic-omnivore-skull-v1-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
