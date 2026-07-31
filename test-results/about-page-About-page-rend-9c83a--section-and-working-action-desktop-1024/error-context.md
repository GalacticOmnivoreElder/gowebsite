# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: about-page.spec.js >> About page renders every section and working action
- Location: tests\about-page.spec.js:16:1

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3000/about
Call log:
  - navigating to "http://127.0.0.1:3000/about", waiting until "domcontentloaded"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e6]:
    - heading "This site can’t be reached" [level=1] [ref=e7]
    - paragraph [ref=e8]:
      - strong [ref=e9]: 127.0.0.1
      - text: refused to connect.
    - generic [ref=e10]:
      - paragraph [ref=e11]: "Try:"
      - list [ref=e12]:
        - listitem [ref=e13]: Checking the connection
        - listitem [ref=e14]:
          - link "Checking the proxy and the firewall" [ref=e15] [cursor=pointer]:
            - /url: "#buttons"
    - generic [ref=e16]: ERR_CONNECTION_REFUSED
  - generic [ref=e17]:
    - button "Reload" [ref=e19] [cursor=pointer]
    - button "Details" [ref=e20] [cursor=pointer]
```

# Test source

```ts
  1   | const { expect, test } = require("@playwright/test");
  2   | 
  3   | const STATUTE_VIEW_URL =
  4   |   "https://drive.google.com/file/d/1DRFhgeRC7GwwnC5u2W1IJOBc8SgOSxIm/view?usp=sharing";
  5   | const STATUTE_DOWNLOAD_URL =
  6   |   "https://drive.google.com/uc?export=download&id=1DRFhgeRC7GwwnC5u2W1IJOBc8SgOSxIm";
  7   | 
  8   | const internalDestinations = [
  9   |   "/education",
  10  |   "/projects",
  11  |   "/project/create",
  12  |   "/membership",
  13  |   "/contact",
  14  | ];
  15  | 
  16  | test("About page renders every section and working action", async ({
  17  |   page,
  18  | }, testInfo) => {
  19  |   const browserErrors = [];
  20  |   page.on("console", (message) => {
  21  |     const isKnownReactCompatibilityWarning = message
  22  |       .text()
  23  |       .includes("Accessing element.ref was removed in React 19");
  24  |     if (message.type() === "error" && !isKnownReactCompatibilityWarning) {
  25  |       browserErrors.push(message.text());
  26  |     }
  27  |   });
  28  |   page.on("pageerror", (error) => browserErrors.push(error.message));
  29  |   page.on("response", (response) => {
  30  |     if (response.status() >= 400) {
  31  |       browserErrors.push(`${response.status()} ${response.url()}`);
  32  |     }
  33  |   });
  34  | 
> 35  |   await page.goto("/about", { waitUntil: "domcontentloaded" });
      |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3000/about
  36  | 
  37  |   await expect(
  38  |     page.getByRole("heading", { level: 1, name: "About Galactic Omnivore" })
  39  |   ).toHaveCount(1);
  40  | 
  41  |   for (const heading of [
  42  |     "Our purpose",
  43  |     "Choose your route",
  44  |     "Our values",
  45  |     "Governance and transparency",
  46  |     "Our story",
  47  |     "Our impact",
  48  |     "Find your place in Galactic Omnivore",
  49  |   ]) {
  50  |     await expect(
  51  |       page.getByRole("heading", { level: 2, name: heading })
  52  |     ).toBeVisible();
  53  |   }
  54  | 
  55  |   await expect(
  56  |     page.getByTestId("about-routes").getByRole("listitem")
  57  |   ).toHaveCount(4);
  58  |   await expect(
  59  |     page.getByTestId("about-values").getByRole("listitem")
  60  |   ).toHaveCount(6);
  61  |   await expect(
  62  |     page.getByTestId("about-impact").getByRole("listitem")
  63  |   ).toHaveCount(4);
  64  | 
  65  |   const expectedLinks = [
  66  |     ["Explore learning", "/education"],
  67  |     ["Browse project roles", "/projects"],
  68  |     ["Create project brief", "/project/create"],
  69  |     ["Review membership", "/membership"],
  70  |     ["Contact GO about governance", "/contact"],
  71  |     ["View our work", "/projects"],
  72  |     ["Review Membership", "/membership"],
  73  |     ["Explore Projects", "/projects"],
  74  |   ];
  75  | 
  76  |   for (const [name, href] of expectedLinks) {
  77  |     await expect(page.getByRole("link", { name, exact: true })).toHaveAttribute(
  78  |       "href",
  79  |       href
  80  |     );
  81  |   }
  82  | 
  83  |   const readStatute = page.getByRole("link", {
  84  |     name: "Read the GO Statute PDF in a new tab",
  85  |   });
  86  |   await expect(readStatute).toHaveAttribute("href", STATUTE_VIEW_URL);
  87  |   await expect(readStatute).toHaveAttribute("target", "_blank");
  88  |   await expect(readStatute).toHaveAttribute("rel", /noopener/);
  89  |   await expect(readStatute).toHaveAttribute("rel", /noreferrer/);
  90  | 
  91  |   const downloadStatute = page.getByRole("link", {
  92  |     name: "Download the GO Statute PDF",
  93  |   });
  94  |   await expect(downloadStatute).toHaveAttribute("href", STATUTE_DOWNLOAD_URL);
  95  |   await expect(downloadStatute).toHaveAttribute(
  96  |     "download",
  97  |     "GO Statute (25.09.2025).pdf"
  98  |   );
  99  | 
  100 |   const discord = page.getByRole("link", { name: "Join Our Discord" });
  101 |   await expect(discord).toHaveAttribute(
  102 |     "href",
  103 |     "https://discord.gg/ZbSShxu6K4"
  104 |   );
  105 |   await expect(discord).toHaveAttribute("target", "_blank");
  106 |   await expect(discord).toHaveAttribute("rel", /noopener/);
  107 |   await expect(discord).toHaveAttribute("rel", /noreferrer/);
  108 | 
  109 |   const touchTargets = page.locator(
  110 |     '[data-testid="about-routes"] a, [data-testid="statute-panel"] a, a:has-text("View our work"), a:has-text("Join Our Discord"), a:has-text("Review Membership"), a:has-text("Explore Projects")'
  111 |   );
  112 |   for (const target of await touchTargets.all()) {
  113 |     const box = await target.boundingBox();
  114 |     const accessibleName = (await target.textContent()).trim();
  115 |     expect(box).not.toBeNull();
  116 |     expect(
  117 |       box.height,
  118 |       `${accessibleName} should be at least 44px tall`
  119 |     ).toBeGreaterThanOrEqual(44);
  120 |   }
  121 | 
  122 |   if (testInfo.project.name === "desktop-1440") {
  123 |     for (const destination of internalDestinations) {
  124 |       await expect
  125 |         .poll(async () => {
  126 |           const response = await page.request.get(destination);
  127 |           return response.status();
  128 |         })
  129 |         .toBeLessThan(400);
  130 |     }
  131 |   }
  132 | 
  133 |   const overflowReport = await page.evaluate(() => {
  134 |     const main = document.querySelector("main");
  135 |     return {
```