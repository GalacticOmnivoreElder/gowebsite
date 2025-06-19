/** @type {import('next').NextConfig} */
const nextConfig = {
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
    ],
  },
};

module.exports = nextConfig;
