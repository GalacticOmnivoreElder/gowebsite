const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(
  path.resolve(__dirname, "../../src/components/profile/ProfileEditor.jsx"),
  "utf8"
);

test("profile editor renders popular skills as accessible toggle pills", () => {
  assert.match(source, /\/api\/skills\?popular=true&limit=20/);
  assert.match(source, /Popular community skills/);
  assert.match(source, /aria-pressed=\{selected\}/);
  assert.doesNotMatch(source, /Choose from the skill directory/);
});
