import test from "node:test";
import assert from "node:assert/strict";
import { parseTimerUrl } from "../src/parser.js";

test("parses repeated timed and rep steps in order", () => {
  const result = parseTimerUrl("?title=Push+Workout&step=reps:6:Push-ups&step=time:50:Rest&step=reps:6:Push-ups");

  assert.equal(result.ok, true);
  assert.equal(result.title, "Push Workout");
  assert.deepEqual(result.steps, [
    { type: "reps", value: 6, label: "Push-ups" },
    { type: "time", value: 50, label: "Rest" },
    { type: "reps", value: 6, label: "Push-ups" },
  ]);
});

test("preserves colons and decodes arbitrary label text", () => {
  const result = parseTimerUrl("?step=time:20:Kettlebell%20swings%3A%20fast%20round");

  assert.equal(result.ok, true);
  assert.equal(result.steps[0].label, "Kettlebell swings: fast round");
});

test("rejects missing steps", () => {
  const result = parseTimerUrl("?title=Missing");

  assert.equal(result.ok, false);
  assert.match(result.message, /at least one step/i);
});

test("rejects unknown type, malformed value, zero, and negative values", () => {
  assert.match(parseTimerUrl("?step=rounds:5:Work").message, /unknown type/i);
  assert.match(parseTimerUrl("?step=time:nope:Work").message, /invalid numeric/i);
  assert.match(parseTimerUrl("?step=reps:0:Push-ups").message, /greater than zero/i);
  assert.match(parseTimerUrl("?step=time:-5:Rest").message, /greater than zero/i);
});

test("rejects missing labels and fractional reps", () => {
  assert.match(parseTimerUrl("?step=time:20:").message, /label/i);
  assert.match(parseTimerUrl("?step=reps:2.5:Push-ups").message, /whole number/i);
});
