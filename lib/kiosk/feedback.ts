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

const CHEERS = [
  "Awesome",
  "Way to go",
  "You did it",
  "Nice work",
  "So proud of you",
  "Great job",
  "You're amazing",
  "Boom",
  "High five",
  "Superstar",
];

/** A short, varied encouraging exclamation for completions. */
export function cheer() {
  return CHEERS[Math.floor(Math.random() * CHEERS.length)];
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

export function haptic(pattern: number | readonly number[] = 30, enabled = true) {
  if (!enabled || typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(pattern as number | number[]);
  } catch {
    /* ignore */
  }
}

/** Haptic vocabulary (HARBOR_V2 §5) — distinct patterns the body learns to read.
 *  `navigator.vibrate` arrays in ms. Android-only (iOS no-ops cleanly). Pass each
 *  to haptic() with the child's `settings.haptics`, e.g. haptic(HAPTIC.stepDone, on). */
export const HAPTIC = {
  tapLight: 8, // every button/card press — the ambient "felt" layer
  tapMedium: 14, // primary buttons
  toggle: [0, 10, 20, 10], // switches, filter chips (tick-tick)
  select: 12, // picking an option (PIN digit, swatch, tab)
  stepDone: [0, 16, 24, 16], // routine step complete
  choreDone: [0, 18, 28, 18], // chore complete (heavier than a step)
  routineDone: [0, 30, 40, 30, 50], // whole routine — the "you did it" thud
  rewardRedeem: [0, 20, 40, 20], // store redemption
  milestone: [0, 24, 30, 24, 30, 60], // streak / voyage milestone
  errorSoft: [0, 40, 40, 40], // wrong PIN, can't afford — gentle, never harsh
  transitionWarn: 22, // 2-minute "time to switch" nudge
  unlock: [0, 12, 18, 30], // entering Harbor from the screensaver (rising)
  arrive: [0, 20, 30, 40, 60], // boat reaches harbor (day complete) — rising warmth
  breathIn: 18, // Anchor — start of inhale
  breathHold: 10, // Anchor — start of hold
  breathOut: 18, // Anchor — start of exhale
} as const;
