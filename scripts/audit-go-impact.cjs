// Offline audit only. Keep connector exports in ignored tmp/kpi/, never public/.
const fs = require("node:fs");
const path = require("node:path");

const WINDOW = {
  start: "2023-10-17T00:00:00+02:00",
  endExclusive: "2026-10-17T00:00:00+02:00",
  timezone: "Europe/Warsaw",
};
const MEETING = /\b(meetings?|meetup|meet up|meet with|sync|stand.up|sprint planning|retrospective|retro|mentorship|mentoring|consultation|interview|kick.?off|sostanok|pdr|catch.up|call|coordination|discussion|101)\b|состанок|седница|собрание|visit gohq/i;
const NON_MEETING = /remind|prepping|prepare|birthday|b-day|\bbusy\b|available|\booo\b|membership fee|^office$|^go virtual office|check availability|slot for schedule/i;
const normalize = (value) => String(value || "").normalize("NFKC").toLowerCase().trim().replace(/\s+/g, " ");
const tally = (values) => values.reduce((counts, value) => {
  counts[value] = (counts[value] || 0) + 1;
  return counts;
}, {});

function auditCalendar(calendars, window = WINDOW) {
  if (calendars.some((calendar) => calendar.complete !== true)) {
    throw new Error("Finish calendar pagination before counting.");
  }
  const groups = [];
  const identities = new Map();
  const slots = new Map();
  for (const calendar of calendars) {
    for (const event of calendar.events) {
      const identity = `${event.id}|${event.original_start_time || event.start}`;
      const slot = `${normalize(event.summary)}|${Date.parse(event.start)}|${Date.parse(event.end)}`;
      const matchingSlot = (slots.get(slot) || []).find((index) =>
        !groups[index].some((item) => item.calendar === calendar.key)
      );
      const index = identities.get(identity) ?? matchingSlot;
      const item = { ...event, calendar: calendar.key };
      if (index !== undefined) {
        groups[index].push(item);
        identities.set(identity, index);
      } else {
        const next = groups.length;
        identities.set(identity, next);
        slots.set(slot, [...(slots.get(slot) || []), next]);
        groups.push([item]);
      }
    }
  }
  const start = Date.parse(window.start);
  const end = Date.parse(window.endExclusive);
  const classified = groups.map((copies) => {
    const event = copies.find((item) => item.calendar === "meetings") || copies[0];
    let category = "needs_review";
    if (copies.some((item) => item.status === "cancelled")) category = "cancelled";
    else if (copies.some((item) => item.my_response_status === "declined")) category = "declined";
    else if (!/(Z|[+-]\d{2}:\d{2})$/.test(event.start || "") || !/(Z|[+-]\d{2}:\d{2})$/.test(event.end || "")) category = "all_day_or_undated";
    else if (!Number.isFinite(Date.parse(event.start)) || !Number.isFinite(Date.parse(event.end))) category = "all_day_or_undated";
    else if (Date.parse(event.start) < start || Date.parse(event.end) > end || Date.parse(event.start) >= end) category = "outside_window";
    else if (event.status !== "confirmed") category = "unconfirmed";
    else if (NON_MEETING.test(event.summary)) category = "non_meeting";
    else if (MEETING.test(event.summary)) category = "meeting";
    return { ...event, category, copies: copies.length };
  });
  const meetings = classified.filter((event) => event.category === "meeting");
  return {
    rawRecords: calendars.reduce((sum, calendar) => sum + calendar.events.length, 0),
    uniqueRecords: classified.length,
    duplicateCopies: classified.reduce((sum, event) => sum + event.copies - 1, 0),
    categories: tally(classified.map((event) => event.category)),
    meetingsByYear: tally(meetings.map((event) => event.start.slice(0, 4))),
    meetingResponseStatuses: tally(meetings.map((event) => event.my_response_status || "not_recorded")),
    recurringMeetings: meetings.filter((event) => event.recurring_event_id).length,
    // Private audit rows are deliberately separate from the public summary.
    review: classified.map(({ id, summary, start, end, category, calendar, copies }) => ({ id, summary, start, end, category, calendar, copies })),
  };
}

function jiraDate(value) {
  const match = String(value || "").match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{2})\b/);
  if (!match) return null;
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(match[2]) + 1;
  return month ? `20${match[3]}-${String(month).padStart(2, "0")}-${match[1].padStart(2, "0")}` : null;
}

function auditJira(rows, window = WINDOW) {
  const unique = [...new Map(rows.map((row) => [row[1], row])).values()];
  const done = unique.filter((row) => row[1] && row[4] === "Done" && row[12] === "Done");
  const inWindow = done.filter((row) => {
    const resolved = jiraDate(row[22]);
    return resolved && resolved >= window.start.slice(0, 10) && resolved < window.endExclusive.slice(0, 10);
  });
  const workItems = inWindow.filter((row) => ["Task", "Story", "Subtask"].includes(row[3]));
  return {
    archivedDoneItems: done.length,
    doneItemsInWindow: inWindow.length,
    completedWorkItems: workItems.length,
    completedEpics: inWindow.filter((row) => row[3] === "Epic").length,
    workItemTypes: tally(workItems.map((row) => row[3])),
    resolvedByYear: tally(workItems.map((row) => jiraDate(row[22]).slice(0, 4))),
    missingResolutionDates: done.filter((row) => !jiraDate(row[22])).length,
  };
}

if (require.main === module) {
  const directory = process.argv[2];
  if (!directory) throw new Error("Usage: node scripts/audit-go-impact.cjs <private export directory>");
  const read = (name) => JSON.parse(fs.readFileSync(path.join(directory, name), "utf8").replace(/^\uFEFF/, ""));
  const calendar = auditCalendar(read("calendar-snapshot.json").calendars);
  const jira = auditJira(read("jira-snapshot.json").january);
  const projects = read("public-projects.json");
  if (projects.hasMore !== false) throw new Error("Finish public project pagination before counting.");
  const uniqueProjects = [...new Map(projects.projects.map((project) => [project.id, project])).values()];
  const { review, ...calendarSummary } = calendar;
  const summary = {
    window: WINDOW,
    calendar: calendarSummary,
    jira,
    publicProjects: { count: uniqueProjects.length, statuses: tally(uniqueProjects.map((project) => project.status)) },
  };
  fs.writeFileSync(path.join(directory, "audit-summary.json"), JSON.stringify(summary, null, 2) + "\n");
  fs.writeFileSync(path.join(directory, "calendar-review.private.json"), JSON.stringify(review, null, 2) + "\n");
  console.log(JSON.stringify(summary, null, 2));
}

module.exports = { auditCalendar, auditJira, jiraDate };
