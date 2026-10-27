const { expect, test } = require("@playwright/test");

const profile = { optedIn: false, skills: ["Unity"], seekingSkills: [], interests: [], goal: "", timeZone: "Europe/Skopje", availability: "available", shareAppetite: false };

async function signedIn(page) {
  const encode = (object) => Buffer.from(JSON.stringify(object)).toString("base64url");
  const token = `${encode({ alg: "none", typ: "JWT" })}.${encode({ sub: "test-user", user_id: "test-user", aud: "demo-go-platform", iat: 1700000000, exp: 4102444800 })}.signature`;
  await page.addInitScript(({ token }) => {
    const user = { uid: "test-user", email: "test@example.com", emailVerified: true, isAnonymous: false, providerData: [], stsTokenManager: { refreshToken: "test-refresh", accessToken: token, expirationTime: 4102444800000 }, createdAt: "1700000000000", lastLoginAt: "1700000000000", apiKey: "matchmaking-test-key", appName: "[DEFAULT]" };
    localStorage.setItem("firebase:authUser:matchmaking-test-key:[DEFAULT]", JSON.stringify(user));
  }, { token });
}

test.beforeEach(async ({ page }) => {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") return route.abort();
    return route.continue();
  });
  await page.route("**/api/skills", (route) => route.fulfill({ json: { skills: [{ name: "Unity", active: true }, { name: "Art", active: true }] } }));
});

test("visitors are invited to sign in", async ({ page }) => {
  await page.goto("/matchmaking");
  await expect(page.getByRole("link", { name: "Sign in to continue" })).toBeVisible();
});

test("free accounts see the membership requirement", async ({ page }) => {
  await signedIn(page);
  await page.route("**/api/matchmaking", (route) => route.fulfill({ status: 403, json: { code: "membership_required", error: "An active GO Community membership is required for matchmaking." } }));
  await page.goto("/matchmaking");
  await expect(page.getByText("An active GO Community membership is required to find collaborators.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Explore membership" })).toHaveAttribute("href", "/membership");
  await expect(page.getByRole("button", { name: "Save preferences" })).toHaveCount(0);
});

test("members can opt in, save preferences and block an unavailable match", async ({ page }) => {
  await signedIn(page);
  const state = { ...profile };
  const actions = [];
  await page.route("**/api/matchmaking", async (route) => {
    const request = route.request();
    if (request.method() === "PUT") { Object.assign(state, request.postDataJSON()); return route.fulfill({ json: { profile: state } }); }
    if (request.method() === "POST") { actions.push(request.postDataJSON()); return route.fulfill({ json: { state: "blocked" } }); }
    return route.fulfill({ json: { profile: state, suggestions: [], requests: [], matches: state.optedIn ? [{ id: "pair", peer: { id: "peer", name: "Creator unavailable", profileUrl: null }, reasons: [] }] : [] } });
  });
  await page.goto("/matchmaking");
  await expect(page.getByRole("heading", { name: "Find your next team" })).toBeVisible();
  await page.getByLabel("Show me in GO matchmaking").check();
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.getByText("Your matchmaking preferences are saved.")).toBeVisible();
  await expect(page.getByText("Creator unavailable")).toBeVisible();
  await page.getByRole("button", { name: "End match and block" }).click();
  await expect.poll(() => actions.length).toBe(1);
  expect(actions[0]).toEqual({ action: "block", peerId: "peer" });
  await expect(page.locator("body")).not.toHaveCSS("overflow-x", "scroll");
});
