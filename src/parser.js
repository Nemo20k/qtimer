function error(message) {
  return { ok: false, message };
}

export function parseTimerUrl(search = "") {
  const parameters = new URLSearchParams(search);
  const rawSteps = parameters.getAll("step");

  if (rawSteps.length === 0) {
    return error("This URL must contain at least one step parameter.");
  }

  const steps = [];

  for (const [index, rawStep] of rawSteps.entries()) {
    const firstSeparator = rawStep.indexOf(":");
    const secondSeparator = firstSeparator === -1
      ? -1
      : rawStep.indexOf(":", firstSeparator + 1);

    if (firstSeparator <= 0 || secondSeparator <= firstSeparator + 1) {
      return error(`Step ${index + 1} must use the format type:value:label.`);
    }

    const type = rawStep.slice(0, firstSeparator);
    const rawValue = rawStep.slice(firstSeparator + 1, secondSeparator);
    const label = rawStep.slice(secondSeparator + 1);

    if (type !== "time" && type !== "reps") {
      return error(`Step ${index + 1} has an unknown type. Use time or reps.`);
    }

    const value = Number(rawValue);
    if (rawValue.trim() === "" || !Number.isFinite(value)) {
      return error(`Step ${index + 1} has an invalid numeric value.`);
    }

    if (value <= 0) {
      return error(`Step ${index + 1} must have a value greater than zero.`);
    }

    if (type === "reps" && !Number.isInteger(value)) {
      return error(`Step ${index + 1} must use a whole number of reps.`);
    }

    if (label.trim() === "") {
      return error(`Step ${index + 1} must include a label.`);
    }

    steps.push({ type, value, label });
  }

  return {
    ok: true,
    title: parameters.get("title") ?? "",
    steps,
  };
}
