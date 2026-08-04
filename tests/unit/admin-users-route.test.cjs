const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");
const { NextResponse, createRequest } = require("../helpers/route-test-utils.cjs");

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function createAdminDb(seed = {}) {
  const users = { ...(seed.users || {}) };
  const auditEvents = [];

  return {
    users,
    auditEvents,
    collection(name) {
      if (name === "admin_audit_events") {
        return {
          async add(value) {
            auditEvents.push(value);
          },
        };
      }
      assert.equal(name, "users");
      return {
        async get() {
          return {
            docs: Object.entries(users).map(([id, data]) => ({
              id,
              data: () => data,
            })),
          };
        },
        doc(id) {
          return {
            async get() {
              return {
                exists: Object.hasOwn(users, id),
                data: () => users[id],
              };
            },
            async set(update, options = {}) {
              users[id] = options.merge
                ? { ...(users[id] || {}), ...update }
                : update;
            },
          };
        },
      };
    },
  };
}

function loadRoute({ requestUser = null, seed = {} } = {}) {
  const adminDb = createAdminDb(seed);
  const route = loadSourceModule(
    "src/app/api/admin/users/route.js",
    ["GET", "PUT"],
    {
      stripImports: true,
      sandbox: {
        Response: NextResponse,
        adminDb,
        getRequestUser: async () => requestUser,
        MENTOR_STATUSES: ["none", "applicant", "approved", "temporarily_unavailable", "suspended", "inactive", "rejected"],
      },
    }
  );

  return { ...route, adminDb };
}

test("admin users keeps a missing membership tier visible", async () => {
  const route = loadRoute({
    requestUser: { admin: true, uid: "admin-1" },
    seed: {
      users: {
        "user-1": {
          activeMember: true,
          email: "creator@example.com",
          subscriptionStatus: "active",
        },
      },
    },
  });

  const response = await route.GET(createRequest());

  assert.equal(response.status, 200);
  assert.equal(response.body.users[0].isMember, true);
  assert.equal(response.body.users[0].membershipTier, null);
});

test("admin can assign Business creator membership", async () => {
  const route = loadRoute({
    requestUser: { admin: true, uid: "admin-1" },
    seed: { users: { "user-1": { activeMember: true } } },
  });

  const response = await route.PUT(
    createRequest({
      jsonBody: { membershipTier: "company", userId: "user-1", reason: "Approved Business access override" },
    })
  );

  assert.equal(response.status, 200);
  assert.deepEqual(plain(response.body), {
    membershipTier: "company",
    success: true,
    userId: "user-1",
  });
  assert.equal(route.adminDb.users["user-1"].membershipTier, "company");
  assert.equal(route.adminDb.users["user-1"].membershipOverrideBy, "admin-1");
});

test("admin users rejects invalid membership tiers", async () => {
  const route = loadRoute({
    requestUser: { admin: true, uid: "admin-1" },
  });

  const response = await route.PUT(
    createRequest({
      jsonBody: { membershipTier: "creator", userId: "user-1" },
    })
  );

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "membershipTier must be member or company");
});

test("admin controls mentor status and prevents public profiles before approval", async () => {
  const route = loadRoute({
    requestUser: { admin: true, uid: "admin-1" },
    seed: { users: { "user-1": { mentorStatus: "applicant" } } },
  });

  const rejected = await route.PUT(
    createRequest({
      jsonBody: { mentorPublicProfileEnabled: true, userId: "user-1", reason: "Profile requested before approval" },
    })
  );
  assert.equal(rejected.status, 409);

  const approved = await route.PUT(
    createRequest({
      jsonBody: {
        mentorStatus: "approved",
        mentorPublicProfileEnabled: true,
        userId: "user-1",
        reason: "Mentor application approved",
      },
    })
  );
  assert.equal(approved.status, 200);
  assert.equal(route.adminDb.users["user-1"].mentorStatus, "approved");
  assert.equal(route.adminDb.users["user-1"].mentorPublicProfileEnabled, true);
  assert.equal(route.adminDb.auditEvents.length, 1);
  assert.equal(route.adminDb.auditEvents[0].targetUserId, "user-1");

  await route.PUT(
    createRequest({
      jsonBody: { mentorStatus: "suspended", userId: "user-1", reason: "Temporary account suspension" },
    })
  );
  assert.equal(route.adminDb.users["user-1"].mentorPublicProfileEnabled, false);
});
