import { generateWorkout, MAX_PROMPT_LENGTH, ApiClientError } from "./api-client.js";
import { createGenerationController } from "./ai-generator.js";
import { modelFromBuilderRows, serializeWorkout, validateWorkout, WORKOUT_LIMITS } from "./workout.js";
import { trackEvent, workoutParameters } from "./analytics.js";
import { getBuilderPreset } from "./landing-pages.js";
import { builderRowsFromWorkout, normalizeGeneratedWorkout, workoutStepsForAnalytics } from "./ai-workout.js";
import { copyAssistantInstructions, getAssistantInstructions, ASSISTANT_PROVIDERS } from "./ai-assistant.js";
import { siteFooterMarkup } from "./site-footer.js";
import { formatNaturalDuration, workoutSummary } from "./workout-totals.js";

const EXAMPLE_PROMPTS = [
  "Create a 15-minute kettlebell workout with a warm-up and short rests.",
  "10 min · No equipment",
  "12 min · Running",
  "5 min · Kettlebell",
];

function friendlyApiError(error) {
  if (!(error instanceof ApiClientError)) return "We couldn’t reach the workout generator. Check your connection and try again.";
  if (error.code === "cancelled") return "";
  if (error.code === "rate_limited") return "The generator is busy right now. Please try again in a little while.";
  if (error.code === "invalid_ai_response" || error.code === "workout_url_too_long") return "I couldn’t create a valid workout. Please try again with a simpler request.";
  if (error.code === "provider_unavailable") return "The workout generator is temporarily unavailable. Please try again.";
  if (error.code === "invalid_request") return "Please describe a workout in 2,000 characters or fewer.";
  return "We couldn’t reach the workout generator. Check your connection and try again.";
}

function draftFingerprint(title, rows) {
  return JSON.stringify({ title, rows });
}

export function hasMeaningfulManualEdits(title, rows, baseline) {
  return draftFingerprint(title, rows) !== baseline;
}

function setTextFeedback(element, message) {
  element.textContent = message;
  if (message) window.setTimeout(() => { element.textContent = ""; }, 2200);
}

export function warningMessages(warnings = []) {
  return warnings.map((warning) => typeof warning === "string" ? warning : warning?.message).filter(Boolean);
}

