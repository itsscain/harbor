import type { Activity, Option } from "../../types";
import { int, items as genItems, keyOf, pick, pickN, shuffle, type Rng, type Topic, type WorldDef } from "../../gen";
import type { BeatRule, ChordRule, ComposeRule, DrumId, Dyn, InstId, Meter, MHit, MNote, MOption, MSymbol, MusicShow, Score } from "../types";
import { DYNAMICS, TEMPO_WORDS, barBeats, chordPitches, intoBars, noteName, scale, spelledName } from "../theory";
import { arpeggio, beat, chain, chordSound, clicks, groove, hairpin, layer, melody, note1, onInst, progression, rhythm, tempoRamp, then, tune, type Groove } from "../score";
import { piece } from "../pieces";
import { songScore } from "../songs";
import { strongSyllables } from "../check";
import {
  beatsShow, buildChord, chordQualityEar, echo, frame, idea, instShow, intervalEar, keysShow, ladderShow, listen, majorMinor, naturals, opt, picsShow,
  progSound, randomCells, readRhythm, rhythmMatch, rhythmShow, seeChoice, solfegeMatch, soundOpt, staffName, staffShow, styleEar, textOpts, topic,
} from "../make";

// Music for 4th and 5th grade — big sailors who read on their own. Real terminology, real music,
// and a lot of making.
//
//   4th — dotted rhythms + ties in 3/4 and 4/4 · the major scale (whole/half steps, fa and ti) ·
//         sharps, flats and the first key signatures · triads and I–IV–V · Italian tempo and
//         dynamics words (and conducting them) · music history from Bach to ragtime and jazz ·
//         Studio 4: a whole song (chords, melody, beat, rhyming words).
//   5th — major vs. minor (relative minor) · syncopation and triplets · the 12-bar blues ·
//         6/8 time · genres and their signature beats · songwriting (verse/chorus, hooks,
//         rhyme schemes, I–V–vi–IV).
//
// Every world teaches first (an "idea" explainer you can hear), practices with real sound, and
// ends with a CREATE level built from exactly what it taught. Skill keys "u:<family>[:<detail>]";
// topic keys are prefixed "g4-"/"g5-" so they never collide with other bands in review.

// ── Shared helpers ─────────────────────────────────────────────────────────────────────────────
type Gen = (r: Rng, d: number) => Activity;
type Make = (r: Rng) => Activity;
/** A question for a bank: prompt, answer, wrong answers, why (shown after a miss), picture. */
type Q = { q: string; a: string; w: string[]; why?: string; v?: MusicShow; s?: string };
const T = (key: string, gen: Gen): Topic => topic(key, gen);

/** A text-answer choice with an optional music picture (options shuffled). */
function ask(r: Rng, x: Q, skill: string): Activity {
  const long = [x.a, ...x.w].some((t) => t.length > 16);
  return seeChoice({ prompt: x.q, visual: x.v, options: textOpts(r, x.a, x.w), answer: x.a, skill: x.s ?? skill, why: x.why, layout: long ? "list" : "row" });
}
/** A topic over a bank of questions (only the first `easy` ones while d is low). */
const quiz = (key: string, skill: string, bank: Q[], easy = bank.length): Topic => T(key, (r, d) => ask(r, pick(r, d < 0.45 ? bank.slice(0, Math.max(3, easy)) : bank), skill));
/** A topic that picks one of several hand-made item builders. */
const variants = (key: string, list: Make[]): Topic => T(key, (r) => pick(r, list)(r));

/** Up to k fresh items from topics that don't repeat anything the level already has (and, when
 *  there are spares, skip items practicing the same skill as what the level opened with). */
function fresh(r: Rng, topics: Topic[], k: number, d0: number, d1: number, have: Activity[] = []): Activity[] {
  if (k <= 0) return [];
  const seen = new Set(have.map(keyOf));
  const skills = new Set(have.map((a) => a.skill));
  const pool = genItems(r, topics, k + 5, d0, d1).filter((a) => !seen.has(keyOf(a)));
  let spare = pool.length - k;
  return pool.filter((a) => !(spare > 0 && skills.has(a.skill) && spare--)).slice(0, k);
}
/** A hand-sequenced level never shows the same item twice: a repeat is re-rolled from the stage's topics. */
function noRepeats(w: WorldDef): WorldDef {
  return {
    ...w,
    stages: w.stages.map((st) => {
      const fixed = st.fixed;
      if (!fixed || !st.topics.length) return st;
      return {
        ...st,
        fixed: (r: Rng, li: number) => {
          const seen = new Set<string>();
          return fixed(r, li).map((a) => {
            let b = a;
            for (let k = 0; k < 12 && seen.has(keyOf(b)); k++) b = pick(r, st.topics).gen(r, 0.5);
            seen.add(keyOf(b));
            return b;
          });
        },
      };
    }),
  };
}
/** A stage whose first level opens with an explainer (+ hand-picked items); the rest is practice. */
const teach = (lead: (r: Rng) => Activity[], topics: Topic[], per = 7) => (r: Rng, li: number): Activity[] => {
  const head = li === 0 ? lead(r) : [];
  return [...head, ...fresh(r, topics, per - head.length, li === 0 ? 0.1 : 0.35, li === 0 ? 0.55 : 0.9, head)];
};

/** A soft metronome under a sound (n clicks), so the beat can be felt. */
function clicked(s: Score, n: number, meter: Meter = [4, 4]): Score {
  const c = clicks(n, s.bpm, meter).tracks[0];
  return { ...s, meter, tracks: [...s.tracks, { ...c, vol: 0.4 }] };
}
/** Every note and hit at one loudness (so loud/soft contrasts survive being chained). */
const at = (s: Score, v: number) => hairpin(s, v, v);
const sym = (s: MSymbol, label?: string): MusicShow => ({ show: "symbol", sym: s, ...(label ? { label } : {}) });
const meterPic = (m: Meter): MusicShow => ({ show: "meter", meter: m });
const chordsPic = (romans: string[], tonic = 60, sc: "major" | "minor" = "major"): MusicShow => ({ show: "chords", romans, tonic, scale: sc });
const gridPic = (rows: DrumId[], pattern: string[]): MusicShow => ({ show: "grid", rows, pattern });
const dynPic = (...marks: Dyn[]): MusicShow => ({ show: "dynamics", marks });
const formPic = (...sections: string[]): MusicShow => ({ show: "form", sections });
const keySigPic = (key: number, tonic: number): MusicShow => ({ show: "staff", clef: "treble", key, notes: [{ p: tonic, d: 4 }] });
const one = (id: string, s: Score): MOption => soundOpt(id, s, "First", { emoji: "1️⃣" });
const two = (id: string, s: Score): MOption => soundOpt(id, s, "Second", { emoji: "2️⃣" });
/** Two sounds to compare; `firstIsA` puts option a first. */
const pair = (r: Rng, a: [string, Score], b: [string, Score]): MOption[] => (r() < 0.5 ? [one(a[0], a[1]), two(b[0], b[1])] : [one(b[0], b[1]), two(a[0], a[1])]);

const beatlab = (mode: "copy" | "make" | "fix", prompt: string, rows: DrumId[], steps: 4 | 8 | 16, bpm: number, x: { target?: string[]; rules?: BeatRule[]; start?: string[]; swing?: number }, skill: string): Activity => ({ kind: "beatlab", mode, prompt, rows, steps, bpm, ...x, skill });
type ChordOpts = { tonic?: number; scale?: "major" | "minor"; palette: string[]; bpm?: number; inst?: InstId; beat?: boolean };
const chordsMatch = (prompt: string, answer: string[], o: ChordOpts, skill: string): Activity => ({ kind: "chords", mode: "match", prompt, tonic: o.tonic ?? 60, scale: o.scale ?? "major", palette: o.palette, bars: answer.length, answer, bpm: o.bpm ?? 88, inst: o.inst ?? "piano", beat: o.beat ?? true, skill });
const chordsBuild = (prompt: string, bars: number, rules: ChordRule[], o: ChordOpts, skill: string): Activity => ({ kind: "chords", mode: "build", prompt, tonic: o.tonic ?? 60, scale: o.scale ?? "major", palette: o.palette, bars, rules, bpm: o.bpm ?? 92, inst: o.inst ?? "piano", beat: o.beat ?? true, skill });
type ComposeOpts = { prompt: string; pitches: number[]; slots: number; dur: number; bpm: number; rules: ComposeRule[]; tonic: number; inst?: InstId; labels?: "solfege" | "letters" | "colors" | "none"; backing?: Score; start?: (number | null)[]; lyric?: string[] };
const compose = (o: ComposeOpts, skill: string): Activity => ({ kind: "compose", ...o, skill });
const measure = (mode: "fill" | "fix" | "dictation" | "create", prompt: string, meter: Meter, bars: number, cards: string[], x: { given?: (string[] | null)[]; target?: string[][]; must?: string[]; bpm?: number }, skill: string): Activity => ({ kind: "measure", mode, prompt, meter, bars, cards, ...x, skill });
const keysAct = (task: "find" | "chord" | "scale" | "interval", prompt: string, answer: number[], lo: number, hi: number, x: { labels?: boolean; given?: number[]; octaveFree?: boolean; why?: string }, skill: string): Activity => ({ kind: "keys", task, prompt, answer, lo, hi, ...x, skill });
const order = (prompt: string, list: string[], skill: string, direction: "row" | "column" = "column"): Activity => ({ kind: "order", prompt, items: list.map((t) => ({ id: t, text: t })), direction, skill });
const conduct = (prompt: string, goal: { tempo?: [number, number]; dyn?: [number, number] }, music: Score, skill: string, word?: string): Activity => ({ kind: "conduct", prompt, goal, music, ...(word ? { word } : {}), skill });

const beatsWord = (m: Meter) => (m[1] === 8 ? `${m[0]} eighth notes` : `exactly ${barBeats(m)} beats`);
/** Measures to finish: the first bar is half-built, the rest are empty. */
function fillItem(r: Rng, pool: string[], meter: Meter, bars: number, skill: string): Activity {
  const split = intoBars(randomCells(r, pool, meter, bars), meter) ?? [];
  const given = split.map((b, i) => (i === 0 && b.length > 1 ? b.slice(0, b.length - 1) : null));
  return measure("fill", `Finish the bars! Every bar of ${meter.join("/")} needs ${beatsWord(meter)}.`, meter, Math.max(1, split.length), pool, { given, bpm: 84 }, skill);
}
const SHORTER: Record<string, string> = { taaa: "taa", whole: "taaa", taa: "ta", tamti: "ta", synco: "ta", tai: "tati", tati: "ta", tititi: "titi" };
/** Exactly one bar has too few beats — find it and fix it. */
function fixItem(r: Rng, pool: string[], meter: Meter, bars: number, skill: string): Activity {
  const split = intoBars(randomCells(r, pool, meter, bars), meter) ?? [];
  const w = int(r, 0, split.length - 1);
  const bar = [...split[w]];
  if (bar.length > 1) bar.splice(int(r, 0, bar.length - 1), 1);
  else bar[0] = SHORTER[bar[0]] ?? "ta";
  return measure("fix", `One bar doesn't have ${beatsWord(meter)} of ${meter.join("/")}. Find it and fix it!`, meter, split.length, pool, { given: split.map((b, i) => (i === w ? bar : b)), bpm: 84 }, skill);
}
/** Hear a rhythm, write it in bars. */
function dictItem(r: Rng, pool: string[], meter: Meter, bars: number, skill: string, bpm = 80, must?: string): Activity {
  const target = intoBars(randomCells(r, pool, meter, bars, must), meter) ?? [];
  return measure("dictation", "Listen, then write the rhythm you hear. Play it as many times as you need.", meter, target.length, pool, { target, bpm }, skill);
}

/** A lyric line: one syllable per note, with lengths (and a tune for fitting words). */
type Line = { syl: string[]; durs: number[]; meter: Meter; pitches?: number[] };
function stressItem(x: Line, skill = "u:lyrics:stress", bpm = 92): Activity {
  const prompt = x.meter[0] === 4 && x.meter[1] === 4 ? "Tap the syllables that land on a STRONG beat (beats 1 and 3)." : x.meter[1] === 8 ? "Tap the syllables that land on the two BIG beats of each bar." : "Tap the syllables that land on beat 1 — the strong beat of each bar.";
  return { kind: "lyrics", mode: "stress", prompt, syllables: x.syl, durs: x.durs, stress: strongSyllables(x.durs, x.meter), bpm, meter: x.meter, skill };
}
const fitItem = (x: Line, prompt: string, skill = "u:lyrics:fit", bpm = 92): Activity => ({ kind: "lyrics", mode: "fit", prompt, syllables: x.syl, durs: x.durs, ...(x.pitches ? { pitches: x.pitches } : {}), bpm, meter: x.meter, skill });
/** A lyric line sung on an instrument, with its strong syllables accented. */
function sing(x: Line, inst: InstId = "flute", bpm = 92): Score {
  const strong = new Set(strongSyllables(x.durs, x.meter));
  return { bpm, meter: x.meter, tracks: [{ kind: "notes", inst, notes: x.durs.map((d, i) => ({ p: x.pitches?.[i] ?? 67, d, v: strong.has(i) ? 0.95 : 0.55 })) }] };
}

// Pitches and scales used across worlds.
const CMAJ = scale(60, "major");
const C_PENTA = [60, 62, 64, 67, 69, 72];

// ═══ 4th grade ══════════════════════════════════════════════════════════════════════════════════

// ── Dotted Rhythm Dunes: the magic dot, tam-ti, ties, 3/4 and 4/4 ──────────────────────────────
const DOT4 = ["ta", "titi", "taa", "tamti"];
const DOT3 = ["ta", "titi", "taa", "taaa", "tamti"];

const DOT_Q: Q[] = [
  { q: "How many beats does a dotted half note get?", a: "3", w: ["2", "4"], v: sym("dotted-half"), why: "A half note is 2 beats. The dot adds half of that (1 more), so 2 + 1 = 3." },
  { q: "How many beats does a half note get?", a: "2", w: ["1", "3"], v: sym("half") },
  { q: "What does a dot after a note do?", a: "Adds half of the note's length", w: ["Makes the note louder", "Makes it twice as long"], v: sym("dotted-half"), why: "The dot adds HALF the note's own length: a half note (2) becomes 3, a quarter (1) becomes 1½." },
  { q: "How many beats does a dotted quarter note get?", a: "1½", w: ["1", "2"], v: sym("dotted-quarter"), why: "A quarter note is 1 beat; the dot adds half of 1, so 1 + ½ = 1½." },
  { q: "Tam-ti is a dotted quarter plus an eighth. How many beats in all?", a: "2", w: ["1½", "3"], v: rhythmShow(["tamti"], "notes"), why: "1½ + ½ = 2 beats — long, then short." },
  { q: "Which single note fills a whole bar of 3/4?", a: "A dotted half note", w: ["A half note", "A whole note"], v: meterPic([3, 4]), why: "3/4 has 3 beats in a bar, and a dotted half lasts exactly 3." },
  { q: "A half note tied to a quarter note lasts how long?", a: "3 beats", w: ["2 beats", "1 beat"], v: sym("tie"), why: "A tie glues notes of the same pitch into one sound: 2 + 1 = 3 beats." },
  { q: "Two quarter notes tied together sound like…", a: "One note held for 2 beats", w: ["Two quick notes", "A 2-beat rest"], v: sym("tie"), why: "You play the first note and keep holding through the second — one long sound." },
  { q: "What can a tie do that a dot can't?", a: "Hold a note across the bar line", w: ["Make a note shorter", "Change the note's pitch"], v: sym("tie"), why: "A dot stays inside its bar. A tie can stretch one sound from the end of a bar into the next." },
  { q: "In 4/4, a dotted half note leaves room for how many more beats in the bar?", a: "1", w: ["2", "0"], v: rhythmShow(["taaa", "ta"], "notes"), why: "4 − 3 = 1, so one quarter note finishes the bar." },
  { q: "How many dotted half notes fill four bars of 3/4?", a: "4", w: ["3", "6"], v: meterPic([3, 4]), why: "One dotted half fills each bar of 3/4 — so four bars take four." },
  { q: "A whole note is 4 beats. How long is a dotted whole note?", a: "6 beats", w: ["5 beats", "8 beats"], v: sym("whole"), why: "Half of 4 is 2, so the dot makes it 4 + 2 = 6." },
];
const dotMath = quiz("g4-dot-math", "u:rhythm:dots", DOT_Q, 6);
const hearDotted = T("g4-hear-dotted", (r, d) =>
  r() < 0.5
    ? rhythmMatch(r, { pool: d < 0.5 ? DOT4 : [...DOT4, "z"], meter: [4, 4], bars: d < 0.6 ? 1 : 2, must: "tamti", style: "notes", bpm: 88, skill: "u:rhythm:tamti" })
    : rhythmMatch(r, { pool: DOT3, meter: [3, 4], bars: 2, must: "taaa", style: "notes", bpm: 96, skill: "u:rhythm:dotted-half" }),
);
const echoDotted = T("g4-echo-dotted", (r, d) =>
  r() < 0.55
    ? echo(r, { pool: DOT4, meter: [4, 4], bars: d < 0.5 ? 1 : 2, must: "tamti", show: d < 0.35 ? "notes" : "none", bpm: 84, skill: "u:rhythm:tamti", prompt: "Listen for the long–short TAM-ti, then tap the rhythm back." })
    : echo(r, { pool: ["ta", "titi", "taa", "taaa"], meter: [3, 4], bars: 2, must: "taaa", show: d < 0.35 ? "notes" : "none", bpm: 96, skill: "u:rhythm:dotted-half", prompt: "In 3/4: hold on through the long ta-a-a, then tap it all back." }),
);
const readDotted = T("g4-read-dotted", (r, d) =>
  r() < 0.5
    ? readRhythm(r, { pool: d < 0.5 ? DOT4 : [...DOT4, "z"], meter: [4, 4], bars: 2, must: "tamti", show: "notes", bpm: d < 0.5 ? 72 : 84, skill: "u:rhythm:tamti", prompt: "Read it, then play it after the count-in. Long–short for tam-ti!" })
    : readRhythm(r, { pool: DOT3, meter: [3, 4], bars: 2, must: "taaa", show: "notes", bpm: 88, skill: "u:rhythm:dotted-half", prompt: "Read this 3/4 rhythm and play it. Count 1-2-3 in your head." }),
);
type MeterId = "24" | "34" | "44";
const METER_OPTS: Record<MeterId, MOption> = {
  "24": opt("24", "2/4 — march", { show: meterPic([2, 4]) }),
  "34": opt("34", "3/4 — waltz", { show: meterPic([3, 4]) }),
  "44": opt("44", "4/4 — common time", { show: meterPic([4, 4]) }),
};
const meterFeel = T("g4-meter-feel", (r, d) => {
  const ids: MeterId[] = d < 0.5 ? ["34", "44"] : ["24", "34", "44"];
  const m = pick(r, ids);
  const sound = m === "24" ? piece("march", { tonic: pick(r, [58, 60, 62]) }) : m === "34" ? (r() < 0.5 ? piece("waltz", { tonic: pick(r, [57, 60, 62]) }) : piece("lullaby", { tonic: pick(r, [57, 60, 62]), bpm: 96 })) : piece(pick(r, ["country", "happy", "rock"] as const));
  const why = m === "34" ? "ONE two three, ONE two three — 3 beats in every bar." : m === "24" ? "LEFT right, LEFT right — a march has 2 beats in a bar." : "ONE two THREE four — 4 beats in every bar.";
  return listen({ prompt: "Feel where the strong beats fall. Which time signature fits this music?", sound, options: ids.map((i) => METER_OPTS[i]), answer: m, skill: "u:meter:time-sig", why });
});
const dunesFill = T("g4-dunes-fill", (r) => (r() < 0.5 ? fillItem(r, DOT3, [3, 4], 2, "u:rhythm:measure") : fillItem(r, [...DOT4, "z"], [4, 4], 2, "u:rhythm:measure")));
const dunesFix = T("g4-dunes-fix", (r, d) => (r() < 0.5 ? fixItem(r, DOT3, [3, 4], d < 0.5 ? 2 : 3, "u:rhythm:fix") : fixItem(r, [...DOT4, "z"], [4, 4], 2, "u:rhythm:fix")));
const dunesDict = T("g4-dunes-dict", (r, d) => (r() < 0.5 ? dictItem(r, DOT4, [4, 4], d < 0.5 ? 1 : 2, "u:rhythm:dictation", 84, "tamti") : dictItem(r, DOT3, [3, 4], 2, "u:rhythm:dictation", 92, "taaa")));

const DUNE_LINES: Line[] = [
  { syl: ["Sun", "ny", "dunes", "of", "gold", "en", "sand"], durs: [1.5, 0.5, 0.5, 0.5, 1.5, 0.5, 1], meter: [3, 4], pitches: [67, 65, 64, 62, 64, 65, 67] },
  { syl: ["Wind", "blows", "the", "sand", "a", "way"], durs: [1.5, 0.5, 1, 2, 1, 3], meter: [3, 4], pitches: [72, 71, 69, 67, 65, 64] },
  { syl: ["Hot", "is", "the", "sun", "at", "noon"], durs: [1.5, 0.5, 1, 2, 1, 3], meter: [3, 4], pitches: [60, 64, 67, 72, 71, 72] },
  { syl: ["Stars", "a", "bove", "the", "des", "ert", "shine"], durs: [1.5, 0.5, 1, 1, 1.5, 0.5, 2], meter: [4, 4], pitches: [67, 69, 72, 71, 69, 67, 64] },
  { syl: ["O", "ver", "hills", "of", "sand", "we", "go"], durs: [1.5, 0.5, 1.5, 0.5, 1.5, 0.5, 2], meter: [4, 4], pitches: [64, 65, 67, 64, 62, 64, 60] },
  { syl: ["Wa", "ter", "wa", "ter", "down", "in", "the", "well"], durs: [1.5, 0.5, 1.5, 0.5, 1, 0.5, 0.5, 2], meter: [4, 4], pitches: [69, 67, 69, 67, 65, 64, 62, 60] },
];
const lyricStress = T("g4-lyric-stress", (r) => stressItem(pick(r, DUNE_LINES), "u:lyrics:stress", 96));

const DUNE_CREATE: Make[] = [
  () => measure("create", "Compose a 4-bar rhythm in 3/4. Use at least one dotted half (ta-a-a) and one tam-ti!", [3, 4], 4, [...DOT3, "z"], { must: ["taaa", "tamti"], bpm: 96 }, "u:rhythm:create"),
  () => measure("create", "Compose a 2-bar rhythm in 4/4 that uses tam-ti AND a half note.", [4, 4], 2, [...DOT4, "z"], { must: ["tamti", "taa"], bpm: 88 }, "u:rhythm:create"),
  () => measure("create", "Write a camel-walk rhythm: 4 bars of 4/4 with at least one tam-ti and one dotted half.", [4, 4], 4, [...DOT4, "taaa", "z"], { must: ["tamti", "taaa"], bpm: 84 }, "u:rhythm:create"),
];
const dunesCreate = variants("g4-dunes-create", DUNE_CREATE);
const MARCH_ROWS: DrumId[] = ["bassdrum", "snare", "cymbals"];
const MARCH_BEATS: string[][] = [
  ["x...x...", "..x...x.", "........"],
  ["x...x...", "x.xxx.x.", "....x..."],
  ["x.x.x.x.", "..x...x.", "x......."],
];
const MARCH_MAKE: Make[] = [
  () => beatlab("make", "March time! Bass drum on beats 1 and 3, snare on beats 2 and 4.", MARCH_ROWS, 8, 112, { rules: [{ rule: "on", row: "bassdrum", steps: [0, 4] }, { rule: "on", row: "snare", steps: [2, 6] }] }, "u:beatmaking:march"),
  () => beatlab("make", "A drum-line march: bass drum on 1 and 3, a snare part with at least 5 hits, and one or two cymbal crashes.", MARCH_ROWS, 8, 112, { rules: [{ rule: "on", row: "bassdrum", steps: [0, 4] }, { rule: "count", row: "snare", min: 5 }, { rule: "count", row: "cymbals", min: 1, max: 2 }] }, "u:beatmaking:march"),
  (r) => beatlab("copy", "Listen to the marching band's drums. Build the same beat!", MARCH_ROWS, 8, 108, { target: [...pick(r, MARCH_BEATS)] }, "u:beatmaking:march"),
];
const marchBeat = variants("g4-march-beat", MARCH_MAKE);

const DOT_IDEA = idea("The magic dot", [
  frame("A half note lasts 2 beats — listen to the clicks counting under each long note: ta-a.", sym("half", "2 beats"), clicked(melody([67, 64, 65, 62], 2, "violin", 92), 8)),
  frame("Put a dot after it and the note grows by HALF its length: 2 + 1 = 3 beats. Ta-a-a! A dotted half fills a whole bar of 3/4.", rhythmShow(["taaa", "taaa"], "notes", true, [3, 4]), clicked(melody([67, 64], 3, "violin", 96), 6, [3, 4])),
  frame("A dotted quarter is 1 + ½ = 1½ beats, and an eighth note finishes the beat: long–short, TAM-ti!", rhythmShow(["tamti", "tamti", "tamti", "taa"], "notes"), clicked(tune(["tamti", "tamti", "tamti", "taa"], [67, 64, 65, 62, 64, 60, 60], "marimba", 84), 8)),
  frame("You already know a tam-ti song: “LON-don Bridge is fall-ing down…”", rhythmShow(["tamti", "ta", "ta", "ta", "ta", "taa"], "notes"), songScore("london", { n: 7, inst: "piano", bpm: 96 })),
  frame("A tie (a curved line between two notes of the same pitch) glues them into one long sound — it can even hold a note across the bar line.", sym("tie", "2 + 1 = 3 beats"), clicked(melody([64, 67, 65], [1, 3, 4], "flute", 92), 8)),
], "u:rhythm:dots");
const METER_IDEA = idea("Time signatures", [
  frame("The top number of a time signature tells how many beats are in each bar. The first beat of every bar is the strong one.", meterPic([3, 4]), clicked(melody([60, 64, 67, 64, 67, 64], 1, "piano", 100), 6, [3, 4])),
  frame("2/4 marches: LEFT right, LEFT right.", meterPic([2, 4]), piece("march", { bpm: 112 })),
  frame("3/4 waltzes: ONE two three, ONE two three.", meterPic([3, 4]), piece("waltz")),
  frame("4/4 is so common it's called common time: ONE two THREE four.", meterPic([4, 4]), piece("country")),
], "u:meter:idea");
const STRESS_IDEA = idea("Strong words, strong beats", [
  frame("Say “DES-ert” out loud. One syllable is stronger. Every word has its own strong syllables.", sym("accent"), sing({ syl: ["Des", "ert"], durs: [1.5, 0.5], meter: [4, 4], pitches: [69, 67] }, "flute", 80)),
  frame("Songwriters put strong syllables on strong beats. In 3/4 that's beat 1. In 4/4 it's beats 1 and 3.", beatsShow(4, [0, 2]), clicked(sing(DUNE_LINES[3]), 8)),
  frame("Hear it: “STARS a-BOVE the DES-ert SHINE.” Every strong syllable lands on a strong beat, so it's easy to sing.", rhythmShow(["tamti", "ta", "ta", "tamti", "taa"], "notes", false), sing(DUNE_LINES[3], "piano")),
], "u:lyrics:idea");
const DUNE_MAKE_IDEA = idea("Compose in the dunes", [
  frame("Composers build rhythms bar by bar, and every bar has to add up. Your turn — compose with dotted notes!", rhythmShow(["taaa", "tamti", "ta", "taa", "ta", "taaa"], "notes", false, [3, 4]), tune(["taaa", "tamti", "ta", "taa", "ta", "taaa"], [67, 69, 67, 64, 65, 62, 60], "marimba", 100)),
  frame("Then march! A marching band's bass drum plays beats 1 and 3, and the snare plays 2 and 4.", gridPic(["bassdrum", "snare"], ["x...x...", "..x...x."]), beat({ bassdrum: "x...x...", snare: "..x...x." }, { bpm: 112, per: 2, times: 2 })),
], "u:rhythm:create");

