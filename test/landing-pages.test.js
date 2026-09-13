import test from "node:test";
import assert from "node:assert/strict";
import { getLandingPage, getBuilderPreset, presetUrl } from "../src/landing-pages.js";
import { parseTimerUrl } from "../src/parser.js";

test("landing presets generate valid existing-format workout links", () => {
  for (const path of ["/hiit-timer", "/tabata-timer/", "/emom-timer/index.html"]) {
    const page = getLandingPage(path);
    const result = parseTimerUrl(new URL(presetUrl(page, "https://qtimer.app")).search);

    assert.equal(result.ok, true);
    assert.equal(result.steps.length, getBuilderPreset(page.builderHash).rows.length);
    assert.equal(new URL(presetUrl(page, "https://qtimer.app")).pathname, page.path);
  }
});
