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
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /subscribe to go calendar/i })
    ).toHaveAttribute("href", /calendar\.google\.com/);
    await expect(
      page.getByRole("link", { name: /schedule a call/i }).first()
    ).toHaveAttribute("href", "https://calendar.app.google/Ge6GvfiaaaMhAHHf6");
  });

  test("exposes GO Events from the homepage and primary navigation", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("link", { name: /explore go events/i })
    ).toBeVisible();
    const desktopEventsLink = page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", { name: "Events" });

    if (await desktopEventsLink.isVisible()) {
      await expect(desktopEventsLink).toBeVisible();
      return;
    }

    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(
      page
        .getByRole("navigation", { name: "Mobile navigation" })
        .getByRole("link", { name: "Events" })
    ).toBeVisible();
  });
});
