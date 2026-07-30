const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "../..");
const aboutPagePath = path.join(root, "src/app/about/page.js");
const source = fs.readFileSync(aboutPagePath, "utf8");

test("About page has the requested semantic section structure", () => {
  assert.equal((source.match(/<h1\b/g) || []).length, 1);
  assert.match(source, /Unite\. Create\. Evolve\./);
  assert.match(source, /About Galactic Omnivore/);
  assert.match(source, /title="Our purpose"/);
  assert.match(source, /title="Choose your route"/);
  assert.match(source, /title="Our values"/);
  assert.match(source, /title="Governance and transparency"/);
  assert.match(source, /title="Our story"/);
  assert.match(source, /title="Our impact"/);
  assert.match(source, /Find your place in Galactic Omnivore/);
});

test("About page preserves the four useful routes with real destinations", () => {
  const expectedRoutes = [
    ["Learn", "/education", "Explore learning"],
    ["Find a project", "/projects", "Browse project roles"],
    ["Create a project", "/project/create", "Create project brief"],
    ["Join the community", "/membership", "Review membership"],
  ];

  for (const [title, href, cta] of expectedRoutes) {
    assert.match(source, new RegExp(`title: "${title}"`));
    assert.match(source, new RegExp(`href: "${href.replace("/", "\\/")}"`));
    assert.match(source, new RegExp(`cta: "${cta}"`));
  }

  assert.match(source, /data-testid="about-routes"/);
  assert.match(source, /sm:grid-cols-2 lg:grid-cols-4/);
});

test("About page includes all values and impact areas", () => {
  for (const value of [
    "Honesty",
    "Evolution",
    "Knowledge",
    "Accountability",
    "Commitment",
    "Egalitarianism",
  ]) {
    assert.match(source, new RegExp(`title: "${value}"`));
  }

  for (const area of [
    "Education and mentorship",
    "Projects and collaboration",
    "Events and visibility",
    "Publishing and professional development",
  ]) {
    assert.match(source, new RegExp(`title: "${area}"`));
  }

  assert.match(source, /data-testid="about-values"/);
  assert.match(source, /sm:grid-cols-2 lg:grid-cols-3/);
  assert.match(source, /data-testid="about-impact"/);
});

test("About page exposes the verified official Statute PDF", () => {
  const viewUrl =
    "https://drive.google.com/file/d/1DRFhgeRC7GwwnC5u2W1IJOBc8SgOSxIm/view?usp=sharing";
  const downloadUrl =
    "https://drive.google.com/uc?export=download&id=1DRFhgeRC7GwwnC5u2W1IJOBc8SgOSxIm";

  assert.ok(source.includes(viewUrl));
  assert.ok(source.includes(downloadUrl));
  assert.match(source, /Official organizational document · PDF/);
  assert.match(source, /target="_blank"/);
  assert.match(source, /rel="noopener noreferrer"/);
  assert.match(source, /download="GO Statute \(25\.09\.2025\)\.pdf"/);
  assert.match(source, /aria-label="Read the GO Statute PDF in a new tab"/);
  assert.match(source, /aria-label="Download the GO Statute PDF"/);
  assert.match(source, /href="\/contact"/);
});

test("About page final actions use established destinations", () => {
  assert.match(source, /https:\/\/discord\.gg\/ZbSShxu6K4/);
  assert.match(source, /Join Our Discord/);
  assert.match(source, /<Link href="\/membership">Review Membership<\/Link>/);
  assert.match(source, /<Link href="\/projects">Explore Projects<\/Link>/);
  assert.match(source, /<Link href="\/projects">View our work<\/Link>/);
  assert.doesNotMatch(source, /href="#"/);
  assert.doesNotMatch(source, /Level up your game development journey!/);
  assert.doesNotMatch(source, />ENGAGE</);
  assert.doesNotMatch(source, /only game-development community/i);
});

test("About page reuses the shared cards and buttons", () => {
  assert.match(
    source,
    /import \{ Card, CardContent \} from "@\/components\/ui\/card"/
  );
  assert.match(
    source,
    /import \{ Button \} from "@\/components\/ui\/button"/
  );
  assert.match(source, /overflow-x-clip/);
  assert.match(source, /min-h-11/);
});
