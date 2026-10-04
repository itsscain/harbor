import { getAudioCtx } from "@/lib/kiosk/audioctx";
import { SOUNDS } from "./sounds";

// Harbor Learn's voice. Every line, word and letter sound is a pre-recorded clip
// (/public/learn-voice, see scripts/gen-learn-voice.mjs) played through the wall's one shared
// AudioContext. Clips are kept in Cache Storage once heard (and the whole library is fetched in
// the background on Wi-Fi), so lessons speak offline. Lines can be strung together —
// "Tap the letter that says," + the m sound — and scheduled back to back with no gaps.
// If a clip is missing (first offline run), the system voice reads a plain-English stand-in.

const BASE = "/learn-voice/";
const CACHE = "harbor-learn-voice";

/** One part of something to say: a clip key, a pause, or a key with a callback when it starts. */
export type Part = string | { gap: number } | { key: string; onStart?: () => void };

let indexPromise: Promise<Record<string, string>> | null = null;
function loadIndex(): Promise<Record<string, string>> {
  if (!indexPromise) {
    indexPromise = fetch(`${BASE}index.json`, { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : { clips: {} }))
      .then((j: { clips?: Record<string, string> }) => j.clips ?? {})
      .catch(() => {
        indexPromise = null; // try again next time (e.g. once back online)
        return {} as Record<string, string>;
      });
  }
  return indexPromise;
}

async function fetchClip(file: string): Promise<ArrayBuffer | null> {
  const url = BASE + file;
  try {
    if (typeof caches !== "undefined") {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(url);
      if (hit) return await hit.arrayBuffer();
      const res = await fetch(url);
      if (!res.ok) return null;
      void cache.put(url, res.clone()).catch(() => {});
      return await res.arrayBuffer();
    }
    const res = await fetch(url);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

const buffers = new Map<string, AudioBuffer>();
const loading = new Map<string, Promise<AudioBuffer | null>>();

function keyOf(p: Part): string | null {
  if (typeof p === "string") return p;
  return "key" in p ? p.key : null;
}

/** Decode one clip into memory (cached). */
async function bufferFor(key: string): Promise<AudioBuffer | null> {
  const have = buffers.get(key);
  if (have) return have;
  let job = loading.get(key);
  if (!job) {
    job = (async () => {
      const ctx = getAudioCtx();
      const file = (await loadIndex())[key];
      if (!ctx || !file) return null;
      const data = await fetchClip(file);
      if (!data) return null;
      try {
        const buf = await ctx.decodeAudioData(data);
        buffers.set(key, buf);
        return buf;
      } catch {
        return null;
      }
    })().finally(() => loading.delete(key));
    loading.set(key, job);
  }
  return job;
}

/** Length of a loaded clip in ms (null until it's been loaded). */
export function clipMs(key: string): number | null {
  const b = buffers.get(key);
  return b ? Math.round(b.duration * 1000) : null;
}

/** Warm up the clips a screen is about to need, so they play the instant they're asked for. */
export function preload(keys: string[]): Promise<void> {
  return Promise.all(keys.map((k) => bufferFor(k))).then(() => undefined);
}

let libraryStarted = false;
/** Quietly fetch the whole voice library into the offline cache (once per visit, online only). */
export function prefetchLibrary() {
  if (libraryStarted || typeof window === "undefined" || typeof caches === "undefined") return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  libraryStarted = true;
  void (async () => {
    const files = [...new Set(Object.values(await loadIndex()))];
    if (!files.length) {
      libraryStarted = false;
      return;
    }
    const cache = await caches.open(CACHE);
    let i = 0;
    const worker = async () => {
      while (i < files.length) {
        const url = BASE + files[i++];
        try {
          if (!(await cache.match(url))) await cache.add(url);
        } catch {
          /* offline mid-way — the rest come next visit */
        }
      }
    };
    await Promise.all([worker(), worker()]);
  })();
}

// ── Playback ─────────────────────────────────────────────────────────────────────────────
let seq = 0;
let sources: AudioBufferSourceNode[] = [];
let timers: number[] = [];
let finish: ((done: boolean) => void) | null = null;

/** Stop whatever Learn is saying (a new line always interrupts the old one). */
export function stopVoice() {
  seq++;
  for (const s of sources) {
    try {
      s.stop();
    } catch {
      /* already stopped */
    }
  }
  sources = [];
  timers.forEach((t) => window.clearTimeout(t));
  timers = [];
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  const f = finish;
  finish = null;
  f?.(false);
}

/** Plain-English stand-in for a clip the system voice can read (sounds can't be spelled out). */
function fallbackText(key: string): string {
  if (key.startsWith("snd:")) return SOUNDS[key.slice(4)]?.say ?? "";
  return key;
}

/** Say one or more parts in order. Resolves true when it finished, false if interrupted. */
export function say(parts: Part | Part[]): Promise<boolean> {
  const list = Array.isArray(parts) ? parts : [parts];
  stopVoice();
  const my = ++seq;
  return new Promise<boolean>((resolve) => {
    finish = resolve;
    void (async () => {
      const keys = list.map(keyOf).filter((k): k is string => !!k);
      const bufs = await Promise.all(keys.map((k) => bufferFor(k)));
      if (my !== seq) return;
      const ctx = getAudioCtx();
      if (ctx && bufs.every(Boolean)) {
        if (ctx.state === "suspended") await ctx.resume().catch(() => {});
        if (my !== seq) return;
        let t = ctx.currentTime + 0.03;
        const t0 = t;
        let bi = 0;
        for (const p of list) {
          if (typeof p !== "string" && "gap" in p) {
            t += p.gap / 1000;
            continue;
          }
          const buf = bufs[bi++]!;
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.connect(ctx.destination);
          src.start(t);
          sources.push(src);
          if (typeof p !== "string" && p.onStart) {
            const cb = p.onStart;
            timers.push(window.setTimeout(() => my === seq && cb(), Math.max(0, (t - t0) * 1000)));
          }
          t += buf.duration;
        }
        timers.push(
          window.setTimeout(() => {
            if (my !== seq) return;
            sources = [];
            finish = null;
            resolve(true);
          }, (t - t0) * 1000 + 40),
        );
        return;
      }
      // Fallback: the system voice, one part after another.
      speakFallback(list, my, resolve);
    })();
  });
}

function speakFallback(list: Part[], my: number, resolve: (done: boolean) => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    finish = null;
    resolve(true);
    return;
  }
  let i = 0;
  const next = () => {
    if (my !== seq) return;
    if (i >= list.length) {
      finish = null;
      resolve(true);
      return;
    }
    const p = list[i++];
    if (typeof p !== "string" && "gap" in p) {
      timers.push(window.setTimeout(next, p.gap));
      return;
    }
    if (typeof p !== "string" && p.onStart) p.onStart();
    const text = fallbackText(keyOf(p) ?? "");
    if (!text) return next();
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.88;
      u.pitch = 1.05;
      u.onend = () => next();
      u.onerror = () => next();
      window.speechSynthesis.speak(u);
    } catch {
      next();
    }
  };
  next();
}
