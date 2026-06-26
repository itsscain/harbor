// The Harbor Voice (Voice/TTS spec) — free, on-device, offline. One warm consistent
// voice (Kokoro "af_bella") generated in a Web Worker, cached in a small bounded LRU
// on the device. No cloud, no API key, $0: the model downloads once (browser Cache
// Storage) and audio is regenerated for free when evicted. Cascade per spoken request:
//
//   1. Device audio cache (IndexedDB, LRU-capped, plays instantly + offline)
//   2. Kokoro on-device (af_bella) → cache the result → play   ← the Harbor Voice
//   3. OS voice (Web Speech) — only while the model is still downloading, or if Kokoro
//      can't run on this device. Never blocks; never silent.

import { openDB, type IDBPDatabase } from "idb";
import { getAudioCtx } from "./audioctx";

/** The Harbor Voice — Kokoro voice id. Bella is warm + gentle (af_sarah is the alt). */
export const HARBOR_VOICE = "af_bella";

// ── text normalization (§12.3) ───────────────────────────────────────────────────
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

/** Strip emoji + markdown, expand times + small numbers to words, collapse whitespace. */
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

// ── Tier 3: OS voice fallback ────────────────────────────────────────────────────
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

// ── Tier 2: Kokoro worker ────────────────────────────────────────────────────────
let worker: Worker | null = null;
let modelReady = false;
let workerDead = false;
let reqId = 0;
let lastProgress = 0; // 0..1 model download progress (for the debug panel)
const pending = new Map<number, (blob: Blob | null) => void>();
let readyResolvers: Array<() => void> = [];

function getWorker(): Worker | null {
  if (workerDead || typeof window === "undefined" || typeof Worker === "undefined") return null;
  if (!worker) {
    try {
      worker = new Worker(new URL("./tts.worker.ts", import.meta.url), { type: "module" });
      worker.onmessage = (e: MessageEvent) => {
        const d = (e.data || {}) as { id?: number; type?: string; blob?: Blob; data?: { progress?: number } };
        if (d.type === "ready") {
          modelReady = true;
          lastProgress = 1;
          readyResolvers.forEach((r) => r());
          readyResolvers = [];
        } else if (d.type === "progress") {
          if (typeof d.data?.progress === "number") lastProgress = Math.max(lastProgress, d.data.progress / 100);
        } else if (d.type === "audio" && typeof d.id === "number") {
          const r = pending.get(d.id);
          if (r) {
            pending.delete(d.id);
            r(d.blob ?? null);
          }
        } else if (d.type === "error" && typeof d.id === "number") {
          const r = pending.get(d.id);
          if (r) {
            pending.delete(d.id);
            r(null);
          }
        }
      };
      worker.onerror = () => {
        workerDead = true; // model can't run here → OS voice from now on
      };
    } catch {
      worker = null;
      workerDead = true;
    }
  }
  return worker;
}

/** Start the one-time model download/warm in the background (call when sound is on). */
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

