const DEFAULT_API_BASE_URL = "https://qtimer-api.nemo20k.workers.dev";
export const MAX_PROMPT_LENGTH = 2_000;

/**
 * @typedef {{ type: "time", seconds: number, label: string } | { type: "reps", reps: number, label: string }} ApiWorkoutStep
 * @typedef {{ title: string, steps: ApiWorkoutStep[] }} ApiWorkout
 * @typedef {{ code: "DURATION_MISMATCH" | "DURATION_NOT_VERIFIABLE" | "DURATION_APPROXIMATE", message: string }} WorkoutWarning
 * @typedef {{ repairAttempted: boolean, repairSucceeded: boolean, requestedDurationSeconds: number | null, timedDurationSeconds: number, hasRepSteps: boolean }} GenerationMetadata
 * @typedef {{ result: "workout", mode: "generated" | "converted", workout: ApiWorkout, warnings?: (string | WorkoutWarning)[], generation?: GenerationMetadata, url: string }} WorkoutResponse
 * @typedef {{ result: "unsupported" | "unsafe", message: string }} NonWorkoutResponse
 * @typedef {WorkoutResponse | NonWorkoutResponse} GenerateWorkoutResponse
 * @typedef {{ code: "invalid_request" | "rate_limited" | "invalid_ai_response" | "provider_unavailable" | "workout_url_too_long" | "not_found" | "method_not_allowed", message: string }} ApiErrorBody
 */

export class ApiClientError extends Error {
  /** @param {ApiErrorBody["code"] | "network_error" | "invalid_response" | "cancelled"} code @param {number} [status] */
  constructor(code, status = 0) {
    super(code);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
  }
}

function isRecord(value) {
  return typeof value === "object" && value !== null;
}

function isWorkoutStep(value) {
  if (!isRecord(value) || typeof value.label !== "string" || !value.label) return false;
  if (value.type === "time") return Number.isInteger(value.seconds) && value.seconds > 0;
  if (value.type === "reps") return Number.isInteger(value.reps) && value.reps > 0;
  return false;
}

function isWarning(value) {
  return typeof value === "string"
    || (isRecord(value)
      && ["DURATION_MISMATCH", "DURATION_NOT_VERIFIABLE", "DURATION_APPROXIMATE"].includes(value.code)
      && typeof value.message === "string");
}

function isGenerationMetadata(value) {
  return isRecord(value)
    && typeof value.repairAttempted === "boolean"
    && typeof value.repairSucceeded === "boolean"
    && (value.requestedDurationSeconds === null || typeof value.requestedDurationSeconds === "number")
    && Number.isFinite(value.timedDurationSeconds)
    && typeof value.hasRepSteps === "boolean";
}

function isGenerateWorkoutResponse(value) {
  if (!isRecord(value) || typeof value.result !== "string") return false;
  if (value.result === "unsupported" || value.result === "unsafe") return typeof value.message === "string" && value.message.length > 0;
  return value.result === "workout"
    && (value.mode === "generated" || value.mode === "converted")
    && isRecord(value.workout)
    && typeof value.workout.title === "string"
    && Array.isArray(value.workout.steps)
    && value.workout.steps.length > 0
    && value.workout.steps.every(isWorkoutStep)
    && (value.warnings === undefined || (Array.isArray(value.warnings) && value.warnings.every(isWarning)))
    && (value.generation === undefined || isGenerationMetadata(value.generation))
    && typeof value.url === "string"
    && value.url.length > 0;
}

function getApiBaseUrl() {
  return (import.meta.env?.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/+$/, "");
}

function getErrorCode(value) {
  if (!isRecord(value) || !isRecord(value.error) || typeof value.error.code !== "string") return "invalid_response";
  return value.error.code;
}

/**
 * @param {string} text
 * @param {{ fetchImpl?: typeof fetch, signal?: AbortSignal, baseUrl?: string }} [options]
 * @returns {Promise<GenerateWorkoutResponse>}
 */
export async function generateWorkout(text, { fetchImpl = globalThis.fetch, signal, baseUrl = getApiBaseUrl() } = {}) {
  const normalizedText = typeof text === "string" ? text.trim() : "";
  if (!normalizedText || normalizedText.length > MAX_PROMPT_LENGTH) throw new ApiClientError("invalid_request", 400);
  if (typeof fetchImpl !== "function") throw new ApiClientError("network_error");

  let response;
  try {
    response = await fetchImpl(`${baseUrl}/v1/workouts/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: normalizedText }),
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") throw new ApiClientError("cancelled");
    throw new ApiClientError("network_error");
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw new ApiClientError("invalid_response", response.status);
  }

  if (!response.ok) throw new ApiClientError(getErrorCode(body), response.status);
  if (!isGenerateWorkoutResponse(body)) throw new ApiClientError("invalid_response", response.status);
  return body;
}
