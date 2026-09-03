import { parseTimerUrl } from "./parser.js";
import { TimerEngine } from "./timer-engine.js";
import { mountApp, renderError } from "./ui.js";
import { mountBuilder } from "./builder.js";
import "./styles.css";

const result = parseTimerUrl(window.location.search);
const root = document.querySelector("#app");

if (window.location.search === "") {
  mountBuilder(root);
} else if (!result.ok) {
  renderError(root, result.message);
} else {
  const engine = new TimerEngine(result.steps);
  mountApp(root, result, engine);
}
