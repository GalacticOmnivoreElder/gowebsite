const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..", "..");

for (const route of ["pricing", "subscribe", "become-member"]) {
  test(`${route} redirects to the canonical membership page`, () => {
    const source = fs.readFileSync(
      path.join(repoRoot, "src", "app", route, "page.js"),
      "utf8"
    );

    assert.match(source, /redirect\("\/membership"\)/);
    assert.doesNotMatch(source, /\$15|Bank Account Details|Notify Admin/);
  });
}
