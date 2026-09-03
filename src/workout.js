import { parseTimerUrl } from "./parser.js";

export const WORKOUT_LIMITS = {
  maxSteps: 200,
  maxTitleLength: 100,
  maxLabelLength: 200,
  maxTimeSeconds: 24 * 60 * 60,
  maxReps: 10000,
};

const UNIT_TO_TYPE = { s: "time", m: "time", x: "reps" };

export function validateWorkout(workout) {
  if (typeof workout.title !== "string") return "Workout title must be text.";
  if (workout.title.length > WORKOUT_LIMITS.maxTitleLength) return `Workout title is too long (maximum ${WORKOUT_LIMITS.maxTitleLength} characters).`;
  if (!Array.isArray(workout.steps) || workout.steps.length === 0) return "Add at least one workout step.";
  if (workout.steps.length > WORKOUT_LIMITS.maxSteps) return `A workout can contain at most ${WORKOUT_LIMITS.maxSteps} steps.`;

  for (const [index, step] of workout.steps.entries()) {
    if (!Number.isInteger(step.value) || step.value <= 0) return `Step ${index + 1}: amount must be a positive whole number.`;
    if (step.type !== "time" && step.type !== "reps") return `Step ${index + 1}: choose seconds, minutes, or reps.`;
    if (typeof step.label !== "string" || step.label.trim() === "") return `Step ${index + 1}: add a label.`;
    if (step.label.length > WORKOUT_LIMITS.maxLabelLength) return `Step ${index + 1}: label is too long (maximum ${WORKOUT_LIMITS.maxLabelLength} characters).`;
    const timeSeconds = step.unit === "minutes" ? step.value * 60 : step.value;
    if (step.type === "time" && timeSeconds > WORKOUT_LIMITS.maxTimeSeconds) return `Step ${index + 1}: duration cannot exceed 24 hours.`;
    if (step.type === "reps" && step.value > WORKOUT_LIMITS.maxReps) return `Step ${index + 1}: reps cannot exceed ${WORKOUT_LIMITS.maxReps}.`;
  }
  return null;
}

export function serializeWorkout(workout, baseUrl = window.location.origin + window.location.pathname) {
  const validationError = validateWorkout(workout);
  if (validationError) return { ok: false, message: validationError };
  const params = new URLSearchParams();
  if (workout.title.trim()) params.set("title", workout.title.trim());
  for (const step of workout.steps) {
    const suffix = step.type === "reps" ? "x" : step.unit === "minutes" ? "m" : "s";
    params.append(`${step.value}${suffix}`, step.label.trim());
  }
  return { ok: true, url: `${baseUrl}?${params.toString()}` };
}

export function modelFromBuilderRows(title, rows) {
  return {
    title,
    steps: rows.map((row) => ({
      type: UNIT_TO_TYPE[row.unit],
      unit: row.unit === "m" ? "minutes" : "seconds",
      value: row.amount === "" ? NaN : Number(row.amount),
      label: row.label,
    })),
  };
}

export function roundTripWorkout(url) {
  return parseTimerUrl(new URL(url).search);
}
