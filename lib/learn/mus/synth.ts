import { getAudioCtx } from "@/lib/kiosk/audioctx";
import { sfxLevel, sfxOn } from "../sfx";
import { stopVoice } from "../audio";
import type { DrumId, InstId, Score } from "./types";
import { midiToHz } from "./theory";
import { scoreBeats } from "./score";

// Harbor's music engine: every instrument is synthesized live with Web Audio (no recordings, so it
// works offline and costs nothing) — pianos and marimbas built from partials, strings and brass
// from filtered sawtooths with vibrato and a breath of attack, guitars and harps plucked by the
// Karplus–Strong string model, a choir from vowel formants, and a full drum kit from noise and
// sweeps. A look-ahead scheduler plays Scores sample-accurately (swing included), visuals read the
// play position, and taps are timed against what was actually HEARD (the tablet's output delay is
// measured and forgiven). Sound obeys the child's sound setting and sensory intensity.

type Ctx = AudioContext;
type Bus = { ctx: Ctx; input: GainNode; master: GainNode; verb: ConvolverNode; verbIn: GainNode };
let bus: Bus | null = null;

function impulse(ctx: Ctx, seconds: number, decay: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  let seed = 12345;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      lp = lp * 0.6 + rnd() * 0.4; // a softer, warmer tail
      d[i] = lp * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

function getBus(): Bus | null {
  const ctx = getAudioCtx();
  if (!ctx) return null;
  if (bus && bus.ctx === ctx) return bus;
  const input = ctx.createGain();
  const master = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 12;
  comp.ratio.value = 3.5;
  comp.attack.value = 0.004;
  comp.release.value = 0.22;
  const verb = ctx.createConvolver();
  verb.buffer = impulse(ctx, 2.2, 3.2);
  const verbIn = ctx.createGain();
  const verbOut = ctx.createGain();
  verbOut.gain.value = 0.32;
  input.connect(comp);
  verbIn.connect(verb).connect(verbOut).connect(comp);
  comp.connect(master).connect(ctx.destination);
  bus = { ctx, input, master, verb, verbIn };
  return bus;
}
function ready(): Bus | null {
  const b = getBus();
  if (!b) return null;
  if (b.ctx.state === "suspended") void b.ctx.resume();
  b.master.gain.value = sfxOn() ? 0.9 * sfxLevel() : 0;
  return b;
}

// ── Building blocks ──────────────────────────────────────────────────────────────────────────
const waves = new Map<string, PeriodicWave>();
function pwave(ctx: Ctx, key: string, harmonics: number[]): PeriodicWave {
  const k = `${key}`;
  const hit = waves.get(k);
  if (hit) return hit;
  const real = new Float32Array(harmonics.length + 1);
  const imag = new Float32Array(harmonics.length + 1);
  harmonics.forEach((h, i) => (imag[i + 1] = h));
  const w = ctx.createPeriodicWave(real, imag);
  waves.set(k, w);
  return w;
}
let noiseBuf: AudioBuffer | null = null;
function noise(ctx: Ctx): AudioBuffer {
  if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
  const len = ctx.sampleRate * 2;
  const b = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = b.getChannelData(0);
  let seed = 987654;
  for (let i = 0; i < len; i++) d[i] = ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;
  noiseBuf = b;
  return b;
}
/** An envelope on a gain: attack to `peak`, decay to `sus`·peak, hold, release by `end`. */
function adsr(g: GainNode, t: number, a: number, dcy: number, sus: number, peak: number, off: number, rel: number) {
  const p = g.gain;
  p.cancelScheduledValues(t);
  p.setValueAtTime(0.0001, t);
  p.linearRampToValueAtTime(peak, t + a);
  p.setTargetAtTime(Math.max(0.0001, peak * sus), t + a, Math.max(0.01, dcy / 3));
  const o = Math.max(off, t + a + 0.01);
  p.setTargetAtTime(0.0001, o, Math.max(0.01, rel / 4));
  return o + rel + 0.05;
}
/** A struck/plucked envelope: instant attack, exponential decay (`tau` s), cut at `off`. */
function strike(g: GainNode, t: number, peak: number, tau: number, off: number, rel = 0.12) {
  const p = g.gain;
  p.setValueAtTime(0.0001, t);
  p.linearRampToValueAtTime(peak, t + 0.004);
  p.setTargetAtTime(0.0001, t + 0.004, tau);
  if (off < t + tau * 5) p.setTargetAtTime(0.0001, Math.max(t + 0.01, off), rel / 3);
  return Math.min(t + tau * 5, off + rel) + 0.05;
}
function osc(ctx: Ctx, type: OscillatorType | PeriodicWave, f: number, t: number, stop: number, detune = 0): OscillatorNode {
  const o = ctx.createOscillator();
  if (typeof type === "string") o.type = type as OscillatorType;
  else o.setPeriodicWave(type as PeriodicWave);
  o.frequency.setValueAtTime(f, t);
  o.detune.value = detune;
  o.start(t);
  o.stop(stop);
  return o;
}
function vibrato(ctx: Ctx, target: AudioParam, t: number, stop: number, rate: number, cents: number, delay = 0.15) {
  const lfo = osc(ctx, "sine", rate, t, stop);
  const depth = ctx.createGain();
  depth.gain.setValueAtTime(0, t);
  depth.gain.linearRampToValueAtTime(cents, t + delay + 0.25);
  lfo.connect(depth).connect(target);
}
function noiseSrc(ctx: Ctx, t: number, stop: number): AudioBufferSourceNode {
  const s = ctx.createBufferSource();
  s.buffer = noise(ctx);
  s.loop = true;
  s.start(t, Math.random() * 1.5);
  s.stop(stop);
  return s;
}
function filt(ctx: Ctx, type: BiquadFilterType, f: number, q = 0.7, gain = 0): BiquadFilterNode {
  const b = ctx.createBiquadFilter();
  b.type = type;
  b.frequency.value = f;
  b.Q.value = q;
  b.gain.value = gain;
  return b;
}
const shapers = new Map<number, Float32Array<ArrayBuffer>>();
function drive(ctx: Ctx, k: number): WaveShaperNode {
  const w = ctx.createWaveShaper();
  let c = shapers.get(k);
  if (!c) {
    c = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i / 1023) * 2 - 1;
      c[i] = Math.tanh(k * x) / Math.tanh(k);
    }
    shapers.set(k, c);
  }
  w.curve = c;
  w.oversample = "2x";
  return w;
}

