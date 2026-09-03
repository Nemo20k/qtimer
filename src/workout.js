export const WORKOUT_LIMITS = {
  maxSteps: 200,
  maxTitleLength: 100,
  maxLabelLength: 200,
  maxTimeSeconds: 24 * 60 * 60,
  maxReps: 10000,
};

export function validateStep(type, value, label, index) {
  if (type !== "time" && type !== "reps") return `Step ${index} has an unknown type. Use seconds, minutes, or reps.`;
  if (!Number.isInteger(value) || value <= 0) return `Step ${index} must have a positive whole-number value.`;
  if (!label || label.trim() === "") return `Step ${index} must include a label.`;
  if (label.length > WORKOUT_LIMITS.maxLabelLength) return `Step ${index} label is too long (maximum ${WORKOUT_LIMITS.maxLabelLength} characters).`;
  const timeSeconds = type === "time" ? value : 0;
  if (timeSeconds > WORKOUT_LIMITS.maxTimeSeconds) return `Step ${index} is too long (maximum duration is 24 hours).`;
  if (type === "reps" && value > WORKOUT_LIMITS.maxReps) return `Step ${index} has too many reps (maximum is ${WORKOUT_LIMITS.maxReps}).`;
  return null;
}

export function validateWorkout(workout) {
  if (typeof workout.title !== "string") return "Workout title must be text.";
  if (workout.title.length > WORKOUT_LIMITS.maxTitleLength) return `Workout title is too long (maximum ${WORKOUT_LIMITS.maxTitleLength} characters).`;
  if (!Array.isArray(workout.steps) || workout.steps.length === 0) return "Add at least one workout step.";
  if (workout.steps.length > WORKOUT_LIMITS.maxSteps) return `A workout can contain at most ${WORKOUT_LIMITS.maxSteps} steps.`;

  for (const [index, step] of workout.steps.entries()) {
    const value = step.unit === "minutes" ? step.value * 60 : step.value;
    const stepError = validateStep(step.type, value, step.label, index + 1);
    if (stepError) return stepError;
  }
  return null;
}

export function serializeWorkout(workout, baseUrl) {
  const validationError = validateWorkout(workout);
  if (validationError) return { ok: false, message: validationError };
  const params = new URLSearchParams();
  if (workout.title.trim()) params.set("title", workout.title.trim());
  for (const step of workout.steps) {
    const suffix = step.type === "reps" ? "x" : step.unit === "minutes" ? "m" : "s";
    params.append(`${step.value}${suffix}`, step.label.trim());
  }
  return { ok: true, url: `${baseUrl ?? ""}?${params.toString()}` };
}

export function modelFromBuilderRows(title, rows) {
  return {
    title,
    steps: rows.map((row) => ({
      type: row.unit === "x" ? "reps" : "time",
      unit: row.unit === "m" ? "minutes" : "seconds",
      value: row.amount === "" ? NaN : Number(row.amount),
      label: row.label,
    })),
  };
}
