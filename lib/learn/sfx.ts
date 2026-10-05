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
  | "note" | "coin" | "hit" | "fish" | "splash" | "buy" | "soft-fail" | "tick" | "paint" | "draw" | "beep" | "boss"
  | "plop" | "gulp" | "bubble" | "chirp";

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
      // The aquarium: food landing in the water, a happy gulp, a bubble, a little bird chirp.
      case "plop":
        tone(ctx, 520 + Math.random() * 120, 0, 0.12, 0.09, "sine", 160);
        noise(ctx, 0, 0.08, 0.04, 1800, 0.9);
        break;
      case "gulp":
        tone(ctx, 300, 0, 0.09, 0.12, "sine", 620);
        tone(ctx, 700, 0.08, 0.1, 0.06, "sine", 1100);
        break;
      case "bubble":
        tone(ctx, 600 + Math.random() * 500, 0, 0.1, 0.06, "sine", 1500 + Math.random() * 400);
        break;
      case "chirp":
        tone(ctx, 1800, 0, 0.07, 0.06, "triangle", 2600);
        tone(ctx, 2000, 0.09, 0.08, 0.05, "triangle", 2900);
        break;
    }
  } catch {
    /* no audio — fine */
  }
}

/** The voices of the boat pets — little synthesized cartoon sounds, soft and friendly. */
export type PetVoice = "squawk" | "meow" | "woof" | "ribbit" | "blub" | "roar" | "neigh" | "squeak" | "honk" | "hoot" | "chirp" | "purr" | "yip" | "click" | "bark";
export function petVoice(v: PetVoice) {
  if (!enabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") void ctx.resume();
    switch (v) {
      case "squawk":
        tone(ctx, 900, 0, 0.13, 0.07, "sawtooth", 1500);
        noise(ctx, 0, 0.12, 0.04, 2200, 3);
        tone(ctx, 1100, 0.16, 0.12, 0.06, "sawtooth", 1700);
        break;
      case "meow":
        tone(ctx, 620, 0, 0.16, 0.08, "triangle", 950);
        tone(ctx, 950, 0.15, 0.24, 0.07, "triangle", 560);
        break;
      case "woof":
      case "bark": {
        const f = v === "bark" ? 330 : 240;
        for (const at of [0, 0.2]) {
          tone(ctx, f, at, 0.12, 0.11, "square", f * 0.62);
          noise(ctx, at, 0.07, 0.05, 700, 1.2, "lowpass");
        }
        break;
      }
      case "ribbit":
        for (const at of [0, 0.17]) for (let k = 0; k < 4; k++) tone(ctx, 320, at + k * 0.025, 0.02, 0.07, "sawtooth", 260);
        break;
      case "blub":
        [0, 0.09, 0.18].forEach((at, i) => tone(ctx, 420 + i * 90, at, 0.08, 0.07, "sine", 900 + i * 160));
        break;
      case "roar":
        tone(ctx, 210, 0, 0.42, 0.08, "sawtooth", 140);
        tone(ctx, 315, 0, 0.42, 0.04, "triangle", 210);
        noise(ctx, 0.02, 0.35, 0.03, 500, 0.8, "lowpass");
        break;
      case "neigh":
        tone(ctx, 820, 0, 0.2, 0.06, "triangle", 1250);
        tone(ctx, 1250, 0.18, 0.32, 0.05, "triangle", 700);
        break;
      case "squeak":
        tone(ctx, 1500, 0, 0.09, 0.06, "sine", 2100);
        tone(ctx, 1600, 0.12, 0.09, 0.06, "sine", 2300);
        break;
      case "honk":
        tone(ctx, 420, 0, 0.16, 0.08, "square", 380);
        tone(ctx, 440, 0.2, 0.18, 0.08, "square", 390);
        break;
      case "hoot":
        tone(ctx, 440, 0, 0.22, 0.09, "sine", 400);
        tone(ctx, 440, 0.32, 0.3, 0.09, "sine", 390);
        break;
      case "chirp":
        tone(ctx, 1800, 0, 0.07, 0.06, "triangle", 2600);
        tone(ctx, 2000, 0.09, 0.08, 0.05, "triangle", 2900);
        tone(ctx, 1900, 0.2, 0.08, 0.05, "triangle", 2800);
        break;
      case "purr":
        for (let k = 0; k < 8; k++) noise(ctx, k * 0.06, 0.05, 0.035, 160, 1, "lowpass");
        break;
      case "yip":
        tone(ctx, 900, 0, 0.09, 0.07, "triangle", 1450);
        tone(ctx, 1000, 0.13, 0.08, 0.06, "triangle", 1500);
        break;
      case "click":
        for (let k = 0; k < 3; k++) noise(ctx, k * 0.09, 0.025, 0.08, 3000, 2);
        break;
    }
  } catch {
    /* no audio — fine */
  }
}

/** Boat sounds: a big ship's horn, a tugboat toot, a rubber duck squeak, the ship's bell, a
 *  splash and a confetti cannon. */
export type BoatSound = "horn" | "toot" | "duck" | "bell" | "splash" | "cannon" | "anchor" | "sail";
export function boatSound(s: BoatSound) {
  if (!enabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") void ctx.resume();
    switch (s) {
      case "horn":
        tone(ctx, 110, 0, 0.9, 0.12, "sawtooth", 108);
        tone(ctx, 165, 0, 0.9, 0.07, "triangle", 163);
        noise(ctx, 0, 0.9, 0.02, 300, 0.7, "lowpass");
        break;
      case "toot":
        tone(ctx, 523, 0, 0.32, 0.08, "square", 520);
        tone(ctx, 784, 0, 0.32, 0.05, "triangle", 780);
        tone(ctx, 523, 0.4, 0.5, 0.08, "square", 515);
        tone(ctx, 784, 0.4, 0.5, 0.05, "triangle", 772);
        break;
      case "duck":
        tone(ctx, 1200, 0, 0.12, 0.08, "square", 1700);
        tone(ctx, 1700, 0.12, 0.16, 0.06, "square", 900);
        break;
      case "bell":
        bell(ctx, 1046.5, 0, 0.9, 0.16);
        bell(ctx, 1046.5, 0.45, 0.9, 0.12);
        break;
      case "splash":
        noise(ctx, 0, 0.45, 0.12, 1200, 0.6, "bandpass", 300);
        break;
      case "cannon":
        noise(ctx, 0, 0.3, 0.16, 180, 0.7, "lowpass");
        [0, 0.12, 0.22, 0.3].forEach((at, i) => bell(ctx, SCALE[4 + i], 0.25 + at, 0.3, 0.07));
        break;
      case "anchor":
        for (let k = 0; k < 6; k++) noise(ctx, k * 0.07, 0.04, 0.06, 2400, 4);
        noise(ctx, 0.5, 0.4, 0.1, 900, 0.6, "bandpass", 260);
        break;
      case "sail":
        noise(ctx, 0, 0.5, 0.06, 900, 0.5, "bandpass", 2400);
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
