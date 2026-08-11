const assert = require("node:assert/strict");
const fs = require("node:fs");
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

test("project forms expose creator-controlled application access", () => {
  const createPage = fs.readFileSync("src/app/project/create/page.js", "utf8");
  const editPage = fs.readFileSync(
    "src/app/project/[id]/edit/page.js",
    "utf8"
  );
  const detailPage = fs.readFileSync(
    "src/app/project/[id]/page.js",
    "utf8"
  );

  assert.match(createPage, /name="applicationAccess"/);
  assert.match(createPage, /all signed-in users, including free users/i);
  assert.match(editPage, /Only the project creator or a platform administrator/);
  assert.match(detailPage, /acceptsFreeApplicants/);
});
