const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const {
  normalizeAvailability,
  reconcileAvailabilityMissingInformation,
} = loadSourceModule("src/lib/availability.js", [
  "normalizeAvailability",
  "reconcileAvailabilityMissingInformation",
]);

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("explicit available selections produce badges without an availability gap", () => {
  const availability = normalizeAvailability({
    availability: {
      availability_answered: true,
      availability_status: "available",
      available_for_projects: true,
      available_for_paid_work: true,
      preferred_time_commitment: "5–10 hours per week",
    },
  });

  assert.equal(availability.status, "available");
  assert.deepEqual(plain(availability.labels), [
    "Available for projects",
    "Open to paid work",
    "5–10 hours per week",
  ]);
  assert.deepEqual(
    plain(
      reconcileAvailabilityMissingInformation(
        ["portfolio link", "availability"],
        availability
      )
    ),
    ["portfolio link"]
  );
});

test("explicit unavailable is answered and does not request availability", () => {
  const availability = normalizeAvailability({
    availability: {
      availability_answered: true,
      availability_status: "unavailable",
      available_for_projects: false,
      available_for_paid_work: false,
    },
  });

  assert.equal(availability.hasExplicitSelection, true);
  assert.equal(availability.status, "unavailable");
  assert.deepEqual(plain(availability.labels), ["Not currently available"]);
  assert.deepEqual(
    plain(
      reconcileAvailabilityMissingInformation(
        ["availability"],
        availability
      )
    ),
    []
  );
});

test("biography and summary prose never imply structured availability", () => {
  const availability = normalizeAvailability({
    profile: {
      bio: "Available for exciting game projects.",
      summary: "Open to paid work immediately.",
      looking_for: ["projects"],
    },
  });

  assert.equal(availability.hasExplicitSelection, false);
  assert.equal(availability.status, null);
  assert.deepEqual(plain(availability.labels), []);
  assert.deepEqual(
    plain(reconcileAvailabilityMissingInformation([], availability)),
    ["availability"]
  );
});

test("compatible legacy availability fields normalize without contradictions", () => {
  const available = normalizeAvailability({
    profile: {
      looking_for_projects: true,
      looking_for_paid_work: false,
    },
  });
  const unansweredDefaults = normalizeAvailability({
    availability: {
      available_for_projects: false,
      available_for_paid_work: false,
    },
  });

  assert.equal(available.status, "available");
  assert.deepEqual(plain(available.labels), ["Available for projects"]);
  assert.equal(unansweredDefaults.status, null);
  assert.equal(unansweredDefaults.hasExplicitSelection, false);
  assert.deepEqual(
    plain(
      reconcileAvailabilityMissingInformation(
        ["availability"],
        unansweredDefaults
      )
    ),
    ["availability"]
  );
});

test("an explicit unanswered marker overrides generated false defaults", () => {
  const availability = normalizeAvailability({
    availability: {
      availability_answered: false,
      availability_status: null,
      available_for_projects: false,
      available_for_paid_work: false,
      preferred_time_commitment: null,
    },
  });

  assert.equal(availability.hasExplicitSelection, false);
  assert.deepEqual(
    plain(reconcileAvailabilityMissingInformation([], availability)),
    ["availability"]
  );
});
