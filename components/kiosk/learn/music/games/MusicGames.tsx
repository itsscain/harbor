"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Band } from "@/lib/learn/types";
import { speakingNow } from "@/lib/learn/audio";
import { buzz, sfx } from "@/lib/learn/sfx";
import type { DrumId, InstId, MTrack, Score } from "@/lib/learn/mus/types";
import { melody, progression, retime, type ChordStyle, type Groove } from "@/lib/learn/mus/score";
import { SONG_BY_ID, type Song } from "@/lib/learn/mus/songs";
import { LETTERS, barBeats, noteColor, pcOf, romanChord, stepToMidi } from "@/lib/learn/mus/theory";
import { playDrum, playNote, tapTime, type Playback } from "@/lib/learn/mus/synth";
import { BurstLayer, Chunk, useBursts, type Tone } from "../../kit";
import { useLater } from "../../acts/common";
import { Glyph, WithGlyphs } from "../../art/Glyph";
import { ClockBar, useClock } from "../../BrainGym";
import { usePlayer } from "../kit/player";
import { Bells, DrumPad, InstrumentPic, MiniPlay, PlayButton, SoundOffNote } from "../kit/kit";
import { Staff } from "../kit/notation";

// The Game Arcade's music games — quick, replayable rounds for the ear and the eye:
//   Rhythm Rush    notes fall toward a glowing line in time with a real band (a medley of songs
//                  everyone knows, harmonized with chords, bass and drums); tap the drum as each
//                  one lands. Taps are judged on the AUDIO clock, against what was actually heard.
//   Simon Sea      four shell-bells sing a tune that grows by one note every round; sing it back.
//   Note Ninja     little ones match a bell by ear; readers name notes on the staff, fast (big kids
//                  get both clefs, then sharps and flats).
//   Pitch Pirates  two treasure chests sing — was the second note higher or lower? The gap shrinks
//                  as the score grows, down to a half step.
// The arcade's rules hold: beat your own best, and a wrong tap costs a point (and freezes the board
// for a moment), so tapping everything never beats listening.

type GameProps = { band: Band; onEnd: (score: number) => void };
const ROUND = 50;
const LOCK_MS = 650;
const INK = "#2a2f45";

