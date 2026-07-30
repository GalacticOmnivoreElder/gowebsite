const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const bannerSource = fs.readFileSync(
  path.resolve(__dirname, "../../src/components/landing/PartnerBanner.js"),
  "utf8"
);
const homeSource = fs.readFileSync(
  path.resolve(__dirname, "../../src/app/(main)/page.js"),
  "utf8"
);
const styles = fs.readFileSync(
  path.resolve(__dirname, "../../src/globals.css"),
  "utf8"
);

test("landing page renders the partner marquee after the skills marquee", () => {
  assert.match(homeSource, /import \{ PartnerBanner \}/);
  assert.match(
    homeSource,
    /<SkillBanner\s*\/>\s*<PartnerBanner\s*\/>/s
  );
});

test("partner banner loops two equal viewport-width groups continuously", () => {
  assert.match(bannerSource, /const logoGroup = \(duplicate = false\)/);
  assert.match(bannerSource, /\{logoGroup\(\)\}\s*\{logoGroup\(true\)\}/s);
  assert.match(
    styles,
    /\.go-skill-marquee-group,[^}]*\.go-partner-marquee-group[^}]*min-width:\s*100vw/s
  );
  assert.match(
    styles,
    /animation:\s*go-partner-marquee-scroll 50s linear infinite/
  );
  assert.match(styles, /animation-play-state:\s*running/);
  assert.match(styles, /transform:\s*translate3d\(-50%, 0, 0\)/);
  assert.doesNotMatch(
    styles,
    /:hover[^}]*animation-play-state:\s*paused/s
  );
});

test("partner banner remains automatic instead of becoming manually scrollable", () => {
  assert.doesNotMatch(
    styles,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.go-partner-marquee[\s\S]*animation:\s*none/
  );
  assert.doesNotMatch(
    styles,
    /\.go-partner-banner[^}]*overflow-x:\s*auto !important/s
  );
});
