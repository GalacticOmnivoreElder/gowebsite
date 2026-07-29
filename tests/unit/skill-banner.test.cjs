const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(
  path.resolve(__dirname, "../../src/components/landing/SkillBanner.js"),
  "utf8"
);

test("skill banner keeps an uninterrupted right-to-left marquee", () => {
  assert.match(source, /const loopSkills = \[\.\.\.skills, \.\.\.skills\]/);
  assert.match(source, /loopSkills\.map\(\(skill, index\)/);
  assert.match(source, /aria-hidden=\{index >= skills\.length \|\| undefined\}/);
  assert.match(
    source,
    /animation:\s*go-skill-marquee-scroll 40s linear infinite/
  );
  assert.match(source, /animation-play-state:\s*running/);
  assert.match(source, /transform:\s*translate3d\(-50%, 0, 0\)/);
  assert.doesNotMatch(source, /:hover[^}]*animation-play-state:\s*paused/s);
});

test("skill banner still respects reduced-motion preferences", () => {
  assert.match(source, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(source, /\.go-skill-marquee\s*\{\s*animation:\s*none/s);
});
