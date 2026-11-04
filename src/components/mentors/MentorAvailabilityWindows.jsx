const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function windowLabel(window) {
  const day = dayNames[Number(window?.dayOfWeek)] || "Flexible day";
  const start = window?.startTime || "";
  const end = window?.endTime || "";
  const formats = Array.isArray(window?.formats) && window.formats.length
    ? ` · ${window.formats.join(", ")}`
    : "";
  return `${day}: ${start}–${end}${formats}`;
}

export function MentorAvailabilityWindows({ windows = [], timeZone = "", compact = false }) {
  const labels = (Array.isArray(windows) ? windows : []).map(windowLabel).filter(Boolean);
  if (compact) {
    return (
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Mentorship hours:</span>{" "}
        {labels.length ? `${labels.join(" · ")} (${timeZone || "mentor local time"})` : "To be arranged after GO review"}
      </p>
    );
  }

  return (
    <div className="rounded-md border bg-muted/20 p-3 text-sm">
      <p className="font-medium">Public mentorship hours</p>
      <p className="mt-1 text-xs text-muted-foreground">Recurring windows shown in {timeZone || "the mentor's local time"}.</p>
      {labels.length ? <ul className="mt-2 space-y-1 text-muted-foreground">{labels.map((label) => <li key={label}>{label}</li>)}</ul> : <p className="mt-2 text-muted-foreground">The mentor has not published recurring hours yet. Exact sessions are arranged after GO review.</p>}
    </div>
  );
}
