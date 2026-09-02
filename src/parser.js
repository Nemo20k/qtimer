const NEW_STEP_KEY = /^(\d+)(s|m|x)$/;
const MAX_STEPS = 200;
const MAX_LABEL_LENGTH = 200;
const MAX_TIME_SECONDS = 24 * 60 * 60;
const MAX_REPS = 10000;

function error(message) {
  return { ok: false, message };
}

function validateStep(type, value, label, index) {
  if (!label || label.trim() === "") return `Step ${index} must include a label.`;
  if (label.length > MAX_LABEL_LENGTH) return `Step ${index} label is too long (maximum ${MAX_LABEL_LENGTH} characters).`;
  if (!Number.isInteger(value) || value <= 0) return `Step ${index} must have a positive whole-number value.`;
  if (type === "time" && value > MAX_TIME_SECONDS) return `Step ${index} is too long (maximum duration is 24 hours).`;
  if (type === "reps" && value > MAX_REPS) return `Step ${index} has too many reps (maximum is ${MAX_REPS}).`;
  return null;
}

function parseNewStep(key, label, index) {
  const match = key.match(NEW_STEP_KEY);
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2];
  const type = unit === "x" ? "reps" : "time";
  const value = unit === "m" ? amount * 60 : amount;
  const validationError = validateStep(type, value, label, index);

  if (validationError) return { error: validationError };
  return { step: { type, value, label } };
}

function parseLegacySteps(parameters) {
  const rawSteps = parameters.getAll("step");
  if (rawSteps.length === 0) return null;

  const steps = [];
  for (const [index, rawStep] of rawSteps.entries()) {
    const firstSeparator = rawStep.indexOf(":");
    const secondSeparator = firstSeparator === -1 ? -1 : rawStep.indexOf(":", firstSeparator + 1);

    if (firstSeparator <= 0 || secondSeparator <= firstSeparator + 1) {
      return error(`Step ${index + 1} must use the format type:value:label.`);
    }

    const type = rawStep.slice(0, firstSeparator);
    const value = Number(rawStep.slice(firstSeparator + 1, secondSeparator));
    const label = rawStep.slice(secondSeparator + 1);

    if (type !== "time" && type !== "reps") return error(`Step ${index + 1} has an unknown type. Use time or reps.`);
    const validationError = validateStep(type, value, label, index + 1);
    if (validationError) return error(validationError);
    steps.push({ type, value, label });
  }

  if (steps.length > MAX_STEPS) return error(`A workout can contain at most ${MAX_STEPS} steps.`);
  return steps;
}

export function parseTimerUrl(search = "") {
  const parameters = new URLSearchParams(search);
  const newSteps = [];
  let invalidNewStepError = null;

  for (const [key, label] of parameters.entries()) {
    const parsedStep = parseNewStep(key, label, newSteps.length + 1);
    if (!parsedStep) continue;
    if (parsedStep.error) invalidNewStepError ??= parsedStep.error;
    else newSteps.push(parsedStep.step);
  }

  let steps;
  if (newSteps.length > 0) {
    if (invalidNewStepError) return error(invalidNewStepError);
    if (newSteps.length > MAX_STEPS) return error(`A workout can contain at most ${MAX_STEPS} steps.`);
    steps = newSteps;
  } else {
    steps = parseLegacySteps(parameters);
    if (!steps) return error("This URL must contain at least one valid workout step.");
    if (!Array.isArray(steps)) return steps;
  }

  return { ok: true, title: parameters.get("title") ?? "", steps };
}
