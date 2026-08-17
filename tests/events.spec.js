const { expect, test } = require("@playwright/test");

test.describe("GO Events", () => {
  test("renders the public events experience and calendar fallback", async ({
    page,
  }) => {
    await page.goto("/events", { waitUntil: "domcontentloaded" });

    await expect(
      page.locator(
        '[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay'
      )
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: /find your next signal/i })
    ).toBeVisible();
    await expect(
      page.getByTitle("Galactic Omnivore public events calendar")
    ).toHaveAttribute("src", /c_88d101e79fcb82feaf12a56b3c6812f93a926230fa9976b6438b8aa54115ec2a/);
    await expect(
      page.getByRole("link", { name: /subscribe to go calendar/i })
    ).toHaveAttribute("href", /Y184OGQxMDFlNzlmY2I4MmZlYWYxMmE1NmIzYzY4MTJmOTNhOTI2MjMwZmE5OTc2YjY0MzhiOGFhNTQxMTVlYzJh/);
    await expect(
      page.getByRole("link", { name: /schedule a call/i }).first()
    ).toHaveAttribute("href", "https://calendar.app.google/Ge6GvfiaaaMhAHHf6");
  });

  test("exposes GO Events through the Community route directory", async ({
    page,
  }) => {
    await page.goto("/community", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", {
        name: /everything go provides for the game-development journey/i,
      })
    ).toBeVisible();
    await expect(
      page.locator("#events").getByRole("link", { name: /explore events/i })
    ).toHaveAttribute("href", "/events");
  });
});
