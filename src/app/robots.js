import { SITE_URL } from "@/lib/seo";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/billing/",
          "/checkout/",
          "/dashboard/",
          "/login",
          "/onboarding",
          "/profile",
          "/reset-password",
          "/signup",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
