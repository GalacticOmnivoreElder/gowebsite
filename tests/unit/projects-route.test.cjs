const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");
const { NextResponse, createRequest } = require("../helpers/route-test-utils.cjs");

const projectUtils = loadSourceModule("src/lib/project-utils.js", [
  "canViewProject",
  "COMPENSATION_TYPES",
  "filterAndSortProjectsForDiscovery",
  "normalizeProjectDiscoveryStatus",
  "PROJECT_DISCOVERY_SORT_OPTIONS",
  "PROJECT_STATUSES",
  "PROJECT_TYPES",
  "PUBLIC_PROJECT_STATUSES",
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
  const records = [];
  const projects = seed.projects || {};
  const sourceProjects = seed.sourceProjects || {};
  let projectCounter = 0;
  let sourceCounter = 0;

  function ref(collectionName, id) {
    return { collectionName, id };
  }

  function query(collectionName, constraints = []) {
    return {
      async get() {
        const collection =
          collectionName === "projects"
            ? projects
            : collectionName === "sourceProjects"
              ? sourceProjects
              : {};
        const entries = Object.entries(collection).filter(([, data]) =>
          constraints.every(({ field, operator, value }) => {
            if (operator === "==") return data[field] === value;
            if (operator === "in") return value.includes(data[field]);
            throw new Error(`Unsupported operator: ${operator}`);
          })
        );
        const docs = entries.map(([id, data]) => ({
          data: () => data,
          id,
        }));
        return { docs, empty: docs.length === 0 };
      },
      where(field, operator, value) {
        return query(collectionName, [
          ...constraints,
          { field, operator, value },
        ]);
      },
    };
  }

  return {
    records,
    batch() {
      const ops = [];
      return {
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
        ...query(name),
        doc(id) {
          if (!id) {
            if (name === "projects") id = `project-${++projectCounter}`;
            else if (name === "sourceProjects") id = `source-${++sourceCounter}`;
            else id = `${name}-doc`;
          }

          const targetRef = ref(name, id);
          return {
            ...targetRef,
            async get() {
              const collection =
                name === "sourceProjects"
                  ? sourceProjects
                  : name === "projects"
                    ? projects
                    : {};
              const data = collection[id];
              return {
                exists: !!data,
                data: () => data || {},
                id,
              };
            },
          };
        },
      };
    },
  };
}

function loadRoute({ user = null, seed = {} } = {}) {
  const adminDb = createDb(seed);
  const route = loadSourceModule(
    "src/app/api/projects/route.js",
    ["GET", "POST"],
    {
      stripImports: true,
      sandbox: {
        ...projectUtils,
        Date: FixedDate,
        NextResponse,
        admin: {
          firestore: {
            FieldValue: {
              arrayUnion: (...values) => ({ op: "arrayUnion", values }),
            },
          },
        },
        adminDb,
        getRequestUser: async () => user,
      },
    }
  );

  return { ...route, adminDb };
}

function validProject(overrides = {}) {
  return {
    budget: 5000,
    categoryTags: ["Prototype"],
    compensationType: "Paid",
    description: "Build a playable prototype.",
    duration: 30,
    goal: "Find a small team.",
    requiredRoles: ["Programmer"],
    sourceProjectName: "New Game",
    sourceProjectOption: "new",
    title: "Puzzle Prototype",
    type: "Game Development",
    visibility: "Public",
    ...overrides,
  };
}

test("project creation requires auth and company/admin project creation rights", async () => {
  let route = loadRoute({ user: null });
  let response = await route.POST(createRequest({ jsonBody: validProject() }));
  assert.equal(response.status, 401);
  assert.deepEqual(plain(response.body), { error: "Authentication required" });

  route = loadRoute({ user: { canCreateProjects: false, uid: "member-1" } });
  response = await route.POST(createRequest({ jsonBody: validProject() }));
  assert.equal(response.status, 403);
  assert.equal(response.body.code, "company_membership_required");
});

test("project creation validates required fields and enum values", async () => {
  const route = loadRoute({ user: { canCreateProjects: true, uid: "company-1" } });

  let response = await route.POST(
    createRequest({ jsonBody: validProject({ title: "" }) })
  );
  assert.equal(response.status, 400);
  assert.deepEqual(plain(response.body), { error: "Missing required field: title" });

  response = await route.POST(
    createRequest({ jsonBody: validProject({ type: "Cooking" }) })
  );
  assert.equal(response.status, 400);
  assert.deepEqual(plain(response.body), { error: "Invalid project type" });

  response = await route.POST(
    createRequest({ jsonBody: validProject({ requiredRoles: ["Chef"] }) })
  );
  assert.equal(response.status, 400);
  assert.deepEqual(plain(response.body), { error: "requiredRoles contains invalid values" });
});

test("project creation prevents using someone else's source project", async () => {
  const route = loadRoute({
    seed: {
      sourceProjects: {
        source_1: { sourceOwner: "someone-else" },
      },
    },
    user: { canCreateProjects: true, uid: "company-1" },
  });

  const response = await route.POST(
    createRequest({
      jsonBody: validProject({
        existingSourceProjectId: "source_1",
        sourceProjectOption: "existing",
      }),
    })
  );

  assert.equal(response.status, 403);
  assert.deepEqual(plain(response.body), {
    error: "You don't have permission to use this source project",
  });
});

test("project creation writes a draft project, source project, and user project arrays", async () => {
  const route = loadRoute({
    user: { canCreateProjects: true, uid: "company-1" },
  });

  const response = await route.POST(createRequest({ jsonBody: validProject() }));

  assert.equal(response.status, 200);
  assert.equal(response.body.id, "project-1");
  assert.equal(response.body.status, "draft");
  assert.equal(response.body.owner, "company-1");
  assert.equal(response.body.admins[0], "company-1");
  assert.equal(response.body.teamMembers[0], "company-1");
  assert.equal(response.body.createdAt, "2026-07-14T12:00:00.000Z");

  const sourceSet = route.adminDb.records.find(
    (record) => record.type === "set" && record.ref.collectionName === "sourceProjects"
  );
  const projectSet = route.adminDb.records.find(
    (record) => record.type === "set" && record.ref.collectionName === "projects"
  );
  const userSet = route.adminDb.records.find(
    (record) => record.type === "set" && record.ref.collectionName === "users"
  );

  assert.equal(sourceSet.data.name, "New Game");
  assert.equal(projectSet.data.title, "Puzzle Prototype");
  assert.equal(projectSet.data.sourceProject, "source-1");
  assert.equal(userSet.options.merge, true);
  assert.deepEqual(plain(userSet.data.ownerOfProjects), {
    op: "arrayUnion",
    values: ["project-1"],
  });
});

test("project creation accepts an omitted budget", async () => {
  const route = loadRoute({
    user: { canCreateProjects: true, uid: "company-1" },
  });
  const projectWithoutBudget = validProject();
  delete projectWithoutBudget.budget;

  const response = await route.POST(
    createRequest({ jsonBody: projectWithoutBudget })
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.budget, undefined);
  const projectSet = route.adminDb.records.find(
    (record) => record.type === "set" && record.ref.collectionName === "projects"
  );
  assert.equal(Object.hasOwn(projectSet.data, "budget"), false);
});

test("project discovery keeps Glagolica in type and optional-field sorts", async () => {
  const route = loadRoute({
    seed: {
      projects: {
        funded: {
          budget: 1000,
          categoryTags: ["Prototype"],
          createdAt: "2026-07-28T10:00:00.000Z",
          duration: 20,
          status: "hiring",
          title: "Funded game",
          type: "Game Development",
          visibility: "Public",
        },
        glagolica: {
          categoryTags: ["VR/AR", "Cultural Heritage"],
          createdAt: "2026-07-29T10:00:00.000Z",
          duration: 40,
          status: "hiring",
          title: "Glagolica",
          type: "Art & Design",
          visibility: "Public",
        },
      },
    },
  });

  let response = await route.GET(
    createRequest({
      url: "http://localhost:3000/api/projects?type=Art%20%26%20Design&sortBy=budget_desc",
    })
  );

  assert.equal(response.status, 200);
  assert.deepEqual(
    Array.from(response.body.projects, (project) => project.id),
    ["glagolica"]
  );

  response = await route.GET(
    createRequest({
      url: "http://localhost:3000/api/projects?sortBy=budget_desc",
    })
  );

  assert.equal(response.status, 200);
  assert.deepEqual(
    Array.from(response.body.projects, (project) => project.id),
    ["funded", "glagolica"]
  );
});

test("public discovery never returns pending projects, including to admins", async () => {
  const route = loadRoute({
    seed: {
      projects: {
        approved: {
          createdAt: "2026-07-29T10:00:00.000Z",
          status: "hiring",
          title: "Approved",
          type: "Art & Design",
          visibility: "Public",
        },
        pending: {
          createdAt: "2026-07-29T11:00:00.000Z",
          owner: "admin-1",
          status: "pending",
          title: "Pending",
          type: "Art & Design",
          visibility: "Public",
        },
      },
    },
    user: { admin: true, uid: "admin-1" },
  });

  let response = await route.GET(
    createRequest({ url: "http://localhost:3000/api/projects?status=all" })
  );
  assert.equal(response.status, 200);
  assert.deepEqual(
    Array.from(response.body.projects, (project) => project.id),
    ["approved"]
  );

  response = await route.GET(
    createRequest({ url: "http://localhost:3000/api/projects?status=pending" })
  );
  assert.equal(response.status, 200);
  assert.deepEqual(Array.from(response.body.projects), []);
});
