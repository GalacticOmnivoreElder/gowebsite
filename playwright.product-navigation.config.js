const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  testMatch: "product-navigation.spec.js",
  fullyParallel: false,
  retries: 0,
  reporter: "line",
  outputDir: ".playwright-product-navigation",
  use: {
    baseURL: "http://127.0.0.1:3027",
    channel: "chrome",
    colorScheme: "dark",
    locale: "en-US",
    reducedMotion: "reduce",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-chrome",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 7"],
        channel: "chrome",
      },
    },
  ],
  webServer: {
    command:
      "node ./node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3027",
    url: "http://127.0.0.1:3027",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
