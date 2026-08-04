const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(
  path.resolve(__dirname, "../../src/app/(main)/page.js"),
  "utf8"
);
const pillars = fs.readFileSync(
  path.resolve(__dirname, "../../src/components/landing/GoPillars.jsx"),
  "utf8"
);

test("landing page presents the six approved product routes", () => {
  assert.match(source, /const orbitRoutes = \[/);
  for (const title of ["Find a Project", "Create a Project", "Find a Mentor", "Learn", "Video Bundles", "Community Resources"]) {
    assert.match(source, new RegExp(`title: "${title}"`));
  }
  assert.match(source, /orbitRoutes\.map\(\(orbit, index\)/);
  assert.equal((source.match(/id="orbits"/g) || []).length, 1);
});

test("the GO pillars are a separate non-navigational progression before the orbits", () => {
  for (const title of ["Learn", "Portfolio", "Business"]) {
    assert.match(pillars, new RegExp(`title: "${title}"`));
  }
  assert.match(pillars, /The GO path/);
  assert.match(pillars, /Learn\. Build your portfolio\. Move toward business\./);
  assert.doesNotMatch(pillars, /<Link|<Button|href=/);
  assert.ok(source.indexOf("<GoPillars />") < source.indexOf('id="orbits"'));
});
