import { getAudioCtx } from "@/lib/kiosk/audioctx";

// Harbor Learn's sound effects — synthesized on the wall's shared AudioContext (no files, no
// latency). Bright, musical and quick: a right answer rings a little higher with every answer
// in a row (the combo climb is a big part of what makes "one more" feel so good), counting
// walks up a scale, and the treasure chest gets a real fanfare. Gentle by design: the "wrong"
// sound is a soft boop, never a buzzer.

let enabled = true;
let level = 1;
/** Mute or scale all Learn effects (the child's sound setting and sensory intensity). */
export function setSfx(on: boolean, intensity = 1) {
  enabled = on;
  level = Math.max(0.35, Math.min(1.3, intensity));
}

type Wave = OscillatorType;

function tone(ctx: AudioContext, freq: number, at: number, dur: number, vol: number, wave: Wave = "sine", slideTo?: number) {
  const t0 = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol * level, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

/** A bell: a sine with a quieter octave on top — warm, glassy, carries in a kitchen. */
function bell(ctx: AudioContext, freq: number, at: number, dur = 0.45, vol = 0.16) {
  tone(ctx, freq, at, dur, vol);
  tone(ctx, freq * 2, at, dur * 0.6, vol * 0.28);
  tone(ctx, freq * 3.01, at, dur * 0.3, vol * 0.08);
}

function noise(ctx: AudioContext, at: number, dur: number, vol: number, freq: number, q = 1, type: BiquadFilterType = "bandpass", sweepTo?: number) {
  const t0 = ctx.currentTime + at;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t0);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol * level, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(ctx.destination);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

// C-major pentatonic, so any run of notes sounds happy.
const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093];

export type Sfx =
  | "tap" | "pick" | "correct" | "wrong" | "pop" | "snap" | "lift" | "whoosh" | "star" | "chest"
  | "sticker" | "legendary" | "levelup" | "goal" | "move" | "bump" | "turn" | "shell" | "dock" | "count" | "trace" | "unlock"
  | "note" | "coin" | "hit" | "fish" | "splash" | "buy" | "soft-fail" | "tick" | "paint" | "draw" | "beep" | "boss";

/** Bells for Music Maker: C D E F G A. */
export const NOTE_HZ: Record<string, number> = { C: 523.25, D: 587.33, E: 659.25, F: 698.46, G: 783.99, A: 880 };
/** Ring one Music Maker bell by note name. */
export function note(name: string, dur = 0.55) {
  if (!enabled) return;
  const ctx = getAudioCtx();
  const f = NOTE_HZ[name];
  if (!ctx || !f) return;
  try {
    if (ctx.state === "suspended") void ctx.resume();
    bell(ctx, f, 0, dur, 0.17);
  } catch {
    /* ignore */
  }
}

