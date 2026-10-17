// Import private Google Calendar iCalendar exports into the normalized snapshot
// consumed by audit-go-impact.cjs. Keep the generated snapshot in ignored tmp/.
const fs = require("node:fs");
const path = require("node:path");
const { WINDOW } = require("./audit-go-impact.cjs");

const WEEKDAYS = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
const dateFormatterCache = new Map();

function splitOutsideQuotes(value, delimiter) {
  const parts = [];
  let quoted = false;
  let escaped = false;
  let start = 0;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (character === '"') quoted = !quoted;
    else if (character === delimiter && !quoted) {
      parts.push(value.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(value.slice(start));
  return parts;
}

function parseContentLine(line) {
  let quoted = false;
  let escaped = false;
  let colon = -1;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (character === '"') quoted = !quoted;
    else if (character === ":" && !quoted) {
      colon = index;
      break;
    }
  }
  if (colon < 0) return null;
  const [rawName, ...rawParams] = splitOutsideQuotes(line.slice(0, colon), ";");
  const params = {};
  for (const rawParam of rawParams) {
    const equals = rawParam.indexOf("=");
    if (equals < 0) continue;
    params[rawParam.slice(0, equals).toUpperCase()] = rawParam
      .slice(equals + 1)
      .replace(/^"|"$/g, "");
  }
  return { name: rawName.toUpperCase(), params, value: line.slice(colon + 1) };
}

function parseIcsText(text) {
  const unfolded = text
    .replace(/^\uFEFF/, "")
    .replace(/\r?\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);
  const calendarProperties = {};
  const events = [];
  let current = null;
  let calendarDepth = 0;
  for (const line of lines) {
    if (line === "BEGIN:VCALENDAR") calendarDepth += 1;
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (current) events.push(current);
      current = null;
      continue;
    }
    const property = parseContentLine(line);
    if (!property) continue;
    if (current) (current[property.name] ||= []).push(property);
    else if (calendarDepth > 0) (calendarProperties[property.name] ||= []).push(property);
    if (line === "END:VCALENDAR") calendarDepth -= 1;
  }
  return { calendarProperties, events };
}

function first(event, key) {
  return event[key]?.[0];
}

function unescapeText(value) {
  return String(value || "")
    .replace(/\\[nN]/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function partsFromWall(wallMs) {
  const date = new Date(wallMs);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
  };
}

function formatterFor(timeZone) {
  if (!dateFormatterCache.has(timeZone)) {
    dateFormatterCache.set(timeZone, new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }));
  }
  return dateFormatterCache.get(timeZone);
}

function wallPartsAt(epochMs, timeZone) {
  const values = Object.fromEntries(formatterFor(timeZone)
    .formatToParts(new Date(epochMs))
    .filter((part) => part.type !== "literal")
    .map((part) => [part.type, Number(part.value)]));
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function wallToEpoch(wallMs, timeZone) {
  let guess = wallMs;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const parts = wallPartsAt(guess, timeZone);
    const represented = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const correction = wallMs - represented;
    if (correction === 0) return guess;
    guess += correction;
  }
  return guess;
}

function parseDateProperty(property, defaultTimeZone) {
  if (!property) return null;
  const value = property.value;
  const isDate = property.params.VALUE === "DATE" || /^\d{8}$/.test(value);
  const dateMatch = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!dateMatch) throw new Error(`Unsupported iCalendar date value: ${value}`);
  const [, year, month, day, hour = "00", minute = "00", second = "00", utcFlag] = dateMatch;
  const wallMs = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  const timeZone = utcFlag ? "UTC" : property.params.TZID || defaultTimeZone;
  const epochMs = utcFlag ? wallMs : wallToEpoch(wallMs, timeZone);
  return { epochMs, wallMs, timeZone, isDate };
}

function parseUntil(value, timeZone) {
  const property = { value, params: /^\d{8}$/.test(value) ? { VALUE: "DATE" } : {} };
  const parsed = parseDateProperty(property, timeZone);
  if (parsed.isDate) parsed.wallMs += 86_400_000 - 1;
  return parsed;
}

function parseRule(value) {
  return Object.fromEntries(value.split(";").map((segment) => {
    const equals = segment.indexOf("=");
    return [segment.slice(0, equals).toUpperCase(), segment.slice(equals + 1).toUpperCase()];
  }));
}

function weekdayOf(wallMs) {
  return new Date(wallMs).getUTCDay();
}

function localDate(year, month, day, startParts) {
  return Date.UTC(year, month - 1, day, startParts.hour, startParts.minute, startParts.second);
}