export function mountBuilder(root, { editWorkout } = {}) {
  const preset = getBuilderPreset(window.location.hash);
  const editing = Boolean(editWorkout);
  let rows = editing
    ? builderRowsFromWorkout(editWorkout)
    : preset?.rows ?? [{ amount: "30", unit: "s", label: "Work" }, { amount: "15", unit: "s", label: "Rest" }];
  let manualBaseline = draftFingerprint(editing ? editWorkout.title : preset?.title ?? "", rows);
  document.body.classList.add("landing-page");
  root.innerHTML = `
    <main class="landing-shell">
      <header class="landing-header">
        <a class="brand" href="./">qtimer</a>
        <h1>Build your workout timer</h1>
        <p class="landing-lede">Describe a workout with AI or build it manually, then start it or share a link.</p>
      </header>

      <section class="builder-card" aria-labelledby="builder-card-title">
        <h2 id="builder-card-title" class="visually-hidden">Workout builder</h2>
        <div class="builder-tabs" role="tablist" aria-label="Workout builder mode">
          <button id="ai-tab" class="builder-tab" type="button" role="tab" aria-selected="${!editing}" aria-controls="ai-panel" tabindex="${editing ? "-1" : "0"}">Describe with AI</button>
          <button id="manual-tab" class="builder-tab" type="button" role="tab" aria-selected="${editing}" aria-controls="manual-panel" tabindex="${editing ? "0" : "-1"}">Build manually</button>
        </div>

        <div id="ai-panel" class="builder-panel ai-panel" role="tabpanel" aria-labelledby="ai-tab"${editing ? " hidden" : ""}>
          <form class="ai-form" novalidate>
            <label class="field-label" for="ai-prompt">What workout do you want?</label>
            <textarea id="ai-prompt" class="text-input ai-prompt" rows="5" maxlength="${MAX_PROMPT_LENGTH}" aria-describedby="ai-prompt-help ai-prompt-count" placeholder="Create a 15-minute kettlebell workout with a warm-up and short rests."></textarea>
            <div class="ai-prompt-meta"><span id="ai-prompt-help">Describe the time, equipment, or experience level you have in mind.</span><span id="ai-prompt-count" class="ai-prompt-count">0 / ${MAX_PROMPT_LENGTH.toLocaleString()}</span></div>
            <div class="ai-examples" aria-label="Example prompts"></div>
            <button class="primary-button ai-submit-button" type="submit">Generate workout</button>
          </form>
          <p class="ai-loading" aria-live="polite" hidden>Generating workout<span class="ai-loading-dots" aria-hidden="true"><span class="ai-loading-dot">.</span><span class="ai-loading-dot">.</span><span class="ai-loading-dot">.</span></span></p>
          <p class="ai-error" role="alert" hidden></p>
        </div>

        <div id="manual-panel" class="builder-panel manual-panel" role="tabpanel" aria-labelledby="manual-tab"${editing ? "" : " hidden"}>
          <p class="generated-notice${editing ? " edit-notice" : ""}" role="status" tabindex="-1"${editing ? "" : " hidden"}>${editing ? "Editing workout. Your changes will create a new link." : "Workout generated. Review or edit it before starting."}</p>
          <div class="manual-builder" aria-labelledby="manual-builder-title">
            <section class="workout-warning-panel" role="status" aria-labelledby="workout-warning-title" hidden>
              <h2 id="workout-warning-title">Workout generated with warnings</h2>
              <p>You can still use this workout. Review or edit it before starting.</p>
              <ul class="workout-warning-list"></ul>
            </section>
            <h2 id="manual-builder-title">Your workout</h2>
            <label class="field-label" for="workout-title-input">Workout title</label>
            <input id="workout-title-input" class="text-input title-input" maxlength="${WORKOUT_LIMITS.maxTitleLength}" placeholder="Optional title" />
            <div class="builder-column-labels" aria-hidden="true"><span>Amount</span><span>Unit</span><span>Label</span><span></span></div>
            <div class="builder-rows"></div>
            <div class="builder-summary" aria-live="polite">
              <p class="builder-summary-text"></p>
              <p class="builder-duration-note" hidden>Duration varies by pace</p>
              <p class="builder-target-note" hidden></p>
            </div>
            <button class="add-step-button" type="button">+ Add step</button>
            <p class="builder-error" role="alert" hidden></p>
            <button class="primary-button start-workout-button" type="button">Start workout</button>
            <button class="copy-link-button" type="button">Copy shareable workout link</button>
            <p class="copy-feedback" aria-live="polite"></p>
          </div>
        </div>
      </section>

      <section class="ai-assistant-section" aria-labelledby="assistant-title">
        <div class="assistant-copy">
          <p class="eyebrow">WORKOUTS, WHEREVER YOU PLAN THEM</p>
          <h2 id="assistant-title">Your AI plans it. QTimer runs it.</h2>
          <p>Already planning workouts with ChatGPT, Claude, or Gemini? Paste these instructions into your conversation, then ask for a workout with a ready-to-start QTimer link.</p>
        </div>
        <div class="assistant-actions">
          <button class="primary-button assistant-primary-button" type="button">Copy AI instructions</button>
          <div class="assistant-shortcuts">
            <p class="assistant-shortcuts-label">Copy for a specific assistant:</p>
            <div class="assistant-controls" aria-label="AI assistant instruction controls"></div>
          </div>
          <p class="assistant-feedback" role="status" aria-live="polite"></p>
        </div>
      </section>
      ${siteFooterMarkup()}
    </main>
  `;

  const aiTab = root.querySelector("#ai-tab");
  const manualTab = root.querySelector("#manual-tab");
  const aiPanel = root.querySelector("#ai-panel");
  const manualPanel = root.querySelector("#manual-panel");
  const tabs = [aiTab, manualTab];
  const panels = [aiPanel, manualPanel];
  const rowsElement = root.querySelector(".builder-rows");
  const titleInput = root.querySelector(".title-input");
  const errorElement = root.querySelector(".builder-error");
  const generatedNotice = root.querySelector(".generated-notice");
  const warningPanel = root.querySelector(".workout-warning-panel");
  const warningList = root.querySelector(".workout-warning-list");
  const aiPrompt = root.querySelector(".ai-prompt");
  const aiForm = root.querySelector(".ai-form");
  const aiSubmitButton = root.querySelector(".ai-submit-button");
  const aiLoading = root.querySelector(".ai-loading");
  const aiError = root.querySelector(".ai-error");
  const aiPromptCount = root.querySelector(".ai-prompt-count");
  const assistantPrimaryButton = root.querySelector(".assistant-primary-button");
  const assistantControls = root.querySelector(".assistant-controls");
  const assistantFeedback = root.querySelector(".assistant-feedback");
  const summaryText = root.querySelector(".builder-summary-text");
  const durationNote = root.querySelector(".builder-duration-note");
  const targetNote = root.querySelector(".builder-target-note");
  const generation = createGenerationController(generateWorkout);
  let activeTab = editing ? "manual" : "ai";
  let generationMetadata = null;

  titleInput.value = editing ? editWorkout.title : preset?.title ?? "";
  const cancelGeneration = () => generation.cancel();
  window.addEventListener("pagehide", cancelGeneration, { once: true });

  function setActiveTab(tab, { moveFocus = false } = {}) {
    const nextIndex = tab === "manual" ? 1 : 0;
    const changed = activeTab !== tab;
    activeTab = tab;
    tabs.forEach((button, index) => {
      const selected = index === nextIndex;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
      panels[index].hidden = !selected;
    });
    if (changed) trackEvent("builder_tab_changed", { tab });
    if (moveFocus) tabs[nextIndex].focus();
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => setActiveTab(index === 0 ? "ai" : "manual"));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1) + tabs.length) % tabs.length;
      setActiveTab(nextIndex === 0 ? "ai" : "manual", { moveFocus: true });
    });
  });

  function renderRows() {
    rowsElement.replaceChildren();
    rows.forEach((row, index) => {
      const element = document.createElement("div");
      element.className = "builder-row";
      element.innerHTML = `<input class="amount-input" type="number" min="1" max="10000" step="1" inputmode="numeric" aria-label="Step ${index + 1} amount" /><select class="unit-input" aria-label="Step ${index + 1} unit"><option value="s">sec</option><option value="m">min</option><option value="x">reps</option></select><input class="text-input label-input" maxlength="${WORKOUT_LIMITS.maxLabelLength}" aria-label="Step ${index + 1} label" placeholder="Step label" /><button class="remove-step-button" type="button" aria-label="Remove step ${index + 1}">×</button>`;
      const amount = element.querySelector(".amount-input");
      const unit = element.querySelector(".unit-input");
      const label = element.querySelector(".label-input");
      amount.value = row.amount;
      unit.value = row.unit;
      label.value = row.label;
      amount.addEventListener("input", () => { row.amount = amount.value; clearGeneratedWarnings(); });
      unit.addEventListener("change", () => { row.unit = unit.value; clearGeneratedWarnings(); });
      label.addEventListener("input", () => { row.label = label.value; clearGeneratedWarnings(); });
      const remove = element.querySelector(".remove-step-button");
      remove.disabled = rows.length === 1;
      remove.addEventListener("click", () => { rows.splice(index, 1); clearGeneratedWarnings(); renderRows(); });
      rowsElement.append(element);
    });
    renderSummary();
  }

  function renderSummary() {
    const model = modelFromBuilderRows(titleInput.value, rows);
    const summary = validateWorkout(model) ? null : workoutSummary(model.steps);
    summaryText.textContent = summary?.text ?? "";
    summaryText.hidden = !summary;
    durationNote.hidden = !summary?.variesByPace;
    const requested = generationMetadata?.requestedDurationSeconds;
    const showTarget = summary?.variesByPace && Number.isFinite(requested) && requested > 0;
    targetNote.textContent = showTarget
      ? `Target: ~${formatNaturalDuration(requested)} · actual duration depends on your pace`
      : "";
    targetNote.hidden = !showTarget;
  }

  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  function getUrl() {
    const workout = modelFromBuilderRows(titleInput.value, rows);
    const result = serializeWorkout(workout, baseUrl);
    errorElement.hidden = result.ok;
    errorElement.textContent = result.ok ? "" : result.message;
    if (result.ok) trackEvent("workout_created", workoutParameters(workout.steps));
    return result;
  }

  async function copyToClipboard(text, feedback, message = "Copied!") {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      try {
        const area = document.createElement("textarea");
        area.value = text;
        document.body.append(area);
        try {
          area.select();
          if (!document.execCommand("copy")) throw new Error("Clipboard copy failed");
        } finally {
          area.remove();
        }
      } catch {
        setTextFeedback(feedback, "Couldn’t copy. Please copy manually.");
        return false;
      }
    }
    setTextFeedback(feedback, message);
    return true;
  }

  function setAiLoading(loading) {
    aiSubmitButton.disabled = loading;
    aiSubmitButton.textContent = loading ? "Generating workout…" : "Generate workout";
    aiForm.setAttribute("aria-busy", String(loading));
    aiLoading.hidden = !loading;
  }

  function showAiError(message) {
    aiError.textContent = message;
    aiError.hidden = !message;
  }

  function clearGeneratedWarnings() {
    generationMetadata = null;
    warningPanel.hidden = true;
    warningList.replaceChildren();
    renderSummary();
  }

  function showGeneratedWarnings(warnings) {
    const messages = warningMessages(warnings);
    warningList.replaceChildren(...messages.map((message) => {
      const item = document.createElement("li");
      item.textContent = message;
      return item;
    }));
    warningPanel.hidden = messages.length === 0;
    if (messages.length > 0) trackEvent("workout_generation_warning_shown");
  }

  function replaceManualDraft(workout) {
    titleInput.value = workout.title;
    rows = builderRowsFromWorkout(workout);
    manualBaseline = draftFingerprint(titleInput.value, rows);
    errorElement.hidden = true;
    renderRows();
  }

  async function submitAiPrompt(event) {
    event.preventDefault();
    if (generation.loading) return;
    clearGeneratedWarnings();
    trackEvent("ai_generate_submitted");
    const resultPromise = generation.submit(aiPrompt.value);
    if (generation.loading) {
      showAiError("");
      setAiLoading(true);
      trackEvent("ai_generate_started");
    }
    const result = await resultPromise;
    setAiLoading(false);
    if (result.status === "duplicate" || result.status === "cancelled") return;
    if (result.status === "validation_error") {
      showAiError(result.message);
      return;
    }
    if (result.status === "failure") {
      showAiError(friendlyApiError(result.error));
      if (result.error?.code !== "cancelled") trackEvent("ai_generate_failed");
      return;
    }
    if (result.response.result !== "workout") {
      showAiError(result.response.result === "unsafe" ? "I can help create workouts, but not medical or injury-treatment plans." : result.response.message);
      trackEvent("ai_generate_failed");
      return;
    }
    const normalized = normalizeGeneratedWorkout(result.response, baseUrl);
    if (!normalized.ok) {
      showAiError("I couldn’t create a valid workout. Please try again with a simpler request.");
      trackEvent("ai_generate_failed");
      return;
    }
    const response = normalized.response;
    const manualChanged = hasMeaningfulManualEdits(titleInput.value, rows, manualBaseline);
    if (manualChanged && !window.confirm("Replace your manual workout draft with the generated workout?")) return;
    showAiError("");
    replaceManualDraft(response.workout);
    generationMetadata = response.generation ?? null;
    renderSummary();
    generatedNotice.classList.remove("edit-notice");
    generatedNotice.textContent = "Workout generated. Review or edit it before starting.";
    generatedNotice.hidden = false;
    setActiveTab("manual");
    generatedNotice.focus();
    showGeneratedWarnings(response.warnings);
    if (response.generation?.repairAttempted) trackEvent("workout_generation_repaired");
    trackEvent("ai_generate_succeeded", workoutParameters(workoutStepsForAnalytics(response.workout)));
  }

  [EXAMPLE_PROMPTS[1], EXAMPLE_PROMPTS[2], EXAMPLE_PROMPTS[3]].forEach((prompt) => {
    const button = document.createElement("button");
    button.className = "example-prompt";
    button.type = "button";
    button.textContent = prompt;
    button.addEventListener("click", () => {
      aiPrompt.value = prompt;
      aiPrompt.dispatchEvent(new Event("input"));
      aiPrompt.focus();
    });
    root.querySelector(".ai-examples").append(button);
  });

  aiPrompt.addEventListener("input", () => {
    aiPromptCount.textContent = `${aiPrompt.value.length.toLocaleString()} / ${MAX_PROMPT_LENGTH.toLocaleString()}`;
    if (aiError.textContent) showAiError("");
  });
  titleInput.addEventListener("input", clearGeneratedWarnings);
  aiPrompt.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); aiForm.requestSubmit(); }
  });
  aiForm.addEventListener("submit", submitAiPrompt);

  root.querySelector(".add-step-button").addEventListener("click", () => {
    if (rows.length >= WORKOUT_LIMITS.maxSteps) return;
    rows.push({ amount: "30", unit: "s", label: "Work" });
    clearGeneratedWarnings();
    renderRows();
    rowsElement.lastElementChild.querySelector(".label-input").focus();
  });
  root.querySelector(".start-workout-button").addEventListener("click", () => {
    const result = getUrl();
    if (result.ok) window.location.assign(result.url);
  });
  root.querySelector(".manual-panel .copy-link-button").addEventListener("click", async () => {
    const result = getUrl();
    if (result.ok) {
      await copyToClipboard(result.url, root.querySelector(".copy-feedback"));
      trackEvent("workout_shared", workoutParameters(modelFromBuilderRows(titleInput.value, rows).steps));
    }
  });

  assistantPrimaryButton.addEventListener("click", async () => {
    await copyAssistantInstructions("Copy universal instructions", {
      copy: (text) => copyToClipboard(text, assistantFeedback, "Copied! Paste into your AI chat, then ask for a workout."),
      instructions: getAssistantInstructions("Copy universal instructions", baseUrl),
    });
  });

  ASSISTANT_PROVIDERS.filter((provider) => provider !== "Copy universal instructions").forEach((provider) => {
    const button = document.createElement("button");
    button.className = "assistant-button";
    button.type = "button";
    button.textContent = provider;
    button.setAttribute("aria-label", `Copy ${provider} instructions`);
    button.addEventListener("click", async () => {
      await copyAssistantInstructions(provider, {
        copy: (text) => copyToClipboard(text, assistantFeedback, `${provider} instructions copied.`),
        instructions: getAssistantInstructions(provider, baseUrl),
      });
    });
    assistantControls.append(button);
  });

  renderRows();

  if (editing) {
    const notice = root.querySelector(".edit-notice");
    notice.focus();
    notice.scrollIntoView?.({ block: "center", behavior: "smooth" });
  }

  return () => {
    generation.cancel();
    window.removeEventListener("pagehide", cancelGeneration);
  };
}
