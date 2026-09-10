# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: product-navigation.spec.js >> homepage separates the GO pillars from the actionable orbits
- Location: tests\product-navigation.spec.js:56:1

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('section[aria-labelledby="orbits-heading"]').locator('article')
Expected: 6
Received: 7
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" with timeout 5000ms
  - waiting for locator('section[aria-labelledby="orbits-heading"]').locator('article')
    14 × locator resolved to 7 elements
       - unexpected value "7"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - generic [ref=e4]:
        - link [ref=e6] [cursor=pointer]:
          - /url: /
          - img "Galactic Omnivore" [ref=e7]
        - button "Open navigation" [ref=e9] [cursor=pointer]
    - main [ref=e11]:
      - generic [ref=e12]:
        - region [ref=e13]:
          - generic [ref=e15]:
            - paragraph [ref=e16]: From game creators, for game creators-and more.
            - heading "Unite. Create. Evolve." [level=1] [ref=e17]
            - paragraph [ref=e18]: Galactic Omnivore is a nonprofit game-development community and platform from North Macedonia. Learn practical skills, find collaborators and projects, share your work, and move toward your next playable milestone.
            - generic [ref=e19]:
              - link "Join Our Discord" [ref=e20] [cursor=pointer]:
                - /url: https://discord.gg/ZbSShxu6K4
              - link "Schedule a Call" [ref=e21] [cursor=pointer]:
                - /url: https://calendar.app.google/Ge6GvfiaaaMhAHHf6
              - link "Learn More" [ref=e22] [cursor=pointer]:
                - /url: /about
        - region "Most popular community skills" [ref=e23]:
          - generic [ref=e24]:
            - generic [ref=e25]:
              - generic [ref=e26]: Game Designer
              - generic [ref=e27]: Project Management
              - generic [ref=e28]: Game Design
              - generic [ref=e29]: Marketing / Community
              - generic [ref=e30]: Programmer
              - generic [ref=e31]: 2D Artist
              - generic [ref=e32]: Aseprite
              - generic [ref=e33]: Git
              - generic [ref=e34]: Godot
              - generic [ref=e35]: Producer / Project Manager
              - generic [ref=e36]: Unity
              - generic [ref=e37]: Animator
              - generic [ref=e38]: Level Design
              - generic [ref=e39]: Notion
            - generic [ref=e40]:
              - generic [ref=e41]: Game Designer
              - generic [ref=e42]: Project Management
              - generic [ref=e43]: Game Design
              - generic [ref=e44]: Marketing / Community
              - generic [ref=e45]: Programmer
              - generic [ref=e46]: 2D Artist
              - generic [ref=e47]: Aseprite
              - generic [ref=e48]: Git
              - generic [ref=e49]: Godot
              - generic [ref=e50]: Producer / Project Manager
              - generic [ref=e51]: Unity
              - generic [ref=e52]: Animator
              - generic [ref=e53]: Level Design
              - generic [ref=e54]: Notion
        - region "Galactic Omnivore collaborators" [ref=e55]:
          - generic [ref=e57]:
            - img "Partner 1" [ref=e59]
            - img "Partner 2" [ref=e61]
            - img "Partner 5" [ref=e63]
            - img "Partner 6" [ref=e65]
            - img "Partner 7" [ref=e67]
            - img "Partner 8" [ref=e69]
            - img "Partner 9" [ref=e71]
        - region [ref=e80]:
          - generic [ref=e81]:
            - generic [ref=e82]:
              - paragraph [ref=e83]: The GO path
              - heading "Learn. Build your portfolio. Move toward business." [level=2] [ref=e84]
              - paragraph [ref=e85]: Galactic Omnivore helps game creators develop practical skills, turn real work into visible experience, and build the foundations needed to launch and sustain projects.
            - list [ref=e86]:
              - listitem [ref=e87]:
                - article [ref=e88]:
                  - generic [ref=e89]: Pillar 01
                  - heading "Learn" [level=3] [ref=e95]
                  - paragraph [ref=e96]: Build practical game-development skills through courses, workshops, video bundles, shared resources, and community knowledge.
              - listitem [ref=e101]:
                - article [ref=e102]:
                  - generic [ref=e103]: Pillar 02
                  - heading "Portfolio" [level=3] [ref=e109]
                  - paragraph [ref=e110]: Turn real contributions, completed work, and project experience into credited evidence through your profile and GameDev Passport.
              - listitem [ref=e115]:
                - article [ref=e116]:
                  - generic [ref=e117]: Pillar 03
                  - heading "Business" [level=3] [ref=e122]
                  - paragraph [ref=e123]: Create clear project briefs, find the right collaborators, manage production, and move promising work toward sustainable opportunities.
        - region [ref=e125]:
          - generic [ref=e126]:
            - generic [ref=e127]:
              - paragraph [ref=e128]: Product routes through GO
              - heading "Choose your next orbit" [level=2] [ref=e129]
              - paragraph [ref=e130]: Find the project, guidance, learning, resources, or community route that fits your current mission.
            - generic [ref=e131]:
              - article [ref=e132]:
                - generic [ref=e134]:
                  - generic [ref=e135]: Route 01 / Collaborate
                  - heading "Find a Project" [level=3] [ref=e136]
                - generic [ref=e141]:
                  - generic [ref=e145]: Navigation channel online
                  - paragraph [ref=e147]: Browse approved game-development briefs and find a role that matches your skills and availability.
                  - paragraph [ref=e148]: Review the project terms, current stage, and listed contribution routes before applying.
                - link "Browse projects" [ref=e153] [cursor=pointer]:
                  - /url: /projects
              - article [ref=e156]:
                - generic [ref=e158]:
                  - generic [ref=e159]: Route 02 / Launch
                  - heading "Create a Project" [level=3] [ref=e160]
                - generic [ref=e164]:
                  - generic [ref=e168]: Navigation channel online
                  - paragraph [ref=e170]: Create a clear project brief, recruit collaborators, and manage a game-development team.
                  - paragraph [ref=e171]: Project creation and team-management tools are included with GO Business.
                - link "Review Business access" [ref=e176] [cursor=pointer]:
                  - /url: /membership?reason=creator
              - article [ref=e179]:
                - generic [ref=e181]:
                  - generic [ref=e182]: Route 03 / Guidance
                  - heading "Find a Mentor" [level=3] [ref=e183]
                - generic [ref=e190]:
                  - generic [ref=e194]: Navigation channel online
                  - paragraph [ref=e196]: Browse approved mentor profiles and request focused guidance when matching is enabled.
                  - paragraph [ref=e197]: Completed engagements support private direct reviews and optional author-consented mentor references.
                - link "Explore mentorship" [ref=e202] [cursor=pointer]:
                  - /url: /mentorship
              - article [ref=e205]:
                - generic [ref=e207]:
                  - generic [ref=e208]: Route 04 / Develop
                  - heading "Learn" [level=3] [ref=e209]
                - generic [ref=e214]:
                  - generic [ref=e218]: Navigation channel online
                  - paragraph [ref=e220]: Build practical skills through current learning material and community knowledge.
                  - paragraph [ref=e221]: Choose material that fits your role, current level, and next playable milestone.
                - link "Explore learning" [ref=e226] [cursor=pointer]:
                  - /url: /education
              - article [ref=e229]:
                - generic [ref=e231]:
                  - generic [ref=e232]: Route 05 / Watch
                  - heading "Video Bundles" [level=3] [ref=e233]
                - generic [ref=e240]:
                  - generic [ref=e244]: Navigation channel online
                  - paragraph [ref=e246]: Follow focused video collections through eligible learning content.
                  - paragraph [ref=e247]: Published availability, membership access, and progress are shown on each bundle without promising unavailable material.
                - link "Browse video bundles" [ref=e252] [cursor=pointer]:
                  - /url: /video-bundles
              - article [ref=e255]:
                - generic [ref=e257]:
                  - generic [ref=e258]: Route 06 / Connect
                  - heading "Community Resources" [level=3] [ref=e259]
                - generic [ref=e265]:
                  - generic [ref=e269]: Navigation channel online
                  - paragraph [ref=e271]: Explore current resources, approved community asset packs, creator stories, games, and Discord.
                  - paragraph [ref=e272]: Each resource route shows its published availability and any membership or account requirement.
                - link "Explore resources" [ref=e277] [cursor=pointer]:
                  - /url: /resources
              - article [ref=e280]:
                - generic [ref=e282]:
                  - generic [ref=e283]: Route 07 / Transmit
                  - heading "GO Events" [level=3] [ref=e284]
                - generic [ref=e292]:
                  - generic [ref=e296]: Navigation channel online
                  - paragraph [ref=e298]: Join workshops, meetups, mentorship sessions, and practical conversations for your next stage in game development.
                  - paragraph [ref=e299]: Follow the live public calendar and choose the event route that fits your current mission.
                - link "Explore GO Events" [ref=e304] [cursor=pointer]:
                  - /url: /community#events
        - generic [ref=e309]:
          - heading "About Galactic Omnivore" [level=2] [ref=e310]
          - generic [ref=e311]:
            - paragraph [ref=e312]:
              - text: Galactic Omnivore is an
              - strong [ref=e313]: independent nonprofit
              - text: game-development community and platform based in Skopje and active across North Macedonia and beyond.
            - paragraph [ref=e314]:
              - text: GOHQ is our human ground station-a place where
              - strong [ref=e315]: useful signals become practical routes
              - text: . We help creators learn game-development skills, find collaborators and suitable project roles, strengthen their portfolios, structure their work, and move ideas toward their
              - strong [ref=e316]: next playable milestone
              - text: .
            - paragraph [ref=e317]:
              - text: We also support suitable projects through mentorship, visibility, publishing preparation, and pathways to relevant digital storefronts. Throughout the process, we protect
              - strong [ref=e318]: clear terms, proper credit, and fair collaboration
              - text: .
          - figure "Publishing and distribution pathways may include:" [ref=e319]:
            - img "Steam, DriveThruRPG, and itch.io storefront logos" [ref=e321]
        - region [ref=e322]:
          - generic [ref=e323]:
            - generic [ref=e324]:
              - generic [ref=e325]:
                - paragraph [ref=e326]: Follow the signal
                - heading "Explore Galactic Omnivore" [level=2] [ref=e327]
              - paragraph [ref=e328]: Read the latest signal, review listed games, find material for a current task, or check the community route. Choose the path that moves your work one step forward.
            - generic [ref=e329]:
              - tablist "Explore Galactic Omnivore" [ref=e330]:
                - tab "GO Signal" [selected] [ref=e331] [cursor=pointer]
                - tab "Games" [ref=e335] [cursor=pointer]
                - tab "Resources" [ref=e338] [cursor=pointer]
                - tab "Community" [ref=e342] [cursor=pointer]
              - tabpanel "GO Signal" [ref=e348]:
                - generic [ref=e349]:
                  - generic [ref=e350]:
                    - generic [ref=e351]: Latest from GO Signal
                    - heading "Immersive Transformation of the Glagolitic" [level=3] [ref=e352]
                    - paragraph [ref=e353]: From letter to space, from cultural memory to immersive experience On 21 August 2026 at 20:00, the Museum of Contemporary Art – Skopje will open Immersive Transformation of the Glagolitic, a solo exhibition by Laze Tripkov. The exhibition is curated by Lenka Sýkorová, with Vladimir Janchevski as co-curator. The project is the result of a […]
                    - list "GO Signal highlights" [ref=e354]:
                      - listitem [ref=e355]: Creator notes
                      - listitem [ref=e356]: Practical lessons
                      - listitem [ref=e357]: Project updates
                    - link "Read the latest post" [ref=e358] [cursor=pointer]:
                      - /url: /blog/immersive-transformation-of-the-glagolitic
                  - 'link "Read the latest post: Immersive Transformation of the Glagolitic"':
                    - /url: /blog/immersive-transformation-of-the-glagolitic
                    - img "Immersive Transformation of the Glagolitic"
                    - generic [ref=e361] [cursor=pointer]: "01"
                    - paragraph [ref=e363] [cursor=pointer]: 8/13/2026
        - generic [ref=e367]:
          - generic [ref=e368]: What Our Community Says
          - generic [ref=e370]:
            - generic [ref=e371]:
              - generic [ref=e372]:
                - generic [ref=e374]:
                  - generic [ref=e375]:
                    - img "Image of Ivan Kikerkov" [ref=e376]
                    - generic [ref=e377]:
                      - heading "Ivan Kikerkov" [level=3] [ref=e378]
                      - paragraph [ref=e379]: Founder
                  - paragraph [ref=e381]: “I love making games every day, and that's why I founded Galactic Omnivore.”
                  - link "More" [ref=e383] [cursor=pointer]:
                    - /url: https://kikerkov.itch.io/
                - generic [ref=e385]:
                  - generic [ref=e386]:
                    - img "Image of Andreja Popovik" [ref=e387]
                    - generic [ref=e388]:
                      - heading "Andreja Popovik" [level=3] [ref=e389]
                      - paragraph [ref=e390]: Community Member
                  - paragraph [ref=e392]: “Galactic omnivore provided an already established community with talented people that eagerly awaited a challenge within the TTRPG genre and this is h...”
                  - link "More" [ref=e394] [cursor=pointer]:
                    - /url: https://linktr.ee/PrintNplay
                - generic [ref=e396]:
                  - generic [ref=e397]:
                    - img "Image of Andrej Burovski" [ref=e398]
                    - generic [ref=e399]:
                      - heading "Andrej Burovski" [level=3] [ref=e400]
                      - paragraph [ref=e401]: Community Member
                  - paragraph [ref=e403]: “The game development community has been an exceptional source of inspiration and support, fueling my creativity and enhancing my skills. The collabora...”
                  - link "More" [ref=e405] [cursor=pointer]:
                    - /url: https://k32n31-p4n1c.github.io/Index.html
              - button "Previous testimonials" [disabled] [ref=e406]
              - button "Next testimonials" [ref=e409] [cursor=pointer]
            - generic [ref=e412]:
              - button "Show testimonial page 1" [ref=e413] [cursor=pointer]
              - button "Show testimonial page 2" [ref=e414] [cursor=pointer]
              - button "Show testimonial page 3" [ref=e415] [cursor=pointer]
        - generic [ref=e419]:
          - heading "Join the GO community on Discord" [level=2] [ref=e420]
          - paragraph [ref=e421]: Read the community rules, introduce your current craft, and choose one useful first action. You can also observe before you take part.
          - link "Open GO Discord" [ref=e422] [cursor=pointer]:
            - /url: https://discord.gg/ZbSShxu6K4
        - generic [ref=e426]:
          - heading "Plan a visit to GOHQ" [level=2] [ref=e430]
          - paragraph [ref=e431]: Visits are scheduled in advance
          - paragraph [ref=e432]: Open the calendar to see current availability and choose a time. Your booking confirmation provides the visit details.
          - generic [ref=e433]:
            - paragraph [ref=e434]: Visit by appointment
            - paragraph [ref=e435]: Check current availability
          - link "View visit calendar" [ref=e436] [cursor=pointer]:
            - /url: https://calendar.app.google/Ge6GvfiaaaMhAHHf6
        - region [ref=e437]:
          - generic [ref=e438]:
            - heading "Find your place in Galactic Omnivore" [level=2] [ref=e439]
            - paragraph [ref=e440]: Whether you want to learn, contribute to a project, find collaborators, present your work, or support the community, there is a practical route into GO.
            - generic [ref=e441]:
              - link "Join Our Discord" [ref=e442] [cursor=pointer]:
                - /url: https://discord.gg/ZbSShxu6K4
              - link "Review Membership" [ref=e443] [cursor=pointer]:
                - /url: /membership
              - link "Explore Projects" [ref=e444] [cursor=pointer]:
                - /url: /projects
        - region [ref=e456]:
          - generic [ref=e458]:
            - heading "Join the GO mailing list" [level=2] [ref=e459]
            - paragraph [ref=e460]: Enter your email to receive updates from Galactic Omnivore.
            - form "Join the GO mailing list" [ref=e461]:
              - generic [ref=e462]: Email address
              - generic [ref=e463]:
                - textbox "Email address" [ref=e465]:
                  - /placeholder: you@example.com
                - button "Subscribe" [ref=e466] [cursor=pointer]
              - generic [ref=e467]:
                - text: Company
                - textbox [ref=e468]
              - generic [ref=e470] [cursor=pointer]:
                - checkbox "I agree to receive email updates from Galactic Omnivore and understand that I can unsubscribe at any time. See the Privacy Policy." [ref=e471]
                - generic [ref=e472]:
                  - text: I agree to receive email updates from Galactic Omnivore and understand that I can unsubscribe at any time. See the
                  - link "Privacy Policy" [ref=e473]:
                    - /url: /privacy
                  - text: .
    - contentinfo [ref=e474]:
      - generic [ref=e475]:
        - generic [ref=e476]:
          - generic [ref=e477]:
            - link "Galactic Omnivore" [ref=e478] [cursor=pointer]:
              - /url: /
            - paragraph [ref=e479]: A North Macedonian nonprofit community and platform helping game creators move toward the next playable milestone.
            - generic [ref=e480]:
              - link "Link to Facebook" [ref=e481] [cursor=pointer]:
                - /url: https://www.facebook.com/profile.php?id=100088917386120
                - generic [ref=e484]: Facebook
              - link "Link to Twitter" [ref=e485] [cursor=pointer]:
                - /url: https://twitter.com/GalacticOmnivor
                - generic [ref=e489]: Twitter
              - link "Link to Instagram" [ref=e490] [cursor=pointer]:
                - /url: https://www.instagram.com/galacticomnivore/
                - generic [ref=e494]: Instagram
              - link "Link to LinkedIn" [ref=e495] [cursor=pointer]:
                - /url: https://www.linkedin.com/company/galactic-omnivore/
                - generic [ref=e500]: LinkedIn
              - link "Link to YouTube" [ref=e501] [cursor=pointer]:
                - /url: https://www.youtube.com/@galacticomnivore
                - generic [ref=e505]: YouTube
              - link "Link to Twitch" [ref=e506] [cursor=pointer]:
                - /url: https://www.twitch.tv/galactic_omnivore
                - generic [ref=e509]: Twitch
              - link "Link to Discord" [ref=e510] [cursor=pointer]:
                - /url: https://discord.gg/ZbSShxu6K4
                - generic [ref=e511]: Discord
          - generic [ref=e512]:
            - heading "Resources" [level=3] [ref=e513]
            - list [ref=e514]:
              - listitem [ref=e515]:
                - link "GO Signal" [ref=e516] [cursor=pointer]:
                  - /url: /blog
              - listitem [ref=e517]:
                - link "Education" [ref=e518] [cursor=pointer]:
                  - /url: /education
              - listitem [ref=e519]:
                - link "GO Events" [ref=e520] [cursor=pointer]:
                  - /url: /events
              - listitem [ref=e521]:
                - link "Resources" [ref=e522] [cursor=pointer]:
                  - /url: /resources
              - listitem [ref=e523]:
                - link "FAQ" [ref=e524] [cursor=pointer]:
                  - /url: /faq
          - generic [ref=e525]:
            - heading "Organization" [level=3] [ref=e526]
            - list [ref=e527]:
              - listitem [ref=e528]:
                - link "About GO" [ref=e529] [cursor=pointer]:
                  - /url: /about
              - listitem [ref=e530]:
                - link "Membership" [ref=e531] [cursor=pointer]:
                  - /url: /membership
              - listitem [ref=e532]:
                - link "Contact" [ref=e533] [cursor=pointer]:
                  - /url: /contact
        - generic [ref=e535]:
          - heading "Newsletter" [level=3] [ref=e536]
          - paragraph [ref=e537]: Join the Galactic Omnivore mailing list.
          - form "Newsletter" [ref=e538]:
            - generic [ref=e539]: Email address
            - generic [ref=e540]:
              - textbox "Email address" [ref=e542]:
                - /placeholder: you@example.com
              - button "Subscribe" [ref=e543] [cursor=pointer]
            - generic [ref=e544]:
              - text: Company
              - textbox [ref=e545]
            - generic [ref=e547] [cursor=pointer]:
              - checkbox "I agree to receive email updates from Galactic Omnivore and understand that I can unsubscribe at any time. See the Privacy Policy." [ref=e548]
              - generic [ref=e549]:
                - text: I agree to receive email updates from Galactic Omnivore and understand that I can unsubscribe at any time. See the
                - link "Privacy Policy" [ref=e550]:
                  - /url: /privacy
                - text: .
        - generic [ref=e551]:
          - paragraph [ref=e552]: © 2026 Galactic Omnivore. All rights reserved.
          - generic [ref=e553]:
            - link "Terms of Service" [ref=e554] [cursor=pointer]:
              - /url: /terms
            - link "Privacy Policy" [ref=e555] [cursor=pointer]:
              - /url: /privacy
            - link "Cookie Policy" [ref=e556] [cursor=pointer]:
              - /url: /cookies
            - button "Cookie settings" [ref=e557] [cursor=pointer]
  - region "Notifications (F8)":
    - list
  - alert [ref=e558]
  - generic [ref=e561]:
    - paragraph [ref=e563]:
      - text: We use essential cookies to operate GO. Optional analytics cookies are enabled only if you choose them.
      - link "Learn more" [ref=e564] [cursor=pointer]:
        - /url: /cookies
    - generic [ref=e565]:
      - button "Cookie Settings" [ref=e566] [cursor=pointer]
      - button "Reject All" [ref=e567] [cursor=pointer]
      - button "Accept All" [ref=e568] [cursor=pointer]
  - iframe [ref=e569]:
    
