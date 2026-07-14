const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const { normalizeOptionalProjectNumber } = loadSourceModule(
  "src/lib/project-form-utils.js",
  ["normalizeOptionalProjectNumber"]
);

test("project form numbers normalize browser input without turning blanks into zero", () => {
  assert.equal(normalizeOptionalProjectNumber("45"), 45);
  assert.equal(normalizeOptionalProjectNumber("12000.50"), 12000.5);
  assert.equal(normalizeOptionalProjectNumber(30), 30);
  assert.equal(normalizeOptionalProjectNumber(""), undefined);
  assert.equal(normalizeOptionalProjectNumber("   "), undefined);
  assert.equal(normalizeOptionalProjectNumber(null), undefined);
});

test("project form numbers preserve invalid input for the validator to reject", () => {
  assert.equal(normalizeOptionalProjectNumber("not-a-number"), "not-a-number");
});
