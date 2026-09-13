const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: 'omnivore.spec.js',
  fullyParallel: false,
  workers: 1,
  timeout: 90000,
  reporter: 'line',
  outputDir: '.playwright-artifacts/omnivore',
  use: { baseURL: process.env.GO_LAB_URL || 'http://127.0.0.1:3000', channel: 'chrome', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
});
