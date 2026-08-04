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
        adminDb: {
          collection(name) {
            if (name === "packages") {
              return {
                async get() {
                  return {
                    forEach(callback) {
                      Object.entries(packages).forEach(([id, data]) =>
                        callback({
                          id,
                          data: () => data,
                        })
                      );
                    },
                  };
                },
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
        getRequestUser: async (request) => {
          const token = request.headers.get("authorization")?.replace("Bearer ", "");
          if (!token || !decoded[token]) return null;
          const userData = userDocs[decoded[token].uid] || {};
          return {
            activeMember: decoded[token].admin === true || userData.admin === true || userData.activeMember === true,
            admin: decoded[token].admin === true || userData.admin === true,
            uid: decoded[token].uid,
            userData,
          };
        },
        isPublicResourceStatus: (status) => status === "published" || status === "legacy",
        toPublicResourceDto: (resource) => ({
          id: resource.id,
          title: resource.title || "Resource",
          status: resource.status,
          assets: (resource.assets || []).map(({ downloadUrl, ...asset }, assetIndex) => ({ ...asset, assetIndex })),
        }),
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
      pack_1: { id: "pack_1", title: "Starter Pack", status: "published" },
      pack_2: { id: "pack_2", title: "Advanced Pack", status: "legacy" },
    },
    userDocs: {
      "user-1": { unlockedPackages: ["pack_1", "pack_2", "missing"] },
    },
  });

  const response = await GET(createRequest({ headers: { authorization: "Bearer token" } }));

  assert.equal(response.status, 200);
  assert.deepEqual(plain(response.body).map(({ id, title }) => ({ id, title })), [
    { id: "pack_1", title: "Starter Pack" },
    { id: "pack_2", title: "Advanced Pack" },
  ]);
});

test("user packages route returns every package for active members and admins", async () => {
  let route = loadRoute({
    decoded: {
      token: { uid: "member-1" },
    },
    packages: {
      pack_1: { id: "pack_1", title: "Starter Pack", status: "published" },
      pack_2: { id: "pack_2", title: "Advanced Pack", status: "legacy" },
    },
    userDocs: {
      "member-1": { activeMember: true, unlockedPackages: [] },
    },
  });

  let response = await route.GET(createRequest({ headers: { authorization: "Bearer token" } }));

  assert.equal(response.status, 200);
  assert.deepEqual(plain(response.body).map(({ id, title }) => ({ id, title })), [
    { id: "pack_1", title: "Starter Pack" },
    { id: "pack_2", title: "Advanced Pack" },
  ]);

  route = loadRoute({
    decoded: {
      token: { uid: "admin-1" },
    },
    packages: {
      pack_1: { id: "pack_1", title: "Starter Pack", status: "draft" },
    },
    userDocs: {
      "admin-1": { admin: true, activeMember: false, unlockedPackages: [] },
    },
  });

  response = await route.GET(createRequest({ headers: { authorization: "Bearer token" } }));

  assert.equal(response.status, 200);
  assert.deepEqual(plain(response.body).map(({ id, title }) => ({ id, title })), [{ id: "pack_1", title: "Starter Pack" }]);
});
