const { expect, test } = require("@playwright/test");

const successResponse = {
  success: true,
  message:
    "If this address can be subscribed, a confirmation email will arrive shortly.",
};

function collectBrowserErrors(page) {
  const errors = [];
  page.on("console", (message) => {
    const knownReactWarning = message
      .text()
      .includes("Accessing element.ref was removed in React 19");
    if (message.type() === "error" && !knownReactWarning) {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test("landing and footer newsletter forms are responsive and accessible", async ({
  page,
}, testInfo) => {
  const browserErrors = collectBrowserErrors(page);
  await page.route("**/api/newsletter/subscribe", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(successResponse),
    })
  );

  await page.goto("/", { waitUntil: "domcontentloaded" });

  const section = page.locator("#newsletter");
  const footer = page.locator("footer");
  await expect(section).toBeVisible();
  await expect(footer).toBeVisible();
  await expect(
    section.getByRole("heading", {
      level: 2,
      name: "Join the GO mailing list",
    })
  ).toBeVisible();
  await expect(
    footer.getByRole("heading", { level: 3, name: "Newsletter" })
  ).toBeVisible();

  for (const region of [section, footer]) {
    const form = region.locator("form");
    const email = form.getByLabel("Email address");
    const consent = form.getByRole("checkbox");
    const subscribe = form.getByRole("button", { name: "Subscribe" });
    const privacy = form.getByRole("link", { name: "Privacy Policy" });

    await expect(email).toHaveAttribute("autocomplete", "email");
    await expect(email).toHaveAttribute("placeholder", "you@example.com");
    await expect(consent).not.toBeChecked();
    await expect(privacy).toHaveAttribute("href", "/privacy");

    const [emailBox, buttonBox] = await Promise.all([
      email.boundingBox(),
      subscribe.boundingBox(),
    ]);
    expect(emailBox.height).toBeGreaterThanOrEqual(44);
    expect(buttonBox.height).toBeGreaterThanOrEqual(44);

    const overflow = await region.evaluate(
      (element) => element.scrollWidth > element.clientWidth + 1
    );
    expect(overflow).toBeFalsy();

    if (testInfo.project.name === "mobile-390") {
      expect(buttonBox.y).toBeGreaterThan(emailBox.y);
      expect(buttonBox.width).toBeGreaterThan(300);
    } else {
      expect(buttonBox.x).toBeGreaterThan(emailBox.x);
    }
  }

  const privacyResponse = await page.request.get("/privacy");
  expect(privacyResponse.status()).toBeLessThan(400);
  expect(browserErrors).toEqual([]);

  await page.screenshot({
    path: testInfo.outputPath("newsletter-signup.png"),
    fullPage: true,
    animations: "disabled",
  });
});

test("final CTA and signal divider keep their hierarchy at every breakpoint", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const cta = page.getByRole("region", {
    name: "Find your place in Galactic Omnivore",
  });
  const divider = page.locator("[data-signal-divider]");
  const ctaLinks = [
    cta.getByRole("link", { name: "Join Our Discord" }),
    cta.getByRole("link", { name: "Review Membership" }),
    cta.getByRole("link", { name: "Explore Projects" }),
  ];

  await expect(cta).toBeVisible();
  await expect(ctaLinks[0]).toHaveAttribute(
    "href",
    "https://discord.gg/ZbSShxu6K4"
  );
  await expect(ctaLinks[1]).toHaveAttribute("href", "/membership");
  await expect(ctaLinks[2]).toHaveAttribute("href", "/projects");
  await expect(divider).toHaveAttribute("aria-hidden", "true");

  const dividerBox = await divider.boundingBox();
  const expectedHeight =
    testInfo.project.name === "mobile-390"
      ? 88
      : testInfo.project.name === "tablet-768"
        ? 120
        : 160;
  expect(dividerBox.height).toBe(expectedHeight);

  const visibleFragments = divider.locator("[data-signal-fragment]:visible");
  const fragmentCount = await visibleFragments.count();
  expect(fragmentCount).toBeGreaterThanOrEqual(8);
  expect(fragmentCount).toBeLessThanOrEqual(15);
  for (let index = 0; index < fragmentCount; index += 1) {
    await expect(visibleFragments.nth(index)).toHaveCSS("animation-name", "none");
  }

  const pageOverflows = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1
  );
  expect(pageOverflows).toBeFalsy();

  if (testInfo.project.name === "mobile-390") {
    const boxes = await Promise.all(ctaLinks.map((link) => link.boundingBox()));
    expect(boxes[1].y).toBeGreaterThan(boxes[0].y);
    expect(boxes[2].y).toBeGreaterThan(boxes[1].y);
    for (const box of boxes) expect(box.width).toBeGreaterThan(300);
  }
});

test("validation, keyboard submission, loading, success, and deduplication work", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440");
  const requests = [];

  await page.route("**/api/newsletter/subscribe", async (route) => {
    requests.push(JSON.parse(route.request().postData()));
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(successResponse),
    });
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  const section = page.locator("#newsletter");
  const email = section.getByLabel("Email address");
  const consent = section.getByRole("checkbox");

  await email.fill("not-an-email");
  await email.press("Enter");
  await expect(
    section.getByText("Enter a valid email address.", { exact: true })
  ).toBeVisible();
  expect(requests).toHaveLength(0);

  await email.fill("member@example.com");
  await email.press("Enter");
  await expect(
    section.getByText(
      "Please confirm that you agree to receive email updates.",
      { exact: true }
    )
  ).toBeVisible();
  expect(requests).toHaveLength(0);

  await consent.check();
  await email.press("Enter");
  await expect(
    section.getByRole("button", { name: "Subscribing…" })
  ).toBeDisabled();
  await page.keyboard.press("Enter");
  await expect
    .poll(() => requests.length)
    .toBe(1);
  await expect(
    section.getByText(
      "Your request was accepted. Check your email to confirm and join the Galactic Omnivore mailing list.",
      { exact: true }
    )
  ).toBeVisible();
  expect(requests[0]).toMatchObject({
    email: "member@example.com",
    consent: true,
    source: "landing-page",
    company: "",
  });

  await expect(
    page.locator("footer").getByRole("button", { name: "Subscribe" })
  ).toBeVisible();
});

test("footer sends its source and never turns backend failure into success", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440");
  const requests = [];

  await page.route("**/api/newsletter/subscribe", async (route) => {
    requests.push(JSON.parse(route.request().postData()));
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Internal provider details that must not reach the visitor",
      }),
    });
  });

  await page.goto("/about", { waitUntil: "networkidle" });
  const footer = page.locator("footer");
  await footer.getByRole("checkbox").check();
  await footer.getByLabel("Email address").fill("footer@example.com");
  await footer.getByRole("button", { name: "Subscribe" }).click();

  await expect.poll(() => requests.length).toBe(1);
  await expect(
    footer.getByText(
      "We could not complete the subscription. Please try again.",
      { exact: true }
    )
  ).toBeVisible();
  await expect(
    footer.getByText(/Internal provider details/)
  ).toHaveCount(0);
  expect(requests).toHaveLength(1);
  expect(requests[0].source).toBe("footer");
  await expect(
    footer.getByRole("button", { name: "Subscribe" })
  ).toBeEnabled();
});
