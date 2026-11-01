const test = require("node:test");
const assert = require("node:assert/strict");
const { loadSourceModule } = require("./helpers/load-source-module.cjs");
const { cleanTimelineEntry } = loadSourceModule("src/lib/community-timeline.js", ["cleanTimelineEntry"]);
const queue = require("../docs/timeline-approval-queue-2026-10-30.json");

function fakeDatabase() {
  const collections = new Map();
  let nextId = 0;
  let failAudit = false;
  const bucket = (name) => {
    if (!collections.has(name)) collections.set(name, new Map());
    return collections.get(name);
  };
  const snapshot = (id, value) => ({ id, exists: value !== undefined, data: () => value });
  const collection = (name) => ({
    doc: (id = `auto-${++nextId}`) => ({ id, name }),
    get: async () => ({ docs: [...bucket(name)].map(([id, value]) => snapshot(id, value)) }),
    where: (field, operator, expected) => ({
      get: async () => ({ docs: [...bucket(name)].filter(([, value]) => operator === "==" && value[field] === expected).map(([id, value]) => snapshot(id, value)) }),
    }),
  });
  return {
    collection,
    failAudit: () => { failAudit = true; },
    runTransaction: async (callback) => {
      const writes = [];
      await callback({
        get: async (ref) => snapshot(ref.id, bucket(ref.name).get(ref.id)),
        set: (ref, value) => writes.push([ref, value]),
        create: (ref, value) => { if (failAudit) throw new Error("audit unavailable"); writes.push([ref, value]); },
      });
      for (const [ref, value] of writes) bucket(ref.name).set(ref.id, value);
    },
  };
}

function routes(db, user = { uid: "admin-1", admin: true }) {
  const admin = loadSourceModule("src/app/api/admin/community-timeline/route.js", ["GET", "POST"], {
    stripImports: true, sandbox: { getRequestUser: async () => user, adminDb: db, cleanTimelineEntry, Response },
  });
  const publicRoute = loadSourceModule("src/app/api/community-timeline/route.js", ["GET"], {
    stripImports: true, sandbox: { adminDb: db, Response },
  });
  return { admin, publicRoute };
}

test("prepared entry saves as a draft, reloads, publishes and records both changes", async () => {
  const db = fakeDatabase();
  const { admin, publicRoute } = routes(db);
  const draft = { ...queue.entries[0], reviewKey: "research-2026-10-30-1", reason: "" };
  const save = await admin.POST({ json: async () => draft });
  assert.equal(save.status, 200);
  const { id } = await save.json();
  assert.equal(id, "review-research-2026-10-30-1");
  assert.equal((await (await publicRoute.GET()).json()).entries.length, 0);
  const loaded = (await (await admin.GET({})).json()).entries;
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].published, false);
  const published = await admin.POST({ json: async () => ({ ...loaded[0], title: "Reviewed workshop", published: true }) });
  assert.equal(published.status, 200);
  const visible = (await (await publicRoute.GET()).json()).entries;
  assert.equal(visible.length, 1);
  assert.equal(visible[0].title, "Reviewed workshop");
  assert.equal(visible[0].reviewKey, undefined);
  const audit = (await db.collection("admin_audit_events").get()).docs.map((doc) => doc.data());
  assert.equal(audit.length, 2);
  assert.equal(audit[0].reason, "Saved timeline draft");
  assert.equal(audit[1].reason, "Approved timeline entry for publication");
  assert.equal(audit[1].previousValue.published, false);
  assert.equal(audit[1].newValue.published, true);
  const duplicate = await admin.POST({ json: async () => draft });
  assert.equal(duplicate.status, 409);
  assert.equal((await (await admin.GET({})).json()).entries.length, 1);
});

test("failed audit write leaves no entry and invalid publication is rejected", async () => {
  const db = fakeDatabase();
  const { admin } = routes(db);
  const draft = { ...queue.entries[0], reviewKey: "research-2026-10-30-1" };
  const invalid = await admin.POST({ json: async () => ({ ...draft, source: "", published: true }) });
  assert.equal(invalid.status, 400);
  db.failAudit();
  const response = await admin.POST({ json: async () => draft });
  assert.equal(response.status, 500);
  assert.equal((await db.collection("community_timeline").get()).docs.length, 0);
});

test("an undated project lead can be saved privately but cannot be published", async () => {
  const db = fakeDatabase();
  const { admin, publicRoute } = routes(db);
  const candidate = queue.approved_drive_candidates_awaiting_verification[0];
  const draft = { ...candidate, date: "", category: "project", state: "proposal", source: "", published: false, reviewKey: "drive-2026-10-30-1" };
  const saved = await admin.POST({ json: async () => draft });
  assert.equal(saved.status, 200);
  const { id } = await saved.json();
  const published = await admin.POST({ json: async () => ({ ...draft, id, published: true }) });
  assert.equal(published.status, 400);
  assert.match((await published.json()).error, /valid date/);
  assert.equal((await (await publicRoute.GET()).json()).entries.length, 0);
});
