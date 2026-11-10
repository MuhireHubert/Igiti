const AUDIO_KEY = "igiti-game-sound-enabled";

export function savedSoundEnabled() {
  try { return window.localStorage.getItem(AUDIO_KEY) !== "false"; } catch { return true; }
}

export function saveSoundEnabled(enabled) {
  try { window.localStorage.setItem(AUDIO_KEY, String(Boolean(enabled))); } catch { /* optional preference */ }
}

// Small synthesized cues keep the game lively without shipping copyrighted or
// bandwidth-heavy audio files. AudioContext is created only from a player action.
export function playGameCue(type, enabled = true) {
  if (!enabled || typeof window === "undefined") return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  try {
    const context = new AudioContext();
    const notes = {
      swap: [[330, 0], [392, 0.06]], correct: [[523, 0], [659, 0.09]], wrong: [[180, 0]],
      hint: [[440, 0], [554, 0.08]], win: [[523, 0], [659, 0.08], [784, 0.16]], tick: [[880, 0]],
    }[type] || [];
    notes.forEach(([frequency, delay]) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type === "wrong" ? "sawtooth" : "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, context.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(type === "tick" ? 0.025 : 0.07, context.currentTime + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + delay + 0.13);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(context.currentTime + delay);
      oscillator.stop(context.currentTime + delay + 0.15);
    });
    window.setTimeout(() => context.close().catch(() => {}), 700);
  } catch { /* browsers may deny audio until interaction; gameplay remains unaffected */ }
}
