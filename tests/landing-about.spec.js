const { expect, test } = require("@playwright/test");

test("landing About section is readable and separated from its storefront logos", async ({
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

  const about = page.locator("#about");
  await about.scrollIntoViewIfNeeded();
  await expect(about).toBeVisible();
  await expect(
    about.getByRole("heading", {
      level: 2,
      name: "About Galactic Omnivore",
    })
  ).toBeVisible();

  const paragraphs = about.locator("p");
  await expect(paragraphs).toHaveCount(3);
  await expect(paragraphs.nth(0)).toContainText(
    "active across North Macedonia and beyond."
  );
  await expect(paragraphs.nth(1)).toContainText(
    "move ideas toward their next playable milestone."
  );
  await expect(paragraphs.nth(2)).toContainText(
    "clear terms, proper credit, and fair collaboration."
  );

  const highlights = await about.locator("strong").allTextContents();
  expect(highlights.map((text) => text.trim())).toEqual([
    "independent nonprofit",
    "useful signals become practical routes",
    "next playable milestone",
    "clear terms, proper credit, and fair collaboration",
  ]);

  const pathwayLabel = about.getByText(
    "Publishing and distribution pathways may include:"
  );
  const storefrontLogos = about.getByAltText(
    "Steam, DriveThruRPG, and itch.io storefront logos"
  );
  await expect(pathwayLabel).toBeVisible();
  await expect(storefrontLogos).toBeVisible();
  await expect(about.locator("figure a")).toHaveCount(0);
  await expect
    .poll(
      () =>
        storefrontLogos.evaluate(
          (image) => image.complete && image.naturalWidth > 0
        ),
      { timeout: 5000 }
    )
    .toBeTruthy();

  const [contentBox, lastParagraphBox, labelBox, logoBox] = await Promise.all([
    about.locator(":scope > div").boundingBox(),
    paragraphs.nth(2).boundingBox(),
    pathwayLabel.boundingBox(),
    storefrontLogos.boundingBox(),
  ]);
  expect(contentBox).not.toBeNull();
  expect(contentBox.width).toBeLessThanOrEqual(900);
  expect(lastParagraphBox.y + lastParagraphBox.height).toBeLessThan(labelBox.y);
  expect(labelBox.y + labelBox.height).toBeLessThan(logoBox.y);

  const alignment = await paragraphs.nth(0).evaluate(
    (paragraph) => getComputedStyle(paragraph).textAlign
  );
  expect(alignment).toBe(
    testInfo.project.name === "mobile-390" ? "left" : "center"
  );

  const hasHorizontalOverflow = await about.evaluate(
    (element) => element.scrollWidth > element.clientWidth + 1
  );
  expect(hasHorizontalOverflow).toBeFalsy();
  expect(browserErrors).toEqual([]);

  await about.screenshot({
    path: testInfo.outputPath("landing-about.png"),
    animations: "disabled",
  });
});
