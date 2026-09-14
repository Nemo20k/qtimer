import { MAX_PROMPT_LENGTH } from "./api-client.js";

export function validatePrompt(text) {
  const trimmed = typeof text === "string" ? text.trim() : "";
  if (!trimmed) return "Describe the workout you want to create.";
  if (trimmed.length > MAX_PROMPT_LENGTH) return `Keep your description to ${MAX_PROMPT_LENGTH.toLocaleString()} characters or fewer.`;
  return "";
}

export function createGenerationController(generate) {
  let pending = null;
  let abortController = null;

  return {
    get loading() {
      return pending !== null;
    },
    async submit(text) {
      if (pending) return { status: "duplicate" };
      const validationError = validatePrompt(text);
      if (validationError) return { status: "validation_error", message: validationError };

      abortController = new AbortController();
      const request = Promise.resolve().then(() => generate(text.trim(), { signal: abortController.signal }));
      pending = request;
      try {
        return { status: "success", response: await request };
      } catch (error) {
        return { status: error?.code === "cancelled" ? "cancelled" : "failure", error };
      } finally {
        if (pending === request) pending = null;
        abortController = null;
      }
    },
    cancel() {
      abortController?.abort();
    },
  };
}
