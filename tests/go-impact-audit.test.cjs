const test = require("node:test");
const assert = require("node:assert/strict");
const { auditCalendar, auditJira } = require("../scripts/audit-go-impact.cjs");
const event = (overrides = {}) => ({ id: "meeting", summary: "GO Weekly Community Meetings", status: "confirmed", start: "2025-02-01T10:00:00+01:00", end: "2025-02-01T11:00:00+01:00", ...overrides });
const calendar = (key, events) => ({ key, events, complete: true });
test("deduplicates cross-calendar invitations but retains recurring occurrences", () => {
  const first = event();
  const second = event({ id: "meeting-2", start: "2025-02-08T10:00:00+01:00", end: "2025-02-08T11:00:00+01:00" });
  const result = auditCalendar([calendar("core", [first, second]), calendar("meetings", [first])]);
  assert.equal(result.categories.meeting, 2);
  assert.equal(result.duplicateCopies, 1);
});
test("excludes reminders, office blocks, declines and ambiguous entries", () => {
  const entries = ["Office", "Membership Fee Reminder", "Ivan", "Modeling practice"].map((summary, i) => event({ id: `block-${i}`, summary }));
  entries.push(event({ id: "declined", my_response_status: "declined" }));
  const result = auditCalendar([calendar("core", entries)]);
  assert.equal(result.categories.meeting || 0, 0);
  assert.equal(result.categories.non_meeting, 2);
  assert.equal(result.categories.needs_review, 2);
  assert.equal(result.categories.declined, 1);
});
test("rejects incomplete pagination", () => {
  assert.throws(() => auditCalendar([{ key: "core", events: [], complete: false }]), /pagination/);
});
test("counts resolved work items separately from epics and missing dates", () => {
  const row = (key, type, date) => {
    const values = []; values[1] = key; values[3] = type; values[4] = "Done"; values[12] = "Done"; values[22] = date; return values;
  };
  const task = row("GO-1", "Task", "17/Oct/23 12:00 PM");
  const result = auditJira([task, task, row("GO-2", "Epic", "01/Jan/24 1:00 PM"), row("GO-3", "Story", "16/Oct/23 1:00 PM"), row("GO-4", "Task", null)]);
  assert.equal(result.completedWorkItems, 1);
  assert.equal(result.completedEpics, 1);
  assert.equal(result.doneItemsInWindow, 2);
  assert.equal(result.missingResolutionDates, 1);
});
