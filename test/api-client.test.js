import test from "node:test";
import assert from "node:assert/strict";
import { ApiClientError, generateWorkout } from "../src/api-client.js";

function response(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, async json() { return body; } };
}

const workout = {
  result: "workout",
  mode: "generated",
  workout: { title: "Quick workout", steps: [{ type: "time", seconds: 30, label: "Work" }, { type: "reps", reps: 8, label: "Squats" }] },
  warnings: ["Use a stable surface."],
  url: "https://qtimer.app/?title=Quick+workout&30s=Work&8x=Squats",
};

test("posts the prompt and returns a successful workout response", async () => {
  let request;
  const result = await generateWorkout("  Create a workout  ", {
    baseUrl: "http://localhost:8787",
    fetchImpl: async (url, options) => { request = { url, options }; return response(workout); },
  });

  assert.deepEqual(result, workout);
  assert.equal(request.url, "http://localhost:8787/v1/workouts/generate");
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(request.options.body), { text: "Create a workout" });
});

test("models unsupported responses as a non-workout result", async () => {
  const result = await generateWorkout("Explain quantum mechanics", {
    fetchImpl: async () => response({ result: "unsupported", message: "Try describing a workout." }),
  });
  assert.deepEqual(result, { result: "unsupported", message: "Try describing a workout." });
});

test("rejects empty and overlong prompts before making a request", async () => {
  let calls = 0;
  const options = { fetchImpl: async () => { calls += 1; return response(workout); } };
  await assert.rejects(generateWorkout("   ", options), (error) => error instanceof ApiClientError && error.code === "invalid_request");
  await assert.rejects(generateWorkout("x".repeat(2_001), options), (error) => error instanceof ApiClientError && error.code === "invalid_request");
  assert.equal(calls, 0);
});

test("maps API errors and network failures without exposing the response body", async () => {
  await assert.rejects(
    generateWorkout("make a workout", { fetchImpl: async () => response({ error: { code: "rate_limited", message: "internal provider detail" } }, 429) }),
    (error) => error instanceof ApiClientError && error.code === "rate_limited" && !error.message.includes("internal"),
  );
  await assert.rejects(
    generateWorkout("make a workout", { fetchImpl: async () => { throw new Error("secret network detail"); } }),
    (error) => error instanceof ApiClientError && error.code === "network_error" && !error.message.includes("secret"),
  );
});

test("rejects malformed successful responses", async () => {
  await assert.rejects(
    generateWorkout("make a workout", { fetchImpl: async () => response({ result: "workout", workout: {} }) }),
    (error) => error instanceof ApiClientError && error.code === "invalid_response",
  );
});
