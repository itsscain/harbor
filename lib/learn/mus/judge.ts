// Judging a child's taps — kindly. Tablets add a little delay between a finger and a sound, and a
// five-year-old's sense of time is loose, so:
//   • echo (hear it, tap it back) is judged on the rhythm's SHAPE, not its speed: the taps are fit
//     to the pattern with any steady tempo (40% faster or slower is fine), then each tap must land
//     near where that tempo puts it;
//   • play-along (read with a count-in, or tap the beat) forgives a steady early/late lean (the
//     tablet's delay) and judges how evenly the taps sit around it.
// Tolerances are in beats, so a slow song isn't stricter than a fast one. Pure functions: the UI
// passes tap times in seconds.

export type TapMark = "good" | "early" | "late" | "miss" | "extra";
export type Judged = {
  ok: boolean;
  /** 0–1: how many notes were right. */
  accuracy: number;
  /** One mark per target note (good/early/late/miss), in order. */
  marks: TapMark[];
  /** Taps that didn't match any note. */
  extra: number;
  /** Seconds per beat the child actually tapped at (echo). */
  pace?: number;
};

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 0;
};

/** Echo: `target` = onset beats of the pattern, `taps` = tap times (s). */
export function judgeEcho(target: number[], taps: number[], bpm: number, tol = 0.26): Judged {
  const spb = 60 / bpm;
  if (!target.length) return { ok: taps.length === 0, accuracy: 1, marks: [], extra: taps.length };
  if (taps.length < target.length) {
    // Too few: line up what there is from the start, the rest are misses.
    const marks: TapMark[] = target.map((_, i) => (i < taps.length ? "good" : "miss"));
    return { ok: false, accuracy: taps.length / target.length / 2, marks, extra: 0 };
  }
  if (taps.length > target.length) {
    const marks: TapMark[] = target.map(() => "good");
    return { ok: false, accuracy: target.length / taps.length / 2, marks, extra: taps.length - target.length };
  }
  // Fit taps = a·beat + b (least squares).
  const n = target.length;
  const mx = target.reduce((s, x) => s + x, 0) / n;
  const my = taps.reduce((s, y) => s + y, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (target[i] - mx) ** 2;
    sxy += (target[i] - mx) * (taps[i] - my);
  }
  let a = sxx > 0 ? sxy / sxx : spb;
  // A child's echo can be quicker or slower than what they heard — but not wildly.
  a = Math.max(spb * 0.6, Math.min(spb * 1.7, a));
  const b = my - a * mx;
  const marks: TapMark[] = target.map((t, i) => {
    const off = (taps[i] - (a * t + b)) / a; // in beats at the child's own tempo
    return Math.abs(off) <= tol ? "good" : off < 0 ? "early" : "late";
  });
  const good = marks.filter((m) => m === "good").length;
  return { ok: good === n, accuracy: good / n, marks, extra: 0, pace: a };
}

/** Play-along: `target` = when each note should sound (s, already including the count-in and the
 *  audio delay), `taps` = tap times (s). Each note takes the nearest unused tap. */
export function judgeAlong(target: number[], taps: number[], bpm: number, tol = 0.2): Judged {
  const spb = 60 / bpm;
  const window = spb * 0.75;
  const used = new Set<number>();
  const pair: (number | null)[] = target.map((t) => {
    let best = -1;
    let bestD = Infinity;
    taps.forEach((x, j) => {
      if (used.has(j)) return;
      const d = Math.abs(x - t);
      if (d < bestD && d <= window) {
        bestD = d;
        best = j;
      }
    });
    if (best < 0) return null;
    used.add(best);
    return taps[best] - t;
  });
  const offs = pair.filter((x): x is number => x !== null);
  // The steady lean (the tablet's delay, or a child who's always a hair late) is forgiven.
  const lean = Math.max(-0.12, Math.min(0.3, median(offs)));
  const marks: TapMark[] = pair.map((off) => {
    if (off === null) return "miss";
    const d = (off - lean) / spb;
    return Math.abs(d) <= tol ? "good" : d < 0 ? "early" : "late";
  });
  const good = marks.filter((m) => m === "good").length;
  const extra = taps.length - used.size;
  return { ok: good >= Math.ceil(target.length * 0.85) && extra <= Math.max(1, Math.floor(target.length / 6)), accuracy: good / Math.max(1, target.length), marks, extra };
}

/** Steady beat: did the taps keep the beat (`beats` = when each beat sounds, s)? Judged on the
 *  beats the child tapped through — at least `need` of them, mostly in time. */
export function judgeBeat(beats: number[], taps: number[], bpm: number, need = 6, tol = 0.24): Judged & { tapped: number } {
  const j = judgeAlong(beats, taps, bpm, tol);
  const tapped = j.marks.filter((m) => m !== "miss").length;
  const good = j.marks.filter((m) => m === "good").length;
  const ok = tapped >= need && good >= Math.ceil(tapped * 0.75) && j.extra <= Math.max(2, Math.floor(tapped / 4));
  return { ...j, ok, tapped };
}

/** The tempo a run of taps sets (median gap), in bpm — the conductor's baton. */
export function tapTempo(taps: number[]): number | null {
  if (taps.length < 3) return null;
  const recent = taps.slice(-6);
  const gaps = recent.slice(1).map((t, i) => t - recent[i]).filter((g) => g > 0.2 && g < 2);
  if (gaps.length < 2) return null;
  return Math.round(60 / median(gaps));
}

/** Same notes in the same order (melody echo / read). */
export const samePitches = (want: number[], got: number[]) => want.length === got.length && want.every((p, i) => p === got[i]);
/** How many notes match from the start (to show progress while playing). */
export const prefixMatch = (want: number[], got: number[]) => {
  let k = 0;
  while (k < got.length && k < want.length && want[k] === got[k]) k++;
  return k;
};
