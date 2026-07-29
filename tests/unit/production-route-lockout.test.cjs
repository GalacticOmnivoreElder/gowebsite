const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");
const {
  NextResponse,
  createRequest,
} = require("../helpers/route-test-utils.cjs");

test("development utility pages are behind a server-side development guard", () => {
  for (const path of [
    "src/app/test-polar/page.js",
    "src/app/make-admin/page.js",
  ]) {
    const source = fs.readFileSync(path, "utf8");
    assert.match(source, /process\.env\.NODE_ENV !== "development"/);
    assert.match(source, /notFound\(\)/);
  }
});

test("admin bootstrap API returns not found outside development", async () => {
  const route = loadSourceModule(
    "src/app/api/admin/make-admin/route.js",
    ["POST"],
    {
      stripImports: true,
      sandbox: {
        NextResponse,
        adminAuth: {},
        adminDb: {},
        process: { env: { NODE_ENV: "production" } },
      },
    }
  );

  const response = await route.POST(
    createRequest({
      headers: { "x-admin-bootstrap-secret": "should-not-work" },
      jsonBody: { uid: "attacker" },
    })
  );
  assert.equal(response.status, 404);
});
