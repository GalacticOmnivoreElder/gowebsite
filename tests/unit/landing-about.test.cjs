const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(
  path.resolve(__dirname, "../../src/app/(main)/page.js"),
  "utf8"
);

test("landing About section uses the approved three-paragraph copy", () => {
  assert.match(source, /<h2[^>]*>\s*About Galactic Omnivore\s*<\/h2>/);
  assert.match(
    source,
    /Galactic Omnivore is an[\s\S]*independent nonprofit[\s\S]*game-development community and platform based in Skopje and active\s+across North Macedonia and beyond\./
  );
  assert.match(
    source,
    /GOHQ is our human ground station-a place where[\s\S]*useful signals become practical routes[\s\S]*We help creators learn game-development skills, find collaborators\s+and suitable project roles, strengthen their portfolios, structure\s+their work, and move ideas toward their[\s\S]*next playable milestone/
  );
  assert.match(
    source,
    /We also support suitable projects through mentorship, visibility,\s+publishing preparation, and pathways to relevant digital\s+storefronts\. Throughout the process, we protect[\s\S]*clear terms, proper credit, and fair collaboration/
  );
  assert.match(source, /space-y-7/);
});

test("landing About section keeps its storefront wording accurate and accessible", () => {
  assert.match(
    source,
    /Publishing and distribution pathways may include:/
  );
  assert.match(
    source,
    /alt="Steam, DriveThruRPG, and itch\.io storefront logos"/
  );
  assert.match(source, /max-h-24[\s\S]*object-contain/);
  assert.doesNotMatch(source, /the only Game Dev\. Community in Macedonia/i);
  assert.doesNotMatch(
    source,
    /the world(?:’|'|&apos;)s most popular online stores/i
  );
});

test("landing About section centers wide layouts and remains readable on mobile", () => {
  assert.match(source, /mx-auto max-w-4xl/);
  assert.match(source, /text-left[\s\S]*sm:text-center/);
  assert.match(source, /id="about"[\s\S]*scroll-mt-24/);
});
