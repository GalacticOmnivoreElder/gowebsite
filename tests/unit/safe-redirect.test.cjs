const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const { redirectWithPlan, safeInternalRedirect } = loadSourceModule(
  "src/lib/safe-redirect.js",
  ["redirectWithPlan", "safeInternalRedirect"]
);

test("safe redirects preserve internal paths and existing query strings", () => {
  assert.equal(
    safeInternalRedirect("/profile/cv?tab=edit#passport"),
    "/profile/cv?tab=edit#passport"
  );
  assert.equal(
    redirectWithPlan("/membership?interval=annual", "company"),
    "/membership?interval=annual&plan=company"
  );
});

test("safe redirects reject external and encoded protocol-relative targets", () => {
  for (const target of [
    "https://attacker.example",
    "//attacker.example/path",
    "/%2Fattacker.example/path",
    "/\\attacker.example",
    "javascript:alert(1)",
    "/subscription/success",
    "/api/admin/make-admin",
    "/unexpected-destination",
  ]) {
    assert.equal(safeInternalRedirect(target), "/profile");
  }
});
