"use client";

// On-device multi-sensory feedback: text-to-speech, a soft success chime, and
// haptics. All best-effort and gated by per-child settings; zero network.

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audioCtx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      audioCtx = new Ctor();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/** Read text aloud with the Web Speech API. No-op if unavailable or disabled. */
export function speak(text: string, enabled = true) {
  if (!enabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.pitch = 1.05;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
}

/** A gentle two-note success chime (synth, no asset). */
export function chime(enabled = true) {
  if (!enabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    [
      [523.25, 0],
      [783.99, 0.12],
    ].forEach(([freq, at]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(0.18, now + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + at);
      osc.stop(now + at + 0.36);
    });
  } catch {
    /* ignore */
  }
}

/** A soft single tone — used for transition warnings. */
export function tone(enabled = true) {
  if (!enabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = 440;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.14, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.51);
  } catch {
    /* ignore */
  }
}

export function haptic(pattern: number | number[] = 30, enabled = true) {
  if (!enabled || typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}