function weekdaysForRule(rule, startWallMs) {
  const tokens = rule.BYDAY ? rule.BYDAY.split(",") : [];
  return tokens.map((token) => {
    const match = token.match(/^([+-]?\d+)?(SU|MO|TU|WE|TH|FR|SA)$/);
    if (!match) throw new Error(`Unsupported BYDAY rule: ${token}`);
    return { ordinal: match[1] ? Number(match[1]) : null, day: WEEKDAYS[match[2]] };
  }).sort((a, b) => a.day - b.day || (a.ordinal || 0) - (b.ordinal || 0));
}

function nthWeekdayInMonth(year, month, day, ordinal) {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (ordinal > 0) {
    const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    const date = 1 + ((day - firstDay + 7) % 7) + (ordinal - 1) * 7;
    return date <= lastDay ? date : null;
  }
  const lastWeekday = new Date(Date.UTC(year, month - 1, lastDay)).getUTCDay();
  const date = lastDay - ((lastWeekday - day + 7) % 7) + (ordinal + 1) * 7;
  return date >= 1 ? date : null;
}

function recurrenceWallDates(start, ruleProperty, maxEpochMs) {
  const rule = parseRule(ruleProperty.value);
  const frequency = rule.FREQ;
  if (!['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(frequency)) {
    throw new Error(`Unsupported recurrence frequency: ${frequency}`);
  }
  const interval = Math.max(1, Number(rule.INTERVAL || 1));
  const countLimit = rule.COUNT ? Number(rule.COUNT) : Infinity;
  const until = rule.UNTIL ? parseUntil(rule.UNTIL, start.timeZone) : null;
  const startParts = partsFromWall(start.wallMs);
  const startWeekday = weekdayOf(start.wallMs);
  const weekdays = weekdaysForRule(rule, start.wallMs);
  const weekdaySet = weekdays.length ? new Set(weekdays.map((item) => item.day)) : null;
  const result = [];
  const add = (wallMs) => {
    if (wallMs < start.wallMs) return false;
    const epochMs = start.isDate ? wallToEpoch(wallMs, start.timeZone) : wallToEpoch(wallMs, start.timeZone);
    if (until && (until.isDate ? wallMs > until.wallMs : epochMs > until.epochMs)) return false;
    if (epochMs >= maxEpochMs) return false;
    result.push(wallMs);
    return result.length < countLimit;
  };
  const stop = (wallMs) => {
    const epochMs = wallToEpoch(wallMs, start.timeZone);
    return epochMs >= maxEpochMs || (until && (until.isDate ? wallMs > until.wallMs : epochMs > until.epochMs));
  };

  if (frequency === "DAILY") {
    for (let day = 0; ; day += 1) {
      const wallMs = start.wallMs + day * 86_400_000;
      if (stop(wallMs)) break;
      if (day % interval !== 0 || (weekdaySet && !weekdaySet.has(weekdayOf(wallMs)))) continue;
      if (!add(wallMs)) break;
    }
  } else if (frequency === "WEEKLY") {
    const weekStartDay = WEEKDAYS[rule.WKST || "MO"];
    const startWeekWall = start.wallMs - ((startWeekday - weekStartDay + 7) % 7) * 86_400_000;
    const days = (weekdays.length ? weekdays.map((item) => item.day) : [startWeekday])
      .sort((a, b) => ((a - weekStartDay + 7) % 7) - ((b - weekStartDay + 7) % 7));
    for (let week = 0; ; week += 1) {
      const weekBase = startWeekWall + week * 7 * 86_400_000;
      if (stop(weekBase)) break;
      if (week % interval !== 0) continue;
      for (const weekday of days) {
        const offset = (weekday - weekStartDay + 7) % 7;
        const wallMs = weekBase + offset * 86_400_000;
        if (wallMs < start.wallMs) continue;
        if (stop(wallMs)) return result;
        if (!add(wallMs)) return result;
      }
    }
  } else if (frequency === "MONTHLY") {
    for (let step = 0; ; step += 1) {
      const monthIndex = startParts.year * 12 + startParts.month - 1 + step * interval;
      const year = Math.floor(monthIndex / 12);
      const month = monthIndex % 12 + 1;
      const monthWall = Date.UTC(year, month - 1, 1, startParts.hour, startParts.minute, startParts.second);
      if (stop(monthWall)) break;
      if (rule.BYMONTH && !rule.BYMONTH.split(",").map(Number).includes(month)) continue;
      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
      let days = [];
      if (weekdays.length) {
        for (const item of weekdays) {
          if (item.ordinal) {
            const day = nthWeekdayInMonth(year, month, item.day, item.ordinal);
            if (day) days.push(day);
          } else {
            for (let day = 1; day <= lastDay; day += 1) {
              if (weekdayOf(Date.UTC(year, month - 1, day)) === item.day) days.push(day);
            }
          }
        }
      } else if (rule.BYMONTHDAY) {
        days = rule.BYMONTHDAY.split(",").map(Number).map((day) => day > 0 ? day : lastDay + day + 1);
      } else {
        days = [startParts.day];
      }
      days = [...new Set(days)].filter((day) => day >= 1 && day <= lastDay).sort((a, b) => a - b);
      if (weekdays.length && rule.BYMONTHDAY) {
        days = days.filter((day) => rule.BYMONTHDAY.split(",").map(Number).some((monthDay) => (monthDay > 0 ? monthDay : lastDay + monthDay + 1) === day));
      }
      for (const day of days) {
        const wallMs = localDate(year, month, day, startParts);
        if (wallMs < start.wallMs) continue;
        if (stop(wallMs)) return result;
        if (!add(wallMs)) return result;
      }
    }
  } else {
    for (let step = 0; ; step += 1) {
      const year = startParts.year + step * interval;
      if (stop(Date.UTC(year, 0, 1, startParts.hour, startParts.minute, startParts.second))) break;
      const months = rule.BYMONTH ? rule.BYMONTH.split(",").map(Number) : [startParts.month];
      for (const month of months) {
        const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
        let days = rule.BYMONTHDAY
          ? rule.BYMONTHDAY.split(",").map(Number).map((day) => day > 0 ? day : lastDay + day + 1)
          : [startParts.day];
        if (weekdays.length) {
          const filtered = [];
          for (const day of days) {
            if (weekdays.some((item) => weekdayOf(Date.UTC(year, month - 1, day)) === item.day)) filtered.push(day);
          }
          days = filtered;
        }
        for (const day of [...new Set(days)].filter((value) => value > 0 && value <= lastDay).sort((a, b) => a - b)) {
          const wallMs = localDate(year, month, day, startParts);
          if (wallMs < start.wallMs) continue;
          if (stop(wallMs)) return result;
          if (!add(wallMs)) return result;
        }
      }
    }
  }
  return result;
}

function dateKey(value) {
  return `${value.wallMs}|${value.isDate ? "date" : "time"}`;
}

function durationWallMs(start, end) {
  return end && start ? end.wallMs - start.wallMs : 0;
}

function occurrenceEnd(start, durationMs) {
  const wallMs = start.wallMs + durationMs;
  return {
    wallMs,
    epochMs: wallToEpoch(wallMs, start.timeZone),
    timeZone: start.timeZone,
    isDate: start.isDate,
  };
}

function serializeDate(value) {
  return value.isDate ? new Date(value.wallMs).toISOString().slice(0, 10) : new Date(value.epochMs).toISOString();
}

function makeOccurrence(event, start, end, calendarKey, originalStart) {
  const uid = unescapeText(first(event, "UID")?.value || "");
  if (!uid) throw new Error("An iCalendar VEVENT has no UID.");
  const summary = unescapeText(first(event, "SUMMARY")?.value || "");
  const status = (first(event, "STATUS")?.value || "CONFIRMED").toLowerCase();
  const recurrenceId = first(event, "RECURRENCE-ID");
  return {
    id: uid,
    original_start_time: serializeDate(originalStart || start),
    recurring_event_id: recurrenceId || first(event, "RRULE") ? uid : undefined,
    summary,
    start: serializeDate(start),
    end: serializeDate(end),
    status,
    calendar: calendarKey,
  };
}

function expandCalendar(calendar, calendarKey, window = WINDOW) {
  const rangeStart = Date.parse(window.start);
  const rangeEnd = Date.parse(window.endExclusive);
  const defaultTimeZone = first(calendar.calendarProperties, "X-WR-TIMEZONE")?.value || "Europe/Warsaw";
  const events = calendar.events;
  const masters = events.filter((event) => !first(event, "RECURRENCE-ID"));
  const overrides = events.filter((event) => first(event, "RECURRENCE-ID"));
  const overrideMap = new Map();
  for (const event of overrides) {
    const uid = first(event, "UID")?.value;
    const recurrenceId = parseDateProperty(first(event, "RECURRENCE-ID"), defaultTimeZone);
    if (first(event, "RECURRENCE-ID").params.RANGE) {
      throw new Error("RECURRENCE-ID RANGE overrides are not supported by this importer.");
    }
    if (uid && recurrenceId) overrideMap.set(`${uid}|${dateKey(recurrenceId)}`, event);
  }
  const usedOverrides = new Set();
  const normalized = [];

  for (const event of masters) {
    const uid = first(event, "UID")?.value;
    const startProperty = first(event, "DTSTART");
    const start = parseDateProperty(startProperty, defaultTimeZone);
    if (!start || start.epochMs >= rangeEnd && !first(event, "RRULE")) continue;
    const end = parseDateProperty(first(event, "DTEND"), defaultTimeZone);
    const duration = durationWallMs(start, end);
    const rule = first(event, "RRULE");
    let candidates = rule ? recurrenceWallDates(start, rule, rangeEnd) : [start.wallMs];
    for (const property of event.EXDATE || []) {
      for (const value of property.value.split(",")) {
        const exceptionDate = parseDateProperty({ ...property, value }, defaultTimeZone);
        candidates = candidates.filter((wallMs) => wallMs !== exceptionDate.wallMs);
      }
    }
    for (const property of event.RDATE || []) {
      for (const value of property.value.split(",")) {
        const recurrenceDate = parseDateProperty({ ...property, value }, defaultTimeZone);
        candidates.push(recurrenceDate.wallMs);
      }
    }
    candidates = [...new Set(candidates)].sort((a, b) => a - b);
    for (const wallMs of candidates) {
      const baseStart = { ...start, wallMs, epochMs: wallToEpoch(wallMs, start.timeZone) };
      const key = `${uid}|${dateKey(baseStart)}`;
      const override = overrideMap.get(key);
      if (override) usedOverrides.add(override);
      const chosen = override || event;
      const chosenStart = override
        ? parseDateProperty(first(override, "DTSTART"), defaultTimeZone) || baseStart
        : baseStart;
      const chosenEndProperty = override ? first(override, "DTEND") : first(event, "DTEND");
      const chosenEnd = chosenEndProperty
        ? parseDateProperty(chosenEndProperty, defaultTimeZone)
        : occurrenceEnd(chosenStart, duration);
      if (chosenStart.epochMs < rangeStart || chosenStart.epochMs >= rangeEnd) continue;
      normalized.push(makeOccurrence(chosen, chosenStart, chosenEnd, calendarKey, baseStart));
    }
  }

  for (const event of overrides) {
    if (usedOverrides.has(event)) continue;
    const start = parseDateProperty(first(event, "DTSTART"), defaultTimeZone);
    if (!start || start.epochMs < rangeStart || start.epochMs >= rangeEnd) continue;
    const recurrenceId = parseDateProperty(first(event, "RECURRENCE-ID"), defaultTimeZone);
    const end = parseDateProperty(first(event, "DTEND"), defaultTimeZone) || occurrenceEnd(start, 0);
    normalized.push(makeOccurrence(event, start, end, calendarKey, recurrenceId || start));
  }
  return normalized;
}

function listIcsFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const child = path.join(directory, entry.name);
      return entry.isDirectory() ? listIcsFiles(child) : [child];
    })
    .filter((file) => file.toLowerCase().endsWith(".ics"))
    .sort((a, b) => a.localeCompare(b));
}

