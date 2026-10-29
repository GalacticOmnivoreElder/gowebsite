const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("bug reports validate input, create service requests, and report attachment failures", async () => {
  const documents = new Map();
  globalThis.__bugReportTestDb = {
    collection: () => ({ doc: (id) => ({ id }) }),
    runTransaction: async (callback) => callback({
      get: async (ref) => ({ data: () => documents.get(ref.id) }),
      set: (ref, value) => documents.set(ref.id, { ...value, windowStart: { toMillis: () => value.windowStart.getTime() } }),
    }),
  };
  const source = fs.readFileSync("src/lib/bug-report.js", "utf8").replace('import { adminDb } from "@/lib/firebase-admin";', "const adminDb = globalThis.__bugReportTestDb;");
  const { submitBugReport } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  const previous = { ...process.env };
  const originalFetch = globalThis.fetch;
  process.env.JIRA_BUG_CLOUD_ID = "32a1c980-b7ad-4233-bb1e-3d62280bda02";
  process.env.JIRA_BUG_API_TOKEN = "test-token";
  process.env.JIRA_BUG_RATE_LIMIT_SECRET = "test-secret";
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    if (url.endsWith("/attachTemporaryFile")) return Response.json({ temporaryAttachments: [{ temporaryAttachmentId: "temporary-1" }] });
    if (url.endsWith("/attachment")) return new Response(null, { status: 403 });
    return Response.json({ issueKey: "GO-123" }, { status: 201 });
  };
  try {
    const invalid = await submitBugReport({ email: "bad", summary: "Bug", description: "short" });
    assert.equal(invalid.status, 400);
    assert.equal(requests.length, 0);
    const result = await submitBugReport({ email: "visitor@example.com", summary: "Broken profile", description: "The save button does not work.", file: new File(["image"], "capture.png", { type: "image/png" }) });
    assert.equal(result.status, 201);
    assert.equal(result.reference, "GO-123");
    assert.equal(result.attachmentFailed, true);
    assert.equal(requests.length, 3);
    const body = JSON.parse(requests[1].options.body);
    assert.equal(body.serviceDeskId, "5");
    assert.equal(body.requestTypeId, "10220");
    assert.match(body.requestFieldValues.description, /Reporter email \(unverified\): visitor@example.com/);
    assert.equal(requests[1].options.headers.Authorization, "Bearer test-token");
    assert.deepEqual(JSON.parse(requests[2].options.body).temporaryAttachmentIds, ["temporary-1"]);
    globalThis.fetch = async () => { throw new Error("network timeout"); };
    const unknown = await submitBugReport({ email: "other@example.com", summary: "Another bug", description: "The page does not open." });
    assert.equal(unknown.status, 502);
    assert.match(unknown.error, /couldn't confirm/);
    await submitBugReport({ email: "other@example.com", summary: "Another bug", description: "The page does not open." });
    await submitBugReport({ email: "other@example.com", summary: "Another bug", description: "The page does not open." });
    const limited = await submitBugReport({ email: "other@example.com", summary: "Another bug", description: "The page does not open." });
    assert.equal(limited.status, 429);
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of ["JIRA_BUG_CLOUD_ID", "JIRA_BUG_API_TOKEN", "JIRA_BUG_RATE_LIMIT_SECRET"]) {
      if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
    }
    delete globalThis.__bugReportTestDb;
  }
});
