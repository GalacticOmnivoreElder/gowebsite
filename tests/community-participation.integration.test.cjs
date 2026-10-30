const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { initializeApp, deleteApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { loadSourceModule } = require("./helpers/load-source-module.cjs");

assert.equal(process.env.FIRESTORE_EMULATOR_HOST, "127.0.0.1:8085", "Use only the local emulator.");
const app = initializeApp({ projectId: "demo-go-platform" }, "community-vote-integration");
const db = getFirestore(app);
const serviceDb = new Proxy(db, { get(target, key) { if (key === "runTransaction") return (callback) => target.runTransaction((tx) => Promise.resolve(callback(tx))); const value = Reflect.get(target, key, target); return typeof value === "function" ? value.bind(target) : value; } });
const { hasActiveSubscription } = loadSourceModule("src/lib/auth-utils.js", ["hasActiveSubscription"], { stripImports: true });
const { castPriorityVote } = loadSourceModule("src/lib/community-participation.js", ["castPriorityVote"], { stripImports: true, transform: (source) => source.replace('import "server-only";', ""), sandbox: { createHash, adminDb: serviceDb, hasActiveSubscription } });
after(async () => { await db.terminate(); await deleteApp(app); });

test("Firestore transaction admits one concurrent ballot and records one count", async () => {
  const pollId = `test_${Date.now()}`; const uid = `member_${pollId}`;
  const poll = db.collection("community_priority_polls").doc(pollId);
  await db.collection("users").doc(uid).set({ activeMember: true });
  await poll.set({ title: "Priority", options: ["A", "B"], counts: [0, 0], published: true, startsAt: "2026-01-01T00:00:00.000Z", endsAt: "2027-01-01T00:00:00.000Z" });
  const result = await Promise.allSettled([castPriorityVote(uid, pollId, 0, new Date("2026-06-01")), castPriorityVote(uid, pollId, 1, new Date("2026-06-01"))]);
  assert.equal(result.filter((item) => item.status === "fulfilled").length, 1);
  assert.equal(result.filter((item) => item.status === "rejected")[0].reason.status, 409);
  const counts = (await poll.get()).data().counts;
  assert.equal(counts[0] + counts[1], 1);
  assert.equal((await poll.collection("ballots").get()).size, 1);
});
