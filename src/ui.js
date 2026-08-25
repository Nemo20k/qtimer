import { TIMER_STATES } from "./timer-engine.js";

const RING_RADIUS = 138;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value) => String(value).padStart(2, "0");

  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

function setHidden(element, hidden) {
  element.hidden = hidden;
}

export function mountApp(root, { title, steps }, engine) {
  root.innerHTML = `
    <main class="app-shell" aria-label="qtimer">
      <header class="workout-header">
        <p class="brand">qtimer</p>
        <h1 id="workout-title"></h1>
      </header>

      <section class="workout-area" aria-label="Timer controls">
        <div class="ready-view">
          <p class="eyebrow">READY TO BEGIN</p>
          <p class="ready-steps"></p>
          <p class="ready-first-label"></p>
          <button class="primary-button start-button" type="button">START</button>
        </div>

        <div class="running-view">
          <div class="period-count" aria-live="polite"></div>
          <p class="current-label"></p>
          <div class="time-step-view">
            <div class="countdown-wrap">
              <svg class="progress-ring" viewBox="0 0 320 320" aria-hidden="true">
                <circle class="ring-track" cx="160" cy="160" r="${RING_RADIUS}"></circle>
                <circle class="ring-progress" cx="160" cy="160" r="${RING_RADIUS}"></circle>
              </svg>
              <p class="countdown" aria-label="Current timer remaining"></p>
            </div>
          </div>
          <div class="rep-step-view">
            <p class="rep-count"></p>
            <p class="rep-unit">REPS</p>
            <button class="primary-button done-button" type="button">DONE</button>
          </div>
          <p class="tap-hint">Tap anywhere to pause</p>
        </div>

        <div class="paused-view">
          <p class="eyebrow state-label">PAUSED</p>
          <p class="paused-label"></p>
          <p class="paused-countdown"></p>
          <p class="paused-reps"></p>
          <div class="button-row">
            <button class="primary-button resume-button" type="button">RESUME</button>
            <button class="secondary-button paused-restart-button" type="button">RESTART</button>
          </div>
        </div>

        <div class="completed-view">
          <p class="eyebrow state-label">COMPLETE</p>
          <h2>Workout complete</h2>
          <p class="completed-summary"></p>
          <button class="primary-button completed-restart-button" type="button">RESTART</button>
        </div>
      </section>

      <footer class="workout-footer">
        <p class="workout-elapsed"></p>
      </footer>
    </main>
  `;

  const appShell = root.querySelector(".app-shell");
  const workoutArea = root.querySelector(".workout-area");
  const titleElement = root.querySelector("#workout-title");
  const readyView = root.querySelector(".ready-view");
  const runningView = root.querySelector(".running-view");
  const pausedView = root.querySelector(".paused-view");
  const completedView = root.querySelector(".completed-view");
  const timeStepView = root.querySelector(".time-step-view");
  const repStepView = root.querySelector(".rep-step-view");
  const runningPeriodCount = root.querySelector(".period-count");
  const currentLabel = root.querySelector(".current-label");
  const countdown = root.querySelector(".countdown");
  const ringProgress = root.querySelector(".ring-progress");
  const repCount = root.querySelector(".rep-count");
  const workoutElapsed = root.querySelector(".workout-elapsed");
  const pausedLabel = root.querySelector(".paused-label");
  const pausedCountdown = root.querySelector(".paused-countdown");
  const pausedReps = root.querySelector(".paused-reps");
  const completedSummary = root.querySelector(".completed-summary");
  const statusText = root.querySelector(".state-label");
  let animationFrame = null;

  titleElement.textContent = title;
  titleElement.hidden = !title;
  root.querySelector(".ready-steps").textContent = `${steps.length} step${steps.length === 1 ? "" : "s"}`;
  root.querySelector(".ready-first-label").textContent = `First: ${steps[0].label}`;

  function stopAnimationLoop() {
    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
  }

  function render(now) {
    const snapshot = engine.snapshot(now);
    const isRunningOrPaused = snapshot.status === TIMER_STATES.RUNNING || snapshot.status === TIMER_STATES.PAUSED;
    const isTimeStep = snapshot.currentStep.type === "time";

    appShell.dataset.state = snapshot.status.toLowerCase();
    statusText.textContent = snapshot.status === TIMER_STATES.PAUSED ? "PAUSED" : "COMPLETE";
    setHidden(readyView, snapshot.status !== TIMER_STATES.READY);
    setHidden(runningView, snapshot.status !== TIMER_STATES.RUNNING);
    setHidden(pausedView, snapshot.status !== TIMER_STATES.PAUSED);
    setHidden(completedView, snapshot.status !== TIMER_STATES.COMPLETED);
    setHidden(workoutElapsed, snapshot.status === TIMER_STATES.READY);

    if (isRunningOrPaused) {
      runningPeriodCount.textContent = `${snapshot.currentStepNumber} / ${snapshot.totalSteps}`;
      currentLabel.textContent = snapshot.currentStep.label;
      timeStepView.hidden = !isTimeStep;
      repStepView.hidden = isTimeStep;
      countdown.textContent = formatDuration(snapshot.currentRemainingMs ?? 0);
      countdown.setAttribute("aria-label", `${formatDuration(snapshot.currentRemainingMs ?? 0)} remaining`);
      repCount.textContent = snapshot.currentStep.value;
      workoutElapsed.textContent = `ELAPSED ${formatDuration(snapshot.workoutElapsedMs)}`;

      pausedLabel.textContent = snapshot.currentStep.label;
      pausedCountdown.textContent = isTimeStep ? formatDuration(snapshot.currentRemainingMs) : "";
      pausedReps.textContent = isTimeStep ? "" : `${snapshot.currentStep.value} REPS`;
      ringProgress.style.strokeDashoffset = `${RING_CIRCUMFERENCE * (1 - snapshot.currentProgress)}`;
    }

    if (snapshot.status === TIMER_STATES.COMPLETED) {
      completedSummary.textContent = `${snapshot.totalSteps} step${snapshot.totalSteps === 1 ? "" : "s"} · ${formatDuration(snapshot.workoutElapsedMs)}`;
      workoutElapsed.textContent = `ELAPSED ${formatDuration(snapshot.workoutElapsedMs)}`;
    }

    if (snapshot.status === TIMER_STATES.RUNNING) {
      animationFrame = requestAnimationFrame(render);
    } else {
      stopAnimationLoop();
    }
  }

  function refresh() {
    stopAnimationLoop();
    render(performance.now());
  }

  root.querySelector(".start-button").addEventListener("click", () => {
    engine.start();
    refresh();
  });

  root.querySelector(".done-button").addEventListener("click", (event) => {
    event.stopPropagation();
    engine.done();
    refresh();
  });

  root.querySelector(".resume-button").addEventListener("click", () => {
    engine.resume();
    refresh();
  });

  for (const restartButton of root.querySelectorAll(".paused-restart-button, .completed-restart-button")) {
    restartButton.addEventListener("click", () => {
      engine.restart();
      refresh();
    });
  }

  workoutArea.addEventListener("click", (event) => {
    if (engine.status === TIMER_STATES.RUNNING && !event.target.closest("button")) {
      engine.pause();
      refresh();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.target.closest?.("button, input, textarea, select, a")) return;

    if (event.code === "Space" && (engine.status === TIMER_STATES.RUNNING || engine.status === TIMER_STATES.PAUSED)) {
      event.preventDefault();
      if (engine.status === TIMER_STATES.RUNNING) engine.pause();
      else engine.resume();
      refresh();
    }

    if (event.key.toLowerCase() === "r" && (engine.status === TIMER_STATES.PAUSED || engine.status === TIMER_STATES.COMPLETED)) {
      engine.restart();
      refresh();
    }
  });

  refresh();
}

export function renderError(root, message) {
  root.innerHTML = `
    <main class="app-shell error-shell">
      <p class="brand">qtimer</p>
      <section class="error-content" role="alert">
        <p class="eyebrow">UNABLE TO LOAD TIMER</p>
        <h1>There is a problem with this URL</h1>
        <p>${message}</p>
        <p class="error-example">Try: <code>?step=time:20:Work&amp;step=time:10:Rest</code></p>
      </section>
    </main>
  `;
}
