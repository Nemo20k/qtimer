import { serializeWorkout } from "./workout.js";
import { siteFooterMarkup } from "./site-footer.js";

const HIIT_STEPS = [
  [40, "Work"], [20, "Rest"],
  [40, "Work"], [20, "Rest"],
  [40, "Work"], [20, "Rest"],
  [40, "Work"], [20, "Rest"],
].map(([value, label]) => ({ type: "time", value, label }));

const TABATA_STEPS = Array.from({ length: 8 }, (_, index) => [
  { type: "time", value: 20, label: `Work · Round ${index + 1}` },
  { type: "time", value: 10, label: `Rest · Round ${index + 1}` },
]).flat();

const EMOM_STEPS = [
  "10 squats",
  "8 push-ups",
  "10 alternating lunges",
  "8 burpees",
  "30-second plank",
].map((label) => ({ type: "time", value: 60, label }));

export const LANDING_PAGES = Object.freeze({
  "/hiit-timer": {
    path: "/hiit-timer",
    sourcePage: "hiit_timer",
    builderHash: "#hiit",
    title: "Free HIIT Timer – Custom Interval Workout Timer | QTimer",
    description: "Create and run custom HIIT interval workouts online. Set work, rest and exercise intervals and start instantly with no signup.",
    heading: "Free HIIT Timer",
    intro: "A HIIT interval timer alternates periods of hard work and recovery so you can focus on the workout instead of watching the clock.",
    formatTitle: "Starter interval workout",
    formatDescription: "Four rounds of 40 seconds work and 20 seconds rest.",
    facts: ["40 seconds work", "20 seconds rest", "4 rounds"],
    steps: HIIT_STEPS,
    startLabel: "Start HIIT workout",
  },
  "/tabata-timer": {
    path: "/tabata-timer",
    sourcePage: "tabata_timer",
    builderHash: "#tabata",
    title: "Free Tabata Timer – Online 20/10 Workout Timer | QTimer",
    description: "Run a free Tabata timer online with the classic 20 seconds work, 10 seconds rest format. Customize rounds and exercises and start instantly.",
    heading: "Free Tabata Timer",
    intro: "Classic Tabata uses short, repeatable intervals: work hard, recover briefly, and repeat the pattern while QTimer keeps the rounds moving.",
    formatTitle: "Classic Tabata format",
    formatDescription: "The ready-to-run preset follows the traditional eight-round structure.",
    facts: ["20 seconds work", "10 seconds rest", "8 rounds"],
    steps: TABATA_STEPS,
    startLabel: "Start Tabata workout",
  },
  "/emom-timer": {
    path: "/emom-timer",
    sourcePage: "emom_timer",
    builderHash: "#emom",
    title: "Free EMOM Timer – Every Minute on the Minute | QTimer",
    description: "Run an EMOM workout timer online. Build minute-by-minute workouts, customize exercises and start instantly with no signup.",
    heading: "Free EMOM Timer",
    intro: "EMOM means every minute on the minute: start the prescribed work at the beginning of each minute, then use the remaining time to rest.",
    formatTitle: "Ready-to-run EMOM example",
    formatDescription: "Complete the listed movement at the start of each minute and rest until the next minute begins.",
    facts: ["1 minute per exercise", "5 exercises", "Rest within each minute"],
    steps: EMOM_STEPS,
    startLabel: "Start EMOM workout",
  },
});

function normalizedPath(pathname) {
  const withoutIndex = pathname.replace(/\/index\.html$/, "");
  return withoutIndex.length > 1 ? withoutIndex.replace(/\/$/, "") : "/";
}

export function getLandingPage(pathname = "") {
  return LANDING_PAGES[normalizedPath(pathname)] ?? null;
}

export function presetUrl(page, origin = "") {
  const result = serializeWorkout({ title: page.heading, steps: page.steps }, `${origin}${page.path}`);
  if (!result.ok) throw new Error(result.message);
  return result.url;
}

export function builderRowsFor(page) {
  return page.steps.map((step) => ({
    amount: String(step.value),
    unit: step.type === "reps" ? "x" : "s",
    label: step.label,
  }));
}

export function getBuilderPreset(hash = "") {
  const page = Object.values(LANDING_PAGES).find((candidate) => candidate.builderHash === hash);
  return page ? { title: page.heading, rows: builderRowsFor(page) } : null;
}

export function applyLandingMetadata(page) {
  const routeUrl = "https://qtimer.app" + page.path;
  document.title = page.title;
  const description = document.querySelector("meta[name=description]");
  if (description) description.content = page.description;
  const canonical = document.querySelector("link[rel=canonical]");
  if (canonical) canonical.href = routeUrl;
  for (const [property, content] of [["og:title", page.title], ["og:description", page.description], ["og:url", routeUrl], ["twitter:title", page.title], ["twitter:description", page.description]]) {
    const element = document.querySelector('meta[property="' + property + '"], meta[name="' + property + '"]');
    if (element) element.content = content;
  }
}

export function applyMainMetadata() {
  const title = "QTimer – Free Custom Workout & Interval Timer";
  const description = "Create and run custom workout timers for HIIT, Tabata, EMOM, circuits and more. Build a workout, share the link, and start instantly. No signup required.";
  document.title = title;
  const descriptionElement = document.querySelector("meta[name=description]");
  if (descriptionElement) descriptionElement.content = description;
  const canonical = document.querySelector("link[rel=canonical]");
  if (canonical) canonical.href = "https://qtimer.app/";
  for (const [property, content] of [["og:title", title], ["og:description", description], ["og:url", "https://qtimer.app/"], ["twitter:title", title], ["twitter:description", description]]) {
    const element = document.querySelector('meta[property="' + property + '"], meta[name="' + property + '"]');
    if (element) element.content = content;
  }
}

export function mountLandingPage(root, page) {
  const startUrl = presetUrl(page, window.location.origin);
  document.body.classList.add("landing-page");
  root.innerHTML = `
    <main class="landing-shell preset-landing">
      <header class="landing-header">
        <a class="brand" href="/">qtimer</a>
        <h1>${page.heading}</h1>
        <p class="landing-lede">${page.intro}</p>
      </header>
      <section class="preset-card" aria-labelledby="preset-title">
        <p class="eyebrow">READY-TO-RUN PRESET</p>
        <h2 id="preset-title">${page.formatTitle}</h2>
        <p>${page.formatDescription}</p>
        <ul class="preset-facts">${page.facts.map((fact) => `<li>${fact}</li>`).join("")}</ul>
        <div class="landing-actions">
          <a class="primary-button landing-action" href="${startUrl}">${page.startLabel}</a>
          <a class="secondary-link" href="/${page.builderHash}">Customize in the QTimer builder</a>
        </div>
      </section>
      <section class="landing-links" aria-labelledby="more-timers-title">
        <h2 id="more-timers-title">More workout timers</h2>
        <p>Need a different interval format? Try another QTimer preset or build a custom workout from scratch.</p>
        <nav aria-label="Workout timer types">
          <a href="/hiit-timer">HIIT timer</a>
          <a href="/tabata-timer">Tabata timer</a>
          <a href="/emom-timer">EMOM timer</a>
          <a href="/">Custom workout builder</a>
        </nav>
      </section>
      ${siteFooterMarkup()}
    </main>
  `;
}
