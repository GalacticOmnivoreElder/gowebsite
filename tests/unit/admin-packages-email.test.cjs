const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");
const { NextResponse, createRequest } = require("../helpers/route-test-utils.cjs");

function createDb(seed = {}) {
  const docs = {
    packages: { ...(seed.packages || {}) },
    users: { ...(seed.users || {}) },
  };
  const ref = (collectionName, id) => ({
    collectionName,
    id,
    async get() {
      const data = docs[collectionName][id];
      return { exists: data !== undefined, data: () => data };
    },
  });
  return {
    docs,
    batch() {
      const operations = [];
      return {
        set(target, data, options = {}) {
          operations.push({ target, data, options });
        },
        async commit() {
          operations.forEach(({ target, data, options }) => {
            docs[target.collectionName][target.id] = options.merge
              ? { ...(docs[target.collectionName][target.id] || {}), ...data }
              : data;
          });
        },
      };
    },
    collection(name) {
      return {
        doc(id) {
          return ref(name, id);
        },
        where(field, operator, value) {
          assert.equal(operator, "==");
          return {
            limit() {
              return {
                async get() {
                  return {
                    docs: Object.entries(docs[name])
                      .filter(([, data]) => data[field] === value)
                      .map(([id, data]) => ({
                        id,
                        data: () => data,
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

function loadRoute({ seed = {}, user } = {}) {
  const adminDb = createDb(seed);
  const emailEvents = [];
  const route = loadSourceModule(
    "src/app/api/admin/packages/route.js",
    ["POST"],
    {
      stripImports: true,
      sandbox: {
        NextResponse,
        adminDb,
        addEmailEventToBatch: (_batch, event) => {
          emailEvents.push(event);
          return { created: true, id: `job-${emailEvents.length}` };
        },
        getRequestUser: async () => user || null,
        normalizeEmail: (value) =>
          typeof value === "string" && value.includes("@")
            ? value.trim().toLowerCase()
            : "",
      },
    }
  );
  return { ...route, adminDb, emailEvents };
}

function packageBody(overrides = {}) {
  return {
    id: "pack-1",
    package: {
      title: "Pixel Worlds",
      slug: "pixel-worlds",
      description: "Monthly member assets",
      assets: [],
      status: "published",
      ...overrides,
    },
  };
}

test("admin package routes require platform admin authorization", async () => {
  let route = loadRoute({ user: null });
  let response = await route.POST(createRequest({ jsonBody: packageBody() }));
  assert.equal(response.status, 401);

  route = loadRoute({ user: { admin: false, uid: "member-1" } });
  response = await route.POST(createRequest({ jsonBody: packageBody() }));
  assert.equal(response.status, 403);
});

test("a package queues member alerts only on its first publication", async () => {
  const route = loadRoute({
    seed: {
      packages: {
        "pack-1": {
          title: "Pixel Worlds",
          slug: "pixel-worlds",
          status: "draft",
          createdAt: new Date("2026-07-01T00:00:00.000Z"),
        },
      },
      users: {
        "member-1": {
          activeMember: true,
          email: "MEMBER@example.com",
        },
      },
    },
    user: { admin: true, uid: "admin-1" },
  });

  let response = await route.POST(
    createRequest({ jsonBody: packageBody() })
  );
  assert.equal(response.status, 200);
  assert.equal(route.emailEvents.length, 1);
  assert.equal(route.emailEvents[0].type, "package.published");
  assert.equal(route.emailEvents[0].recipient, "member@example.com");
  assert.ok(route.adminDb.docs.packages["pack-1"].publishedAt);

  response = await route.POST(
    createRequest({
      jsonBody: packageBody({ description: "Edited after publication" }),
    })
  );
  assert.equal(response.status, 200);
  assert.equal(route.emailEvents.length, 1);
});
