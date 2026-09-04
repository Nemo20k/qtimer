import test from "node:test";
import assert from "node:assert/strict";
import { trackEvent, workoutParameters } from "../src/analytics.js";
import { TIMER_STATES, TimerEngine } from "../src/timer-engine.js";

const steps = [
  { type: "time", value: 30, label: "Private exercise" },
  { type: "reps", value: 8, label: "Private reps" },
];

function restoreGlobal(name, original) {
  if (original === undefined) delete globalThis[name];
  else globalThis[name] = original;
}

test("tracks all analytics events with aggregate workout parameters only", () => {
  const originalGtag = globalThis.gtag;
  const calls = [];
  globalThis.gtag = (...args) => calls.push(args);

  try {
    const parameters = workoutParameters(steps);
    for (const name of ["workout_created", "workout_started", "workout_completed", "workout_shared"]) {
      trackEvent(name, parameters);
    }
    trackEvent("instructions_copied");

    assert.deepEqual(calls.map(([method, name]) => [method, name]), [
      ["event", "workout_created"],
      ["event", "workout_started"],
      ["event", "workout_completed"],
      ["event", "workout_shared"],
      ["event", "instructions_copied"],
    ]);
    assert.deepEqual(calls[0][2], {
      step_count: 2,
      timed_step_count: 1,
      rep_step_count: 1,
      total_timed_seconds: 30,
    });
    assert.deepEqual(calls[4][2], {});
    assert.equal(JSON.stringify(calls).includes("Private"), false);
  } finally {
    restoreGlobal("gtag", originalGtag);
  }
});

test("analytics fail silently when gtag is unavailable or throws", () => {
  const originalGtag = globalThis.gtag;

  try {
    delete globalThis.gtag;
    assert.doesNotThrow(() => trackEvent("workout_started"));

    globalThis.gtag = () => {
      throw new Error("analytics unavailable");
    };
    assert.doesNotThrow(() => trackEvent("workout_completed"));
  } finally {
    restoreGlobal("gtag", originalGtag);
  }
});

test("timer start is not repeated by resume and completion is emitted once", () => {
  let now = 0;
  const engine = new TimerEngine([{ type: "time", value: 1, label: "Work" }], () => now);

  engine.start();
  assert.deepEqual(engine.consumeEvents(), [{ type: "start" }]);
  now = 250;
  engine.pause();
  engine.consumeEvents();
  engine.resume();
  assert.equal(engine.snapshot().status, TIMER_STATES.RUNNING);
  assert.deepEqual(engine.consumeEvents(), []);

  now = 1300;
  engine.snapshot();
  assert.deepEqual(engine.consumeEvents(), [{ type: "complete" }]);
  engine.snapshot();
  assert.deepEqual(engine.consumeEvents(), []);
});