// ── Plucked strings (Karplus–Strong), rendered once per pitch and cached ─────────────────────
const plucks = new Map<string, AudioBuffer>();
function pluck(ctx: Ctx, key: string, f: number, decay: number, bright: number, seconds: number): AudioBuffer {
  const k = `${key}:${Math.round(f * 10)}`;
  const hit = plucks.get(k);
  if (hit) {
    plucks.delete(k);
    plucks.set(k, hit); // most recent last
    return hit;
  }
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * seconds);
  const buf = ctx.createBuffer(1, len, sr);
  const y = buf.getChannelData(0);
  const N = sr / f;
  const n0 = Math.floor(N);
  let seed = Math.floor(f * 977) | 1;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;
  // A noise burst, softened by `bright` (1 = raw and twangy, 0 = mellow).
  let lp = 0;
  for (let i = 0; i < n0 + 2 && i < len; i++) {
    lp = lp + (rnd() - lp) * (0.2 + bright * 0.8);
    y[i] = lp;
  }
  const frac = N - n0;
  for (let i = n0 + 2; i < len; i++) {
    const a = y[i - n0] * (1 - frac) + y[i - n0 - 1] * frac;
    const b = y[i - n0 - 1] * (1 - frac) + y[i - n0 - 2] * frac;
    y[i] = decay * 0.5 * (a + b);
  }
  // Normalize the attack.
  let peak = 0;
  for (let i = 0; i < Math.min(len, n0 * 4); i++) peak = Math.max(peak, Math.abs(y[i]));
  if (peak > 0) for (let i = 0; i < len; i++) y[i] /= peak;
  plucks.set(k, buf);
  if (plucks.size > 56) plucks.delete(plucks.keys().next().value as string);
  return buf;
}
function plucked(ctx: Ctx, out: AudioNode, key: string, f: number, t: number, off: number, v: number, o: { decay: number; bright: number; secs: number; lp?: number; gain?: number }) {
  const src = ctx.createBufferSource();
  src.buffer = pluck(ctx, key, f, o.decay, o.bright, o.secs);
  const g = ctx.createGain();
  const end = Math.min(t + o.secs, off + 0.25);
  g.gain.setValueAtTime(v * (o.gain ?? 0.5), t);
  g.gain.setTargetAtTime(0.0001, Math.max(t + 0.02, off), 0.08);
  let node: AudioNode = src;
  if (o.lp) {
    const l = filt(ctx, "lowpass", o.lp, 0.5);
    node.connect(l);
    node = l;
  }
  node.connect(g).connect(out);
  src.start(t);
  src.stop(end + 0.05);
}

