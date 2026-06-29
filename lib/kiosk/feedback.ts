"use client";

// On-device multi-sensory feedback: text-to-speech, a soft success chime, and
// haptics. All best-effort and gated by per-child settings; zero network.

import { playHarborVoice, stopHarborVoice } from "./voice";
import { getAudioCtx } from "./audioctx";

/** Read text aloud in the Harbor Voice via the cache-first cascade (Tier 0 shared
 *  library → device cache → OS voice). No-op if disabled. */
export function speak(text: string, enabled = true) {
  if (!enabled) return;
  playHarborVoice(text);
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

// The Harbor Voice only ever SPEAKS phrases that are in the pre-generated library
// (so it's always warm Bella, never robotic/slow). The screen shows the specifics
// (name, step); the voice picks from these fixed, library-backed lines.
const GREETINGS = ["Welcome back", "Good morning", "Ready for the day", "You made it"];
const DONES = ["You did it", "All done for today", "So proud of you", "Way to go"];

/** A warm library greeting for opening a child's screen. */
export function greetLine() {
  return GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
}

/** A warm library line for finishing a whole routine. */
export function doneLine() {
  return DONES[Math.floor(Math.random() * DONES.length)];
}

export function stopSpeaking() {
  stopHarborVoice();
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

// Sensory intensity scales loudness (set per-call by play()); blip reads it.
let curGain = 1;

/** One soft synth note with a gentle bell-like envelope (no asset). */
function blip(ctx: AudioContext, freq: number, at: number, dur: number, vol = 0.16, type: OscillatorType = "sine") {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = ctx.currentTime + at;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol * curGain, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** The Harbor sonic identity (HARBOR_V2 §6.1) — short, watery/bell timbres, each
 *  semantic. All gated by the child's `settings.sound`; no-op without Web Audio. */
export type SoundName =
  | "step" | "routine" | "reward" | "arrive" | "transition" | "error" | "milestone"
  | "tap" | "navigate" | "back" | "tabswitch" | "break" | "listen" | "listenend" | "select";

// The lightest, most-repeated sounds are debounced so rapid taps never stack into
// noise (§3.3 / Edge-Cases L3) — at most one of EACH light sound per ~45ms window
// (per-name, so a fast dock→child nav doesn't swallow the second distinct sound).
const LIGHT: ReadonlySet<SoundName> = new Set(["tap", "navigate", "back", "tabswitch", "listen", "listenend", "select"]);
const lastLight = new Map<SoundName, number>();

export function play(name: SoundName, enabled = true, gain = 1) {
  if (!enabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (LIGHT.has(name)) {
    const now = typeof performance !== "undefined" ? performance.now() : 0;
    if (now - (lastLight.get(name) ?? 0) < 45) return;
    lastLight.set(name, now);
  }
  curGain = Math.max(0.4, Math.min(1.4, gain)); // intensity → gentle loudness scaling
  try {
    if (ctx.state === "suspended") void ctx.resume();
    switch (name) {
      case "step": // warm two-note (the everyday completion)
        blip(ctx, 523.25, 0, 0.35, 0.16);
        blip(ctx, 783.99, 0.1, 0.4, 0.14);
        break;
      case "routine": // rising 3-note motif — the "Harbor theme" seed
        [523.25, 659.25, 783.99].forEach((f, i) => blip(ctx, f, i * 0.13, 0.5, 0.15));
        break;
      case "reward": // bright sparkle
        [880, 1108.73, 1318.51].forEach((f, i) => blip(ctx, f, i * 0.07, 0.28, 0.12));
        break;
      case "arrive": // gentle harbor bell + soft low wave (day complete)
        blip(ctx, 392, 0, 0.9, 0.16);
        blip(ctx, 587.33, 0.16, 0.95, 0.13);
        blip(ctx, 261.63, 0.28, 1.1, 0.1, "triangle");
        break;
      case "milestone": // celebratory rising cadence
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => blip(ctx, f, i * 0.1, 0.5, 0.14));
        break;
      case "transition": // soft single chime
        blip(ctx, 440, 0, 0.5, 0.13, "triangle");
        break;
      case "error": // soft, non-judgmental low tone
        blip(ctx, 196, 0, 0.45, 0.11);
        break;
      // ── micro-interaction palette (§3.2) — soft, warm, one key, lovely on repeat ──
      case "tap": // water-drop tick (every press) — must be lovely on the 50th tap
        blip(ctx, 587.33, 0, 0.13, 0.06, "sine");
        break;
      case "navigate": // gentle rising swell — opening a screen
        blip(ctx, 523.25, 0, 0.3, 0.07);
        blip(ctx, 659.25, 0.05, 0.34, 0.06);
        break;
      case "back": // soft descending whoosh
        blip(ctx, 659.25, 0, 0.26, 0.06);
        blip(ctx, 440, 0.05, 0.32, 0.06);
        break;
      case "tabswitch": // light tick + tone
        blip(ctx, 783.99, 0, 0.16, 0.06, "triangle");
        break;
      case "break": // calming descending pad — entering the calm corner
        blip(ctx, 392, 0, 0.9, 0.08, "sine");
        blip(ctx, 261.63, 0.2, 1.0, 0.06, "sine");
        break;
      case "listen": // soft "open" tone — mic on
        blip(ctx, 587.33, 0, 0.2, 0.06, "sine");
        break;
      case "listenend": // soft "close" tone — mic off
        blip(ctx, 440, 0, 0.2, 0.05, "sine");
        break;
      case "select": // picking a tab / option
        blip(ctx, 659.25, 0, 0.14, 0.06);
        break;
    }
  } catch {
    /* ignore */
  }
}

/** Sleep sound machine (HARBOR_V2 §9.2.17) — a gentle looping brown-noise "waves"
 *  bed for bedtime, matching Buddy's nightlight/sound-machine for free. Started on
 *  an explicit tap (autoplay-safe). Returns a stop() fn, or null if unavailable. */
export function startSoundMachine(): (() => void) | null {
  const ctx = getAudioCtx();
  if (!ctx) return null;
  try {
    if (ctx.state === "suspended") void ctx.resume();
    const size = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < size; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02; // integrate → brown noise (soft, low)
      data[i] = last * 3.2;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 550; // muffle into a calm "waves" wash
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    gain.gain.exponentialRampToValueAtTime(0.1, ctx.currentTime + 1.2); // fade in
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
    return () => {
      try {
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
        src.stop(ctx.currentTime + 0.7);
      } catch {
        /* ignore */
      }
    };
  } catch {
    return null;
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

// ── ★ The unified feedback bus (§3.6) ────────────────────────────────────────
// Device/household defaults — set once by KioskShell from the effective settings
// (sound on/off, haptics, quiet hours, sensory intensity). Hub-level events (nav,
// tabs) use these; child-scoped events pass the child's own settings to override.
let fxDefaults = { sound: true, haptics: true, intensity: 1, quiet: false };
export function setFxDefaults(d: Partial<typeof fxDefaults>) {
  fxDefaults = { ...fxDefaults, ...d };
}

function scaleHaptic(p: number | readonly number[], k: number): number | number[] {
  if (typeof p === "number") return Math.max(1, Math.round(p * k));
  return (p as readonly number[]).map((n) => Math.max(0, Math.round(n * k)));
}

/** The named feedback events (§3.2) — every interactive element triggers one. */
export type FeedbackEvent =
  | "tap" | "navigate-in" | "back" | "tab-switch" | "toggle" | "select"
  | "step-complete" | "chore-complete" | "reward" | "arrival"
  | "break" | "soft-error" | "listening-start" | "listening-end";

const FX: Record<FeedbackEvent, { sound?: SoundName; haptic?: number | readonly number[]; speaks?: boolean }> = {
  "tap": { sound: "tap", haptic: HAPTIC.tapLight },
  "navigate-in": { sound: "navigate", haptic: HAPTIC.tapMedium },
  "back": { sound: "back", haptic: HAPTIC.tapLight },
  "tab-switch": { sound: "tabswitch", haptic: HAPTIC.select },
  "toggle": { sound: "select", haptic: HAPTIC.toggle },
  "select": { sound: "select", haptic: HAPTIC.select },
  "step-complete": { sound: "step", haptic: HAPTIC.stepDone, speaks: true },
  "chore-complete": { sound: "step", haptic: HAPTIC.choreDone, speaks: true },
  "reward": { sound: "reward", haptic: HAPTIC.rewardRedeem },
  "arrival": { sound: "arrive", haptic: HAPTIC.arrive, speaks: true },
  "break": { sound: "break", haptic: HAPTIC.breathOut },
  "soft-error": { sound: "error", haptic: HAPTIC.errorSoft },
  "listening-start": { sound: "listen", haptic: HAPTIC.tapLight },
  "listening-end": { sound: "listenend" },
};

/** ★ One coordinated feedback beat (§3.6): fires the sound + haptic — and the voice
 *  for meaningful events when `say` is provided — gated by sound/haptics and scaled by
 *  sensory intensity. Hub events omit opts (→ device defaults); child-scoped events
 *  pass the child's {sound, haptics, intensity}. Every interactive element calls this. */
export function feedback(
  event: FeedbackEvent,
  opts: { sound?: boolean; haptics?: boolean; intensity?: number; say?: string } = {},
) {
  const m = FX[event];
  if (!m) return;
  const sound = opts.sound ?? fxDefaults.sound;
  const haptics = opts.haptics ?? fxDefaults.haptics;
  // Quiet hours DUCK every sound (hub AND child completions), softer not silent (§3.3
  // "ducked for sleep/quiet"); the device sound toggle remains the hard mute.
  const intensity = (opts.intensity ?? fxDefaults.intensity) * (fxDefaults.quiet ? 0.5 : 1);
  if (m.haptic) haptic(scaleHaptic(m.haptic, intensity), haptics);
  if (m.sound) play(m.sound, sound, intensity);
  if (m.speaks && opts.say) speak(opts.say, sound);
}
