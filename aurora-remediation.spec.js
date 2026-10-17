const { test, expect } = require("@playwright/test");

function contrastRatio(foreground, background) {
  const luminance = (color) => {
    const channels = color.match(/[\d.]+/g).slice(0, 3).map(Number).map((value) => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  );
}

test("project filters expose action-specific names", async ({ page }) => {
  await page.route("**/api/projects*", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ projects: [], hasMore: false, nextCursor: null }),
    })
  );

  await page.goto("/projects");

  for (const name of [
    "Filter projects by category",
    "Filter projects by type",
    "Filter projects by status",
    "Sort projects",
  ]) {
    await expect(page.getByRole("combobox", { name })).toBeVisible();
  }
});

test("public profile status decoration is hidden from assistive technology", async ({ page }) => {
  await page.route("**/api/user/aurora-profile-fixture", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        id: "aurora-profile-fixture",
        username: "Aurora QA",
        profilePrivacy: "public",
        isPrivate: false,
      }),
    })
  );
  await page.route("**/api/user/aurora-profile-fixture/projects", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ownerProjects: [],
        adminProjects: [],
        teamMemberProjects: [],
      }),
    })
  );

  await page.goto("/user/aurora-profile-fixture");

  await expect(page.getByRole("heading", { name: "Creator profile" })).toBeVisible();
  await expect(
    page.locator('.mission-hero .bottom-1[aria-hidden="true"]')
  ).toHaveCount(1);
  await expect(
    page.locator('.mission-hero .bottom-1[aria-label]')
  ).toHaveCount(0);
});

test("WordPress post content stays within a 375px viewport", async ({ page }) => {
  const longUrl = `https://example.test/${"unbroken-path-segment-".repeat(8)}`;
  const longCode = "constLongValue".repeat(35);
  const content = `
    <p class="wp-block-paragraph">Read more at <a href="${longUrl}">${longUrl}</a>.</p>
    <figure class="wp-block-embed"><iframe src="about:blank" width="900" height="506" title="Embedded video"></iframe></figure>
    <div class="wp-block-table"><table style="width:900px"><tbody><tr><td>Wide table content</td><td>Another column</td></tr></tbody></table></div>
    <pre><code>${longCode}</code></pre>
  `;

  await page.route("**/api/blog*", (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("slug") !== "aurora-mobile-fixture") return route.fallback();
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        title: "Responsive article fixture",
        content,
        thumbnail: "/placeholder.svg",
        date: "October 17, 2026",
        categories: [],
      }),
    });
  });
  await page.setViewportSize({ width: 375, height: 812 });

  await page.goto("/blog/aurora-mobile-fixture");
  await expect(page.locator(".wordpress-content")).toBeVisible();

  for (const width of [360, 375, 768, 1280]) {
    await page.setViewportSize({ width, height: 812 });
    const pageWidths = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth,
    }));
    expect(pageWidths.page).toBeLessThanOrEqual(pageWidths.viewport);
  }
  await expect(page.locator(".wp-block-table")).toHaveCSS("overflow-x", "auto");
  await expect(page.locator(".wordpress-content pre")).toHaveCSS("overflow-x", "auto");
});

test("project loading media reserves the same 16:9 space as the loaded image", async ({ page }) => {
  await page.addInitScript(() => {
    window.__auroraCLS = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__auroraCLS += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  let releaseProjectResponse;
  const projectResponseGate = new Promise((resolve) => {
    releaseProjectResponse = resolve;
  });
  await page.route("**/api/projects/aurora-cls-fixture", async (route) => {
    await projectResponseGate;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        id: "aurora-cls-fixture",
        title: "CLS fixture project",
        thumbnail: "/favicon.ico",
        status: "hiring",
        visibility: "Public",
        type: "Game",
        archived: false,
        owner: "fixture-owner",
        admins: [],
        teamMembers: [],
        teamMemberDetails: [],
        linkedProjects: [],
        requiredRoles: [],
        categoryTags: [],
        compensationType: "Volunteer",
        goal: "A layout fixture for the local Aurora regression check.",
        description: "",
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-01T00:00:00.000Z",
      }),
    });
  });

  await page.goto("/project/aurora-cls-fixture");
  const skeleton = page.locator(".max-w-4xl .aspect-video").first();
  await expect(skeleton).toBeVisible();
  const skeletonBox = await skeleton.boundingBox();
  expect(Math.abs(skeletonBox.height - (skeletonBox.width * 9) / 16)).toBeLessThan(2);
  releaseProjectResponse();
  await expect(page.getByRole("heading", { name: "CLS fixture project" })).toBeVisible();
  const loadedMedia = page.locator(".max-w-4xl div.aspect-video").first();
  const loadedBox = await loadedMedia.boundingBox();
  expect(Math.abs(loadedBox.height - (loadedBox.width * 9) / 16)).toBeLessThan(2);

  await page.waitForTimeout(500);
  const cls = await page.evaluate(() => window.__auroraCLS);
  console.log(`Project fixture CLS: ${cls.toFixed(3)}`);
  expect(cls).toBeLessThanOrEqual(0.1);
});

test("starter pathway accent text meets normal text contrast in dark mode", async ({ page }) => {
  await page.goto("/education/starter-pathway");
  const eyebrow = page.locator(".starter-eyebrow");
  await expect(eyebrow).toBeVisible();
  const colors = await eyebrow.evaluate((element) => ({
    foreground: getComputedStyle(element).color,
    background: getComputedStyle(element.closest(".starter-pathway")).backgroundColor,
  }));

  expect(contrastRatio(colors.foreground, colors.background)).toBeGreaterThanOrEqual(4.5);
});

test("local page responses include the configured framing and MIME protections", async ({ page }) => {
  const response = await page.goto("/about");
  const headers = response.headers();

  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
});
