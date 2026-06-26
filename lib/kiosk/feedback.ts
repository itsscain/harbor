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

/** One soft synth note with a gentle bell-like envelope (no asset). */
function blip(ctx: AudioContext, freq: number, at: number, dur: number, vol = 0.16, type: OscillatorType = "sine") {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = ctx.currentTime + at;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** The Harbor sonic identity (HARBOR_V2 §6.1) — short, watery/bell timbres, each
 *  semantic. All gated by the child's `settings.sound`; no-op without Web Audio. */
export type SoundName = "step" | "routine" | "reward" | "arrive" | "transition" | "error" | "milestone";
export function play(name: SoundName, enabled = true) {
  if (!enabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
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
