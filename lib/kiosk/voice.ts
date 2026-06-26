// The Harbor Voice (Voice/TTS spec) — V1, no-key foundation. Two immediate wins over
// raw speechSynthesis: (1) normalize text so it reads naturally (no "🦷", "five stars"
// not "5"); (2) pick ONE warm English voice + a calm rate, consistent every session
// instead of the per-device default robot. Cache-first tiers (Tier 0 shared library,
// on-device Kokoro) are the premium follow-ups (§4) — this layer is cascade-ready.

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
  return String(n); // larger numbers: leave as-is (rare in spoken content)
}

/** §12.3 — strip emoji + markdown, expand times + small numbers to words, collapse
 *  whitespace. Reads naturally and (for future cache tiers) raises cache-hit rates. */
export function normalizeForSpeech(text: string): string {
  let t = (text || "").replace(EMOJI_RE, " ").replace(/[*_`#~]/g, "");
  // Times like 7:30 → "seven thirty"; 8:00 → "eight o'clock".
  t = t.replace(/\b(\d{1,2}):(\d{2})\b/g, (_m, h, m) => {
    const hh = numToWords(Number(h));
    const min = Number(m);
    if (min === 0) return `${hh} o'clock`;
    return min < 10 ? `${hh} oh ${numToWords(min)}` : `${hh} ${numToWords(min)}`;
  });
  // Standalone 1–2 digit numbers → words ("5 stars" → "five stars"). Leaves years etc.
  t = t.replace(/\b\d{1,2}\b/g, (m) => numToWords(Number(m)));
  return t.replace(/\s+/g, " ").trim();
}

// Pick + cache one warm English voice. Preference order favors known-warm voices
// across platforms; falls back to the first English voice. Re-picks if voices load late.
let cached: SpeechSynthesisVoice | null | undefined;
const PREFER = [
  /samantha/i, /aria/i, /jenny/i, /sonia/i, /libby/i, /google us english/i,
  /google uk english female/i, /karen/i, /moira/i, /serena/i, /tessa/i,
  /zira/i, /\bfemale\b/i, /google/i, // Windows (Zira) + any Google (Android) voice
];

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  // Voices often load async; clear the cache so the next speak re-picks once ready.
  try {
    window.speechSynthesis.onvoiceschanged = () => {
      cached = undefined;
    };
  } catch {
    /* ignore */
  }
}

/** One consistent warm Harbor voice for read-aloud (V1 — the OS-voice tier). */
export function harborVoice(): SpeechSynthesisVoice | null {
  if (cached !== undefined) return cached;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    cached = null;
    return null;
  }
  const voices = window.speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
  if (!voices.length) return null; // not loaded yet — leave cache unset so we retry
  for (const re of PREFER) {
    const v = voices.find((x) => re.test(x.name));
    if (v) {
      cached = v;
      return v;
    }
  }
  cached = voices[0];
  return cached;
}
