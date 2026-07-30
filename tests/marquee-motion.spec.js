const { expect, test } = require("@playwright/test");

const marqueeSelectors = [
  ".go-skill-marquee",
  ".go-partner-marquee",
];

test("skills and partners scroll continuously", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  await expect(page.locator(".go-skill-marquee-group")).toHaveCount(2);
  await expect(page.locator(".go-partner-marquee-group")).toHaveCount(2);
  await expect(page.locator(".skill-banner")).toHaveCSS(
    "overflow-x",
    "hidden"
  );
  await expect(page.locator(".go-partner-banner")).toHaveCSS(
    "overflow-x",
    "hidden"
  );
  expect(
    await page.evaluate(
      () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
  ).toBeFalsy();

  const startingStates = await Promise.all(
    marqueeSelectors.map((selector) =>
      page.locator(selector).evaluate((element) => {
        const styles = window.getComputedStyle(element);
        return {
          animationName: styles.animationName,
          animationPlayState: styles.animationPlayState,
          animationIterationCount: styles.animationIterationCount,
          transform: styles.transform,
        };
      })
    )
  );

  expect(startingStates.map((state) => state.animationName)).toEqual([
    "go-skill-marquee-scroll",
    "go-partner-marquee-scroll",
  ]);
  expect(
    startingStates.every(
      (state) =>
        state.animationPlayState === "running" &&
        state.animationIterationCount === "infinite"
    )
  ).toBeTruthy();

  await page.waitForTimeout(350);
  const endingTransforms = await Promise.all(
    marqueeSelectors.map((selector) =>
      page
        .locator(selector)
        .evaluate((element) => window.getComputedStyle(element).transform)
    )
  );
  expect(endingTransforms[0]).not.toBe(startingStates[0].transform);
  expect(endingTransforms[1]).not.toBe(startingStates[1].transform);

  for (const groupSelector of [
    ".go-skill-marquee-group",
    ".go-partner-marquee-group",
  ]) {
    const widths = await page
      .locator(groupSelector)
      .evaluateAll((groups) => groups.map((group) => group.getBoundingClientRect().width));
    expect(widths[0]).toBeGreaterThanOrEqual(await page.evaluate(() => innerWidth));
    expect(Math.abs(widths[0] - widths[1])).toBeLessThan(1);
  }
});

test("system motion preference does not interrupt either automatic loop", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "networkidle" });

  expect(
    await page.evaluate(
      () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
  ).toBeTruthy();
  await expect(page.locator(".skill-banner")).toHaveCSS(
    "overflow-x",
    "hidden"
  );
  await expect(page.locator(".go-partner-banner")).toHaveCSS(
    "overflow-x",
    "hidden"
  );

  const startingStates = await Promise.all(
    marqueeSelectors.map((selector) =>
      page.locator(selector).evaluate((element) => {
        const styles = window.getComputedStyle(element);
        return {
          animationName: styles.animationName,
          animationPlayState: styles.animationPlayState,
          animationIterationCount: styles.animationIterationCount,
          transform: styles.transform,
        };
      })
    )
  );

  expect(startingStates.map((state) => state.animationName)).toEqual([
    "go-skill-marquee-scroll",
    "go-partner-marquee-scroll",
  ]);
  expect(
    startingStates.every(
      (state) =>
        state.animationPlayState === "running" &&
        state.animationIterationCount === "infinite"
    )
  ).toBeTruthy();

  await page.waitForTimeout(350);
  const endingTransforms = await Promise.all(
    marqueeSelectors.map((selector) =>
      page
        .locator(selector)
        .evaluate((element) => window.getComputedStyle(element).transform)
    )
  );
  expect(endingTransforms[0]).not.toBe(startingStates[0].transform);
  expect(endingTransforms[1]).not.toBe(startingStates[1].transform);
});