const DUNES: WorldDef = {
  id: "g4-dotted-dunes",
  title: "Dotted Rhythm Dunes",
  emoji: "🏜️",
  grade: "4",
  blurb: "The magic dot, long–short tam-ti, ties, and the feel of 3/4 and 4/4.",
  talk: ["Can you clap the start of “London Bridge” and hear the long–short tam-ti?", "Which songs do you know that feel like a waltz (ONE two three)?"],
  challenge: "Clap a rhythm with a dotted note in it — can a grown-up clap it back exactly?",
  stages: [
    {
      title: "The magic dot",
      emoji: "⏳",
      levels: 1,
      topics: [dotMath, hearDotted, echoDotted, readDotted, dunesFill],
      fixed: (r) => [DOT_IDEA, dotMath.gen(r, 0), hearDotted.gen(r, 0.1), echoDotted.gen(r, 0.15), dotMath.gen(r, 0.3), readDotted.gen(r, 0.25), dunesFill.gen(r, 0.3)],
    },
    {
      title: "Dune walk",
      emoji: "🐪",
      levels: 2,
      topics: [hearDotted, echoDotted, readDotted, dotMath, meterFeel],
      fixed: teach((r) => [METER_IDEA, meterFeel.gen(r, 0.1)], [hearDotted, echoDotted, readDotted, dotMath, meterFeel]),
      unlocks: ["groove:waltz"],
    },
    {
      title: "Measure makers",
      emoji: "📏",
      levels: 2,
      topics: [dunesFill, dunesFix, dunesDict, lyricStress],
      fixed: teach((r) => [STRESS_IDEA, lyricStress.gen(r, 0)], [dunesFill, lyricStress, dunesFix, echoDotted, dunesDict, dotMath]),
    },
    {
      title: "Dune drummer",
      emoji: "🥁",
      levels: 1,
      topics: [dunesCreate, marchBeat],
      unlocks: ["groove:march", "drum:bassdrum"],
      fixed: (r) => [
        DUNE_MAKE_IDEA,
        DUNE_CREATE[0](r),
        MARCH_MAKE[0](r),
        DUNE_CREATE[1](r),
        fitItem(DUNE_LINES[3], "Fit the words to the tune: drag each syllable onto its note. Strong syllables go on strong beats!"),
        MARCH_MAKE[2](r),
        dunesDict.gen(r, 0.6),
      ],
    },
  ],
};

// ── Major Scale Mountain: whole and half steps, fa and ti, the major scale ─────────────────────
const SOL8 = [0, 2, 4, 5, 7, 9, 11, 12];
const C_KB = keysShow(60, 72, CMAJ);
const wholeHalfEar = T("g4-wh-ear", (r, d) => {
  const half = r() < 0.5;
  const lo = pick(r, [60, 62, 64, 65, 67, 69, 71]);
  const hi = lo + (half ? 1 : 2);
  const up = d < 0.6 || r() < 0.5;
  const kb = (b: number) => keysShow(57, 76, [lo, b], "none");
  return listen({
    prompt: up ? "Two notes going up. Is it a half step or a whole step?" : "Two notes going down. Half step or whole step?",
    sound: up ? melody([lo, hi], [1, 1.5], "piano", 72) : melody([hi, lo], [1, 1.5], "piano", 72),
    options: [opt("half", "Half step — to the very next key", { show: kb(lo + 1) }), opt("whole", "Whole step — skip one key", { show: kb(lo + 2) })],
    answer: half ? "half" : "whole",
    skill: "u:scale:whole-half",
    why: half ? "A half step is the smallest step: to the very next key, black or white." : "A whole step is two half steps — it skips over one key.",
  });
});
const wholeHalfKeys = T("g4-wh-keys", (r, d) => {
  const base = pick(r, [60, 62, 64, 65, 67, 69, 71]);
  const whole = r() < 0.5;
  const up = d < 0.5 || r() < 0.6;
  const target = base + (up ? 1 : -1) * (whole ? 2 : 1);
  return keysAct("interval", `${spelledName(base)} is pressed. Add the key a ${whole ? "WHOLE" : "HALF"} step ${up ? "above" : "below"} it.`, [base, target].sort((a, b) => a - b), 57, 76, { labels: d < 0.5, given: [base], why: `A ${whole ? "whole step skips one key" : "half step goes to the very next key"}: ${spelledName(base)} → ${spelledName(target)}.` }, "u:keys:steps");
});
const SCALE_Q: Q[] = [
  { q: "Which step pattern builds a major scale?", a: "W W H W W W H", w: ["W H W W H W W", "W W W H W W H"], v: C_KB, why: "Whole, whole, half, whole, whole, whole, half — the major scale recipe." },
  { q: "How many half steps make one whole step?", a: "2", w: ["1", "3"], v: keysShow(60, 67, [60, 62], "none") },
  { q: "In C major, which note is fa?", a: "F", w: ["E", "G"], v: C_KB, why: "Do re mi FA: C D E F." },
  { q: "In C major, which note is ti?", a: "B", w: ["A", "C"], v: C_KB, why: "So la TI do: G A B C." },
  { q: "In the C major scale, where are the two half steps?", a: "E–F and B–C", w: ["C–D and G–A", "D–E and A–B"], v: C_KB, why: "There's no black key between E and F, or between B and C — so those steps are half steps." },
  { q: "Which two white keys have NO black key between them?", a: "E and F", w: ["C and D", "G and A"], v: keysShow(60, 72, [], "none") },
  { q: "Fa is a ___ above mi.", a: "Half step", w: ["Whole step", "Skip"], v: ladderShow(60, SOL8, [4, 5]) },
  { q: "Ti is a ___ below high do.", a: "Half step", w: ["Whole step", "Octave"], v: ladderShow(60, SOL8, [11, 12]) },
  { q: "How many different notes are in a major scale before do comes back on top?", a: "7", w: ["5", "8"], v: ladderShow(60, SOL8) },
  { q: "Why does the C major scale use only white keys?", a: "Its half steps land exactly on E–F and B–C", w: ["Black keys are too high for it", "Composers didn't like black keys"], v: C_KB },
];
const scaleQ = quiz("g4-scale-q", "u:scale:major", SCALE_Q, 5);
const solfaTi = T("g4-solfa", (r, d) => solfegeMatch(r, { steps: d < 0.4 ? [0, 2, 4, 5, 7] : d < 0.7 ? [0, 4, 5, 7, 11, 12] : SOL8, n: d < 0.5 ? 3 : 4, tonic: 60, skill: "u:solfege:fa-ti" }));
const FA_TI_TUNES = [[64, 65, 67], [67, 65, 64, 62], [69, 71, 72], [72, 71, 69, 67], [60, 62, 64, 65], [65, 64, 62, 60], [67, 69, 71, 72], [71, 72, 67, 65], [64, 65, 64, 62, 60], [62, 64, 65, 67, 69, 71, 72]];
const scaleEcho = T("g4-scale-echo", (r, d) => ({ kind: "melody", mode: "echo", prompt: "Listen, then play it back on the bells. Listen for fa and ti!", notes: pick(r, FA_TI_TUNES.filter((f) => (d < 0.5 ? f.length <= 4 : f.length >= 4))), pads: CMAJ, on: "bells", labels: "solfege", tonic: 60, bpm: 88, skill: "u:melody:fa-ti" }));
const scaleRead = T("g4-scale-read", (r, d) => ({ kind: "melody", mode: "read", prompt: "Read the notes on the staff, then play them on the piano.", notes: pick(r, FA_TI_TUNES), pads: CMAJ, on: "keys", labels: d < 0.5 ? "letters" : "none", show: "staff", clef: "treble", tonic: 60, skill: "u:melody:read" }));
const TI_TUNES: [number[], boolean][] = [
  [[60, 62, 64, 65, 67, 69, 71, 72], true],
  [[60, 62, 64, 65, 67, 69, 71], false],
  [[67, 64, 65, 62, 71, 72], true],
  [[67, 64, 65, 62, 69, 71], false],
  [[72, 71, 69, 67, 65, 64, 62, 60], true],
  [[64, 65, 67, 72, 71], false],
  [[65, 64, 62, 59, 60], true],
  [[64, 62, 60, 62, 59], false],
];
const tiPull = T("g4-ti-pull", (r) => {
  const [ps, done] = pick(r, TI_TUNES);
  return listen({
    prompt: "Does this tune sound finished, or does it stop on ti and leave you hanging?",
    sound: melody(ps, [...ps.slice(1).map(() => 0.5), 1.5], "piano", 92),
    options: [opt("done", "Finished — it lands home on do", { emoji: "🏠" }), opt("ti", "Unfinished — it stops on ti", { emoji: "❓" })],
    answer: done ? "done" : "ti",
    skill: "u:solfege:ti-pull",
    why: "Ti is just a half step below do, so it pulls upward toward home. Ending on ti feels like a question.",
  });
});
const scaleStaff = T("g4-scale-staff", (r, d) => {
  const k = r();
  if (k < 0.5) return staffName(r, { clef: "treble", pool: d < 0.5 ? CMAJ : naturals(57, 79), skill: "u:staff:treble" });
  if (k < 0.8) {
    const p = pick(r, [71, 67, 69, 72, 74, 62]);
    return { kind: "staff", mode: "place", prompt: `Put ${spelledName(p)}${p === 71 ? " (ti)" : p === 72 ? " (high do)" : ""} on the staff.`, clef: "treble", notes: [p], hear: true, skill: "u:staff:place" };
  }
  return { kind: "staff", mode: "write", prompt: "Write the C major scale going up, from middle C to high C: C D E F G A B C.", clef: "treble", notes: CMAJ, hear: true, skill: "u:staff:write" };
});
const SCALE_KEYS: Make[] = [
  () => keysAct("scale", "Build the C major scale from middle C up to high C (8 keys). Remember W W H W W W H!", CMAJ, 57, 76, { given: [60] }, "u:keys:scale"),
  () => keysAct("find", "Find fa and ti in C major (F and B)!", [65, 71], 60, 72, {}, "u:keys:fa-ti"),
  () => keysAct("find", "Find the two half steps of C major: tap E and F, then B and high C.", [64, 65, 71, 72], 60, 72, {}, "u:keys:half-steps"),
];
const scaleKeys = variants("g4-scale-keys", SCALE_KEYS);
const missingNote = T("g4-missing-note", (r) => {
  const i = int(r, 1, 6);
  const ans = spelledName(CMAJ[i]);
  return seeChoice({ prompt: "One note of the C major scale is missing — there's a rest in its place. Which note is it?", visual: staffShow(CMAJ.map((p, k) => ({ p: k === i ? null : p, d: 1 }))), options: textOpts(r, ans, pickN(r, ["C", "D", "E", "F", "G", "A", "B"], 2, (x) => x === ans)), answer: ans, skill: "u:scale:missing" });
});
const ODE = [64, 64, 65, 67, 67, 65, 64, 62];
const odeRead: Make = () => ({ kind: "melody", mode: "read", prompt: "Play the start of Beethoven's Ode to Joy from the staff — almost all steps!", notes: ODE, pads: CMAJ, on: "keys", labels: "letters", show: "staff", clef: "treble", tonic: 60, skill: "u:melody:read" });
const summitBacking = () => progression(["I", "IV", "V", "I"], 60, "major", { bpm: 96, per: 2, inst: "piano", style: "block", bass: true });
const SUMMIT: Make[] = [
  () => compose({ prompt: "Write a mountain melody in C major: start on do, end on do, and use fa AND ti somewhere.", pitches: CMAJ, slots: 8, dur: 1, bpm: 96, rules: [{ rule: "start", p: 60 }, { rule: "end", p: 60 }, { rule: "use", pitches: [65, 71] }, { rule: "notes", min: 6 }], tonic: 60, inst: "piano", labels: "solfege", backing: summitBacking() }, "u:compose:major"),
  () => compose({ prompt: "Climb the mountain! Put your highest note in the middle of the tune (an arch), then come home to do.", pitches: CMAJ, slots: 8, dur: 1, bpm: 96, rules: [{ rule: "arch" }, { rule: "end", p: 60 }, { rule: "notes", min: 6 }], tonic: 60, inst: "marimba", labels: "solfege", backing: summitBacking() }, "u:compose:major"),
  () => compose({ prompt: "Step by step: only move to a neighbor note (no skips). Start on do and end on so.", pitches: CMAJ, slots: 8, dur: 1, bpm: 96, rules: [{ rule: "steps" }, { rule: "start", p: 60 }, { rule: "end", p: 67 }, { rule: "notes", min: 7 }], tonic: 60, inst: "flute", labels: "solfege", backing: summitBacking() }, "u:compose:major"),
];
const summitCompose = variants("g4-summit-compose", SUMMIT);

const STEPS_IDEA = idea("Whole steps and half steps", [
  frame("A HALF step is the smallest step on the piano: from one key to the very next key, black or white.", keysShow(60, 72, [64, 65]), melody([64, 65, 64, 65], [1, 1, 1, 2], "piano", 80)),
  frame("A WHOLE step is two half steps — it skips over one key.", keysShow(60, 72, [60, 62]), melody([60, 62, 60, 62], [1, 1, 1, 2], "piano", 80)),
  frame("The major scale is a recipe of steps: W W H W W W H. Start on C and you land only on white keys!", C_KB, melody(CMAJ, [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 2], "piano", 96)),
  frame("Try it: play from C up to high C, one white key at a time. Feel the two half steps, E–F and B–C.", C_KB, undefined, "keys", CMAJ),
], "u:scale:idea");
const FATI_IDEA = idea("Meet fa and ti", [
  frame("You know do, re, mi, so and la. Two notes were hiding in the gaps: fa and ti!", ladderShow(60, [0, 2, 4, 7, 9, 12]), melody([60, 62, 64, 67, 69, 72], 0.5, "bells", 96)),
  frame("Fa lives a half step above mi. Mi–fa: the notes almost touch.", ladderShow(60, SOL8, [4, 5]), melody([64, 65, 64, 65, 67], [1, 1, 1, 1, 2], "bells", 84)),
  frame("Ti lives a half step below high do — and it PULLS upward. La, ti… do!", ladderShow(60, SOL8, [11, 12]), melody([69, 71, 72], [1, 1, 2], "bells", 84)),
  frame("All eight together make the major scale: do re mi fa so la ti do. Play it!", ladderShow(60, SOL8), melody(CMAJ, [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1.5], "bells", 100), "bells", CMAJ),
], "u:solfege:idea");
const SUMMIT_IDEA = idea("A summit song", [
  frame("Beethoven built the Ode to Joy almost entirely out of steps: mi mi fa so so fa mi re…", staffShow(ODE.map((p) => ({ p, d: 1 }))), songScore("odetojoy", { n: 15, inst: "piano", bpm: 112 })),
  frame("Now write your own song with all 8 notes of the scale — over real chords: I, IV, V, I.", chordsPic(["I", "IV", "V", "I"]), summitBacking()),
], "u:compose:idea");

const MOUNTAIN: WorldDef = {
  id: "g4-scale-mountain",
  title: "Major Scale Mountain",
  emoji: "⛰️",
  grade: "4",
  blurb: "Whole steps, half steps, and the two missing notes — fa and ti — that complete the major scale.",
  talk: ["Sing do-re-mi-fa-so-la-ti… and stop. Which note does everyone want to sing next?", "On a piano (or a picture of one), where are the two white keys with no black key between them?"],
  challenge: "Hum a scale going up but stop on ti. Does it make you want to sing the last note?",
  stages: [
    {
      title: "Whole & half steps",
      emoji: "🪜",
      levels: 1,
      topics: [wholeHalfEar, wholeHalfKeys, scaleQ],
      fixed: (r) => [STEPS_IDEA, wholeHalfEar.gen(r, 0), wholeHalfKeys.gen(r, 0), scaleQ.gen(r, 0), wholeHalfEar.gen(r, 0.4), wholeHalfKeys.gen(r, 0.5), scaleQ.gen(r, 0.3)],
    },
    {
      title: "Meet fa and ti",
      emoji: "🎶",
      levels: 2,
      topics: [solfaTi, scaleEcho, tiPull, scaleQ, scaleKeys],
      fixed: teach((r) => [FATI_IDEA, solfaTi.gen(r, 0)], [scaleEcho, tiPull, scaleKeys, solfaTi, scaleQ]),
      unlocks: ["note:fa", "note:ti"],
    },
    {
      title: "Scale on the staff",
      emoji: "🎼",
      levels: 2,
      topics: [scaleStaff, scaleRead, scaleKeys, missingNote, tiPull, solfaTi],
      unlocks: ["note:do'"],
    },
    {
      title: "Summit song",
      emoji: "🏔️",
      levels: 1,
      topics: [summitCompose, scaleKeys],
      unlocks: ["scale:major"],
      fixed: (r) => [SUMMIT_IDEA, odeRead(r), SUMMIT[0](r), missingNote.gen(r, 0.5), SUMMIT[1](r), SCALE_KEYS[0](r), tiPull.gen(r, 0.7)],
    },
  ],
};

// ── Sharps & Flats Shoals: ♯ ♭ ♮, two names for every black key, G major and F major ─────────
const BLACK = [61, 63, 66, 68, 70];
const ACC_Q: Q[] = [
  { q: "What does a sharp (♯) do to a note?", a: "Raises it a half step", w: ["Lowers it a half step", "Makes it louder"], v: sym("sharp") },
  { q: "What does a flat (♭) do to a note?", a: "Lowers it a half step", w: ["Raises it a half step", "Makes it shorter"], v: sym("flat") },
  { q: "What does a natural sign (♮) do?", a: "Cancels a sharp or flat", w: ["Raises the note", "Adds a beat"], v: sym("natural") },
  { q: "C♯ is the black key just to the ___ of C.", a: "Right", w: ["Left", "Far left"], v: keysShow(60, 67, [61], "none"), why: "Sharp = up = one key to the right." },
  { q: "B♭ is the black key just to the ___ of B.", a: "Left", w: ["Right", "Far right"], v: keysShow(65, 72, [70], "none"), why: "Flat = down = one key to the left." },
  { q: "What is another name for C♯?", a: "D♭", w: ["B♭", "D♯"], v: keysShow(60, 67, [61], "none"), why: "The black key between C and D is a half step above C (C♯) and a half step below D (D♭)." },
  { q: "What is another name for F♯?", a: "G♭", w: ["E♭", "F♭"], v: keysShow(64, 71, [66], "none") },
  { q: "What is another name for B♭?", a: "A♯", w: ["C♯", "B♯"], v: keysShow(65, 72, [70], "none") },
  { q: "What is another name for E♭?", a: "D♯", w: ["F♯", "E♯"], v: keysShow(60, 67, [63], "none") },
  { q: "What note is a half step above E?", a: "F", w: ["F♯", "G"], v: keysShow(60, 67, [64], "none"), why: "There's no black key between E and F — they're already a half step apart." },
  { q: "Two names for the same key (like G♯ and A♭) are called…", a: "Enharmonic", w: ["Harmonic", "Chromatic"], why: "Enharmonic means it sounds the same but is spelled differently." },
];
const accQ = quiz("g4-acc-q", "u:notation:accidentals", ACC_Q, 5);
const accEar = T("g4-acc-ear", (r) => {
  const base = pick(r, [62, 67, 69]);
  const up = r() < 0.5;
  const nm = spelledName(base);
  return listen({
    prompt: `The first note is ${nm}. Is the second note ${nm}♯ (a half step higher) or ${nm}♭ (a half step lower)?`,
    sound: melody([base, base + (up ? 1 : -1)], [1, 1.5], pick(r, ["piano", "violin", "flute"] as InstId[]), 76),
    options: [opt("sharp", `${nm}♯ — raised a half step`, { show: sym("sharp") }), opt("flat", `${nm}♭ — lowered a half step`, { show: sym("flat") })],
    answer: up ? "sharp" : "flat",
    skill: "u:notation:accidental-ear",
    why: up ? "A sharp raises a note a half step — the sound goes up a tiny bit." : "A flat lowers a note a half step — the sound goes down a tiny bit.",
  });
});
const findAcc = T("g4-find-acc", (r, d) => {
  const p = pick(r, BLACK);
  const flat = r() < 0.5;
  const hint = d < 0.4 ? (flat ? " (Flat = the key just to the left.)" : " (Sharp = the key just to the right.)") : "";
  return keysAct("find", `Find ${flat ? noteName(p, { flats: true }) : noteName(p)} on the keyboard!${hint}`, [p], 60, 83, { labels: d < 0.25, octaveFree: true }, "u:keys:black");
});
const staffAcc = T("g4-staff-acc", (r, d) => ({ ...staffName(r, { clef: "treble", pool: d < 0.5 ? [61, 66, 68, 63, 64, 67] : [61, 63, 66, 68, 70, 73, 75, 78, 65, 72], skill: "u:staff:sharps" }), prompt: "Check for a sharp sign (♯) in front of the note. What is this note's name?" }));
const ENH: [string, string][] = [["C♯", "D♭"], ["D♯", "E♭"], ["F♯", "G♭"], ["G♯", "A♭"], ["A♯", "B♭"]];
const enharmonic = T("g4-enharm", (r, d) => ({ kind: "match", prompt: "Every black key has two names. Match each sharp to its flat twin!", pairs: pickN(r, ENH, d < 0.5 ? 3 : 4).map(([a, b]) => ({ a: { id: a, text: a }, b: { id: b, text: b } })), mode: "columns", skill: "u:keys:enharmonic" }));
const G_MAJ = scale(67, "major");
const F_MAJ = scale(65, "major");
const KEYSIG_Q: Q[] = [
  { q: "This key signature has one sharp. Which note is always sharp?", a: "F♯", w: ["C♯", "G♯"], v: keySigPic(1, 67) },
  { q: "One sharp in the key signature means which major key?", a: "G major", w: ["D major", "F major"], v: keySigPic(1, 67) },
  { q: "One flat in the key signature means which major key?", a: "F major", w: ["B♭ major", "G major"], v: keySigPic(-1, 65) },
  { q: "This key signature has one flat. Which note is always flat?", a: "B♭", w: ["E♭", "F♭"], v: keySigPic(-1, 65) },
  { q: "No sharps and no flats: which major key?", a: "C major", w: ["G major", "F major"], v: keySigPic(0, 60) },
  { q: "In G major, every F is played as…", a: "F♯", w: ["F natural", "G♭"], v: keySigPic(1, 67) },
  { q: "In F major, every B is played as…", a: "B♭", w: ["B natural", "A♭"], v: keySigPic(-1, 65) },
  { q: "Why does G major need F♯?", a: "So ti to do (F♯ to G) is a half step", w: ["Sharps sound happier", "G is a black key"], why: "The recipe ends W W H: the last step, ti up to do, must be a half step — F♯ to G." },
  { q: "Where is the key signature written?", a: "At the start of every line, right after the clef", w: ["Only at the very end", "Above every single note"] },
  { q: "Which major scale needs B♭ to follow the W W H W W W H recipe?", a: "F major", w: ["G major", "C major"], why: "F G A B♭: from A to B♭ is the half step the recipe needs between mi and fa." },
];
const keySigQ = quiz("g4-keysig-q", "u:key-sig:g-f", KEYSIG_Q, 5);
const scaleBuildKeys = T("g4-scale-gf", (r, d) => {
  const t = pick(r, d < 0.3 ? [55, 53] : d < 0.7 ? [55, 53, 60] : [55, 53, 62]);
  const nm = t === 55 ? "G" : t === 53 ? "F" : t === 60 ? "C" : "D";
  const hint = t === 55 ? " It needs one black key: F♯." : t === 53 ? " It needs one black key: B♭." : t === 62 ? " It needs TWO black keys!" : "";
  return keysAct("scale", `Build the ${nm} major scale (W W H W W W H).${d < 0.5 ? hint : ""}`, scale(t, "major"), t - 2, t + 15, { labels: d < 0.4, given: [t] }, "u:keys:scale-gf");
});
const rightScaleEar = T("g4-scale-ear", (r) => {
  const g = r() < 0.5;
  const good = scale(g ? 55 : 53, "major");
  const bad = good.map((p) => (g && p % 12 === 6 ? p - 1 : !g && p % 12 === 10 ? p + 1 : p));
  const s = (ps: number[]) => melody(ps, [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1.5], "piano", 104);
  return listen({
    prompt: `Both scales start on ${g ? "G" : "F"}. Which one is the real ${g ? "G" : "F"} major scale?`,
    options: pair(r, ["good", s(good)], ["bad", s(bad)]),
    answer: "good",
    skill: "u:scale:major-ear",
    why: g ? "G major needs F♯ — with F natural, the top of the scale sounds wrong." : "F major needs B♭ — with B natural, the 4th note sounds too high.",
  });
});
const staffKeySig = T("g4-staff-keysig", (r) => {
  const g = r() < 0.5;
  return { ...staffName(r, { clef: "treble", pool: g ? [66, 67, 69, 71, 74, 78] : [65, 67, 69, 70, 72, 74, 77], key: g ? 1 : -1, skill: "u:staff:key-sig" }), prompt: "Check the key signature first! What is this note's name?" };
});
const G_LOW = scale(55, "major");
const F_LOW = scale(53, "major");
const SHOAL: Make[] = [
  () => compose({ prompt: "Compose a sea song in G major for the strings. Use F♯ somewhere, and end on G.", pitches: G_LOW, slots: 8, dur: 1, bpm: 92, rules: [{ rule: "use", pitches: [66] }, { rule: "end", p: 55 }, { rule: "notes", min: 6 }], tonic: 55, inst: "strings", labels: "letters", backing: progression(["I", "IV", "V", "I"], 55, "major", { bpm: 92, per: 2, inst: "pizz", style: "strum", bass: true }) }, "u:compose:key"),
  () => compose({ prompt: "Now F major, on the cello. Use B♭ at least once, start on F and end on F.", pitches: F_LOW, slots: 8, dur: 1, bpm: 88, rules: [{ rule: "use", pitches: [58] }, { rule: "start", p: 53 }, { rule: "end", p: 53 }, { rule: "notes", min: 6 }], tonic: 53, inst: "cello", labels: "letters", backing: progression(["I", "V", "IV", "I"], 53, "major", { bpm: 88, per: 2, inst: "harp", style: "arp", bass: false }) }, "u:compose:key"),
];
const shoalCompose = variants("g4-shoal-compose", SHOAL);

const ACC_IDEA = idea("Sharps, flats and naturals", [
  frame("A SHARP (♯) raises a note a half step — usually to the black key on its right. C becomes C♯.", keysShow(60, 72, [60, 61]), melody([60, 61], [1, 2], "piano", 80)),
  frame("A FLAT (♭) lowers a note a half step — to the key on its left. B becomes B♭.", keysShow(60, 72, [71, 70]), melody([71, 70], [1, 2], "piano", 80)),
  frame("So every black key has two names! The key between C and D is C♯ AND D♭.", { show: "keyboard", lo: 60, hi: 72, lit: [61], marks: { 61: "C♯ = D♭" } }, note1(61, "piano", 2, 80)),
  frame("A NATURAL (♮) cancels a sharp or flat — back to the plain white key.", sym("natural"), melody([66, 65], [1, 2], "piano", 80)),
], "u:notation:idea");
const KEYSIG_IDEA = idea("Key signatures", [
  frame("Build a major scale on G with the W W H W W W H recipe and you need one black key: F♯.", keysShow(64, 81, G_MAJ), melody(G_MAJ, [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1.5], "piano", 100)),
  frame("Instead of writing ♯ on every F, composers put one sharp at the start of each line — the KEY SIGNATURE. One sharp = G major.", { show: "staff", clef: "treble", key: 1, notes: G_MAJ.map((p) => ({ p, d: 1 })) }, melody(G_MAJ, 0.5, "violin", 104)),
  frame("Build a scale on F and you need B♭. One flat in the key signature = F major.", { show: "staff", clef: "treble", key: -1, notes: F_MAJ.map((p) => ({ p, d: 1 })) }, melody(F_MAJ, 0.5, "flute", 104)),
  frame("No sharps or flats at all? That's C major — all white keys.", { show: "staff", clef: "treble", key: 0, notes: CMAJ.map((p) => ({ p, d: 1 })) }, melody(CMAJ, 0.5, "piano", 104)),
], "u:key-sig:idea");
const SHOAL_IDEA = idea("Songs in new keys", [
  frame("Violins, violas and cellos love sharp keys like G and D — their open strings ring in those keys.", instShow("violin", "viola", "cello"), progression(["I", "IV", "V", "I"], 55, "major", { bpm: 92, per: 2, inst: "strings", style: "pad", bass: true })),
  frame("Your turn: compose in G major (with F♯) and in F major (with B♭).", keySigPic(1, 67), melody(G_LOW, 0.5, "strings", 100)),
], "u:compose:idea");

