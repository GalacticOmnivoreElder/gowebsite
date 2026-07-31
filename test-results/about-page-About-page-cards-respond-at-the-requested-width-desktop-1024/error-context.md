# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: about-page.spec.js >> About page cards respond at the requested width
- Location: tests\about-page.spec.js:168:1

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
  136 |       documentWidth: main.scrollWidth,
  137 |       viewportWidth: main.clientWidth,
  138 |       offenders: [...main.querySelectorAll("*")]
  139 |       .map((element) => {
  140 |         const rect = element.getBoundingClientRect();
  141 |         return {
  142 |           tag: element.tagName,
  143 |           className:
  144 |             typeof element.className === "string" ? element.className : "",
  145 |           left: Math.round(rect.left),
  146 |           right: Math.round(rect.right),
  147 |         };
  148 |       })
  149 |       .filter(
  150 |         ({ left, right }) => left < -1 || right > main.clientWidth + 1
  151 |       )
  152 |       .slice(0, 8),
  153 |     };
  154 |   });
  155 |   expect(
  156 |     overflowReport.documentWidth,
  157 |     JSON.stringify(overflowReport.offenders)
  158 |   ).toBeLessThanOrEqual(overflowReport.viewportWidth + 1);
  159 |   expect(browserErrors).toEqual([]);
  160 | 
  161 |   await page.screenshot({
  162 |     path: testInfo.outputPath("about-page.png"),
  163 |     fullPage: true,
  164 |     animations: "disabled",
  165 |   });
  166 | });
  167 | 
  168 | test("About page cards respond at the requested width", async ({
  169 |   page,
  170 | }, testInfo) => {
> 171 |   await page.goto("/about", { waitUntil: "domcontentloaded" });
      |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3000/about
  172 | 
  173 |   const valueBoxes = await page
  174 |     .getByTestId("about-values")
  175 |     .getByRole("listitem")
  176 |     .evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect()));
  177 |   const routeBoxes = await page
  178 |     .getByTestId("about-routes")
  179 |     .getByRole("listitem")
  180 |     .evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect()));
  181 |   const impactBoxes = await page
  182 |     .getByTestId("about-impact")
  183 |     .getByRole("listitem")
  184 |     .evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect()));
  185 | 
  186 |   if (testInfo.project.name === "desktop-1440") {
  187 |     expect(valueBoxes[0].y).toBeCloseTo(valueBoxes[2].y, 0);
  188 |     expect(routeBoxes[0].y).toBeCloseTo(routeBoxes[3].y, 0);
  189 |   } else if (testInfo.project.name === "desktop-1024") {
  190 |     expect(valueBoxes[0].y).toBeCloseTo(valueBoxes[2].y, 0);
  191 |     expect(routeBoxes[0].y).toBeCloseTo(routeBoxes[3].y, 0);
  192 |   } else if (testInfo.project.name === "tablet-768") {
  193 |     expect(valueBoxes[0].y).toBeCloseTo(valueBoxes[1].y, 0);
  194 |     expect(valueBoxes[2].y).toBeGreaterThan(valueBoxes[0].y);
  195 |     expect(routeBoxes[0].y).toBeCloseTo(routeBoxes[1].y, 0);
  196 |     expect(routeBoxes[2].y).toBeGreaterThan(routeBoxes[0].y);
  197 |   } else {
  198 |     expect(valueBoxes[1].y).toBeGreaterThan(valueBoxes[0].y);
  199 |     expect(routeBoxes[1].y).toBeGreaterThan(routeBoxes[0].y);
  200 |     expect(impactBoxes[1].y).toBeGreaterThan(impactBoxes[0].y);
  201 | 
  202 |     for (const name of [
  203 |       "Join Our Discord",
  204 |       "Review Membership",
  205 |       "Explore Projects",
  206 |     ]) {
  207 |       const box = await page
  208 |         .getByRole("link", { name, exact: true })
  209 |         .boundingBox();
  210 |       expect(box.width).toBeGreaterThan(300);
  211 |     }
  212 |   }
  213 | 
  214 |   if (testInfo.project.name !== "mobile-390") {
  215 |     expect(impactBoxes[0].y).toBeCloseTo(impactBoxes[1].y, 0);
  216 |   }
  217 | });
  218 | 
  219 | test("About page controls have visible keyboard focus", async ({ page }) => {
  220 |   await page.goto("/about", { waitUntil: "domcontentloaded" });
  221 |   const firstRoute = page.getByRole("link", {
  222 |     name: "Explore learning",
  223 |     exact: true,
  224 |   });
  225 |   await firstRoute.focus();
  226 |   await expect(firstRoute).toBeFocused();
  227 |   await expect(firstRoute).toHaveCSS("outline-style", /auto|solid/);
  228 | });
  229 | 
```