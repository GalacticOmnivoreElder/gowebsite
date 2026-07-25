const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const { requestWelcomeEmail } = loadSourceModule(
  "src/lib/welcome-email.js",
  ["requestWelcomeEmail"]
);

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("welcome email request authenticates the user without sending their email in the body", async () => {
  let request;
  const user = {
    email: "member@example.com",
    isAnonymous: false,
    getIdToken: async () => "firebase-token",
  };

  const result = await requestWelcomeEmail(user, "Member", async (url, options) => {
    request = { options, url };
    return {
      ok: true,
      json: async () => ({ emailId: "email-1", success: true }),
    };
  });

  assert.equal(request.url, "/api/welcomeEmail");
  assert.equal(request.options.headers.Authorization, "Bearer firebase-token");
  assert.deepEqual(JSON.parse(request.options.body), { username: "Member" });
  assert.deepEqual(plain(result), { emailId: "email-1", success: true });
});

test("welcome email request skips anonymous accounts", async () => {
  let called = false;
  const result = await requestWelcomeEmail(
    { email: null, isAnonymous: true },
    "Visitor",
    async () => {
      called = true;
    }
  );

  assert.equal(called, false);
  assert.deepEqual(plain(result), { skipped: true });
});

test("welcome email request reports API failures", async () => {
  const user = {
    email: "member@example.com",
    isAnonymous: false,
    getIdToken: async () => "firebase-token",
  };

  await assert.rejects(
    requestWelcomeEmail(user, "Member", async () => ({
      ok: false,
      json: async () => ({ error: "Email provider unavailable" }),
    })),
    /Email provider unavailable/
  );
});
