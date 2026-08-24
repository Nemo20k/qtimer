import test from "node:test";
import assert from "node:assert/strict";
import { TIMER_STATES, TimerEngine } from "../src/timer-engine.js";

function setup() {
  let now = 0;
  const engine = new TimerEngine([
    { duration: 10, label: "Work" },
    { duration: 5, label: "Rest" },
  ], () => now);

  return {
    engine,
    advance(milliseconds) {
      now += milliseconds;
    },
  };
}

test("starts ready, transitions periods, and calculates total remaining time", () => {
  const { engine, advance } = setup();

  assert.equal(engine.snapshot().status, TIMER_STATES.READY);
  assert.equal(engine.snapshot().totalRemainingMs, 15000);

  engine.start();
  advance(4000);
  assert.equal(engine.snapshot().currentTimerIndex, 0);
  assert.equal(engine.snapshot().currentRemainingMs, 6000);
  assert.equal(engine.snapshot().totalRemainingMs, 11000);

  advance(7000);
  const snapshot = engine.snapshot();
  assert.equal(snapshot.currentTimerIndex, 1);
  assert.equal(snapshot.currentRemainingMs, 4000);
  assert.equal(snapshot.totalRemainingMs, 4000);
});

test("accounts for delayed updates without timer drift", () => {
  const { engine, advance } = setup();

  engine.start();
  advance(16000);
  assert.equal(engine.snapshot().status, TIMER_STATES.COMPLETED);
});

test("pause and resume preserve elapsed time", () => {
  const { engine, advance } = setup();

  engine.start();
  advance(3500);
  engine.pause();
  advance(5000);
  assert.equal(engine.snapshot().status, TIMER_STATES.PAUSED);
  assert.equal(engine.snapshot().currentRemainingMs, 6500);

  engine.resume();
  advance(1000);
  assert.equal(engine.snapshot().currentRemainingMs, 5500);
});

test("restart returns to the initial ready state", () => {
  const { engine, advance } = setup();

  engine.start();
  advance(12000);
  assert.equal(engine.snapshot().currentTimerIndex, 1);
  engine.restart();

  const snapshot = engine.snapshot();
  assert.equal(snapshot.status, TIMER_STATES.READY);
  assert.equal(snapshot.currentTimerIndex, 0);
  assert.equal(snapshot.currentElapsedMs, 0);
  assert.equal(snapshot.totalRemainingMs, 15000);
});
