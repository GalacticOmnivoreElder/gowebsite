const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { createHash } = require("node:crypto");
const fixedNow = "2026-10-17T10:00:00Z";
class Clock extends Date { constructor(...args) { super(...(args.length ? args : [fixedNow])); } }
function database(seed) {
  const records = new Map(Object.entries(seed));
  let queue = Promise.resolve();
  let sequence = 0;
  const snapshot = (id, value) => ({ id, exists: value !== undefined, data: () => value === undefined ? undefined : structuredClone(value) });
  const db = {
    records,
    collection(name) {
      return {
        doc(id = "audit-" + (++sequence)) {
          const key = name + "/" + id;
          return { key, id, snapshot: (source) => snapshot(id, source.get(key)), get() { return Promise.resolve(this.snapshot(records)); } };
        },
        where(field, operator, value) {
          assert.equal(operator, "==");
          const query = { snapshot(source) { const docs = [...source].filter(([key, data]) => key.startsWith(name + "/") && data[field] === value).map(([key, data]) => snapshot(key.split("/")[1], data)); return { docs, size: docs.length }; }, get() { return Promise.resolve(this.snapshot(records)); } };
          return query;
        },
      };
    },
    runTransaction(callback) {
      const result = queue.then(async () => {
        const working = new Map([...records].map(([key, value]) => [key, structuredClone(value)]));
        const transaction = {
          get: async (ref) => ref.snapshot(working),
          create(ref, value) { if (working.has(ref.key)) throw Object.assign(new Error("exists"), { status: 409 }); working.set(ref.key, structuredClone(value)); },
          update(ref, value) { if (!working.has(ref.key)) throw new Error("missing"); working.set(ref.key, { ...working.get(ref.key), ...structuredClone(value) }); },
          set(ref, value) { working.set(ref.key, structuredClone(value)); },
        };
        const value = await callback(transaction);
        records.clear(); working.forEach((item, key) => records.set(key, item));
        return value;
      });
      queue = result.catch(() => {});
      return result;
    },
  };
  return db;
}
async function service(db) {
  const helpers = await import("../src/lib/monday-builds.mjs");
  const deps = { ...helpers, createHash, adminDb: db, Date: Clock,
    currentBuildPeriod: (now = new Clock()) => helpers.currentBuildPeriod(now),
    getEffectiveMembership: (data, options) => {
      assert.equal(options.admin, false);
      return { activeMember: data.activeMember === true && (!data.subscriptionEndsAt || new Date(data.subscriptionEndsAt) > options.now) };
    },
  };
  const source = fs.readFileSync("src/lib/community-build-service.js", "utf8").replace(/^import .*;\r?\n/gm, "").replace(/^export /gm, "");
  return new Function(...Object.keys(deps), source + "\nreturn { castBuildVote, awardAssetPackStamp, reconcileAssetStamps, managePassportStamp, readPassport };")(...Object.values(deps));
}
const seed = () => ({
  "users/member": { activeMember: true },
  "asset_packs/pack": { contributorId: "member", title: "Original assets", status: "published", currentVersionId: "v1", lastReviewedBy: "staff", publishedAt: new Date(fixedNow) },
  "community_build_polls/2026-10-12": { options: [{ id: "option-1", title: "A", votes: 0 }, { id: "option-2", title: "B", votes: 0 }], totalVotes: 0 },
});
test("concurrent submissions spend one weekly ballot and increment one candidate once", async () => {
  const db = database(seed()); const api = await service(db);
  const outcomes = await Promise.allSettled([api.castBuildVote({ uid: "member" }, "option-1", "2026-10-12"), api.castBuildVote({ uid: "member" }, "option-2", "2026-10-12")]);
  assert.equal(outcomes.filter((item) => item.status === "fulfilled").length, 1);
  assert.equal(outcomes.find((item) => item.status === "rejected").reason.status, 409);
  const poll = db.records.get("community_build_polls/2026-10-12");
  assert.equal(poll.totalVotes, 1); assert.equal(poll.options.reduce((sum, item) => sum + item.votes, 0), 1);
  assert.equal([...db.records.keys()].filter((key) => key.startsWith("community_build_ballots/")).length, 1);
});
test("eligibility uses current server membership and published assets, never caller claims", async () => {
  for (const variant of ["expired", "unpublished"]) {
    const data = seed();
    if (variant === "expired") data["users/member"].subscriptionEndsAt = "2026-10-01T00:00:00Z";
    else data["asset_packs/pack"].status = "approved";
    const db = database(data); const api = await service(db);
    await assert.rejects(api.castBuildVote({ uid: "member", activeMember: true, admin: true }, "option-1", "2026-10-12"), { status: 403 });
    assert.equal(db.records.get("community_build_polls/2026-10-12").totalVotes, 0);
  }
});
test("stale cycles and unknown candidates cannot spend the allowance", async () => {
  const db = database(seed()); const api = await service(db);
  await assert.rejects(api.castBuildVote({ uid: "member" }, "option-1", "2026-10-05"), { status: 409 });
  await assert.rejects(api.castBuildVote({ uid: "member" }, "option-8", "2026-10-12"), { status: 400 });
  assert.equal(db.records.get("community_build_polls/2026-10-12").totalVotes, 0);
});
test("publication creates one official asset stamp; new versions cannot farm extra stamps", async () => {
  const db = database(seed()); const api = await service(db);
  assert.equal(await api.awardAssetPackStamp("pack"), true);
  db.records.get("asset_packs/pack").currentVersionId = "v2";
  assert.equal(await api.awardAssetPackStamp("pack"), false);
  assert.equal([...db.records.keys()].filter((key) => key.startsWith("passport_stamps/")).length, 1);
});
test("published contributors retain asset recognition even if membership expires before review", async () => {
  const data = seed(); data["users/member"].activeMember = false;
  const db = database(data); const api = await service(db);
  assert.equal((await api.reconcileAssetStamps("member")).awarded, 1);
  assert.equal(await api.awardAssetPackStamp("pack"), false);
  await assert.rejects(api.managePassportStamp({ uid: "staff" }, { action: "issue", userId: "member", sourceId: "lan-2026", sourceTitle: "GO LAN", kind: "lan_party", reason: "Attendance checked" }), { status: 403 });
  assert.equal((await api.readPassport("member", { owner: true })).stamps[0].sourceTitle, "Original assets");
});


test("earned stamps survive membership expiry, while staff revocation removes public recognition", async () => {
  const db = database(seed()); const api = await service(db);
  const body = { action: "issue", userId: "member", sourceId: "lan-2026", sourceTitle: "GO LAN", kind: "lan_party", reason: "Attendance checked" };
  const first = await api.managePassportStamp({ uid: "staff" }, body);
  await assert.rejects(api.managePassportStamp({ uid: "staff" }, body), { status: 409 });
  db.records.get("users/member").activeMember = false;
  assert.equal((await api.readPassport("member")).stamps.length, 1);
  await api.managePassportStamp({ uid: "staff" }, { action: "revoke", stampId: first.id, reason: "Corrected attendance record" });
  assert.equal((await api.readPassport("member")).stamps.length, 0);
});
