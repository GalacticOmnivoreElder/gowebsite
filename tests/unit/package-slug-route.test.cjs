const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");
const { NextResponse, createRequest } = require("../helpers/route-test-utils.cjs");

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function getEffectiveMembership(userData = {}, { admin = false } = {}) {
  const activeMember = admin || userData.activeMember === true;
  return {
    activeMember,
    membershipTier: activeMember ? (admin ? "company" : userData.membershipTier || "member") : null,
  };
}

function loadRoute({ packageData, user = null } = {}) {
  return loadSourceModule(
    "src/app/api/packages/[slug]/route.js",
    ["GET"],
    {
      stripImports: true,
      sandbox: {
        Response: NextResponse,
        adminDb: {
          collection(name) {
            assert.equal(name, "packages");
            return {
              where(field, operator, value) {
                assert.equal(field, "slug");
                assert.equal(operator, "==");
                return {
                  limit(count) {
                    assert.equal(count, 1);
                    return {
                      async get() {
                        const matches = packageData && packageData.slug === value;
                        return {
                          empty: !matches,
                          docs: matches
                            ? [
                                {
                                  id: packageData.id,
                                  data: () => packageData,
                                },
                              ]
                            : [],
                        };
                      },
                    };
                  },
                };
              },
            };
          },
        },
        getEffectiveMembership,
        getRequestUser: async () => user,
      },
    }
  );
}

function monthlyPackage() {
  return {
    assets: [
      {
        title: "Sprite Sheet",
        downloadUrl: "https://downloads.test/sprites.zip",
      },
    ],
    id: "pack_1",
    slug: "starter-pack",
    title: "Starter Pack",
  };
}

test("package detail route hides download urls without access", async () => {
  const { GET } = loadRoute({ packageData: monthlyPackage() });

  const response = await GET(createRequest(), { params: Promise.resolve({ slug: "starter-pack" }) });

  assert.equal(response.status, 200);
  assert.equal(response.body.hasAccess, false);
  assert.equal(response.body.isAuthenticated, false);
  assert.equal(response.body.assets[0].downloadUrl, undefined);
});

test("package detail route grants access to active members, admins, and legacy unlocks", async () => {
  let route = loadRoute({
    packageData: monthlyPackage(),
    user: {
      activeMember: true,
      admin: false,
      userData: { activeMember: true, unlockedPackages: [] },
    },
  });

  let response = await route.GET(createRequest(), {
    params: Promise.resolve({ slug: "starter-pack" }),
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.hasAccess, true);
  assert.equal(response.body.assets[0].downloadUrl, "https://downloads.test/sprites.zip");

  route = loadRoute({
    packageData: monthlyPackage(),
    user: {
      activeMember: true,
      admin: true,
      userData: { activeMember: false, admin: true, unlockedPackages: [] },
    },
  });

  response = await route.GET(createRequest(), {
    params: Promise.resolve({ slug: "starter-pack" }),
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.hasAccess, true);

  route = loadRoute({
    packageData: monthlyPackage(),
    user: {
      activeMember: false,
      admin: false,
      userData: { activeMember: false, unlockedPackages: ["pack_1"] },
    },
  });

  response = await route.GET(createRequest(), {
    params: Promise.resolve({ slug: "starter-pack" }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(plain(response.body.assets), [
    {
      title: "Sprite Sheet",
      downloadUrl: "https://downloads.test/sprites.zip",
    },
  ]);
});

test("package drafts are private to platform admins", async () => {
  const draft = { ...monthlyPackage(), status: "draft" };
  let route = loadRoute({ packageData: draft });
  let response = await route.GET(createRequest(), {
    params: Promise.resolve({ slug: "starter-pack" }),
  });
  assert.equal(response.status, 404);

  route = loadRoute({
    packageData: draft,
    user: {
      admin: true,
      userData: { activeMember: false, unlockedPackages: [] },
    },
  });
  response = await route.GET(createRequest(), {
    params: Promise.resolve({ slug: "starter-pack" }),
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.hasAccess, true);
});
