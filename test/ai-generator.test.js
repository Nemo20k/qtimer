import test from "node:test";
import assert from "node:assert/strict";
import { createGenerationController, validatePrompt } from "../src/ai-generator.js";

test("validates empty and overlong prompts", () => {
  assert.match(validatePrompt(""), /Describe/);
  assert.match(validatePrompt("x".repeat(2_001)), /2,000/);
  assert.equal(validatePrompt("Create a workout"), "");
});

test("shows loading and prevents duplicate submissions", async () => {
  let resolve;
  let calls = 0;
  const controller = createGenerationController(async () => {
    calls += 1;
    return new Promise((done) => { resolve = done; });
  });

  const first = controller.submit("Create a workout");
  assert.equal(controller.loading, true);
  const duplicate = controller.submit("Create another workout");
  assert.equal(controller.loading, true);
  assert.equal(calls, 0);
  assert.deepEqual(await duplicate, { status: "duplicate" });
  await Promise.resolve();
  assert.equal(calls, 1);
  resolve({ result: "unsupported", message: "Not a workout" });
  assert.deepEqual(await first, { status: "success", response: { result: "unsupported", message: "Not a workout" } });
  assert.equal(controller.loading, false);
});
