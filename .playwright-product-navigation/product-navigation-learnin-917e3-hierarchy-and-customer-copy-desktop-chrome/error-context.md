# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: product-navigation.spec.js >> learning destinations use the shared hierarchy and customer copy
- Location: tests\product-navigation.spec.js:123:1

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator: getByRole('tab', { name: 'Workshops' })
Expected: "active"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveAttribute" with timeout 5000ms
  - waiting for getByRole('tab', { name: 'Workshops' })

```

```yaml
- banner:
  - link "Galactic Omnivore":
    - /url: /
    - img "Galactic Omnivore"
  - navigation "Primary navigation":
    - link "Projects":
      - /url: /projects
    - link "Mentorship":
      - /url: /mentorship
    - navigation "Main":
      - list:
        - listitem:
          - button "Learn"
    - link "Community":
      - /url: /community
    - link "Membership":
      - /url: /membership
  - button "Review membership"
  - link "Log in":
    - /url: /login
  - link "Sign up":
    - /url: /signup
- main:
  - main:
    - paragraph: GO Learning
    - heading "Education" [level=1]
    - paragraph: Build practical skills through GO courses and workshops.
    - paragraph: Open an activity to review its topic, level, schedule, eligibility, available places, and application requirements. Enrollment and application status are managed directly in your GO account.
    - navigation "Learning categories":
      - link "Courses":
        - /url: /education?format=course
      - text: Workshops
      - link "Video Bundles":
        - /url: /video-bundles
      - link "Resources":
        - /url: /resources
    - region "Available workshops":
      - heading "Available workshops" [level=2]
      - text: No workshops are published right now.
- contentinfo:
  - link "Galactic Omnivore":
    - /url: /
  - paragraph: A North Macedonian nonprofit community and platform helping game creators move toward the next playable milestone.
  - link "Link to Facebook":
    - /url: https://www.facebook.com/profile.php?id=100088917386120
    - img
    - text: Facebook
  - link "Link to Twitter":
    - /url: https://twitter.com/GalacticOmnivor
    - img
    - text: Twitter
  - link "Link to Instagram":
    - /url: https://www.instagram.com/galacticomnivore/
    - img
    - text: Instagram
  - link "Link to LinkedIn":
    - /url: https://www.linkedin.com/company/galactic-omnivore/
    - img
    - text: LinkedIn
  - link "Link to YouTube":
    - /url: https://www.youtube.com/@galacticomnivore
    - img
    - text: YouTube
  - link "Link to Twitch":
    - /url: https://www.twitch.tv/galactic_omnivore
    - img
    - text: Twitch
  - link "Link to Discord":
    - /url: https://discord.gg/ZbSShxu6K4
    - text: Discord
  - heading "Resources" [level=3]
  - list:
    - listitem:
      - link "GO Signal":
        - /url: /blog
    - listitem:
      - link "Education":
        - /url: /education
    - listitem:
      - link "GO Events":
        - /url: /events
    - listitem:
      - link "Resources":
        - /url: /resources
    - listitem:
      - link "FAQ":
        - /url: /faq
  - heading "Organization" [level=3]
  - list:
    - listitem:
      - link "About GO":
        - /url: /about
    - listitem:
      - link "Membership":
        - /url: /membership
    - listitem:
      - link "Contact":
        - /url: /contact
  - heading "Newsletter" [level=3]
  - paragraph: Join the Galactic Omnivore mailing list.
  - form "Newsletter":
    - text: Email address
    - textbox "Email address":
      - /placeholder: you@example.com
    - button "Subscribe"
    - checkbox "I agree to receive email updates from Galactic Omnivore and understand that I can unsubscribe at any time. See the Privacy Policy."
    - text: I agree to receive email updates from Galactic Omnivore and understand that I can unsubscribe at any time. See the
    - link "Privacy Policy":
      - /url: /privacy
    - text: .
  - paragraph: © 2026 Galactic Omnivore. All rights reserved.
  - link "Terms of Service":
    - /url: /terms
  - link "Privacy Policy":
    - /url: /privacy
  - link "Cookie Policy":
    - /url: /cookies
  - button "Cookie settings"
- region "Notifications (F8)":
  - list
- alert
- paragraph:
  - text: We use essential cookies to operate GO. Optional analytics cookies are enabled only if you choose them.
  - link "Learn more":
    - /url: /cookies
