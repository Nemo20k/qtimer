import test from "node:test";
import assert from "node:assert/strict";
import { cancelSpeech, speakLabel } from "../src/audio.js";

test("speaks a slower, explicit next-step cue and cancels old speech", () => {
  const originalSynthesis = globalThis.speechSynthesis;
  const originalUtterance = globalThis.SpeechSynthesisUtterance;
  const calls = [];

  globalThis.speechSynthesis = {
    cancel() {
      calls.push({ type: "cancel" });
    },
    speak(utterance) {
      calls.push({ type: "speak", utterance });
    },
  };
  globalThis.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text;
    }
  };

  try {
    speakLabel("Rest");
    assert.equal(calls[0].type, "cancel");
    assert.equal(calls[1].utterance.text, "Next, Rest");
    assert.equal(calls[1].utterance.rate, 0.8);
    cancelSpeech();
    assert.equal(calls.at(-1).type, "cancel");
  } finally {
    if (originalSynthesis === undefined) delete globalThis.speechSynthesis;
    else globalThis.speechSynthesis = originalSynthesis;
    if (originalUtterance === undefined) delete globalThis.SpeechSynthesisUtterance;
    else globalThis.SpeechSynthesisUtterance = originalUtterance;
  }
});
