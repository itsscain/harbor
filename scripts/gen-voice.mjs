// Harbor Voice — Tier 0 pre-generation pipeline (Voice/TTS spec §10).
//
// Generates the shared phrase library ONCE for the whole product: each phrase in
// scripts/voice-phrases.json is spoken by the premium Harbor Voice, uploaded to the
// Supabase Storage "voice" bucket (public CDN), and recorded in public/voice-manifest.json
// ({normalizedPhrase → url}). The kiosk then plays these offline at $0 marginal cost.
//
// Run once (and again whenever you add phrases — existing ones are skipped):
//   node scripts/gen-voice.mjs
//
// Requires in .env.local:
//   OPENAI_API_KEY            (the TTS key; the whole library costs ~$0.66 at tts-1)
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY (server-only; never shipped to the wall)
// Optional:
//   OPENAI_TTS_MODEL  (default "tts-1"; "tts-1-hd" for higher quality, ~2x cost)
//   OPENAI_TTS_VOICE  (default "shimmer" — warm; OpenAI presets: alloy, echo, fable,
//                      onyx, nova, shimmer)
//
// To swap providers (e.g. ElevenLabs), replace synthesize() — everything else (keys,
// upload, manifest) is provider-agnostic.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── env ──────────────────────────────────────────────────────────────────────────
function loadEnv() {
  const p = join(ROOT, ".env.local");
  if (existsSync(p)) {
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
loadEnv();

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MODEL = process.env.OPENAI_TTS_MODEL || "tts-1";
const VOICE = process.env.OPENAI_TTS_VOICE || "shimmer";
const VERSION = "v1";
const BUCKET = "voice";

if (!OPENAI_KEY || !SB_URL || !SB_KEY) {
  console.error(
    "Missing env. Need OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local.",
  );
  process.exit(1);
}

// ── normalize — MUST match lib/kiosk/voice.ts normalizeForSpeech exactly ───────────
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

// ── provider: OpenAI TTS (swap this fn for another provider) ───────────────────────
async function synthesize(displayText) {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, voice: VOICE, input: displayText, response_format: "mp3" }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── main ───────────────────────────────────────────────────────────────────────────
const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

async function ensureBucket() {
  const { error } = await sb.storage.createBucket(BUCKET, { public: true });
  if (error && !/exist/i.test(error.message)) throw error;
}

function collectPhrases() {
  const raw = JSON.parse(readFileSync(join(__dirname, "voice-phrases.json"), "utf8"));
  const set = new Map(); // normalized → display text (first wins)
  for (const [k, v] of Object.entries(raw)) {
    if (!Array.isArray(v)) continue; // skip _note etc.
    for (const phrase of v) {
      const norm = normalizeForSpeech(phrase);
      if (norm && !set.has(norm)) set.set(norm, phrase);
    }
  }
  return set;
}

async function main() {
  await ensureBucket();
  const manifestPath = join(ROOT, "public", "voice-manifest.json");
  const manifest = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, "utf8"))
    : { version: VERSION, voice: VOICE, phrases: {} };
  manifest.version = VERSION;
  manifest.voice = VOICE;
  manifest.phrases ||= {};

  const phrases = collectPhrases();
  let made = 0, skipped = 0, failed = 0;
  console.log(`Harbor Voice: ${phrases.size} phrases · model ${MODEL} · voice ${VOICE}`);

  for (const [norm, display] of phrases) {
    if (manifest.phrases[norm]) { skipped++; continue; }
    const file = `${VERSION}/${createHash("sha1").update(norm).digest("hex")}.mp3`;
    try {
      const audio = await synthesize(display);
      const { error } = await sb.storage
        .from(BUCKET)
        .upload(file, audio, { contentType: "audio/mpeg", upsert: true });
      if (error) throw error;
      const { data } = sb.storage.from(BUCKET).getPublicUrl(file);
      manifest.phrases[norm] = data.publicUrl;
      made++;
      if (made % 10 === 0) console.log(`  …${made} generated`);
    } catch (e) {
      failed++;
      console.warn(`  ✗ "${display}" — ${e.message}`);
    }
  }

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Done. +${made} generated, ${skipped} cached, ${failed} failed. Manifest → public/voice-manifest.json`);
  console.log("Commit the manifest + deploy; the wall fetches + caches audio on first play.");
}

main().catch((e) => { console.error(e); process.exit(1); });
