import { TIMER_STATES } from "./timer-engine.js";
import { cancelSpeech, initAudio, playBeep, playCompletionBeep, speakLabel } from "./audio.js";

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
      <div class="app-layout">
        <div class="timer-panel">
          <header class="workout-header">
            <p class="brand">qtimer</p>
            <h1 id="workout-title"></h1>
          </header>

          <section class="workout-area" aria-label="Timer controls">
        <div class="ready-view">
          <p class="eyebrow">READY TO BEGIN</p>
          <p class="ready-steps"></p>
          <p class="ready-first-label"></p>
          <label class="sound-toggle">
            <input class="sound-checkbox" type="checkbox" checked />
            <span>Sound: On</span>
          </label>
          <label class="sound-toggle">
            <input class="voice-checkbox" type="checkbox" checked />
            <span>Voice cues: On</span>
          </label>
          <button class="primary-button start-button" type="button">START</button>
        </div>

        <div class="prestart-view" hidden>
          <p class="eyebrow">GET READY</p>
          <p class="prestart-label"></p>
          <p class="prestart-countdown">3</p>
        </div>

        <div class="running-view">
          <div class="period-count" aria-live="polite"></div>
          <p class="current-label"></p>
          <div class="main-display">
            <div class="countdown-wrap">
              <svg class="progress-ring" viewBox="0 0 320 320" aria-hidden="true">
                <circle class="ring-track" cx="160" cy="160" r="${RING_RADIUS}"></circle>
                <circle class="ring-progress" cx="160" cy="160" r="${RING_RADIUS}"></circle>
              </svg>
            </div>
            <div class="time-step-view"><p class="countdown" aria-label="Current timer remaining"></p></div>
            <div class="rep-step-view">
              <p class="rep-count"></p>
              <p class="rep-unit">REPS</p>
            </div>
          </div>
          <div class="done-slot"><button class="primary-button done-button" type="button">DONE</button></div>
          <nav class="step-navigation" aria-label="Step navigation">
            <button class="secondary-button previous-button" type="button" aria-label="Previous step"><span class="nav-arrow" aria-hidden="true">←</span><span class="nav-text"> Previous</span></button>
            <button class="secondary-button next-button" type="button" aria-label="Next step"><span class="nav-text">Next </span><span class="nav-arrow" aria-hidden="true">→</span></button>
          </nav>
          <p class="tap-hint">Tap anywhere to pause</p>
        </div>

        <div class="paused-view">
          <p class="eyebrow state-label">PAUSED</p>
          <p class="paused-label"></p>
          <p class="paused-countdown"></p>
          <p class="paused-reps"></p>
          <nav class="step-navigation" aria-label="Step navigation">
            <button class="secondary-button previous-button" type="button" aria-label="Previous step"><span class="nav-arrow" aria-hidden="true">←</span><span class="nav-text"> Previous</span></button>
            <button class="secondary-button next-button" type="button" aria-label="Next step"><span class="nav-text">Next </span><span class="nav-arrow" aria-hidden="true">→</span></button>
          </nav>
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
          <button class="mobile-list-button" type="button"></button>
        </div>

        <aside class="workout-sidebar" aria-label="Workout steps">
          <div class="list-heading">
            <p class="eyebrow">WORKOUT</p>
            <p class="sidebar-progress"></p>
          </div>
          <ol class="workout-list"></ol>
        </aside>
      </div>

      <div class="workout-overlay" hidden>
        <div class="overlay-panel" role="dialog" aria-modal="true" aria-label="Workout steps">
          <div class="overlay-header">
            <div>
              <p class="eyebrow">WORKOUT</p>
              <p class="overlay-progress"></p>
            </div>
            <button class="overlay-close" type="button" aria-label="Close workout steps">×</button>
          </div>
          <ol class="workout-list"></ol>
        </div>
      </div>
    </main>
  `;

  const appShell = root.querySelector(".app-shell");
  const workoutArea = root.querySelector(".workout-area");
  const titleElement = root.querySelector("#workout-title");
  const readyView = root.querySelector(".ready-view");
  const prestartView = root.querySelector(".prestart-view");
  const runningView = root.querySelector(".running-view");
  const pausedView = root.querySelector(".paused-view");
  const completedView = root.querySelector(".completed-view");
  const stepNavigations = root.querySelectorAll(".step-navigation");
  const previousButtons = root.querySelectorAll(".previous-button");
  const nextButtons = root.querySelectorAll(".next-button");
  const timeStepView = root.querySelector(".time-step-view");
  const repStepView = root.querySelector(".rep-step-view");
  const runningPeriodCount = root.querySelector(".period-count");
  const currentLabel = root.querySelector(".current-label");
  const countdown = root.querySelector(".countdown");
  const ringProgress = root.querySelector(".ring-progress");
  const repCount = root.querySelector(".rep-count");
  const doneButton = root.querySelector(".done-button");
  const workoutElapsed = root.querySelector(".workout-elapsed");
  const pausedLabel = root.querySelector(".paused-label");
  const pausedCountdown = root.querySelector(".paused-countdown");
  const pausedReps = root.querySelector(".paused-reps");
  const completedSummary = root.querySelector(".completed-summary");
  const statusText = root.querySelector(".state-label");
  const listContainers = root.querySelectorAll(".workout-list");
  const sidebarProgress = root.querySelector(".sidebar-progress");
  const overlayProgress = root.querySelector(".overlay-progress");
  const mobileListButton = root.querySelector(".mobile-list-button");
  const workoutOverlay = root.querySelector(".workout-overlay");
  const soundCheckbox = root.querySelector(".sound-checkbox");
  const soundText = root.querySelector(".sound-toggle span");
  const voiceCheckbox = root.querySelector(".voice-checkbox");
  const voiceText = root.querySelectorAll(".sound-toggle span")[1];
  let animationFrame = null;
  let lastRenderedStepIndex = null;
  let prestartFrame = null;
  let prestartStartedAt = null;
  const PRESTART_DURATION_MS = 3000;

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

  function formatStepAmount(step) {
    if (step.type === "reps") return String(step.value);

    const totalSeconds = Math.ceil(step.value);
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (value) => String(value).padStart(2, "0");
    return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
  }

  function renderStepLists(snapshot) {
    const isCompleted = snapshot.status === TIMER_STATES.COMPLETED;
    const progressText = isCompleted
      ? `${steps.length} / ${steps.length}`
      : `${snapshot.currentStepNumber} / ${snapshot.totalSteps}`;
    sidebarProgress.textContent = progressText;
    overlayProgress.textContent = progressText;

    for (const list of listContainers) {
      list.replaceChildren();
      steps.forEach((step, index) => {
        const row = document.createElement("li");
        const state = isCompleted || index < snapshot.currentStepIndex
          ? "completed"
          : index === snapshot.currentStepIndex
            ? "current"
            : "upcoming";
        row.className = `step-row step-${state}`;
        if (state === "current") row.setAttribute("aria-current", "step");

        const marker = document.createElement("span");
        marker.className = "step-marker";
        marker.setAttribute("aria-hidden", "true");
        marker.textContent = state === "completed" ? "✓" : state === "current" ? "●" : "";

        const amount = document.createElement("span");
        amount.className = "step-amount";
        amount.textContent = formatStepAmount(step);

        const label = document.createElement("span");
        label.className = "step-label";
        label.textContent = step.label;

        row.append(marker, amount, label);
        list.append(row);
      });
    }

    if (lastRenderedStepIndex !== snapshot.currentStepIndex || isCompleted) {
      lastRenderedStepIndex = snapshot.currentStepIndex;
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
      for (const list of listContainers) {
        const activeRow = list.querySelector(isCompleted ? ".step-row:last-child" : ".step-current");
        activeRow?.scrollIntoView({ block: "center", behavior });
      }
    }
  }

  function render(now) {
    const snapshot = engine.snapshot(now);
    const isRunningOrPaused = snapshot.status === TIMER_STATES.RUNNING || snapshot.status === TIMER_STATES.PAUSED;
    const isTimeStep = snapshot.currentStep.type === "time";

    const events = engine.consumeEvents();
    processAudioEvents(events);
    processNarrationEvents(events);
    renderStepLists(snapshot);

    appShell.dataset.state = snapshot.status.toLowerCase();
    statusText.textContent = snapshot.status === TIMER_STATES.PAUSED ? "PAUSED" : "COMPLETE";
    setHidden(readyView, snapshot.status !== TIMER_STATES.READY || prestartStartedAt !== null);
    setHidden(prestartView, prestartStartedAt === null);
    setHidden(runningView, snapshot.status !== TIMER_STATES.RUNNING);
    setHidden(pausedView, snapshot.status !== TIMER_STATES.PAUSED);
    setHidden(completedView, snapshot.status !== TIMER_STATES.COMPLETED);
    for (const navigation of stepNavigations) {
      setHidden(navigation, navigation.closest(".running-view")
        ? snapshot.status !== TIMER_STATES.RUNNING
        : snapshot.status !== TIMER_STATES.PAUSED);
    }
    for (const button of previousButtons) button.disabled = snapshot.currentStepIndex === 0;
    setHidden(workoutElapsed, snapshot.status === TIMER_STATES.READY);
    mobileListButton.textContent = `${snapshot.currentStepNumber} / ${snapshot.totalSteps} · View workout`;

    if (isRunningOrPaused) {
      runningPeriodCount.textContent = `${snapshot.currentStepNumber} / ${snapshot.totalSteps}`;
      currentLabel.textContent = snapshot.currentStep.label;
      timeStepView.hidden = !isTimeStep;
      repStepView.hidden = isTimeStep;
      doneButton.classList.toggle("is-hidden", isTimeStep);
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

  function stopPrestartCountdown() {
    if (prestartFrame !== null) {
      cancelAnimationFrame(prestartFrame);
      prestartFrame = null;
    }
    prestartStartedAt = null;
  }

  function runPrestartCountdown(now) {
    if (prestartStartedAt === null) return;

    const elapsed = now - prestartStartedAt;
    const secondsRemaining = Math.max(1, 3 - Math.floor(elapsed / 1000));
    root.querySelector(".prestart-countdown").textContent = secondsRemaining;

    if (elapsed >= PRESTART_DURATION_MS) {
      stopPrestartCountdown();
      engine.start();
      const events = engine.consumeEvents();
      processAudioEvents(events);
      processNarrationEvents(events);
      refresh();
      return;
    }

    prestartFrame = requestAnimationFrame(runPrestartCountdown);
  }

  function processAudioEvents(events) {
    if (!soundCheckbox.checked) return;
    for (const event of events) {
      if (event === "complete") playCompletionBeep();
      else if (event === "start" || event === "transition") playBeep();
      else if (event.type === "complete") playCompletionBeep();
      else if (event.type === "start" || event.type === "transition") playBeep();
    }
  }

  function processNarrationEvents(events) {
    if (!voiceCheckbox.checked) return;
    for (const event of events) {
      if (event.type === "narrate") speakLabel(event.label);
    }
  }

  root.querySelector(".start-button").addEventListener("click", () => {
    if (prestartStartedAt !== null) return;
    if (soundCheckbox.checked) void initAudio();
    if (voiceCheckbox.checked) speakLabel(steps[0].label);
    prestartStartedAt = performance.now();
    root.querySelector(".prestart-label").textContent = steps[0].label;
    root.querySelector(".prestart-countdown").textContent = "3";
    refresh();
    prestartFrame = requestAnimationFrame(runPrestartCountdown);
  });

  mobileListButton.addEventListener("click", () => {
    workoutOverlay.hidden = false;
    workoutOverlay.dataset.open = "true";
    render(performance.now());
  });

  root.querySelector(".overlay-close").addEventListener("click", () => {
    workoutOverlay.hidden = true;
    delete workoutOverlay.dataset.open;
  });

  soundCheckbox.addEventListener("change", () => {
    soundText.textContent = `Sound: ${soundCheckbox.checked ? "On" : "Off"}`;
  });

  voiceCheckbox.addEventListener("change", () => {
    voiceText.textContent = `Voice cues: ${voiceCheckbox.checked ? "On" : "Off"}`;
    if (!voiceCheckbox.checked) cancelSpeech();
  });

  root.querySelector(".done-button").addEventListener("click", (event) => {
    event.stopPropagation();
    engine.done();
    refresh();
  });

  for (const button of previousButtons) {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      cancelSpeech();
      engine.goToPreviousStep();
      refresh();
    });
  }

  for (const button of nextButtons) {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      cancelSpeech();
      engine.goToNextStep();
      refresh();
    });
  }

  root.querySelector(".resume-button").addEventListener("click", () => {
    engine.resume();
    refresh();
  });

  for (const restartButton of root.querySelectorAll(".paused-restart-button, .completed-restart-button")) {
    restartButton.addEventListener("click", () => {
      cancelSpeech();
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
      cancelSpeech();
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
      <p class="error-example">Try: <code>?20s=Work&amp;10s=Rest</code></p>
      </section>
    </main>
  `;
}
