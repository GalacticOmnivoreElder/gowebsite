const { expect, test } = require("@playwright/test");

test.describe("analytics safety", () => {
  test("analytics is disabled without explicit test configuration", async ({
    page,
  }) => {
    const thirdPartyRequests = [];
    page.on("request", (request) => {
      const url = request.url();
      if (url.includes("google-analytics.com") || url.includes("clarity.ms")) {
        thirdPartyRequests.push(url);
      }
    });

    await page.goto("/about");
    await expect(
      page.getByText("We use essential cookies to operate GO.")
    ).toBeVisible();
    await page.getByRole("button", { name: "Reject All" }).click();
    await page.goto("/community");

    expect(thirdPartyRequests).toEqual([]);
  });

  test("analytics consent can be reopened from the footer", async ({ page }) => {
    await page.goto("/about");
    await page.getByRole("button", { name: "Accept All" }).click();
    await expect(
      page.getByRole("button", { name: "Cookie settings" })
    ).toBeVisible();
    await page.getByRole("button", { name: "Cookie settings" }).click();
    await expect(page.getByRole("dialog")).toContainText("Analytics Cookies");
    await page.getByRole("button", { name: "Save Preferences" }).click();
  });
});
