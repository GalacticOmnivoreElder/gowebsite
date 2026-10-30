const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { loadSourceModule } = require("./helpers/load-source-module.cjs");

function fixture() {
  let viewer = null;
  const docs = new Map([["users/owner", { profilePrivacy: "public", ownerOfProjects: ["public", "private"] }], ["projects/public", { title: "Public project", visibility: "Public", status: "live" }], ["projects/private", { title: "Secret project", visibility: "Private", status: "draft" }], ["personal_project_timeline_preferences/owner", { publicProjectIds: ["private"] }]]);
  const ref = (path) => ({ id: path.split("/").at(-1), path, get: async () => snap(path) });
  const snap = (path) => ({ id: path.split("/").at(-1), exists: docs.has(path), data: () => docs.get(path) });
  const db = { collection: (name) => ({ doc: (id) => ref(`${name}/${id}`), where: (_field, _op, uid) => ({ limit: () => ({ get: async () => ({ docs: [...docs.keys()].filter((key) => key.startsWith(`${name}/`) && docs.get(key).userId === uid).map(snap) }) }) }) }), runTransaction: async (fn) => fn({ get: async (r) => snap(r.path), set: (r, value) => docs.set(r.path, { ...docs.get(r.path), ...value }) }) };
  const route = loadSourceModule("src/app/api/personal-project-timeline/route.js", ["GET", "PATCH"], { stripImports: true, sandbox: { getRequestUser: async () => viewer, adminDb: db, PUBLIC_PROJECT_STATUSES: ["live"], isPublicLearningStatus: (value) => value === "completed", createHash, Response, URL } });
  return { docs, route, setViewer: (v) => { viewer = v; } };
}
test("project timeline requires both an owner opt-in and a public source", async () => {
  const { docs, route, setViewer } = fixture();
  let response = await route.GET(new Request("https://example.test/api?userId=owner"));
  assert.deepEqual((await response.json()).entries, []);
  setViewer({ uid: "owner" });
  response = await route.PATCH({ json: async () => ({ id: "public", public: true }) });
  assert.equal(response.status, 200);
  setViewer(null);
  response = await route.GET(new Request("https://example.test/api?userId=owner"));
  assert.deepEqual((await response.json()).entries.map((item) => item.id), ["public"]);
  docs.get("users/owner").profilePrivacy = "private";
  assert.equal((await route.GET(new Request("https://example.test/api?userId=owner"))).status, 404);
});
test("registration and organizer attendance remain separate and private by default", async () => {
  const { docs, route, setViewer } = fixture();
  docs.set("learning_enrollments/enroll", { userId: "owner", itemId: "course", state: "confirmed", enrolledAt: "2026-01-01" });
  docs.set("learning_items/course", { title: "Course", status: "completed" });
  setViewer({ uid: "owner" });
  let entries = (await (await route.GET(new Request("https://example.test/api?userId=owner"))).json()).entries;
  assert.equal(entries.filter((item) => item.kind === "learning").length, 1);
  assert.equal(entries.find((item) => item.id === "registration_enroll").public, false);
  docs.get("learning_enrollments/enroll").state = "attended";
  entries = (await (await route.GET(new Request("https://example.test/api?userId=owner"))).json()).entries;
  assert.equal(entries.filter((item) => item.kind === "learning").length, 2);
  assert.equal(entries.find((item) => item.id === "attendance_enroll").public, false);
  assert.equal((await route.PATCH({ json: async () => ({ id: "attendance_enroll", public: true }) })).status, 200);
  setViewer(null);
  entries = (await (await route.GET(new Request("https://example.test/api?userId=owner"))).json()).entries;
  assert.equal(entries.some((item) => item.id === "attendance_enroll"), true);
  assert.equal(entries.some((item) => item.id === "registration_enroll"), false);
});
test("only the owner can share an eligible project", async () => {
  const { route, setViewer } = fixture();
  assert.equal((await route.PATCH({})).status, 401);
  setViewer({ uid: "owner" });
  assert.equal((await route.PATCH({ json: async () => ({ id: "private", public: true }) })).status, 400);
  assert.equal((await route.PATCH({ json: async () => ({ id: "other", public: true }) })).status, 404);
});
