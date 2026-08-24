function decodeQueryComponent(value) {
  return decodeURIComponent(value.replace(/\+/g, " "));
}

function getRawParameter(search, parameterName) {
  const query = search.startsWith("?") ? search.slice(1) : search;

  for (const part of query.split("&")) {
    const separatorIndex = part.indexOf("=");
    const rawName = separatorIndex === -1 ? part : part.slice(0, separatorIndex);

    try {
      if (decodeQueryComponent(rawName) === parameterName) {
        return separatorIndex === -1 ? "" : part.slice(separatorIndex + 1);
      }
    } catch {
      // Ignore malformed unrelated query parameters.
    }
  }

  return null;
}

function error(message) {
  return { ok: false, message };
}

export function parseTimerUrl(search = "") {
  const rawTimers = getRawParameter(search, "timers");

  if (rawTimers === null) {
    return error("This URL is missing the required timers parameter.");
  }

  if (rawTimers.trim() === "") {
    return error("The timers parameter cannot be empty.");
  }

  const timers = [];

  for (const [index, rawEntry] of rawTimers.split(",").entries()) {
    const separatorIndex = rawEntry.indexOf(":");

    if (separatorIndex <= 0) {
      return error(`Timer ${index + 1} must use the format duration:label.`);
    }

    const rawDuration = rawEntry.slice(0, separatorIndex);
    const rawLabel = rawEntry.slice(separatorIndex + 1);
    const duration = Number(rawDuration);

    if (rawDuration.trim() === "" || !Number.isFinite(duration)) {
      return error(`Timer ${index + 1} has an invalid duration.`);
    }

    if (duration <= 0) {
      return error(`Timer ${index + 1} must have a duration greater than zero.`);
    }

    let label;
    try {
      label = decodeQueryComponent(rawLabel);
    } catch {
      return error(`Timer ${index + 1} has malformed URL-encoded label text.`);
    }

    timers.push({ duration, label });
  }

  let title = "";
  const rawTitle = getRawParameter(search, "title");
  if (rawTitle !== null) {
    try {
      title = decodeQueryComponent(rawTitle);
    } catch {
      return error("The title contains malformed URL-encoded text.");
    }
  }

  const totalDuration = timers.reduce((total, timer) => total + timer.duration, 0);
  return { ok: true, title, timers, totalDuration };
}
