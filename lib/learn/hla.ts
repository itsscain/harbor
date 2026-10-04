// HLA — Harbor Learn Audio decoder (4-bit IMA ADPCM; see scripts/learn-voice/hla.mjs). Turns a
// clip's bytes into an AudioBuffer in a few milliseconds, on any browser.

const STEPS = [
  7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45, 50, 55, 60, 66, 73, 80, 88, 97, 107, 118, 130, 143,
  157, 173, 190, 209, 230, 253, 279, 307, 337, 371, 408, 449, 494, 544, 598, 658, 724, 796, 876, 963, 1060, 1166, 1282, 1411, 1552,
  1707, 1878, 2066, 2272, 2499, 2749, 3024, 3327, 3660, 4026, 4428, 4871, 5358, 5894, 6484, 7132, 7845, 8630, 9493, 10442, 11487,
  12635, 13899, 15289, 16818, 18500, 20350, 22385, 24623, 27086, 29794, 32767,
];
const INDEX = [-1, -1, -1, -1, 2, 4, 6, 8];

export const isHLA = (data: ArrayBuffer) => data.byteLength > 16 && new TextDecoder().decode(new Uint8Array(data, 0, 4)) === "HLA1";

export function decodeHLA(data: ArrayBuffer): { rate: number; samples: Float32Array<ArrayBuffer> } {
  const v = new DataView(data);
  const bytes = new Uint8Array(data);
  const rate = v.getUint32(4, true);
  const n = v.getUint32(8, true);
  const block = v.getUint16(12, true);
  const out = new Float32Array(n);
  let o = 16;
  for (let start = 0; start < n; start += block) {
    let pred = v.getInt16(o, true);
    let index = bytes[o + 2];
    o += 4;
    const m = Math.min(block, n - start);
    for (let i = 0; i < m; i++) {
      const code = i % 2 === 0 ? bytes[o] & 15 : bytes[o++] >> 4;
      const s = STEPS[index];
      let d = s >> 3;
      if (code & 4) d += s;
      if (code & 2) d += s >> 1;
      if (code & 1) d += s >> 2;
      pred += code & 8 ? -d : d;
      if (pred > 32767) pred = 32767;
      else if (pred < -32768) pred = -32768;
      index += INDEX[code & 7];
      if (index < 0) index = 0;
      else if (index > 88) index = 88;
      out[start + i] = pred / 32768;
    }
    if (m % 2 === 1) o++;
  }
  return { rate, samples: out };
}

/** HLA bytes → an AudioBuffer for this context. */
export function hlaBuffer(ctx: BaseAudioContext, data: ArrayBuffer): AudioBuffer {
  const { rate, samples } = decodeHLA(data);
  const buf = ctx.createBuffer(1, Math.max(1, samples.length), rate);
  buf.copyToChannel(samples, 0);
  return buf;
}