function importDirectory(inputDirectory, window = WINDOW) {
  const files = listIcsFiles(inputDirectory);
  if (!files.length) throw new Error(`No .ics files found under ${inputDirectory}`);
  let sourceEventComponents = 0;
  let recurringSeries = 0;
  let exceptionComponents = 0;
  let expandedOccurrencesInWindow = 0;
  const calendars = files.map((file, index) => {
    const source = parseIcsText(fs.readFileSync(file, "utf8"));
    sourceEventComponents += source.events.length;
    recurringSeries += source.events.filter((event) => first(event, "RRULE")).length;
    exceptionComponents += source.events.filter((event) => first(event, "RECURRENCE-ID")).length;
    const relative = path.relative(inputDirectory, file).split(path.sep).join("/");
    const key = relative.replace(/[^a-zA-Z0-9/_-]/g, "_");
    const calendarEvents = expandCalendar(source, key, window);
    expandedOccurrencesInWindow += calendarEvents.length;
    return { key, complete: true, events: calendarEvents, importOrder: index };
  });
  return {
    calendars,
    source: {
      format: "Google Calendar iCalendar (.ics) exports",
      sourceFiles: files.length,
      sourceEventComponents,
      recurringSeries,
      exceptionComponents,
      expandedOccurrencesInWindow,
      window,
    },
  };
}

if (require.main === module) {
  const inputDirectory = process.argv[2];
  const outputDirectory = process.argv[3] || path.join(process.cwd(), "tmp", "kpi");
  if (!inputDirectory) {
    throw new Error("Usage: node scripts/import-google-calendar-ics.cjs <extracted-ics-directory> [private-output-directory]");
  }
  const snapshot = importDirectory(path.resolve(inputDirectory));
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(path.join(outputDirectory, "calendar-snapshot.json"), `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(JSON.stringify(snapshot.source, null, 2));
}

module.exports = {
  expandCalendar,
  importDirectory,
  parseDateProperty,
  parseIcsText,
  recurrenceWallDates,
  wallToEpoch,
};
