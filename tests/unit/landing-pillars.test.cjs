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

test("landing page presents current exploration destinations", () => {
  const explore = fs.readFileSync(path.resolve(__dirname, "../../src/components/landing/ExploreGo.js"), "utf8");
  assert.match(source, /<ExploreGo \/>/);
  for (const destination of ["blog", "games", "resources", "membership"]) {
    assert.match(explore, new RegExp(`href: "/${destination}"`));
  }
  assert.match(explore, /items\.map/);
});

test("the GO pillars expose accessible intent paths before exploration", () => {
  for (const title of ["Learn", "Portfolio", "Outsource"]) {
    assert.match(pillars, new RegExp(`title: "${title}"`));
  }
  assert.match(pillars, /The GO path/);
  assert.match(pillars, /Learn\. Build your portfolio\. Find work or hire talent\./);
  assert.match(pillars, /aria-expanded=\{isActive\}/);
  assert.match(pillars, /aria-controls=\{pathsId\}/);
  assert.match(pillars, /href=\{path.href\}/);
  assert.match(pillars, /rememberGoIntent\(path.id\)/);
  assert.ok(source.indexOf("<GoPillars />") < source.indexOf("<ExploreGo />"));
});
