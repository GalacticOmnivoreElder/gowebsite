const test = require("node:test");
const assert = require("node:assert/strict");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");
const { validateRolePolicy, planDiscordRoles, eligibleRole, roleSafety } = loadSourceModule("src/lib/discord-role-policy.mjs", ["validateRolePolicy", "planDiscordRoles", "eligibleRole", "roleSafety"]);
const role = "100000000000000111";
const { effectiveRoleMode } = loadSourceModule("src/lib/discord-role-policy.mjs", ["effectiveRoleMode"]);
const old = "100000000000000112";
const rule = (source, value = "", roleId = role) => ({ roleId, source, value, enabled: true });
const policy = (rules, mode = "apply") => validateRolePolicy({ mode, mappings: rules });
const context = { accountExists: true, user: { skills: [" Programming "] }, profile: { onboarding_completed: true } };

test("pilot rollout applies to selected GO users while everyone else stays in preview", () => {
  const pilot = validateRolePolicy({ mode: "apply", mappings: [], pilotUserIds: ["pilot"] });
  assert.equal(effectiveRoleMode(pilot, "pilot"), "apply");
  assert.equal(effectiveRoleMode(pilot, "other"), "preview");
  assert.equal(effectiveRoleMode({ mode: "preview", pilotUserIds: ["pilot"] }, "pilot"), "preview");
  assert.throws(() => validateRolePolicy({ mode: "apply", mappings: [], pilotUserIds: ["../users"] }));
});

test("skills are normalized, aliases are explicit, and cannot establish paid or mentor eligibility", () => {
  assert.equal(eligibleRole(rule("skill", "Scripting|Programming"), context), true);
  assert.equal(eligibleRole(rule("member"), { ...context, user: { skills: ["member", "mentor", "administrator"] } }), false);
  assert.equal(eligibleRole(rule("mentor"), { ...context, active: true, tier: "mentor" }), false);
  assert.equal(eligibleRole(rule("mentor"), { ...context, user: { mentorStatus: "approved" }, active: true, tier: "mentor" }), true);
  assert.equal(eligibleRole(rule("mentor"), { ...context, user: { mentorStatus: "approved" }, active: false, tier: "mentor" }), false);
  assert.equal(eligibleRole(rule("mentor"), { ...context, user: { mentorStatus: "approved" }, active: true, tier: "company", mentorAddon: true }), true);
});

test("only mapped or previously owned roles are removed; retired mappings are cleaned", () => {
  const plan = planDiscordRoles({ policy: policy([rule("skill", "Programming")]), context,
    currentRoleIds: [old, "unrelated-staff-role"], ownedRoleIds: [old] });
  assert.deepEqual([...plan.add], [role]);
  assert.deepEqual([...plan.remove], [old]);
});

test("screening, deleted GO account and incomplete onboarding do not grant mapped roles", () => {
  for (const options of [{ screening: true }, { context: { ...context, accountExists: false } },
    { context: { ...context, profile: { onboarding_completed: false } } }]) {
    const plan = planDiscordRoles({ policy: policy([rule("linked")]), context, currentRoleIds: [role], ...options });
    assert.equal(plan.add.length, 0);
    assert.deepEqual([...plan.remove], [role]);
  }
});

test("manual grants expire and project access cannot be supplied through skills", () => {
  assert.equal(eligibleRole(rule("manual"), { grants: { roleIds: [role], expiresAt: new Date(0) } }), false);
  assert.equal(eligibleRole(rule("manual"), { grants: { roleIds: [role] } }), true);
  assert.equal(eligibleRole(rule("project", "p1"), { ...context, user: { skills: ["p1"] } }), false);
  assert.equal(eligibleRole(rule("project", "p1"), { ...context, projectIds: ["p1"] }), true);
});

test("policy validation rejects duplicate IDs, unknown sources, invalid values and project paths", () => {
  for (const mappings of [[rule("skill", "Programming"), rule("member")], [rule("administrator")], [rule("skill")],
    [rule("interest", "admin")], [rule("project", "../../users")], [rule("appetite", "admin")]]) {
    assert.throws(() => policy(mappings));
  }
});

test("live role validation blocks administrative powers, bot/integration roles and hierarchy violations", () => {
  const base = { id: role, permissions: "0", managed: false, position: 2 };
  assert.equal(roleSafety(base, old, 3), null);
  for (const permissions of ["8", "32", "268435456", "536870912", "1099511627776"]) {
    assert.equal(roleSafety({ ...base, permissions }, old, 3), "privileged_role");
  }
  assert.equal(roleSafety(base, role, 3), "missing_or_managed_role");
  assert.equal(roleSafety({ ...base, managed: true }, old, 3), "missing_or_managed_role");
  assert.equal(roleSafety(base, old, 2), "role_hierarchy");
});

test("admin routes reject unauthenticated and non-admin requests before loading Discord or Firestore", async () => {
  for (const [user, expected] of [[null, 401], [{ uid: "user", admin: false }, 403]]) {
    const route = loadSourceModule("src/app/api/admin/discord/route.js", ["GET", "POST"], {
      stripImports: true, sandbox: { Response, getRequestUser: async () => user },
    });
    assert.equal((await route.GET({})).status, expected);
    assert.equal((await route.POST({})).status, expected);
  }
});

test("partial role writes retain ownership for crash cleanup and resume", async () => {
  const updates = [];
  const requests = [];
  const bridge = loadSourceModule("src/lib/discord-role-bridge.js", ["applyDiscordRolePlan"], { stripImports: true,
    sandbox: { adminDb: { collection: () => ({ doc: () => ({ update: async (data) => updates.push(data) }) }) },
      discordRequest: async (path, options) => requests.push({ path, ...options }) } });
  const ids = Array.from({ length: 9 }, (_, i) => `${100000000000000100n + BigInt(i)}`);
  const complete = await bridge.applyDiscordRolePlan("uid", { botToken: "not-exported" }, { guildId: "guild", discordId: "discord" },
    { managed: ids, desired: ids, add: ids, remove: [] });
  assert.equal(complete, false);
  assert.equal(requests.length, 6);
  assert.equal(updates[0].managedRoleIds.length, 9);
});

test("profile change queues a durable retry and defers Discord work until after response", async () => {
  const calls = [];
  let deferred;
  const hook = loadSourceModule("src/lib/discord-profile-sync.js", ["notifyDiscordProfileChange"], { stripImports: true,
    sandbox: { getDiscordConfig: () => ({ enabled: true }), enqueueDiscordSync: async (uid) => calls.push(`queue:${uid}`),
      after: (callback) => { deferred = callback; }, syncDiscordConnection: async (uid) => calls.push(`sync:${uid}`) } });
  await hook.notifyDiscordProfileChange("u1");
  assert.deepEqual(calls, ["queue:u1"]);
  await deferred();
  assert.deepEqual(calls, ["queue:u1", "sync:u1"]);
});
