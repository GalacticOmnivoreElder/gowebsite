const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const {
  getVideoJoinUrl,
  getUniqueEventSeries,
  normalizeCalendarEvent,
} = loadSourceModule("src/lib/go-events-core.js", [
  "getVideoJoinUrl",
  "getUniqueEventSeries",
  "normalizeCalendarEvent",
]);

test("normalizes members-only events without exposing their Meet URL", () => {
  const event = normalizeCalendarEvent(
    {
      id: "community-meeting-1",
      recurringEventId: "community-meeting-series",
      summary: "GO Community Meeting",
      description: "GO_ACCESS: members\nGO_TYPE: community\nBring your current challenge.",
      start: { dateTime: "2026-09-01T18:00:00+02:00" },
      end: { dateTime: "2026-09-01T19:30:00+02:00" },
      htmlLink: "https://calendar.google.com/calendar/event?eid=private",
      conferenceData: {
        entryPoints: [
          {
            entryPointType: "video",
            uri: "https://meet.google.com/abc-defg-hij",
          },
        ],
      },
    }
  );

  assert.equal(event.access, "members");
  assert.equal(event.category, "community");
  assert.equal(event.subject, "GO Community Meeting");
  assert.equal(event.seriesId, "community-meeting-series");
  assert.equal(event.format, "Google Meet");
  assert.equal(event.durationMinutes, 90);
  assert.equal(event.hasJoinLink, true);
  assert.equal(event.joinAvailable, false);
  assert.equal("joinUrl" in event, false);
  assert.equal(event.htmlLink, null);
  assert.doesNotMatch(event.description, /GO_ACCESS|GO_TYPE/);
});

test("only accepts Google Meet video entry points", () => {
  assert.equal(
    getVideoJoinUrl({
      conferenceData: {
        entryPoints: [
          { entryPointType: "phone", uri: "tel:+123456" },
          { entryPointType: "video", uri: "https://meet.google.com/abc-defg-hij" },
        ],
      },
    }),
    "https://meet.google.com/abc-defg-hij"
  );

  assert.equal(
    getVideoJoinUrl({ hangoutLink: "https://example.com/not-google-meet" }),
    null
  );
});

test("normalizes location and presentation details for physical events", () => {
  const event = normalizeCalendarEvent({
    id: "workshop-1",
    summary: "Playable Prototype Workshop",
    description: "Bring your current build.",
    location: "GOHQ, Skopje",
    start: { dateTime: "2026-09-02T17:00:00+02:00" },
    end: { dateTime: "2026-09-02T19:00:00+02:00" },
  });

  assert.equal(event.subject, "Playable Prototype Workshop");
  assert.equal(event.location, "GOHQ, Skopje");
  assert.equal(event.format, "In person");
  assert.equal(event.durationMinutes, 120);
});

test("collapses recurring instances while preserving unique events", () => {
  const events = getUniqueEventSeries([
    { id: "meeting-1", seriesId: "meeting-series", title: "GO Community Meeting" },
    { id: "meeting-2", seriesId: "meeting-series", title: "GO Community Meeting" },
    { id: "exhibition-1", seriesId: null, title: "Opening Exhibition" },
  ]);

  assert.equal(events.length, 2);
  assert.equal(events[0].id, "meeting-1");
  assert.equal(events[0].occurrenceCount, 2);
  assert.equal(events[1].id, "exhibition-1");
  assert.equal(events[1].occurrenceCount, 1);
});
