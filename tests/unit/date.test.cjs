const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const fixedNow = new Date("2026-07-14T12:00:00.000Z");

class FixedDate extends Date {
  constructor(value) {
    if (arguments.length === 0) {
      super(fixedNow.getTime());
    } else {
      super(value);
    }
  }

  static now() {
    return fixedNow.getTime();
  }
}

const {
  formatFirebaseDate,
  formatRelativeDate,
  formatSeconds,
  formatSecondsToHumanReadable,
  formatTimeRange,
  getDateTime,
  getPeriodEndDate,
  getRelativeTime,
  shouldResetProgress,
} = loadSourceModule(
  "src/utils/date.js",
  [
    "formatFirebaseDate",
    "formatRelativeDate",
    "formatSeconds",
    "formatSecondsToHumanReadable",
    "formatTimeRange",
    "getDateTime",
    "getPeriodEndDate",
    "getRelativeTime",
    "shouldResetProgress",
  ],
  {
    sandbox: { Date: FixedDate },
  }
);

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

test("date helpers format absolute dates and durations", () => {
  assert.equal(getDateTime("2026-07-14T00:00:00.000Z"), "14 Jul, 2026");
  assert.equal(formatSeconds(3661), "01:01:01");
  assert.equal(formatSecondsToHumanReadable(42), "42 sec");
  assert.equal(formatSecondsToHumanReadable(125), "2 min 5 sec");
  assert.equal(formatSecondsToHumanReadable(125, false), "2 min");
  assert.equal(formatSecondsToHumanReadable(3660), "1 hr 1 min");
});

test("formatTimeRange formats local 12-hour clock ranges", () => {
  const start = new Date(2026, 0, 1, 9, 5).getTime();
  const end = new Date(2026, 0, 1, 17, 30).getTime();

  assert.equal(formatTimeRange(start, end), "09:05 AM - 05:30 PM");
});

test("getRelativeTime reports elapsed time using the fixed clock", () => {
  assert.equal(getRelativeTime("2026-07-14T11:59:45.000Z"), "15 seconds ago");
  assert.equal(getRelativeTime("2026-07-14T11:15:00.000Z"), "45 minutes ago");
  assert.equal(getRelativeTime("2026-07-14T09:00:00.000Z"), "3 hours ago");
  assert.equal(getRelativeTime("2026-07-12T12:00:00.000Z"), "2 days ago");
  assert.equal(getRelativeTime("2026-06-14T12:00:00.000Z"), "1 month ago");
});

test("period helpers calculate reset boundaries", () => {
  assert.equal(isoDate(getPeriodEndDate("everyday", "2026-07-14T00:00:00.000Z")), "2026-07-15");
  assert.equal(isoDate(getPeriodEndDate("everyweek", "2026-07-14T00:00:00.000Z")), "2026-07-19");
  assert.equal(isoDate(getPeriodEndDate("everymonth", "2026-07-14T00:00:00.000Z")), "2026-07-31");
  assert.equal(isoDate(getPeriodEndDate("everyyear", "2026-07-14T00:00:00.000Z")), "2026-12-31");
  assert.throws(() => getPeriodEndDate("sometimes", "2026-07-14"), /Unknown frequency/);
  assert.equal(shouldResetProgress("everyday", "2026-07-12T00:00:00.000Z"), true);
  assert.equal(shouldResetProgress("everyday", "2026-07-14T00:00:00.000Z"), false);
});

test("Firebase date helpers accept common Firestore and JS date shapes", () => {
  assert.equal(formatFirebaseDate(null), "Unknown");
  assert.equal(formatFirebaseDate({ seconds: 1_784_030_400 }, { locale: "en-US" }), "July 14, 2026");
  assert.equal(formatFirebaseDate({ _seconds: 1_784_030_400 }, { locale: "en-US" }), "July 14, 2026");
  assert.equal(
    formatFirebaseDate({ toDate: () => new Date("2026-07-14T00:00:00.000Z") }, { locale: "en-US" }),
    "July 14, 2026"
  );
  assert.equal(formatFirebaseDate("2026-07-14T00:00:00.000Z", { locale: "en-US" }), "July 14, 2026");
});

test("formatRelativeDate returns recent labels before falling back to formatted dates", () => {
  assert.equal(formatRelativeDate({ seconds: Math.floor(fixedNow.getTime() / 1000) }), "Today");
  assert.equal(formatRelativeDate({ seconds: Math.floor(new Date("2026-07-13T12:00:00.000Z").getTime() / 1000) }), "Yesterday");
  assert.equal(formatRelativeDate({ seconds: Math.floor(new Date("2026-07-10T12:00:00.000Z").getTime() / 1000) }), "4 days ago");
  assert.equal(formatRelativeDate({ seconds: Math.floor(new Date("2026-06-30T12:00:00.000Z").getTime() / 1000) }), "2 weeks ago");
  assert.equal(formatRelativeDate({ seconds: Math.floor(new Date("2026-04-14T12:00:00.000Z").getTime() / 1000) }), "3 months ago");
});
