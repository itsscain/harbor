// The Harbor Voice (Voice/TTS spec) — the cache-first cascade. Every spoken request
// resolves: Tier 0 shared library (pre-generated premium audio, §4.1) → per-device
// audio cache (IndexedDB, plays offline forever after first fetch, §8) → Web Speech
// last-resort (§4.3). One warm, consistent voice; offline; ~$0 marginal at scale.
//
// The shared library is built by scripts/gen-voice.mjs (§10) into a manifest of
// {normalizedPhrase → CDN url}; until that runs the manifest is absent and we fall
// straight to Web Speech (no regression). Keys are the NORMALIZED phrase, so the
// pipeline + client must normalize identically (numToWords/normalizeForSpeech below).

import { openDB, type IDBPDatabase } from "idb";

const EMOJI_RE =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}\u{200D}]/gu;

const ONES = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function numToWords(n: number): string {
  if (n <= 20) return ONES[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    return o ? `${TENS[t]} ${ONES[o]}` : TENS[t];
  }
  return String(n);
}

/** §12.3 — strip emoji + markdown, expand times + small numbers to words, collapse
 *  whitespace. Reads naturally AND is the shared-library cache key (keep in sync with
 *  scripts/gen-voice.mjs). */
export function normalizeForSpeech(text: string): string {
  let t = (text || "").replace(EMOJI_RE, " ").replace(/[*_`#~]/g, "");
  t = t.replace(/\b(\d{1,2}):(\d{2})\b/g, (_m, h, m) => {
    const hh = numToWords(Number(h));
    const min = Number(m);
    if (min === 0) return `${hh} o'clock`;
    return min < 10 ? `${hh} oh ${numToWords(min)}` : `${hh} ${numToWords(min)}`;
  });
  t = t.replace(/\b\d{1,2}\b/g, (m) => numToWords(Number(m)));
  return t.replace(/\s+/g, " ").trim();
}

// ── Tier 3: one consistent warm OS voice (fallback) ──────────────────────────────
let cachedVoice: SpeechSynthesisVoice | null | undefined;
const PREFER = [
  /samantha/i, /aria/i, /jenny/i, /sonia/i, /libby/i, /google us english/i,
  /google uk english female/i, /karen/i, /moira/i, /serena/i, /tessa/i,
  /zira/i, /\bfemale\b/i, /google/i,
];

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  try {
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoice = undefined;
    };
  } catch {
    /* ignore */
  }
}

export function harborVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice !== undefined) return cachedVoice;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    cachedVoice = null;
    return null;
  }
  const voices = window.speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
  if (!voices.length) return null;
  for (const re of PREFER) {
    const v = voices.find((x) => re.test(x.name));
    if (v) {
      cachedVoice = v;
      return v;
    }
  }
  cachedVoice = voices[0];
  return cachedVoice;
}

function speakOS(spoken: string) {
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(spoken);
    u.rate = 0.9;
    u.pitch = 1.02;
    const v = harborVoice();
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

// ── Tier 0: shared phrase library manifest ───────────────────────────────────────
type Manifest = { version?: string; phrases: Record<string, string> };
let manifestPromise: Promise<Manifest> | null = null;

function loadManifest(): Promise<Manifest> {
  if (!manifestPromise) {
    manifestPromise = fetch("/voice-manifest.json", { cache: "force-cache" })
      .then((r) => (r.ok ? r.json() : { phrases: {} }))
      .catch(() => ({ phrases: {} } as Manifest));
  }
  return manifestPromise;
}

// ── Tier 1: per-device audio cache (IndexedDB) ───────────────────────────────────
const A_DB = "harbor-voice";
const A_STORE = "audio";
let audioDb: Promise<IDBPDatabase> | null = null;

function getAudioDb() {
  if (!audioDb) {
    audioDb = openDB(A_DB, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(A_STORE)) db.createObjectStore(A_STORE);
      },
    });
  }
  return audioDb;
}

/** Return a cached blob for a library url, fetching + caching on first sight. Null when
 *  offline and never fetched (caller falls back to Web Speech). */
async function getLibraryBlob(url: string): Promise<Blob | null> {
  try {
    const db = await getAudioDb();
    const hit = (await db.get(A_STORE, url)) as Blob | undefined;
    if (hit) return hit;
    if (typeof navigator !== "undefined" && !navigator.onLine) return null;
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    void db.put(A_STORE, blob, url); // mirror for offline (best-effort)
    return blob;
  } catch {
    return null;
  }
}

// ── Playback + cascade ───────────────────────────────────────────────────────────
let currentAudio: HTMLAudioElement | null = null;
let currentUrl: string | null = null;

/** Stop any in-flight Harbor Voice playback (audio clip or OS speech). §11 single-stream. */
export function stopHarborVoice() {
  try {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = "";
      currentAudio = null;
    }
    if (currentUrl) {
      URL.revokeObjectURL(currentUrl);
      currentUrl = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}

/** Speak in the Harbor Voice via the cascade. Fire-and-forget; never throws/blocks. */
export function playHarborVoice(text: string) {
  if (typeof window === "undefined") return;
  const spoken = normalizeForSpeech(text);
  if (!spoken) return;
  stopHarborVoice();
  void (async () => {
    try {
      const m = await loadManifest();
      const url = m.phrases?.[spoken];
      if (url) {
        const blob = await getLibraryBlob(url);
        if (blob) {
          const obj = URL.createObjectURL(blob);
          const audio = new Audio(obj);
          currentAudio = audio;
          currentUrl = obj;
          audio.play().catch(() => speakOS(spoken)); // autoplay/codec issue → OS voice
          return;
        }
      }
    } catch {
      /* fall through */
    }
    if ("speechSynthesis" in window) speakOS(spoken);
  })();
}
