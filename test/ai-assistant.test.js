import test from "node:test";
import assert from "node:assert/strict";
import { copyAssistantInstructions, getAssistantInstructions } from "../src/ai-assistant.js";

test("all assistant controls currently share the universal QTimer instructions", async () => {
  const copied = [];
  const events = [];
  for (const provider of ["ChatGPT", "Claude", "Gemini", "Copy universal instructions"]) {
    await copyAssistantInstructions(provider, {
      instructions: getAssistantInstructions(provider, "https://qtimer.app/"),
      copy: async (text) => copied.push(text),
      track: (name, parameters) => events.push([name, parameters]),
    });
  }
  assert.equal(new Set(copied).size, 1);
  assert.deepEqual(events.map(([name, parameters]) => [name, parameters.provider]), [
    ["instructions_copied", "ChatGPT"],
    ["instructions_copied", "Claude"],
    ["instructions_copied", "Gemini"],
    ["instructions_copied", "Copy universal instructions"],
  ]);
});
