export const TIMER_STATES = Object.freeze({
  READY: "READY",
  RUNNING: "RUNNING",
  PAUSED: "PAUSED",
  COMPLETED: "COMPLETED",
});

export class TimerEngine {
  constructor(steps, clock = () => performance.now()) {
    if (!Array.isArray(steps) || steps.length === 0) {
      throw new Error("TimerEngine requires at least one step.");
    }

    this.steps = steps;
    this.clock = clock;
    this.status = TIMER_STATES.READY;
    this.currentStepIndex = 0;
    this.currentElapsedMs = 0;
    this.workoutElapsedMs = 0;
    this.periodStartedAt = null;
  }

  start() {
    if (this.status !== TIMER_STATES.READY) return;
    this.status = TIMER_STATES.RUNNING;
    this.periodStartedAt = this.clock();
  }

  pause() {
    if (this.status !== TIMER_STATES.RUNNING) return;
    this.update(this.clock());
    if (this.status === TIMER_STATES.RUNNING) {
      this.status = TIMER_STATES.PAUSED;
      this.periodStartedAt = null;
    }
  }

  resume() {
    if (this.status !== TIMER_STATES.PAUSED) return;
    this.status = TIMER_STATES.RUNNING;
    this.periodStartedAt = this.clock();
  }

  restart() {
    this.status = TIMER_STATES.READY;
    this.currentStepIndex = 0;
    this.currentElapsedMs = 0;
    this.workoutElapsedMs = 0;
    this.periodStartedAt = null;
  }

  done() {
    if (this.status !== TIMER_STATES.RUNNING) return;
    this.update(this.clock());
    if (this.status !== TIMER_STATES.RUNNING || this.currentStep.type !== "reps") return;
    this.advanceStep();
  }

  update(now = this.clock()) {
    if (this.status !== TIMER_STATES.RUNNING || this.periodStartedAt === null) return;

    let elapsedSinceLastUpdate = Math.max(0, now - this.periodStartedAt);
    this.workoutElapsedMs += elapsedSinceLastUpdate;
    this.periodStartedAt = now;

    while (this.currentStep.type === "time") {
      const stepDurationMs = this.currentStep.value * 1000;
      const remainingInStepMs = stepDurationMs - this.currentElapsedMs;

      if (elapsedSinceLastUpdate < remainingInStepMs) {
        this.currentElapsedMs += elapsedSinceLastUpdate;
        return;
      }

      elapsedSinceLastUpdate -= remainingInStepMs;
      this.currentElapsedMs = stepDurationMs;
      this.advanceStep();

      if (this.status === TIMER_STATES.COMPLETED) return;
    }

    // Rep steps do not auto-advance. Their time still contributes to the
    // workout elapsed clock, while currentElapsedMs is only for bookkeeping.
    this.currentElapsedMs += elapsedSinceLastUpdate;
  }

  advanceStep() {
    if (this.currentStepIndex === this.steps.length - 1) {
      this.status = TIMER_STATES.COMPLETED;
      this.currentElapsedMs = 0;
      this.periodStartedAt = null;
      return;
    }

    this.currentStepIndex += 1;
    this.currentElapsedMs = 0;
  }

  snapshot(now = this.clock()) {
    this.update(now);
    const currentStep = this.currentStep;
    const isTimeStep = currentStep.type === "time";
    const durationMs = isTimeStep ? currentStep.value * 1000 : null;

    return {
      status: this.status,
      currentStepIndex: this.currentStepIndex,
      currentStepNumber: this.currentStepIndex + 1,
      currentStep,
      currentElapsedMs: this.currentElapsedMs,
      workoutElapsedMs: this.workoutElapsedMs,
      currentRemainingMs: isTimeStep && this.status !== TIMER_STATES.COMPLETED
        ? Math.max(0, durationMs - this.currentElapsedMs)
        : null,
      currentProgress: isTimeStep && this.status !== TIMER_STATES.COMPLETED
        ? Math.min(1, this.currentElapsedMs / durationMs)
        : 0,
      totalSteps: this.steps.length,
    };
  }

  get currentStep() {
    return this.steps[this.currentStepIndex];
  }
}
