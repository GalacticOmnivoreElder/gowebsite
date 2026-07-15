const deploymentId =
  process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA;

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(deploymentId ? { deploymentId } : {}),
  images: {
    domains: [
      "localhost",
      "media.discordapp.net",
      "assets.openai.com",
      "cdn.midjourney.com",
      "images.unsplash.com",
      "firebasestorage.googleapis.com",
      "m.media-amazon.com",
      "galacticomnivorecom.wordpress.com",
      "plus.unsplash.com",
      "bs-uploads.toptal.io",
    ],
  },
};

module.exports = nextConfig;
