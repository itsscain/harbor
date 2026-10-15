import type { Activity } from "../../types";
import type { BeatRule, ChordRule, ComposeRule, DrumId, InstId, MHit, MNote, MOption, MTrack, MusicShow, Score, StaffNote } from "../types";
import { int, items, keyOf, pick, pickN, shuffle, type Rng, type Topic, type WorldDef } from "../../gen";
import { CIRCLE, LETTERS, ROMAN_MAJOR, intervalName, keyAcc, keyName, keySigLetters, keyTonicPc, midiToHz, pcOf, romanChord, scale, spell, spelledName, staffStep, stepLetter, stepToMidi } from "../theory";
import { GROOVES, beat, chain, chordSound, groove, hairpin, layer, melody, note1, progression, then, tone, transpose, withFx, type Groove } from "../score";
import { song } from "../songs";
import { frame, idea, instOpt, keysShow, listen, naturals, opt, seeChoice, soundOpt, staffShow, topic } from "../make";

// Music for 6th grade — middle school. Real terminology, real producer / songwriter / composer
// skills and a grown-up tone, but still hands-on: every stage opens with an explainer you can hear,
// practices by ear, eye and hand, and every island ends by MAKING something with what it taught.
//
//   Interval Island · Beat Lab Pro · Bass Clef Bay · Sound Science Station · Key Signature Keys ·
//   Chord Quality Canyon · Melody Writing Workshop · Producer 101 (the capstone: a whole track)
//
// Practice stages draw fresh items from topic generators (so review and boss levels can make more);
// the first level of each stage opens with an "idea". Skill keys "u:<family>:<detail>". Topic keys
// start with "g6-" so they never collide with another band's topics in the course-wide review index.

type Stage = WorldDef["stages"][number];
type Q = "maj" | "min" | "dim" | "aug";
type Rows = Partial<Record<DrumId, string>>;

