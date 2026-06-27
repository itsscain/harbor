// The Harbor Voice (Voice/TTS) — free, offline, and snappy on cheap tablets. The voice
// is Kokoro "af_bella", but it is PRE-GENERATED on a capable machine (scripts/gen-voice-
// kokoro.mjs) and shipped as tiny static WAVs in /public/voice, indexed by /voice-manifest.json.
// The tablet just PLAYS them — no 92MB model download, no on-device synthesis. Cascade:
//
//   1. Device cache (IndexedDB)            — instant, offline, holds anything played before
//   2. Shared library (static Bella WAV)   — instant Bella for the common vocabulary
//   3. OS voice NOW + background Kokoro     — novel/custom text: never wait, never silent;
//                                            Bella is generated quietly for next time
//
// All playback runs through ONE shared AudioContext (same as the chime) so if the chime
// is audible the voice is too.

import { openDB, type IDBPDatabase } from "idb";
import { getAudioCtx } from "./audioctx";

/** The Harbor Voice — Kokoro voice id. Bella is warm + gentle (af_sarah is the alt). */
export const HARBOR_VOICE = "af_bella";

// ── text normalization (§12.3) — keep byte-identical to scripts/gen-voice-kokoro.mjs ──
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

// ── OS voice fallback ────────────────────────────────────────────────────────────
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
    if (!("speechSynthesis" in window)) return;
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

// ── shared library manifest (static Bella WAVs) ──────────────────────────────────
type Manifest = { version?: string; voice?: string; phrases: Record<string, string> };
let manifestPromise: Promise<Manifest> | null = null;

function loadManifest(): Promise<Manifest> {
  if (!manifestPromise) {
    manifestPromise =
      typeof fetch === "undefined"
        ? Promise.resolve({ phrases: {} } as Manifest)
        : fetch("/voice-manifest.json", { cache: "force-cache" })
            .then((r) => (r.ok ? r.json() : { phrases: {} }))
            .catch(() => ({ phrases: {} } as Manifest));
  }
  return manifestPromise;
}

async function fetchStatic(url: string): Promise<Blob | null> {
  try {
    if (typeof navigator !== "undefined" && !navigator.onLine) return null;
    const r = await fetch(url, { cache: "force-cache" });
    return r.ok ? await r.blob() : null;
  } catch {
    return null;
  }
}

// ── on-device Kokoro worker (background only — for novel/custom text) ─────────────
let worker: Worker | null = null;
let modelReady = false;
let workerDead = false;
let reqId = 0;
let lastError: string | null = null;
const pending = new Map<number, (blob: Blob | null) => void>();
let readyResolvers: Array<() => void> = [];

function getWorker(): Worker | null {
  if (workerDead || typeof window === "undefined" || typeof Worker === "undefined") return null;
  if (!worker) {
    try {
      worker = new Worker(new URL("./tts.worker.ts", import.meta.url), { type: "module" });
      worker.onmessage = (e: MessageEvent) => {
        const d = (e.data || {}) as { id?: number; type?: string; blob?: Blob; error?: string };
        if (d.type === "ready") {
          modelReady = true;
          readyResolvers.forEach((r) => r());
          readyResolvers = [];
        } else if (d.type === "audio" && typeof d.id === "number") {
          const r = pending.get(d.id);
          if (r) {
            pending.delete(d.id);
            r(d.blob ?? null);
          }
        } else if (d.type === "error") {
          if (d.error) lastError = d.error;
          if (typeof d.id === "number") {
            const r = pending.get(d.id);
            if (r) {
              pending.delete(d.id);
              r(null);
            }
          }
        }
      };
      worker.onerror = (e) => {
        workerDead = true;
        lastError = (e as ErrorEvent)?.message || "worker failed to start";
      };
    } catch (err) {
      worker = null;
      workerDead = true;
      lastError = String(err);
    }
  }
  return worker;
}

/** Start the one-time model load (only needed for novel/custom text). */
export function prewarmHarborVoice() {
  const w = getWorker();
  if (w) {
    try {
      w.postMessage({ type: "warm" });
    } catch {
      /* ignore */
    }
  }
}

function waitReady(ms: number): Promise<boolean> {
  if (modelReady) return Promise.resolve(true);
  if (workerDead || !getWorker()) return Promise.resolve(false);
  return new Promise((resolve) => {
    const fn = () => {
      clearTimeout(to);
      resolve(true);
    };
    const to = setTimeout(() => {
      readyResolvers = readyResolvers.filter((r) => r !== fn);
      resolve(false);
    }, ms);
    readyResolvers.push(fn);
  });
}

