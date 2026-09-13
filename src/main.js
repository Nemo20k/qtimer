import { parseTimerUrl } from "./parser.js";
import { TimerEngine } from "./timer-engine.js";
import { mountApp, renderError } from "./ui.js";
import { mountBuilder } from "./builder.js";
import { applyLandingMetadata, getLandingPage, mountLandingPage } from "./landing-pages.js";

import "./styles.css";

const result = parseTimerUrl(window.location.search);
const root = document.querySelector("#app");
const landingPage = getLandingPage(window.location.pathname);
if (landingPage) applyLandingMetadata(landingPage);

if (window.location.search === "") {
  if (landingPage) mountLandingPage(root, landingPage);
  else mountBuilder(root);
} else if (!result.ok) {
  renderError(root, result.message);
} else {
  const engine = new TimerEngine(result.steps);
  mountApp(root, result, engine, { sourcePage: landingPage?.sourcePage });
}
