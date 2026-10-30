const test = require("node:test");
const assert = require("node:assert/strict");
const { loadSourceModule } = require("./helpers/load-source-module.cjs");
const { cleanTimelineEntry } = loadSourceModule("src/lib/community-timeline.js", ["cleanTimelineEntry"]);

const base = { title: "A milestone", description: "A verified activity", date: "2024-02-29", category: "milestone", state: "completed" };
test("published completed history requires a source", () => {
  assert.throws(() => cleanTimelineEntry({ ...base, published: true }), /source/);
  assert.equal(cleanTimelineEntry({ ...base, published: true, source: "https://example.org/record" }).published, true);
  assert.equal(cleanTimelineEntry(base).published, false);
});
test("timeline validation rejects invalid dates, states and unsafe links", () => {
  assert.throws(() => cleanTimelineEntry({ ...base, date: "2023-02-29" }));
  assert.throws(() => cleanTimelineEntry({ ...base, state: "promised" }));
  assert.throws(() => cleanTimelineEntry({ ...base, link: "javascript:alert(1)" }));
  assert.throws(() => cleanTimelineEntry({ ...base, image: "https://example.org/image.png" }), /alternative text/);
});

test("admin endpoints reject anonymous and non-admin requests", async () => {
  let user = null;
  const { GET, POST } = loadSourceModule("src/app/api/admin/community-timeline/route.js", ["GET", "POST"], {
    stripImports: true,
    sandbox: { getRequestUser: async () => user, adminDb: {}, cleanTimelineEntry, Response },
  });
  assert.equal((await GET({})).status, 401);
  user = { uid: "member", admin: false };
  assert.equal((await POST({})).status, 403);
});

test("hunger updates require admin access and complete valid information", async () => {
  let user = null;
  const { POST } = loadSourceModule("src/app/api/admin/community-hunger/route.js", ["POST"], {
    stripImports: true, sandbox: { getRequestUser: async () => user, adminDb: {}, Response },
  });
  assert.equal((await POST({})).status, 401);
  user = { uid: "member", admin: false };
  assert.equal((await POST({})).status, 403);
  user = { uid: "admin", admin: true };
  assert.equal((await POST({ json: async () => ({ capacity: "Limited", reviewedOn: "2024-02-30" }) })).status, 400);
});
