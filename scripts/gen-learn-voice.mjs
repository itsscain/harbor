// Harbor Learn — record every line, word and letter sound in the Harbor voice (Kokoro af_bella),
// FREE and LOCAL (no API, no cloud, and no download: the model is read from node_modules).
//   node scripts/gen-learn-voice.mjs
// Output: public/learn-voice/<hash>.wav (16-bit mono, silence trimmed, loudness evened out)
//       + public/learn-voice/index.json  { v, voice, clips: { "<key>": "<file>" } }
// Keys come from lib/learn/script.ts allClips(): a line of text is its own key, a speech sound is
// "snd:<id>" and is voiced from exact IPA (so a short a is /æ/, never the letter name). Re-run
// after changing the curriculum: new clips are made, unchanged ones skipped, unused ones removed.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const require = createRequire(join(ROOT, "package.json"));
const OUT_DIR = join(ROOT, "public", "learn-voice");
const INDEX = join(OUT_DIR, "index.json");
const VOICE = "af_bella";
const VERSION = "learn-1";
const RATE = 24000;

// ── 1. Load the curriculum (TypeScript) by transpiling lib/learn to a temp folder ──────────
const ts = require("typescript");
const build = join(tmpdir(), "harbor-learn-voice-build");
rmSync(build, { recursive: true, force: true });
mkdirSync(build, { recursive: true });
for (const f of readdirSync(join(ROOT, "lib", "learn")).filter((f) => f.endsWith(".ts"))) {
  const src = readFileSync(join(ROOT, "lib", "learn", f), "utf8");
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  writeFileSync(join(build, f.replace(/\.ts$/, ".js")), js);
}
const { allClips } = createRequire(join(build, "x.js"))("./script.js");
const { SOUNDS } = createRequire(join(build, "x.js"))("./sounds.js");
const clips = allClips();

// Stop consonants are crisp bursts (full speed); held sounds and vowels are stretched so a
// child can really hear them; words are a touch slower than talking speed.
const STOPS = new Set(["t", "p", "c", "k", "ck", "ch", "x"]);
const speedOf = (c) => {
  if (c.kind === "sound") {
    const id = c.key.slice(4);
    if (STOPS.has(id)) return 1;
    return SOUNDS[id]?.ipa.includes("ə") ? 0.9 : 0.75;
  }
  return c.kind === "word" ? 0.85 : 0.92;
};
const fileOf = (c) => `${createHash("sha1").update(`${VOICE}|${speedOf(c)}|${c.ipa ? `ipa:${c.ipa}` : c.text}`).digest("hex").slice(0, 16)}.wav`;

// ── 2. Audio post-processing: trim silence, even loudness, soft edges, 16-bit WAV ────────────
function polish(samples) {
  const win = Math.round(RATE * 0.01);
  const rms = [];
  for (let i = 0; i < samples.length; i += win) {
    let s = 0;
    for (let j = i; j < Math.min(samples.length, i + win); j++) s += samples[j] * samples[j];
    rms.push(Math.sqrt(s / win));
  }
  const peakRms = Math.max(...rms, 1e-6);
  const gate = Math.max(0.004, peakRms * 0.06);
  let first = rms.findIndex((v) => v > gate);
  let last = rms.length - 1 - [...rms].reverse().findIndex((v) => v > gate);
  if (first < 0) return null;
  const start = Math.max(0, (first - 3) * win); // 30ms lead-in
  const end = Math.min(samples.length, (last + 9) * win); // 90ms tail
  const out = samples.slice(start, end);
  // Loudness: bring every clip to the same speaking level (peak-limited), so a quiet "t" is as
  // clear as a loud "mmm".
  let sum = 0;
  let peak = 0;
  for (const v of out) {
    sum += v * v;
    peak = Math.max(peak, Math.abs(v));
  }
  const loud = Math.sqrt(sum / out.length);
  const gain = Math.min(0.16 / Math.max(loud, 1e-6), 0.89 / Math.max(peak, 1e-6));
  const fade = Math.round(RATE * 0.008);
  for (let i = 0; i < out.length; i++) {
    let g = gain;
    if (i < fade) g *= i / fade;
    if (i > out.length - fade) g *= (out.length - i) / fade;
    out[i] *= g;
  }
  return out;
}

function wav16(samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), i * 2);
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

// ── 3. Generate what's missing ───────────────────────────────────────────────────────────────
mkdirSync(OUT_DIR, { recursive: true });
const prev = existsSync(INDEX) ? JSON.parse(readFileSync(INDEX, "utf8")) : { clips: {} };
const index = { v: VERSION, voice: VOICE, clips: {} };
const todo = [];
for (const c of clips) {
  const file = fileOf(c);
  index.clips[c.key] = file;
  if (!existsSync(join(OUT_DIR, file))) todo.push({ c, file });
}
console.log(`Harbor Learn voice: ${clips.length} clips, ${todo.length} to record`);
if (process.env.DRY) {
  const by = {};
  for (const c of clips) by[c.kind] = (by[c.kind] ?? 0) + 1;
  console.log(by);
  process.exit(0);
}

if (todo.length) {
  // ESM imports, so `env` is the same instance kokoro-js uses.
  const { KokoroTTS } = await import("kokoro-js");
  const { env } = await import("@huggingface/transformers");
  env.allowRemoteModels = false; // never download — the model lives in node_modules/.cache
  const t0 = Date.now();
  const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "q8", device: "cpu" });
  console.log(`model ready in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  let made = 0;
  let failed = 0;
  for (const { c, file } of todo) {
    try {
      const speed = speedOf(c);
      let audio;
      if (c.ipa) {
        const { input_ids } = tts.tokenizer(c.ipa, { truncation: true });
        audio = await tts.generate_from_ids(input_ids, { voice: VOICE, speed });
      } else {
        audio = await tts.generate(c.text, { voice: VOICE, speed });
      }
      const polished = polish(Float32Array.from(audio.audio));
      if (!polished) throw new Error("came out silent");
      writeFileSync(join(OUT_DIR, file), wav16(polished));
      made++;
      process.stdout.write(`\r  +${made}/${todo.length}   `);
    } catch (e) {
      failed++;
      delete index.clips[c.key];
      console.warn(`\n  ✗ ${c.key} — ${e.message}`);
    }
  }
  console.log(`\nrecorded ${made}, failed ${failed} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

// ── 4. Index + tidy: drop recordings nothing uses anymore ───────────────────────────────────
const used = new Set(Object.values(index.clips));
let removed = 0;
for (const f of readdirSync(OUT_DIR)) {
  if (f.endsWith(".wav") && !used.has(f)) {
    unlinkSync(join(OUT_DIR, f));
    removed++;
  }
}
writeFileSync(INDEX, JSON.stringify(index) + "\n");
const changed = JSON.stringify(prev.clips) !== JSON.stringify(index.clips);
console.log(`index: ${Object.keys(index.clips).length} clips${removed ? `, removed ${removed} unused` : ""}${changed ? " (updated)" : ""}`);
