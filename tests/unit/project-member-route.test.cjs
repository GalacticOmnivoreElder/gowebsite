const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");
const { NextResponse, createRequest } = require("../helpers/route-test-utils.cjs");

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function createDb(seed = {}) {
  const docs = {
    applications: { ...(seed.applications || {}) },
    projects: { ...(seed.projects || {}) },
    users: { ...(seed.users || {}) },
  };
  const records = [];

  const ref = (collectionName, id) => ({ collectionName, id });

  const createQuery = (collectionName, filters = []) => ({
    where(field, operator, value) {
      assert.equal(operator, "==");
      return createQuery(collectionName, [...filters, { field, value }]);
    },
    async get() {
      return {
        docs: Object.entries(docs[collectionName])
          .filter(([, data]) =>
            filters.every(({ field, value }) => data[field] === value)
          )
          .map(([id, data]) => ({
            data: () => data,
            ref: ref(collectionName, id),
          })),
      };
    },
  });

  return {
    docs,
    records,
    batch() {
      const operations = [];
      return {
        set(targetRef, data, options) {
          operations.push({ data, options, ref: targetRef, type: "set" });
        },
        update(targetRef, data) {
          operations.push({ data, ref: targetRef, type: "update" });
        },
        async commit() {
          records.push(...operations);
        },
      };
    },
    collection(name) {
      return {
        doc(id) {
          const targetRef = ref(name, id);
          return {
            ...targetRef,
            async get() {
              const data = docs[name][id];
              return { exists: !!data, data: () => data || {} };
            },
          };
        },
        where(field, operator, value) {
          return createQuery(name).where(field, operator, value);
        },
      };
    },
  };
}

function loadRoute({ seed = {}, user = null } = {}) {
  const adminDb = createDb(seed);
  const route = loadSourceModule(
    "src/app/api/projects/[id]/members/[memberId]/route.js",
    ["DELETE"],
    {
      stripImports: true,
      sandbox: {
        NextResponse,
        admin: {
          firestore: {
            FieldValue: {
              arrayRemove: (...values) => ({ op: "arrayRemove", values }),
            },
          },
        },
        adminDb,
        enqueueEmailEventForUsers: async () => [],
        getRequestUser: async () => user,
      },
    }
  );

  return { ...route, adminDb };
}

const project = {
  admins: ["owner-1"],
  owner: "owner-1",
  teamMembers: ["owner-1", "member-1"],
};

test("project member removal requires the owner or a platform admin", async () => {
  let route = loadRoute({
    seed: { projects: { "project-1": project } },
    user: null,
  });
  let response = await route.DELETE(createRequest(), {
    params: { id: "project-1", memberId: "member-1" },
  });
  assert.equal(response.status, 401);

  route = loadRoute({
    seed: { projects: { "project-1": project } },
    user: { uid: "member-1" },
  });
  response = await route.DELETE(createRequest(), {
    params: { id: "project-1", memberId: "member-1" },
  });
  assert.equal(response.status, 403);
});

test("project owners cannot remove owners or project admins", async () => {
  let route = loadRoute({
    seed: { projects: { "project-1": project } },
    user: { uid: "owner-1" },
  });
  let response = await route.DELETE(createRequest(), {
    params: { id: "project-1", memberId: "owner-1" },
  });
  assert.equal(response.status, 400);

  route = loadRoute({
    seed: {
      projects: {
        "project-1": {
          ...project,
          admins: ["owner-1", "admin-1"],
          teamMembers: [...project.teamMembers, "admin-1"],
        },
      },
    },
    user: { uid: "owner-1" },
  });
  response = await route.DELETE(createRequest(), {
    params: { id: "project-1", memberId: "admin-1" },
  });
  assert.equal(response.status, 400);
});

test("project owner removes the member and closes approved applications", async () => {
  const route = loadRoute({
    seed: {
      applications: {
        "application-1": {
          projectId: "project-1",
          status: "approved",
          userId: "member-1",
        },
      },
      projects: { "project-1": project },
      users: { "member-1": { teamMemberOfProjects: ["project-1"] } },
    },
    user: { uid: "owner-1" },
  });

  const response = await route.DELETE(createRequest(), {
    params: { id: "project-1", memberId: "member-1" },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(plain(response.body), {
    memberId: "member-1",
    success: true,
  });
  assert.equal(
    route.adminDb.records.some(
      (record) =>
        record.type === "update" &&
        record.ref.collectionName === "projects" &&
        record.data.teamMembers.values[0] === "member-1"
    ),
    true
  );
  assert.equal(
    route.adminDb.records.some(
      (record) =>
        record.type === "set" &&
        record.ref.collectionName === "users" &&
        record.data.teamMemberOfProjects.values[0] === "project-1"
    ),
    true
  );
  assert.equal(
    route.adminDb.records.some(
      (record) =>
        record.type === "update" &&
        record.ref.collectionName === "applications" &&
        record.data.status === "removed"
    ),
    true
  );
});
