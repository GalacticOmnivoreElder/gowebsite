const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "./tests",
  testMatch: "timeline-navigation.spec.js",
  timeout: 30000,
  use: { baseURL: "http://localhost:3137", channel: "chrome" },
});
