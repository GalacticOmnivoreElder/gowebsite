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
        - generic [ref=e5]:
          - link [ref=e6] [cursor=pointer]:
            - /url: /
            - img "Galactic Omnivore" [ref=e7]
          - navigation "Primary navigation" [ref=e8]:
            - link "Projects" [ref=e9] [cursor=pointer]:
              - /url: /projects
            - link "Mentorship" [ref=e10] [cursor=pointer]:
              - /url: /mentorship
            - navigation "Main" [ref=e11]:
              - list [ref=e13]:
                - listitem [ref=e14]:
                  - button "Learn" [ref=e15] [cursor=pointer]
            - link "Community" [ref=e18] [cursor=pointer]:
              - /url: /community
            - link "Membership" [ref=e19] [cursor=pointer]:
              - /url: /membership
        - generic [ref=e20]:
          - button "Review membership" [ref=e21] [cursor=pointer]
          - generic [ref=e22]:
            - link "Log in" [ref=e23] [cursor=pointer]:
              - /url: /login
            - link "Sign up" [ref=e24] [cursor=pointer]:
              - /url: /signup
    - main [ref=e25]:
      - generic [ref=e26]:
        - region [ref=e27]:
          - generic [ref=e29]:
            - paragraph [ref=e30]: From game creators, for game creators-and more.
            - heading "Unite. Create. Evolve." [level=1] [ref=e31]
            - paragraph [ref=e32]: Galactic Omnivore is a nonprofit game-development community and platform from North Macedonia. Learn practical skills, find collaborators and projects, share your work, and move toward your next playable milestone.
            - generic [ref=e33]:
              - link "Join Our Discord" [ref=e34] [cursor=pointer]:
                - /url: https://discord.gg/ZbSShxu6K4
              - link "Schedule a Call" [ref=e35] [cursor=pointer]:
                - /url: https://calendar.app.google/Ge6GvfiaaaMhAHHf6
              - link "Learn More" [ref=e36] [cursor=pointer]:
                - /url: /about
        - region "Most popular community skills" [ref=e37]:
          - generic [ref=e38]:
            - generic [ref=e39]:
              - generic [ref=e40]: Game Designer
              - generic [ref=e41]: Project Management
              - generic [ref=e42]: Game Design
              - generic [ref=e43]: Marketing / Community
              - generic [ref=e44]: Programmer
              - generic [ref=e45]: 2D Artist
              - generic [ref=e46]: Aseprite
              - generic [ref=e47]: Git
              - generic [ref=e48]: Godot
              - generic [ref=e49]: Producer / Project Manager
              - generic [ref=e50]: Unity
              - generic [ref=e51]: Animator
              - generic [ref=e52]: Level Design
              - generic [ref=e53]: Notion
            - generic [ref=e54]:
              - generic [ref=e55]: Game Designer
              - generic [ref=e56]: Project Management
              - generic [ref=e57]: Game Design
              - generic [ref=e58]: Marketing / Community
              - generic [ref=e59]: Programmer
              - generic [ref=e60]: 2D Artist
              - generic [ref=e61]: Aseprite
              - generic [ref=e62]: Git
              - generic [ref=e63]: Godot
              - generic [ref=e64]: Producer / Project Manager
              - generic [ref=e65]: Unity
              - generic [ref=e66]: Animator
              - generic [ref=e67]: Level Design
              - generic [ref=e68]: Notion
        - region "Galactic Omnivore collaborators" [ref=e69]:
          - generic [ref=e71]:
            - img "Partner 1" [ref=e73]
            - img "Partner 2" [ref=e75]
            - img "Partner 5" [ref=e77]
            - img "Partner 6" [ref=e79]
            - img "Partner 7" [ref=e81]
            - img "Partner 8" [ref=e83]
            - img "Partner 9" [ref=e85]
        - region [ref=e94]:
          - generic [ref=e95]:
            - generic [ref=e96]:
              - paragraph [ref=e97]: The GO path
              - heading "Learn. Build your portfolio. Move toward business." [level=2] [ref=e98]
              - paragraph [ref=e99]: Galactic Omnivore helps game creators develop practical skills, turn real work into visible experience, and build the foundations needed to launch and sustain projects.
            - list [ref=e100]:
              - listitem [ref=e101]:
                - article [ref=e102]:
                  - generic [ref=e103]: Pillar 01
                  - heading "Learn" [level=3] [ref=e109]
                  - paragraph [ref=e110]: Build practical game-development skills through courses, workshops, video bundles, shared resources, and community knowledge.
              - listitem [ref=e115]:
                - article [ref=e116]:
                  - generic [ref=e117]: Pillar 02
                  - heading "Portfolio" [level=3] [ref=e123]
                  - paragraph [ref=e124]: Turn real contributions, completed work, and project experience into credited evidence through your profile and GameDev Passport.
              - listitem [ref=e129]:
                - article [ref=e130]:
                  - generic [ref=e131]: Pillar 03
                  - heading "Business" [level=3] [ref=e136]
                  - paragraph [ref=e137]: Create clear project briefs, find the right collaborators, manage production, and move promising work toward sustainable opportunities.
        - region [ref=e139]:
          - generic [ref=e140]:
            - generic [ref=e141]:
              - paragraph [ref=e142]: Product routes through GO
              - heading "Choose your next orbit" [level=2] [ref=e143]
              - paragraph [ref=e144]: Find the project, guidance, learning, resources, or community route that fits your current mission.
            - generic [ref=e145]:
              - article [ref=e146]:
                - generic [ref=e148]:
                  - generic [ref=e149]: Route 01 / Collaborate
                  - heading "Find a Project" [level=3] [ref=e150]
                - generic [ref=e155]:
                  - generic [ref=e159]: Navigation channel online
                  - paragraph [ref=e161]: Browse approved game-development briefs and find a role that matches your skills and availability.
                  - paragraph [ref=e162]: Review the project terms, current stage, and listed contribution routes before applying.
                - link "Browse projects" [ref=e167] [cursor=pointer]:
                  - /url: /projects
              - article [ref=e170]:
                - generic [ref=e172]:
                  - generic [ref=e173]: Route 02 / Launch
                  - heading "Create a Project" [level=3] [ref=e174]
                - generic [ref=e178]:
                  - generic [ref=e182]: Navigation channel online
                  - paragraph [ref=e184]: Create a clear project brief, recruit collaborators, and manage a game-development team.
                  - paragraph [ref=e185]: Project creation and team-management tools are included with GO Business.
                - link "Review Business access" [ref=e190] [cursor=pointer]:
                  - /url: /membership?reason=creator
              - article [ref=e193]:
                - generic [ref=e195]:
                  - generic [ref=e196]: Route 03 / Guidance
                  - heading "Find a Mentor" [level=3] [ref=e197]
                - generic [ref=e204]:
                  - generic [ref=e208]: Navigation channel online
                  - paragraph [ref=e210]: Browse approved mentor profiles and request focused guidance when matching is enabled.
                  - paragraph [ref=e211]: Completed engagements support private direct reviews and optional author-consented mentor references.
                - link "Explore mentorship" [ref=e216] [cursor=pointer]:
                  - /url: /mentorship
              - article [ref=e219]:
                - generic [ref=e221]:
                  - generic [ref=e222]: Route 04 / Develop
                  - heading "Learn" [level=3] [ref=e223]
                - generic [ref=e228]:
                  - generic [ref=e232]: Navigation channel online
                  - paragraph [ref=e234]: Build practical skills through current learning material and community knowledge.
                  - paragraph [ref=e235]: Choose material that fits your role, current level, and next playable milestone.
                - link "Explore learning" [ref=e240] [cursor=pointer]:
                  - /url: /education
              - article [ref=e243]:
                - generic [ref=e245]:
                  - generic [ref=e246]: Route 05 / Watch
                  - heading "Video Bundles" [level=3] [ref=e247]
                - generic [ref=e254]:
                  - generic [ref=e258]: Navigation channel online
                  - paragraph [ref=e260]: Follow focused video collections through eligible learning content.
                  - paragraph [ref=e261]: Published availability, membership access, and progress are shown on each bundle without promising unavailable material.
                - link "Browse video bundles" [ref=e266] [cursor=pointer]:
                  - /url: /video-bundles
              - article [ref=e269]:
                - generic [ref=e271]:
                  - generic [ref=e272]: Route 06 / Connect
                  - heading "Community Resources" [level=3] [ref=e273]
                - generic [ref=e279]:
                  - generic [ref=e283]: Navigation channel online
                  - paragraph [ref=e285]: Explore current resources, approved community asset packs, creator stories, games, and Discord.
                  - paragraph [ref=e286]: Each resource route shows its published availability and any membership or account requirement.
                - link "Explore resources" [ref=e291] [cursor=pointer]:
                  - /url: /resources
              - article [ref=e294]:
                - generic [ref=e296]:
                  - generic [ref=e297]: Route 07 / Transmit
                  - heading "GO Events" [level=3] [ref=e298]
                - generic [ref=e306]:
                  - generic [ref=e310]: Navigation channel online
                  - paragraph [ref=e312]: Join workshops, meetups, mentorship sessions, and practical conversations for your next stage in game development.
                  - paragraph [ref=e313]: Follow the live public calendar and choose the event route that fits your current mission.
                - link "Explore GO Events" [ref=e318] [cursor=pointer]:
                  - /url: /community#events
        - generic [ref=e323]:
          - heading "About Galactic Omnivore" [level=2] [ref=e324]
          - generic [ref=e325]:
            - paragraph [ref=e326]:
              - text: Galactic Omnivore is an
              - strong [ref=e327]: independent nonprofit
              - text: game-development community and platform based in Skopje and active across North Macedonia and beyond.
            - paragraph [ref=e328]:
              - text: GOHQ is our human ground station-a place where
              - strong [ref=e329]: useful signals become practical routes
              - text: . We help creators learn game-development skills, find collaborators and suitable project roles, strengthen their portfolios, structure their work, and move ideas toward their
              - strong [ref=e330]: next playable milestone
              - text: .
            - paragraph [ref=e331]:
              - text: We also support suitable projects through mentorship, visibility, publishing preparation, and pathways to relevant digital storefronts. Throughout the process, we protect
              - strong [ref=e332]: clear terms, proper credit, and fair collaboration
              - text: .
          - figure "Publishing and distribution pathways may include:" [ref=e333]:
            - img "Steam, DriveThruRPG, and itch.io storefront logos" [ref=e335]
        - region [ref=e336]:
          - generic [ref=e337]:
            - generic [ref=e338]:
              - generic [ref=e339]:
                - paragraph [ref=e340]: Follow the signal
                - heading "Explore Galactic Omnivore" [level=2] [ref=e341]
              - paragraph [ref=e342]: Read the latest signal, review listed games, find material for a current task, or check the community route. Choose the path that moves your work one step forward.
            - generic [ref=e343]:
              - tablist "Explore Galactic Omnivore" [ref=e344]:
                - tab "GO Signal" [selected] [ref=e345] [cursor=pointer]
                - tab "Games" [ref=e349] [cursor=pointer]
                - tab "Resources" [ref=e352] [cursor=pointer]
                - tab "Community" [ref=e356] [cursor=pointer]
              - tabpanel "GO Signal" [ref=e362]:
                - generic [ref=e363]:
                  - generic [ref=e364]:
                    - generic [ref=e365]: Latest from GO Signal
                    - heading "Immersive Transformation of the Glagolitic" [level=3] [ref=e366]
                    - paragraph [ref=e367]: From letter to space, from cultural memory to immersive experience On 21 August 2026 at 20:00, the Museum of Contemporary Art – Skopje will open Immersive Transformation of the Glagolitic, a solo exhibition by Laze Tripkov. The exhibition is curated by Lenka Sýkorová, with Vladimir Janchevski as co-curator. The project is the result of a […]
                    - list "GO Signal highlights" [ref=e368]:
                      - listitem [ref=e369]: Creator notes
                      - listitem [ref=e370]: Practical lessons
                      - listitem [ref=e371]: Project updates
                    - link "Read the latest post" [ref=e372] [cursor=pointer]:
                      - /url: /blog/immersive-transformation-of-the-glagolitic
                  - 'link "Read the latest post: Immersive Transformation of the Glagolitic" [ref=e375] [cursor=pointer]':
                    - /url: /blog/immersive-transformation-of-the-glagolitic
                    - img "Immersive Transformation of the Glagolitic" [ref=e376]
                    - generic [ref=e378]: "01"
                    - paragraph [ref=e380]: 8/13/2026
        - generic [ref=e384]:
          - generic [ref=e385]: What Our Community Says
          - generic [ref=e387]:
            - generic [ref=e388]:
              - generic [ref=e389]:
                - generic [ref=e391]:
                  - generic [ref=e392]:
                    - img "Image of Ivan Kikerkov" [ref=e393]
                    - generic [ref=e394]:
                      - heading "Ivan Kikerkov" [level=3] [ref=e395]
                      - paragraph [ref=e396]: Founder
                  - paragraph [ref=e398]: “I love making games every day, and that's why I founded Galactic Omnivore.”
                  - link "More" [ref=e400] [cursor=pointer]:
                    - /url: https://kikerkov.itch.io/
                - generic [ref=e402]:
                  - generic [ref=e403]:
                    - img "Image of Andreja Popovik" [ref=e404]
                    - generic [ref=e405]:
                      - heading "Andreja Popovik" [level=3] [ref=e406]
                      - paragraph [ref=e407]: Community Member
                  - paragraph [ref=e409]: “Galactic omnivore provided an already established community with talented people that eagerly awaited a challenge within the TTRPG genre and this is h...”
                  - link "More" [ref=e411] [cursor=pointer]:
                    - /url: https://linktr.ee/PrintNplay
                - generic [ref=e413]:
                  - generic [ref=e414]:
                    - img "Image of Andrej Burovski" [ref=e415]
                    - generic [ref=e416]:
                      - heading "Andrej Burovski" [level=3] [ref=e417]
                      - paragraph [ref=e418]: Community Member
                  - paragraph [ref=e420]: “The game development community has been an exceptional source of inspiration and support, fueling my creativity and enhancing my skills. The collabora...”
                  - link "More" [ref=e422] [cursor=pointer]:
                    - /url: https://k32n31-p4n1c.github.io/Index.html
              - button "Previous testimonials" [disabled] [ref=e423]
              - button "Next testimonials" [disabled] [ref=e426]
            - button "Show testimonial page 1" [ref=e430] [cursor=pointer]
        - generic [ref=e434]:
          - heading "Join the GO community on Discord" [level=2] [ref=e435]
          - paragraph [ref=e436]: Read the community rules, introduce your current craft, and choose one useful first action. You can also observe before you take part.
          - link "Open GO Discord" [ref=e437] [cursor=pointer]:
            - /url: https://discord.gg/ZbSShxu6K4
        - generic [ref=e441]:
          - heading "Plan a visit to GOHQ" [level=2] [ref=e445]
          - paragraph [ref=e446]: Visits are scheduled in advance
          - paragraph [ref=e447]: Open the calendar to see current availability and choose a time. Your booking confirmation provides the visit details.
          - generic [ref=e448]:
            - paragraph [ref=e449]: Visit by appointment
            - paragraph [ref=e450]: Check current availability
          - link "View visit calendar" [ref=e451] [cursor=pointer]:
            - /url: https://calendar.app.google/Ge6GvfiaaaMhAHHf6
        - region [ref=e452]:
          - generic [ref=e453]:
            - heading "Find your place in Galactic Omnivore" [level=2] [ref=e454]
            - paragraph [ref=e455]: Whether you want to learn, contribute to a project, find collaborators, present your work, or support the community, there is a practical route into GO.
            - generic [ref=e456]:
              - link "Join Our Discord" [ref=e457] [cursor=pointer]:
                - /url: https://discord.gg/ZbSShxu6K4
              - link "Review Membership" [ref=e458] [cursor=pointer]:
                - /url: /membership
              - link "Explore Projects" [ref=e459] [cursor=pointer]:
                - /url: /projects
        - region [ref=e478]:
          - generic [ref=e480]:
            - heading "Join the GO mailing list" [level=2] [ref=e481]
            - paragraph [ref=e482]: Enter your email to receive updates from Galactic Omnivore.
            - form "Join the GO mailing list" [ref=e483]:
              - generic [ref=e484]: Email address
              - generic [ref=e485]:
                - textbox "Email address" [ref=e487]:
                  - /placeholder: you@example.com
                - button "Subscribe" [ref=e488] [cursor=pointer]
              - generic [ref=e489]:
                - text: Company
                - textbox [ref=e490]
              - generic [ref=e492] [cursor=pointer]:
                - checkbox "I agree to receive email updates from Galactic Omnivore and understand that I can unsubscribe at any time. See the Privacy Policy." [ref=e493]
                - generic [ref=e494]:
                  - text: I agree to receive email updates from Galactic Omnivore and understand that I can unsubscribe at any time. See the
                  - link "Privacy Policy" [ref=e495]:
                    - /url: /privacy
                  - text: .
    - contentinfo [ref=e496]:
      - generic [ref=e497]:
        - generic [ref=e498]:
          - generic [ref=e499]:
            - link "Galactic Omnivore" [ref=e500] [cursor=pointer]:
              - /url: /
            - paragraph [ref=e501]: A North Macedonian nonprofit community and platform helping game creators move toward the next playable milestone.
            - generic [ref=e502]:
              - link "Link to Facebook" [ref=e503] [cursor=pointer]:
                - /url: https://www.facebook.com/profile.php?id=100088917386120
                - generic [ref=e506]: Facebook
              - link "Link to Twitter" [ref=e507] [cursor=pointer]:
                - /url: https://twitter.com/GalacticOmnivor
                - generic [ref=e511]: Twitter
              - link "Link to Instagram" [ref=e512] [cursor=pointer]:
                - /url: https://www.instagram.com/galacticomnivore/
                - generic [ref=e516]: Instagram
              - link "Link to LinkedIn" [ref=e517] [cursor=pointer]:
                - /url: https://www.linkedin.com/company/galactic-omnivore/
                - generic [ref=e522]: LinkedIn
              - link "Link to YouTube" [ref=e523] [cursor=pointer]:
                - /url: https://www.youtube.com/@galacticomnivore
                - generic [ref=e527]: YouTube
              - link "Link to Twitch" [ref=e528] [cursor=pointer]:
                - /url: https://www.twitch.tv/galactic_omnivore
                - generic [ref=e531]: Twitch
              - link "Link to Discord" [ref=e532] [cursor=pointer]:
                - /url: https://discord.gg/ZbSShxu6K4
                - generic [ref=e533]: Discord
          - generic [ref=e534]:
            - heading "Resources" [level=3] [ref=e535]
            - list [ref=e536]:
              - listitem [ref=e537]:
                - link "GO Signal" [ref=e538] [cursor=pointer]:
                  - /url: /blog
              - listitem [ref=e539]:
                - link "Education" [ref=e540] [cursor=pointer]:
                  - /url: /education
              - listitem [ref=e541]:
                - link "GO Events" [ref=e542] [cursor=pointer]:
                  - /url: /events
              - listitem [ref=e543]:
                - link "Resources" [ref=e544] [cursor=pointer]:
                  - /url: /resources
              - listitem [ref=e545]:
                - link "FAQ" [ref=e546] [cursor=pointer]:
                  - /url: /faq
          - generic [ref=e547]:
            - heading "Organization" [level=3] [ref=e548]
            - list [ref=e549]:
              - listitem [ref=e550]:
                - link "About GO" [ref=e551] [cursor=pointer]:
                  - /url: /about
              - listitem [ref=e552]:
                - link "Membership" [ref=e553] [cursor=pointer]:
                  - /url: /membership
              - listitem [ref=e554]:
                - link "Contact" [ref=e555] [cursor=pointer]:
                  - /url: /contact
        - generic [ref=e557]:
          - heading "Newsletter" [level=3] [ref=e558]
          - paragraph [ref=e559]: Join the Galactic Omnivore mailing list.
          - form "Newsletter" [ref=e560]:
            - generic [ref=e561]: Email address
            - generic [ref=e562]:
              - textbox "Email address" [ref=e564]:
                - /placeholder: you@example.com
              - button "Subscribe" [ref=e565] [cursor=pointer]
            - generic [ref=e566]:
              - text: Company
              - textbox [ref=e567]
            - generic [ref=e569] [cursor=pointer]:
              - checkbox "I agree to receive email updates from Galactic Omnivore and understand that I can unsubscribe at any time. See the Privacy Policy." [ref=e570]
              - generic [ref=e571]:
                - text: I agree to receive email updates from Galactic Omnivore and understand that I can unsubscribe at any time. See the
                - link "Privacy Policy" [ref=e572]:
                  - /url: /privacy
                - text: .
        - generic [ref=e573]:
          - paragraph [ref=e574]: © 2026 Galactic Omnivore. All rights reserved.
          - generic [ref=e575]:
            - link "Terms of Service" [ref=e576] [cursor=pointer]:
              - /url: /terms
            - link "Privacy Policy" [ref=e577] [cursor=pointer]:
              - /url: /privacy
            - link "Cookie Policy" [ref=e578] [cursor=pointer]:
              - /url: /cookies
            - button "Cookie settings" [ref=e579] [cursor=pointer]
  - region "Notifications (F8)":
    - list
  - alert [ref=e580]
  - generic [ref=e583]:
    - paragraph [ref=e585]:
      - text: We use essential cookies to operate GO. Optional analytics cookies are enabled only if you choose them.
      - link "Learn more" [ref=e586] [cursor=pointer]:
        - /url: /cookies
    - generic [ref=e587]:
      - button "Cookie Settings" [ref=e588] [cursor=pointer]
      - button "Reject All" [ref=e589] [cursor=pointer]
      - button "Accept All" [ref=e590] [cursor=pointer]
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