const SHOALS: WorldDef = {
  id: "g4-sharp-shoals",
  title: "Sharps & Flats Shoals",
  emoji: "🦈",
  grade: "4",
  blurb: "Sharps, flats and naturals, the two names of every black key, and your first key signatures.",
  talk: ["Why do you think every black key on a piano has two names?", "If a song is in G major, which note always gets a sharp?"],
  challenge: "Find a piano, keyboard app or picture of a keyboard. Point to C♯ — then point to D♭. Same key!",
  stages: [
    {
      title: "Sharp, flat, natural",
      emoji: "🐟",
      levels: 1,
      topics: [accQ, findAcc, staffAcc, enharmonic, accEar],
      fixed: (r) => [ACC_IDEA, accQ.gen(r, 0), findAcc.gen(r, 0), accEar.gen(r, 0.1), staffAcc.gen(r, 0.2), findAcc.gen(r, 0.3), enharmonic.gen(r, 0.2)],
    },
    { title: "Two names", emoji: "🐚", levels: 2, topics: [findAcc, accEar, enharmonic, staffAcc, accQ] },
    {
      title: "Key signatures",
      emoji: "🔑",
      levels: 2,
      topics: [keySigQ, scaleBuildKeys, rightScaleEar, staffKeySig],
      fixed: teach((r) => [KEYSIG_IDEA, keySigQ.gen(r, 0)], [keySigQ, scaleBuildKeys, rightScaleEar, staffKeySig]),
    },
    {
      title: "Shoal song",
      emoji: "🌊",
      levels: 1,
      topics: [shoalCompose, scaleBuildKeys],
      unlocks: ["inst:strings"],
      fixed: (r) => [SHOAL_IDEA, SHOAL[0](r), scaleBuildKeys.gen(r, 0.2), rightScaleEar.gen(r, 0.5), SHOAL[1](r), staffKeySig.gen(r, 0.6), keySigQ.gen(r, 0.7)],
    },
  ],
};

// ── Chord Cove: triads, I–IV–V, the bass line, and melodies over chords ───────────────────────
const TRI_C = [60, 64, 67];
const TRI_F = [65, 69, 72];
const TRI_G = [67, 71, 74];
const TRIAD_Q: Q[] = [
  { q: "How many notes are in a triad?", a: "3", w: ["2", "4"], v: staffShow([{ p: TRI_C, d: 4 }]) },
  { q: "Stack thirds on C: C, E and…?", a: "G", w: ["F", "A"], v: keysShow(60, 72, [60, 64], "letters"), why: "Skip a letter each time: C (skip D) E (skip F) G." },
  { q: "The bottom note of a triad — the one it's named after — is the…", a: "Root", w: ["Fifth", "Top"], v: staffShow([{ p: TRI_C, d: 4 }]) },
  { q: "Stack thirds on F: F, A and…?", a: "C", w: ["B", "D"], v: keysShow(65, 77, [65, 69], "letters"), why: "F (skip G) A (skip B) C." },
  { q: "Stack thirds on G: G, B and…?", a: "D", w: ["C", "E"], v: keysShow(67, 79, [67, 71], "letters"), why: "G (skip A) B (skip C) D." },
  { q: "The middle note of a root-position triad is the…", a: "Third", w: ["Second", "Root"] },
  { q: "The top note of a root-position triad is the…", a: "Fifth", w: ["Fourth", "Sixth"] },
  { q: "Which chord is C–E–G?", a: "C major", w: ["G major", "E minor"], v: staffShow([{ p: TRI_C, d: 4 }]) },
  { q: "Which chord is F–A–C?", a: "F major", w: ["A major", "C major"], v: staffShow([{ p: TRI_F, d: 4 }]) },
  { q: "Which chord is G–B–D?", a: "G major", w: ["B major", "D major"], v: staffShow([{ p: TRI_G, d: 4 }]) },
  { q: "On the staff, a root-position triad looks like…", a: "Three lines or three spaces stacked up", w: ["Notes climbing in steps", "One note with a dot"], v: staffShow([{ p: TRI_F, d: 2 }, { p: TRI_G, d: 2 }]), why: "Every note is a 3rd apart, so they stack line-line-line or space-space-space — like a snowman." },
];
const triadQ = quiz("g4-triad-q", "u:chord:triad", TRIAD_Q, 5);
const triadBuild = T("g4-triad-build", (r, d) => buildChord(r, { roots: d < 0.5 ? [60, 65, 67] : [60, 62, 64, 65, 67, 69], qualities: ["maj"], skill: "u:chord:build-maj" }));
const blockArp = T("g4-block-arp", (r) => {
  const ps = chordPitches(pick(r, [60, 65, 67, 62]), "maj");
  const blk = r() < 0.5;
  const inst = pick(r, ["piano", "harp", "guitar"] as InstId[]);
  return listen({
    prompt: "Was the chord played all at once, or one note at a time?",
    sound: blk ? chordSound(ps, inst, 3, 80) : melody([...ps, ps[0] + 12], [0.5, 0.5, 0.5, 1.5], inst, 92),
    options: [opt("block", "All at once — a block chord"), opt("broken", "One at a time — a broken chord (arpeggio)")],
    answer: blk ? "block" : "broken",
    skill: "u:chord:block-broken",
  });
});
const ROMAN_Q: Q[] = [
  { q: "In C major, I is the C chord. Which chord is IV?", a: "F", w: ["D", "G"], v: chordsPic(["I", "IV", "V"]), why: "Count up the scale: C(1) D(2) E(3) F(4)." },
  { q: "In C major, which chord is V?", a: "G", w: ["F", "A"], v: chordsPic(["I", "IV", "V"]), why: "C(1) D(2) E(3) F(4) G(5)." },
  { q: "Which chord feels like HOME?", a: "I", w: ["IV", "V"] },
  { q: "Which chord most wants to move back to I?", a: "V", w: ["IV", "I"], why: "V is built on so; its notes lean hard toward do." },
  { q: "IV is built on which note of the scale?", a: "Fa — the 4th note", w: ["So — the 5th note", "Re — the 2nd note"] },
  { q: "V is built on which note of the scale?", a: "So — the 5th note", w: ["Fa — the 4th note", "Ti — the 7th note"] },
  { q: "In G major, which chord is IV?", a: "C", w: ["D", "A"], why: "G(1) A(2) B(3) C(4)." },
  { q: "In G major, which chord is V?", a: "D", w: ["C", "E"], why: "G(1) A(2) B(3) C(4) D(5)." },
  { q: "In F major, which chord is V?", a: "C", w: ["B♭", "G"], why: "F(1) G(2) A(3) B♭(4) C(5)." },
  { q: "In F major, which chord is IV?", a: "B♭", w: ["C", "A"], why: "F(1) G(2) A(3) B♭(4) — F major has a B♭!" },
];
const romanQ = quiz("g4-roman-q", "u:chord:roman", ROMAN_Q, 4);
const IIVV = [["I", "IV", "V", "I"], ["I", "V", "IV", "I"], ["I", "IV", "I", "V"], ["I", "I", "IV", "V"], ["I", "V", "I", "IV"], ["I", "IV", "IV", "V"], ["I", "V", "V", "I"], ["I", "IV", "V", "V"]];
const progMatch = T("g4-prog-match", (r, d) => chordsMatch("Listen to the chords, then put the I, IV and V cards in the order you hear.", d < 0.7 ? [...pick(r, IIVV)] : [...pick(r, IIVV), ...pick(r, IIVV.slice(0, 2))], { tonic: pick(r, [60, 55, 53]), palette: ["I", "IV", "V"], beat: d > 0.4 }, "u:progression:match"));
const homeAway = T("g4-home-away", (r) => {
  const home = r() < 0.5;
  const prog = home ? pick(r, [["I", "IV", "V", "I"], ["I", "V", "V", "I"], ["I", "IV", "IV", "I"], ["I", "V", "IV", "I"]]) : pick(r, [["I", "IV", "I", "V"], ["I", "I", "IV", "V"], ["I", "IV", "V", "V"], ["I", "V", "IV", "V"]]);
  return listen({
    prompt: "Does this music end at HOME (on I), or stop AWAY from home (on V), wanting more?",
    sound: progSound(prog, pick(r, [60, 55, 62]), "major", 92),
    options: [opt("home", "Home — it ends on I", { emoji: "🏠" }), opt("away", "Away — it ends on V and wants more", { emoji: "⛵" })],
    answer: home ? "home" : "away",
    skill: "u:progression:ear",
    why: home ? "It lands on I — finished, like sailing home." : "It stops on V — like a question waiting for its answer.",
  });
});
const ROOTS: Record<string, string> = { I: "C", IV: "F", V: "G" };
const bassRoot = T("g4-bass-root", (r) => {
  const prog = pick(r, IIVV);
  const wrong = shuffle(r, IIVV.filter((x) => x.join() !== prog.join())).slice(0, 2);
  return listen({
    prompt: "Listen to the low bass under the chords. Which notes does the bass play?",
    sound: progression(prog, 60, "major", { bpm: 88, per: 2, inst: "piano", style: "pad", bass: true }),
    options: shuffle(r, [prog, ...wrong]).map((p) => opt(p.join("-"), p.map((x) => ROOTS[x]).join(" – "))),
    answer: prog.join("-"),
    skill: "u:chord:bass",
    layout: "list",
    why: "The bass plays each chord's root: C under I, F under IV, G under V.",
  });
});
const FIT_TUNES: Record<string, number[][]> = { I: [[64, 67, 72, 67], [60, 64, 67, 64], [67, 64, 60, 64]], IV: [[65, 69, 72, 69], [72, 69, 65, 69], [69, 72, 69, 65]], V: [[67, 71, 74, 71], [74, 71, 67, 71], [71, 74, 71, 67]] };
const chordFit = T("g4-chord-fit", (r, d) => {
  const ch = pick(r, ["I", "IV", "V"]);
  const mel = pick(r, FIT_TUNES[ch]);
  const label = (x: string) => (d < 0.5 ? `${x} (${{ I: "C–E–G", IV: "F–A–C", V: "G–B–D" }[x]})` : x);
  return listen({
    prompt: "All of these melody notes belong to ONE chord. Which chord fits under them?",
    sound: melody(mel, 1, "flute", 96),
    show: staffShow(mel.map((p) => ({ p, d: 1 }))),
    options: ["I", "IV", "V"].map((x) => opt(x, label(x))),
    answer: ch,
    skill: "u:chord:fit",
    why: `Those notes spell the ${ch} chord: ${{ I: "C, E and G", IV: "F, A and C", V: "G, B and D" }[ch]}.`,
  });
});
const PROG_BUILDS: { prompt: string; rules: ChordRule[]; bars: number }[] = [
  { prompt: "Write a 4-chord progression that starts on I, ends on I, and uses both IV and V.", rules: [{ rule: "start", chord: "I" }, { rule: "end", chord: "I" }, { rule: "use", chords: ["IV", "V"] }], bars: 4 },
  { prompt: "End with V → I — an authentic cadence, the strongest “The End” in music.", rules: [{ rule: "start", chord: "I" }, { rule: "cadence", kind: "authentic" }], bars: 4 },
  { prompt: "End with IV → I — the gentle “A-men” ending (a plagal cadence).", rules: [{ rule: "start", chord: "I" }, { rule: "cadence", kind: "plagal" }], bars: 4 },
  { prompt: "Make it sound unfinished: start on I, use IV, and END on V (a half cadence).", rules: [{ rule: "start", chord: "I" }, { rule: "use", chords: ["IV"] }, { rule: "end", chord: "V" }], bars: 4 },
  { prompt: "Write an 8-bar progression: start on I, use IV, and finish with V → I.", rules: [{ rule: "start", chord: "I" }, { rule: "use", chords: ["IV"] }, { rule: "cadence", kind: "authentic" }], bars: 8 },
];
const progBuild = T("g4-prog-build", (r, d) => {
  const v = pick(r, PROG_BUILDS.filter((_, i) => d >= 0.5 || i < 4));
  return chordsBuild(v.prompt, v.bars, v.rules, { palette: ["I", "IV", "V"] }, "u:progression:build");
});
const coveBacking = () => progression(["I", "IV", "V", "I"], 60, "major", { bpm: 96, per: 2, inst: "piano", style: "strum", bass: true, drums: "pop" });
const COVE: Make[] = [
  () => compose({ prompt: "Write a melody over I – IV – V – I. Start on E (a note of the C chord) and end on C.", pitches: CMAJ, slots: 8, dur: 1, bpm: 96, rules: [{ rule: "start", p: 64 }, { rule: "end", p: 60 }, { rule: "notes", min: 6 }], tonic: 60, inst: "marimba", labels: "letters", backing: coveBacking() }, "u:compose:chords"),
  () => compose({ prompt: "Use all three chord roots — C, F and G — somewhere in your tune, and end on C.", pitches: CMAJ, slots: 8, dur: 1, bpm: 96, rules: [{ rule: "use", pitches: [60, 65, 67] }, { rule: "end", p: 60 }, { rule: "notes", min: 6 }], tonic: 60, inst: "flute", labels: "letters", backing: coveBacking() }, "u:compose:chords"),
  () => compose({ prompt: "Make a motif: your first 2 notes come back again later in the tune. End on do.", pitches: CMAJ, slots: 8, dur: 1, bpm: 96, rules: [{ rule: "repeat", len: 2 }, { rule: "end", p: 60 }, { rule: "notes", min: 6 }], tonic: 60, inst: "piano", labels: "solfege", backing: coveBacking() }, "u:compose:chords"),
];
const coveCompose = variants("g4-cove-compose", COVE);
const POP_ROWS: DrumId[] = ["kick", "snare", "hat"];
const POP_BEATS: string[][] = [["x...x...", "..x...x.", "x.x.x.x."], ["x..xx...", "..x...x.", "xxxxxxxx"], ["x...x.x.", "..x...x.", "x.x.x.x."]];
const COVE_BEAT: Make[] = [
  () => beatlab("make", "Pop beat! Kick on beats 1 and 3, snare on 2 and 4, and keep the hi-hat going (at least 6 hits).", POP_ROWS, 8, 100, { rules: [{ rule: "on", row: "kick", steps: [0, 4] }, { rule: "on", row: "snare", steps: [2, 6] }, { rule: "count", row: "hat", min: 6 }] }, "u:beatmaking:pop"),
  (r) => beatlab("copy", "Listen to this pop beat and build it in the Beat Lab.", POP_ROWS, 8, 100, { target: [...pick(r, POP_BEATS)] }, "u:beatmaking:pop"),
];
const coveBeat = variants("g4-cove-beat", COVE_BEAT);

const TRIAD_IDEA = idea("Stack the thirds", [
  frame("A chord is three or more notes played together. The simplest chord is a TRIAD: three notes.", staffShow([{ p: TRI_C, d: 4 }]), chordSound(TRI_C, "piano", 3, 70)),
  frame("Build it by skipping: C, (skip D) E, (skip F) G. Each skip is a 3rd — so we say we stack thirds.", keysShow(60, 72, TRI_C), arpeggio(TRI_C, "piano", 90)),
  frame("The bottom note is the ROOT (it names the chord), then the 3rd, then the 5th. On the staff they stack all-lines or all-spaces, like a snowman.", staffShow([{ p: TRI_C, d: 2 }, { p: TRI_F, d: 2 }, { p: TRI_G, d: 2 }]), chain([chordSound(TRI_C, "piano", 2, 80), chordSound(TRI_F, "piano", 2, 80), chordSound(TRI_G, "piano", 2, 80)], 0)),
  frame("Play it all at once (a block chord) or one note at a time (a broken chord, or arpeggio). Try some chords!", keysShow(60, 72, TRI_C), then(chordSound(TRI_C, "piano", 2, 90), arpeggio(TRI_C, "harp", 90), 0.5), "keys", CMAJ),
], "u:chord:idea");
const ROMAN_IDEA = idea("I, IV and V", [
  frame("Build a triad on every note of the scale and number them with Roman numerals: I, ii, iii, IV, V, vi, vii°.", chordsPic(["I", "ii", "iii", "IV", "V", "vi", "vii°"]), progSound(["I", "ii", "iii", "IV", "V", "vi", "vii°", "I"], 60, "major", 120)),
  frame("Three are the strongest: I (built on do), IV (on fa) and V (on so). In C major that's C, F and G.", chordsPic(["I", "IV", "V"]), progSound(["I", "IV", "V", "I"], 60, "major", 84)),
  frame("I is HOME. V is the farthest from home and wants to go back — hear how V → I sounds finished?", chordsPic(["I", "IV", "V", "I"]), progSound(["I", "V", "I", "V", "V", "I"], 60, "major", 100)),
  frame("With just I, IV and V you can play thousands of songs: folk songs, hymns, the blues, rock and roll!", chordsPic(["I", "IV", "I", "V"]), progression(["I", "IV", "I", "V"], 60, "major", { bpm: 112, per: 4, inst: "guitar", style: "strum", bass: true, drums: "country" })),
], "u:progression:idea");
const BASS_IDEA = idea("The bass line", [
  frame("Under the chords, the bass usually plays the ROOT — the note each chord is named after.", chordsPic(["I", "IV", "V", "I"]), progression(["I", "IV", "V", "I"], 60, "major", { bpm: 92, per: 2, inst: "piano", style: "block", bass: true })),
  frame("Listen to the bass on its own: C… F… G… C. It walks the progression from underneath.", { show: "staff", clef: "bass", notes: [{ p: 48, d: 2 }, { p: 53, d: 2 }, { p: 55, d: 2 }, { p: 48, d: 2 }] }, melody([48, 53, 55, 48], 2, "bass", 92)),
  frame("A melody note fits a chord when it's one of the chord's notes. Over the C chord (C–E–G), sing C, E or G!", keysShow(60, 72, TRI_C), layer(chordSound(TRI_C, "piano", 4, 92), melody([64, 67, 72, 67], 1, "flute", 92))),
], "u:chord:idea");
const COVE_IDEA = idea("Songs start with chords", [
  frame("Many songwriters start with the chords, then find a melody that floats on top.", chordsPic(["I", "IV", "V", "I"]), coveBacking()),
  frame("Chord notes sound best on the strong beats; the notes in between can step to get there. Write a progression, a melody and a beat!", keysShow(60, 72, CMAJ), layer(coveBacking(), melody([64, 65, 69, 67, 67, 62, 64, 60], 1, "marimba", 96))),
], "u:compose:idea");

const COVE_W: WorldDef = {
  id: "g4-chord-cove",
  title: "Chord Cove",
  emoji: "🎹",
  grade: "4",
  blurb: "Stack thirds into triads, meet the mighty I, IV and V, and write a melody over real chords.",
  talk: ["Why do you think so many songs use the same three chords (I, IV and V)?", "Hum the last note of a song you know. Does it sound like home?"],
  challenge: "Listen to a song with a grown-up and raise your hand every time you think the chord changes.",
  stages: [
    {
      title: "Stack the thirds",
      emoji: "⛄",
      levels: 1,
      topics: [triadQ, triadBuild, blockArp],
      fixed: (r) => [TRIAD_IDEA, triadQ.gen(r, 0), triadBuild.gen(r, 0), blockArp.gen(r, 0.2), triadQ.gen(r, 0.3), triadBuild.gen(r, 0.3), triadQ.gen(r, 0.6)],
    },
    {
      title: "I, IV and V",
      emoji: "🏠",
      levels: 2,
      topics: [romanQ, progMatch, homeAway, triadBuild],
      fixed: teach((r) => [ROMAN_IDEA, homeAway.gen(r, 0)], [romanQ, progMatch, homeAway, triadBuild]),
      unlocks: ["tool:chords"],
    },
    {
      title: "Bass & harmony",
      emoji: "🎸",
      levels: 2,
      topics: [bassRoot, chordFit, progBuild, progMatch],
      fixed: teach((r) => [BASS_IDEA, bassRoot.gen(r, 0)], [progBuild, chordFit, triadBuild, bassRoot, progMatch, romanQ]),
      unlocks: ["tool:bass"],
    },
    {
      title: "Cove composer",
      emoji: "🎼",
      levels: 1,
      topics: [coveCompose, coveBeat, progBuild],
      unlocks: ["groove:pop"],
      fixed: (r) => [COVE_IDEA, chordsBuild(PROG_BUILDS[0].prompt, 4, PROG_BUILDS[0].rules, { palette: ["I", "IV", "V"] }, "u:progression:build"), COVE[0](r), COVE_BEAT[0](r), COVE[1](r), progMatch.gen(r, 0.6), homeAway.gen(r, 0.5)],
    },
  ],
};

// ── Tempo Terms Tower: Italian tempo and dynamics words — and conducting them ──────────────────
const TW = TEMPO_WORDS;
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const midBpm = (i: number) => Math.round((TW[i].lo + TW[i].hi) / 2);
const TEMPO_Q: Q[] = [
  ...TW.map((w, i): Q => ({ q: `What does ${w.word} mean?`, a: cap(w.kid), w: [cap(TW[(i + 2) % 6].kid), cap(TW[(i + 4) % 6].kid)], v: { show: "tempo", bpm: midBpm(i), word: w.word } })),
  ...TW.map((w, i): Q => ({ q: `A composer wants the music to be ${w.kid}. Which word should they write?`, a: w.word, w: [TW[(i + 2) % 6].word, TW[(i + 3) % 6].word] })),
  { q: "What does BPM stand for?", a: "Beats per minute", w: ["Bars per measure", "Bells per melody"], v: { show: "tempo", bpm: 60 } },
  { q: "A metronome set to 60 BPM clicks…", a: "Once every second", w: ["Twice every second", "Once every minute"], v: { show: "tempo", bpm: 60 } },
  { q: "Which is faster: Andante or Allegro?", a: "Allegro", w: ["Andante", "They're the same"] },
  { q: "Which is slower: Largo or Adagio?", a: "Largo", w: ["Adagio", "They're the same"] },
];
const tempoQ = quiz("g4-tempo-q", "u:tempo:terms", TEMPO_Q, 6);
const tempoTunes = (bpm: number): Score[] => [songScore("odetojoy", { n: 8, inst: "piano", bpm }), songScore("frere", { n: 8, inst: "marimba", bpm }), songScore("lightlyrow", { n: 6, inst: "flute", bpm })];
const tempoWordEar = T("g4-tempo-ear", (r, d) => {
  const i = pick(r, d < 0.5 ? [0, 2, 4, 5] : [0, 1, 2, 3, 4, 5]);
  const others = TW.map((_, k) => k).filter((k) => (d < 0.5 ? Math.abs(k - i) >= 2 : k !== i));
  const ids = shuffle(r, [i, ...pickN(r, others, 2)]);
  return listen({
    prompt: "Listen to the speed of the beat. Which tempo word fits?",
    sound: clicked(pick(r, tempoTunes(midBpm(i))), 8),
    options: ids.map((k) => opt(TW[k].word, d < 0.5 ? `${TW[k].word} — ${TW[k].kid}` : TW[k].word)),
    answer: TW[i].word,
    skill: `u:tempo:${TW[i].word.toLowerCase()}`,
    why: `That was about ${midBpm(i)} beats per minute — ${TW[i].word}, ${TW[i].kid}.`,
  });
});
const tempoOrder = T("g4-tempo-order", (r, d) => {
  const idx = pickN(r, [0, 1, 2, 3, 4, 5], d < 0.5 ? 3 : d < 0.8 ? 4 : 5).sort((a, b) => a - b);
  const slow = r() < 0.6;
  return order(slow ? "Put the tempo words in order from SLOWEST to fastest." : "Put the tempo words in order from FASTEST to slowest.", (slow ? idx : [...idx].reverse()).map((k) => TW[k].word), "u:tempo:order");
});
const DYN_Q: Q[] = [
  ...DYNAMICS.map((x, i): Q => ({ q: `What does ${x.mark} (${x.word}) mean?`, a: cap(x.kid), w: [cap(DYNAMICS[(i + 2) % 6].kid), cap(DYNAMICS[(i + 3) % 6].kid)], v: dynPic(x.mark as Dyn) })),
  { q: "Dynamics tell musicians…", a: "How loud or soft to play", w: ["How fast to play", "Which instrument plays"] },
  { q: "Which marking means very loud?", a: "ff", w: ["pp", "mf"], v: dynPic("pp", "p", "mp", "mf", "f", "ff") },
  { q: "Which is softer: mp or mf?", a: "mp", w: ["mf", "They're the same"], why: "mp = mezzo piano (medium soft); mf = mezzo forte (medium loud)." },
  { q: "Which is softer: p or pp?", a: "pp", w: ["p", "They're the same"], why: "pp = pianissimo, even softer than piano." },
  { q: "The opening hairpin (<) means…", a: "Crescendo — get gradually louder", w: ["Decrescendo — get gradually softer", "Speed up"], v: dynPic("cresc") },
  { q: "The closing hairpin (>) means…", a: "Decrescendo — get gradually softer", w: ["Crescendo — get gradually louder", "Slow down"], v: dynPic("decresc") },
  { q: "In music, “mezzo” means…", a: "Medium", w: ["Very", "Fast"] },
];
const dynQ = quiz("g4-dyn-q", "u:dynamics:terms", DYN_Q, 6);
const PHRASES: (() => Score)[] = [
  () => songScore("twinkle", { n: 7, inst: "piano", bpm: 100 }),
  () => songScore("lightlyrow", { n: 6, inst: "flute", bpm: 104 }),
  () => songScore("odetojoy", { n: 8, inst: "violin", bpm: 108 }),
  () => melody([60, 64, 67, 72, 67, 64, 60], [0.5, 0.5, 0.5, 1, 0.5, 0.5, 1.5], "trumpet", 100),
];
const dynEar = T("g4-dyn-ear", (r, d) => {
  const ph = pick(r, PHRASES)();
  const kind = pick(r, ["up", "down", "same"] as const);
  const lo = d < 0.5 ? 0.18 : 0.35;
  const hi = d < 0.5 ? 1 : 0.85;
  const [a, b] = kind === "up" ? [lo, hi] : kind === "down" ? [hi, lo] : pick(r, [[lo, lo], [hi, hi]]);
  return listen({
    prompt: "The same phrase plays twice. What happens to the dynamics?",
    sound: then(at(ph, a), at(ph, b), 0.5),
    options: [opt("up", "Soft, then loud (p → f)", { show: dynPic("p", "f") }), opt("down", "Loud, then soft (f → p)", { show: dynPic("f", "p") }), opt("same", "The same both times")],
    answer: kind,
    skill: "u:dynamics:contrast",
  });
});
const hairpinEar = T("g4-hairpin-ear", (r) => {
  const up = r() < 0.5;
  const ph = pick(r, PHRASES)();
  return listen({
    prompt: "Is the music getting louder or softer?",
    sound: up ? hairpin(ph, 0.12, 1) : hairpin(ph, 1, 0.12),
    options: [opt("cresc", "Crescendo — getting louder", { show: dynPic("cresc") }), opt("decresc", "Decrescendo — getting softer", { show: dynPic("decresc") })],
    answer: up ? "cresc" : "decresc",
    skill: "u:dynamics:hairpin",
  });
});
const dynOrder = T("g4-dyn-order", (r, d) => {
  const idx = pickN(r, [0, 1, 2, 3, 4, 5], d < 0.5 ? 3 : d < 0.8 ? 4 : 5).sort((a, b) => a - b);
  const loud = r() < 0.35;
  return order(loud ? "Put the dynamics in order from LOUDEST to softest." : "Put the dynamics in order from SOFTEST to loudest.", (loud ? [...idx].reverse() : idx).map((k) => `${DYNAMICS[k].mark} — ${DYNAMICS[k].word}`), "u:dynamics:order");
});
const RAMPS: (() => Score)[] = [
  () => clicked(chain([songScore("frere", { n: 8, inst: "marimba", bpm: 100 }), songScore("frere", { n: 8, inst: "marimba", bpm: 100 })], 0), 16),
  () => clicked(chain([songScore("odetojoy", { n: 8, inst: "piano", bpm: 100 }), songScore("odetojoy", { n: 8, inst: "piano", bpm: 100 })], 0), 16),
  () => clicked(melody([...CMAJ, ...[...CMAJ].reverse()], 1, "xylophone", 100), 16),
];
const tempoChangeEar = T("g4-accel-ear", (r, d) => {
  const kind = pick(r, d < 0.4 ? (["accel", "rit"] as const) : (["accel", "rit", "steady"] as const));
  const base = pick(r, RAMPS)();
  return listen({
    prompt: "Listen to the clicks. Is the tempo changing?",
    sound: kind === "accel" ? tempoRamp(base, 1.8) : kind === "rit" ? tempoRamp(base, 0.55) : base,
    options: [opt("accel", "Accelerando — speeding up"), opt("rit", "Ritardando — slowing down"), opt("steady", "Steady — the same tempo all the way")],
    answer: kind,
    skill: "u:tempo:change",
  });
});
const ACCEL_Q: Q[] = [
  { q: "What does accelerando (accel.) mean?", a: "Gradually get faster", w: ["Gradually get slower", "Suddenly stop"] },
  { q: "What does ritardando (rit.) mean?", a: "Gradually slow down", w: ["Gradually speed up", "Get louder"] },
  { q: "Where do you most often see “rit.” in a piece?", a: "Near the end", w: ["In the very first bar", "Nowhere — it's very rare"] },
  { q: "Grieg's “In the Hall of the Mountain King” keeps getting faster. That's an…", a: "Accelerando", w: ["Adagio", "Ritardando"] },
  { q: "Which of these words is a tempo CHANGE (not one steady speed)?", a: "Ritardando", w: ["Andante", "Allegro"] },
  { q: "Accelerando is about speed. Crescendo is about…", a: "Loudness", w: ["Speed", "Pitch"] },
];
const accelQ = quiz("g4-accel-q", "u:tempo:change-words", ACCEL_Q, 3);
const BANDS: ((bpm: number) => Score)[] =[(bpm) => piece("march", { bpm }), (bpm) => songScore("odetojoy", { inst: "strings", bpm }), (bpm) => piece("minuet", { bpm }), (bpm) => piece("country", { bpm })];
const conductWord = (r: Rng, i: number): Activity => {
  const w = TW[i];
  const start = w.lo >= 110 ? pick(r, [72, 84]) : pick(r, [132, 144]);
  return conduct(`The marking says ${w.word} — ${w.kid}. Tap the baton to lead the band at that tempo!`, { tempo: [w.lo, w.hi] }, pick(r, BANDS)(start), "u:conduct:tempo", w.word);
};
const conductTempo = T("g4-conduct-tempo", (r, d) => conductWord(r, pick(r, d < 0.5 ? [1, 2, 4] : [0, 1, 2, 4])));
const DYN_GOALS: { mark: Dyn; word: string; goal: [number, number] }[] = [
  { mark: "f", word: "forte", goal: [0.75, 1] },
  { mark: "p", word: "piano", goal: [0.12, 0.4] },
  { mark: "ff", word: "fortissimo", goal: [0.88, 1] },
  { mark: "pp", word: "pianissimo", goal: [0, 0.22] },
];
const conductDynAct = (r: Rng, g: (typeof DYN_GOALS)[number]): Activity => conduct(`The marking is ${g.mark} (${g.word}). ${g.goal[0] > 0.5 ? "Raise your hand — make the band LOUD!" : "Lower your hand — bring the band down soft."}`, { dyn: g.goal }, pick(r, BANDS)(pick(r, [100, 112])), "u:conduct:dynamics", g.mark);
const conductDyn = T("g4-conduct-dyn", (r, d) => conductDynAct(r, pick(r, d < 0.5 ? DYN_GOALS.slice(0, 2) : DYN_GOALS)));
const CONGA_ROWS: DrumId[] = ["kick", "conga", "shaker"];
const CONGA_BEATS: string[][] = [["x...x...", "..x..xx.", "xxxxxxxx"], ["x...x...", "x.xx.x.x", "........"], ["x.......", ".x.x.x.x", "x.x.x.x."]];
const CONGA: Make[] = [
  () => beatlab("make", "Allegro! Make a fast conga groove: kick on beats 1 and 3, and at least 4 conga hits.", CONGA_ROWS, 8, 132, { rules: [{ rule: "on", row: "kick", steps: [0, 4] }, { rule: "count", row: "conga", min: 4 }] }, "u:beatmaking:conga"),
  () => beatlab("make", "Adagio! A slow, calm groove with space in it: 2 to 4 conga hits and at least one shaker.", CONGA_ROWS, 8, 66, { rules: [{ rule: "count", row: "conga", min: 2, max: 4 }, { rule: "count", row: "shaker", min: 1 }] }, "u:beatmaking:conga"),
  (r) => beatlab("copy", "Listen to the conga player and copy the pattern.", CONGA_ROWS, 8, 116, { target: [...pick(r, CONGA_BEATS)] }, "u:beatmaking:conga"),
];
const congaBeat = variants("g4-conga-beat", CONGA);
const TOWER_COMPOSE: Make[] = [
  () => compose({ prompt: "Write a LARGO lullaby: very slow, with room to breathe — at least two rests, no more than 6 notes, ending on do.", pitches: C_PENTA, slots: 8, dur: 1, bpm: 56, rules: [{ rule: "end", p: 60 }, { rule: "notes", min: 4, max: 6 }, { rule: "rests", min: 2 }], tonic: 60, inst: "harp", labels: "solfege", backing: progression(["I", "IV", "I", "V"], 60, "major", { bpm: 56, per: 2, inst: "pad", style: "pad" }) }, "u:compose:tempo"),
  () => compose({ prompt: "Write an ALLEGRO dance: fast and bright! Use at least 7 notes and end on high do.", pitches: CMAJ, slots: 8, dur: 1, bpm: 138, rules: [{ rule: "end", p: 72 }, { rule: "notes", min: 7 }], tonic: 60, inst: "xylophone", labels: "solfege", backing: progression(["I", "V", "IV", "V"], 60, "major", { bpm: 138, per: 2, inst: "piano", style: "pulse", bass: true, drums: "pop" }) }, "u:compose:tempo"),
];
const towerCompose = variants("g4-tower-compose", TOWER_COMPOSE);

