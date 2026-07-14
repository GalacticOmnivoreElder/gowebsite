const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");
const { NextResponse, createRequest } = require("../helpers/route-test-utils.cjs");

const projectUtils = loadSourceModule("src/lib/project-utils.js", [
  "canEditProject",
  "canViewProject",
  "COMPENSATION_TYPES",
  "OWNER_MANAGED_STATUSES",
  "PROJECT_STATUSES",
  "PROJECT_TYPES",
  "REQUIRED_ROLES",
  "serializeFirestoreDate",
  "validateArrayValues",
  "VISIBILITY_OPTIONS",
]);

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

const fixedNow = new Date("2026-07-14T12:00:00.000Z");

class FixedDate extends Date {
  constructor(value) {
    if (arguments.length === 0) {
      super(fixedNow.getTime());
    } else {
      super(value);
    }
  }

  static now() {
    return fixedNow.getTime();
  }
}

function createDb(seed = {}) {
  const docs = {
    applications: seed.applications || [],
    projects: { ...(seed.projects || {}) },
    sourceProjects: { ...(seed.sourceProjects || {}) },
    users: { ...(seed.users || {}) },
  };
  const records = [];

  function ref(collectionName, id) {
    return { collectionName, id };
  }

  return {
    docs,
    records,
    batch() {
      const ops = [];
      return {
        delete(targetRef) {
          ops.push({ ref: targetRef, type: "delete" });
        },
        set(targetRef, data, options) {
          ops.push({ data, options, ref: targetRef, type: "set" });
        },
        update(targetRef, data) {
          ops.push({ data, ref: targetRef, type: "update" });
        },
        async commit() {
          records.push(...ops);
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
              const data = docs[name]?.[id];
              return {
                exists: !!data,
                data: () => data || {},
                id,
              };
            },
            async update(data) {
              docs[name][id] = { ...(docs[name][id] || {}), ...data };
              records.push({ data, ref: targetRef, type: "direct-update" });
            },
          };
        },
        where(field, operator, value) {
          assert.equal(name, "applications");
          assert.equal(field, "projectId");
          assert.equal(operator, "==");
          return {
            limit(limitValue) {
              assert.equal(limitValue, 450);
              return {
                async get() {
                  return {
                    docs: docs.applications
                      .filter((application) => application.projectId === value)
                      .map((application) => ({
                        ref: ref("applications", application.id),
                      })),
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

function loadRoute({ seed = {}, user = null } = {}) {
  const adminDb = createDb(seed);
  const route = loadSourceModule(
    "src/app/api/projects/[id]/route.js",
    ["PUT", "DELETE"],
    {
      stripImports: true,
      sandbox: {
        ...projectUtils,
        Date: FixedDate,
        NextResponse,
        admin: {
          firestore: {
            FieldValue: {
              arrayRemove: (...values) => ({ op: "arrayRemove", values }),
              arrayUnion: (...values) => ({ op: "arrayUnion", values }),
            },
          },
        },
        adminAuth: {},
        adminDb,
        getRequestUser: async () => user,
      },
    }
  );

  return { ...route, adminDb };
}

function existingProject(overrides = {}) {
  return {
    admins: ["owner-1"],
    budget: 5000,
    categoryTags: ["Prototype"],
    compensationType: "Paid",
    description: "Build a prototype.",
    duration: 30,
    goal: "Recruit a team.",
    owner: "owner-1",
    requiredRoles: ["Programmer"],
    sourceProject: "source-1",
    status: "draft",
    teamMembers: ["owner-1"],
    title: "Puzzle Prototype",
    type: "Game Development",
    visibility: "Public",
    ...overrides,
  };
}

test("project update requires auth and edit rights", async () => {
  let route = loadRoute({
    seed: { projects: { "project-1": existingProject() } },
    user: null,
  });
  let response = await route.PUT(createRequest({ jsonBody: {} }), {
    params: { id: "project-1" },
  });
  assert.equal(response.status, 401);

  route = loadRoute({
    seed: { projects: { "project-1": existingProject() } },
    user: { uid: "stranger" },
  });
  response = await route.PUT(createRequest({ jsonBody: { title: "New" } }), {
    params: { id: "project-1" },
  });
  assert.equal(response.status, 403);
  assert.match(response.body.error, /Access denied/);
});

test("project owners cannot move projects into admin-only statuses", async () => {
  const route = loadRoute({
    seed: { projects: { "project-1": existingProject() } },
    user: { uid: "owner-1" },
  });

  const response = await route.PUT(createRequest({ jsonBody: { status: "hiring" } }), {
    params: { id: "project-1" },
  });

  assert.equal(response.status, 403);
  assert.deepEqual(plain(response.body), {
    error: "Only platform admins can publish, reject, or complete projects",
  });
});

test("platform admins can update status and numeric project fields", async () => {
  const route = loadRoute({
    seed: { projects: { "project-1": existingProject() } },
    user: { admin: true, uid: "admin-1" },
  });

  const response = await route.PUT(
    createRequest({
      jsonBody: {
        budget: "12000",
        duration: "45",
        ignoredField: "ignored",
        status: "hiring",
        title: "Updated Prototype",
      },
    }),
    { params: { id: "project-1" } }
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "hiring");
  assert.equal(response.body.budget, 12000);
  assert.equal(response.body.duration, 45);
  assert.equal(response.body.ignoredField, undefined);
  assert.equal(route.adminDb.docs.projects["project-1"].title, "Updated Prototype");
});

test("project delete requires owner or platform admin", async () => {
  let route = loadRoute({
    seed: { projects: { "project-1": existingProject() } },
    user: { uid: "stranger" },
  });
  let response = await route.DELETE(createRequest(), { params: { id: "project-1" } });
  assert.equal(response.status, 403);

  route = loadRoute({
    seed: {
      applications: [{ id: "application-1", projectId: "project-1" }],
      projects: { "project-1": existingProject() },
    },
    user: { uid: "owner-1" },
  });
  response = await route.DELETE(createRequest(), { params: { id: "project-1" } });

  assert.equal(response.status, 200);
  assert.deepEqual(plain(response.body), { success: true });
  assert.equal(
    route.adminDb.records.some(
      (record) => record.type === "delete" && record.ref.collectionName === "projects"
    ),
    true
  );
  assert.equal(
    route.adminDb.records.some(
      (record) => record.type === "delete" && record.ref.collectionName === "applications"
    ),
    true
  );
  assert.equal(
    route.adminDb.records.some(
      (record) => record.type === "update" && record.ref.collectionName === "sourceProjects"
    ),
    true
  );
});
