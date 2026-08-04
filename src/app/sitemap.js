import { SITE_URL, getWordPressPostsForSitemap } from "@/lib/seo";
import { getProductConfig } from "@/lib/product-config";

const staticRoutes = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/about", priority: 0.8, changeFrequency: "monthly" },
  { path: "/blog", priority: 0.7, changeFrequency: "weekly" },
  { path: "/contact", priority: 0.6, changeFrequency: "monthly" },
  { path: "/education", priority: 0.8, changeFrequency: "weekly" },
  { path: "/faq", priority: 0.6, changeFrequency: "monthly" },
  { path: "/games", priority: 0.7, changeFrequency: "weekly" },
  { path: "/membership", priority: 0.8, changeFrequency: "monthly" },
  { path: "/matchmaking", priority: 0.8, changeFrequency: "monthly" },
  { path: "/projects", priority: 0.8, changeFrequency: "daily" },
  { path: "/resources", priority: 0.8, changeFrequency: "weekly" },
  { path: "/community", priority: 0.7, changeFrequency: "weekly" },
  { path: "/video-bundles", priority: 0.5, changeFrequency: "monthly" },
];

export default async function sitemap() {
  const now = new Date();
  const posts = await getWordPressPostsForSitemap();
  const config = getProductConfig();
  let routes = config.featureFlags.mentorDirectory
    ? [...staticRoutes, { path: "/mentors", priority: 0.7, changeFrequency: "weekly" }]
    : staticRoutes;
  if (config.featureFlags.communityAssetSubmissions) {
    routes = [...routes, { path: "/asset-packs", priority: 0.6, changeFrequency: "weekly" }];
  }

  return [
    ...routes.map((route) => ({
      url: `${SITE_URL}${route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...posts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.modified_gmt || post.date_gmt || now),
      changeFrequency: "monthly",
      priority: 0.6,
    })),
  ];
}
