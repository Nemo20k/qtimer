import test from "node:test";
import assert from "node:assert/strict";
import { calculateWorkoutTotals, formatDuration, workoutSummary } from "../src/workout-totals.js";

test("calculates a fully timed workout total", () => {
  const totals = calculateWorkoutTotals([
    { type: "time", value: 60, label: "Warm-up" },
    { type: "time", value: 240, label: "Work" },
  ]);
  assert.deepEqual(totals, {
    stepCount: 2,
    timedStepCount: 2,
    repetitionStepCount: 0,
    timedSeconds: 300,
    repetitionCount: 0,
    kind: "timed",
    hasKnownTotalDuration: true,
  });
  assert.equal(workoutSummary([{ type: "time", value: 60, label: "Work" }]).text, "1 step · 1:00 total");
});

test("distinguishes mixed and repetition-only workouts", () => {
  const mixed = workoutSummary([
    { type: "time", value: 240, label: "Work" },
    { type: "reps", value: 90, label: "Squats" },
  ]);
  assert.equal(mixed.text, "2 steps · 4:00 timed + 90 reps");
  assert.equal(mixed.variesByPace, true);
  assert.equal(mixed.totals.hasKnownTotalDuration, false);

  const repetitions = workoutSummary([{ type: "reps", value: 1, label: "Push-up" }]);
  assert.equal(repetitions.text, "1 step · 1 rep");
  assert.equal(repetitions.totals.hasKnownTotalDuration, false);
});

test("formats long durations and ignores empty data", () => {
  assert.equal(formatDuration(3900), "1:05:00");
  assert.equal(workoutSummary([]), null);
  assert.equal(workoutSummary([{ type: "time", value: NaN, label: "Work" }]), null);
});
