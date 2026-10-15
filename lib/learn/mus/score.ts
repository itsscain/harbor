import type { DrumId, InstId, Meter, MHit, MNote, MTrack, Score } from "./types";
import { RHYTHM, barBeats, cellsDurs, pulses, romanChord, type ChordQuality } from "./theory";

// Building things to hear, as data: melodies, rhythms on a drum, drum-machine patterns, chord
// progressions with a band, and ways to stack and chain them. Content builds its sounds with
// these; the synth (synth.ts) plays any Score; visuals follow the same timeline.

export const V = 0.8;

/** A melody: pitches (null = a rest) with one length for all, or a length per note. */
export function melody(pitches: (number | number[] | null)[], durs: number | number[] = 1, inst: InstId = "bells", bpm = 100): Score {
  const notes: MNote[] = pitches.map((p, i) => ({ p, d: Array.isArray(durs) ? (durs[i] ?? durs[durs.length - 1]) : durs }));
  return { bpm, tracks: [{ kind: "notes", inst, notes }] };
}
/** A tune from rhythm cells + one pitch per sounding note (rests take no pitch). */
export function tune(cells: string[], pitches: number[], inst: InstId = "bells", bpm = 100): Score {
  let k = 0;
  const notes: MNote[] = cellsDurs(cells).map((d) => (d < 0 ? { p: null, d: -d } : { p: pitches[k++ % Math.max(1, pitches.length)] ?? 60, d }));
  return { bpm, tracks: [{ kind: "notes", inst, notes }] };
}
/** Notes from parallel lists (pitches + lengths), the shape the PD song bank uses. */
export function notesOf(pitches: (number | null)[], durs: number[]): MNote[] {
  return pitches.map((p, i) => ({ p, d: durs[i] ?? 1 }));
}

/** A rhythm played on a drum (rhythm cell ids). `count` adds a bar of count-in clicks first. */
export function rhythm(cells: string[], o: { drum?: DrumId; bpm?: number; meter?: Meter; count?: boolean; loud?: number } = {}): Score {
  const bpm = o.bpm ?? 96;
  const meter = o.meter ?? [4, 4];
  const hits: MHit[] = [];
  let t = 0;
  if (o.count) {
    let c = 0;
    for (const p of pulses(meter)) {
      hits.push({ t: c, k: "sticks", v: c === 0 ? 0.9 : 0.6 });
      c += p;
    }
    t = barBeats(meter);
  }
  for (const d of cellsDurs(cells)) {
    if (d > 0) hits.push({ t, k: o.drum ?? "bongo", v: o.loud ?? V });
    t += Math.abs(d);
  }
  return { bpm, meter, tracks: [{ kind: "drums", hits }] };
}
/** Rhythm from raw durations (beats; negative = rest). */
export function rhythmDurs(durs: number[], o: { drum?: DrumId; bpm?: number; meter?: Meter } = {}): Score {
  const hits: MHit[] = [];
  let t = 0;
  for (const d of durs) {
    if (d > 0) hits.push({ t, k: o.drum ?? "bongo", v: V });
    t += Math.abs(d);
  }
  return { bpm: o.bpm ?? 96, meter: o.meter ?? [4, 4], tracks: [{ kind: "drums", hits }] };
}

/** A drum-machine pattern from strings — one per drum, "x" = hit, "X" = accented hit, "." = rest.
 *  `per` steps make a beat (2 = eighths, 4 = sixteenths); the pattern repeats for `bars` times its
 *  length. */
export function beat(rows: Partial<Record<DrumId, string>>, o: { bpm?: number; per?: number; times?: number; swing?: number; meter?: Meter } = {}): Score {
  const per = o.per ?? 2;
  const times = o.times ?? 2;
  const hits: MHit[] = [];
  const len = Math.max(...Object.values(rows).map((r) => r?.length ?? 0));
  for (let rep = 0; rep < times; rep++)
    for (const [k, row] of Object.entries(rows) as [DrumId, string][])
      for (let i = 0; i < row.length; i++) {
        const c = row[i];
        if (c === "x" || c === "X") hits.push({ t: (rep * len + i) / per, k, v: c === "X" ? 1 : 0.72 });
      }
  return { bpm: o.bpm ?? 100, meter: o.meter, swing: o.swing, tracks: [{ kind: "drums", hits }] };
}
/** The Beat Lab grid as a Score (rows of "x."; `steps` across one bar of 4/4). */
export function gridScore(rows: DrumId[], pattern: string[], steps: number, bpm: number, times = 2, swing = 0): Score {
  const rec: Partial<Record<DrumId, string>> = {};
  rows.forEach((r, i) => (rec[r] = (rec[r] ?? "").padEnd(steps, ".").split("").map((c, j) => (pattern[i]?.[j] === "x" || c === "x" ? "x" : ".")).join("")));
  return beat(rec, { bpm, per: steps / 4, times, swing });
}

