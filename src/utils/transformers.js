export function addValueToObjects(events) {
  return events.map((event) => {
    return { ...event, value: event.label.toLowerCase() };
  });
}

export function getAvatarShortcut(username) {
  if (!username) return "AA";
  const words = username.split(" ");
  let shortcut = "";

  if (words.length === 1) {
    // If there's only one word, return the first letter
    shortcut = words[0][0].toUpperCase();
  } else {
    // If there are two or more words, concatenate the initials
    for (let i = 0; i < words.length; i++) {
      shortcut += words[i][0].toUpperCase();
    }
  }

  return shortcut;
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