/** Play a Learn sound. `n` = combo count for "correct", or the count for "count". */
export function sfx(name: Sfx, n = 0) {
  if (!enabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") void ctx.resume();
    switch (name) {
      case "tap":
        tone(ctx, 880, 0, 0.07, 0.05);
        break;
      case "pick":
        tone(ctx, 660, 0, 0.09, 0.07, "triangle");
        break;
      case "correct": {
        // Two rising bells that climb with the combo.
        const i = Math.min(SCALE.length - 3, Math.max(0, n));
        bell(ctx, SCALE[i + 2], 0, 0.32, 0.15);
        bell(ctx, SCALE[i + 4] ?? SCALE[SCALE.length - 1], 0.09, 0.5, 0.15);
        if (n >= 2) tone(ctx, SCALE[Math.min(SCALE.length - 1, i + 6)], 0.18, 0.35, 0.06);
        break;
      }
      case "wrong":
        tone(ctx, 247, 0, 0.22, 0.09, "triangle", 196);
        break;
      case "pop":
        tone(ctx, 900 + Math.random() * 300, 0, 0.09, 0.14, "sine", 180);
        noise(ctx, 0, 0.05, 0.08, 2400, 0.8);
        break;
      case "snap":
        tone(ctx, 1320, 0, 0.05, 0.09, "square");
        tone(ctx, 1760, 0.035, 0.07, 0.07);
        break;
      case "lift":
        tone(ctx, 520, 0, 0.08, 0.05, "sine", 760);
        break;
      case "whoosh":
        noise(ctx, 0, 0.32, 0.06, 500, 0.7, "bandpass", 2600);
        break;
      case "star":
        [0, 1, 2].forEach((k) => bell(ctx, SCALE[4 + k * 2] ?? 2093, k * 0.06, 0.4, 0.1));
        break;
      case "chest":
        noise(ctx, 0, 0.25, 0.07, 300, 0.6, "lowpass", 1800);
        [0, 2, 4, 5].forEach((k, j) => bell(ctx, SCALE[k], 0.18 + j * 0.09, 0.5, 0.13));
        [SCALE[5], SCALE[7], SCALE[9]].forEach((f, j) => tone(ctx, f, 0.6 + j * 0.04, 0.9, 0.05));
        break;
      case "sticker":
        [7, 9, 10].forEach((k, j) => bell(ctx, SCALE[k], j * 0.07, 0.6, 0.1));
        break;
      case "legendary":
        [0, 2, 4, 5, 7, 9, 10].forEach((k, j) => bell(ctx, SCALE[k], j * 0.07, 0.7, 0.11));
        noise(ctx, 0.5, 0.9, 0.04, 6000, 0.5, "highpass");
        break;
      case "levelup":
        [0, 2, 4, 5].forEach((k, j) => bell(ctx, SCALE[k], j * 0.11, 0.45, 0.14));
        [SCALE[5], SCALE[7], SCALE[9]].forEach((f) => tone(ctx, f, 0.48, 1.1, 0.06, "triangle"));
        break;
      case "goal":
        [2, 4, 7, 9].forEach((k, j) => bell(ctx, SCALE[k], j * 0.09, 0.5, 0.12));
        break;
      case "move":
        tone(ctx, 420, 0, 0.12, 0.05, "sine", 520);
        noise(ctx, 0, 0.12, 0.025, 900, 0.8);
        break;
      case "turn":
        tone(ctx, 600, 0, 0.1, 0.05, "triangle", 760);
        break;
      case "bump":
        tone(ctx, 140, 0, 0.25, 0.2, "sine", 70);
        noise(ctx, 0, 0.12, 0.08, 300, 1, "lowpass");
        break;
      case "shell":
        bell(ctx, SCALE[6], 0, 0.3, 0.12);
        bell(ctx, SCALE[8], 0.07, 0.4, 0.1);
        break;
      case "dock":
        [0, 2, 4, 7].forEach((k, j) => bell(ctx, SCALE[k], j * 0.1, 0.55, 0.13));
        break;
      case "count":
        bell(ctx, SCALE[Math.min(SCALE.length - 1, Math.max(0, n - 1))], 0, 0.35, 0.12);
        break;
      case "trace":
        tone(ctx, 1046 + Math.random() * 60, 0, 0.05, 0.025);
        break;
      case "unlock":
        [4, 7].forEach((k, j) => bell(ctx, SCALE[k], j * 0.08, 0.4, 0.1));
        break;
      case "note":
        bell(ctx, SCALE[Math.max(0, Math.min(SCALE.length - 1, n))], 0, 0.5, 0.15);
        break;
      case "coin":
        tone(ctx, 1567.98, 0, 0.08, 0.08, "square");
        tone(ctx, 2093, 0.07, 0.18, 0.07, "square");
        break;
      case "hit":
        tone(ctx, 180, 0, 0.18, 0.22, "sine", 60);
        noise(ctx, 0, 0.14, 0.12, 900, 0.7, "lowpass");
        tone(ctx, 1200, 0.02, 0.1, 0.05, "triangle", 600);
        break;
      case "boss":
        tone(ctx, 98, 0, 0.6, 0.16, "sawtooth", 82);
        tone(ctx, 147, 0.05, 0.55, 0.08, "triangle", 123);
        noise(ctx, 0, 0.5, 0.05, 400, 0.6, "lowpass");
        break;
      case "fish":
        [5, 7, 9, 10, 9, 10].forEach((k, j) => bell(ctx, SCALE[k], j * 0.06, 0.35, 0.09));
        noise(ctx, 0.1, 0.5, 0.03, 7000, 0.5, "highpass");
        break;
      case "splash":
        noise(ctx, 0, 0.35, 0.12, 700, 0.5, "lowpass", 220);
        tone(ctx, 300, 0, 0.12, 0.06, "sine", 120);
        break;
      case "buy":
        [0, 4, 7, 10].forEach((k, j) => bell(ctx, SCALE[k], j * 0.07, 0.4, 0.12));
        tone(ctx, 2093, 0.3, 0.25, 0.06, "square");
        break;
      case "soft-fail":
        [4, 3, 2].forEach((k, j) => bell(ctx, SCALE[k] / 2, j * 0.16, 0.5, 0.1));
        break;
      case "tick":
        tone(ctx, 1800 + n * 20, 0, 0.03, 0.04, "square");
        break;
      case "paint":
        noise(ctx, 0, 0.12, 0.06, 2600, 1.2, "bandpass", 1400);
        tone(ctx, 700 + Math.random() * 200, 0, 0.08, 0.05);
        break;
      case "draw":
        tone(ctx, 520, 0, 0.16, 0.04, "triangle", 780);
        break;
      case "beep":
        tone(ctx, 1320, 0, 0.06, 0.05, "square");
        break;
    }
  } catch {
    /* no audio — fine */
  }
}

/** A short buzz on tablets that can (Android); quietly nothing elsewhere. */
export function buzz(pattern: number | number[]) {
  if (!enabled || typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}
