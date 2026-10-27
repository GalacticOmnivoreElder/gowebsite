const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  testMatch: "matchmaking.spec.js",
  reporter: "line",
  outputDir: ".playwright-artifacts/matchmaking",
  use: { baseURL: "http://127.0.0.1:3104", channel: "chrome", colorScheme: "dark" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
    { name: "mobile", use: { ...devices["Pixel 7"], channel: "chrome" } },
  ],
  webServer: {
    command: "node ./node_modules/next/dist/bin/next dev -H 127.0.0.1 -p 3104",
    url: "http://127.0.0.1:3104",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      NEXT_PUBLIC_FIREBASE_API_KEY: "matchmaking-test-key",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "localhost",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-go-platform",
      NEXT_PUBLIC_FIREBASE_APP_ID: "1:123:web:matchmaking-test",
    },
  },
});
