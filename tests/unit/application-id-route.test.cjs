const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");
const { NextResponse, createRequest } = require("../helpers/route-test-utils.cjs");

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
    applications: { ...(seed.applications || {}) },
    projects: { ...(seed.projects || {}) },
    users: { ...(seed.users || {}) },
  };
  const records = [];

  function ref(collectionName, id) {
    return { collectionName, id };
  }

  function document(name, id) {
    const targetRef = ref(name, id);
    return {
      ...targetRef,
      async get() {
        const data = docs[name][id];
        return {
          exists: !!data,
          data: () => data || {},
        };
      },
      async set(data) {
        docs[name][id] = data;
        records.push({ data, ref: targetRef, type: "set" });
      },
      async update(data) {
        docs[name][id] = { ...(docs[name][id] || {}), ...data };
        records.push({ data, ref: targetRef, type: "direct-update" });
      },
    };
  }

  return {
    docs,
    records,
    batch() {
      const ops = [];
      return {
        set(targetRef, data) {
          ops.push({ data, ref: targetRef, type: "set" });
        },
        update(targetRef, data) {
          ops.push({ data, ref: targetRef, type: "update" });
          docs[targetRef.collectionName][targetRef.id] = {
            ...(docs[targetRef.collectionName][targetRef.id] || {}),
            ...data,
          };
        },
        async commit() {
          records.push(...ops);
        },
      };
    },
    collection(name) {
      return {
        doc(id) {
          return document(name, id);
        },
      };
    },
  };
}

function loadRoute({ seed = {}, user = null } = {}) {
  const adminDb = createDb(seed);
  const route = loadSourceModule(
    "src/app/api/applications/[id]/route.js",
    ["PUT"],
    {
      stripImports: true,
      sandbox: {
        Date: FixedDate,
        NextResponse,
        adminAuth: {
          getUser: async (uid) => ({
            displayName: "Applicant",
            email: `${uid}@example.com`,
            photoURL: null,
          }),
        },
        adminDb,
        getRequestUser: async () => user,
      },
    }
  );

  return { ...route, adminDb };
}

test("application update requires auth and a valid status", async () => {
  let route = loadRoute({ user: null });
  let response = await route.PUT(createRequest({ jsonBody: { status: "approved" } }), {
    params: { id: "application-1" },
  });
  assert.equal(response.status, 401);

  route = loadRoute({ user: { uid: "owner-1" } });
  response = await route.PUT(createRequest({ jsonBody: { status: "maybe" } }), {
    params: { id: "application-1" },
  });
  assert.equal(response.status, 400);
  assert.deepEqual(plain(response.body), { error: "Invalid status" });
});

test("only the applicant can cancel their own application", async () => {
  let route = loadRoute({
    seed: {
      applications: {
        "application-1": {
          projectId: "project-1",
          status: "pending",
          userId: "applicant-1",
        },
      },
    },
    user: { uid: "someone-else" },
  });
  let response = await route.PUT(createRequest({ jsonBody: { status: "cancelled" } }), {
    params: { id: "application-1" },
  });
  assert.equal(response.status, 403);

  route = loadRoute({
    seed: {
      applications: {
        "application-1": {
          createdAt: new Date("2026-07-14T10:00:00.000Z"),
          projectId: "project-1",
          status: "pending",
          userId: "applicant-1",
        },
      },
      users: {
        "applicant-1": { email: "applicant@example.com", username: "Applicant" },
      },
    },
    user: { uid: "applicant-1" },
  });
  response = await route.PUT(createRequest({ jsonBody: { status: "cancelled" } }), {
    params: { id: "application-1" },
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "cancelled");
  assert.equal(response.body.username, "Applicant");
});

test("project owner can approve an application and add applicant to team", async () => {
  const route = loadRoute({
    seed: {
      applications: {
        "application-1": {
          projectId: "project-1",
          status: "pending",
          userId: "applicant-1",
        },
      },
      projects: {
        "project-1": {
          admins: [],
          owner: "owner-1",
          teamMembers: ["owner-1"],
        },
      },
      users: {
        "applicant-1": {
          email: "applicant@example.com",
          teamMemberOfProjects: [],
          username: "Applicant",
        },
      },
    },
    user: { uid: "owner-1" },
  });

  const response = await route.PUT(createRequest({ jsonBody: { status: "approved" } }), {
    params: { id: "application-1" },
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "approved");
  assert.deepEqual(plain(route.adminDb.docs.projects["project-1"].teamMembers), [
    "owner-1",
    "applicant-1",
  ]);
  assert.deepEqual(plain(route.adminDb.docs.users["applicant-1"].teamMemberOfProjects), [
    "project-1",
  ]);
});
