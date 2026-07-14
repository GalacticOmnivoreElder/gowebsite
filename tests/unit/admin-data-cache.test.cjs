const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

function loadCacheWithClock(clock) {
  return loadSourceModule(
    "src/lib/admin-data-cache.js",
    ["getAdminCache", "setAdminCache", "clearAdminCache"],
    {
      sandbox: {
        Date: {
          now: () => clock.now,
        },
      },
    }
  );
}

test("admin cache stores and returns data until its TTL expires", () => {
  const clock = { now: 1_000 };
  const { getAdminCache, setAdminCache } = loadCacheWithClock(clock);

  setAdminCache("users:list", { count: 2 }, 500);
  assert.deepEqual(JSON.parse(JSON.stringify(getAdminCache("users:list"))), { count: 2 });

  clock.now = 1_499;
  assert.deepEqual(JSON.parse(JSON.stringify(getAdminCache("users:list"))), { count: 2 });

  clock.now = 1_501;
  assert.equal(getAdminCache("users:list"), null);
});

test("clearAdminCache clears everything or only matching keys and prefixes", () => {
  const clock = { now: 1_000 };
  const { clearAdminCache, getAdminCache, setAdminCache } = loadCacheWithClock(clock);

  setAdminCache("users:list", 1);
  setAdminCache("users:detail:1", 2);
  setAdminCache("projects:list", 3);

  clearAdminCache("users:");
  assert.equal(getAdminCache("users:list"), null);
  assert.equal(getAdminCache("users:detail:1"), null);
  assert.equal(getAdminCache("projects:list"), 3);

  clearAdminCache();
  assert.equal(getAdminCache("projects:list"), null);
});