function generate(text: string, voice: string, timeoutMs = 60000): Promise<Blob | null> {
  const w = getWorker();
  if (!w) return Promise.resolve(null);
  const id = ++reqId;
  return new Promise((resolve) => {
    const t = setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        lastError = "generation timed out";
        resolve(null);
      }
    }, timeoutMs);
    pending.set(id, (b) => {
      clearTimeout(t);
      resolve(b);
    });
    try {
      w.postMessage({ type: "gen", id, text, voice });
    } catch {
      clearTimeout(t);
      pending.delete(id);
      resolve(null);
    }
  });
}

/** Generate a novel phrase in the BACKGROUND and cache it for next time (never plays —
 *  the OS voice already spoke). Lazily loads the model only when novel text occurs. */
async function backgroundGenerate(key: string, text: string, voice: string) {
  if (workerDead || !getWorker()) return;
  if (!modelReady) {
    prewarmHarborVoice();
    const ok = await waitReady(60000);
    if (!ok) return;
  }
  const blob = await generate(text, voice, 60000);
  if (blob) await putCached(key, blob);
}

// ── device audio cache (IndexedDB, bounded LRU) ──────────────────────────────────
const A_DB = "harbor-voice";
const A_AUDIO = "audio";
const A_META = "meta";
const CACHE_MAX = 220;
let audioDb: Promise<IDBPDatabase> | null = null;

function getAudioDb() {
  if (!audioDb) {
    audioDb = openDB(A_DB, 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(A_AUDIO)) db.createObjectStore(A_AUDIO);
        if (!db.objectStoreNames.contains(A_META)) db.createObjectStore(A_META);
      },
    });
  }
  return audioDb;
}

async function getCached(key: string): Promise<Blob | null> {
  try {
    const db = await getAudioDb();
    const b = (await db.get(A_AUDIO, key)) as Blob | undefined;
    if (b) {
      void db.put(A_META, Date.now(), key);
      return b;
    }
    return null;
  } catch {
    return null;
  }
}

async function putCached(key: string, blob: Blob) {
  try {
    const db = await getAudioDb();
    await db.put(A_AUDIO, blob, key);
    await db.put(A_META, Date.now(), key);
    const keys = (await db.getAllKeys(A_META)) as IDBValidKey[];
    if (keys.length > CACHE_MAX) {
      const metas = await Promise.all(
        keys.map(async (k) => ({ k, ts: ((await db.get(A_META, k)) as number) || 0 })),
      );
      metas.sort((a, b) => a.ts - b.ts);
      const drop = metas.slice(0, keys.length - CACHE_MAX);
      const tx = db.transaction([A_AUDIO, A_META], "readwrite");
      for (const d of drop) {
        void tx.objectStore(A_AUDIO).delete(d.k);
        void tx.objectStore(A_META).delete(d.k);
      }
      await tx.done;
    }
  } catch {
    /* ignore */
  }
}

// ── playback ─────────────────────────────────────────────────────────────────────
let currentAudio: HTMLAudioElement | null = null;
let currentUrl: string | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let playSeq = 0;

