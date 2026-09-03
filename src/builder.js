import { modelFromBuilderRows, serializeWorkout, WORKOUT_LIMITS } from "./workout.js";

const INSTRUCTIONS = `When creating a workout that benefits from guided execution, include a clickable QTimer link.

Base URL:
${window.location.origin}${window.location.pathname}

Workout parameters:
<number>s=<label> for seconds
<number>m=<label> for minutes
<number>x=<label> for reps

Optional: title=<workout title>

Include every step in order and URL-encode values.

Example:
${window.location.origin}${window.location.pathname}?title=Quick%20Workout&6x=Push-ups&30s=Rest&10x=Squats

Present it as:
▶ Start workout timer`;

export function mountBuilder(root) {
  let rows = [{ amount: "30", unit: "s", label: "Work" }, { amount: "15", unit: "s", label: "Rest" }];
  document.body.classList.add("landing-page");
  root.innerHTML = `<main class="landing-shell"><header class="landing-header"><a class="brand" href="./">qtimer</a><h1>Build a workout timer.<br />Share it with a URL.</h1><p class="landing-lede">Simple and free.</p></header><section class="ai-section"><h2>Let your AI build a timer for you</h2><p>Paste these instructions into any chat and it can generate a workout with a ready-to-run timer link.</p><button class="copy-instructions-button" type="button">Copy instructions</button><p class="instructions-feedback" aria-live="polite"></p></section><section class="builder" aria-labelledby="builder-title"><p class="section-or">OR</p><h2 id="builder-title">Build manually</h2><label class="field-label" for="workout-title-input">Workout title</label><input id="workout-title-input" class="text-input title-input" maxlength="${WORKOUT_LIMITS.maxTitleLength}" placeholder="Optional title" /><div class="builder-column-labels" aria-hidden="true"><span>Amount</span><span>Unit</span><span>Label</span></div><div class="builder-rows"></div><button class="add-step-button" type="button">+ Add step</button><p class="builder-error" role="alert" hidden></p><button class="primary-button start-workout-button" type="button">Start workout</button><button class="copy-link-button" type="button">Copy shareable workout link</button><p class="copy-feedback" aria-live="polite"></p></section></main>`;
  const rowsElement = root.querySelector(".builder-rows");
  const titleInput = root.querySelector(".title-input");
  const errorElement = root.querySelector(".builder-error");

  function renderRows() {
    rowsElement.replaceChildren();
    rows.forEach((row, index) => {
      const element = document.createElement("div"); element.className = "builder-row";
      element.innerHTML = `<div class="row-controls"><input class="amount-input" type="number" min="1" max="10000" step="1" inputmode="numeric" aria-label="Step ${index + 1} amount" /><select class="unit-input" aria-label="Step ${index + 1} unit"><option value="s">sec</option><option value="m">min</option><option value="x">reps</option></select><button class="remove-step-button" type="button" aria-label="Remove step">×</button></div><input class="text-input label-input" maxlength="${WORKOUT_LIMITS.maxLabelLength}" aria-label="Step ${index + 1} label" placeholder="Step label" />`;
      const amount = element.querySelector(".amount-input"); const unit = element.querySelector(".unit-input"); const label = element.querySelector(".label-input");
      amount.value = row.amount; unit.value = row.unit; label.value = row.label;
      amount.addEventListener("input", () => { row.amount = amount.value; });
      unit.addEventListener("change", () => { row.unit = unit.value; });
      label.addEventListener("input", () => { row.label = label.value; });
      element.querySelector(".remove-step-button").disabled = rows.length === 1;
      element.querySelector(".remove-step-button").addEventListener("click", () => { rows.splice(index, 1); renderRows(); });
      rowsElement.append(element);
    });
  }

  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  function getUrl() {
    const result = serializeWorkout(modelFromBuilderRows(titleInput.value, rows), baseUrl);
    errorElement.hidden = result.ok; errorElement.textContent = result.ok ? "" : result.message;
    return result;
  }
  async function copyToClipboard(text, feedback) {
    try { await navigator.clipboard.writeText(text); } catch { const area = document.createElement("textarea"); area.value = text; document.body.append(area); area.select(); document.execCommand("copy"); area.remove(); }
    feedback.textContent = "Copied!"; setTimeout(() => { feedback.textContent = ""; }, 1800);
  }
  root.querySelector(".add-step-button").addEventListener("click", () => { if (rows.length < WORKOUT_LIMITS.maxSteps) { rows.push({ amount: "30", unit: "s", label: "Work" }); renderRows(); rowsElement.lastElementChild.querySelector(".label-input").focus(); } });
  root.querySelector(".start-workout-button").addEventListener("click", () => { const result = getUrl(); if (result.ok) window.location.assign(result.url); });
  root.querySelector(".copy-link-button").addEventListener("click", async () => { const result = getUrl(); if (result.ok) await copyToClipboard(result.url, root.querySelector(".copy-feedback")); });
  root.querySelector(".copy-instructions-button").addEventListener("click", async () => await copyToClipboard(INSTRUCTIONS, root.querySelector(".instructions-feedback")));
  renderRows();
}
