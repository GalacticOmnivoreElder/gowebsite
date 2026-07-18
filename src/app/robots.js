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
          "/make-admin",
          "/onboarding",
          "/profile",
          "/reset-password",
          "/signup",
          "/test-polar",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
