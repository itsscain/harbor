// Harbor Voice — pre-generate the shared phrase library with Kokoro af_bella, FREE and
// LOCAL (no API, no cloud). Run on a capable machine (NOT the tablet):
//   node scripts/gen-voice-kokoro.mjs
// Output: public/voice/<sha1(normalized)>.wav + public/voice-manifest.json
//   { version, voice, phrases: { "<normalized phrase>": "/voice/<hash>.wav" } }
// The kiosk plays these instantly — the tablet never has to generate. Re-run anytime;
// existing phrases are skipped. Audio is small WAV; served as static assets ($0).

import { KokoroTTS } from "kokoro-js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "voice");
const MANIFEST = join(ROOT, "public", "voice-manifest.json");
const VOICE = "af_bella";
const VERSION = "v1-bella";
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : Infinity;

// normalize — MUST stay byte-identical to lib/kiosk/voice.ts normalizeForSpeech
const EMOJI_RE =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}\u{200D}]/gu;
const ONES = ["zero","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen","twenty"];
const TENS = ["","","twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"];
function numToWords(n) {
  if (n <= 20) return ONES[n];
  if (n < 100) { const t = Math.floor(n / 10), o = n % 10; return o ? `${TENS[t]} ${ONES[o]}` : TENS[t]; }
  return String(n);
}
function normalizeForSpeech(text) {
  let t = (text || "").replace(EMOJI_RE, " ").replace(/[*_`#~]/g, "");
  t = t.replace(/\b(\d{1,2}):(\d{2})\b/g, (_m, h, m) => {
    const hh = numToWords(Number(h)), min = Number(m);
    if (min === 0) return `${hh} o'clock`;
    return min < 10 ? `${hh} oh ${numToWords(min)}` : `${hh} ${numToWords(min)}`;
  });
  t = t.replace(/\b\d{1,2}\b/g, (m) => numToWords(Number(m)));
  return t.replace(/\s+/g, " ").trim();
}

function collect() {
  const raw = JSON.parse(readFileSync(join(__dirname, "voice-phrases.json"), "utf8"));
  const map = new Map(); // normalized -> display
  for (const v of Object.values(raw)) {
    if (!Array.isArray(v)) continue;
    for (const phrase of v) {
      const n = normalizeForSpeech(phrase);
      if (n && !map.has(n)) map.set(n, phrase);
    }
  }
  return map;
}

mkdirSync(OUT_DIR, { recursive: true });
const manifest = existsSync(MANIFEST)
  ? JSON.parse(readFileSync(MANIFEST, "utf8"))
  : { version: VERSION, voice: VOICE, phrases: {} };
manifest.version = VERSION;
manifest.voice = VOICE;
manifest.phrases ||= {};

const phrases = collect();
console.log(`Harbor Voice (Kokoro ${VOICE}): ${phrases.size} phrases`);
const t0 = Date.now();
console.log("loading model…");
const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
  dtype: "q8",
  device: "cpu",
});
console.log(`model ready in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

let made = 0, skipped = 0, failed = 0, i = 0;
for (const [norm, display] of phrases) {
  if (i++ >= LIMIT) break;
  const file = `${createHash("sha1").update(norm).digest("hex")}.wav`;
  const rel = `/voice/${file}`;
  if (manifest.phrases[norm] && existsSync(join(OUT_DIR, file))) { skipped++; continue; }
  try {
    const audio = await tts.generate(display, { voice: VOICE });
    await audio.save(join(OUT_DIR, file));
    manifest.phrases[norm] = rel;
    made++;
    process.stdout.write(`\r  +${made} generated (${skipped} cached)   `);
  } catch (e) {
    failed++;
    console.warn(`\n  ✗ "${display}" — ${e.message}`);
  }
}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
console.log(`\nDone in ${((Date.now() - t0) / 1000).toFixed(1)}s. +${made} generated, ${skipped} cached, ${failed} failed.`);
console.log(`Manifest: public/voice-manifest.json (${Object.keys(manifest.phrases).length} phrases). Commit public/voice/ + the manifest, then deploy.`);
