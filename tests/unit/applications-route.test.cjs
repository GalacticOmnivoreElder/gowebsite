const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");
const { NextResponse, createRequest } = require("../helpers/route-test-utils.cjs");

const { canViewProject } = loadSourceModule("src/lib/project-utils.js", ["canViewProject"]);

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
    go_cvs: seed.go_cvs || {},
    projects: seed.projects || {},
    users: seed.users || {},
  };

  return {
    docs,
    collection(name) {
      if (name === "applications") {
        return {
          add: async (data) => {
            const id = `application-${docs.applications.length + 1}`;
            docs.applications.push({ data, id });
            return { id };
          },
          where(field, operator, value) {
            const filters = [{ field, operator, value }];
            const chain = {
              where(nextField, nextOperator, nextValue) {
                filters.push({
                  field: nextField,
                  operator: nextOperator,
                  value: nextValue,
                });
                return chain;
              },
              async get() {
                const matches = docs.applications.filter((application) =>
                  filters.every((filter) => {
                    const actual = application.data[filter.field];
                    if (filter.operator === "in") return filter.value.includes(actual);
                    return actual === filter.value;
                  })
                );
                const snapshotDocs = matches.map((application) => ({
                  id: application.id,
                  data: () => application.data,
                }));
                return {
                  empty: matches.length === 0,
                  docs: snapshotDocs,
                  forEach(callback) {
                    snapshotDocs.forEach(callback);
                  },
                };
              },
            };
            return chain;
          },
        };
      }

      return {
        doc(id) {
          return {
            async get() {
              const data = docs[name]?.[id];
              return {
                exists: !!data,
                data: () => data || {},
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
  const emailEvents = [];
  const route = loadSourceModule(
    "src/app/api/applications/route.js",
    ["POST", "GET"],
    {
      stripImports: true,
      sandbox: {
        Date: FixedDate,
        NextResponse,
        adminAuth: {
          getUser: async () => ({
            displayName: "Auth User",
            email: "auth@example.com",
            photoURL: null,
          }),
        },
        adminDb,
        canViewProject,
        enqueueEmailEvent: async (event) => {
          emailEvents.push(event);
          return { created: true, id: "email-job" };
        },
        enqueueEmailEventForUsers: async (event) => {
          emailEvents.push(event);
          return [];
        },
        projectManagers: (project) => [
          ...new Set([project?.owner, ...(project?.admins || [])].filter(Boolean)),
        ],
        getRequestUser: async () => user,
      },
    }
  );

  return { ...route, adminDb, emailEvents };
}

function project(overrides = {}) {
  return {
    admins: ["owner-1"],
    owner: "owner-1",
    status: "hiring",
    teamMembers: ["owner-1"],
    title: "Puzzle Prototype",
    visibility: "Public",
    ...overrides,
  };
}

test("application creation requires auth and active membership", async () => {
  let route = loadRoute({ user: null });
  let response = await route.POST(createRequest({ jsonBody: { projectId: "project-1" } }));
  assert.equal(response.status, 401);
  assert.deepEqual(plain(response.body), { error: "Authentication required" });

  route = loadRoute({ user: { activeMember: false, admin: false, uid: "member-1" } });
  response = await route.POST(createRequest({ jsonBody: { projectId: "project-1" } }));
  assert.equal(response.status, 403);
  assert.equal(response.body.code, "membership_required");
});

test("application creation validates project existence and hiring state", async () => {
  let route = loadRoute({
    seed: { projects: {} },
    user: {
      activeMember: true,
      email: "member@example.com",
      uid: "member-1",
    },
  });
  let response = await route.POST(createRequest({ jsonBody: { projectId: "missing" } }));
  assert.equal(response.status, 404);
  assert.deepEqual(plain(response.body), { error: "Project not found" });

  route = loadRoute({
    seed: { projects: { "project-1": project({ status: "completed" }) } },
    user: { activeMember: true, uid: "member-1" },
  });
  response = await route.POST(createRequest({ jsonBody: { projectId: "project-1" } }));
  assert.equal(response.status, 400);
  assert.deepEqual(plain(response.body), {
    error: "This project is not currently accepting applications",
  });
});

test("application creation blocks current project members and duplicate applications", async () => {
  let route = loadRoute({
    seed: { projects: { "project-1": project({ teamMembers: ["member-1"] }) } },
    user: { activeMember: true, uid: "member-1" },
  });
  let response = await route.POST(createRequest({ jsonBody: { projectId: "project-1" } }));
  assert.equal(response.status, 400);
  assert.deepEqual(plain(response.body), {
    error: "You are already a member of this project",
  });

  route = loadRoute({
    seed: {
      applications: [
        {
          data: {
            projectId: "project-1",
            status: "pending",
            userId: "member-1",
          },
          id: "application-existing",
        },
      ],
      projects: { "project-1": project() },
    },
    user: { activeMember: true, uid: "member-1" },
  });
  response = await route.POST(createRequest({ jsonBody: { projectId: "project-1" } }));
  assert.equal(response.status, 400);
  assert.deepEqual(plain(response.body), {
    error: "You have already applied to this project",
  });
});

test("application creation snapshots the active GO CV and enriches user details", async () => {
  const route = loadRoute({
    seed: {
      go_cvs: {
        "member-1": {
          primary_role: "Programmer",
          sections: [{ title: "Summary" }],
          skill_level: "intermediate",
          summary: "Builds prototypes.",
          title: "Ada CV",
        },
      },
      projects: { "project-1": project() },
      users: {
        "member-1": {
          avatar: "avatar.png",
          email: "member@example.com",
          username: "Ada",
        },
      },
    },
    user: { activeMember: true, uid: "member-1" },
  });

  const response = await route.POST(
    createRequest({
      jsonBody: {
        availability: "Weekends",
        motivation: "I like puzzle games.",
        projectId: "project-1",
        roleAppliedFor: "Programmer",
      },
    })
  );

  const body = plain(response.body);
  assert.equal(response.status, 200);
  assert.equal(body.id, "application-1");
  assert.equal(body.projectTitle, "Puzzle Prototype");
  assert.equal(body.username, "Ada");
  assert.equal(body.userEmail, "member@example.com");
  assert.equal(body.goCvSnapshot.title, "Ada CV");
  assert.equal(body.goCvSnapshot.summary, "Builds prototypes.");
  assert.equal(body.goCvSnapshot.snapshottedAt, "2026-07-14T12:00:00.000Z");
  assert.deepEqual(
    route.emailEvents.map((event) => event.type),
    ["application.submitted", "application.received"]
  );
});

test("application history returns only the applicant's records newest first", async () => {
  const route = loadRoute({
    seed: {
      applications: [
        {
          id: "application-old",
          data: {
            createdAt: new Date("2026-07-01T12:00:00.000Z"),
            projectId: "project-1",
            projectTitle: "Older Project",
            status: "pending",
            userId: "member-1",
          },
        },
        {
          id: "application-other",
          data: {
            createdAt: new Date("2026-07-12T12:00:00.000Z"),
            projectId: "project-2",
            projectTitle: "Private Other User Project",
            status: "pending",
            userId: "member-2",
          },
        },
        {
          id: "application-new",
          data: {
            createdAt: new Date("2026-07-14T11:00:00.000Z"),
            projectId: "project-3",
            projectTitle: "Newest Project",
            roleAppliedFor: "Programmer",
            status: "approved",
            userId: "member-1",
          },
        },
      ],
      users: {
        "member-1": {
          email: "member@example.com",
          username: "Ada",
        },
      },
    },
    user: { activeMember: true, uid: "member-1" },
  });

  const response = await route.GET(
    createRequest({ url: "https://go.test/api/applications" })
  );

  assert.equal(response.status, 200);
  assert.deepEqual(
    plain(response.body.applications.map((application) => application.id)),
    ["application-new", "application-old"]
  );
  assert.equal(
    response.body.applications[0].roleAppliedFor,
    "Programmer"
  );
});
