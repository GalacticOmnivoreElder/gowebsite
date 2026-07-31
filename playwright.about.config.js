const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  testMatch: "about-page.spec.js",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3000",
    channel: "chrome",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-1440",
      use: { viewport: { width: 1440, height: 1000 } },
    },
    {
      name: "desktop-1024",
      use: { viewport: { width: 1024, height: 900 } },
    },
    {
      name: "tablet-768",
      use: { viewport: { width: 768, height: 1024 } },
    },
    {
      name: "mobile-390",
      use: { viewport: { width: 390, height: 844 } },
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
