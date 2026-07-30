const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  testMatch: /(?:marquee-motion|landing-pillars)\.spec\.js/,
  fullyParallel: false,
  retries: 0,
  reporter: "line",
  outputDir: ".playwright-marquee-artifacts",
  use: {
    baseURL: "http://127.0.0.1:3000",
    channel: "chrome",
    colorScheme: "dark",
    locale: "en-US",
    reducedMotion: "no-preference",
  },
  projects: [
    {
      name: "desktop-chrome",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        viewport: { width: 1440, height: 1000 },
        reducedMotion: "no-preference",
      },
    },
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 7"],
        channel: "chrome",
        reducedMotion: "no-preference",
      },
    },
  ],
  webServer: {
    command:
      "node ./node_modules/next/dist/bin/next dev -H 127.0.0.1 -p 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
