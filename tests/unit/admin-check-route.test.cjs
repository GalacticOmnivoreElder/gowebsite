const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");
const { NextResponse, createRequest } = require("../helpers/route-test-utils.cjs");

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadRoute({ decoded = {}, userDocs = {} } = {}) {
  return loadSourceModule(
    "src/app/api/admin/check/route.js",
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
            assert.equal(name, "users");
            return {
              doc(uid) {
                return {
                  async get() {
                    const data = userDocs[uid];
                    return {
                      data: () => data || {},
                    };
                  },
                };
              },
            };
          },
        },
      },
    }
  );
}

test("admin check route requires a bearer token", async () => {
  const { GET } = loadRoute();

  const response = await GET(createRequest());

  assert.equal(response.status, 401);
  assert.deepEqual(plain(response.body), { error: "No token provided" });
});

test("admin check route rejects non-admin users", async () => {
  const { GET } = loadRoute({
    decoded: {
      token: { uid: "user-1" },
    },
    userDocs: {
      "user-1": { admin: false },
    },
  });

  const response = await GET(createRequest({ headers: { authorization: "Bearer token" } }));

  assert.equal(response.status, 403);
  assert.deepEqual(plain(response.body), { error: "Not an admin" });
});

test("admin check route accepts admin claims and Firestore admin flags", async () => {
  let route = loadRoute({
    decoded: {
      claimAdmin: { admin: true, uid: "user-1" },
    },
  });

  let response = await route.GET(
    createRequest({ headers: { authorization: "Bearer claimAdmin" } })
  );
  assert.equal(response.status, 200);
  assert.deepEqual(plain(response.body), { isAdmin: true });

  route = loadRoute({
    decoded: {
      docAdmin: { uid: "user-2" },
    },
    userDocs: {
      "user-2": { admin: true },
    },
  });

  response = await route.GET(createRequest({ headers: { authorization: "Bearer docAdmin" } }));
  assert.equal(response.status, 200);
  assert.deepEqual(plain(response.body), { isAdmin: true });
});
