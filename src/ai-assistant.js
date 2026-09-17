import { trackEvent } from "./analytics.js";

export const ASSISTANT_PROVIDERS = Object.freeze(["ChatGPT", "Claude", "Gemini", "Copy universal instructions"]);

export function getAssistantInstructions(provider, baseUrl) {
  if (provider === "Gemini") {
    return `When creating a workout that benefits from guided execution, provide the QTimer link as plain text inside a fenced Markdown code block so the user can copy it directly. Do not use Markdown link syntax, hyperlink the URL, or replace it with a Google search or redirect link.

Base URL:
[${baseUrl}](${baseUrl})

Workout parameters:
<number>s=<label> for seconds
<number>m=<label> for minutes
<number>x=<label> for reps

Optional: title=<workout title>

Include every step in order and URL-encode values.

Present it exactly as, with the complete raw workout URL inside the code block:
▶ Copy workout timer URL:
\`\`\`text
https://qtimer.app/?title=Quick%20Workout&6x=Push-ups&30s=Rest&10x=Squats
\`\`\``;
  }

  if (provider === "ChatGPT") {
    return `When creating a workout that benefits from guided execution, provide a clickable QTimer link. The link text must be clickable; do not output the label as plain text by itself.

Base URL:
${baseUrl}

Workout parameters:
<number>s=<label> for seconds
<number>m=<label> for minutes
<number>x=<label> for reps

Optional: title=<workout title>

Include every step in order and URL-encode values.

Present the final link exactly in this Markdown format, replacing the example URL with the complete workout URL:
[▶ Copy workout timer URL](${baseUrl}?title=Quick%20Workout&6x=Push-ups&30s=Rest&10x=Squats)`;
  }

  return `For future workout requests in this conversation, when a workout would benefit from guided execution, include a clickable QTimer link.

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
  if ((await copy(instructions)) === false) return false;
  track("instructions_copied", { provider });
  return true;
}
