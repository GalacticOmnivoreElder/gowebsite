"use client";

import { DEFAULT_TIME_ZONE, TIME_ZONE_OPTIONS, normalizeTimeZone } from "@/lib/timezones";

export function TimeZoneSelect({
  id,
  label = "Time zone",
  value,
  onChange,
  help = "Choose the city or region where you usually are. We use this for scheduling and show times in your local zone.",
  required = false,
  className = "",
}) {
  const selected = normalizeTimeZone(value, DEFAULT_TIME_ZONE);

  return (
    <label className={`block space-y-1 text-sm ${className}`}>
      <span className="font-medium">{label}{required ? " *" : ""}</span>
      <select
        id={id}
        className="w-full rounded-md border bg-background px-3 py-2"
        value={selected}
        onChange={(event) => onChange(event.target.value)}
        required={required}
      >
        {TIME_ZONE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {help ? <span className="block text-xs text-muted-foreground">{help}</span> : null}
    </label>
  );
}
