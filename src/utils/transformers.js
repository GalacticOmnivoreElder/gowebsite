export function addValueToObjects(events) {
  return events.map((event) => {
    return { ...event, value: event.label.toLowerCase() };
  });
}

export function getAvatarShortcut(username) {
  if (typeof username !== "string") return "AA";

  const words = username.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "AA";

  return words.map((word) => word.charAt(0).toUpperCase()).join("");
}

export function formatTimeFromSteps(steps) {
  const totalSeconds = steps.reduce((acc, step) => acc + Number(step.timer), 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.ceil((totalSeconds % 3600) / 60);

  let formattedTime = "";
  if (hours > 0) {
    formattedTime += `${hours}h `;
  }
  if (minutes > 0) {
    formattedTime += `${minutes}min`;
  }
  return formattedTime.trim();
}
