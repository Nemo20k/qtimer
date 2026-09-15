const MEASUREMENT_ID = "G-M496SBC03Q";
const SAFE_EVENT_NAMES = new Set([
  "page_view",
  "edit_mode_opened_successfully",
  "invalid_edit_url_encountered",
  "builder_tab_changed",
  "workout_created",
  "workout_generation_warning_shown",
  "ai_generate_submitted",
  "ai_generate_started",
  "ai_generate_failed",
  "workout_generation_repaired",
  "ai_generate_succeeded",
  "workout_shared",
  "instructions_copied",
  "wake_lock_acquired",
  "wake_lock_unsupported",
  "wake_lock_failed",
  "active_workout_edit_cancelled",
  "workout_started",
  "workout_completed",
  "workout_paused",
  "workout_resumed",
  "active_workout_edit_confirmed",
  "ai_workout_started",
  "ai_workout_copied",
  "ai_workout_edited",
]);

const SAFE_VALUES = {
  source_page: new Set(["hiit_timer", "tabata_timer", "emom_timer"]),
  tab: new Set(["ai", "manual"]),
  interaction_source: new Set(["background", "button", "keyboard"]),
  provider: new Set(["ChatGPT", "Claude", "Gemini", "Copy universal instructions"]),
  error_name: new Set(["AbortError", "InvalidStateError", "NotAllowedError", "SecurityError"]),
};

function durationBucket(seconds) {
  if (seconds < 300) return "under_5m";
  if (seconds < 900) return "5_15m";
  if (seconds < 1_800) return "15_30m";
  if (seconds < 3_600) return "30_60m";
  return "60m_plus";
}

function sanitizeParameters(parameters) {
  const safe = {};
  for (const [key, value] of Object.entries(parameters ?? {})) {
    if (key === "step_count" || key === "timed_step_count" || key === "rep_step_count") {
      if (Number.isInteger(value) && value >= 0 && value <= 200) safe[key] = value;
    } else if (key === "duration_bucket" && typeof value === "string" && /^(under_5m|5_15m|15_30m|30_60m|60m_plus)$/.test(value)) {
      safe[key] = value;
    } else if (SAFE_VALUES[key]?.has(value)) {
      safe[key] = value;
    }
  }
  return safe;
}

function safePathname() {
  const pathname = (globalThis.location?.pathname || "/").split(/[?#]/, 1)[0] || "/";
  if (pathname === "/") return "/";
  const normalized = pathname.replace(/\/index\.html$/, "/");
  return normalized.endsWith("/") ? normalized : `${normalized}/`;
}

function screenName(pathname) {
  return {
    "/": "home",
    "/privacy/": "privacy",
    "/contact/": "contact",
    "/hiit-timer/": "hiit_timer",
    "/tabata-timer/": "tabata_timer",
    "/emom-timer/": "emom_timer",
  }[pathname] || "app";
}

export function initAnalytics() {
  try {
    if (globalThis.__qtimerAnalyticsInitialized) return;
    if (!Array.isArray(globalThis.dataLayer)) globalThis.dataLayer = [];
    if (typeof globalThis.gtag !== "function") globalThis.gtag = (...args) => globalThis.dataLayer.push(args);
    globalThis.__qtimerAnalyticsInitialized = true;
    const pathname = safePathname();
    globalThis.gtag("config", MEASUREMENT_ID, { send_page_view: false });
    globalThis.gtag("event", "page_view", {
      page_path: pathname,
      page_location: `${globalThis.location?.origin || "https://qtimer.app"}${pathname}`,
      screen_name: screenName(pathname),
    });
  } catch {
    // Analytics must never affect the application.
  }
}

export function trackEvent(name, parameters = {}) {
  try {
    if (SAFE_EVENT_NAMES.has(name) && typeof globalThis.gtag === "function") {
      globalThis.gtag("event", name, sanitizeParameters(parameters));
    }
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
    duration_bucket: durationBucket(timedSteps.reduce((total, step) => total + step.value, 0)),
  };
}

export function workoutStartedParameters(steps, sourcePage) {
  const parameters = workoutParameters(steps);
  if (sourcePage) parameters.source_page = sourcePage;
  return parameters;
}
