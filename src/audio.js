let audioContext = null;

function getAudioContextConstructor() {
  return globalThis.AudioContext ?? globalThis.webkitAudioContext;
}

export async function initAudio() {
  try {
    if (audioContext === null) {
      const AudioContextConstructor = getAudioContextConstructor();
      if (!AudioContextConstructor) return false;
      audioContext = new AudioContextConstructor();
    }

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    return true;
  } catch (error) {
    console.warn("qtimer audio is unavailable.", error);
    return false;
  }
}

function playTone(frequency, startTime, duration = 0.12) {
  if (!audioContext) return;

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const endTime = startTime + duration;

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.24, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, endTime);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(startTime);
  oscillator.stop(endTime + 0.01);
}

export function playBeep() {
  try {
    if (audioContext) playTone(820, audioContext.currentTime);
  } catch (error) {
    console.warn("qtimer could not play a beep.", error);
  }
}

export function playCompletionBeep() {
  try {
    if (!audioContext) return;

    const startTime = audioContext.currentTime;
    [800, 900, 1000].forEach((frequency, index) => {
      playTone(frequency, startTime + index * 0.19, 0.12);
    });
  } catch (error) {
    console.warn("qtimer could not play the completion sound.", error);
  }
}
