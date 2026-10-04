// Small DSP toolkit for extracting clean phonics sounds from synthesized carrier syllables:
// framing features (RMS, zero-crossing rate, spectral centroid, periodicity), FFT spectrograms,
// pitch-synchronous sustain (voiced) and granular sustain (noise), and a tiny PNG writer so the
// extractions can be checked by eye as spectrogram sheets.
import { deflateSync } from "node:zlib";

export const RATE = 24000;

export function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ar = re[i + k], ai = im[i + k];
        const br = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const bi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ar + br; im[i + k] = ai + bi;
        re[i + k + len / 2] = ar - br; im[i + k + len / 2] = ai - bi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}

/** Per-frame features (10ms hop, 25ms window). */
export function features(x, hop = 240, win = 600) {
  const out = [];
  const N = 1024;
  for (let s = 0; s + win <= x.length; s += hop) {
    let e = 0, zc = 0;
    for (let i = s; i < s + win; i++) {
      e += x[i] * x[i];
      if (i > s && (x[i] >= 0) !== (x[i - 1] >= 0)) zc++;
    }
    const rms = Math.sqrt(e / win);
    // spectral centroid
    const re = new Float64Array(N), im = new Float64Array(N);
    for (let i = 0; i < win; i++) re[i] = x[s + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (win - 1)));
    fft(re, im);
    let num = 0, den = 0;
    for (let k = 1; k < N / 2; k++) {
      const m = Math.hypot(re[k], im[k]);
      num += m * ((k * RATE) / N);
      den += m;
    }
    // periodicity: normalized autocorrelation peak for pitch 90-450 Hz
    let best = 0, bestLag = 0;
    const minLag = Math.floor(RATE / 450), maxLag = Math.floor(RATE / 90);
    let e0 = 0;
    for (let i = s; i < s + win; i++) e0 += x[i] * x[i];
    for (let lag = minLag; lag <= maxLag; lag++) {
      let c = 0, e1 = 0;
      for (let i = s; i + lag < s + win; i++) {
        c += x[i] * x[i + lag];
        e1 += x[i + lag] * x[i + lag];
      }
      const r = c / Math.sqrt(e0 * e1 + 1e-12);
      if (r > best) { best = r; bestLag = lag; }
    }
    out.push({ t: s / RATE, rms, db: 20 * Math.log10(rms + 1e-9), zcr: zc / win, centroid: den ? num / den : 0, per: best, lag: bestLag });
  }
  return out;
}

/** Magnitude spectrogram (dB) as rows of frames x bins. */
export function spectrogram(x, hop = 120, win = 512, N = 512) {
  const frames = [];
  for (let s = 0; s + win <= x.length; s += hop) {
    const re = new Float64Array(N), im = new Float64Array(N);
    for (let i = 0; i < win; i++) re[i] = x[s + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (win - 1)));
    fft(re, im);
    const row = new Float32Array(N / 2);
    for (let k = 0; k < N / 2; k++) row[k] = 20 * Math.log10(Math.hypot(re[k], im[k]) + 1e-9);
    frames.push(row);
  }
  return frames;
}

const hann = (n) => Float32Array.from({ length: n }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));

/** Hold a voiced steady sound: overlap-add pitch-period grains from the steady middle. */
export function sustainVoiced(seg, targetLen, period) {
  const P = Math.max(40, Math.round(period));
  const g = 2 * P;
  const w = hann(g);
  const out = new Float32Array(targetLen + g);
  // source grain centers sweep back and forth across the steady region (avoids a buzzy loop)
  const lo = Math.floor(seg.length * 0.2), hi = Math.floor(seg.length * 0.8) - g;
  let src = lo, dir = 1;
  for (let pos = 0; pos < targetLen; pos += P) {
    for (let i = 0; i < g; i++) out[pos + i] += (seg[src + i] ?? 0) * w[i];
    src += dir * P;
    if (src > hi || src < lo) { dir = -dir; src += 2 * dir * P; }
  }
  return out.slice(0, targetLen);
}

/** Hold a noise sound (s, sh, f…): overlap-add random 30ms grains from the steady region. */
export function sustainNoise(seg, targetLen, seed = 1) {
  const g = 720, hop = 360;
  const w = hann(g);
  const out = new Float32Array(targetLen + g);
  let h = seed * 2654435761;
  const rnd = () => ((h = Math.imul(h ^ (h >>> 13), 1274126177)) >>> 0) / 4294967296;
  const lo = Math.floor(seg.length * 0.15), hi = Math.max(lo + 1, Math.floor(seg.length * 0.85) - g);
  for (let pos = 0; pos < targetLen; pos += hop) {
    const src = lo + Math.floor(rnd() * (hi - lo));
    for (let i = 0; i < g; i++) out[pos + i] += (seg[src + i] ?? 0) * w[i];
  }
  return out.slice(0, targetLen);
}

export function fadeEnds(x, inMs = 15, outMs = 40) {
  const a = Math.round((inMs / 1000) * RATE), b = Math.round((outMs / 1000) * RATE);
  const y = Float32Array.from(x);
  for (let i = 0; i < a && i < y.length; i++) y[i] *= i / a;
  for (let i = 0; i < b && i < y.length; i++) y[y.length - 1 - i] *= i / b;
  return y;
}