const tempoDemo = (bpm: number) => songScore("odetojoy", { n: 8, inst: "piano", bpm });
const TEMPO_IDEA = idea("Speed words", [
  frame("Composers write the tempo in Italian above the music. A metronome measures it in beats per minute (BPM).", { show: "tempo", bpm: 96, word: "Andante" }, clicked(tempoDemo(96), 8)),
  frame("Slow: LARGO (very slow and broad), then ADAGIO (slow and calm).", { show: "tempo", bpm: 56, word: "Largo" }, then(clicked(tempoDemo(56), 8), clicked(tempoDemo(72), 8), 0.5)),
  frame("In the middle: ANDANTE (a walking pace) and MODERATO (medium).", { show: "tempo", bpm: 96, word: "Andante" }, then(clicked(tempoDemo(92), 8), clicked(tempoDemo(114), 8), 0.5)),
  frame("Fast: ALLEGRO (fast and bright) and PRESTO (very, very fast!).", { show: "tempo", bpm: 176, word: "Presto" }, then(clicked(tempoDemo(138), 8), clicked(tempoDemo(180), 8), 0.5)),
], "u:tempo:idea");
const SUR_P = [60, 60, 64, 64, 67, 67, 64, 65, 65, 62, 62, 59, 59, 55];
const SUR_D = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1];
/** Haydn, Symphony No. 94 “Surprise” (1791): a quiet tune, the same tune even quieter… then BANG. */
function surprise(bpm = 100): Score {
  const a = melody(SUR_P, SUR_D, "strings", bpm);
  const bang: Score = { bpm, tracks: [{ kind: "notes", inst: "strings", notes: [{ p: [43, 55, 59, 62, 67], d: 2, v: 1 }] }, { kind: "notes", inst: "timpani", notes: [{ p: 43, d: 2, v: 1 }] }] };
  return chain([at(a, 0.45), at(a, 0.18), bang], 0);
}
const DYN_IDEA = idea("Loud and soft words", [
  frame("Dynamics tell you how loud or soft to play — in Italian too. Piano (p) means soft; forte (f) means loud.", dynPic("p", "f"), then(at(PHRASES[0](), 0.3), at(PHRASES[0](), 0.95), 0.5)),
  frame("Add mezzo (medium) and the extremes: pp, p, mp, mf, f, ff — from very soft to very loud.", dynPic("pp", "p", "mp", "mf", "f", "ff"), chain(DYNAMICS.map((x) => at(melody([60, 64, 67], [0.5, 0.5, 1], "piano", 112), x.gain)), 0)),
  frame("A crescendo (<) grows louder; a decrescendo (>) fades away.", dynPic("cresc", "decresc"), then(hairpin(PHRASES[2](), 0.15, 1), hairpin(PHRASES[2](), 1, 0.15), 0.5)),
  frame("Haydn wrote a quiet melody, repeated it even quieter… then a sudden FORTISSIMO chord to wake everyone up. It's called the Surprise Symphony!", dynPic("p", "pp", "ff"), surprise()),
], "u:dynamics:idea");
const mountainKing = () => {
  const mk = songScore("mountainking", { inst: "bassoon", bpm: 104 });
  return tempoRamp(hairpin(chain([mk, onInst(mk, "strings")], 0), 0.3, 1), 1.9);
};
const ACCEL_IDEA = idea("Speeding up, slowing down", [
  frame("ACCELERANDO (accel.) means gradually get faster.", { show: "tempo", bpm: 140, word: "accel." }, tempoRamp(RAMPS[2](), 1.8)),
  frame("RITARDANDO (rit.) means gradually slow down — you'll often see it near the end of a piece.", { show: "tempo", bpm: 60, word: "rit." }, tempoRamp(clicked(songScore("twinkle", { n: 14, inst: "piano", bpm: 120 }), 16), 0.55)),
  frame("Grieg's “In the Hall of the Mountain King” (1875) starts slow and soft, then speeds up and grows louder until the trolls are chasing Peer Gynt!", instShow("bassoon", "strings"), mountainKing()),
], "u:tempo:idea");
const MAESTRO_IDEA = idea("You're the maestro", [
  frame("A conductor keeps the whole orchestra together: the baton shows the TEMPO, the other hand shows the DYNAMICS.", instShow("strings", "trumpet", "timpani"), piece("fanfare")),
  frame("Tap a steady beat to set the speed. Raise your hand for forte, lower it for piano. The band follows YOU — then compose music with a tempo of its own.", dynPic("p", "cresc", "f"), hairpin(piece("march", { bpm: 104 }), 0.25, 1)),
], "u:conduct:idea");

const TOWER: WorldDef = {
  id: "g4-tempo-tower",
  title: "Tempo Terms Tower",
  emoji: "🗼",
  grade: "4",
  blurb: "Largo to Presto, pianissimo to fortissimo — learn the Italian words, then conduct the band yourself.",
  talk: ["What tempo word fits the way you walk to school? The way you run at recess?", "Can you think of a movie scene where the music gets louder and louder (a crescendo)?"],
  challenge: "Put on a song and conduct it in the kitchen: tap the beat, and make your hand big for the loud parts and small for the soft parts.",
  stages: [
    {
      title: "Speed words",
      emoji: "⏱️",
      levels: 1,
      topics: [tempoQ, tempoWordEar, tempoOrder, conductTempo],
      fixed: (r) => [TEMPO_IDEA, tempoQ.gen(r, 0), tempoWordEar.gen(r, 0.1), tempoOrder.gen(r, 0.2), conductWord(r, 2), tempoWordEar.gen(r, 0.4), tempoQ.gen(r, 0.5)],
    },
    {
      title: "Loud words",
      emoji: "📣",
      levels: 2,
      topics: [dynQ, dynEar, hairpinEar, dynOrder, conductDyn],
      fixed: teach((r) => [DYN_IDEA, dynEar.gen(r, 0)], [dynQ, dynEar, hairpinEar, dynOrder, conductDyn]),
    },
    {
      title: "Speed up, slow down",
      emoji: "🏃",
      levels: 2,
      topics: [tempoChangeEar, accelQ, tempoWordEar, conductTempo, hairpinEar],
      fixed: teach((r) => [ACCEL_IDEA, tempoChangeEar.gen(r, 0)], [accelQ, tempoChangeEar, conductTempo, dynOrder, tempoWordEar, tempoOrder]),
    },
    {
      title: "Maestro",
      emoji: "🪄",
      levels: 1,
      topics: [conductTempo, conductDyn, congaBeat, towerCompose],
      unlocks: ["drum:conga"],
      fixed: (r) => [
        MAESTRO_IDEA,
        conductWord(r, 1),
        conductDynAct(r, DYN_GOALS[0]),
        TOWER_COMPOSE[0](r),
        CONGA[0](r),
        conduct("Allegro AND forte! Tap a fast beat and raise your hand high.", { tempo: [121, 160], dyn: [0.75, 1] }, BANDS[0](88), "u:conduct:both", "Allegro"),
        TOWER_COMPOSE[1](r),
      ],
    },
  ],
};

// ── History Harbor: Baroque → Classical → Romantic, spirituals, gospel, ragtime and jazz ───────
/** Mozart, Eine kleine Nachtmusik (1787): the famous opening, violins with cellos underneath. */
function nachtmusik(bpm = 132): Score {
  const P = [67, null, 62, 67, null, 62, 67, 62, 67, 71, 74, 72, null, 69, 72, null, 69, 72, 69, 66, 69, 62];
  const D = [1, 0.5, 0.5, 1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 2, 1, 0.5, 0.5, 1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 2];
  const lo = melody(P.map((p) => (p === null ? null : p - 12)), D, "cello", bpm);
  return layer(melody(P, D, "violin", bpm), { ...lo, tracks: lo.tracks.map((t) => ({ ...t, vol: 0.6 })) });
}
/** The Twinkle tune, then a fancy variation in the spirit of Mozart's 12 Variations (about 1781). */
function mozartTwinkle(bpm = 108): Score {
  const UP: Record<number, number> = { 60: 62, 67: 69, 69: 71 };
  const DN: Record<number, number> = { 60: 59, 67: 65, 69: 67 };
  const run = [60, 60, 67, 67, 69, 69].flatMap((p) => [p, UP[p], p, DN[p]]);
  return then(songScore("twinkle", { n: 7, inst: "piano", bpm }), melody([...run, 67], [...run.map(() => 0.25), 2], "piano", bpm), 0.5);
}
type Era = { id: string; name: string; s: (r: Rng) => Score; why: string };
const EURO_ERAS: Era[] = [
  { id: "baroque", name: "Baroque (1600–1750)", s: () => piece("minuet"), why: "Busy, dance-like lines on a keyboard — the Baroque sound of Bach's time." },
  { id: "classical", name: "Classical (1750–1820)", s: (r) => (r() < 0.5 ? nachtmusik() : surprise()), why: "Clear, balanced melodies played by an orchestra — the Classical style of Haydn and Mozart." },
  { id: "romantic", name: "Romantic (1820–1900)", s: () => mountainKing(), why: "A big orchestra telling a story with huge feelings — Romantic music, like Grieg's trolls." },
];
const AMER_STYLES: Era[] = [
  { id: "spiritual", name: "Spiritual", s: () => songScore("saints", { inst: "choir", bpm: 126 }), why: "Voices singing a song of faith — a spiritual." },
  { id: "gospel", name: "Gospel", s: () => piece("gospel"), why: "Choir, organ and claps on beats 2 and 4 — gospel." },
  { id: "ragtime", name: "Ragtime", s: () => piece("ragtime"), why: "A bouncy, syncopated piano right hand over a steady left hand — ragtime." },
  { id: "jazz", name: "Jazz", s: () => piece("swing"), why: "Swinging rhythm, a walking bass and a saxophone — jazz." },
];
function eraListen(r: Rng, pool: Era[], n: number, prompt: string): Activity {
  const ans = pick(r, pool);
  const opts = shuffle(r, [ans, ...pickN(r, pool, n - 1, (x) => x.id === ans.id)]);
  return listen({ prompt, sound: ans.s(r), options: opts.map((x) => opt(x.id, x.name)), answer: ans.id, skill: `u:history:${ans.id}`, why: ans.why, layout: n > 3 ? "grid" : "row" });
}
const eraEar = T("g4-era-ear", (r, d) => eraListen(r, d < 0.4 ? EURO_ERAS.slice(0, 2) : EURO_ERAS, d < 0.4 ? 2 : 3, "Listen. Which era does this music come from?"));
const amerEar = T("g4-amer-ear", (r) => eraListen(r, AMER_STYLES, 3, "Listen. Which American style is this?"));
const COMPOSER_Q: Q[] = [
  { q: "Who wrote the Ode to Joy, in his Ninth Symphony (1824)?", a: "Ludwig van Beethoven", w: ["Wolfgang Amadeus Mozart", "Johann Sebastian Bach"] },
  { q: "Which composer kept writing music even after he became deaf?", a: "Beethoven", w: ["Haydn", "Grieg"] },
  { q: "Which composer was writing music by age 5 and wrote more than 600 works?", a: "Mozart", w: ["Bach", "Joplin"] },
  { q: "Who is called the “Father of the Symphony” — he wrote 104 of them?", a: "Joseph Haydn", w: ["Edvard Grieg", "Scott Joplin"] },
  { q: "Johann Sebastian Bach was famous for playing which instrument in church?", a: "The organ", w: ["The trumpet", "The violin"], v: instShow("organ") },
  { q: "Who wrote “In the Hall of the Mountain King”?", a: "Edvard Grieg, from Norway", w: ["Mozart, from Austria", "Bach, from Germany"] },
  { q: "Who was called the “King of Ragtime”?", a: "Scott Joplin", w: ["Louis Armstrong", "Beethoven"] },
  { q: "Which trumpet player from New Orleans became one of jazz's first big stars?", a: "Louis Armstrong", w: ["Scott Joplin", "Joseph Haydn"], v: instShow("trumpet") },
  { q: "Thomas A. Dorsey is called the “Father of…”", a: "Gospel music", w: ["The symphony", "Ragtime"] },
  { q: "Mahalia Jackson is known as the “Queen of…”", a: "Gospel", w: ["Ragtime", "Baroque music"] },
];
const composerQ = quiz("g4-composer-q", "u:composer:facts", COMPOSER_Q, 6);
const ERA_Q: Q[] = [
  { q: "In which era did melodies weave together on harpsichord and organ — the time of Bach?", a: "Baroque", w: ["Classical", "Romantic"] },
  { q: "In which era did the orchestra grow and the piano become popular — the time of Haydn and Mozart?", a: "Classical", w: ["Baroque", "Romantic"] },
  { q: "Which era loved huge orchestras, big feelings and music that tells a story?", a: "Romantic", w: ["Baroque", "Classical"] },
  { q: "Spirituals — songs of faith, hope and strength — were first created by…", a: "Enslaved African Americans", w: ["Royal court composers in Europe", "Rock bands in the 1950s"] },
  { q: "A leader sings a line and the group sings back an answer. This is called…", a: "Call and response", w: ["A round", "A solo"] },
  { q: "Ragtime got its name from its “ragged” rhythm. That rhythm is…", a: "Syncopated — accents between the beats", w: ["Very slow and smooth", "Always in 3/4"] },
  { q: "Jazz was born in which American city, in the early 1900s?", a: "New Orleans", w: ["Vienna", "London"] },
  { q: "Making up music on the spot, the way jazz players do, is called…", a: "Improvising", w: ["Conducting", "Memorizing"] },
  { q: "In 1871 the Fisk Jubilee Singers began touring the world, singing…", a: "Spirituals", w: ["Ragtime", "Operas"] },
  { q: "Gospel grew in Black churches in the 1920s and 30s by mixing hymns and spirituals with…", a: "The blues", w: ["Baroque fugues", "Marching-band music"] },
];
const eraFacts = quiz("g4-era-q", "u:history:eras", ERA_Q, 3);
const WORKS: [string, string][] = [["Bach", "Brandenburg Concertos"], ["Haydn", "The Surprise Symphony"], ["Mozart", "Eine kleine Nachtmusik"], ["Beethoven", "Ode to Joy"], ["Grieg", "Hall of the Mountain King"], ["Joplin", "The Entertainer"]];
const matchPiece = T("g4-match-piece", (r, d) => ({ kind: "match", prompt: "Match each composer to a famous piece.", pairs: pickN(r, WORKS, d < 0.5 ? 3 : 4).map(([a, b]) => ({ a: { id: a, text: a }, b: { id: b, text: b } })), mode: "columns", skill: "u:composer:works" }));
const eraOrder = T("g4-era-order", (r, d) =>
  r() < 0.5
    ? order("Put the musical eras in order, from oldest to newest.", ["Baroque", "Classical", "Romantic", "Ragtime & early jazz"], "u:history:timeline")
    : order("Put the composers in order of when they were born, oldest first.", (d < 0.5 ? ["Bach (1685)", "Haydn (1732)", "Mozart (1756)", "Beethoven (1770)", "Grieg (1843)", "Joplin (1868)"] : ["Bach", "Haydn", "Mozart", "Beethoven", "Grieg", "Joplin"]).filter((_, i, all) => i === 0 || i === all.length - 1 || r() < 0.6), "u:history:timeline"),
);
const CALLS = [[67, 69, 67, 64], [72, 69, 67, 69], [64, 67, 69, 67], [67, 67, 69, 72]];
const RESPS = [[64, 62, 60, 60], [67, 64, 62, 60], [62, 64, 60, 60]];
const callScore = (c: number[]) => melody(c, [0.5, 0.5, 1, 2], "trumpet", 100);
const respScore = (c: number[]) => melody(c, [1, 1, 1, 1], "choir", 100);
const FORMS = [["A", "B", "A", "B"], ["A", "A", "B", "B"], ["A", "B", "B", "A"], ["A", "A", "B", "A"]];
const callResponse = T("g4-call-resp", (r, d) => {
  const sections = { A: callScore(pick(r, CALLS)), B: respScore(pick(r, RESPS)) };
  const ord = [...pick(r, FORMS)];
  if (d < 0.5) return { kind: "form", mode: "build", prompt: "The leader's trumpet calls (A) and the choir answers (B). Drag the A and B blocks into the order you hear.", sections, order: ord, skill: "u:form:call-response" };
  const ans = ord.join("");
  return { kind: "form", mode: "label", prompt: "Leader (A), choir (B). What is the form?", sections, order: ord, options: shuffle(r, [ans, ...pickN(r, FORMS.map((f) => f.join("")), 2, (x) => x === ans)]), answer: ans, skill: "u:form:call-response" };
});
const callEcho = T("g4-call-echo", (r, d) => echo(r, { pool: ["ta", "titi", "taa", "z"], meter: [4, 4], bars: d < 0.5 ? 1 : 2, bpm: 92, drum: "conga", skill: "u:rhythm:call-response", prompt: "Call and response! Listen to the leader's call, then answer by tapping it right back." }));
const gospelBacking = () => progression(["I", "IV", "V", "I"], 60, "major", { bpm: 100, per: 2, inst: "organ", style: "strum", bass: true, drums: "gospel" });
const HIST_COMPOSE: Make[] = [
  () => compose({ prompt: "Call and response! The call is written for you (the first 4 notes). Write the response in the last 4 slots, and land home on do.", pitches: C_PENTA, slots: 8, dur: 1, bpm: 100, rules: [{ rule: "end", p: 60 }, { rule: "notes", min: 7 }], tonic: 60, inst: "organ", labels: "solfege", start: [67, 69, 67, 64, null, null, null, null], backing: gospelBacking() }, "u:compose:response"),
  () => compose({ prompt: "Play like a jazz saxophonist: write a lick with at least 2 rests (jazz players breathe!) and at least 5 notes, ending on C.", pitches: C_PENTA, slots: 8, dur: 1, bpm: 132, rules: [{ rule: "rests", min: 2 }, { rule: "notes", min: 5 }, { rule: "end", p: 60 }], tonic: 60, inst: "sax", labels: "letters", backing: progression(["ii7", "V7", "Imaj7", "Imaj7"], 60, "major", { bpm: 132, per: 2, inst: "piano", style: "block", bass: true, drums: "swing" }) }, "u:compose:jazz"),
];
const histCompose = variants("g4-hist-compose", HIST_COMPOSE);
const GOSPEL_ROWS: DrumId[] = ["kick", "clap", "tamb"];
const GOSPEL: Make[] = [
  () => beatlab("make", "Gospel groove: hand claps on beats 2 and 4, at least 2 kicks, and a tambourine shaking along (at least 4 hits).", GOSPEL_ROWS, 8, 92, { rules: [{ rule: "on", row: "clap", steps: [2, 6] }, { rule: "count", row: "kick", min: 2 }, { rule: "count", row: "tamb", min: 4 }] }, "u:beatmaking:gospel"),
  (r) => beatlab("copy", "Listen to the gospel band's groove and copy it.", GOSPEL_ROWS, 8, 92, { target: [...pick(r, [["x...x.x.", "..x...x.", "xxxxxxxx"], ["x..x..x.", "..x...x.", "x.x.x.x."]])] }, "u:beatmaking:gospel"),
];
const gospelBeat = variants("g4-gospel-beat", GOSPEL);

const BAROQUE_IDEA = idea("Baroque and Classical", [
  frame("BAROQUE era (1600–1750): Johann Sebastian Bach played the organ in church and wrote music where melodies weave together. This Minuet in G comes from a music notebook the Bach family made in 1725.", instShow("organ", "piano"), piece("minuet")),
  frame("CLASSICAL era (1750–1820): music became clear and balanced, the piano got popular, and the orchestra grew. Haydn wrote 104 symphonies — including this surprise!", instShow("violin", "cello", "timpani"), surprise()),
  frame("Mozart was composing by age 5. Here's the start of his Eine kleine Nachtmusik — “A Little Night Music” (1787).", instShow("violin", "cello"), nachtmusik()),
  frame("Mozart even wrote 12 variations on the tune we call “Twinkle, Twinkle”: first the theme, then a fancy version.", staffShow([60, 60, 67, 67, 69, 69, 67].map((p, i) => ({ p, d: i === 6 ? 2 : 1 }))), mozartTwinkle()),
], "u:history:idea");
const ROMANTIC_IDEA = idea("Romantic storms", [
  frame("Ludwig van Beethoven was the bridge from Classical to Romantic. He kept composing even after he lost his hearing. This is his “Für Elise.”", instShow("piano"), songScore("furelise", { inst: "piano", bpm: 66 })),
  frame("His Ninth Symphony (1824) ends with a choir singing the Ode to Joy. Singers in a symphony was a bold new idea!", instShow("choir", "strings"), songScore("odetojoy", { inst: "choir", bpm: 112, n: 15 })),
  frame("ROMANTIC era (1820–1900): huge orchestras, big feelings, and music that tells stories. Listen as Grieg's trolls get faster and louder…", instShow("bassoon", "strings", "timpani"), mountainKing()),
], "u:history:idea");
const SPIRIT_IDEA = idea("Spirituals to jazz", [
  frame("Spirituals are songs of faith, hope and strength, first created by enslaved African Americans in the 1700s and 1800s. “When the Saints Go Marching In” later became a New Orleans jazz favorite.", instShow("choir"), songScore("saints", { inst: "choir", bpm: 126 })),
  frame("Many spirituals use CALL AND RESPONSE: a leader sings a line and everyone answers — a tradition with roots in West Africa.", formPic("Call", "Response", "Call", "Response"), chain([callScore(CALLS[0]), respScore(RESPS[0]), callScore(CALLS[1]), respScore(RESPS[1])], 0)),
  frame("GOSPEL grew in Black churches in the 1920s and 30s. Thomas A. Dorsey mixed the blues with hymns: choirs, organ, and claps on beats 2 and 4!", instShow("choir", "organ"), piece("gospel")),
  frame("RAGTIME (1890s–1910s): Scott Joplin's “The Entertainer” has a syncopated, “ragged” right hand. Then JAZZ was born in New Orleans — swinging rhythm and improvising!", instShow("piano", "sax", "trumpet"), then(piece("ragtime"), piece("swing"), 1)),
], "u:history:idea");
const TIME_IDEA = idea("Time traveler", [
  frame("Every era borrowed from the one before it — and today's music borrows from all of them. Now it's your turn to add to the story.", picsShow("📜"), then(songScore("minuet", { n: 13, inst: "piano", bpm: 132 }), songScore("entertainer", { inst: "piano", bpm: 100 }), 1)),
  frame("Write a call and response for the organ, lay down a gospel groove, and improvise a jazz lick on the saxophone.", instShow("organ", "sax"), gospelBacking()),
], "u:compose:idea");

