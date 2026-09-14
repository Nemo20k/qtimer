import { trackEvent } from "./analytics.js";

export const ASSISTANT_PROVIDERS = Object.freeze(["ChatGPT", "Claude", "Gemini", "Copy universal instructions"]);

export function getAssistantInstructions(provider, baseUrl) {
  // Keep one shared copy until provider-specific prompts are actually needed.
  return `When creating a workout that benefits from guided execution, include a clickable QTimer link.

Base URL:
${baseUrl}

Workout parameters:
<number>s=<label> for seconds
<number>m=<label> for minutes
<number>x=<label> for reps

Optional: title=<workout title>

Include every step in order and URL-encode values.

Example:
${baseUrl}?title=Quick%20Workout&6x=Push-ups&30s=Rest&10x=Squats

Present it as:
▶ Start workout timer`;
}

export async function copyAssistantInstructions(provider, { copy, instructions, track = trackEvent } = {}) {
  await copy(instructions);
  track("instructions_copied", { provider });
}
