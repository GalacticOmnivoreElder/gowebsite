const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const {
  PASSWORD_RESET_GENERIC_MESSAGE,
  passwordResetContinueUrl,
  requestPasswordReset,
} = loadSourceModule(
  "src/lib/password-reset.js",
  [
    "PASSWORD_RESET_GENERIC_MESSAGE",
    "passwordResetContinueUrl",
    "requestPasswordReset",
  ]
);

test("password reset uses a same-origin login continuation", () => {
  assert.equal(
    passwordResetContinueUrl("https://www.galacticomnivore.com/profile"),
    "https://www.galacticomnivore.com/login?reset=1"
  );
  assert.throws(
    () => passwordResetContinueUrl("javascript:alert(1)"),
    /Invalid password reset origin/
  );
});

test("password reset masks whether an account exists", async () => {
  for (const code of ["auth/user-not-found", "auth/invalid-email"]) {
    const result = await requestPasswordReset({
      authInstance: {},
      email: "member@example.com",
      origin: "https://www.galacticomnivore.com",
      send: async () => {
        const error = new Error("provider detail");
        error.code = code;
        throw error;
      },
    });
    assert.equal(result.message, PASSWORD_RESET_GENERIC_MESSAGE);
  }
});

test("password reset maps provider failures to safe actionable messages", async () => {
  await assert.rejects(
    requestPasswordReset({
      authInstance: {},
      email: "member@example.com",
      origin: "https://www.galacticomnivore.com",
      send: async () => {
        const error = new Error("provider detail");
        error.code = "auth/too-many-requests";
        throw error;
      },
    }),
    /wait a few minutes/
  );
});
