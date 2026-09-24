// datetime-local contains wall time, not a timestamp. Convert in the chosen IANA zone.
export function courseLocalDate(value, timeZone) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
  const fields = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${fields.year}-${fields.month}-${fields.day}T${fields.hour}:${fields.minute}`;
}
export function courseUtcDate(local, timeZone) {
  if (!local) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) throw new Error("Enter a complete date and time");
  const wall = Date.parse(`${local}:00Z`);
  let instant = wall;
  for (let i = 0; i < 4; i++) {
    const projected = Date.parse(`${courseLocalDate(instant, timeZone)}:00Z`);
    instant += wall - projected;
  }
  if (courseLocalDate(instant, timeZone) !== local) throw new Error("This local time does not exist in the selected timezone");
  return new Date(instant).toISOString();
}
