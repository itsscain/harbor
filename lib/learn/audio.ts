import { getAudioCtx } from "@/lib/kiosk/audioctx";
import { SOUNDS } from "./sounds";
import { isHLA, hlaBuffer } from "./hla";
import { numberWord } from "./gen";

// Harbor Learn's voice. Lines, words and letter sounds are pre-recorded clips (/public/learn-voice,
// see scripts/gen-learn-voice.mjs; most are tiny HLA/ADPCM files decoded right here) played
// through the wall's one shared AudioContext. Clips are kept in Cache Storage once heard (and the
// whole library is fetched in the background on Wi-Fi), so lessons speak offline. Parts can be
// strung together — "Tap the letter that says," + the m sound — and play back to back with no gaps.
//
// Anything that isn't recorded still gets said: a math line is stitched from recorded number words
// ("7 + 5 = ?" → seven · plus · five · equals · what), and everything else is read by the device's
// own voice, in order, between the recorded parts.

const BASE = "/learn-voice/";
const CACHE = "harbor-learn-voice";

/** One part of something to say: a clip key (or "~" for a breath), a pause, or a key with a callback. */
export type Part = string | { gap: number } | { key: string; onStart?: () => void };

let indexPromise: Promise<Record<string, string>> | null = null;
let index: Record<string, string> | null = null;
function loadIndex(): Promise<Record<string, string>> {
  if (!indexPromise) {
    indexPromise = fetch(`${BASE}index.json`, { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : { clips: {} }))
      .then((j: { clips?: Record<string, string> }) => (index = j.clips ?? {}))
      .catch(() => {
        indexPromise = null; // try again next time (e.g. once back online)
        return {} as Record<string, string>;
      });
  }
  return indexPromise;
}
/** Is this key recorded? (false until the index has loaded) */
export const hasClip = (key: string) => !!index?.[key];

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
        const buf = isHLA(data) ? hlaBuffer(ctx, data) : await ctx.decodeAudioData(data);
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
  return loadIndex().then((ix) => Promise.all(keys.filter((k) => ix[k]).map((k) => bufferFor(k))).then(() => undefined));
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
    // Drop clips from older libraries.
    try {
      const keep = new Set(files.map((f) => new URL(BASE + f, location.href).href));
      for (const req of await cache.keys()) if (!keep.has(req.url)) void cache.delete(req);
    } catch {
      /* ignore */
    }
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

// ── Stitching + device-voice text ─────────────────────────────────────────────────────────────
const OPS: Record<string, string> = { "+": "plus", "−": "minus", "-": "minus", "×": "times", "÷": "divided by", "=": "equals", "?": "what" };

/** A math line as recorded words, or null if any piece isn't recorded. */
export function stitch(text: string): string[] | null {
  if (!index || !/^[\d\s+\-−×÷=?.,]+$/.test(text) || !/\d/.test(text)) return null;
  const toks = text.replace(/,/g, "").match(/\d+|[+\-−×÷=?]/g);
  if (!toks) return null;
  const keys: string[] = [];
  for (const t of toks) {
    const k = /^\d+$/.test(t) ? (Number(t) <= 100 ? numberWord(Number(t)) : null) : OPS[t];
    if (!k || !index[k]) return null;
    keys.push(k);
  }
  return keys;
}