export function stopHarborVoice() {
  playSeq++;
  try {
    if (currentSource) {
      try {
        currentSource.stop();
      } catch {
        /* already stopped */
      }
      try {
        currentSource.disconnect();
      } catch {
        /* ignore */
      }
      currentSource = null;
    }
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

async function playBlob(blob: Blob, seq: number): Promise<boolean> {
  // Prefer the shared AudioContext — the SAME path as the chime (unlocked by a tap).
  const ctx = getAudioCtx();
  if (ctx) {
    try {
      if (ctx.state === "suspended") await ctx.resume();
      const buf = await blob.arrayBuffer();
      const audioBuf = await ctx.decodeAudioData(buf);
      if (seq !== playSeq) return false;
      if (currentSource) {
        try {
          currentSource.stop();
        } catch {
          /* ignore */
        }
      }
      const src = ctx.createBufferSource();
      src.buffer = audioBuf;
      src.connect(ctx.destination);
      src.onended = () => {
        if (currentSource === src) currentSource = null;
      };
      currentSource = src;
      src.start();
      return true;
    } catch {
      /* fall through */
    }
  }
  if (seq !== playSeq) return false;
  try {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;
    currentUrl = url;
    audio.onended = () => {
      if (currentAudio === audio) currentAudio = null;
      if (currentUrl === url) {
        URL.revokeObjectURL(url);
        currentUrl = null;
      }
    };
    await audio.play();
    return true;
  } catch {
    return false;
  }
}

/** Speak in the Harbor Voice via the cascade. Fire-and-forget; never blocks. */
export function playHarborVoice(text: string, voice: string = HARBOR_VOICE) {
  if (typeof window === "undefined") return;
  const spoken = normalizeForSpeech(text);
  if (!spoken) return;
  stopHarborVoice();
  const seq = ++playSeq;
  const key = `${voice}|${spoken}`;
  void (async () => {
    // 1) device cache → instant
    const cached = await getCached(key);
    if (seq !== playSeq) return;
    if (cached) {
      void playBlob(cached, seq);
      return;
    }
    // 2) shared static library (Bella) → fetch + cache + play
    const url = (await loadManifest()).phrases?.[spoken];
    if (url) {
      const blob = await fetchStatic(url);
      if (blob) {
        void putCached(key, blob);
        if (seq !== playSeq) return;
        void playBlob(blob, seq);
        return;
      }
    }
    // 3) novel text → speak instantly with the OS voice; generate Bella in the
    //    background so it's instant next time. Never wait, never silent.
    if (seq !== playSeq) return;
    speakOS(spoken);
    void backgroundGenerate(key, spoken, voice);
  })();
}

// ── debug / diagnostics (Parent menu → Debug tools) ──────────────────────────────
let manifestCount = 0;
let manifestVersion = "";
function refreshManifestStats() {
  void loadManifest().then((m) => {
    manifestCount = Object.keys(m.phrases || {}).length;
    manifestVersion = m.version || "";
  });
}
refreshManifestStats();

export type VoiceStatus = {
  supported: boolean;
  secureContext: boolean;
  libraryPhrases: number;
  libraryVersion: string;
  audioContext: string;
  osVoice: string | null;
  modelReady: boolean;
  modelLoading: boolean;
  lastError: string | null;
};

export function getVoiceStatus(): VoiceStatus {
  const ctx = getAudioCtx();
  return {
    supported: typeof window !== "undefined",
    secureContext: typeof window !== "undefined" ? window.isSecureContext : false,
    libraryPhrases: manifestCount,
    libraryVersion: manifestVersion,
    audioContext: ctx ? ctx.state : "none",
    osVoice: harborVoice()?.name ?? null,
    modelReady,
    modelLoading: !!worker && !modelReady && !workerDead,
    lastError,
  };
}

export async function voiceCacheCount(): Promise<number> {
  try {
    const db = await getAudioDb();
    return (await db.getAllKeys(A_AUDIO)).length;
  } catch {
    return 0;
  }
}

/** Run the cascade for a known LIBRARY phrase and report which tier played — the
 *  parent "Test voice" button. The tap also unlocks audio. */
export async function speakDiag(
  text = "You did it",
  voice: string = HARBOR_VOICE,
): Promise<{ tier: "cache" | "library" | "os" | "kokoro" | "none"; ok: boolean; ms: number; detail: string }> {
  const t0 = Date.now();
  const ms = () => Date.now() - t0;
  if (typeof window === "undefined") return { tier: "none", ok: false, ms: 0, detail: "no window" };
  const spoken = normalizeForSpeech(text);
  if (!spoken) return { tier: "none", ok: false, ms: 0, detail: "empty text" };
  stopHarborVoice();
  const seq = ++playSeq;
  const key = `${voice}|${spoken}`;
  try {
    const ctx = getAudioCtx();
    if (ctx && ctx.state === "suspended") await ctx.resume();
  } catch {
    /* ignore */
  }

  const cached = await getCached(key);
  if (cached) {
    const ok = await playBlob(cached, seq);
    return { tier: "cache", ok, ms: ms(), detail: ok ? "played from cache" : "decode/playback failed" };
  }

  const url = (await loadManifest()).phrases?.[spoken];
  if (url) {
    const blob = await fetchStatic(url);
    if (blob) {
      void putCached(key, blob);
      const ok = await playBlob(blob, seq);
      return {
        tier: "library",
        ok,
        ms: ms(),
        detail: ok ? "played the Harbor voice (Bella)" : "downloaded but playback failed — check Audio state",
      };
    }
    return { tier: "library", ok: false, ms: ms(), detail: "couldn't download the clip — check Wi-Fi" };
  }

  speakOS(spoken);
  return { tier: "os", ok: "speechSynthesis" in window, ms: ms(), detail: "phrase not in library — used device voice" };
}

export async function reloadVoiceEngine(clearModel = false): Promise<void> {
  manifestPromise = null;
  try {
    worker?.terminate();
  } catch {
    /* ignore */
  }
  worker = null;
  modelReady = false;
  workerDead = false;
  lastError = null;
  readyResolvers = [];
  pending.clear();
  refreshManifestStats();
  if (clearModel && typeof caches !== "undefined") {
    try {
      await caches.delete("transformers-cache");
      await caches.delete("kokoro-voices");
    } catch {
      /* ignore */
    }
  }
}

export async function clearVoiceCache(): Promise<void> {
  try {
    const db = await getAudioDb();
    await db.clear(A_AUDIO);
    await db.clear(A_META);
  } catch {
    /* ignore */
  }
}
