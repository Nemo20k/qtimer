import { parseTimerUrl } from "./parser.js";
import { TimerEngine } from "./timer-engine.js";
import { mountApp, renderError } from "./ui.js";
import { mountBuilder } from "./builder.js";
import { applyLandingMetadata, applyMainMetadata, getLandingPage, mountLandingPage } from "./landing-pages.js";
import { initAnalytics, trackEvent } from "./analytics.js";

import "./styles.css";

initAnalytics();

const root = document.querySelector("#app");
let unmount = null;

function withoutEditHash() {
  window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}`);
}

function enterEditMode() {
  window.history.pushState({}, "", `${window.location.pathname}${window.location.search}#edit`);
  renderApp();
}

function renderApp() {
  unmount?.();
  unmount = null;

  const result = parseTimerUrl(window.location.search);
  const landingPage = getLandingPage(window.location.pathname);
  if (landingPage && window.location.search === "") applyLandingMetadata(landingPage);
  else if (window.location.search !== "") applyMainMetadata();

  if (window.location.hash === "#edit") {
    if (result.ok) {
      unmount = mountBuilder(root, { editWorkout: result });
      trackEvent("edit_mode_opened_successfully");
      return;
    }
    trackEvent("invalid_edit_url_encountered");
    withoutEditHash();
  }

  if (window.location.search === "") {
    if (landingPage) mountLandingPage(root, landingPage);
    else unmount = mountBuilder(root);
  } else if (!result.ok) {
    document.body.classList.remove("landing-page");
    renderError(root, result.message);
  } else {
    const engine = new TimerEngine(result.steps);
    unmount = mountApp(root, result, engine, {
      sourcePage: landingPage?.sourcePage,
      onEdit: enterEditMode,
    });
  }
}

window.addEventListener("hashchange", renderApp);
window.addEventListener("popstate", renderApp);
renderApp();
