export function getRelativeTime(timestamp) {
  const currentDate = new Date();
  const inputDate = new Date(timestamp);
  const timeDifference = currentDate - inputDate;

  const seconds = Math.floor(timeDifference / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(weeks / 4);

  if (months > 0) {
    return `${months} month${months > 1 ? "s" : ""} ago`;
  } else if (weeks > 0) {
    return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  } else if (days > 0) {
    return `${days} day${days > 1 ? "s" : ""} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  } else if (seconds > 0) {
    return `${seconds} second${seconds > 1 ? "s" : ""} ago`;
  } else {
    return "Just now";
  }
}

export function getDateTime(timestamp) {
  const date = new Date(timestamp);
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const day = date.getDate().toString();
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();

  return `${day} ${month}, ${year}`;
}

export function getDateTimeDay(timestamp) {
  const date = new Date(timestamp);
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  const formattedDate = date.toLocaleDateString(undefined, options);

  return formattedDate;
}

export function formatSeconds(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  const formattedHours = hours.toString().padStart(2, "0");
  const formattedMinutes = minutes.toString().padStart(2, "0");
  const formattedSeconds = remainingSeconds.toString().padStart(2, "0");

  return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
}

export function formatSecondsToHumanReadable(seconds, showSeconds = true) {
  if (seconds < 60) {
    return `${Math.round(seconds)} sec`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return showSeconds
      ? `${minutes} min ${remainingSeconds} sec`
      : `${minutes} min`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const remainingMinutes = Math.round((seconds % 3600) / 60);
    // If rounding the minutes exceeds 60, adjust hours and minutes accordingly
    const adjustedHours = remainingMinutes >= 60 ? hours + 1 : hours;
    const adjustedMinutes = remainingMinutes >= 60 ? 0 : remainingMinutes;

    const formattedHours = `${adjustedHours} hr`;
    const formattedMinutes = `${adjustedMinutes} min`;

    const timeParts = [formattedHours];
    if (adjustedMinutes > 0 || (!showSeconds && seconds >= 3600)) {
      timeParts.push(formattedMinutes);
    }
    if (showSeconds && seconds < 3600) {
      const remainingSeconds = Math.round(seconds % 60);
      if (remainingSeconds > 0) {
        const formattedSeconds = `${remainingSeconds} sec`;
        timeParts.push(formattedSeconds);
      }
    }

    return timeParts.join(" ");
  }
}

export function formatTimeRange(startMs, endMs) {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedHours = (hours % 12 || 12).toString().padStart(2, "0");
    const formattedMinutes = minutes.toString().padStart(2, "0");
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  };

  const startTime = formatTime(startMs);
  const endTime = formatTime(endMs);

  return `${startTime} - ${endTime}`;
}

export function shouldShowToday(days) {
  const today = new Date().toLocaleString("en-US", { weekday: "long" });
  return days?.includes(today);
}

export function getPeriodEndDate(frequency, lastCompletedDate) {
  const endDate = new Date(lastCompletedDate);

  switch (frequency) {
    case "everyday":
      endDate.setDate(endDate.getDate() + 1);
      break;
    case "everyweek":
      endDate.setDate(endDate.getDate() + 7 - endDate.getDay());
      break;
    case "everymonth":
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0); // Last day of the current month
      break;
    case "everyyear":
      endDate.setFullYear(endDate.getFullYear() + 1);
      endDate.setMonth(0); // Set to January
      endDate.setDate(0); // Last day of December
      break;
    default:
      throw new Error("Unknown frequency");
  }

  return endDate;
}

//Pathways
export function shouldResetProgress(frequency, lastCompletedDate) {
  const currentDate = new Date();
  const periodEndDate = getPeriodEndDate(
    frequency,
    new Date(lastCompletedDate)
  );

  return currentDate >= periodEndDate;
}
