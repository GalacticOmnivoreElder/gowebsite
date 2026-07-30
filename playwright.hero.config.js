const { defineConfig } = require("@playwright/test");

const chromeProject = (name, width, height) => ({
  name,
  use: {
    channel: "chrome",
    viewport: { width, height },
  },
});

module.exports = defineConfig({
  testDir: "./tests",
  testMatch: /landing-(?:hero|about)\.spec\.js/,
  fullyParallel: false,
  retries: 0,
  reporter: "line",
  outputDir: ".playwright-hero-artifacts",
  use: {
    baseURL: "http://127.0.0.1:3000",
    channel: "chrome",
    colorScheme: "dark",
    locale: "en-US",
    reducedMotion: "no-preference",
  },
  projects: [
    chromeProject("desktop-1440", 1440, 1000),
    chromeProject("desktop-1024", 1024, 768),
    chromeProject("tablet-768", 768, 1024),
    chromeProject("mobile-390", 390, 844),
  ],
  webServer: {
    command:
      "node ./node_modules/next/dist/bin/next dev -H 127.0.0.1 -p 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
