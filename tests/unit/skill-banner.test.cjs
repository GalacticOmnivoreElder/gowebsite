const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(
  path.resolve(__dirname, "../../src/components/landing/SkillBanner.js"),
  "utf8"
);
const styles = fs.readFileSync(
  path.resolve(__dirname, "../../src/globals.css"),
  "utf8"
);

test("skill banner keeps an uninterrupted right-to-left marquee", () => {
  assert.match(source, /const skillGroup = \(duplicate = false\)/);
  assert.match(source, /\{skillGroup\(\)\}\s*\{skillGroup\(true\)\}/s);
  assert.match(source, /aria-hidden=\{duplicate \|\| undefined\}/);
  assert.match(styles, /\.go-skill-marquee-group,[^}]*min-width:\s*100vw/s);
  assert.match(
    styles,
    /animation:\s*go-skill-marquee-scroll 40s linear infinite/
  );
  assert.match(styles, /animation-play-state:\s*running/);
  assert.match(styles, /transform:\s*translate3d\(-50%, 0, 0\)/);
  assert.doesNotMatch(styles, /:hover[^}]*animation-play-state:\s*paused/s);
});

test("skill banner remains automatic instead of becoming manually scrollable", () => {
  assert.doesNotMatch(
    styles,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.go-skill-marquee[\s\S]*animation:\s*none/
  );
  assert.doesNotMatch(
    styles,
    /\.skill-banner[^}]*overflow-x:\s*auto !important/s
  );
  assert.doesNotMatch(styles, /flex-wrap:\s*wrap/);
});