const HISTORY: WorldDef = {
  id: "g4-history-harbor",
  title: "History Harbor",
  emoji: "🏛️",
  grade: "4",
  blurb: "Sail through time: Bach, Haydn, Mozart and Beethoven, Grieg's trolls, spirituals, gospel, ragtime and jazz.",
  talk: ["Which era's music did you like best — Baroque, Classical, Romantic, or jazz? Why?", "Can you do a call and response together? One person sings a line, everyone sings an answer."],
  challenge: "Ask a grown-up what music they loved when they were your age, and listen to one song from it together.",
  stages: [
    {
      title: "Baroque & Classical",
      emoji: "🎻",
      levels: 1,
      topics: [eraEar, composerQ, eraFacts, matchPiece],
      unlocks: ["inst:organ"],
      fixed: (r) => [BAROQUE_IDEA, eraEar.gen(r, 0), composerQ.gen(r, 0), eraFacts.gen(r, 0), eraEar.gen(r, 0.2), matchPiece.gen(r, 0.3), composerQ.gen(r, 0.3)],
    },
    {
      title: "Romantic storms",
      emoji: "⛈️",
      levels: 1,
      topics: [eraEar, composerQ, matchPiece, eraOrder, eraFacts],
      fixed: teach((r) => [ROMANTIC_IDEA, eraEar.gen(r, 0.6)], [eraEar, composerQ, matchPiece, eraOrder, eraFacts]),
    },
    {
      title: "Spirituals to jazz",
      emoji: "🎺",
      levels: 2,
      topics: [callResponse, callEcho, amerEar, eraFacts, composerQ],
      fixed: teach((r) => [SPIRIT_IDEA, callResponse.gen(r, 0)], [callResponse, callEcho, amerEar, eraFacts, composerQ]),
    },
    {
      title: "Time traveler",
      emoji: "📜",
      levels: 1,
      topics: [histCompose, gospelBeat],
      unlocks: ["inst:sax"],
      fixed: (r) => [TIME_IDEA, HIST_COMPOSE[0](r), GOSPEL[0](r), HIST_COMPOSE[1](r), amerEar.gen(r, 0.6), eraOrder.gen(r, 0.6), callResponse.gen(r, 0.7)],
    },
  ],
};

// ── Studio 4: a whole song — verse and chorus, rhyming words, I–IV–V, melody and beat ──────────
const RHYME_Q: Q[] = [
  { q: "Which word rhymes with “boat”?", a: "note", w: ["boot", "ship"] },
  { q: "Which word rhymes with “sea”?", a: "free", w: ["sand", "sail"] },
  { q: "Which word rhymes with “night”?", a: "light", w: ["nest", "moon"] },
  { q: "Which word rhymes with “sky”?", a: "fly", w: ["skip", "cloud"] },
  { q: "Which word rhymes with “wave”?", a: "brave", w: ["wind", "wall"] },
  { q: "Which word rhymes with “shore”?", a: "more", w: ["shell", "sure"] },
  { q: "Which word rhymes with “song”?", a: "along", w: ["sing", "loud"] },
  { q: "Which word rhymes with “star”?", a: "far", w: ["stop", "sun"] },
  { q: "Which word rhymes with “beat”?", a: "feet", w: ["bat", "drum"] },
  { q: "Rhyming words end with the same…", a: "Sound", w: ["First letter", "Number of letters"], why: "Boat and note sound alike at the END — that's a rhyme." },
];
const rhymeQ4 = quiz("g4-rhyme-q", "u:lyrics:rhyme", RHYME_Q, 9);
const COUPLETS: { story: string; slots: { label: string; options: string[]; answer: string; why: string }[] }[] = [
  { story: "Our little boat is sailing far, / We steer it by the brightest ___. // The waves are high, the wind is strong, / We sing our happy sailing ___.", slots: [{ label: "Line 2 ends with…", options: ["star", "moon", "light"], answer: "star", why: "far / star — same ending sound." }, { label: "Line 4 ends with…", options: ["song", "tune", "hum"], answer: "song", why: "strong / song — a rhyme!" }] },
  { story: "The sun comes up, the sky is blue, / There's so much fun for me and ___. // We'll grab a drum and beat it loud, / And march along, so tall and ___.", slots: [{ label: "Line 2 ends with…", options: ["you", "them", "us"], answer: "you", why: "blue / you." }, { label: "Line 4 ends with…", options: ["proud", "big", "fast"], answer: "proud", why: "loud / proud." }] },
  { story: "A seagull flying way up high, / Is gliding through the summer ___. // It swoops and dives and calls to me, / Then flies away across the ___.", slots: [{ label: "Line 2 ends with…", options: ["sky", "air", "clouds"], answer: "sky", why: "high / sky." }, { label: "Line 4 ends with…", options: ["sea", "waves", "bay"], answer: "sea", why: "me / sea." }] },
  { story: "When stormy clouds are rolling in, / We hold on tight and wear a ___. // And when the rain is gone at last, / We say the storm has finally ___.", slots: [{ label: "Line 2 ends with…", options: ["grin", "coat", "smile"], answer: "grin", why: "in / grin." }, { label: "Line 4 ends with…", options: ["passed", "gone", "left"], answer: "passed", why: "last / passed." }] },
  { story: "I tap my feet, I clap my hands, / I join the biggest marching ___. // We keep the beat, we play as one, / And keep on going till we're ___.", slots: [{ label: "Line 2 ends with…", options: ["bands", "drums", "crowd"], answer: "bands", why: "hands / bands." }, { label: "Line 4 ends with…", options: ["done", "tired", "home"], answer: "done", why: "one / done." }] },
];
const rhymeSlots4 = T("g4-rhyme-slots", (r) => {
  const c = pick(r, COUPLETS);
  return { kind: "slots", prompt: "Finish the song lyric so the lines rhyme (AABB).", story: c.story, slots: c.slots.map((s) => ({ ...s, options: shuffle(r, s.options) })), skill: "u:lyrics:rhyme" };
});
const SONG_LINES: Line[] = [
  { syl: ["Sail", "ing", "a", "cross", "the", "sea"], durs: [1, 0.5, 0.5, 1, 1, 4], meter: [4, 4], pitches: [67, 64, 65, 67, 69, 72] },
  { syl: ["Stars", "come", "out", "and", "shine", "so", "bright"], durs: [1, 1, 1, 1, 1, 1, 2], meter: [4, 4], pitches: [60, 62, 64, 65, 67, 69, 72] },
  { syl: ["Sing", "it", "loud", "and", "sing", "it", "proud"], durs: [1, 1, 1, 1, 1, 1, 2], meter: [4, 4], pitches: [67, 67, 72, 71, 69, 67, 64] },
  { syl: ["Drums", "are", "beat", "ing", "feel", "the", "sound"], durs: [1, 1, 1, 1, 1, 1, 2], meter: [4, 4], pitches: [60, 60, 64, 64, 67, 65, 64] },
  { syl: ["Up", "the", "hill", "and", "down", "a", "gain"], durs: [1, 1, 1, 1, 1, 1, 2], meter: [4, 4], pitches: [60, 62, 64, 62, 60, 62, 60] },
  { syl: ["Moon", "light", "shines", "on", "wa", "ter", "blue"], durs: [1.5, 0.5, 1, 1, 1.5, 0.5, 2], meter: [4, 4], pitches: [72, 69, 67, 65, 64, 62, 60] },
];
const songStress = T("g4-song-stress", (r) => stressItem(pick(r, SONG_LINES), "u:lyrics:stress", 100));
const verseS = () => layer(progression(["I", "IV", "I", "V"], 60, "major", { bpm: 104, per: 1, inst: "piano", style: "block" }), melody([60, 62, 64, 62], 1, "flute", 104));
const chorusS = () => layer(progression(["IV", "V", "I", "I"], 60, "major", { bpm: 104, per: 1, inst: "piano", style: "block", drums: "pop" }), melody([72, 71, 69, 67], 1, "trumpet", 104));
const SONG_FORMS = [["Verse", "Chorus", "Verse", "Chorus"], ["Verse", "Chorus", "Chorus"], ["Chorus", "Verse", "Chorus"], ["Verse", "Verse", "Chorus", "Chorus"]];
const songForm4 = T("g4-song-form", (r) => ({ kind: "form", mode: "build", prompt: "The verse is soft and low; the chorus is big and bright, with drums. Drag the blocks into the order you hear.", sections: { Verse: verseS(), Chorus: chorusS() }, order: [...pick(r, SONG_FORMS)], skill: "u:form:verse-chorus" }));
const studioBacking = () => progression(["I", "IV", "V", "I"], 60, "major", { bpm: 100, per: 2, inst: "guitar", style: "strum", bass: true, drums: "pop" });
const STUDIO4: Make[] = [
  () => compose({ prompt: "Write the chorus tune for these words — one note per syllable. End on do so it sounds finished.", pitches: CMAJ, slots: 8, dur: 1, bpm: 100, rules: [{ rule: "end", p: 60 }, { rule: "notes", min: 8 }], tonic: 60, inst: "piano", labels: "solfege", backing: studioBacking(), lyric: ["Sail", "ing", "a", "cross", "the", "deep", "blue", "sea"] }, "u:compose:song"),
  () => compose({ prompt: "A tune for “Oh, stars come out and shine tonight!” Put the highest note in the middle — maybe on “shine” — and end on do.", pitches: CMAJ, slots: 8, dur: 1, bpm: 100, rules: [{ rule: "arch" }, { rule: "end", p: 60 }, { rule: "notes", min: 8 }], tonic: 60, inst: "marimba", labels: "solfege", backing: studioBacking(), lyric: ["Oh", "stars", "come", "out", "and", "shine", "to", "night"] }, "u:compose:song"),
  () => compose({ prompt: "Melody for “Come on, we'll sing it loud and proud!” Start on so and end on high do — a big finish.", pitches: CMAJ, slots: 8, dur: 1, bpm: 100, rules: [{ rule: "start", p: 67 }, { rule: "end", p: 72 }, { rule: "notes", min: 8 }], tonic: 60, inst: "trumpet", labels: "solfege", backing: studioBacking(), lyric: ["Come", "on", "we'll", "sing", "it", "loud", "and", "proud"] }, "u:compose:song"),
];
const studioCompose4 = variants("g4-studio-compose", STUDIO4);

const SONGPLAN_IDEA = idea("Plan a song", [
  frame("Most songs have VERSES (new words that tell the story) and a CHORUS (the catchy part that comes back again and again).", formPic("Verse", "Chorus", "Verse", "Chorus"), chain([verseS(), chorusS(), verseS(), chorusS()], 0)),
  frame("Rhyming words end with the same sound — far and star, loud and proud. Rhymes make lyrics easy to remember.", picsShow("🎤"), then(sing(SONG_LINES[2], "flute"), sing(SONG_LINES[1], "flute"), 0.5)),
  frame("In this studio you'll write a whole song: rhyming words, I–IV–V chords, a melody and a beat!", chordsPic(["I", "IV", "V", "I"]), layer(studioBacking(), melody([64, 65, 69, 67, 67, 62, 64, 60], 1, "piano", 100))),
], "u:lyrics:idea");
const RECORD_IDEA = idea("Record day", [
  frame("Every song is built from three layers: chords (the harmony), a melody (the tune you sing), and a beat (the drums).", chordsPic(["I", "IV", "V", "I"]), layer(studioBacking(), melody([67, 64, 65, 67, 69, 72, 71, 72], 1, "piano", 100))),
  frame("Put strong syllables on strong beats and the words will sing themselves. Ready? Record your song!", rhythmShow(["ta", "ti", "ti", "ta", "ta", "whole"], "notes", false), sing(SONG_LINES[0], "piano", 100)),
], "u:compose:idea");

const STUDIO_4: WorldDef = {
  id: "g4-studio-four",
  title: "Studio 4",
  emoji: "🎤",
  grade: "4",
  blurb: "Put it all together: rhyming lyrics, verse and chorus, I–IV–V chords, a melody and a beat.",
  talk: ["What's the catchiest chorus you know? Why do you think it sticks in your head?", "Make up a rhyming couplet together about something that happened today."],
  challenge: "Write two rhyming lines about your family, then sing them to a tune you made up.",
  stages: [
    {
      title: "Plan a song",
      emoji: "📝",
      levels: 1,
      topics: [rhymeQ4, songForm4, songStress, rhymeSlots4],
      fixed: (r) => [SONGPLAN_IDEA, rhymeQ4.gen(r, 0), songForm4.gen(r, 0), rhymeQ4.gen(r, 0.3), songStress.gen(r, 0.3), rhymeSlots4.gen(r, 0.4), progMatch.gen(r, 0.3)],
    },
    { title: "Rhymes & rhythm", emoji: "🎶", levels: 2, topics: [rhymeSlots4, songStress, songForm4, rhymeQ4, progMatch] },
    {
      title: "Record day",
      emoji: "🎧",
      levels: 1,
      topics: [studioCompose4, rhymeSlots4],
      fixed: (r) => [
        RECORD_IDEA,
        chordsBuild("Start your song with chords: 4 bars that begin on I, end on I, and use IV and V.", 4, [{ rule: "start", chord: "I" }, { rule: "end", chord: "I" }, { rule: "use", chords: ["IV", "V"] }], { palette: ["I", "IV", "V"], bpm: 100 }, "u:progression:build"),
        STUDIO4[0](r),
        COVE_BEAT[0](r),
        fitItem(SONG_LINES[5], "Fit your lyric to the tune: drag each syllable onto its note."),
        STUDIO4[2](r),
        rhymeSlots4.gen(r, 0.8),
      ],
    },
  ],
};

// ═══ 5th grade ══════════════════════════════════════════════════════════════════════════════════

// ── Major vs Minor Mines: the minor 3rd, the natural minor scale, relative keys, minor chords ──
const A_MIN = scale(57, "minor");
/** Major → parallel minor (in C): mi, la and ti come down a half step. */
const lowerMi = (p: number) => ([4, 9, 11].includes((((p - 60) % 12) + 12) % 12) ? p - 1 : p);
const MM_TUNES: { id: string; n: number; inst: InstId }[] = [{ id: "twinkle", n: 14, inst: "piano" }, { id: "frere", n: 14, inst: "marimba" }, { id: "odetojoy", n: 15, inst: "violin" }, { id: "lightlyrow", n: 13, inst: "flute" }, { id: "mary", n: 13, inst: "piano" }];
const mmPair = (t: (typeof MM_TUNES)[number], bpm = 112): [Score, Score] => {
  const s = songScore(t.id, { n: t.n, inst: t.inst, bpm });
  return [s, { ...s, tracks: s.tracks.map((tr) => (tr.kind === "notes" ? { ...tr, notes: tr.notes.map((x) => ({ ...x, p: typeof x.p === "number" ? lowerMi(x.p) : x.p })) } : tr)) }];
};
const mmEar = T("g5-mm-ear", (r) => majorMinor(r, { skill: "u:major-minor:ear" }));
const chordMM = T("g5-chord-mm", (r) => chordQualityEar(r, { qualities: ["maj", "min"], skill: "u:chord:quality" }));
const thirdEar = T("g5-third-ear", (r, d) => ({ ...intervalEar(r, { semis: [3, 4], harmonic: d > 0.5, skill: "u:interval:thirds" }), prompt: d > 0.5 ? "Two notes together: a major 3rd (bright) or a minor 3rd (dark)?" : "Major 3rd (bright) or minor 3rd (dark)?" }));
const minorScaleKeys = T("g5-minor-keys", (r, d) => {
  const [t, nm, hint] = pick(r, d < 0.4 ? ([[57, "A", " (all white keys — the same notes as C major!)"]] as [number, string, string][]) : ([[57, "A", ""], [64, "E", " It needs F♯."], [62, "D", " It needs B♭."]] as [number, string, string][]));
  return keysAct("scale", `Build the ${nm} natural minor scale: W H W W H W W.${hint}`, scale(t, "minor"), t - 2, t + 15, { given: [t], labels: d < 0.4 }, "u:keys:scale-minor");
});
const RELATIVE_Q: Q[] = [
  { q: "What is the relative minor of C major?", a: "A minor", w: ["C minor", "E minor"], v: keysShow(57, 72, A_MIN), why: "A minor uses exactly the same notes as C major — it just starts on A (la)." },
  { q: "A minor shares all of its notes with which major key?", a: "C major", w: ["A major", "G major"] },
  { q: "A natural minor scale follows which step pattern?", a: "W H W W H W W", w: ["W W H W W W H", "H W W H W W W"], v: keysShow(57, 72, A_MIN) },
  { q: "How is a minor 3rd different from a major 3rd?", a: "It's one half step smaller", w: ["It's one half step bigger", "It's an octave higher"], why: "C–E♭ (minor 3rd) spans 3 half steps; C–E (major 3rd) spans 4.", s: "u:interval:thirds" },
  { q: "What is the relative minor of G major?", a: "E minor", w: ["G minor", "D minor"], why: "Count down three half steps from G: G → F♯ → F → E. And both have one sharp, F♯." },
  { q: "What is the relative minor of F major?", a: "D minor", w: ["F minor", "A minor"], why: "Down three half steps from F: F → E → E♭ → D. Both have one flat, B♭." },
  { q: "To find a major key's relative minor, go from do down to…", a: "La — three half steps lower", w: ["So — five half steps lower", "Re — two half steps higher"] },
  { q: "Which note makes C minor sound different from C major first of all?", a: "E♭ instead of E", w: ["G♯ instead of G", "D♭ instead of D"], why: "The 3rd decides major or minor: C–E is major, C–E♭ is minor.", s: "u:major-minor:third" },
  { q: "E minor has one sharp in its key signature, just like…", a: "G major", w: ["E major", "D major"] },
  { q: "In solfège, a minor scale built from C major's notes starts on…", a: "La", w: ["Do", "Mi"] },
];
const relativeQ = quiz("g5-relative-q", "u:scale:relative", RELATIVE_Q, 4);
const mmVersion = T("g5-mm-version", (r) => {
  const [maj, min] = mmPair(pick(r, MM_TUNES));
  return listen({ prompt: "Here's the same tune two ways — major and minor. Which one is the MINOR version?", options: pair(r, ["minor", min], ["major", maj]), answer: "minor", skill: "u:major-minor:versions", why: "The minor version lowers mi (and la and ti) by a half step — it sounds darker." });
});
const moodMM = T("g5-mood-mm", (r) => {
  const minor = r() < 0.5;
  const id = pick(r, minor ? (["sad", "sneaky", "edm", "hiphop"] as const) : (["happy", "march", "country", "calm"] as const));
  return listen({ prompt: "Is this piece in a major key or a minor key?", sound: piece(id), options: [opt("major", "Major — bright"), opt("minor", "Minor — darker")], answer: minor ? "minor" : "major", skill: "u:mood:major-minor", why: minor ? "Its home chord is minor — that's what gives it the darker color." : "Its home chord is major — bright and open." });
});
const MINOR_FRAGS = [[57, 59, 60], [60, 59, 57], [57, 60, 64, 60], [65, 64, 62, 60], [64, 62, 60, 59, 57], [57, 59, 60, 62, 64], [64, 65, 64, 62, 60, 59, 57]];
const minorEcho = T("g5-minor-echo", (r, d) => {
  const read = d >= 0.6;
  return { kind: "melody", mode: read ? "read" : "echo", prompt: read ? "Read this A minor tune on the staff, then play it." : "An A minor tune — listen, then play it back on the piano.", notes: pick(r, MINOR_FRAGS.filter((f) => (d < 0.5 ? f.length <= 4 : f.length >= 4))), pads: A_MIN, inst: "piano", on: "keys", labels: read ? "none" : "letters", show: read ? "staff" : "none", clef: "treble", tonic: 57, bpm: 88, skill: "u:melody:minor" };
});
const MIN_ROOTS = [57, 62, 64, 60, 67, 65];
const minorChordBuild = T("g5-minor-build", (r, d) => {
  const root = pick(r, d < 0.5 ? MIN_ROOTS.slice(0, 3) : MIN_ROOTS);
  const ps = chordPitches(root, "min");
  const nm = `${noteName(root)} minor`;
  return keysAct("chord", `Build the ${nm} chord: the root, a minor 3rd (3 half steps up), then a 5th.`, ps, 48, 79, { labels: true, given: [root], octaveFree: true, why: `${nm} = ${ps.map((p) => noteName(p, { flats: true })).join(" – ")}.` }, "u:chord:build-min");
});
const MINOR_PROGS = [["i", "iv", "v", "i"], ["i", "iv", "i", "v"], ["i", "v", "iv", "i"], ["i", "i", "iv", "v"]];
const MINOR_PROGS2 = [["i", "VI", "VII", "i"], ["i", "VII", "VI", "VII"], ["i", "iv", "VI", "v"], ["i", "VI", "iv", "v"], ["i", "VI", "III", "VII"]];
const minorProgMatch = T("g5-minor-prog", (r, d) => chordsMatch("A minor: listen, then put the chord cards in the order you hear.", [...pick(r, d < 0.5 ? MINOR_PROGS : [...MINOR_PROGS, ...MINOR_PROGS2])], { tonic: 57, scale: "minor", palette: d < 0.5 ? ["i", "iv", "v"] : ["i", "III", "iv", "v", "VI", "VII"], bpm: 84 }, "u:progression:minor"));
const MINE_COMPOSE: Make[] = [
  () => compose({ prompt: "Compose a mine-cart melody in A minor: start and end on A, and use C — the note that makes it minor — somewhere.", pitches: A_MIN, slots: 8, dur: 1, bpm: 92, rules: [{ rule: "start", p: 57 }, { rule: "end", p: 57 }, { rule: "use", pitches: [60] }, { rule: "notes", min: 6 }], tonic: 57, inst: "violin", labels: "letters", backing: progression(["i", "iv", "v", "i"], 57, "minor", { bpm: 92, per: 2, inst: "piano", style: "arp", bass: true }) }, "u:compose:minor"),
  () => compose({ prompt: "A spooky echo deep in the mine: make the tune sink DOWN (end lower than it starts) on A, with at least one rest.", pitches: A_MIN, slots: 8, dur: 1, bpm: 80, rules: [{ rule: "contour", dir: "down" }, { rule: "end", p: 57 }, { rule: "rests", min: 1 }, { rule: "notes", min: 5 }], tonic: 57, inst: "cello", labels: "letters", backing: progression(["i", "VI", "VII", "i"], 57, "minor", { bpm: 80, per: 2, inst: "strings", style: "pad" }) }, "u:compose:minor"),
];
const mineCompose = variants("g5-mine-compose", MINE_COMPOSE);
const MINE_PAL = ["i", "iv", "v", "VI", "VII"];
const MINE_CHORDS: Make[] = [
  () => chordsBuild("Write 4 chords in A minor: start on i, end on i, and use VI (the bright F major chord) somewhere.", 4, [{ rule: "start", chord: "i" }, { rule: "end", chord: "i" }, { rule: "use", chords: ["VI"] }], { tonic: 57, scale: "minor", palette: MINE_PAL, bpm: 84 }, "u:progression:build-minor"),
  () => chordsBuild("Epic adventure progression: start on i and use BOTH VI and VII — the sound of movie heroes in danger.", 4, [{ rule: "start", chord: "i" }, { rule: "use", chords: ["VI", "VII"] }], { tonic: 57, scale: "minor", palette: MINE_PAL, bpm: 92 }, "u:progression:build-minor"),
  () => chordsBuild("End with v → i, the minor key's way of saying “The End.” Start on i.", 4, [{ rule: "start", chord: "i" }, { rule: "cadence", kind: "authentic" }], { tonic: 57, scale: "minor", palette: MINE_PAL, bpm: 84 }, "u:progression:build-minor"),
];
const mineChords = variants("g5-mine-chords", MINE_CHORDS);

const twinkleMM = mmPair({ id: "twinkle", n: 7, inst: "piano" }, 112);
const MINOR_IDEA = idea("Major and minor", [
  frame("Major sounds bright. Minor sounds darker — serious, sad or mysterious. Same tune, two moods: major first, then minor.", picsShow("🔦"), then(twinkleMM[0], twinkleMM[1], 1)),
  frame("It starts with the 3rd. A major 3rd is 4 half steps (C–E); a minor 3rd is only 3 (C–E♭). One half step changes the whole mood!", keysShow(60, 72, [60, 63, 64, 67]), then(chordSound([60, 64, 67], "piano", 2, 80), chordSound([60, 63, 67], "piano", 2, 80), 0.5)),
  frame("The natural minor scale follows W H W W H W W. Here's A minor.", keysShow(57, 72, A_MIN), melody(A_MIN, [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1.5], "piano", 100)),
  frame("A minor uses exactly the same notes as C major — it just starts on A (la). They're RELATIVES: A minor is C major's relative minor.", keysShow(57, 72, [...A_MIN, 71, 72]), then(melody(CMAJ, 0.5, "piano", 112), melody(A_MIN, 0.5, "piano", 112), 0.5)),
], "u:major-minor:idea");
const MINOR_CHORD_IDEA = idea("Minor chords", [
  frame("A minor chord: root, minor 3rd, 5th. A minor = A–C–E. Compare A major = A–C♯–E.", staffShow([{ p: [57, 60, 64], d: 2 }, { p: [57, 61, 64], d: 2 }]), then(chordSound([57, 60, 64], "piano", 2, 80), chordSound([57, 61, 64], "piano", 2, 80), 0.5)),
  frame("In a major key, three chords are minor: ii, iii and vi (small Roman numerals). In a minor key, the home chord i is minor, and so are iv and v.", chordsPic(["I", "ii", "iii", "IV", "V", "vi"]), progSound(["I", "ii", "iii", "IV", "V", "vi", "V", "I"], 60, "major", 110)),
  frame("Film and game composers reach for minor chords for mystery, sadness and danger.", chordsPic(["i", "VI", "iv", "V"], 57, "minor"), piece("sad")),
], "u:chord:idea");
const MINE_CREATE_IDEA = idea("Deep in the mine", [
  frame("Spy movies, video-game dungeons and spooky stories love minor keys. Now compose your own music in A minor.", picsShow("💎"), piece("sneaky")),
  frame("Mix i, iv and v with VI and VII for an epic sound — then write a melody that ends home on A.", chordsPic(["i", "VI", "VII", "i"], 57, "minor"), progression(["i", "VI", "VII", "i"], 57, "minor", { bpm: 96, per: 2, inst: "strings", style: "pulse", bass: true, drums: "rock" })),
], "u:compose:idea");

const MINES: WorldDef = {
  id: "g5-minor-mines",
  title: "Major vs Minor Mines",
  emoji: "⛏️",
  grade: "5",
  blurb: "Dig into the dark side of music: the minor 3rd, the natural minor scale, relative keys and minor chords.",
  talk: ["Think of a movie scene with scary or sad music. Was it probably major or minor?", "Hum a happy song in major, then try humming it “in minor.” How does it change?"],
  challenge: "Listen to two songs today and decide: major or minor? Explain your choice to someone.",
  stages: [
    {
      title: "Into the dark",
      emoji: "🔦",
      levels: 1,
      topics: [mmEar, thirdEar, chordMM, minorScaleKeys, relativeQ, mmVersion, minorEcho],
      fixed: (r) => [MINOR_IDEA, mmEar.gen(r, 0), thirdEar.gen(r, 0), minorScaleKeys.gen(r, 0), minorEcho.gen(r, 0.1), relativeQ.gen(r, 0), mmVersion.gen(r, 0.3)],
    },
    { title: "Relative keys", emoji: "🗝️", levels: 2, topics: [relativeQ, mmVersion, minorScaleKeys, chordMM, minorEcho, thirdEar] },
    {
      title: "Minor chords",
      emoji: "💎",
      levels: 2,
      topics: [minorChordBuild, moodMM, minorProgMatch, chordMM],
      fixed: teach((r) => [MINOR_CHORD_IDEA, minorChordBuild.gen(r, 0)], [minorChordBuild, moodMM, minorProgMatch, chordMM]),
    },
    {
      title: "Minor melody",
      emoji: "🕯️",
      levels: 1,
      topics: [mineCompose, mineChords],
      unlocks: ["scale:minor"],
      fixed: (r) => [MINE_CREATE_IDEA, MINE_COMPOSE[0](r), MINE_CHORDS[0](r), MINE_COMPOSE[1](r), moodMM.gen(r, 0.6), minorProgMatch.gen(r, 0.6), MINE_CHORDS[1](r)],
    },
  ],
};

