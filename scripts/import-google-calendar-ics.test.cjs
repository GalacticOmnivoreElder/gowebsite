const test = require("node:test");
const assert = require("node:assert/strict");
const { expandCalendar, parseIcsText } = require("./import-google-calendar-ics.cjs");

const window = {
  start: "2026-10-12T00:00:00+02:00",
  endExclusive: "2026-10-17T00:00:00+02:00",
  timezone: "Europe/Warsaw",
};

function calendar(body) {
  return parseIcsText([
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "X-WR-TIMEZONE:Europe/Belgrade",
    body,
    "END:VCALENDAR",
  ].join("\r\n"));
}

test("expands bounded weekly recurrence in the event timezone", () => {
  const source = calendar([
    "BEGIN:VEVENT",
    "UID:weekly-sync",
    "DTSTART;TZID=Europe/Belgrade:20261012T090000",
    "DTEND;TZID=Europe/Belgrade:20261012T100000",
    "RRULE:FREQ=WEEKLY;COUNT=3;BYDAY=MO,WE",
    "SUMMARY:GO weekly sync",
    "STATUS:CONFIRMED",
    "END:VEVENT",
  ].join("\r\n"));
  const events = expandCalendar(source, "meetings", window);
  assert.deepEqual(events.map((event) => event.start), [
    "2026-10-12T07:00:00.000Z",
    "2026-10-14T07:00:00.000Z",
  ]);
});

test("keeps UTC recurrence rules in UTC instead of applying the calendar timezone", () => {
  const source = calendar([
    "BEGIN:VEVENT",
    "UID:utc-series",
    "DTSTART:20261012T230000Z",
    "DTEND:20261012T233000Z",
    "RRULE:FREQ=DAILY;COUNT=2",
    "SUMMARY:GO late call",
    "STATUS:CONFIRMED",
    "END:VEVENT",
  ].join("\r\n"));
  const events = expandCalendar(source, "meetings", window);
  assert.deepEqual(events.map((event) => event.start), [
    "2026-10-12T23:00:00.000Z",
    "2026-10-13T23:00:00.000Z",
  ]);
});

test("expands monthly ordinal weekdays", () => {
  const source = calendar([
    "BEGIN:VEVENT",
    "UID:monthly-series",
    "DTSTART;TZID=Europe/Belgrade:20261005T090000",
    "DTEND;TZID=Europe/Belgrade:20261005T100000",
    "RRULE:FREQ=MONTHLY;COUNT=3;BYDAY=1MO",
    "SUMMARY:Monthly planning",
    "STATUS:CONFIRMED",
    "END:VEVENT",
  ].join("\r\n"));
  const events = expandCalendar(source, "meetings", {
    start: "2026-10-01T00:00:00+02:00",
    endExclusive: "2027-01-01T00:00:00+01:00",
    timezone: "Europe/Warsaw",
  });
  assert.deepEqual(events.map((event) => event.start), [
    "2026-10-05T07:00:00.000Z",
    "2026-11-02T08:00:00.000Z",
    "2026-12-07T08:00:00.000Z",
  ]);
});

test("applies recurrence exclusions and moved occurrence overrides", () => {
  const source = calendar([
    "BEGIN:VEVENT",
    "UID:weekly-sync",
    "DTSTART;TZID=Europe/Belgrade:20261012T090000",
    "DTEND;TZID=Europe/Belgrade:20261012T100000",
    "RRULE:FREQ=WEEKLY;COUNT=3;BYDAY=MO,WE",
    "EXDATE;TZID=Europe/Belgrade:20261014T090000",
    "SUMMARY:GO weekly sync",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:weekly-sync",
    "RECURRENCE-ID;TZID=Europe/Belgrade:20261012T090000",
    "DTSTART;TZID=Europe/Belgrade:20261012T100000",
    "DTEND;TZID=Europe/Belgrade:20261012T110000",
    "SUMMARY:GO weekly sync",
    "STATUS:CONFIRMED",
    "END:VEVENT",
  ].join("\r\n"));
  const events = expandCalendar(source, "meetings", window);
  assert.equal(events.length, 1);
  assert.equal(events[0].start, "2026-10-12T08:00:00.000Z");
  assert.equal(events[0].end, "2026-10-12T09:00:00.000Z");
  assert.equal(events[0].original_start_time, "2026-10-12T07:00:00.000Z");
});

test("keeps all-day entries date-only so the audit excludes them as untimed", () => {
  const source = calendar([
    "BEGIN:VEVENT",
    "UID:all-day",
    "DTSTART;VALUE=DATE:20261013",
    "DTEND;VALUE=DATE:20261014",
    "SUMMARY:GO planning day",
    "STATUS:CONFIRMED",
    "END:VEVENT",
  ].join("\r\n"));
  const events = expandCalendar(source, "meetings", window);
  assert.equal(events.length, 1);
  assert.equal(events[0].start, "2026-10-13");
  assert.equal(events[0].end, "2026-10-14");
});
