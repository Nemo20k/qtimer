import test from "node:test";
import assert from "node:assert/strict";
import { parseTimerUrl } from "../src/parser.js";

test("parses a valid sequence and title", () => {
  const result = parseTimerUrl("?title=Upper%20Body&timers=60:Push-ups,30:Rest");

  assert.equal(result.ok, true);
  assert.equal(result.title, "Upper Body");
  assert.deepEqual(result.timers, [
    { duration: 60, label: "Push-ups" },
    { duration: 30, label: "Rest" },
  ]);
  assert.equal(result.totalDuration, 90);
});

test("decodes arbitrary label text, including commas and colons", () => {
  const result = parseTimerUrl("?timers=20:Kettlebell%20swings%2C%20fast%3A%20round");

  assert.equal(result.ok, true);
  assert.equal(result.timers[0].label, "Kettlebell swings, fast: round");
});

test("rejects a missing timers parameter", () => {
  const result = parseTimerUrl("?title=Missing");

  assert.equal(result.ok, false);
  assert.match(result.message, /missing.*timers/i);
});

test("rejects an empty timer list", () => {
  const result = parseTimerUrl("?timers=");

  assert.equal(result.ok, false);
  assert.match(result.message, /cannot be empty/i);
});

test("rejects malformed timer entries", () => {
  const result = parseTimerUrl("?timers=20");

  assert.equal(result.ok, false);
  assert.match(result.message, /duration:label/i);
});

test("rejects non-numeric, zero, and negative durations", () => {
  assert.equal(parseTimerUrl("?timers=abc:Work").ok, false);
  assert.equal(parseTimerUrl("?timers=0:Work").ok, false);
  assert.equal(parseTimerUrl("?timers=-5:Work").ok, false);
});