// ── Syncopation Sea: ti-ta-ti, ties across the beat, triplets, off-beat grooves, reggae ────────
const SYN = ["ta", "titi", "synco"];
const syncoHear = T("g5-synco-hear", (r, d) => rhythmMatch(r, { pool: d < 0.5 ? SYN : [...SYN, "taa"], meter: [4, 4], bars: d < 0.6 ? 1 : 2, must: "synco", style: "notes", bpm: 88, skill: "u:rhythm:synco" }));
const syncoEcho = T("g5-synco-echo", (r, d) => echo(r, { pool: SYN, meter: [4, 4], bars: d < 0.5 ? 1 : 2, must: "synco", show: d < 0.35 ? "notes" : "none", bpm: 84, skill: "u:rhythm:synco", prompt: "Listen for ti-TA-ti — the long note starts between the beats. Tap it back!" }));
const syncoRead = T("g5-synco-read", (r, d) => readRhythm(r, { pool: d < 0.5 ? SYN : [...SYN, "z", "taa"], meter: [4, 4], bars: 2, must: "synco", show: "notes", bpm: d < 0.5 ? 72 : 84, skill: "u:rhythm:synco", prompt: "Read it and play it after the count-in. Feel the off-beat “TA”!" }));
/** A rhythm clapped (cells), to hear against a steady kick. */
const clapCells = (cells: string[], bpm: number): Score => rhythm(cells, { drum: "clap", bpm });
const syncoSpot = T("g5-synco-spot", (r) => {
  const straight = randomCells(r, ["ta", "titi", "taa"], [4, 4], 1);
  const syn = randomCells(r, SYN, [4, 4], 1, "synco");
  const s = (cells: string[]) => layer(beat({ kick: "x.x.x.x." }, { bpm: 92, per: 2, times: 2 }), clapCells([...cells, ...cells], 92));
  return listen({ prompt: "Both rhythms play over a steady kick drum. Which one is SYNCOPATED (a strong note between the beats)?", options: pair(r, ["synco", s(syn)], ["straight", s(straight)]), answer: "synco", skill: "u:rhythm:synco-ear", why: "Syncopation puts a long, strong note between the beats — ti-TA-ti." });
});
const TRIP = ["ta", "titi", "trip"];
const tripHear = T("g5-trip-hear", (r, d) => rhythmMatch(r, { pool: d < 0.5 ? TRIP : [...TRIP, "taa"], meter: [4, 4], bars: d < 0.6 ? 1 : 2, must: "trip", style: "notes", bpm: 80, skill: "u:rhythm:triplet" }));
const tripEcho = T("g5-trip-echo", (r, d) => echo(r, { pool: TRIP, meter: [4, 4], bars: d < 0.5 ? 1 : 2, must: "trip", show: d < 0.35 ? "notes" : "none", bpm: 76, skill: "u:rhythm:triplet", prompt: "Tri-o-la! Listen for three even notes in one beat, then tap it back." }));
const tripRead = T("g5-trip-read", (r, d) => readRhythm(r, { pool: d < 0.5 ? TRIP : [...TRIP, "z", "synco"], meter: [4, 4], bars: 2, must: "trip", show: "notes", bpm: 72, skill: "u:rhythm:triplet", prompt: "Read it and play it — three even taps for every triplet." }));
const SYNCO_Q: Q[] = [
  { q: "How many notes does a triplet fit into one beat?", a: "3", w: ["2", "4"], v: rhythmShow(["trip"], "notes") },
  { q: "Ti-ta-ti (syncopa) lasts how many beats?", a: "2", w: ["1", "3"], v: rhythmShow(["synco"], "notes"), why: "½ + 1 + ½ = 2 beats." },
  { q: "In syncopation, the strong accent lands…", a: "Between the beats (off the beat)", w: ["Exactly on every beat", "Only at the end of a song"] },
  { q: "The syllables for a triplet are…", a: "tri-o-la", w: ["ti-ti", "ti-ka-ti-ka"], v: rhythmShow(["trip"], "notes") },
  { q: "In ti-ta-ti, when does the long “ta” start?", a: "Halfway through the beat — between beats", w: ["Right on beat 1", "On beat 3"], v: rhythmShow(["synco"], "notes") },
  { q: "Two eighth notes tied across the beat sound like…", a: "One longer note that starts off the beat", w: ["Two quick separate notes", "A rest"], v: sym("tie") },
  { q: "A tie connects two notes of the…", a: "Same pitch", w: ["Different pitches", "Same color"] },
  { q: "Which styles are famous for syncopation?", a: "Ragtime, jazz, reggae and funk", w: ["Only lullabies and marches", "None — syncopation is rare"] },
  { q: "How many triplets fill one bar of 4/4?", a: "4", w: ["3", "12"], why: "One triplet per beat × 4 beats = 4 triplets (12 notes)." },
  { q: "Ti-ti splits a beat into two. A triplet splits it into…", a: "Three equal notes", w: ["Two uneven notes", "Four quick notes"] },
];
const syncoQ = quiz("g5-synco-q", "u:rhythm:synco-facts", SYNCO_Q, 5);
const syncoDict = T("g5-synco-dict", (r, d) => (d < 0.5 ? dictItem(r, SYN, [4, 4], 1, "u:rhythm:dictation", 80, "synco") : dictItem(r, [...SYN, "trip", "taa"], [4, 4], 2, "u:rhythm:dictation", 80, pick(r, ["synco", "trip"]))));
const syncoFill = T("g5-synco-fill", (r) => fillItem(r, [...SYN, "trip", "taa", "z"], [4, 4], 2, "u:rhythm:measure"));
const OFF_ROWS: DrumId[] = ["kick", "snare", "hat"];
const OFF_BEATS: string[][] = [["x.x.x.x.", "..x...x.", ".x.x.x.x"], ["x...x...", "..x...x.", ".x.x.x.x"], ["x..x..x.", "....x...", "x.x.x.x."], ["x..x.x..", "..x...x.", "xxxxxxxx"]];
const offbeatCopy = T("g5-offbeat-copy", (r) => beatlab("copy", "Listen closely — some hits land between the beats. Rebuild this groove.", OFF_ROWS, 8, 100, { target: [...pick(r, OFF_BEATS)] }, "u:beatmaking:offbeat"));
const OFF_MAKE: Make[] = [
  () => beatlab("make", "Off-beat hi-hats: put the hat ONLY on the “and”s (between the beats) — never on a beat. Kick on beat 1.", OFF_ROWS, 8, 100, { rules: [{ rule: "on", row: "hat", steps: [1, 3, 5, 7] }, { rule: "off", row: "hat", steps: [0, 2, 4, 6] }, { rule: "on", row: "kick", steps: [0] }] }, "u:beatmaking:offbeat"),
  () => beatlab("make", "Syncopate the kick: kick on beat 1 AND on the “and” of beat 2. Snare on beats 2 and 4.", OFF_ROWS, 8, 100, { rules: [{ rule: "on", row: "kick", steps: [0, 3] }, { rule: "on", row: "snare", steps: [2, 6] }] }, "u:beatmaking:offbeat"),
  () => beatlab("make", "The 3–3–2 (tresillo): kicks on steps 1, 4 and 7 — and nowhere else. Add any hi-hat you like (at least 2).", OFF_ROWS, 8, 100, { rules: [{ rule: "on", row: "kick", steps: [0, 3, 6] }, { rule: "count", row: "kick", min: 3, max: 3 }, { rule: "count", row: "hat", min: 2 }] }, "u:beatmaking:offbeat"),
];
const offbeatMake = variants("g5-offbeat-make", OFF_MAKE);
const SYNCO_CREATE: Make[] = [
  () => measure("create", "Compose 2 bars that use BOTH a ti-ta-ti and a triplet.", [4, 4], 2, [...SYN, "trip", "taa", "z"], { must: ["synco", "trip"], bpm: 84 }, "u:rhythm:create"),
  () => measure("create", "Compose a 4-bar sea-surf rhythm with at least one ti-ta-ti, one triplet and one rest.", [4, 4], 4, [...SYN, "trip", "taa", "z"], { must: ["synco", "trip", "z"], bpm: 88 }, "u:rhythm:create"),
];
const syncoCreate = variants("g5-synco-create", SYNCO_CREATE);
const REGGAE_ROWS: DrumId[] = ["kick", "rim", "hat"];
const REGGAE: Make[] = [
  () => beatlab("make", "One drop! Leave beat 1 EMPTY. Kick and rim click together on beat 3, plus at least 4 hi-hats.", REGGAE_ROWS, 8, 76, { rules: [{ rule: "off", row: "kick", steps: [0] }, { rule: "on", row: "kick", steps: [4] }, { rule: "on", row: "rim", steps: [4] }, { rule: "count", row: "hat", min: 4 }] }, "u:beatmaking:reggae"),
  () => beatlab("copy", "Listen to this reggae one-drop beat and copy it.", REGGAE_ROWS, 8, 76, { target: ["....x...", "....x...", ".x.x.x.x"] }, "u:beatmaking:reggae"),
];
const reggaeBeat = variants("g5-reggae-beat", REGGAE);

const SYNCO_IDEA = idea("Off the beat", [
  frame("Most notes land ON the beat. SYNCOPATION puts a strong note BETWEEN the beats — a surprise that makes you want to move.", beatsShow(4, [0]), then(layer(beat({ kick: "x.x.x.x." }, { bpm: 92, per: 2, times: 1 }), clapCells(["ta", "titi", "ta", "ta"], 92)), layer(beat({ kick: "x.x.x.x." }, { bpm: 92, per: 2, times: 1 }), clapCells(["ta", "synco", "ta"], 92)), 1)),
  frame("Meet ti-TA-ti (syncopa): short, LONG, short. The long note starts halfway between two beats.", rhythmShow(["ta", "synco", "ta"], "notes"), clicked(tune(["ta", "synco", "ta", "ta", "synco", "ta"], [60, 64, 67, 64, 60, 62, 65, 69, 65, 62], "marimba", 88), 8)),
  frame("A TIE across the beat does the same trick: two eighth notes tied together become one note that starts off the beat.", sym("tie", "ti + ti → TA"), clicked(tune(["synco", "synco", "taa"], [67, 69, 67, 64, 65, 64, 60], "flute", 88), 6)),
  frame("Scott Joplin's ragtime is packed with syncopation — that's what makes it sound “ragged.”", instShow("piano"), piece("ragtime")),
], "u:rhythm:synco");
const TRIP_IDEA = idea("Triplets", [
  frame("Ti-ti splits one beat into 2 notes. A TRIPLET squeezes 3 equal notes into one beat: tri-o-la!", rhythmShow(["titi", "trip", "titi", "trip"], "notes"), clicked(tune(["titi", "trip", "titi", "trip"], [60, 62, 64, 65, 64, 67, 65, 64, 62, 60], "marimba", 76), 4)),
  frame("Hear the difference: ti-ti, ti-ti, ti-ti, ti-ti… then tri-o-la, tri-o-la, tri-o-la, tri-o-la.", rhythmShow(["trip", "trip", "trip", "trip"], "notes"), then(clapCells(["titi", "titi", "titi", "titi"], 80), clapCells(["trip", "trip", "trip", "trip"], 80), 1)),
  frame("Triplets make music roll and gallop. Trumpet fanfares use them for a royal entrance!", instShow("trumpet", "timpani"), piece("fanfare")),
], "u:rhythm:triplet");
const GROOVE_IDEA = idea("Off-beat grooves", [
  frame("Drummers syncopate too. Move the hi-hat to the “and”s — between the beats — and the groove starts to bounce.", gridPic(OFF_ROWS, OFF_BEATS[0]), beat({ kick: OFF_BEATS[0][0], snare: OFF_BEATS[0][1], hat: OFF_BEATS[0][2] }, { bpm: 100, per: 2, times: 2 })),
  frame("This 3–3–2 kick pattern is called tresillo. It came to the Americas from Africa and lives on in Latin music and tons of pop songs.", gridPic(OFF_ROWS, OFF_BEATS[2]), beat({ kick: OFF_BEATS[2][0], snare: OFF_BEATS[2][1], hat: OFF_BEATS[2][2] }, { bpm: 100, per: 2, times: 2 })),
], "u:beatmaking:idea");
const REGGAE_IDEA = idea("Reggae waves", [
  frame("Reggae comes from Jamaica (late 1960s). The guitar or organ plays only on the off-beats — a choppy sound called the “skank.” Bob Marley carried it around the world.", instShow("organ", "bass", "kick"), piece("reggae")),
  frame("Its drum beat is the ONE DROP: beat 1 is left empty, and the kick and rim click land together on beat 3.", gridPic(REGGAE_ROWS, ["....x...", "....x...", ".x.x.x.x"]), beat({ kick: "....x...", rim: "....x...", hat: ".x.x.x.x" }, { bpm: 76, per: 2, times: 2 })),
], "u:beatmaking:idea");

const SYNCO_SEA: WorldDef = {
  id: "g5-syncopation-sea",
  title: "Syncopation Sea",
  emoji: "🌊",
  grade: "5",
  blurb: "Ride the off-beats: ti-ta-ti, ties across the beat, rolling triplets, and the reggae one drop.",
  talk: ["Clap a steady beat while someone else claps ti-TA-ti. Can you feel the surprise?", "Why do you think syncopated music makes people want to dance?"],
  challenge: "Find a song you like and try to clap along with a part that lands between the beats.",
  stages: [
    {
      title: "Off the beat",
      emoji: "🏄",
      levels: 1,
      topics: [syncoHear, syncoSpot, syncoEcho, syncoRead, syncoQ],
      unlocks: ["drum:bongo"],
      fixed: (r) => [SYNCO_IDEA, syncoHear.gen(r, 0), syncoSpot.gen(r, 0), syncoEcho.gen(r, 0.1), syncoQ.gen(r, 0), syncoRead.gen(r, 0.2), syncoHear.gen(r, 0.5)],
    },
    {
      title: "Triplets",
      emoji: "3️⃣",
      levels: 2,
      topics: [tripHear, tripEcho, tripRead, syncoQ, syncoSpot],
      fixed: teach((r) => [TRIP_IDEA, tripHear.gen(r, 0)], [tripHear, tripEcho, tripRead, syncoQ, syncoSpot]),
    },
    {
      title: "Groove lab",
      emoji: "🎛️",
      levels: 2,
      topics: [offbeatCopy, offbeatMake, syncoDict, syncoFill, tripEcho],
      fixed: teach((r) => [GROOVE_IDEA, offbeatCopy.gen(r, 0)], [offbeatCopy, offbeatMake, syncoDict, syncoFill, tripEcho]),
    },
    {
      title: "Wave rider",
      emoji: "🌴",
      levels: 1,
      topics: [syncoCreate, reggaeBeat],
      unlocks: ["groove:reggae"],
      fixed: (r) => [REGGAE_IDEA, REGGAE[0](r), SYNCO_CREATE[0](r), offbeatCopy.gen(r, 0.6), syncoDict.gen(r, 0.7), SYNCO_CREATE[1](r), REGGAE[1](r)],
    },
  ],
};

// ── Blues Bayou: the 12-bar blues, the blues scale, swing and shuffle, AAB lyrics ──────────────
const BLUES12 = ["I7", "I7", "I7", "I7", "IV7", "IV7", "I7", "I7", "V7", "IV7", "I7", "I7"];
const BLUES_PAL = ["I7", "IV7", "V7"];
const C_BLUES = [60, 63, 65, 66, 67, 70, 72];
const TWELVE_Q: Q[] = [
  { q: "How many bars long is one time through the 12-bar blues?", a: "12", w: ["8", "16"], v: chordsPic(BLUES12) },
  { q: "Which three chords does the 12-bar blues use?", a: "I, IV and V", w: ["I, ii and vi", "Only I"], v: chordsPic(BLUES12) },
  { q: "The 12-bar blues has three lines. How many bars are in each line?", a: "4", w: ["3", "6"] },
  { q: "In the 12-bar blues, bar 5 moves to which chord?", a: "IV", w: ["V", "I"], v: chordsPic(BLUES12), why: "Line 2 starts on IV: IV IV I I." },
  { q: "Bar 9 of the 12-bar blues is the…", a: "V chord", w: ["IV chord", "I chord"], v: chordsPic(BLUES12), why: "Line 3 goes V IV I I." },
  { q: "Line 1 of the blues stays on which chord for all 4 bars?", a: "I", w: ["IV", "V"] },
  { q: "A V chord in the very last bar sends the band back to the top. That's called a…", a: "Turnaround", w: ["Breakdown", "Fade-out"] },
  { q: "Blues chords often add a 7th (like C7). What does that add?", a: "A tangy, bluesy sound", w: ["A sad minor sound", "Silence"] },
];
const twelveBarQ = quiz("g5-12bar-q", "u:form:12-bar", TWELVE_Q, 6);
const BLUES_LINES = [["I7", "I7", "I7", "I7"], ["IV7", "IV7", "I7", "I7"], ["V7", "IV7", "I7", "I7"], ["V7", "IV7", "I7", "V7"], ["I7", "IV7", "I7", "I7"]];
const bluesProgMatch = T("g5-blues-match", (r, d) => {
  const ans = d < 0.6 ? [...pick(r, BLUES_LINES.slice(1))] : pick(r, [BLUES12, [...BLUES12.slice(0, 11), "V7"], ["I7", "IV7", ...BLUES12.slice(2)]]);
  return chordsMatch(ans.length > 4 ? "A whole 12-bar blues! Listen, then put the chords in order." : "One line of a blues (4 bars). Listen, then put the chords in order.", ans, { palette: BLUES_PAL, bpm: ans.length > 4 ? 132 : 112, inst: "organ" }, "u:progression:blues");
});
const bluesLineEar = T("g5-blues-line-ear", (r) => {
  const i = int(r, 0, 2);
  const lines = BLUES_LINES.slice(0, 3);
  return listen({
    prompt: "Which line of the 12-bar blues is this?",
    sound: progression(lines[i], 60, "major", { bpm: 112, per: 4, inst: "piano", style: "strum", bass: true, drums: "shuffle" }),
    options: lines.map((l, k) => opt(String(k), `Line ${k + 1}: ${l.map((x) => x.replace("7", "")).join(" – ")}`)),
    answer: String(i),
    skill: "u:form:12-bar-ear",
    layout: "list",
    why: ["Line 1 stays home on I the whole time.", "Line 2 starts on IV, then comes home to I.", "Line 3 starts on V — the farthest from home — then IV, then I."][i],
  });
});
const BLUES_KEYS: [number, string, string][] = [[60, "C", "C, E♭, F, G♭, G, B♭, C"], [57, "A", "A, C, D, E♭, E, G, A"], [55, "G", "G, B♭, C, D♭, D, F, G"]];
const bluesScaleKeys = T("g5-blues-keys", (r, d) => {
  const [t, nm, names] = pick(r, d < 0.4 ? BLUES_KEYS.slice(0, 1) : BLUES_KEYS);
  const ps = [0, 3, 5, 6, 7, 10, 12].map((s) => t + s);
  return keysAct("scale", `Build the ${nm} blues scale: ${d < 0.6 ? names : "1, ♭3, 4, ♭5, 5, ♭7, 8"}.`, ps, t - 3, t + 15, { given: [t], labels: d < 0.4 }, "u:keys:blues-scale");
});
const BLUES_SCALE_Q: Q[] = [
  { q: "Which notes make the blues scale sound “blue”?", a: "The flat 3rd, flat 5th and flat 7th", w: ["The sharp notes", "The very highest notes"], v: keysShow(60, 72, C_BLUES) },
  { q: "C blues scale: C, E♭, F, G♭, G, ___, C. What's missing?", a: "B♭", w: ["B", "A"], v: keysShow(60, 72, C_BLUES) },
  { q: "How many different notes are in the blues scale before the top note repeats?", a: "6", w: ["5", "7"] },
  { q: "The blues scale is the minor pentatonic plus one extra “blue note.” Which one?", a: "The flat 5th (♭5)", w: ["The major 3rd", "The major 7th"] },
  { q: "Singers and guitarists “bend” blue notes. That means they…", a: "Slide the pitch a little up or down", w: ["Play them twice as loud", "Skip them"] },
  { q: "In the C blues scale, the blue note between F and G is…", a: "G♭", w: ["E", "B"], v: keysShow(60, 72, C_BLUES) },
];
const bluesScaleQ = quiz("g5-blues-scale-q", "u:scale:blues", BLUES_SCALE_Q, 3);
const SWING_TUNES = [[60, 63, 65, 66, 67, 70, 67, 65], [67, 65, 63, 60, 63, 65, 67, 70], [72, 70, 67, 65, 67, 63, 65, 60]];
const swingTune = (ps: number[], sw: boolean, bpm = 112): Score => ({ ...layer(melody([...ps, ...ps], 0.5, "piano", bpm), beat({ kick: "x...x...", snare: "..x...x.", hat: "xxxxxxxx" }, { bpm, per: 2, times: 2 })), swing: sw ? 0.33 : 0 });
const swingEar = T("g5-swing-ear", (r) => {
  const sw = r() < 0.5;
  return listen({ prompt: "Listen to the eighth notes. Straight or swing?", sound: swingTune(pick(r, SWING_TUNES), sw), options: [opt("swing", "Swing — long-short, doo-BA doo-BA"), opt("straight", "Straight — even eighth notes")], answer: sw ? "swing" : "straight", skill: "u:rhythm:swing", why: sw ? "Each pair of eighths went long–short: that's swing." : "Every eighth note was exactly even: straight." });
});
const BLUES_HIST_Q: Q[] = [
  { q: "Where did the blues begin, around 1900?", a: "The Deep South of the U.S., like the Mississippi Delta", w: ["Vienna, Austria", "Kingston, Jamaica"] },
  { q: "The blues grew out of African American…", a: "Work songs, field hollers and spirituals", w: ["Symphonies and operas", "Video game music"] },
  { q: "W. C. Handy, who published some of the first blues songs, is called the…", a: "Father of the Blues", w: ["King of Ragtime", "Father of the Symphony"] },
  { q: "Which small instrument is nicknamed the “blues harp”?", a: "Harmonica", w: ["Violin", "Harp"], v: instShow("harmonica") },
  { q: "Which later styles grew out of the blues?", a: "Rock and roll and R&B", w: ["Baroque and Classical", "Polka and marches"] },
  { q: "B.B. King, the “King of the Blues,” gave his guitar a name. What was it?", a: "Lucille", w: ["Big Red", "Old Paint"], v: instShow("eguitar") },
  { q: "Blues songs often sing about hard times. Singing the blues helps people…", a: "Feel stronger and less alone", w: ["Fall asleep", "Forget the words"] },
];
const bluesHistory = quiz("g5-blues-history", "u:genre:blues", BLUES_HIST_Q, 4);
const AAB: { a: string; b: string; w: string[]; other: string }[] = [
  { a: "I lost my sailor's cap, the wind blew it far away", b: "Now my head is getting cold on this windy, rainy day", w: ["Now my head is getting cold and my ears are freezing too", "I went to buy a brand-new cap down at the store"], other: "I found a shiny shell down on the sandy beach" },
  { a: "My little boat sprang a leak, the water's coming in", b: "I'm bailing with my bucket, but I'm wearing a big grin", w: ["I'm bailing with my bucket just as fast as I can go", "Tomorrow I will paint my boat bright blue"], other: "My dog chased a seagull all the way down the dock" },
  { a: "Woke up this morning, and the fish just wouldn't bite", b: "I'll cast my line again tomorrow, and I'll get it right", w: ["I'll cast my line again tomorrow and stay out really late", "I ate a peanut butter sandwich on the dock"], other: "The sun came up all orange over the bay" },
  { a: "The rain keeps falling down on my old tin roof", b: "I'm singing out the blues, and this song is the proof", w: ["I'm singing out the blues until the sun comes out again", "My cat is sleeping by the fire"], other: "I like to splash in puddles with my boots" },
];
const aabQ = T("g5-aab", (r) => {
  const v = pick(r, AAB);
  return {
    kind: "slots",
    prompt: "Blues lyrics use AAB form. Line 1 (A) is given — build the rest of the verse.",
    story: `Line 1 (A): “${v.a}”`,
    slots: [
      { label: "Line 2 (A again)", options: shuffle(r, [v.a, v.b, v.other]), answer: v.a, why: "In a blues verse, line 2 repeats line 1 — sung with even more feeling." },
      { label: "Line 3 (B — the answer that rhymes)", options: shuffle(r, [v.b, ...v.w]), answer: v.b, why: "Line 3 answers line 1 and rhymes with it." },
    ],
    skill: "u:lyrics:aab",
  };
});
const SHUF_ROWS: DrumId[] = ["kick", "snare", "hat"];
const SHUFFLE: Make[] = [
  () => beatlab("make", "Shuffle groove: kick on beat 1, snare on beats 2 and 4, and hi-hat on every eighth (all 8). The swing turns it into a shuffle!", SHUF_ROWS, 8, 96, { rules: [{ rule: "on", row: "kick", steps: [0] }, { rule: "on", row: "snare", steps: [2, 6] }, { rule: "count", row: "hat", min: 8 }], swing: 0.33 }, "u:beatmaking:shuffle"),
  (r) => beatlab("copy", "Listen to this shuffle (it swings!) and copy it.", SHUF_ROWS, 8, 96, { target: [...pick(r, [["x...x...", "..x...x.", "xxxxxxxx"], ["x...x...", "..x...x.", "x.x.x.x."], ["x..xx..x", "..x...x.", "xxxxxxxx"]])], swing: 0.33 }, "u:beatmaking:shuffle"),
];
const shuffleBeat = variants("g5-shuffle-beat", SHUFFLE);
const bluesBacking = (bpm = 96) => progression(["I7", "I7", "IV7", "I7"], 60, "major", { bpm, per: 2, inst: "organ", style: "strum", bass: true, drums: "shuffle" });
const BLUES_COMPOSE: Make[] = [
  () => compose({ prompt: "Write a blues riff for the harmonica: start and end on C, use the blue note G♭ at least once, and leave at least one rest.", pitches: C_BLUES, slots: 8, dur: 1, bpm: 96, rules: [{ rule: "start", p: 60 }, { rule: "end", p: 60 }, { rule: "use", pitches: [66] }, { rule: "rests", min: 1 }, { rule: "notes", min: 5 }], tonic: 60, inst: "harmonica", labels: "letters", backing: bluesBacking() }, "u:compose:blues"),
  () => compose({ prompt: "Riff it! Your first 2 notes must come back later in the tune. Use E♭ (the flat 3rd) somewhere.", pitches: C_BLUES, slots: 8, dur: 1, bpm: 96, rules: [{ rule: "repeat", len: 2 }, { rule: "use", pitches: [63] }, { rule: "notes", min: 6 }], tonic: 60, inst: "harmonica", labels: "letters", backing: bluesBacking() }, "u:compose:blues"),
];
const bluesCompose = variants("g5-blues-compose", BLUES_COMPOSE);
const BLUES_CHORDS: Make[] = [
  () => chordsBuild("Build a full 12-bar blues: start on I7, use IV7 and V7, and end on V7 (a turnaround back to the top).", 12, [{ rule: "start", chord: "I7" }, { rule: "use", chords: ["IV7", "V7"] }, { rule: "end", chord: "V7" }], { palette: BLUES_PAL, bpm: 132, inst: "organ" }, "u:progression:build-blues"),
  () => chordsBuild("Write the last line of a blues (4 bars): start on V7 and come home to I7.", 4, [{ rule: "start", chord: "V7" }, { rule: "end", chord: "I7" }], { palette: BLUES_PAL, bpm: 112, inst: "organ" }, "u:progression:build-blues"),
  () => chordsBuild("A 4-bar blues line that ends IV7 → I7 — the bluesy “amen” ending.", 4, [{ rule: "start", chord: "I7" }, { rule: "cadence", kind: "plagal" }], { palette: BLUES_PAL, bpm: 112, inst: "organ" }, "u:progression:build-blues"),
];
const bluesChords = variants("g5-blues-chords", BLUES_CHORDS);

