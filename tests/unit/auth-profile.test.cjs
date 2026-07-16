const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const { getAuthProvider, normalizeAuthUser, normalizeUsername } = loadSourceModule(
  "src/lib/auth-profile.js",
  ["getAuthProvider", "normalizeAuthUser", "normalizeUsername"]
);

test("email auth users are normalized into a plain profile shape", () => {
  const now = new Date("2026-07-15T17:00:00.000Z");
  const authUser = {
    uid: "email-user",
    email: "player@example.com",
    displayName: null,
    photoURL: null,
    isAnonymous: false,
    providerData: [{ providerId: "password" }],
  };

  const profile = normalizeAuthUser(authUser, null, now);

  assert.equal(profile.uid, "email-user");
  assert.equal(profile.email, "player@example.com");
  assert.equal(profile.username, "player");
  assert.equal(profile.provider, "password");
  assert.equal(profile.createdAt, now);
});

test("stored profile data is merged without allowing a stale uid", () => {
  const profile = normalizeAuthUser(
    {
      uid: "current-user",
      email: "current@example.com",
      isAnonymous: false,
      providerData: [{ providerId: "password" }],
    },
    {
      uid: "stale-user",
      email: "stale@example.com",
      provider: "anonymous",
      username: "Current Player",
      avatar: "data:image/svg+xml,avatar",
    }
  );

  assert.equal(profile.uid, "current-user");
  assert.equal(profile.username, "Current Player");
  assert.equal(profile.email, "current@example.com");
  assert.equal(profile.provider, "password");
});

test("stored usernames are trimmed before reaching authenticated UI", () => {
  const authUser = {
    uid: "current-user",
    email: "current@example.com",
    displayName: "Current User",
    isAnonymous: false,
    providerData: [{ providerId: "google.com" }],
  };

  assert.equal(
    normalizeAuthUser(authUser, { username: "Kikerkov " }).username,
    "Kikerkov"
  );
  assert.equal(
    normalizeAuthUser(authUser, { username: "   " }).username,
    "Current User"
  );
  assert.equal(normalizeUsername("  New Member  "), "New Member");
  assert.equal(normalizeUsername("   ", "Fallback User "), "Fallback User");
});

test("anonymous auth users remain explicitly anonymous", () => {
  const authUser = {
    uid: "guest-user",
    email: null,
    isAnonymous: true,
    providerData: [],
  };

  assert.equal(getAuthProvider(authUser), "anonymous");
  assert.equal(normalizeAuthUser(authUser).username, "Guest");
  assert.equal(normalizeAuthUser(null), null);
});
