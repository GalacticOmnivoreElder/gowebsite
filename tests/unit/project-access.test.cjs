const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const {
  CREATOR_MEMBERSHIP_URL,
  getProjectCreationDestination,
} = loadSourceModule("src/lib/project-access.js", [
  "CREATOR_MEMBERSHIP_URL",
  "getProjectCreationDestination",
]);

test("project creation sends visitors to login", () => {
  assert.equal(
    getProjectCreationDestination({
      isAuthenticated: false,
      canCreateProjects: false,
    }),
    "/login?redirect=/project/create"
  );
});

test("project creation sends non-creators to Business membership", () => {
  assert.equal(
    getProjectCreationDestination({
      isAuthenticated: true,
      canCreateProjects: false,
    }),
    CREATOR_MEMBERSHIP_URL
  );
  assert.equal(CREATOR_MEMBERSHIP_URL, "/membership?reason=creator");
});

test("project creation admits verified creators", () => {
  assert.equal(
    getProjectCreationDestination({
      isAuthenticated: true,
      canCreateProjects: true,
    }),
    "/project/create"
  );
});