const LICK = [72, 75, 77, 78, 79, 75, 72];
const BLUES_IDEA = idea("The 12-bar blues", [
  frame("The BLUES was born in the Deep South of the U.S. around 1900. It grew from African American work songs, field hollers and spirituals.", instShow("guitar", "harmonica", "organ"), { ...layer(melody(LICK, [0.5, 0.5, 0.5, 0.5, 1, 0.5, 2.5], "harmonica", 100), progression(["I7", "I7", "IV7", "I7"], 60, "major", { bpm: 100, per: 4, inst: "organ", style: "strum", bass: true, drums: "shuffle" })), swing: 0.33 }),
  frame("Its form is the 12-BAR BLUES: three lines of 4 bars. Line 1: I I I I · Line 2: IV IV I I · Line 3: V IV I I.", chordsPic(BLUES12), progression(BLUES12, 60, "major", { bpm: 168, per: 4, inst: "piano", style: "strum", bass: true, drums: "shuffle" })),
  frame("Blues chords add a 7th — I7, IV7, V7 — for that tangy, bluesy sound. Hear C, then C7.", chordsPic(["I", "I7"]), then(chordSound([60, 64, 67], "piano", 2, 80), chordSound([60, 64, 67, 70], "piano", 2, 80), 0.5)),
], "u:form:12-bar");
const BLUENOTE_IDEA = idea("Blue notes and swing", [
  frame("The BLUES SCALE: 1, ♭3, 4, ♭5, 5, ♭7. In C that's C, E♭, F, G♭, G, B♭. Those flatted “blue notes” give the blues its cry.", keysShow(60, 72, C_BLUES), melody([...C_BLUES, ...[...C_BLUES].reverse().slice(1)], 0.5, "piano", 104)),
  frame("Hear a harmonica play a blues lick from that scale.", instShow("harmonica"), { ...layer(melody(LICK, [0.5, 0.5, 0.5, 0.5, 1, 0.5, 2.5], "harmonica", 96), bluesBacking()), swing: 0.33 }),
  frame("Blues SWINGS: pairs of eighth notes go long–short, doo-BA doo-BA. A swinging drum groove is called a SHUFFLE. Straight first, then swing:", gridPic(SHUF_ROWS, ["x...x...", "..x...x.", "xxxxxxxx"]), then(swingTune(SWING_TUNES[0], false), swingTune(SWING_TUNES[0], true), 1)),
], "u:scale:blues");
const aabPhrase = (ps: number[]) => melody(ps, [0.5, 0.5, 0.5, 0.5, 1, 1, 4], "harmonica", 100);
const AAB_IDEA = idea("AAB blues lyrics", [
  frame("Blues lyrics often use AAB form: line A says it, line A says it again with more feeling, and line B answers — and rhymes.", formPic("A", "A", "B"), chain([aabPhrase([67, 70, 67, 65, 63, 60, 60]), aabPhrase([67, 70, 67, 65, 63, 60, 60]), aabPhrase([72, 70, 67, 70, 67, 63, 60])], 0)),
  frame("“My little boat sprang a leak, the water's coming in… / My little boat sprang a leak, the water's coming in… / I'm bailing with my bucket, but I'm wearing a big grin!”", picsShow("⛵"), aabPhrase([72, 70, 67, 70, 67, 63, 60])),
], "u:lyrics:aab");
const JAM_IDEA = idea("Blues jam", [
  frame("Blues musicians JAM: everyone knows the 12-bar form, so they can make up riffs on the spot and still play together.", instShow("harmonica", "organ", "bass"), { ...layer(melody([72, 70, 67, 70, 72, 75, 72], [0.5, 0.5, 1, 0.5, 0.5, 1, 4], "harmonica", 100), bluesBacking(100)), swing: 0.33 }),
  frame("Build your blues: a harmonica riff, a shuffle groove, and your own 12 bars.", gridPic(SHUF_ROWS, ["x...x...", "..x...x.", "xxxxxxxx"]), bluesBacking()),
], "u:compose:idea");

const BLUES_BAYOU: WorldDef = {
  id: "g5-blues-bayou",
  title: "Blues Bayou",
  emoji: "🐊",
  grade: "5",
  blurb: "Twelve bars, three chords, a scale full of blue notes, and a groove that swings.",
  talk: ["Why do you think singing about hard times can make people feel better?", "Make up an AAB blues verse together about something small that went wrong today."],
  challenge: "Sing a blues verse: line 1, the same line again, then a rhyming answer. Bonus: clap a shuffle beat under it.",
  stages: [
    {
      title: "Twelve bars",
      emoji: "🎸",
      levels: 1,
      topics: [twelveBarQ, bluesHistory, bluesProgMatch, bluesLineEar],
      fixed: (r) => [BLUES_IDEA, twelveBarQ.gen(r, 0), bluesProgMatch.gen(r, 0), bluesLineEar.gen(r, 0.1), bluesHistory.gen(r, 0), bluesLineEar.gen(r, 0.4), bluesProgMatch.gen(r, 0.3)],
    },
    {
      title: "Blue notes & swing",
      emoji: "🎵",
      levels: 2,
      topics: [bluesScaleKeys, bluesScaleQ, swingEar, shuffleBeat],
      fixed: teach((r) => [BLUENOTE_IDEA, bluesScaleKeys.gen(r, 0)], [bluesScaleKeys, bluesScaleQ, swingEar, shuffleBeat]),
      unlocks: ["scale:blues", "tool:swing"],
    },
    {
      title: "Blues lyrics",
      emoji: "📝",
      levels: 2,
      topics: [aabQ, bluesProgMatch, swingEar, bluesLineEar, bluesScaleKeys],
      fixed: teach((r) => [AAB_IDEA, aabQ.gen(r, 0)], [aabQ, bluesProgMatch, swingEar, bluesLineEar, bluesScaleKeys]),
      unlocks: ["groove:shuffle"],
    },
    {
      title: "Blues jam",
      emoji: "🎤",
      levels: 1,
      topics: [bluesCompose, shuffleBeat, bluesChords],
      unlocks: ["inst:harmonica"],
      fixed: (r) => [JAM_IDEA, BLUES_COMPOSE[0](r), SHUFFLE[0](r), BLUES_CHORDS[0](r), aabQ.gen(r, 0.7), BLUES_COMPOSE[1](r), swingEar.gen(r, 0.6)],
    },
  ],
};

// ── Six-Eight Shores: two big beats of three, 6/8 vs 3/4, jigs, words in 6/8 ─────────────────
const C68 = ["tititi", "tati", "tai"];
/** Six eighth notes per bar for 4 bars, grouped 3+3 (6/8) or 2+2+2 (3/4) — same notes, new feel. */
function sixEighths(compound: boolean, tonic = 60, bpm = 112): Score {
  const notes: MNote[] = [];
  const hits: MHit[] = [];
  const pat = compound ? [0, 4, 7, 12, 7, 4] : [0, 7, 4, 7, 12, 7];
  for (let bar = 0; bar < 4; bar++) {
    const root = tonic + [0, 5, 7, 0][bar];
    for (let k = 0; k < 6; k++) notes.push({ p: root + pat[k], d: 0.5, v: k === 0 ? 0.95 : (compound ? k % 3 === 0 : k % 2 === 0) ? 0.72 : 0.38 });
    (compound ? [0, 1.5] : [0, 1, 2]).forEach((b, i) => hits.push({ t: bar * 3 + b, k: i === 0 ? "kick" : "snare", v: i === 0 ? 1 : 0.55 }));
  }
  return { bpm, meter: compound ? [6, 8] : [3, 4], tracks: [{ kind: "notes", inst: "guitar", notes }, { kind: "drums", hits }] };
}
/** An original jig in G (6/8): a fiddle tune with bass and a 6/8 drum groove. */
function jig(bpm = 120): Score {
  const P = [67, 71, 74, 72, 71, 69, 67, 71, 74, 76, 74, 72, 71, 74, 71, 69, 72, 69, 67, 71, 67, 62];
  const mel = melody(P, [...P.slice(1).map(() => 0.5), 1.5], "violin", bpm);
  return { ...layer(mel, melody([43, 50, 43, 50, 47, 45, 43, 43], 1.5, "bass", bpm), groove("six8", 4, bpm)), meter: [6, 8] };
}
const six8Echo = T("g5-68-echo", (r, d) => echo(r, { pool: C68, meter: [6, 8], bars: d < 0.5 ? 1 : 2, show: d < 0.35 ? "notes" : "none", bpm: 120, skill: "u:rhythm:68", prompt: "6/8: feel two big beats in every bar. Listen, then tap it back!" }));
const six8Read = T("g5-68-read", (r, d) => readRhythm(r, { pool: d < 0.5 ? C68 : [...C68, "zai"], meter: [6, 8], bars: 2, show: "notes", bpm: 112, skill: "u:rhythm:68", prompt: "Read this 6/8 rhythm and play it. Count ONE-two-three FOUR-five-six." }));
const six8Hear = T("g5-68-hear", (r) => rhythmMatch(r, { pool: C68, meter: [6, 8], bars: 2, style: "notes", bpm: 120, skill: "u:rhythm:68" }));
const meter68 = T("g5-68-34", (r) => {
  const c = r() < 0.5;
  return listen({
    prompt: "Six eighth notes in every bar — but how are they grouped? 6/8 or 3/4?",
    sound: sixEighths(c, pick(r, [57, 60, 62])),
    options: [opt("68", "6/8 — two big beats: ONE-two-three FOUR-five-six", { show: meterPic([6, 8]) }), opt("34", "3/4 — three beats: ONE-and TWO-and THREE-and", { show: meterPic([3, 4]) })],
    answer: c ? "68" : "34",
    skill: "u:meter:68-vs-34",
    why: c ? "The notes rolled in groups of three — two big beats per bar. That's 6/8." : "The notes went in pairs — three beats per bar. That's 3/4.",
  });
});
const jigWaltz = T("g5-jig-waltz", (r) => {
  const isJig = r() < 0.5;
  return listen({ prompt: "Is this a jig or a waltz?", sound: isJig ? jig(pick(r, [112, 120, 128])) : piece("waltz", { tonic: pick(r, [57, 60, 62, 65]), bpm: pick(r, [138, 150, 160]) }), options: [opt("jig", "Jig — 6/8, two bouncy big beats"), opt("waltz", "Waltz — 3/4, ONE two three")], answer: isJig ? "jig" : "waltz", skill: "u:meter:jig-waltz" });
});
const SIX8_Q: Q[] = [
  { q: "In 6/8, how many eighth notes fill one bar?", a: "6", w: ["3", "8"], v: meterPic([6, 8]) },
  { q: "How many big beats do you FEEL in each bar of 6/8?", a: "2", w: ["6", "3"], v: meterPic([6, 8]), why: "The six eighths group into two sets of three — two big beats, like rowing." },
  { q: "When you count 6/8, which numbers get the big beats?", a: "1 and 4", w: ["1, 3 and 5", "2 and 6"] },
  { q: "“Row, Row, Row Your Boat” is in which time signature?", a: "6/8", w: ["4/4", "2/4"] },
  { q: "In 6/8, each big beat lasts as long as a…", a: "Dotted quarter note (3 eighths)", w: ["Quarter note (2 eighths)", "Whole note"], v: sym("dotted-quarter") },
  { q: "6/8 and 3/4 both have six eighth notes in a bar. What's different?", a: "6/8 groups them 3 + 3; 3/4 groups them 2 + 2 + 2", w: ["Nothing at all", "6/8 is always faster"] },
  { q: "Ta-ti in 6/8 is a quarter note plus an eighth. How many eighths long is it?", a: "3", w: ["2", "4"], v: rhythmShow(["tati"], "notes", true, [6, 8]) },
  { q: "Lively Irish jigs bounce along in…", a: "6/8", w: ["4/4", "3/4"] },
];
const six8Q = quiz("g5-68-q", "u:meter:68", SIX8_Q, 4);
const six8Fill = T("g5-68-fill", (r) => fillItem(r, [...C68, "zai"], [6, 8], 2, "u:rhythm:measure"));
const six8Dict = T("g5-68-dict", (r, d) => dictItem(r, C68, [6, 8], d < 0.5 ? 1 : 2, "u:rhythm:dictation", 112));
const SHORE_LINES: Line[] = [
  { syl: ["Row", "row", "row", "your", "boat"], durs: [1.5, 1.5, 1, 0.5, 1.5], meter: [6, 8], pitches: [60, 60, 60, 62, 64] },
  { syl: ["Waves", "are", "roll", "ing", "in", "to", "shore"], durs: [1, 0.5, 1, 0.5, 1, 0.5, 1.5], meter: [6, 8], pitches: [67, 64, 65, 62, 64, 62, 60] },
  { syl: ["Sea", "gulls", "call", "ing", "call", "ing", "so", "loud"], durs: [1, 0.5, 1, 0.5, 0.5, 0.5, 0.5, 1.5], meter: [6, 8], pitches: [72, 69, 71, 67, 69, 67, 65, 64] },
  { syl: ["O", "ver", "the", "wa", "ter", "far", "a", "way"], durs: [0.5, 0.5, 0.5, 1, 0.5, 1, 0.5, 1.5], meter: [6, 8], pitches: [60, 62, 64, 67, 64, 69, 67, 72] },
];
const rowLyrics = T("g5-68-lyrics", (r) => stressItem(pick(r, SHORE_LINES), "u:lyrics:stress-68", 120));
const SIX8_CREATE: Make[] = [
  () => measure("create", "Compose 2 bars of 6/8. Use at least one ta-ti and one ta-i.", [6, 8], 2, [...C68, "zai"], { must: ["tati", "tai"], bpm: 112 }, "u:rhythm:create-68"),
  () => measure("create", "Compose a 4-bar rowing rhythm in 6/8 with ti-ti-ti, ta-ti AND a rest.", [6, 8], 4, [...C68, "zai"], { must: ["tititi", "tati", "zai"], bpm: 112 }, "u:rhythm:create-68"),
];
const six8Create = variants("g5-68-create", SIX8_CREATE);
const six8Backing = () => progression(["I", "V", "I", "V"].slice(0, 2), 60, "major", { bpm: 112, per: 3, inst: "guitar", style: "block", bass: true, drums: "six8" });
const SIX8_COMPOSE: Make[] = [
  () => compose({ prompt: "Write a jig tune in 6/8 for the fiddle (12 eighth notes = 2 bars). Start and end on do.", pitches: CMAJ, slots: 12, dur: 0.5, bpm: 112, rules: [{ rule: "start", p: 60 }, { rule: "end", p: 60 }, { rule: "notes", min: 9 }], tonic: 60, inst: "violin", labels: "solfege", backing: six8Backing() }, "u:compose:68"),
  () => compose({ prompt: "A sea-shanty tune in 6/8: start on so, end on do, and bring your first 3 notes back later (a motif).", pitches: CMAJ, slots: 12, dur: 0.5, bpm: 112, rules: [{ rule: "start", p: 67 }, { rule: "end", p: 60 }, { rule: "repeat", len: 3 }, { rule: "notes", min: 8 }], tonic: 60, inst: "accordion", labels: "solfege", backing: six8Backing() }, "u:compose:68"),
];
const six8Compose = variants("g5-68-compose", SIX8_COMPOSE);

const SIX8_IDEA = idea("Rowing in 6/8", [
  frame("In 6/8 time there are SIX eighth notes in every bar, grouped in two sets of three: ONE-two-three FOUR-five-six.", meterPic([6, 8]), sixEighths(true)),
  frame("So you FEEL two big beats per bar — like pulling the oars: ROW… ROW…", beatsShow(2, [0]), songScore("rowboat", { inst: "piano" })),
  frame("6/8 rhythms: ti-ti-ti (three eighths), ta-ti (long–short), and ta-i (one big beat).", rhythmShow(["tititi", "tati", "tai", "tai"], "notes", true, [6, 8]), tune(["tititi", "tati", "tai", "tai"], [60, 62, 64, 65, 64, 62, 60], "marimba", 112)),
], "u:meter:68");
const JIG_IDEA = idea("Jig or waltz?", [
  frame("6/8 and 3/4 both have six eighth notes in a bar. But 6/8 groups them 3 + 3, while 3/4 groups them 2 + 2 + 2. Listen: 6/8 first, then 3/4.", meterPic([6, 8]), then(sixEighths(true), sixEighths(false), 1)),
  frame("A JIG is a lively Irish dance tune in 6/8 — two bouncy big beats in every bar.", instShow("violin", "flute"), jig()),
  frame("A WALTZ is a smooth, spinning dance in 3/4: ONE two three, ONE two three.", meterPic([3, 4]), piece("waltz")),
], "u:meter:idea");
const SHORE_STRESS_IDEA = idea("Words in 6/8", [
  frame("In 6/8 the strong syllables ride the two big beats: ROW, ROW, ROW your BOAT!", beatsShow(2, [0]), sing(SHORE_LINES[0], "piano", 120)),
  frame("Hear “WAVES are ROLL-ing IN-to SHORE” — every strong syllable lands on a big beat.", rhythmShow(["tati", "tati", "tati", "tai"], "notes", false, [6, 8]), sing(SHORE_LINES[1], "flute", 120)),
], "u:lyrics:idea");
const SHORE_IDEA = idea("Shore song", [
  frame("Sailors once sang work songs called sea shanties to pull ropes together. Lots of sea songs sway in a rolling 6/8.", picsShow("⛵"), jig(112)),
  frame("Now write your own 6/8 rhythms and a jig of your own.", meterPic([6, 8]), six8Backing()),
], "u:compose:idea");

const SIX8_SHORES: WorldDef = {
  id: "g5-six-eight-shores",
  title: "Six-Eight Shores",
  emoji: "🛶",
  grade: "5",
  blurb: "Row in 6/8: two big beats of three, jigs versus waltzes, and words that rock like a boat.",
  talk: ["Sing “Row, Row, Row Your Boat” and sway on the big beats. How many sways in each bar?", "Can you think of other songs that feel like they're rocking or rolling?"],
  challenge: "Pat your knees six times (ONE-two-three FOUR-five-six) while someone sings “Row, Row, Row Your Boat.”",
  stages: [
    {
      title: "Rowing in 6/8",
      emoji: "⛵",
      levels: 1,
      topics: [six8Q, six8Echo, six8Hear, six8Read, meter68],
      fixed: (r) => [SIX8_IDEA, six8Q.gen(r, 0), six8Echo.gen(r, 0), six8Hear.gen(r, 0.2), meter68.gen(r, 0.2), six8Read.gen(r, 0.3), six8Q.gen(r, 0.5)],
    },
    {
      title: "Jig or waltz?",
      emoji: "💃",
      levels: 2,
      topics: [jigWaltz, meter68, six8Hear, six8Read, six8Echo],
      fixed: teach((r) => [JIG_IDEA, jigWaltz.gen(r, 0)], [six8Read, meter68, six8Echo, six8Q, jigWaltz, six8Hear]),
    },
    {
      title: "Shore drills",
      emoji: "🐚",
      levels: 2,
      topics: [six8Fill, six8Dict, rowLyrics, six8Q, six8Echo],
      fixed: teach((r) => [SHORE_STRESS_IDEA, rowLyrics.gen(r, 0)], [six8Fill, six8Dict, rowLyrics, six8Q, six8Echo]),
    },
    {
      title: "Shore song",
      emoji: "🏝️",
      levels: 1,
      topics: [six8Create, six8Compose],
      unlocks: ["groove:six8"],
      fixed: (r) => [SHORE_IDEA, SIX8_CREATE[0](r), SIX8_COMPOSE[0](r), six8Dict.gen(r, 0.6), rowLyrics.gen(r, 0.6), SIX8_COMPOSE[1](r), jigWaltz.gen(r, 0.7)],
    },
  ],
};

// ── Genre Jetty: what makes a genre — instruments, groove, feel — and its signature beat ───────
const genreEar = T("g5-genre-ear", (r, d) => styleEar(r, { pool: d < 0.5 ? ["rock", "hiphop", "country", "reggae", "swing"] : ["rock", "hiphop", "country", "reggae", "swing", "salsa", "bossa", "gospel", "edm", "minuet", "funk"], count: d < 0.5 ? 3 : 4, skill: "u:genre:ear" }));
const GENRE_Q: Q[] = [
  { q: "Hip hop began at block parties in which place, in the 1970s?", a: "The Bronx, in New York City", w: ["Nashville, Tennessee", "Kingston, Jamaica"] },
  { q: "Reggae comes from which island?", a: "Jamaica", w: ["Cuba", "Ireland"] },
  { q: "Rock drummers hit the snare on beats 2 and 4. That's called the…", a: "Backbeat", w: ["Downbeat", "Pickup"] },
  { q: "Which instruments are country-music classics?", a: "Fiddle, banjo and steel guitar", w: ["Synthesizer and drum machine", "Harpsichord and organ"] },
  { q: "Bossa nova — gentle guitar and soft singing — comes from…", a: "Brazil", w: ["Japan", "Germany"] },
  { q: "Rock and roll grew in the 1950s out of…", a: "Rhythm and blues, and country", w: ["Baroque fugues", "Marching bands"] },
  { q: "In electronic dance music the kick drum often hits every beat. That's called…", a: "Four on the floor", w: ["The one drop", "A shuffle"] },
  { q: "In hip hop, the MC raps rhymes over a beat made by the…", a: "DJ or producer", w: ["Conductor", "Choir director"] },
  { q: "Salsa grew in New York from Cuban and Puerto Rican music. Its rhythm is built on the…", a: "Clave", w: ["Waltz", "Backbeat"] },
  { q: "Which city is nicknamed “Music City” for country music?", a: "Nashville", w: ["Chicago", "New Orleans"] },
];
const genreFacts = quiz("g5-genre-q", "u:genre:facts", GENRE_Q, 4);
type SortItem = { id: string; label?: string; inst?: InstId | DrumId; sound?: Score; bin: string };
const GENRE_ITEMS: SortItem[] = [
  { id: "eg", inst: "eguitar", label: "Electric guitar", bin: "rock" },
  { id: "riff", label: "Power-chord riff", sound: melody([[52, 59], [52, 59], [55, 62], [57, 64]], [0.5, 0.5, 0.5, 1.5], "eguitar", 124), bin: "rock" },
  { id: "banjo", inst: "banjo", label: "Banjo", bin: "country" },
  { id: "fiddle", inst: "violin", label: "Fiddle", bin: "country" },
  { id: "sax", inst: "sax", label: "Saxophone", bin: "jazz" },
  { id: "upright", inst: "doublebass", label: "Upright bass", bin: "jazz" },
  { id: "synth", inst: "synth", label: "Synthesizer", bin: "edm" },
  { id: "synthbass", inst: "synthbass", label: "Synth bass", bin: "edm" },
];
const genreInstSort = T("g5-genre-sort", (r) => {
  const bins = [{ id: "rock", label: "Rock", emoji: "🎸" }, { id: "country", label: "Country", emoji: "🤠" }, { id: "jazz", label: "Jazz", emoji: "🎺" }, { id: "edm", label: "Electronic", emoji: "🎛️" }];
  const use = pickN(r, bins, 3);
  return { kind: "soundsort", prompt: "Tap each card to hear it, then drag it to the genre it's famous in.", bins: use, items: shuffle(r, GENRE_ITEMS.filter((x) => use.some((b) => b.id === x.bin))), skill: "u:timbre:genre" };
});
const GROOVE_NAMES: [Groove, string, number][] = [["rock", "Rock", 120], ["hiphop", "Hip hop", 90], ["reggae", "Reggae", 76], ["edm", "Electronic", 126], ["bossa", "Bossa nova", 132], ["salsa", "Salsa", 176], ["swing", "Jazz swing", 150], ["country", "Country", 116]];
const genreGrooveEar = T("g5-groove-ear", (r, d) => {
  const pool = d < 0.5 ? GROOVE_NAMES.slice(0, 4) : GROOVE_NAMES;
  const [g, name, bpm] = pick(r, pool);
  const opts = shuffle(r, [[g, name] as [Groove, string], ...pickN(r, pool, 2, (x) => x[0] === g).map((x) => [x[0], x[1]] as [Groove, string])]);
  return listen({ prompt: "Just the drums! Which genre's groove is this?", sound: groove(g, 2, bpm), options: opts.map(([id, nm]) => opt(id, nm)), answer: g, skill: "u:genre:groove", why: `That's the ${name.toLowerCase()} groove.` });
});
const BEAT_COPIES: { name: string; rows: DrumId[]; steps: 8 | 16; bpm: number; target: string[] }[] = [
  { name: "rock", rows: ["kick", "snare", "hat"], steps: 8, bpm: 112, target: ["x...xx..", "..x...x.", "xxxxxxxx"] },
  { name: "boom-bap hip hop", rows: ["kick", "snare", "hat"], steps: 16, bpm: 90, target: ["x......x..x.....", "....x.......x...", "x.x.x.x.x.x.x.x."] },
  { name: "four-on-the-floor dance", rows: ["kick", "clap", "openhat"], steps: 8, bpm: 124, target: ["x.x.x.x.", "..x...x.", ".x.x.x.x"] },
  { name: "bossa nova", rows: ["kick", "rim", "shaker"], steps: 16, bpm: 120, target: ["x..x....x..x....", "x..x..x...x..x..", "xxxxxxxxxxxxxxxx"] },
];
const beatCopy = T("g5-beat-copy", (r) => {
  const b = pick(r, BEAT_COPIES);
  return beatlab("copy", `Listen to this ${b.name} beat and rebuild it.`, b.rows, b.steps, b.bpm, { target: [...b.target] }, "u:beatmaking:copy-genre");
});
const BEAT_MAKE: Make[] = [
  () => beatlab("make", "Rock backbeat: kick on beat 1, snare on beats 2 and 4, and the hi-hat on all 8 eighth notes.", ["kick", "snare", "hat"], 8, 116, { rules: [{ rule: "on", row: "kick", steps: [0] }, { rule: "on", row: "snare", steps: [2, 6] }, { rule: "count", row: "hat", min: 8 }] }, "u:beatmaking:genre"),
  () => beatlab("make", "Four on the floor: kick on EVERY beat, clap on beats 2 and 4.", ["kick", "clap", "openhat"], 8, 124, { rules: [{ rule: "on", row: "kick", steps: [0, 2, 4, 6] }, { rule: "on", row: "clap", steps: [2, 6] }] }, "u:beatmaking:genre"),
  () => beatlab("make", "Boom-bap (16 steps): kick on step 1, snare on beats 2 and 4 (steps 5 and 13), and at least 6 hi-hats.", ["kick", "snare", "hat"], 16, 90, { rules: [{ rule: "on", row: "kick", steps: [0] }, { rule: "on", row: "snare", steps: [4, 12] }, { rule: "count", row: "hat", min: 6 }] }, "u:beatmaking:genre"),
  () => beatlab("make", "House groove: kick on every beat, and an open hi-hat on every off-beat — never on the beat.", ["kick", "clap", "openhat"], 8, 124, { rules: [{ rule: "on", row: "kick", steps: [0, 2, 4, 6] }, { rule: "on", row: "openhat", steps: [1, 3, 5, 7] }, { rule: "off", row: "openhat", steps: [0, 2, 4, 6] }] }, "u:beatmaking:genre"),
];
const beatMakeGenre = variants("g5-beat-make", BEAT_MAKE);
const HOMES: [string, string][] = [["Reggae", "Jamaica"], ["Bossa nova", "Brazil"], ["Hip hop", "The Bronx, New York"], ["Jazz", "New Orleans"], ["Country", "Nashville"], ["House music", "Chicago"], ["Techno", "Detroit"]];
const genreMatch = T("g5-genre-match", (r, d) => ({ kind: "match", prompt: "Match each genre to the place where it grew up.", pairs: pickN(r, HOMES, d < 0.5 ? 3 : 4).map(([a, b]) => ({ a: { id: a, text: a }, b: { id: b, text: b } })), mode: "columns", skill: "u:genre:places" }));
const PRODUCER: Make[] = [
  () => beatlab("make", "Producer's choice! Make your own 16-step beat with at least 3 different drums and at least 12 hits.", ["kick", "snare", "hat", "clap", "openhat"], 16, 100, { rules: [{ rule: "rows", min: 3 }, { rule: "total", min: 12 }] }, "u:beatmaking:create"),
  () => beatlab("make", "Make a beat in your favorite genre — it needs a backbeat (snare on beats 2 and 4) and at least 4 kicks.", ["kick", "snare", "hat", "clap"], 16, 100, { rules: [{ rule: "on", row: "snare", steps: [4, 12] }, { rule: "count", row: "kick", min: 4 }] }, "u:beatmaking:create"),
];
const producerMake = variants("g5-producer-make", PRODUCER);
const A_MPENTA = [57, 60, 62, 64, 67, 69];
const E_MPENTA = [52, 55, 57, 59, 62, 64];
const GENRE_COMPOSE: Make[] = [
  () => compose({ prompt: "Write a hip hop melody on the synth (A minor pentatonic). Leave space for the rapper: at least 3 rests. End on A.", pitches: A_MPENTA, slots: 16, dur: 0.5, bpm: 88, rules: [{ rule: "rests", min: 3 }, { rule: "notes", min: 6 }, { rule: "end", p: 57 }], tonic: 57, inst: "synth", labels: "letters", backing: progression(["i", "VI", "III", "VII"], 57, "minor", { bpm: 88, per: 2, inst: "piano", style: "block", bass: true, drums: "hiphop" }) }, "u:compose:hiphop"),
  () => compose({ prompt: "Write a rock riff for electric guitar (E minor pentatonic): start and end on low E, and repeat your first 2 notes later.", pitches: E_MPENTA, slots: 16, dur: 0.5, bpm: 120, rules: [{ rule: "start", p: 52 }, { rule: "end", p: 52 }, { rule: "repeat", len: 2 }, { rule: "notes", min: 8 }], tonic: 52, inst: "eguitar", labels: "letters", backing: progression(["i", "i", "VI", "VII"], 52, "minor", { bpm: 120, per: 2, inst: "pad", style: "pad", bass: true, drums: "rock" }) }, "u:compose:rock"),
];
const genreCompose = variants("g5-genre-compose", GENRE_COMPOSE);