// ── Drum grooves (by style), one bar of sixteenths in 4/4 (or a bar of 6/8 / 3/4) ─────────────
export type Groove = "rock" | "pop" | "march" | "waltz" | "swing" | "hiphop" | "reggae" | "bossa" | "salsa" | "edm" | "country" | "shuffle" | "gospel" | "six8" | "ballad" | "funk" | "trap" | "polka" | "lullaby";
export const GROOVES: Record<Groove, { meter: Meter; per: number; rows: Partial<Record<DrumId, string>>; swing?: number }> = {
  rock: { meter: [4, 4], per: 4, rows: { kick: "x.......x.x.....", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x." } },
  pop: { meter: [4, 4], per: 4, rows: { kick: "x.....x.x.......", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x.", shaker: "..x...x...x...x." } },
  march: { meter: [2, 4], per: 4, rows: { bassdrum: "x.......", snare: "x.xxx.x.", cymbals: "....x..." } },
  waltz: { meter: [3, 4], per: 2, rows: { kick: "x.....", snare: "..x.x.", hat: "x.x.x." } },
  swing: { meter: [4, 4], per: 4, rows: { ride: "x...x.x.x...x.x.", hat: "....x.......x...", kick: "x.......x......." }, swing: 0.33 },
  hiphop: { meter: [4, 4], per: 4, rows: { kick: "x......x..x.....", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x." }, swing: 0.12 },
  reggae: { meter: [4, 4], per: 4, rows: { kick: "........x.......", rim: "........x.......", hat: "..x...x...x...x." } },
  bossa: { meter: [4, 4], per: 4, rows: { kick: "x..x....x..x....", rim: "x..x..x...x..x..", shaker: "xxxxxxxxxxxxxxxx" } },
  salsa: { meter: [4, 4], per: 4, rows: { block: "x..x..x...x.x...", conga: "..x.x..x..x.x..x", cowbell: "x...x...x...x...", shaker: "x.x.x.x.x.x.x.x." } },
  edm: { meter: [4, 4], per: 4, rows: { kick: "x...x...x...x...", clap: "....x.......x...", openhat: "..x...x...x...x.", hat: "xxxxxxxxxxxxxxxx" } },
  country: { meter: [4, 4], per: 4, rows: { kick: "x.......x.......", snare: "xxxxXxxxxxxxXxxx", hat: "....x.......x..." } },
  shuffle: { meter: [4, 4], per: 2, rows: { kick: "x...x...", snare: "..x...x.", hat: "xxxxxxxx" }, swing: 0.33 },
  gospel: { meter: [4, 4], per: 2, rows: { kick: "x...x.x.", clap: "..x...x.", tamb: "xxxxxxxx" } },
  six8: { meter: [6, 8], per: 2, rows: { kick: "x.....", snare: "...x..", hat: "xxxxxx" } },
  ballad: { meter: [4, 4], per: 2, rows: { kick: "x...x.x.", snare: "..x...x.", hat: "x.x.x.x." } },
  funk: { meter: [4, 4], per: 4, rows: { kick: "x..x..x...x..x..", snare: "....x..x.x..x...", hat: "xxxxxxxxxxxxxxxx" } },
  trap: { meter: [4, 4], per: 4, rows: { kick: "x.....x...x.....", clap: "........x.......", hat: "x.x.xxx.x.x.xxxx" } },
  polka: { meter: [2, 4], per: 2, rows: { kick: "x.x.", snare: ".x.x" } },
  lullaby: { meter: [3, 4], per: 2, rows: { triangle: "x.....", shaker: "..x.x." } },
};
/** A groove on drums for `bars` bars. */
export function groove(g: Groove, bars = 2, bpm = 100): Score {
  const G = GROOVES[g];
  return { ...beat(G.rows, { bpm, per: G.per, times: bars, swing: G.swing }), meter: G.meter };
}

// ── Chords ───────────────────────────────────────────────────────────────────────────────────
export type ChordStyle = "block" | "strum" | "arp" | "pad" | "oompah" | "pulse" | "waltz";
/** Pitches for a chord voiced in a comfortable middle range (root position, around C4–C5). */
export function voiced(root: number, q: ChordQuality, center = 60): number[] {
  const shape = { maj: [0, 4, 7], min: [0, 3, 7], dim: [0, 3, 6], aug: [0, 4, 8], "7": [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], m7b5: [0, 3, 6, 10], dim7: [0, 3, 6, 9], sus2: [0, 2, 7], sus4: [0, 5, 7], "5": [0, 7] }[q];
  let r = root;
  while (r < center - 7) r += 12;
  while (r > center + 4) r -= 12;
  return shape.map((s) => r + s);
}
/** One chord (pitches), together or rolled. */
export function chordSound(pitches: number[], inst: InstId = "piano", beats = 3, bpm = 60): Score {
  return { bpm, tracks: [{ kind: "notes", inst, notes: [{ p: pitches, d: beats }] }] };
}
/** A chord rolled upward (one note after another), then held together. */
export function arpeggio(pitches: number[], inst: InstId = "piano", bpm = 90): Score {
  return { bpm, tracks: [{ kind: "notes", inst, notes: [...pitches.map((p) => ({ p, d: 0.5 })), { p: pitches, d: 2 }] }] };
}

/** Chords from roman numerals in a key, `per` beats each, in a style — with an optional bass line
 *  (root notes) and drum groove. The backbone of the chord lessons and the Studio. */
export function progression(
  romans: string[],
  tonic: number,
  mode: "major" | "minor" = "major",
  o: { bpm?: number; per?: number; inst?: InstId; style?: ChordStyle; bass?: boolean; drums?: Groove | null; meter?: Meter; /** oompah / waltz: who plays the low "oom" (a tuba under brass chords); else the chord instrument. */ lowInst?: InstId } = {},
): Score {
  const bpm = o.bpm ?? 92;
  const per = o.per ?? 4;
  const inst = o.inst ?? "piano";
  const style = o.style ?? "block";
  const chordNotes: MNote[] = [];
  const bassNotes: MNote[] = [];
  const lowNotes: MNote[] = [];
  for (const r of romans) {
    const c = romanChord(r, tonic, mode);
    const ps = voiced(c.root, c.q);
    const low = ps[0] - 12 >= 40 ? ps[0] - 12 : ps[0];
    switch (style) {
      case "block":
        chordNotes.push({ p: ps, d: per });
        break;
      case "pad":
        chordNotes.push({ p: ps, d: per, v: 0.55 });
        break;
      case "strum":
        for (let b = 0; b < per; b++) chordNotes.push({ p: ps, d: 1, v: b % 2 ? 0.55 : 0.8 });
        break;
      case "pulse":
        for (let b = 0; b < per * 2; b++) chordNotes.push({ p: ps, d: 0.5, v: b % 2 ? 0.5 : 0.7 });
        break;
      case "arp": {
        const up = [...ps, ps[1] + 12, ps[0] + 12, ...ps.slice(1).reverse()];
        for (let b = 0; b < per * 2; b++) chordNotes.push({ p: up[b % up.length], d: 0.5, v: 0.65 });
        break;
      }
      case "oompah":
      case "waltz": {
        const isOom = (b: number) => (style === "oompah" ? b % 2 === 0 : b % 3 === 0);
        let deep = c.root;
        while (deep > 52) deep -= 12;
        while (deep < 36) deep += 12;
        for (let b = 0; b < per; b++) {
          if (o.lowInst) {
            lowNotes.push(isOom(b) ? { p: deep, d: 1, v: 0.85 } : { p: null, d: 1 });
            chordNotes.push(isOom(b) ? { p: null, d: 1 } : { p: ps, d: 1, v: style === "oompah" ? 0.6 : 0.55 });
          } else chordNotes.push(isOom(b) ? { p: low, d: 1, v: 0.8 } : { p: ps, d: 1, v: style === "oompah" ? 0.6 : 0.55 });
        }
        break;
      }
    }
    if (o.bass) {
      const root = c.root;
      let b = root;
      while (b > 48) b -= 12;
      while (b < 36) b += 12;
      if (per >= 4) bassNotes.push({ p: b, d: per / 2 }, { p: b + 7 > 52 ? b - 5 : b + 7, d: per / 2 });
      else bassNotes.push({ p: b, d: per });
    }
  }
  const tracks: MTrack[] = [{ kind: "notes", inst, notes: chordNotes }];
  if (o.lowInst && lowNotes.length) tracks.push({ kind: "notes", inst: o.lowInst, notes: lowNotes, vol: 0.95 });
  if (o.bass) tracks.push({ kind: "notes", inst: "bass", notes: bassNotes, vol: 0.9 });
  const out: Score = { bpm, meter: o.meter, tracks };
  if (o.drums) {
    const total = romans.length * per;
    const g = GROOVES[o.drums];
    const barLen = barBeats(g.meter);
    const d = groove(o.drums, Math.ceil(total / barLen), bpm);
    out.tracks.push({ kind: "drums", hits: (d.tracks[0] as Extract<MTrack, { kind: "drums" }>).hits.filter((h) => h.t < total - 1e-6), vol: 0.75 });
    out.swing = g.swing;
    out.meter = o.meter ?? g.meter;
  }
  return out;
}

// ── Putting sounds together ──────────────────────────────────────────────────────────────────
/** Length of a track in beats. */
export function trackBeats(t: MTrack): number {
  if (t.kind === "notes") return (t.at ?? 0) + t.notes.reduce((s, x) => s + x.d, 0);
  return t.hits.length ? Math.max(...t.hits.map((h) => h.t)) + 0.25 : 0;
}
/** Length of a score in beats (a drum track rounds up to its bar). */
export function scoreBeats(s: Score): number {
  let len = 0;
  for (const t of s.tracks) len = Math.max(len, trackBeats(t));
  if (s.tracks.some((t) => t.kind === "drums") && s.tracks.every((t) => t.kind === "drums")) {
    const bar = barBeats(s.meter ?? [4, 4]);
    len = Math.ceil(len / bar - 1e-6) * bar;
  }
  return len;
}
export const scoreSeconds = (s: Score) => (scoreBeats(s) * 60) / s.bpm;

/** Stack sounds to play together (at the first one's tempo). */
export function layer(...ss: Score[]): Score {
  const bpm = ss[0].bpm;
  const tracks: MTrack[] = [];
  for (const s of ss) tracks.push(...retime(s, bpm).tracks);
  return { bpm, meter: ss[0].meter, swing: ss.find((s) => s.swing)?.swing, tracks, fx: ss[0].fx };
}
/** Play one sound, then another (a gap of `gap` beats between). Tempo follows the first. */
export function then(a: Score, b: Score, gap = 1): Score {
  const off = scoreBeats(a) + gap;
  const bb = retime(b, a.bpm);
  const shifted: MTrack[] = bb.tracks.map((t) => (t.kind === "notes" ? { ...t, at: (t.at ?? 0) + off } : { ...t, hits: t.hits.map((h) => ({ ...h, t: h.t + off })) }));
  return { bpm: a.bpm, meter: a.meter, swing: a.swing, tracks: [...a.tracks, ...shifted], fx: a.fx };
}
/** Several sounds one after another. */
export const chain = (ss: Score[], gap = 1) => ss.slice(1).reduce((acc, s) => then(acc, s, gap), ss[0]);
/** The same music written at another tempo's beat grid (so it sounds identical inside `bpm`). */
export function retime(s: Score, bpm: number): Score {
  if (s.bpm === bpm) return s;
  const k = bpm / s.bpm;
  return {
    ...s,
    bpm,
    tracks: s.tracks.map((t) => (t.kind === "notes" ? { ...t, at: t.at !== undefined ? t.at * k : undefined, notes: t.notes.map((x) => ({ ...x, d: x.d * k })) } : { ...t, hits: t.hits.map((h) => ({ ...h, t: h.t * k })) })),
  };
}
/** Move every pitched note up or down by half steps. */
export function transpose(s: Score, semis: number): Score {
  const tp = (p: MNote["p"]) => (p === null ? null : Array.isArray(p) ? p.map((x) => x + semis) : p + semis);
  return { ...s, tracks: s.tracks.map((t) => (t.kind === "notes" ? { ...t, notes: t.notes.map((x) => ({ ...x, p: tp(x.p) })) } : t)) };
}
/** Same notes, new tempo. */
export const atTempo = (s: Score, bpm: number): Score => ({ ...s, bpm });
/** Same music on another instrument. */
export const onInst = (s: Score, inst: InstId): Score => ({ ...s, tracks: s.tracks.map((t) => (t.kind === "notes" ? { ...t, inst } : t)) });
/** Louder or softer overall (1 = normal). */
export const withGain = (s: Score, gain: number): Score => ({ ...s, fx: { ...s.fx, gain } });
export const withFx = (s: Score, fx: NonNullable<Score["fx"]>): Score => ({ ...s, fx: { ...s.fx, ...fx } });
/** Every note's loudness changes evenly from `from` to `to` across the piece (a crescendo/decrescendo). */
export function hairpin(s: Score, from: number, to: number): Score {
  const len = Math.max(1e-6, scoreBeats(s));
  const at = (t: number) => from + (to - from) * Math.min(1, t / len);
  return {
    ...s,
    tracks: s.tracks.map((tr) => {
      if (tr.kind === "drums") return { ...tr, hits: tr.hits.map((h) => ({ ...h, v: (h.v ?? V) * at(h.t) })) };
      let t = tr.at ?? 0;
      return { ...tr, notes: tr.notes.map((x) => { const v = (x.v ?? V) * at(t); t += x.d; return { ...x, v }; }) };
    }),
  };
}
/** Speed up or slow down across a piece (accelerando / ritardando), approximated by stretching each
 *  later note — returns a score whose notes get shorter (faster) or longer (slower). */
export function tempoRamp(s: Score, toFactor: number): Score {
  const len = Math.max(1e-6, scoreBeats(s));
  const k = (t: number) => 1 + (1 / toFactor - 1) * Math.min(1, t / len);
  const map = (t: number) => t * (1 + (k(t) - 1) / 2);
  return {
    ...s,
    tracks: s.tracks.map((tr) => {
      if (tr.kind === "drums") return { ...tr, hits: tr.hits.map((h) => ({ ...h, t: map(h.t) })) };
      let t = tr.at ?? 0;
      return { ...tr, notes: tr.notes.map((x) => { const d = map(t + x.d) - map(t); t += x.d; return { ...x, d }; }) };
    }),
  };
}
/** A metronome: n clicks (accent on each bar's first beat). */
export function clicks(n: number, bpm: number, meter: Meter = [4, 4]): Score {
  const per = pulses(meter);
  const hits: MHit[] = [];
  let t = 0;
  for (let i = 0; i < n; i++) {
    hits.push({ t, k: "sticks", v: i % per.length === 0 ? 0.95 : 0.6 });
    t += per[i % per.length];
  }
  return { bpm, meter, tracks: [{ kind: "drums", hits }] };
}
/** A single note held. */
export const note1 = (p: number, inst: InstId = "piano", beats = 2, bpm = 60): Score => ({ bpm, tracks: [{ kind: "notes", inst, notes: [{ p, d: beats }] }] });
/** A pure tone (for sound science) — the synth's "whistle" sine, held. */
export const tone = (p: number, beats = 2, bpm = 60, v = 0.8): Score => ({ bpm, tracks: [{ kind: "notes", inst: "whistle", notes: [{ p, d: beats, v }] }] });

// ── Following along ──────────────────────────────────────────────────────────────────────────
export type TimedNote = { t: number; d: number; p: MNote["p"]; i: number };
/** Every note of a notes track with its start time (rests included, so pictures can light them). */
export function timeline(t: MTrack): TimedNote[] {
  if (t.kind === "drums") return t.hits.map((h, i) => ({ t: h.t, d: 0.25, p: null, i }));
  let at = t.at ?? 0;
  return t.notes.map((x, i) => {
    const out = { t: at, d: x.d, p: x.p, i };
    at += x.d;
    return out;
  });
}
/** Which item of a timeline is sounding at beat `b` (−1 = none). */
export function activeAt(tl: { t: number; d: number }[], b: number | null): number {
  if (b === null || b < 0) return -1;
  for (let i = tl.length - 1; i >= 0; i--) if (b >= tl[i].t - 1e-6) return b < tl[i].t + tl[i].d + 1e-6 ? i : -1;
  return -1;
}
/** Which item of a list of durations (rests included) is at beat `b`. */
export function activeDur(durs: number[], b: number | null): number {
  if (b === null || b < 0) return -1;
  let t = 0;
  for (let i = 0; i < durs.length; i++) {
    const d = Math.abs(durs[i]);
    if (b < t + d - 1e-6) return i;
    t += d;
  }
  return -1;
}
/** The melody notes of a score (its first notes track), as plain pitches (chords → top note). */
export function melodyPitches(s: Score): number[] {
  const t = s.tracks.find((x) => x.kind === "notes");
  if (!t || t.kind !== "notes") return [];
  return t.notes.flatMap((x) => (x.p === null ? [] : [Array.isArray(x.p) ? Math.max(...x.p) : x.p]));
}
/** Rhythm cell ids → their syllables in order (for showing under stick notation). */
export const syllablesOf = (cells: string[]) => cells.flatMap((c) => RHYTHM[c].syl);
