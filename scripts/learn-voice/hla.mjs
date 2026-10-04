// HLA — Harbor Learn Audio: 4-bit IMA ADPCM in a tiny container, about a sixth the size of 16-bit
// WAV at 16 kHz and decoded by lib/learn/hla.ts in a few lines of JS (so it plays on every
// browser, no codec needed). Header (16 bytes): "HLA1", sample rate u32, samples u32, block
// samples u16, 0 u16. Each block: predictor i16, step index u8, 0 u8, then one nibble per
// sample (low nibble first). The encoder tries all 16 codes per sample and keeps the closest.
//
// Keep the tables + decode step identical to lib/learn/hla.ts.

export const STEPS = [
  7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45, 50, 55, 60, 66, 73, 80, 88, 97, 107, 118, 130, 143,
  157, 173, 190, 209, 230, 253, 279, 307, 337, 371, 408, 449, 494, 544, 598, 658, 724, 796, 876, 963, 1060, 1166, 1282, 1411, 1552,
  1707, 1878, 2066, 2272, 2499, 2749, 3024, 3327, 3660, 4026, 4428, 4871, 5358, 5894, 6484, 7132, 7845, 8630, 9493, 10442, 11487,
  12635, 13899, 15289, 16818, 18500, 20350, 22385, 24623, 27086, 29794, 32767,
];
export const INDEX = [-1, -1, -1, -1, 2, 4, 6, 8];
const BLOCK = 2048;

function step(pred, index, code) {
  const s = STEPS[index];
  let d = s >> 3;
  if (code & 4) d += s;
  if (code & 2) d += s >> 1;
  if (code & 1) d += s >> 2;
  pred += code & 8 ? -d : d;
  pred = Math.max(-32768, Math.min(32767, pred));
  index = Math.max(0, Math.min(88, index + INDEX[code & 7]));
  return [pred, index];
}

/** Float samples (−1…1) → HLA bytes. */
export function encodeHLA(samples, rate) {
  const pcm = Int16Array.from(samples, (v) => Math.round(Math.max(-1, Math.min(1, v)) * 32767));
  const blocks = Math.ceil(pcm.length / BLOCK);
  const out = Buffer.alloc(16 + blocks * 4 + Math.ceil(pcm.length / 2) + blocks);
  out.write("HLA1", 0);
  out.writeUInt32LE(rate, 4);
  out.writeUInt32LE(pcm.length, 8);
  out.writeUInt16LE(BLOCK, 12);
  let o = 16;
  let pred = 0;
  let index = 0;
  for (let b = 0; b < blocks; b++) {
    const start = b * BLOCK;
    const n = Math.min(BLOCK, pcm.length - start);
    pred = pcm[start];
    out.writeInt16LE(pred, o);
    out[o + 2] = index;
    out[o + 3] = 0;
    o += 4;
    for (let i = 0; i < n; i++) {
      const target = pcm[start + i];
      let best = 0;
      let bestErr = Infinity;
      let bestState = [pred, index];
      for (let code = 0; code < 16; code++) {
        const st = step(pred, index, code);
        const err = Math.abs(st[0] - target);
        if (err < bestErr) {
          bestErr = err;
          best = code;
          bestState = st;
        }
      }
      [pred, index] = bestState;
      if (i % 2 === 0) out[o] = best;
      else out[o++] |= best << 4;
    }
    if (n % 2 === 1) o++;
  }
  return out.subarray(0, o);
}

/** Decode (for round-trip tests). */
export function decodeHLA(buf) {
  const rate = buf.readUInt32LE(4);
  const n = buf.readUInt32LE(8);
  const block = buf.readUInt16LE(12);
  const out = new Float32Array(n);
  let o = 16;
  for (let start = 0; start < n; start += block) {
    let pred = buf.readInt16LE(o);
    let index = buf[o + 2];
    o += 4;
    const m = Math.min(block, n - start);
    for (let i = 0; i < m; i++) {
      const code = i % 2 === 0 ? buf[o] & 15 : buf[o++] >> 4;
      [pred, index] = step(pred, index, code);
      out[start + i] = pred / 32768;
    }
    if (m % 2 === 1) o++;
  }
  return { rate, samples: out };
}

/** 24 kHz → 16 kHz: low-pass at 7.4 kHz, then sample every 1.5 input samples (cubic). */
export function to16k(x, lowpass) {
  const y = lowpass(x, 7400, 63);
  const n = Math.floor((y.length * 2) / 3);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i * 1.5;
    const k = Math.floor(t);
    const f = t - k;
    const p0 = y[k - 1] ?? y[k] ?? 0, p1 = y[k] ?? 0, p2 = y[k + 1] ?? p1, p3 = y[k + 2] ?? p2;
    out[i] = p1 + 0.5 * f * (p2 - p0 + f * (2 * p0 - 5 * p1 + 4 * p2 - p3 + f * (3 * (p1 - p2) + p3 - p0)));
  }
  return out;
}
