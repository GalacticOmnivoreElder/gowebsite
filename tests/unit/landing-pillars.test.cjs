const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(
  path.resolve(__dirname, "../../src/app/(main)/page.js"),
  "utf8"
);

test("landing page presents one data-driven three-pillar route section", () => {
  assert.match(source, /const creatorPillars = \[/);
  assert.match(source, /title: "Education"[\s\S]*href: "\/education"/);
  assert.match(source, /title: "Portfolio"[\s\S]*href: "\/projects"/);
  assert.match(source, /title: "Business"[\s\S]*href: "\/membership"/);
  assert.match(source, /creatorPillars\.map\(\(pillar, index\)/);
  assert.equal((source.match(/id="pillars"/g) || []).length, 1);
  assert.doesNotMatch(source, /Four creator routes|practicalRoutes|EduBoxLarge/);
});
