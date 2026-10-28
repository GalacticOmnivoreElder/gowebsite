const assert = require("node:assert/strict");
const { webcrypto } = require("node:crypto");
const test = require("node:test");
const { NextResponse } = require("next/server");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

function responseFor(authDomain, nodeEnv = "production") {
  const { proxy } = loadSourceModule("src/proxy.js", ["proxy"], {
    stripImports: true,
    sandbox: {
      crypto: webcrypto,
      Headers,
      NextResponse,
      process: {
        env: {
          NODE_ENV: nodeEnv,
          NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: authDomain,
        },
      },
    },
  });
  return proxy({ headers: new Headers() });
}

function directives(response) {
  return Object.fromEntries(
    response.headers.get("Content-Security-Policy").split("; ").map((entry) => {
      const [name, ...sources] = entry.split(" ");
      return [name, sources];
    })
  );
}

for (const authDomain of ["go-test.firebaseapp.com", "auth.example.com"]) {
  test(`Google popup can embed the configured Firebase helper at ${authDomain}`, () => {
    const policy = directives(responseFor(authDomain));
    assert.ok(policy["frame-src"].includes(`https://${authDomain}`));
    assert.deepEqual(policy["frame-src"].sort(), [
      "'self'",
      `https://${authDomain}`,
      "https://www.youtube.com",
      "https://www.youtube-nocookie.com",
    ].sort());
    assert.deepEqual(policy["frame-ancestors"], ["'none'"]);
    assert.deepEqual(policy["object-src"], ["'none'"]);
    assert.ok(policy["script-src"].includes("'strict-dynamic'"));
    assert.ok(!policy["script-src"].includes("'unsafe-inline'"));
    assert.ok(!policy["script-src"].includes("'unsafe-eval'"));
  });
}

test("CSP forwards the same nonce and policy to Next.js and the browser", () => {
  const first = responseFor("auth.example.com");
  const second = responseFor("auth.example.com");
  const policy = first.headers.get("Content-Security-Policy");
  const nonce = first.headers.get("x-middleware-request-x-nonce");
  assert.match(nonce, /^[a-f0-9]{32}$/);
  assert.ok(policy.includes(`'nonce-${nonce}'`));
  assert.equal(first.headers.get("x-middleware-request-content-security-policy"), policy);
  assert.notEqual(second.headers.get("Content-Security-Policy"), policy);
});

test("missing Firebase config adds no frame sources and development alone allows eval", () => {
  const production = directives(responseFor(undefined));
  const development = directives(responseFor(undefined, "development"));
  assert.deepEqual(production["frame-src"].sort(), [
    "'self'", "https://www.youtube.com", "https://www.youtube-nocookie.com",
  ].sort());
  assert.ok(development["script-src"].includes("'unsafe-eval'"));
  assert.ok("upgrade-insecure-requests" in production);
  assert.ok(!("upgrade-insecure-requests" in development));
});