// ── Instruments ──────────────────────────────────────────────────────────────────────────────
/** Loudness trims so every instrument and drum sits at about the same level (measured). */
const INST_GAIN: Partial<Record<InstId, number>> = { harmonica: 1.7, choir: 1.45, pad: 1.35, accordion: 1.35, organ: 1.25, eguitar: 1.25, strings: 1.2, synth: 1.15, banjo: 1.1, ukulele: 1.15, synthbass: 0.7, timpani: 0.75, piano: 0.9 };
const DRUM_GAIN: Partial<Record<DrumId, number>> = { clap: 2.3, hat: 1.6, shaker: 1.9, maracas: 2, snap: 1.7, rim: 1.4, openhat: 1.25, tamb: 1.3, kick: 0.9, bassdrum: 0.85, stomp: 0.85, timpani: 0.8, lowtom: 0.85 };
/** Play one pitched note: f Hz at ctx time t, held until `off`, loudness v (0–1). */
function voice(ctx: Ctx, out: AudioNode, inst: InstId, midi: number, t: number, off: number, v0: number) {
  const v = v0 * (INST_GAIN[inst] ?? 1);
  const f = midiToHz(midi);
  const g = ctx.createGain();
  g.connect(out);
  const lowish = Math.max(0, Math.min(1, (72 - midi) / 36)); // 1 = low notes (they ring longer)
  switch (inst) {
    case "piano": {
      const w = pwave(ctx, "piano", [1, 0.48, 0.3, 0.18, 0.12, 0.08, 0.05, 0.035, 0.02]);
      const tau = 0.35 + lowish * 0.9;
      const stop = strike(g, t, v * 0.32, tau, off + 0.08, 0.3);
      const lp = filt(ctx, "lowpass", Math.min(9000, 1400 + f * 5), 0.4);
      lp.frequency.setTargetAtTime(Math.min(4000, f * 2.6 + 300), t + 0.02, 0.4);
      lp.connect(g);
      osc(ctx, w, f, t, stop, -3).connect(lp);
      osc(ctx, w, f, t, stop, 4).connect(lp);
      const hn = ctx.createGain();
      hn.gain.setValueAtTime(v * 0.05, t);
      hn.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
      noiseSrc(ctx, t, t + 0.05).connect(filt(ctx, "bandpass", 2600, 0.8)).connect(hn).connect(g);
      return;
    }
    case "bells":
    case "glock":
    case "steeldrum": {
      const parts = inst === "steeldrum" ? [[1, 1, 0.9], [2, 0.45, 0.45], [3.96, 0.18, 0.2]] : inst === "glock" ? [[1, 1, 1.6], [2.76, 0.42, 0.6], [5.4, 0.2, 0.25]] : [[1, 1, 1.9], [2.76, 0.3, 0.7], [5.4, 0.09, 0.25]];
      for (const [r, a, tau] of parts) {
        const pg = ctx.createGain();
        const stop = strike(pg, t, v * 0.26 * a, tau * (inst === "steeldrum" ? 1 : 0.7 + lowish * 0.6), off + 1.6, 0.4);
        osc(ctx, "sine", f * r, t, stop).connect(pg).connect(g);
      }
      g.gain.value = 1;
      return;
    }
    case "marimba":
    case "xylophone":
    case "musicbox":
    case "kalimba": {
      const spec = inst === "marimba" ? [[1, 1, 0.45 + lowish * 0.5], [3.93, 0.22, 0.08], [9.2, 0.05, 0.03]] : inst === "xylophone" ? [[1, 1, 0.32], [3, 0.38, 0.12], [6.1, 0.1, 0.04]] : inst === "musicbox" ? [[1, 1, 0.9], [3, 0.25, 0.25], [5.4, 0.14, 0.07]] : [[1, 1, 0.9], [5.6, 0.22, 0.06], [2.01, 0.12, 0.3]];
      for (const [r, a, tau] of spec) {
        const pg = ctx.createGain();
        const stop = strike(pg, t, v * 0.32 * a, tau, off + 1.2, 0.3);
        const o = osc(ctx, "sine", f * r, t, stop);
        if (inst === "kalimba" && r === 1) o.frequency.exponentialRampToValueAtTime(f, t + 0.025);
        if (inst === "kalimba" && r === 1) o.frequency.setValueAtTime(f * 1.012, t);
        o.connect(pg).connect(g);
      }
      g.gain.value = 1;
      return;
    }
    case "guitar":
      return plucked(ctx, g, "gtr", f, t, off + 0.4, v, { decay: 0.996, bright: 0.45, secs: 1.8, lp: 4200, gain: 0.5 });
    case "ukulele":
      return plucked(ctx, g, "uke", f, t, off + 0.2, v, { decay: 0.991, bright: 0.6, secs: 1.2, lp: 5200, gain: 0.48 });
    case "banjo":
      return plucked(ctx, g, "banjo", f, t, off + 0.1, v, { decay: 0.986, bright: 0.95, secs: 1, gain: 0.45 });
    case "harp":
      return plucked(ctx, g, "harp", f, t, off + 1, v, { decay: 0.9975, bright: 0.3, secs: 2.6, lp: 3600, gain: 0.55 });
    case "pizz":
      return plucked(ctx, g, "pizz", f, t, off, v, { decay: 0.983, bright: 0.35, secs: 0.55, lp: 2600, gain: 0.6 });
    case "bass":
      return plucked(ctx, g, "bass", f, t, off, v, { decay: 0.994, bright: 0.35, secs: 1.6, lp: 1100, gain: 0.85 });
    case "violin":
    case "viola":
    case "cello":
    case "doublebass": {
      const cut = inst === "violin" ? 3400 : inst === "viola" ? 2700 : inst === "cello" ? 1900 : 950;
      const stop = adsr(g, t, inst === "violin" ? 0.07 : 0.1, 0.25, 0.82, v * 0.2, off, 0.22);
      const lp = filt(ctx, "lowpass", cut, 0.9);
      const body = filt(ctx, "peaking", inst === "violin" ? 1100 : 600, 1.2, 4);
      lp.connect(body).connect(g);
      const o = osc(ctx, "sawtooth", f, t, stop);
      vibrato(ctx, o.detune, t, stop, 5.6, 7, 0.2);
      o.connect(lp);
      const bow = ctx.createGain();
      bow.gain.value = v * 0.015;
      noiseSrc(ctx, t, stop).connect(filt(ctx, "highpass", 3000)).connect(bow).connect(g);
      return;
    }
    case "strings": {
      const stop = adsr(g, t, 0.28, 0.4, 0.85, v * 0.12, off, 0.45);
      const lp = filt(ctx, "lowpass", 2600, 0.6);
      lp.connect(g);
      for (const dt of [-9, 0, 8]) {
        const o = osc(ctx, "sawtooth", f, t, stop, dt);
        vibrato(ctx, o.detune, t, stop, 5 + dt / 20, 5, 0.3);
        o.connect(lp);
      }
      return;
    }
    case "flute":
    case "piccolo":
    case "recorder":
    case "whistle": {
      const h = inst === "recorder" ? [1, 0.08, 0.05] : inst === "whistle" ? [1] : [1, 0.22, 0.07, 0.03];
      const stop = adsr(g, t, inst === "recorder" ? 0.03 : 0.06, 0.2, 0.85, v * 0.3, off, 0.12);
      const o = osc(ctx, pwave(ctx, `fl${h.length}`, h), f, t, stop);
      if (inst !== "recorder") vibrato(ctx, o.detune, t, stop, 5, inst === "whistle" ? 12 : 9, 0.2);
      o.connect(g);
      if (inst !== "whistle") {
        const br = ctx.createGain();
        br.gain.value = v * 0.035;
        noiseSrc(ctx, t, stop).connect(filt(ctx, "bandpass", Math.min(8000, f * 2), 1.2)).connect(br).connect(g);
      }
      return;
    }
    case "clarinet":
    case "oboe":
    case "bassoon": {
      const h = inst === "clarinet" ? [1, 0.02, 0.36, 0.02, 0.2, 0.02, 0.13, 0.01, 0.09] : [0.55, 1, 0.8, 0.6, 0.45, 0.33, 0.24, 0.17, 0.11];
      const stop = adsr(g, t, 0.04, 0.2, 0.85, v * 0.22, off, 0.1);
      const lp = filt(ctx, "lowpass", inst === "clarinet" ? 2600 : inst === "oboe" ? 3800 : 1300, 0.7);
      const nose = filt(ctx, "peaking", inst === "oboe" ? 1400 : 700, 1.4, inst === "clarinet" ? 0 : 5);
      lp.connect(nose).connect(g);
      const o = osc(ctx, pwave(ctx, inst, h), f, t, stop);
      if (inst !== "clarinet") vibrato(ctx, o.detune, t, stop, 5.4, 5, 0.25);
      o.connect(lp);
      return;
    }
    case "sax": {
      const stop = adsr(g, t, 0.035, 0.25, 0.8, v * 0.2, off, 0.12);
      const lp = filt(ctx, "lowpass", 1300, 1.2);
      lp.frequency.linearRampToValueAtTime(2600, t + 0.06);
      lp.frequency.setTargetAtTime(2100, t + 0.08, 0.2);
      const pk = filt(ctx, "peaking", 1000, 1.3, 6);
      lp.connect(pk).connect(g);
      const o = osc(ctx, "sawtooth", f, t, stop);
      vibrato(ctx, o.detune, t, stop, 5, 11, 0.25);
      o.connect(lp);
      return;
    }
    case "trumpet":
    case "trombone":
    case "horn":
    case "tuba": {
      const top = inst === "trumpet" ? Math.min(7000, f * 7) : inst === "trombone" ? Math.min(3200, f * 4) : inst === "horn" ? Math.min(1600, f * 2.4) : Math.min(800, f * 4);
      const atk = inst === "trumpet" ? 0.03 : inst === "tuba" ? 0.06 : 0.055;
      const stop = adsr(g, t, atk, 0.2, 0.85, v * (inst === "tuba" ? 0.3 : 0.2), off, 0.12);
      const lp = filt(ctx, "lowpass", f * 1.1, 0.8);
      lp.frequency.linearRampToValueAtTime(top, t + atk + 0.04);
      lp.frequency.setTargetAtTime(top * 0.75, t + atk + 0.05, 0.25);
      lp.connect(g);
      const o = osc(ctx, inst === "horn" ? pwave(ctx, "horn", [1, 0.5, 0.25, 0.12, 0.06]) : "sawtooth", f, t, stop);
      o.detune.setValueAtTime(-28, t);
      o.detune.linearRampToValueAtTime(0, t + 0.045);
      if (inst === "trumpet") vibrato(ctx, o.detune, t, stop, 5.5, 4, 0.3);
      o.connect(lp);
      return;
    }
    case "organ": {
      const stop = adsr(g, t, 0.012, 0.05, 1, v * 0.13, off, 0.07);
      const o = osc(ctx, pwave(ctx, "organ", [1, 0.95, 0.6, 0.75, 0.25, 0.4, 0, 0.22]), f, t, stop);
      vibrato(ctx, o.detune, t, stop, 6.2, 5, 0);
      const trem = osc(ctx, "sine", 5.8, t, stop);
      const tg = ctx.createGain();
      tg.gain.value = 0.12;
      const amp = ctx.createGain();
      amp.gain.value = 0.88;
      trem.connect(tg).connect(amp.gain);
      o.connect(amp).connect(g);
      return;
    }
    case "accordion":
    case "harmonica": {
      const stop = adsr(g, t, 0.04, 0.15, 0.9, v * (inst === "accordion" ? 0.1 : 0.16), off, 0.08);
      const bp = inst === "accordion" ? filt(ctx, "lowpass", 2600, 0.8) : filt(ctx, "bandpass", 1500, 0.6);
      bp.connect(g);
      if (inst === "accordion") for (const dt of [-7, 7]) osc(ctx, "sawtooth", f, t, stop, dt).connect(bp);
      else {
        const o = osc(ctx, pwave(ctx, "harp-mo", [1, 0.65, 0.5, 0.32, 0.2]), f, t, stop);
        vibrato(ctx, o.detune, t, stop, 6, 9, 0.15);
        o.connect(bp);
      }
      return;
    }
    case "synth": {
      const stop = adsr(g, t, 0.008, 0.25, 0.7, v * 0.12, off, 0.12);
      const lp = filt(ctx, "lowpass", f * 7, 4);
      lp.frequency.setTargetAtTime(f * 3, t + 0.01, 0.15);
      lp.connect(g);
      for (const dt of [-8, 8]) osc(ctx, "sawtooth", f, t, stop, dt).connect(lp);
      return;
    }
    case "pad": {
      const stop = adsr(g, t, 0.45, 0.6, 0.9, v * 0.085, off, 0.9);
      const lp = filt(ctx, "lowpass", 1500, 0.6);
      lp.connect(g);
      for (const dt of [-11, 0, 10]) osc(ctx, "sawtooth", f, t, stop, dt).connect(lp);
      return;
    }
    case "choir": {
      const stop = adsr(g, t, 0.22, 0.4, 0.9, v * 0.5, off, 0.4);
      const forms: [number, number][] = [[800, 1], [1150, 0.55], [2900, 0.25]];
      const mix = ctx.createGain();
      mix.gain.value = 1;
      mix.connect(g);
      for (const dt of [-6, 6]) {
        const src = osc(ctx, "sawtooth", f, t, stop, dt);
        vibrato(ctx, src.detune, t, stop, 5.2, 8, 0.3);
        for (const [ff, a] of forms) {
          const bp = filt(ctx, "bandpass", ff, 9);
          const fg = ctx.createGain();
          fg.gain.value = a * 0.6;
          src.connect(bp).connect(fg).connect(mix);
        }
      }
      return;
    }
    case "eguitar": {
      const stop = adsr(g, t, 0.004, 0.3, 0.75, v * 0.09, off, 0.1);
      const hp = filt(ctx, "highpass", 100, 0.7);
      const cab = filt(ctx, "lowpass", 3300, 0.9);
      const dist = drive(ctx, 9);
      hp.connect(dist).connect(cab).connect(g);
      for (const dt of [-5, 5]) osc(ctx, "sawtooth", f, t, stop, dt).connect(hp);
      return;
    }
    case "synthbass": {
      const stop = strike(g, t, v * 0.55, 0.6, off + 0.05, 0.12);
      const o = osc(ctx, "sine", f * 1.8, t, stop);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
      const sat = drive(ctx, 2.5);
      o.connect(sat).connect(g);
      return;
    }
    case "timpani": {
      for (const [r, a, tau] of [[1, 1, 1.4], [1.5, 0.45, 0.7], [1.98, 0.25, 0.45], [2.44, 0.12, 0.3]]) {
        const pg = ctx.createGain();
        const stop = strike(pg, t, v * 0.5 * a, tau, off + 1.5, 0.5);
        const o = osc(ctx, "sine", f * r * 1.015, t, stop);
        o.frequency.exponentialRampToValueAtTime(f * r, t + 0.08);
        o.connect(pg).connect(g);
      }
      g.gain.value = 1;
      return;
    }
  }
}