const GENRE_IDEA = idea("A tour of genres", [
  frame("ROCK (1950s and on): electric guitars, a driving bass, and drums slamming the BACKBEAT on 2 and 4.", instShow("eguitar", "bass", "snare"), piece("rock")),
  frame("HIP HOP (the Bronx, New York, 1970s): DJs loop beats, and MCs rap rhymes over them.", instShow("synthbass", "kick", "snare"), piece("hiphop")),
  frame("JAZZ (New Orleans, early 1900s): swing rhythm, a walking bass, and players who IMPROVISE their solos.", instShow("sax", "doublebass", "ride"), piece("swing")),
  frame("COUNTRY (the American South, 1920s and on): fiddle, banjo and stories you can sing along with.", instShow("violin", "banjo", "guitar"), piece("country")),
  frame("REGGAE (Jamaica, late 1960s): off-beat chords and the laid-back one-drop beat.", instShow("organ", "bass", "rim"), piece("reggae")),
], "u:genre:idea");
const SIGBEAT_IDEA = idea("Signature beats", [
  frame("Every genre has a signature beat. ROCK: kick on beat 1, the snare BACKBEAT on 2 and 4, hi-hats on every eighth.", gridPic(["kick", "snare", "hat"], BEAT_COPIES[0].target), beat({ kick: "x...xx..", snare: "..x...x.", hat: "xxxxxxxx" }, { bpm: 112, per: 2, times: 2 })),
  frame("HIP HOP's BOOM-BAP: a heavy kick (boom) and a crisp snare (bap), with a lazy little swing.", gridPic(["kick", "snare", "hat"], BEAT_COPIES[1].target), groove("hiphop", 2, 90)),
  frame("Dance music's FOUR ON THE FLOOR: the kick on every single beat, open hi-hats in between.", gridPic(["kick", "clap", "openhat"], BEAT_COPIES[2].target), beat({ kick: "x.x.x.x.", clap: "..x...x.", openhat: ".x.x.x.x" }, { bpm: 124, per: 2, times: 2 })),
], "u:beatmaking:idea");
const WORLD_IDEA = idea("A world of genres", [
  frame("SALSA grew in New York from Cuban and Puerto Rican roots. It rides the clave rhythm with congas, cowbell and piano.", instShow("conga", "cowbell", "piano"), piece("salsa")),
  frame("BOSSA NOVA (Brazil, late 1950s): soft guitar, gentle syncopation — cool and calm.", instShow("guitar", "flute"), piece("bossa")),
  frame("GOSPEL: choirs, organ and hand claps — music of praise from Black churches.", instShow("choir", "organ", "clap"), piece("gospel")),
  frame("ELECTRONIC music is built from synthesizers and drum machines. House music began in Chicago and techno in Detroit, in the 1980s.", instShow("synth", "synthbass"), piece("edm")),
  frame("CLASSICAL: written-down music for orchestras and soloists, from Bach to composers writing today.", instShow("violin", "cello", "piano"), piece("minuet")),
], "u:genre:idea");
const PRODUCER_IDEA = idea("The producer's chair", [
  frame("A PRODUCER chooses the ingredients: tempo, drums, bass, chords and sounds. Change the ingredients and you change the genre.", gridPic(["kick", "snare", "hat"], BEAT_COPIES[1].target), piece("lofi")),
  frame("Your turn in the producer's chair: build a beat, write a hip hop melody, and play a rock riff.", instShow("synth", "eguitar"), progression(["i", "VI", "III", "VII"], 57, "minor", { bpm: 88, per: 2, inst: "piano", style: "block", bass: true, drums: "hiphop" })),
], "u:beatmaking:idea");

const GENRE_JETTY: WorldDef = {
  id: "g5-genre-jetty",
  title: "Genre Jetty",
  emoji: "🎧",
  grade: "5",
  blurb: "Rock, hip hop, jazz, country, reggae, Latin, gospel, electronic: what makes each one tick — and its signature beat.",
  talk: ["What's your favorite genre right now? What instruments and beat make it sound that way?", "Which genre would a grown-up in the family pick? Play one song from each and compare."],
  challenge: "Listen to the radio or a playlist for 10 minutes and name the genre of every song you hear.",
  stages: [
    {
      title: "Genre tour",
      emoji: "🗺️",
      levels: 1,
      topics: [genreEar, genreFacts, genreInstSort, genreGrooveEar],
      fixed: (r) => [GENRE_IDEA, genreEar.gen(r, 0), genreFacts.gen(r, 0), genreInstSort.gen(r, 0), genreGrooveEar.gen(r, 0.2), genreEar.gen(r, 0.3), genreFacts.gen(r, 0.4)],
    },
    {
      title: "Signature beats",
      emoji: "🥁",
      levels: 2,
      topics: [beatCopy, beatMakeGenre, genreGrooveEar, genreEar],
      fixed: teach((r) => [SIGBEAT_IDEA, beatCopy.gen(r, 0)], [beatMakeGenre, genreGrooveEar, genreFacts, beatCopy, genreEar]),
      unlocks: ["groove:rock", "inst:eguitar"],
    },
    {
      title: "World of genres",
      emoji: "🌎",
      levels: 2,
      topics: [genreEar, genreMatch, genreInstSort, genreFacts, genreGrooveEar],
      fixed: teach((r) => [WORLD_IDEA, genreEar.gen(r, 0.8)], [genreEar, genreMatch, genreInstSort, genreFacts, genreGrooveEar]),
      unlocks: ["drum:ride"],
    },
    {
      title: "Producer's chair",
      emoji: "🎛️",
      levels: 1,
      topics: [producerMake, genreCompose],
      unlocks: ["groove:hiphop"],
      fixed: (r) => [PRODUCER_IDEA, PRODUCER[0](r), GENRE_COMPOSE[0](r), BEAT_MAKE[2](r), GENRE_COMPOSE[1](r), genreEar.gen(r, 0.9), genreMatch.gen(r, 0.6)],
    },
  ],
};

// ── Songwriter's Studio: verse/chorus/bridge, hooks, rhyme schemes, I–V–vi–IV, write a chorus ──
const introS = () => progression(["I", "V"], 60, "major", { bpm: 112, per: 2, inst: "piano", style: "arp" });
const verse5S = () => layer(progression(["vi", "IV"], 60, "major", { bpm: 112, per: 2, inst: "piano", style: "block" }), melody([60, 60, 62, 64], 1, "clarinet", 112));
const chorus5S = () => layer(progression(["I", "V", "vi", "IV"], 60, "major", { bpm: 112, per: 1, inst: "guitar", style: "block", drums: "pop" }), melody([72, 72, 71, 67], 1, "trumpet", 112));
const bridge5S = () => layer(progression(["IV", "V"], 60, "major", { bpm: 112, per: 2, inst: "strings", style: "pad" }), melody([69, 71, 72, 74], 1, "violin", 112));
const SECTIONS5 = (): Record<string, Score> => ({ Intro: introS(), Verse: verse5S(), Chorus: chorus5S(), Bridge: bridge5S() });
const FORMS5 = [["Verse", "Chorus", "Verse", "Chorus"], ["Intro", "Verse", "Chorus", "Verse", "Chorus"], ["Verse", "Chorus", "Verse", "Chorus", "Bridge", "Chorus"], ["Intro", "Chorus", "Verse", "Chorus"], ["Verse", "Verse", "Chorus", "Bridge", "Chorus"]];
const songFormBuild = T("g5-songform-build", (r, d) => {
  const ord = [...pick(r, d < 0.5 ? FORMS5.slice(0, 2) : FORMS5)];
  const all = SECTIONS5();
  const sections: Record<string, Score> = {};
  for (const k of new Set(ord)) sections[k] = all[k];
  return { kind: "form", mode: "build", prompt: "Listen to the whole song. Drag the section blocks into the order you hear.", sections, order: ord, skill: "u:form:verse-chorus" };
});
const PHR = { A: [64, 64, 65, 67, 67, 65, 64, 62], B: [69, 69, 67, 65, 64, 62, 60, 62], C: [72, 71, 69, 67, 65, 64, 62, 60] };
const phrase = (k: "A" | "B" | "C", inst: InstId) => melody(PHR[k], [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], inst, 104);
const LABEL_FORMS = ["AABA", "ABAB", "ABAC", "AABB"];
const formLabel = T("g5-form-label", (r) => {
  const ans = pick(r, LABEL_FORMS);
  const inst = pick(r, ["piano", "flute", "violin"] as InstId[]);
  const ord = ans.split("");
  const sections: Record<string, Score> = {};
  for (const k of new Set(ord)) sections[k] = phrase(k as "A" | "B" | "C", inst);
  return { kind: "form", mode: "label", prompt: "Listen to the phrases. Which form is it? (Same letter = the same music.)", sections, order: ord, options: shuffle(r, [ans, ...pickN(r, LABEL_FORMS, 2, (x) => x === ans)]), answer: ans, skill: "u:form:label" };
});
const HOOK_Q: Q[] = [
  { q: "What is a HOOK?", a: "The catchy bit you can't stop singing — usually in the chorus", w: ["The first note of every song", "A song with no words"] },
  { q: "Which part of a song usually comes back with the SAME words each time?", a: "The chorus", w: ["The verse", "The intro"] },
  { q: "Which part tells the story, with NEW words each time?", a: "The verse", w: ["The chorus", "The outro"] },
  { q: "What does a BRIDGE usually do?", a: "Brings something new — different chords — before the last chorus", w: ["Repeats the intro exactly", "Ends the song"] },
  { q: "Why do songwriters repeat the hook?", a: "Repetition makes it easy to remember and sing along", w: ["To make the song shorter", "Because they ran out of ideas"] },
  { q: "The INTRO of a song is…", a: "The opening, often just instruments, before the singing starts", w: ["The loudest part", "The middle section"] },
  { q: "Which is a very common song shape?", a: "Verse – chorus – verse – chorus – bridge – chorus", w: ["Chorus – chorus – chorus – chorus", "Bridge – bridge – intro"] },
];
const hookQ = quiz("g5-hook-q", "u:form:hook", HOOK_Q, 4);
const RHYME5_Q: Q[] = [
  { q: "Which word rhymes with “ocean”?", a: "motion", w: ["open", "oven"] },
  { q: "Which word rhymes with “dreaming”?", a: "gleaming", w: ["drumming", "dreamy"] },
  { q: "Which word rhymes with “forever”?", a: "never", w: ["forget", "fever"] },
  { q: "Which word rhymes with “believe”?", a: "leave", w: ["believer", "belong"] },
  { q: "Which word rhymes with “thunder”?", a: "wonder", w: ["thinker", "tender"] },
  { q: "Which pair is a PERFECT rhyme?", a: "light / night", w: ["home / alone", "time / mine"] },
  { q: "Words that ALMOST rhyme, like “home” and “alone,” make a…", a: "Slant rhyme", w: ["Perfect rhyme", "Chorus"], why: "Songwriters use slant rhymes all the time: the vowels match, but not the whole ending." },
];
const rhymeQ5 = quiz("g5-rhyme-q", "u:lyrics:rhyme", RHYME5_Q, 5);
const SCHEMES: { title: string; text: string; a: string }[] = [
  { title: "Summer Sail", text: "The waves are rolling high,\nBeneath the summer sky,\nThe seagulls call to me:\n“Come sailing on the sea!”", a: "AABB" },
  { title: "Storm", text: "I hear the thunder roll,\nThe rain begins to fall,\nIt shakes me to my soul,\nBut I'm still standing tall.", a: "ABAB" },
  { title: "Long Day", text: "We sailed out in the morning,\nThe sun was shining bright,\nWe didn't stop for lunch,\nAnd came home late at night.", a: "ABCB" },
  { title: "Max", text: "My little dog named Max\nLoves eating cracker snacks,\nHe chases every ball\nAnd never stops at all.", a: "AABB" },
  { title: "Lighthouse", text: "The lighthouse shines its light\nAcross the stormy bay,\nIt guides us through the night\nAnd shows us home each day.", a: "ABAB" },
  { title: "Drums", text: "I love to play the drums,\nI bang them really loud,\nMy sister plugs her ears,\nBut Grandma says she's proud.", a: "ABCB" },
];
const schemeQ = T("g5-scheme-q", (r) => {
  const s = pick(r, SCHEMES);
  const options: Option[] = ["AABB", "ABAB", "ABCB"].map((x) => ({ id: x, text: x }));
  return { kind: "choice", prompt: "Look at the last word of each line. What is the rhyme scheme?", visual: { type: "passage", title: s.title, text: s.text }, options, answer: s.a, layout: "row", skill: "u:lyrics:scheme", why: { AABB: "Lines 1 & 2 rhyme, then lines 3 & 4: AABB.", ABAB: "Lines 1 & 3 rhyme, and lines 2 & 4: ABAB.", ABCB: "Only lines 2 & 4 rhyme: ABCB." }[s.a] };
});
const SCHEME_SLOTS: { prompt: string; story: string; slots: { label: string; options: string[]; answer: string; why: string }[] }[] = [
  { prompt: "Finish the verse so it's ABAB.", story: "The stars come out tonight, / The ocean's calm and ___, / The moon is shining bright, / And all the world's ___.", slots: [{ label: "Line 2 ends with…", options: ["deep", "wide", "blue"], answer: "deep", why: "Line 2 has to rhyme with line 4 (the B lines): deep / asleep." }, { label: "Line 4 ends with…", options: ["asleep", "awake", "at rest"], answer: "asleep", why: "deep / asleep — the B rhyme." }] },
  { prompt: "Finish the verse so it's AABB.", story: "I grabbed my old guitar / And played it in the ___. / We sang until eleven, / Our voices up to ___.", slots: [{ label: "Line 2 ends with…", options: ["car", "van", "yard"], answer: "car", why: "guitar / car — the A rhyme." }, { label: "Line 4 ends with…", options: ["heaven", "the sky", "the roof"], answer: "heaven", why: "eleven / heaven — the B rhyme." }] },
  { prompt: "Finish the verse so it's ABAB.", story: "We're racing to the shore, / The sand is warm and ___, / We'll swim a little more, / Then stay till late at ___.", slots: [{ label: "Line 2 ends with…", options: ["white", "soft", "gold"], answer: "white", why: "white / night — the B rhyme." }, { label: "Line 4 ends with…", options: ["night", "noon", "dark"], answer: "night", why: "white / night." }] },
  { prompt: "Finish the verse so it's ABCB.", story: "The rain is pouring down, / I'm stuck inside today, / I'll write a brand-new song / And sing the clouds ___.", slots: [{ label: "Line 4 ends with…", options: ["away", "off", "gone"], answer: "away", why: "In ABCB only lines 2 and 4 rhyme: today / away." }] },
];
const rhymeSlots5 = T("g5-rhyme-slots", (r) => {
  const c = pick(r, SCHEME_SLOTS);
  return { kind: "slots", prompt: c.prompt, story: c.story, slots: c.slots.map((s) => ({ ...s, options: shuffle(r, s.options) })), skill: "u:lyrics:scheme" };
});
const SW_LINES: Line[] = [
  { syl: ["Sing", "it", "from", "the", "moun", "tain", "top"], durs: [0.5, 0.5, 0.5, 0.5, 1, 1, 4], meter: [4, 4], pitches: [67, 67, 69, 71, 72, 71, 72] },
  { syl: ["Ev", "ry", "bod", "y", "clap", "your", "hands"], durs: [1, 1, 1, 1, 1, 1, 2], meter: [4, 4], pitches: [60, 62, 64, 62, 67, 65, 64] },
  { syl: ["Danc", "ing", "round", "the", "kitch", "en", "floor"], durs: [1, 1, 1, 1, 1, 1, 2], meter: [4, 4], pitches: [64, 62, 60, 62, 64, 64, 64] },
  { syl: ["Nev", "er", "gon", "na", "stop", "the", "mu", "sic"], durs: [1, 1, 1, 1, 1, 1, 1, 1], meter: [4, 4], pitches: [67, 69, 72, 69, 67, 64, 62, 60] },
  { syl: ["Hold", "on", "tight", "and", "don't", "let", "go"], durs: [1, 1, 1, 1, 1, 1, 2], meter: [4, 4], pitches: [72, 71, 69, 67, 65, 64, 60] },
  { syl: ["Sum", "mer", "nights", "be", "neath", "the", "stars"], durs: [1, 1, 1.5, 0.5, 1, 1, 2], meter: [4, 4], pitches: [60, 64, 67, 65, 64, 62, 60] },
];
const stressT5 = T("g5-stress", (r) => stressItem(pick(r, SW_LINES), "u:lyrics:stress", 100));
const fitT5 = T("g5-fit", (r) => fitItem(pick(r, SW_LINES), "Fit the lyric to the tune: drag each syllable onto its note. Strong syllables belong on strong beats!", "u:lyrics:fit", 100));
const POP4 = [["I", "V", "vi", "IV"], ["I", "vi", "IV", "V"], ["vi", "IV", "I", "V"], ["I", "IV", "vi", "V"]];
const popProgMatch = T("g5-pop-match", (r, d) => chordsMatch("Listen, then put the chord cards in the order you hear. (vi is the minor one!)", d < 0.7 ? [...pick(r, POP4)] : [...pick(r, POP4), ...pick(r, POP4)], { palette: ["I", "IV", "V", "vi"], bpm: 96 }, "u:progression:pop"));
const VI_Q: Q[] = [
  { q: "In C major, which chord is vi?", a: "A minor", w: ["A major", "F major"], v: chordsPic(["I", "V", "vi", "IV"]) },
  { q: "Why is vi written with small letters?", a: "It's a minor chord", w: ["It's played quietly", "It's a short chord"] },
  { q: "Which famous progression do thousands of pop songs share?", a: "I – V – vi – IV", w: ["I – I – I – I", "ii – iii – vii°"] },
  { q: "In C major, I – V – vi – IV is…", a: "C – G – Am – F", w: ["C – F – G – C", "A – E – F – D"], v: chordsPic(["I", "V", "vi", "IV"]) },
  { q: "In G major, which chord is vi?", a: "E minor", w: ["E major", "C major"] },
  { q: "The vi chord is the home chord of the key's…", a: "Relative minor", w: ["Dominant", "Bridge"], why: "In C major, vi is A minor — and A minor is C major's relative minor." },
  { q: "Pachelbel's Canon (around 1700) uses a chord chain that starts…", a: "I – V – vi – iii", w: ["I – IV – V – I", "vi – IV – I – V"] },
];
const viQ = quiz("g5-vi-q", "u:chord:vi", VI_Q, 4);
const viEar = T("g5-vi-ear", (r) => {
  const deceptive = r() < 0.5;
  const t = pick(r, [60, 55, 62]);
  return listen({ prompt: "Does the progression land HOME on I, or swerve to vi — a minor surprise?", sound: progSound(["I", "IV", "V", deceptive ? "vi" : "I"], t, "major", 88), options: [opt("I", "Home on I (major)", { emoji: "🏠" }), opt("vi", "Surprise! It lands on vi (minor)", { emoji: "😮" })], answer: deceptive ? "vi" : "I", skill: "u:progression:deceptive", why: deceptive ? "V → vi is called a deceptive cadence: you expect home, and get a minor surprise." : "V → I: the classic, finished ending." });
});
const popBacking = () => progression(["I", "V", "vi", "IV"], 60, "major", { bpm: 100, per: 2, inst: "piano", style: "strum", bass: true, drums: "pop" });
const CHORUS: Make[] = [
  () => compose({ prompt: "Write your chorus melody over I – V – vi – IV: one note per syllable, ending on do.", pitches: CMAJ, slots: 8, dur: 1, bpm: 100, rules: [{ rule: "end", p: 60 }, { rule: "notes", min: 8 }], tonic: 60, inst: "piano", labels: "solfege", backing: popBacking(), lyric: ["Oh", "we", "are", "sail", "ing", "home", "to", "night"] }, "u:compose:chorus"),
  () => compose({ prompt: "Hook time! The melody of “hey, hey” (your first 2 notes) has to come back later. One note per syllable.", pitches: CMAJ, slots: 8, dur: 1, bpm: 100, rules: [{ rule: "repeat", len: 2 }, { rule: "notes", min: 8 }], tonic: 60, inst: "synth", labels: "solfege", backing: popBacking(), lyric: ["Hey", "hey", "hold", "on", "hey", "hey", "hold", "on"] }, "u:compose:chorus"),
  () => compose({ prompt: "Make the chorus soar: put the highest note in the middle (an arch) and end on do.", pitches: CMAJ, slots: 8, dur: 1, bpm: 100, rules: [{ rule: "arch" }, { rule: "end", p: 60 }, { rule: "notes", min: 8 }], tonic: 60, inst: "trumpet", labels: "solfege", backing: popBacking(), lyric: ["Sing", "it", "loud", "and", "sing", "it", "proud", "yeah"] }, "u:compose:chorus"),
];
const chorusCompose = variants("g5-chorus-compose", CHORUS);
const POP_PAL = ["I", "IV", "V", "vi"];
const POP_BUILD: Make[] = [
  () => chordsBuild("Write a 4-chord pop progression that starts on I and uses vi (the minor chord).", 4, [{ rule: "start", chord: "I" }, { rule: "use", chords: ["vi"] }], { palette: POP_PAL, bpm: 100 }, "u:progression:build-pop"),
  () => chordsBuild("8 bars: start on I, use IV, V and vi, and end back home on I.", 8, [{ rule: "start", chord: "I" }, { rule: "use", chords: ["IV", "V", "vi"] }, { rule: "end", chord: "I" }], { palette: POP_PAL, bpm: 100 }, "u:progression:build-pop"),
  () => chordsBuild("Surprise ending: start on I and finish with V → vi — a deceptive cadence!", 4, [{ rule: "start", chord: "I" }, { rule: "cadence", kind: "deceptive" }], { palette: POP_PAL, bpm: 96 }, "u:progression:build-pop"),
];
const popBuild = variants("g5-pop-build", POP_BUILD);

const SONGFORM_IDEA = idea("Song shape", [
  frame("Songs are built from SECTIONS. The VERSE tells the story — new words every time it comes around.", formPic("Verse", "Chorus", "Verse", "Chorus", "Bridge", "Chorus"), chain([verse5S(), verse5S()], 0)),
  frame("The CHORUS is the big moment that returns with the same words. Its catchiest piece is the HOOK.", formPic("Chorus"), chain([chorus5S(), chorus5S()], 0)),
  frame("The BRIDGE changes things up — new chords, a new tune — so the last chorus feels even bigger.", formPic("Bridge"), bridge5S()),
  frame("All together: intro, verse, chorus, verse, chorus, bridge, chorus!", formPic("Intro", "Verse", "Chorus", "Verse", "Chorus", "Bridge", "Chorus"), chain([introS(), verse5S(), chorus5S(), verse5S(), chorus5S(), bridge5S(), chorus5S()], 0)),
], "u:form:idea");
const RHYME_IDEA = idea("Rhyme schemes", [
  frame("Rhymes end with the same sound: light / night. Slant rhymes almost match: home / alone. Songwriters use both.", picsShow("📝"), then(sing(SW_LINES[4], "flute"), sing(SW_LINES[5], "flute"), 0.5)),
  frame("A RHYME SCHEME labels the line endings with letters. AABB: lines 1 & 2 rhyme, then 3 & 4. ABAB: lines 1 & 3 rhyme, and 2 & 4.", formPic("A", "B", "A", "B"), chain([phrase("A", "flute"), phrase("B", "flute"), phrase("A", "flute"), phrase("B", "flute")], 0)),
  frame("And keep the strong syllables on strong beats: NEV-er GON-na STOP the MU-sic.", beatsShow(4, [0, 2]), sing(SW_LINES[3], "piano", 100)),
], "u:lyrics:idea");
const FOURCHORD_IDEA = idea("Four magic chords", [
  frame("Meet vi — the minor chord that lives inside a major key. In C major, vi is A minor (A–C–E).", chordsPic(["I", "vi"]), then(chordSound([60, 64, 67], "piano", 2, 80), chordSound([57, 60, 64], "piano", 2, 80), 0.5)),
  frame("I – V – vi – IV (C – G – Am – F) powers thousands of pop songs. Hear it loop!", chordsPic(["I", "V", "vi", "IV"]), chain([popBacking(), popBacking()], 0)),
  frame("It isn't new: Pachelbel's Canon (around 1700) uses a similar chain — I, V, vi, iii, IV, I, IV, V.", chordsPic(["I", "V", "vi", "iii", "IV", "I", "IV", "V"], 62), progSound(["I", "V", "vi", "iii", "IV", "I", "IV", "V"], 62, "major", 72)),
], "u:progression:idea");
const CHORUS_IDEA = idea("Write a chorus", [
  frame("A great chorus has strong chords (I – V – vi – IV), a hook that repeats, and words that land on the beat.", chordsPic(["I", "V", "vi", "IV"]), layer(popBacking(), melody([72, 72, 71, 67, 69, 69, 67, 64], 1, "trumpet", 100))),
  frame("Write it, hear it with the band, and keep it in your Studio. You're a songwriter!", formPic("Verse", "Chorus"), layer(popBacking(), sing({ syl: ["Oh", "we", "are", "sail", "ing", "home", "to", "night"], durs: [1, 1, 1, 1, 1, 1, 1, 1], meter: [4, 4], pitches: [67, 67, 69, 72, 71, 69, 67, 64] }, "flute", 100))),
], "u:compose:idea");

const SONGWRITER: WorldDef = {
  id: "g5-songwriters-studio",
  title: "Songwriter's Studio",
  emoji: "✍️",
  grade: "5",
  blurb: "Write like a pro: verse, chorus and bridge, catchy hooks, rhyme schemes, and the four chords behind a thousand hits.",
  talk: ["What makes a chorus catchy? Sing the hook of a song you love.", "Can you write a four-line verse together with an ABAB rhyme scheme?"],
  challenge: "Write a chorus about your family or your pet — four lines that rhyme — and sing it over any song's chords.",
  stages: [
    {
      title: "Song shape",
      emoji: "🏗️",
      levels: 1,
      topics: [songFormBuild, hookQ, formLabel],
      fixed: (r) => [SONGFORM_IDEA, songFormBuild.gen(r, 0), hookQ.gen(r, 0), formLabel.gen(r, 0.2), hookQ.gen(r, 0.3), songFormBuild.gen(r, 0.6), formLabel.gen(r, 0.6)],
    },
    {
      title: "Rhyme time",
      emoji: "📝",
      levels: 2,
      topics: [rhymeQ5, schemeQ, rhymeSlots5, stressT5],
      fixed: teach((r) => [RHYME_IDEA, schemeQ.gen(r, 0)], [rhymeSlots5, rhymeQ5, stressT5, schemeQ, fitT5]),
      unlocks: ["tool:lyrics"],
    },
    {
      title: "Four magic chords",
      emoji: "🎹",
      levels: 2,
      topics: [popProgMatch, viQ, viEar, fitT5, stressT5],
      fixed: teach((r) => [FOURCHORD_IDEA, popProgMatch.gen(r, 0)], [popProgMatch, viQ, viEar, fitT5, stressT5]),
    },
    {
      title: "Write a chorus",
      emoji: "🌟",
      levels: 1,
      topics: [chorusCompose, popBuild],
      unlocks: ["tool:bars4"],
      fixed: (r) => [CHORUS_IDEA, POP_BUILD[0](r), CHORUS[0](r), fitT5.gen(r, 0.6), rhymeSlots5.gen(r, 0.6), CHORUS[1](r), POP_BUILD[2](r)],
    },
  ],
};


/** All 4th grade worlds, then all 5th grade worlds. */
export const WORLDS: WorldDef[] = [DUNES, MOUNTAIN, SHOALS, COVE_W, TOWER, HISTORY, STUDIO_4, MINES, SYNCO_SEA, BLUES_BAYOU, SIX8_SHORES, GENRE_JETTY, SONGWRITER].map(noRepeats);
