const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const {
  canEditProject,
  canViewProject,
  filterAndSortProjectsForDiscovery,
  isInvitedToProject,
  isPlatformAdmin,
  isProjectMember,
  normalizeProjectDiscoveryStatus,
  PROJECT_DISCOVERY_SORT_OPTIONS,
  validateArrayValues,
} = loadSourceModule("src/lib/project-utils.js", [
  "canEditProject",
  "canViewProject",
  "filterAndSortProjectsForDiscovery",
  "isInvitedToProject",
  "isPlatformAdmin",
  "isProjectMember",
  "normalizeProjectDiscoveryStatus",
  "PROJECT_DISCOVERY_SORT_OPTIONS",
  "validateArrayValues",
]);

const owner = { uid: "owner" };
const admin = { uid: "admin-user", admin: true };
const projectAdmin = { uid: "project-admin" };
const teamMember = { uid: "team-member" };
const invitedUser = { uid: "invited-user" };
const stranger = { uid: "stranger" };

function project(overrides = {}) {
  return {
    admins: ["project-admin"],
    invitedUsers: ["invited-user"],
    owner: "owner",
    status: "hiring",
    teamMembers: ["team-member"],
    visibility: "Public",
    ...overrides,
  };
}

test("project role helpers recognize platform admins, members, and invitees", () => {
  assert.equal(isPlatformAdmin(admin), true);
  assert.equal(isPlatformAdmin(owner), false);
  assert.equal(isProjectMember(project(), owner), true);
  assert.equal(isProjectMember(project(), projectAdmin), true);
  assert.equal(isProjectMember(project(), teamMember), true);
  assert.equal(isProjectMember(project(), stranger), false);
  assert.equal(isInvitedToProject(project(), invitedUser), true);
  assert.equal(isInvitedToProject(project(), stranger), false);
});

test("public project visibility is limited to public lifecycle states", () => {
  assert.equal(canViewProject(project({ status: "hiring" }), null), true);
  assert.equal(canViewProject(project({ status: "live" }), null), true);
  assert.equal(canViewProject(project({ status: "completed" }), null), true);
  assert.equal(canViewProject(project({ status: "draft" }), null), false);
  assert.equal(canViewProject(project({ status: "pending" }), null), false);
});

test("private and invite-only projects are restricted to the right people", () => {
  assert.equal(canViewProject(project({ visibility: "Private" }), stranger), false);
  assert.equal(canViewProject(project({ visibility: "Private" }), owner), true);
  assert.equal(canViewProject(project({ visibility: "Private" }), admin), true);
  assert.equal(canViewProject(project({ visibility: "Invite Only" }), stranger), false);
  assert.equal(canViewProject(project({ visibility: "Invite Only" }), invitedUser), true);
});

test("archived projects are hidden except from platform admins and project members", () => {
  const archivedProject = project({ archived: true });

  assert.equal(canViewProject(archivedProject, null), false);
  assert.equal(canViewProject(archivedProject, stranger), false);
  assert.equal(canViewProject(archivedProject, owner), true);
  assert.equal(canViewProject(archivedProject, teamMember), true);
  assert.equal(canViewProject(archivedProject, admin), true);
});

test("edit permissions allow platform admins, owners, and project admins", () => {
  assert.equal(canEditProject(project(), null), false);
  assert.equal(canEditProject(project(), stranger), false);
  assert.equal(canEditProject(project(), teamMember), false);
  assert.equal(canEditProject(project(), owner), true);
  assert.equal(canEditProject(project(), projectAdmin), true);
  assert.equal(canEditProject(project(), admin), true);
});

test("validateArrayValues rejects empty, non-array, and unknown values", () => {
  assert.equal(validateArrayValues(["A"], ["A", "B"], "field"), null);
  assert.equal(validateArrayValues([], ["A", "B"], "field"), "field must include at least one value");
  assert.equal(validateArrayValues("A", ["A", "B"], "field"), "field must include at least one value");
  assert.equal(validateArrayValues(["C"], ["A", "B"], "field"), "field contains invalid values");
});

test("project discovery accepts only public lifecycle status filters", () => {
  assert.equal(normalizeProjectDiscoveryStatus("all"), "all");
  assert.equal(normalizeProjectDiscoveryStatus("Hiring"), "hiring");
  assert.equal(normalizeProjectDiscoveryStatus("live"), "live");
  assert.equal(normalizeProjectDiscoveryStatus("completed"), "completed");
  assert.equal(normalizeProjectDiscoveryStatus("pending"), null);
  assert.equal(normalizeProjectDiscoveryStatus("draft"), null);
  assert.equal(normalizeProjectDiscoveryStatus("rejected"), null);
});

test("project discovery filters type and category case-insensitively", () => {
  const projects = [
    project({
      categoryTags: ["VR/AR", "Cultural Heritage"],
      createdAt: "2026-07-29T10:00:00.000Z",
      duration: 40,
      id: "glagolica",
      title: "Glagolica",
      type: "Art & Design",
    }),
    project({
      categoryTags: ["Prototype"],
      createdAt: "2026-07-28T10:00:00.000Z",
      id: "game",
      title: "Game",
      type: "Game Development",
    }),
  ];

  assert.deepEqual(
    Array.from(
      filterAndSortProjectsForDiscovery(projects, {
        category: "cultural heritage",
        type: " art & design ",
      }),
      (item) => item.id
    ),
    ["glagolica"]
  );
});

test("project discovery keeps projects without optional sort fields", () => {
  const projects = [
    project({
      budget: 1000,
      createdAt: "2026-07-28T10:00:00.000Z",
      duration: 20,
      id: "funded",
      title: "Funded project",
      type: "Game Development",
    }),
    project({
      createdAt: "2026-07-29T10:00:00.000Z",
      duration: 40,
      id: "glagolica",
      title: "Glagolica",
      type: "Art & Design",
    }),
  ];

  assert.deepEqual(
    Array.from(
      filterAndSortProjectsForDiscovery(projects, { sortBy: "budget_desc" }),
      (item) => item.id
    ),
    ["funded", "glagolica"]
  );
  assert.deepEqual(
    Array.from(
      filterAndSortProjectsForDiscovery(projects, { sortBy: "budget_asc" }),
      (item) => item.id
    ),
    ["funded", "glagolica"]
  );

  PROJECT_DISCOVERY_SORT_OPTIONS.forEach((sortBy) => {
    const sortedIds = Array.from(
      filterAndSortProjectsForDiscovery(projects, { sortBy }),
      (item) => item.id
    );
    assert.equal(sortedIds.length, 2, `${sortBy} must retain every project`);
    assert.equal(
      sortedIds.includes("glagolica"),
      true,
      `${sortBy} must retain Glagolica`
    );
  });
});

test("project discovery excludes pending projects even for admins and owners", () => {
  const pendingProject = project({
    id: "pending-project",
    status: "pending",
  });

  assert.deepEqual(
    Array.from(
      filterAndSortProjectsForDiscovery([pendingProject], {}, admin),
      (item) => item.id
    ),
    []
  );
  assert.deepEqual(
    Array.from(
      filterAndSortProjectsForDiscovery([pendingProject], {}, owner),
      (item) => item.id
    ),
    []
  );
});

test("the public Projects status filter does not offer pending approval", () => {
  const projectsPage = fs.readFileSync("src/app/projects/page.js", "utf8");

  assert.doesNotMatch(projectsPage, /SelectItem value="pending"/);
  assert.doesNotMatch(projectsPage, />\s*Pending approval\s*</);
  assert.match(projectsPage, /SelectItem value="all">All statuses/);
});
