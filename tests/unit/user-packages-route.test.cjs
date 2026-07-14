const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");
const { NextResponse, createRequest } = require("../helpers/route-test-utils.cjs");

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadRoute({ decoded = {}, packages = {}, userDocs = {} } = {}) {
  return loadSourceModule(
    "src/app/api/user/packages/route.js",
    ["GET"],
    {
      stripImports: true,
      sandbox: {
        Response: NextResponse,
        adminAuth: {
          async verifyIdToken(token) {
            if (!decoded[token]) throw new Error("bad token");
            return decoded[token];
          },
        },
        adminDb: {
          collection(name) {
            if (name === "users") {
              return {
                doc(uid) {
                  return {
                    async get() {
                      const data = userDocs[uid];
                      return {
                        data: () => data || null,
                      };
                    },
                  };
                },
              };
            }

            if (name === "packages") {
              return {
                where(field, operator, values) {
                  assert.equal(field, "id");
                  assert.equal(operator, "in");
                  return {
                    async get() {
                      return {
                        forEach(callback) {
                          values
                            .filter((id) => packages[id])
                            .forEach((id) =>
                              callback({
                                id,
                                data: () => packages[id],
                              })
                            );
                        },
                      };
                    },
                  };
                },
              };
            }

            throw new Error(`Unexpected collection: ${name}`);
          },
        },
      },
    }
  );
}

test("user packages route requires a bearer token", async () => {
  const { GET } = loadRoute();

  const response = await GET(createRequest());

  assert.equal(response.status, 401);
  assert.deepEqual(plain(response.body), { error: "No token provided" });
});

test("user packages route returns an empty list when no packages are unlocked", async () => {
  const { GET } = loadRoute({
    decoded: {
      token: { uid: "user-1" },
    },
    userDocs: {
      "user-1": { unlockedPackages: [] },
    },
  });

  const response = await GET(createRequest({ headers: { authorization: "Bearer token" } }));

  assert.equal(response.status, 200);
  assert.deepEqual(plain(response.body), []);
});

test("user packages route fetches unlocked packages", async () => {
  const { GET } = loadRoute({
    decoded: {
      token: { uid: "user-1" },
    },
    packages: {
      pack_1: { id: "pack_1", title: "Starter Pack" },
      pack_2: { id: "pack_2", title: "Advanced Pack" },
    },
    userDocs: {
      "user-1": { unlockedPackages: ["pack_1", "pack_2", "missing"] },
    },
  });

  const response = await GET(createRequest({ headers: { authorization: "Bearer token" } }));

  assert.equal(response.status, 200);
  assert.deepEqual(plain(response.body), [
    { id: "pack_1", title: "Starter Pack" },
    { id: "pack_2", title: "Advanced Pack" },
  ]);
});