export function normalize(x, targetRms = 0.16, peakMax = 0.89) {
  let s = 0, p = 0;
  for (const v of x) { s += v * v; p = Math.max(p, Math.abs(v)); }
  const rms = Math.sqrt(s / x.length);
  const g = Math.min(targetRms / Math.max(rms, 1e-6), peakMax / Math.max(p, 1e-6));
  return Float32Array.from(x, (v) => v * g);
}

// ── PNG (grayscale/RGB) ──────────────────────────────────────────────────────────────────────
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
/** rgb: Uint8Array of w*h*3 */
export function png(w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    rgb.subarray(y * w * 3, (y + 1) * w * 3).forEach((v, i) => (raw[y * (w * 3 + 1) + 1 + i] = v));
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

/** Heat colormap for spectrogram values 0..1 */
export function heat(v) {
  v = Math.max(0, Math.min(1, v));
  const r = Math.min(255, Math.max(0, 255 * (1.5 * v - 0.2)));
  const g = Math.min(255, Math.max(0, 255 * (1.6 * v - 0.65)));
  const b = Math.min(255, Math.max(0, 255 * (v < 0.4 ? v * 1.8 : 1.4 - 1.6 * (v - 0.4))));
  return [r, g, b];
}

/** Pitch marks: waveform peaks spaced ~one period apart across a voiced segment. */
export function pitchMarks(seg, period) {
  const P = Math.round(period);
  const marks = [];
  // start at the biggest peak in the first period, then hop ~P and re-center on the local peak
  let best = 0;
  for (let i = 0; i < Math.min(P, seg.length); i++) if (Math.abs(seg[i]) > Math.abs(seg[best])) best = i;
  let m = best;
  while (m < seg.length) {
    marks.push(m);
    const lo = m + Math.round(P * 0.8), hi = Math.min(seg.length - 1, m + Math.round(P * 1.2));
    if (lo >= seg.length) break;
    let pk = lo;
    for (let i = lo; i <= hi; i++) if (Math.abs(seg[i]) > Math.abs(seg[pk])) pk = i;
    m = pk;
  }
  return marks;
}

/** TD-PSOLA-style hold: two-period Hann grains centered on pitch marks, laid out at the original
 *  period, sweeping back and forth through the steady region. Smooth and natural, not buzzy. */
export function sustainPSOLA(seg, targetLen, period) {
  const P = Math.max(40, Math.round(period));
  const marks = pitchMarks(seg, P).filter((m) => m - P >= 0 && m + P < seg.length);
  if (marks.length < 4) return sustainVoiced(seg, targetLen, period);
  const lo = Math.floor(marks.length * 0.15), hi = Math.max(lo + 2, Math.floor(marks.length * 0.85));
  const out = new Float32Array(targetLen + 2 * P);
  const w = Float32Array.from({ length: 2 * P + 1 }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (2 * P)));
  // grain loudness, so every grain can be scaled to the steady level (no pulsing)
  const grainRms = marks.map((c) => {
    let s = 0;
    for (let i = -P; i <= P; i++) s += (seg[c + i] ?? 0) ** 2;
    return Math.sqrt(s / (2 * P + 1));
  });
  const target = [...grainRms.slice(lo, hi)].sort((x, y) => x - y)[Math.floor((hi - lo) / 2)] || 1;
  let k = lo, dir = 1;
  for (let pos = P; pos < targetLen + P; pos += P) {
    const c = marks[k];
    const gain = Math.min(2, target / Math.max(1e-6, grainRms[k]));
    for (let i = -P; i <= P; i++) out[pos + i] += (seg[c + i] ?? 0) * w[i + P] * gain;
    k += dir;
    if (k >= hi || k <= lo) dir = -dir;
  }
  return out.slice(P, targetLen + P);
}

/** Windowed-sinc low-pass (symmetric FIR, zero phase). */
export function lowpass(x, cutoffHz, taps = 101) {
  const fc = cutoffHz / RATE;
  const h = Float64Array.from({ length: taps }, (_, i) => {
    const m = i - (taps - 1) / 2;
    const sinc = m === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * m) / (Math.PI * m);
    return sinc * (0.42 - 0.5 * Math.cos((2 * Math.PI * i) / (taps - 1)) + 0.08 * Math.cos((4 * Math.PI * i) / (taps - 1)));
  });
  const half = (taps - 1) / 2;
  const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) {
    let acc = 0;
    for (let k = 0; k < taps; k++) acc += h[k] * (x[i + half - k] ?? 0);
    y[i] = acc;
  }
  return y;
}

/** Hold a voiced fricative (z, v): voicing (low band) held pitch-synchronously, the hiss (high
 *  band) held granularly, then summed — no warble from looping a noisy waveform. */
export function sustainVoicedFricative(seg, targetLen, period) {
  const low = lowpass(seg, 1100);
  const high = Float32Array.from(seg, (v, i) => v - low[i]);
  const a = sustainPSOLA(low, targetLen, period);
  const b = sustainNoise(high, targetLen, 7);
  return Float32Array.from(a, (v, i) => v + b[i]);
}

/** Energy in a frequency band (Hz) of a segment, from its averaged spectrum. */
export function bandEnergy(seg, lo, hi) {
  const S = spectrogram(seg, 240, 512, 512);
  let e = 0;
  for (const row of S)
    for (let k = 0; k < 256; k++) {
      const f = (k * RATE) / 512;
      if (f >= lo && f < hi) e += Math.pow(10, row[k] / 10);
    }
  return e;
}
