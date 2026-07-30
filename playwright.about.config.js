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
});
