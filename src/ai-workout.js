import { trackEvent, workoutParameters } from "./analytics.js";
import { modelFromBuilderRows, serializeWorkout } from "./workout.js";

export function builderRowsFromWorkout(workout) {
  return workout.steps.map((step) => {
    if (step.type === "reps") {
      return { amount: String(step.reps ?? step.value), unit: "x", label: step.label };
    }

    if (step.unit === "minutes") {
      return { amount: String(step.amount ?? step.value / 60), unit: "m", label: step.label };
    }

    return { amount: String(step.seconds ?? step.value), unit: "s", label: step.label };
  });
}

export function normalizeGeneratedWorkout(response, baseUrl) {
  if (response?.result !== "workout") return { ok: false, message: "The generator did not return a workout." };
  const rows = builderRowsFromWorkout(response.workout);
  const model = modelFromBuilderRows(response.workout.title, rows);
  const serialized = serializeWorkout(model, baseUrl);
  if (!serialized.ok) return serialized;
  return {
    ok: true,
    response: {
      ...response,
      workout: {
        title: model.title.trim(),
        steps: response.workout.steps.map((step) => ({ ...step, label: step.label.trim() })),
      },
      url: serialized.url,
    },
  };
}

export function workoutStepsForAnalytics(workout) {
  return workout.steps.map((step) => ({
    type: step.type,
    value: step.type === "time" ? step.seconds : step.reps,
    label: step.label,
  }));
}

export function startGeneratedWorkout(response, { assign, track = trackEvent } = {}) {
  track("ai_workout_started", workoutParameters(workoutStepsForAnalytics(response.workout)));
  assign(response.url);
}

export async function copyGeneratedWorkout(response, copy, track = trackEvent) {
  await copy(response.url);
  track("ai_workout_copied");
}
