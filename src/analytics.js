export function trackEvent(name, parameters = {}) {
  try {
    if (typeof globalThis.gtag === "function") globalThis.gtag("event", name, parameters);
  } catch {
    // Analytics must never affect the timer.
  }
}

export function workoutParameters(steps) {
  const timedSteps = steps.filter((step) => step.type === "time");
  return {
    step_count: steps.length,
    timed_step_count: timedSteps.length,
    rep_step_count: steps.length - timedSteps.length,
    total_timed_seconds: timedSteps.reduce((total, step) => total + step.value, 0),
  };
}
