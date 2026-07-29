const { expect, test } = require("@playwright/test");

const routes = [
  { name: "home", path: "/" },
  { name: "membership", path: "/membership" },
  { name: "projects", path: "/projects" },
  { name: "profile-auth-boundary", path: "/profile" },
  { name: "passport-auth-boundary", path: "/profile/cv" },
  { name: "admin-auth-boundary", path: "/admin" },
  { name: "billing-auth-boundary", path: "/billing" },
];

for (const route of routes) {
  test(`${route.name} visual smoke`, async ({ page }, testInfo) => {
    await page.goto(route.path, { waitUntil: "domcontentloaded" });
    await expect(
      page.locator(
        '[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay'
      )
    ).toHaveCount(0);
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          caret-color: transparent !important;
          transition: none !important;
        }
      `,
    });
    await page.waitForTimeout(750);
    await page.evaluate(() => {
      document.querySelectorAll("nextjs-portal").forEach((portal) => {
        portal.style.setProperty("visibility", "hidden", "important");
        if (!portal.shadowRoot) return;
        const style = document.createElement("style");
        style.textContent =
          ".nextjs-toast, [data-next-badge-root] { display: none !important; visibility: hidden !important; }";
        portal.shadowRoot.append(style);
      });
    });
    await expect(page.locator("body")).toBeVisible();
    await expect(page).toHaveScreenshot(`${route.name}.png`, {
      animations: "disabled",
      fullPage: false,
      maxDiffPixelRatio: 0.02,
    });

    if (route.name.endsWith("auth-boundary")) {
      expect(
        page.url().includes("/login") ||
          page.url().includes(route.path)
      ).toBeTruthy();
    }

    await testInfo.attach("url", {
      body: page.url(),
      contentType: "text/plain",
    });
  });
}
