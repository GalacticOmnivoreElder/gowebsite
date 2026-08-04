const { expect, test } = require("@playwright/test");

function watchBrowserErrors(page) {
  const errors = [];
  page.browserErrors = errors;

  page.on("console", (message) => {
    const isKnownReactCompatibilityWarning = message
      .text()
      .includes("Accessing element.ref was removed in React 19");
    if (message.type() === "error" && !isKnownReactCompatibilityWarning) {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => errors.push(error.message));

  return errors;
}

async function expectHealthyPage(page) {
  await expect(page.locator("body")).toBeVisible();
  const refreshBoundary = page.getByRole("heading", {
    level: 1,
    name: "The site needs a refresh",
  });
  if (await refreshBoundary.count()) {
    await page.waitForTimeout(250);
    throw new Error(
      `Application error boundary rendered: ${JSON.stringify(page.browserErrors)}`
    );
  }
  await expect(
    page.locator(
      "[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay"
    )
  ).toHaveCount(0);

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1
  );
  expect(hasHorizontalOverflow).toBeFalsy();
}

async function expectLearningCategoryNav(page, activeLabel) {
  const learningNav = page.locator('nav[aria-label="Learning categories"]');
  await expect(learningNav).toBeVisible();
  await expect(
    learningNav.getByText(activeLabel, { exact: true })
  ).toHaveAttribute("aria-current", "page");

  for (const label of ["Courses", "Workshops", "Video Bundles", "Resources"]) {
    await expect(learningNav.getByText(label, { exact: true })).toBeVisible();
  }
}

test("homepage separates the GO pillars from the actionable orbits", async ({
  page,
}, testInfo) => {
  const browserErrors = watchBrowserErrors(page);

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expectHealthyPage(page);

  const pillars = page.locator('section[aria-labelledby="go-pillars-heading"]');
  const orbits = page.locator('section[aria-labelledby="orbits-heading"]');
  await expect(pillars).toBeVisible();
  await expect(orbits).toBeVisible();
  await expect(
    pillars.getByRole("heading", {
      level: 2,
      name: "Learn. Build your portfolio. Move toward business.",
    })
  ).toBeVisible();
  await expect(pillars.locator("article")).toHaveCount(3);
  await expect(pillars.getByRole("link")).toHaveCount(0);
  await expect(pillars.getByRole("button")).toHaveCount(0);
  await expect(orbits.locator("article")).toHaveCount(6);

  const pillarBox = await pillars.boundingBox();
  const orbitBox = await orbits.boundingBox();
  expect(pillarBox).not.toBeNull();
  expect(orbitBox).not.toBeNull();
  expect(pillarBox.y).toBeLessThan(orbitBox.y);

  if (testInfo.project.name === "desktop-chrome") {
    const desktopNav = page.locator('nav[aria-label="Primary navigation"]');
    const learnTrigger = desktopNav.getByRole("button", { name: "Learn" });
    await expect(desktopNav).toBeVisible();
    const directDesktopLabels = await desktopNav
      .locator(":scope > a")
      .allTextContents();
    expect(directDesktopLabels).not.toContain("Video Bundles");
    expect(directDesktopLabels).not.toContain("Resources");

    await learnTrigger.focus();
    await expect(learnTrigger).toBeFocused();
    await page.keyboard.press("Enter");
    for (const label of ["Courses", "Workshops", "Video Bundles", "Resources"]) {
      await expect(desktopNav.getByRole("link", { name: label })).toBeVisible();
    }
  } else {
    await page.getByRole("button", { name: "Open navigation" }).click();
    const mobileNav = page.locator('nav[aria-label="Mobile navigation"]');
    await expect(mobileNav).toBeVisible();
    const directMobileLabels = await mobileNav
      .locator(":scope > a")
      .allTextContents();
    expect(directMobileLabels).not.toContain("Video Bundles");
    expect(directMobileLabels).not.toContain("Resources");

    const learnTrigger = mobileNav.getByRole("button", { name: "Learn" });
    await expect(learnTrigger).toHaveAttribute("aria-expanded", "false");
    await learnTrigger.click();
    await expect(learnTrigger).toHaveAttribute("aria-expanded", "true");
    for (const label of ["Courses", "Workshops", "Video Bundles", "Resources"]) {
      await expect(mobileNav.getByRole("link", { name: label })).toBeVisible();
    }
  }

  expect(browserErrors).toEqual([]);
});

test("learning destinations use the shared hierarchy and customer copy", async ({
  page,
}, testInfo) => {
  const browserErrors = watchBrowserErrors(page);

  await page.goto("/video-bundles", { waitUntil: "domcontentloaded" });
  await expectHealthyPage(page);
  await expect(page.getByRole("heading", { level: 1, name: "Video Bundles" })).toBeVisible();
  await expect(page.getByText(/Explore focused collections of game-development videos selected by GO/)).toBeVisible();
  await expectLearningCategoryNav(page, "Video Bundles");

  const emptyBundles = page.getByRole("heading", {
    level: 2,
    name: "No bundles available yet",
  });
  if (await emptyBundles.count()) {
    await expect(emptyBundles).toBeVisible();
    await expect(page.getByText("Coming soon", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse courses and workshops" })).toHaveAttribute("href", "/education");
  }

  await page.goto("/resources", { waitUntil: "domcontentloaded" });
  await expectHealthyPage(page);
  await expect(page.getByRole("heading", { level: 1, name: "Resources" })).toBeVisible();
  await expect(
    page.getByText(
      /Explore practical game-development material shared or selected by Galactic Omnivore/
    )
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Explore learning" })).toHaveCount(0);
  await expectLearningCategoryNav(page, "Resources");

  await page.goto("/education?format=course", {
    waitUntil: "domcontentloaded",
  });
  await expectHealthyPage(page);
  await expectLearningCategoryNav(page, "Courses");

  await page.goto("/education?format=workshop", {
    waitUntil: "domcontentloaded",
  });
  await expectHealthyPage(page);
  await expect(page.getByRole("tab", { name: "Workshops" })).toHaveAttribute(
    "data-state",
    "active"
  );
  await expectLearningCategoryNav(page, "Workshops");
  await page.locator('nav[aria-label="Learning categories"]').screenshot({
    path: testInfo.outputPath("learning-category-nav-workshops.png"),
    animations: "disabled",
  });

  if (testInfo.project.name === "desktop-chrome") {
    const learnTrigger = page
      .locator('nav[aria-label="Primary navigation"]')
      .getByRole("button", { name: "Learn" });
    await expect(learnTrigger).toHaveClass(/bg-primary/);
  } else {
    await page.getByRole("button", { name: "Open navigation" }).click();
    const learnTrigger = page
      .locator('nav[aria-label="Mobile navigation"]')
      .getByRole("button", { name: "Learn" });
    await expect(learnTrigger).toHaveClass(/bg-primary/);
  }

  expect(browserErrors).toEqual([]);
});
