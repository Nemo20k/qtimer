import test from "node:test";
import assert from "node:assert/strict";
import { copyAssistantInstructions, getAssistantInstructions } from "../src/ai-assistant.js";

test("Gemini instructions require a raw URL in a Markdown code block", () => {
  const instructions = getAssistantInstructions("Gemini", "https://qtimer.app/");

  assert.equal(instructions, `When creating a workout that benefits from guided execution, provide the QTimer link as plain text inside a fenced Markdown code block so the user can copy it directly. Do not use Markdown link syntax, hyperlink the URL, or replace it with a Google search or redirect link.

Base URL:
[https://qtimer.app/](https://qtimer.app/)

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
\`\`\``);
  assert.match(instructions, /fenced Markdown code block/);
  assert.match(instructions, /Do not use Markdown link syntax/);
  assert.match(instructions, /```text[\s\S]+https:\/\/qtimer\.app\/\?/);
  assert.doesNotMatch(instructions, /\[▶ Copy workout timer URL\]\(/);
});

test("ChatGPT instructions require the copy label to be a clickable Markdown link", () => {
  const instructions = getAssistantInstructions("ChatGPT", "https://qtimer.app/");

  assert.match(instructions, /The link text must be clickable/);
  assert.match(instructions, /do not output the label as plain text by itself/);
  assert.match(instructions, /\[▶ Copy workout timer URL\]\(https:\/\/qtimer\.app\/\?/);
});

test("assistant controls use provider-specific instructions where needed", async () => {
  const copied = [];
  const events = [];
  for (const provider of ["ChatGPT", "Claude", "Gemini", "Copy universal instructions"]) {
    await copyAssistantInstructions(provider, {
      instructions: getAssistantInstructions(provider, "https://qtimer.app/"),
      copy: async (text) => copied.push(text),
      track: (name, parameters) => events.push([name, parameters]),
    });
  }
  assert.equal(new Set(copied).size, 3);
  assert.equal(copied[1], copied[3]);
  assert.notEqual(copied[0], copied[2]);
  assert.notEqual(copied[0], copied[1]);
  assert.notEqual(copied[2], copied[1]);
  assert.deepEqual(events.map(([name, parameters]) => [name, parameters.provider]), [
    ["instructions_copied", "ChatGPT"],
    ["instructions_copied", "Claude"],
    ["instructions_copied", "Gemini"],
    ["instructions_copied", "Copy universal instructions"],
  ]);
});

test("failed instruction copies do not track a copied event", async () => {
  const events = [];

  const copied = await copyAssistantInstructions("Copy universal instructions", {
    instructions: "instructions",
    copy: async () => false,
    track: (name) => events.push(name),
  });

  assert.equal(copied, false);
  assert.deepEqual(events, []);
});