// ── Drums ────────────────────────────────────────────────────────────────────────────────────
function noiseHit(ctx: Ctx, out: AudioNode, t: number, tau: number, v: number, chain: AudioNode[], attack = 0.002) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(v, t + attack);
  g.gain.setTargetAtTime(0.0001, t + attack, tau);
  const src = noiseSrc(ctx, t, t + tau * 6 + attack);
  let n: AudioNode = src;
  for (const c of chain) {
    n.connect(c);
    n = c;
  }
  n.connect(g).connect(out);
}
function toneHit(ctx: Ctx, out: AudioNode, t: number, f0: number, f1: number, sweep: number, tau: number, v: number, type: OscillatorType = "sine") {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(v, t + 0.002);
  g.gain.setTargetAtTime(0.0001, t + 0.002, tau);
  const o = osc(ctx, type, f0, t, t + tau * 6 + 0.01);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + sweep);
  o.connect(g).connect(out);
}
function drum(ctx: Ctx, out: AudioNode, k: DrumId, t: number, v0: number) {
  const v = v0 * (DRUM_GAIN[k] ?? 1);
  switch (k) {
    case "kick":
      toneHit(ctx, out, t, 160, 44, 0.11, 0.12, v * 1.1);
      noiseHit(ctx, out, t, 0.004, v * 0.25, [filt(ctx, "highpass", 3000)]);
      return;
    case "bassdrum":
      toneHit(ctx, out, t, 95, 52, 0.15, 0.18, v * 1.1);
      noiseHit(ctx, out, t, 0.06, v * 0.3, [filt(ctx, "lowpass", 260)]);
      return;
    case "snare":
      noiseHit(ctx, out, t, 0.055, v * 0.5, [filt(ctx, "highpass", 1100), filt(ctx, "bandpass", 2600, 0.6)]);
      toneHit(ctx, out, t, 200, 160, 0.06, 0.035, v * 0.45, "triangle");
      return;
    case "hat":
      noiseHit(ctx, out, t, 0.014, v * 0.32, [filt(ctx, "highpass", 7200), filt(ctx, "bandpass", 10000, 1)]);
      return;
    case "openhat":
      noiseHit(ctx, out, t, 0.11, v * 0.28, [filt(ctx, "highpass", 6800), filt(ctx, "bandpass", 9500, 0.8)]);
      return;
    case "clap":
      for (const dt of [0, 0.009, 0.019]) noiseHit(ctx, out, t + dt, 0.006, v * 0.5, [filt(ctx, "bandpass", 1150, 1.6)]);
      noiseHit(ctx, out, t + 0.026, 0.045, v * 0.4, [filt(ctx, "bandpass", 1150, 1.4)]);
      return;
    case "snap":
      noiseHit(ctx, out, t, 0.012, v * 0.5, [filt(ctx, "bandpass", 2300, 2)]);
      toneHit(ctx, out, t, 1900, 1700, 0.01, 0.008, v * 0.2);
      return;
    case "stomp":
      toneHit(ctx, out, t, 85, 60, 0.08, 0.07, v * 0.9);
      noiseHit(ctx, out, t, 0.04, v * 0.4, [filt(ctx, "lowpass", 500)]);
      return;
    case "tom":
      toneHit(ctx, out, t, 200, 135, 0.18, 0.1, v * 0.8);
      noiseHit(ctx, out, t, 0.02, v * 0.12, [filt(ctx, "bandpass", 900, 1)]);
      return;
    case "lowtom":
      toneHit(ctx, out, t, 125, 82, 0.22, 0.13, v * 0.85);
      return;
    case "crash":
    case "cymbals":
      noiseHit(ctx, out, t, k === "crash" ? 0.5 : 0.7, v * 0.28, [filt(ctx, "highpass", k === "crash" ? 4200 : 3000), filt(ctx, "peaking", 7000, 1, 5)]);
      return;
    case "ride":
      noiseHit(ctx, out, t, 0.22, v * 0.13, [filt(ctx, "highpass", 6200)]);
      toneHit(ctx, out, t, 4200, 4200, 0, 0.2, v * 0.05);
      return;
    case "cowbell": {
      const g = ctx.createGain();
      g.gain.setValueAtTime(v * 0.18, t);
      g.gain.setTargetAtTime(0.0001, t + 0.01, 0.08);
      const bp = filt(ctx, "bandpass", 800, 2);
      bp.connect(g).connect(out);
      osc(ctx, "square", 545, t, t + 0.5).connect(bp);
      osc(ctx, "square", 815, t, t + 0.5).connect(bp);
      return;
    }
    case "shaker":
      noiseHit(ctx, out, t, 0.022, v * 0.22, [filt(ctx, "bandpass", 6200, 1)], 0.012);
      return;
    case "maracas":
      noiseHit(ctx, out, t, 0.018, v * 0.22, [filt(ctx, "bandpass", 5200, 1.2)], 0.008);
      noiseHit(ctx, out, t + 0.03, 0.015, v * 0.15, [filt(ctx, "bandpass", 5200, 1.2)], 0.006);
      return;
    case "tamb":
      noiseHit(ctx, out, t, 0.05, v * 0.25, [filt(ctx, "highpass", 6500)]);
      for (const dt of [0.012, 0.028, 0.045]) noiseHit(ctx, out, t + dt, 0.012, v * 0.12, [filt(ctx, "bandpass", 8500, 3)]);
      return;
    case "triangle":
      for (const [ff, a, tau] of [[2900, 0.12, 0.6], [4180, 0.07, 0.4], [5600, 0.04, 0.25]] as const) toneHit(ctx, out, t, ff, ff, 0, tau, v * a);
      return;
    case "block":
      toneHit(ctx, out, t, 980, 940, 0.02, 0.025, v * 0.5);
      noiseHit(ctx, out, t, 0.006, v * 0.2, [filt(ctx, "bandpass", 2200, 2)]);
      return;
    case "rim":
      toneHit(ctx, out, t, 1700, 1600, 0.01, 0.01, v * 0.3);
      noiseHit(ctx, out, t, 0.008, v * 0.25, [filt(ctx, "bandpass", 3100, 2)]);
      return;
    case "sticks":
      toneHit(ctx, out, t, 2500, 2300, 0.01, 0.012, v * 0.35);
      noiseHit(ctx, out, t, 0.006, v * 0.2, [filt(ctx, "bandpass", 4200, 2)]);
      return;
    case "bongo":
      toneHit(ctx, out, t, 440, 395, 0.05, 0.06, v * 0.6);
      noiseHit(ctx, out, t, 0.005, v * 0.12, [filt(ctx, "bandpass", 2000, 1)]);
      return;
    case "conga":
      toneHit(ctx, out, t, 270, 245, 0.06, 0.09, v * 0.65);
      noiseHit(ctx, out, t, 0.006, v * 0.1, [filt(ctx, "bandpass", 1500, 1)]);
      return;
    case "timpani":
      toneHit(ctx, out, t, 112, 98, 0.1, 0.45, v * 0.75);
      toneHit(ctx, out, t, 168, 150, 0.1, 0.25, v * 0.25);
      return;
    case "gong":
      for (const [ff, a] of [[110, 0.3], [147, 0.18], [196, 0.14], [233, 0.1], [311, 0.07]] as const) {
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(v * a, t + 0.06);
        g.gain.setTargetAtTime(0.0001, t + 0.06, 1.4);
        osc(ctx, "sine", ff, t, t + 6).connect(g).connect(out);
      }
      noiseHit(ctx, out, t, 0.6, v * 0.05, [filt(ctx, "lowpass", 900)], 0.05);
      return;
  }
}

