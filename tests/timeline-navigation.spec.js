const { test, expect } = require("@playwright/test");

const entries = Array.from({ length: 6 }, (_, index) => ({
  id: `event-${index + 1}`,
  title: `Timeline entry ${index + 1}`,
  date: `202${index}-01-01`,
  category: index === 0 ? "event" : "project",
  state: "completed",
  description: `Details for event ${index + 1}`,
  organization: "GO partner",
}));

test.beforeEach(async ({ page }) => {
  await page.route("**/api/community-timeline", (route) => route.fulfill({ json: { entries } }));
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("shows all entries and supports buttons, keyboard, filters and direct links", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/timeline");
  const strip = page.locator("#timeline-entries");
  await expect(strip.locator("li")).toHaveCount(6);
  await expect(page.getByText("6 entries", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Scroll to later timeline entries" }).click();
  await expect.poll(() => strip.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  const firstScroll = await strip.evaluate((element) => element.scrollLeft);
  await strip.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => strip.evaluate((element) => element.scrollLeft)).toBeGreaterThan(firstScroll);
  await page.getByText("Filter timeline", { exact: true }).click();
  await page.getByLabel("Category").selectOption("event");
  await expect(strip.locator("li")).toHaveCount(1);
  await page.getByLabel("Category").selectOption("");
  await page.goto("/timeline#event-5");
  await page.reload();
  await expect(strip.locator("#event-5")).toBeInViewport();
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
});

test("fits desktop and shows a useful empty state", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/timeline");
  await expect(page.locator("#timeline-entries li")).toHaveCount(6);
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 1440);
  await page.route("**/api/community-timeline", (route) => route.fulfill({ json: { entries: [] } }));
  await page.reload();
  await expect(page.getByText("No timeline entries have been published yet.", { exact: false })).toBeVisible();
});
