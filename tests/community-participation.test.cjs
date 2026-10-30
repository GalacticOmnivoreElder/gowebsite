const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { loadSourceModule } = require("./helpers/load-source-module.cjs");

function fixture() {
  const docs = new Map([
    ["users/member", { activeMember: true }],
    ["users/inactive", { activeMember: false }],
    ["community_priority_polls/poll", { published: true, startsAt: "2026-01-01T00:00:00.000Z", endsAt: "2026-12-01T00:00:00.000Z", options: ["A", "B"], counts: [0, 0] }],
    ["community_suggestions/idea", { status: "open", supportCount: 0 }],
  ]);
  const ref = (path) => ({ path, collection: (name) => ({ doc: (id) => ref(`${path}/${name}/${id}`) }) });
  let lock = Promise.resolve();
  const db = { collection: (name) => ({ doc: (id) => ref(`${name}/${id}`) }), runTransaction: async (fn) => {
    const prior = lock; let release; lock = new Promise((resolve) => { release = resolve; }); await prior;
    const writes = [];
    try { const result = await fn({ get: async (r) => ({ exists: docs.has(r.path), data: () => docs.get(r.path) }), create: (r, value) => writes.push(() => { if (docs.has(r.path)) throw new Error("duplicate"); docs.set(r.path, value); }), update: (r, value) => writes.push(() => docs.set(r.path, { ...docs.get(r.path), ...value })) }); writes.forEach((write) => write()); return result; } finally { release(); }
  } };
  const service = loadSourceModule("src/lib/community-participation.js", ["castPriorityVote", "supportSuggestion", "cleanPoll"], { stripImports: true, transform: (source) => source.replace('import "server-only";', ""), sandbox: { createHash, adminDb: db, hasActiveSubscription: (data) => data.activeMember === true } });
  return { docs, service };
}
test("concurrent duplicate ballots count only once and eligibility is checked", async () => {
  const { docs, service } = fixture(); const now = new Date("2026-06-01T00:00:00Z");
  const result = await Promise.allSettled([service.castPriorityVote("member", "poll", 0, now), service.castPriorityVote("member", "poll", 1, now)]);
  assert.equal(result.filter((item) => item.status === "fulfilled").length, 1);
  assert.deepEqual(Array.from(docs.get("community_priority_polls/poll").counts), [1, 0]);
  await assert.rejects(service.castPriorityVote("inactive", "poll", 0, now), { status: 403 });
  await assert.rejects(service.castPriorityVote("member", "poll", 0, new Date("2027-01-01")), { status: 409 });
});
test("support is restricted and counted only once", async () => {
  const { docs, service } = fixture();
  await assert.rejects(service.supportSuggestion("inactive", "idea"), { status: 403 });
  const result = await Promise.allSettled([service.supportSuggestion("member", "idea"), service.supportSuggestion("member", "idea")]);
  assert.equal(result.filter((item) => item.status === "fulfilled").length, 1);
  assert.equal(docs.get("community_suggestions/idea").supportCount, 1);
});
test("poll validation requires distinct options and a valid period", () => {
  const { service } = fixture();
  assert.throws(() => service.cleanPoll({ title: "Test", options: ["A", "a"], startsAt: "2026-01-01", endsAt: "2026-02-01" }));
  assert.throws(() => service.cleanPoll({ title: "Test", options: ["A", "B"], startsAt: "2026-02-01", endsAt: "2026-01-01" }));
});
test("result summaries handle ties and zero votes", () => {
  const { summarizePollResults } = loadSourceModule("src/lib/community-poll-results.js", ["summarizePollResults"]);
  assert.deepEqual(JSON.parse(JSON.stringify(summarizePollResults(["A", "B"], [0, 0]))), { total: 0, winners: [] });
  assert.deepEqual(JSON.parse(JSON.stringify(summarizePollResults(["A", "B", "C"], [2, 2, 1]))), { total: 5, winners: ["A", "B"] });
});
test("poll results remain hidden until published and closed", async () => {
  const pollDocs = [
    { id: "closed", data: () => ({ title: "Closed", published: true, options: ["A", "B"], counts: [2, 1], startsAt: "2020-01-01", endsAt: "2020-01-02", resultsPublished: true }) },
    { id: "unpublished", data: () => ({ title: "Hidden", published: true, options: ["A", "B"], counts: [2, 1], startsAt: "2020-01-01", endsAt: "2020-01-02", resultsPublished: false }) },
    { id: "open", data: () => ({ title: "Open", published: true, options: ["A", "B"], counts: [2, 1], startsAt: "2020-01-01", endsAt: "2999-01-02", resultsPublished: true }) },
  ];
  const { GET } = loadSourceModule("src/app/api/community-participation/route.js", ["GET"], { stripImports: true, sandbox: {
    Response, getRequestUser: async () => ({ uid: "member", userData: { activeMember: true } }), hasActiveSubscription: (user) => user.activeMember,
    adminDb: { collection: (name) => ({ limit: () => ({ get: async () => ({ docs: name === "community_priority_polls" ? pollDocs : [] }) }) }) },
  } });
  const result = await (await GET({})).json();
  assert.deepEqual(result.polls[0].results, [2, 1]);
  assert.equal(result.polls[1].results, null);
  assert.equal(result.polls[2].results, null);
});
test("only admins can publish results and an open poll cannot publish them", async () => {
  let user = null;
  const poll = { published: true, endsAt: "2999-01-01T00:00:00Z" };
  const db = { collection: (name) => ({ doc: (id) => ({ name, id }) }), runTransaction: async (fn) => fn({ get: async () => ({ exists: true, data: () => poll }), update: () => { throw new Error("Must not publish"); } }) };
  const { POST } = loadSourceModule("src/app/api/admin/community-participation/route.js", ["POST"], { stripImports: true, sandbox: { Response, getRequestUser: async () => user, adminDb: db, validId: (id) => Boolean(id) } });
  const request = () => ({ json: async () => ({ action: "publishResults", id: "poll", reason: "Close" }) });
  assert.equal((await POST(request())).status, 401);
  user = { uid: "member", admin: false };
  assert.equal((await POST(request())).status, 403);
  user = { uid: "admin", admin: true };
  assert.equal((await POST(request())).status, 409);
});
