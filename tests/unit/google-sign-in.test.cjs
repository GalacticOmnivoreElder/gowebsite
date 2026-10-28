const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const authProfile = loadSourceModule("src/lib/auth-profile.js", [
  "normalizeAuthUser", "normalizeUsername",
]);
const googleUser = {
  uid: "google-user",
  displayName: "GO Creator",
  email: "creator@example.com",
  photoURL: "https://example.com/avatar.png",
  isAnonymous: false,
  providerData: [{ providerId: "google.com" }],
};

function signInHarness(profile = null) {
  const calls = { writes: [], welcomes: [], permissionChecks: [] };
  const auth = {};
  class GoogleAuthProvider {}
  const { MobxStore: store } = loadSourceModule("src/mobx.js", ["MobxStore"], {
    stripImports: true,
    sandbox: {
      ...authProfile,
      auth,
      db: {},
      GoogleAuthProvider,
      Logger: class {},
      console: { log() {}, error() {} },
      makeAutoObservable() {},
      runInAction: (callback) => callback(),
      getAuth: () => auth,
      onAuthStateChanged() {},
      async signInWithPopup(instance, provider) {
        assert.equal(instance, auth);
        assert.ok(provider instanceof GoogleAuthProvider);
        if (calls.popupError) throw calls.popupError;
        return { user: googleUser };
      },
      doc: (_, collection, uid) => ({ collection, uid }),
      getDoc: async () => ({ exists: () => !!profile, data: () => profile }),
      setDoc: async (ref, data) => calls.writes.push({ ref, data }),
      requestWelcomeEmail: async (user, username) => calls.welcomes.push({ user, username }),
      generateUserAvatar: () => "generated-avatar",
    },
  });
  store.checkPermissions = (force) => calls.permissionChecks.push(force);
  return { store, calls };
}

test("returning Google users retain their profile and membership after authentication", async () => {
  const { store, calls } = signInHarness({
    uid: "stale-id", username: " Returning Creator ", activeMember: true,
  });
  await store.signInWithGoogle();
  assert.equal(store.user.uid, googleUser.uid);
  assert.equal(store.user.provider, "google.com");
  assert.equal(store.user.username, "Returning Creator");
  assert.equal(store.user.activeMember, true);
  assert.equal(store.user.email, googleUser.email);
  assert.equal(calls.writes.length, 0);
  assert.equal(calls.welcomes.length, 0);
  assert.deepEqual(calls.permissionChecks, [true]);
});

test("new Google users get a profile before sign-in resolves", async () => {
  const { store, calls } = signInHarness();
  await store.signInWithGoogle();
  assert.equal(calls.writes.length, 1);
  assert.equal(calls.writes[0].ref.collection, "users");
  assert.equal(calls.writes[0].ref.uid, googleUser.uid);
  assert.equal(calls.writes[0].data, store.user);
  assert.equal(store.user.provider, "google.com");
  assert.equal(store.user.avatar, googleUser.photoURL);
  assert.equal(store.user.username, googleUser.displayName);
  assert.deepEqual(calls.welcomes, [{ user: googleUser, username: googleUser.displayName }]);
  assert.deepEqual(calls.permissionChecks, [true]);
});

test("Google popup errors reach the login page and a later retry can succeed", async () => {
  const { store, calls } = signInHarness({ username: "GO Creator" });
  const error = Object.assign(new Error("Popup closed"), { code: "auth/popup-closed-by-user" });
  calls.popupError = error;
  await assert.rejects(store.signInWithGoogle(), (received) => received === error);
  assert.equal(store.user, null);
  assert.equal(calls.writes.length, 0);
  assert.equal(calls.welcomes.length, 0);
  assert.equal(calls.permissionChecks.length, 0);
  calls.popupError = null;
  await store.signInWithGoogle();
  assert.equal(store.user.uid, googleUser.uid);
  assert.deepEqual(calls.permissionChecks, [true]);
});
