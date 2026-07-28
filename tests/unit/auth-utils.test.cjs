const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

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

function createRequest(headers = {}) {
  const normalized = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  );

  return {
    headers: {
      get(name) {
        return normalized[name.toLowerCase()] || null;
      },
    },
  };
}

function loadAuthModule({ decodedTokens = {}, userDocs = {} } = {}) {
  const adminAuth = {
    async verifyIdToken(token) {
      if (!decodedTokens[token]) {
        throw new Error("bad token");
      }
      return decodedTokens[token];
    },
  };

  const adminDb = {
    collection(name) {
      assert.equal(name, "users");
      return {
        doc(uid) {
          return {
            async get() {
              const data = userDocs[uid];
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

  return loadSourceModule(
    "src/lib/auth-utils.js",
    [
      "getEffectiveMembership",
      "getMembershipConfirmationId",
      "getTokenFromRequest",
      "getRequestUser",
      "hasActiveSubscription",
      "verifyToken",
    ],
    {
      stripImports: true,
      sandbox: { adminAuth, adminDb, createHash, Date: FixedDate },
    }
  );
}

test("membership confirmation ids are stable, opaque, and limited to active purchases", () => {
  const { getMembershipConfirmationId } = loadAuthModule();
  const activationKey = "checkout:polar_checkout_secret_identifier";

  assert.equal(
    getMembershipConfirmationId({
      activeMember: false,
      membershipActivationPurchaseKey: activationKey,
    }),
    null
  );
  assert.equal(
    getMembershipConfirmationId({ activeMember: true }),
    null
  );

  const confirmationId = getMembershipConfirmationId({
    activeMember: true,
    membershipActivationPurchaseKey: activationKey,
  });
  assert.equal(confirmationId.length, 32);
  assert.doesNotMatch(confirmationId, /polar|checkout|secret/i);
  assert.equal(
    confirmationId,
    getMembershipConfirmationId({
      activeMember: true,
      membershipActivationPurchaseKey: activationKey,
    })
  );
});

test("getTokenFromRequest reads bearer tokens case-insensitively", () => {
  const { getTokenFromRequest } = loadAuthModule();

  assert.equal(getTokenFromRequest(createRequest()), null);
  assert.equal(getTokenFromRequest(createRequest({ Authorization: "Token abc" })), null);
  assert.equal(getTokenFromRequest(createRequest({ Authorization: "Bearer abc" })), "abc");
  assert.equal(getTokenFromRequest(createRequest({ authorization: "Bearer lower" })), "lower");
});

test("verifyToken returns decoded tokens and normalizes failures", async () => {
  const { verifyToken } = loadAuthModule({
    decodedTokens: {
      good: { uid: "user-1" },
    },
  });

  assert.deepEqual(JSON.parse(JSON.stringify(await verifyToken("good"))), { uid: "user-1" });
  await assert.rejects(() => verifyToken("bad"), /Invalid token/);
});

test("getRequestUser returns null without a valid bearer token", async () => {
  const { getRequestUser } = loadAuthModule();

  assert.equal(await getRequestUser(createRequest()), null);
  assert.equal(await getRequestUser(createRequest({ Authorization: "Bearer missing" })), null);
});

test("getRequestUser combines token claims and Firestore membership data", async () => {
  const { getRequestUser } = loadAuthModule({
    decodedTokens: {
      company: { email: "company@example.com", uid: "company-user" },
    },
    userDocs: {
      "company-user": {
        activeMember: true,
        admin: false,
        membershipTier: "company",
        subscriptionEndsAt: "2026-08-14T12:00:00.000Z",
      },
    },
  });

  const user = await getRequestUser(createRequest({ Authorization: "Bearer company" }));

  assert.equal(user.uid, "company-user");
  assert.equal(user.email, "company@example.com");
  assert.equal(user.admin, false);
  assert.equal(user.activeMember, true);
  assert.equal(user.membershipTier, "company");
  assert.equal(user.canCreateProjects, true);
});

test("getRequestUser treats expired memberships as inactive", async () => {
  const { getRequestUser } = loadAuthModule({
    decodedTokens: {
      expired: { email: "member@example.com", uid: "member-user" },
    },
    userDocs: {
      "member-user": {
        activeMember: true,
        membershipTier: "company",
        subscriptionEndsAt: "2026-07-01T12:00:00.000Z",
      },
    },
  });

  const user = await getRequestUser(createRequest({ Authorization: "Bearer expired" }));

  assert.equal(user.activeMember, false);
  assert.equal(user.membershipTier, null);
  assert.equal(user.canCreateProjects, false);
});

test("getRequestUser grants platform admin from either token claim or user doc", async () => {
  const { getRequestUser } = loadAuthModule({
    decodedTokens: {
      claimAdmin: { admin: true, uid: "claim-admin" },
      docAdmin: { uid: "doc-admin" },
    },
    userDocs: {
      "doc-admin": { admin: true, email: "admin@example.com" },
    },
  });

  const claimAdmin = await getRequestUser(createRequest({ Authorization: "Bearer claimAdmin" }));
  const docAdmin = await getRequestUser(createRequest({ Authorization: "Bearer docAdmin" }));

  assert.equal(claimAdmin.admin, true);
  assert.equal(claimAdmin.activeMember, true);
  assert.equal(claimAdmin.membershipTier, "company");
  assert.equal(claimAdmin.canCreateProjects, true);
  assert.equal(docAdmin.admin, true);
  assert.equal(docAdmin.email, "admin@example.com");
  assert.equal(docAdmin.activeMember, true);
  assert.equal(docAdmin.membershipTier, "company");
  assert.equal(docAdmin.canCreateProjects, true);
});

test("effective membership gives admins company-tier benefits without a real subscription", () => {
  const { getEffectiveMembership, hasActiveSubscription } = loadAuthModule();

  const membership = getEffectiveMembership(
    {
      activeMember: false,
      unlockedPackages: [],
    },
    { admin: true }
  );

  assert.equal(hasActiveSubscription({ activeMember: false }), false);
  assert.equal(membership.activeMember, true);
  assert.equal(membership.membershipTier, "company");
  assert.equal(membership.canCreateProjects, true);
  assert.equal(membership.canAccessPackages, true);
  assert.equal(membership.subscribed, false);
});