// Randomness and clocks live out here (module helpers), never in render.
const rand = (n: number) => Math.floor(Math.random() * n);
const coin = (p: number) => Math.random() < p;
const pickOne = <T,>(xs: readonly T[]): T => xs[rand(xs.length)];
function shuffled<T>(xs: readonly T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
/** A steady clock in ms — for handlers (how fast was that answer?), never for drawing. */
const clockMs = () => performance.now();
let keySeq = 0;
/** A fresh key for a popup, a flash or a question. */
const freshKey = () => ++keySeq;

/** Run `fn` once Learn's voice is quiet (music would cut "Ready? Go!" off), or after `max` ms. */
function whenQuiet(fn: () => void, max = 2600, min = 250): () => void {
  const t0 = performance.now();
  let id = 0;
  const check = () => {
    const waited = performance.now() - t0;
    if ((waited >= min && speakingNow() === null) || waited >= max) fn();
    else id = window.setTimeout(check, 90);
  };
  id = window.setTimeout(check, min);
  return () => window.clearTimeout(id);
}

/** Holds a game until the voice has finished, so the round (and its clock) starts on the music. */
function AfterVoice({ children }: { children: ReactNode }) {
  const [go, setGo] = useState(false);
  useEffect(() => whenQuiet(() => setGo(true)), []);
  if (go) return children;
  return (
    <div className="l-pop-in flex items-center gap-3 rounded-full bg-white px-8 py-4 font-display text-3xl font-extrabold text-[var(--l-ink)] shadow-[0_6px_0_var(--l-line)]">
      <Glyph e="🎵" size={48} className="l-bob" /> Get ready…
    </div>
  );
}

function ScorePill({ score }: { score: number }) {
  return (
    <span key={score} className="l-pop-in rounded-full bg-white px-5 py-1.5 font-display text-2xl font-extrabold text-[var(--l-ink)]">
      <Glyph e="⭐" size="1.25em" className="mx-[0.1em] inline-block align-[-0.28em]" /> {score}
    </span>
  );
}
/** The fast-answer streak (bonus points from three in a row). */
function Streak({ n }: { n: number }) {
  if (n < 3) return null;
  return (
    <span key={n} className="l-pop-in flex items-center gap-1 rounded-full bg-[var(--l-orange)] px-4 py-1.5 font-display text-xl font-extrabold text-white shadow-[0_4px_0_var(--l-orange-edge)]">
      <Glyph e="🔥" size={28} className="l-flame" /> {n} fast! +{n >= 6 ? 2 : 1}
    </span>
  );
}

/** The timed games' frame: the clock, the score, a banner, and the board (which ignores taps
 *  while `locked`: just after a wrong answer, or while a sound is still being heard). */
function Frame({ left, score, top, locked, children }: { left: number; score: number; top?: ReactNode; locked?: boolean; children: ReactNode }) {
  return (
    <div className="flex w-full max-w-[1040px] flex-col items-center gap-4">
      <ClockBar left={left} total={ROUND} />
      <div className="flex flex-wrap items-center justify-center gap-3">
        <ScorePill score={score} />
        {top}
      </div>
      <SoundOffNote />
      <div className={cn("relative flex w-full flex-col items-center gap-5 transition-opacity", locked && "opacity-80")}>
        {children}
        {locked && <div className="absolute inset-0 z-10" aria-hidden />}
      </div>
    </div>
  );
}

const FAST_MS: Record<Band, number> = { little: 3200, middle: 2700, big: 2300 };
/** Scoring for the quick-answer games: a right answer is a point — two or three in a fast streak —
 *  and a wrong one costs a point (never below zero) and freezes the board for a moment. */
function useQuick(band: Band) {
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [locked, setLocked] = useState(false);
  const asked = useRef(0);
  const later = useLater();
  /** The question is ready (seen, or heard): the speed clock starts. */
  const ask = () => {
    asked.current = clockMs();
  };
  /** A right answer; returns the new score. */
  const right = () => {
    const fast = clockMs() - asked.current <= FAST_MS[band];
    const s = fast ? streak + 1 : 0;
    const pts = 1 + (s >= 6 ? 2 : s >= 3 ? 1 : 0);
    setStreak(s);
    setScore(score + pts);
    return score + pts;
  };
  /** A wrong answer; returns the new score. */
  const wrong = () => {
    setStreak(0);
    setScore(Math.max(0, score - 1));
    sfx("soft-fail");
    buzz(25);
    setLocked(true);
    later(() => setLocked(false), LOCK_MS);
    return Math.max(0, score - 1);
  };
  return { score, streak, locked, ask, right, wrong, later };
}

// ── Rhythm Rush ──────────────────────────────────────────────────────────────────────────────
// A round is a medley: two or three songs (by grade band), each with a bar of groove before it,
// harmonized on the fly (one chord per half bar or bar, chosen to fit the tune) with piano, bass
// and a drum groove in the song's meter, and a "ta-da" chord at the end. The falling notes are the
// tune's own onsets, thinned so they're never closer than a child can tap (little: quarter notes),
// in 1 / 2 / 3 lanes by pitch — low notes on the left, like a piano.

type RushCfg = { lanes: number; bpm: number; look: number; minGap: number; perfect: number; good: number; miss: number };
/** Per band: lanes, tempo, how many seconds a note is seen before it lands, the closest two notes
 *  may be (s), and the timing windows (s, either side of the beat). */
const RUSH: Record<Band, RushCfg> = {
  little: { lanes: 1, bpm: 90, look: 2.6, minGap: 0.42, perfect: 0.1, good: 0.2, miss: 0.3 },
  middle: { lanes: 2, bpm: 100, look: 2.2, minGap: 0.33, perfect: 0.085, good: 0.165, miss: 0.27 },
  big: { lanes: 3, bpm: 112, look: 1.85, minGap: 0.24, perfect: 0.07, good: 0.14, miss: 0.24 },
};
const RUSH_SONGS: Record<Band, string[]> = {
  little: ["twinkle", "mary", "hotcross", "baabaa", "lightlyrow", "oldmac", "thisoldman", "jingle", "london"],
  middle: ["twinkle", "mary", "baabaa", "lightlyrow", "jingle", "london", "frere", "odetojoy", "saints", "rowboat", "birthday", "bonnie", "rosie"],
  big: ["odetojoy", "minuet", "mountainking", "saints", "jingle", "frere", "london", "bonnie", "birthday", "rowboat", "rosie", "lightlyrow", "twinkle"],
};
/** Lead instruments with crisp starts (easy to hear exactly when a note begins). */
const RUSH_LEADS: InstId[] = ["marimba", "xylophone", "steeldrum", "kalimba", "musicbox", "harp", "glock", "banjo"];
const LANE_COLOR = ["#ff6fb5", "#1cb0f6", "#ffc83d"];
const LANE_EDGE = ["#d9408f", "#1491cf", "#e0a21a"];
const LANE_DRUMS: Record<number, DrumId[]> = { 1: ["bongo"], 2: ["conga", "bongo"], 3: ["lowtom", "conga", "bongo"] };

type RushNote = { id: number; beat: number; lane: number };
type RushSeg = { start: number; first: number; title: string; lead: InstId };
type RushChart = { score: Score; notes: RushNote[]; free: number[]; lines: { b: number; bar: boolean }[]; segs: RushSeg[]; end: number; spb: number; lanes: number };
type Built = { score: Score; bpm: number; len: number; at: number; song: Song; lead: InstId; shift: number; mode: "major" | "minor" };

/** Major or minor, by which third the tune leans on. */
function keyMode(s: Song): "major" | "minor" {
  let maj = 0;
  let min = 0;
  s.pitches.forEach((p, i) => {
    if (p === null) return;
    const d = pcOf(p - s.tonic);
    if (d === 4) maj += s.durs[i];
    if (d === 3) min += s.durs[i];
  });
  return min > maj ? "minor" : "major";
}

/** One chord per `per` beats (from the first downbeat) that fits the tune best: notes that start a
 *  chunk count most, sustained notes least, and notes outside the chord count against it. Home
 *  gets a small head start (songs begin at home), ties go to home, then the dominant; the last
 *  chunk always goes home. */
function harmonize(s: Song, mode: "major" | "minor", per: number, chunks: number): string[] {
  const cands = mode === "major" ? ["I", "V", "IV", "vi"] : ["i", "V", "iv", "VI"];
  const tones = cands.map((r) => romanChord(r, s.tonic, mode).pitches.map(pcOf));
  const fit = Array.from({ length: chunks }, (_, k) => cands.map((_, c): number => (c === 0 ? (k === 0 ? 0.9 : 0.25) : 0)));
  let t = -(s.pickup ?? 0);
  s.pitches.forEach((p, i) => {
    const d = s.durs[i];
    if (p !== null)
      for (let k = Math.max(0, Math.floor(t / per)); k < chunks && k * per < t + d - 1e-6; k++) {
        const a = Math.max(t, k * per);
        const e = Math.min(t + d, (k + 1) * per);
        if (e <= a) continue;
        const w = (e - a) * (Math.abs(t - k * per) < 1e-6 ? 1.6 : t > k * per ? (Math.abs(t - Math.round(t)) < 1e-6 ? 1.2 : 1) : 0.8);
        tones.forEach((pcs, c) => (fit[k][c] += pcs.includes(pcOf(p)) ? w : -0.35 * w));
      }
    t += d;
  });
  return fit.map((row, k) => (k === chunks - 1 ? cands[0] : cands[row.indexOf(Math.max(...row))]));
}

/** One song of the medley: `intro` bars of groove, then the tune over its band. */
function rushSegment(s: Song, bpm: number, intro: number, lead: InstId): Built {
  const bar = barBeats(s.meter);
  const four = s.meter[0] === 4 && s.meter[1] === 4;
  const waltz = s.meter[0] === 3 && s.meter[1] === 4;
  const two = s.meter[0] === 2;
  const compound = s.meter[1] === 8;
  const per = four ? 2 : bar;
  const pickup = s.pickup ?? 0;
  const total = s.durs.reduce((a, d) => a + d, 0);
  const bars = Math.max(1, Math.ceil((total - pickup) / bar - 1e-6));
  const mode = keyMode(s);
  const home = mode === "major" ? "I" : "i";
  const romans = [...Array.from({ length: Math.round((intro * bar) / per) }, () => home), ...harmonize(s, mode, per, Math.round((bars * bar) / per))];
  const groove: Groove = waltz ? "waltz" : two ? "polka" : compound ? "six8" : pickOne(["pop", "rock", "ballad"] as const);
  const style: ChordStyle = waltz ? "waltz" : two ? "oompah" : compound ? "block" : "strum";
  const backing = progression(romans, s.tonic, mode, { bpm, per, inst: "piano", style, bass: true, drums: groove, meter: s.meter });
  const sounding = s.pitches.filter((p): p is number => p !== null);
  // Tunes sit up an octave, clear of the piano's chords.
  const shift = sounding.reduce((a, p) => a + p, 0) / Math.max(1, sounding.length) < 69 ? 12 : 0;
  const at = intro * bar - pickup;
  const tune: MTrack = { kind: "notes", inst: lead, at, notes: s.pitches.map((p, i) => ({ p: p === null ? null : p + shift, d: s.durs[i], v: 0.95 })) };
  const mix = backing.tracks.map((t, i): MTrack => ({ ...t, vol: t.kind === "drums" ? 0.6 : i === 0 ? 0.42 : 0.75 }));
  return { score: { bpm, meter: s.meter, tracks: [tune, ...mix] }, bpm, len: (intro + bars) * bar, at, song: s, lead, shift, mode };
}

const shiftTrack = (t: MTrack, by: number): MTrack => (t.kind === "notes" ? { ...t, at: (t.at ?? 0) + by } : { ...t, hits: t.hits.map((h) => ({ ...h, t: h.t + by })) });

/** The whole round: about 40–55 seconds of music and the notes to tap, on one beat grid (the
 *  first song's tempo; later songs are retimed onto it, so they keep their own speed). */
function buildRush(band: Band): RushChart {
  const cfg = RUSH[band];
  const leads = shuffled(RUSH_LEADS);
  const built: Built[] = [];
  let secs = 0;
  for (const id of shuffled(RUSH_SONGS[band])) {
    const s = SONG_BY_ID.get(id);
    if (!s || secs >= 38) continue;
    const bpm = Math.round(cfg.bpm * (s.meter[1] === 8 ? 1.3 : 1));
    const barSec = (barBeats(s.meter) * 60) / bpm;
    // The first song gets time for its first note to fall the whole way, plus a count-in.
    const intro = built.length ? 1 : Math.max(2, Math.ceil((cfg.look + 0.8) / barSec));
    const seg = rushSegment(s, bpm, intro, leads[built.length % leads.length]);
    const sec = (seg.len * 60) / bpm;
    if (built.length && secs + sec > 52) continue;
    built.push(seg);
    secs += sec;
  }
  const grid = built[0].bpm;
  const spb = 60 / grid;
  const tracks: MTrack[] = [];
  const notes: RushNote[] = [];
  const free: number[] = [];
  const lines: { b: number; bar: boolean }[] = [];
  const segs: RushSeg[] = [];
  let off = 0;
  for (const seg of built) {
    const k = grid / seg.bpm;
    for (const t of retime(seg.score, grid).tracks) tracks.push(shiftTrack(t, off));
    const bar = barBeats(seg.song.meter);
    const step = seg.song.meter[1] === 8 ? 1.5 : 1;
    for (let x = 0; x < seg.len - 1e-6; x += step) lines.push({ b: off + x * k, bar: Math.abs(x / bar - Math.round(x / bar)) < 1e-6 });
    const kept: { b: number; p: number }[] = [];
    let t = seg.at;
    seg.song.pitches.forEach((p, i) => {
      if (p !== null) {
        const at = off + t * k;
        if (!kept.length || (at - kept[kept.length - 1].b) * spb >= cfg.minGap - 1e-6) kept.push({ b: at, p });
        else free.push(at); // too quick to chart: tapping it is free
      }
      t += seg.song.durs[i];
    });
    const distinct = [...new Set(kept.map((x) => x.p))].sort((x, y) => x - y);
    for (const x of kept) notes.push({ id: notes.length, beat: x.b, lane: Math.min(cfg.lanes - 1, Math.floor((distinct.indexOf(x.p) * cfg.lanes) / distinct.length)) });
    segs.push({ start: off, first: kept[0]?.b ?? off, title: seg.song.title, lead: seg.lead });
    off += seg.len * k;
  }
  // Ta-da: the home chord, the tune's home note, and a cymbal crash.
  const last = built[built.length - 1];
  const barL = barBeats(last.song.meter);
  let root = last.song.tonic;
  while (root > 48) root -= 12;
  const outro: Score = {
    bpm: last.bpm,
    tracks: [
      { kind: "notes", inst: "piano", notes: [{ p: romanChord(last.mode === "major" ? "I" : "i", last.song.tonic, last.mode).pitches, d: barL, v: 0.75 }], vol: 0.55 },
      { kind: "notes", inst: last.lead, notes: [{ p: last.song.tonic + last.shift, d: barL, v: 0.85 }] },
      { kind: "notes", inst: "bass", notes: [{ p: root, d: barL }], vol: 0.8 },
      { kind: "drums", hits: [{ t: 0, k: "crash", v: 0.9 }, { t: 0, k: "kick", v: 1 }], vol: 0.7 },
    ],
  };
  for (const t of retime(outro, grid).tracks) tracks.push(shiftTrack(t, off));
  return { score: { bpm: grid, meter: built[0].song.meter, tracks }, notes, free, lines, segs, end: off + barL * (grid / last.bpm), spb, lanes: cfg.lanes };
}

type Judge = "perfect" | "good" | "early" | "late" | "wrong";
type PopKind = Judge | "oops" | "combo" | "miss";
type RushPop = { id: number; lane: number; kind: PopKind };
const POP: Record<PopKind, { text: string; color: string; size: number }> = {
  perfect: { text: "PERFECT!", color: "#ffe066", size: 34 },
  good: { text: "GOOD!", color: "#8dffb4", size: 30 },
  early: { text: "EARLY", color: "#ffbb7a", size: 24 },
  late: { text: "LATE", color: "#ffbb7a", size: 24 },
  oops: { text: "OOPS", color: "#ffa598", size: 24 },
  wrong: { text: "OOPS", color: "#ffa598", size: 24 },
  miss: { text: "MISS", color: "#dfe4f0", size: 24 },
  combo: { text: "+5 COMBO!", color: "#ffe066", size: 44 },
};
const COMBO_EVERY = 10;
const COMBO_BONUS = 5;

/** The score so far, worked out from what happened (in musical order): a GOOD is 1, a PERFECT 2,
 *  every 10 in a row +5; a miss breaks the combo; a stray tap breaks it and costs a point. Notes
 *  not tapped by `beat` + the miss window are misses. */
function tally(notes: RushNote[], judged: Record<number, Judge>, strays: number[], beat: number, missBeats: number) {
  const ev: { b: number; pts: number; stray: boolean }[] = [];
  for (const n of notes) {
    const j = judged[n.id];
    if (j) ev.push({ b: n.beat, pts: j === "perfect" ? 2 : j === "good" ? 1 : 0, stray: false });
    else if (beat > n.beat + missBeats) ev.push({ b: n.beat, pts: 0, stray: false });
  }
  for (const s of strays) ev.push({ b: s, pts: 0, stray: true });
  ev.sort((x, y) => x.b - y.b);
  let score = 0;
  let combo = 0;
  let hits = 0;
  for (const e of ev) {
    if (e.pts) {
      combo++;
      hits++;
      score += e.pts + (combo % COMBO_EVERY === 0 ? COMBO_BONUS : 0);
    } else {
      combo = 0;
      if (e.stray) score = Math.max(0, score - 1);
    }
  }
  return { score, combo, hits };
}

type TapResult = { kind: "hit"; note: RushNote; judge: Judge } | { kind: "wrong"; note: RushNote } | { kind: "stray" } | { kind: "none" };
/** What a tap on `lane` means. `t` is when it was heard (audio clock, see tapTime), `b` the beat
 *  being heard, `timeOf` when a beat was scheduled. The nearest unjudged note of that lane within
 *  the miss window is judged PERFECT / GOOD / EARLY / LATE. The wrong drum for another lane's note
 *  misses that note AND costs a point (so hitting every drum at once can't win). Otherwise it's a
 *  stray (costs a point) if notes are coming and it wasn't on one of the tune's quicker, uncharted
 *  notes — tapping along with the music is never punished. */
function judgeTap(chart: RushChart, cfg: RushCfg, judged: Record<number, Judge>, lane: number, t: number, b: number, timeOf: (beat: number) => number): TapResult {
  const missBeats = cfg.miss / chart.spb;
  let best: RushNote | null = null;
  let dt = 0;
  for (const n of chart.notes) {
    if (n.beat - b > 3) break;
    if (n.lane !== lane || judged[n.id] || b > n.beat + missBeats) continue;
    const d = t - timeOf(n.beat);
    if (Math.abs(d) <= cfg.miss && (!best || Math.abs(d) < Math.abs(dt))) {
      best = n;
      dt = d;
    }
  }
  if (best) {
    const a = Math.abs(dt);
    return { kind: "hit", note: best, judge: a <= cfg.perfect ? "perfect" : a <= cfg.good ? "good" : dt < 0 ? "early" : "late" };
  }
  const near = (beat: number) => Math.abs(t - timeOf(beat)) <= cfg.good;
  const other = chart.notes.find((n) => n.lane !== lane && !judged[n.id] && near(n.beat));
  if (other) return { kind: "wrong", note: other };
  const coming = chart.notes.some((n) => !judged[n.id] && n.beat > b - missBeats && n.beat - b < cfg.look / chart.spb);
  return coming && !chart.free.some(near) ? { kind: "stray" } : { kind: "none" };
}

export function RhythmRush(props: GameProps) {
  return (
    <AfterVoice>
      <Rush {...props} />
    </AfterVoice>
  );
}

function Rush({ band, onEnd }: GameProps) {
  const cfg = RUSH[band];
  const [chart] = useState(() => buildRush(band));
  const player = usePlayer();
  const later = useLater();
  const { bursts, fireAt } = useBursts();
  const pbRef = useRef<Playback | null>(null);
  const judgedRef = useRef<Record<number, Judge>>({});
  const straysRef = useRef<number[]>([]);
  const lastTap = useRef<number[]>([-9, -9, -9]);
  const doneRef = useRef(false);
  const endRef = useRef(onEnd);
  const rings = useRef<(HTMLElement | null)[]>([]);
  const [judged, setJudged] = useState<Record<number, Judge>>({});
  const [strays, setStrays] = useState<number[]>([]);
  const [pops, setPops] = useState<RushPop[]>([]);
  const [taps, setTaps] = useState<number[]>([0, 0, 0]);
  const missBeats = cfg.miss / chart.spb;
  const lookBeats = cfg.look / chart.spb;

  useEffect(() => {
    endRef.current = onEnd;
  });
  useEffect(() => {
    later(() => {
      pbRef.current = player.play(chart.score, {
        onEnd: () => {
          if (doneRef.current) return;
          doneRef.current = true;
          endRef.current(tally(chart.notes, judgedRef.current, straysRef.current, Infinity, missBeats).score);
        },
      });
    }, 300);
    // The round is this one medley, started once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pop = (lane: number, kind: PopKind) => {
    const id = freshKey();
    setPops((ps) => [...ps.slice(-8), { id, lane, kind }]);
    later(() => setPops((ps) => ps.filter((x) => x.id !== id)), 950);
  };

  const tap = (lane: number, e: RPointerEvent<HTMLButtonElement>) => {
    setTaps((ts) => ts.map((n, i) => (i === lane ? n + 1 : n)));
    const pb = pbRef.current;
    if (!pb || doneRef.current) return;
    const b = pb.beat();
    if (b < 0) return;
    // When the child tapped, on the clock of the sound they were hearing.
    const t = tapTime(e);
    if (t - lastTap.current[lane] < 0.11) return; // a finger bounce, not a second tap
    lastTap.current[lane] = t;
    const r = judgeTap(chart, cfg, judgedRef.current, lane, t, b, pb.timeOf);
    if (r.kind === "hit") {
      judgedRef.current = { ...judgedRef.current, [r.note.id]: r.judge };
      setJudged(judgedRef.current);
      pop(lane, r.judge);
      if (r.judge === "perfect" || r.judge === "good") {
        fireAt(rings.current[lane], "star", r.judge === "perfect" ? 9 : 5);
        const { combo } = tally(chart.notes, judgedRef.current, straysRef.current, b, missBeats);
        if (combo > 0 && combo % COMBO_EVERY === 0) {
          playDrum("crash", 0.55);
          pop(-1, "combo");
        }
      }
    } else if (r.kind === "wrong" || r.kind === "stray") {
      if (r.kind === "wrong") {
        judgedRef.current = { ...judgedRef.current, [r.note.id]: "wrong" };
        setJudged(judgedRef.current);
      }
      straysRef.current = [...straysRef.current, b];
      setStrays(straysRef.current);
      pop(lane, "oops");
    }
  };

  // Everything below follows the beat being heard (the player's audio-clock position).
  const b = player.beat ?? -1;
  const tl = tally(chart.notes, judged, strays, b, missBeats);
  const N = chart.lanes;
  const laneW = N === 1 ? 300 : N === 2 ? 250 : 220;
  const gem = N === 1 ? 92 : N === 2 ? 84 : 76;
  const drumSize = N === 1 ? 240 : N === 2 ? 210 : 190;
  const width = laneW * N + 48;
  const LINE = 84; // the hit line, % down the highway
  const yOf = (beat: number) => LINE * (1 - (beat - b) / lookBeats);
  const total = chart.end * chart.spb;
  const left = Math.max(0, total - Math.max(0, b) * chart.spb);
  let segIdx = 0;
  for (let i = 0; i < chart.segs.length; i++) if (chart.segs[i].start <= b) segIdx = i;
  const seg = chart.segs[segIdx];
  let li = -1;
  for (let i = 0; i < chart.lines.length && chart.lines[i].b <= b; i++) li = i;
  const pulse = li >= 0 && li + 1 < chart.lines.length ? Math.max(0, 1 - (b - chart.lines[li].b) / (chart.lines[li + 1].b - chart.lines[li].b)) : 0;
  const first = chart.notes[0]?.beat ?? 0;
  const count = b >= 0 && first - b > 0 && first - b <= 4 ? Math.ceil(first - b - 1e-6) : null;
  const banner = b >= 0 && b < seg.first - 0.05 ? (segIdx === 0 ? "Get ready!" : "Next song!") : null;
  const hit = (n: RushNote) => judged[n.id] === "perfect" || judged[n.id] === "good";
  const visible = chart.notes.filter((n) => n.beat - b < lookBeats + 0.25 && n.beat - b > -missBeats - 1.4 && !hit(n));
  const missed = chart.notes.filter((n) => !judged[n.id] && b > n.beat + missBeats && b < n.beat + missBeats + 1.6);
  const hot = Array.from({ length: N }, (_, i) => chart.notes.some((n) => n.lane === i && !judged[n.id] && Math.abs(n.beat - b) * chart.spb <= cfg.good));
  // Little ones get a pointing hand on the drum as their first notes come in.
  const soon = Array.from({ length: N }, (_, i) => band === "little" && tl.hits < 2 && chart.notes.some((n) => n.lane === i && !judged[n.id] && n.beat - b < 1.2 && n.beat - b > -missBeats));
  const fire = tl.combo >= COMBO_EVERY;

  return (
    <div className="flex h-full w-full max-w-[1000px] flex-col items-center gap-3">
      <ClockBar left={left} total={total} />
      <div className="flex w-full flex-wrap items-center justify-center gap-3">
        <ScorePill score={tl.score} />
        <ComboMeter combo={tl.combo} />
        <span className="flex max-w-[460px] items-center gap-2 rounded-full bg-white/90 py-1 pl-2 pr-4 font-display text-lg font-extrabold text-[var(--l-ink)]">
          <InstrumentPic id={seg.lead} size={36} />
          <span className="truncate">{seg.title}</span>
        </span>
      </div>
      <SoundOffNote />
      <div className="relative min-h-[230px] w-full flex-1" style={{ maxWidth: width }}>
        {/* The highway, tipped back like a real rhythm game. */}
        <div className="absolute inset-0 overflow-hidden rounded-[30px] border-[4px] border-white/35 shadow-[0_10px_0_rgba(0,40,80,0.18)]" style={{ background: "linear-gradient(180deg,#110d30 0%,#22165a 55%,#3a1b66 100%)", transform: "perspective(900px) rotateX(22deg)", transformOrigin: "50% 100%" }}>
          {chart.lines
            .filter((l) => l.b > b - 0.4 && l.b - b < lookBeats + 0.2)
            .map((l) => (
              <span key={l.b} className="absolute inset-x-6 -translate-y-1/2 rounded-full" style={{ top: `${yOf(l.b)}%`, height: l.bar ? 4 : 2, background: l.bar ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.12)" }} />
            ))}
          <span className="absolute inset-x-3 h-[9px] -translate-y-1/2 rounded-full" style={{ top: `${LINE}%`, background: fire ? "#ffe066" : "#ffffff", opacity: 0.55 + 0.45 * pulse, boxShadow: `0 0 ${12 + 22 * pulse}px ${fire ? "#ffc83d" : "#ff6fb5"}` }} />
          <div className="absolute inset-y-0 left-6 right-6 flex">
            {Array.from({ length: N }, (_, i) => (
              <div key={i} className="relative h-full flex-1 border-x border-white/10">
                <span className="absolute inset-0 overflow-hidden" aria-hidden>
                  {taps[i] > 0 && <span key={taps[i]} className="m-ripple absolute inset-0" style={{ background: `linear-gradient(0deg, ${LANE_COLOR[i]}99, transparent 75%)` }} />}
                </span>
                <span
                  ref={(el) => {
                    rings.current[i] = el;
                  }}
                  className="absolute left-1/2 rounded-full transition-[transform,box-shadow,background-color] duration-75"
                  style={{ top: `${LINE}%`, width: gem + 12, height: gem + 12, border: `5px solid ${LANE_COLOR[i]}`, transform: `translate(-50%, -50%) scale(${hot[i] ? 1.14 : 1})`, background: hot[i] ? `${LANE_COLOR[i]}40` : "transparent", boxShadow: hot[i] ? `0 0 28px ${LANE_COLOR[i]}, inset 0 0 18px ${LANE_COLOR[i]}` : `0 0 10px ${LANE_COLOR[i]}88` }}
                />
                {visible
                  .filter((n) => n.lane === i)
                  .map((n) => {
                    const gone = !!judged[n.id] || b > n.beat + missBeats;
                    return (
                      <span
                        key={n.id}
                        className="absolute left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[4px] border-white"
                        style={{
                          top: `${yOf(n.beat)}%`,
                          width: gem,
                          height: gem,
                          opacity: gone ? 0.4 : 1,
                          background: gone ? "radial-gradient(circle at 35% 30%, #d5dae6, #7d8597)" : `radial-gradient(circle at 35% 30%, #ffffff 0%, ${LANE_COLOR[i]} 42%, ${LANE_EDGE[i]} 100%)`,
                          boxShadow: gone ? "none" : `0 0 20px ${LANE_COLOR[i]}, inset 0 -6px 0 rgba(0,0,0,0.18)`,
                        }}
                      >
                        <NoteMark size={gem * 0.52} />
                      </span>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
        {/* Feedback stays flat (easy to read), over the hit line. */}
        <div className="pointer-events-none absolute inset-x-6 bottom-[16%] flex">
          {Array.from({ length: N }, (_, i) => (
            <div key={i} className="relative flex-1">
              {pops
                .filter((p) => p.lane === i)
                .map((p) => (
                  <PopText key={p.id} kind={p.kind} />
                ))}
              {missed
                .filter((n) => n.lane === i)
                .map((n) => (
                  <PopText key={`m${n.id}`} kind="miss" />
                ))}
            </div>
          ))}
        </div>
        {pops
          .filter((p) => p.lane === -1)
          .map((p) => (
            <span key={p.id} className="l-float-num pointer-events-none absolute left-1/2 top-[30%] whitespace-nowrap font-display font-black" style={{ fontSize: POP.combo.size, color: POP.combo.color, textShadow: "0 3px 0 #5a2a00, 0 0 18px rgba(255,200,61,0.8)" }}>
              {POP.combo.text}
            </span>
          ))}
        {banner && (
          <span key={banner + segIdx} className="l-pop-in pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/95 px-5 py-1 font-display text-xl font-extrabold text-[var(--l-ink)] shadow-[0_4px_0_rgba(0,40,80,0.2)]">
            {banner}
          </span>
        )}
        {count !== null && (
          <span key={count} className="m-count pointer-events-none absolute inset-0 flex items-center justify-center font-display text-[120px] font-black text-white drop-shadow-[0_5px_0_#d9408f]" style={{ "--beat": `${chart.spb}s` } as CSSProperties}>
            {count}
          </span>
        )}
      </div>
      <div className="relative flex shrink-0 items-end" style={{ width }}>
        {Array.from({ length: N }, (_, i) => (
          <div key={i} className="relative flex flex-1 justify-center px-6">
            <DrumPad drum={LANE_DRUMS[N][i]} color={LANE_COLOR[i]} size={drumSize} onHit={(e) => tap(i, e)} label={N === 1 ? "Tap the drum" : `Drum ${i + 1}`} />
            {soon[i] && <Glyph e="👆" size={64} className="l-bob pointer-events-none absolute -top-8 right-[18%]" />}
          </div>
        ))}
      </div>
      <BurstLayer bursts={bursts} />
    </div>
  );
}

function PopText({ kind }: { kind: PopKind }) {
  const p = POP[kind];
  return (
    <span className="l-float-num absolute bottom-0 left-1/2 whitespace-nowrap font-display font-black" style={{ fontSize: p.size, color: p.color, textShadow: "0 3px 0 rgba(20,10,50,0.85), 0 0 14px rgba(0,0,0,0.35)" }}>
      {p.text}
    </span>
  );
}

function ComboMeter({ combo }: { combo: number }) {
  const fire = combo >= COMBO_EVERY;
  return (
    <span className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-1.5 font-display text-xl font-extrabold text-[var(--l-ink)]">
      {fire ? <Glyph e="🔥" size={30} className="l-flame" /> : <Glyph e="⚡" size={26} />}
      <span className="tabular-nums">Combo {combo}</span>
      <span className="relative h-3 w-24 overflow-hidden rounded-full bg-[var(--l-line)]" aria-hidden>
        <span className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-150" style={{ width: `${((combo % COMBO_EVERY) / COMBO_EVERY) * 100}%`, background: fire ? "linear-gradient(90deg,#ffc83d,#ff6a3d)" : "#ff6fb5" }} />
      </span>
    </span>
  );
}

/** A white eighth note (the mark on each falling gem). */
function NoteMark({ size, color = "#ffffff" }: { size: number; color?: string }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden className="drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]">
      <ellipse cx="15" cy="30" rx="8.6" ry="6.4" transform="rotate(-22 15 30)" fill={color} />
      <rect x="20.6" y="5" width="3.6" height="25" rx="1.6" fill={color} />
      <path d="M22.5 5 C27 8.5 34 11 31.5 22.5 C30.5 16.5 27 14 22.5 13.5 Z" fill={color} />
    </svg>
  );
}

// ── Simon Sea ────────────────────────────────────────────────────────────────────────────────
// Four shell-bells on the sand — do, mi, so, la (C E G A: any order sounds sweet) — low to high,
// big to small, in their note colors. They sing a tune; sing it back; it grows by one each round.
// A wrong note ends the game: the score is the longest tune remembered.

const SIMON = [60, 64, 67, 69];
const SIMON_W = [232, 214, 198, 184];
const SIMON_INST: InstId = "steeldrum";
const simonScore = (seq: number[]) => melody(seq.map((k) => SIMON[k]), 1, SIMON_INST, Math.min(150, 92 + seq.length * 5));
const randomShells = (n: number) => Array.from({ length: n }, () => rand(4));

/** A scallop shell (hinge at the bottom, seven scallops round the rim), rounded so the server and
 *  the browser draw it the same. */
const SHELL = (() => {
  const hx = 100;
  const hy = 170;
  const R = 112;
  const n = 7;
  const a0 = 210;
  const a1 = 330;
  const f = (v: number) => Math.round(v * 10) / 10;
  const pt = (deg: number, r: number): [number, number] => [f(hx + r * Math.cos((deg * Math.PI) / 180)), f(hy + r * Math.sin((deg * Math.PI) / 180))];
  const rim = Array.from({ length: n + 1 }, (_, i) => pt(a0 + ((a1 - a0) * i) / n, R));
  let d = `M${hx} ${hy} L${rim[0][0]} ${rim[0][1]}`;
  for (let i = 0; i < n; i++) {
    const c = pt(a0 + ((a1 - a0) * (i + 0.5)) / n, R * 1.13);
    d += ` Q${c[0]} ${c[1]} ${rim[i + 1][0]} ${rim[i + 1][1]}`;
  }
  const ribs = rim
    .slice(1, -1)
    .map(([x, y]) => `M${hx} ${hy - 10} L${f(hx + (x - hx) * 0.9)} ${f(hy - 10 + (y - hy + 10) * 0.9)}`)
    .join(" ");
  return { d: `${d} Z`, ribs };
})();

function ShellBell({ color, width }: { color: string; width: number }) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 40 200 156" style={{ width, height: width * 0.78 }} className="overflow-visible" aria-hidden>
      <defs>
        <radialGradient id={`${uid}g`} cx="0.5" cy="0.98" r="0.95">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="0.38" stopColor={color} />
          <stop offset="1" stopColor={color} />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="190" rx="84" ry="7" fill="rgba(120,80,20,0.22)" />
      <rect x="72" y="160" width="56" height="26" rx="9" fill={color} stroke={INK} strokeWidth="5" />
      <path d={SHELL.d} fill={`url(#${uid}g)`} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d={SHELL.ribs} stroke="#ffffff" strokeOpacity="0.6" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <ellipse cx="66" cy="100" rx="17" ry="8" fill="#ffffff" opacity="0.6" transform="rotate(-32 66 100)" />
    </svg>
  );
}

export function SimonSea(props: GameProps) {
  return (
    <AfterVoice>
      <Simon {...props} />
    </AfterVoice>
  );
}

function Simon({ band, onEnd }: GameProps) {
  const player = usePlayer();
  const later = useLater();
  const [seq, setSeq] = useState(() => randomShells(band === "little" ? 1 : band === "middle" ? 2 : 3));
  const [phase, setPhase] = useState<"show" | "input" | "won" | "fail">("show");
  const [pos, setPos] = useState(0);
  const [best, setBest] = useState(0);
  const [tapped, setTapped] = useState<{ k: number; n: number } | null>(null);

  const show = (s: number[]) => {
    setPhase("show");
    setPos(0);
    player.play(simonScore(s), { onEnd: () => setPhase("input") });
  };
  useEffect(() => {
    later(() => show(seq), 450);
    // The first tune plays once on arrival; each later one is started by the round before it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = (k: number) => {
    if (phase !== "input") return;
    playNote(SIMON_INST, SIMON[k], 0.7, 0.9);
    const n = freshKey();
    setTapped({ k, n });
    later(() => setTapped((x) => (x?.n === n ? null : x)), 280);
    if (seq[pos] !== k) {
      setPhase("fail");
      buzz([0, 40, 60, 40]);
      later(() => sfx("soft-fail"), 150);
      later(() => onEnd(best), 1800);
      return;
    }
    if (pos + 1 < seq.length) {
      setPos(pos + 1);
      return;
    }
    // The whole tune! It grows by one.
    setBest(seq.length);
    setPos(pos + 1);
    setPhase("won");
    later(() => sfx("star"), 300);
    const next = [...seq, rand(4)];
    later(() => {
      setSeq(next);
      show(next);
    }, 1200);
  };

  // While the tune plays, the shell that's singing lights up (in time with the sound).
  const b = phase === "show" ? player.beat : null;
  const at = b !== null && b >= 0 ? Math.floor(b) : -1;
  const singing = at >= 0 && at < seq.length && b !== null && b - at < 0.72 ? seq[at] : null;
  const expected = phase === "fail" ? seq[pos] : null;
  const status = phase === "show" ? "👂 Listen…" : phase === "input" ? "👆 Your turn!" : phase === "won" ? "✨ You got it!" : "🐚 It was this one!";
  return (
    <div className="flex w-full max-w-[1040px] flex-col items-center gap-5">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <ScorePill score={best} />
        <span key={status} className="l-pop-in rounded-full bg-white px-6 py-2 font-display text-2xl font-extrabold text-[var(--l-ink)] shadow-[0_5px_0_var(--l-line)]">
          <WithGlyphs text={status} size={36} />
        </span>
      </div>
      <SoundOffNote />
      <div className="flex items-center gap-2" aria-label={`${seq.length} notes`}>
        {seq.map((k, i) => {
          const on = phase === "show" ? i === at && singing !== null : i < pos;
          return <span key={i} className="block h-5 w-5 rounded-full border-[3px] border-white transition-colors duration-100" style={{ background: on ? noteColor(SIMON[k]) : "rgba(255,255,255,0.3)" }} />;
        })}
      </div>
      <div className="relative flex w-full items-end justify-center gap-5 rounded-[36px] px-6 pb-8 pt-10 shadow-[0_10px_0_rgba(140,95,30,0.35)]" style={{ background: "linear-gradient(180deg,#fff2cc 0%,#ffe1a1 60%,#f5cf7f 100%)" }}>
        {SIMON.map((m, k) => {
          const color = noteColor(m);
          const on = singing === k || tapped?.k === k || (expected === k && phase === "fail");
          return (
            <button
              key={k}
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                tap(k);
              }}
              aria-label={`Shell ${k + 1}`}
              className={cn("relative touch-none select-none transition-[transform,filter] duration-100", expected === k && "l-pulse", phase === "fail" && tapped?.k === k && expected !== k && "l-shake")}
              style={{ filter: on ? `brightness(1.15) drop-shadow(0 0 26px ${color})` : phase === "input" ? "none" : "saturate(0.85)", transform: on ? "translateY(-8px) scale(1.07)" : "none" }}
            >
              <ShellBell color={color} width={SIMON_W[k]} />
              {on && <span key={singing === k ? `s${at}` : `t${tapped?.n ?? 0}`} className="m-ripple pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[90%] rounded-[50%] border-[6px] border-white/85" aria-hidden />}
            </button>
          );
        })}
      </div>
      <p className="font-display text-2xl font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.25)]">Round {seq.length}</p>
    </div>
  );
}

// ── Note Ninja ───────────────────────────────────────────────────────────────────────────────
// Little ones (Bell Match): a bell rings — tap the bell that sang (three bells far apart, then
// four). Readers: a note on the treble staff (C4–G5, naturals) — tap its letter. Big kids: treble
// AND bass clef, and later in the round sharps and flats (a row of sharps above the letters, flats
// below — sharp is up, flat is down). A right answer plays the note: you hear what you read.

export function NoteNinja(props: GameProps) {
  return <AfterVoice>{props.band === "little" ? <BellMatch {...props} /> : <StaffNinja {...props} />}</AfterVoice>;
}

/** Bells far apart in pitch (and color): low, middle, high — then four. */
const BELLS_3 = [60, 67, 76];
const BELLS_4 = [55, 62, 69, 76];
const BELLS_MORE_AT = 6;
const nextBell = (set: number[], prev: number) => pickOne(coin(0.2) ? set : set.filter((m) => m !== prev));

function BellMatch({ band, onEnd }: GameProps) {
  const quick = useQuick(band);
  const { bursts, fireAt } = useBursts();
  const [right, setRight] = useState(0);
  const [target, setTarget] = useState(() => pickOne(BELLS_3));
  const [ringing, setRinging] = useState(true);
  // Answers open only once the bell has been heard, and close again the moment one is given
  // (until the next bell rings) — so a second tap can't score twice.
  const [open, setOpen] = useState(false);
  const [lit, setLit] = useState<number[]>([]);
  const [bad, setBad] = useState<number[]>([]);
  const [newBell, setNewBell] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  const left = useClock(ROUND, () => onEnd(quick.score));
  const bells = right >= BELLS_MORE_AT ? BELLS_4 : BELLS_3;
  const ring = (m: number, fresh: boolean) => {
    setRinging(true);
    if (fresh) setOpen(false);
    playNote("bells", m, 1.4, 0.9);
    quick.later(() => {
      setRinging(false);
      if (fresh) {
        setOpen(true);
        quick.ask();
      }
    }, 650);
  };
  useEffect(() => {
    quick.later(() => ring(target, true), 350);
    // The first bell rings once on arrival; later ones ring after each answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const pick = (m: number) => {
    if (!open || ringing || quick.locked) return;
    setOpen(false);
    if (m === target) {
      quick.right();
      sfx("correct", Math.min(8, quick.streak));
      fireAt(card.current, "star", 8);
      setLit([m]);
      const n = right + 1;
      setRight(n);
      const set = n >= BELLS_MORE_AT ? BELLS_4 : BELLS_3;
      if (n === BELLS_MORE_AT) setNewBell(true);
      const t = nextBell(set, target);
      quick.later(() => {
        setLit([]);
        setNewBell(false);
        setTarget(t);
        ring(t, true);
      }, n === BELLS_MORE_AT ? 1500 : 800);
    } else {
      quick.wrong();
      // Show (and ring) the one that sang, then a new bell.
      setBad([m]);
      quick.later(() => {
        setLit([target]);
        playNote("bells", target, 1.2, 0.9);
      }, 300);
      const t = nextBell(bells, target);
      quick.later(() => {
        setBad([]);
        setLit([]);
        setTarget(t);
        ring(t, true);
      }, 1500);
    }
  };
  return (
    <Frame
      left={left}
      score={quick.score}
      locked={quick.locked || ringing || !open}
      top={
        <>
          <span className="rounded-full bg-[#ff6fb5] px-5 py-1.5 font-display text-2xl font-extrabold text-white shadow-[0_4px_0_#d9408f]">
            <WithGlyphs text="👂 Which bell sang?" size={34} />
          </span>
          <Streak n={quick.streak} />
        </>
      }
    >
      <div className="flex items-center gap-5">
        <PlayButton playing={ringing} onClick={() => ring(target, false)} size={92} label="Again" />
        <div ref={card} className="relative w-[min(78vw,720px)] rounded-[30px] bg-white/95 px-6 pb-4 pt-6 shadow-[0_8px_0_rgba(0,40,80,0.14)]">
          <Bells pitches={bells} onPress={pick} labels="none" lit={lit} wrong={bad} height={280} />
          {newBell && (
            <span className="l-pop-in absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--l-gold)] px-5 py-1.5 font-display text-xl font-extrabold text-[#5a3b00] shadow-[0_4px_0_var(--l-gold-edge)]">
              <WithGlyphs text="🔔 A new bell!" size={30} />
            </span>
          )}
        </div>
      </div>
      <BurstLayer bursts={bursts} />
    </Frame>
  );
}

type NinjaQ = { id: number; clef: "treble" | "bass"; step: number; acc: -1 | 0 | 1 };
/** Staff steps (C4 = 28): the notes on the five lines and spaces first, then the ledger notes. */
const RANGE = { treble: { easy: [30, 38], all: [28, 39] }, bass: { easy: [18, 26], all: [16, 28] } } as const;
const WIDE_AT = 6;
const ACC_AT = 8;
const SHARPABLE = [3, 0, 4, 1, 5]; // F C G D A
const FLATTABLE = [6, 2, 5, 1, 4]; // B E A D G
const letterOf = (step: number) => ((step % 7) + 7) % 7;
function makeNinjaQ(band: Band, right: number, prev?: NinjaQ): NinjaQ {
  const clef = band === "big" && coin(0.5) ? "bass" : "treble";
  const [lo, hi] = right >= WIDE_AT ? RANGE[clef].all : RANGE[clef].easy;
  let step = lo + rand(hi - lo + 1);
  for (let k = 0; k < 8 && prev && prev.clef === clef && prev.step === step; k++) step = lo + rand(hi - lo + 1);
  let acc: -1 | 0 | 1 = 0;
  if (band === "big" && right >= ACC_AT && coin(0.4)) {
    const s = SHARPABLE.includes(letterOf(step));
    const fl = FLATTABLE.includes(letterOf(step));
    acc = s && fl ? (coin(0.5) ? 1 : -1) : s ? 1 : fl ? -1 : 0;
  }
  return { id: freshKey(), clef, step, acc };
}
const accSign = (acc: number) => (acc === 1 ? "♯" : acc === -1 ? "♭" : "");

function StaffNinja({ band, onEnd }: GameProps) {
  const quick = useQuick(band);
  const { bursts, fireAt } = useBursts();
  const [right, setRight] = useState(0);
  const [q, setQ] = useState(() => makeNinjaQ(band, 0));
  const [sliced, setSliced] = useState(false);
  const [reveal, setReveal] = useState<{ wrong: string } | null>(null);
  const [news, setNews] = useState<string | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const left = useClock(ROUND, () => onEnd(quick.score));
  useEffect(() => {
    quick.ask();
    // The speed clock starts with the first note.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const accOn = band === "big" && right >= ACC_AT;
  const answerId = `${letterOf(q.step)}:${q.acc}`;
  const next = (n: number) => {
    setSliced(false);
    setReveal(null);
    setQ(makeNinjaQ(band, n, q));
    quick.ask();
  };
  const answer = (letter: number, acc: number) => {
    if (quick.locked || sliced || reveal) return;
    if (`${letter}:${acc}` === answerId) {
      quick.right();
      playNote("piano", stepToMidi(q.step) + q.acc, 0.9, 0.8);
      sfx("whoosh");
      fireAt(card.current, "star", 8);
      setSliced(true);
      const n = right + 1;
      setRight(n);
      const msg = n === WIDE_AT ? "Higher and lower notes!" : band === "big" && n === ACC_AT ? "Sharps ♯ and flats ♭!" : null;
      if (msg) {
        setNews(msg);
        quick.later(() => setNews(null), 1800);
      }
      quick.later(() => next(n), 420);
    } else {
      quick.wrong();
      setReveal({ wrong: `${letter}:${acc}` });
      quick.later(() => next(right), LOCK_MS + 350);
    }
  };
  // Sharps above the letters, flats below (sharp is up, flat is down).
  const rows: (-1 | 0 | 1)[] = accOn ? [1, 0, -1] : [0];
  return (
    <Frame
      left={left}
      score={quick.score}
      locked={quick.locked}
      top={
        <>
          <span className="rounded-full bg-[var(--l-violet)] px-5 py-1.5 font-display text-2xl font-extrabold text-white shadow-[0_4px_0_var(--l-violet-edge)]">
            <WithGlyphs text="🎼 Name the note!" size={34} />
          </span>
          <Streak n={quick.streak} />
        </>
      }
    >
      <div ref={card} key={q.id} className="l-pop-in relative flex items-center justify-center rounded-[30px] bg-white px-8 py-3 shadow-[0_8px_0_var(--l-line)]">
        <Staff notes={[{ p: stepToMidi(q.step), d: 4, acc: q.acc === 1 ? "#" : q.acc === -1 ? "b" : undefined }]} clef={q.clef} height={band === "big" ? 220 : 240} minWidth={210} />
        {sliced && (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
            <path d="M8 88 L92 12" pathLength={1} className="l-draw" stroke="#ff6fb5" strokeWidth={5} strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke" />
          </svg>
        )}
        {reveal && (
          <span className="l-pop-in absolute -right-4 -top-4 rounded-full bg-[var(--l-green)] px-4 py-1 font-display text-2xl font-extrabold text-white shadow-[0_4px_0_var(--l-green-edge)]">
            {LETTERS[letterOf(q.step)]}
            {accSign(q.acc)}
          </span>
        )}
        {news && (
          <span className="l-pop-in absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--l-gold)] px-5 py-1.5 font-display text-xl font-extrabold text-[#5a3b00] shadow-[0_4px_0_var(--l-gold-edge)]">
            {news}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-3">
        {rows.map((acc) => (
          <div key={acc} className={cn("flex justify-center gap-3", acc !== 0 && "l-rise")}>
            {LETTERS.map((L, letter) => {
              const id = `${letter}:${acc}`;
              const isAnswer = !!reveal && id === answerId;
              const isWrong = reveal?.wrong === id;
              return (
                <Chunk
                  key={id}
                  tone={isAnswer ? "green" : acc === 0 ? "white" : acc === 1 ? "violet" : "teal"}
                  onClick={() => answer(letter, acc)}
                  aria-label={`${L}${acc === 1 ? " sharp" : acc === -1 ? " flat" : ""}`}
                  className={cn("flex items-center justify-center font-display font-extrabold", acc === 0 ? "h-[92px] w-[112px] text-[52px] text-[var(--l-ink)]" : "h-[66px] w-[112px] text-[34px]", isWrong && "l-shake", isAnswer && "l-boing")}
                >
                  {L}
                  {accSign(acc)}
                </Chunk>
              );
            })}
          </div>
        ))}
      </div>
      <BurstLayer bursts={bursts} />
    </Frame>
  );
}

// ── Pitch Pirates ────────────────────────────────────────────────────────────────────────────
// Two treasure chests, two notes: each chest pops open as its note sounds. Was the second note
// HIGHER or LOWER (big kids: or the SAME)? It starts an octave apart and the gap shrinks as the
// score grows — down to a major third for little ones, a whole step for 1st–2nd, a half step for
// big kids. A wrong answer costs a point, and shows which way it went.

type Dir = "up" | "down" | "same";
type PitchQ = { id: number; a: number; b: number; dir: Dir; inst: InstId };
const PITCH_GAPS: Record<Band, number[]> = {
  little: [12, 12, 10, 9, 8, 7, 7, 6, 5, 5, 4],
  middle: [12, 10, 9, 8, 7, 6, 5, 4, 4, 3, 3, 2],
  big: [12, 9, 7, 6, 5, 4, 3, 3, 2, 2, 1],
};
function makePitchQ(band: Band, score: number): PitchQ {
  const gaps = PITCH_GAPS[band];
  const gap = gaps[Math.min(Math.max(0, score), gaps.length - 1)];
  const a = 62 + rand(11);
  const dir: Dir = band === "big" && coin(0.2) ? "same" : coin(0.5) ? "up" : "down";
  const b = dir === "same" ? a : dir === "up" ? a + gap : a - gap;
  const inst: InstId = band === "little" ? "musicbox" : pickOne(["musicbox", "marimba", "piano", "flute"] as const);
  return { id: freshKey(), a, b, dir, inst };
}
/** The two notes: one beat, a breath, then the second (held a little longer). */
const SECOND_AT = 1.45;
const pitchScore = (q: PitchQ) => melody([q.a, null, q.b], [1, SECOND_AT - 1, 1.5], q.inst, 100);
const DIR_LOOK: Record<Dir, { label: string; tone: Tone }> = { up: { label: "Higher", tone: "green" }, same: { label: "Same", tone: "violet" }, down: { label: "Lower", tone: "blue" } };

export function PitchPirates(props: GameProps) {
  return (
    <AfterVoice>
      <Pirates {...props} />
    </AfterVoice>
  );
}

function Pirates({ band, onEnd }: GameProps) {
  const quick = useQuick(band);
  const player = usePlayer();
  const { bursts, fireAt } = useBursts();
  const [q, setQ] = useState(() => makePitchQ(band, 0));
  const [heard, setHeard] = useState(false);
  const [result, setResult] = useState<{ pick: Dir; ok: boolean } | null>(null);
  const chest2 = useRef<HTMLDivElement>(null);
  const askedFor = useRef(0);
  const left = useClock(ROUND, () => onEnd(quick.score));
  const play = (x: PitchQ) => {
    player.play(pitchScore(x), {
      onEnd: () => {
        setHeard(true);
        if (askedFor.current !== x.id) {
          askedFor.current = x.id;
          quick.ask();
        }
      },
    });
  };
  useEffect(() => {
    quick.later(() => play(q), 350);
    // The first pair plays once on arrival; each later one follows an answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const nextQ = (score: number, wait: number) => {
    quick.later(() => {
      const nq = makePitchQ(band, score);
      setQ(nq);
      setHeard(false);
      setResult(null);
      play(nq);
    }, wait);
  };
  const choose = (d: Dir) => {
    if (!heard || result || quick.locked) return;
    const ok = d === q.dir;
    setResult({ pick: d, ok });
    if (ok) {
      const s = quick.right();
      sfx("correct", Math.min(8, quick.streak));
      fireAt(chest2.current, "star", 9);
      nextQ(s, 900);
    } else nextQ(quick.wrong(), 1300);
  };
  // The chests open as their notes are heard (the player's audio-clock beat).
  const b = player.playing ? player.beat : null;
  const open1 = heard || (b !== null && b >= -0.02);
  const open2 = heard || (b !== null && b >= SECOND_AT - 0.02);
  const sing1 = b !== null && b >= -0.02 && b < 1;
  const sing2 = b !== null && b >= SECOND_AT - 0.02 && b < SECOND_AT + 1.5;
  const dirs: Dir[] = band === "big" ? ["up", "same", "down"] : ["up", "down"];
  return (
    <Frame
      left={left}
      score={quick.score}
      locked={quick.locked}
      top={
        <>
          <span className="rounded-full bg-[var(--l-orange)] px-5 py-1.5 font-display text-2xl font-extrabold text-white shadow-[0_4px_0_var(--l-orange-edge)]">
            <WithGlyphs text={band === "big" ? "🏴‍☠️ Higher, lower or the same?" : "🏴‍☠️ Higher or lower?"} size={34} />
          </span>
          <Streak n={quick.streak} />
        </>
      }
    >
      <div className="flex items-center gap-5">
        <div className="relative flex items-end gap-6 rounded-[34px] px-8 pb-5 pt-8 shadow-[0_10px_0_rgba(140,95,30,0.35)]" style={{ background: "linear-gradient(180deg,#fff2cc 0%,#ffe1a1 60%,#f5cf7f 100%)" }}>
          <ChestSpot n={1} open={open1} singing={sing1} noteKey={`${q.id}a`} />
          <div className="flex h-[150px] w-[110px] items-center justify-center">
            {result && (
              <span key={q.id} className="l-pop-in flex h-[96px] w-[96px] items-center justify-center rounded-full bg-white shadow-[0_0_0_6px_var(--l-green),0_6px_0_rgba(0,40,80,0.2)]">
                <DirIcon d={q.dir} size={64} />
              </span>
            )}
          </div>
          <div ref={chest2}>
            <ChestSpot n={2} open={open2} singing={sing2} noteKey={`${q.id}b`} />
          </div>
        </div>
        <MiniPlay playing={player.playing} onClick={() => (player.playing ? player.stop() : play(q))} size={band === "little" ? 72 : 64} />
      </div>
      <div className={cn("flex gap-5 transition-opacity", !heard && "pointer-events-none opacity-60")}>
        {dirs.map((d) => {
          const look = DIR_LOOK[d];
          const showRight = result && !result.ok && d === q.dir;
          return (
            <Chunk
              key={d}
              tone={showRight ? "green" : look.tone}
              onClick={() => choose(d)}
              aria-label={look.label}
              className={cn("flex h-[112px] min-w-[220px] items-center justify-center gap-3 px-6 font-display text-3xl font-extrabold", result?.pick === d && !result.ok && "l-shake", showRight && "l-boing")}
            >
              <DirIcon d={d} size={60} /> {look.label}
            </Chunk>
          );
        })}
      </div>
      <BurstLayer bursts={bursts} />
    </Frame>
  );
}

function DirIcon({ d, size }: { d: Dir; size: number }) {
  if (d === "up") return <Glyph e="⬆️" size={size} />;
  if (d === "down") return <Glyph e="⬇️" size={size} />;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      <rect x="9" y="17" width="46" height="11" rx="5.5" fill="#ffffff" stroke={INK} strokeWidth="4" />
      <rect x="9" y="36" width="46" height="11" rx="5.5" fill="#ffffff" stroke={INK} strokeWidth="4" />
    </svg>
  );
}

function ChestSpot({ n, open, singing, noteKey }: { n: number; open: boolean; singing: boolean; noteKey: string }) {
  return (
    <div className="relative flex flex-col items-center gap-1">
      <div className={cn("relative", singing && "l-boing")}>
        <TreasureChest open={open} glow={singing} />
        {singing && <Glyph key={noteKey} e="🎵" size={56} className="l-float-num pointer-events-none absolute left-1/2 top-0" />}
      </div>
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white font-display text-2xl font-extrabold text-[var(--l-ink)] shadow-[0_3px_0_rgba(0,40,80,0.2)]">{n}</span>
    </div>
  );
}

/** The treasure chest (Harbor's chest, drawn here with its own gradient ids so two can sit side by
 *  side); its lid swings open, and it glows while its note sings. */
function TreasureChest({ open, glow, size = 176 }: { open: boolean; glow: boolean; size?: number }) {
  const uid = useId().replace(/:/g, "");
  const c = { body: "#f2b52a", dark: "#c98a0c", band: "#fff1b3" };
  return (
    <svg viewBox="0 0 200 175" width={size} height={size * 0.875} className="overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={`${uid}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.body} />
          <stop offset="1" stopColor={c.dark} />
        </linearGradient>
        <linearGradient id={`${uid}l`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="0.4" stopColor={c.body} />
          <stop offset="1" stopColor={c.dark} />
        </linearGradient>
        <radialGradient id={`${uid}g`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff7b0" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffd23a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="165" rx="80" ry="8" fill="rgba(0,40,80,0.18)" />
      {open && <ellipse cx="100" cy="74" rx={glow ? 100 : 82} ry={glow ? 58 : 44} fill={`url(#${uid}g)`} style={{ transition: "rx 120ms, ry 120ms" }} />}
      <rect x="26" y="78" width="148" height="80" rx="14" fill={`url(#${uid}b)`} stroke={INK} strokeWidth="4" />
      <path d="M30 104 H170 M30 128 H170" stroke={c.dark} strokeWidth="3" opacity="0.55" />
      <rect x="48" y="80" width="18" height="76" fill={c.band} stroke={INK} strokeWidth="3" />
      <rect x="134" y="80" width="18" height="76" fill={c.band} stroke={INK} strokeWidth="3" />
      <g style={{ transformOrigin: "30px 78px", transform: open ? "translate(-8px,-28px) rotate(-22deg)" : "none", transition: "transform 380ms cubic-bezier(0.34,1.56,0.64,1)" }}>
        <path d="M26 82 L26 58 Q26 24 100 24 Q174 24 174 58 L174 82 Z" fill={`url(#${uid}l)`} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <path d="M48 82 L48 30 Q57 27 66 26 L66 82 Z" fill={c.band} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <path d="M134 82 L134 26 Q143 27 152 30 L152 82 Z" fill={c.band} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <path d="M40 46 Q100 32 160 46" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="6" fill="none" strokeLinecap="round" />
      </g>
      <rect x="84" y="70" width="32" height="38" rx="8" fill={c.band} stroke={INK} strokeWidth="3.5" />
      <circle cx="100" cy="85" r="5" fill={INK} />
      <rect x="97.5" y="87" width="5" height="10" rx="2.5" fill={INK} />
      <ellipse cx="54" cy="94" rx="10" ry="4" fill="#ffffff" opacity="0.35" transform="rotate(-12 54 94)" />
    </svg>
  );
}
