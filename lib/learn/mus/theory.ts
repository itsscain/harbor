import type { Meter } from "./types";

// Music theory for Harbor Learn, as plain functions: pitches and their names, how a note is
// spelled in a key (so it lands on the right line of the staff), scales, solfège, intervals,
// chords and roman numerals, key signatures, and the rhythm cells kids read (Kodály syllables:
// ta, ti-ti, ta-a…). Everything here is pure — the checker uses it to prove every answer right.

// ── Pitches ──────────────────────────────────────────────────────────────────────────────────
export const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
/** The pitch class of each natural letter. */
export const NATURAL_PC = [0, 2, 4, 5, 7, 9, 11];
export const SHARP_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
export const FLAT_NAMES = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];

export const pcOf = (m: number) => ((m % 12) + 12) % 12;
export const octaveOf = (m: number) => Math.floor(m / 12) - 1;
export const midiToHz = (m: number) => 440 * 2 ** ((m - 69) / 12);
export const hzToMidi = (hz: number) => 69 + 12 * Math.log2(hz / 440);
/** A note's name: "C", "F♯", "B♭" (add the octave with `octave: true`: "C4"). */
export function noteName(m: number, o: { flats?: boolean; octave?: boolean } = {}): string {
  const n = (o.flats ? FLAT_NAMES : SHARP_NAMES)[pcOf(m)];
  return o.octave ? `${n}${octaveOf(m)}` : n;
}
/** "C4" / "F#3" / "Bb5" / "C♯4" → MIDI. */
export function parseNote(s: string): number {
  const m = /^([A-Ga-g])([#♯b♭]?)(-?\d)?$/.exec(s.trim());
  if (!m) throw new Error(`bad note ${s}`);
  const letter = LETTERS.indexOf(m[1].toUpperCase() as (typeof LETTERS)[number]);
  const acc = m[2] === "#" || m[2] === "♯" ? 1 : m[2] === "b" || m[2] === "♭" ? -1 : 0;
  const oct = m[3] === undefined ? 4 : Number(m[3]);
  return (oct + 1) * 12 + NATURAL_PC[letter] + acc;
}
/** Shorthand for content: n("C4") = 60. */
export const n = parseNote;

// ── Spelling and the staff ───────────────────────────────────────────────────────────────────
/** Key signatures as a count of fifths: −7 (seven flats) … 0 (C major / A minor) … 7 (seven sharps). */
export const SHARP_ORDER = [3, 0, 4, 1, 5, 2, 6]; // F C G D A E B (letter indexes)
export const FLAT_ORDER = [6, 2, 5, 1, 4, 0, 3]; // B E A D G C F
/** The accidental a key signature puts on a letter (+1 sharp, −1 flat, 0 none). */
export function keyAcc(fifths: number, letter: number): number {
  if (fifths > 0) return SHARP_ORDER.slice(0, fifths).includes(letter) ? 1 : 0;
  if (fifths < 0) return FLAT_ORDER.slice(0, -fifths).includes(letter) ? -1 : 0;
  return 0;
}
export type Spelled = { letter: number; acc: number; oct: number };
/** How a pitch is written in a key: its letter, accidental and octave. Notes in the key use the key's
 *  spelling; others lean on sharps in sharp keys (and C) and flats in flat keys. */
export function spell(m: number, fifths = 0): Spelled {
  const pc = pcOf(m);
  let best: Spelled | null = null;
  let bestScore = 99;
  for (let letter = 0; letter < 7; letter++) {
    let acc = pc - NATURAL_PC[letter];
    if (acc > 6) acc -= 12;
    if (acc < -6) acc += 12;
    if (Math.abs(acc) > 1) continue;
    const inKey = acc === keyAcc(fifths, letter);
    const score = inKey ? 0 : acc === 0 ? 1 : (fifths >= 0 ? acc > 0 : acc < 0) ? 2 : 3;
    if (score < bestScore) {
      bestScore = score;
      const oct = Math.round((m - acc - NATURAL_PC[letter]) / 12) - 1;
      best = { letter, acc, oct };
    }
  }
  return best!;
}
/** The note's position on the staff in half-spaces (a line or a space): middle C (C4) = 28. */
export const staffStep = (s: Spelled) => s.oct * 7 + s.letter;
/** The staff step of the bottom line: treble E4, bass G2. */
export const BOTTOM_LINE: Record<"treble" | "bass", number> = { treble: 30, bass: 18 };
/** Letter name of a staff step ("E", "G"…). */
export const stepLetter = (step: number) => LETTERS[((step % 7) + 7) % 7];
/** The natural MIDI pitch at a staff step (no accidental). */
export const stepToMidi = (step: number) => (Math.floor(step / 7) + 1) * 12 + NATURAL_PC[((step % 7) + 7) % 7];
/** Is a staff step on a line (vs. a space) for this clef? */
export const onLine = (step: number, clef: "treble" | "bass") => (((step - BOTTOM_LINE[clef]) % 2) + 2) % 2 === 0;
/** A note's written name in a key ("F♯", "B♭", "E"). */
export function spelledName(m: number, fifths = 0): string {
  const s = spell(m, fifths);
  return LETTERS[s.letter] + (s.acc === 1 ? "♯" : s.acc === -1 ? "♭" : "");
}

// ── Scales ───────────────────────────────────────────────────────────────────────────────────
export type ScaleKind = "major" | "minor" | "harmonic" | "penta" | "minorPenta" | "blues" | "dorian" | "mixolydian" | "lydian" | "phrygian" | "chromatic" | "somi" | "sml" | "dms" | "dmsl";
export const SCALES: Record<ScaleKind, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
  penta: [0, 2, 4, 7, 9],
  minorPenta: [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  // The Kodály ladder for little ones: so-mi, then so-mi-la, do-mi-so, do-mi-so-la.
  somi: [4, 7],
  sml: [4, 7, 9],
  dms: [0, 4, 7],
  dmsl: [0, 4, 7, 9],
};
/** The pitches of a scale from a tonic, low → high (`top` adds the octave on top). */
export function scale(tonic: number, kind: ScaleKind, octaves = 1, top = true): number[] {
  const out: number[] = [];
  for (let o = 0; o < octaves; o++) for (const s of SCALES[kind]) out.push(tonic + o * 12 + s);
  if (top) out.push(tonic + octaves * 12);
  return out;
}
/** Is this pitch in the scale (any octave)? */
export const inScale = (m: number, tonic: number, kind: ScaleKind) => SCALES[kind].includes(pcOf(m - tonic));
/** Whole (W) and half (H) steps between the notes of a scale. */
export function stepPattern(pitches: number[]): string[] {
  return pitches.slice(1).map((p, i) => (p - pitches[i] === 1 ? "H" : p - pitches[i] === 2 ? "W" : `${p - pitches[i]}`));
}

// ── Solfège (movable do) ─────────────────────────────────────────────────────────────────────
const SOL = ["do", "ra", "re", "me", "mi", "fa", "fi", "so", "le", "la", "te", "ti"];
/** The solfège syllable of a pitch, with Kodály octave marks: low la is "la,", high do is "do'". */
export function solfege(m: number, tonic: number, marks = true): string {
  const d = m - tonic;
  const syl = SOL[pcOf(d)];
  if (!marks) return syl;
  const oct = Math.floor(d / 12);
  return oct < 0 ? `${syl},` : oct > 0 ? `${syl}'` : syl;
}
/** Kid words for the octave marks ("low la", "high do"). */
export function solfegeWords(m: number, tonic: number): string {
  const d = m - tonic;
  const syl = SOL[pcOf(d)];
  const oct = Math.floor(d / 12);
  return oct < 0 ? `low ${syl}` : oct > 0 ? `high ${syl}` : syl;
}

// ── Intervals ────────────────────────────────────────────────────────────────────────────────
export const INTERVALS: { semis: number; name: string; short: string; kid: string }[] = [
  { semis: 0, name: "unison", short: "P1", kid: "the same note" },
  { semis: 1, name: "minor 2nd", short: "m2", kid: "a half step" },
  { semis: 2, name: "major 2nd", short: "M2", kid: "a whole step" },
  { semis: 3, name: "minor 3rd", short: "m3", kid: "a small skip" },
  { semis: 4, name: "major 3rd", short: "M3", kid: "a big skip" },
  { semis: 5, name: "perfect 4th", short: "P4", kid: "a 4th" },
  { semis: 6, name: "tritone", short: "TT", kid: "the tritone" },
  { semis: 7, name: "perfect 5th", short: "P5", kid: "a 5th" },
  { semis: 8, name: "minor 6th", short: "m6", kid: "a minor 6th" },
  { semis: 9, name: "major 6th", short: "M6", kid: "a major 6th" },
  { semis: 10, name: "minor 7th", short: "m7", kid: "a minor 7th" },
  { semis: 11, name: "major 7th", short: "M7", kid: "a major 7th" },
  { semis: 12, name: "octave", short: "P8", kid: "an octave" },
];
export const intervalName = (semis: number) => INTERVALS[Math.abs(semis) % 13]?.name ?? `${semis} half steps`;
/** The interval NUMBER by letter distance (C up to E = a 3rd), as kids first learn it. */
export function intervalNumber(a: number, b: number, fifths = 0): number {
  const sa = staffStep(spell(a, fifths));
  const sb = staffStep(spell(b, fifths));
  return Math.abs(sb - sa) + 1;
}
export const ORDINAL = ["", "unison", "2nd", "3rd", "4th", "5th", "6th", "7th", "octave"];

// ── Chords ───────────────────────────────────────────────────────────────────────────────────
export type ChordQuality = "maj" | "min" | "dim" | "aug" | "7" | "maj7" | "m7" | "m7b5" | "dim7" | "sus2" | "sus4" | "5";
export const CHORD_SHAPES: Record<ChordQuality, number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  "7": [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  m7b5: [0, 3, 6, 10],
  dim7: [0, 3, 6, 9],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  "5": [0, 7],
};
export const QUALITY_NAME: Record<ChordQuality, string> = { maj: "major", min: "minor", dim: "diminished", aug: "augmented", "7": "dominant 7th", maj7: "major 7th", m7: "minor 7th", m7b5: "half-diminished", dim7: "diminished 7th", sus2: "sus2", sus4: "sus4", "5": "power chord" };
const QUALITY_SUFFIX: Record<ChordQuality, string> = { maj: "", min: "m", dim: "dim", aug: "+", "7": "7", maj7: "maj7", m7: "m7", m7b5: "m7♭5", dim7: "dim7", sus2: "sus2", sus4: "sus4", "5": "5" };
/** A chord's pitches from its root, with an inversion (1 = the root moves up an octave…). */
export function chordPitches(root: number, q: ChordQuality, inversion = 0): number[] {
  const ps = CHORD_SHAPES[q].map((s) => root + s);
  for (let i = 0; i < inversion; i++) ps.push(ps.shift()! + 12);
  return ps;
}
/** "C", "Am", "Bdim", "G7", "Fmaj7". */
export const chordSymbol = (root: number, q: ChordQuality, flats = false) => noteName(root, { flats }) + QUALITY_SUFFIX[q];
/** Which chord (root + quality) a set of pitches makes, if it's one we know (any inversion/octave). */
export function nameChord(pitches: number[]): { root: number; q: ChordQuality } | null {
  const pcs = [...new Set(pitches.map(pcOf))];
  for (const root of pcs)
    for (const q of Object.keys(CHORD_SHAPES) as ChordQuality[]) {
      const want = CHORD_SHAPES[q].map((s) => pcOf(root + s));
      if (want.length === pcs.length && want.every((p) => pcs.includes(p))) return { root, q };
    }
  return null;
}

// ── Roman numerals ───────────────────────────────────────────────────────────────────────────
const ROMAN_DEG: Record<string, number> = { I: 0, II: 1, III: 2, IV: 3, V: 4, VI: 5, VII: 6 };
export const ROMAN_MAJOR = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];
export const ROMAN_MINOR = ["i", "ii°", "III", "iv", "v", "VI", "VII"];
export type Roman = { roman: string; degree: number; shift: number; q: ChordQuality };
/** Parse "V7", "ii", "vii°", "IV", "bVII", "Imaj7", "iiø7", "V/V"-free numerals. */
export function parseRoman(r: string): Roman {
  const m = /^([b#♭♯]?)(VII|VI|V|IV|III|II|I|vii|vi|v|iv|iii|ii|i)(°7|ø7|°|o|\+|maj7|7|sus4|sus2)?$/.exec(r.trim());
  if (!m) throw new Error(`bad roman ${r}`);
  const shift = m[1] === "b" || m[1] === "♭" ? -1 : m[1] === "#" || m[1] === "♯" ? 1 : 0;
  const upper = m[2] === m[2].toUpperCase();
  const deg = ROMAN_DEG[m[2].toUpperCase()];
  const suf = m[3] ?? "";
  let q: ChordQuality;
  if (suf === "°" || suf === "o") q = "dim";
  else if (suf === "°7") q = "dim7";
  else if (suf === "ø7") q = "m7b5";
  else if (suf === "+") q = "aug";
  else if (suf === "maj7") q = "maj7";
  else if (suf === "7") q = upper ? "7" : "m7";
  else if (suf === "sus4") q = "sus4";
  else if (suf === "sus2") q = "sus2";
  else q = upper ? "maj" : "min";
  return { roman: r, degree: deg, shift, q };
}
/** The chord a roman numeral names in a key: its root (placed from the tonic up), quality and
 *  pitches (root position, around the tonic's octave). */
export function romanChord(r: string, tonic: number, mode: "major" | "minor" = "major"): { root: number; q: ChordQuality; pitches: number[] } {
  const x = parseRoman(r);
  const steps = mode === "minor" ? SCALES.minor : SCALES.major;
  const root = tonic + steps[x.degree] + x.shift;
  return { root, q: x.q, pitches: chordPitches(root, x.q) };
}
/** Tonic, predominant or dominant — what job a chord does in the key. */
export function chordFunction(r: string): "tonic" | "predominant" | "dominant" {
  const d = parseRoman(r).degree;
  return d === 4 || d === 6 ? "dominant" : d === 1 || d === 3 ? "predominant" : "tonic";
}
/** The cadence the last two chords make (or null). */
export function cadenceOf(a: string, b: string): "authentic" | "plagal" | "half" | "deceptive" | null {
  const x = parseRoman(a).degree;
  const y = parseRoman(b).degree;
  if (y === 4) return "half";
  if ((x === 4 || x === 6) && y === 0) return "authentic";
  if (x === 3 && y === 0) return "plagal";
  if (x === 4 && y === 5) return "deceptive";
  return null;
}

// ── Keys ─────────────────────────────────────────────────────────────────────────────────────
/** Major key tonics around the circle of fifths: index = fifths + 7 (so −7 = C♭ … 7 = C♯). */
const MAJOR_BY_FIFTHS = ["C♭", "G♭", "D♭", "A♭", "E♭", "B♭", "F", "C", "G", "D", "A", "E", "B", "F♯", "C♯"];
const MINOR_BY_FIFTHS = ["A♭", "E♭", "B♭", "F", "C", "G", "D", "A", "E", "B", "F♯", "C♯", "G♯", "D♯", "A♯"];
export const keyName = (fifths: number, mode: "major" | "minor" = "major") => `${(mode === "major" ? MAJOR_BY_FIFTHS : MINOR_BY_FIFTHS)[fifths + 7]} ${mode}`;
/** The tonic pitch class of a key. */
export const keyTonicPc = (fifths: number, mode: "major" | "minor" = "major") => pcOf((mode === "major" ? 0 : 9) + fifths * 7);
/** The circle of fifths, clockwise from C (majors, with their relative minors). */
export const CIRCLE = [0, 1, 2, 3, 4, 5, 6, -5, -4, -3, -2, -1].map((f) => ({ fifths: f, major: MAJOR_BY_FIFTHS[f + 7], minor: MINOR_BY_FIFTHS[f + 7].toLowerCase().replace("♯", "♯").replace("♭", "♭") }));
/** The letters a key signature sharps or flats, in order ("F", "C"… or "B", "E"…). */
export function keySigLetters(fifths: number): string[] {
  return fifths >= 0 ? SHARP_ORDER.slice(0, fifths).map((l) => LETTERS[l]) : FLAT_ORDER.slice(0, -fifths).map((l) => LETTERS[l]);
}

// ── Tempo and dynamics ───────────────────────────────────────────────────────────────────────
export const TEMPO_WORDS: { word: string; lo: number; hi: number; kid: string }[] = [
  { word: "Largo", lo: 40, hi: 60, kid: "very slow and broad" },
  { word: "Adagio", lo: 61, hi: 76, kid: "slow and calm" },
  { word: "Andante", lo: 77, hi: 108, kid: "at a walking pace" },
  { word: "Moderato", lo: 109, hi: 120, kid: "medium" },
  { word: "Allegro", lo: 121, hi: 160, kid: "fast and happy" },
  { word: "Presto", lo: 161, hi: 208, kid: "very fast" },
];
export const tempoWord = (bpm: number) => TEMPO_WORDS.find((t) => bpm >= t.lo && bpm <= t.hi)?.word ?? (bpm < 40 ? "Largo" : "Presto");
export const DYNAMICS: { mark: string; word: string; kid: string; gain: number }[] = [
  { mark: "pp", word: "pianissimo", kid: "very soft", gain: 0.18 },
  { mark: "p", word: "piano", kid: "soft", gain: 0.32 },
  { mark: "mp", word: "mezzo piano", kid: "medium soft", gain: 0.48 },
  { mark: "mf", word: "mezzo forte", kid: "medium loud", gain: 0.62 },
  { mark: "f", word: "forte", kid: "loud", gain: 0.82 },
  { mark: "ff", word: "fortissimo", kid: "very loud", gain: 1 },
];

// ── Rhythm ───────────────────────────────────────────────────────────────────────────────────
/** A rhythm cell: what kids read as one piece. Durations in beats (negative = a rest), the
 *  Kodály syllables (one per note or rest) and a name. */
export type Cell = { durs: number[]; syl: string[]; name: string };
const t3 = 1 / 3;
export const RHYTHM: Record<string, Cell> = {
  ta: { durs: [1], syl: ["ta"], name: "quarter note" },
  titi: { durs: [0.5, 0.5], syl: ["ti", "ti"], name: "two eighth notes" },
  z: { durs: [-1], syl: ["shh"], name: "quarter rest" },
  taa: { durs: [2], syl: ["ta-a"], name: "half note" },
  zz: { durs: [-2], syl: ["shh-shh"], name: "half rest" },
  taaa: { durs: [3], syl: ["ta-a-a"], name: "dotted half note" },
  whole: { durs: [4], syl: ["ta-a-a-a"], name: "whole note" },
  wrest: { durs: [-4], syl: ["shh…"], name: "whole rest" },
  tika: { durs: [0.25, 0.25, 0.25, 0.25], syl: ["ti", "ka", "ti", "ka"], name: "four sixteenth notes" },
  titika: { durs: [0.5, 0.25, 0.25], syl: ["ti", "ti", "ka"], name: "eighth + two sixteenths" },
  tikati: { durs: [0.25, 0.25, 0.5], syl: ["ti", "ka", "ti"], name: "two sixteenths + eighth" },
  synco: { durs: [0.5, 1, 0.5], syl: ["syn", "co", "pa"], name: "syncopation" },
  tamti: { durs: [1.5, 0.5], syl: ["tam", "ti"], name: "dotted quarter + eighth" },
  titam: { durs: [0.5, 1.5], syl: ["ti", "tam"], name: "eighth + dotted quarter" },
  timri: { durs: [0.75, 0.25], syl: ["tim", "ri"], name: "dotted eighth + sixteenth" },
  ritim: { durs: [0.25, 0.75], syl: ["ri", "tim"], name: "sixteenth + dotted eighth" },
  trip: { durs: [t3, t3, t3], syl: ["tri", "o", "la"], name: "triplet" },
  ti: { durs: [0.5], syl: ["ti"], name: "eighth note" },
  zi: { durs: [-0.5], syl: ["sh"], name: "eighth rest" },
  // Compound meter (6/8): three eighths, quarter + eighth, dotted quarter.
  tititi: { durs: [0.5, 0.5, 0.5], syl: ["ti", "ti", "ti"], name: "three eighth notes" },
  tati: { durs: [1, 0.5], syl: ["ta", "ti"], name: "quarter + eighth" },
  tai: { durs: [1.5], syl: ["ta-i"], name: "dotted quarter note" },
  zai: { durs: [-1.5], syl: ["shh"], name: "dotted quarter rest" },
};
export const isCell = (id: string) => id in RHYTHM;
export const cellBeats = (id: string) => RHYTHM[id].durs.reduce((s, d) => s + Math.abs(d), 0);
export const cellsDurs = (cells: string[]) => cells.flatMap((c) => RHYTHM[c].durs);
export const cellsBeats = (cells: string[]) => cells.reduce((s, c) => s + cellBeats(c), 0);
/** Beats (quarter notes) in one bar: 4/4 → 4, 3/4 → 3, 6/8 → 3, 2/2 → 4, 7/8 → 3.5. */
export const barBeats = (m: Meter) => (m[0] * 4) / m[1];
/** The felt beats in a bar (their lengths in quarter notes): 4/4 → [1,1,1,1], 6/8 → [1.5,1.5],
 *  7/8 → [1,1,1.5], 5/4 → [1,1,1,1,1], 2/2 → [2,2]. The first is the strong beat. */
export function pulses(m: Meter): number[] {
  const [a, b] = m;
  if (b === 8 && a % 3 === 0) return Array.from({ length: a / 3 }, () => 1.5);
  if (b === 8 && a === 7) return [1, 1, 1.5];
  if (b === 8 && a === 5) return [1, 1.5];
  if (b === 2) return Array.from({ length: a }, () => 2);
  return Array.from({ length: a }, () => (4 / b) * 1);
}
const EPS = 1e-6;
export const near = (a: number, b: number) => Math.abs(a - b) < EPS;
/** When each sounding note starts (beats from the start), and the total length. */
export function onsetsOf(durs: number[]): { onsets: number[]; len: number } {
  const onsets: number[] = [];
  let t = 0;
  for (const d of durs) {
    if (d > 0) onsets.push(t);
    t += Math.abs(d);
  }
  return { onsets, len: t };
}
/** Split a run of cells into bars; null if a cell would cross a bar line (kids' puzzles never tie). */
export function intoBars(cells: string[], m: Meter): string[][] | null {
  const per = barBeats(m);
  const bars: string[][] = [[]];
  let t = 0;
  for (const c of cells) {
    const b = cellBeats(c);
    if (t + b > per + EPS) return null;
    bars[bars.length - 1].push(c);
    t += b;
    if (near(t, per)) {
      bars.push([]);
      t = 0;
    }
  }
  if (!bars[bars.length - 1].length) bars.pop();
  return bars;
}
/** Does a bar hold exactly the right number of beats? */
export const barFull = (cells: string[], m: Meter) => near(cellsBeats(cells), barBeats(m));

// ── Colors ───────────────────────────────────────────────────────────────────────────────────
/** One color per pitch class (like classroom boomwhackers: C red, D orange, E yellow, F green,
 *  G teal, A purple, B pink). Sharps sit between their neighbors. */
export const NOTE_COLORS = ["#ff4d4d", "#ff7a3d", "#ff9f1c", "#ffc21a", "#ffd93d", "#8ad43f", "#3ccf6e", "#1fb8a8", "#1c9cf0", "#7b5cff", "#b45cff", "#ff5cb8"];
export const noteColor = (m: number) => NOTE_COLORS[pcOf(m)];
