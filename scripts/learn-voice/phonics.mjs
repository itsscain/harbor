// Phonics sounds that sound like a teacher saying them. A TTS voice can't say a lone "b" or
// "mmm" cleanly (it adds a vowel or a breath before an utterance-initial consonant), so each
// sound is synthesized inside a natural carrier syllable and cut out by its acoustic signature
// (see extract.mjs): held sounds are sustained pitch-synchronously (voiced) or granularly
// (noise); stops keep just the burst plus the tiniest vowel.
import * as D from "./dsp.mjs";
import { extract } from "./extract.mjs";

// id → carrier IPA, extraction class, hold length (ms) for held sounds.
export const SPECS = {
  m: ["hˈʌm", "final-nasal", 560], n: ["fˈʌn", "final-nasal", 560], ng: ["sˈɪŋ", "final-nasal", 520],
  l: ["lˈɪ", "liquid", 520], r: ["ɹˈɑ", "liquid", 520],
  s: ["jˈɛs", "final-fric", 560], f: ["lˈiːf", "final-fric", 560], sh: ["fˈɪʃ", "final-fric", 560], th: ["bˈæθ", "final-fric", 520],
  v: ["vˈæn", "vfric", 520], z: ["zˈuː", "vfric", 520],
  a: ["hˈæd", "vowel", 420], e: ["hˈɛd", "vowel", 420], i: ["hˈɪd", "vowel", 420], o: ["hˈɑd", "vowel", 420], u: ["hˈʌd", "vowel", 420],
  a_e: ["hˈeɪ", "open-vowel", 0], i_e: ["hˈaɪ", "open-vowel", 0], o_e: ["hˈoʊ", "open-vowel", 0], u_e: ["hˈuː", "open-vowel", 0], ee: ["hˈiː", "open-vowel", 0],
  ar: ["kˈɑɹ", "open-vowel", 0], or: ["dˈɔɹ", "open-vowel", 0], er: ["hˈɝ", "open-vowel", 0], ow: ["hˈaʊ", "open-vowel", 0], oi: ["hˈɔɪ", "open-vowel", 0],
  t: ["tʰˈɑ", "stop", 0], p: ["pʰˈɑ", "stop", 0], k: ["kʰˈɑ", "stop", 0],
  b: ["bˈʌ", "vstop", 0], d: ["dˈʌ", "vstop", 0], g: ["ɡˈʌ", "vstop", 0],
  h: ["hˈʌ", "breath", 0], w: ["wˈʌ", "glide", 0], y: ["jˈʌ", "glide", 0],
  j: ["ʤˈʌ", "affricate-v", 0], ch: ["ʧˈʌ", "affricate", 0], x: ["ˈæks", "final-ks", 0], q: ["kwˈʌ", "glide", 0],
};
/** Spellings that make a sound already in the table. */
export const ALIAS = { c: "k", ck: "k", ai: "a_e", oa: "o_e", oo: "u_e" };

export const specFor = (id) => SPECS[id] ?? SPECS[ALIAS[id]] ?? null;
const QUICK = new Set(["stop", "vstop", "affricate", "affricate-v", "breath", "glide"]);
export const speedFor = (cls) => (QUICK.has(cls) ? 0.9 : 0.75);

/** Make one phonics clip: synth(ipa, speed) → Float32Array at 24 kHz. */
export async function phonicsClip(id, synth) {
  const spec = specFor(id);
  if (!spec) return null;
  const [ipa, cls, hold] = spec;
  const x = await synth(ipa, speedFor(cls));
  return { ...extract(x, cls, hold), carrier: x, cls };
}

/** A verification sheet: per sound, the carrier spectrogram (0–8 kHz, cut marked) and the clip. */
export function sheet(results) {
  const HOP = 240, CW = 300, KW = 200, TH = 150, PAD = 6, PER_ROW = 2;
  const W = (CW + KW + PAD * 3) * PER_ROW;
  const H = Math.ceil(results.length / PER_ROW) * (TH + PAD);
  const img = new Uint8Array(W * H * 3).fill(18);
  const draw = (sig, ox, oy, w, h, marks = []) => {
    const S = D.spectrogram(sig, 120, 512, 512);
    let mx = -1e9;
    for (const row of S) for (const v of row) mx = Math.max(mx, v);
    const binMax = Math.floor((8000 / D.RATE) * 512);
    for (let px = 0; px < w; px++) {
      const f = S[Math.floor((px / w) * S.length)];
      for (let py = 0; py < h; py++) {
        const bin = Math.floor(((h - 1 - py) / h) * binMax);
        const [r, g, b] = f ? D.heat((f[bin] - (mx - 65)) / 65) : [0, 0, 0];
        const o = ((oy + py) * W + ox + px) * 3;
        img[o] = r;
        img[o + 1] = g;
        img[o + 2] = b;
      }
    }
    for (const [t, col] of marks) {
      const px = Math.min(w - 1, Math.max(0, Math.round((t / (sig.length / D.RATE)) * w)));
      for (let py = 0; py < h; py++) {
        const o = ((oy + py) * W + ox + px) * 3;
        img[o] = col[0];
        img[o + 1] = col[1];
        img[o + 2] = col[2];
      }
    }
  };
  results.forEach((r, i) => {
    const ox = (i % PER_ROW) * (CW + KW + PAD * 3) + PAD;
    const oy = Math.floor(i / PER_ROW) * (TH + PAD);
    draw(r.carrier, ox, oy, CW, TH, [[(r.a * HOP) / D.RATE, [0, 255, 0]], [(r.b * HOP) / D.RATE, [255, 60, 60]]]);
    draw(r.clip, ox + CW + PAD, oy, KW, TH);
  });
  return D.png(W, H, img);
}
