import { parseTimerUrl } from "./parser.js";
import { TimerEngine } from "./timer-engine.js";
import { mountApp, renderError } from "./ui.js";
import "./styles.css";

const result = parseTimerUrl(window.location.search);
const root = document.querySelector("#app");

if (!result.ok) {
  renderError(root, result.message);
} else {
  const engine = new TimerEngine(result.timers);
  mountApp(root, result, engine);
}