- button "Cookie Settings"
- button "Reject All"
- button "Accept All"
```

# Test source

```ts
  65  |   const orbits = page.locator('section[aria-labelledby="orbits-heading"]');
  66  |   await expect(pillars).toBeVisible();
  67  |   await expect(orbits).toBeVisible();
  68  |   await expect(
  69  |     pillars.getByRole("heading", {
  70  |       level: 2,
  71  |       name: "Learn. Build your portfolio. Move toward business.",
  72  |     })
  73  |   ).toBeVisible();
  74  |   await expect(pillars.locator("article")).toHaveCount(3);
  75  |   await expect(pillars.getByRole("link")).toHaveCount(0);
  76  |   await expect(pillars.getByRole("button")).toHaveCount(0);
  77  |   await expect(orbits.locator("article")).toHaveCount(6);
  78  | 
  79  |   const pillarBox = await pillars.boundingBox();
  80  |   const orbitBox = await orbits.boundingBox();
  81  |   expect(pillarBox).not.toBeNull();
  82  |   expect(orbitBox).not.toBeNull();
  83  |   expect(pillarBox.y).toBeLessThan(orbitBox.y);
  84  | 
  85  |   if (testInfo.project.name === "desktop-chrome") {
  86  |     const desktopNav = page.locator('nav[aria-label="Primary navigation"]');
  87  |     const learnTrigger = desktopNav.getByRole("button", { name: "Learn" });
  88  |     await expect(desktopNav).toBeVisible();
  89  |     const directDesktopLabels = await desktopNav
  90  |       .locator(":scope > a")
  91  |       .allTextContents();
  92  |     expect(directDesktopLabels).not.toContain("Video Bundles");
  93  |     expect(directDesktopLabels).not.toContain("Resources");
  94  | 
  95  |     await learnTrigger.focus();
  96  |     await expect(learnTrigger).toBeFocused();
  97  |     await page.keyboard.press("Enter");
  98  |     for (const label of ["Courses", "Workshops", "Video Bundles", "Resources"]) {
  99  |       await expect(desktopNav.getByRole("link", { name: label })).toBeVisible();
  100 |     }
  101 |   } else {
  102 |     await page.getByRole("button", { name: "Open navigation" }).click();
  103 |     const mobileNav = page.locator('nav[aria-label="Mobile navigation"]');
  104 |     await expect(mobileNav).toBeVisible();
  105 |     const directMobileLabels = await mobileNav
  106 |       .locator(":scope > a")
  107 |       .allTextContents();
  108 |     expect(directMobileLabels).not.toContain("Video Bundles");
  109 |     expect(directMobileLabels).not.toContain("Resources");
  110 | 
  111 |     const learnTrigger = mobileNav.getByRole("button", { name: "Learn" });
  112 |     await expect(learnTrigger).toHaveAttribute("aria-expanded", "false");
  113 |     await learnTrigger.click();
  114 |     await expect(learnTrigger).toHaveAttribute("aria-expanded", "true");
  115 |     for (const label of ["Courses", "Workshops", "Video Bundles", "Resources"]) {
  116 |       await expect(mobileNav.getByRole("link", { name: label })).toBeVisible();
  117 |     }
  118 |   }
  119 | 
  120 |   expect(browserErrors).toEqual([]);
  121 | });
  122 | 
  123 | test("learning destinations use the shared hierarchy and customer copy", async ({
  124 |   page,
  125 | }, testInfo) => {
  126 |   const browserErrors = watchBrowserErrors(page);
  127 | 
  128 |   await page.goto("/video-bundles", { waitUntil: "domcontentloaded" });
  129 |   await expectHealthyPage(page);
  130 |   await expect(page.getByRole("heading", { level: 1, name: "Video Bundles" })).toBeVisible();
  131 |   await expect(page.getByText(/Explore focused collections of game-development videos selected by GO/)).toBeVisible();
  132 |   await expectLearningCategoryNav(page, "Video Bundles");
  133 | 
  134 |   const emptyBundles = page.getByRole("heading", {
  135 |     level: 2,
  136 |     name: "No bundles available yet",
  137 |   });
  138 |   if (await emptyBundles.count()) {
  139 |     await expect(emptyBundles).toBeVisible();
  140 |     await expect(page.getByText("Coming soon", { exact: true })).toBeVisible();
  141 |     await expect(page.getByRole("link", { name: "Browse courses and workshops" })).toHaveAttribute("href", "/education");
  142 |   }
  143 | 
  144 |   await page.goto("/resources", { waitUntil: "domcontentloaded" });
  145 |   await expectHealthyPage(page);
  146 |   await expect(page.getByRole("heading", { level: 1, name: "Resources" })).toBeVisible();
  147 |   await expect(
  148 |     page.getByText(
  149 |       /Explore practical game-development material shared or selected by Galactic Omnivore/
  150 |     )
  151 |   ).toBeVisible();
  152 |   await expect(page.getByRole("link", { name: "Explore learning" })).toHaveCount(0);
  153 |   await expectLearningCategoryNav(page, "Resources");
  154 | 
  155 |   await page.goto("/education?format=course", {
  156 |     waitUntil: "domcontentloaded",
  157 |   });
  158 |   await expectHealthyPage(page);
  159 |   await expectLearningCategoryNav(page, "Courses");
  160 | 
  161 |   await page.goto("/education?format=workshop", {
  162 |     waitUntil: "domcontentloaded",
  163 |   });
  164 |   await expectHealthyPage(page);
> 165 |   await expect(page.getByRole("tab", { name: "Workshops" })).toHaveAttribute(
      |                                                              ^ Error: expect(locator).toHaveAttribute(expected) failed
  166 |     "data-state",
  167 |     "active"
  168 |   );
  169 |   await expectLearningCategoryNav(page, "Workshops");
  170 |   await page.locator('nav[aria-label="Learning categories"]').screenshot({
  171 |     path: testInfo.outputPath("learning-category-nav-workshops.png"),
  172 |     animations: "disabled",
  173 |   });
  174 | 
  175 |   if (testInfo.project.name === "desktop-chrome") {
  176 |     const learnTrigger = page
  177 |       .locator('nav[aria-label="Primary navigation"]')
  178 |       .getByRole("button", { name: "Learn" });
  179 |     await expect(learnTrigger).toHaveClass(/bg-primary/);
  180 |   } else {
  181 |     await page.getByRole("button", { name: "Open navigation" }).click();
  182 |     const learnTrigger = page
  183 |       .locator('nav[aria-label="Mobile navigation"]')
  184 |       .getByRole("button", { name: "Learn" });
  185 |     await expect(learnTrigger).toHaveClass(/bg-primary/);
  186 |   }
  187 | 
  188 |   expect(browserErrors).toEqual([]);
  189 | });
  190 | 
```