/** What the device voice should read for a part that isn't recorded. */
function speakable(key: string): string {
  if (key.startsWith("snd:")) return SOUNDS[key.slice(4)]?.say ?? "";
  return key
    .replace(/_{2,}/g, " blank ")
    .replace(/→/g, " becomes ")
    .replace(/\s[+]\s/g, " plus ")
    .replace(/\s[−-]\s/g, " minus ")
    .replace(/\s×\s/g, " times ")
    .replace(/\s÷\s/g, " divided by ")
    .replace(/\s=\s\?/g, " equals what")
    .replace(/\s=\s/g, " equals ")
    .replace(/[“”"]/g, "")
    .trim();
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

type Seg = { clips: Part[] } | { tts: string; onStart?: () => void };
const keyOf = (p: Part): string | null => (typeof p === "string" ? (p === "~" ? null : p) : "key" in p ? p.key : null);

/** Say one or more parts in order. Resolves true when it finished, false if interrupted. */
export function say(parts: Part | Part[]): Promise<boolean> {
  const list = (Array.isArray(parts) ? parts : [parts]).map((p) => (p === "~" ? { gap: 300 } : p));
  stopVoice();
  const my = ++seq;
  return new Promise<boolean>((resolve) => {
    finish = resolve;
    void (async () => {
      await loadIndex();
      const keys = list.map(keyOf).filter((k): k is string => !!k);
      await Promise.all(keys.filter((k) => index?.[k]).map((k) => bufferFor(k)));
      if (my !== seq) return;
      // Recorded runs play gapless; anything else is stitched or read by the device voice.
      const segs: Seg[] = [];
      const pushClip = (p: Part) => {
        const last = segs[segs.length - 1];
        if (last && "clips" in last) last.clips.push(p);
        else segs.push({ clips: [p] });
      };
      for (const p of list) {
        const k = keyOf(p);
        if (!k) {
          pushClip(p);
          continue;
        }
        if (buffers.has(k)) {
          pushClip(p);
          continue;
        }
        const st = stitch(k);
        if (st && st.every((x) => buffers.has(x) || index?.[x])) {
          await Promise.all(st.map((x) => bufferFor(x)));
          if (my !== seq) return;
          if (st.every((x) => buffers.has(x))) {
            st.forEach((x, j) => {
              if (j) pushClip({ gap: 40 });
              pushClip(j === 0 && typeof p !== "string" && "onStart" in p ? { key: x, onStart: p.onStart } : x);
            });
            continue;
          }
        }
        const text = speakable(k);
        if (text) segs.push({ tts: text, onStart: typeof p !== "string" && "onStart" in p ? p.onStart : undefined });
      }
      for (const s of segs) {
        if (my !== seq) return;
        const ok = "clips" in s ? await playClips(s.clips, my) : await speakDevice(s.tts, my, s.onStart);
        if (!ok) return;
      }
      if (my !== seq) return;
      finish = null;
      resolve(true);
    })();
  });
}

function playClips(list: Part[], my: number): Promise<boolean> {
  return new Promise((res) => {
    const ctx = getAudioCtx();
    if (!ctx) return res(true);
    void (async () => {
      if (ctx.state === "suspended") await ctx.resume().catch(() => {});
      if (my !== seq) return res(false);
      let t = ctx.currentTime + 0.03;
      const t0 = t;
      for (const p of list) {
        if (typeof p !== "string" && "gap" in p) {
          t += p.gap / 1000;
          continue;
        }
        const buf = buffers.get(keyOf(p) ?? "");
        if (!buf) continue;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(t);
        sources.push(src);
        if (typeof p !== "string" && "onStart" in p && p.onStart) {
          const cb = p.onStart;
          timers.push(window.setTimeout(() => my === seq && cb(), Math.max(0, (t - t0) * 1000)));
        }
        t += buf.duration;
      }
      timers.push(
        window.setTimeout(() => {
          if (my !== seq) return res(false);
          sources = [];
          res(true);
        }, (t - t0) * 1000 + 40),
      );
    })();
  });
}

function speakDevice(text: string, my: number, onStart?: () => void): Promise<boolean> {
  return new Promise((res) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      onStart?.();
      return res(true);
    }
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.9;
      u.pitch = 1.05;
      const v = pickVoice();
      if (v) u.voice = v;
      u.onstart = () => my === seq && onStart?.();
      u.onend = () => res(my === seq);
      u.onerror = () => res(my === seq);
      window.speechSynthesis.speak(u);
    } catch {
      res(true);
    }
  });
}

let voice: SpeechSynthesisVoice | null | undefined;
const PREFER = [/samantha/i, /aria/i, /jenny/i, /google us english/i, /female/i, /google/i];
function pickVoice(): SpeechSynthesisVoice | null {
  if (voice !== undefined) return voice;
  const all = window.speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
  if (!all.length) return null;
  voice = PREFER.map((re) => all.find((v) => re.test(v.name))).find(Boolean) ?? all[0];
  return voice;
}
