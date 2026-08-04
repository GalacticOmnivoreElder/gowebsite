const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(
  path.resolve(__dirname, "../../src/components/landing/HeroSection.js"),
  "utf8"
);

test("landing hero uses the approved hierarchy and Voice of GO copy", () => {
  assert.match(
    source,
    /From game creators, for game creators-and more\./
  );
  assert.match(
    source,
    /Unite\. Create\. <span className="text-primary">Evolve\.<\/span>/
  );
  assert.match(
    source,
    /Galactic Omnivore is a nonprofit game-development community and\s+platform from North Macedonia\. Learn practical skills, find\s+collaborators and projects, share your work, and move toward your next\s+playable milestone\./
  );
  assert.match(source, /aria-labelledby="landing-hero-heading"/);
  assert.equal(
    (source.match(/<h1/g) || []).length,
    1,
    "the landing hero should have exactly one primary heading"
  );
});

test("landing hero restores the established CTA destinations", () => {
  assert.match(
    source,
    /const discordInviteUrl = "https:\/\/discord\.gg\/ZbSShxu6K4"/
  );
  assert.match(
    source,
    /const bookingUrl = "https:\/\/calendar\.app\.google\/Ge6GvfiaaaMhAHHf6"/
  );
  assert.match(
    source,
    /href=\{discordInviteUrl\}[\s\S]*target="_blank"[\s\S]*rel="noopener noreferrer"[\s\S]*Join Our Discord/
  );
  assert.match(
    source,
    /href=\{bookingUrl\} target="_blank" rel="noopener noreferrer"/
  );
  assert.match(source, /<Link href="\/about">Learn More<\/Link>/);
  assert.doesNotMatch(source, /Begin Your Galactic Quest/);
});

test("landing hero stacks its CTAs on small screens without shrinking controls", () => {
  assert.match(
    source,
    /max-w-sm flex-col[\s\S]*sm:max-w-none sm:flex-row/
  );
  assert.equal(
    (source.match(/min-h-12 w-full/g) || []).length,
    3,
    "all three hero actions should remain comfortably tappable"
  );
});