// ── Playing scores ───────────────────────────────────────────────────────────────────────────
type Ev = { b: number; d: number; track: number; inst?: InstId; drum?: DrumId; p: number[]; v: number };
export type Playback = {
  /** Stop now (a quick fade). */
  stop: () => void;
  /** Where the music is, in beats from its start, as HEARD (−1 before it starts). */
  beat: () => number;
  playing: () => boolean;
  /** When beat 0 is scheduled (audio-clock time) and seconds per beat. */
  t0: number;
  spb: number;
  /** When a beat is scheduled (audio clock, swing included) — compare taps (tapTime) with this. */
  timeOf: (beat: number) => number;
  /** Length of one pass (beats). */
  len: number;
};

/** Map straight beats to swung time (eighth-note swing; 0.33 ≈ triplet feel). */
const swingMap = (b: number, s: number) => {
  if (!s) return b;
  const whole = Math.floor(b);
  const f = b - whole;
  const mid = 0.5 + s / 2;
  return whole + (f <= 0.5 ? (f / 0.5) * mid : mid + ((f - 0.5) / 0.5) * (1 - mid));
};

function eventsOf(score: Score): Ev[] {
  const evs: Ev[] = [];
  score.tracks.forEach((tr, ti) => {
    const vol = tr.vol ?? 1;
    if (tr.kind === "drums") for (const h of tr.hits) evs.push({ b: h.t, d: 0.25, track: ti, drum: h.k, p: [], v: (h.v ?? 0.8) * vol });
    else {
      let b = tr.at ?? 0;
      for (const n of tr.notes) {
        if (n.p !== null) evs.push({ b, d: n.d, track: ti, inst: tr.inst, p: Array.isArray(n.p) ? n.p : [n.p], v: (n.v ?? 0.8) * vol });
        b += n.d;
      }
    }
  });
  return evs.sort((a, b) => a.b - b.b);
}

