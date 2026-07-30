const { expect, test } = require("@playwright/test");

const STATUTE_VIEW_URL =
  "https://drive.google.com/file/d/1DRFhgeRC7GwwnC5u2W1IJOBc8SgOSxIm/view?usp=sharing";
const STATUTE_DOWNLOAD_URL =
  "https://drive.google.com/uc?export=download&id=1DRFhgeRC7GwwnC5u2W1IJOBc8SgOSxIm";

const internalDestinations = [
  "/education",
  "/projects",
  "/project/create",
  "/membership",
  "/contact",
];

test("About page renders every section and working action", async ({
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
  page.on("response", (response) => {
    if (response.status() >= 400) {
      browserErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto("/about", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", { level: 1, name: "About Galactic Omnivore" })
  ).toHaveCount(1);

  for (const heading of [
    "Our purpose",
    "Choose your route",
    "Our values",
    "Governance and transparency",
    "Our story",
    "Our impact",
    "Find your place in Galactic Omnivore",
  ]) {
    await expect(
      page.getByRole("heading", { level: 2, name: heading })
    ).toBeVisible();
  }

  await expect(
    page.getByTestId("about-routes").getByRole("listitem")
  ).toHaveCount(4);
  await expect(
    page.getByTestId("about-values").getByRole("listitem")
  ).toHaveCount(6);
  await expect(
    page.getByTestId("about-impact").getByRole("listitem")
  ).toHaveCount(4);

  const expectedLinks = [
    ["Explore learning", "/education"],
    ["Browse project roles", "/projects"],
    ["Create project brief", "/project/create"],
    ["Review membership", "/membership"],
    ["Contact GO about governance", "/contact"],
    ["View our work", "/projects"],
    ["Review Membership", "/membership"],
    ["Explore Projects", "/projects"],
  ];

  for (const [name, href] of expectedLinks) {
    await expect(page.getByRole("link", { name, exact: true })).toHaveAttribute(
      "href",
      href
    );
  }

  const readStatute = page.getByRole("link", {
    name: "Read the GO Statute PDF in a new tab",
  });
  await expect(readStatute).toHaveAttribute("href", STATUTE_VIEW_URL);
  await expect(readStatute).toHaveAttribute("target", "_blank");
  await expect(readStatute).toHaveAttribute("rel", /noopener/);
  await expect(readStatute).toHaveAttribute("rel", /noreferrer/);

  const downloadStatute = page.getByRole("link", {
    name: "Download the GO Statute PDF",
  });
  await expect(downloadStatute).toHaveAttribute("href", STATUTE_DOWNLOAD_URL);
  await expect(downloadStatute).toHaveAttribute(
    "download",
    "GO Statute (25.09.2025).pdf"
  );

  const discord = page.getByRole("link", { name: "Join Our Discord" });
  await expect(discord).toHaveAttribute(
    "href",
    "https://discord.gg/ZbSShxu6K4"
  );
  await expect(discord).toHaveAttribute("target", "_blank");
  await expect(discord).toHaveAttribute("rel", /noopener/);
  await expect(discord).toHaveAttribute("rel", /noreferrer/);

  const touchTargets = page.locator(
    '[data-testid="about-routes"] a, [data-testid="statute-panel"] a, a:has-text("View our work"), a:has-text("Join Our Discord"), a:has-text("Review Membership"), a:has-text("Explore Projects")'
  );
  for (const target of await touchTargets.all()) {
    const box = await target.boundingBox();
    const accessibleName = (await target.textContent()).trim();
    expect(box).not.toBeNull();
    expect(
      box.height,
      `${accessibleName} should be at least 44px tall`
    ).toBeGreaterThanOrEqual(44);
  }

  if (testInfo.project.name === "desktop-1440") {
    for (const destination of internalDestinations) {
      await expect
        .poll(async () => {
          const response = await page.request.get(destination);
          return response.status();
        })
        .toBeLessThan(400);
    }
  }

  const overflowReport = await page.evaluate(() => {
    const main = document.querySelector("main");
    return {
      documentWidth: main.scrollWidth,
      viewportWidth: main.clientWidth,
      offenders: [...main.querySelectorAll("*")]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName,
          className:
            typeof element.className === "string" ? element.className : "",
          left: Math.round(rect.left),
          right: Math.round(rect.right),
        };
      })
      .filter(
        ({ left, right }) => left < -1 || right > main.clientWidth + 1
      )
      .slice(0, 8),
    };
  });
  expect(
    overflowReport.documentWidth,
    JSON.stringify(overflowReport.offenders)
  ).toBeLessThanOrEqual(overflowReport.viewportWidth + 1);
  expect(browserErrors).toEqual([]);

  await page.screenshot({
    path: testInfo.outputPath("about-page.png"),
    fullPage: true,
    animations: "disabled",
  });
});

test("About page cards respond at the requested width", async ({
  page,
}, testInfo) => {
  await page.goto("/about", { waitUntil: "domcontentloaded" });

  const valueBoxes = await page
    .getByTestId("about-values")
    .getByRole("listitem")
    .evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect()));
  const routeBoxes = await page
    .getByTestId("about-routes")
    .getByRole("listitem")
    .evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect()));
  const impactBoxes = await page
    .getByTestId("about-impact")
    .getByRole("listitem")
    .evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect()));

  if (testInfo.project.name === "desktop-1440") {
    expect(valueBoxes[0].y).toBeCloseTo(valueBoxes[2].y, 0);
    expect(routeBoxes[0].y).toBeCloseTo(routeBoxes[3].y, 0);
  } else if (testInfo.project.name === "desktop-1024") {
    expect(valueBoxes[0].y).toBeCloseTo(valueBoxes[2].y, 0);
    expect(routeBoxes[0].y).toBeCloseTo(routeBoxes[3].y, 0);
  } else if (testInfo.project.name === "tablet-768") {
    expect(valueBoxes[0].y).toBeCloseTo(valueBoxes[1].y, 0);
    expect(valueBoxes[2].y).toBeGreaterThan(valueBoxes[0].y);
    expect(routeBoxes[0].y).toBeCloseTo(routeBoxes[1].y, 0);
    expect(routeBoxes[2].y).toBeGreaterThan(routeBoxes[0].y);
  } else {
    expect(valueBoxes[1].y).toBeGreaterThan(valueBoxes[0].y);
    expect(routeBoxes[1].y).toBeGreaterThan(routeBoxes[0].y);
    expect(impactBoxes[1].y).toBeGreaterThan(impactBoxes[0].y);

    for (const name of [
      "Join Our Discord",
      "Review Membership",
      "Explore Projects",
    ]) {
      const box = await page
        .getByRole("link", { name, exact: true })
        .boundingBox();
      expect(box.width).toBeGreaterThan(300);
    }
  }

  if (testInfo.project.name !== "mobile-390") {
    expect(impactBoxes[0].y).toBeCloseTo(impactBoxes[1].y, 0);
  }
});

test("About page controls have visible keyboard focus", async ({ page }) => {
  await page.goto("/about", { waitUntil: "domcontentloaded" });
  const firstRoute = page.getByRole("link", {
    name: "Explore learning",
    exact: true,
  });
  await firstRoute.focus();
  await expect(firstRoute).toBeFocused();
  await expect(firstRoute).toHaveCSS("outline-style", /auto|solid/);
});
