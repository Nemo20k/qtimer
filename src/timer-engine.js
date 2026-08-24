export const TIMER_STATES = Object.freeze({
  READY: "READY",
  RUNNING: "RUNNING",
  PAUSED: "PAUSED",
  COMPLETED: "COMPLETED",
});

export class TimerEngine {
  constructor(timers, clock = () => performance.now()) {
    if (!Array.isArray(timers) || timers.length === 0) {
      throw new Error("TimerEngine requires at least one timer.");
    }

    this.timers = timers;
    this.clock = clock;
    this.totalDuration = timers.reduce((total, timer) => total + timer.duration, 0);
    this.status = TIMER_STATES.READY;
    this.currentTimerIndex = 0;
    this.currentElapsedMs = 0;
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
    this.currentTimerIndex = 0;
    this.currentElapsedMs = 0;
    this.periodStartedAt = null;
  }

  update(now = this.clock()) {
    if (this.status !== TIMER_STATES.RUNNING || this.periodStartedAt === null) {
      return;
    }

    const elapsedSinceLastUpdate = Math.max(0, now - this.periodStartedAt);
    this.currentElapsedMs += elapsedSinceLastUpdate;
    this.periodStartedAt = now;

    while (this.currentElapsedMs >= this.currentDurationMs()) {
      this.currentElapsedMs -= this.currentDurationMs();

      if (this.currentTimerIndex === this.timers.length - 1) {
        this.currentElapsedMs = this.currentDurationMs();
        this.status = TIMER_STATES.COMPLETED;
        this.periodStartedAt = null;
        return;
      }

      this.currentTimerIndex += 1;
    }
  }

  snapshot(now = this.clock()) {
    this.update(now);

    const currentDurationMs = this.currentDurationMs();
    const currentRemainingMs = this.status === TIMER_STATES.COMPLETED
      ? 0
      : Math.max(0, currentDurationMs - this.currentElapsedMs);
    const completedDurationMs = this.timers
      .slice(0, this.currentTimerIndex)
      .reduce((total, timer) => total + timer.duration * 1000, 0);
    const totalRemainingMs = this.status === TIMER_STATES.COMPLETED
      ? 0
      : Math.max(0, this.totalDuration * 1000 - completedDurationMs - this.currentElapsedMs);

    return {
      status: this.status,
      currentTimerIndex: this.currentTimerIndex,
      currentTimerNumber: this.currentTimerIndex + 1,
      currentTimer: this.timers[this.currentTimerIndex],
      currentElapsedMs: this.currentElapsedMs,
      currentRemainingMs,
      currentProgress: this.status === TIMER_STATES.COMPLETED
        ? 0
        : Math.min(1, this.currentElapsedMs / currentDurationMs),
      totalRemainingMs,
      totalDuration: this.totalDuration,
      totalPeriods: this.timers.length,
    };
  }

  currentDurationMs() {
    return this.timers[this.currentTimerIndex].duration * 1000;
  }
}
