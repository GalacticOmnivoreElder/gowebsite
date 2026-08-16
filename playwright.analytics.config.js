const { defineConfig, devices } = require("@playwright/test");

// Analytics tests must never send telemetry to a real property.
process.env.NEXT_PUBLIC_ANALYTICS_ENABLED = "false";

module.exports = defineConfig({
  testDir: "./tests",
  testMatch: "analytics-spy.spec.js",
  fullyParallel: false,
  retries: 0,
  reporter: "line",
  outputDir: ".playwright-analytics-artifacts",
  use: {
    baseURL: "http://127.0.0.1:3031",
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
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
  webServer: {
    command:
      "node ./node_modules/next/dist/bin/next dev -H 127.0.0.1 -p 3031",
    url: "http://127.0.0.1:3031",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
