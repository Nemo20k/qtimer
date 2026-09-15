import test from "node:test";
import assert from "node:assert/strict";
import { initAnalytics, trackEvent, workoutParameters, workoutStartedParameters } from "../src/analytics.js";
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
      duration_bucket: "under_5m",
    });
    assert.deepEqual(calls[4][2], {});
    assert.equal(JSON.stringify(calls).includes("Private"), false);
    assert.equal(JSON.stringify(calls).includes("Create a workout"), false);
  } finally {
    restoreGlobal("gtag", originalGtag);
  }
});

test("AI analytics events contain no prompt, workout content, or API body", () => {
  const originalGtag = globalThis.gtag;
  const calls = [];
  globalThis.gtag = (...args) => calls.push(args);

  try {
    for (const name of ["ai_generate_submitted", "ai_generate_started", "ai_generate_succeeded", "ai_generate_failed", "builder_tab_changed", "ai_workout_started", "ai_workout_copied", "ai_workout_edited", "workout_generation_repaired", "workout_generation_warning_shown"]) {
      trackEvent(name, { step_count: 2 });
    }
    const serialized = JSON.stringify(calls);
    assert.equal(serialized.includes("Create a workout"), false);
    assert.equal(serialized.includes("Private"), false);
    assert.equal(serialized.includes("invalid_ai_response"), false);
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

test("page views use a path-only location and are initialized once", () => {
  const originalGtag = globalThis.gtag;
  const originalLocation = globalThis.location;
  const calls = [];
  globalThis.gtag = (...args) => calls.push(args);
  globalThis.location = { pathname: "/?title=Private#30s=Secret", origin: "https://qtimer.app" };
  delete globalThis.__qtimerAnalyticsInitialized;

  try {
    initAnalytics();
    initAnalytics();
    const pageViewCalls = calls.filter(([, name]) => name === "page_view");
    assert.equal(pageViewCalls.length, 1);
    assert.equal(pageViewCalls[0][2].page_path, "/");
    assert.equal(pageViewCalls[0][2].page_location, "https://qtimer.app/");
    assert.equal(JSON.stringify(pageViewCalls[0]).includes("Private"), false);
    assert.equal(JSON.stringify(pageViewCalls[0]).includes("Secret"), false);
  } finally {
    restoreGlobal("gtag", originalGtag);
    restoreGlobal("location", originalLocation);
    delete globalThis.__qtimerAnalyticsInitialized;
  }
});

test("analytics removes content and unknown metadata from safe events", () => {
  const originalGtag = globalThis.gtag;
  const calls = [];
  globalThis.gtag = (...args) => calls.push(args);

  try {
    trackEvent("workout_started", {
      title: "Private title",
      label: "Private label",
      prompt: "Private prompt",
      url: "https://qtimer.app/?secret=1",
      step_count: 2,
      duration_bucket: "under_5m",
    });
    assert.deepEqual(calls[0][2], { step_count: 2, duration_bucket: "under_5m" });
    assert.equal(JSON.stringify(calls).includes("Private"), false);
    assert.equal(JSON.stringify(calls).includes("secret"), false);
  } finally {
    restoreGlobal("gtag", originalGtag);
  }
});

test("workout start analytics adds only the landing-page source", () => {
  assert.deepEqual(workoutStartedParameters(steps, "tabata_timer"), {
    step_count: 2,
    timed_step_count: 1,
    rep_step_count: 1,
    duration_bucket: "under_5m",
    source_page: "tabata_timer",
  });
  assert.deepEqual(workoutStartedParameters(steps), workoutParameters(steps));
  assert.equal(JSON.stringify(workoutStartedParameters(steps, "tabata_timer")).includes("Private"), false);
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
