const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const { formatBudget } = loadSourceModule("src/utils/formatBudget.js", ["formatBudget"]);

test("formatBudget handles missing and invalid values", () => {
  assert.equal(formatBudget(null), "N/A");
  assert.equal(formatBudget(undefined), "N/A");
  assert.equal(formatBudget(""), "N/A");
  assert.equal(formatBudget("not-a-number"), "N/A");
});

test("formatBudget formats standard MKD amounts", () => {
  assert.equal(formatBudget(0), "0 MKD");
  assert.equal(formatBudget(9999), "9,999 MKD");
  assert.equal(formatBudget(10000), "10K MKD");
  assert.equal(formatBudget(12500), "13K MKD");
});

test("formatBudget formats large MKD amounts compactly", () => {
  assert.equal(formatBudget(1_000_000), "1M MKD");
  assert.equal(formatBudget(1_500_000), "1.5M MKD");
  assert.equal(formatBudget(12_400_000), "12M MKD");
  assert.equal(formatBudget(1_250_000_000), "1,250M MKD");
});

test("formatBudget rejects values beyond Number.MAX_SAFE_INTEGER", () => {
  assert.equal(formatBudget(Number.MAX_SAFE_INTEGER + 1), "Budget too large");
});
