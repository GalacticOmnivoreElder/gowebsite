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
    user_profiles: { ...(seed.user_profiles || {}) },
  };

  return {
    docs,
    collection(name) {
      return {
        doc(id) {
          return {
            async get() {
              const data = docs[name][id];
              return {
                exists: !!data,
                data: () => data || {},
              };
            },
            async set(data, options = {}) {
              docs[name][id] = options.merge
                ? { ...(docs[name][id] || {}), ...data }
                : data;
            },
          };
        },
      };
    },
  };
}

function loadRoute({ seed = {}, user = { uid: "user-1" } } = {}) {
  const adminDb = createDb(seed);
  const route = loadSourceModule(
    "src/app/api/me/profile/route.js",
    ["GET", "PATCH"],
    {
      stripImports: true,
      sandbox: {
        Date: FixedDate,
        NextResponse,
        adminDb,
        getRequestUser: async () => user,
        serializeFirestoreDate: (value) => value?.toISOString?.() || value,
      },
    }
  );

  return { ...route, adminDb };
}

test("me/profile route requires authentication", async () => {
  const { GET, PATCH } = loadRoute({ user: null });

  let response = await GET(createRequest());
  assert.equal(response.status, 401);
  assert.deepEqual(plain(response.body), { error: "Authentication required" });

  response = await PATCH(createRequest({ jsonBody: {} }));
  assert.equal(response.status, 401);
  assert.deepEqual(plain(response.body), { error: "Authentication required" });
});

test("GET /api/me/profile returns null or the serialized profile", async () => {
  let route = loadRoute();
  let response = await route.GET(createRequest());
  assert.deepEqual(plain(response.body), { profile: null });

  route = loadRoute({
    seed: {
      user_profiles: {
        "user-1": {
          display_name: "Ada",
          onboarding_completed_at: new Date("2026-07-14T10:00:00.000Z"),
          updated_at: new Date("2026-07-14T11:00:00.000Z"),
        },
      },
    },
  });
  response = await route.GET(createRequest());

  assert.deepEqual(plain(response.body), {
    profile: {
      display_name: "Ada",
      onboarding_completed_at: "2026-07-14T10:00:00.000Z",
      updated_at: "2026-07-14T11:00:00.000Z",
    },
  });
});

test("PATCH /api/me/profile only saves editable fields", async () => {
  const route = loadRoute();

  const response = await route.PATCH(
    createRequest({
      jsonBody: {
        admin: true,
        display_name: "Ada",
        primary_role: "Programmer",
        user_id: "someone-else",
        visibility_public: true,
      },
    })
  );

  assert.equal(response.status, 200);
  assert.deepEqual(plain(response.body), { ok: true });
  assert.deepEqual(plain(route.adminDb.docs.user_profiles["user-1"]), {
    display_name: "Ada",
    primary_role: "Programmer",
    updated_at: "2026-07-14T12:00:00.000Z",
    user_id: "user-1",
    visibility_public: true,
  });
});