let nowPlaying: Playback[] = [];
const listeners = new Set<() => void>();
let snapshot: { playing: boolean; bpm: number; t0: number } = { playing: false, bpm: 100, t0: 0 };
function publish() {
  const top = nowPlaying[nowPlaying.length - 1];
  const next = top ? { playing: true, bpm: Math.round(60 / top.spb), t0: top.t0 + audioDelay() } : { playing: false, bpm: snapshot.bpm, t0: snapshot.t0 };
  if (next.playing !== snapshot.playing || next.bpm !== snapshot.bpm || next.t0 !== snapshot.t0) {
    snapshot = next;
    listeners.forEach((l) => l());
  }
}
/** Subscribe to "is music playing, at what tempo" (the pet grooves to it). */
export function subscribeMusic(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
export const musicSnapshot = () => snapshot;
const SERVER_SNAPSHOT = { playing: false, bpm: 100, t0: 0 };
export const musicServerSnapshot = () => SERVER_SNAPSHOT;

/** The tablet's delay between scheduling a sound and hearing it (s). */
export function audioDelay(): number {
  const ctx = getAudioCtx();
  if (!ctx) return 0;
  const out = (ctx as AudioContext & { outputLatency?: number }).outputLatency ?? 0;
  return Math.min(0.35, (Number.isFinite(out) ? out : 0) + (ctx.baseLatency || 0));
}
/** The audio-clock time of the sound the child was HEARING when they tapped (from the pointer
 *  event's own timestamp, so a busy screen doesn't make a tap look late). Compare with timeOf(). */
export function tapTime(e?: { timeStamp: number }): number {
  const ctx = getAudioCtx();
  if (!ctx) return 0;
  const age = e && typeof performance !== "undefined" ? Math.max(0, Math.min(0.5, (performance.now() - e.timeStamp) / 1000)) : 0;
  const ts = (ctx as AudioContext & { getOutputTimestamp?: () => { contextTime?: number; performanceTime?: number } }).getOutputTimestamp?.();
  if (e && ts && ts.contextTime && ts.performanceTime) {
    const t = ts.contextTime + (e.timeStamp - ts.performanceTime) / 1000;
    if (Math.abs(t - (ctx.currentTime - audioDelay())) < 0.6) return t;
  }
  return ctx.currentTime - audioDelay() - age;
}
/** The audio clock now (s). */
export const audioNow = () => getAudioCtx()?.currentTime ?? 0;

/** Play a score. Only one score plays at a time unless `layer` is set (pads still play over). */
export function playScore(score: Score, o: { loop?: boolean; onEnd?: () => void; layer?: boolean; gain?: number; lead?: number; muteTracks?: number[]; /** Start from this beat (a live edit keeps the music going from where it was). */ from?: number } = {}): Playback | null {
  const b = ready();
  if (!b) return null;
  if (!o.layer) stopAllMusic();
  stopVoice();
  const ctx = b.ctx;
  const spb = 60 / score.bpm;
  const swing = score.swing ?? 0;
  const len = scoreBeats(score);
  const evs = eventsOf(score).filter((e) => !o.muteTracks?.includes(e.track));
  // Per-playback chain: gain → (muffle) → pan → bus, with a reverb send.
  const out = ctx.createGain();
  out.gain.value = (o.gain ?? 1) * (score.fx?.gain ?? 1);
  let node: AudioNode = out;
  if (score.fx?.lowpass) {
    const lp = filt(ctx, "lowpass", 12000 * Math.pow(1 - Math.min(0.95, score.fx.lowpass), 2) + 300, 0.7);
    node.connect(lp);
    node = lp;
  }
  if (score.fx?.pan && "createStereoPanner" in ctx) {
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, score.fx.pan));
    node.connect(p);
    node = p;
  }
  node.connect(b.input);
  const send = ctx.createGain();
  send.gain.value = 0.25 + (score.fx?.reverb ?? 0) * 1.4;
  node.connect(send).connect(b.verbIn);

  const from = Math.max(0, o.from ?? 0) % Math.max(1e-6, len || 1);
  const start = ctx.currentTime + (o.lead ?? 0.08) - swingMap(from, swing) * spb;
  let pass = 0;
  let i = 0;
  while (i < evs.length && evs[i].b < from - 1e-6) i++;
  let stopped = false;
  let ended = false;
  const timeOf = (beat: number) => start + swingMap(beat, swing) * spb;
  const tick = () => {
    if (stopped) return;
    const horizon = ctx.currentTime + 0.14;
    for (;;) {
      if (i >= evs.length) {
        if (o.loop && len > 0) {
          pass++;
          i = 0;
          if (!evs.length) break;
        } else break;
      }
      const e = evs[i];
      const at = timeOf(e.b + pass * len);
      if (at > horizon) break;
      const off = timeOf(e.b + e.d + pass * len) - 0.012;
      try {
        if (e.drum) drum(ctx, out, e.drum, at, e.v);
        else if (e.inst) for (const p of e.p) voice(ctx, out, e.inst, p, at, off, e.v / Math.sqrt(Math.max(1, e.p.length * 0.6)));
      } catch {
        /* a voice the browser can't build is skipped */
      }
      i++;
    }
    const endAt = start + swingMap(len, swing) * spb;
    if (!o.loop && i >= evs.length && ctx.currentTime > endAt + 0.05 && !ended) {
      ended = true;
      finish();
      o.onEnd?.();
    }
  };
  const timer = window.setInterval(tick, 25);
  const delay = audioDelay();
  const pb: Playback = {
    stop: () => {
      if (stopped) return;
      stopped = true;
      const now = ctx.currentTime;
      out.gain.cancelScheduledValues(now);
      out.gain.setValueAtTime(out.gain.value, now);
      out.gain.linearRampToValueAtTime(0, now + 0.06);
      finish();
    },
    beat: () => (stopped ? -1 : (ctx.currentTime - start - delay) / spb),
    playing: () => !stopped && !ended,
    t0: start,
    spb,
    len,
    timeOf,
  };
  function finish() {
    stopped = true;
    window.clearInterval(timer);
    window.setTimeout(() => {
      try {
        out.disconnect();
        send.disconnect();
      } catch {
        /* already gone */
      }
    }, 400);
    nowPlaying = nowPlaying.filter((x) => x !== pb);
    publish();
  }
  nowPlaying.push(pb);
  publish();
  tick();
  return pb;
}

