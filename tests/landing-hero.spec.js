const { expect, test } = require("@playwright/test");

test("landing hero is responsive, accessible, and uses the verified CTAs", async ({
  page,
}, testInfo) => {
  const browserErrors = [];
  page.on("console", (message) => {
    const isKnownReactCompatibilityWarning = message
      .text()
      .includes("Accessing element.ref was removed in React 19");
    if (message.type() === "error" && !isKnownReactCompatibilityWarning) {
      browserErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await page.goto("/", { waitUntil: "domcontentloaded" });

  const hero = page.locator('section[aria-labelledby="landing-hero-heading"]');
  const heading = page.getByRole("heading", {
    level: 1,
    name: "Unite. Create. Evolve.",
  });
  await expect(hero).toBeVisible();
  await expect(heading).toHaveCount(1);
  await expect(
    page.getByText("From game creators, for game creators—and more.")
  ).toBeVisible();
  await expect(hero).toContainText(
    "Galactic Omnivore is a nonprofit game-development community and platform from North Macedonia."
  );

  const discord = page.getByRole("link", { name: "Join Our Discord" });
  const booking = page.getByRole("link", { name: "Schedule a Call" });
  const learnMore = page.getByRole("link", { name: "Learn More" });
  await expect(discord).toHaveAttribute(
    "href",
    "https://discord.gg/ZbSShxu6K4"
  );
  await expect(discord).toHaveAttribute("target", "_blank");
  await expect(discord).toHaveAttribute("rel", "noopener noreferrer");
  await expect(booking).toHaveAttribute(
    "href",
    "https://calendar.app.google/Ge6GvfiaaaMhAHHf6"
  );
  await expect(booking).toHaveAttribute("target", "_blank");
  await expect(booking).toHaveAttribute("rel", "noopener noreferrer");
  await expect(learnMore).toHaveAttribute("href", "/about");

  const ctas = [discord, booking, learnMore];
  const boxes = [];
  for (const cta of ctas) {
    await expect(cta).toBeVisible();
    const box = await cta.boundingBox();
    expect(box).not.toBeNull();
    expect(box.height).toBeGreaterThanOrEqual(44);
    boxes.push(box);
  }

  if (testInfo.project.name === "mobile-390") {
    expect(
      Math.max(...boxes.map(({ x }) => x)) -
        Math.min(...boxes.map(({ x }) => x))
    ).toBeLessThan(2);
    expect(boxes[0].y).toBeLessThan(boxes[1].y);
    expect(boxes[1].y).toBeLessThan(boxes[2].y);
  } else {
    expect(
      Math.max(...boxes.map(({ y }) => y)) -
        Math.min(...boxes.map(({ y }) => y))
    ).toBeLessThan(2);
    expect(boxes[0].x).toBeLessThan(boxes[1].x);
    expect(boxes[1].x).toBeLessThan(boxes[2].x);
  }

  await discord.focus();
  await expect(discord).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(booking).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(learnMore).toBeFocused();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1
  );
  expect(hasHorizontalOverflow).toBeFalsy();

  const colors = await heading.evaluate((element) => ({
    heading: getComputedStyle(element).color,
    emphasis: getComputedStyle(element.querySelector("span")).color,
  }));
  expect(colors.emphasis).not.toBe(colors.heading);

  await hero.screenshot({
    path: testInfo.outputPath("landing-hero.png"),
    animations: "disabled",
  });

  await learnMore.click();
  await expect(page).toHaveURL(/\/about$/);
  expect(browserErrors).toEqual([]);
});
