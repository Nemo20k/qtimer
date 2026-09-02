import test from "node:test";
import assert from "node:assert/strict";
import { parseTimerUrl } from "../src/parser.js";

test("parses seconds, minutes, and reps", () => {
  const result = parseTimerUrl("?title=Quick+Workout&30s=Push-ups&2m=Rest&8x=Squats");

  assert.equal(result.ok, true);
  assert.equal(result.title, "Quick Workout");
  assert.deepEqual(result.steps, [
    { type: "time", value: 30, label: "Push-ups" },
    { type: "time", value: 120, label: "Rest" },
    { type: "reps", value: 8, label: "Squats" },
  ]);
});

test("preserves repeated keys and URL order", () => {
  const result = parseTimerUrl("?30s=Push-ups&10s=Rest&30s=Squats&10s=Rest&10s=Rest&10s=Rest");

  assert.equal(result.ok, true);
  assert.equal(result.steps.length, 6);
  assert.deepEqual(result.steps.map(({ value, label }) => [value, label]), [
    [30, "Push-ups"], [10, "Rest"], [30, "Squats"], [10, "Rest"], [10, "Rest"], [10, "Rest"],
  ]);
});

test("decodes labels containing spaces and colons", () => {
  const result = parseTimerUrl("?10x=Reverse%20lunges%3A%20alternating");

  assert.equal(result.ok, true);
  assert.equal(result.steps[0].label, "Reverse lunges: alternating");
});

test("ignores unknown metadata parameters", () => {
  const result = parseTimerUrl("?title=Test&theme=dark&30s=Work");

  assert.equal(result.ok, true);
  assert.equal(result.steps.length, 1);
});

test("rejects invalid new-format steps safely", () => {
  assert.equal(parseTimerUrl("?0s=Rest").ok, false);
  assert.equal(parseTimerUrl("?0x=Push-ups").ok, false);
  assert.equal(parseTimerUrl("?-5s=Rest").ok, false);
  assert.equal(parseTimerUrl("?10z=Squats").ok, false);
  assert.equal(parseTimerUrl("?10s=").ok, false);
});

test("continues supporting the legacy step format", () => {
  const result = parseTimerUrl("?step=reps:6:Push-ups&step=time:30:Rest");

  assert.equal(result.ok, true);
  assert.deepEqual(result.steps, [
    { type: "reps", value: 6, label: "Push-ups" },
    { type: "time", value: 30, label: "Rest" },
  ]);
});