function generate(text: string, voice: string, timeoutMs = 12000): Promise<Blob | null> {
  const w = getWorker();
  if (!w) return Promise.resolve(null);
  const id = ++reqId;
  return new Promise((resolve) => {
    const t = setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
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

// ── Tier 1: bounded LRU audio cache (IndexedDB) — local + free, "temporary" ────────
const A_DB = "harbor-voice";
const A_AUDIO = "audio";
const A_META = "meta";
const CACHE_MAX = 160; // phrases; LRU-evicted so device storage stays small
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
      void db.put(A_META, Date.now(), key); // touch for LRU
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

// ── playback + cascade ───────────────────────────────────────────────────────────
let currentAudio: HTMLAudioElement | null = null;
let currentUrl: string | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let playSeq = 0;

export function stopHarborVoice() {
  playSeq++; // invalidate any in-flight async playback
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
  // Prefer the shared AudioContext — the SAME path as the chime, which the tablet has
  // already unlocked. HTMLAudioElement.play() is gated separately and can be silently
  // blocked after a refresh, so Web Audio is the reliable path.
  const ctx = getAudioCtx();
  if (ctx) {
    try {
      if (ctx.state === "suspended") await ctx.resume();
      const buf = await blob.arrayBuffer();
      const audioBuf = await ctx.decodeAudioData(buf);
      if (seq !== playSeq) return false; // superseded while decoding
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
      /* fall through to HTMLAudioElement */
    }
  }
  // Fallback: HTMLAudioElement (older browsers / no Web Audio).
  if (seq !== playSeq) return false;
  try {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;
    currentUrl = url;
    audio.onended = () => {
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

/** Speak in the Harbor Voice via the cascade. Fire-and-forget; never throws/blocks. */
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
    // 2) Kokoro if the model is loaded; otherwise OS now + warm for next time
    if (modelReady && getWorker()) {
      const blob = await generate(spoken, voice);
      if (blob) void putCached(key, blob); // cache even if superseded
      if (seq !== playSeq) return;
      if (blob) {
        void playBlob(blob, seq);
        return;
      }
    } else {
      prewarmHarborVoice(); // kick off the one-time model load
    }
    // 3) OS fallback (model not ready yet, or generation failed)
    if (seq !== playSeq) return;
    speakOS(spoken);
  })();
}

// ── debug / diagnostics (Parent menu → Debug tools) ──────────────────────────────
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

export type VoiceStatus = {
  supported: boolean;
  secureContext: boolean;
  webgpu: boolean;
  hasWorker: boolean;
  workerDead: boolean;
  modelReady: boolean;
  progress: number;
  audioContext: string;
  osVoice: string | null;
};

/** A synchronous snapshot for the debug panel. */
export function getVoiceStatus(): VoiceStatus {
  const ctx = getAudioCtx();
  return {
    supported: typeof Worker !== "undefined",
    secureContext: typeof window !== "undefined" ? window.isSecureContext : false,
    webgpu: typeof navigator !== "undefined" && "gpu" in navigator,
    hasWorker: !!worker,
    workerDead,
    modelReady,
    progress: lastProgress,
    audioContext: ctx ? ctx.state : "none",
    osVoice: harborVoice()?.name ?? null,
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

/** Run the full cascade and REPORT which tier played — for the debug "Test voice"
 *  button. Being called from a tap also unlocks audio. Returns the outcome. */
export async function speakDiag(
  text = "Hi, this is the Harbor voice. Can you hear me?",
  voice: string = HARBOR_VOICE,
): Promise<{ tier: "cache" | "kokoro" | "os" | "none"; ok: boolean; ms: number; detail: string }> {
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

  if (getWorker() && !workerDead) {
    if (!modelReady) {
      prewarmHarborVoice();
      await waitReady(25000);
    }
    if (modelReady) {
      const blob = await generate(spoken, voice, 25000);
      if (blob) {
        void putCached(key, blob);
        const ok = await playBlob(blob, seq);
        return { tier: "kokoro", ok, ms: ms(), detail: ok ? "generated + played" : "generated but playback failed" };
      }
      return { tier: "kokoro", ok: false, ms: ms(), detail: "generation failed/timed out" };
    }
  }

  speakOS(spoken);
  const osOk = "speechSynthesis" in window;
  return {
    tier: "os",
    ok: osOk,
    ms: ms(),
    detail: workerDead ? "Kokoro can't run here — used device voice" : "model still loading — used device voice",
  };
}

/** Reset the worker (and optionally drop the cached model) so the next play reloads. */
export async function reloadVoiceEngine(clearModel = false): Promise<void> {
  try {
    worker?.terminate();
  } catch {
    /* ignore */
  }
  worker = null;
  modelReady = false;
  workerDead = false;
  lastProgress = 0;
  readyResolvers = [];
  pending.clear();
  if (clearModel && typeof caches !== "undefined") {
    try {
      await caches.delete("transformers-cache");
      await caches.delete("kokoro-voices");
    } catch {
      /* ignore */
    }
  }
}

/** Empty the on-device generated-audio cache. */
export async function clearVoiceCache(): Promise<void> {
  try {
    const db = await getAudioDb();
    await db.clear(A_AUDIO);
    await db.clear(A_META);
  } catch {
    /* ignore */
  }
}