```

# Test source

```ts
  1   | const { expect, test } = require("@playwright/test");
  2   | 
  3   | function watchBrowserErrors(page) {
  4   |   const errors = [];
  5   |   page.browserErrors = errors;
  6   | 
  7   |   page.on("console", (message) => {
  8   |     const isKnownReactCompatibilityWarning = message
  9   |       .text()
  10  |       .includes("Accessing element.ref was removed in React 19");
  11  |     if (message.type() === "error" && !isKnownReactCompatibilityWarning) {
  12  |       errors.push(message.text());
  13  |     }
  14  |   });
  15  |   page.on("pageerror", (error) => errors.push(error.message));
  16  | 
  17  |   return errors;
  18  | }
  19  | 
  20  | async function expectHealthyPage(page) {
  21  |   await expect(page.locator("body")).toBeVisible();
  22  |   const refreshBoundary = page.getByRole("heading", {
  23  |     level: 1,
  24  |     name: "The site needs a refresh",
  25  |   });
  26  |   if (await refreshBoundary.count()) {
  27  |     await page.waitForTimeout(250);
  28  |     throw new Error(
  29  |       `Application error boundary rendered: ${JSON.stringify(page.browserErrors)}`
  30  |     );
  31  |   }
  32  |   await expect(
  33  |     page.locator(
  34  |       "[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay"
  35  |     )
  36  |   ).toHaveCount(0);
  37  | 
  38  |   const hasHorizontalOverflow = await page.evaluate(
  39  |     () => document.documentElement.scrollWidth > window.innerWidth + 1
  40  |   );
  41  |   expect(hasHorizontalOverflow).toBeFalsy();
  42  | }
  43  | 
  44  | async function expectLearningCategoryNav(page, activeLabel) {
  45  |   const learningNav = page.locator('nav[aria-label="Learning categories"]');
  46  |   await expect(learningNav).toBeVisible();
  47  |   await expect(
  48  |     learningNav.getByText(activeLabel, { exact: true })
  49  |   ).toHaveAttribute("aria-current", "page");
  50  | 
  51  |   for (const label of ["Courses", "Workshops", "Video Bundles", "Resources"]) {
  52  |     await expect(learningNav.getByText(label, { exact: true })).toBeVisible();
  53  |   }
  54  | }
  55  | 
  56  | test("homepage separates the GO pillars from the actionable orbits", async ({
  57  |   page,
  58  | }, testInfo) => {
  59  |   const browserErrors = watchBrowserErrors(page);
  60  | 
  61  |   await page.goto("/", { waitUntil: "domcontentloaded" });
  62  |   await expectHealthyPage(page);
  63  | 
  64  |   const pillars = page.locator('section[aria-labelledby="go-pillars-heading"]');
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
> 77  |   await expect(orbits.locator("article")).toHaveCount(6);
      |                                           ^ Error: expect(locator).toHaveCount(expected) failed
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
  165 |   await expect(page.getByRole("tab", { name: "Workshops" })).toHaveAttribute(
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
```