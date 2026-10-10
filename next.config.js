const deploymentId =
  process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA;
const {
  assertProductionEnvironment,
} = require("./src/lib/production-env.cjs");

const isVercelProductionBuild =
  process.env.VERCEL === "1" &&
  ["1", "true"].includes(String(process.env.CI).toLowerCase()) &&
  process.env.VERCEL_ENV === "production";

if (
  isVercelProductionBuild ||
  process.env.GO_VALIDATE_PRODUCTION_ENV === "true"
) {
  assertProductionEnvironment(process.env);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(deploymentId ? { deploymentId } : {}),
  outputFileTracingRoot: __dirname,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), display-capture=(), geolocation=(), microphone=(), payment=(), usb=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", pathname: "/**" },
      { protocol: "https", hostname: "media.discordapp.net", pathname: "/**" },
      { protocol: "https", hostname: "assets.openai.com", pathname: "/**" },
      { protocol: "https", hostname: "cdn.midjourney.com", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/gho3c66o/image/upload/**",
      },
      { protocol: "https", hostname: "m.media-amazon.com", pathname: "/**" },
      {
        protocol: "https",
        hostname: "galacticomnivorecom.wordpress.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "bs-uploads.toptal.io",
        pathname: "/**",
      },
    ],
  },
};

module.exports = nextConfig;
