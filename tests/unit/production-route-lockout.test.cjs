const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

test("production utility routes are removed from the application", () => {
  for (const path of [
    "src/app/test-polar/page.js",
    "src/app/make-admin/page.js",
    "src/app/api/admin/make-admin/route.js",
    "src/app/api/testEmail/route.js",
  ]) {
    assert.equal(fs.existsSync(path), false, path);
  }
});

test("robots no longer carries entries for removed utilities", () => {
  const source = fs.readFileSync("src/app/robots.js", "utf8");
  assert.doesNotMatch(source, /test-polar|make-admin|testEmail/);
});