/** Stop every score that's playing. */
export function stopAllMusic() {
  for (const p of [...nowPlaying]) p.stop();
}

/** Play one note right now (pads, keyboards, bells). `secs` = how long it's held. */
export function playNote(inst: InstId, midi: number, secs = 0.6, v = 0.85) {
  const b = ready();
  if (!b) return;
  const t = b.ctx.currentTime + 0.005;
  try {
    voice(b.ctx, b.input, inst, midi, t, t + secs, v);
  } catch {
    /* ignore */
  }
}
/** Hit one drum right now. */
export function playDrum(k: DrumId, v = 0.9) {
  const b = ready();
  if (!b) return;
  try {
    drum(b.ctx, b.input, k, b.ctx.currentTime + 0.003, v);
  } catch {
    /* ignore */
  }
}
/** A held tone you can steer (the wave lab): set its pitch and loudness live. */
export function liveTone(hz: number, amp: number) {
  const b = ready();
  if (!b) return null;
  const ctx = b.ctx;
  const o = ctx.createOscillator();
  o.type = "sine";
  o.frequency.value = hz;
  const g = ctx.createGain();
  g.gain.value = 0;
  g.gain.linearRampToValueAtTime(amp * 0.3, ctx.currentTime + 0.05);
  o.connect(g).connect(b.input);
  o.start();
  return {
    set(nhz: number, namp: number) {
      o.frequency.setTargetAtTime(nhz, ctx.currentTime, 0.03);
      g.gain.setTargetAtTime(namp * 0.3, ctx.currentTime, 0.03);
    },
    stop() {
      g.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
      o.stop(ctx.currentTime + 0.2);
      window.setTimeout(() => g.disconnect(), 400);
    },
  };
}
/** Is sound on (music lessons say so if it isn't)? */
export const musicAudible = () => sfxOn();

/** A level meter on the music output (the dev page uses it to prove sound is really produced). */
let meter: AnalyserNode | null = null;
export function musicMeter(): AnalyserNode | null {
  const b = getBus();
  if (!b) return null;
  if (meter && meter.context === b.ctx) return meter;
  meter = b.ctx.createAnalyser();
  meter.fftSize = 2048;
  b.master.connect(meter);
  return meter;
}

// Development only: the playback in progress, so browser tests can tap in time with it.
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") Object.assign(window as unknown as Record<string, unknown>, { __harborPlaying: () => nowPlaying[nowPlaying.length - 1] ?? null, __harborCtx: () => getAudioCtx() });
