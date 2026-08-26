import test from "node:test";
import assert from "node:assert/strict";
import { TIMER_STATES, TimerEngine } from "../src/timer-engine.js";

function setup(steps = [
  { type: "time", value: 10, label: "Work" },
  { type: "reps", value: 5, label: "Push-ups" },
  { type: "time", value: 5, label: "Rest" },
]) {
  let now = 0;
  const engine = new TimerEngine(steps, () => now);

  return {
    engine,
    advance(milliseconds) {
      now += milliseconds;
    },
  };
}

test("starts ready and automatically transitions timed steps", () => {
  const { engine, advance } = setup();

  assert.equal(engine.snapshot().status, TIMER_STATES.READY);
  engine.start();
  assert.deepEqual(engine.consumeEvents(), ["start"]);
  advance(10000);

  const snapshot = engine.snapshot();
  assert.equal(snapshot.status, TIMER_STATES.RUNNING);
  assert.equal(snapshot.currentStepIndex, 1);
  assert.equal(snapshot.currentStep.type, "reps");
  assert.equal(snapshot.workoutElapsedMs, 10000);
  assert.deepEqual(engine.consumeEvents(), ["transition"]);
  assert.deepEqual(engine.consumeEvents(), []);
});

test("rep steps advance only through done", () => {
  const { engine, advance } = setup();

  engine.start();
  assert.deepEqual(engine.consumeEvents(), ["start"]);
  advance(10000);
  engine.snapshot();
  assert.deepEqual(engine.consumeEvents(), ["transition"]);
  advance(3000);
  assert.equal(engine.snapshot().currentStepIndex, 1);

  engine.done();
  assert.deepEqual(engine.consumeEvents(), ["transition"]);
  assert.equal(engine.snapshot().currentStepIndex, 2);
  assert.equal(engine.snapshot().currentStep.type, "time");
});

test("delayed updates can transition through multiple timed steps", () => {
  const { engine, advance } = setup([
    { type: "time", value: 10, label: "One" },
    { type: "time", value: 5, label: "Two" },
  ]);

  engine.start();
  engine.consumeEvents();
  advance(16000);
  assert.equal(engine.snapshot().status, TIMER_STATES.COMPLETED);
  assert.deepEqual(engine.consumeEvents(), ["transition", "complete"]);
});

test("elapsed workout time pauses and resumes accurately", () => {
  const { engine, advance } = setup();

  engine.start();
  engine.consumeEvents();
  advance(3500);
  engine.pause();
  advance(5000);
  assert.equal(engine.snapshot().status, TIMER_STATES.PAUSED);
  assert.equal(engine.snapshot().workoutElapsedMs, 3500);

  engine.resume();
  advance(1000);
  assert.equal(engine.snapshot().workoutElapsedMs, 4500);
});

test("restart returns to step one and resets elapsed time", () => {
  const { engine, advance } = setup();

  engine.start();
  engine.consumeEvents();
  advance(12000);
  engine.done();
  engine.restart();

  const snapshot = engine.snapshot();
  assert.equal(snapshot.status, TIMER_STATES.READY);
  assert.equal(snapshot.currentStepIndex, 0);
  assert.equal(snapshot.workoutElapsedMs, 0);
});

test("done on the final rep step completes the workout", () => {
  const { engine } = setup([{ type: "reps", value: 6, label: "Push-ups" }]);

  engine.start();
  engine.consumeEvents();
  engine.done();
  assert.equal(engine.snapshot().status, TIMER_STATES.COMPLETED);
});
