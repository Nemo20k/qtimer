export function calculateWorkoutTotals(steps = []) {
  let timedSeconds = 0;
  let repetitionCount = 0;
  let timedStepCount = 0;
  let repetitionStepCount = 0;

  for (const step of Array.isArray(steps) ? steps : []) {
    const value = Number(step?.value);
    if (!Number.isFinite(value) || value < 0) continue;
    if (step.type === "time") {
      timedSeconds += value;
      timedStepCount += 1;
    } else if (step.type === "reps") {
      repetitionCount += value;
      repetitionStepCount += 1;
    }
  }

  const stepCount = timedStepCount + repetitionStepCount;
  const kind = repetitionStepCount === 0 ? "timed" : timedStepCount === 0 ? "repetitions" : "mixed";
  return {
    stepCount,
    timedStepCount,
    repetitionStepCount,
    timedSeconds,
    repetitionCount,
    kind,
    hasKnownTotalDuration: stepCount > 0 && repetitionStepCount === 0,
  };
}

export function formatDuration(seconds, { padMinutes = false } = {}) {
  const numericSeconds = Number(seconds);
  const totalSeconds = Number.isFinite(numericSeconds) ? Math.max(0, Math.ceil(numericSeconds)) : 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;
  const pad = (value) => String(value).padStart(2, "0");
  const displayedMinutes = padMinutes || hours > 0 ? pad(minutes) : minutes;

  return hours > 0
    ? `${hours}:${displayedMinutes}:${pad(remainingSeconds)}`
    : `${displayedMinutes}:${pad(remainingSeconds)}`;
}

export function formatNaturalDuration(seconds) {
  const numericSeconds = Number(seconds);
  const totalSeconds = Number.isFinite(numericSeconds) ? Math.max(0, Math.round(numericSeconds)) : 0;
  if (totalSeconds % 60 === 0) {
    const minutes = totalSeconds / 60;
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
  if (totalSeconds < 60) return `${totalSeconds} second${totalSeconds === 1 ? "" : "s"}`;
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes} minute${minutes === 1 ? "" : "s"} ${remainingSeconds} second${remainingSeconds === 1 ? "" : "s"}`;
}

export function formatAccessibleDuration(seconds, suffix) {
  const numericSeconds = Number(seconds);
  const totalSeconds = Number.isFinite(numericSeconds) ? Math.max(0, Math.ceil(numericSeconds)) : 0;
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  const parts = [];
  if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);
  if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds} second${remainingSeconds === 1 ? "" : "s"}`);
  return `${parts.join(" ")} ${suffix} in workout`;
}

export function workoutSummary(steps) {
  const totals = calculateWorkoutTotals(steps);
  if (totals.stepCount === 0) return null;

  const stepLabel = `${totals.stepCount} step${totals.stepCount === 1 ? "" : "s"}`;
  if (totals.kind === "timed") return { text: `${stepLabel} · ${formatDuration(totals.timedSeconds)} total`, variesByPace: false, totals };

  const repLabel = `${totals.repetitionCount} rep${totals.repetitionCount === 1 ? "" : "s"}`;
  return {
    text: totals.kind === "mixed"
      ? `${stepLabel} · ${formatDuration(totals.timedSeconds)} timed + ${repLabel}`
      : `${stepLabel} · ${repLabel}`,
    variesByPace: true,
    totals,
  };
}
