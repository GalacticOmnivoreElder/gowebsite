const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (path) => fs.readFileSync(path, "utf8");

test("the canonical profile CV route renders the shared CV workspace", () => {
  const route = read("src/app/(main)/profile/cv/page.js");
  const workspace = read("src/components/profile/CvWorkspace.jsx");

  assert.match(route, /import CvWorkspace/);
  assert.match(route, /return <CvWorkspace \/>/);
  assert.match(workspace, /ProfileSectionTabs/);
  assert.match(workspace, /authedFetch\("\/api\/me\/cv", "GET"\)/);
  assert.match(workspace, /authedFetch\("\/api\/me\/cv", "POST"\)/);
  assert.match(workspace, /authedFetch\("\/api\/me\/cv", "PATCH"/);
  assert.match(workspace, /authedFetch\("\/api\/me\/cv", "PUT"\)/);
  assert.match(workspace, /visibility_project_creators/);
  assert.match(workspace, /visibility_public/);
  assert.match(workspace, /visibility_job_matching/);
  assert.match(workspace, /CvDownloadButton/);
  assert.match(workspace, /UNSAVED_CHANGES_MESSAGE/);
  assert.match(route, /GameDev Passport \| Galactic Omnivore/);
  assert.match(
    workspace,
    /Your GameDev Passport is a reusable game-development resume\/CV/
  );
  assert.match(workspace, /use when applying to\s+projects/);
});

test("legacy /cv preserves query parameters and redirects to /profile/cv", () => {
  const legacyRoute = read("src/app/cv/page.js");

  assert.match(legacyRoute, /const legacyParams = await searchParams/);
  assert.match(legacyRoute, /nextParams\.append\(key, item\)/);
  assert.match(legacyRoute, /redirect\(`\/profile\/cv/);
});

test("headers omit Passport navigation while Profile keeps the canonical destination", () => {
  const header = read("src/components/Header.jsx");
  const missionHub = read("src/components/profile/MissionHub.jsx");
  const onboarding = read("src/app/onboarding/page.js");
  const emailEvents = read("src/lib/email/templates/events.js");
  const profilePage = read("src/app/(main)/profile/page.js");
  const profileTabs = read("src/components/profile/ProfileSectionTabs.jsx");

  for (const source of [missionHub, onboarding, emailEvents]) {
    assert.match(source, /\/profile\/cv/);
  }
  assert.doesNotMatch(header, /\/profile\/cv/);
  assert.doesNotMatch(header, /My CV|GameDev Passport/);
  assert.doesNotMatch(header, /href="\/cv"/);
  assert.doesNotMatch(missionHub, /href="\/cv"/);
  assert.match(profilePage, /<ProfileSectionTabs \/>/);
  assert.match(profilePage, /router\.push\("\/profile\/cv"\)/);
  assert.match(profileTabs, /GameDev Passport/);
});

test("the CV workspace preserves the intended destination through authentication", () => {
  const workspace = read("src/components/profile/CvWorkspace.jsx");

  assert.match(workspace, /const CV_DESTINATION = "\/profile\/cv"/);
  assert.match(
    workspace,
    /router\.replace\(`\/login\?redirect=\$\{encodeURIComponent\(CV_DESTINATION\)\}`\)/
  );
});

test("user-facing Passport surfaces no longer use My CV or GO CV headings", () => {
  const sources = [
    read("src/components/profile/CvWorkspace.jsx"),
    read("src/components/profile/MissionHub.jsx"),
    read("src/components/profile/ProfileSectionTabs.jsx"),
    read("src/app/onboarding/page.js"),
  ];

  for (const source of sources) {
    assert.doesNotMatch(source, /My CV|GO CV/);
  }
});

test("onboarding and Passport editing expose explicit availability controls", () => {
  const onboarding = read("src/app/onboarding/page.js");
  const workspace = read("src/components/profile/CvWorkspace.jsx");

  for (const source of [onboarding, workspace]) {
    assert.match(source, /Available for opportunities/);
    assert.match(source, /Not currently available/);
    assert.match(source, /RadioGroup/);
  }
});
