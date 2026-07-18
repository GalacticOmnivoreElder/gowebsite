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
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/logos/logo9.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