// ── Shared helpers ─────────────────────────────────────────────────────────────────────────────
const range = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
const ACC = (a: number) => (a === 1 ? "♯" : a === -1 ? "♭" : a === 2 ? "𝄪" : a === -2 ? "𝄫" : "");
/** A note's letter name in a key ("F♯"). */
const nm = (p: number, f = 0) => spelledName(p, f);
/** With its octave number, scientific pitch notation ("C4", "G2"). */
const nmo = (p: number, f = 0) => {
  const s = spell(p, f);
  return LETTERS[s.letter] + ACC(s.acc) + s.oct;
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const hz = (p: number) => Math.round(midiToHz(p));
const ORD = ["", "unison", "2nd", "3rd", "4th", "5th", "6th", "7th", "octave", "9th"];
const aOrd = (n: number) => (n === 8 ? "an octave" : `a ${ORD[n]}`);
/** "a major 3rd", "an octave" (by half steps). */
const anIv = (semis: number) => (semis === 12 ? "an octave" : `a ${intervalName(semis)}`);
/** The natural (white-key) note n letters above p. */
const upLetters = (p: number, n: number) => stepToMidi(staffStep(spell(p)) + n - 1);
/** The note `semis` half steps above `root`, spelled as interval number n says (C + minor 3rd = E♭, not D♯). */
function spellUp(root: number, n: number, semis: number, f = 0): string {
  const step = staffStep(spell(root, f)) + n - 1;
  return stepLetter(step) + ACC(root + semis - stepToMidi(step));
}
/** "C(1) D(2) E(3)": counting letter names up from p. */
const countUp = (p: number, n: number) => Array.from({ length: n }, (_, i) => `${stepLetter(staffStep(spell(p)) + i)}(${i + 1})`).join(" ");
/** "E–F–G–A": the letter names from a to b. */
function letterRun(a: number, b: number): string {
  const x = Math.min(staffStep(spell(a)), staffStep(spell(b)));
  const y = Math.max(staffStep(spell(a)), staffStep(spell(b)));
  return Array.from({ length: y - x + 1 }, (_, i) => stepLetter(x + i)).join("–");
}
/** Staff notes from pitches (one length for all, or one each); `marks` circles notes by index. */
const sn = (ps: (number | number[] | null)[], d: number | number[] = 1, marks: number[] = []): StaffNote[] =>
  ps.map((p, i) => ({ p, d: Array.isArray(d) ? (d[i] ?? d[d.length - 1]) : d, ...(marks.includes(i) ? { mark: true } : {}) }));
const REST_BAR: StaffNote[] = [{ p: null, d: 4 }];
const textOpts = (r: Rng, answer: string, wrong: string[]): MOption[] => shuffle(r, [answer, ...wrong]).map((t) => opt(t, t));
/** A knowledge question with a drawn picture (no sound needed). */
const quiz = (r: Rng, o: { q: string; a: string; w: string[]; e: string; why: string; skill: string }): Activity => ({
  kind: "choice",
  prompt: o.q,
  visual: { type: "emoji", emoji: o.e, size: "lg" },
  options: textOpts(r, o.a, o.w),
  answer: o.a,
  skill: o.skill,
  why: o.why,
  layout: "list",
});

/** A hand-sequenced level: activities as given, topic items made fresh (never the same item twice). */
function seq(r: Rng, parts: (Activity | [Topic, number])[]): Activity[] {
  const out: Activity[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    if (Array.isArray(part)) {
      const [t, d] = part;
      for (let k = 0; k < 16; k++) {
        const a = t.gen(r, d);
        const key = keyOf(a);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(a);
        break;
      }
    } else {
      seen.add(keyOf(part));
      out.push(part);
    }
  }
  return out;
}
/** A practice stage: its explainer opens the first level, then fresh topic items that ramp up. */
function practice(o: { title: string; emoji: string; topics: Topic[]; idea?: Activity; levels?: number; per?: number; unlocks?: string[] }): Stage {
  const levels = o.levels ?? 2;
  return {
    title: o.title,
    emoji: o.emoji,
    topics: o.topics,
    levels,
    ...(o.unlocks ? { unlocks: o.unlocks } : {}),
    fixed: (r, li) => {
      const d0 = levels === 1 ? 0.25 : (li / levels) * 0.7;
      const acts = items(r, o.topics, o.per ?? 7, d0, Math.min(1, d0 + 0.35));
      return li === 0 && o.idea ? [o.idea, ...acts] : acts;
    },
  };
}
/** A band to write over: chords in a key (`per` beats each) with a bass line and a light beat. */
const bed = (romans: string[], tonic: number, bpm: number, o: { per?: number; drums?: Groove | null; bass?: boolean; inst?: InstId; style?: "pulse" | "block" | "strum" | "pad" | "arp" } = {}): Score =>
  progression(romans, tonic, "major", { bpm, per: o.per ?? 2, inst: o.inst ?? "piano", style: o.style ?? "pulse", bass: o.bass ?? true, drums: o.drums === undefined ? "ballad" : o.drums });
/** A stretch of a public-domain song (song bank) as a staff picture + its sound, with notes circled. */
function songBit(id: string, from: number, to: number, marks: number[] = [], bpm = 96, inst: InstId = "piano") {
  const s = song(id);
  const ps = s.pitches.slice(from, to);
  const ds = s.durs.slice(from, to);
  return { show: staffShow(sn(ps, ds, marks)), sound: melody(ps, ds, inst, bpm) };
}
/** Staff picture + matching sound for a melody (so the notes light up as they play). */
function staffSound(ps: (number | number[] | null)[], ds: number | number[], o: { inst?: InstId; bpm?: number; clef?: "treble" | "bass"; key?: number; marks?: number[] } = {}) {
  const notes = sn(ps, ds, o.marks ?? []);
  return { show: staffShow(notes, o.clef ?? "treble", o.key !== undefined ? { key: o.key } : {}), sound: melody(ps, notes.map((x) => x.d), o.inst ?? "piano", o.bpm ?? 92) };
}
const fb = (text: string, b: { show: MusicShow; sound: Score }, pad?: "drum" | "bells" | "keys", pads?: number[]) => frame(text, b.show, b.sound, pad, pads);
/** Scale degrees of C major across two octaves (index 0 = C4, 7 = C5, 14 = C6). */
const DEG = scale(60, "major", 2);

// ═══ 1 · Interval Island ══════════════════════════════════════════════════════════════════════
// Interval numbers (2nd → octave) on the staff and keys, steps / skips / leaps, interval ear
// training with public-domain reference songs, interval quality (major, minor, perfect), and
// composing with leaps. Unlocks high re.
const IV_INST: InstId[] = ["piano", "marimba", "flute", "violin"];

const ivStaff = topic("g6-iv-staff", (r, d) => {
  const n = pick(r, d < 0.35 ? [2, 3, 4, 5] : [2, 3, 4, 5, 6, 7, 8]);
  const lo = pick(r, naturals(60, 72).filter((p) => upLetters(p, n) <= 79));
  const hi = upLetters(lo, n);
  const harmonic = d > 0.5 && r() < 0.5;
  const down = !harmonic && d > 0.6 && r() < 0.4;
  const ps = down ? [hi, lo] : [lo, hi];
  const wrong = shuffle(r, [n - 2, n - 1, n + 1, n + 2].filter((x) => x >= 2 && x <= 8)).slice(0, 3);
  return listen({
    prompt: harmonic ? "Two notes stacked. What interval do they make?" : "What interval is this? Count the letter names, including both notes.",
    sound: harmonic ? chordSound([lo, hi], "piano", 2, 70) : melody(ps, [1, 1.5], "piano", 76),
    show: staffShow(harmonic ? [{ p: [lo, hi], d: 2 }] : sn(ps)),
    options: [n, ...wrong].sort((x, y) => x - y).map((x) => opt(ORD[x], ORD[x])),
    answer: ORD[n],
    skill: "u:interval:staff",
    why: `${letterRun(lo, hi)}: ${n} letters, so it's ${aOrd(n)}.`,
  });
});

const ivSSL = topic("g6-iv-ssl", (r, d) => {
  const kind = pick(r, ["step", "skip", "leap"] as const);
  const n = kind === "step" ? 2 : kind === "skip" ? 3 : pick(r, d < 0.5 ? [5, 8] : [4, 5, 6, 8]);
  const lo = pick(r, naturals(60, 72).filter((p) => upLetters(p, n) <= 81));
  const hi = upLetters(lo, n);
  const down = d > 0.4 && r() < 0.5;
  const ps = down ? [hi, lo] : [lo, hi];
  return listen({
    prompt: "Step, skip or leap? Listen to the two notes.",
    sound: melody(ps, [1, 1.5], pick(r, IV_INST), 80),
    show: d < 0.3 ? staffShow(sn(ps)) : undefined,
    options: [opt("step", "Step (a 2nd)"), opt("skip", "Skip (a 3rd)"), opt("leap", "Leap (a 4th or wider)")],
    answer: kind,
    skill: "u:interval:step-skip-leap",
    why: `That was ${aOrd(n)} going ${down ? "down" : "up"}. A step moves to the next letter, a skip jumps over one letter, and anything a 4th or wider is a leap.`,
  });
});

const IVQ: { semis: number; n: number }[] = [
  { semis: 2, n: 2 }, { semis: 3, n: 3 }, { semis: 4, n: 3 }, { semis: 5, n: 4 }, { semis: 7, n: 5 }, { semis: 8, n: 6 }, { semis: 9, n: 6 }, { semis: 12, n: 8 },
];
function ivKeysNum(r: Rng, d: number): Activity {
  const n = pick(r, [2, 3, 4, 5, 6, 8]);
  const root = pick(r, naturals(60, 69).filter((p) => !(n === 4 && pcOf(p) === 5)));
  const top = upLetters(root, n);
  return { kind: "keys", task: "interval", prompt: `${nm(root)} is pressed. Add the note ${aOrd(n)} above it (count the letters), then Check.`, answer: [root, top], given: [root], lo: 60, hi: 84, labels: d < 0.25, why: `Count up: ${countUp(root, n)}. ${nm(top)} is ${aOrd(n)} above ${nm(root)}.`, skill: "u:interval:keys" };
}
function ivKeysQual(r: Rng, d: number): Activity {
  const q = pick(r, d < 0.8 ? IVQ.filter((x) => x.semis !== 8) : IVQ);
  const root = pick(r, naturals(60, 72).filter((p) => p + q.semis <= 84));
  return { kind: "keys", task: "interval", prompt: `Build ${anIv(q.semis)} above ${nm(root)}: ${nm(root)} is pressed. Add the top note, then Check.`, answer: [root, root + q.semis], given: [root], lo: 60, hi: 84, labels: false, why: `${cap(anIv(q.semis))} is ${q.semis} half steps: ${nm(root)} up to ${spellUp(root, q.n, q.semis)}.`, skill: "u:interval:keys" };
}
const ivKeys = topic("g6-iv-keys", (r, d) => (d < 0.5 ? ivKeysNum(r, d) : ivKeysQual(r, d)));
const ivKeysQ = topic("g6-iv-keysq", (r, d) => ivKeysQual(r, d));

const IV_REF: Record<number, string> = {
  1: "Think of the first two notes of Beethoven's “Für Elise.”",
  2: "Think “Hap-py BIRTH-day” (py → birth) or “Are you sleep-ing” (are → you).",
  3: "Think “Rain, rain” going down, or the opening of “Greensleeves” going up.",
  4: "Think “Oh WHEN the Saints.”",
  5: "Think “A-MAZ-ing Grace” or Wagner's “Here Comes the Bride.”",
  7: "Think “Twin-kle, TWIN-kle.”",
  8: "A minor 6th is one half step smaller than the “My Bonnie” leap.",
  9: "Think “My BON-nie lies over the ocean.”",
  12: "Think the giant jump in the third line of “Happy Birthday” (“hap-py BIRTH-day dear…”).",
};
const ivEar = topic("g6-iv-ear", (r, d) => {
  const pool = d < 0.34 ? [2, 4, 7, 12] : d < 0.67 ? [2, 4, 5, 7, 9, 12] : [1, 2, 3, 4, 5, 7, 9, 12];
  const s = pick(r, pool);
  const wrong = pickN(r, pool, 3, (x) => x === s);
  const harmonic = d > 0.75 && r() < 0.4;
  const lo = int(r, 57, 67);
  return listen({
    prompt: harmonic ? "Both notes sound at once. Which interval is it?" : "Which interval do you hear? Sing a reference song in your head.",
    sound: harmonic ? chordSound([lo, lo + s], "piano", 2.5, 60) : melody([lo, lo + s], [1, 1.5], "piano", 72),
    options: [s, ...wrong].sort((a, b) => a - b).map((x) => opt(String(x), cap(intervalName(x)))),
    answer: String(s),
    skill: "u:interval:ear",
    why: `It was ${anIv(s)}. ${IV_REF[s]}`,
    layout: "grid",
  });
});

type RefSong = { id: string; from: number; to: number; a: number; easy?: boolean };
const REF_SONGS: RefSong[] = [
  { id: "frere", from: 0, to: 4, a: 0, easy: true },
  { id: "birthday", from: 0, to: 4, a: 1, easy: true },
  { id: "saints", from: 0, to: 4, a: 0, easy: true },
  { id: "grace", from: 0, to: 3, a: 0, easy: true },
  { id: "twinkle", from: 0, to: 4, a: 1, easy: true },
  { id: "birthday", from: 12, to: 16, a: 1, easy: true },
  { id: "mary", from: 0, to: 3, a: 0 },
  { id: "furelise", from: 0, to: 9, a: 0 },
  { id: "rainrain", from: 0, to: 3, a: 0 },
  { id: "thisoldman", from: 0, to: 3, a: 0 },
  { id: "bonnie", from: 0, to: 4, a: 0 },
  { id: "jingle", from: 4, to: 9, a: 2 },
  { id: "odetojoy", from: 0, to: 4, a: 1 },
  { id: "london", from: 0, to: 4, a: 0 },
];
const ivSongs = topic("g6-iv-songs", (r, d) => {
  const ref = pick(r, d < 0.4 ? REF_SONGS.filter((x) => x.easy) : REF_SONGS);
  const s = song(ref.id);
  const ps = s.pitches.slice(ref.from, ref.to);
  const ds = s.durs.slice(ref.from, ref.to);
  const x = ps[ref.a] ?? 60;
  const y = ps[ref.a + 1] ?? 60;
  const semis = Math.abs(y - x);
  const wrong = pickN(r, [1, 2, 3, 4, 5, 7, 9, 12], 3, (v) => v === semis);
  return listen({
    prompt: `“${s.title}”: what interval do the two circled notes make?`,
    sound: melody(ps, ds, "piano", 96),
    show: staffShow(sn(ps, ds, [ref.a, ref.a + 1])),
    options: [semis, ...wrong].sort((a, b) => a - b).map((v) => opt(String(v), cap(intervalName(v)))),
    answer: String(semis),
    skill: "u:interval:songs",
    why: `${nm(x)} ${y > x ? "up" : "down"} to ${nm(y)} is ${anIv(semis)}. Now this song is your reference for it.`,
    layout: "grid",
  });
});

const ivEcho = topic("g6-iv-echo", (r, d) => {
  const chromatic = d >= 0.5;
  let lo: number;
  let hi: number;
  if (!chromatic) {
    const n = pick(r, [2, 3, 4, 5, 6, 8]);
    lo = pick(r, naturals(60, 72).filter((p) => upLetters(p, n) <= 72));
    hi = upLetters(lo, n);
  } else {
    const s = pick(r, [2, 3, 4, 5, 7, 9, 12]);
    lo = pick(r, range(60, 72 - s));
    hi = lo + s;
  }
  return { kind: "melody", mode: "echo", prompt: `Listen to the interval, then play both notes. The first note is ${nm(lo)}.`, notes: [lo, hi], pads: chromatic ? range(60, 72) : naturals(60, 72), on: "keys", labels: "letters", inst: "piano", durs: [1, 1.5], bpm: 72, skill: "u:interval:echo" };
});

const SONG_ECHO: { id: string; n: number }[] = [{ id: "twinkle", n: 4 }, { id: "saints", n: 4 }, { id: "frere", n: 4 }, { id: "grace", n: 3 }, { id: "bonnie", n: 2 }, { id: "birthday", n: 4 }, { id: "odetojoy", n: 4 }, { id: "mary", n: 3 }];
const ivSongEcho = topic("g6-iv-songecho", (r) => {
  const x = pick(r, SONG_ECHO);
  const s = song(x.id);
  const ps = s.pitches.slice(0, x.n).map((p) => p ?? 60);
  return { kind: "melody", mode: "echo", prompt: `Play the opening of “${s.title}” by ear. It starts on ${nm(ps[0])}.`, notes: ps, pads: naturals(55, 76), on: "keys", labels: "letters", inst: "piano", durs: s.durs.slice(0, x.n), bpm: 96, skill: "u:interval:echo" };
});
const REF_KEYS: { semis: number; n: number; song: string }[] = [
  { semis: 2, n: 2, song: "“Hap-py BIRTH-day”" }, { semis: 4, n: 3, song: "“Oh WHEN the Saints”" }, { semis: 5, n: 4, song: "“Here Comes the Bride”" },
  { semis: 7, n: 5, song: "“Twin-kle, TWIN-kle”" }, { semis: 9, n: 6, song: "“My BON-nie”" }, { semis: 12, n: 8, song: "the big leap in “Happy Birthday”" },
];
const ivRefKeys = topic("g6-iv-refkeys", (r) => {
  const x = pick(r, REF_KEYS);
  const root = pick(r, naturals(60, 72).filter((p) => p + x.semis <= 84));
  return { kind: "keys", task: "interval", prompt: `Hear ${x.song} in your head, then build its interval (${anIv(x.semis)}) above ${nm(root)}.`, answer: [root, root + x.semis], given: [root], lo: 60, hi: 84, labels: false, why: `${cap(anIv(x.semis))} is ${x.semis} half steps: ${nm(root)} up to ${spellUp(root, x.n, x.semis)}.`, skill: "u:interval:keys" };
});
const IV_PERFECT = ["Unison", "4th", "5th", "Octave"];
const IV_MAJMIN = ["2nd", "3rd", "6th", "7th"];
const IV_SIZES: [string, number][] = [["Minor 2nd", 1], ["Major 2nd", 2], ["Minor 3rd", 3], ["Major 3rd", 4], ["Perfect 4th", 5], ["Perfect 5th", 7], ["Major 6th", 9], ["Octave", 12]];
const ivQualSort = topic("g6-iv-qualsort", (r, d) => {
  if (r() < 0.5) {
    const picks = [...pickN(r, IV_PERFECT, 3), ...pickN(r, IV_MAJMIN, 3)];
    return { kind: "sort", prompt: "Which intervals are called perfect, and which come in major and minor versions?", bins: [{ id: "p", label: "Perfect" }, { id: "mm", label: "Major or minor" }], items: shuffle(r, picks).map((t) => ({ id: t, text: t, bin: IV_PERFECT.includes(t) ? "p" : "mm" })), skill: "u:interval:quality" };
  }
  const pairs = pickN(r, IV_SIZES, d < 0.5 ? 4 : 5).sort((a, b) => a[1] - b[1]);
  return { kind: "match", prompt: "Match each interval to its size in half steps.", pairs: pairs.map(([name, s]) => ({ a: { id: `i${s}`, text: name }, b: { id: `h${s}`, text: `${s} half step${s === 1 ? "" : "s"}` } })), skill: "u:interval:quality" };
});

const ivMajMin = topic("g6-iv-majmin", (r, d) => {
  const num = d < 0.4 ? 3 : pick(r, [2, 3, 6]);
  const major = r() < 0.5;
  const sizes: Record<number, [number, number]> = { 2: [2, 1], 3: [4, 3], 6: [9, 8] };
  const [big, small] = sizes[num];
  const semis = major ? big : small;
  const lo = int(r, 57, 67);
  const harmonic = r() < 0.5;
  const why: Record<number, string> = {
    2: "A minor 2nd is a single half step: tight and tense, like the start of “Für Elise.” A major 2nd is a whole step.",
    3: "Major 3rds sound bright (C–E). Minor 3rds are a half step smaller and sound darker (C–E♭).",
    6: "A major 6th is the “My Bonnie” leap. A minor 6th is a half step smaller and sounds bittersweet.",
  };
  return listen({
    prompt: `Major or minor ${ORD[num]}?`,
    sound: harmonic ? chordSound([lo, lo + semis], "piano", 2.5, 60) : melody([lo, lo + semis], [1, 1.5], "piano", 72),
    options: [opt("major", `Major ${ORD[num]} (${big} half steps)`), opt("minor", `Minor ${ORD[num]} (${small} half steps)`)],
    answer: major ? "major" : "minor",
    skill: "u:interval:quality",
    why: why[num],
  });
});

const QNAME: Record<string, string> = { "2:1": "minor 2nd", "2:2": "major 2nd", "3:3": "minor 3rd", "3:4": "major 3rd", "4:5": "perfect 4th", "5:7": "perfect 5th", "6:8": "minor 6th", "6:9": "major 6th", "7:10": "minor 7th", "7:11": "major 7th", "8:12": "octave" };
const ivStaffQ = topic("g6-iv-staffq", (r, d) => {
  for (let k = 0; k < 60; k++) {
    const n = pick(r, d < 0.5 ? [3] : [2, 3, 3, 4, 5, 6]);
    const lo = pick(r, naturals(60, 71));
    const top0 = upLetters(lo, n);
    if (top0 > 79) continue;
    const sharp = [0, 2, 5, 7, 9].includes(pcOf(top0)) && r() < 0.5; // C D F G A can take a sharp
    const top = top0 + (sharp ? 1 : 0);
    const key = `${n}:${top - lo}`;
    const name = QNAME[key];
    if (!name) continue;
    const same = Object.entries(QNAME).filter(([k2]) => k2 !== key && k2.startsWith(`${n}:`)).map(([, v]) => v);
    const near = Object.entries(QNAME).filter(([k2]) => Math.abs(Number(k2.split(":")[0]) - n) === 1).map(([, v]) => v);
    const wrong = [...same, ...shuffle(r, near)].slice(0, 3);
    const notes: StaffNote[] = [{ p: lo, d: 1 }, { p: top, d: 1, ...(sharp ? { acc: "#" as const } : {}) }];
    return listen({
      prompt: "Name the interval: its number AND its quality.",
      sound: melody([lo, top], [1, 1.5], "piano", 76),
      show: staffShow(notes),
      options: [name, ...wrong].map((x) => opt(x, cap(x))),
      answer: name,
      skill: "u:interval:quality",
      why: `${letterRun(lo, top0)} is ${aOrd(n)} by letters; ${top - lo} half steps makes it a ${name}.`,
      layout: "grid",
    });
  }
  return listen({ prompt: "Name the interval: its number AND its quality.", sound: melody([60, 64], [1, 1.5], "piano", 76), show: staffShow(sn([60, 64])), options: ["major 3rd", "minor 3rd", "perfect 4th"].map((x) => opt(x, cap(x))), answer: "major 3rd", skill: "u:interval:quality", why: "C–D–E is a 3rd by letters; 4 half steps makes it major." });
});

const ivCount = topic("g6-iv-count", (r, d) => {
  const len = d < 0.5 ? 5 : 6;
  for (let tries = 0; tries < 60; tries++) {
    const idx = [int(r, 2, 6)];
    let guard = 0;
    while (idx.length < len && guard++ < 80) {
      const roll = r();
      const mv = roll < 0.5 ? pick(r, [-1, 1]) : roll < 0.72 ? pick(r, [-2, 2]) : pick(r, [-4, -3, 3, 4, 5]);
      const nx = idx[idx.length - 1] + mv;
      if (nx >= 0 && nx <= 11) idx.push(nx);
    }
    const leaps = idx.slice(1).filter((x, i) => Math.abs(x - idx[i]) >= 3).length;
    if (idx.length < len || leaps > 3) continue;
    const ps = idx.map((i) => DEG[i]);
    return listen({
      prompt: "How many leaps (a 4th or wider) are in this melody?",
      sound: melody(ps, [...ps.slice(1).map(() => 0.75), 1.5], "piano", 92),
      show: d < 0.6 ? staffShow(sn(ps)) : undefined,
      options: [0, 1, 2, 3].map((x) => opt(String(x), String(x))),
      answer: String(leaps),
      skill: "u:interval:melody",
      why: `Moves: ${idx.slice(1).map((x, i) => (Math.abs(x - idx[i]) >= 3 ? "leap" : Math.abs(x - idx[i]) === 2 ? "skip" : x === idx[i] ? "same" : "step")).join(", ")}.`,
    });
  }
  return listen({ prompt: "How many leaps (a 4th or wider) are in this melody?", sound: melody([60, 67, 65, 64, 62], 1, "piano", 92), options: [0, 1, 2, 3].map((x) => opt(String(x), String(x))), answer: "1", skill: "u:interval:melody", why: "C up to G is the only leap (a 5th); the rest are steps." });
});

const ivWrite = topic("g6-iv-write", (r, d) => {
  const n = pick(r, d < 0.5 ? [2, 3, 4, 5] : [3, 4, 5, 6, 7, 8]);
  const lo = pick(r, naturals(60, 67).filter((p) => upLetters(p, n) <= 79));
  return { kind: "staff", mode: "write", prompt: `Write ${nmo(lo)}, then the note ${aOrd(n)} above it.`, clef: "treble", notes: [lo, upLetters(lo, n)], skill: "u:interval:staff" };
});

const IV_KEYS: Record<number, number> = { 60: 0, 62: 2, 65: -1, 67: 1 };
const ivCompose = topic("g6-iv-compose", (r, d) => {
  const tonic = pick(r, [60, 62, 65, 67]);
  const f = IV_KEYS[tonic];
  const home = nm(tonic, f);
  const variants: { prompt: string; rules: ComposeRule[] }[] = [
    { prompt: `${keyName(f)}: start and end on ${home} (do), with at least one leap of a 5th or wider.`, rules: [{ rule: "start", p: tonic }, { rule: "end", p: tonic }, { rule: "leap", min: 4 }] },
    { prompt: `${keyName(f)}: a smooth line, steps only (no skips or leaps). At least 6 notes, ending on ${home}.`, rules: [{ rule: "steps" }, { rule: "end", p: tonic }, { rule: "notes", min: 6 }] },
    { prompt: `${keyName(f)}: one big leap (a 6th or wider), then step back the other way. End on ${home}.`, rules: [{ rule: "leap", min: 5 }, { rule: "end", p: tonic }, { rule: "notes", min: 6 }] },
    { prompt: `${keyName(f)}: start on ${home}, climb all the way to high re (${nm(tonic + 14, f)}), and come home to ${home}.`, rules: [{ rule: "start", p: tonic }, { rule: "use", pitches: [tonic + 14] }, { rule: "end", p: tonic }] },
  ];
  const x = variants[d < 0.4 ? int(r, 0, 1) : int(r, 0, 3)];
  return { kind: "compose", prompt: x.prompt, pitches: [...scale(tonic, "major"), tonic + 14], slots: 8, dur: 1, inst: "flute", bpm: 92, rules: x.rules, tonic, labels: "letters", backing: bed(["I", "IV", "V", "I"], tonic, 92), skill: "u:compose:intervals" };
});

const IV_IDEA = idea("Intervals: measuring the gap", [
  fb("An interval is the distance between two notes. Count the letter names from the lower note up, counting both notes: C up to E is C–D–E, a 3rd.", staffSound([60, 64, [60, 64]], [1, 1, 2], { bpm: 80 })),
  fb("A 2nd moves to the very next letter: a step. A 3rd jumps over one letter: a skip. Anything a 4th or wider is a leap.", staffSound([60, 62, null, 60, 64, null, 60, 67], 1, { inst: "marimba", bpm: 100 })),
  fb("Staff shortcut: line-to-line or space-to-space is always an odd number (3rd, 5th, 7th). Line-to-space is always even (2nd, 4th, 6th, octave).", staffSound([64, 67, null, 64, 71, null, 64, 65, null, 64, 69], 1, { bpm: 110 })),
  frame("Eight letters up brings back the same letter: the octave. The higher note vibrates exactly twice as fast, so the two blend like one sound. Try it on the keys.", keysShow(60, 72, [60, 72]), melody([60, 72, [60, 72]], [1, 1, 2], "piano", 80), "keys", naturals(60, 72)),
], "u:interval:idea");
const IV_REF_IDEA = idea("Reference songs", [
  fb("Musicians recognize intervals by matching them to songs they already know. Major 2nd: the step in “Hap-py BIRTH-day.”", songBit("birthday", 0, 4, [1, 2], 100)),
  fb("Major 3rd: the first two notes of “Oh WHEN the Saints.”", songBit("saints", 0, 4, [0, 1], 120)),
  fb("Perfect 4th: the first two notes of “A-MAZ-ing Grace,” and of Wagner's “Here Comes the Bride.”", songBit("grace", 0, 3, [0, 1], 90)),
  fb("Perfect 5th: the jump in “Twin-kle, TWIN-kle.”", songBit("twinkle", 0, 4, [1, 2], 100)),
  fb("Octave: the giant leap in the third line of “Happy Birthday”: “hap-py BIRTH-day dear…”", songBit("birthday", 12, 16, [1, 2], 100)),
], "u:interval:idea");
const IV_QUAL_IDEA = idea("Major, minor, perfect", [
  frame("An interval's number counts letters. Its quality counts half steps. A half step is the smallest move on a keyboard: from one key to the very next key, black or white.", { show: "keyboard", lo: 60, hi: 67, lit: [60, 61], labels: "letters" }, melody([60, 61, 62, 63, 64], 0.5, "piano", 100)),
  frame("A major 3rd spans 4 half steps (C to E) and sounds bright. A minor 3rd spans 3 (C to E♭) and sounds darker. Same number, different quality.", { show: "keyboard", lo: 60, hi: 67, lit: [60, 63, 64], labels: "letters", marks: { 63: "m3", 64: "M3" } }, then(melody([60, 64], [1, 1.5], "piano", 80), melody([60, 63], [1, 1.5], "piano", 80), 0.5)),
  frame("2nds, 3rds, 6ths and 7ths come in major and minor. Unisons, 4ths, 5ths and octaves are called perfect: open, hollow and stable.", { show: "keyboard", lo: 60, hi: 72, lit: [60, 65, 67, 72], labels: "letters", marks: { 65: "P4", 67: "P5", 72: "P8" } }, chain([chordSound([60, 65], "piano", 1.5, 80), chordSound([60, 67], "piano", 1.5, 80), chordSound([60, 72], "piano", 1.5, 80)], 0.25)),
  frame("Half steps to know by heart: major 2nd = 2, minor 3rd = 3, major 3rd = 4, perfect 4th = 5, perfect 5th = 7, major 6th = 9, octave = 12.", keysShow(60, 72, [62, 63, 64, 65, 67, 69, 72]), melody([60, 62, 60, 63, 60, 64, 60, 65, 60, 67, 60, 69, 60, 72], 0.5, "piano", 132)),
], "u:interval:idea");
const IV_LEAP_IDEA = idea("Write with intervals", [
  fb("Steps make a melody smooth and singable; leaps make it dramatic and memorable. First all steps, then the same idea with leaps.", staffSound([60, 62, 64, 65, 64, 62, 60, null, 60, 67, 64, 72, 67, 64, 60], [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1], { inst: "flute", bpm: 100 })),
  fb("Great tunes step most of the time and save a leap for the big moment, like the octave in “Happy Birthday.”", songBit("birthday", 12, 19, [1, 2], 100)),
  fb("After a big leap, turn around and step back the other way. Composers call it leap recovery: the ear wants the gap filled in.", staffSound([60, 69, 67, 65, 64, 62, 60], [1, 1.5, 0.5, 1, 0.5, 0.5, 2], { inst: "flute", bpm: 96, marks: [0, 1] })),
  frame("Intervals can stretch past the octave: C up to the next D is a 9th, an octave plus a step. Your melodies can now climb to high re.", { show: "keyboard", lo: 60, hi: 76, lit: [60, 72, 74], labels: "letters", marks: { 72: "do'", 74: "re'" } }, melody([60, 64, 67, 72, 74, 72], [0.5, 0.5, 0.5, 0.5, 1.5, 1], "piano", 96), "keys", naturals(60, 76)),
], "u:compose:idea");

const IV_C1: Activity = { kind: "compose", prompt: "Write an 8-note melody in C major. Start and end on C (do), and use at least one leap of a 5th or wider.", pitches: [60, 62, 64, 65, 67, 69, 71, 72, 74], slots: 8, dur: 1, inst: "flute", bpm: 92, rules: [{ rule: "start", p: 60 }, { rule: "end", p: 60 }, { rule: "leap", min: 4 }], tonic: 60, labels: "letters", backing: bed(["I", "IV", "V", "I"], 60, 92), skill: "u:compose:intervals" };
const IV_C2: Activity = { kind: "compose", prompt: "Use leap recovery: one big leap (a 6th or wider), then step back the other way. At least 6 notes, ending on C.", pitches: [60, 62, 64, 65, 67, 69, 71, 72, 74], slots: 8, dur: 1, inst: "flute", bpm: 92, rules: [{ rule: "leap", min: 5 }, { rule: "end", p: 60 }, { rule: "notes", min: 6 }], tonic: 60, labels: "letters", backing: bed(["I", "vi", "IV", "V"], 60, 92), skill: "u:compose:intervals" };
const IV_C3: Activity = { kind: "compose", prompt: "High re is yours! Start on C, climb to high D (re') somewhere in the middle, so it's your melody's peak, and come home to C.", pitches: [60, 62, 64, 65, 67, 69, 71, 72, 74], slots: 8, dur: 1, inst: "flute", bpm: 92, rules: [{ rule: "start", p: 60 }, { rule: "use", pitches: [74] }, { rule: "arch" }, { rule: "end", p: 60 }], tonic: 60, labels: "letters", backing: bed(["I", "IV", "V", "I"], 60, 92), skill: "u:compose:intervals" };
const IV_KEYS9: Activity = { kind: "keys", task: "interval", prompt: "Intervals can stretch past the octave. A 9th is an octave plus a 2nd: C4 is pressed. Add the D a 9th above it.", answer: [60, 74], given: [60], lo: 60, hi: 84, labels: false, why: "C up to the next C is an octave (8 letters). One more letter, D, makes a 9th.", skill: "u:interval:keys" };

const INTERVAL_ISLAND: WorldDef = {
  id: "g6-interval-island",
  title: "Interval Island",
  emoji: "📏",
  grade: "6",
  theme: "sky",
  blurb: "Measure the distance between notes: on the staff, on the keys and by ear.",
  talk: ["Which song helps you remember a perfect 5th? (Hint: a little star.)", "Hum the octave leap in “Happy Birthday” together. Can you hear the jump?"],
  challenge: "Pick a song you love and figure out the interval between its first two notes. Step, skip or leap?",
  stages: [
    {
      title: "Measure the gap",
      emoji: "📏",
      levels: 1,
      topics: [ivStaff, ivSSL, ivKeys, ivEcho],
      fixed: (r) => seq(r, [IV_IDEA, [ivStaff, 0.05], [ivSSL, 0.1], [ivKeys, 0.1], [ivStaff, 0.3], [ivSSL, 0.25], [ivEcho, 0.2], [ivKeys, 0.3]]),
    },
    practice({ title: "Songs in your ear", emoji: "🎧", idea: IV_REF_IDEA, topics: [ivEar, ivSongEcho, ivSongs, ivRefKeys, ivEcho] }),
    practice({ title: "Major, minor, perfect", emoji: "⚖️", idea: IV_QUAL_IDEA, topics: [ivMajMin, ivKeysQ, ivStaffQ, ivQualSort, ivEcho] }),
    {
      title: "Leap and land",
      emoji: "🎼",
      levels: 1,
      topics: [ivCompose, ivWrite, ivKeys, ivCount],
      unlocks: ["note:re'"],
      fixed: (r) => seq(r, [IV_LEAP_IDEA, IV_C1, IV_KEYS9, [ivEcho, 0.8], IV_C2, [ivWrite, 0.7], IV_C3]),
    },
  ],
};

// ═══ 2 · Beat Lab Pro ═════════════════════════════════════════════════════════════════════════
// Drum programming on a 16-step grid: the kit's jobs, counting 16ths, the backbeat, genre grooves
// (four on the floor, boom-bap, trap, one drop, funk), swing, accents and ghost notes, fills.
// Reference answers are the GROOVES in score.ts.
const g16 = (rows: Rows, bpm: number, o: { times?: number; swing?: number } = {}): Score => ({ ...beat(rows, { bpm, per: 4, times: o.times ?? 2, swing: o.swing }), meter: [4, 4] });
const VEL: Record<string, number> = { X: 1, x: 0.72, o: 0.42, g: 0.2 };
/** A 16-step pattern with dynamics: "X" accent, "x" normal, "o" soft, "g" ghost note. */
function kit(rows: Rows, bpm: number, o: { times?: number; swing?: number } = {}): Score {
  const hits: MHit[] = [];
  for (let rep = 0; rep < (o.times ?? 2); rep++)
    for (const [k, row] of Object.entries(rows) as [DrumId, string][])
      for (let i = 0; i < row.length; i++) {
        const v = VEL[row[i]];
        if (v) hits.push({ t: (rep * 16 + i) / 4, k, v });
      }
  return { bpm, meter: [4, 4], ...(o.swing ? { swing: o.swing } : {}), tracks: [{ kind: "drums", hits }] };
}
const asGrid = (s: string) => s.replace(/[Xog]/g, "x").padEnd(16, ".").slice(0, 16);
const gridShow = (rec: Rows): MusicShow => {
  const rows = Object.keys(rec) as DrumId[];
  return { show: "grid", rows, pattern: rows.map((k) => asGrid(rec[k] ?? "")) };
};
const one = (k: DrumId, line: string): Rows => {
  const rec: Rows = {};
  rec[k] = line;
  return rec;
};
const SUB = ["", " e", " &", " a"];
/** The 16th-note count of a step: 0 → "1", 6 → "2 &", 15 → "4 a". */
const countName = (i: number) => `${Math.floor(i / 4) + 1}${SUB[i % 4]}`;
type Gen16 = "rock" | "hiphop" | "edm" | "trap" | "funk" | "reggae" | "bossa" | "swing";
const GBPM: Record<Gen16, number> = { rock: 112, hiphop: 90, edm: 124, trap: 140, funk: 100, reggae: 76, bossa: 132, swing: 150 };
const GNAME: Record<Gen16, string> = { rock: "Rock", hiphop: "Boom-bap hip hop", edm: "House (EDM)", trap: "Trap", funk: "Funk", reggae: "Reggae one drop", bossa: "Bossa nova", swing: "Jazz swing" };
const GWHY: Record<Gen16, string> = {
  rock: "Rock: kick on 1 and 3, snare on 2 and 4, steady 8th-note hi-hats.",
  hiphop: "Boom-bap: a punchy kick, a heavy snare on 2 and 4 and a slight swing, around 85–95 BPM.",
  edm: "Four on the floor: a kick on every beat, claps on 2 and 4 and open hats on the off-beats, about 120–128 BPM.",
  trap: "Trap: a half-time clap on beat 3, sparse booming kicks and fast rolling hi-hats, about 130–150 BPM.",
  funk: "Funk: a syncopated kick, the snare on 2 and 4 plus extra hits, and driving 16th-note hats.",
  reggae: "One drop: beat 1 is left empty; the kick and rim click land together on beat 3.",
  bossa: "Bossa nova: a gentle Brazilian pattern of rim clicks over a soft kick and a steady shaker.",
  swing: "Jazz swing: the ride cymbal's “ding, ding-a ding” with the hi-hat on 2 and 4, all swung.",
};

const ROLES: { k: DrumId; job: string; line: string }[] = [
  { k: "kick", job: "Kick drum: the low thump that drives the pulse", line: "x.......x.x....." },
  { k: "snare", job: "Snare: the crack of the backbeat on 2 and 4", line: "....x.......x..." },
  { k: "hat", job: "Hi-hat: the steady tick that keeps time", line: "x.x.x.x.x.x.x.x." },
  { k: "openhat", job: "Open hi-hat: a sizzle on the off-beats", line: "..x...x...x...x." },
  { k: "crash", job: "Crash: a big splash that marks a new section", line: "x..............." },
  { k: "tom", job: "Toms: pitched drums for fills", line: "........xx.xx.xx" },
];
const ROCK: Rows = GROOVES.rock.rows;
const blRoles = topic("g6-bl-roles", (r, d) => {
  if (d < 0.5 || r() < 0.5) {
    const ans = pick(r, d < 0.5 ? ROLES.slice(0, 3) : ROLES);
    const wrong = pickN(r, ROLES, 2, (x) => x.k === ans.k);
    return listen({ prompt: "One part of the kit is playing solo. Which part is it, and what's its job?", sound: g16(one(ans.k, ans.line), 100), options: [ans, ...wrong].map((x) => instOpt(x.k, x.job)), answer: ans.k, skill: "u:beatmaking:roles", layout: "list" });
  }
  const x = pick(r, [
    { q: "In this rock beat, which drum plays the backbeat on 2 and 4?", a: "snare" as DrumId },
    { q: "In this rock beat, which drum lands on beat 1?", a: "kick" as DrumId },
    { q: "In this rock beat, which drum plays every 8th note?", a: "hat" as DrumId },
  ]);
  return listen({ prompt: x.q, sound: g16(ROCK, 112), show: gridShow(ROCK), options: (["kick", "snare", "hat"] as DrumId[]).map((k) => instOpt(k)), answer: x.a, skill: "u:beatmaking:roles" });
});

const blCount = topic("g6-bl-count", (r, d) => {
  const k = pick(r, d < 0.4 ? [2, 6, 10, 14, 4, 8, 12] : range(1, 15).filter((i) => i % 4 !== 0));
  const snare = Array.from({ length: 16 }, (_, i) => (i === k ? "x" : ".")).join("");
  const rec: Rows = { hat: "x...x...x...x...", snare };
  const wrong = pickN(r, [k - 2, k - 1, k + 1, k + 2, k + 4, k - 4].filter((x) => x >= 0 && x < 16), 3);
  return listen({
    prompt: "The hi-hat marks the four beats. On which 16th-note count does the snare hit?",
    sound: g16(rec, 84),
    show: gridShow(rec),
    options: [k, ...wrong].sort((a, b) => a - b).map((i) => opt(String(i), countName(i))),
    answer: String(k),
    skill: "u:beatmaking:count",
    why: `Count every step: 1 e & a, 2 e & a, 3 e & a, 4 e & a. Step ${k + 1} is “${countName(k)}.”`,
  });
});

const KICKS = ["x.......x.......", "x.....x.x.......", "x..x....x.......", "x.x.....x..x....", "x.......x.x.....", "x..x..x...x....."];
const SNARES = ["....x.......x...", "....x.......x..x", "....x..x....x...", "....x.......x.x."];
const HATS = ["x.x.x.x.x.x.x.x.", "xxxxxxxxxxxxxxxx", "x.x.x.x.x.x.xxxx", "..x...x...x...x."];
const COPY16: Gen16[] = ["rock", "hiphop", "edm", "funk", "trap"];
const blCopy = topic("g6-bl-copy", (r, d) => {
  if (d < 0.35) return { kind: "beatlab", mode: "copy", prompt: "Listen, then rebuild this kick-and-snare beat on the 16-step grid.", rows: ["kick", "snare"], steps: 16, bpm: 92, target: [pick(r, KICKS), pick(r, SNARES.slice(0, 2))], skill: "u:beatmaking:copy" };
  if (d < 0.7) return { kind: "beatlab", mode: "copy", prompt: "Rebuild this beat by ear: kick, snare and hi-hat.", rows: ["kick", "snare", "hat"], steps: 16, bpm: 96, target: [pick(r, KICKS), pick(r, SNARES), pick(r, HATS.slice(0, 3))], skill: "u:beatmaking:copy" };
  const g = pick(r, COPY16);
  const G = GROOVES[g];
  const rows = Object.keys(G.rows) as DrumId[];
  return { kind: "beatlab", mode: "copy", prompt: `Rebuild this ${GNAME[g].toLowerCase()} groove by ear, row by row.`, rows, steps: 16, bpm: GBPM[g], target: rows.map((k) => asGrid(G.rows[k] ?? "")), ...(G.swing ? { swing: G.swing } : {}), skill: "u:beatmaking:copy" };
});

type Make = { prompt: string; rows: DrumId[]; bpm: number; rules: BeatRule[]; swing?: number };
const mk = (m: Make, skill: string): Activity => ({ kind: "beatlab", mode: "make", prompt: m.prompt, rows: m.rows, steps: 16, bpm: m.bpm, rules: m.rules, ...(m.swing ? { swing: m.swing } : {}), skill });
const BASICS: Make[] = [
  { prompt: "The backbeat: snare on beats 2 and 4 (steps 5 and 13), kick on beats 1 and 3 (steps 1 and 9).", rows: ["kick", "snare"], bpm: 96, rules: [{ rule: "on", row: "kick", steps: [0, 8] }, { rule: "on", row: "snare", steps: [4, 12] }] },
  { prompt: "Kick on all four beats (steps 1, 5, 9, 13) and a hi-hat on every “&” (steps 3, 7, 11, 15).", rows: ["kick", "hat"], bpm: 120, rules: [{ rule: "on", row: "kick", steps: [0, 4, 8, 12] }, { rule: "on", row: "hat", steps: [2, 6, 10, 14] }] },
  { prompt: "Snare on 2 and 4, plus 8th-note hi-hats: all eight 8ths (steps 1, 3, 5 … 15).", rows: ["snare", "hat"], bpm: 100, rules: [{ rule: "on", row: "snare", steps: [4, 12] }, { rule: "on", row: "hat", steps: [0, 2, 4, 6, 8, 10, 12, 14] }] },
  { prompt: "Kick on 1 and on the “&” of 2 (step 7), snare on 2 and 4.", rows: ["kick", "snare"], bpm: 96, rules: [{ rule: "on", row: "kick", steps: [0, 6] }, { rule: "on", row: "snare", steps: [4, 12] }] },
  { prompt: "16th-note hi-hats: fill all 16 steps. Then put the snare on 2 and 4.", rows: ["snare", "hat"], bpm: 92, rules: [{ rule: "count", row: "hat", min: 16 }, { rule: "on", row: "snare", steps: [4, 12] }] },
];
const blBasics = topic("g6-bl-basics", (r, d) => mk(d < 0.2 ? BASICS[0] : pick(r, BASICS), "u:beatmaking:backbeat"));

const MK_ROCK: Make = { prompt: "Rock: kick on 1 and 3 (steps 1 and 9), snare on 2 and 4 (steps 5 and 13), and at least 8 hi-hats.", rows: ["kick", "snare", "hat"], bpm: 112, rules: [{ rule: "on", row: "kick", steps: [0, 8] }, { rule: "on", row: "snare", steps: [4, 12] }, { rule: "count", row: "hat", min: 8 }] };
const MK_HOUSE: Make = { prompt: "Four on the floor: kick on every beat, clap on 2 and 4, open hi-hat on every “&” (steps 3, 7, 11, 15).", rows: ["kick", "clap", "openhat"], bpm: 124, rules: [{ rule: "on", row: "kick", steps: [0, 4, 8, 12] }, { rule: "on", row: "clap", steps: [4, 12] }, { rule: "on", row: "openhat", steps: [2, 6, 10, 14] }] };
const MK_BOOMBAP: Make = { prompt: "Boom-bap: snare on 2 and 4, a kick on 1 plus two to four more kicks that never land on the snare, and at least 8 hats.", rows: ["kick", "snare", "hat"], bpm: 90, swing: 0.15, rules: [{ rule: "on", row: "snare", steps: [4, 12] }, { rule: "on", row: "kick", steps: [0] }, { rule: "off", row: "kick", steps: [4, 12] }, { rule: "count", row: "kick", min: 3, max: 5 }, { rule: "count", row: "hat", min: 8 }] };
const MK_TRAP: Make = { prompt: "Trap (half-time): one snare on beat 3 (step 9), nothing on 2 or 4, a kick on 1, and a rolling hi-hat with at least 12 hits.", rows: ["kick", "snare", "hat"], bpm: 140, rules: [{ rule: "on", row: "snare", steps: [8] }, { rule: "off", row: "snare", steps: [4, 12] }, { rule: "on", row: "kick", steps: [0] }, { rule: "count", row: "hat", min: 12 }] };
const MK_ONEDROP: Make = { prompt: "Reggae one drop: NO kick on beat 1! Kick and rim click hit together on beat 3 (step 9), with at least 4 hi-hats.", rows: ["kick", "rim", "hat"], bpm: 76, rules: [{ rule: "on", row: "kick", steps: [8] }, { rule: "on", row: "rim", steps: [8] }, { rule: "off", row: "kick", steps: [0] }, { rule: "count", row: "hat", min: 4 }] };
const MK_FUNK: Make = { prompt: "Funk: snare on 2 and 4, a busy syncopated kick (at least 4 hits, starting on 1), and 16th-note hats (at least 14).", rows: ["kick", "snare", "hat"], bpm: 100, rules: [{ rule: "on", row: "snare", steps: [4, 12] }, { rule: "on", row: "kick", steps: [0] }, { rule: "count", row: "kick", min: 4 }, { rule: "count", row: "hat", min: 14 }] };
const MAKES: Make[] = [MK_ROCK, MK_HOUSE, MK_BOOMBAP, MK_TRAP, MK_ONEDROP, MK_FUNK];
const blMake = topic("g6-bl-make", (r, d) => mk(pick(r, d < 0.4 ? MAKES.slice(0, 2) : MAKES), "u:beatmaking:genre"));

const STYLE16: Gen16[] = ["rock", "hiphop", "edm", "trap", "funk", "reggae", "bossa", "swing"];
const blStyle = topic("g6-bl-style", (r, d) => {
  const pool: Gen16[] = d < 0.4 ? ["rock", "edm", "trap", "reggae"] : STYLE16;
  const g = pick(r, pool);
  const wrong = pickN(r, pool, 3, (x) => x === g);
  return listen({ prompt: "Drums only. Which genre's signature groove is this?", sound: groove(g, 2, GBPM[g]), options: [g, ...wrong].map((x) => opt(x, GNAME[x])), answer: g, skill: "u:genre:beats", why: GWHY[g], layout: "grid" });
});

const blGrid = topic("g6-bl-grid", (r, d) => {
  const ans = [pick(r, KICKS), pick(r, d < 0.5 ? SNARES.slice(0, 1) : SNARES), pick(r, HATS)];
  const banks = [KICKS, SNARES, HATS];
  const wrongs: string[][] = [];
  for (let t = 0; t < 40 && wrongs.length < 2; t++) {
    const w = [...ans];
    const i = d < 0.5 ? 0 : int(r, 0, 2);
    w[i] = pick(r, banks[i]);
    if (w.join() !== ans.join() && !wrongs.some((x) => x.join() === w.join())) wrongs.push(w);
  }
  const show = (p: string[]): MusicShow => ({ show: "grid", rows: ["kick", "snare", "hat"], pattern: p });
  return listen({ prompt: "Read the grids while you listen. Which one is playing?", sound: g16({ kick: ans[0], snare: ans[1], hat: ans[2] }, 96), options: shuffle(r, [ans, ...wrongs]).map((p) => opt(p.join("|"), undefined, { show: show(p) })), answer: ans.join("|"), skill: "u:beatmaking:read", layout: "list" });
});

const SWING_ROWS: Rows[] = [
  { kick: "x.......x.......", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x." },
  { ride: "x.x.x.x.x.x.x.x.", kick: "x.......x.......", hat: "....x.......x..." },
];
const blSwing = topic("g6-bl-swing", (r, d) => {
  const rows = pick(r, SWING_ROWS);
  if (d < 0.6) {
    const swungFirst = r() < 0.5;
    const sw = g16(rows, 100, { swing: 0.33 });
    const st = g16(rows, 100);
    return listen({ prompt: "The same beat twice. Which version swings (long-short, long-short)?", options: [soundOpt("a", swungFirst ? sw : st, "Version A"), soundOpt("b", swungFirst ? st : sw, "Version B")], answer: swungFirst ? "a" : "b", skill: "u:beatmaking:swing", why: "Swing delays every second 8th note, so the beat bounces long-short, long-short: the feel of jazz, shuffles and lots of hip hop." });
  }
  const amts = shuffle(r, [0, 0.16, 0.33]);
  return listen({ prompt: "Three swing settings. Which version has the MOST swing?", options: amts.map((s, i) => soundOpt(`s${i}`, g16(rows, 96, s ? { swing: s } : {}), `Version ${"ABC"[i]}`)), answer: `s${amts.indexOf(0.33)}`, skill: "u:beatmaking:swing", why: "Producers dial swing from 0 (perfectly straight) up to a full triplet feel. A little swing gives hip hop its lazy bounce; a lot sounds like jazz." });
});

const FUNK_BASE: Rows = { kick: "x..x..x...x..x..", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x." };
const FUNK_GHOST: Rows = { kick: "x..x..x...x..x..", snare: "....X..g.g..X..g", hat: "x.x.x.x.x.x.x.x." };
const blGhost = topic("g6-bl-ghost", (r, d) => {
  if (d < 0.5 || r() < 0.5) {
    const ghostFirst = r() < 0.5;
    const a = kit(FUNK_GHOST, 96);
    const b = kit(FUNK_BASE, 96);
    return listen({ prompt: "Which version has ghost notes: soft extra snare hits between the loud ones?", options: [soundOpt("a", ghostFirst ? a : b, "Version A"), soundOpt("b", ghostFirst ? b : a, "Version B")], answer: ghostFirst ? "a" : "b", skill: "u:beatmaking:ghost", why: "Ghost notes are snare hits played so softly you feel them more than hear them. They fill the gaps and make a groove breathe." });
  }
  const acc = pick(r, [0, 2, 4, 6, 8, 10, 12, 14]);
  const hat = Array.from({ length: 16 }, (_, i) => (i % 2 ? "." : i === acc ? "X" : "o")).join("");
  const wrong = pickN(r, [0, 2, 4, 6, 8, 10, 12, 14], 3, (x) => x === acc);
  return listen({ prompt: "Listen to the hi-hat. On which 8th-note count is the accent (the hardest hit)?", sound: kit({ kick: "x...............", hat }, 92), options: [acc, ...wrong].sort((a, b) => a - b).map((i) => opt(String(i), countName(i))), answer: String(acc), skill: "u:beatmaking:ghost", why: `The accent lands on “${countName(acc)}.” Accents are hits played harder than the rest; moving them changes the whole feel.` });
});

const FEEL_MAKES: Make[] = [
  { ...MK_BOOMBAP, prompt: "Swung boom-bap: snare on 2 and 4, a kick on 1 plus two to four more (never on the snare), 8+ hats. Hear how the swing loosens it.", swing: 0.18 },
  { prompt: "Shuffle: hi-hats on every 8th note (steps 1, 3, 5 … 15), kick on 1 and 3, snare on 2 and 4. Heavy swing turns it into a shuffle.", rows: ["kick", "snare", "hat"], bpm: 96, swing: 0.33, rules: [{ rule: "on", row: "hat", steps: [0, 2, 4, 6, 8, 10, 12, 14] }, { rule: "on", row: "kick", steps: [0, 8] }, { rule: "on", row: "snare", steps: [4, 12] }] },
  { prompt: "Funk 16ths: snare on 2 and 4, at least 4 kicks including step 1 and step 11 (the “&” of 3), and 14+ hats.", rows: ["kick", "snare", "hat"], bpm: 100, rules: [{ rule: "on", row: "snare", steps: [4, 12] }, { rule: "on", row: "kick", steps: [0, 10] }, { rule: "count", row: "kick", min: 4 }, { rule: "count", row: "hat", min: 14 }] },
  { prompt: "Half-time shuffle: snare only on beat 3 (step 9), kick on 1, hi-hats on every 8th, all swung.", rows: ["kick", "snare", "hat"], bpm: 84, swing: 0.25, rules: [{ rule: "on", row: "snare", steps: [8] }, { rule: "off", row: "snare", steps: [4, 12] }, { rule: "on", row: "kick", steps: [0] }, { rule: "on", row: "hat", steps: [0, 2, 4, 6, 8, 10, 12, 14] }] },
];
const blFeelMake = topic("g6-bl-feel", (r) => mk(pick(r, FEEL_MAKES), "u:beatmaking:feel"));
const FEEL_COPY: { rows: Rows; swing: number; bpm: number; name: string }[] = [
  { rows: GROOVES.hiphop.rows, swing: 0.15, bpm: 90, name: "swung boom-bap beat" },
  { rows: { kick: "x.......x.......", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x." }, swing: 0.33, bpm: 96, name: "shuffle" },
  { rows: GROOVES.swing.rows, swing: 0.33, bpm: 132, name: "jazz swing groove" },
  { rows: { kick: "x.....x...x.....", snare: "........x.......", hat: "x.x.x.x.x.x.x.x." }, swing: 0.25, bpm: 80, name: "half-time shuffle" },
];
const blFeelCopy = topic("g6-bl-feelcopy", (r) => {
  const x = pick(r, FEEL_COPY);
  const rows = Object.keys(x.rows) as DrumId[];
  return { kind: "beatlab", mode: "copy", prompt: `Copy this ${x.name} by ear. The swing is already dialed in; you just find the hits.`, rows, steps: 16, bpm: x.bpm, target: rows.map((k) => asGrid(x.rows[k] ?? "")), swing: x.swing, skill: "u:beatmaking:copy" };
});

const FILLS: Make[] = [
  { prompt: "Tom fill in beat 4: high tom on steps 13 and 14, low tom on 15 and 16. Keep the kick on 1 and the snare on 2.", rows: ["kick", "snare", "tom", "lowtom"], bpm: 100, rules: [{ rule: "on", row: "kick", steps: [0] }, { rule: "on", row: "snare", steps: [4] }, { rule: "on", row: "tom", steps: [12, 13] }, { rule: "on", row: "lowtom", steps: [14, 15] }] },
  { prompt: "Snare-roll fill: kick on 1 and 3, snare on 2, then a snare on all four 16ths of beat 4 (steps 13–16).", rows: ["kick", "snare"], bpm: 100, rules: [{ rule: "on", row: "kick", steps: [0, 8] }, { rule: "on", row: "snare", steps: [4, 12, 13, 14, 15] }] },
  { prompt: "Crash into the bar: crash and kick together on beat 1, snare on 2 and 4, at least 6 hi-hats.", rows: ["kick", "snare", "hat", "crash"], bpm: 104, rules: [{ rule: "on", row: "crash", steps: [0] }, { rule: "on", row: "kick", steps: [0] }, { rule: "on", row: "snare", steps: [4, 12] }, { rule: "count", row: "hat", min: 6 }] },
  { prompt: "A fill across the toms: at least 2 high-tom and 2 low-tom hits in the second half of the bar (steps 9–16), kick on 1, snare on 2.", rows: ["kick", "snare", "tom", "lowtom"], bpm: 100, rules: [{ rule: "on", row: "kick", steps: [0] }, { rule: "on", row: "snare", steps: [4] }, { rule: "count", row: "tom", min: 2 }, { rule: "count", row: "lowtom", min: 2 }, { rule: "off", row: "tom", steps: range(0, 7) }, { rule: "off", row: "lowtom", steps: range(0, 7) }] },
];
const blFill = topic("g6-bl-fill", (r) => mk(pick(r, FILLS), "u:beatmaking:fill"));

const MK_SNAP: Make = { prompt: "Swap the snare for finger snaps: snaps on 2 and 4, kick on 1 and on the “&” of 3 (step 11), and 8 or more hi-hats.", rows: ["kick", "snap", "hat"], bpm: 92, rules: [{ rule: "on", row: "snap", steps: [4, 12] }, { rule: "on", row: "kick", steps: [0, 10] }, { rule: "count", row: "hat", min: 8 }] };
const MK_SIGNATURE: Make = { prompt: "Your signature groove: snare on 2 and 4, at least 3 kicks, 8+ hi-hats, a high-tom hit, and a fill that ends on the low tom (steps 15 and 16).", rows: ["kick", "snare", "hat", "tom", "lowtom"], bpm: 100, rules: [{ rule: "on", row: "snare", steps: [4, 12] }, { rule: "count", row: "kick", min: 3 }, { rule: "count", row: "hat", min: 8 }, { rule: "count", row: "tom", min: 1 }, { rule: "on", row: "lowtom", steps: [14, 15] }] };

const BL_KIT_IDEA = idea("The kit's jobs", [
  frame("Every groove is built from jobs. The kick drum is the low thump: it locks with the bass and drives the pulse.", gridShow({ kick: "x.......x.x....." }), g16({ kick: "x.......x.x....." }, 100), "drum"),
  frame("The snare cracks on beats 2 and 4. That's the backbeat, the hit your head nods to.", gridShow({ kick: "x.......x.x.....", snare: "....x.......x..." }), g16({ kick: "x.......x.x.....", snare: "....x.......x..." }, 100)),
  frame("The hi-hat ticks through the bar in 8th or 16th notes, keeping everybody locked in time.", gridShow(ROCK), g16(ROCK, 100)),
  frame("Sixteen steps make one bar of 16th notes, counted “1 e & a, 2 e & a, 3 e & a, 4 e & a.” Steps 1, 5, 9 and 13 are the four beats.", gridShow({ kick: "x...x...x...x...", hat: "xxxxxxxxxxxxxxxx" }), g16({ kick: "x...x...x...x...", hat: "xxxxxxxxxxxxxxxx" }, 84)),
], "u:beatmaking:idea");
const BL_GENRE_IDEA = idea("Signature grooves", [
  frame("Four on the floor: a kick on every beat, claps on 2 and 4, open hi-hats on the off-beats. House, disco and EDM run on it.", gridShow(GROOVES.edm.rows), groove("edm", 2, 124)),
  frame("Boom-bap: a punchy kick, a fat snare on 2 and 4 and a lazy swing. The sound of 90s hip hop.", gridShow(GROOVES.hiphop.rows), groove("hiphop", 2, 90)),
  frame("Trap: the clap moves to beat 3 for a half-time feel, while the hi-hats roll in fast bursts.", gridShow(GROOVES.trap.rows), groove("trap", 2, 140)),
  frame("Reggae's one drop: beat 1 is left empty. The kick and the rim click land together on beat 3.", gridShow(GROOVES.reggae.rows), groove("reggae", 2, 76)),
], "u:genre:idea");
const BL_FEEL_IDEA = idea("Feel: swing, accents, ghosts", [
  frame("Straight 8ths are perfectly even: tick, tick, tick, tick.", gridShow(SWING_ROWS[0]), g16(SWING_ROWS[0], 100)),
  frame("Swing delays every second 8th: long-short, long-short. Producers dial in a little for hip hop and a lot for jazz.", gridShow(SWING_ROWS[0]), g16(SWING_ROWS[0], 100, { swing: 0.33 })),
  frame("Accents are hits played harder. Ghost notes are snare hits so soft you feel them more than hear them: the secret sauce of funk.", gridShow(FUNK_GHOST), kit(FUNK_GHOST, 96)),
  frame("Hear the difference: the same beat plain, then with ghost notes.", gridShow(FUNK_GHOST), then(kit(FUNK_BASE, 96, { times: 1 }), kit(FUNK_GHOST, 96, { times: 1 }), 0)),
], "u:beatmaking:idea");
const BL_BUILD_IDEA = idea("Build a groove like a producer", [
  frame("Start with the skeleton: kick and snare. If that grooves on its own, everything you add will too.", gridShow({ kick: "x.....x.x.......", snare: "....x.......x..." }), g16({ kick: "x.....x.x.......", snare: "....x.......x..." }, 96)),
  frame("Add the timekeeper: hi-hats in 8ths, 16ths or trap rolls.", gridShow({ kick: "x.....x.x.......", snare: "....x.......x...", hat: "x.x.x.x.x.x.xxxx" }), g16({ kick: "x.....x.x.......", snare: "....x.......x...", hat: "x.x.x.x.x.x.xxxx" }, 96)),
  frame("Add flavor: claps, open hats, percussion and ghost notes.", gridShow({ kick: "x.....x.x.......", snare: "....x..g....x..g", hat: "x.x.x.x.x.x.xxxx", openhat: "..............x." }), kit({ kick: "x.....x.x.......", snare: "....x..g....x..g", hat: "x.x.x.x.x.x.xxxx", openhat: "..............x." }, 96)),
  frame("End a phrase with a fill: a burst on the toms that tells the band a new section is coming.", gridShow({ kick: "x.....x.x.......", snare: "....x...........", hat: "x.x.x.x.x.......", tom: "..........xx....", lowtom: "............xxxx" }), g16({ kick: "x.....x.x.......", snare: "....x...........", hat: "x.x.x.x.x.......", tom: "..........xx....", lowtom: "............xxxx" }, 96)),
], "u:beatmaking:idea");

const BEAT_LAB_PRO: WorldDef = {
  id: "g6-beat-lab-pro",
  title: "Beat Lab Pro",
  emoji: "🎛️",
  grade: "6",
  theme: "night",
  blurb: "Program drums like a producer: 16 steps, the backbeat, genre grooves, swing and ghost notes.",
  talk: ["Which genre's drum beat is your favorite: rock, hip hop, house, trap or funk?", "Can you beatbox a boom-bap beat? Kick (“b”), snare (“k”), hi-hat (“ts”)."],
  challenge: "Play a favorite song and drum along: kick on your leg, snare on the table. Where does the snare land?",
  stages: [
    {
      title: "The kit's jobs",
      emoji: "🥁",
      levels: 1,
      topics: [blRoles, blCount, blCopy, blBasics],
      fixed: (r) => seq(r, [BL_KIT_IDEA, [blRoles, 0.1], [blBasics, 0.1], [blCount, 0.1], [blCopy, 0.1], [blRoles, 0.6], [blCount, 0.4], [blBasics, 0.5]]),
    },
    practice({ title: "Genre grooves", emoji: "🎧", idea: BL_GENRE_IDEA, topics: [blStyle, blMake, blGrid, blCopy], unlocks: ["groove:trap", "drum:rim"] }),
    practice({ title: "Swing and ghosts", emoji: "👻", idea: BL_FEEL_IDEA, topics: [blSwing, blFeelMake, blGhost, blFeelCopy], unlocks: ["groove:funk", "drum:snap"] }),
    {
      title: "Signature grooves",
      emoji: "🔥",
      levels: 1,
      topics: [blMake, blFill, blStyle, blCount],
      unlocks: ["drum:lowtom"],
      fixed: (r) => seq(r, [BL_BUILD_IDEA, mk(MK_BOOMBAP, "u:beatmaking:create"), [blStyle, 0.9], mk(MK_TRAP, "u:beatmaking:create"), [blGhost, 0.8], mk(MK_SNAP, "u:beatmaking:create"), mk(MK_SIGNATURE, "u:beatmaking:create")]),
    },
  ],
};

// ═══ 3 · Bass Clef Bay ════════════════════════════════════════════════════════════════════════
// The F clef: lines G B D F A, spaces A C E G, octave numbers, middle C and the grand staff,
// reading bass lines, writing them. Unlocks the synth bass.
const BASS_LINES = [43, 47, 50, 53, 57]; // G2 B2 D3 F3 A3
const BASS_SPACES = [45, 48, 52, 55]; // A2 C3 E3 G3
const BASS_LEDGER = [40, 41, 59, 60, 62]; // E2 F2 B3 C4 D4
/** Name a note on the staff: letter options, with the classic trap of reading bass clef as treble. */
function nameIt(r: Rng, p: number, o: { clef: "treble" | "bass"; key?: number; prompt: string; skill: string }): Activity {
  const ans = nm(p, o.key ?? 0);
  const L = LETTERS.indexOf(ans[0] as (typeof LETTERS)[number]);
  const trap = o.clef === "bass" ? LETTERS[(L + 5) % 7] + ans.slice(1) : LETTERS[(L + 2) % 7] + ans.slice(1);
  const others = LETTERS.map((l) => l + ans.slice(1)).filter((x) => x !== ans && x !== trap);
  return { kind: "staff", mode: "name", prompt: o.prompt, clef: o.clef, notes: [p], ...(o.key ? { key: o.key } : {}), options: shuffle(r, [ans, trap, ...pickN(r, others, 2)]), answer: ans, hear: true, skill: o.skill };
}
const bcLines = topic("g6-bc-lines", (r) => nameIt(r, pick(r, BASS_LINES), { clef: "bass", prompt: "Bass clef, on a line. Name this note.", skill: "u:staff:bass-lines" }));
const bcSpaces = topic("g6-bc-spaces", (r) => nameIt(r, pick(r, BASS_SPACES), { clef: "bass", prompt: "Bass clef, in a space. Name this note.", skill: "u:staff:bass-spaces" }));
const bcLedger = topic("g6-bc-ledger", (r) => nameIt(r, pick(r, BASS_LEDGER), { clef: "bass", prompt: "This one sits on or near a ledger line. Name it.", skill: "u:staff:ledger" }));
const bcPlace = topic("g6-bc-place", (r) => {
  const p = pick(r, [...BASS_LINES, ...BASS_SPACES]);
  // G and A each appear twice on the bass staff (G2/G3, A2/A3); B, C, D, E and F only once.
  const twice = [43, 45, 55, 57].includes(p);
  const name = twice ? `the ${p < 50 ? "low" : "high"} ${nm(p)} (${nmo(p)})` : nm(p);
  return { kind: "staff", mode: "place", prompt: `Put ${name} on the bass staff.`, clef: "bass", notes: [p], skill: "u:staff:bass-place" };
});
const BASS_SPOTS = { lines: ["Bottom line", "2nd line", "Middle line", "4th line", "Top line"], spaces: ["Bottom space", "2nd space", "3rd space", "Top space"] };
const bcMatch = topic("g6-bc-match", (r) => {
  const lines = r() < 0.5;
  const spots = lines ? BASS_SPOTS.lines : BASS_SPOTS.spaces;
  const ps = lines ? BASS_LINES : BASS_SPACES;
  const idx = pickN(r, ps.map((_, i) => i), 4).sort((a, b) => a - b);
  return { kind: "match", prompt: `Bass clef ${lines ? "lines" : "spaces"}: match each spot to its note.`, pairs: idx.map((i) => ({ a: { id: `s${i}`, text: spots[i] }, b: { id: `n${i}`, text: nm(ps[i]) } })), skill: lines ? "u:staff:bass-lines" : "u:staff:bass-spaces" };
});
const bcKeyFind = topic("g6-bc-keyfind", (r) => {
  const p = pick(r, [36, 40, 43, 45, 48, 52, 53, 55, 57, 60]);
  return { kind: "keys", task: "find", prompt: `This keyboard starts on C2. Find ${nmo(p)}${p === 60 ? " (middle C)" : ""}, in exactly that octave.`, answer: [p], lo: 36, hi: 64, labels: false, octaveFree: false, why: `${nmo(p)}: count the Cs from the left. C2, C3, then C4, middle C.`, skill: "u:staff:octaves" };
});
const bcRead = topic("g6-bc-read", (r) => {
  const p = pick(r, [...BASS_LINES, ...BASS_SPACES]);
  return { kind: "melody", mode: "read", prompt: "Read the note on the bass staff, then play it on the keyboard.", notes: [p], pads: naturals(40, 60), on: "keys", labels: "none", show: "staff", clef: "bass", inst: "cello", skill: "u:staff:bass-read" };
});
const BASS_RIFFS: number[][] = [
  [48, 55, 48, 55], [43, 50, 43, 50], [48, 52, 55, 52], [45, 48, 52, 48], [48, 50, 52, 53, 55],
  [55, 53, 52, 50, 48], [41, 45, 48, 45], [43, 47, 50, 53], [48, 48, 55, 53, 52], [45, 52, 50, 48, 47, 45],
];
const bcMelody = topic("g6-bc-melody", (r, d) => {
  const riff = pick(r, d < 0.5 ? BASS_RIFFS.filter((x) => x.length === 4) : BASS_RIFFS);
  return { kind: "melody", mode: "read", prompt: "Read this bass line, then play it.", notes: riff, pads: naturals(40, 57), on: "keys", labels: d < 0.3 ? "letters" : "none", show: "staff", clef: "bass", inst: "cello", durs: riff.map(() => 1), bpm: 84, skill: "u:staff:bass-read" };
});
const LOW_HIGH: [InstId, InstId[]][] = [
  ["cello", ["violin", "flute"]], ["tuba", ["trumpet", "piccolo"]], ["bassoon", ["oboe", "flute"]],
  ["trombone", ["trumpet", "clarinet"]], ["bass", ["ukulele", "violin"]], ["doublebass", ["violin", "piccolo"]],
];
const bcInst = topic("g6-bc-inst", (r) => {
  const [ans, wrong] = pick(r, LOW_HIGH);
  return listen({ prompt: "This instrument plays low enough that its music is written in bass clef. Which one is it?", sound: melody([48, 50, 52, 53, 55, 52, 48], [0.5, 0.5, 0.5, 0.5, 1, 0.5, 1.5], ans, 96), options: shuffle(r, [ans, ...wrong]).map((x) => instOpt(x)), answer: ans, skill: "u:timbre:bass-clef", why: "Low instruments (cello, double bass, bass guitar, bassoon, trombone, tuba, and the piano's left hand) read bass clef." });
});
const OCT_SETS = [[36, 48, 60], [40, 52, 64], [41, 53, 65]];
const bcOctave = topic("g6-bc-octave", (r) => {
  const set = pick(r, OCT_SETS);
  const p = pick(r, set);
  return listen({ prompt: "Octave numbers: which one is this?", sound: note1(p, "piano", 2, 60), show: staffShow(sn([p], 4), "bass"), options: set.map((x) => opt(String(x), x === 60 ? "C4 (middle C)" : nmo(x))), answer: String(p), skill: "u:staff:octaves", why: `It's ${nmo(p)}. Octave numbers start over at every C: C2, C3, C4 (middle C), C5. The bass staff runs from G2 (bottom line) to A3 (top line).` });
});
const bcSame = topic("g6-bc-same", (r) => {
  const p = pick(r, [57, 59, 60, 62]);
  const cands = [p, p + 12, upLetters(p, 2)];
  return listen({ prompt: "This note is on the bass staff. Which treble-staff note is the very same pitch?", sound: note1(p, "piano", 2, 60), show: staffShow(sn([p], 4), "bass"), options: shuffle(r, cands).map((x) => opt(String(x), undefined, { show: staffShow(sn([x], 4), "treble") })), answer: String(p), skill: "u:staff:grand", why: `It's ${nmo(p)}. Notes near middle C can be written on either staff: same pitch, same piano key, different spot.` });
});
const bcWrite = topic("g6-bc-write", (r) => {
  const riff = pick(r, BASS_RIFFS.filter((x) => x.length <= 5));
  return { kind: "staff", mode: "write", prompt: `Write this bass line on the bass staff: ${riff.map((p) => nmo(p)).join(", ")}.`, clef: "bass", notes: riff, skill: "u:staff:bass-write" };
});
const BC_PITCHES = [43, 45, 47, 48, 50, 52, 53, 55]; // G2 … G3 in C major
const bcCompose = topic("g6-bc-compose", (r) => {
  const v = pick(r, [
    { prompt: "Bass line for C – F – G – C (2 beats each): start and end on C3, and play F3 and G3 when those chords arrive.", rules: [{ rule: "start", p: 48 }, { rule: "end", p: 48 }, { rule: "use", pitches: [53, 55] }] as ComposeRule[] },
    { prompt: "Walking bass: move only by step (or repeat a note), start and end on C3, at least 7 notes.", rules: [{ rule: "steps" }, { rule: "start", p: 48 }, { rule: "end", p: 48 }, { rule: "notes", min: 7 }] as ComposeRule[] },
    { prompt: "Root–fifth bass: start on C3, use G2 (the 5th below), leave at least 2 rests for punch, and end on C3.", rules: [{ rule: "start", p: 48 }, { rule: "use", pitches: [43] }, { rule: "rests", min: 2 }, { rule: "end", p: 48 }] as ComposeRule[] },
  ]);
  return { kind: "compose", prompt: v.prompt, pitches: BC_PITCHES, slots: 8, dur: 1, inst: "bass", bpm: 92, rules: v.rules, tonic: 48, labels: "letters", backing: bed(["I", "IV", "V", "I"], 60, 92, { bass: false, drums: "rock" }), skill: "u:compose:bass-line" };
});

const BC_IDEA = idea("The bass clef", [
  fb("Low instruments read the bass clef: cello, tuba, bass guitar, the piano's left hand. It's also called the F clef, because its two dots hug the F line.", staffSound([53, 53], [2, 2], { clef: "bass", inst: "cello", bpm: 72, marks: [0] })),
  fb("The lines, bottom to top: G B D F A. “Good Boys Do Fine Always.”", staffSound(BASS_LINES, 1, { clef: "bass", inst: "cello", bpm: 92 })),
  fb("The spaces, bottom to top: A C E G. “All Cows Eat Grass.”", staffSound(BASS_SPACES, 1, { clef: "bass", inst: "cello", bpm: 92 })),
  fb("Careful: this is not treble clef. Every spot names a different note here: the bottom line is G, not E. Try the low notes on the keys.", staffSound([43, 43], [2, 2], { clef: "bass", inst: "piano", bpm: 72 }), "keys", naturals(40, 60)),
  fb("Notes also carry an octave number, which starts over at every C. The bass staff runs from G2 on its bottom line up to A3 on its top line; middle C is C4.", staffSound([43, 48, 57, 60], [1, 1, 1, 2], { clef: "bass", inst: "piano", bpm: 84, marks: [0, 2] })),
], "u:staff:idea");
const BC_READ_IDEA = idea("Read it fast", [
  fb("Speed trick: learn landmarks. Low G is the bottom line, F is the line between the clef's dots, and middle C is the ledger line above.", staffSound([43, 53, 60], [1.5, 1.5, 2], { clef: "bass", bpm: 84, marks: [0, 1, 2] })),
  fb("From a landmark, count by line and space: F on its line, G in the space above, A on the top line.", staffSound([53, 55, 57], 1, { clef: "bass", inst: "cello", bpm: 84 })),
  fb("Bass lines are patterns: root and fifth, walking steps, arpeggios. See the shape first, then name the notes.", staffSound([48, 55, 48, 55, 48, 52, 55, 52], 0.5, { clef: "bass", inst: "bass", bpm: 100 })),
], "u:staff:idea");
const BC_GRAND_IDEA = idea("The grand staff", [
  frame("Piano music joins a treble staff and a bass staff with a brace: the grand staff. Middle C, C4, sits on a ledger line right between them.", { show: "keyboard", lo: 48, hi: 72, lit: [60], labels: "letters", marks: { 60: "C4" } }, note1(60, "piano", 2, 60), "keys", naturals(48, 72)),
  fb("On the bass staff, middle C is the first ledger line ABOVE. On the treble staff, it's the first ledger line BELOW. Same pitch, same key.", staffSound([57, 59, 60], [1, 1, 2], { clef: "bass", bpm: 80, marks: [2] })),
  fb("Count octaves by the Cs: C2 (two ledger lines below), C3 (the 2nd space), C4 (middle C, the ledger line above). Every C starts a new octave number.", staffSound([36, 48, 60], [1.5, 1.5, 2], { clef: "bass", bpm: 80 })),
], "u:staff:idea");
const BC_LINE_IDEA = idea("Write a bass line", [
  frame("The bass line is the bridge between drums and chords. It plays in rhythm with the kick and usually lands on each chord's root.", staffShow(sn([48, 48, 53, 53, 55, 55, 48, 48]), "bass"), layer(melody([48, 48, 53, 53, 55, 55, 48, 48], 1, "bass", 92), bed(["I", "IV", "V", "I"], 60, 92, { bass: false, drums: "rock" }))),
  fb("Root–fifth: bounce between the chord's root and its 5th. Country, polka, marches and pop all use it.", staffSound([48, 43, 48, 43, 53, 48, 53, 48], 1, { clef: "bass", inst: "bass", bpm: 100 })),
  fb("Walking bass: one note per beat, stepping toward the next chord's root. A jazz favorite.", staffSound([48, 50, 52, 53, 55, 53, 52, 50], 1, { clef: "bass", inst: "bass", bpm: 110 })),
  frame("Producers often swap the bass guitar for a synth bass: same notes, a deeper and rounder sound. Finish this island and it joins your Studio.", { show: "inst", ids: ["synthbass"] }, melody([48, 48, 55, 53, 52, 52, 50, 43], [0.75, 0.75, 0.5, 1, 0.75, 0.75, 0.5, 1], "synthbass", 96)),
], "u:staff:idea");

const BC_C1: Activity = { kind: "compose", prompt: "Write a bass line for C – F – G – C (2 beats each). Start and end on C3, and use F3 and G3.", pitches: BC_PITCHES, slots: 8, dur: 1, inst: "bass", bpm: 92, rules: [{ rule: "start", p: 48 }, { rule: "end", p: 48 }, { rule: "use", pitches: [53, 55] }], tonic: 48, labels: "letters", backing: bed(["I", "IV", "V", "I"], 60, 92, { bass: false, drums: "rock" }), skill: "u:compose:bass-line" };
const BC_C2: Activity = { kind: "compose", prompt: "Walking bass: steps only (or repeated notes), start and end on C3, at least 7 notes.", pitches: BC_PITCHES, slots: 8, dur: 1, inst: "bass", bpm: 100, rules: [{ rule: "steps" }, { rule: "start", p: 48 }, { rule: "end", p: 48 }, { rule: "notes", min: 7 }], tonic: 48, labels: "letters", backing: bed(["I", "vi", "IV", "V"], 60, 100, { bass: false, drums: "swing" }), skill: "u:compose:bass-line" };
const BC_W1: Activity = { kind: "staff", mode: "write", prompt: "Write this root–fifth bass line on the bass staff: C3, G2, C3, G2.", clef: "bass", notes: [48, 43, 48, 43], skill: "u:staff:bass-write" };

const BASS_CLEF_BAY: WorldDef = {
  id: "g6-bass-clef-bay",
  title: "Bass Clef Bay",
  emoji: "🐋",
  grade: "6",
  theme: "deep",
  blurb: "Read the low notes: the F clef, octave numbers, middle C and the grand staff.",
  talk: ["Which instruments in a band or orchestra read bass clef?", "“Good Boys Do Fine Always”: can you invent your own sentence for G B D F A?"],
  challenge: "Find the bass line in a song you like and hum only the bass. Does it follow the kick drum?",
  stages: [
    {
      title: "The F clef",
      emoji: "🐋",
      levels: 1,
      topics: [bcLines, bcSpaces, bcPlace, bcInst, bcMatch],
      fixed: (r) => seq(r, [BC_IDEA, [bcLines, 0.1], [bcPlace, 0.2], [bcMatch, 0.2], [bcSpaces, 0.3], [bcInst, 0.3], [bcRead, 0.3], [bcPlace, 0.6]]),
    },
    practice({ title: "Read it, play it", emoji: "🎹", idea: BC_READ_IDEA, topics: [bcRead, bcMelody, bcLines, bcWrite, bcSpaces] }),
    practice({ title: "The grand staff", emoji: "🌉", idea: BC_GRAND_IDEA, topics: [bcLedger, bcOctave, bcKeyFind, bcSame, bcPlace] }),
    {
      title: "Bass lines",
      emoji: "🎸",
      levels: 1,
      topics: [bcCompose, bcWrite, bcMelody],
      unlocks: ["inst:synthbass"],
      fixed: (r) => seq(r, [BC_LINE_IDEA, [bcMelody, 0.6], BC_C1, BC_W1, BC_C2, [bcMelody, 0.9], [bcCompose, 0.9]]),
    },
  ],
};

// ═══ 4 · Sound Science Station ════════════════════════════════════════════════════════════════
// Acoustics: vibration, frequency (Hz) and pitch, amplitude and loudness (dB), the octave as
// double the frequency, wavelength, the speed of sound, harmonics and timbre, speakers and ears,
// additive synthesis. Unlocks the synthesizer.
/** A tone built from its first n harmonics: sine waves at 1×, 2×, 3×… the frequency, each softer. */
function additive(base: number, n: number, beats = 2.5): Score {
  const H = [0, 12, 19, 24, 28, 31, 34, 36];
  const tracks: MTrack[] = H.slice(0, n).map((s, i) => ({ kind: "notes", inst: "whistle", notes: [{ p: base + s, d: beats, v: 0.8 }], vol: 1 / (i + 1) }));
  return { bpm: 60, tracks };
}
/** A distant rumble (timpani roll, gong, bass drum) for the thunder questions. */
const thunder = (): Score => ({
  bpm: 120,
  tracks: [{ kind: "drums", hits: [{ t: 0, k: "bassdrum", v: 1 }, { t: 0, k: "gong", v: 0.7 }, ...Array.from({ length: 14 }, (_, i): MHit => ({ t: 0.25 + i * 0.25, k: "timpani", v: Math.max(0.2, 0.9 - i * 0.05) }))] }],
});

const ssHigher = topic("g6-ss-higher", (r, d) => {
  const gap = Math.max(1, Math.round(7 - d * 6));
  const a = int(r, 66, 84);
  const b = a + (r() < 0.5 ? -gap : gap); // stays inside the pure tone's range (60–96)
  const ask = r() < 0.5 ? "higher" : "lower";
  return listen({
    prompt: ask === "higher" ? "Which tone has the higher frequency (more vibrations per second)?" : "Which tone has the lower frequency (fewer vibrations per second)?",
    options: [soundOpt("a", tone(a, 1.5, 60), "Tone A"), soundOpt("b", tone(b, 1.5, 60), "Tone B")],
    answer: (ask === "higher") === a > b ? "a" : "b",
    skill: "u:acoustics:frequency",
    why: `Tone A ≈ ${hz(a)} Hz and Tone B ≈ ${hz(b)} Hz. More vibrations per second means a higher pitch.`,
  });
});
const ssWaveRead = topic("g6-ss-wave", (r) => {
  const p = pick(r, [60, 64, 67, 69]);
  if (r() < 0.5) {
    const up = r() < 0.5;
    const p2 = up ? p + 12 : p;
    const p1 = up ? p : p + 12;
    return listen({ prompt: "Compare the two waves (first, then second). What's different about the second sound?", sound: then(tone(p1, 1.5), tone(p2, 1.5), 0.5), show: { show: "wave", hz: hz(p1), amp: 0.6, compare: { hz: hz(p2), amp: 0.6 } }, options: [opt("higher", "It's higher: more waves in the same time"), opt("lower", "It's lower: fewer waves in the same time"), opt("louder", "It's louder: taller waves")], answer: up ? "higher" : "lower", skill: "u:acoustics:waves", why: `The second wave is ${hz(p2)} Hz vs ${hz(p1)} Hz. Frequency (how tightly packed the waves are) sets the pitch; the height (amplitude) would set the loudness.` });
  }
  const loud = r() < 0.5;
  return listen({ prompt: "Compare the two waves (first, then second). What's different about the second sound?", sound: then(tone(p, 1.5, 60, loud ? 0.35 : 0.9), tone(p, 1.5, 60, loud ? 0.9 : 0.35), 0.5), show: { show: "wave", hz: hz(p), amp: loud ? 0.3 : 0.9, compare: { hz: hz(p), amp: loud ? 0.9 : 0.3 } }, options: [opt("louder", "It's louder: taller waves (bigger amplitude)"), opt("softer", "It's softer: shorter waves (smaller amplitude)"), opt("higher", "It's higher in pitch")], answer: loud ? "louder" : "softer", skill: "u:acoustics:waves", why: "Same frequency, so the same pitch. The wave's height, its amplitude, sets how loud it is." });
});
const ssSlider = topic("g6-ss-slider", (r, d) => {
  const mode = pick(r, d < 0.4 ? (["higher", "lower", "louder", "softer"] as const) : (["higher", "lower", "louder", "softer", "octave", "match"] as const));
  switch (mode) {
    case "higher": return { kind: "wave", mode, prompt: "Raise the frequency: make the wave wiggle faster and the pitch go up.", hz: int(r, 200, 500), amp: 0.5, skill: "u:acoustics:pitch" };
    case "lower": return { kind: "wave", mode, prompt: "Lower the frequency: slower wiggles, lower pitch.", hz: int(r, 500, 1000), amp: 0.5, skill: "u:acoustics:pitch" };
    case "louder": return { kind: "wave", mode, prompt: "Turn up the amplitude: taller waves, a louder sound, same pitch.", hz: pick(r, [262, 330, 440]), amp: 0.35, skill: "u:acoustics:pitch" };
    case "softer": return { kind: "wave", mode, prompt: "Turn down the amplitude: shorter waves, a softer sound, same pitch.", hz: pick(r, [262, 330, 440]), amp: 0.8, skill: "u:acoustics:pitch" };
    case "octave": {
      const f = pick(r, [220, 262, 330, 440, 500]);
      return { kind: "wave", mode, prompt: `Slide up exactly one octave: double the frequency, from ${f} Hz to ${f * 2} Hz.`, hz: f, amp: 0.5, skill: "u:acoustics:octave" };
    }
    default: {
      const f = int(r, 250, 600);
      return { kind: "wave", mode: "match", prompt: "Match the mystery tone: slide until your wave sounds, and looks, the same.", hz: f, amp: 0.5, target: { hz: Math.round(f * pick(r, [1.25, 1.5, 0.7])), amp: pick(r, [0.3, 0.8]) }, skill: "u:acoustics:pitch" };
    }
  }
});
const BASICS_Q: { q: string; a: string; w: string[]; e: string; why: string }[] = [
  { q: "What does a hertz (Hz) measure?", a: "Vibrations per second", w: ["How loud a sound is", "How long a sound lasts"], e: "〰️", why: "1 Hz is one vibration each second. 440 Hz means 440 vibrations every second." },
  { q: "Orchestras tune to concert A. What is its frequency?", a: "440 Hz", w: ["100 Hz", "4,400 Hz"], e: "🎻", why: "Concert A (A4) is 440 Hz. The oboe usually plays it so the whole orchestra can tune." },
  { q: "About what range of frequencies can young human ears hear?", a: "20 Hz to 20,000 Hz", w: ["1 Hz to 100 Hz", "500 Hz to 1,000 Hz"], e: "👂", why: "Roughly 20 Hz to 20,000 Hz, and the top end drops as people get older." },
  { q: "A dog whistle seems silent to people. Why?", a: "Its frequency is higher than humans can hear", w: ["It makes no vibrations", "Its amplitude is zero"], e: "🐶", why: "Dogs hear up to about 45,000 Hz. Anything above about 20,000 Hz is ultrasound to us." },
  { q: "What carries the sound of a drum to your ears?", a: "Vibrating air molecules: a pressure wave", w: ["Tiny particles shot out of the drum", "Light from the drumhead"], e: "🥁", why: "The drumhead pushes and pulls the air; each molecule bumps the next, passing the wave along." },
  { q: "Make a sound wave's amplitude bigger, and the sound gets…", a: "Louder", w: ["Higher", "Faster"], e: "🔊", why: "Amplitude sets loudness. Frequency sets pitch." },
];
const ssBasics = topic("g6-ss-basics", (r) => quiz(r, { ...pick(r, BASICS_Q), skill: "u:acoustics:basics" }));
const ssAmp = topic("g6-ss-amp", (r, d) => {
  const loudFirst = r() < 0.5;
  const tune = melody([67, 72, 76, 72, 67], [0.5, 0.5, 0.5, 0.5, 1], "piano", 100);
  const loud = { ...tune, fx: { gain: 1.1 } };
  const soft = { ...tune, fx: { gain: d < 0.5 ? 0.25 : 0.5 } };
  return listen({ prompt: "Same notes, same instrument. Which version has the bigger amplitude?", options: [soundOpt("a", loudFirst ? loud : soft, "Version A"), soundOpt("b", loudFirst ? soft : loud, "Version B")], answer: loudFirst ? "a" : "b", skill: "u:acoustics:amplitude", why: "A bigger amplitude means bigger pressure swings in the air, which we hear as louder. Loudness is measured in decibels (dB)." });
});
const ssOctave = topic("g6-ss-octave", (r, d) => {
  const v = int(r, 0, d < 0.5 ? 2 : 4);
  if (v === 0) return listen({ prompt: "A4 vibrates at 440 Hz. What is A5, one octave higher?", sound: then(tone(69, 1.5), tone(81, 1.5), 0.5), options: textOpts(r, "880 Hz", ["660 Hz", "450 Hz", "220 Hz"]), answer: "880 Hz", skill: "u:acoustics:octave", why: "Up an octave = double the frequency: 440 × 2 = 880 Hz." });
  if (v === 1) return listen({ prompt: "A4 vibrates at 440 Hz. What is A3, one octave lower?", sound: then(note1(69, "piano", 1.5), note1(57, "piano", 1.5), 0.5), options: textOpts(r, "220 Hz", ["430 Hz", "880 Hz", "340 Hz"]), answer: "220 Hz", skill: "u:acoustics:octave", why: "Down an octave = half the frequency: 440 ÷ 2 = 220 Hz." });
  if (v === 2) return listen({ prompt: "Middle C (C4) is about 262 Hz. About what frequency is C5?", sound: then(tone(60, 1.5), tone(72, 1.5), 0.5), options: textOpts(r, "About 524 Hz", ["About 274 Hz", "About 393 Hz", "About 131 Hz"]), answer: "About 524 Hz", skill: "u:acoustics:octave", why: "Each octave doubles the frequency: 262 × 2 ≈ 524 Hz." });
  if (v === 3) return listen({ prompt: "A string vibrates at 110 Hz. What frequency is two octaves higher?", sound: chain([note1(45, "harp", 1.2), note1(57, "harp", 1.2), note1(69, "harp", 1.5)], 0.25), options: textOpts(r, "440 Hz", ["220 Hz", "330 Hz", "1,100 Hz"]), answer: "440 Hz", skill: "u:acoustics:octave", why: "Two octaves = double, then double again: 110 → 220 → 440 Hz." });
  const p = int(r, 60, 70);
  const pairs = shuffle(r, [12, 7, 11]);
  return listen({ prompt: "Which pair of tones is exactly an octave apart (twice the frequency)?", options: pairs.map((s, i) => soundOpt(`p${s}`, then(tone(p, 1), tone(p + s, 1.5), 0.25), `Pair ${"ABC"[i]}`)), answer: "p12", skill: "u:acoustics:octave", why: "An octave's two notes blend so smoothly they almost sound like one. The higher one vibrates exactly twice as fast." });
});
const ssWavelength = topic("g6-ss-wavelength", (r) => {
  const v = int(r, 0, 2);
  if (v === 0) {
    const lowFirst = r() < 0.5;
    return listen({ prompt: "Which tone has the LONGER wavelength?", options: [soundOpt("a", tone(lowFirst ? 69 : 81, 1.5), "Tone A"), soundOpt("b", tone(lowFirst ? 81 : 69, 1.5), "Tone B")], answer: lowFirst ? "a" : "b", skill: "u:acoustics:wavelength", why: "Lower frequency means longer waves. At 440 Hz each wave is about 78 cm long; at 880 Hz, about 39 cm." });
  }
  if (v === 1) return seeChoice({ prompt: "Sound travels about 343 meters per second in air. What is the wavelength of a 343 Hz tone?", visual: { show: "wave", hz: 343, amp: 0.6 }, options: textOpts(r, "About 1 meter", ["About 343 meters", "About 1 centimeter"]), answer: "About 1 meter", skill: "u:acoustics:wavelength", why: "Wavelength = speed ÷ frequency: 343 ÷ 343 = 1 meter." });
  return listen({ prompt: "If you double a sound's frequency, what happens to its wavelength?", sound: then(tone(64, 1.5), tone(76, 1.5), 0.5), show: { show: "wave", hz: 330, amp: 0.6, compare: { hz: 660, amp: 0.6 } }, options: textOpts(r, "It's cut in half", ["It doubles", "It stays the same"]), answer: "It's cut in half", skill: "u:acoustics:wavelength", why: "Speed stays the same, so twice as many waves per second must each be half as long." });
});
const SPEED_Q: { q: string; a: string; w: string[]; e: string; why: string; boom?: boolean }[] = [
  { q: "Lightning flashes. You count 6 seconds before the thunder. About how far away is the storm?", a: "About 2 km", w: ["About 6 km", "About 200 m"], e: "⛈️", why: "Sound covers about 343 m each second: 6 × 343 ≈ 2,058 m. Divide the seconds by 3 for kilometers.", boom: true },
  { q: "Thunder arrives 3 seconds after the flash. About how far away did the lightning strike?", a: "About 1 km", w: ["About 3 km", "About 100 m"], e: "🌩️", why: "3 × 343 m ≈ 1,029 m, about a kilometer.", boom: true },
  { q: "Sound travels fastest through which of these?", a: "Steel", w: ["Air", "Water"], e: "🔩", why: "About 343 m/s in air, about 1,480 m/s in water and about 5,900 m/s in steel. Tightly packed particles pass the vibration along faster." },
  { q: "Why is outer space silent?", a: "There's no air (no medium) to carry vibrations", w: ["It's too cold for sound", "Sound is too slow to cross space"], e: "🧑‍🚀", why: "Sound is vibration passed from particle to particle. In a vacuum there are no particles, so there's no sound." },
  { q: "In a big stadium you see the bat hit the ball before you hear the crack. Why?", a: "Light travels much faster than sound", w: ["Your eyes are closer than your ears", "The crack happens later"], e: "⚾", why: "Light is about 900,000 times faster than sound. The sound needs a noticeable moment to cross the stadium." },
  { q: "You shout at a cliff and hear the echo 2 seconds later. About how far away is the cliff?", a: "About 343 m", w: ["About 686 m", "About 2 km"], e: "🏔️", why: "The sound travels there AND back: 2 s × 343 m/s = 686 m round trip, so the cliff is about 343 m away." },
];
const ssSpeed = topic("g6-ss-speed", (r) => {
  const x = pick(r, SPEED_Q);
  if (x.boom) return listen({ prompt: x.q, sound: thunder(), show: { show: "pics", emoji: x.e }, options: textOpts(r, x.a, x.w), answer: x.a, skill: "u:acoustics:speed", why: x.why, layout: "list" });
  return quiz(r, { ...x, skill: "u:acoustics:speed" });
});
const ssHarmonics = topic("g6-ss-harmonics", (r, d) => {
  const v = int(r, 0, d < 0.5 ? 1 : 2);
  if (v === 0) {
    const f = pick(r, [110, 220]);
    const base = f === 110 ? 45 : 57; // A2 or A3
    const k = int(r, 2, 5);
    const wrong = [...new Set([f * (k + 1), f + k * 10, f * k + f / 2, f * (k - 1)])].filter((x) => x !== f * k && x !== f).slice(0, 3);
    const series = [0, 12, 19, 24, 28].slice(0, k).map((s) => base + s);
    return listen({ prompt: `A string's fundamental is ${f} Hz. Its harmonics are whole-number multiples of it. What frequency is harmonic number ${k}?`, sound: melody(series, [...series.slice(1).map(() => 0.8), 1.6], "harp", 90), options: textOpts(r, `${f * k} Hz`, wrong.map((x) => `${x} Hz`)), answer: `${f * k} Hz`, skill: "u:acoustics:harmonics", why: `Harmonic ${k} = ${k} × ${f} = ${f * k} Hz. You just heard the series climb: ${series.map((_, i) => f * (i + 1)).join(", ")} Hz.` });
  }
  if (v === 1) {
    const insts = shuffle(r, ["pure", pick(r, ["violin", "oboe"]), pick(r, ["trumpet", "sax"])]);
    return listen({ prompt: "Which sound is a pure tone: a single sine wave with no overtones?", options: insts.map((x, i) => soundOpt(x, x === "pure" ? tone(67, 2) : note1(67, x as InstId, 2, 60), `Sound ${"ABC"[i]}`)), answer: "pure", skill: "u:acoustics:harmonics", why: "A sine wave has only the fundamental, so it sounds smooth and plain, like a whistle. Real instruments add overtones." });
  }
  const f = pick(r, [200, 220, 250]);
  const odd = f * 2 + f / 2;
  return seeChoice({ prompt: `The fundamental is ${f} Hz. Which of these is NOT one of its harmonics?`, visual: { show: "wave", hz: f, amp: 0.6 }, options: textOpts(r, `${odd} Hz`, [`${f * 2} Hz`, `${f * 3} Hz`, `${f * 4} Hz`]), answer: `${odd} Hz`, skill: "u:acoustics:harmonics", why: `Harmonics are whole-number multiples: ${f * 2}, ${f * 3}, ${f * 4}… But ${odd} Hz is 2.5 × ${f}, not a whole number of times.` });
});
const ssTimbre = topic("g6-ss-timbre", (r, d) => {
  if (d < 0.5 || r() < 0.4) {
    const [a, b] = pickN(r, ["flute", "violin", "clarinet", "trumpet", "oboe"] as InstId[], 2);
    return listen({ prompt: "These two sounds have the same frequency and the same loudness. Why do they sound different?", sound: then(note1(72, a, 1.5, 60), note1(72, b, 1.5, 60), 0.5), show: { show: "inst", ids: [a, b] }, options: textOpts(r, "Different overtones: their timbre", ["Different frequencies", "One has a bigger amplitude"]), answer: "Different overtones: their timbre", skill: "u:acoustics:timbre", why: "Timbre (TAM-ber) is a sound's color. It comes from the mix of overtones above the fundamental, plus how the sound starts and fades." });
  }
  const pool: InstId[] = ["flute", "clarinet", "oboe", "trumpet", "violin", "sax"];
  const ans = pick(r, pool);
  const wrong = pickN(r, pool, 2, (x) => x === ans);
  return listen({ prompt: "Timbre detective: which instrument is playing?", sound: melody([67, 69, 71, 72, 74, 72, 67], [0.5, 0.5, 0.5, 0.5, 1, 0.5, 1.5], ans, 100), options: shuffle(r, [ans, ...wrong]).map((x) => instOpt(x)), answer: ans, skill: "u:acoustics:timbre", layout: "grid" });
});
const ssSort = topic("g6-ss-sort", (r) => {
  if (r() < 0.5) {
    const pure = pickN(r, [64, 67, 72, 76], 3).map((p, i) => ({ id: `p${i}`, sound: tone(p, 1.5), bin: "pure" }));
    const rich = pickN(r, ["violin", "trumpet", "oboe", "sax", "eguitar", "organ"] as InstId[], 3).map((x, i) => ({ id: `r${i}`, sound: note1(67, x, 1.5, 60), bin: "rich" }));
    return { kind: "soundsort", prompt: "Tap each card to hear it. Sort pure tones (one sine wave) from sounds rich in overtones.", bins: [{ id: "pure", label: "Pure tone" }, { id: "rich", label: "Rich in overtones" }], items: shuffle(r, [...pure, ...rich]).map((x, i) => ({ ...x, label: `Sound ${i + 1}` })), skill: "u:acoustics:sort" };
  }
  const low = pickN(r, [60, 62, 64, 65], 3).map((p, i) => ({ id: `l${i}`, sound: tone(p, 1.2), bin: "low" }));
  const high = pickN(r, [84, 86, 88, 91], 3).map((p, i) => ({ id: `h${i}`, sound: tone(p, 1.2), bin: "high" }));
  return { kind: "soundsort", prompt: "Tap each card to hear it. Sort the tones by frequency.", bins: [{ id: "low", label: "Low: about 250–350 Hz" }, { id: "high", label: "High: above 1,000 Hz" }], items: shuffle(r, [...low, ...high]).map((x, i) => ({ ...x, label: `Tone ${i + 1}` })), skill: "u:acoustics:sort" };
});
const EAR_Q: { q: string; a: string; w: string[]; e: string; why: string }[] = [
  { q: "A sound reaches your ear. What vibrates first?", a: "Your eardrum", w: ["Your cochlea", "Your brain"], e: "👂", why: "Pressure waves push and pull on the eardrum. Three tiny bones pass the vibration on to the cochlea." },
  { q: "Inside the cochlea, thousands of tiny hair cells…", a: "turn vibrations into nerve signals", w: ["make sounds louder", "store sounds as memories"], e: "🧠", why: "Different hair cells respond to different frequencies. Your brain reads which ones fire as pitch." },
  { q: "How does a speaker make sound?", a: "A cone moves back and forth, pushing the air", w: ["It sprays tiny sound particles", "It heats the air until it hums"], e: "🔊", why: "An electrical signal drives a coil and magnet that push the cone in and out, making pressure waves." },
  { q: "Why are bass speakers (woofers) so big?", a: "A big cone moves lots of air for low frequencies", w: ["Bass notes are heavier than high notes", "Big speakers are always louder"], e: "📻", why: "Low frequencies have long wavelengths, and moving more air makes them strong. Tweeters are tiny because highs need fast, small motions." },
  { q: "Hours of sound above about 85 decibels can…", a: "permanently damage the hair cells in your ears", w: ["make your hearing stronger", "do nothing at all"], e: "🎧", why: "Hair cells don't grow back. Keep headphone volume moderate and wear earplugs at loud concerts." },
  { q: "About how loud is a normal conversation?", a: "About 60 decibels", w: ["About 10 decibels", "About 130 decibels"], e: "🗣️", why: "Breathing is about 10 dB, conversation about 60 dB, a rock concert about 110 dB, a jet engine up close about 140 dB." },
  { q: "Each step of +10 decibels sounds about…", a: "twice as loud", w: ["ten times quieter", "exactly the same"], e: "📈", why: "Decibels are a logarithmic scale: +10 dB is 10 times the sound energy and sounds roughly twice as loud." },
];
const ssEar = topic("g6-ss-ear", (r) => quiz(r, { ...pick(r, EAR_Q), skill: "u:acoustics:hearing" }));
const ssLab = topic("g6-ss-lab", (r, d) => {
  if (d < 0.5 || r() < 0.4) {
    const f = pick(r, [262, 330, 392, 440]);
    return { kind: "wave", mode: "octave", prompt: `Octave lab: double the frequency, from ${f} Hz up to ${f * 2} Hz.`, hz: f, amp: 0.5, skill: "u:acoustics:octave" };
  }
  const start = int(r, 220, 360);
  return { kind: "wave", mode: "match", prompt: "Sound designer: match both the pitch AND the loudness of the mystery tone.", hz: start, amp: 0.7, target: { hz: pick(r, [440, 494, 523, 587]), amp: pick(r, [0.3, 0.4]) }, skill: "u:acoustics:pitch" };
});
const ssAdd = topic("g6-ss-add", (r) => {
  const richFirst = r() < 0.5;
  const rich = additive(60, int(r, 5, 7));
  const thin = additive(60, int(r, 1, 2));
  return listen({ prompt: "Additive synthesis: both tones stack sine waves on a C. Which one was built from MORE harmonics?", options: [soundOpt("a", richFirst ? rich : thin, "Tone A"), soundOpt("b", richFirst ? thin : rich, "Tone B")], answer: richFirst ? "a" : "b", skill: "u:acoustics:harmonics", why: "More harmonics make a brighter, buzzier timbre. Synthesizers build sounds exactly this way." });
});
const BUGLE = [60, 67, 72, 76, 79]; // harmonics 2–6 of a low C
const ssBugle = topic("g6-ss-bugle", (r) => {
  const v = pick(r, [
    { prompt: "Bugle call: a bugle can only play the harmonic series (C4, G4, C5, E5, G5). Start on G4, use E5 and G5, and finish on C5.", rules: [{ rule: "start", p: 67 }, { rule: "use", pitches: [76, 79] }, { rule: "end", p: 72 }] as ComposeRule[] },
    { prompt: "Fanfare on the harmonic series (C4, G4, C5, E5, G5): at least 6 notes, reach the top G5, and finish on C4.", rules: [{ rule: "notes", min: 6 }, { rule: "use", pitches: [79] }, { rule: "end", p: 60 }] as ComposeRule[] },
    { prompt: "Wake-up call: start on C4, climb up through the series to G5 somewhere in the middle, and end on C5.", rules: [{ rule: "start", p: 60 }, { rule: "arch" }, { rule: "end", p: 72 }] as ComposeRule[] },
  ]);
  return { kind: "compose", prompt: v.prompt, pitches: BUGLE, slots: 8, dur: 0.5, inst: "trumpet", bpm: 100, rules: v.rules, tonic: 60, labels: "letters", skill: "u:compose:harmonics" };
});

const SS_IDEA = idea("What sound is", [
  frame("Sound is vibration. A vibrating object shoves air molecules, which bump their neighbors: a pressure wave racing outward at about 343 meters per second.", { show: "wave", hz: 262, amp: 0.5 }, tone(60, 2.5)),
  frame("Frequency is how many vibrations happen each second, measured in hertz (Hz). More vibrations per second = a higher pitch.", { show: "wave", hz: 262, amp: 0.5, compare: { hz: 523, amp: 0.5 } }, then(tone(60, 1.5), tone(72, 1.5), 0.5)),
  frame("Amplitude is how big each vibration is. Bigger amplitude = louder. Loudness is measured in decibels (dB).", { show: "wave", hz: 440, amp: 0.3, compare: { hz: 440, amp: 0.9 } }, then(tone(69, 1.5, 60, 0.3), tone(69, 1.5, 60, 0.9), 0.5)),
  frame("Concert A is 440 Hz: orchestras tune to it. Human ears hear roughly 20 Hz to 20,000 Hz. Try some pitches on the keys.", { show: "wave", hz: 440, amp: 0.6 }, tone(69, 3), "keys", naturals(60, 84)),
], "u:acoustics:idea");
const SS_OCT_IDEA = idea("Octaves and wavelength", [
  frame("Double the frequency and you get the same note an octave higher: 440 Hz is A4, 880 Hz is A5.", { show: "wave", hz: 440, amp: 0.6, compare: { hz: 880, amp: 0.6 } }, then(tone(69, 1.5), tone(81, 1.5), 0.5)),
  frame("Halve it to go down an octave. Every A on the piano is a doubling: 110, 220, 440, 880 Hz.", { show: "keyboard", lo: 45, hi: 81, lit: [45, 57, 69, 81], labels: "letters", marks: { 45: "110", 57: "220", 69: "440", 81: "880" } }, melody([45, 57, 69, 81], [1, 1, 1, 2], "piano", 80)),
  frame("Wavelength is the distance from one wave peak to the next. Higher frequency = shorter waves: at 440 Hz each wave is about 78 cm long.", { show: "wave", hz: 440, amp: 0.6, compare: { hz: 880, amp: 0.6 } }, tone(69, 2)),
  frame("Sound crosses about 1 kilometer every 3 seconds. Count the seconds between lightning and thunder, divide by 3, and you know how far away the storm is.", { show: "pics", emoji: "⛈️" }, thunder()),
], "u:acoustics:idea");
const SS_TIMBRE_IDEA = idea("Timbre and harmonics", [
  frame("A flute and a violin can play the exact same frequency, yet you can tell them apart. That difference is timbre (TAM-ber).", { show: "inst", ids: ["flute", "violin"] }, then(note1(72, "flute", 1.5, 60), note1(72, "violin", 1.5, 60), 0.5)),
  frame("Real instruments vibrate at many frequencies at once: the fundamental plus overtones at 2×, 3×, 4×… its frequency. These are the harmonics.", { show: "wave", hz: 262, amp: 0.6 }, melody([60, 72, 79, 84, 88], 0.6, "whistle", 90)),
  frame("Stack them up and listen: one sine wave, then the same note built from six harmonics. Brighter, richer, buzzier.", { show: "wave", hz: 262, amp: 0.7 }, then(additive(60, 1, 2), additive(60, 6, 2), 0.5)),
  frame("The recipe of overtones, which are strong and which are weak, is an instrument's sound fingerprint.", { show: "inst", ids: ["clarinet", "trumpet", "oboe"] }, chain([note1(67, "clarinet", 1.2, 60), note1(67, "trumpet", 1.2, 60), note1(67, "oboe", 1.2, 60)], 0.25)),
], "u:acoustics:idea");
const SS_LAB_IDEA = idea("Sound lab", [
  frame("A speaker turns an electrical wave into an air wave by pushing a cone back and forth. Your ear runs it in reverse: eardrum, three tiny bones, then hair cells in the cochlea.", { show: "pics", emoji: "🔊" }, tone(64, 2)),
  frame("A synthesizer is a sound lab: oscillators make waves, filters shape the overtones, envelopes shape how each note starts and fades.", { show: "inst", ids: ["synth"] }, melody([60, 64, 67, 72, 67, 64], [0.5, 0.5, 0.5, 1, 0.5, 1], "synth", 100)),
  frame("A bugle has no valves, so it can only play the harmonic series of its tube: C4, G4, C5, E5, G5. That's why bugle calls sound the way they do.", staffShow(sn(BUGLE, 1)), melody([67, 72, 76, 72, 67, 72, 76, 79], [0.5, 0.5, 1, 0.5, 0.5, 0.5, 0.5, 2], "trumpet", 100)),
], "u:acoustics:idea");

const SS_TUNE: Activity = { kind: "wave", mode: "match", prompt: "Tune up! Orchestras tune to A = 440 Hz. Slide until your tone matches the oboe's A.", hz: 400, amp: 0.5, target: { hz: 440, amp: 0.5 }, skill: "u:acoustics:pitch" };
const SS_MATCH: Activity = { kind: "wave", mode: "match", prompt: "Sound designer: match the mystery tone's pitch AND its loudness.", hz: 300, amp: 0.75, target: { hz: 523, amp: 0.35 }, skill: "u:acoustics:pitch" };
const SS_OCT: Activity = { kind: "wave", mode: "octave", prompt: "Octave lab: take middle C (262 Hz) up one octave to 524 Hz.", hz: 262, amp: 0.5, skill: "u:acoustics:octave" };
const SS_BUGLE: Activity = { kind: "compose", prompt: "Write a bugle call using only the harmonic series (C4, G4, C5, E5, G5). Start on G4, use E5 and G5, and finish on C5.", pitches: BUGLE, slots: 8, dur: 0.5, inst: "trumpet", bpm: 100, rules: [{ rule: "start", p: 67 }, { rule: "use", pitches: [76, 79] }, { rule: "end", p: 72 }], tonic: 60, labels: "letters", skill: "u:compose:harmonics" };

const SOUND_SCIENCE: WorldDef = {
  id: "g6-sound-science",
  title: "Sound Science Station",
  emoji: "🔊",
  grade: "6",
  theme: "storm",
  blurb: "The physics of sound: frequency, amplitude, octaves, wavelength, harmonics and how ears hear.",
  talk: ["Why can't sound travel through space?", "If thunder comes 9 seconds after the lightning, how far away is the storm? (About 3 km.)"],
  challenge: "Next storm, count the seconds between lightning and thunder. Divide by 3 to get kilometers.",
  stages: [
    {
      title: "Vibrations and waves",
      emoji: "〰️",
      levels: 1,
      topics: [ssHigher, ssSlider, ssWaveRead, ssAmp, ssBasics],
      fixed: (r) => seq(r, [SS_IDEA, [ssHigher, 0.1], [ssSlider, 0.1], [ssBasics, 0.2], [ssWaveRead, 0.2], [ssSlider, 0.25], [ssAmp, 0.3], [ssSlider, 0.35]]),
    },
    practice({ title: "Octaves and wavelength", emoji: "📡", idea: SS_OCT_IDEA, topics: [ssOctave, ssWavelength, ssSpeed, ssSlider] }),
    practice({ title: "Timbre and harmonics", emoji: "🎻", idea: SS_TIMBRE_IDEA, topics: [ssTimbre, ssHarmonics, ssSort, ssEar] }),
    {
      title: "Sound lab",
      emoji: "🧪",
      levels: 1,
      topics: [ssLab, ssBugle, ssAdd, ssHarmonics],
      unlocks: ["inst:synth"],
      fixed: (r) => seq(r, [SS_LAB_IDEA, SS_TUNE, [ssAdd, 0.5], SS_BUGLE, SS_MATCH, [ssHarmonics, 0.8], SS_OCT]),
    },
  ],
};

// ═══ 5 · Key Signature Keys ═══════════════════════════════════════════════════════════════════
// Why key signatures exist, the order of sharps (F C G D A E B) and flats (B E A D G C F), naming
// major keys from a signature, reading notes in a key, major scales in every key, and the circle
// of fifths (with relative minors). Unlocks "change key" in the Studio.
const tonicOf = (f: number) => 60 + keyTonicPc(f);
const majorName = (f: number) => CIRCLE.find((c) => c.fifths === f)?.major ?? keyName(f).replace(" major", "");
const sigList = (f: number) => keySigLetters(f).map((l) => l + (f > 0 ? "♯" : "♭"));
const sigText = (f: number) => (f === 0 ? "no sharps or flats" : sigList(f).join(" "));
function keyWhy(f: number): string {
  if (f === 0) return "No sharps or flats: C major.";
  const sig = sigList(f);
  if (f > 0) return `The last sharp is ${sig[sig.length - 1]}. A half step up is ${majorName(f)}, so it's ${keyName(f)}.`;
  if (f === -1) return "One flat (B♭) means F major. That's the one to memorize.";
  return `The second-to-last flat is ${sig[sig.length - 2]}, and that's the key: ${keyName(f)}.`;
}
/** Notes of a key that sit comfortably on the treble staff (E4–F5). */
const keyPool = (f: number) => scale(tonicOf(f) - 12, "major", 3).filter((p) => p >= 64 && p <= 77);
/** A short melody in a key that starts on mi or so (never do), so only the signature names the key. */
function keyFrag(r: Rng, f: number, len = 5): number[] {
  const pool = keyPool(f);
  const t = tonicOf(f);
  const starts = pool.filter((p) => [4, 7].includes(pcOf(p - t)));
  let i = pool.indexOf(pick(r, starts.length ? starts : pool));
  const out = [pool[i]];
  for (let guard = 0; out.length < len && guard < 100; guard++) {
    const j = i + pick(r, [-2, -1, 1, 1, 2]);
    if (j < 0 || j >= pool.length) continue;
    i = j;
    out.push(pool[i]);
  }
  return out;
}
const SHARPS = ["F♯", "C♯", "G♯", "D♯", "A♯", "E♯", "B♯"];
const FLATS = ["B♭", "E♭", "A♭", "D♭", "G♭", "C♭", "F♭"];

const ksNameT = (key: string, fs: number[]) =>
  topic(key, (r) => {
    const f = pick(r, fs);
    const wrong = pickN(r, [...new Set([f - 1, f + 1, f - 2, f + 2, -f])].filter((x) => x !== f && x >= -5 && x <= 5), 3);
    const frag = keyFrag(r, f);
    return listen({ prompt: "What major key is this melody in? Read the key signature.", sound: melody(frag, 0.5, "piano", 104), show: { show: "staff", clef: "treble", key: f, notes: sn(frag, 0.5) }, options: [f, ...wrong].sort((a, b) => a - b).map((x) => opt(String(x), keyName(x))), answer: String(f), skill: "u:key-sig:major", why: keyWhy(f), layout: "grid" });
  });
const ksCountT = (key: string, fs: number[]) =>
  topic(key, (r, d) => {
    const f = pick(r, fs.filter((x) => x !== 0));
    const kind = f > 0 ? "sharp" : "flat";
    const n = Math.abs(f);
    const label = (k: number) => `${k} ${kind}${k === 1 ? "" : "s"}`;
    const t = tonicOf(f) > 67 ? tonicOf(f) - 12 : tonicOf(f);
    return listen({ prompt: `How many ${kind}s are in the key signature of ${keyName(f)}?`, sound: melody(scale(t, "major"), 0.5, "piano", 120), show: d < 0.5 ? { show: "circle", lit: [majorName(f)] } : undefined, options: [n - 1, n, n + 1, n + 2].filter((k) => k >= 1 && k <= 7).map((k) => opt(String(k), label(k))), answer: String(n), skill: "u:key-sig:count", why: `${keyName(f)}: ${sigText(f)}. Count around the circle from C: each step ${f > 0 ? "clockwise adds a sharp" : "counterclockwise adds a flat"}.` });
  });
const ksReadT = (key: string, fs: number[]) =>
  topic(key, (r, d) => {
    const f = pick(r, fs);
    const pool = keyPool(f);
    const affected = pool.filter((p) => keyAcc(f, spell(p, f).letter) !== 0);
    const p = affected.length && r() < 0.65 ? pick(r, affected) : pick(r, pool);
    const ans = nm(p, f);
    const L = LETTERS.indexOf(ans[0] as (typeof LETTERS)[number]);
    // The trap: the same letter without (or with) the key signature's accidental.
    const twin = ans.length > 1 ? ans[0] : ans + ("CDFGA".includes(ans) && f >= 0 ? "♯" : "♭");
    const opts = [...new Set([ans, twin, LETTERS[(L + 1) % 7], LETTERS[(L + 6) % 7]])];
    return { kind: "staff", mode: "name", prompt: d < 0.5 ? `Read the key signature first. In ${keyName(f)}, what is this note?` : "Check the key signature. What is this note's full name?", clef: "treble", notes: [p], key: f, options: shuffle(r, opts), answer: ans, hear: true, skill: "u:key-sig:read" };
  });
const ksScaleT = (key: string, fs: number[]) =>
  topic(key, (r, d) => {
    const f = pick(r, fs);
    const t = tonicOf(f);
    const sc = scale(t, "major");
    const names = sc.map((p) => nm(p, f));
    return { kind: "keys", task: "scale", prompt: d < 0.5 ? `Play the ${keyName(f)} scale, one octave up from ${names[0]}. Its signature: ${sigText(f)}.` : `Play the ${keyName(f)} scale, one octave up from ${names[0]}. Mind the key signature!`, answer: sc, given: [t], lo: 60, hi: 84, labels: d < 0.4, octaveFree: false, why: `W W H W W W H from ${names[0]}: ${names.join(" ")}.`, skill: "u:scale:major-keys" };
  });
const ksOrder = topic("g6-ks-order", (r, d) => {
  const sharp = r() < 0.5;
  const list = sharp ? SHARPS : FLATS;
  const tip = sharp ? "Father Charles Goes Down And Ends Battle" : "Battle Ends And Down Goes Charles' Father";
  if (r() < 0.5) {
    const k = d < 0.5 ? 4 : int(r, 5, 7);
    return { kind: "order", prompt: `Put the ${sharp ? "sharps" : "flats"} in the order they're added to key signatures.${d < 0.5 ? ` (${tip})` : ""}`, items: list.slice(0, k).map((t) => ({ id: t, text: t })), direction: "row", skill: "u:key-sig:order" };
  }
  const k = int(r, 1, d < 0.5 ? 3 : 5);
  const ans = list[k];
  const wrong = pickN(r, list.slice(k + 1), 3);
  return seeChoice({ prompt: `This key signature has ${list.slice(0, k).join(" ")}. Which ${sharp ? "sharp" : "flat"} would be added next?`, visual: { show: "staff", clef: "treble", key: sharp ? k : -k, notes: REST_BAR }, options: shuffle(r, [ans, ...wrong]).map((x) => opt(x, x)), answer: ans, skill: "u:key-sig:order", why: `${sharp ? "Sharps" : "Flats"} always arrive in the same order: ${list.join(" ")} (${tip}).` });
});
const ksCircle = topic("g6-ks-circle", (r, d) => {
  const kind = pick(r, d < 0.4 ? (["cw", "ccw"] as const) : (["cw", "ccw", "count", "minor"] as const));
  if (kind === "cw" || kind === "ccw") {
    const f = int(r, kind === "cw" ? -4 : -3, kind === "cw" ? 4 : 5);
    const ans = kind === "cw" ? f + 1 : f - 1;
    const wrong = [...new Set([kind === "cw" ? f - 1 : f + 1, ans + (kind === "cw" ? 1 : -1), -ans])].filter((x) => x !== ans && x !== f && x >= -6 && x <= 6);
    const t1 = tonicOf(f) > 66 ? tonicOf(f) - 12 : tonicOf(f);
    const t2 = tonicOf(ans) > 66 ? tonicOf(ans) - 12 : tonicOf(ans);
    return listen({ prompt: `On the circle of fifths, which key comes next ${kind === "cw" ? "clockwise" : "counterclockwise"} after ${keyName(f)}?`, sound: then(chordSound(romanChord("I", t1).pitches, "piano", 1.5, 80), chordSound(romanChord("I", t2).pitches, "piano", 2, 80), 0.25), show: { show: "circle", lit: [majorName(f)] }, options: [ans, ...wrong.slice(0, 2)].map((x) => opt(String(x), keyName(x))), answer: String(ans), skill: "u:circle:fifths", why: kind === "cw" ? `Clockwise = up a perfect 5th (and one more sharp or one fewer flat): ${keyName(f)} → ${keyName(ans)}.` : `Counterclockwise = down a perfect 5th (and one more flat or one fewer sharp): ${keyName(f)} → ${keyName(ans)}.` });
  }
  if (kind === "count") {
    const f = pick(r, [2, 3, 4, 5, -2, -3, -4, -5]);
    const kindName = f > 0 ? "sharps" : "flats";
    const n = Math.abs(f);
    return seeChoice({ prompt: `Counting ${f > 0 ? "clockwise" : "counterclockwise"} from C, each step adds one ${f > 0 ? "sharp" : "flat"}. How many ${kindName} does ${keyName(f)} have?`, visual: { show: "circle", lit: ["C", majorName(f)] }, options: [n - 1, n, n + 1].map((x) => opt(String(x), String(x))), answer: String(n), skill: "u:circle:fifths", why: `${keyName(f)} is ${n} steps from C: ${sigText(f)}.` });
  }
  const f = pick(r, [0, 1, 2, -1, -2, -3]);
  const ans = keyName(f, "minor");
  const wrong = [keyName(f + 1, "minor"), keyName(f - 1, "minor")];
  const t = tonicOf(f) > 66 ? tonicOf(f) - 12 : tonicOf(f);
  return listen({ prompt: `Relative minors share a key signature with a major key. Which minor key shares ${keyName(f)}'s signature?`, sound: then(chordSound(romanChord("I", t).pitches, "piano", 1.5, 80), chordSound(romanChord("vi", t).pitches, "piano", 2, 80), 0.25), show: { show: "circle", lit: [majorName(f)] }, options: textOpts(r, ans, wrong), answer: ans, skill: "u:circle:fifths", why: `The relative minor starts on the major key's 6th note (la): ${keyName(f)} → ${ans}. Same notes, darker home.` });
});
const ksCompose = topic("g6-ks-compose", (r) => {
  const f = pick(r, [1, 2, 3, -1, -2, -3]);
  const t0 = tonicOf(f);
  const t = t0 > 67 ? t0 - 12 : t0;
  const pitches = scale(t, "major");
  const sig = pitches.slice(1, 7).filter((p) => keyAcc(f, spell(p, f).letter) !== 0);
  return { kind: "compose", prompt: `Write a melody in ${keyName(f)}: use ${sig.map((p) => nm(p, f)).join(" and ")} (from the key signature) and end on ${nm(t, f)}.`, pitches, slots: 8, dur: 1, inst: "marimba", bpm: 96, rules: [{ rule: "use", pitches: sig }, { rule: "end", p: t }, { rule: "notes", min: 6 }], tonic: t, labels: "letters", backing: bed(["I", "IV", "V", "I"], t, 96), skill: "u:compose:key" };
});

const ksName1 = ksNameT("g6-ks-name1", [-2, -1, 0, 1, 2]);
const ksRead1 = ksReadT("g6-ks-read1", [1, -1, 2]);
const ksScale1 = ksScaleT("g6-ks-scale1", [0, 1, -1]);
const ksNameS = ksNameT("g6-ks-names", [1, 2, 3, 4, 5]);
const ksReadS = ksReadT("g6-ks-reads", [1, 2, 3, 4]);
const ksScaleS = ksScaleT("g6-ks-scales", [1, 2, 3, 4, 5]);
const ksCountS = ksCountT("g6-ks-counts", [1, 2, 3, 4, 5]);
const ksNameF = ksNameT("g6-ks-namef", [-1, -2, -3, -4, -5]);
const ksReadF = ksReadT("g6-ks-readf", [-1, -2, -3, -4]);
const ksScaleF = ksScaleT("g6-ks-scalef", [-1, -2, -3, -4, -5]);
const ksCountF = ksCountT("g6-ks-countf", [-1, -2, -3, -4, -5]);
const ksNameAll = ksNameT("g6-ks-nameall", [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5]);

const KS_IDEA = idea("Why key signatures?", [
  frame("Every major scale uses the same pattern of whole (W) and half (H) steps: W W H W W W H. Starting on C, that's all white keys.", keysShow(60, 72, scale(60, "major")), melody(scale(60, "major"), 0.5, "piano", 112)),
  frame("Start on G and the pattern needs F♯ instead of F. So G major always uses F♯.", { show: "keyboard", lo: 67, hi: 79, lit: scale(67, "major"), labels: "letters", marks: { 78: "F♯" } }, melody(scale(67, "major"), 0.5, "piano", 112)),
  fb("Instead of writing a sharp on every F, composers put a key signature right after the clef. One sharp on the F line means every F is F♯.", staffSound(scale(67, "major"), 0.5, { key: 1, bpm: 112 })),
  frame("Sharps are always added in the same order: F C G D A E B. Flats are the same letters backward: B E A D G C F.", { show: "staff", clef: "treble", key: 7, notes: REST_BAR }),
  fb("Naming the key: with sharps, go up a half step from the last sharp. With flats, the second-to-last flat is the key. (One flat? F major.)", staffSound([73, 74], [1, 2], { key: 2, bpm: 80, marks: [0, 1] })),
], "u:key-sig:idea");
const KS_SHARP_IDEA = idea("Sharp keys", [
  frame("The sharp keys in order: G (1 sharp), D (2), A (3), E (4), B (5). Each new key starts a perfect 5th higher than the last.", { show: "circle", lit: ["C", "G", "D", "A", "E", "B"] }, chain([60, 67, 62, 69, 64, 71].map((t) => chordSound(romanChord("I", t).pitches, "piano", 1, 96)), 0)),
  fb("The trick: the last sharp is ti, the 7th note of the key. Go up a half step to reach do. A major: last sharp G♯, so the key is A.", staffSound([68, 69], [1, 2], { key: 3, bpm: 80, marks: [0, 1] })),
], "u:key-sig:idea");
const KS_FLAT_IDEA = idea("Flat keys", [
  frame("The flat keys in order: F (1 flat), B♭ (2), E♭ (3), A♭ (4), D♭ (5). Each new key starts a perfect 4th higher.", { show: "circle", lit: ["C", "F", "B♭", "E♭", "A♭", "D♭"] }, chain([60, 65, 70, 63, 68, 61].map((t) => chordSound(romanChord("I", t).pitches, "piano", 1, 96)), 0)),
  fb("The trick: the second-to-last flat IS the key. B♭ E♭ A♭ means E♭ major. Only F major (one flat, B♭) has to be memorized.", staffSound([63, 67, 70, 75], [1, 1, 1, 2], { key: -3, bpm: 84 })),
], "u:key-sig:idea");
const KS_CIRCLE_IDEA = idea("The circle of fifths", [
  frame("The circle of fifths puts all 12 major keys on one clock face. Clockwise, each key is a perfect 5th higher and adds one sharp.", { show: "circle", lit: ["C", "G", "D", "A", "E"] }, chain([60, 67, 62, 69, 64].map((t) => chordSound(romanChord("I", t).pitches, "piano", 1, 96)), 0)),
  frame("Counterclockwise, each key is a 5th lower (a 4th higher) and adds one flat.", { show: "circle", lit: ["C", "F", "B♭", "E♭", "A♭"] }, chain([60, 65, 70, 63, 68].map((t) => chordSound(romanChord("I", t).pitches, "piano", 1, 96)), 0)),
  frame("Neighbors on the circle share all but one note. That's why songs so often move to the key next door.", { show: "circle", lit: ["C", "G"] }, then(progression(["I", "IV", "V", "I"], 60, "major", { bpm: 100, per: 1 }), progression(["I", "IV", "V", "I"], 67, "major", { bpm: 100, per: 1 }), 0)),
  frame("Inside the circle sit the relative minors. A minor shares C major's signature: no sharps, no flats.", { show: "circle", lit: ["C", "a"] }, then(chordSound([60, 64, 67], "piano", 1.5, 80), chordSound([57, 60, 64], "piano", 2, 80), 0.25)),
  frame("Change key and every note moves together: the same tune in a new color. Your Studio can now change key.", { show: "circle", lit: ["C", "E"] }, then(melody([60, 60, 67, 67, 69, 69, 67], [1, 1, 1, 1, 1, 1, 2], "piano", 112), transpose(melody([60, 60, 67, 67, 69, 69, 67], [1, 1, 1, 1, 1, 1, 2], "piano", 112), 4), 1)),
], "u:circle:idea");

const KS_SCALE_G: Activity = { kind: "keys", task: "scale", prompt: "Play the G major scale up from G4. Remember: G major needs F♯.", answer: scale(67, "major"), given: [67], lo: 60, hi: 84, labels: true, octaveFree: false, why: "W W H W W W H from G: G A B C D E F♯ G.", skill: "u:scale:major-keys" };
const KS_SCALE_F: Activity = { kind: "keys", task: "scale", prompt: "Play the F major scale up from F4. The pattern needs B♭ instead of B.", answer: scale(65, "major"), given: [65], lo: 60, hi: 84, labels: true, octaveFree: false, why: "W W H W W W H from F: F G A B♭ C D E F.", skill: "u:scale:major-keys" };
const KS_ORDER_SHARPS: Activity = { kind: "order", prompt: "Put the first four sharps in the order they're added. (Father Charles Goes Down…)", items: SHARPS.slice(0, 4).map((t) => ({ id: t, text: t })), direction: "row", skill: "u:key-sig:order" };
const KS_C_D: Activity = { kind: "compose", prompt: "Write a melody in D major, the key with F♯ and C♯. Use both, and end on D.", pitches: scale(62, "major"), slots: 8, dur: 1, inst: "marimba", bpm: 96, rules: [{ rule: "use", pitches: [66, 73] }, { rule: "end", p: 62 }, { rule: "notes", min: 6 }], tonic: 62, labels: "letters", backing: bed(["I", "IV", "V", "I"], 62, 96), skill: "u:compose:key" };
const KS_C_F: Activity = { kind: "compose", prompt: "Now F major (one flat): use B♭, start on F and end on F.", pitches: scale(65, "major"), slots: 8, dur: 1, inst: "marimba", bpm: 96, rules: [{ rule: "use", pitches: [70] }, { rule: "start", p: 65 }, { rule: "end", p: 65 }], tonic: 65, labels: "letters", backing: bed(["I", "vi", "IV", "V"], 65, 96), skill: "u:compose:key" };
const KS_C_E: Activity = { kind: "compose", prompt: "Four sharps! Write a melody in E major that uses F♯, G♯ and C♯ (it may use D♯ too) and ends on E.", pitches: scale(64, "major"), slots: 8, dur: 1, inst: "marimba", bpm: 96, rules: [{ rule: "use", pitches: [66, 68, 73] }, { rule: "end", p: 64 }], tonic: 64, labels: "letters", backing: bed(["I", "IV", "V", "I"], 64, 96), skill: "u:compose:key" };

const KEY_SIGNATURE_KEYS: WorldDef = {
  id: "g6-key-signature-keys",
  title: "Key Signature Keys",
  emoji: "🗝️",
  grade: "6",
  theme: "pirate",
  blurb: "Sharps, flats and the circle of fifths: read any key signature like a pro.",
  talk: ["Can you say the order of sharps? (Father Charles Goes Down And Ends Battle.)", "Why might a singer ask the band to play a song in a different key?"],
  challenge: "Find sheet music for a song you know (online or at school) and name its key from the key signature.",
  stages: [
    {
      title: "Why key signatures?",
      emoji: "🔑",
      levels: 1,
      topics: [ksName1, ksRead1, ksScale1, ksOrder],
      fixed: (r) => seq(r, [KS_IDEA, KS_SCALE_G, [ksRead1, 0.1], [ksName1, 0.1], KS_ORDER_SHARPS, KS_SCALE_F, [ksName1, 0.3], [ksRead1, 0.4]]),
    },
    practice({ title: "Sharp keys", emoji: "🔼", idea: KS_SHARP_IDEA, topics: [ksNameS, ksReadS, ksScaleS, ksCountS] }),
    practice({ title: "Flat keys", emoji: "🔽", idea: KS_FLAT_IDEA, topics: [ksNameF, ksReadF, ksScaleF, ksCountF, ksOrder] }),
    {
      title: "Around the circle",
      emoji: "🧭",
      levels: 1,
      topics: [ksCircle, ksCompose, ksNameAll],
      unlocks: ["tool:keys"],
      fixed: (r) => seq(r, [KS_CIRCLE_IDEA, [ksCircle, 0.1], KS_C_D, [ksCircle, 0.6], KS_C_F, [ksNameAll, 0.8], KS_C_E]),
    },
  ],
};

// ═══ 6 · Chord Quality Canyon ═════════════════════════════════════════════════════════════════
// Triads: major, minor, diminished, augmented by ear and by building them; chord symbols (C, Cm,
// Cdim, C+); roman numerals in a major key (I ii iii IV V vi vii°); hearing progressions; cadences;
// writing progressions. Unlocks the synth pad.
const Q3: Record<Q, [number, number]> = { maj: [4, 7], min: [3, 7], dim: [3, 6], aug: [4, 8] };
const QSUF: Record<Q, string> = { maj: "", min: "m", dim: "dim", aug: "+" };
const QWORD: Record<Q, string> = { maj: "major", min: "minor", dim: "diminished", aug: "augmented" };
const QLABEL: Record<Q, string> = { maj: "Major (bright)", min: "Minor (darker)", dim: "Diminished (tense)", aug: "Augmented (floating)" };
const QWHY: Record<Q, string> = {
  maj: "Major: a major 3rd (4 half steps) then a minor 3rd (3). Bright and stable.",
  min: "Minor: a minor 3rd (3 half steps) then a major 3rd (4). Darker, but still stable.",
  dim: "Diminished: two minor 3rds (3 + 3). Squeezed and tense; it wants to move.",
  aug: "Augmented: two major 3rds (4 + 4). Floating and dreamlike, never quite settled.",
};
const ALLQ: Q[] = ["maj", "min", "dim", "aug"];
const qPool = (d: number): Q[] => (d < 0.35 ? ["maj", "min"] : d < 0.7 ? ["maj", "min", "dim"] : ALLQ);
const triadPs = (root: number, q: Q) => [root, root + Q3[q][0], root + Q3[q][1]];
const triadNames = (root: number, q: Q, f = 0) => [nm(root, f), spellUp(root, 3, Q3[q][0], f), spellUp(root, 5, Q3[q][1], f)];
const plainName = (s: string) => /^[A-G][♯♭]?$/.test(s) && !["B♯", "C♭", "E♯", "F♭"].includes(s);
/** White-key roots whose triad of this quality is spelled with everyday names (no E♯, C♭, doubles). */
const rootsFor = (q: Q, lo = 55, hi = 71) => naturals(lo, hi).filter((p) => triadNames(p, q).every(plainName));
/** Will the staff (which spells with sharps in C) draw this triad with its true spelling? */
const staffTrue = (root: number, q: Q) => triadPs(root, q).every((p, i) => nm(p) === triadNames(root, q)[i]);
const arpBlock = (ps: number[], bpm = 96) => then(melody(ps, 0.5, "piano", bpm), chordSound(ps, "piano", 2, bpm), 0);

const cqEar = topic("g6-cq-ear", (r, d) => {
  const pool = qPool(d);
  const q = pick(r, pool);
  const ps = triadPs(int(r, 55, 64), q);
  const block = d > 0.8 && r() < 0.5;
  return listen({ prompt: block ? "Block chord only: which quality is this triad?" : "Which quality is this triad?", sound: block ? chordSound(ps, "piano", 2.5, 80) : arpBlock(ps), options: pool.map((x) => opt(x, QLABEL[x])), answer: q, skill: "u:chord:quality", why: QWHY[q], layout: pool.length > 2 ? "grid" : "row" });
});
const cqBuild = topic("g6-cq-build", (r, d) => {
  const q = pick(r, qPool(d));
  const root = pick(r, rootsFor(q, 60, 71));
  const names = triadNames(root, q);
  const sym = names[0] + QSUF[q];
  return { kind: "keys", task: "chord", prompt: `Build ${sym} (${QWORD[q]}): the root ${names[0]} is pressed. Add the 3rd and the 5th.`, answer: triadPs(root, q), given: [root], lo: 55, hi: 84, labels: d < 0.5, octaveFree: true, why: `${sym} = ${names.join(" – ")}: ${Q3[q][0]} half steps up to the 3rd, then ${Q3[q][1] - Q3[q][0]} more to the 5th.`, skill: "u:chord:build" };
});
const cqHalf = topic("g6-cq-half", (r, d) => {
  const pool: Q[] = d < 0.4 ? ["maj", "min", "dim"] : ALLQ;
  const q = pick(r, pool);
  const ps = triadPs(int(r, 60, 67), q);
  return listen({ prompt: "Count the half steps between the lit keys. What quality is this triad?", sound: arpBlock(ps), show: { show: "keyboard", lo: 60, hi: 79, lit: ps, labels: "letters" }, options: pool.map((x) => opt(x, cap(QWORD[x]))), answer: q, skill: "u:chord:spell", why: `${Q3[q][0]} half steps up to the 3rd, then ${Q3[q][1] - Q3[q][0]} more to the 5th: ${QWORD[q]}.` });
});
const cqSymbol = topic("g6-cq-symbol", (r, d) => {
  const q = pick(r, d < 0.4 ? (["maj", "min"] as Q[]) : ALLQ);
  if (r() < 0.5) {
    const root = pick(r, rootsFor(q, 60, 71).filter((p) => staffTrue(p, q)));
    const ps = triadPs(root, q);
    const L = nm(root);
    return listen({ prompt: "Which chord symbol matches this triad?", sound: chordSound(ps, "piano", 2, 70), show: staffShow([{ p: ps, d: 4 }]), options: ALLQ.map((x) => opt(x, L + QSUF[x])), answer: q, skill: "u:chord:symbols", why: `${triadNames(root, q).join(" – ")} is ${L}${QSUF[q]}: ${QWORD[q]}.` });
  }
  const root = pick(r, rootsFor(q, 60, 71));
  const L = nm(root);
  const spellable = ALLQ.filter((x) => triadNames(root, x).every(plainName));
  return seeChoice({ prompt: `Which notes spell ${L}${QSUF[q]}?`, options: spellable.map((x) => opt(x, triadNames(root, x).join(" – "))), answer: q, skill: "u:chord:symbols", why: `${L}${QSUF[q]} = ${triadNames(root, q).join(" – ")}. The letter is the root; what follows names the quality (m = minor, dim = diminished, + = augmented).`, layout: "list" });
});
const cqMatch = topic("g6-cq-match", (r, d) => {
  const root = pick(r, [60, 62, 67]); // C, D, G: all four qualities spell with everyday names
  const qs: Q[] = d < 0.4 ? ["maj", "min", "dim"] : ALLQ;
  return { kind: "match", prompt: "Match each chord symbol to the notes that spell it.", pairs: qs.map((q) => ({ a: { id: `s-${q}`, text: nm(root) + QSUF[q] }, b: { id: `n-${q}`, text: triadNames(root, q).join(" – ") } })), skill: "u:chord:symbols" };
});
const cqSort = topic("g6-cq-sort", (r, d) => {
  const qs: Q[] = d < 0.5 ? ["maj", "min"] : ["maj", "min", "dim"];
  const cards = qs.flatMap((q) => pickN(r, rootsFor(q, 60, 71), qs.length === 2 ? 3 : 2).map((root) => ({ id: `${q}-${root}`, text: triadNames(root, q).join(" – "), bin: q })));
  return { kind: "sort", prompt: "Sort the triads by quality. Count the half steps from the root to the 3rd and the 5th.", bins: qs.map((q) => ({ id: q, label: cap(QWORD[q]) })), items: shuffle(r, cards), skill: "u:chord:quality" };
});
const DEG_NAME = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th"];
const CQ_KEYS = [0, 1, -1, 2];
const chordName = (root: number, q: string, f: number) => nm(root, f) + (q === "maj" ? "" : q === "min" ? "m" : "dim");
const cqRoman = topic("g6-cq-roman", (r, d) => {
  const f = pick(r, d < 0.4 ? [0] : CQ_KEYS);
  const t = tonicOf(f);
  const deg = pick(r, d < 0.4 ? [0, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6]);
  const rn = ROMAN_MAJOR[deg];
  const c = romanChord(rn, t);
  const name = chordName(c.root, c.q, f);
  const sound = progression(deg === 0 ? ["I", "V", "I"] : ["I", rn], t > 64 ? t - 12 : t, "major", { bpm: 84, per: 2, style: "block" });
  if (r() < 0.5) {
    const wrong = pickN(r, ROMAN_MAJOR, 3, (x) => x === rn);
    return listen({ prompt: `In ${keyName(f)}, which roman numeral names the ${name} chord?${deg === 0 ? "" : " (You'll hear the home chord first.)"}`, sound, options: [rn, ...wrong].map((x) => opt(x, x)), answer: rn, skill: "u:progression:roman", why: `${name} is built on the ${DEG_NAME[deg]} note of ${keyName(f)}, so it's ${rn}. Pattern: I ii iii IV V vi vii° (uppercase major, lowercase minor, ° diminished).` });
  }
  const others = ROMAN_MAJOR.filter((x) => x !== rn).map((x) => {
    const o = romanChord(x, t);
    return chordName(o.root, o.q, f);
  });
  return listen({ prompt: `In ${keyName(f)}, which chord is ${rn}?`, sound, show: { show: "chords", romans: deg === 0 ? ["I", "V", "I"] : ["I", rn], tonic: t, scale: "major" }, options: textOpts(r, name, pickN(r, others, 3)), answer: name, skill: "u:progression:roman", why: `${rn} = the triad on the ${DEG_NAME[deg]} note of ${keyName(f)}: ${name}.` });
});
const cqRomanBuild = topic("g6-cq-rbuild", (r, d) => {
  const f = pick(r, d < 0.4 ? [0] : CQ_KEYS);
  const t = tonicOf(f);
  const deg = pick(r, d < 0.5 ? [0, 3, 4] : [0, 1, 2, 3, 4, 5, 6]);
  const rn = ROMAN_MAJOR[deg];
  const c = romanChord(rn, t);
  const names = c.pitches.map((p) => nm(p, f));
  return { kind: "keys", task: "chord", prompt: `Build the ${rn} chord in ${keyName(f)}.`, answer: c.pitches, lo: 55, hi: 84, labels: d < 0.5, octaveFree: true, why: `In ${keyName(f)}, ${rn} is built on the ${DEG_NAME[deg]} note: ${names.join(" – ")} (${QWORD[c.q as Q]}).`, skill: "u:chord:diatonic" };
});
const QUALQ: { q: string; a: string; w: string[]; why: string; rn: string }[] = [
  { q: "In any major key, what quality is the ii chord?", a: "Minor", w: ["Major", "Diminished"], why: "Lowercase numerals are minor: ii, iii and vi.", rn: "ii" },
  { q: "In any major key, what quality is the V chord?", a: "Major", w: ["Minor", "Augmented"], why: "Uppercase numerals are major: I, IV and V.", rn: "V" },
  { q: "In any major key, what quality is the vii° chord?", a: "Diminished", w: ["Major", "Minor"], why: "The ° sign means diminished. vii° is the only diminished triad in a major key.", rn: "vii°" },
  { q: "In any major key, what quality is the vi chord?", a: "Minor", w: ["Major", "Augmented"], why: "vi is minor; it's also the home chord of the relative minor key.", rn: "vi" },
  { q: "In any major key, what quality is the IV chord?", a: "Major", w: ["Minor", "Diminished"], why: "IV is one of the three major chords: I, IV and V.", rn: "IV" },
];
const cqRomanQ = topic("g6-cq-romanq", (r) => {
  const x = pick(r, QUALQ);
  return listen({ prompt: x.q, sound: arpBlock(romanChord(x.rn, 60).pitches), options: textOpts(r, x.a, x.w), answer: x.a, skill: "u:progression:roman", why: x.why });
});
const PROGS: string[][] = [["I", "IV", "V", "I"], ["I", "V", "vi", "IV"], ["I", "vi", "IV", "V"], ["vi", "IV", "I", "V"], ["I", "IV", "I", "V"], ["ii", "V", "I", "I"], ["I", "iii", "IV", "V"], ["IV", "V", "iii", "vi"]];
const cqProgEar = topic("g6-cq-progear", (r, d) => {
  const easy = d < 0.4;
  return { kind: "chords", mode: "match", prompt: "Listen to the progression, then put the chord cards in order.", tonic: 60, scale: "major", palette: easy ? ["I", "IV", "V", "vi"] : ["I", "ii", "iii", "IV", "V", "vi"], bars: 4, answer: pick(r, easy ? PROGS.slice(0, 3) : PROGS), inst: "piano", bpm: 84, beat: true, skill: "u:progression:ear" };
});
const CADS: { id: "authentic" | "plagal" | "half" | "deceptive"; label: string; task: string; prog: string[]; why: string }[] = [
  { id: "authentic", label: "Authentic (V → I)", task: "an authentic cadence (V → I)", prog: ["I", "IV", "V", "I"], why: "V → I is an authentic cadence: a musical period. Totally finished." },
  { id: "plagal", label: "Plagal (IV → I)", task: "a plagal “Amen” cadence (IV → I)", prog: ["I", "V", "IV", "I"], why: "IV → I is the plagal or “Amen” cadence: a gentle, warm ending." },
  { id: "half", label: "Half (ends on V)", task: "a half cadence (end on V)", prog: ["I", "vi", "IV", "V"], why: "Ending on V is a half cadence: a comma or a question mark, not the end." },
  { id: "deceptive", label: "Deceptive (V → vi)", task: "a deceptive cadence (V → vi)", prog: ["I", "IV", "V", "vi"], why: "V → vi is a deceptive cadence: you expect home and get a plot twist." },
];
const cqCadence = topic("g6-cq-cadence", (r) => {
  const c = pick(r, CADS);
  return listen({ prompt: "Listen to the last two chords. Which cadence ends this phrase?", sound: progression(c.prog, 60, "major", { bpm: 84, per: 2, inst: "piano", style: "block", bass: true }), options: CADS.map((x) => opt(x.id, x.label)), answer: c.id, skill: "u:cadence:ear", why: c.why, layout: "grid" });
});
const cqWrite = topic("g6-cq-write", (r, d) => {
  const c = pick(r, CADS);
  if (d > 0.6 && r() < 0.5) return { kind: "chords", mode: "build", prompt: "Write 8 bars in C major: start on I, use both ii and vi somewhere, and finish with an authentic cadence (V → I).", tonic: 60, scale: "major", palette: ["I", "ii", "iii", "IV", "V", "vi"], bars: 8, rules: [{ rule: "start", chord: "I" }, { rule: "use", chords: ["ii", "vi"] }, { rule: "cadence", kind: "authentic" }], inst: "piano", bpm: 96, beat: true, skill: "u:progression:build" };
  return { kind: "chords", mode: "build", prompt: `Write 4 bars that start on I and end with ${c.task}.`, tonic: 60, scale: "major", palette: ["I", "ii", "IV", "V", "vi"], bars: 4, rules: [{ rule: "start", chord: "I" }, { rule: "cadence", kind: c.id }], inst: "piano", bpm: 92, beat: true, skill: "u:progression:build" };
});

const CQ_TRIAD_IDEA = idea("Four kinds of triads", [
  fb("A triad is three notes stacked in 3rds: a root, the 3rd above it, and the 5th above the root.", { show: staffShow([{ p: [60, 64, 67], d: 4 }]), sound: arpBlock([60, 64, 67]) }),
  frame("Major (C): 4 half steps up to the 3rd, then 3 more to the 5th. Bright and stable.", { show: "keyboard", lo: 60, hi: 72, lit: [60, 64, 67], labels: "letters" }, arpBlock([60, 64, 67])),
  frame("Minor (Cm): 3, then 4. The 3rd drops a half step and the mood darkens.", { show: "keyboard", lo: 60, hi: 72, lit: [60, 63, 67], labels: "letters" }, arpBlock([60, 63, 67])),
  frame("Diminished (Cdim): 3, then 3. Two minor 3rds squeeze together: tense, like a question with no answer.", { show: "keyboard", lo: 60, hi: 72, lit: [60, 63, 66], labels: "letters" }, arpBlock([60, 63, 66])),
  frame("Augmented (C+): 4, then 4. Two major 3rds stretch apart: floating, dreamy, unresolved.", { show: "keyboard", lo: 60, hi: 72, lit: [60, 64, 68], labels: "letters" }, arpBlock([60, 64, 68])),
], "u:chord:idea");
const CQ_SYMBOL_IDEA = idea("Chord symbols", [
  frame("Lead sheets and guitar charts use chord symbols. The letter is always the root: C means a C major triad.", { show: "keyboard", lo: 60, hi: 72, lit: [60, 64, 67], labels: "letters" }, chordSound([60, 64, 67], "piano", 2, 80)),
  frame("Everything after the letter names the quality: Cm is minor, Cdim (or C°) is diminished, C+ is augmented. Hear all four.", { show: "keyboard", lo: 60, hi: 72, lit: [60, 63, 64, 66, 67, 68], labels: "letters" }, chain([chordSound([60, 64, 67], "piano", 1.2, 80), chordSound([60, 63, 67], "piano", 1.2, 80), chordSound([60, 63, 66], "piano", 1.2, 80), chordSound([60, 64, 68], "piano", 1.5, 80)], 0.2)),
], "u:chord:idea");
const CQ_ROMAN_IDEA = idea("Roman numerals", [
  frame("Build a triad on every note of a major scale, using only notes from that scale, and you get seven chords.", { show: "chords", romans: ROMAN_MAJOR, tonic: 60, scale: "major" }, progression(ROMAN_MAJOR, 60, "major", { bpm: 100, per: 1, style: "block" })),
  frame("Roman numerals name them by scale degree: I ii iii IV V vi vii°. Uppercase = major, lowercase = minor, ° = diminished.", { show: "chords", romans: ROMAN_MAJOR, tonic: 60, scale: "major" }),
  frame("The pattern is the same in EVERY major key. In G major: I = G, IV = C, V = D, vi = Em.", { show: "chords", romans: ["I", "IV", "V", "vi"], tonic: 67, scale: "major" }, progression(["I", "IV", "V", "vi"], 55, "major", { bpm: 92, per: 2, style: "block" })),
  frame("I, IV and V are the three major chords. Together they can harmonize thousands of songs.", { show: "chords", romans: ["I", "IV", "V", "I"], tonic: 60, scale: "major" }, progression(["I", "IV", "V", "I"], 60, "major", { bpm: 96, per: 2, style: "strum", inst: "guitar", bass: true })),
  frame("Add vi and you get the four chords behind countless pop hits: I–V–vi–IV.", { show: "chords", romans: ["I", "V", "vi", "IV"], tonic: 60, scale: "major" }, progression(["I", "V", "vi", "IV"], 60, "major", { bpm: 100, per: 4, style: "strum", inst: "guitar", bass: true, drums: "pop" })),
], "u:progression:idea");
const CQ_CADENCE_IDEA = idea("Cadences: musical punctuation", [
  frame("A cadence is the chord move that ends a phrase. Think of it as punctuation.", { show: "chords", romans: ["I", "IV", "V", "I"], tonic: 60, scale: "major" }, progression(["I", "IV", "V", "I"], 60, "major", { bpm: 84, per: 2, bass: true })),
  frame("Authentic, V → I: a period. Completely finished.", { show: "chords", romans: ["V", "I"], tonic: 60, scale: "major" }, progression(["V", "I"], 60, "major", { bpm: 80, per: 2, bass: true })),
  frame("Plagal, IV → I: the gentle “Amen” at the end of hymns.", { show: "chords", romans: ["IV", "I"], tonic: 60, scale: "major" }, progression(["IV", "I"], 60, "major", { bpm: 70, per: 2, inst: "organ", bass: true })),
  frame("Half cadence, ending on V: a comma or a question mark.", { show: "chords", romans: ["I", "IV", "I", "V"], tonic: 60, scale: "major" }, progression(["I", "IV", "I", "V"], 60, "major", { bpm: 84, per: 2, bass: true })),
  frame("Deceptive, V → vi: you expect home and get a plot twist.", { show: "chords", romans: ["I", "IV", "V", "vi"], tonic: 60, scale: "major" }, progression(["I", "IV", "V", "vi"], 60, "major", { bpm: 84, per: 2, bass: true })),
], "u:cadence:idea");

const CQ_B1: Activity = { kind: "chords", mode: "build", prompt: "Write 4 bars in C: start on I, use IV and V, and finish with an authentic cadence (V → I).", tonic: 60, scale: "major", palette: ["I", "ii", "IV", "V", "vi"], bars: 4, rules: [{ rule: "start", chord: "I" }, { rule: "use", chords: ["IV", "V"] }, { rule: "cadence", kind: "authentic" }], inst: "piano", bpm: 92, beat: true, skill: "u:progression:build" };
const CQ_B2: Activity = { kind: "chords", mode: "build", prompt: "Plot twist: write 4 bars that start on I and end with a deceptive cadence (V → vi).", tonic: 60, scale: "major", palette: ["I", "ii", "IV", "V", "vi"], bars: 4, rules: [{ rule: "start", chord: "I" }, { rule: "cadence", kind: "deceptive" }], inst: "piano", bpm: 92, beat: true, skill: "u:progression:build" };
const CQ_B3: Activity = { kind: "chords", mode: "build", prompt: "Your 8-bar progression: start on I, use ii and vi, and land with an authentic cadence. Then press play and listen with a pad.", tonic: 60, scale: "major", palette: ["I", "ii", "iii", "IV", "V", "vi"], bars: 8, rules: [{ rule: "start", chord: "I" }, { rule: "use", chords: ["ii", "vi"] }, { rule: "cadence", kind: "authentic" }], inst: "pad", bpm: 96, beat: true, skill: "u:progression:build" };

const CHORD_QUALITY_CANYON: WorldDef = {
  id: "g6-chord-quality-canyon",
  title: "Chord Quality Canyon",
  emoji: "🏜️",
  grade: "6",
  theme: "volcano",
  blurb: "Major, minor, diminished, augmented, and the roman numerals pros use.",
  talk: ["How does a minor chord make you feel compared to a major chord?", "Can you hear the I–V–vi–IV progression in a song on the radio?"],
  challenge: "Listen to the end of a hymn or a song. Does it finish with a plagal “Amen” (IV → I) or an authentic V → I?",
  stages: [
    {
      title: "Four kinds of triads",
      emoji: "🔺",
      levels: 1,
      topics: [cqEar, cqBuild, cqHalf, cqSymbol, cqMatch],
      fixed: (r) => seq(r, [CQ_TRIAD_IDEA, [cqEar, 0.1], [cqBuild, 0.1], [cqHalf, 0.2], [cqMatch, 0.3], [cqBuild, 0.4], [cqEar, 0.45], [cqSymbol, 0.3]]),
    },
    practice({ title: "Ear and symbols", emoji: "👂", idea: CQ_SYMBOL_IDEA, topics: [cqEar, cqBuild, cqSymbol, cqSort, cqHalf] }),
    practice({ title: "Roman numerals", emoji: "🏛️", idea: CQ_ROMAN_IDEA, topics: [cqRoman, cqRomanBuild, cqProgEar, cqRomanQ] }),
    {
      title: "Write a progression",
      emoji: "🎹",
      levels: 1,
      topics: [cqWrite, cqCadence, cqProgEar],
      unlocks: ["inst:pad"],
      fixed: (r) => seq(r, [CQ_CADENCE_IDEA, [cqCadence, 0.3], CQ_B1, [cqCadence, 0.7], CQ_B2, [cqProgEar, 0.8], CQ_B3]),
    },
  ],
};

// ═══ 7 · Melody Writing Workshop ══════════════════════════════════════════════════════════════
// Motif, repetition and sequence (Beethoven's Fifth), contour, steps vs leaps and leap recovery,
// the tonic as home, tendency tones, question-and-answer phrases, and composing with real rules.
// Unlocks the minor pentatonic scale and the steel drum.
const motifOf = (r: Rng, len: number): number[] => {
  const m = [int(r, 2, 5)];
  for (let guard = 0; m.length < len && guard < 60; guard++) {
    const nx = m[m.length - 1] + pick(r, [-2, -1, 1, 2, 3]);
    if (nx >= 0 && nx <= 9) m.push(nx);
  }
  return m;
};
const shapeOf = (m: number[]) => m.slice(1).map((x, i) => x - m[i]).join(",");
const RHY3 = [[0.5, 0.5, 1], [1, 0.5, 0.5], [0.5, 0.5, 2]];
const RHY4 = [[0.5, 0.5, 0.5, 1.5], [1, 0.5, 0.5, 1], [0.5, 0.5, 1, 1], [0.25, 0.25, 0.5, 1]];
const mwDevice = topic("g6-mw-device", (r, d) => {
  const len = d < 0.5 ? 3 : 4;
  const m = motifOf(r, len);
  const kind = pick(r, ["rep", "seq", "new"] as const);
  let second = m;
  if (kind === "seq") {
    let shift = pick(r, [-2, -1, 1, 2]);
    if (Math.min(...m) + shift < 0) shift = Math.abs(shift);
    second = m.map((x) => x + shift);
  }
  if (kind === "new") {
    second = m.map((x, i) => Math.max(0, Math.min(9, x + (i % 2 ? 3 : -1))));
    for (let k = 0; k < 30; k++) {
      const c = motifOf(r, len);
      if (shapeOf(c) !== shapeOf(m)) {
        second = c;
        break;
      }
    }
  }
  const rhy = pick(r, len === 3 ? RHY3 : RHY4);
  const ps1 = m.map((i) => DEG[i]);
  const ps2 = second.map((i) => DEG[i]);
  // What the second phrase really is (a "new" one that happens to share the shape counts as what it is).
  const ans = second.join() === m.join() ? "rep" : shapeOf(second) === shapeOf(m) ? "seq" : "new";
  const dir = second[0] > m[0] ? "higher" : "lower";
  const why = { rep: "The second phrase repeats the motif exactly: repetition makes it stick.", seq: `The same shape again, starting ${dir}: a sequence.`, new: "The second phrase has a new shape: contrast." };
  return listen({
    prompt: "A motif, then a second phrase. What did the composer do?",
    sound: then(melody(ps1, rhy, "piano", 100), melody(ps2, rhy, "piano", 100), 0.5),
    show: d < 0.5 ? staffShow(sn([...ps1, null, ...ps2], [...rhy, 0.5, ...rhy])) : undefined,
    options: [opt("rep", "Repetition: the same notes again"), opt("seq", "Sequence: same shape, new starting note"), opt("new", "Contrast: a new idea")],
    answer: ans,
    skill: "u:melody:devices",
    why: why[ans],
  });
});
type Shape = "rise" | "fall" | "arch" | "valley" | "wave";
function contourOf(r: Rng, s: Shape): number[] {
  const st = (lo: number, hi: number) => int(r, lo, hi);
  const up = () => pick(r, [1, 1, 2]);
  switch (s) {
    case "rise": {
      const out = [st(0, 2)];
      while (out.length < 6) out.push(out[out.length - 1] + up());
      return out;
    }
    case "fall": {
      const out = [st(10, 12)];
      while (out.length < 6) out.push(out[out.length - 1] - up());
      return out;
    }
    case "arch": {
      const out = [st(0, 2)];
      for (let i = 0; i < 3; i++) out.push(out[out.length - 1] + up());
      for (let i = 0; i < 2; i++) out.push(out[out.length - 1] - up());
      return out;
    }
    case "valley": {
      const out = [st(8, 10)];
      for (let i = 0; i < 3; i++) out.push(out[out.length - 1] - up());
      for (let i = 0; i < 2; i++) out.push(out[out.length - 1] + up());
      return out;
    }
    default: {
      const base = st(3, 6);
      return [base, base + 2, base, base + 2, base, base + 3];
    }
  }
}
const SHAPE_WORD: Record<Shape, string> = { rise: "a rising line", fall: "a falling line", arch: "an arch (up, then down)", valley: "a valley (down, then up)", wave: "a wave (up and down, up and down)" };
const mwContour = topic("g6-mw-contour", (r, d) => {
  const shapes: Shape[] = d < 0.4 ? ["rise", "fall", "arch"] : ["rise", "fall", "arch", "valley", "wave"];
  const s = pick(r, shapes);
  const others = pickN(r, shapes, 2, (x) => x === s);
  const melodies = new Map<Shape, number[]>([s, ...others].map((x): [Shape, number[]] => [x, contourOf(r, x).map((i) => DEG[i])]));
  const ps = melodies.get(s) ?? [];
  return listen({ prompt: "Listen to the melody. Which contour (shape) matches it?", sound: melody(ps, [...ps.slice(1).map(() => 0.5), 1.5], pick(r, ["flute", "violin", "marimba"] as InstId[]), 100), options: shuffle(r, [s, ...others]).map((x) => opt(x, undefined, { show: { show: "contour", pitches: melodies.get(x) ?? [] } })), answer: s, skill: "u:contour:shape", why: `It was ${SHAPE_WORD[s]}.`, layout: "list" });
});
const mwLeaps = topic("g6-mw-leaps", (r, d) => {
  if (d < 0.5 || r() < 0.5) {
    const stepper = contourOf(r, pick(r, ["rise", "arch", "fall"] as Shape[])).map((i) => DEG[i]);
    const leapy = () => {
      const out = [int(r, 0, 3)];
      while (out.length < 6) {
        const nx = out[out.length - 1] + pick(r, [-4, 4, 3, -3, 5]);
        if (nx >= 0 && nx <= 12) out.push(nx);
      }
      return out.map((i) => DEG[i]);
    };
    const choices = shuffle(r, [["step", stepper], ["leap1", leapy()], ["leap2", leapy()]] as [string, number[]][]);
    return listen({ prompt: "Which melody moves mostly by step: smooth and singable?", options: choices.map(([id, ps], i) => soundOpt(id, melody(ps, [...ps.slice(1).map(() => 0.5), 1], "flute", 100), `Melody ${"ABC"[i]}`)), answer: "step", skill: "u:melody:steps-leaps", why: "Stepwise melodies move to neighboring notes. They're easy to sing, which is why most famous tunes are mostly steps." });
  }
  const start = int(r, 0, 2);
  const top = start + pick(r, [5, 6, 7]);
  return listen({ prompt: "This melody just leapt up and stopped. In a well-shaped melody, what usually comes next?", sound: melody([DEG[start], DEG[start], DEG[top]], [1, 1, 2], "flute", 92), options: textOpts(r, "Steps back down (leap recovery)", ["Another big leap up", "The same note over and over"]), answer: "Steps back down (leap recovery)", skill: "u:melody:steps-leaps", why: "After a leap, good melodies usually change direction and step back to fill the gap, like “My Bonnie” after its big opening leap." });
});
const mwHome = topic("g6-mw-home", (r, d) => {
  const stem = pick(r, [[4, 3, 2, 1], [2, 4, 5, 4], [0, 2, 4, 3], [7, 6, 5, 4], [4, 5, 4, 2], [2, 3, 4, 2]]);
  const good = Math.abs(stem[3] - 7) < Math.abs(stem[3]) ? 7 : 0;
  const bad = pick(r, d < 0.5 ? [1, 6] : [1, 6, 4]);
  const phrase = (end: number, roman: "I" | "V"): Score => ({
    bpm: 96,
    tracks: [
      { kind: "notes", inst: "flute", notes: [...stem, end].map((i, k) => ({ p: DEG[i], d: k < 4 ? 1 : 2 })) },
      { kind: "notes", inst: "strings", notes: [{ p: null, d: 4 }, { p: romanChord(roman, 48).pitches, d: 2, v: 0.5 }], vol: 0.6 },
    ],
  });
  const goodFirst = r() < 0.5;
  const a = phrase(good, "I");
  const b = phrase(bad, "V");
  return listen({ prompt: "Which phrase sounds finished, landing at home?", options: [soundOpt("a", goodFirst ? a : b, "Phrase A"), soundOpt("b", goodFirst ? b : a, "Phrase B")], answer: goodFirst ? "a" : "b", skill: "u:melody:resolution", why: "The finished phrase ends on do, the tonic, over the I chord: home. The other stops on re, ti or so over V, still hanging in the air." });
});
const PULLS: { play: number[]; q: string; a: string; w: string[]; why: string }[] = [
  { play: [0, 1, 2, 3, 4, 5, 6], q: "The scale stopped on ti, the leading tone. Where does it want to go?", a: "Up a half step to do", w: ["Back down to la", "Down to so"], why: "Ti sits a half step below do and pulls hard toward it. That's why it's called the leading tone." },
  { play: [4, 3, 2, 1], q: "This line stepped down and stopped on re. Where does it want to land?", a: "Down a step to do", w: ["Back up to mi", "Up to la"], why: "Re wants to settle one step down onto do, the tonic." },
  { play: [0, 2, 4, 3], q: "The melody stopped on fa. Which note does fa usually fall to?", a: "Down a half step to mi", w: ["Up to so", "Up to ti"], why: "Fa sits a half step above mi and tends to fall onto it." },
];
const mwPull = topic("g6-mw-pull", (r, d) => {
  const x = pick(r, PULLS);
  const s = melody(x.play.map((i) => DEG[i]), [...x.play.slice(1).map(() => 0.5), 2], "piano", 100);
  return listen({ prompt: x.q, sound: d > 0.6 ? transpose(s, pick(r, [-3, 2, 5])) : s, options: textOpts(r, x.a, x.w), answer: x.a, skill: "u:melody:tendency", why: x.why });
});
const QA: { q: number[]; a: number[]; w: number[][] }[] = [
  { q: [2, 1, 0, 1, 2, 2, 1], a: [2, 1, 0, 1, 2, 1, 0], w: [[2, 1, 0, 1, 2, 3, 4], [2, 1, 0, 1, 2, 2, 1]] },
  { q: [0, 2, 4, 5, 4, 2, 1], a: [0, 2, 4, 5, 4, 1, 0], w: [[0, 2, 4, 5, 4, 5, 6], [0, 2, 4, 5, 4, 4, 4]] },
  { q: [4, 4, 5, 4, 2, 0, 1], a: [4, 4, 5, 4, 2, 1, 0], w: [[4, 4, 5, 4, 2, 3, 4], [4, 4, 5, 4, 5, 6, 6]] },
  { q: [0, 0, 4, 4, 5, 5, 4], a: [3, 3, 2, 2, 1, 1, 0], w: [[3, 3, 2, 2, 1, 1, 4], [5, 5, 4, 4, 3, 3, 6]] },
];
const QA_RHY = [1, 1, 1, 1, 1, 1, 2];
const mwQA = topic("g6-mw-qa", (r) => {
  const x = pick(r, QA);
  const answers = shuffle(r, [["good", x.a], ["w1", x.w[0]], ["w2", x.w[1]]] as [string, number[]][]);
  return listen({ prompt: "Here's a question phrase. Which answer completes it best, landing home on do?", sound: melody(x.q.map((i) => DEG[i]), QA_RHY, "piano", 112), options: answers.map(([id, m], i) => soundOpt(id, melody(m.map((k) => DEG[k]), QA_RHY, "piano", 112), `Answer ${"ABC"[i]}`)), answer: "good", skill: "u:melody:phrases", why: "A question phrase ends away from home (often on re or so). A strong answer often starts the same way, then lands on do. Together they make a period." });
});
const SHAPE_TASKS: { prompt: string; rules: ComposeRule[] }[] = [
  { prompt: "Write a rising melody: the last note must be higher than the first. At least 5 notes.", rules: [{ rule: "contour", dir: "up" }, { rule: "notes", min: 5 }] },
  { prompt: "Write a falling melody that ends on low C: start higher and work your way down.", rules: [{ rule: "contour", dir: "down" }, { rule: "end", p: 60 }, { rule: "notes", min: 5 }] },
  { prompt: "Write an arch: climb to one high point in the middle, then come back down. At least 6 notes.", rules: [{ rule: "arch" }, { rule: "notes", min: 6 }] },
  { prompt: "Smooth as a singer: steps only (or repeated notes), at least 6 notes, ending on C.", rules: [{ rule: "steps" }, { rule: "notes", min: 6 }, { rule: "end", p: 60 }] },
];
const mwShapeWrite = topic("g6-mw-shapewrite", (r) => {
  const v = pick(r, SHAPE_TASKS);
  return { kind: "compose", prompt: v.prompt, pitches: C_MAJ, slots: 8, dur: 1, inst: "flute", bpm: 96, rules: v.rules, tonic: 60, labels: "letters", backing: bed(["I", "vi", "IV", "V"], 60, 96), skill: "u:contour:compose" };
});
const RESOLVE: { prompt: string; ans: number }[] = [
  { prompt: "In C major the melody stops on ti (B). Play the note it resolves to, up a half step.", ans: 72 },
  { prompt: "In C major the melody stops on re (D). Play the note it settles on, down a step.", ans: 60 },
  { prompt: "In C major the melody stops on fa (F). Play the note fa usually falls to.", ans: 64 },
  { prompt: "In G major the melody stops on ti (F♯). Play the note it resolves to.", ans: 67 },
];
const mwResolve = topic("g6-mw-resolve", (r, d) => {
  const x = pick(r, RESOLVE);
  return { kind: "melody", mode: "find", prompt: x.prompt, notes: [x.ans], pads: range(60, 72), on: "keys", labels: d < 0.5 ? "letters" : "none", inst: "piano", skill: "u:melody:tendency" };
});
const mwAnswerRead = topic("g6-mw-answerread", (r) => {
  const x = pick(r, QA);
  return { kind: "melody", mode: "read", prompt: "Read and play this answer phrase. Feel how it lands on do.", notes: x.a.map((i) => DEG[i]), pads: naturals(60, 72), on: "keys", labels: "none", show: "staff", inst: "piano", durs: QA_RHY, bpm: 100, skill: "u:melody:phrases" };
});
const mwEcho = topic("g6-mw-echo", (r, d) => {
  const len = d < 0.5 ? 4 : 5;
  const m = motifOf(r, len).map((i) => DEG[Math.min(7, i)]);
  return { kind: "melody", mode: "echo", prompt: "Listen to the motif, then play it back on the keys.", notes: m, pads: naturals(60, 72), on: "keys", labels: d < 0.5 ? "letters" : "none", inst: "piano", durs: [...m.slice(1).map(() => 0.5), 1.5], bpm: 96, skill: "u:melody:echo" };
});
const C_MAJ = [60, 62, 64, 65, 67, 69, 71, 72];
const A_MIN_PENTA = [57, 60, 62, 64, 67, 69]; // A C D E G A
const QUESTION = [64, 62, 60, 62, 64, 64, 62, null];
type Tune = { prompt: string; rules: ComposeRule[]; slots?: number; dur?: number; start?: (number | null)[]; pitches?: number[]; tonic?: number; inst?: InstId; backing?: Score };
const MW_TUNES: Tune[] = [
  { prompt: "Motif: your first 2 notes must come back later in the melody. Start and end on C.", rules: [{ rule: "start", p: 60 }, { rule: "end", p: 60 }, { rule: "repeat", len: 2 }] },
  { prompt: "Arch: put the highest note in the middle, and end on C (home).", rules: [{ rule: "arch" }, { rule: "end", p: 60 }, { rule: "notes", min: 6 }] },
  { prompt: "Mostly steps, one leap: include a leap of a 5th or wider, and start and end on C.", rules: [{ rule: "leap", min: 4 }, { rule: "start", p: 60 }, { rule: "end", p: 60 }] },
  { prompt: "Finish this period: the question is written. Write the answer in the second half, begin it like the question, and land on C.", rules: [{ rule: "repeat", len: 4 }, { rule: "end", p: 60 }], slots: 16, dur: 0.5, start: [...QUESTION, null, null, null, null, null, null, null, null], backing: bed(["I", "V", "V", "I"], 60, 96) },
  { prompt: "Riff in A minor pentatonic (A C D E G): repeat your first 2 notes later, leave a rest for groove, and end on A.", rules: [{ rule: "repeat", len: 2 }, { rule: "rests", min: 1 }, { rule: "end", p: 57 }], pitches: A_MIN_PENTA, tonic: 57, inst: "steeldrum", backing: progression(["i", "VI", "VII", "i"], 57, "minor", { bpm: 96, per: 2, inst: "guitar", style: "pulse", bass: true, drums: "pop" }) },
];
const mwCompose = topic("g6-mw-compose", (r, d) => {
  const t = MW_TUNES[int(r, 0, d < 0.4 ? 2 : 4)];
  return { kind: "compose", prompt: t.prompt, pitches: t.pitches ?? C_MAJ, slots: t.slots ?? 8, dur: t.dur ?? 1, inst: t.inst ?? "flute", bpm: 96, rules: t.rules, tonic: t.tonic ?? 60, labels: "letters", backing: t.backing ?? bed(["I", "IV", "V", "I"], 60, 96), ...(t.start ? { start: t.start } : {}), skill: "u:compose:melody" };
});

const BEETHOVEN = { ps: [67, 67, 67, 63, null, 65, 65, 65, 62], ds: [0.5, 0.5, 0.5, 2, 0.5, 0.5, 0.5, 0.5, 2] };
const MW_MOTIF_IDEA = idea("Motifs", [
  frame("A motif is a tiny musical idea, just a few notes, that a whole piece can grow from.", staffShow(sn([67, 67, 67, 63], [0.5, 0.5, 0.5, 2]), "treble", { key: -3 }), melody([67, 67, 67, 63], [0.5, 0.5, 0.5, 2], "strings", 108)),
  frame("The most famous motif ever: short-short-short-LONG. Beethoven built his entire Fifth Symphony (1808) from it.", staffShow(sn(BEETHOVEN.ps, BEETHOVEN.ds), "treble", { key: -3 }), melody(BEETHOVEN.ps, BEETHOVEN.ds, "strings", 108)),
  fb("Repetition: say it again. Listeners remember what they hear twice.", staffSound([64, 65, 67, null, 64, 65, 67], [0.5, 0.5, 1, 0.5, 0.5, 0.5, 1], { inst: "flute", bpm: 100 })),
  fb("Sequence: repeat the motif starting on a different note, higher or lower. Beethoven's second statement is a sequence, one step down.", staffSound([64, 65, 67, null, 65, 67, 69, null, 67, 69, 71, 72], [0.5, 0.5, 1, 0.5, 0.5, 0.5, 1, 0.5, 0.5, 0.5, 0.5, 1.5], { inst: "flute", bpm: 100 })),
], "u:melody:idea");
const MW_SHAPE_IDEA = idea("Shape: contour, steps and leaps", [
  frame("Contour is a melody's shape: draw a line through the notes and watch it rise, fall, arch or wave.", { show: "contour", pitches: [60, 62, 64, 67, 69, 67, 64, 62, 60] }, melody([60, 62, 64, 67, 69, 67, 64, 62, 60], [0.5, 0.5, 0.5, 0.5, 1, 0.5, 0.5, 0.5, 1.5], "flute", 100)),
  fb("Steps make lines smooth and singable. Beethoven's “Ode to Joy” is almost all steps.", songBit("odetojoy", 0, 15, [], 120)),
  fb("Leaps add drama. After a big leap, good melodies change direction and step back: “My Bonnie” leaps up a 6th, then steps down.", songBit("bonnie", 0, 9, [0, 1], 100)),
], "u:melody:idea");
const MW_TENSION_IDEA = idea("Tension and resolution", [
  fb("Every key has a home note, the tonic (do). Ending there sounds finished.", staffSound([64, 62, 65, 64, 62, 60], [1, 1, 1, 1, 1, 2], { bpm: 96 })),
  fb("Stop anywhere else and the music hangs in the air. Ti, the leading tone, pulls hard up to do. Wait for it…", staffSound([60, 62, 64, 65, 67, 69, 71, null, 72], [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1.5, 1, 2], { bpm: 100 })),
  fb("Composers pair phrases. A question ends away from home, often on re or so…", staffSound(QA[0].q.map((i) => DEG[i]), QA_RHY, { bpm: 112 })),
  fb("…and the answer starts the same way but lands on do. Question + answer = a period.", staffSound([...QA[0].q.map((i) => DEG[i]), ...QA[0].a.map((i) => DEG[i])], [...QA_RHY, ...QA_RHY], { bpm: 112 })),
], "u:melody:idea");
const MW_WRITE_IDEA = idea("The songwriter's checklist", [
  frame("The checklist: start with a motif you can hum; repeat it or move it as a sequence; shape the line with mostly steps and one high point; land on do.", { show: "contour", pitches: [60, 62, 64, 60, 62, 64, 67, 65, 64, 62, 60] }, melody([60, 62, 64, 60, 62, 64, 67, 65, 64, 62, 60], [0.5, 0.5, 1, 0.5, 0.5, 1, 1, 0.5, 0.5, 0.5, 1.5], "flute", 100)),
  frame("A new color for riffs: the minor pentatonic, five notes (A C D E G) that sound good in any order. It's the scale behind rock riffs and blues solos.", { show: "keyboard", lo: 57, hi: 69, lit: A_MIN_PENTA, labels: "letters" }, melody([57, 60, 62, 64, 67, 69, 67, 64, 62, 60, 57], 0.5, "steeldrum", 112), "keys", A_MIN_PENTA),
], "u:melody:idea");

const MW_C1: Activity = { kind: "compose", prompt: "Write an 8-note melody built on a motif: your first 2 notes must come back later. Start and end on C.", pitches: C_MAJ, slots: 8, dur: 1, inst: "flute", bpm: 96, rules: [{ rule: "start", p: 60 }, { rule: "end", p: 60 }, { rule: "repeat", len: 2 }], tonic: 60, labels: "letters", backing: bed(["I", "IV", "V", "I"], 60, 96), skill: "u:compose:melody" };
const MW_PERIOD: Activity = { kind: "compose", prompt: "Finish this period. The question is written; write the answer in the second half. Begin it like the question (first 4 notes) and land on C.", pitches: C_MAJ, slots: 16, dur: 0.5, inst: "flute", bpm: 96, start: [...QUESTION, null, null, null, null, null, null, null, null], rules: [{ rule: "repeat", len: 4 }, { rule: "end", p: 60 }], tonic: 60, labels: "letters", backing: bed(["I", "V", "V", "I"], 60, 96), skill: "u:compose:melody" };
const MW_ARCH: Activity = { kind: "compose", prompt: "Write a 16-note melody with all the pro moves: repeat your opening motif (first 4 notes) later, put the highest note near the middle, and end on C.", pitches: [...C_MAJ, 74], slots: 16, dur: 0.5, inst: "flute", bpm: 100, rules: [{ rule: "repeat", len: 4 }, { rule: "arch" }, { rule: "end", p: 60 }], tonic: 60, labels: "letters", backing: bed(["I", "vi", "IV", "V"], 60, 100), skill: "u:compose:melody" };
const MW_RIFF: Activity = { kind: "compose", prompt: "Steel drum riff in A minor pentatonic (A C D E G): repeat your first 2 notes later, leave at least one rest for groove, and end on A.", pitches: A_MIN_PENTA, slots: 8, dur: 1, inst: "steeldrum", bpm: 104, rules: [{ rule: "repeat", len: 2 }, { rule: "rests", min: 1 }, { rule: "end", p: 57 }], tonic: 57, labels: "letters", backing: progression(["i", "VI", "VII", "i"], 57, "minor", { bpm: 104, per: 2, inst: "guitar", style: "pulse", bass: true, drums: "reggae" }), skill: "u:compose:melody" };

const MELODY_WORKSHOP: WorldDef = {
  id: "g6-melody-workshop",
  title: "Melody Writing Workshop",
  emoji: "✍️",
  grade: "6",
  theme: "coral",
  blurb: "Motifs, contour, tension and release: write melodies people remember.",
  talk: ["What's the catchiest melody you know? Does it repeat a motif?", "Hum a question phrase. Can someone at the table hum the answer?"],
  challenge: "Invent a 4-note motif and hum it three ways: repeated, as a sequence (higher), and backward.",
  stages: [
    {
      title: "Motifs",
      emoji: "🎵",
      levels: 1,
      topics: [mwDevice, mwEcho, mwCompose],
      fixed: (r) => seq(r, [MW_MOTIF_IDEA, [mwDevice, 0.1], [mwEcho, 0.2], [mwDevice, 0.3], MW_C1, [mwEcho, 0.4], [mwDevice, 0.6], [mwDevice, 0.8]]),
    },
    practice({ title: "Shape", emoji: "📈", idea: MW_SHAPE_IDEA, topics: [mwContour, mwEcho, mwLeaps, mwShapeWrite] }),
    practice({ title: "Tension and resolution", emoji: "🧲", idea: MW_TENSION_IDEA, topics: [mwHome, mwResolve, mwQA, mwAnswerRead, mwPull] }),
    {
      title: "Write a melody",
      emoji: "✍️",
      levels: 1,
      topics: [mwCompose, mwQA, mwHome, mwEcho],
      unlocks: ["scale:minorPenta", "inst:steeldrum"],
      fixed: (r) => seq(r, [MW_WRITE_IDEA, [mwQA, 0.7], MW_PERIOD, [mwEcho, 0.8], MW_ARCH, [mwHome, 0.8], MW_RIFF]),
    },
  ],
};

// ═══ 8 · Producer 101 ═════════════════════════════════════════════════════════════════════════
// The capstone: a track is layers (drums, bass, chords, hook); arrangement (intro, verse, chorus,
// bridge, the EDM build-up and drop); mixing (balance, low-pass EQ, reverb); then the child builds
// a whole track step by step. Unlocks the EDM groove.
const P_BPM = 100;
const LOOP_R = ["vi", "IV", "I", "V"]; // Am F C G
const BRIDGE_R = ["IV", "V", "iii", "vi"];
type Part = "drums" | "bass" | "chords" | "hook";
const PARTS: Part[] = ["drums", "bass", "chords", "hook"];
const POP_KIT: Rows = { kick: "x.....x.x.......", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x." };
const pDrums = (bars = 2, edm = false) => g16(edm ? GROOVES.edm.rows : POP_KIT, P_BPM, { times: bars });
function pBass(bars = 2, roots = [45, 41, 48, 43]): Score {
  const ns: MNote[] = [];
  for (let b = 0; b < bars / 2; b++) for (const rt of roots) ns.push({ p: rt, d: 0.75 }, { p: rt, d: 0.75 }, { p: rt, d: 0.5 });
  return { bpm: P_BPM, tracks: [{ kind: "notes", inst: "synthbass", notes: ns }] };
}
const pChords = (bars = 2, style: "pulse" | "pad" = "pulse", romans = LOOP_R): Score =>
  progression(Array.from({ length: bars / 2 }, () => romans).flat(), 60, "major", { bpm: P_BPM, per: 2, inst: style === "pad" ? "pad" : "piano", style });
const HOOK = { ps: [76, 76, 74, 72, 69, 72, 67, 72, 76, 74, 71], ds: [0.5, 0.5, 0.5, 0.5, 1, 1, 0.5, 0.5, 1, 1.5, 0.5] };
function pHook(bars = 2, inst: InstId = "synth"): Score {
  const ns: MNote[] = [];
  for (let b = 0; b < bars / 2; b++) HOOK.ps.forEach((p, i) => ns.push({ p, d: HOOK.ds[i] }));
  return { bpm: P_BPM, tracks: [{ kind: "notes", inst, notes: ns, vol: 0.85 }] };
}
const partOf = (p: Part, bars = 2): Score => (p === "drums" ? pDrums(bars) : p === "bass" ? pBass(bars) : p === "chords" ? pChords(bars) : pHook(bars));
const loopOf = (parts: Part[], bars = 2): Score => layer(...parts.map((p) => partOf(p, bars)));
const PART_OPT: Record<Part, MOption> = { drums: opt("drums", "Drums", { inst: "kick" }), bass: opt("bass", "Bass", { inst: "synthbass" }), chords: opt("chords", "Chords", { inst: "piano" }), hook: opt("hook", "Melody (the hook)", { inst: "synth" }) };
const SECTION: Record<string, () => Score> = {
  Intro: () => pChords(2, "pad"),
  Verse: () => layer(pDrums(2), pBass(2), pChords(2)),
  Chorus: () => layer(pDrums(2), pBass(2), pChords(2), pHook(2)),
  Bridge: () => layer(pBass(2, [41, 43, 40, 45]), pChords(2, "pad", BRIDGE_R)),
  Outro: () => hairpin(layer(pChords(2, "pad"), pHook(2, "bells")), 1, 0.25),
};
function buildUp(): Score {
  const hits: MHit[] = [];
  for (let i = 0; i < 8; i++) hits.push({ t: i * 0.5, k: "snare", v: 0.35 + i * 0.04 });
  for (let i = 0; i < 16; i++) hits.push({ t: 4 + i * 0.25, k: "snare", v: 0.6 + i * 0.025 });
  return { bpm: P_BPM, tracks: [{ kind: "drums", hits }, { kind: "notes", inst: "pad", notes: [{ p: [57, 60, 64], d: 4, v: 0.4 }, { p: [55, 59, 62], d: 4, v: 0.6 }], vol: 0.6 }] };
}
const theDrop = (): Score => layer(pDrums(2, true), pBass(2), pChords(2), pHook(2));
const breakdown = (): Score => layer(pChords(2, "pad"), pHook(2, "piano"));

const prLayer = topic("g6-pr-layer", (r, d) => {
  const add = pick(r, PARTS);
  const base = pickN(r, PARTS, d < 0.5 ? 1 : 2, (x) => x === add);
  return listen({ prompt: "A loop plays, then a new layer joins at bar 3. Which layer came in?", sound: then(loopOf(base), loopOf([...base, add]), 0), options: PARTS.map((p) => PART_OPT[p]), answer: add, skill: "u:production:layers", layout: "grid" });
});
const prMissing = topic("g6-pr-missing", (r) => {
  const gone = pick(r, PARTS);
  return listen({ prompt: "Three of the four layers are playing. Which one is muted?", sound: loopOf(PARTS.filter((p) => p !== gone)), options: PARTS.map((p) => PART_OPT[p]), answer: gone, skill: "u:production:layers", layout: "grid", why: "Listen low to high: the kick and snare, the bass under everything, the chords in the middle, the hook on top." });
});
const LAYER_CARDS: { id: string; bin: Part; sound: () => Score }[] = [
  { id: "d1", bin: "drums", sound: () => pDrums(1) },
  { id: "d2", bin: "drums", sound: () => g16({ kick: "x...x...x...x...", clap: "....x.......x..." }, P_BPM, { times: 1 }) },
  { id: "b1", bin: "bass", sound: () => ({ bpm: P_BPM, tracks: [{ kind: "notes", inst: "synthbass", notes: [{ p: 45, d: 0.75 }, { p: 45, d: 0.75 }, { p: 45, d: 0.5 }, { p: 41, d: 2 }] }] }) },
  { id: "b2", bin: "bass", sound: () => melody([36, 36, 43, 41], 1, "bass", P_BPM) },
  { id: "c1", bin: "chords", sound: () => chordSound([57, 60, 64], "piano", 3, P_BPM) },
  { id: "c2", bin: "chords", sound: () => progression(["I", "IV"], 60, "major", { bpm: P_BPM, per: 2, inst: "pad", style: "pad" }) },
  { id: "h1", bin: "hook", sound: () => melody(HOOK.ps.slice(0, 6), HOOK.ds.slice(0, 6), "synth", P_BPM) },
  { id: "h2", bin: "hook", sound: () => melody([72, 74, 76, 79, 76], [0.5, 0.5, 0.5, 1, 1.5], "flute", P_BPM) },
];
const prSortLayers = topic("g6-pr-sortlayers", (r) => {
  const one = PARTS.map((p) => pick(r, LAYER_CARDS.filter((c) => c.bin === p)));
  const extra = pickN(r, LAYER_CARDS, 2, (c) => one.includes(c));
  return { kind: "soundsort", prompt: "Tap each clip, then sort it into the layer it belongs to.", bins: PARTS.map((p) => ({ id: p, label: PART_OPT[p].text ?? p, inst: PART_OPT[p].inst })), items: shuffle(r, [...one, ...extra]).map((c, i) => ({ id: c.id, label: `Clip ${i + 1}`, sound: c.sound(), bin: c.bin })), skill: "u:production:layers" };
});
const prHookEcho = topic("g6-pr-hookecho", (r, d) => {
  const n = d < 0.5 ? 4 : 6;
  return { kind: "melody", mode: "echo", prompt: "Learn the hook by ear: play it back on the keys.", notes: HOOK.ps.slice(0, n), pads: naturals(67, 79), on: "keys", labels: "letters", inst: "synth", durs: HOOK.ds.slice(0, n), bpm: P_BPM, skill: "u:production:hook" };
});
const prDrumCopy = topic("g6-pr-drumcopy", (r) => {
  const edm = r() < 0.5;
  const rec = edm ? GROOVES.edm.rows : POP_KIT;
  const rows = Object.keys(rec) as DrumId[];
  return { kind: "beatlab", mode: "copy", prompt: `Rebuild the drum layer of this ${edm ? "dance" : "pop"} track by ear.`, rows, steps: 16, bpm: edm ? 124 : P_BPM, target: rows.map((k) => asGrid(rec[k] ?? "")), skill: "u:beatmaking:copy" };
});
const FADER: { prompt: string; goal: { tempo?: [number, number]; dyn?: [number, number] }; word: string }[] = [
  { prompt: "Breakdown time: slide the volume down to a quiet level and hold it there.", goal: { dyn: [0.1, 0.35] }, word: "Fade down" },
  { prompt: "The drop is coming: push the volume up near the top and hold it.", goal: { dyn: [0.8, 1] }, word: "Push it up" },
  { prompt: "Set the tempo for a house track: tap the baton at 120–128 BPM.", goal: { tempo: [120, 128] }, word: "House tempo" },
  { prompt: "Set a boom-bap tempo: tap the baton at 85–95 BPM.", goal: { tempo: [85, 95] }, word: "Boom-bap tempo" },
  { prompt: "Trap runs fast: tap the baton at 135–150 BPM.", goal: { tempo: [135, 150] }, word: "Trap tempo" },
];
const prFader = topic("g6-pr-fader", (r) => {
  const v = pick(r, FADER);
  return { kind: "conduct", prompt: v.prompt, goal: v.goal, music: loopOf(PARTS, 4), word: v.word, skill: v.goal.tempo ? "u:production:tempo" : "u:production:mix" };
});
const prFix = topic("g6-pr-fix", (r) => {
  const rec = pick(r, [POP_KIT, GROOVES.edm.rows, GROOVES.rock.rows]);
  const rows = Object.keys(rec) as DrumId[];
  const target = rows.map((k) => asGrid(rec[k] ?? ""));
  const i = int(r, 0, rows.length - 1);
  const cells = target[i].split("");
  const gone = pick(r, cells.map((c, j) => (c === "x" ? j : -1)).filter((j) => j >= 0));
  cells[gone] = ".";
  const free = cells.map((c, k) => (c === "." && k !== gone ? k : -1)).filter((k) => k >= 0);
  if (r() < 0.5 && free.length) cells[pick(r, free)] = "x";
  const start = target.map((t, k) => (k === i ? cells.join("") : t));
  return { kind: "beatlab", mode: "fix", prompt: "Session check: one drum part has a mistake. Listen to the reference, then fix the grid to match it.", rows, steps: 16, bpm: P_BPM, target, start, skill: "u:beatmaking:fix" };
});
const prSection = topic("g6-pr-section", (r) => {
  const s = pick(r, ["Intro", "Verse", "Chorus"]);
  return listen({ prompt: "Where in the song does this probably come from?", sound: SECTION[s](), options: [opt("Intro", "Intro: sets the mood"), opt("Verse", "Verse: tells the story, leaves room"), opt("Chorus", "Chorus: full band and the hook")], answer: s, skill: "u:production:arrangement", why: "Intros are sparse (often just chords). Verses add the groove but leave room for the vocal. Choruses bring everything plus the hook.", layout: "list" });
});
const prDrop = topic("g6-pr-drop", (r) => {
  const order = shuffle(r, ["drop", "build", "break"]);
  const sound: Record<string, () => Score> = { drop: theDrop, build: buildUp, break: breakdown };
  return listen({ prompt: "Dance-music sections: which clip is the DROP?", options: order.map((id, i) => soundOpt(id, sound[id](), `Clip ${"ABC"[i]}`)), answer: "drop", skill: "u:production:arrangement", why: "The build-up rises (snare rolls speeding up), the breakdown strips the beat away, and the drop slams back in with the full beat, bass and hook." });
});
const prMix = topic("g6-pr-mix", (r, d) => {
  const v = int(r, 0, d < 0.5 ? 1 : 2);
  const loop = loopOf(PARTS);
  const aFirst = r() < 0.5;
  if (v === 0) {
    const filtered = withFx(loop, { lowpass: 0.75 });
    return listen({ prompt: "Which version has a low-pass filter on it (the high frequencies cut)?", options: [soundOpt("a", aFirst ? filtered : loop, "Version A"), soundOpt("b", aFirst ? loop : filtered, "Version B")], answer: aFirst ? "a" : "b", skill: "u:production:mix", why: "A low-pass filter lets the lows pass and cuts the highs: the mix sounds dark and muffled, like music through a wall. DJs sweep it for drama." });
  }
  if (v === 1) {
    const wet = withFx(loop, { reverb: 0.95 });
    return listen({ prompt: "Which version has more reverb, so it sounds like a bigger space?", options: [soundOpt("a", aFirst ? wet : loop, "Version A"), soundOpt("b", aFirst ? loop : wet, "Version B")], answer: aFirst ? "a" : "b", skill: "u:production:mix", why: "Reverb adds the echoes of a room. A little sounds natural; a lot puts the track in a cathedral." });
  }
  const buried: Score = { ...loop, tracks: loop.tracks.map((t) => (t.kind === "drums" ? { ...t, vol: 0.15 } : t)) };
  return listen({ prompt: "Mix check: in which version are the drums buried (much too quiet)?", options: [soundOpt("a", aFirst ? buried : loop, "Version A"), soundOpt("b", aFirst ? loop : buried, "Version B")], answer: aFirst ? "a" : "b", skill: "u:production:mix", why: "Balancing levels is the first job of mixing. Without the drums up front, a track loses its punch." });
});
const prArrange = topic("g6-pr-arrange", (r, d) => {
  const order = d < 0.5 ? pick(r, [["Intro", "Verse", "Chorus", "Verse", "Chorus"], ["Intro", "Chorus", "Verse", "Chorus"], ["Verse", "Chorus", "Verse", "Chorus", "Outro"]]) : pick(r, [["Intro", "Verse", "Chorus", "Verse", "Chorus", "Bridge", "Chorus"], ["Intro", "Verse", "Chorus", "Bridge", "Chorus", "Outro"]]);
  const sections: Record<string, Score> = {};
  for (const s of new Set(order)) sections[s] = SECTION[s]();
  return { kind: "form", mode: "build", prompt: "Listen to the whole arrangement, then drag the section blocks into the order you hear.", sections, order, skill: "u:form:arrangement" };
});
/** Three contrasting 2-bar sections (8 beats each) for the classic-form questions. */
const FORM_RHY = [0.5, 0.5, 1, 1, 0.5, 0.5, 4];
const FORM_PARTS: Record<string, () => Score> = {
  A: () => layer(melody([60, 62, 64, 67, 64, 62, 60], FORM_RHY, "piano", 104), progression(["I", "IV", "V", "I"], 60, "major", { bpm: 104, per: 2, style: "pad", inst: "strings" })),
  B: () => layer(melody([69, 72, 74, 72, 69, 67, 65], FORM_RHY, "flute", 104), progression(["IV", "V", "IV", "V"], 60, "major", { bpm: 104, per: 2, style: "pad", inst: "strings" })),
  C: () => layer(melody([67, 67, 69, 67, 64, 60, 62], FORM_RHY, "marimba", 104), progression(["vi", "ii", "V", "V"], 60, "major", { bpm: 104, per: 2, style: "pad", inst: "strings" })),
};
const prFormLabel = topic("g6-pr-form", (r) => {
  const forms = ["ABA", "AABA", "ABAB", "ABACA"];
  const f = pick(r, forms);
  const order = f.split("");
  const sections: Record<string, Score> = {};
  for (const s of new Set(order)) sections[s] = FORM_PARTS[s]();
  return { kind: "form", mode: "label", prompt: "Listen to the sections. Which form is this?", sections, order, options: forms, answer: f, skill: "u:form:label" };
});
const PR_BEATS: Make[] = [
  { prompt: "The drums: four on the floor (kick on every beat), clap on 2 and 4, at least 2 open hats and 4 closed hats.", rows: ["kick", "clap", "hat", "openhat"], bpm: 124, rules: [{ rule: "on", row: "kick", steps: [0, 4, 8, 12] }, { rule: "on", row: "clap", steps: [4, 12] }, { rule: "count", row: "openhat", min: 2 }, { rule: "count", row: "hat", min: 4 }] },
  { prompt: "A pop beat for your track: kick on 1, snare on 2 and 4, at least 8 hats, and a crash on beat 1.", rows: ["kick", "snare", "hat", "crash"], bpm: 100, rules: [{ rule: "on", row: "kick", steps: [0] }, { rule: "on", row: "snare", steps: [4, 12] }, { rule: "count", row: "hat", min: 8 }, { rule: "on", row: "crash", steps: [0] }] },
  { prompt: "A trap beat for your track: clap only on beat 3 (step 9), kick on 1, at least 12 rolling hats.", rows: ["kick", "clap", "hat"], bpm: 140, rules: [{ rule: "on", row: "clap", steps: [8] }, { rule: "off", row: "clap", steps: [4, 12] }, { rule: "on", row: "kick", steps: [0] }, { rule: "count", row: "hat", min: 12 }] },
];
const prBeat = topic("g6-pr-beat", (r) => mk(pick(r, PR_BEATS), "u:beatmaking:production"));
const PR_HOOK_PITCHES = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76];
const prHook = topic("g6-pr-hook", (r) => {
  const v = pick(r, [
    { prompt: "Write the hook over the loop (Am – F – C – G): repeat your first 4 notes later, at least 8 notes.", rules: [{ rule: "repeat", len: 4 }, { rule: "notes", min: 8 }] as ComposeRule[] },
    { prompt: "Write a hook with space: at least 3 rests (silence makes a hook punchy) and a repeated 2-note motif.", rules: [{ rule: "rests", min: 3 }, { rule: "repeat", len: 2 }, { rule: "notes", min: 6 }] as ComposeRule[] },
    { prompt: "Write a hook that peaks in the middle (an arch) and uses high E (E5) as its top note.", rules: [{ rule: "arch" }, { rule: "use", pitches: [76] }, { rule: "notes", min: 8 }] as ComposeRule[] },
  ]);
  return { kind: "compose", prompt: v.prompt, pitches: PR_HOOK_PITCHES, slots: 16, dur: 0.5, inst: "synth", bpm: P_BPM, rules: v.rules, tonic: 60, labels: "letters", backing: loopOf(["drums", "bass", "chords"]), skill: "u:compose:hook" };
});
const PR_LOOPS: { prompt: string; rules: ChordRule[] }[] = [
  { prompt: "Write a 4-bar loop for your track that starts on vi and uses IV, I and V.", rules: [{ rule: "start", chord: "vi" }, { rule: "use", chords: ["IV", "I", "V"] }] },
  { prompt: "Write a 4-bar loop that starts on I and uses vi and IV (the pop sound).", rules: [{ rule: "start", chord: "I" }, { rule: "use", chords: ["vi", "IV"] }] },
  { prompt: "Write a 4-bar loop that starts on I and ends on V, so it keeps pulling back to the top (a half cadence).", rules: [{ rule: "start", chord: "I" }, { rule: "cadence", kind: "half" }] },
];
const prChords = topic("g6-pr-chords", (r) => {
  const v = pick(r, PR_LOOPS);
  return { kind: "chords", mode: "build", prompt: v.prompt, tonic: 60, scale: "major", palette: ["I", "ii", "iii", "IV", "V", "vi"], bars: 4, rules: v.rules, inst: "pad", bpm: P_BPM, beat: true, skill: "u:progression:production" };
});

const PR_LAYERS_IDEA = idea("A track is built in layers", [
  frame("Start with the drums: the rhythm everyone locks to.", gridShow(POP_KIT), loopOf(["drums"])),
  frame("Add the bass: the low end. It usually plays each chord's root, in rhythm with the kick.", { show: "inst", ids: ["kick", "synthbass"] }, loopOf(["drums", "bass"])),
  frame("Add the chords (keys, guitar or a synth pad): the harmony that sets the mood. This loop is Am – F – C – G.", { show: "chords", romans: LOOP_R, tonic: 60, scale: "major" }, loopOf(["drums", "bass", "chords"])),
  frame("Top it with the hook: the melody people hum after one listen.", { show: "contour", pitches: HOOK.ps }, loopOf(PARTS)),
], "u:production:idea");
const PR_ARRANGE_IDEA = idea("Arrangement", [
  frame("Arrangement is deciding what plays when. The same 2-bar loop becomes a whole song by adding and removing layers.", { show: "form", sections: ["intro", "verse", "chorus", "verse", "chorus", "outro"] }),
  frame("Intro: sets the mood, often just chords.", { show: "form", sections: ["intro"] }, SECTION.Intro()),
  frame("Verse: the groove comes in, but it leaves room for the story.", { show: "form", sections: ["verse"] }, SECTION.Verse()),
  frame("Chorus: the big moment, full band plus the hook.", { show: "form", sections: ["chorus"] }, SECTION.Chorus()),
  frame("Dance music adds a build-up, rising tension with a snare roll, and then the drop, when the full beat slams back in.", { show: "form", sections: ["build-up", "drop"] }, then(buildUp(), theDrop(), 0)),
], "u:production:idea");
const PR_MIX_IDEA = idea("Mixing basics", [
  frame("Mixing makes every layer clear. First job: balance the volumes so nothing is buried and nothing shouts.", { show: "inst", ids: ["kick", "synthbass", "piano", "synth"] }, loopOf(PARTS)),
  frame("EQ shapes frequencies. A low-pass filter cuts the highs: the track turns dark and muffled, like music through a wall.", { show: "wave", hz: 200, amp: 0.6 }, withFx(loopOf(PARTS), { lowpass: 0.75 })),
  frame("Reverb adds space: a small room, a hall, a cathedral.", { show: "pics", emoji: "⛪" }, withFx(loopOf(PARTS), { reverb: 0.95 })),
  frame("Give each layer its own range: bass low, chords in the middle, hook and hats on top. That's how a mix stays clean instead of muddy.", { show: "keyboard", lo: 45, hi: 77, lit: [45, 60, 64, 76], labels: "letters" }, loopOf(PARTS)),
], "u:production:idea");
const PR_TRACK_IDEA = idea("Your first track", [
  frame("Producers work in steps: 1. drums, 2. bass, 3. chords, 4. the hook, 5. arrange it into a song.", { show: "form", sections: ["drums", "bass", "chords", "hook", "arrange"] }, loopOf(PARTS)),
  frame("You've learned every step on these islands. Now build one, layer by layer. When you finish, the EDM groove joins your Studio.", gridShow(GROOVES.edm.rows), groove("edm", 2, 124)),
], "u:production:idea");

const PR_BASS: Activity = { kind: "compose", prompt: "Step 2, the bass: play each chord's root for the loop Am – F – C – G. Start on A2 and use F2, C3 and G2.", pitches: [40, 41, 43, 45, 47, 48, 50, 52], slots: 8, dur: 1, inst: "synthbass", bpm: P_BPM, rules: [{ rule: "start", p: 45 }, { rule: "use", pitches: [41, 48, 43] }, { rule: "notes", min: 6 }], tonic: 48, labels: "letters", backing: loopOf(["drums", "chords"]), skill: "u:compose:bass-line" };
const PR_CHORDS: Activity = { kind: "chords", mode: "build", prompt: "Step 3, the chords: a 4-bar loop in C that starts on vi and uses IV, I and V.", tonic: 60, scale: "major", palette: ["I", "ii", "iii", "IV", "V", "vi"], bars: 4, rules: [{ rule: "start", chord: "vi" }, { rule: "use", chords: ["IV", "I", "V"] }], inst: "pad", bpm: P_BPM, beat: true, skill: "u:progression:production" };
const PR_HOOK: Activity = { kind: "compose", prompt: "Step 4, the hook: write it over drums, bass and chords. Repeat your first 4 notes later, and use at least 8 notes.", pitches: PR_HOOK_PITCHES, slots: 16, dur: 0.5, inst: "synth", bpm: P_BPM, rules: [{ rule: "repeat", len: 4 }, { rule: "notes", min: 8 }], tonic: 60, labels: "letters", backing: loopOf(["drums", "bass", "chords"]), skill: "u:compose:hook" };

const PRODUCER_101: WorldDef = {
  id: "g6-producer-101",
  title: "Producer 101",
  emoji: "🎧",
  grade: "6",
  theme: "candy",
  blurb: "Layer drums, bass, chords and a hook, then arrange and mix your first full track.",
  talk: ["In your favorite song, when do instruments drop out, and when do they come back?", "Which part of a song gives you the most energy: the verse, the chorus or the drop?"],
  challenge: "Listen to a song and write down its sections in order: intro, verse, chorus… Is there a bridge?",
  stages: [
    {
      title: "Layers",
      emoji: "🧱",
      levels: 1,
      topics: [prLayer, prMissing, prSection, prSortLayers, prHookEcho, prDrumCopy],
      fixed: (r) => seq(r, [PR_LAYERS_IDEA, [prLayer, 0.1], [prSortLayers, 0.2], [prMissing, 0.3], [prHookEcho, 0.3], [prDrumCopy, 0.4], [prLayer, 0.7], [prSection, 0.6]]),
    },
    practice({ title: "Arrangement", emoji: "🧩", idea: PR_ARRANGE_IDEA, topics: [prSection, prArrange, prDrop, prFormLabel] }),
    practice({ title: "Mixing", emoji: "🎛️", idea: PR_MIX_IDEA, topics: [prMix, prFader, prMissing, prFix] }),
    {
      title: "Your first track",
      emoji: "🚀",
      levels: 1,
      topics: [prBeat, prHook, prChords, prArrange],
      unlocks: ["groove:edm"],
      fixed: (r) => seq(r, [PR_TRACK_IDEA, mk(PR_BEATS[0], "u:beatmaking:production"), PR_BASS, PR_CHORDS, PR_HOOK, [prArrange, 0.8], [prMix, 0.9]]),
    },
  ],
};

export const WORLDS: WorldDef[] = [INTERVAL_ISLAND, BEAT_LAB_PRO, BASS_CLEF_BAY, SOUND_SCIENCE, KEY_SIGNATURE_KEYS, CHORD_QUALITY_CANYON, MELODY_WORKSHOP, PRODUCER_101];
