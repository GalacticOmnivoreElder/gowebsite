const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

test("merch withdrawal atomically deletes all request data", async () => {
  const operations = [];
  const ref = { id: "request-1" };
  const adminDb = {
    collection(name) {
      assert.equal(name, "merch_requests");
      return { doc: () => ref };
    },
    async runTransaction(callback) {
      return callback({
        async get(target) {
          assert.equal(target, ref);
          return {
            data: () => ({
              active: { email: "private@example.com", sizes: ["M"] },
              manageVersion: "manage-version",
              status: "confirmed",
            }),
          };
        },
        delete(target) {
          operations.push({ target, type: "delete" });
        },
      });
    },
  };
  const { merchAction } = loadSourceModule(
    "src/lib/merch-server.js",
    ["merchAction"],
    {
      stripImports: true,
      sandbox: {
        FieldValue: { delete: () => ({ op: "delete" }) },
        MERCH_CONSENT: "consent",
        adminDb,
        readMerchToken: () => ({ id: "request-1", version: "manage-version" }),
      },
    }
  );

  const result = await merchAction({ action: "withdraw", token: "valid" });

  assert.deepEqual(operations, [{ target: ref, type: "delete" }]);
  assert.match(result.message, /details have been removed/i);
});

test("browser hardening includes nonce CSP and baseline security headers", () => {
  const proxy = fs.readFileSync("src/proxy.js", "utf8");
  const config = fs.readFileSync("next.config.js", "utf8");

  assert.match(proxy, /crypto\.randomUUID\(\)/);
  assert.match(proxy, /script-src 'self' 'nonce-\$\{nonce\}' 'strict-dynamic'/);
  assert.doesNotMatch(
    proxy.match(/`script-src[^`]+`/)?.[0] || "",
    /unsafe-inline/
  );
  for (const directive of ["object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'"]) {
    assert.match(proxy, new RegExp(directive.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  for (const header of [
    "Strict-Transport-Security",
    "Referrer-Policy",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Permissions-Policy",
  ]) {
    assert.match(config, new RegExp(header));
  }
});

test("blog excerpts are sanitized before HTML rendering", () => {
  const source = fs.readFileSync("src/app/blog/page.js", "utf8");
  assert.match(source, /DOMPurify\.sanitize\(he\.decode\(post\.excerpt\)/);
  assert.match(source, /ALLOWED_ATTR:\s*\[\]/);
  assert.match(source, /dangerouslySetInnerHTML=\{\{ __html: decodedExcerpt \}\}/);
});

test("server-owned external requests have explicit timeouts", () => {
  for (const path of [
    "src/app/api/billing/cancel/route.js",
    "src/app/api/billing/subscription/route.js",
    "src/app/api/blog/route.js",
    "src/lib/go-events-server.js",
    "src/lib/polar.js",
    "src/lib/seo.js",
  ]) {
    assert.match(
      fs.readFileSync(path, "utf8"),
      /AbortSignal\.timeout\(/,
      `${path} must bound outbound requests`
    );
  }
});

test("production dependencies use patched security lines", () => {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  assert.equal(pkg.dependencies.next, "16.4.0");
  assert.match(pkg.dependencies.firebase, /^\^12\./);
  assert.match(pkg.dependencies["firebase-admin"], /^\^14\./);
  assert.match(pkg.dependencies.dompurify, /^\^3\.4\./);
  assert.match(pkg.dependencies.sharp, /^\^0\.35\./);
  assert.equal(pkg.overrides["@grpc/grpc-js"], "1.14.5");
  assert.equal(fs.existsSync("src/lib/webhook-verification.js"), false);
});
