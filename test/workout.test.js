import test from "node:test";
import assert from "node:assert/strict";
import { modelFromBuilderRows, serializeWorkout } from "../src/workout.js";
import { parseTimerUrl } from "../src/parser.js";

test("serializes canonical steps in order, including duplicate keys", () => {
  const workout = modelFromBuilderRows("Quick Strength", [
    { amount: "30", unit: "s", label: "Push-ups" },
    { amount: "10", unit: "s", label: "Rest" },
    { amount: "30", unit: "s", label: "Push-ups" },
    { amount: "2", unit: "m", label: "Rest: easy" },
    { amount: "8", unit: "x", label: "Squats" },
  ]);
  const result = serializeWorkout(workout, "https://qtimer.io/");
  assert.equal(result.ok, true);
  assert.equal(result.url, "https://qtimer.io/?title=Quick+Strength&30s=Push-ups&10s=Rest&30s=Push-ups&2m=Rest%3A+easy&8x=Squats");
  assert.deepEqual(parseTimerUrl(new URL(result.url).search).steps, [
    { type: "time", value: 30, label: "Push-ups" },
    { type: "time", value: 10, label: "Rest" },
    { type: "time", value: 30, label: "Push-ups" },
    { type: "time", value: 120, label: "Rest: easy" },
    { type: "reps", value: 8, label: "Squats" },
  ]);
});

test("rejects invalid builder values", () => {
  assert.match(serializeWorkout({ title: "", steps: [{ type: "time", unit: "seconds", value: 0, label: "Work" }] }, "https://qtimer.io/").message, /positive/);
  assert.match(serializeWorkout({ title: "", steps: [{ type: "time", unit: "seconds", value: 10, label: "" }] }, "https://qtimer.io/").message, /label/);
  assert.match(serializeWorkout({ title: "", steps: [{ type: "other", value: 10, label: "Work" }] }, "https://qtimer.io/").message, /seconds/);
});
