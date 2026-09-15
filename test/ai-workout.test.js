import test from "node:test";
import assert from "node:assert/strict";
import { hasMeaningfulManualEdits } from "../src/builder.js";
import { builderRowsFromWorkout, copyGeneratedWorkout, normalizeGeneratedWorkout, startGeneratedWorkout, workoutStepsForAnalytics } from "../src/ai-workout.js";
import { parseTimerUrl } from "../src/parser.js";

const response = {
  result: "workout",
  mode: "generated",
  workout: { title: "Generated", steps: [{ type: "time", seconds: 30, label: "Work" }, { type: "reps", reps: 8, label: "Squats" }] },
  warnings: [],
  url: "https://qtimer.app/?title=Generated&30s=Work&8x=Squats",
};

test("maps generated steps into the existing builder row model", () => {
  assert.deepEqual(builderRowsFromWorkout(response.workout), [
    { amount: "30", unit: "s", label: "Work" },
    { amount: "8", unit: "x", label: "Squats" },
  ]);
  assert.deepEqual(workoutStepsForAnalytics(response.workout), [
    { type: "time", value: 30, label: "Work" },
    { type: "reps", value: 8, label: "Squats" },
  ]);
});

test("maps a runner workout back to its authored minutes and reps", () => {
  const parsed = parseTimerUrl("?title=Mixed&5m=Warm-up&90s=Work&8x=Squats");
  assert.equal(parsed.ok, true);
  assert.deepEqual(builderRowsFromWorkout(parsed), [
    { amount: "5", unit: "m", label: "Warm-up" },
    { amount: "90", unit: "s", label: "Work" },
    { amount: "8", unit: "x", label: "Squats" },
  ]);
});

test("normalizes generated workouts through the existing URL serializer", () => {
  const result = normalizeGeneratedWorkout({ ...response, workout: { title: " Generated ", steps: response.workout.steps.map((step) => ({ ...step, label: ` ${step.label} ` })) } }, "https://qtimer.app/");
  assert.equal(result.ok, true);
  assert.equal(result.response.url, "https://qtimer.app/?title=Generated&30s=Work&8x=Squats");
  assert.deepEqual(result.response.workout.steps, response.workout.steps);
  assert.equal(normalizeGeneratedWorkout({ ...response, workout: { title: "x".repeat(101), steps: response.workout.steps } }, "https://qtimer.app/").ok, false);
});

test("distinguishes untouched defaults from meaningful manual edits", () => {
  const rows = [{ amount: "30", unit: "s", label: "Work" }];
  const baseline = JSON.stringify({ title: "", rows });
  assert.equal(hasMeaningfulManualEdits("", rows, baseline), false);
  assert.equal(hasMeaningfulManualEdits("My workout", rows, baseline), true);
  assert.equal(hasMeaningfulManualEdits("", [{ ...rows[0], amount: "45" }], baseline), true);
});

test("starts the returned workout URL and copies it without prompt data", async () => {
  const events = [];
  let startedUrl;
  startGeneratedWorkout(response, { assign: (url) => { startedUrl = url; }, track: (name, parameters) => events.push([name, parameters]) });
  let copiedUrl;
  await copyGeneratedWorkout(response, async (url) => { copiedUrl = url; }, (name, parameters) => events.push([name, parameters]));

  assert.equal(startedUrl, response.url);
  assert.equal(copiedUrl, response.url);
  assert.deepEqual(events.map(([name]) => name), ["ai_workout_started", "ai_workout_copied"]);
  assert.equal(JSON.stringify(events).includes("Create"), false);
});
