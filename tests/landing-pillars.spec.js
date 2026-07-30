const { expect, test } = require("@playwright/test");

test("creator pillars are responsive and link to the correct routes", async ({
  page,
}, testInfo) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const section = page.locator("#pillars");
  await section.scrollIntoViewIfNeeded();
  await expect(section).toBeVisible();

  const cards = section.locator("article");
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toContainText("Education");
  await expect(cards.nth(1)).toContainText("Portfolio");
  await expect(cards.nth(2)).toContainText("Business");

  const links = await cards.locator("a").evaluateAll((anchors) =>
    anchors.map((anchor) => anchor.getAttribute("href"))
  );
  expect(links).toEqual(["/education", "/projects", "/membership"]);

  const boxes = await cards.evaluateAll((elements) =>
    elements.map((element) => element.getBoundingClientRect().toJSON())
  );
  if (testInfo.project.name.startsWith("desktop")) {
    expect(
      Math.max(...boxes.map((box) => box.y)) -
        Math.min(...boxes.map((box) => box.y))
    ).toBeLessThan(2);
    expect(boxes[0].x).toBeLessThan(boxes[1].x);
    expect(boxes[1].x).toBeLessThan(boxes[2].x);
  } else {
    expect(
      Math.max(...boxes.map((box) => box.x)) -
        Math.min(...boxes.map((box) => box.x))
    ).toBeLessThan(2);
    expect(boxes[0].y).toBeLessThan(boxes[1].y);
    expect(boxes[1].y).toBeLessThan(boxes[2].y);
  }

  const hasHorizontalOverflow = await section.evaluate(
    (element) => element.scrollWidth > element.clientWidth + 1
  );
  expect(hasHorizontalOverflow).toBeFalsy();

  await section.screenshot({
    path: testInfo.outputPath("creator-pillars.png"),
    animations: "disabled",
  });
});
