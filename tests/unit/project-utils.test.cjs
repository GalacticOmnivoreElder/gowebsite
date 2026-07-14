const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const {
  canEditProject,
  canViewProject,
  isInvitedToProject,
  isPlatformAdmin,
  isProjectMember,
  validateArrayValues,
} = loadSourceModule("src/lib/project-utils.js", [
  "canEditProject",
  "canViewProject",
  "isInvitedToProject",
  "isPlatformAdmin",
  "isProjectMember",
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
