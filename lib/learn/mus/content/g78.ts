import type { Activity, Option, Visual } from "../../types";
import type { Stage, Topic, WorldDef } from "../../gen";
import { items, pick, pickN, shuffle, type Rng } from "../../gen";
import type { DrumId, InstId, Meter, MHit, MNote, MTrack, MusicShow, Score } from "../types";
import { CIRCLE, QUALITY_NAME, barBeats, chordFunction, chordPitches, intervalName, intoBars, keyName, keySigLetters, keyTonicPc, pcOf, pulses, romanChord, scale, spelledName, type ChordQuality, type ScaleKind } from "../theory";
import { beat, chordSound, hairpin, layer, melody, progression, rhythm, then, transpose, withGain } from "../score";
import { line, piece, type PieceId } from "../pieces";
import { song, songScore } from "../songs";
import { INSTRUMENTS } from "../catalog";
import { strongSyllables } from "../check";
import { echo, frame, idea, instOpt, intervalEar, keysShow, listen, opt, pieceName, progSound, randomCells, readRhythm, rhythmMatch, rhythmShow, soundOpt, staffShow, styleEar, topic } from "../make";

// Music for 7th and 8th grade — the songwriter's, producer's and composer's toolkit, taught the way
// working musicians actually use it. Real words (key signature, cadence, Mixolydian, leitmotif,
// low-pass filter), real craft (prosody, arranging by energy, voice leading), and something heard or
// played in nearly every item. Each world teaches → practices → makes something: every stage opens
// with an explainer you can hear, middle stages drill with fresh generated items, and the last stage
// is a studio session (write the progression, set the lyric, arrange the drop, score the scene).
//
//   7th — Circle of Fifths Atoll · Progression Point · Lyric Lagoon · Arrangement Archipelago ·
//         Modes & Moods Mesa · Rhythm Gym
//   8th — Cadence Cliffs · Seventh Chord Sound · Film Score Falls · Music History Highway ·
//         Producer's Desk · Theory Summit (ending in the Composer's Crown)
//
// All melodies are original or public domain. Skill keys "u:<family>:<detail>".

// ═══ Shared helpers ═════════════════════════════════════════════════════════════════════════

/** A text question: prompt, the right answer, wrong answers, why, and an optional picture. */
type Q = { q: string; a: string; w: string[]; why?: string; v?: MusicShow; e?: string };
function choose(r: Rng, x: Q, skill: string): Activity {
  const all = [x.a, ...x.w];
  const options: Option[] = shuffle(r, all).map((t) => ({ id: t, text: t }));
  const visual: Visual | undefined = x.v ? { type: "music", m: x.v } : x.e ? { type: "scene", emoji: x.e } : undefined;
  return { kind: "choice", prompt: x.q, visual, options, answer: x.a, layout: all.some((t) => t.length > 16) ? "list" : "row", skill, why: x.why };
}
const qT = (key: string, skill: string, bank: Q[]): Topic => topic(key, (r) => choose(r, pick(r, bank), skill));
function sortItem(prompt: string, bins: { id: string; label: string; emoji?: string }[], its: { id: string; text: string; bin: string }[], skill: string): Activity {
  return { kind: "sort", prompt, bins, items: its, skill };
}
function orderItem(prompt: string, texts: string[], skill: string): Activity {
  return { kind: "order", prompt, items: texts.map((t) => ({ id: t, text: t })), direction: "column", skill };
}
function matchItem(prompt: string, pairs: [string, string][], skill: string): Activity {
  return { kind: "match", prompt, mode: "columns", pairs: pairs.map(([a, b]) => ({ a: { id: a, text: a }, b: { id: b, text: b } })), skill };
}
/** A practice stage: its first level opens with an explainer, then fresh items cycle through its
 *  topics on the same difficulty ramp buildWorlds uses. */
function practice(title: string, emoji: string, topics: Topic[], o: { teach?: Activity; levels?: number; titles?: string[]; unlocks?: string[]; n?: number } = {}): Stage {
  const levels = o.levels ?? 2;
  const n = o.n ?? 8;
  return {
    title,
    emoji,
    topics,
    levels,
    ...(o.titles ? { titles: o.titles } : {}),
    ...(o.unlocks ? { unlocks: o.unlocks } : {}),
    fixed: (r, li) => {
      const d0 = levels === 1 ? 0.25 : (li / levels) * 0.7;
      const d1 = Math.min(1, d0 + 0.35);
      return li === 0 && o.teach ? [o.teach, ...items(r, topics, n - 1, d0, d1)] : items(r, topics, n, d0, d1);
    },
  };
}

// ── Keys and names ──────────────────────────────────────────────────────────────────────────
/** Major / minor key names by fifths (−7 … 7): MAJ(2) = "D", MIN(2) = "B". */
const MAJ = (f: number) => keyName(f).replace(" major", "");
const MIN = (f: number) => keyName(f, "minor").replace(" minor", "");
/** Fifths folded onto the drawn circle (−5 … 6). */
const wrapF = (f: number) => ((((f + 5) % 12) + 12) % 12) - 5;
const litMaj = (f: number) => CIRCLE.find((c) => c.fifths === wrapF(f))?.major ?? "C";
const litMin = (f: number) => CIRCLE.find((c) => c.fifths === wrapF(f))?.minor ?? "a";
const circle = (...lit: string[]): MusicShow => ({ show: "circle", lit });
/** The first MIDI pitch at or above `lo` with this pitch class. */
const midiIn = (pc: number, lo: number) => lo + ((((pc - lo) % 12) + 12) % 12);
/** The major key (fifths) whose tonic is this pitch class. */
const fifthsOfPc = (pc: number) => [0, 1, 2, 3, 4, 5, 6, -1, -2, -3, -4, -5].find((f) => keyTonicPc(f) === pcOf(pc)) ?? 0;
const nm = (p: number, f = 0) => spelledName(p, f);
const nms = (ps: number[], f = 0, sep = " – ") => ps.map((p) => nm(p, f)).join(sep);
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const SUFFIX: Record<ChordQuality, string> = { maj: "", min: "m", dim: "°", aug: "+", "7": "7", maj7: "maj7", m7: "m7", m7b5: "m7♭5", dim7: "°7", sus2: "sus2", sus4: "sus4", "5": "5" };
const chordSym = (root: number, q: ChordQuality, f = 0) => nm(root, f) + SUFFIX[q];
const chordWord = (root: number, q: ChordQuality, f = 0) => `${nm(root, f)} ${QUALITY_NAME[q]}`;
/** Roman numerals in a key, drawn as chord blocks. */
const chordsShow = (romans: string[], tonic = 60, scale: "major" | "minor" = "major"): MusicShow => ({ show: "chords", romans, tonic, scale });

// ── Sound helpers ───────────────────────────────────────────────────────────────────────────
const notesTrack = (inst: InstId, ns: MNote[], vol?: number, at?: number): MTrack => ({ kind: "notes", inst, notes: ns, ...(vol !== undefined ? { vol } : {}), ...(at !== undefined ? { at } : {}) });
const drone = (t: number, beats: number): MTrack => notesTrack("pad", [{ p: [t - 12, t - 5], d: beats }], 0.45);
const scaleUp = (tonic: number, kind: ScaleKind = "major", inst: InstId = "piano", bpm = 116) => melody(scale(tonic, kind, 1), 0.5, inst, bpm);
const prog = (romans: string[], tonic: number, mode: "major" | "minor" = "major", o: Parameters<typeof progression>[3] = {}) => progression(romans, tonic, mode, { bpm: 92, per: 2, inst: "piano", style: "block", bass: true, ...o });
const withScoreFx = (s: Score, fx: NonNullable<Score["fx"]>): Score => ({ ...s, fx: { ...s.fx, ...fx } });

// ═══ 7th grade ═════════════════════════════════════════════════════════════════════════════

// ── Circle of Fifths Atoll ──────────────────────────────────────────────────────────────────
const KEYS12 = [0, 1, 2, 3, 4, 5, 6, -1, -2, -3, -4, -5];
const CIRCLE_WALK = melody([60, 67, 62, 69, 64, 71, 66, 61, 68, 63, 70, 65, 72], 0.5, "piano", 104);
const FOURTHS_WALK = melody([60, 65, 70, 63, 68, 61], 0.5, "piano", 104);
const sigMarks = (f: number) => keySigLetters(f).map((l) => l + (f > 0 ? "♯" : "♭")).join(" ");
const sigStaff = (f: number, clef: "treble" | "bass" = "treble"): MusicShow => ({ show: "staff", clef, notes: [{ p: null, d: 4 }], key: f });

function sigCountItem(r: Rng, f: number, showCircle: boolean): Activity {
  const n = Math.abs(f);
  const w = f > 0 ? "sharp" : "flat";
  const o = f > 0 ? "flat" : "sharp";
  const path = Array.from({ length: n }, (_, i) => `${MAJ(Math.sign(f) * (i + 1))} (${i + 1})`).join(", ");
  return choose(r, {
    q: `How many sharps or flats does ${MAJ(f)} major have?`,
    a: plural(n, w),
    w: [plural(n + 1, w), n > 1 ? plural(n - 1, w) : plural(n, o)],
    v: showCircle ? circle(litMaj(f)) : undefined,
    why: `Count ${f > 0 ? "clockwise" : "counterclockwise"} from C: ${path}. ${MAJ(f)} major has ${sigMarks(f)}.`,
  }, "u:key-sig:count");
}
const sigCount = topic("g7-sig-count", (r, d) => {
  const f = pick(r, d < 0.35 ? [1, 2, 3, -1, -2, -3] : [2, 3, 4, 5, 6, -2, -3, -4, -5]);
  return sigCountItem(r, f, Math.abs(f) <= 2);
});

function sigNameItem(r: Rng, f: number, clef: "treble" | "bass"): Activity {
  const L = keySigLetters(f);
  const why = f > 0 ? `The last sharp is ${L[L.length - 1]}♯ — that's ti. Go up a half step to do: ${MAJ(f)} major.` : f === -1 ? "One flat (B♭) means F major — that's the one to memorize." : `The second-to-last flat names the key: ${L[L.length - 2]}♭ → ${MAJ(f)} major.`;
  return choose(r, { q: "Which major key has this key signature?", a: `${MAJ(f)} major`, w: [`${MAJ(f + 1)} major`, `${MAJ(f - 1)} major`], v: sigStaff(f, clef), why }, "u:key-sig:name");
}
const sigName = topic("g7-sig-name", (r, d) => sigNameItem(r, pick(r, d < 0.4 ? [1, 2, 3, -1, -2, -3] : [2, 3, 4, 5, -2, -3, -4, -5]), d > 0.6 && r() < 0.4 ? "bass" : "treble"));

function relMinorItem(r: Rng, f: number, toMinor: boolean, showCircle: boolean): Activity {
  const why = "Relative keys share a key signature. The relative minor starts on la — 3 half steps (a minor 3rd) below the major tonic.";
  return toMinor
    ? choose(r, { q: `What is the relative minor of ${MAJ(f)} major?`, a: `${MIN(f)} minor`, w: [`${MAJ(f)} minor`, `${MIN(f + 1)} minor`], v: showCircle ? circle(litMaj(f)) : undefined, why }, "u:circle:relative")
    : choose(r, { q: `What is the relative major of ${MIN(f)} minor?`, a: `${MAJ(f)} major`, w: [`${MIN(f)} major`, `${MAJ(f - 1)} major`], v: showCircle ? circle(litMin(f)) : undefined, why }, "u:circle:relative");
}
const relMinor = topic("g7-rel-minor", (r, d) => {
  const f = pick(r, d < 0.35 ? [0, 1, 2, -1, -2] : KEYS12);
  const toMinor = d < 0.35 || r() < 0.6;
  return relMinorItem(r, f, toMinor, toMinor && Math.abs(f) <= 1);
});

function fifthFindItem(f: number, up: boolean, labels: boolean): Activity {
  const g = up ? f + 1 : f - 1;
  return { kind: "keys", task: "find", prompt: `Find the note a perfect 5th ${up ? "above" : "below"} ${MAJ(f)} — one step ${up ? "clockwise" : "counterclockwise"} on the circle.`, answer: [midiIn(keyTonicPc(g), 60)], lo: 60, hi: 83, labels, octaveFree: true, skill: "u:circle:fifths", why: `${MAJ(f)} ${up ? "up" : "down"} 7 half steps is ${MAJ(g)}.` };
}
const fifthFind = topic("g7-fifth-find", (r, d) => fifthFindItem(pick(r, [0, 1, 2, 3, 4, -1, -2, -3, -4]), d < 0.4 || r() < 0.55, d < 0.3));

function primaryItem(r: Rng, f: number, showCircle: boolean): Activity {
  return choose(r, {
    q: `In ${MAJ(f)} major, which chords are IV and V?`,
    a: `${MAJ(f - 1)} and ${MAJ(f + 1)}`,
    w: [`${MAJ(f + 1)} and ${MAJ(f - 1)}`, `${MAJ(f + 1)} and ${MAJ(f + 2)}`],
    v: showCircle ? circle(litMaj(f - 1), litMaj(f), litMaj(f + 1)) : undefined,
    why: `IV sits one step counterclockwise from ${MAJ(f)} (${MAJ(f - 1)}); V sits one step clockwise (${MAJ(f + 1)}).`,
  }, "u:circle:primary");
}
const primaryChords = topic("g7-primary", (r, d) => {
  const f = pick(r, d < 0.35 ? [0, 1, 2, -1, -2] : [-3, -2, -1, 0, 1, 2, 3, 4]);
  return primaryItem(r, f, Math.abs(f) <= 1);
});

function circleOrderItem(start: number, cw: boolean, n: number): Activity {
  const ks = Array.from({ length: n }, (_, i) => MAJ(wrapF(start + (cw ? i : -i))));
  return orderItem(cw ? `Put these keys in clockwise order (each one a 5th higher), starting with ${ks[0]}.` : `Put these keys in counterclockwise order (each adds a flat), starting with ${ks[0]}.`, ks.map((k) => `${k} major`), "u:circle:order");
}
const circleOrder = topic("g7-circle-order", (r, d) => {
  const cw = d < 0.5 || r() < 0.5;
  return circleOrderItem(cw ? pick(r, [0, 1, 2]) : pick(r, [0, -1]), cw, d < 0.5 ? 4 : 5);
});

function fifthEarItem(r: Rng, d: number): Activity {
  const others = d < 0.5 ? [4, 5] : pick(r, [[5, 9], [4, 12], [5, 6]]);
  const lo = pick(r, [55, 57, 60, 62]);
  const all = shuffle(r, [7, ...others]);
  return listen({
    prompt: "Which pair of notes is a perfect 5th apart — the interval that builds the circle?",
    options: all.map((s, i) => soundOpt(String(s), melody([lo, lo + s], [1, 1.5], "piano", 84), ["First", "Second", "Third"][i])),
    answer: "7",
    skill: "u:circle:fifth-ear",
    why: "A perfect 5th (7 half steps) sounds open and strong — think of the first two notes of “Twinkle, Twinkle” going up: twin-kle, TWIN-kle.",
  });
}
const fifthEar = topic("g7-fifth-ear", (r, d) => fifthEarItem(r, d));

const sharpOrder = topic("g7-sharp-order", (r, d) => {
  const f = pick(r, d < 0.5 ? [2, 3, 4, -2, -3, -4] : [3, 4, 5, -3, -4, -5]);
  const s = f > 0 ? "sharps" : "flats";
  return choose(r, {
    q: `${f > 0 ? "Sharps always come in the order F C G D A E B" : "Flats always come in the order B E A D G C F"}. Which ${s} are in ${MAJ(f)} major?`,
    a: sigMarks(f),
    w: [sigMarks(f > 0 ? f - 1 : f + 1), sigMarks(f > 0 ? f + 1 : f - 1)],
    why: `${MAJ(f)} major has ${plural(Math.abs(f), f > 0 ? "sharp" : "flat")}, so take the first ${Math.abs(f)} from the order: ${sigMarks(f)}.`,
  }, "u:key-sig:order");
});

/** Name a note that the key signature changes (F on the staff in D major is F♯). */
const readInKey = topic("g7-read-in-key", (r, d) => {
  const f = pick(r, d < 0.35 ? [1, 2, 3, -1, -2, -3] : [2, 3, 4, 5, -2, -3, -4, -5]);
  const clef: "treble" | "bass" = d > 0.5 && r() < 0.4 ? "bass" : "treble";
  const letters = keySigLetters(f);
  const L = pick(r, letters);
  const li = "CDEFGAB".indexOf(L);
  const NAT = [0, 2, 4, 5, 7, 9, 11];
  const base = clef === "treble" ? 60 : 48;
  let p = base + NAT[li] + (f > 0 ? 1 : -1);
  if (clef === "treble" && p < 64) p += 12;
  if (clef === "bass" && p < 43) p += 12;
  const ans = nm(p, f);
  const next = "CDEFGAB"[(li + 1) % 7];
  return { kind: "staff", mode: "name", prompt: "Name this note — watch the key signature!", clef, notes: [p], key: f, options: shuffle(r, [L, ans, next]), answer: ans, hear: true, skill: "u:key-sig:read" };
});

function buildPrimaryItem(f: number, which: "I" | "IV" | "V"): Activity {
  const t = midiIn(keyTonicPc(f), 55);
  let root = t + (which === "IV" ? 5 : which === "V" ? 7 : 0);
  while (root > 67) root -= 12;
  const ps = chordPitches(root, "maj");
  return { kind: "keys", task: "chord", prompt: `In ${MAJ(f)} major, build the ${which} chord.`, answer: ps, lo: 48, hi: 79, labels: true, octaveFree: true, skill: "u:chord:primary", why: `${which} in ${MAJ(f)} major is ${nm(root, f)} major: ${nms(ps, f)}.` };
}
const buildPrimary = topic("g7-build-primary", (r, d) => buildPrimaryItem(pick(r, d < 0.5 ? [0, 1, 2, -1] : [-2, -1, 0, 1, 2, 3, 4]), pick(r, ["I", "IV", "V"] as const)));

const PRIMARY_PROGS = [["I", "IV", "V", "I"], ["I", "V", "IV", "I"], ["I", "IV", "I", "V"], ["I", "V", "I", "IV"], ["IV", "V", "I", "I"]];
const progEarPrimary = topic("g7-prog-primary", (r, d) => {
  const set = pickN(r, PRIMARY_PROGS, 3);
  const ans = set[0];
  const t = pick(r, [55, 57, 60, 62, 65]);
  return listen({
    prompt: "Which order of I, IV and V did you hear?",
    sound: prog(ans, t, "major", { bpm: d < 0.5 ? 84 : 100 }),
    options: shuffle(r, set).map((ro) => opt(ro.join("-"), ro.join(" – "), { show: chordsShow(ro, t) })),
    answer: ans.join("-"),
    skill: "u:progression:primary",
    why: "I sounds like home, IV like stepping away, V like leaning forward — wanting to get back to I.",
  });
});

const neighborQ = topic("g7-neighbors", (r, d) => {
  const kind = pick(r, d < 0.4 ? [0, 1] : [0, 1, 2]);
  const f = pick(r, [-3, -2, -1, 0, 1, 2, 3]);
  if (kind === 0) {
    const ff = pick(r, [0, 1, 2, 3]);
    const newSharp = ["F", "C", "G", "D", "A", "E", "B"][ff];
    return choose(r, { q: `Going clockwise from ${MAJ(ff)} major to ${MAJ(ff + 1)} major, which note changes?`, a: `${newSharp} becomes ${newSharp}♯`, w: [`${MAJ(ff)} becomes ${MAJ(ff)}♯`, `B becomes B♭`].filter((x) => x !== `${newSharp} becomes ${newSharp}♯`).slice(0, 2), why: `Neighbors share 6 of 7 notes. ${MAJ(ff + 1)} major adds one sharp: ${newSharp}♯.`, v: circle(litMaj(ff), litMaj(ff + 1)) }, "u:circle:neighbors");
  }
  if (kind === 1) return choose(r, { q: `Which key shares the most notes with ${MAJ(f)} major?`, a: `${MAJ(f + 1)} major`, w: [`${MAJ(wrapF(f + 3))} major`, `${MAJ(wrapF(f + 6))} major`], why: `Neighbors on the circle (like ${MAJ(f)} and ${MAJ(f + 1)}) share 6 of their 7 notes. The farther apart, the fewer notes in common.` }, "u:circle:neighbors");
  return choose(r, { q: "Which key sits directly opposite C on the circle — the farthest key away?", a: "F♯ (also called G♭)", w: ["G", "F"], v: circle("C", "F♯"), why: "Six steps either way. C major and F♯ major share only two notes — and C up to F♯ is the tritone." }, "u:circle:neighbors");
});

function keyScaleItem(f: number): Activity {
  const t = midiIn(keyTonicPc(f), 55);
  const ps = scale(t, "major", 1, false);
  return { kind: "keys", task: "scale", prompt: `Play the ${MAJ(f)} major scale: start on the ${MAJ(f)} that's already down and add the other six notes going up.`, answer: ps, given: [t], lo: t - 2, hi: t + 14, labels: true, skill: "u:scale:major-keys", why: `${MAJ(f)} major: ${nms(ps, f)} (whole, whole, half, whole, whole, whole, half).` };
}
const keyScale = topic("g7-key-scale", (r, d) => keyScaleItem(pick(r, d < 0.35 ? [0, 1, 2, -1, 3] : [2, 3, 4, 5, -1, -2, -3])));

const COMPOSE_KEYS: { f: number; minor: boolean }[] = [{ f: 1, minor: false }, { f: 2, minor: false }, { f: 3, minor: false }, { f: 0, minor: true }, { f: 1, minor: true }, { f: 4, minor: false }];
function composeKeyItem(k: { f: number; minor: boolean }): Activity {
  const mode = k.minor ? "minor" : "major";
  const t = midiIn(keyTonicPc(k.f, mode), 60);
  return {
    kind: "compose",
    prompt: `Write a tune in ${keyName(k.f, mode)} that comes home to ${nm(t, k.f)} at the end.`,
    pitches: scale(t, k.minor ? "minor" : "major", 1),
    slots: 8,
    dur: 1,
    inst: "piano",
    bpm: 100,
    rules: [{ rule: "end", p: t }, { rule: "notes", min: 6 }],
    tonic: t,
    labels: "letters",
    backing: prog(k.minor ? ["i", "iv", "V", "i"] : ["I", "IV", "V", "I"], t, mode, { bpm: 100, inst: "pad", style: "pad" }),
    skill: "u:compose:key",
  };
}
const composeKey = topic("g7-compose-key", (r) => composeKeyItem(pick(r, COMPOSE_KEYS)));

const CIRCLE_IDEA = idea("The circle of fifths", [
  frame("Start on C and climb a perfect 5th: G. Climb again: D. Keep going and you pass through all 12 keys before you land back on C.", circle("C", "G", "D", "A"), CIRCLE_WALK),
  frame("Each step clockwise adds one sharp. G major has 1 (F♯), D major has 2 (F♯ C♯), A major has 3 (F♯ C♯ G♯)…", staffShow(scale(69, "major", 1).map((p) => ({ p, d: 0.5 })), "treble", { key: 3 }), scaleUp(69)),
  frame("Go counterclockwise and each step adds a flat: F has 1 (B♭), B♭ has 2, E♭ has 3…", circle("F", "B♭", "E♭"), FOURTHS_WALK),
  frame("Inside the ring live the relative minors. Same key signature, but home is la — three half steps down. C major and A minor are partners.", circle("C", "a"), then(scaleUp(60), scaleUp(57, "minor"), 1)),
  frame("Your I, IV and V chords are always neighbors: IV one step counterclockwise, V one step clockwise. In C: F – C – G.", circle("F", "C", "G"), progSound(["I", "IV", "V", "I"], 60)),
], "u:circle:idea");
const SIG_IDEA = idea("Reading key signatures", [
  frame("A key signature is the group of sharps or flats at the start of every line. It changes those notes for the whole song — no need to mark each one.", staffShow(scale(62, "major", 1).map((p) => ({ p, d: 0.5 })), "treble", { key: 2 }), scaleUp(62)),
  frame("Sharps always appear in the same order: F C G D A E B. Flats are the same list backwards: B E A D G C F.", sigStaff(4), scaleUp(64)),
  frame("Sharp-key trick: the last sharp is ti. Go up a half step and you've found do. Last sharp G♯ → A major.", sigStaff(3), melody([68, 69], [1, 2], "piano", 80)),
  frame("Flat-key trick: the second-to-last flat is the key's name. B♭ E♭ A♭ → E♭ major. (One flat? That's F major.)", sigStaff(-3), scaleUp(63)),
], "u:key-sig:idea");
const NEIGHBOR_IDEA = idea("Neighbors on the circle", [
  frame("Neighboring keys share six of their seven notes. C major and G major differ by just one: F becomes F♯.", keysShow(60, 79, scale(67, "major", 1)), then(scaleUp(60), scaleUp(67), 1)),
  frame("That's why a song can slide into a neighboring key so smoothly — almost nothing has to change.", circle("C", "G"), then(prog(["I", "IV", "V", "I"], 60), prog(["I", "IV", "V", "I"], 67), 0)),
  frame("Your three primary chords — I, IV and V — sit side by side. In G major: C – G – D.", circle("C", "G", "D"), progSound(["I", "IV", "V", "I"], 55)),
  frame("Wherever you are, look one step left for IV and one step right for V. In F major: B♭ – F – C.", circle("B♭", "F", "C"), progSound(["I", "IV", "V", "I"], 65)),
], "u:circle:idea");
const SAIL_IDEA = idea("Sail the circle", [
  frame("Now you choose the key. Pick a home, borrow its neighbors, and you have everything a song needs.", circle("G", "C", "D"), prog(["I", "IV", "V", "I"], 55, "major", { inst: "guitar", style: "strum" })),
  frame("Fun fact: the bass buttons on an accordion are laid out around the circle of fifths. Here's I – IV – V – I on the squeezebox.", { show: "inst", ids: ["accordion"] }, prog(["I", "IV", "V", "I"], 60, "major", { inst: "accordion", style: "pulse", bpm: 112 })),
], "u:circle:idea");

const CIRCLE_ATOLL: WorldDef = {
  id: "g7-circle",
  title: "Circle of Fifths Atoll",
  emoji: "🧭",
  grade: "7",
  items: 8,
  theme: "shallows",
  blurb: "All twelve keys on one map — key signatures, relative minors and the chords next door.",
  talk: ["Musicians call the circle of fifths a map. What would you put on a map of your favorite music?", "When a song changes key near the end, how does it make you feel — and why do you think songwriters do it?"],
  challenge: "On a piano or a piano app, start on C and keep jumping up a 5th: C, G, D, A… How many jumps until you land on a C again?",
  stages: [
    {
      title: "The great circle",
      emoji: "🧭",
      levels: 1,
      topics: [sigCount, relMinor, fifthFind, primaryChords, circleOrder, fifthEar],
      fixed: (r) => [CIRCLE_IDEA, sigCountItem(r, 2, true), fifthEarItem(r, 0.2), sigNameItem(r, -3, "treble"), relMinorItem(r, 1, true, true), fifthFindItem(2, true, true), primaryItem(r, 1, true), circleOrderItem(0, true, 5)],
    },
    practice("Key signatures", "🔑", [sigCount, sigName, sharpOrder, readInKey, relMinor], { teach: SIG_IDEA, titles: ["Sharps and flats", "Reading the signature"] }),
    practice("Neighbors and chords", "🤝", [primaryChords, buildPrimary, progEarPrimary, neighborQ, keyScale, fifthFind], { teach: NEIGHBOR_IDEA, titles: ["Next-door keys", "I, IV and V anywhere"] }),
    {
      title: "Sail the circle",
      emoji: "⛵",
      levels: 1,
      topics: [composeKey, keyScale],
      unlocks: ["inst:accordion"],
      fixed: (r) => [
        SAIL_IDEA,
        { kind: "chords", mode: "build", prompt: "You're in G major. Write 4 bars that start on I, use IV and V, and end back on I.", tonic: 55, scale: "major", palette: ["I", "ii", "IV", "V", "vi"], bars: 4, rules: [{ rule: "start", chord: "I" }, { rule: "use", chords: ["IV", "V"] }, { rule: "end", chord: "I" }], inst: "accordion", bpm: 96, skill: "u:progression:create" },
        keyScaleItem(3),
        composeKeyItem({ f: 2, minor: false }),
        { kind: "chords", mode: "build", prompt: "Counterclockwise now: in F major, use the IV chord (B♭) and finish with V → I.", tonic: 53, scale: "major", palette: ["I", "ii", "IV", "V", "vi"], bars: 4, rules: [{ rule: "use", chords: ["IV"] }, { rule: "cadence", kind: "authentic" }], inst: "piano", bpm: 92, skill: "u:progression:create" },
        composeKeyItem({ f: 1, minor: true }),
        listen({ prompt: "Which instrument has its bass buttons laid out around the circle of fifths?", sound: prog(["I", "IV", "V", "I"], 55, "major", { inst: "accordion", style: "pulse", bpm: 112 }), options: [instOpt("accordion"), instOpt("organ"), instOpt("harmonica")], answer: "accordion", skill: "u:circle:accordion", why: "The accordion's left-hand buttons run around the circle of fifths, so I, IV and V are always right next to each other." }),
        choose(r, { q: "Which key sits directly opposite C on the circle — the farthest key away?", a: "F♯ (also called G♭)", w: ["G", "F"], v: circle("C", "F♯"), why: "Six steps either way. C major and F♯ major share only two notes — and C up to F♯ is the tritone." }, "u:circle:neighbors"),
      ],
    },
  ],
};

// ── Progression Point ───────────────────────────────────────────────────────────────────────
const TWELVE = ["I7", "I7", "I7", "I7", "IV7", "IV7", "I7", "I7", "V7", "IV7", "I7", "V7"];
const CANON = ["I", "V", "vi", "iii", "IV", "I", "IV", "V"];
/** A 12-bar blues short enough to listen to (organ, shuffle beat, a harmonica lick on top). */
function bluesDemo(t = 55): Score {
  const band = progression(TWELVE, t, "major", { bpm: 132, per: 2, inst: "organ", style: "strum", bass: true, drums: "shuffle" });
  return { ...band, tracks: [...band.tracks, notesTrack("harmonica", line(t + 12, "r/1 3/0.5 5/0.5 6/0.5 7/1.5 r/2 10/1 7/0.5 5/0.5 3/1 0/1"), 0.8)] };
}
/** Hear a style demo → name it (the library's pieces, with a shorter blues). */
const genreItem = (r: Rng, pool: PieceId[], skill: string, prompt = "What style of music is this?"): Activity => {
  const ans = pick(r, pool);
  return listen({ prompt, sound: ans === "blues" ? bluesDemo(pick(r, [55, 57, 60])) : piece(ans), options: shuffle(r, [ans, ...pickN(r, pool, 2, (x) => x === ans)]).map((id) => opt(id, pieceName(id))), answer: ans, skill });
};
type ProgId = "pop" | "sad" | "fifties" | "jazz" | "primary" | "canon";
const PROGS: Record<ProgId, { name: string; romans: string[]; why: string }> = {
  pop: { name: "I – V – vi – IV", romans: ["I", "V", "vi", "IV"], why: "I – V – vi – IV: the four-chord loop under a huge number of pop songs." },
  sad: { name: "vi – IV – I – V", romans: ["vi", "IV", "I", "V"], why: "vi – IV – I – V starts on the minor vi, so it sounds wistful before it brightens." },
  fifties: { name: "I – vi – IV – V", romans: ["I", "vi", "IV", "V"], why: "I – vi – IV – V is the 1950s doo-wop progression." },
  jazz: { name: "ii – V – I", romans: ["ii", "V", "I", "I"], why: "ii – V – I is the backbone of jazz: away, tension, home." },
  primary: { name: "I – IV – V – I", romans: ["I", "IV", "V", "I"], why: "I – IV – V – I: the three primary chords, home to home." },
  canon: { name: "Pachelbel's Canon", romans: CANON, why: "I – V – vi – iii – IV – I – IV – V: Pachelbel's Canon (about 1700), still borrowed today." },
};
const FUNC_BINS = [
  { id: "tonic", label: "Tonic (home)" },
  { id: "predominant", label: "Predominant (moving away)" },
  { id: "dominant", label: "Dominant (tension)" },
];
const famousEar = (key: string, easy: ProgId[], hard: ProgId[]) =>
  topic(key, (r, d) => {
    const pool = d < 0.4 ? easy : hard;
    const ans = pick(r, pool);
    const wrong = pickN(r, pool, 2, (x) => x === ans);
    const t = pick(r, [55, 57, 60, 62, 65]);
    return listen({
      prompt: "Which progression is this?",
      sound: prog(PROGS[ans].romans, t, "major", { bpm: 96, inst: pick(r, ["piano", "guitar"] as InstId[]), style: pick(r, ["block", "strum"] as const) }),
      options: shuffle(r, [ans, ...wrong]).map((id) => opt(id, PROGS[id].name)),
      answer: ans,
      skill: "u:progression:famous",
      why: PROGS[ans].why,
    });
  });
const famousPop = famousEar("g7-prog-famous", ["pop", "fifties", "primary", "sad"], ["pop", "sad", "fifties", "primary"]);
const famousAll = famousEar("g7-prog-famous-2", ["pop", "jazz", "canon", "primary"], ["pop", "sad", "fifties", "jazz", "primary", "canon"]);

const progMatch = topic("g7-prog-match", (r, d) => {
  const id = pick(r, (d < 0.5 ? ["pop", "fifties", "primary", "sad"] : ["pop", "sad", "fifties", "jazz", "canon"]) as ProgId[]);
  const ans = PROGS[id].romans;
  const all = ["I", "ii", "iii", "IV", "V", "vi"];
  const extra = pickN(r, all, d < 0.5 ? 1 : 2, (c) => ans.includes(c));
  return { kind: "chords", mode: "match", prompt: "Listen, then lay out the chords you hear — one per bar.", tonic: pick(r, [55, 57, 60, 62, 64, 65]), scale: "major", palette: all.filter((c) => ans.includes(c) || extra.includes(c)), bars: ans.length, answer: [...ans], inst: "piano", bpm: 88, beat: d > 0.5, skill: "u:progression:match" };
});

const FUNCTION_Q: Q[] = [
  { q: "What job does the V chord do?", a: "Dominant — tension that pulls back home", w: ["Tonic — it's home base", "Predominant — it steps away from home"], why: "V holds the leading tone (ti), which itches to rise to do. That's tension." },
  { q: "What job does the IV chord do?", a: "Predominant — it moves away and leads toward V", w: ["Tonic — it's home base", "Dominant — it's the most tense chord"], why: "IV and ii are predominants: they take you away from home and set up the dominant." },
  { q: "Which chord can stand in for I because it shares two of I's notes?", a: "vi", w: ["V", "ii"], why: "In C, I is C–E–G and vi is A–C–E: two notes in common. That's why vi feels like a darker home." },
  { q: "Which two chords do the dominant job in a major key?", a: "V and vii°", w: ["I and vi", "ii and IV"], why: "V and vii° both contain ti, the leading tone, so both pull toward I." },
  { q: "Home → away → tension → home. Which progression follows that path?", a: "I – IV – V – I", w: ["I – V – IV – I", "V – I – IV – V"], why: "I (tonic) → IV (predominant) → V (dominant) → I (tonic)." },
  { q: "ii and IV share a job. What is it?", a: "Predominant", w: ["Tonic", "Dominant"], why: "Both lead away from home toward V." },
  { q: "Which chord usually comes right before the final I of a song?", a: "V", w: ["vi", "iii"], why: "V → I is the strongest way home (an authentic cadence)." },
  { q: "Why are Roman numerals handy for songwriters?", a: "The same numerals work in every key", w: ["They're easier to read than letters", "They tell you how loud to play"], why: "I – V – vi – IV is the same progression in C, G or E♭. Change keys without rewriting anything." },
];
const functionQ = qT("g7-func-q", "u:progression:function", FUNCTION_Q);
/** Hear a progression's bass line (the chord roots) and play it back — songwriters hear the roots first. */
const bassEcho = topic("g7-bass-echo", (r) => {
  const id = pick(r, ["pop", "sad", "fifties", "primary"] as ProgId[]);
  const roots = PROGS[id].romans.map((ro) => romanChord(ro, 48).root);
  return { kind: "melody", mode: "echo", prompt: `This is the bass line of ${PROGS[id].name} in C — just the chord roots. Listen, then play it back.`, notes: roots, pads: scale(48, "major", 1), on: "keys", labels: "letters", inst: "piano", durs: roots.map(() => 1), bpm: 80, skill: "u:progression:bass" };
});
const functionSort = topic("g7-func-sort", (r) => {
  const f = pick(r, [0, 1, 2, -1]);
  const t = midiIn(keyTonicPc(f), 55);
  const chosen = [...pickN(r, ["I", "vi", "iii"], 2), ...pickN(r, ["ii", "IV"], 2), ...pickN(r, ["V", "vii°"], 2)];
  return sortItem(`Sort the chords of ${MAJ(f)} major by the job they do.`, FUNC_BINS, shuffle(r, chosen).map((ro) => {
    const c = romanChord(ro, t);
    return { id: ro, text: `${ro} — ${chordSym(c.root, c.q, f)}`, bin: chordFunction(ro) };
  }), "u:progression:function");
});
const diatonicBuild = topic("g7-diatonic-build", (r, d) => {
  const f = pick(r, [0, 1, 2, -1, -2]);
  const ro = pick(r, d < 0.4 ? ["IV", "V", "vi"] : ["ii", "iii", "IV", "V", "vi"]);
  const t = midiIn(keyTonicPc(f), 55);
  const c = romanChord(ro, t);
  let root = c.root;
  while (root > 67) root -= 12;
  const ps = chordPitches(root, c.q);
  return { kind: "keys", task: "chord", prompt: `In ${MAJ(f)} major, build the ${ro} chord.`, answer: ps, lo: 48, hi: 79, labels: true, octaveFree: true, skill: "u:chord:diatonic", why: `${ro} in ${MAJ(f)} major is ${chordWord(root, c.q, f)}: ${nms(ps, f)}. Lowercase numeral = minor.` };
});
const romanName = topic("g7-roman-name", (r) => {
  const f = pick(r, [0, 1, 2, 3, -1, -2, -3]);
  const all = ["ii", "iii", "IV", "V", "vi"];
  const ro = pick(r, all);
  const t = midiIn(keyTonicPc(f), 55);
  const c = romanChord(ro, t);
  const o = romanChord(pick(r, all.filter((x) => x !== ro)), t);
  const word = (q: ChordQuality) => (q === "min" ? "minor" : "major");
  return choose(r, {
    q: `In ${MAJ(f)} major, which chord is ${ro}?`,
    a: `${nm(c.root, f)} ${word(c.q)}`,
    w: [`${nm(c.root, f)} ${word(c.q === "min" ? "maj" : "min")}`, `${nm(o.root, f)} ${word(o.q)}`],
    why: `Count up the ${MAJ(f)} major scale to step ${["", "", "two", "three", "four", "five", "six"][["", "", "ii", "iii", "IV", "V", "vi"].indexOf(ro)]}: ${nm(c.root, f)}. ${ro === ro.toUpperCase() ? "Uppercase numeral = major." : "Lowercase numeral = minor."}`,
  }, "u:chord:diatonic");
});
const qualityEar = topic("g7-quality-ear", (r, d) => {
  const q: ChordQuality = r() < 0.5 ? "maj" : "min";
  const root = pick(r, [55, 57, 60, 62, 64]);
  const ps = chordPitches(root, q);
  return listen({ prompt: "Is this chord major or minor?", sound: then(melody(ps, 0.4, "piano", 96), chordSound(ps, "piano", 2.5, 96), 0), options: [opt("maj", "Major (bright)"), opt("min", "Minor (dark)")], answer: q, skill: "u:chord:quality", why: d < 0.5 ? "Major chords sound bright; minor chords sound darker — the middle note is one half step lower." : "The 3rd decides it: a major 3rd (4 half steps) is bright, a minor 3rd (3) is dark." });
});

// The blues, the Canon and ii – V – I.
const BLUES_Q: Q[] = [
  { q: "In a standard 12-bar blues, which bar brings the first change to IV?", a: "Bar 5", w: ["Bar 2", "Bar 9"], v: chordsShow(TWELVE), why: "Four bars of I, then two of IV (bars 5–6), two of I, then V – IV – I – V." },
  { q: "Which chord starts the last line (bar 9) of a 12-bar blues?", a: "V", w: ["IV", "I"], v: chordsShow(TWELVE), why: "Line three goes V – IV – I – V: the big tension, then the turnaround." },
  { q: "The 12-bar blues often ends on V in bar 12. Why?", a: "It's a turnaround — it pulls you back to the top", w: ["It means the song is over", "It changes the key"], v: chordsShow(TWELVE), why: "Ending a chorus on V creates tension that resolves when the next chorus starts on I." },
  { q: "Blues chords are usually dominant 7ths (I7, IV7, V7). What does the 7th add?", a: "A gritty, restless, bluesy edge", w: ["A brighter, sweeter sound", "A softer volume"], why: "The added minor 7th clashes a little with the root — that rub is the blues sound." },
  { q: "A 12-bar blues is three lines of how many bars each?", a: "4", w: ["3", "6"], v: chordsShow(TWELVE), why: "3 lines × 4 bars = 12. Blues lyrics often follow it: line, line repeated, answer." },
  { q: "Where did the blues grow up?", a: "In African American communities of the Deep South", w: ["In the royal courts of Vienna", "In 1990s recording studios"], why: "The blues grew from work songs, field hollers and spirituals around 1900 — and fed jazz, rock and roll, R&B and hip hop." },
];
const bluesQ = qT("g7-blues-q", "u:progression:blues", BLUES_Q);
const bluesEar = topic("g7-blues-ear", (r) => {
  const t = pick(r, [55, 57, 60]);
  const ans = pick(r, ["blues", "blues", "pop", "canon"]);
  const romans = ans === "blues" ? TWELVE : ans === "pop" ? ["I", "V", "vi", "IV", "I", "V", "vi", "IV"] : CANON;
  const WHY: Record<string, string> = { blues: "Four bars of I, two of IV, two of I, then V – IV – I – V: the 12-bar blues.", pop: "I – V – vi – IV, twice: the pop loop — even dressed up with a shuffle beat.", canon: "I – V – vi – iii – IV – I – IV – V: Pachelbel's Canon, wearing a blues costume." };
  return listen({
    prompt: "Same organ, same shuffle beat — but which chord progression is underneath?",
    sound: progression(romans, t, "major", { bpm: 120, per: 2, inst: "organ", style: "strum", bass: true, drums: "shuffle" }),
    options: [opt("blues", "12-bar blues"), opt("pop", "I – V – vi – IV loop"), opt("canon", "Pachelbel's Canon")],
    answer: ans,
    skill: "u:progression:blues",
    why: WHY[ans],
  });
});
const bluesOrder = topic("g7-blues-order", () => orderItem("Put the three lines of a 12-bar blues in order.", ["I – I – I – I", "IV – IV – I – I", "V – IV – I – V"], "u:progression:blues"));
const bluesMatch = topic("g7-blues-match", (r, d) => {
  const slice = d < 0.6 ? pick(r, [[4, 8], [8, 12]]) : [0, 12];
  const ans = TWELVE.slice(slice[0], slice[1]);
  return { kind: "chords", mode: "match", prompt: slice[1] - slice[0] === 12 ? "Lay out the whole 12-bar blues, one chord per bar." : `These are bars ${slice[0] + 1}–${slice[1]} of a 12-bar blues. Which chord is in each bar?`, tonic: pick(r, [55, 57, 60]), scale: "major", palette: ["I7", "IV7", "V7"], bars: ans.length, answer: ans, inst: "organ", bpm: 112, beat: true, skill: "u:progression:blues" };
});
const canonT = topic("g7-canon", (r, d) => {
  if (d < 0.3 || r() < 0.5) {
    const n = d < 0.6 ? 4 : 8;
    return { kind: "chords", mode: "match", prompt: n === 4 ? "Pachelbel's Canon (about 1700) opens with four chords. Rebuild them." : "Rebuild all eight chords of Pachelbel's Canon.", tonic: 62, scale: "major", palette: ["I", "ii", "iii", "IV", "V", "vi"], bars: n, answer: CANON.slice(0, n), inst: "strings", bpm: 80, skill: "u:progression:canon" };
  }
  const gap = pick(r, [3, 2, 6]);
  const shown = CANON.map((c, i) => (i === gap ? "?" : c)).join(" – ");
  const ans = CANON[gap];
  return choose(r, { q: `Pachelbel's Canon: ${shown}. Which chord is missing?`, a: ans, w: ["ii", "V", "iii", "vi", "I"].filter((x) => x !== ans).slice(0, 2), why: `The full pattern is ${CANON.join(" – ")}.` }, "u:progression:canon");
});
const iiVIEar = topic("g7-two-five-one", (r, d) => {
  const sets = [["ii", "V", "I", "I"], ["IV", "V", "I", "I"], ["vi", "V", "I", "I"]];
  const ans = pick(r, sets);
  const t = pick(r, [57, 60, 62, 65]);
  return listen({
    prompt: d < 0.5 ? "Jazz loves ii – V – I. Which one did you hear?" : "Which progression did you hear?",
    sound: prog(ans, t, "major", { bpm: 92 }),
    options: sets.map((s) => opt(s.join("-"), s.slice(0, 3).join(" – "), { show: chordsShow(s.slice(0, 3), t) })),
    answer: ans.join("-"),
    skill: "u:progression:jazz",
    why: "Listen to the first chord: ii and vi are minor (darker), IV is major (brighter).",
  });
});

/** Write a melody over a famous loop (it lands on do; every loop here ends on a chord that holds do). */
function loopComposeItem(id: ProgId): Activity {
  return { kind: "compose", prompt: `Write a melody over the ${PROGS[id].name} loop. Land on do (C) at the end.`, pitches: scale(60, "major", 1), slots: 8, dur: 1, inst: "marimba", bpm: 96, rules: [{ rule: "end", p: 60 }, { rule: "notes", min: 6 }], tonic: 60, labels: "letters", backing: progression(PROGS[id].romans, 60, "major", { bpm: 96, per: 2, inst: "guitar", style: "strum", bass: true, drums: "pop" }), skill: "u:compose:melody" };
}
const PROG_IDEA = idea("Chord progressions", [
  frame("A chord progression is the order chords go in. Roman numerals name each chord by its step in the scale: I is home, IV is step four, V is step five.", chordsShow(["I", "IV", "V", "I"]), progSound(["I", "IV", "V", "I"], 60)),
  frame("Uppercase numerals are major chords; lowercase are minor. In C major: I = C, ii = Dm, iii = Em, IV = F, V = G, vi = Am.", chordsShow(["I", "ii", "iii", "IV", "V", "vi"]), prog(["I", "ii", "iii", "IV", "V", "vi"], 60, "major", { per: 1, bpm: 84 })),
  frame("Each chord has a job. Tonic (I, vi) = home. Predominant (ii, IV) = stepping away. Dominant (V) = tension that wants to resolve home.", chordsShow(["I", "ii", "V", "I"]), progSound(["I", "ii", "V", "I"], 60)),
  frame("I – V – vi – IV: four chords behind a huge number of pop songs. The melody on top changes; the loop stays.", chordsShow(["I", "V", "vi", "IV"]), progression(["I", "V", "vi", "IV"], 60, "major", { bpm: 100, per: 4, inst: "guitar", style: "strum", bass: true, drums: "pop" })),
], "u:progression:idea");
const POP_IDEA = idea("The pop loop and its cousins", [
  frame("Rotate I – V – vi – IV to start on vi and it turns wistful: vi – IV – I – V.", chordsShow(["vi", "IV", "I", "V"]), progSound(["vi", "IV", "I", "V"], 60)),
  frame("I – vi – IV – V is the 1950s doo-wop progression — slow-dance music.", chordsShow(["I", "vi", "IV", "V"]), progression(["I", "vi", "IV", "V"], 60, "major", { bpm: 76, per: 3, inst: "piano", style: "waltz", bass: true, meter: [3, 4] })),
  frame("Same numerals, any key: I – V – vi – IV in G is G – D – Em – C. Songwriters think in numbers so they can move a song anywhere.", chordsShow(["I", "V", "vi", "IV"], 55), progSound(["I", "V", "vi", "IV"], 55)),
], "u:progression:idea");
const BLUES_IDEA = idea("Blues, Baroque and bebop", [
  frame("The 12-bar blues: four bars of I, two of IV, two of I, then V – IV – I – V. It powered the blues, early rock and roll and plenty since.", chordsShow(TWELVE), progression(TWELVE, 60, "major", { bpm: 132, per: 2, inst: "organ", style: "strum", bass: true, drums: "shuffle" })),
  frame("Pachelbel's Canon in D (about 1700): I – V – vi – iii – IV – I – IV – V. Three hundred years later, pop songs still borrow it.", chordsShow(CANON, 62), progression(CANON, 62, "major", { bpm: 76, per: 2, inst: "strings", style: "pad", bass: true })),
  frame("ii – V – I is the heartbeat of jazz: away, tension, home — usually with 7ths added for color.", chordsShow(["ii7", "V7", "Imaj7"]), prog(["ii7", "V7", "Imaj7", "Imaj7"], 60, "major", { bpm: 96 })),
], "u:progression:idea");
const WRITE_PROG_IDEA = idea("The songwriter's formula", [
  frame("Start home, wander away, build tension, come home: tonic → predominant → dominant → tonic. Then break the rules on purpose.", chordsShow(["I", "IV", "V", "I"]), prog(["I", "IV", "V", "I"], 60, "major", { inst: "guitar", style: "strum" })),
  frame("Country music runs on I, IV and V — often with a banjo picking along and a fiddle on top.", { show: "inst", ids: ["banjo", "violin"] }, piece("country")),
], "u:progression:idea");

const PROGRESSION_POINT: WorldDef = {
  id: "g7-progressions",
  title: "Progression Point",
  emoji: "🎹",
  grade: "7",
  items: 8,
  theme: "coral",
  blurb: "The chord patterns behind thousands of songs — and how to write your own.",
  talk: ["Hum a song you love. Does it feel like it keeps looping the same few chords?", "Why might a songwriter start a progression on a minor chord instead of the home chord?"],
  challenge: "Play a song you like and count the chord changes in the chorus. Can you hear when it goes 'home'?",
  stages: [
    {
      title: "Four chords",
      emoji: "🎹",
      levels: 1,
      topics: [progMatch, functionQ, functionSort, qualityEar],
      fixed: (r) => [
        PROG_IDEA,
        { kind: "chords", mode: "match", prompt: "Here's I – V – vi – IV in C. Listen, then lay out the four chords.", tonic: 60, scale: "major", palette: ["I", "IV", "V", "vi"], bars: 4, answer: ["I", "V", "vi", "IV"], inst: "piano", bpm: 88, skill: "u:progression:match" },
        qualityEar.gen(r, 0.2),
        sortItem("Sort the chords of C major by the job they do.", FUNC_BINS, shuffle(r, ["I", "vi", "ii", "IV", "V", "vii°"]).map((ro) => { const c = romanChord(ro, 60); return { id: ro, text: `${ro} — ${chordSym(c.root, c.q)}`, bin: chordFunction(ro) }; }), "u:progression:function"),
        { kind: "keys", task: "chord", prompt: "Build vi in C major — the minor chord on la.", answer: [57, 60, 64], lo: 48, hi: 79, labels: true, octaveFree: true, skill: "u:chord:diatonic", why: "vi in C major is A minor: A – C – E." },
        famousPop.gen(r, 0.1),
        { kind: "chords", mode: "match", prompt: "Now the same chords, rotated. Lay out what you hear.", tonic: 60, scale: "major", palette: ["I", "IV", "V", "vi"], bars: 4, answer: ["vi", "IV", "I", "V"], inst: "piano", bpm: 88, skill: "u:progression:match" },
        choose(r, FUNCTION_Q[0], "u:progression:function"),
      ],
    },
    practice("The pop loop", "🌟", [famousPop, progMatch, functionQ, bassEcho, functionSort, diatonicBuild, romanName], { teach: POP_IDEA, titles: ["The pop loop", "Hall of fame"] }),
    practice("Blues, canon and jazz", "🎸", [bluesQ, bluesEar, bluesMatch, canonT, iiVIEar, bluesOrder, famousAll], { teach: BLUES_IDEA, titles: ["Twelve bars", "Canon and ii–V–I"] }),
    {
      title: "Write your progression",
      emoji: "🖋️",
      levels: 1,
      topics: [topic("g7-country-style", (r) => genreItem(r, ["country", "blues", "rock", "gospel", "reggae"], "u:genre:progressions")), topic("g7-loop-compose", (r) => loopComposeItem(pick(r, ["pop", "primary", "jazz"] as ProgId[])))],
      unlocks: ["groove:country", "inst:banjo"],
      fixed: (r) => [
        WRITE_PROG_IDEA,
        { kind: "chords", mode: "build", prompt: "Write 4 bars in C: start on I, use IV, and end with V → I.", tonic: 60, scale: "major", palette: ["I", "ii", "IV", "V", "vi"], bars: 4, rules: [{ rule: "start", chord: "I" }, { rule: "use", chords: ["IV"] }, { rule: "cadence", kind: "authentic" }], inst: "piano", bpm: 92, skill: "u:progression:create" },
        loopComposeItem("pop"),
        { kind: "chords", mode: "build", prompt: "8 bars in G major: use vi and ii somewhere, and finish with V → I.", tonic: 55, scale: "major", palette: ["I", "ii", "iii", "IV", "V", "vi"], bars: 8, rules: [{ rule: "use", chords: ["vi", "ii"] }, { rule: "cadence", kind: "authentic" }], inst: "guitar", bpm: 100, skill: "u:progression:create" },
        listen({ prompt: "Country's favorite picker: which instrument is this?", sound: progression(["I", "IV", "V", "I"], 67, "major", { bpm: 116, per: 2, inst: "banjo", style: "arp" }), options: [instOpt("banjo"), instOpt("guitar"), instOpt("harp")], answer: "banjo", skill: "u:genre:country", why: "The banjo's bright, twangy plucking is the sound of bluegrass and country." }),
        { kind: "chords", mode: "build", prompt: "Write your own 12-bar blues: start on I7, use IV7 and V7, and end on V7 to turn around.", tonic: 55, scale: "major", palette: ["I7", "IV7", "V7"], bars: 12, rules: [{ rule: "start", chord: "I7" }, { rule: "use", chords: ["IV7", "V7"] }, { rule: "end", chord: "V7" }], inst: "organ", bpm: 112, beat: true, skill: "u:progression:create" },
        { kind: "chords", mode: "build", prompt: "The wistful loop: write 4 bars that START on vi and end on V.", tonic: 62, scale: "major", palette: ["I", "ii", "IV", "V", "vi"], bars: 4, rules: [{ rule: "start", chord: "vi" }, { rule: "end", chord: "V" }], inst: "piano", bpm: 88, skill: "u:progression:create" },
        genreItem(r, ["country", "blues", "rock", "gospel"], "u:genre:progressions"),
      ],
    },
  ],
};

// ── Lyric Lagoon ────────────────────────────────────────────────────────────────────────────
/** Original lyric lines: syllables, one length per syllable (beats), a tune, and where the
 *  natural word stresses fall (checked against the strong beats — good prosody). */
type LyricLine = { text: string; syl: string[]; durs: number[]; ps: number[]; meter: Meter; stress: number[] };
const LL = (text: string, syl: string[], durs: number[], ps: number[], stress: number[], meter: Meter = [4, 4]): LyricLine => ({ text, syl, durs, ps, meter, stress });
const LINES: LyricLine[] = [
  LL("Lighthouse shining, guide me home", ["Light", "house", "shin", "ing", "guide", "me", "home"], [1, 1, 1, 1, 1, 1, 2], [67, 64, 69, 67, 65, 62, 60], [0, 2, 4, 6]),
  LL("Sailing away on the morning tide", ["Sail", "ing", "a", "way", "on", "the", "morn", "ing", "tide"], [1, 0.5, 0.5, 1, 0.5, 0.5, 1, 1, 2], [60, 62, 64, 67, 65, 64, 62, 64, 60], [0, 3, 6, 8]),
  LL("Gulls are circling over the bay", ["Gulls", "are", "cir", "cling", "o", "ver", "the", "bay"], [1, 1, 1, 1, 1, 0.5, 0.5, 2], [72, 71, 69, 67, 65, 64, 62, 60], [0, 2, 4, 7]),
  LL("Stars above the quiet harbor", ["Stars", "a", "bove", "the", "qui", "et", "har", "bor"], [1.5, 0.5, 1, 1, 1, 1, 1, 1], [64, 65, 67, 64, 69, 67, 65, 64], [0, 2, 4, 6]),
  LL("Sing it out to sea", ["Sing", "it", "out", "to", "sea"], [1, 1, 1, 1, 4], [67, 67, 72, 71, 72], [0, 2, 4]),
  LL("Rain on the window", ["Rain", "on", "the", "win", "dow"], [1, 0.5, 0.5, 1, 1], [64, 62, 60, 67, 64], [0, 3]),
  LL("Carry me over the ocean", ["Car", "ry", "me", "o", "ver", "the", "o", "cean"], [1, 0.5, 0.5, 1, 0.5, 0.5, 3, 1], [60, 62, 64, 65, 67, 69, 67, 64], [0, 3, 6]),
  LL("Making music in the morning", ["Mak", "ing", "mu", "sic", "in", "the", "morn", "ing"], [1, 1, 1, 0.5, 0.25, 0.25, 3, 1], [62, 64, 65, 64, 62, 60, 67, 65], [0, 2, 6]),
  LL("Rock-a-bye, little boat", ["Rock", "a", "bye", "lit", "tle", "boat"], [1, 1, 1, 2, 1, 3], [67, 64, 60, 62, 64, 60], [0, 3, 5], [3, 4]),
  LL("Dance on the deck of the ship", ["Dance", "on", "the", "deck", "of", "the", "ship"], [1, 1, 1, 1, 1, 1, 3], [60, 64, 67, 72, 67, 64, 60], [0, 3, 6], [3, 4]),
  LL("Sleep now, the sea is still", ["Sleep", "now", "the", "sea", "is", "still"], [2, 0.5, 0.5, 2, 1, 3], [67, 65, 64, 67, 69, 72], [0, 3, 5], [3, 4]),
  LL("Glittering, glimmering waves in the sun", ["Glit", "ter", "ing", "glim", "mer", "ing", "waves", "in", "the", "sun"], [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1.5], [72, 71, 69, 71, 69, 67, 69, 67, 65, 64], [0, 3, 6, 9], [6, 8]),
];
const lyricBpm = (l: LyricLine) => (l.meter[1] === 8 ? 132 : l.meter[0] === 3 ? 108 : 96);
function stressItem(l: LyricLine): Activity {
  return { kind: "lyrics", mode: "stress", prompt: `“${l.text}” — tap the syllables that land on the strong beats.`, syllables: l.syl, durs: l.durs, pitches: l.ps, stress: strongSyllables(l.durs, l.meter), bpm: lyricBpm(l), meter: l.meter, skill: "u:lyrics:stress" };
}
function fitItem(l: LyricLine): Activity {
  return { kind: "lyrics", mode: "fit", prompt: `Set the lyric “${l.text}”: put each syllable on its note.`, syllables: l.syl, durs: l.durs, pitches: l.ps, bpm: lyricBpm(l), meter: l.meter, skill: "u:lyrics:fit" };
}
const stressT = topic("g7-lyric-stress", (r) => stressItem(pick(r, LINES)));
const fitT = topic("g7-lyric-fit", (r) => fitItem(pick(r, LINES)));

/** Lines whose syllable count nobody could argue about ("glittering" can be said with 2 or 3). */
const COUNT_LINES = LINES.filter((l) => !/glitter/i.test(l.text));
const SYLLABLE_LINES: [string, number][] = [
  ...COUNT_LINES.map((l): [string, number] => [l.text, l.syl.length]),
  ["Harmony and melody", 7],
  ["The tide is turning", 5],
  ["We sang until the sun came up", 8],
  ["Ten thousand paper lanterns", 7],
  ["Hold on tight", 3],
  ["Silver moonlight on the water", 8],
];
const syllCount = topic("g7-syll-count", (r) => {
  const [text, n] = pick(r, SYLLABLE_LINES);
  return choose(r, { q: `How many syllables are in this line? “${text}”`, a: String(n), w: [String(n - 1), String(n + 1)], why: "Clap it as you say it — one clap per syllable. Matching syllables to notes is the first rule of setting lyrics." }, "u:syllables:count");
});
const syllFit = topic("g7-syll-fit", (r) => {
  const target = pick(r, COUNT_LINES);
  const n = target.syl.length;
  const others = shuffle(r, SYLLABLE_LINES.filter(([, k]) => k !== n));
  const wrong: string[] = [];
  for (const [t, k] of others) if (wrong.length < 2 && !wrong.some((w) => SYLLABLE_LINES.find(([x]) => x === w)?.[1] === k)) wrong.push(t);
  return listen({
    prompt: "This melody has one note for every syllable. Which line fits it exactly?",
    sound: melody(target.ps, target.durs, "flute", lyricBpm(target)),
    options: shuffle(r, [target.text, ...wrong]).map((t) => opt(t, t)),
    answer: target.text,
    skill: "u:syllables:fit",
    why: `Count the notes: ${n}. “${target.text}” has ${n} syllables.`,
    layout: "list",
  });
});

const SCHEMES: { lines: string; scheme: string }[] = [
  { lines: "The tide rolls in, the tide rolls out / the gulls all laugh and turn about / the sun goes down behind the bay / and that's the end of one more day", scheme: "AABB" },
  { lines: "I packed my bag and left at dawn / my boots were wet, my map was drawn / I followed every star I knew / until the harbor came in view", scheme: "AABB" },
  { lines: "The lighthouse blinks across the night / the fog rolls in so cold and gray / it sweeps the dark with silver light / and shows the boats the way", scheme: "ABAB" },
  { lines: "We sang a song about the sea / the waves kept time below / the wind joined in, so wild and free / and carried it on slow", scheme: "ABAB" },
  { lines: "My little boat is made of wood / it's painted red and blue / it rocks me when the sea is rough / and brings me home to you", scheme: "ABCB" },
  { lines: "The morning starts with seagull cries / the market fills with noise / and all the fishing boats come in / to cheers from girls and boys", scheme: "ABCB" },
  { lines: "Sing it high and sing it low / sing it fast and sing it slow / let the music start to flow / everywhere the wind can go", scheme: "AAAA" },
  { lines: "I left my heart beside the shore / where children play in summer sun / and every day when work is done / I hear the ocean's gentle roar", scheme: "ABBA" },
];
const schemeQ = topic("g7-rhyme-scheme", (r) => {
  const s = pick(r, SCHEMES);
  return choose(r, { q: `What's the rhyme scheme? “${s.lines}”`, a: s.scheme, w: ["AABB", "ABAB", "ABCB", "AAAA", "ABBA"].filter((x) => x !== s.scheme).slice(0, 2 + Math.floor(r() * 2)), why: "Give the first line's last sound the letter A. Each new ending sound gets the next letter; a rhyme reuses its letter." }, "u:lyrics:rhyme-scheme");
});
const PERFECT: [string, string][] = [["sea", "free"], ["light", "night"], ["shore", "more"], ["wave", "brave"], ["tide", "wide"], ["boat", "float"], ["sing", "ring"], ["home", "foam"], ["day", "away"], ["star", "far"]];
const SLANT: [string, string][] = [["home", "alone"], ["time", "mine"], ["heart", "hard"], ["boat", "road"], ["sun", "young"], ["shore", "storm"], ["night", "life"], ["wave", "rain"]];
const rhymeKind = topic("g7-rhyme-kind", (r, d) => {
  if (d < 0.5 || r() < 0.5) {
    const perfect = r() < 0.5;
    const [a, b] = pick(r, perfect ? PERFECT : SLANT);
    return choose(r, { q: `“${a}” and “${b}” — what kind of rhyme?`, a: perfect ? "Perfect rhyme" : "Slant (near) rhyme", w: [perfect ? "Slant (near) rhyme" : "Perfect rhyme", "No rhyme at all"], why: "A perfect rhyme matches the vowel AND the ending sound (light / night). A slant rhyme only comes close (home / alone) — songwriters use both." }, "u:lyrics:rhyme");
  }
  const [a, b] = pick(r, PERFECT);
  const slants = pickN(r, SLANT.filter(([x, y]) => x !== a && y !== b), 2).map(([, y]) => y);
  return choose(r, { q: `Which word is a PERFECT rhyme for “${a}”?`, a: b, w: slants.filter((x) => x !== b), why: `“${a}” / “${b}” match the vowel and the ending sound exactly.` }, "u:lyrics:rhyme");
});
const INTERNAL_YES = ["The night was bright beneath the moon", "We sail the gale until we find the shore", "My heart can start to sing again", "I took a look inside the book", "Cold, bold sailors know the way"];
const INTERNAL_NO = ["The fishing nets are hung to dry", "We waited for the morning light", "The captain called across the deck", "Seagulls circle over the pier", "A lantern swings above the door"];
const internalQ = topic("g7-internal-rhyme", (r) => {
  const a = pick(r, INTERNAL_YES);
  return choose(r, { q: "Which line has an internal rhyme — two rhyming words inside the same line?", a, w: pickN(r, INTERNAL_NO, 2), why: "Internal rhymes (night / bright, sail / gale) add bounce in the middle of a line, not just at the end. Rappers are masters of them." }, "u:lyrics:internal");
});

const HOOK_Q: Q[] = [
  { q: "What is a song's hook?", a: "The short, catchy line or riff you can't stop humming", w: ["The first line of the second verse", "The guitar solo near the end"], why: "The hook is the earworm — usually short, repeated and easy to sing." },
  { q: "Where does the hook usually appear?", a: "In the chorus, often more than once", w: ["Only in the intro", "Only in the last line of the song"], why: "The chorus repeats, so the hook gets heard again and again." },
  { q: "Many songwriters make the hook the song's…", a: "Title", w: ["Key signature", "First verse"], why: "When the hook is the title, people know what to search for after they hear it." },
  { q: "Which line works best as a hook?", a: "Lighthouse, lead me home", w: ["I walked to the end of the dock on a Tuesday afternoon", "And then after that we went inside"], why: "Short, emotional, easy to sing — and it sounds like a title." },
  { q: "Chorus: “Lighthouse, lead me home / when the night is cold / Lighthouse, lead me home / I'm tired and I'm old.” Which line is the hook?", a: "Lighthouse, lead me home", w: ["when the night is cold", "I'm tired and I'm old"], why: "It's the line that repeats — and it's the title." },
  { q: "What helps a hook stick in people's heads?", a: "Repetition and a simple, singable rhythm", w: ["Lots of long, fancy words", "Changing the words every time"], why: "Repetition + simplicity = memorable." },
];
const hookQ = qT("g7-hook", "u:lyrics:hook", HOOK_Q);
const IMAGERY_Q: Q[] = [
  { q: "Which line SHOWS a feeling instead of just naming it?", a: "My coffee's cold, your chair is empty", w: ["I feel so lonely without you", "I am very sad today"], why: "Concrete details — things you can see, hear and touch — let listeners feel it for themselves." },
  { q: "Which line paints the strongest picture?", a: "Sunburned shoulders, salt in our hair", w: ["Summer was really fun", "We had a good time at the beach"], why: "Show, don't tell: specific images beat general words." },
  { q: "Which line SHOWS the storm?", a: "Lightning cracks the sky in half", w: ["The storm was big and scary", "It was very bad weather"], why: "A strong verb (cracks) and a clear image do the work." },
  { q: "Which line shows nerves without saying “nervous”?", a: "My hands are shaking on the microphone", w: ["I was really nervous", "I felt a lot of stress"], why: "Let the listener figure out the feeling from what they can picture." },
  { q: "Which line makes you SEE the place?", a: "Peeling paint and a rusty bell on the old pier", w: ["It was a nice old place", "The harbor was pretty cool"], why: "Details (peeling paint, a rusty bell) put the listener right there." },
];
const imageryQ = qT("g7-imagery", "u:lyrics:imagery", IMAGERY_Q);
const VERSE_LINES = ["It was six a.m. when the ferry left the dock", "My grandpa built this boat in nineteen sixty-two", "The radio crackled with a storm report", "We packed the cooler, the maps and the rope", "Second day out, and the wind died down", "Mom waved from the window, then the house was gone"];
const CHORUS_LINES = ["Lighthouse, lead me home", "Sing it out, sing it out to sea", "We are the tide, we never stop", "Hold on, hold on, the morning's coming", "Oh, carry me, carry me over", "Home, home, the harbor lights are home"];
const sectionSort = topic("g7-verse-chorus", (r) =>
  sortItem("Verse or chorus? Verses tell the story with details; the chorus sums up the big feeling and repeats.", [{ id: "verse", label: "Verse (story details)" }, { id: "chorus", label: "Chorus (big, repeated idea)" }], shuffle(r, [...pickN(r, VERSE_LINES, 2).map((t) => ({ id: t, text: t, bin: "verse" })), ...pickN(r, CHORUS_LINES, 2).map((t) => ({ id: t, text: t, bin: "chorus" }))]), "u:lyrics:sections"),
);
const PROSODY_Q: Q[] = [
  { q: "Which way do we naturally say this word?", a: "to-MOR-row", w: ["TO-mor-row", "to-mor-ROW"], why: "The stressed syllable is the one that punches. Put it on a strong beat when you set it to music." },
  { q: "Which way do we naturally say this word?", a: "har-MON-i-ca", w: ["HAR-mon-i-ca", "har-mon-I-ca"], why: "har-MON-i-ca: the second syllable carries the stress." },
  { q: "Which way do we naturally say this word?", a: "mu-SI-cian", w: ["MU-si-cian", "mu-si-CIAN"], why: "mu-SI-cian. Setting it MU-si-cian would sound like a robot singing." },
  { q: "Which way do we naturally say this word?", a: "ad-VEN-ture", w: ["AD-ven-ture", "ad-ven-TURE"], why: "ad-VEN-ture: the middle syllable carries the stress, so it belongs on a strong beat." },
  { q: "CAPITALS = strong beats. Which setting sounds natural?", a: "SAIL-ing a-WAY on the MORN-ing TIDE", w: ["sail-ING a-way ON the morn-ING tide", "SAIL-ing A-way on THE morn-ing TIDE"], why: "Natural word stress (SAIL-ing, a-WAY, MORN-ing) lands on the strong beats. That match is called prosody." },
  { q: "CAPITALS = strong beats. Which setting sounds natural?", a: "LIGHT-house SHIN-ing, GUIDE me HOME", w: ["light-HOUSE shin-ING, guide ME home", "LIGHT-HOUSE shin-ing GUIDE ME home"], why: "Strong syllables on strong beats — the words sing the way you'd say them." },
];
const prosodyQ = qT("g7-prosody", "u:lyrics:stress", PROSODY_Q);
const hookEcho = topic("g7-hook-echo", (r) => {
  const l = pick(r, LINES.filter((x) => x.syl.length <= 7));
  return { kind: "melody", mode: "echo", prompt: `Learn the tune for “${l.text}”: listen, then play it back on the bells.`, notes: l.ps, pads: scale(60, "major", 1), on: "bells", labels: "solfege", tonic: 60, durs: l.durs, bpm: lyricBpm(l), skill: "u:lyrics:melody" };
});

const PROSODY_IDEA = idea("Words that sing", [
  frame("Every word has a natural stress: LIGHT-house, to-MOR-row, har-MON-i-ca. Say them out loud — one syllable punches harder.", { show: "pics", emoji: "🗣️" }, rhythm(["ta", "ta", "taa"], { drum: "tom", bpm: 92 })),
  frame("Music has strong beats too. In 4/4, beats 1 and 3 are the strong ones.", { show: "beats", n: 4, accent: [0, 2] }, beat({ kick: "x...x...", rim: "..x...x." }, { bpm: 96, per: 2, times: 2 })),
  frame("Great lyrics line them up: stressed syllables on strong beats. “LIGHT-house SHIN-ing, GUIDE me HOME.”", { show: "beats", n: 4, accent: [0, 2] }, melody(LINES[0].ps, LINES[0].durs, "flute", 96)),
  frame("Get it wrong and the words trip over the beat — “light-HOUSE shin-ING.” Songwriters call the match prosody.", { show: "pics", emoji: "🎤" }, melody([60, 67, 60, 67, 60, 67, 60], [0.5, 1, 0.5, 1, 0.5, 1, 1.5], "flute", 96)),
], "u:lyrics:idea");
const RHYME_IDEA = idea("Rhyme", [
  frame("A rhyme scheme labels line endings with letters. Same ending sound, same letter: day / way / sea / free = AABB.", { show: "form", sections: ["A", "A", "B", "B"] }, melody([67, 64, 67, 64, 69, 65, 69, 65], 1, "marimba", 104)),
  frame("ABAB alternates. ABCB only rhymes lines 2 and 4 — the classic ballad shape.", { show: "form", sections: ["A", "B", "C", "B"] }, melody([64, 67, 65, 67], 2, "marimba", 104)),
  frame("Perfect rhymes match exactly (light / night). Slant rhymes come close (home / alone). Internal rhymes hide inside a line: “The NIGHT was BRIGHT.”", { show: "pics", emoji: "🎶" }),
], "u:lyrics:idea");
const HOOK_IDEA = idea("Hooks and pictures", [
  frame("The hook is the line everyone remembers — short, singable, repeated, and very often the title.", { show: "pics", emoji: "🎣" }, melody([67, 67, 72, 71, 72], [1, 1, 1, 1, 4], "synth", 104)),
  frame("Verses tell the story with details that change each time. The chorus delivers the big feeling — same words every time.", { show: "form", sections: ["verse", "chorus", "verse", "chorus"] }),
  frame("Show, don't tell: “My coffee's cold, your chair is empty” hits harder than “I'm lonely.”", { show: "pics", emoji: "☕" }),
], "u:lyrics:idea");
const CHORUS_IDEA = idea("Write a chorus", [
  frame("A chorus recipe: a hook (your title), a rhyme, one strong image, and the big feeling.", { show: "pics", emoji: "✍️" }),
  frame("Then give the most important word the most important note — often the highest note of the song. You just unlocked high mi for exactly that.", { show: "ladder", tonic: 60, steps: [0, 2, 4, 5, 7, 9, 11, 12, 14, 16], lit: [16] }, melody([60, 64, 67, 72, 76, 72], [0.5, 0.5, 0.5, 0.5, 2, 2], "choir", 96)),
], "u:lyrics:idea");

const LYRIC_LAGOON: WorldDef = {
  id: "g7-lyrics",
  title: "Lyric Lagoon",
  emoji: "✍️",
  grade: "7",
  items: 8,
  theme: "kelp",
  blurb: "Hooks, rhymes, imagery — and words that sit right on the beat.",
  talk: ["What's a song lyric that stuck in your head? What made it stick?", "Can you describe your day in one line that SHOWS a feeling instead of naming it?"],
  challenge: "Write a four-line chorus about something you saw today. Use one rhyme and one detail someone could picture.",
  stages: [
    {
      title: "Words that sing",
      emoji: "🗣️",
      levels: 1,
      topics: [stressT, fitT, prosodyQ, syllCount, syllFit],
      fixed: (r) => [PROSODY_IDEA, stressItem(LINES[0]), choose(r, PROSODY_Q[0], "u:lyrics:stress"), fitItem(LINES[1]), choose(r, PROSODY_Q[4], "u:lyrics:stress"), syllCount.gen(r, 0.2), stressItem(LINES[8]), syllFit.gen(r, 0.3)],
    },
    practice("Rhyme time", "🎶", [schemeQ, rhymeKind, internalQ, syllCount, syllFit], { teach: RHYME_IDEA, titles: ["Rhyme schemes", "Perfect, slant and inside"] }),
    practice("Hooks and stress", "🎣", [stressT, fitT, hookQ, imageryQ, hookEcho, sectionSort, prosodyQ], { teach: HOOK_IDEA, titles: ["Hooks", "Show, don't tell"] }),
    {
      title: "Write a chorus",
      emoji: "🎤",
      levels: 1,
      topics: [topic("g7-lyric-compose", (r) => pick(r, [lyricCompose(0), lyricCompose(1)]))],
      unlocks: ["note:mi'", "inst:choir"],
      fixed: (r) => [
        CHORUS_IDEA,
        {
          kind: "slots",
          prompt: "Build an AABB chorus, one line at a time.",
          slots: [
            { label: "Line 1 — the hook (short, it's the title)", options: ["Lighthouse, lead me home", "I went down to the harbor after school", "Things were okay"], answer: "Lighthouse, lead me home", why: "Short, emotional, singable — a title." },
            { label: "Line 2 — an image that rhymes with “home”", options: ["Through the salt and foam", "Through the dark and rain", "Through the night"], answer: "Through the salt and foam", why: "home / foam rhyme (AA), and you can picture it." },
            { label: "Line 3 — start a new rhyme", options: ["When the night is cold", "When I have lots of feelings", "Um, yeah"], answer: "When the night is cold", why: "A clear, concrete setting — and a sound to rhyme with." },
            { label: "Line 4 — rhymes with line 3", options: ["Shine your light of gold", "Shine your light on me", "Shine on"], answer: "Shine your light of gold", why: "cold / gold completes the BB rhyme." },
          ],
          skill: "u:lyrics:write",
        },
        choose(r, { q: "The chorus you just built ends its lines with home / foam / cold / gold. What's its rhyme scheme?", a: "AABB", w: ["ABAB", "ABCB"], why: "home / foam rhyme (A A), then cold / gold (B B)." }, "u:lyrics:rhyme-scheme"),
        fitItem(LINES[0]),
        lyricCompose(0),
        {
          kind: "slots",
          prompt: "Now a verse (ABCB): details that set the scene.",
          slots: [
            { label: "Line 1 — where and when", options: ["Six a.m., the ferry horn", "Life is hard sometimes", "Feelings everywhere"], answer: "Six a.m., the ferry horn", why: "A time and a sound — the listener is right there." },
            { label: "Line 2 — the B rhyme", options: ["Gulls are on the pier", "Birds", "Gulls are flying everywhere I look all day"], answer: "Gulls are on the pier", why: "Short and concrete. Its last word (pier) sets up the rhyme for line 4." },
            { label: "Line 3 — no rhyme needed", options: ["Grandpa's coat is on my back", "I am a person", "Grandpa's coat is on my back and it is very big and warm"], answer: "Grandpa's coat is on my back", why: "A detail that hints at a story without spelling it out." },
            { label: "Line 4 — rhymes with line 2", options: ["The morning's finally here", "The morning came today", "Morning"], answer: "The morning's finally here", why: "pier / here: the B rhyme lands." },
          ],
          skill: "u:lyrics:write",
        },
        stressItem(LINES[3]),
        lyricCompose(1),
      ],
    },
  ],
};
/** Set a trochaic line (STRONG-weak) to music: one note per syllable, reach for the new high mi. */
function lyricCompose(i: number): Activity {
  const lyric = i === 0 ? ["Shin", "ing", "light", "house", "guide", "me", "home", "ward"] : ["Sing", "it", "out", "and", "sing", "it", "loud", "er"];
  const pitches = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76];
  return {
    kind: "compose",
    prompt: i === 0 ? "Set “Shining lighthouse, guide me homeward” — one note per syllable. Give one word the new high mi, and end on do." : "Set “Sing it out and sing it louder.” Use high mi for the big moment and finish on do.",
    pitches,
    slots: 8,
    dur: 1,
    inst: "choir",
    bpm: 92,
    rules: [{ rule: "use", pitches: [76] }, { rule: "end", p: i === 0 ? 60 : 72 }, { rule: "notes", min: 7 }],
    tonic: 60,
    labels: "solfege",
    backing: prog(["I", "IV", "V", "I"], 60, "major", { bpm: 92, inst: "piano", style: "arp" }),
    lyric,
    skill: "u:compose:lyrics",
  };
}

// ── Arrangement Archipelago ─────────────────────────────────────────────────────────────────
type SectionId = "intro" | "verse" | "pre-chorus" | "chorus" | "bridge" | "outro";
function popSections(t = 60, bpm = 108): Record<SectionId, Score> {
  const ch = (romans: string[], o: Parameters<typeof progression>[3]) => progression(romans, t, "major", { bpm, per: 2, ...o });
  const kit = (rows: Partial<Record<DrumId, string>>) => beat(rows, { bpm, per: 2, times: 2 });
  return {
    intro: withGain(ch(["I", "V", "vi", "IV"], { inst: "pad", style: "pad" }), 0.8),
    verse: layer(ch(["I", "V", "vi", "IV"], { inst: "guitar", style: "strum", bass: true }), kit({ kick: "x...x...", hat: "x.x.x.x." })),
    "pre-chorus": hairpin(layer(ch(["ii", "IV", "V", "V"], { inst: "piano", style: "pulse", bass: true }), kit({ kick: "x...x...", snare: "x.x.x.x." })), 0.45, 1),
    chorus: layer(ch(["I", "V", "vi", "IV"], { inst: "piano", style: "pulse", bass: true, drums: "pop" }), { bpm, tracks: [notesTrack("synth", line(t + 12, "7/1 7/0.5 9/0.5 7/1 4/1 5/1 4/0.5 2/0.5 0/2"), 0.8)] }),
    bridge: layer(ch(["IV", "V", "iii", "vi"], { inst: "strings", style: "pad", bass: true }), kit({ kick: "x.......", snare: "....x..." })),
    outro: hairpin(ch(["IV", "V", "I", "I"], { inst: "piano", style: "arp" }), 0.9, 0.2),
  };
}
const SEC = popSections();
const SEC_NAME: Record<SectionId, string> = { intro: "Intro", verse: "Verse", "pre-chorus": "Pre-chorus", chorus: "Chorus", bridge: "Bridge", outro: "Outro" };
const POP_FORMS: SectionId[][] = [
  ["verse", "chorus", "verse", "chorus"],
  ["intro", "verse", "chorus", "verse", "chorus"],
  ["verse", "pre-chorus", "chorus", "verse", "pre-chorus", "chorus"],
  ["intro", "verse", "chorus", "bridge", "chorus", "outro"],
  ["verse", "chorus", "bridge", "chorus"],
  ["intro", "verse", "pre-chorus", "chorus", "outro"],
  ["verse", "verse", "chorus", "bridge", "chorus"],
];
function formBuildItem(order: SectionId[], t = 60): Activity {
  const S = t === 60 ? SEC : popSections(t);
  const sections: Record<string, Score> = {};
  for (const s of order) sections[s] = S[s];
  return { kind: "form", mode: "build", prompt: "Listen to the whole song, then drag the sections into the order you heard.", sections, order: [...order], skill: "u:form:pop" };
}
const formBuildPop = topic("g7-form-pop", (r, d) => formBuildItem(pick(r, d < 0.4 ? POP_FORMS.slice(0, 2) : POP_FORMS), pick(r, [55, 57, 60, 62])));
const SECTION_WHY: Record<SectionId, string> = { intro: "Intros are sparse — just enough to set the mood before the voice comes in.", verse: "Verses are lighter: a groove and chords, leaving room for the story.", "pre-chorus": "The pre-chorus builds energy toward the chorus.", chorus: "The chorus is the fullest part: drums, bass, chords AND the hook melody.", bridge: "The bridge brings new chords and a different feel before the last chorus.", outro: "The outro winds the song down." };
function sectionEarItem(ans: SectionId, pool: SectionId[], t = 60): Activity {
  const S = t === 60 ? SEC : popSections(t);
  return listen({ prompt: pool.length === 2 ? `${SEC_NAME[pool[0]]} or ${SEC_NAME[pool[1]].toLowerCase()}? Listen to how full it is.` : "Which section of the song is this?", sound: S[ans], options: pool.map((s) => opt(s, SEC_NAME[s])), answer: ans, skill: "u:form:sections", why: SECTION_WHY[ans] });
}
const sectionEar = topic("g7-section-ear", (r, d) => {
  const pool: SectionId[] = d < 0.35 ? ["verse", "chorus"] : d < 0.6 ? ["intro", "verse", "chorus"] : ["intro", "verse", "chorus", "bridge"];
  return sectionEarItem(pick(r, pool), pool, pick(r, [57, 60, 62]));
});
function letterSections(t = 60, bpm = 112): Record<"A" | "B" | "C", Score> {
  const ch = (romans: string[], inst: InstId) => progression(romans, t, "major", { bpm, per: 2, inst, style: "block", bass: true });
  return {
    A: layer(ch(["I", "I", "IV", "V"], "piano"), { bpm, tracks: [notesTrack("marimba", line(t + 12, "0 4 7 4 5 9 7/2"), 0.9)] }),
    B: layer(ch(["vi", "IV", "ii", "V"], "pad"), { bpm, tracks: [notesTrack("strings", line(t + 12, "9/1.5 7/0.5 5/1 4/1 2/1.5 4/0.5 5/2"), 0.9)] }),
    C: layer(ch(["IV", "IV", "V", "I"], "piano"), { bpm, tracks: [notesTrack("trumpet", line(t, "7/0.5 7/0.5 7/0.5 12/1.5 r/1 11/0.5 9/0.5 7/1 12/2"), 0.9)] }),
  };
}
const LETTER_FORMS = ["AB", "ABA", "AABA", "ABACA", "ABAB", "AABB", "AAA"];
function formLabelItem(r: Rng, form: string, t = 60): Activity {
  const L = letterSections(t);
  const order = form.split("");
  const sections: Record<string, Score> = {};
  for (const s of order) sections[s] = L[s as "A" | "B" | "C"];
  const options = shuffle(r, [form, ...pickN(r, LETTER_FORMS, 2, (x) => x === form)]);
  return { kind: "form", mode: "label", prompt: "Listen to the sections. Which form is it?", sections, order, options, answer: form, skill: "u:form:label" };
}
const formLabel = topic("g7-form-label", (r, d) => formLabelItem(r, pick(r, d < 0.4 ? ["AB", "ABA", "ABAB"] : LETTER_FORMS), pick(r, [57, 60, 62])));
const FORM_Q: Q[] = [
  { q: "What's a pre-chorus for?", a: "Building tension so the chorus hits harder", w: ["Ending the song", "Repeating the intro"], why: "The pre-chorus is a ramp: rising melody, busier drums, chords that lean toward the chorus." },
  { q: "What does a bridge usually bring?", a: "Something new — different chords or a different feel", w: ["The exact same music as the chorus", "Silence"], why: "The bridge gives contrast, so the final chorus feels fresh again." },
  { q: "Which section usually repeats the same words every time?", a: "The chorus", w: ["The verse", "The bridge"], why: "Verses change words to move the story; the chorus stays the same." },
  { q: "AABA (A, A, bridge, A) is called…", a: "32-bar song form", w: ["Rondo", "12-bar blues"], why: "Four 8-bar sections = 32 bars. Many jazz standards use it." },
  { q: "In a typical pop song, which section has the MOST going on?", a: "The final chorus", w: ["The intro", "The first verse"], why: "Arrangers save the biggest moment for the last chorus — every layer in." },
  { q: "ABACA, where A keeps returning, is called…", a: "Rondo form", w: ["Ternary form", "Strophic form"], why: "In a rondo the main theme comes back like a refrain between new episodes." },
  { q: "A song where every verse uses the same music (AAA…) is in…", a: "Strophic form", w: ["Binary form", "Rondo form"], why: "Strophic = same music, new words each verse — hymns and folk songs do it." },
];
const formFacts = qT("g7-form-facts", "u:form:facts", FORM_Q);
const formOrder = topic("g7-form-order", (r) => {
  const pick5 = pick(r, [["Intro", "Verse", "Pre-chorus", "Chorus", "Outro"], ["Intro", "Verse", "Chorus", "Bridge", "Outro"], ["Verse", "Pre-chorus", "Chorus", "Bridge", "Outro"]]);
  return orderItem("Put the sections in the order they usually appear in a pop song.", pick5, "u:form:order");
});

// Builds, drops and layers.
function buildClip(t = 57, bpm = 120): Score {
  const pad = progression(["i", "VI", "III", "VII"], t, "minor", { bpm, per: 4, inst: "synth", style: "pulse" });
  const sn = beat({ snare: "x...x...x...x...x.x.x.x.x.x.x.x.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }, { bpm, per: 4, times: 1 });
  return hairpin(layer(pad, sn), 0.3, 1);
}
function steadyClip(t = 57, bpm = 120): Score {
  return layer(progression(["i", "VI", "III", "VII"], t, "minor", { bpm, per: 4, inst: "synth", style: "pulse" }), beat({ kick: "x...x...x...x...", hat: "..x...x...x...x." }, { bpm, per: 4, times: 4 }));
}
function dropClip(t = 57, bpm = 120): Score {
  const short = hairpin(layer(progression(["VI", "VII"], t, "minor", { bpm, per: 4, inst: "synth", style: "pulse" }), beat({ snare: "x.x.x.x.x.x.x.x.xxxxxxxxxxxxxxxx" }, { bpm, per: 4, times: 1 })), 0.3, 0.9);
  const full = layer(progression(["i", "VI", "III", "VII"], t, "minor", { bpm, per: 4, inst: "pad", style: "pad", bass: true, drums: "edm" }), { bpm, tracks: [notesTrack("synthbass", line(t - 24, "r/0.5 0/0.5 r/0.5 0/0.5 r/0.5 0/0.5 r/0.5 0/0.5 r/0.5 8/0.5 r/0.5 8/0.5 r/0.5 8/0.5 r/0.5 8/0.5"), 1)] });
  return then(short, full, 0);
}
function fadeClip(t = 57, bpm = 120): Score {
  return then(hairpin(layer(progression(["VI", "VII"], t, "minor", { bpm, per: 4, inst: "synth", style: "pulse" }), beat({ snare: "x.x.x.x.x.x.x.x.xxxxxxxxxxxxxxxx" }, { bpm, per: 4, times: 1 })), 0.3, 0.9), hairpin(progression(["i", "VI"], t, "minor", { bpm, per: 4, inst: "pad", style: "pad" }), 0.5, 0.1), 0);
}
function breakdownClip(t = 57, bpm = 120): Score {
  return layer(progression(["i", "VI", "III", "VII"], t, "minor", { bpm, per: 4, inst: "pad", style: "pad" }), beat({ hat: "..x...x...x...x." }, { bpm, per: 4, times: 4 }));
}
const pair = (r: Rng, a: [string, Score], b: [string, Score]) => {
  const first = r() < 0.5;
  return first ? [soundOpt(a[0], a[1], "First"), soundOpt(b[0], b[1], "Second")] : [soundOpt(b[0], b[1], "First"), soundOpt(a[0], a[1], "Second")];
};
const buildEar = topic("g7-build-ear", (r, d) => {
  const t = pick(r, [55, 57, 60]);
  const kind = pick(r, d < 0.35 ? [0, 1] : [0, 1, 2, 3]);
  if (kind === 0) return listen({ prompt: "Which clip is a BUILD — rising energy that makes you lean forward?", options: pair(r, ["build", buildClip(t)], ["steady", steadyClip(t)]), answer: "build", skill: "u:production:build", why: "A build gets louder and busier — snare hits closer and closer together — so the next section feels like a release." });
  if (kind === 1) return listen({ prompt: "Which clip is the BREAKDOWN — the beat stripped away so the music can breathe?", options: pair(r, ["breakdown", breakdownClip(t)], ["full", steadyClip(t)]), answer: "breakdown", skill: "u:production:build", why: "A breakdown pulls out the kick and bass, leaving pads and a light hat — the calm before the next big section." });
  const end = pick(r, ["drop", "fade"]);
  if (kind === 2) return listen({ prompt: "Listen all the way through. What happens after the build?", sound: end === "drop" ? dropClip(t) : fadeClip(t), options: [opt("drop", "The drop — the full beat and bass slam in"), opt("fade", "It fades away into calm chords")], answer: end, skill: "u:production:drop", why: end === "drop" ? "The tension releases into the full groove: that's the drop." : "No drop here — the build melts away. Arrangers sometimes fake you out like this." });
  return listen({ prompt: "Both clips build up. Which one has the DROP — the moment the full beat and bass slam in?", options: pair(r, ["drop", dropClip(t)], ["fade", fadeClip(t)]), answer: "drop", skill: "u:production:drop", why: "After a build, the drop brings everything in at once — kick, bass, full chords." });
});
const layerOut = topic("g7-layer-out", (r) => {
  const t = pick(r, [57, 60, 62]);
  const inst = pick(r, LAYER_INSTS);
  const others = pickN(r, LAYER_INSTS, 2, (x) => x === inst);
  const base = progression(["I", "vi", "IV", "V", "I", "vi", "IV", "V"], t, "major", { bpm: 104, per: 2, inst: "piano", style: "block", bass: true, drums: "pop" });
  const mel = notesTrack(inst, line(Math.max(t, 60), "7/1 4/1 5/1 9/1 7/2 4/1 2/1"), 0.9);
  return listen({ prompt: "One layer DROPS OUT halfway through. Which instrument left?", sound: { ...base, tracks: [...base.tracks, mel] }, options: shuffle(r, [inst, ...others]).map((x) => instOpt(x)), answer: inst, skill: "u:production:layers", why: "Taking a layer away is as powerful as adding one — it gives the next part room to arrive." });
});
const PROD_Q: Q[] = [
  { q: "Why do producers often strip the drums out right before a drop?", a: "So the drop feels huge by contrast", w: ["To save electricity", "Because the drummer needs a break"], why: "Contrast creates impact: quiet → LOUD feels bigger than loud → loud." },
  { q: "What is a riser in a build?", a: "A sound that climbs in pitch or noise to raise tension", w: ["A drum that plays only on beat 1", "The quietest part of a song"], why: "Risers (sweeps, rising synths, snare rolls) tell the listener: something big is coming." },
  { q: "The last chorus of a song often adds…", a: "Extra layers — harmonies, more drums, a key change", w: ["Nothing — it's identical", "Silence"], why: "Arrangers save the biggest moment for last." },
  { q: "Why bring layers in one at a time in an intro?", a: "To build interest and let each part be heard", w: ["Because instruments arrive late to the studio", "To make the song shorter"], why: "Adding parts gradually creates a sense of growth and anticipation." },
  { q: "A breakdown is…", a: "A section where most of the beat drops out", w: ["When the computer crashes", "The loudest chorus"], why: "Breakdowns strip the arrangement back so the return of the full band hits hard." },
];
const prodFacts = qT("g7-prod-facts", "u:production:arrangement", PROD_Q);
const LAYER_INSTS: InstId[] = ["violin", "flute", "trumpet", "eguitar", "marimba", "sax", "cello", "synth", "harp"];
const layerIn = topic("g7-layer-in", (r) => {
  const t = pick(r, [57, 60, 62]);
  const inst = pick(r, LAYER_INSTS);
  const others = pickN(r, LAYER_INSTS, 2, (x) => x === inst);
  const base = progression(["I", "vi", "IV", "V", "I", "vi", "IV", "V"], t, "major", { bpm: 104, per: 2, inst: "piano", style: "block", bass: true, drums: "pop" });
  const lo = Math.max(t, 60);
  const mel = notesTrack(inst, line(lo, "7/1 4/1 5/1 9/1 7/2 4/1 2/1"), 0.9, 8);
  return listen({ prompt: "A new layer joins halfway through. Which instrument came in?", sound: { ...base, tracks: [...base.tracks, mel] }, options: shuffle(r, [inst, ...others]).map((x) => instOpt(x)), answer: inst, skill: "u:production:layers", why: "Producers bring layers in (and out) to keep a song growing. Listen for the new color halfway through." });
});
const layerCount = topic("g7-layer-count", (r, d) => {
  const t = pick(r, [57, 60, 62]);
  const n = pick(r, d < 0.5 ? [2, 3] : [2, 3, 4]);
  const parts: MTrack[] = [];
  const bpm = 100;
  const drums = beat({ kick: "x...x...", snare: "..x...x.", hat: "xxxxxxxx" }, { bpm, per: 2, times: 2 }).tracks[0];
  const bass = notesTrack("bass", line(t - 24, "0/2 0/2 5/2 7/2"), 0.9);
  const keys = progression(["I", "I", "IV", "V"], t, "major", { bpm, per: 2, inst: "piano", style: "block" }).tracks[0];
  const lead = notesTrack("flute", line(t + 12, "4/1 7/1 9/2 7/1 4/1 2/2"), 0.8);
  const pool = [drums, bass, keys, lead];
  for (const i of pickN(r, [0, 1, 2, 3], n)) parts.push(pool[i]);
  return listen({ prompt: "How many layers (separate parts) can you hear?", sound: { bpm, tracks: parts }, options: ["2", "3", "4"].map((x) => opt(x, x)), answer: String(n), skill: "u:production:layers", why: "Count the jobs: drums, bass, chords, melody. Each is one layer." });
});
const buildBeat = topic("g7-build-beat", (r) => {
  const v = pick(r, [0, 1]);
  return v === 0
    ? { kind: "beatlab", mode: "make", prompt: "Program a snare build: start sparse, and fill the whole last beat with sixteenths (steps 13–16).", rows: ["kick", "snare", "hat"], steps: 16, bpm: 120, rules: [{ rule: "on", row: "snare", steps: [12, 13, 14, 15] }, { rule: "count", row: "snare", min: 8 }], skill: "u:beatmaking:build" }
    : { kind: "beatlab", mode: "make", prompt: "Make a breakdown: no kick at all, keep a light hi-hat (4+ hits) and a couple of claps.", rows: ["kick", "clap", "hat"], steps: 16, bpm: 120, rules: [{ rule: "count", row: "kick", min: 0, max: 0 }, { rule: "count", row: "hat", min: 4 }, { rule: "count", row: "clap", min: 2 }], skill: "u:beatmaking:breakdown" };
});
const arrangeCompose = topic("g7-hook-compose", () => ({ kind: "compose", prompt: "Write the chorus hook: use high do for the peak, and repeat your first two notes later on (a motif).", pitches: scale(60, "major", 1), slots: 8, dur: 1, inst: "synth", bpm: 108, rules: [{ rule: "use", pitches: [72] }, { rule: "repeat", len: 2 }, { rule: "notes", min: 6 }], tonic: 60, labels: "letters", backing: progression(["I", "V", "vi", "IV"], 60, "major", { bpm: 108, per: 2, inst: "piano", style: "pulse", bass: true, drums: "pop" }), skill: "u:compose:hook" }));

const MAP_IDEA = idea("The map of a song", [
  frame("Most songs follow a map. The verse tells the story — new words each time, and a lighter arrangement.", { show: "form", sections: ["verse"] }, SEC.verse),
  frame("The chorus is the big moment: the hook, the most layers, and the same words every time.", { show: "form", sections: ["verse", "chorus"] }, SEC.chorus),
  frame("A pre-chorus builds tension into the chorus. A bridge brings something new before the last chorus.", { show: "form", sections: ["verse", "pre-chorus", "chorus", "bridge", "chorus"] }, then(SEC["pre-chorus"], SEC.chorus, 0)),
  frame("Intros and outros open and close the door. Put it together: intro, verse, chorus, verse, chorus, bridge, chorus, outro.", { show: "form", sections: ["intro", "verse", "chorus", "verse", "chorus", "bridge", "chorus", "outro"] }, SEC.intro),
], "u:form:idea");
const LETTER_IDEA = idea("Form in letters", [
  frame("Musicians label sections with letters. New music gets a new letter; music that returns gets its old letter back.", { show: "form", sections: ["A", "B", "A"] }, (() => { const L = letterSections(); return then(then(L.A, L.B, 0), L.A, 0); })()),
  frame("AABA — two A's, a contrasting bridge, A again — is the 32-bar form behind decades of standards. ABACA, with A returning between new ideas, is a rondo.", { show: "form", sections: ["A", "A", "B", "A"] }),
], "u:form:idea");
const ENERGY_IDEA = idea("Builds, drops and layers", [
  frame("Producers arrange by energy. A build stacks tension: snare hits get closer together and everything gets louder.", { show: "grid", rows: ["snare"], pattern: ["x...x...x.x.xxxx"] }, buildClip()),
  frame("The drop is the release — the full beat and bass slam in at once.", { show: "pics", emoji: "🎢" }, dropClip()),
  frame("Layers come in and out to keep things moving: a breakdown strips the beat away so the next chorus feels huge.", { show: "pics", emoji: "🎛️" }, breakdownClip()),
], "u:form:idea");
const ARRANGE_IDEA = idea("Arrange it", [
  frame("Start small, build, explode, breathe, explode bigger. That energy curve is what you'll arrange now.", { show: "form", sections: ["intro", "verse", "pre-chorus", "chorus", "bridge", "chorus"] }),
  frame("Two classic intro colors: a music box and plucked (pizzicato) strings. Both are yours after this level.", { show: "inst", ids: ["musicbox", "pizz"] }, layer(melody([72, 76, 79, 76, 74, 77, 81, 77], 0.5, "musicbox", 100), melody([48, 55, 53, 55], 1, "pizz", 100))),
], "u:form:idea");

const ARRANGEMENT_ARCHIPELAGO: WorldDef = {
  id: "g7-arrange",
  title: "Arrangement Archipelago",
  emoji: "🏝️",
  grade: "7",
  items: 8,
  theme: "jungle",
  blurb: "Intro, verse, chorus, bridge — and the builds and drops that make a song feel huge.",
  talk: ["Pick a song you love: where does it get bigger? What instruments come in?", "Why do you think so many songs put the catchiest part in the chorus?"],
  challenge: "Listen to one song all the way through and write its map: intro, verse, chorus… Where's the bridge?",
  stages: [
    {
      title: "The map of a song",
      emoji: "🗺️",
      levels: 1,
      topics: [sectionEar, formBuildPop, formFacts],
      fixed: (r) => [
        MAP_IDEA,
        sectionEarItem("chorus", ["verse", "chorus"]),
        formBuildItem(["verse", "chorus", "verse", "chorus"]),
        choose(r, FORM_Q[2], "u:form:facts"),
        sectionEarItem("intro", ["intro", "verse", "chorus"], 62),
        formBuildItem(["intro", "verse", "chorus", "outro"]),
        choose(r, FORM_Q[0], "u:form:facts"),
        formLabelItem(r, "ABAB"),
      ],
    },
    practice("Song forms", "🧩", [formBuildPop, sectionEar, formLabel, formFacts, formOrder], { teach: LETTER_IDEA, titles: ["Pop maps", "AABA and rondo"] }),
    practice("Builds and drops", "🎢", [buildEar, layerIn, prodFacts, layerCount, buildBeat, layerOut], { teach: ENERGY_IDEA, titles: ["Build it up", "Drop it"], unlocks: ["drum:cymbals"] }),
    {
      title: "Arrange it",
      emoji: "🏗️",
      levels: 1,
      topics: [arrangeCompose, buildBeat],
      unlocks: ["inst:pizz", "inst:musicbox"],
      fixed: (r) => [
        ARRANGE_IDEA,
        { kind: "beatlab", mode: "make", prompt: "Verse beat: keep it light. Hi-hat on every beat, kick on beat 1, and NO cymbal crashes yet.", rows: ["kick", "snare", "hat", "cymbals"], steps: 16, bpm: 108, rules: [{ rule: "on", row: "hat", steps: [0, 4, 8, 12] }, { rule: "on", row: "kick", steps: [0] }, { rule: "count", row: "cymbals", min: 0, max: 0 }, { rule: "total", min: 6, max: 12 }], skill: "u:beatmaking:verse" },
        { kind: "beatlab", mode: "make", prompt: "Chorus beat: everything in! A cymbal crash on beat 1, snare on 2 and 4, busy hats (8+), and at least 3 kicks.", rows: ["kick", "snare", "hat", "cymbals"], steps: 16, bpm: 108, rules: [{ rule: "on", row: "cymbals", steps: [0] }, { rule: "on", row: "snare", steps: [4, 12] }, { rule: "count", row: "hat", min: 8 }, { rule: "count", row: "kick", min: 3 }], skill: "u:beatmaking:chorus" },
        buildBeat.gen(r, 0),
        { kind: "chords", mode: "build", prompt: "Write a 4-bar bridge: DON'T start on I (bridges bring contrast) — start on IV and end on V to launch the last chorus.", tonic: 60, scale: "major", palette: ["I", "ii", "iii", "IV", "V", "vi"], bars: 4, rules: [{ rule: "start", chord: "IV" }, { rule: "end", chord: "V" }, { rule: "use", chords: ["vi"] }], inst: "strings", bpm: 100, skill: "u:form:bridge" },
        arrangeCompose.gen(r, 0.5),
        layerIn.gen(r, 0.5),
        formBuildItem(["intro", "verse", "pre-chorus", "chorus", "bridge", "chorus"]),
      ],
    },
  ],
};

// ── Modes & Moods Mesa ──────────────────────────────────────────────────────────────────────
type ModeKind = "major" | "minor" | "dorian" | "mixolydian" | "lydian" | "phrygian";
const MODE_NAME: Record<ModeKind, string> = { major: "Major (Ionian)", minor: "Natural minor (Aeolian)", dorian: "Dorian", mixolydian: "Mixolydian", lydian: "Lydian", phrygian: "Phrygian" };
const MODE_WHY: Record<ModeKind, string> = {
  major: "Major: bright and settled — the familiar do-re-mi.",
  minor: "Natural minor: dark, with a lowered 3rd, 6th and 7th.",
  dorian: "Dorian: minor, but the raised 6th adds a hopeful, folky glow.",
  mixolydian: "Mixolydian: major with a lowered 7th — bold, bluesy, rock-and-Celtic.",
  lydian: "Lydian: major with a raised 4th — floating, dreamy, full of wonder.",
  phrygian: "Phrygian: minor with a lowered 2nd — dark and tense, a flamenco and metal favorite.",
};
const MODE_RECIPE: Record<ModeKind, string> = { major: "the major scale", minor: "the natural minor scale", dorian: "natural minor with a raised 6th", mixolydian: "major with a lowered 7th", lydian: "major with a raised 4th", phrygian: "natural minor with a lowered 2nd" };
/** Which mode of the major scale (how far above its parent major key's tonic it starts). */
const MODE_OFFSET: Record<ModeKind, number> = { major: 0, dorian: 2, phrygian: 4, lydian: 5, mixolydian: 7, minor: 9 };
const parentF = (t: number, k: ModeKind) => fifthsOfPc(t - MODE_OFFSET[k]);
/** Scale up, then down by arpeggio — every degree heard over a drone, the same shape for every mode. */
function modeSound(t: number, k: ModeKind, inst: InstId = t >= 60 ? "flute" : "clarinet", bpm = 116): Score {
  const sc = scale(t, k, 1);
  const shape = [0, 1, 2, 3, 4, 5, 6, 7, 4, 2, 0];
  const ns: MNote[] = shape.map((i, j) => ({ p: sc[i], d: j === shape.length - 1 ? 2 : 0.5 }));
  const len = ns.reduce((a, x) => a + x.d, 0);
  return { bpm, tracks: [notesTrack(inst, ns, 0.9), drone(t, len)] };
}
/** A short tune that leans on the mode's color note. */
function modeLick(t: number, k: ModeKind, inst: InstId = t >= 60 ? "flute" : "clarinet", bpm = 104): Score {
  const LICK: Record<ModeKind, number[]> = { major: [0, 2, 4, 5, 4, 2, 1, 0], minor: [0, 2, 4, 5, 4, 2, 1, 0], dorian: [0, 2, 4, 5, 4, 2, 1, 0], mixolydian: [0, 2, 4, 6, 7, 6, 4, 0], lydian: [0, 1, 2, 3, 4, 3, 2, 0], phrygian: [0, 1, 2, 1, 0, 1, 0] };
  const sc = scale(t, k, 1);
  const ns: MNote[] = LICK[k].map((i, j, a) => ({ p: sc[i], d: j === a.length - 1 ? 2 : j % 2 ? 0.5 : 1 }));
  const len = ns.reduce((a, x) => a + x.d, 0);
  return { bpm, tracks: [notesTrack(inst, ns, 0.9), drone(t, len)] };
}
const modeEar = topic("g7-mode-ear", (r, d) => {
  const sets: ModeKind[][] = d < 0.35 ? [["major", "mixolydian"], ["minor", "dorian"]] : d < 0.7 ? [["major", "mixolydian", "dorian"], ["minor", "dorian", "mixolydian"]] : [["major", "minor", "dorian", "mixolydian"]];
  const set = pick(r, sets);
  const ans = pick(r, set);
  return listen({ prompt: "Listen over the drone. Which mode is it?", sound: modeSound(pick(r, [60, 62, 64, 65, 67]), ans), options: set.map((k) => opt(k, MODE_NAME[k])), answer: ans, skill: "u:modes:ear", why: MODE_WHY[ans] });
});
const WHITE_START: Record<ModeKind, number> = { major: 60, dorian: 62, phrygian: 64, lydian: 65, mixolydian: 67, minor: 69 };
function modeBuildItem(t: number, k: ModeKind): Activity {
  const ps = scale(t, k, 1, false);
  const f = parentF(t, k);
  return { kind: "keys", task: "scale", prompt: `Play ${nm(t, f)} ${MODE_NAME[k].replace(/ \(.*\)/, "")}: start on the ${nm(t, f)} that's down and add the other six notes going up.`, answer: ps, given: [t], lo: t - 2, hi: t + 14, labels: true, skill: "u:modes:build", why: `${nm(t, f)} ${k}: ${nms(ps, f)} — ${MODE_RECIPE[k]}.` };
}
const modeBuildT = (key: string, kinds: ModeKind[]) =>
  topic(key, (r, d) => {
    const k = pick(r, kinds);
    const t = d < 0.35 ? WHITE_START[k] - (WHITE_START[k] > 65 ? 12 : 0) : pick(r, [55, 57, 60, 62]);
    return modeBuildItem(t, k);
  });
const modeBuild = modeBuildT("g7-mode-build", ["dorian", "mixolydian"]);
const modeBuildAll = modeBuildT("g7-mode-build-2", ["dorian", "mixolydian", "lydian", "phrygian"]);
const RECIPE_Q: Q[] = [
  { q: "Dorian is natural minor with one note raised. Which one?", a: "The 6th", w: ["The 3rd", "The 2nd"], why: "D natural minor has B♭; D Dorian has B♮. That bright 6th is the Dorian glow." },
  { q: "Mixolydian is a major scale with one note lowered. Which one?", a: "The 7th", w: ["The 3rd", "The 4th"], why: "G major has F♯; G Mixolydian has F♮ — the bold, bluesy flat 7th." },
  { q: "Which white key do you start on to play Dorian with no black keys?", a: "D", w: ["E", "G"], v: keysShow(60, 72, [62, 64, 65, 67, 69, 71, 72]), why: "D to D on the white keys = D Dorian." },
  { q: "Which white key do you start on to play Mixolydian with no black keys?", a: "G", w: ["D", "F"], v: keysShow(55, 67, [55, 57, 59, 60, 62, 64, 65]), why: "G to G on the white keys = G Mixolydian." },
  { q: "A mode is…", a: "A scale defined by which note is home", w: ["A very loud chord", "A kind of drum pattern"], why: "Same seven notes, different home note → a different mode and mood." },
  { q: "Which mode is a minor scale with a major IV chord (like Dm to G)?", a: "Dorian", w: ["Mixolydian", "Major"], why: "Dorian's raised 6th turns iv into IV — that's the classic Dorian vamp." },
  { q: "Which mode gives you the ♭VII chord (like G – F – C in G)?", a: "Mixolydian", w: ["Dorian", "Natural minor"], why: "Mixolydian's lowered 7th builds a major chord a whole step below home: ♭VII." },
];
const LP_Q: Q[] = [
  { q: "Lydian is a major scale with one note raised. Which one?", a: "The 4th", w: ["The 5th", "The 7th"], why: "F Lydian has B♮ instead of B♭ — that raised 4th floats." },
  { q: "Phrygian is natural minor with one note lowered. Which one?", a: "The 2nd", w: ["The 5th", "The 6th"], why: "E Phrygian goes E – F: a half step right above home. Dark and Spanish-sounding." },
  { q: "Which white key do you start on to play Lydian with no black keys?", a: "F", w: ["G", "B"], why: "F to F on the white keys = F Lydian." },
  { q: "Which white key do you start on to play Phrygian with no black keys?", a: "E", w: ["A", "D"], why: "E to E on the white keys = E Phrygian." },
  { q: "Which mode would a film composer pick for wonder, flying or magic?", a: "Lydian", w: ["Phrygian", "Natural minor"], why: "Lydian's raised 4th sounds bright and weightless." },
  { q: "Which mode gives flamenco guitar its dark, fiery flavor?", a: "Phrygian", w: ["Lydian", "Mixolydian"], why: "That half step above home (♭2) is the Phrygian signature." },
  { q: "Order from brightest to darkest:", a: "Lydian, major, Mixolydian, Dorian, minor, Phrygian", w: ["Phrygian, minor, Dorian, Mixolydian, major, Lydian", "Major, minor, Lydian, Phrygian, Dorian, Mixolydian"], why: "Each step darker lowers one more note." },
];
const modeChar = qT("g7-mode-char", "u:modes:recipe", LP_Q);
const modeRecipe = topic("g7-mode-recipe", (r, d) => {
  if (d < 0.35 || r() < 0.5) return choose(r, pick(r, RECIPE_Q), "u:modes:recipe");
  const k = pick(r, ["dorian", "mixolydian"] as ModeKind[]);
  const t = pick(r, [55, 57, 60, 62, 64]);
  const f = parentF(t, k);
  if (k === "mixolydian") {
    const fm = fifthsOfPc(t);
    return choose(r, { q: `${nm(t, fm)} major has ${nm(t + 11, fm)}. What does ${nm(t, f)} Mixolydian have instead?`, a: nm(t + 10, f), w: [nm(t + 11, fm), nm(t + 9, f)], why: `Mixolydian lowers the 7th: ${nm(t + 11, fm)} → ${nm(t + 10, f)}.` }, "u:modes:recipe");
  }
  const fmin = fifthsOfPc(t + 3);
  return choose(r, { q: `${nm(t, fmin)} natural minor has ${nm(t + 8, fmin)}. What does ${nm(t, f)} Dorian have instead?`, a: nm(t + 9, f), w: [nm(t + 8, fmin), nm(t + 10, f)], why: `Dorian raises the 6th: ${nm(t + 8, fmin)} → ${nm(t + 9, f)}.` }, "u:modes:recipe");
});
const MODE_PROGS: { k: ModeKind; romans: string[]; mode: "major" | "minor"; palette: string[] }[] = [
  { k: "mixolydian", romans: ["I", "♭VII", "IV", "I"], mode: "major", palette: ["I", "IV", "V", "♭VII"] },
  { k: "mixolydian", romans: ["I", "♭VII", "I", "♭VII"], mode: "major", palette: ["I", "IV", "V", "♭VII"] },
  { k: "dorian", romans: ["i", "IV", "i", "IV"], mode: "minor", palette: ["i", "iv", "IV", "v"] },
  { k: "dorian", romans: ["i", "IV", "v", "i"], mode: "minor", palette: ["i", "iv", "IV", "v"] },
  { k: "mixolydian", romans: ["I", "IV", "♭VII", "I"], mode: "major", palette: ["I", "IV", "V", "♭VII", "vi"] },
  { k: "dorian", romans: ["i", "VII", "IV", "i"], mode: "minor", palette: ["i", "iv", "IV", "VII", "v"] },
  { k: "lydian", romans: ["I", "II", "I", "II"], mode: "major", palette: ["I", "II", "IV", "V"] },
  { k: "lydian", romans: ["I", "II", "IV", "I"], mode: "major", palette: ["I", "II", "IV", "V"] },
  { k: "phrygian", romans: ["i", "♭II", "i", "♭II"], mode: "minor", palette: ["i", "♭II", "iv", "v"] },
];
const modeProgT = (key: string, kinds: ModeKind[]) =>
  topic(key, (r) => {
    const p = pick(r, MODE_PROGS.filter((x) => kinds.includes(x.k)));
    const t = pick(r, [55, 57, 60, 62]);
    return { kind: "chords", mode: "match", prompt: `A ${p.k[0].toUpperCase()}${p.k.slice(1)} vamp. Listen, then lay out the chords.`, tonic: t, scale: p.mode, palette: p.palette, bars: 4, answer: [...p.romans], inst: "guitar", bpm: 96, beat: true, skill: "u:modes:progression" };
  });
const modeProg = modeProgT("g7-mode-prog", ["dorian", "mixolydian"]);
const MODE_ECHO: Partial<Record<ModeKind, number[][]>> = { dorian: [[0, 2, 4, 5, 4], [4, 5, 4, 2, 0], [0, 5, 4, 2, 1, 0]], mixolydian: [[0, 2, 4, 6, 7], [7, 6, 4, 2, 0], [4, 6, 7, 6, 4]] };
const modeEcho = topic("g7-mode-echo", (r) => {
  const k = pick(r, ["dorian", "mixolydian"] as ModeKind[]);
  const t = k === "dorian" ? 62 : 55;
  const sc = scale(t, k, 1);
  const notes = pick(r, MODE_ECHO[k] ?? [[0, 1, 2]]).map((i) => sc[i]);
  return { kind: "melody", mode: "echo", prompt: `Echo this ${k === "dorian" ? "D Dorian" : "G Mixolydian"} lick on the keys — listen for the ${k === "dorian" ? "bright raised 6th (B)" : "lowered 7th (F)"}.`, notes, pads: sc, on: "keys", labels: "letters", inst: "piano", durs: notes.map((_, i) => (i === notes.length - 1 ? 2 : 0.5)), bpm: 96, skill: "u:modes:echo" };
});
const modeProgAll = modeProgT("g7-mode-prog-2", ["lydian", "phrygian", "dorian", "mixolydian"]);
const MOODS: { scene: string; e: string; k: ModeKind }[] = [
  { scene: "a misty Celtic sea shanty", e: "⛵", k: "dorian" },
  { scene: "a stadium rock anthem", e: "🎸", k: "mixolydian" },
  { scene: "floating above the clouds in a dream", e: "☁️", k: "lydian" },
  { scene: "a dragon's lair deep underground", e: "🐉", k: "phrygian" },
  { scene: "a sunny pop song", e: "☀️", k: "major" },
  { scene: "a rainy-day goodbye", e: "🌧️", k: "minor" },
  { scene: "a flamenco duel", e: "💃", k: "phrygian" },
  { scene: "a spaceship drifting past a nebula", e: "🌌", k: "lydian" },
];
const modeMood = topic("g7-mode-mood", (r) => {
  const m = pick(r, MOODS);
  const others = pickN(r, ["major", "minor", "dorian", "mixolydian", "lydian", "phrygian"] as ModeKind[], 2, (x) => x === m.k);
  const t = pick(r, [60, 62, 64]);
  return listen({ prompt: `You're scoring ${m.scene}. Which sound fits best?`, show: { show: "pics", emoji: m.e }, options: shuffle(r, [m.k, ...others]).map((k) => soundOpt(k, modeLick(t, k), MODE_NAME[k])), answer: m.k, skill: "u:modes:mood", why: MODE_WHY[m.k] });
});
const lydPhry = topic("g7-lydian-phrygian", (r, d) => {
  const set: ModeKind[] = d < 0.5 ? ["lydian", "phrygian"] : pick(r, [["lydian", "major", "phrygian"], ["phrygian", "minor", "lydian"]] as ModeKind[][]);
  const ans = pick(r, set);
  return listen({ prompt: "Which mode is this?", sound: modeSound(pick(r, [60, 62, 64]), ans), options: set.map((k) => opt(k, MODE_NAME[k])), answer: ans, skill: "u:modes:color", why: MODE_WHY[ans] });
});
const modeCompose = topic("g7-mode-compose", (r) => modeComposeItem(pick(r, ["dorian", "mixolydian"] as ModeKind[])));
function modeComposeItem(k: ModeKind): Activity {
  const t = k === "dorian" ? 62 : 67;
  const ps = scale(t, k, 1);
  const color = k === "dorian" ? t + 9 : t + 10;
  return {
    kind: "compose",
    prompt: k === "dorian" ? "Compose in D Dorian: use B (the bright Dorian 6th) and end on D." : "Compose in G Mixolydian: use F (the lowered 7th) and end on G.",
    pitches: ps,
    slots: 8,
    dur: 1,
    inst: k === "dorian" ? "flute" : "eguitar",
    bpm: 100,
    rules: [{ rule: "use", pitches: [color] }, { rule: "end", p: t }, { rule: "notes", min: 6 }],
    tonic: t,
    labels: "letters",
    backing: k === "dorian" ? progression(["i", "IV", "i", "IV"], 62, "minor", { bpm: 100, per: 2, inst: "guitar", style: "strum", bass: true }) : progression(["I", "♭VII", "IV", "I"], 55, "major", { bpm: 100, per: 2, inst: "guitar", style: "strum", bass: true, drums: "rock" }),
    skill: "u:compose:mode",
  };
}

const MODES_IDEA = idea("Same keys, new home", [
  frame("Play only white keys from C to C: the major scale (its old name is Ionian). Bright and settled.", keysShow(60, 72, scale(60, "major", 1)), modeSound(60, "major")),
  frame("Same white keys, but make D home: Dorian. It's minor — with a surprisingly bright 6th (B♮).", keysShow(62, 74, scale(62, "dorian", 1)), modeSound(62, "dorian")),
  frame("Make G home: Mixolydian. Major, but with a lowered 7th (F♮) — bold and bluesy.", keysShow(55, 67, scale(55, "mixolydian", 1)), modeSound(55, "mixolydian")),
  frame("A mode is a scale defined by where home is. Same notes, different home, totally different mood.", { show: "pics", emoji: "🎨" }, then(modeLick(62, "dorian"), modeLick(55, "mixolydian"), 1)),
], "u:modes:idea");
const DM_IDEA = idea("Dorian and Mixolydian up close", [
  frame("Dorian vs natural minor: only the 6th changes. Hear minor, then Dorian — the 6th turns from shadow to light.", { show: "ladder", tonic: 62, steps: [0, 2, 3, 5, 7, 9, 10, 12], lit: [9] }, then(modeLick(62, "minor"), modeLick(62, "dorian"), 1)),
  frame("Major vs Mixolydian: only the 7th changes. Hear major, then Mixolydian — the flat 7th sounds like a rock riff.", { show: "ladder", tonic: 55, steps: [0, 2, 4, 5, 7, 9, 10, 12], lit: [10] }, then(modeLick(55, "major"), modeLick(55, "mixolydian"), 1)),
  frame("Each mode has a signature progression. Mixolydian: I – ♭VII – IV. Dorian: i – IV (a major IV in a minor key).", chordsShow(["I", "♭VII", "IV", "I"], 55), progression(["I", "♭VII", "IV", "I"], 55, "major", { bpm: 104, per: 2, inst: "eguitar", style: "strum", bass: true, drums: "rock" })),
], "u:modes:idea");
const LP_IDEA = idea("Lydian and Phrygian", [
  frame("Lydian raises the 4th. The result floats — composers reach for it for wonder, flying and magic.", { show: "ladder", tonic: 60, steps: [0, 2, 4, 6, 7, 9, 11, 12], lit: [6] }, modeLick(60, "lydian")),
  frame("Phrygian lowers the 2nd: a half step right above home. Dark and tense — flamenco guitar and heavy metal both love it.", { show: "ladder", tonic: 64, steps: [0, 1, 3, 5, 7, 8, 10, 12], lit: [1] }, modeLick(64, "phrygian")),
  frame("Brightest to darkest: Lydian, major, Mixolydian, Dorian, minor, Phrygian. Each step darkens one note.", { show: "pics", emoji: "🌗" }),
], "u:modes:idea");
const MODE_COMPOSE_IDEA = idea("Compose in a mode", [
  frame("To make a mode sound like itself: let a drone or vamp hold home, lean on the color note, and end on home.", { show: "pics", emoji: "🪄" }, modeLick(62, "dorian")),
  frame("Dorian's color note is the raised 6th. Mixolydian's is the lowered 7th. Use them — they're the flavor.", { show: "ladder", tonic: 62, steps: [0, 2, 3, 5, 7, 9, 10, 12], lit: [9] }),
], "u:modes:idea");

const MODES_MESA: WorldDef = {
  id: "g7-modes",
  title: "Modes & Moods Mesa",
  emoji: "🏜️",
  grade: "7",
  items: 8,
  theme: "volcano",
  blurb: "Dorian, Mixolydian and friends — scales with their own colors and moods.",
  talk: ["If your day had a mode, which would it be — bright Lydian or dark Phrygian?", "Why might a movie composer pick an unusual scale instead of plain major or minor?"],
  challenge: "On a piano app, play only white keys from D to D. Then from G to G. Can you hear the difference in mood?",
  stages: [
    {
      title: "Same keys, new home",
      emoji: "🎨",
      levels: 1,
      topics: [modeEar, modeBuild, modeRecipe],
      fixed: (r) => [
        MODES_IDEA,
        listen({ prompt: "Both are minor. Which one is Dorian — with the bright 6th?", options: [soundOpt("minor", modeLick(62, "minor"), "First"), soundOpt("dorian", modeLick(62, "dorian"), "Second")], answer: "dorian", skill: "u:modes:ear", why: "The second one raises the 6th (B♮ instead of B♭). That lift is Dorian." }),
        modeBuildItem(62, "dorian"),
        listen({ prompt: "Which one is Mixolydian — major with a lowered 7th?", options: [soundOpt("mixolydian", modeLick(55, "mixolydian"), "First"), soundOpt("major", modeLick(55, "major"), "Second")], answer: "mixolydian", skill: "u:modes:ear", why: "The first one flattens the 7th (F instead of F♯) — Mixolydian." }),
        choose(r, RECIPE_Q[1], "u:modes:recipe"),
        { kind: "keys", task: "find", prompt: "In G Mixolydian, find the note that makes it Mixolydian (the lowered 7th).", answer: [65], lo: 55, hi: 79, labels: true, octaveFree: true, skill: "u:modes:recipe", why: "G major has F♯. G Mixolydian lowers it to F." },
        { kind: "chords", mode: "match", prompt: "A Mixolydian rock vamp: I – ♭VII – IV – I. Listen, then lay it out.", tonic: 62, scale: "major", palette: ["I", "IV", "V", "♭VII"], bars: 4, answer: ["I", "♭VII", "IV", "I"], inst: "eguitar", bpm: 100, beat: true, skill: "u:modes:progression" },
        choose(r, RECIPE_Q[0], "u:modes:recipe"),
      ],
    },
    practice("Dorian and Mixolydian", "🌗", [modeEar, modeBuild, modeRecipe, modeEcho, modeProg], { teach: DM_IDEA, titles: ["Hear the color", "Build the mode"], unlocks: ["scale:dorian"] }),
    practice("Mood palette", "🎭", [modeMood, lydPhry, modeChar, modeProgAll, modeBuildAll], { teach: LP_IDEA, titles: ["Lydian and Phrygian", "Score the mood"] }),
    {
      title: "Compose in a mode",
      emoji: "🪄",
      levels: 1,
      topics: [modeCompose, modeMood],
      unlocks: ["scale:mixolydian"],
      fixed: (r) => [
        MODE_COMPOSE_IDEA,
        modeComposeItem("dorian"),
        { kind: "chords", mode: "build", prompt: "Write a 4-bar Mixolydian loop: use ♭VII, and start and end on I.", tonic: 57, scale: "major", palette: ["I", "IV", "V", "vi", "♭VII"], bars: 4, rules: [{ rule: "start", chord: "I" }, { rule: "use", chords: ["♭VII"] }, { rule: "end", chord: "I" }], inst: "eguitar", bpm: 104, beat: true, skill: "u:modes:progression" },
        modeComposeItem("mixolydian"),
        { kind: "chords", mode: "build", prompt: "A Dorian groove: minor key, but use the major IV. Start on i.", tonic: 62, scale: "minor", palette: ["i", "iv", "IV", "v", "VII"], bars: 4, rules: [{ rule: "start", chord: "i" }, { rule: "use", chords: ["IV"] }], inst: "organ", bpm: 96, beat: true, skill: "u:modes:progression" },
        modeBuildItem(64, "phrygian"),
        modeMood.gen(r, 0.5),
        modeBuildItem(65, "lydian"),
      ],
    },
  ],
};

// ── Rhythm Gym ──────────────────────────────────────────────────────────────────────────────
const SYNC_POOL = ["ta", "titi", "synco", "z"];
const DOT_POOL = ["ta", "titi", "timri", "ritim", "z"];
function swingSound(ps: number[], sw: number, bpm = 132): Score {
  const mel = melody([...ps, ...ps], 0.5, "sax", bpm);
  const kit = beat({ ride: "x.x.x.x.", hat: "..x...x." }, { bpm, per: 2, times: 2 });
  return { ...layer(mel, kit), swing: sw };
}
const SWING_TUNES = [[60, 62, 64, 67, 69, 67, 64, 62], [67, 65, 64, 62, 60, 62, 64, 67], [64, 64, 67, 69, 67, 64, 62, 60], [60, 63, 65, 66, 67, 70, 67, 65]];
const swingEar = topic("g7-swing-ear", (r, d) => {
  const ps = pick(r, SWING_TUNES);
  const sw = d < 0.5 ? 0.33 : 0.25;
  if (d < 0.5 || r() < 0.5) {
    const first = r() < 0.5;
    const a = soundOpt("swing", swingSound(ps, sw), first ? "First" : "Second");
    const b = soundOpt("straight", swingSound(ps, 0), first ? "Second" : "First");
    return listen({ prompt: "Same notes, two feels. Which one swings?", options: first ? [a, b] : [b, a], answer: "swing", skill: "u:rhythm:swing", why: "Swing stretches the first eighth of each pair and shortens the second: long-short, long-short — doo-BAH, doo-BAH." });
  }
  const swung = r() < 0.5;
  return listen({ prompt: "Straight eighths or swing?", sound: swingSound(ps, swung ? sw : 0), options: [opt("straight", "Straight (even)"), opt("swing", "Swing (long-short)")], answer: swung ? "swing" : "straight", skill: "u:rhythm:swing", why: "Straight eighths are even, like a march. Swing eighths lilt long-short, like jazz." });
});
const syncoEcho = topic("g7-synco-echo", (r, d) => echo(r, { pool: d < 0.5 ? SYNC_POOL : [...SYNC_POOL, "taa", "timri"], must: "synco", bars: d < 0.6 ? 1 : 2, bpm: 84, skill: "u:rhythm:synco", prompt: "Listen for the syncopation, then tap it back." }));
const timriRead = topic("g7-timri-read", (r, d) => readRhythm(r, { pool: d < 0.5 ? ["ta", "titi", "timri", "z"] : DOT_POOL, must: d < 0.5 ? "timri" : pick(r, ["timri", "ritim"]), bars: d < 0.7 ? 1 : 2, bpm: 76, show: "notes", skill: "u:rhythm:timri", prompt: "Read it, then play it: tim-ri is long-short, ri-tim is short-long." }));
const syncoDictation = topic("g7-synco-dictation", (r, d) => {
  const pool = d < 0.5 ? ["ta", "titi", "synco", "z"] : ["ta", "titi", "synco", "timri", "z", "taa"];
  const cells = randomCells(r, pool, [4, 4], 2, "synco");
  const bars = intoBars(cells, [4, 4]) ?? [cells];
  return { kind: "measure", mode: "dictation", prompt: "Listen, then write the two bars you hear.", meter: [4, 4], bars: bars.length, cards: pool, target: bars, bpm: 80, skill: "u:rhythm:dictation" };
});
const SYNC_GROOVES: string[][] = [
  ["x..x..x...x..x..", "....x.......x...", "x.x.x.x.x.x.x.x."],
  ["x......x..x.....", "....x.......x...", "x.x.x.x.x.x.x.x."],
  ["x...x...x...x...", "...x..x....x..x.", "x.x.x.x.x.x.x.x."],
  ["x.....x...x.....", "....x.......x...", "xxxxxxxxxxxxxxxx"],
];
const SYNC_GROOVES_8: string[][] = [["x..x..x.", "..x...x."], ["x..x....", "....x..x"], ["x....x..", "..x...x."]];
const grooveCopy = topic("g7-groove-copy", (r, d) =>
  d < 0.5
    ? { kind: "beatlab", mode: "copy", prompt: "Listen to the syncopated beat, then rebuild it.", rows: ["kick", "snare"], steps: 8, bpm: 96, target: [...pick(r, SYNC_GROOVES_8)], skill: "u:beatmaking:synco" }
    : { kind: "beatlab", mode: "copy", prompt: "Listen to the groove — the kick dodges the beat. Rebuild all three rows.", rows: ["kick", "snare", "hat"], steps: 16, bpm: 92, target: [...pick(r, SYNC_GROOVES)], skill: "u:beatmaking:synco" },
);
const syncoMatch = topic("g7-synco-match", (r, d) => rhythmMatch(r, { pool: d < 0.5 ? SYNC_POOL : ["ta", "titi", "synco", "timri", "z"], must: d < 0.5 ? "synco" : pick(r, ["synco", "timri"]), style: "notes", bpm: 84, skill: "u:rhythm:synco" }));

function meterSound(meter: Meter, bpm: number, bars = 3): Score {
  const per = pulses(meter);
  const len = barBeats(meter);
  const hits: MHit[] = [];
  const bass: MNote[] = [];
  const roots = [43, 41, 38, 43];
  for (let b = 0; b < bars; b++) {
    let t = b * len;
    per.forEach((p, i) => {
      hits.push({ t, k: i === 0 ? "kick" : "rim", v: i === 0 ? 0.95 : 0.55 });
      t += p;
    });
    hits.push({ t: b * len, k: "crash", v: 0.5 });
    for (let e = 0; e < Math.round(len * 2); e++) hits.push({ t: b * len + e * 0.5, k: "hat", v: 0.32 });
    bass.push({ p: roots[b % roots.length], d: len });
  }
  return { bpm, meter, tracks: [{ kind: "drums", hits }, notesTrack("bass", bass, 0.85)] };
}
const METER_NAME: Record<string, string> = { "3/4": "3/4 (count 3)", "4/4": "4/4 (count 4)", "5/4": "5/4 (count 5)", "7/8": "7/8 (2 + 2 + 3)", "6/8": "6/8 (two groups of 3)" };
const meterEarOdd = topic("g7-meter-odd", (r, d) => {
  const set = d < 0.3 ? ["4/4", "5/4"] : d < 0.6 ? ["4/4", "5/4", "7/8"] : ["3/4", "4/4", "5/4", "7/8"];
  const ans = pick(r, set);
  const [a, b] = ans.split("/").map(Number);
  return listen({ prompt: "Count along — the crash marks each bar's downbeat. What's the meter?", sound: meterSound([a, b], ans === "7/8" ? 100 : 120, 3), options: set.map((m) => opt(m, METER_NAME[m])), answer: ans, skill: "u:meter:odd", why: ans === "7/8" ? "Short, short, long: 2 + 2 + 3 eighths in every bar — 7/8." : `Count the pulses from one crash to the next: ${a}.` });
});
const oddFill = topic("g7-odd-fill", (r, d) => {
  const seven = d > 0.25 && r() < 0.55;
  return seven
    ? { kind: "measure", mode: "fill", prompt: "Fill two bars of 7/8 — each bar holds seven eighth notes (3½ quarter beats).", meter: [7, 8], bars: 2, cards: ["ti", "titi", "ta", "tai", "tititi"], bpm: 96, skill: "u:meter:odd" }
    : { kind: "measure", mode: "fill", prompt: "Fill two bars of 5/4 — five quarter-note beats in each.", meter: [5, 4], bars: 2, cards: ["ta", "titi", "taa", "taaa", "z", "synco"], given: [["taaa"], null], bpm: 100, skill: "u:meter:odd" };
});
const oddRead = topic("g7-odd-read", (r, d) => {
  const seven = d > 0.25 && r() < 0.5;
  return seven
    ? readRhythm(r, { pool: ["titi", "ta", "tai", "tititi"], meter: [7, 8], bpm: 92, show: "notes", skill: "u:meter:odd-read", prompt: "Read this bar of 7/8 (short, short, long), then play it." })
    : readRhythm(r, { pool: ["ta", "titi", "taa", "z"], meter: [5, 4], bpm: 96, show: "notes", skill: "u:meter:odd-read", prompt: "Read this bar of 5/4, then play it." });
});
function polyScore(a: number, b: number, bpm = 80, cycles = 4): Score {
  const hits: MHit[] = [];
  for (let c = 0; c < cycles; c++) {
    for (let i = 0; i < a; i++) hits.push({ t: c * 2 + (i * 2) / a, k: "conga", v: 0.85 });
    for (let j = 0; j < b; j++) hits.push({ t: c * 2 + (j * 2) / b, k: "block", v: 0.75 });
  }
  return { bpm, tracks: [{ kind: "drums", hits }] };
}
const polyEar = topic("g7-poly-ear", (r, d) => {
  const opts: [string, number, number][] = d < 0.5 ? [["32", 3, 2], ["22", 2, 2]] : [["32", 3, 2], ["22", 2, 2], ["42", 4, 2]];
  const order = shuffle(r, opts);
  return listen({ prompt: "Which clip is 3 against 2 — three even hits on the conga in the same time as two on the wood block?", options: order.map(([id, a, b], i) => soundOpt(id, polyScore(a, b), ["First", "Second", "Third"][i])), answer: "32", skill: "u:rhythm:poly", why: "In 3 against 2 the drums meet on beat one, then split: say “HOT cup of TEA” and you've got it." });
});
const tripletEcho = topic("g7-triplet-echo", (r) => echo(r, { pool: ["trip", "titi", "ta"], must: "trip", bars: 1, bpm: 76, skill: "u:rhythm:triplets", prompt: "Feel threes against twos: listen, then tap it back." }));
const METER_Q: Q[] = [
  { q: "How many quarter-note beats are in a bar of 5/4?", a: "5", w: ["4", "7"], why: "Top number = how many beats; bottom 4 = each beat is a quarter note." },
  { q: "7/8 is usually felt in uneven groups. Which is a common grouping?", a: "2 + 2 + 3", w: ["4 + 4", "1 + 6"], why: "Short, short, long (or long, short, short): uneven groups give 7/8 its limp." },
  { q: "In 6/8, how many strong pulses are in each bar?", a: "2 — each a group of three eighths", w: ["6", "3"], why: "6/8 swings in two big pulses: ONE-and-a TWO-and-a." },
  { q: "Why does 7/8 feel like it skips?", a: "Its groups are uneven: short-short-long", w: ["It's slower than 4/4", "It has no downbeat"], why: "The extra eighth note in one group makes the pulse lurch forward." },
  { q: "Which meter counts 1-2-3-4-5 in every bar?", a: "5/4", w: ["3/4", "6/8"], why: "Five beats per bar, each a quarter note." },
  { q: "A 3:2 polyrhythm means…", a: "Three even beats in the same time as two even beats", w: ["Three songs at once", "Two drummers playing the same thing"], why: "Both patterns start together, then divide the time differently — the heart of West African and Afro-Cuban drumming." },
  { q: "What does a dotted eighth + sixteenth (tim-ri) sound like?", a: "Long-short, like a gallop", w: ["Two even notes", "Short-long, like a hiccup"], why: "The dot adds half the note's value: ¾ of a beat, then a quick ¼." },
  { q: "Syncopation means…", a: "Accents land between the beats instead of on them", w: ["Playing as loudly as possible", "Every note is the same length"], why: "Syncopation surprises the ear by stressing the off-beats." },
];
const meterFacts = qT("g7-meter-facts", "u:meter:facts", METER_Q);
const latinEar = topic("g7-latin-ear", (r) => styleEar(r, { pool: ["bossa", "salsa", "reggae", "swing", "funk"], skill: "u:genre:latin", prompt: "Which groove is this?" }));
const SON_CLAVE: Activity = { kind: "beatlab", mode: "make", prompt: "Program the 3-2 son clave on the wood block — steps 1, 4, 7, 11 and 13 — then add maracas (4+).", rows: ["block", "kick", "maracas"], steps: 16, bpm: 100, rules: [{ rule: "on", row: "block", steps: [0, 3, 6, 10, 12] }, { rule: "count", row: "block", min: 5, max: 5 }, { rule: "count", row: "maracas", min: 4 }], skill: "u:beatmaking:clave" };
const TRESILLO: Activity = { kind: "beatlab", mode: "make", prompt: "Program the tresillo (3 + 3 + 2) on the kick: steps 1, 4 and 7 — then put a rim click on 3 and 7.", rows: ["kick", "rim", "shaker"], steps: 8, bpm: 96, rules: [{ rule: "on", row: "kick", steps: [0, 3, 6] }, { rule: "count", row: "kick", min: 3, max: 3 }, { rule: "on", row: "rim", steps: [2, 6] }], skill: "u:beatmaking:clave" };
const BOSSA_CLAVE: Activity = { kind: "beatlab", mode: "make", prompt: "The bossa nova clave moves the last hit: wood block on steps 1, 4, 7, 11 and 14. Add a shaker on every eighth (8+).", rows: ["block", "kick", "shaker"], steps: 16, bpm: 104, rules: [{ rule: "on", row: "block", steps: [0, 3, 6, 10, 13] }, { rule: "count", row: "block", min: 5, max: 5 }, { rule: "count", row: "shaker", min: 8 }], skill: "u:beatmaking:clave" };
const claveMake = topic("g7-clave", (r) => pick(r, [SON_CLAVE, TRESILLO, BOSSA_CLAVE]));

const SYNCO_IDEA = idea("Off the beat", [
  frame("On-beat rhythms land where your foot taps. Syncopation puts the accent in the spaces between.", rhythmShow(["ta", "ta", "ta", "ta"], "notes", true), rhythm(["ta", "ta", "ta", "ta"], { drum: "snare", bpm: 92 })),
  frame("The classic syncopation: ti – TA – ti (syn-co-pa). The long note starts halfway through a beat.", rhythmShow(["synco", "ta", "ta"], "notes", true), rhythm(["synco", "ta", "ta", "synco", "ta", "ta"], { drum: "snare", bpm: 88 })),
  frame("Dotted eighth + sixteenth — tim-ri — is long-short, like a gallop.", rhythmShow(["timri", "timri", "ta", "ta"], "notes", true), rhythm(["timri", "timri", "ta", "ta"], { drum: "snare", bpm: 84 })),
  frame("Flip it to ri-tim — short-long — the “Scotch snap” of Scottish and Appalachian fiddle tunes.", rhythmShow(["ritim", "ritim", "taa"], "notes", true), rhythm(["ritim", "ritim", "taa"], { drum: "snare", bpm: 84 })),
], "u:rhythm:idea");
const SWING_IDEA = idea("Swing", [
  frame("Straight eighths are even: 1-and-2-and.", rhythmShow(["titi", "titi", "titi", "titi"], "notes", false), swingSound(SWING_TUNES[0], 0)),
  frame("Swing stretches the first of each pair and shortens the second: long-short, long-short. Jazz, blues and shuffles live here.", rhythmShow(["titi", "titi", "titi", "titi"], "notes", false), swingSound(SWING_TUNES[0], 0.33)),
  frame("Syncopation + swing together = groove. Funk and hip hop kicks dodge the beat on purpose.", { show: "grid", rows: ["kick", "snare", "hat"], pattern: SYNC_GROOVES[0] }, beat({ kick: SYNC_GROOVES[0][0], snare: SYNC_GROOVES[0][1], hat: SYNC_GROOVES[0][2] }, { bpm: 96, per: 4, times: 2 })),
], "u:rhythm:idea");
const ODD_IDEA = idea("Odd meters and 3 against 2", [
  frame("5/4 has five beats per bar — often felt as 3 + 2. Count with the crash: 1 2 3 4 5.", { show: "meter", meter: [5, 4] }, meterSound([5, 4], 120, 2)),
  frame("7/8 has seven quick eighths, grouped short-short-long: 1-2, 1-2, 1-2-3. It feels like it's skipping.", { show: "meter", meter: [7, 8] }, meterSound([7, 8], 100, 3)),
  frame("A polyrhythm layers two pulses. 3 against 2: the conga plays three while the wood block plays two in the same space. Say “HOT cup of TEA.”", { show: "pics", emoji: "🥁" }, polyScore(3, 2)),
], "u:meter:idea");
const GROOVE_IDEA = idea("Groove lab", [
  frame("The son clave — 3 + 2 — is the heartbeat of salsa. Everything else in the band locks to it.", { show: "grid", rows: ["block"], pattern: ["x..x..x...x.x..."] }, beat({ block: "x..x..x...x.x...", conga: "..x.x..x..x.x..x", maracas: "x.x.x.x.x.x.x.x." }, { bpm: 100, per: 4, times: 2 })),
  frame("Bossa nova (Brazil, late 1950s) bends it slightly and slows it down — cool, gentle syncopation.", { show: "grid", rows: ["rim"], pattern: ["x..x..x...x..x.."] }, piece("bossa")),
], "u:rhythm:idea");

const RHYTHM_GYM: WorldDef = {
  id: "g7-rhythm",
  title: "Rhythm Gym",
  emoji: "🏋️",
  grade: "7",
  items: 8,
  theme: "candy",
  blurb: "Syncopation, swing, 3-against-2 and odd meters — train your groove.",
  talk: ["Tap a rhythm on the table — can you make it syncopated?", "Why do you think dance music sounds better when the beat isn't perfectly even?"],
  challenge: "Clap the 3-2 son clave (1, 4, 7 … 11, 13) while someone else claps a steady beat. Can you keep it going for 30 seconds?",
  stages: [
    {
      title: "Off the beat",
      emoji: "🥁",
      levels: 1,
      topics: [syncoEcho, timriRead, syncoMatch, meterFacts],
      fixed: (r) => [
        SYNCO_IDEA,
        { kind: "rhythm", mode: "echo", prompt: "Listen for syn-co-pa, then tap it back.", cells: ["synco", "ta", "ta"], meter: [4, 4], bpm: 84, show: "notes", drum: "snare", skill: "u:rhythm:synco" },
        readRhythm(r, { pool: ["ta", "titi", "timri"], must: "timri", bpm: 76, show: "notes", skill: "u:rhythm:timri", prompt: "Read it (tim-ri = long-short), then play it." }),
        syncoMatch.gen(r, 0.2),
        { kind: "measure", mode: "fill", prompt: "Fill both bars. Use at least one syn-co-pa and one tim-ri.", meter: [4, 4], bars: 2, cards: ["synco", "timri", "ta", "titi", "z"], given: [["synco"], null], bpm: 84, skill: "u:rhythm:measure" },
        { kind: "rhythm", mode: "echo", prompt: "Gallop it back: listen, then tap.", cells: ["timri", "timri", "ta", "ta"], meter: [4, 4], bpm: 80, show: "notes", drum: "snare", skill: "u:rhythm:timri" },
        listen({ prompt: "Which one is syncopated?", options: [soundOpt("sync", rhythm(["synco", "synco", "ta", "ta"], { bpm: 88, drum: "snare" }), "First"), soundOpt("on", rhythm(["titi", "ta", "titi", "ta"], { bpm: 88, drum: "snare" }), "Second")], answer: "sync", skill: "u:rhythm:synco", why: "The first one puts long notes on the off-beats: syn-CO-pa." }),
        readRhythm(r, { pool: ["ta", "ritim", "titi"], must: "ritim", bpm: 76, show: "notes", skill: "u:rhythm:timri", prompt: "Now short-long (ri-tim). Read it, then play it." }),
      ],
    },
    practice("Swing and syncopation", "💃", [swingEar, syncoEcho, timriRead, syncoDictation, grooveCopy, syncoMatch], { teach: SWING_IDEA, titles: ["Swing it", "Dodge the beat"], unlocks: ["drum:maracas"] }),
    practice("Odd meters", "🌀", [meterEarOdd, oddFill, oddRead, polyEar, tripletEcho, meterFacts], { teach: ODD_IDEA, titles: ["Five and seven", "Three against two"] }),
    {
      title: "Groove lab",
      emoji: "🎛️",
      levels: 1,
      topics: [claveMake, latinEar],
      unlocks: ["groove:bossa", "groove:salsa"],
      fixed: (r) => [
        GROOVE_IDEA,
        SON_CLAVE,
        { kind: "measure", mode: "create", prompt: "Write two bars of 7/8 (2 + 2 + 3). Use ta-i (the dotted quarter) at least once.", meter: [7, 8], bars: 2, cards: ["ti", "titi", "ta", "tai", "tititi"], must: ["tai"], bpm: 96, skill: "u:meter:create" },
        { kind: "measure", mode: "create", prompt: "Write two bars of 4/4 that use syn-co-pa AND tim-ri.", meter: [4, 4], bars: 2, cards: ["ta", "titi", "synco", "timri", "ritim", "z", "taa"], must: ["synco", "timri"], bpm: 84, skill: "u:rhythm:create" },
        { kind: "beatlab", mode: "make", prompt: "Funk it up: kick on 1 plus two syncopated kicks (step 7 and step 11), snare on 2 and 4, and 8+ hi-hats.", rows: ["kick", "snare", "hat"], steps: 16, bpm: 96, rules: [{ rule: "on", row: "kick", steps: [0, 6, 10] }, { rule: "on", row: "snare", steps: [4, 12] }, { rule: "count", row: "hat", min: 8 }], skill: "u:beatmaking:synco" },
        { kind: "beatlab", mode: "make", prompt: "Swing it: ride cymbal on every eighth, snare on 2 and 4. Listen to the long-short lilt.", rows: ["ride", "snare", "kick"], steps: 8, bpm: 120, swing: 0.33, rules: [{ rule: "count", row: "ride", min: 8 }, { rule: "on", row: "snare", steps: [2, 6] }], skill: "u:beatmaking:swing" },
        latinEar.gen(r, 0.5),
        BOSSA_CLAVE,
      ],
    },
  ],
};

// ═══ 8th grade ═════════════════════════════════════════════════════════════════════════════

// ── Cadence Cliffs ──────────────────────────────────────────────────────────────────────────
type Cad = "authentic" | "half" | "plagal" | "deceptive";
const CADS: Cad[] = ["authentic", "half", "plagal", "deceptive"];
const CAD_LABEL: Record<Cad, string> = { authentic: "Authentic (V → I)", half: "Half (ends on V)", plagal: "Plagal (IV → I)", deceptive: "Deceptive (V → vi)" };
const CAD_LABEL_MINOR: Record<Cad, string> = { authentic: "Authentic (V → i)", half: "Half (ends on V)", plagal: "Plagal (iv → i)", deceptive: "Deceptive (V → VI)" };
const CAD_WORD: Record<Cad, string> = { authentic: "Authentic", half: "Half", plagal: "Plagal", deceptive: "Deceptive" };
const CAD_WHY: Record<Cad, string> = {
  authentic: "V → I: the strongest ending — a period at the end of a sentence.",
  half: "The phrase stops on V and hangs there, like a comma or a question.",
  plagal: "IV → I: the gentle “A-men” at the end of a hymn.",
  deceptive: "V → vi: you expect home and land on the minor vi instead — a plot twist.",
};
const cadDesc = (c: Cad, minor = false) => ({ authentic: `an authentic cadence (V → ${minor ? "i" : "I"})`, half: "a half cadence (ending on V)", plagal: `a plagal cadence (${minor ? "iv → i" : "IV → I"})`, deceptive: `a deceptive cadence (V → ${minor ? "VI" : "vi"})` })[c];
const CAD_MAJOR: Record<Cad, string[][]> = {
  authentic: [["I", "IV", "V", "I"], ["I", "ii", "V", "I"], ["I", "vi", "V", "I"], ["vi", "IV", "V", "I"], ["I", "iii", "V", "I"]],
  half: [["I", "IV", "I", "V"], ["I", "vi", "ii", "V"], ["I", "ii", "IV", "V"], ["vi", "IV", "I", "V"]],
  plagal: [["I", "V", "IV", "I"], ["I", "vi", "IV", "I"], ["I", "iii", "IV", "I"], ["V", "vi", "IV", "I"]],
  deceptive: [["I", "IV", "V", "vi"], ["I", "ii", "V", "vi"], ["IV", "I", "V", "vi"], ["I", "vi", "V", "vi"]],
};
const CAD_MINOR: Record<Cad, string[][]> = {
  authentic: [["i", "iv", "V", "i"], ["i", "VI", "V", "i"], ["i", "ii°", "V", "i"]],
  half: [["i", "iv", "i", "V"], ["i", "VI", "iv", "V"], ["i", "VII", "VI", "V"]],
  plagal: [["i", "V", "iv", "i"], ["i", "VI", "iv", "i"]],
  deceptive: [["i", "iv", "V", "VI"], ["i", "ii°", "V", "VI"]],
};
const cadSound = (romans: string[], t: number, mode: "major" | "minor" = "major", inst: InstId = "piano") => prog(romans, t, mode, { bpm: 80, inst, style: "block" });
const cadEarT = (key: string, minor: boolean) =>
  topic(key, (r, d) => {
    const drop = pick(r, CADS);
    const set: Cad[] = d < 0.35 ? pick(r, [["authentic", "half"], ["authentic", "deceptive"], ["plagal", "half"]] as Cad[][]) : d < 0.65 ? CADS.filter((c) => c !== drop) : CADS;
    const ans = pick(r, set);
    return listen({
      prompt: minor ? "A phrase in a minor key. How does it end?" : "Listen to the last two chords. How does this phrase end?",
      sound: cadSound(pick(r, (minor ? CAD_MINOR : CAD_MAJOR)[ans]), pick(r, minor ? [55, 57, 60, 62] : [55, 57, 60, 62, 65]), minor ? "minor" : "major", pick(r, ["piano", "strings", "choir", "organ"] as InstId[])),
      options: set.map((c) => opt(c, (minor ? CAD_LABEL_MINOR : CAD_LABEL)[c])),
      answer: ans,
      skill: minor ? "u:cadence:minor" : "u:cadence:ear",
      why: CAD_WHY[ans],
    });
  });
const cadEar = cadEarT("g8-cad-ear", false);
const cadEarMinor = cadEarT("g8-cad-minor", true);
const cadName = topic("g8-cad-name", (r) => {
  const ans = pick(r, CADS);
  const romans = pick(r, CAD_MAJOR[ans]);
  return choose(r, { q: `Name the cadence at the end of this phrase: ${romans.join(" – ")}`, a: CAD_WORD[ans], w: pickN(r, CADS, 2, (x) => x === ans).map((c) => CAD_WORD[c]), v: chordsShow(romans), why: CAD_WHY[ans] }, "u:cadence:name");
});
const cadBuildT = (key: string, minor: boolean) =>
  topic(key, (r, d) => {
    const kind = pick(r, CADS);
    const mode = minor ? "minor" : "major";
    const f = pick(r, minor ? [0, 1, -1, 2, -2] : [0, 1, 2, -1, -2, 3]);
    const home = minor ? "i" : "I";
    return {
      kind: "chords",
      mode: "build",
      prompt: `Write a 4-bar phrase in ${keyName(f, mode)}: start on ${home} and end with ${cadDesc(kind, minor)}.`,
      tonic: midiIn(keyTonicPc(f, mode), 55),
      scale: mode,
      palette: minor ? ["i", "ii°", "iv", "V", "VI", "VII"] : d < 0.35 ? ["I", "IV", "V", "vi"] : ["I", "ii", "iii", "IV", "V", "vi"],
      bars: 4,
      rules: [{ rule: "start", chord: home }, { rule: "cadence", kind }],
      inst: minor ? "strings" : "piano",
      bpm: 84,
      skill: "u:cadence:build",
    };
  });
const cadBuild = cadBuildT("g8-cad-build", false);
const cadBuildMinor = cadBuildT("g8-cad-build-minor", true);
const cadFeel = topic("g8-cad-feel", (r) => {
  const c = pick(r, CADS);
  const ans = c === "half" ? "question" : c === "deceptive" ? "twist" : "finished";
  return listen({ prompt: "How does this phrase feel at the very end?", sound: cadSound(pick(r, CAD_MAJOR[c]), pick(r, [57, 60, 62, 65]), "major", "strings"), options: [opt("finished", "Finished — a full stop"), opt("question", "Unfinished — like a question"), opt("twist", "A surprise — almost home, but not quite")], answer: ans, skill: "u:cadence:feel", why: CAD_WHY[c] });
});
/** Beethoven's Ode to Joy (1824): phrase 1 ends on V (half cadence), phrase 2 ends V → I. */
function odeScore(phrase: 1 | 2): Score {
  const s = song("odetojoy");
  const from = phrase === 1 ? 0 : 15;
  const mel: MNote[] = s.pitches.slice(from, from + 15).map((p, i) => ({ p: p === null ? null : p + 12, d: s.durs[from + i] }));
  const ch = progression(phrase === 1 ? ["I", "I", "V", "V", "I", "I", "V", "V"] : ["I", "I", "V", "V", "I", "I", "V", "I"], 60, "major", { bpm: 120, per: 2, inst: "strings", style: "pad", bass: true });
  return { ...ch, tracks: [notesTrack("flute", mel, 1), ...ch.tracks] };
}
const odeT = topic("g8-ode", (r) => {
  const ph = pick(r, [1, 2] as const);
  if (r() < 0.5)
    return listen({ prompt: `Beethoven's Ode to Joy (1824), phrase ${ph}. How does it end?`, sound: odeScore(ph), options: [opt("half", "Half cadence — on V, unfinished"), opt("authentic", "Authentic cadence — V → I, finished")], answer: ph === 1 ? "half" : "authentic", skill: "u:cadence:real", why: ph === 1 ? "Phrase 1 stops on D over the V chord — a half cadence. It asks a question…" : "…and phrase 2 answers it: V → I, landing on C. Question and answer." });
  return listen({ prompt: "Two phrases of Beethoven's Ode to Joy. Which one sounds FINISHED?", options: pair(r, ["two", odeScore(2)], ["one", odeScore(1)]), answer: "two", skill: "u:cadence:real", why: "Phrase 2 ends V → I (authentic). Phrase 1 ends on V (half cadence) — it needs an answer." });
});
const CAD_Q: Q[] = [
  { q: "In C major, which chord makes a half cadence?", a: "G (V)", w: ["C (I)", "F (IV)"], why: "A half cadence ends ON the dominant, V. In C major that's G." },
  { q: "Why does V → I sound so final?", a: "V holds ti, the leading tone, which rises a half step to do", w: ["V is always the loudest chord", "I is always played the longest"], why: "That half-step pull from ti to do (B → C in C major) is the strongest magnet in tonal music." },
  { q: "The “Amen” sung at the end of many hymns is which cadence?", a: "Plagal (IV → I)", w: ["Half", "Deceptive"], why: "A-men = IV → I. Gentle, settled, warm." },
  { q: "A phrase that ends on V is most like…", a: "A comma or a question mark", w: ["A period", "An exclamation point"], why: "It pauses, but it doesn't finish." },
  { q: "A deceptive cadence goes from V to…", a: "vi", w: ["I", "IV"], why: "V → vi swaps home (I) for its minor cousin (vi) — they share two notes, so it almost works." },
  { q: "In C major, the deceptive cadence G → ? lands on…", a: "A minor", w: ["C major", "F major"], why: "vi in C major is A minor." },
  { q: "Which cadence would you use to end a whole song?", a: "Authentic (V → I)", w: ["Half (ending on V)", "Deceptive (V → vi)"], why: "Only the authentic (or plagal) cadence truly comes home." },
];
const CAD_MINOR_Q: Q[] = [
  { q: "In a minor key, composers usually make the V chord MAJOR. Why?", a: "To get a leading tone a half step below the tonic", w: ["Minor chords can't end phrases", "Because it's easier to play"], why: "In A minor, E minor (E–G–B) becomes E major (E–G♯–B). That G♯ pulls straight up to A." },
  { q: "The scale that raises the 7th of natural minor is called…", a: "Harmonic minor", w: ["Mixolydian", "The blues scale"], why: "A harmonic minor: A B C D E F G♯ A — the G♯ makes a strong V chord." },
  { q: "In A minor, the deceptive cadence goes E major → ?", a: "F major (VI)", w: ["A minor (i)", "D minor (iv)"], why: "V → VI: in A minor that's E → F." },
  { q: "Composers often pair phrases: the first ends with a half cadence, the second with an authentic one. That's called…", a: "Antecedent and consequent (question and answer)", w: ["Theme and variations", "A key change"], why: "Phrase 1 asks, phrase 2 answers. You'll hear it everywhere from Mozart to pop choruses." },
  { q: "Which phrase of Beethoven's Ode to Joy ends with a half cadence?", a: "The first", w: ["The second", "Neither"], why: "Phrase 1 ends on V (re over G) — a question. Phrase 2 ends on I — the answer." },
];
const cadTheory = qT("g8-cad-q", "u:cadence:theory", CAD_Q);
/** Find the leading tone — ti in a major key, harmonic minor's raised 7th in a minor key (sharp-side
 *  minors only, so the raised note is always spelled as a sharp). */
function leadItem(f: number, minor: boolean, labels: boolean): Activity {
  const t = midiIn(keyTonicPc(f, minor ? "minor" : "major"), 60);
  const lt = t - 1;
  const home = minor ? MIN(f) : MAJ(f);
  return {
    kind: "keys",
    task: "find",
    prompt: minor ? `${keyName(f, "minor")}: harmonic minor raises the 7th into a leading tone. Find it.` : `In ${MAJ(f)} major, find ti — the leading tone that pulls up to do in V → I.`,
    answer: [lt],
    lo: 55,
    hi: 79,
    labels,
    octaveFree: true,
    skill: "u:cadence:leading-tone",
    why: minor ? `${home} natural minor has ${nm(lt - 1, f)}; harmonic minor raises it to ${nm(lt, f)}, just a half step below ${home}. That's what makes the V chord major.` : `The 7th note of ${MAJ(f)} major is ${nm(lt, f)}, a half step below ${MAJ(f)}. It sits in the V chord and rises to do.`,
  };
}
const leadMajor = topic("g8-lead-major", (r, d) => leadItem(pick(r, [0, 1, 2, -1, -2, 3, -3]), false, d < 0.35));
const leadMinor = topic("g8-lead-minor", (r, d) => leadItem(pick(r, [0, 1, 2]), true, d < 0.35));
const cadTheoryMinor = qT("g8-cad-minor-q", "u:cadence:theory", CAD_MINOR_Q);

const CAD_IDEA = idea("Musical punctuation", [
  frame("A cadence is the way a musical phrase ends — punctuation for music.", chordsShow(["I", "IV", "V", "I"]), cadSound(["I", "IV", "V", "I"], 60)),
  frame("Authentic cadence, V → I: a period. Finished. Home.", chordsShow(["I", "ii", "V", "I"]), cadSound(["I", "ii", "V", "I"], 60, "major", "strings")),
  frame("Half cadence, ending on V: a comma or a question mark. It hangs in the air, waiting.", chordsShow(["I", "IV", "I", "V"]), cadSound(["I", "IV", "I", "V"], 60, "major", "strings")),
  frame("Plagal cadence, IV → I: the “A-men” at the end of a hymn.", chordsShow(["I", "V", "IV", "I"]), cadSound(["I", "V", "IV", "I"], 60, "major", "choir")),
  frame("Deceptive cadence, V → vi: the plot twist. You expect home… and land somewhere else.", chordsShow(["I", "IV", "V", "vi"]), cadSound(["I", "IV", "V", "vi"], 60, "major", "strings")),
], "u:cadence:idea");
const HEAR_IDEA = idea("Hear the ending", [
  frame("Follow the bass. In V → I it drops from so to do — the strongest move in music.", { show: "ladder", tonic: 60, steps: [0, 2, 4, 5, 7, 9, 11, 12], lit: [7, 0] }, melody([55, 48], [1.5, 2.5], "cello", 80)),
  frame("IV → I moves the bass fa → do: softer, warmer. V → vi climbs so → la: close to home, but not home.", { show: "ladder", tonic: 60, steps: [0, 2, 4, 5, 7, 9, 11, 12], lit: [5, 9] }, then(melody([53, 48], [1.5, 2.5], "cello", 80), melody([55, 57], [1.5, 2.5], "cello", 80), 1)),
  frame("Then ask: does it feel finished (authentic, plagal), waiting (half), or surprised (deceptive)?", { show: "pics", emoji: "🤔" }, then(cadSound(["IV", "V", "I"], 60), cadSound(["IV", "V", "vi"], 60), 1)),
], "u:cadence:idea");
const MINOR_CAD_IDEA = idea("Minor endings, real music", [
  frame("In a minor key the natural v chord is minor — and it sounds weak at the end. Hear v → i…", chordsShow(["i", "iv", "v", "i"], 57, "minor"), cadSound(["i", "iv", "v", "i"], 57, "minor")),
  frame("…now with a MAJOR V borrowed from harmonic minor: G♯ instead of G, a leading tone that pulls up to A.", chordsShow(["i", "iv", "V", "i"], 57, "minor"), cadSound(["i", "iv", "V", "i"], 57, "minor")),
  frame("Beethoven's Ode to Joy asks a question: phrase 1 ends on V, a half cadence…", { show: "pics", emoji: "🎼" }, odeScore(1)),
  frame("…and phrase 2 answers with V → I. Composers call the pair antecedent and consequent.", { show: "pics", emoji: "🎼" }, odeScore(2)),
], "u:cadence:idea");
const WRITE_END_IDEA = idea("Write the ending", [
  frame("Write in pairs: phrase 1 asks (half cadence), phrase 2 answers (authentic cadence). Mozart did it; so do pop choruses.", chordsShow(["I", "IV", "I", "V", "I", "IV", "V", "I"]), prog(["I", "IV", "I", "V", "I", "IV", "V", "I"], 60, "major", { bpm: 96, style: "arp" })),
  frame("Gospel turns the plagal “Amen” into a whole style — organ, choir, and claps on 2 and 4.", { show: "inst", ids: ["organ", "choir"] }, piece("gospel")),
], "u:cadence:idea");

/** A melody for the question phrase (ends hanging on re) and for the answer phrase (ends on do). */
const PHRASE_Q: Activity = { kind: "compose", prompt: "Write the question phrase's melody over I – IV – I – V. Leave it hanging: end on re (D).", pitches: scale(60, "major", 1), slots: 8, dur: 1, inst: "flute", bpm: 92, rules: [{ rule: "end", p: 62 }, { rule: "notes", min: 6 }], tonic: 60, labels: "letters", backing: prog(["I", "IV", "I", "V"], 60, "major", { bpm: 92, style: "arp" }), skill: "u:compose:phrase" };
const PHRASE_A: Activity = { kind: "compose", prompt: "Now the answer phrase over I – IV – V – I. Bring it home: end on do (C).", pitches: scale(60, "major", 1), slots: 8, dur: 1, inst: "flute", bpm: 92, rules: [{ rule: "end", p: 60 }, { rule: "notes", min: 6 }], tonic: 60, labels: "letters", backing: prog(["I", "IV", "V", "I"], 60, "major", { bpm: 92, style: "arp" }), skill: "u:compose:phrase" };

const CADENCE_CLIFFS: WorldDef = {
  id: "g8-cadence",
  title: "Cadence Cliffs",
  emoji: "⛰️",
  grade: "8",
  items: 8,
  theme: "storm",
  blurb: "How phrases end: full stops, commas, amens and plot twists.",
  talk: ["Hum the end of a song you know. Does it sound finished — or like it wants to keep going?", "Where have you heard an “Amen” at the end of a song?"],
  challenge: "Listen to the last few seconds of three songs. For each one, decide: authentic, plagal, half or deceptive?",
  stages: [
    {
      title: "Musical punctuation",
      emoji: "🛑",
      levels: 1,
      topics: [cadEar, cadName, cadBuild],
      fixed: (r) => [
        CAD_IDEA,
        listen({ prompt: "Which phrase ends with an authentic cadence (V → I) — finished?", options: pair(r, ["auth", cadSound(["I", "ii", "V", "I"], 60)], ["half", cadSound(["I", "ii", "IV", "V"], 60)]), answer: "auth", skill: "u:cadence:ear", why: CAD_WHY.authentic }),
        { kind: "chords", mode: "build", prompt: "Write 4 bars in C major: start on I and end with an authentic cadence (V → I).", tonic: 60, scale: "major", palette: ["I", "ii", "IV", "V", "vi"], bars: 4, rules: [{ rule: "start", chord: "I" }, { rule: "cadence", kind: "authentic" }], inst: "piano", bpm: 84, skill: "u:cadence:build" },
        listen({ prompt: "Which phrase ends with the plagal “Amen” (IV → I)?", options: pair(r, ["plagal", cadSound(["I", "V", "IV", "I"], 60, "major", "choir")], ["auth", cadSound(["I", "IV", "V", "I"], 60, "major", "choir")]), answer: "plagal", skill: "u:cadence:ear", why: CAD_WHY.plagal }),
        choose(r, { q: "Name the cadence at the end of this phrase: I – IV – V – vi", a: "Deceptive", w: ["Authentic", "Half"], v: chordsShow(["I", "IV", "V", "vi"]), why: CAD_WHY.deceptive }, "u:cadence:name"),
        listen({ prompt: "One of these fakes you out at the end. Which has the deceptive cadence (V → vi)?", options: pair(r, ["dec", cadSound(["I", "IV", "V", "vi"], 62, "major", "strings")], ["auth", cadSound(["I", "IV", "V", "I"], 62, "major", "strings")]), answer: "dec", skill: "u:cadence:ear", why: CAD_WHY.deceptive }),
        { kind: "chords", mode: "build", prompt: "Now leave it hanging: 4 bars in G major that start on I and end with a half cadence (on V).", tonic: 55, scale: "major", palette: ["I", "ii", "IV", "V", "vi"], bars: 4, rules: [{ rule: "start", chord: "I" }, { rule: "cadence", kind: "half" }], inst: "piano", bpm: 84, skill: "u:cadence:build" },
        cadEar.gen(r, 0.9),
      ],
    },
    practice("Hear the ending", "👂", [cadEar, cadName, cadBuild, leadMajor, cadFeel, cadTheory], { teach: HEAR_IDEA, titles: ["Finished or not?", "Name that ending"] }),
    practice("Minor endings", "🌙", [cadEarMinor, cadBuildMinor, odeT, leadMinor, cadTheoryMinor, cadFeel], { teach: MINOR_CAD_IDEA, titles: ["The major V", "Question and answer"] }),
    {
      title: "Write the ending",
      emoji: "🖊️",
      levels: 1,
      topics: [cadBuild, cadBuildMinor, topic("g8-phrase-compose", (r) => pick(r, [PHRASE_Q, PHRASE_A]))],
      unlocks: ["groove:gospel", "groove:ballad"],
      fixed: () => [
        WRITE_END_IDEA,
        { kind: "chords", mode: "build", prompt: "Phrase 1 — the question: 4 bars in F major, start on I, end with a half cadence.", tonic: 53, scale: "major", palette: ["I", "ii", "IV", "V", "vi"], bars: 4, rules: [{ rule: "start", chord: "I" }, { rule: "cadence", kind: "half" }], inst: "piano", bpm: 88, skill: "u:cadence:build" },
        { kind: "chords", mode: "build", prompt: "Phrase 2 — the answer: start on I again and finish with V → I.", tonic: 53, scale: "major", palette: ["I", "ii", "IV", "V", "vi"], bars: 4, rules: [{ rule: "start", chord: "I" }, { rule: "cadence", kind: "authentic" }], inst: "piano", bpm: 88, skill: "u:cadence:build" },
        PHRASE_Q,
        PHRASE_A,
        { kind: "chords", mode: "build", prompt: "Write a hymn ending for the choir: finish with the plagal “Amen” (IV → I).", tonic: 58, scale: "major", palette: ["I", "ii", "IV", "V", "vi"], bars: 4, rules: [{ rule: "start", chord: "I" }, { rule: "cadence", kind: "plagal" }], inst: "choir", bpm: 72, skill: "u:cadence:build" },
        { kind: "chords", mode: "build", prompt: "Write a ballad phrase that fakes us out: end with a deceptive cadence (V → vi).", tonic: 62, scale: "major", palette: ["I", "ii", "IV", "V", "vi"], bars: 4, rules: [{ rule: "start", chord: "I" }, { rule: "cadence", kind: "deceptive" }], inst: "piano", bpm: 72, beat: true, skill: "u:cadence:build" },
        { kind: "chords", mode: "build", prompt: "In A minor: borrow the major V and end with V → i.", tonic: 57, scale: "minor", palette: ["i", "iv", "V", "VI", "VII"], bars: 4, rules: [{ rule: "start", chord: "i" }, { rule: "cadence", kind: "authentic" }], inst: "strings", bpm: 80, skill: "u:cadence:build" },
      ],
    },
  ],
};

// ── Seventh Chord Sound ─────────────────────────────────────────────────────────────────────
const SEV_WORD: Record<string, string> = { maj7: "Major 7th (dreamy)", "7": "Dominant 7th (bluesy, restless)", m7: "Minor 7th (mellow)", m7b5: "Half-diminished (dark)" };
const SEV_WHY: Record<string, string> = {
  maj7: "Major 7th: a major triad plus the note a half step below the octave — soft, dreamy, a little bittersweet.",
  "7": "Dominant 7th: a major triad plus a minor 7th — bluesy and restless; it wants to resolve.",
  m7: "Minor 7th: a minor triad plus a minor 7th — smooth and mellow.",
  m7b5: "Half-diminished: a diminished triad plus a minor 7th — dark and unsettled.",
};
/** A chord's notes spelled as stacked thirds (C – E♭ – G – B♭, never C – D♯ – G – A♯). */
function spellChord(root: number, q: ChordQuality): string[] {
  const L = "CDEFGAB".indexOf(nm(root, fifthsOfPc(root))[0]);
  const NAT = [0, 2, 4, 5, 7, 9, 11];
  return chordPitches(root, q).map((p, i) => {
    const letter = (L + 2 * i) % 7;
    let acc = (((p - NAT[letter]) % 12) + 12) % 12;
    if (acc > 6) acc -= 12;
    return "CDEFGAB"[letter] + (acc === 1 ? "♯" : acc === -1 ? "♭" : acc === 2 ? "𝄪" : acc === -2 ? "𝄫" : "");
  });
}
const rootName = (root: number) => nm(root, fifthsOfPc(root));
const arpThenChord = (ps: number[], inst: InstId = "piano", bpm = 92) => then(melody(ps, 0.4, inst, bpm), chordSound(ps, inst, 3, bpm), 0);
function sevEarItem(r: Rng, set: ChordQuality[]): Activity {
  const q = pick(r, set);
  const ps = chordPitches(pick(r, [55, 57, 60, 62]), q);
  return listen({ prompt: "Which kind of seventh chord is this?", sound: arpThenChord(ps, "piano", 96), options: set.map((x) => opt(x, SEV_WORD[x])), answer: q, skill: "u:chord:seventh-ear", why: SEV_WHY[q] });
}
const sevEar = topic("g8-sev-ear", (r, d) => {
  if (d < 0.3 && r() < 0.5) {
    const seventh = r() < 0.5;
    const q = pick(r, (seventh ? ["maj7", "7", "m7"] : ["maj", "min"]) as ChordQuality[]);
    return listen({ prompt: "Three notes or four? Is this a triad or a seventh chord?", sound: arpThenChord(chordPitches(pick(r, [55, 57, 60, 62]), q)), options: [opt("triad", "Triad (3 notes)"), opt("seventh", "Seventh chord (4 notes)")], answer: seventh ? "seventh" : "triad", skill: "u:chord:seventh-ear", why: "Count the notes in the arpeggio: a seventh chord adds a fourth note, a 7th above the root." });
  }
  return sevEarItem(r, d < 0.5 ? pick(r, [["maj7", "7"], ["7", "m7"], ["maj7", "m7"]] as ChordQuality[][]) : ["maj7", "7", "m7"]);
});
function sevBuildItem(root: number, q: ChordQuality): Activity {
  const name = rootName(root) + SUFFIX[q];
  return { kind: "keys", task: "chord", prompt: `Build ${name} (${QUALITY_NAME[q]}): ${rootName(root)} is already down.`, answer: chordPitches(root, q), given: [root], lo: 48, hi: 79, labels: true, octaveFree: true, skill: "u:chord:seventh-build", why: `${name} = ${spellChord(root, q).join(" – ")}.` };
}
const sevBuild = topic("g8-sev-build", (r, d) => sevBuildItem(pick(r, d < 0.35 ? [55, 60, 62, 65] : [55, 57, 58, 60, 62, 64, 65]), pick(r, (d < 0.35 ? ["7", "maj7"] : ["7", "maj7", "m7"]) as ChordQuality[])));
const DIA7: [string, string][] = [["Imaj7", "I"], ["ii7", "ii"], ["iii7", "iii"], ["IVmaj7", "IV"], ["V7", "V"], ["vi7", "vi"]];
const diatonic7 = topic("g8-diatonic-7", (r, d) => {
  const f = pick(r, d < 0.35 ? [0] : [0, 1, -1, 2]);
  const t = midiIn(keyTonicPc(f), 55);
  const [ro, deg] = pick(r, DIA7);
  const c = romanChord(ro, t);
  const altQ: ChordQuality = c.q === "7" ? "maj7" : "7";
  const o = romanChord(pick(r, DIA7.filter(([x]) => x !== ro))[0], t);
  const label = (root: number, q: ChordQuality) => `${chordSym(root, q, f)} (${QUALITY_NAME[q]})`;
  return choose(r, { q: `In ${MAJ(f)} major, which seventh chord is built on ${deg}?`, a: label(c.root, c.q), w: [label(c.root, altQ), label(o.root, o.q)], why: `Stack thirds on ${nm(c.root, f)} using only notes of ${MAJ(f)} major: ${nms(chordPitches(c.root, c.q), f)} = ${chordSym(c.root, c.q, f)}. Only V gets a dominant 7th.` }, "u:chord:seventh-diatonic");
});
const sevSpell = topic("g8-sev-spell", (r, d) => {
  const root = pick(r, d < 0.35 ? [55, 60, 62, 65] : [55, 57, 58, 60, 62, 63, 64, 65]);
  const all: ChordQuality[] = ["maj7", "7", "m7"];
  const q = pick(r, all);
  const name = rootName(root) + SUFFIX[q];
  return choose(r, { q: `Spell ${name} (${QUALITY_NAME[q]}).`, a: spellChord(root, q).join(" – "), w: all.filter((x) => x !== q).map((x) => spellChord(root, x).join(" – ")), why: `${name} = ${spellChord(root, q).join(" – ")}. ${SEV_WHY[q]}` }, "u:chord:seventh-spell");
});
const SEV_FUNCTION_Q: Q[] = [
  { q: "In G7 (G – B – D – F), which note is the leading tone that rises to C?", a: "B", w: ["F", "D"], v: keysShow(55, 72, [55, 59, 62, 65]), why: "B → C: ti rises a half step to do." },
  { q: "In G7 resolving to C, which note falls a half step to E?", a: "F", w: ["B", "G"], v: keysShow(55, 72, [55, 59, 62, 65]), why: "The 7th of the chord (F) settles down to the 3rd of C (E)." },
  { q: "G7 contains a tritone. Between which two notes?", a: "B and F", w: ["G and D", "D and F"], why: "B up to F is 6 half steps — a tritone. It squeezes inward to C and E." },
  { q: "Why does V7 → I pull home even harder than V → I?", a: "Its added 7th creates a tritone that needs to resolve", w: ["V7 is played louder", "V7 has fewer notes"], why: "Tension + resolution: the tritone in V7 is the tension." },
  { q: "In a major key, which chord naturally becomes a dominant 7th?", a: "V", w: ["I", "IV"], why: "Stacking thirds on step five gives a major triad + minor 7th — the only dominant 7th in the key." },
  { q: "Lo-fi beats and bossa nova lean on which chord colors?", a: "Major 7ths and minor 7ths", w: ["Power chords", "Only diminished chords"], why: "maj7 and m7 chords sound soft and sophisticated — perfect for chilled-out grooves." },
  { q: "What's added to a triad to make a seventh chord?", a: "One more third on top (a 7th above the root)", w: ["A note an octave below", "A drum hit"], why: "Root, 3rd, 5th… and the 7th." },
];
const sevFunction = qT("g8-sev-function", "u:chord:seventh-function", SEV_FUNCTION_Q);
const JAZZ_PROGS = [["ii7", "V7", "Imaj7", "Imaj7"], ["Imaj7", "vi7", "ii7", "V7"], ["iii7", "vi7", "ii7", "V7"], ["Imaj7", "IVmaj7", "iii7", "vi7"], ["ii7", "V7", "iii7", "vi7"]];
const iiVIMatch = topic("g8-251-match", (r, d) => {
  const ans = pick(r, d < 0.35 ? JAZZ_PROGS.slice(0, 3) : JAZZ_PROGS);
  const all = ["Imaj7", "ii7", "iii7", "IVmaj7", "V7", "vi7"];
  return { kind: "chords", mode: "match", prompt: "Jazz harmony: listen, then lay out the seventh chords.", tonic: pick(r, [55, 57, 60, 62, 65]), scale: "major", palette: d < 0.35 ? all.filter((c) => ans.includes(c) || c === "IVmaj7") : all, bars: 4, answer: [...ans], inst: "piano", bpm: 96, beat: d > 0.4, skill: "u:progression:jazz" };
});
const JAZZ_EAR: { id: string; romans: string[]; name: string; why: string }[] = [
  { id: "251", romans: ["ii7", "V7", "Imaj7", "Imaj7"], name: "the ii – V – I", why: "ii7 – V7 – Imaj7: a minor 7th, a dominant 7th, then the dreamy major 7th landing." },
  { id: "turn", romans: ["Imaj7", "vi7", "ii7", "V7"], name: "the I – vi – ii – V turnaround", why: "Imaj7 – vi7 – ii7 – V7 circles back to the top — jazz's favorite turnaround." },
  { id: "plain", romans: ["I", "IV", "V", "I"], name: "the plain triads (no sevenths at all)", why: "I – IV – V – I with plain three-note chords: no seventh-chord color." },
];
const iiVIEar7 = topic("g8-251-ear", (r) => {
  const t = pick(r, [57, 60, 62, 65]);
  const target = pick(r, JAZZ_EAR);
  const opts = shuffle(r, JAZZ_EAR);
  return listen({ prompt: `Which clip is ${target.name}?`, options: opts.map((x, i) => soundOpt(x.id, prog(x.romans, t, "major", { bpm: 100 }), ["First", "Second", "Third"][i])), answer: target.id, skill: "u:progression:jazz", why: target.why });
});
const JAZZ_Q: Q[] = [
  { q: "When a jazz pianist plays chords in short, rhythmic jabs behind a soloist, it's called…", a: "Comping", w: ["Scatting", "Tuning"], why: "Comping (from “accompanying”) keeps the harmony moving under the solo." },
  { q: "Singing improvised nonsense syllables (“doo-bee-doo-wah”) is called…", a: "Scat singing", w: ["Rapping", "Yodeling"], why: "Louis Armstrong and Ella Fitzgerald were scat legends." },
  { q: "In jazz, the main melody played at the start and end of a tune is called the…", a: "Head", w: ["Bridge", "Outro"], why: "Play the head, take turns soloing over the chords, play the head again." },
  { q: "Making up music on the spot over a chord progression is called…", a: "Improvisation", w: ["Transposition", "Orchestration"], why: "Jazz players learn the chords so well they can invent melodies over them in real time." },
  { q: "Which instrument usually plays the walking bass in a jazz combo?", a: "The double bass", w: ["The piccolo", "The banjo"], why: "The upright double bass walks a note on every beat." },
  { q: "Swing eighth notes are played…", a: "Long-short, long-short", w: ["Perfectly even", "Short-long, like a hiccup"], why: "That lilt is the swing feel." },
];
const jazzFacts = qT("g8-jazz-facts", "u:genre:jazz-facts", JAZZ_Q);
const jazzStyle = topic("g8-jazz-style", (r) => genreItem(r, ["swing", "bossa", "lofi", "blues", "funk", "gospel"], "u:genre:jazz", "Which style is this?"));
function walkScore(t: number, walk: boolean): Score {
  const comp = progression(["ii7", "V7", "Imaj7", "Imaj7"], t, "major", { bpm: 132, per: 4, inst: "piano", style: "block" });
  return { ...comp, swing: 0.33, tracks: [...comp.tracks, notesTrack("doublebass", walk ? line(t - 24, "2 5 9 12 7 11 14 13 12 7 4 7 12 11 9 7") : line(t - 24, "2/4 7/4 0/8"), 0.95)] };
}
const walkBass = topic("g8-walk", (r) => listen({ prompt: "Which bass line is WALKING — a note on every beat, stepping through the chords?", options: pair(r, ["walk", walkScore(pick(r, [57, 60, 62, 65]), true)], ["held", walkScore(pick(r, [57, 60, 62, 65]), false)]), answer: "walk", skill: "u:genre:jazz", why: "A walking bass plays steady quarter notes that outline each chord and step toward the next — the engine of swing." }));
function twinkleHarm(jazz: boolean): Score {
  const s = song("twinkle");
  const mel: MNote[] = s.pitches.map((p, i) => ({ p: p === null ? null : p + 12, d: s.durs[i] }));
  const ch = progression(jazz ? ["Imaj7", "vi7", "IVmaj7", "Imaj7", "ii7", "iii7", "V7", "Imaj7"] : ["I", "I", "IV", "I", "IV", "I", "V", "I"], 60, "major", { bpm: 100, per: 2, inst: "piano", style: "block", bass: true, drums: jazz ? "swing" : null });
  return { ...ch, tracks: [notesTrack(jazz ? "sax" : "flute", mel, 1), ...ch.tracks] };
}

const SEV_IDEA = idea("Stack another third", [
  frame("A triad stacks three notes in thirds: C – E – G. Stack one more third on top and you've built a seventh chord.", keysShow(60, 72, [60, 64, 67, 71]), then(arpThenChord([60, 64, 67]), arpThenChord([60, 64, 67, 71]), 1)),
  frame("Major 7th (C – E – G – B): dreamy and soft — the sound of lo-fi beats and bossa nova.", keysShow(60, 72, [60, 64, 67, 71]), arpThenChord([60, 64, 67, 71])),
  frame("Dominant 7th (G – B – D – F): bluesy and restless. It lives on V and pulls hard toward home.", keysShow(55, 72, [55, 59, 62, 65]), then(arpThenChord([55, 59, 62, 65]), chordSound([60, 64, 67, 72], "piano", 3, 92), 0)),
  frame("Minor 7th (C – E♭ – G – B♭): smooth and mellow — soul, R&B and jazz ballads.", keysShow(60, 72, [60, 63, 67, 70]), arpThenChord([60, 63, 67, 70])),
], "u:chord:idea");
const SEV_KEY_IDEA = idea("Sevenths in a key", [
  frame("Stack thirds on every step of a major scale and you get its seventh chords: Imaj7, ii7, iii7, IVmaj7, V7, vi7, viiø7.", chordsShow(["Imaj7", "ii7", "iii7", "IVmaj7", "V7", "vi7"]), prog(["Imaj7", "ii7", "iii7", "IVmaj7", "V7", "vi7", "viiø7", "Imaj7"], 60, "major", { per: 1, bpm: 76 })),
  frame("Only V gets the dominant 7th. G7 holds B and F — a tritone — and they squeeze inward to C and E.", keysShow(55, 72, [59, 65]), then(chordSound([55, 59, 62, 65], "piano", 2, 80), chordSound([60, 64, 67, 72], "piano", 3, 80), 0)),
  frame("Big-band trombone sections love these sounds: four trombones can stack a whole seventh chord.", { show: "inst", ids: ["trombone"] }, progression(["ii7", "V7", "Imaj7", "Imaj7"], 60, "major", { bpm: 100, per: 2, inst: "trombone", style: "block" })),
], "u:chord:idea");
const JAZZ_IDEA = idea("ii – V – I and jazz", [
  frame("ii – V – I with sevenths — Dm7, G7, Cmaj7 — is the most practiced move in jazz. Players learn it in all twelve keys.", chordsShow(["ii7", "V7", "Imaj7"]), progression(["ii7", "V7", "Imaj7", "Imaj7"], 60, "major", { bpm: 120, per: 4, inst: "piano", style: "block", bass: true, drums: "swing" })),
  frame("Underneath, the double bass walks: one note per beat, stepping from chord to chord.", { show: "inst", ids: ["doublebass"] }, walkScore(60, true)),
  frame("Jazz grew up in New Orleans in the early 1900s. By the 1930s, swing bands were playing these chords across America.", { show: "pics", emoji: "🎺" }, piece("swing")),
], "u:progression:idea");
const JAZZIT_IDEA = idea("Jazz it up", [
  frame("Jazz musicians reharmonize: they trade plain chords for seventh chords. Here's “Twinkle, Twinkle” plain…", { show: "pics", emoji: "⭐" }, twinkleHarm(false)),
  frame("…and jazzed up: Cmaj7 – Am7 – Fmaj7… Same melody, brand-new colors.", { show: "pics", emoji: "🌃" }, twinkleHarm(true)),
], "u:progression:idea");

const JAZZ_LINE: Activity = { kind: "compose", prompt: "Improvise a line over ii – V – I. Jazz players love ending on the 7th of Cmaj7 — finish on B.", pitches: scale(60, "major", 1), slots: 8, dur: 1, inst: "sax", bpm: 120, rules: [{ rule: "end", p: 71 }, { rule: "notes", min: 6 }], tonic: 60, labels: "letters", backing: progression(["ii7", "V7", "Imaj7", "Imaj7"], 60, "major", { bpm: 120, per: 2, inst: "piano", style: "block", bass: true, drums: "swing" }), skill: "u:compose:jazz" };
const SWING_RIDE: Activity = { kind: "beatlab", mode: "make", prompt: "Program the jazz ride pattern — “ding, ding-a, ding, ding-a”: ride on steps 1, 3, 4, 5, 7 and 8, hi-hat foot on 3 and 7.", rows: ["ride", "hat", "kick"], steps: 8, bpm: 132, swing: 0.33, rules: [{ rule: "on", row: "ride", steps: [0, 2, 3, 4, 6, 7] }, { rule: "on", row: "hat", steps: [2, 6] }], skill: "u:beatmaking:swing" };

const SEVENTH_CHORD_SOUND: WorldDef = {
  id: "g8-sevenths",
  title: "Seventh Chord Sound",
  emoji: "🎺",
  grade: "8",
  items: 8,
  theme: "night",
  blurb: "Add one more note — and step into jazz, soul and lo-fi.",
  talk: ["Play a lo-fi or jazz playlist at dinner. Can you hear the dreamy seventh chords?", "Why do you think the same melody can feel totally different with new chords under it?"],
  challenge: "On a piano app, play C – E – G, then add B. Then try B♭ instead. Which one sounds like the blues?",
  stages: [
    {
      title: "Stack another third",
      emoji: "🧱",
      levels: 1,
      topics: [sevEar, sevBuild, sevSpell],
      fixed: (r) => [
        SEV_IDEA,
        listen({ prompt: "Three notes or four? Is this a triad or a seventh chord?", sound: arpThenChord([60, 64, 67, 71]), options: [opt("triad", "Triad (3 notes)"), opt("seventh", "Seventh chord (4 notes)")], answer: "seventh", skill: "u:chord:seventh-ear", why: "C – E – G – B: four notes. The B is a 7th above C." }),
        { kind: "keys", task: "chord", prompt: "Build Cmaj7: C – E – G plus the B on top.", answer: [60, 64, 67, 71], lo: 48, hi: 79, labels: true, given: [60], octaveFree: true, skill: "u:chord:seventh-build", why: "Cmaj7 = C – E – G – B." },
        sevEarItem(r, ["maj7", "7"]),
        { kind: "keys", task: "chord", prompt: "Build G7, the dominant 7th: G – B – D – F.", answer: [55, 59, 62, 65], lo: 48, hi: 79, labels: true, given: [55], octaveFree: true, skill: "u:chord:seventh-build", why: "G7 = G – B – D – F." },
        sevEarItem(r, ["7", "m7"]),
        sevSpell.gen(r, 0.2),
        sevEarItem(r, ["maj7", "7", "m7"]),
      ],
    },
    practice("Sevenths in a key", "🎹", [sevEar, sevBuild, diatonic7, sevSpell, sevFunction], { teach: SEV_KEY_IDEA, titles: ["Build them", "Where they live"], unlocks: ["inst:trombone"] }),
    practice("ii – V – I", "🌃", [iiVIMatch, iiVIEar7, jazzStyle, walkBass, jazzFacts, sevEar], { teach: JAZZ_IDEA, titles: ["The jazz move", "Walk and swing"], unlocks: ["inst:doublebass"] }),
    {
      title: "Jazz it up",
      emoji: "🎶",
      levels: 1,
      topics: [iiVIMatch, sevBuild, topic("g8-jazz-compose", () => JAZZ_LINE), topic("g8-swing-ride", () => SWING_RIDE)],
      unlocks: ["groove:swing"],
      fixed: (r) => [
        JAZZIT_IDEA,
        { kind: "chords", mode: "build", prompt: "Write a 4-bar jazz turnaround: start on Imaj7, use ii7, and finish with V7 → Imaj7.", tonic: 60, scale: "major", palette: ["Imaj7", "ii7", "iii7", "IVmaj7", "V7", "vi7"], bars: 4, rules: [{ rule: "start", chord: "Imaj7" }, { rule: "use", chords: ["ii7"] }, { rule: "cadence", kind: "authentic" }], inst: "piano", bpm: 100, beat: true, skill: "u:progression:jazz" },
        JAZZ_LINE,
        SWING_RIDE,
        { kind: "chords", mode: "build", prompt: "Write a 4-bar lo-fi loop using only 7th chords — include IVmaj7 and iii7.", tonic: 62, scale: "major", palette: ["Imaj7", "ii7", "iii7", "IVmaj7", "vi7"], bars: 4, rules: [{ rule: "use", chords: ["IVmaj7", "iii7"] }], inst: "piano", bpm: 80, beat: true, skill: "u:progression:jazz" },
        sevBuild.gen(r, 0.9),
        walkBass.gen(r, 0.5),
        sevEarItem(r, ["maj7", "7", "m7"]),
      ],
    },
  ],
};

// ── Film Score Falls ────────────────────────────────────────────────────────────────────────
type Mood = "heroic" | "spooky" | "sneaky" | "sad" | "mysterious" | "calm" | "exciting" | "happy";
const FILM_MOODS: Mood[] = ["heroic", "spooky", "sneaky", "sad", "mysterious", "calm", "exciting", "happy"];
const MOOD_WORD: Record<Mood, string> = { heroic: "Heroic", spooky: "Spooky", sneaky: "Sneaky", sad: "Sad", mysterious: "Mysterious", calm: "Calm", exciting: "Action", happy: "Happy" };
const MOOD_WHY: Record<Mood, string> = {
  heroic: "Horns, a major key, big rising leaps and timpani: heroic.",
  spooky: "Tremolo strings, a low drone and clashing tritones: spooky.",
  sneaky: "Plucked (pizzicato) strings tiptoeing in a minor key: sneaky.",
  sad: "Slow, minor, with a cello singing low: sad.",
  mysterious: "A floating whole-tone harp and a hazy pad, with no clear home: mysterious.",
  calm: "Gentle harp, soft flute, major 7th chords and lots of space: calm.",
  exciting: "A driving string ostinato, fast tempo, trumpets and drums: action.",
  happy: "Bright major chords, a bouncy marimba and a pop beat: happy.",
};
/** Moods too close to tell apart for a given scene (never offered together). */
const CLOSE: Record<Mood, Mood[]> = { heroic: ["exciting"], exciting: ["heroic"], spooky: ["mysterious"], mysterious: ["spooky", "sneaky"], sneaky: ["mysterious"], sad: ["calm"], calm: ["sad"], happy: [] };
const SCENES: { scene: string; e: string; mood: Mood }[] = [
  { scene: "The hero bursts through the doors to save the city.", e: "🦸", mood: "heroic" },
  { scene: "A thief tiptoes past the sleeping guard.", e: "🕵️", mood: "sneaky" },
  { scene: "An old map turns up in the attic. Where does it lead?", e: "🗺️", mood: "mysterious" },
  { scene: "Two friends say goodbye at the train station.", e: "🚆", mood: "sad" },
  { scene: "A door creaks open in the haunted house…", e: "👻", mood: "spooky" },
  { scene: "Sunrise over a still lake.", e: "🌅", mood: "calm" },
  { scene: "A rooftop chase at full speed!", e: "🏃", mood: "exciting" },
  { scene: "Surprise! The birthday party bursts into cheers.", e: "🎉", mood: "happy" },
  { scene: "The rescue ship finally appears on the horizon!", e: "🚢", mood: "heroic" },
  { scene: "Two kids creep downstairs at midnight to peek at the presents.", e: "🎁", mood: "sneaky" },
  { scene: "Strange lights glow in the fog over the lake.", e: "🌫️", mood: "mysterious" },
  { scene: "The old lighthouse keeper waves goodbye on his last day.", e: "🗼", mood: "sad" },
  { scene: "Footsteps echo down an empty hallway at midnight.", e: "👣", mood: "spooky" },
  { scene: "Drifting in a rowboat on a sleepy summer afternoon.", e: "🛶", mood: "calm" },
  { scene: "Final lap — the race cars are neck and neck!", e: "🏎️", mood: "exciting" },
  { scene: "Cannonball! Kids splash into the pool on the first day of summer.", e: "🏊", mood: "happy" },
];
const sceneFit = topic("g8-scene-fit", (r) => {
  const s = pick(r, SCENES);
  const others = pickN(r, FILM_MOODS, 2, (m) => m === s.mood || CLOSE[s.mood].includes(m));
  return listen({ prompt: `Scene: ${s.scene} Which cue fits?`, show: { show: "pics", emoji: s.e }, options: shuffle(r, [s.mood, ...others]).map((m, i) => soundOpt(m, piece(m), `Cue ${i + 1}`)), answer: s.mood, skill: "u:film:scene", why: MOOD_WHY[s.mood] });
});
const moodName = topic("g8-mood-name", (r, d) => {
  const m = pick(r, FILM_MOODS);
  const others = pickN(r, FILM_MOODS, d < 0.35 ? 1 : 2, (x) => x === m || CLOSE[m].includes(x));
  return listen({ prompt: "What mood is this cue going for?", sound: piece(m), options: shuffle(r, [m, ...others]).map((x) => opt(x, MOOD_WORD[x])), answer: m, skill: "u:film:mood", why: MOOD_WHY[m] });
});
const FILM_Q: Q[] = [
  { q: "A low note held under everything for a long time is called a…", a: "Drone", w: ["Hook", "Chorus"], why: "Drones build unease (or vastness) without the audience noticing why." },
  { q: "String players shivering on one note with fast back-and-forth bowing is called…", a: "Tremolo", w: ["Pizzicato", "Legato"], why: "Tremolo = nervous shimmer. Suspense scenes are full of it." },
  { q: "Plucking string instruments instead of bowing them is called…", a: "Pizzicato", w: ["Tremolo", "Crescendo"], why: "Pizzicato tiptoes — perfect for sneaking." },
  { q: "A theme attached to a character, place or idea is called a…", a: "Leitmotif", w: ["Cadence", "Bridge"], why: "Richard Wagner made leitmotifs famous in the 1800s; film composers use them constantly." },
  { q: "Music the characters can hear (a band at the party, a car radio) is called…", a: "Diegetic music", w: ["Underscore", "A drone"], why: "Diegetic = inside the story's world. Underscore is music only the audience hears." },
  { q: "Music only the audience hears, playing under the action, is called…", a: "Underscore", w: ["Diegetic music", "A jingle"], why: "The underscore steers our feelings without the characters knowing." },
  { q: "In Prokofiev's Peter and the Wolf (1936), each character gets…", a: "Its own instrument and theme", w: ["Its own key signature only", "No music at all"], why: "Bird = flute, duck = oboe, cat = clarinet, grandfather = bassoon, wolf = French horns, Peter = strings." },
  { q: "Which interval did old music theorists nickname “the devil in music”?", a: "The tritone", w: ["The octave", "The perfect 5th"], why: "Six half steps of pure tension — villains love it." },
  { q: "A short, sharp musical hit that punctuates a moment (a door slam, a reveal) is called a…", a: "Stinger", w: ["Verse", "Groove"], why: "Stingers mark surprises in film, TV and video games." },
];
const filmTools = qT("g8-film-tools", "u:film:tools", FILM_Q);
const HERO_LINES = ["0/1 7/0.5 12/2.5", "0/0.5 4/0.5 7/1 12/2", "7/1 12/1 14/0.5 16/1.5", "0/1 7/1 9/0.5 7/0.5 12/1"];
const VILLAIN_LINES = ["0/1 1/1 0/1 6/1", "0/1.5 3/0.5 6/2", "0/1 -1/1 -2/1 -6/1", "0/0.5 1/0.5 3/1 1/1 0/1"];
const HERO_INST: [InstId, number][] = [["horn", 55], ["trumpet", 60]];
const VILLAIN_INST: [InstId, number][] = [["tuba", 41], ["cello", 48], ["bassoon", 46], ["trombone", 50]];
const heroVillain = topic("g8-hero-villain", (r) => {
  const hs = pickN(r, HERO_LINES, 2).map((spec, i) => ({ spec, inst: HERO_INST[i], bin: "hero" }));
  const vs = pickN(r, VILLAIN_LINES, 2).map((spec, i) => ({ spec, inst: pickN(r, VILLAIN_INST, 2)[i], bin: "villain" }));
  return {
    kind: "soundsort",
    prompt: "Casting call: tap each theme to hear it, then sort it — hero or villain?",
    bins: [{ id: "hero", label: "Hero", emoji: "🦸" }, { id: "villain", label: "Villain", emoji: "🐉" }],
    items: shuffle(r, [...hs, ...vs]).map((x, i) => ({ id: `theme${i + 1}`, label: `Theme ${"ABCD"[i]}`, sound: { bpm: x.bin === "hero" ? 100 : 76, tracks: [notesTrack(x.inst[0], line(x.inst[1], x.spec))] }, bin: x.bin })),
    skill: "u:film:character",
  };
});
const dissonanceItem = (r: Rng, d: number, skill: string, prompt: string): Activity => {
  const dis = r() < 0.5;
  const s = pick(r, dis ? (d < 0.35 ? [1, 6, 11] : [1, 2, 6, 10, 11]) : d < 0.35 ? [7, 12, 4] : [3, 4, 7, 9, 12]);
  const lo = pick(r, [48, 52, 55, 57]);
  return listen({ prompt, sound: chordSound([lo, lo + s], pick(r, ["strings", "piano", "organ"] as InstId[]), 3, 70), options: [opt("con", "Consonant — stable, at rest"), opt("dis", "Dissonant — tense, clashing")], answer: dis ? "dis" : "con", skill, why: `That's a ${intervalName(s)} — ${dis ? "dissonant. Composers stack these for suspense." : "consonant. It sounds settled."}` });
};
const dissonanceEar = topic("g8-dissonance", (r, d) => dissonanceItem(r, d, "u:film:dissonance", "Two notes played together — would this calm the audience (consonant) or put them on edge (dissonant)?"));
function trem(ps: number[], beats: number): MNote[] {
  return Array.from({ length: beats * 8 }, () => ({ p: ps, d: 0.125, v: 0.5 }));
}
const stringTech = topic("g8-string-tech", (r) => {
  const lo = pick(r, [50, 52, 55]);
  if (r() < 0.5) return listen({ prompt: "Which clip uses tremolo — the shivering, fast-repeated bowing of suspense?", options: pair(r, ["trem", { bpm: 72, tracks: [notesTrack("strings", trem([lo, lo + 6], 4), 0.8)] }], ["held", { bpm: 72, tracks: [notesTrack("strings", [{ p: [lo, lo + 6], d: 4 }], 0.8)] }]), answer: "trem", skill: "u:film:tremolo", why: "Tremolo: the bow flies back and forth on one note, a shimmer of nervous energy." });
  const spec = "0/0.5 r/0.5 3/0.5 r/0.5 7/0.5 r/0.5 6/0.5 r/0.5 5/0.5 r/0.5 3/0.5 r/0.5 0/1";
  return listen({ prompt: "Which clip is pizzicato — the strings plucked instead of bowed?", options: pair(r, ["pizz", { bpm: 104, tracks: [notesTrack("pizz", line(lo, spec))] }], ["arco", { bpm: 104, tracks: [notesTrack("strings", line(lo, spec))] }]), answer: "pizz", skill: "u:film:tremolo", why: "Pizzicato = plucked: short, dry, tiptoeing. Bowed strings (arco) sing and sustain." });
});
const MOTIFS: number[][] = [[0, 7, 12, 11, 7], [0, 4, 7, 9, 7], [7, 5, 4, 2, 0], [0, 2, 4, 7, 4]];
const toMinor = (ps: number[]) => ps.map((s) => ([4, 9, 11].includes(pcOf(s)) ? s - 1 : s));
const motif = (ps: number[], t: number, inst: InstId, durs: number[], bpm: number): Score => ({ bpm, tracks: [notesTrack(inst, ps.map((s, i) => ({ p: t + s, d: durs[i % durs.length] })))] });
const leitmotifT = topic("g8-leitmotif", (r) => {
  const [mi, oi] = pickN(r, [0, 1, 2, 3], 2);
  const M = MOTIFS[mi];
  const O = MOTIFS[oi];
  const heroD = [1, 0.5, 1.5, 0.5, 2];
  const slowD = [2, 1, 2, 1, 3];
  const fastD = [0.5, 0.25, 0.25, 0.5, 1];
  const options = shuffle(r, [soundOpt("same", motif(toMinor(M), 48, "cello", slowD, 72)), soundOpt("other", motif(toMinor(O), 48, "cello", slowD, 72)), soundOpt("other2", motif(O, 60, "pizz", fastD, 120))]).map((o, i) => ({ ...o, text: ["First", "Second", "Third"][i] }));
  return listen({ prompt: "Here's the hero's leitmotif. Which clip is the SAME theme, transformed for a sad scene?", sound: motif(M, 60, "horn", heroD, 108), options, answer: "same", skill: "u:film:leitmotif", why: "Same melody shape — now minor, slower and low on the cello. That's how a leitmotif follows a character through the story." });
});
const motifEcho = topic("g8-motif-echo", (r) => {
  const notes = pick(r, MOTIFS).map((s) => 60 + s);
  return { kind: "melody", mode: "echo", prompt: "Composers have to hear a theme and play it back. Listen to this leitmotif on the horn, then play it on the keys.", notes, pads: scale(60, "major", 1), on: "keys", labels: "letters", inst: "horn", durs: [1, 0.5, 1.5, 0.5, 2], bpm: 100, skill: "u:film:leitmotif" };
});
const ORCH: InstId[] = ["horn", "trumpet", "flute", "oboe", "clarinet", "violin", "cello", "tuba"];
const ORCH_WHY: Partial<Record<InstId, string>> = {
  horn: "The French horn: warm and noble — the classic hero's voice.",
  trumpet: "The trumpet: bright and bold — fanfares and victory.",
  flute: "The flute: airy and light — birds, magic, innocence.",
  oboe: "The oboe: reedy and a little sad — it's the duck in Peter and the Wolf.",
  clarinet: "The clarinet: smooth and agile — the cat in Peter and the Wolf.",
  violin: "The violin: soaring — love themes and longing.",
  cello: "The cello: deep and singing — heartfelt moments.",
  tuba: "The tuba: big and low — giants, ogres and villains.",
};
const orchestration = topic("g8-orchestration", (r) => {
  const inst = pick(r, ORCH);
  const info = INSTRUMENTS[inst];
  const t = Math.max(info.lo + 2, Math.min(info.hi - 14, 60));
  return listen({ prompt: "Casting the orchestra: which instrument plays this theme?", sound: { bpm: 96, tracks: [notesTrack(inst, line(t, "0/1 7/0.5 12/1.5 11/0.5 9/0.5 7/2"))] }, options: shuffle(r, [inst, ...pickN(r, ORCH, 2, (x) => x === inst)]).map((x) => instOpt(x)), answer: inst, skill: "u:film:orchestration", why: ORCH_WHY[inst] ?? "" });
});
const chromaticEar = topic("g8-chromatic", (r) => {
  const t = pick(r, [48, 52, 55]);
  const inst = pick(r, ["cello", "bassoon", "strings"] as InstId[]);
  const run = (steps: number[]): Score => ({ bpm: 88, tracks: [notesTrack(inst, steps.map((s, i) => ({ p: t + s, d: i === steps.length - 1 ? 1.5 : 0.5 })))] });
  return listen({ prompt: "Which line creeps up chromatically — every half step, like something sneaking closer?", options: pair(r, ["chrom", run([0, 1, 2, 3, 4, 5, 6, 7])], ["major", run([0, 2, 4, 5, 7, 9, 11, 12])]), answer: "chrom", skill: "u:film:chromatic", why: "A chromatic line moves by half steps — every key, white and black. Composers use it for creeping dread." });
});
function heroBacking(bpm = 96): Score {
  const strings = progression(["I", "♭VI", "♭VII", "I"], 60, "major", { bpm, per: 2, inst: "strings", style: "pad", bass: true });
  return { ...strings, tracks: [...strings.tracks, notesTrack("timpani", line(36, "0/0.25 0/0.25 0/0.25 0/0.25 0/1 r/2 7/1 r/1 0/0.25 0/0.25 0/0.25 0/0.25 0/1 r/1"), 0.8)] };
}

/** The same little tune scored two ways: calm (harp, major) and creepy (tremolo, minor, a tritone drone). */
function twoScores(): Score {
  const calm: Score = { bpm: 76, tracks: [notesTrack("harp", line(60, "0/0.5 4/0.5 7/0.5 11/0.5 12/1 7/1 9/0.5 7/0.5 4/0.5 2/0.5 0/2"), 0.9), notesTrack("pad", [{ p: [48, 55, 64], d: 8 }], 0.4)], fx: { reverb: 0.4 } };
  const creepy: Score = { bpm: 76, tracks: [notesTrack("cello", line(48, "0/0.5 3/0.5 7/0.5 6/0.5 12/1 6/1 8/0.5 7/0.5 3/0.5 1/0.5 0/2"), 0.9), notesTrack("strings", trem([36, 42], 8), 0.5)], fx: { reverb: 0.6 } };
  return then(calm, creepy, 1);
}
const FILM_IDEA = idea("Music you can see", [
  frame("A film score tells you how to feel before anything happens. Same tune, two scores — two completely different movies.", { show: "pics", emoji: "🎬" }, twoScores()),
  frame("Heroes get brass, a major key and big rising leaps — a perfect 5th up feels like standing tall.", { show: "inst", ids: ["horn", "trumpet", "timpani"] }, piece("heroic")),
  frame("Tension comes from low drones, tremolo strings and clashing intervals like the tritone.", { show: "inst", ids: ["cello", "strings"] }, piece("spooky")),
  frame("A leitmotif is a theme tied to a character. When they return, so does their music — changed to fit the moment.", { show: "pics", emoji: "🦸" }, then(motif(MOTIFS[0], 60, "horn", [1, 0.5, 1.5, 0.5, 2], 108), motif(toMinor(MOTIFS[0]), 48, "cello", [2, 1, 2, 1, 3], 72), 1)),
], "u:film:idea");
const FIT_IDEA = idea("Spotting the film", [
  frame("Composers “spot” a film with the director: where music starts, where it stops, and what it should say.", { show: "pics", emoji: "🍿" }),
  frame("Sneaking? Pizzicato strings. Mystery? A floating harp with no clear home. Action? A driving ostinato and drums.", { show: "inst", ids: ["pizz", "harp", "strings"] }, piece("sneaky")),
  frame("Music the characters hear is diegetic (a radio, a band at the party). Music only we hear is the underscore.", { show: "pics", emoji: "📻" }, piece("mysterious")),
], "u:film:idea");
const TENSION_IDEA = idea("Tools of tension", [
  frame("Dissonance: notes that clash and want to move. A minor 2nd or a tritone sets nerves on edge.", { show: "keyboard", lo: 48, hi: 72, lit: [60, 61, 66] }, then(chordSound([60, 61], "strings", 2, 70), chordSound([60, 66], "strings", 2, 70), 0)),
  frame("Tremolo strings shiver; a low drone hums underneath; a chromatic line creeps closer, half step by half step.", { show: "inst", ids: ["strings", "cello"] }, { bpm: 72, tracks: [notesTrack("strings", trem([50, 56], 4), 0.7), notesTrack("cello", [0, 1, 2, 3, 4, 5, 6, 7].map((s) => ({ p: 38 + s, d: 0.5 })), 0.8)] }),
  frame("Low brass and a gong make a villain's entrance enormous.", { show: "inst", ids: ["tuba", "gong"] }, { bpm: 72, tracks: [notesTrack("tuba", line(41, "0/1 1/1 0/1 6/2"), 0.9), { kind: "drums", hits: [{ t: 0, k: "gong", v: 0.9 }] }] }),
], "u:film:idea");
const THEME_IDEA = idea("Compose a theme", [
  frame("Hero recipe: start on do, leap up a 5th (or more), climb, and land somewhere triumphant. Give it to the horns.", { show: "ladder", tonic: 60, steps: [0, 2, 4, 5, 7, 9, 11, 12, 14, 16], lit: [0, 7, 12] }, motif([0, 7, 12, 11, 7, 12], 60, "horn", [1, 0.5, 1.5, 0.5, 1, 2], 100)),
  frame("Villain recipe: low, dark Phrygian with its ♭2 right above home. Wonder recipe: Lydian with its raised 4th.", { show: "ladder", tonic: 60, steps: [0, 1, 3, 5, 7, 8, 10, 12], lit: [1] }, then(motif([0, 1, 0, 3, 1, 0], 48, "trombone", [1, 1, 1, 0.5, 0.5, 2], 76), modeLick(60, "lydian", "harp"), 1)),
], "u:film:idea");

/** Be the conductor on a scoring stage: the chase (fast and loud) and the goodbye (slow and soft). */
const CHASE: Activity = { kind: "conduct", prompt: "Score the chase: drive the orchestra faster (150+ beats per minute) and LOUD.", goal: { tempo: [150, 196], dyn: [0.7, 1] }, music: piece("exciting", { bpm: 120 }), word: "Presto", skill: "u:conduct:film" };
const GOODBYE: Activity = { kind: "conduct", prompt: "The goodbye scene: slow the orchestra to a crawl (under 72) and bring it down soft.", goal: { tempo: [48, 72], dyn: [0.1, 0.4] }, music: piece("sad", { bpm: 92 }), word: "Adagio", skill: "u:conduct:film" };

const FILM_SCORE_FALLS: WorldDef = {
  id: "g8-film",
  title: "Film Score Falls",
  emoji: "🎬",
  grade: "8",
  items: 8,
  theme: "deep",
  blurb: "Music for picture: heroes, villains, chases and goodbyes.",
  talk: ["Watch a movie scene with the sound off, then on. How much did the music change how you felt?", "If your family had a leitmotif, what instrument would play it?"],
  challenge: "Pick a short video clip and play two different songs under it. Which one changes the mood the most?",
  stages: [
    {
      title: "Scoring the scene",
      emoji: "🦸",
      levels: 1,
      topics: [sceneFit, filmTools, leitmotifT, heroVillain],
      unlocks: ["inst:horn"],
      fixed: (r) => [
        FILM_IDEA,
        listen({ prompt: "Scene: The hero bursts through the doors to save the city. Which cue fits?", show: { show: "pics", emoji: "🦸" }, options: shuffle(r, ["heroic", "sad", "sneaky"] as Mood[]).map((m, i) => soundOpt(m, piece(m), `Cue ${i + 1}`)), answer: "heroic", skill: "u:film:scene", why: MOOD_WHY.heroic }),
        listen({ prompt: "What makes this cue tense?", sound: piece("spooky"), options: [opt("trem", "Shivering tremolo strings over a low drone"), opt("major", "Bright major chords and a pop beat"), opt("fast", "A fast, happy marimba tune")], answer: "trem", skill: "u:film:tools", why: MOOD_WHY.spooky }),
        choose(r, { q: "Which interval leap do composers reach for in heroic themes?", a: "A rising perfect 5th", w: ["A falling half step", "A creeping chromatic line"], v: { show: "ladder", tonic: 60, steps: [0, 2, 4, 5, 7, 9, 11, 12], lit: [0, 7] }, why: "Do up to so — strong and open, like standing tall." }, "u:film:tools"),
        leitmotifT.gen(r, 0.2),
        heroVillain.gen(r, 0.2),
        orchestration.gen(r, 0.2),
        stringTech.gen(r, 0.2),
      ],
    },
    practice("Which cue fits?", "🍿", [sceneFit, moodName, filmTools, heroVillain, orchestration], { teach: FIT_IDEA, titles: ["Spot the scene", "Name the mood"] }),
    practice("Tools of tension", "😱", [dissonanceEar, stringTech, leitmotifT, chromaticEar, motifEcho, filmTools, orchestration], { teach: TENSION_IDEA, titles: ["Clash and shiver", "Themes that change"], unlocks: ["inst:tuba", "drum:gong"] }),
    {
      title: "Compose a theme",
      emoji: "🎼",
      levels: 1,
      topics: [topic("g8-film-compose", (r) => pick(r, [heroCompose(), villainCompose(), wonderCompose()])), topic("g8-film-conduct", (r) => pick(r, [CHASE, GOODBYE])), sceneFit],
      unlocks: ["inst:timpani", "scale:phrygian", "scale:lydian"],
      fixed: (r) => [
        THEME_IDEA,
        heroCompose(),
        villainCompose(),
        CHASE,
        wonderCompose(),
        listen({ prompt: "Listen: which percussion crashes in under the villain's theme?", sound: { bpm: 72, tracks: [notesTrack("tuba", line(41, "0/1 1/1 0/1 6/2"), 0.9), { kind: "drums", hits: [{ t: 0, k: "gong", v: 0.95 }] }] }, options: [instOpt("gong"), instOpt("triangle"), instOpt("tamb")], answer: "gong", skill: "u:film:orchestration", why: "The gong's huge, shimmering crash announces danger." }),
        GOODBYE,
        sceneFit.gen(r, 0.9),
      ],
    },
  ],
};
function heroCompose(): Activity {
  return { kind: "compose", prompt: "Compose a hero theme for the horns: start on do (C), leap up at least a 5th somewhere, and land on high do.", pitches: [60, 62, 64, 65, 67, 69, 71, 72, 74, 76], slots: 8, dur: 1, inst: "horn", bpm: 96, rules: [{ rule: "start", p: 60 }, { rule: "leap", min: 4 }, { rule: "end", p: 72 }, { rule: "notes", min: 6 }], tonic: 60, labels: "letters", backing: heroBacking(96), skill: "u:compose:film" };
}
function villainCompose(): Activity {
  return { kind: "compose", prompt: "Compose the villain's theme in C Phrygian, low on the trombone: use the dark D♭ (the ♭2) and end on low C.", pitches: [48, 49, 51, 53, 55, 56, 58, 60], slots: 8, dur: 1, inst: "trombone", bpm: 76, rules: [{ rule: "use", pitches: [49] }, { rule: "end", p: 48 }, { rule: "notes", min: 5 }], tonic: 48, labels: "letters", backing: { bpm: 76, tracks: [notesTrack("strings", trem([36, 43], 8), 0.55)] }, skill: "u:compose:film" };
}
function wonderCompose(): Activity {
  return { kind: "compose", prompt: "Compose a theme of wonder in C Lydian: use the raised 4th (F♯) and land home on C.", pitches: scale(60, "lydian", 1), slots: 8, dur: 1, inst: "harp", bpm: 84, rules: [{ rule: "use", pitches: [66] }, { rule: "end", p: 60 }, { rule: "notes", min: 6 }], tonic: 60, labels: "letters", backing: progression(["I", "II", "II", "I"], 60, "major", { bpm: 84, per: 2, inst: "pad", style: "pad" }), skill: "u:compose:film" };
}

// ── Music History Highway ───────────────────────────────────────────────────────────────────
type Era = "Medieval" | "Renaissance" | "Baroque" | "Classical" | "Romantic" | "20th century";
const ERAS: Era[] = ["Medieval", "Renaissance", "Baroque", "Classical", "Romantic", "20th century"];
function chantDemo(): Score {
  const ps = [62, 62, 64, 65, 64, 62, 60, 62, 65, 67, 69, 67, 65, 64, 62];
  const ds = [1, 1, 0.5, 0.5, 1, 1.5, 0.5, 1, 1, 0.5, 1.5, 1, 0.5, 0.5, 2.5];
  return { bpm: 84, tracks: [notesTrack("choir", ps.map((p, i) => ({ p, d: ds[i] })))], fx: { reverb: 0.85 } };
}
/** Three voices entering one after another with the same theme (imitative polyphony). Recorders
 *  play it an octave up, where a recorder consort actually sits. */
function polyDemo(inst: InstId = "choir"): Score {
  const subject = [67, 69, 71, 72, 71, 69, 67, 66, 67];
  const ds = [1, 0.5, 0.5, 1, 0.5, 0.5, 1, 0.5, 1.5];
  const up = inst === "recorder" ? 12 : 0;
  const v = (shift: number, at: number) => notesTrack(inst, subject.map((p, i) => ({ p: p + shift + up, d: ds[i] })), 0.8, at);
  return { bpm: 88, tracks: [v(0, 0), v(-7, 2), v(-12, 4)], fx: { reverb: 0.6 } };
}
function classicalDemo(): Score {
  const s = song("twinkle");
  const mel: MNote[] = s.pitches.map((p, i) => ({ p: p === null ? null : p + 12, d: s.durs[i] }));
  const alb = (r: number, t: number, f: number): MNote[] => [r, f, t, f].map((p) => ({ p, d: 0.5, v: 0.5 }));
  const I = alb(48, 52, 55), IV = alb(53, 57, 60), V = alb(55, 59, 62);
  return { bpm: 120, tracks: [notesTrack("piano", mel), notesTrack("piano", [...I, ...I, ...IV, ...I, ...IV, ...I, ...V, ...I], 0.8)] };
}
function romanticDemo(): Score {
  const s = songScore("mountainking", { inst: "bassoon", bpm: 126 });
  const t = s.tracks[0];
  return t.kind === "notes" ? { ...s, tracks: [t, notesTrack("pizz", t.notes.map((x) => ({ ...x, p: typeof x.p === "number" ? x.p - 12 : x.p })), 0.7)] } : s;
}
const ERA_DEMO: Record<Era, () => Score> = { Medieval: chantDemo, Renaissance: () => polyDemo(), Baroque: () => piece("minuet"), Classical: classicalDemo, Romantic: romanticDemo, "20th century": () => piece("mysterious") };
const ERA_WHY: Record<Era, string> = {
  Medieval: "One melody in unison, floating free with no beat, in a stone church: Medieval chant.",
  Renaissance: "Several voices with their own melodies, entering one after another: Renaissance polyphony.",
  Baroque: "A busy, steady drive and a walking bass line: Baroque (this minuet is from Anna Magdalena Bach's notebook, 1725).",
  Classical: "A clear tune over a tidy broken-chord accompaniment (an Alberti bass): Classical — Mozart wrote famous variations on this melody.",
  Romantic: "Dramatic, colorful and building in intensity: Grieg's In the Hall of the Mountain King (1875), Romantic.",
  "20th century": "Hazy whole-tone harmony with no clear home: Impressionism, a 20th-century sound Debussy loved.",
};
const eraEarT = (key: string, pool: Era[]) =>
  topic(key, (r) => {
    const set = pickN(r, pool, 3);
    const ans = set[0];
    return listen({ prompt: "Which era does this music come from?", sound: ERA_DEMO[ans](), options: ERAS.filter((e) => set.includes(e)).map((e) => opt(e, e)), answer: ans, skill: "u:history:era-ear", why: ERA_WHY[ans] });
  });
const eraEarEarly = eraEarT("g8-era-ear", ["Medieval", "Renaissance", "Baroque", "Classical"]);
const eraEarAll = eraEarT("g8-era-ear-2", ERAS);
const eraOrderT = (key: string, list: string[], prompt: string, n: number) =>
  topic(key, (r) => {
    const at = Math.floor(r() * (list.length - n + 1));
    return orderItem(prompt, list.slice(at, at + n), "u:history:timeline");
  });
const eraOrder = eraOrderT("g8-era-order", ERAS, "Put these eras in order, oldest first.", 4);
const POP_TIMELINE = ["Ragtime", "Swing big bands", "Rock and roll", "Motown soul", "Hip hop", "House music"];
const popOrder = eraOrderT("g8-pop-order", POP_TIMELINE, "Put these styles in the order they were born, oldest first.", 4);
const COMPOSER_ORDER = ["Hildegard of Bingen", "Josquin des Prez", "J. S. Bach", "Mozart", "Tchaikovsky", "Stravinsky"];
const composerOrder = eraOrderT("g8-composer-order", COMPOSER_ORDER, "Put these composers in order of when they lived, earliest first.", 4);
const ERA_COMPOSERS: Record<Era, string[]> = {
  Medieval: ["Hildegard of Bingen", "Guillaume de Machaut"],
  Renaissance: ["Palestrina", "Josquin des Prez"],
  Baroque: ["J. S. Bach", "Antonio Vivaldi", "George Frideric Handel"],
  Classical: ["Wolfgang Amadeus Mozart", "Joseph Haydn"],
  Romantic: ["Pyotr Tchaikovsky", "Frédéric Chopin", "Richard Wagner", "Edvard Grieg"],
  "20th century": ["Igor Stravinsky", "Claude Debussy", "George Gershwin", "Aaron Copland"],
};
const composerMatchT = (key: string, pool: Era[]) =>
  topic(key, (r) => matchItem("Match each composer to their era.", pickN(r, pool, 4).map((e): [string, string] => [pick(r, ERA_COMPOSERS[e]), e]), "u:composer:era"));
const composerMatchEarly = composerMatchT("g8-composer-match", ["Medieval", "Renaissance", "Baroque", "Classical"]);
const composerMatchAll = composerMatchT("g8-composer-match-2", ERAS);
const GENRE_ARTISTS: Record<string, string[]> = {
  Ragtime: ["Scott Joplin"],
  Blues: ["Bessie Smith", "W. C. Handy"],
  Jazz: ["Louis Armstrong", "Duke Ellington", "Ella Fitzgerald"],
  "Rock and roll": ["Chuck Berry", "Little Richard"],
  Soul: ["Aretha Franklin"],
  Funk: ["James Brown"],
  Reggae: ["Bob Marley"],
  "Hip hop": ["DJ Kool Herc", "Grandmaster Flash"],
  "House music": ["Frankie Knuckles"],
  Salsa: ["Celia Cruz", "Tito Puente"],
  "Bossa nova": ["João Gilberto", "Antônio Carlos Jobim"],
};
const artistMatch = topic("g8-artist-match", (r) => matchItem("Match each artist to the style they helped shape.", pickN(r, Object.keys(GENRE_ARTISTS), 4).map((g): [string, string] => [pick(r, GENRE_ARTISTS[g]), g]), "u:composer:artists"));
const EARLY_Q: Q[] = [
  { q: "Gregorian chant has how many melody lines?", a: "One — everyone sings the same tune", w: ["Four, all different", "None — it's only drums"], why: "One melody line with no harmony is called monophony." },
  { q: "Polyphony means…", a: "Several independent melodies at once", w: ["One melody, very loud", "Music with no rhythm"], why: "Renaissance composers like Palestrina wove voices together like threads." },
  { q: "Which keyboard instrument ruled the Baroque era?", a: "The harpsichord", w: ["The electric piano", "The synthesizer"], why: "Its strings are plucked, not hammered. The piano took over in the Classical era." },
  { q: "Who wrote The Four Seasons (1720s)?", a: "Antonio Vivaldi", w: ["Wolfgang Amadeus Mozart", "Frédéric Chopin"], why: "Vivaldi's violin concertos paint spring, summer, fall and winter." },
  { q: "Joseph Haydn is often called…", a: "The father of the symphony", w: ["The king of rock and roll", "The father of the blues"], why: "Haydn wrote more than 100 symphonies and set the model for the form." },
  { q: "Opera was born around 1600, at the start of which era?", a: "Baroque", w: ["Medieval", "Romantic"], why: "Monteverdi's Orfeo (1607) is one of the first great operas." },
  { q: "Which musical era came right before the Classical era?", a: "Baroque", w: ["Romantic", "Renaissance"], why: "Medieval → Renaissance → Baroque → Classical → Romantic → 20th century." },
  { q: "Hildegard of Bingen (1100s) was…", a: "An abbess who composed chant", w: ["A rock guitarist", "A piano maker"], why: "She's one of the earliest composers whose name and music we still know." },
];
const LATE_Q: Q[] = [
  { q: "Which composer kept writing music after he went deaf?", a: "Ludwig van Beethoven", w: ["J. S. Bach", "Frédéric Chopin"], why: "Beethoven wrote his Ninth Symphony — Ode to Joy — when he was almost completely deaf." },
  { q: "In the Romantic era, orchestras got…", a: "Bigger — more brass, more percussion, bigger emotions", w: ["Smaller — just a harpsichord", "Replaced by computers"], why: "Composers like Tchaikovsky and Wagner wrote for huge orchestras." },
  { q: "Stravinsky's The Rite of Spring (1913) caused an uproar at its premiere in…", a: "Paris", w: ["Nashville", "Tokyo"], why: "Its wild rhythms and clashing chords shocked the audience." },
  { q: "Gershwin's Rhapsody in Blue (1924) mixed classical music with…", a: "Jazz", w: ["Medieval chant", "Techno"], why: "It opens with a famous clarinet glissando." },
  { q: "Impressionist composers like Debussy loved the whole-tone scale because it sounds…", a: "Dreamy and blurry, with no clear home", w: ["Like a marching band", "Exactly like major"], why: "Every step is a whole step, so no note feels like the tonic." },
  { q: "Grieg's In the Hall of the Mountain King (1875) keeps…", a: "Speeding up and getting louder", w: ["Getting slower and softer", "Changing to a rap"], why: "An accelerando and a crescendo build it to a wild finish." },
];
const AMERICAN_Q: Q[] = [
  { q: "Where did jazz grow up in the early 1900s?", a: "New Orleans", w: ["London", "Vienna"], why: "Brass bands, blues, ragtime and Caribbean rhythms met in New Orleans." },
  { q: "Hip hop was born in 1973 at a party in…", a: "The Bronx, New York", w: ["Nashville", "Paris"], why: "DJ Kool Herc looped the drum breaks of funk records so people could dance longer." },
  { q: "What did DJ Kool Herc do with two turntables?", a: "Looped a record's drum break back and forth", w: ["Played two different songs at once on purpose", "Recorded a symphony"], why: "Extending the “break” gave dancers — and soon MCs — room to perform." },
  { q: "Who's called the “Father of the Blues” for publishing songs like “St. Louis Blues”?", a: "W. C. Handy", w: ["Wolfgang Amadeus Mozart", "Elvis Presley"], why: "Handy published blues in the 1910s and helped it spread nationwide." },
  { q: "Which instrument did Chuck Berry make the star of rock and roll?", a: "The electric guitar", w: ["The harpsichord", "The tuba"], why: "His 1950s riffs built on the 12-bar blues became rock's blueprint." },
  { q: "Sister Rosetta Tharpe is called the “Godmother of rock and roll” because…", a: "Her electric-guitar gospel in the 1930s–40s inspired early rockers", w: ["She invented the drum machine", "She wrote symphonies"], why: "Long before Elvis, she was shredding gospel on an electric guitar." },
  { q: "Motown Records — the Supremes, Stevie Wonder — started in…", a: "Detroit", w: ["Seattle", "Paris"], why: "Berry Gordy founded it in 1959; its nickname “Hitsville U.S.A.”" },
  { q: "House music was born in the 1980s in…", a: "Chicago", w: ["Vienna", "Rome"], why: "DJs like Frankie Knuckles built it from disco, drum machines and four-on-the-floor kicks." },
  { q: "The 808 — a drum machine that shaped hip hop and trap — was made by…", a: "Roland", w: ["Steinway", "Stradivarius"], why: "The Roland TR-808 (1980) and its booming kick are everywhere in modern music." },
  { q: "The theremin (1920) is played…", a: "Without touching it — your hands move near two antennas", w: ["By blowing into it", "With a bow"], why: "One of the first electronic instruments — the eerie sound of old sci-fi movies." },
];
const earlyFacts = qT("g8-early-facts", "u:history:facts", EARLY_Q);
const lateFacts = qT("g8-late-facts", "u:history:facts", LATE_Q);
const americanFacts = qT("g8-american-facts", "u:history:facts", AMERICAN_Q);
const textureEar = topic("g8-texture", (r) => {
  const ans = pick(r, ["mono", "poly", "homo"]);
  const sound = ans === "mono" ? chantDemo() : ans === "poly" ? polyDemo() : piece("chorale");
  return listen({ prompt: "Listen to the texture. How many things are going on?", sound, options: [opt("mono", "Monophony — one melody, nothing else"), opt("poly", "Polyphony — several independent melodies"), opt("homo", "Homophony — one melody with chords")], answer: ans, skill: "u:history:texture", why: { mono: "One line in unison: monophony (Medieval chant).", poly: "Voices entering one after another, each with its own melody: polyphony (Renaissance).", homo: "Everyone moving together in chords under one tune: homophony (a hymn)." }[ans] });
});
const popEar = topic("g8-pop-ear", (r) => genreItem(r, ["ragtime", "blues", "swing", "rock", "gospel", "funk", "hiphop", "edm", "reggae"], "u:genre:history", "Which style is this?"));
function historyInstItem(k: number): Activity {
  if (k === 0) return listen({ prompt: "Renaissance players formed whole families (consorts) of this instrument. Which one is it?", sound: polyDemo("recorder"), options: [instOpt("recorder"), instOpt("trumpet"), instOpt("violin")], answer: "recorder", skill: "u:history:instruments", why: "Recorder consorts — from tiny sopranino to big bass recorders — were everywhere in the 1500s." });
  if (k === 1) return listen({ prompt: "Baroque orchestras were built on strings plus this double-reed woodwind. Which one is it?", sound: songScore("minuet", { inst: "oboe", bpm: 112, n: 14 }), options: [instOpt("oboe"), instOpt("tuba"), instOpt("eguitar")], answer: "oboe", skill: "u:history:instruments", why: "The oboe's reedy voice is all over Bach and Handel." });
  return listen({ prompt: "Grieg gave the opening of In the Hall of the Mountain King to this low woodwind. Which is it?", sound: songScore("mountainking", { inst: "bassoon", bpm: 116, n: 13 }), options: [instOpt("bassoon"), instOpt("flute"), instOpt("trumpet")], answer: "bassoon", skill: "u:history:instruments", why: "The bassoon: the low, reedy woodwind that tiptoes through the trolls' hall." });
}
const historyInst = topic("g8-history-inst", (r) => historyInstItem(pick(r, [0, 1, 2])));
const POP_DECADES: [string, string][] = [["Ragtime", "1890s"], ["Swing big bands", "1930s"], ["Rock and roll", "1950s"], ["Motown soul", "1960s"], ["Hip hop", "1970s"], ["House music", "1980s"]];
const popDecade = topic("g8-pop-decade", (r) => {
  const [g, dec] = pick(r, POP_DECADES);
  return choose(r, { q: `Which decade saw the rise of ${g.startsWith("Motown") ? g : g.toLowerCase()}?`, a: dec, w: pickN(r, POP_DECADES.map(([, x]) => x), 2, (x) => x === dec), why: POP_DECADES.map(([x, y]) => `${x}: ${y}`).join(" · ") }, "u:history:timeline");
});

const EARLY_IDEA = idea("Chant to Classical", [
  frame("Medieval chant (about 500–1400): one melody, sung in unison by monks, floating with no steady beat.", { show: "pics", emoji: "⛪" }, chantDemo()),
  frame("Renaissance (1400–1600): many voices, each with its own melody, woven together. That's polyphony.", { show: "pics", emoji: "🎶" }, polyDemo()),
  frame("Baroque (1600–1750): Bach, Vivaldi and Handel. Busy counterpoint, a steady drive, the harpsichord and the oboe.", { show: "inst", ids: ["oboe", "violin"] }, piece("minuet")),
  frame("Classical (1750–1820): Haydn and Mozart. Balanced phrases and a clear tune over a simple accompaniment.", { show: "pics", emoji: "🎹" }, classicalDemo()),
], "u:history:idea");
const LATE_IDEA = idea("Romantic to modern", [
  frame("Romantic (1820–1900): huge emotions and huge orchestras — Chopin, Tchaikovsky, Wagner. Grieg's trolls creep in on bassoon.", { show: "inst", ids: ["bassoon", "pizz"] }, romanticDemo()),
  frame("Liszt even wrote a piano concerto with a famous triangle solo — the Romantics loved new colors.", { show: "inst", ids: ["triangle"] }, { bpm: 100, tracks: [{ kind: "drums", hits: [0, 1, 2, 2.5, 3].map((t) => ({ t, k: "triangle" as DrumId, v: 0.8 })) }, notesTrack("piano", line(60, "12/1 16/1 19/1.5 r/0.5"), 0.7)] }),
  frame("20th century: Debussy's dreamy whole-tone colors, Stravinsky's shocking rhythms, Gershwin mixing in jazz.", { show: "pics", emoji: "🏛️" }, piece("mysterious")),
], "u:history:idea");
const AMERICAN_IDEA = idea("The American century", [
  frame("1890s: John Philip Sousa's marches (listen for the piccolo on top) and Scott Joplin's ragtime.", { show: "inst", ids: ["piccolo"] }, layer(piece("march", { bpm: 116 }), { bpm: 116, tracks: [notesTrack("piccolo", line(84, "0/0.5 4/0.5 7/1 7/0.5 4/0.5 0/1 5/0.5 9/0.5 12/1 9/1 7/0.5 11/0.5 14/1 11/0.5 7/0.5 12/2"), 0.55)] })),
  frame("Then the blues and jazz (New Orleans, 1910s), swing big bands (1930s), and rock and roll (1950s).", { show: "pics", emoji: "📻" }, piece("swing")),
  frame("Motown and soul (1960s), funk (1970s), hip hop (the Bronx, 1973), house and techno (1980s) — and everything since.", { show: "pics", emoji: "🎧" }, piece("hiphop")),
], "u:history:idea");
const TIME_IDEA = idea("Time machine studio", [
  frame("You've traveled a thousand years. Now make music the way each era did: a chant, a Classical phrase, a ragtime rhythm, a hip hop beat and a house groove.", { show: "pics", emoji: "🕰️" }, chantDemo()),
  frame("Each stop has its own tools: chant moves by step in a church mode, Classical phrases end with cadences, ragtime syncopates, and hip hop and house are built on drum machines.", { show: "pics", emoji: "🛣️" }, then(piece("ragtime"), piece("hiphop"), 1)),
], "u:history:idea");

const HISTORY_HIGHWAY: WorldDef = {
  id: "g8-history",
  title: "Music History Highway",
  emoji: "🛣️",
  grade: "8",
  items: 8,
  theme: "pirate",
  blurb: "A thousand years of music — from chant to hip hop.",
  talk: ["Ask a grown-up what music was popular when they were 13. What era would it belong to?", "Which era would you want to visit for one concert — and why?"],
  challenge: "Find one piece from the Baroque era and one from the 2020s. What do they have in common?",
  stages: [
    {
      title: "Chant to Classical",
      emoji: "📜",
      levels: 1,
      topics: [eraEarEarly, eraOrder, composerMatchEarly, textureEar, earlyFacts],
      unlocks: ["inst:recorder", "inst:oboe"],
      fixed: (r) => [
        EARLY_IDEA,
        orderItem("Put these eras in order, oldest first.", ["Medieval", "Renaissance", "Baroque", "Classical"], "u:history:timeline"),
        listen({ prompt: "Which era does this music come from?", sound: chantDemo(), options: [opt("Medieval", "Medieval"), opt("Baroque", "Baroque"), opt("Classical", "Classical")], answer: "Medieval", skill: "u:history:era-ear", why: ERA_WHY.Medieval }),
        matchItem("Match each composer to their era.", [["Hildegard of Bingen", "Medieval"], ["Palestrina", "Renaissance"], ["J. S. Bach", "Baroque"], ["Wolfgang Amadeus Mozart", "Classical"]], "u:composer:era"),
        listen({ prompt: "Which clip is polyphony — several independent melodies at once?", options: pair(r, ["poly", polyDemo()], ["mono", chantDemo()]), answer: "poly", skill: "u:history:texture", why: ERA_WHY.Renaissance }),
        choose(r, EARLY_Q[2], "u:history:facts"),
        historyInstItem(0),
        eraEarEarly.gen(r, 0.5),
      ],
    },
    practice("Romantic to modern", "🏛️", [eraEarAll, composerMatchAll, composerOrder, lateFacts, textureEar, historyInst], { teach: LATE_IDEA, titles: ["Big emotions", "Breaking the rules"], unlocks: ["inst:bassoon", "drum:triangle"] }),
    practice("The American century", "📻", [popEar, artistMatch, popOrder, americanFacts, popDecade], { teach: AMERICAN_IDEA, titles: ["Ragtime to rock", "Soul to hip hop"], unlocks: ["inst:piccolo"] }),
    {
      title: "Time machine studio",
      emoji: "🕰️",
      levels: 1,
      topics: [topic("g8-time-chant", () => TIME_MACHINE[0]), topic("g8-time-beat", (r) => pick(r, TIME_MACHINE.filter((a) => a.kind === "beatlab"))), topic("g8-time-make", (r) => pick(r, TIME_MACHINE.filter((a) => a.kind === "chords" || a.kind === "measure"))), popEar],
      fixed: (r) => [TIME_IDEA, ...TIME_MACHINE, popEar.gen(r, 0.8)],
    },
  ],
};
const TIME_MACHINE: Activity[] = [
  { kind: "compose", prompt: "Medieval: write a chant in D Dorian for the choir. Smooth steps only (no leaps), ending on D.", pitches: scale(62, "dorian", 1), slots: 8, dur: 1, inst: "choir", bpm: 80, rules: [{ rule: "steps" }, { rule: "end", p: 62 }, { rule: "notes", min: 6 }], tonic: 62, labels: "letters", backing: { bpm: 80, tracks: [drone(62, 8)] }, skill: "u:compose:history" },
  { kind: "chords", mode: "build", prompt: "Classical: write a balanced 8-bar phrase — start on I, use IV and V, and finish with V → I.", tonic: 60, scale: "major", palette: ["I", "ii", "IV", "V", "vi"], bars: 8, rules: [{ rule: "start", chord: "I" }, { rule: "use", chords: ["IV", "V"] }, { rule: "cadence", kind: "authentic" }], inst: "piano", bpm: 104, skill: "u:history:create" },
  { kind: "measure", mode: "create", prompt: "Ragtime: write two bars of 2/4 with Joplin's favorite trick — syncopation (syn-co-pa).", meter: [2, 4], bars: 2, cards: ["ta", "titi", "synco", "tika", "z"], must: ["synco"], bpm: 92, skill: "u:history:create" },
  { kind: "beatlab", mode: "make", prompt: "1990s boom-bap hip hop: kick on 1 and the “and” of 3 (step 11), snare on 2 and 4, hi-hats on every eighth.", rows: ["kick", "snare", "hat"], steps: 16, bpm: 90, rules: [{ rule: "on", row: "kick", steps: [0, 10] }, { rule: "on", row: "snare", steps: [4, 12] }, { rule: "count", row: "hat", min: 8 }], skill: "u:beatmaking:history" },
  { kind: "beatlab", mode: "make", prompt: "1980s Chicago house: four-on-the-floor kick (every beat), open hi-hat on the off-beats, clap on 2 and 4.", rows: ["kick", "clap", "openhat", "hat"], steps: 16, bpm: 124, rules: [{ rule: "on", row: "kick", steps: [0, 4, 8, 12] }, { rule: "on", row: "openhat", steps: [2, 6, 10, 14] }, { rule: "on", row: "clap", steps: [4, 12] }], skill: "u:beatmaking:history" },
  orderItem("Your time machine's stops — put them in order, oldest first.", ["Gregorian chant", "Bach's fugues", "Mozart's symphonies", "Joplin's ragtime", "Rock and roll", "Hip hop"], "u:history:timeline"),
];

// ── Producer's Desk ─────────────────────────────────────────────────────────────────────────
/** A little band loop to mix: piano, bass, drums and a flute "vocal". Each part's level can be set. */
function mixLoop(t = 60, o: { lead?: number; band?: number; bass?: number; drums?: number } = {}): Score {
  const band = progression(["I", "vi", "IV", "V"], t, "major", { bpm: 100, per: 2, inst: "piano", style: "pulse", bass: true, drums: "pop" });
  const lead = notesTrack("flute", line(t + 12, "7/1 9/0.5 7/0.5 4/1 7/1 12/1.5 11/0.5 9/1 7/1"), o.lead ?? 0.9);
  const lvl = (tr: MTrack) => (o.band ?? 1) * (tr.kind === "drums" ? (o.drums ?? 1) : tr.inst === "bass" ? (o.bass ?? 1) : 1);
  return { ...band, tracks: [...band.tracks.map((tr) => ({ ...tr, vol: (tr.vol ?? 1) * lvl(tr) })), lead] };
}
const dryLine = (t: number, inst: InstId): Score => ({ bpm: 92, tracks: [notesTrack(inst, line(t, "0/0.5 4/0.5 7/0.5 12/1.5 r/1 7/0.5 4/0.5 0/2 r/1"))], fx: { reverb: 0 } });
const eqEar = topic("g8-eq", (r, d) => {
  const base = mixLoop(pick(r, [57, 60, 62]));
  const muff = withScoreFx(base, { lowpass: d < 0.35 ? 0.9 : 0.72 });
  const k = pick(r, [0, 1, 2]);
  if (k === 0) return listen({ prompt: "Which version has a low-pass filter on it — highs cut, so it sounds muffled, like music through a wall?", options: pair(r, ["lp", muff], ["full", base]), answer: "lp", skill: "u:production:eq", why: "A low-pass filter lets lows through and cuts highs: the cymbals and sparkle vanish, like a party next door." });
  if (k === 1) return listen({ prompt: "Which version sounds BRIGHTER — the one with its high frequencies left in?", options: pair(r, ["full", base], ["lp", muff]), answer: "full", skill: "u:production:eq", why: "High frequencies carry sparkle and detail: hi-hats, breath, the click of a pick." });
  const filtered = r() < 0.5;
  return listen({ prompt: "Is this version filtered (muffled) or full-range?", sound: filtered ? muff : base, options: [opt("lp", "Filtered — muffled, highs cut"), opt("full", "Full-range — bright and clear")], answer: filtered ? "lp" : "full", skill: "u:production:eq", why: filtered ? "The hi-hats and brightness are gone: a low-pass filter." : "You can hear the crisp hi-hats and the bright flute: full-range." });
});
const reverbEar = topic("g8-reverb", (r, d) => {
  const dry = dryLine(pick(r, [60, 62, 64]), pick(r, ["piano", "flute", "trumpet", "marimba"] as InstId[]));
  const wet = withScoreFx(dry, { reverb: d < 0.35 ? 1 : 0.75 });
  const k = pick(r, [0, 1, 2]);
  if (k === 0) return listen({ prompt: "Which version sounds like it was recorded in a giant cathedral?", options: pair(r, ["wet", wet], ["dry", dry]), answer: "wet", skill: "u:production:reverb", why: "Reverb is the sound bouncing around a space. Big room = long, washy tail after every note." });
  if (k === 1) return listen({ prompt: "Which version is DRY — a small, dead room with almost no echo?", options: pair(r, ["dry", dry], ["wet", wet]), answer: "dry", skill: "u:production:reverb", why: "Dry = the notes stop cleanly. Listen in the gaps between notes." });
  const isWet = r() < 0.5;
  return listen({ prompt: "Listen to the gaps between the notes. Lots of reverb, or dry?", sound: isWet ? wet : dry, options: [opt("wet", "Lots of reverb (a big space)"), opt("dry", "Dry (a small room)")], answer: isWet ? "wet" : "dry", skill: "u:production:reverb", why: isWet ? "Notes keep ringing into the silence — that tail is reverb." : "The notes stop cleanly — dry." });
});
const PAN_Q: Q[] = [
  { q: "Most mixers keep which parts dead center?", a: "The lead vocal, the kick and the bass", w: ["The cymbals and the tambourine", "Nothing — everything goes far left"], why: "The most important, lowest and loudest parts anchor the middle." },
  { q: "Why pan two guitar parts to opposite sides?", a: "So each has its own space and the mix sounds wide", w: ["To make them quieter", "So only one ear can hear music"], why: "Spreading parts left and right keeps them from crowding each other." },
  { q: "A pan knob turned all the way left means…", a: "The sound comes only from the left speaker", w: ["The sound gets lower in pitch", "The sound plays backward"], why: "Pan places a sound between left and right." },
];
const panT = topic("g8-pan", (r) => {
  if (r() < 0.6) return choose(r, pick(r, PAN_Q), "u:production:pan");
  const left = r() < 0.5;
  return listen({ prompt: "Headphones on! Is this marimba panned LEFT or RIGHT?", sound: withScoreFx({ bpm: 100, tracks: [notesTrack("marimba", line(60, "0 4 7 12 7 4 0/2"), 1)] }, { pan: left ? -0.9 : 0.9 }), options: [opt("left", "Left"), opt("right", "Right")], answer: left ? "left" : "right", skill: "u:production:pan", why: "Panning places a sound between the left and right speakers so each instrument gets its own spot." });
});
const balanceEar = topic("g8-balance", (r, d) => {
  const t = pick(r, [57, 60, 62]);
  const k = pick(r, d < 0.35 ? [0, 1] : [0, 1, 2, 3]);
  if (k === 0) return listen({ prompt: "The flute is the “lead vocal” here. Which mix lets it sit clearly on top?", options: pair(r, ["good", mixLoop(t, { lead: 1, band: 0.5 })], ["buried", mixLoop(t, { lead: 0.22, band: 1 })]), answer: "good", skill: "u:production:balance", why: "Level balance comes first in every mix: the lead should be easy to follow, with the band supporting underneath." });
  if (k === 1) return listen({ prompt: "Which mix has the drums turned up WAY too loud?", options: pair(r, ["loud", mixLoop(t, { drums: 1.8, lead: 0.6 })], ["ok", mixLoop(t)]), answer: "loud", skill: "u:production:balance", why: "When the drums swamp everything, the melody and chords get lost. Pull that fader down." });
  if (k === 2) return listen({ prompt: "Which mix has more low end — a bigger, fuller bass?", options: pair(r, ["big", mixLoop(t, { bass: 1.8 })], ["thin", mixLoop(t, { bass: 0.25 })]), answer: "big", skill: "u:production:balance", why: "The bass guitar fills the lows. Too little and the mix sounds thin; too much and it gets muddy." });
  const quiet = r() < 0.5;
  return listen({ prompt: "Is the lead (the flute) balanced well, or buried under the band?", sound: quiet ? mixLoop(t, { lead: 0.22, band: 1 }) : mixLoop(t, { lead: 1, band: 0.5 }), options: [opt("good", "Balanced — easy to follow"), opt("buried", "Buried — hard to hear")], answer: quiet ? "buried" : "good", skill: "u:production:balance", why: quiet ? "The flute is drowning in the band — raise its fader." : "You can follow the flute easily: a good balance." });
});
const compressEar = topic("g8-compress", (r) => {
  const ps = pick(r, [[60, 62, 64, 65, 67, 65, 64, 62, 60], [67, 64, 65, 62, 64, 60, 62, 59, 60], [60, 64, 67, 72, 67, 64, 60, 64, 67]]);
  const wild = [0.2, 1, 0.3, 0.95, 0.15, 1, 0.25, 0.9, 0.4];
  const clip = (vs: number[]): Score => ({ bpm: 100, tracks: [notesTrack(pick(r, ["piano", "guitar"] as InstId[]), ps.map((p, i) => ({ p, d: i === ps.length - 1 ? 1.5 : 0.5, v: vs[i % vs.length] })))] });
  return listen({ prompt: "A compressor evens out the loud and soft moments. Which clip has been compressed?", options: pair(r, ["comp", clip([0.7])], ["raw", clip(wild)]), answer: "comp", skill: "u:production:compression", why: "Compression turns down the loudest peaks so everything sits at a steadier level — why radio vocals sound so even and close." });
});
const FREQ: Record<"low" | "mid" | "high", (InstId | DrumId)[]> = { low: ["tuba", "bass", "doublebass", "kick", "synthbass"], mid: ["guitar", "viola", "trombone", "clarinet", "accordion"], high: ["piccolo", "glock", "triangle", "flute", "hat"] };
const freqSort = topic("g8-freq-sort", (r) => ({
  kind: "soundsort",
  prompt: "Producers think in frequency ranges. Tap each sound, then sort it: lows, mids or highs?",
  bins: [{ id: "low", label: "Lows (bass)" }, { id: "mid", label: "Mids" }, { id: "high", label: "Highs (treble)" }],
  items: shuffle(r, (["low", "mid", "high"] as const).flatMap((b) => pickN(r, FREQ[b], 2).map((x) => ({ id: x, label: x in INSTRUMENTS ? INSTRUMENTS[x as InstId].name : x === "kick" ? "Kick drum" : x === "hat" ? "Hi-hat" : "Triangle", inst: x, bin: b })))),
  skill: "u:acoustics:frequency",
}));
const waveT = topic("g8-wave", (r, d) => {
  const k = pick(r, d < 0.35 ? ["octave", "higher", "lower"] : ["octave", "match", "match"]);
  if (k === "match") {
    const hz = pick(r, [220, 262, 330]);
    return { kind: "wave", mode: "match", prompt: "Tune the oscillator: slide until your tone matches the target frequency.", hz, amp: 0.6, target: { hz: pick(r, [440, 523, 392, 294].filter((x) => Math.abs(x - hz) / hz > 0.15)), amp: 0.6 }, skill: "u:acoustics:wave" };
  }
  if (k === "octave") return { kind: "wave", mode: "octave", prompt: "Make the tone exactly one octave higher — double its frequency (220 Hz → 440 Hz).", hz: pick(r, [220, 262, 330, 440]), amp: 0.6, skill: "u:acoustics:wave" };
  return { kind: "wave", mode: k as "higher" | "lower", prompt: k === "higher" ? "Raise the frequency: faster wiggles = higher pitch." : "Lower the frequency: slower wiggles = lower pitch.", hz: pick(r, [330, 440, 523]), amp: 0.6, skill: "u:acoustics:wave" };
});
const MIX_Q: Q[] = [
  { q: "The vocal is buried under the band. What's the first fix?", a: "Raise the vocal's fader (or lower the band)", w: ["Add reverb to everything", "Speed the song up"], why: "Balance first, effects later." },
  { q: "What does EQ (equalization) change?", a: "How loud each frequency range is — bass, mids, treble", w: ["The tempo", "The key of the song"], why: "EQ is a set of volume knobs for different frequency ranges." },
  { q: "A kick drum's thump lives mostly in which range?", a: "The lows (around 50–100 Hz)", w: ["The highs (around 10,000 Hz)", "It has no frequency"], why: "Low frequencies = big, slow wiggles = thump." },
  { q: "Reverb makes a sound seem…", a: "Farther away, in a bigger space", w: ["Higher in pitch", "Faster"], why: "More reverb pushes a sound back; dry sounds feel close." },
  { q: "Why do producers cut the lowest frequencies from a guitar track?", a: "To leave room for the bass and kick", w: ["To make the guitar the loudest thing", "To change its key"], why: "Every part needs its own space in the frequency spectrum." },
  { q: "What does a compressor do?", a: "Evens out loud and soft moments", w: ["Removes the drums", "Adds an echo"], why: "It turns down peaks so the level stays steady." },
  { q: "Doubling a frequency (220 Hz → 440 Hz) raises the pitch by…", a: "One octave", w: ["A half step", "Nothing"], why: "Octave = twice the frequency. A4 is 440 Hz; A5 is 880 Hz." },
];
const mixFacts = qT("g8-mix-facts", "u:production:facts", MIX_Q);

const DESK_IDEA = idea("The mixing desk", [
  frame("Every song you love was mixed: the producer balanced each part, carved out space, and placed it in a room.", { show: "pics", emoji: "🎛️" }, mixLoop()),
  frame("Faders set the balance. Here the lead flute is buried…", { show: "pics", emoji: "🎧" }, mixLoop(60, { lead: 0.22, band: 1 })),
  frame("…and here it sits on top, where the listener can follow it.", { show: "pics", emoji: "🎧" }, mixLoop(60, { lead: 1, band: 0.5 })),
  frame("EQ shapes tone. A low-pass filter cuts the highs — instant “music through a wall.”", { show: "wave", hz: 220, amp: 0.6, compare: { hz: 880, amp: 0.3 } }, withScoreFx(mixLoop(), { lowpass: 0.85 })),
  frame("Reverb places a sound in a space — from a tiny closet to a cathedral.", { show: "pics", emoji: "⛪" }, then(dryLine(60, "piano"), withScoreFx(dryLine(60, "piano"), { reverb: 1 }), 1)),
], "u:production:idea");
const FX_IDEA = idea("EQ, reverb and pan", [
  frame("Bright vs muffled: the highs carry sparkle (hi-hats, breath). Cut them and the sound goes dark.", { show: "pics", emoji: "🔊" }, then(mixLoop(62), withScoreFx(mixLoop(62), { lowpass: 0.8 }), 1)),
  frame("Panning places sounds left to right. Put on headphones: this marimba starts left and lands right.", { show: "pics", emoji: "🎧" }, then(withScoreFx({ bpm: 100, tracks: [notesTrack("marimba", line(60, "0 4 7 12/2"), 1)] }, { pan: -0.9 }), withScoreFx({ bpm: 100, tracks: [notesTrack("marimba", line(60, "12 7 4 0/2"), 1)] }, { pan: 0.9 }), 0.5)),
], "u:production:idea");
const FREQ_IDEA = idea("Balance and frequencies", [
  frame("Sound is vibration. A low note wiggles slowly (a kick drum, around 60 times a second); a high note wiggles fast (a cymbal, thousands).", { show: "wave", hz: 55, amp: 0.8, compare: { hz: 1760, amp: 0.4 } }, then({ bpm: 60, tracks: [notesTrack("synthbass", [{ p: 33, d: 2 }])] }, { bpm: 60, tracks: [notesTrack("whistle", [{ p: 93, d: 2 }])] }, 0.5)),
  frame("That pure sine-wave tone is the simplest sound there is — a whistle with no extra overtones.", { show: "inst", ids: ["whistle"] }, { bpm: 80, tracks: [notesTrack("whistle", line(72, "0 4 7 12/2"))] }),
  frame("A great mix gives every part its own lane: bass in the lows, guitars and keys in the mids, cymbals in the highs. A compressor keeps levels steady.", { show: "pics", emoji: "📊" }, mixLoop(57)),
], "u:production:idea");
const MIX_IDEA = idea("The final mix", [
  frame("Producers “ride the fader”: pulling the level down for a quiet verse and pushing it up for the chorus. Your hand is the fader now.", { show: "dynamics", marks: ["p", "cresc", "f"] }, hairpin(mixLoop(), 0.3, 1)),
  frame("Then choose the room — dry and close, or a cathedral of reverb — and make sure every part has its own lane.", { show: "pics", emoji: "⛪" }, then(dryLine(62, "flute"), withScoreFx(dryLine(62, "flute"), { reverb: 1 }), 1)),
], "u:production:idea");

const PRODUCERS_DESK: WorldDef = {
  id: "g8-producer",
  title: "Producer's Desk",
  emoji: "🎛️",
  grade: "8",
  items: 8,
  theme: "sky",
  blurb: "Balance, EQ, reverb, panning and compression — mix like a pro.",
  talk: ["Listen to a song on headphones. Can you hear instruments placed left and right?", "Why might a producer make the voice louder than the drums?"],
  challenge: "Play one song in a small room and then in a big echoey space (a hallway or stairwell). How does the reverb change it?",
  stages: [
    {
      title: "The mixing desk",
      emoji: "🎧",
      levels: 1,
      topics: [balanceEar, eqEar, reverbEar, mixFacts],
      fixed: (r) => [DESK_IDEA, balanceEar.gen(r, 0.2), eqEar.gen(r, 0.1), choose(r, MIX_Q[1], "u:production:facts"), reverbEar.gen(r, 0.1), compressEar.gen(r, 0.2), choose(r, MIX_Q[0], "u:production:facts"), eqEar.gen(r, 0.6)],
    },
    practice("EQ, reverb and pan", "🔊", [eqEar, reverbEar, panT, compressEar, mixFacts], { teach: FX_IDEA, titles: ["Bright and dark", "Rooms and spaces"] }),
    practice("Balance and frequencies", "📊", [balanceEar, freqSort, waveT, compressEar, mixFacts], { teach: FREQ_IDEA, titles: ["Every part a lane", "Hertz and octaves"], unlocks: ["inst:whistle"] }),
    {
      title: "Mix it",
      emoji: "⭐",
      levels: 1,
      topics: [topic("g8-ride-fader", (r) => pick(r, RIDE_FADER)), topic("g8-room-beat", () => ROOM_BEAT), balanceEar],
      fixed: (r) => [
        MIX_IDEA,
        RIDE_FADER[0],
        RIDE_FADER[1],
        listen({ prompt: "The director wants this melody to sound like it's echoing through a giant cave. Pick the right version.", options: shuffle(r, [soundOpt("cave", withScoreFx(dryLine(62, "flute"), { reverb: 1 })), soundOpt("dry", dryLine(62, "flute")), soundOpt("muffled", withScoreFx(dryLine(62, "flute"), { lowpass: 0.85 }))]).map((o, i) => ({ ...o, text: ["Mix A", "Mix B", "Mix C"][i] })), answer: "cave", skill: "u:production:reverb", why: "A cave is a huge space: long reverb tails. The muffled one just sounds like it's behind a wall." }),
        ROOM_BEAT,
        freqSort.gen(r, 0.5),
        { kind: "wave", mode: "octave", prompt: "Final check: raise this tone exactly one octave (double the frequency).", hz: 262, amp: 0.6, skill: "u:acoustics:wave" },
        eqEar.gen(r, 0.9),
      ],
    },
  ],
};
const ROOM_BEAT: Activity = { kind: "beatlab", mode: "make", prompt: "Leave room for the bass: kick ONLY on beats 1 and 3 (steps 1 and 9), hi-hats on every eighth, snare on 2 and 4.", rows: ["kick", "snare", "hat"], steps: 16, bpm: 96, rules: [{ rule: "on", row: "kick", steps: [0, 8] }, { rule: "count", row: "kick", min: 2, max: 2 }, { rule: "on", row: "snare", steps: [4, 12] }, { rule: "count", row: "hat", min: 8 }], skill: "u:beatmaking:mix" };
const RIDE_FADER: Activity[] = [
  { kind: "conduct", prompt: "Ride the fader: the verse should sit LOW. Slide the level down to about a third and hold it there.", goal: { dyn: [0.15, 0.4] }, music: mixLoop(60), word: "Verse", skill: "u:conduct:mix" },
  { kind: "conduct", prompt: "Chorus! Push the fader up near the top and hold it there.", goal: { dyn: [0.8, 1] }, music: mixLoop(62), word: "Chorus", skill: "u:conduct:mix" },
];

// ── Theory Summit ───────────────────────────────────────────────────────────────────────────
const TUNES: number[][] = [[0, 2, 4, 5, 7, 5, 4, 2, 0], [0, 4, 7, 12, 7, 4, 0], [7, 5, 4, 2, 4, 5, 7, 7], [0, 0, 7, 7, 9, 9, 7]];
const tuneScore = (off: number[], t: number, inst: InstId = "piano"): Score => melody(off.map((o) => t + o), off.map((_, i, a) => (i === a.length - 1 ? 1.5 : 0.5)), inst, 104);
function alterTune(r: Rng, off: number[]): number[] {
  const i = 1 + Math.floor(r() * (off.length - 2));
  return off.map((x, j) => (j === i ? x + pick(r, [1, 2, -1]) : x));
}
const transposeEar = topic("g8-transpose-ear", (r) => {
  const tune = pick(r, TUNES);
  const t = pick(r, [57, 60, 62]);
  const shift = pick(r, [2, 5, 7, -3, 4]);
  const same = r() < 0.5;
  return listen({ prompt: "Is the second clip the SAME tune transposed to a new key, or a different tune?", sound: then(tuneScore(tune, t), tuneScore(same ? tune : alterTune(r, tune), t + shift), 1), options: [opt("same", "Same tune, new key"), opt("diff", "A different tune")], answer: same ? "same" : "diff", skill: "u:melody:transpose", why: same ? "Every interval matches — it's the same tune moved up or down." : "One interval changed, so it isn't a true transposition." });
});
const transposePick = topic("g8-transpose-pick", (r) => {
  const tune = pick(r, TUNES);
  const t = 60;
  const shift = pick(r, [2, 5, 7]);
  const opts = shuffle(r, [soundOpt("exact", tuneScore(tune, t + shift, "marimba")), soundOpt("wrong", tuneScore(alterTune(r, tune), t + shift, "marimba")), soundOpt("flip", tuneScore(tune.map((x) => -x + 7), t + shift, "marimba"))]).map((o, i) => ({ ...o, text: ["First", "Second", "Third"][i] }));
  return listen({ prompt: "Here's a tune. Which clip is the SAME tune transposed into a new key?", sound: tuneScore(tune, t), options: opts, answer: "exact", skill: "u:melody:transpose", why: "Transposing keeps every interval: same shape, new starting note." });
});
const SHIFT_WORD: Record<number, string> = { 2: "up a whole step", 5: "up a perfect 4th", 7: "up a perfect 5th", 9: "up a major 6th", [-2]: "down a whole step" };
const transposeCalc = topic("g8-transpose-calc", (r, d) => {
  const m = pick(r, [[0, 4, 7], [0, 2, 4], [0, 5, 7], [4, 2, 0], [7, 4, 0]]);
  const shift = pick(r, d < 0.35 ? [2, 7] : [2, 5, 7, 9, -2]);
  const src = m.map((x) => 60 + x);
  const dst = src.map((p) => p + shift);
  const fd = fifthsOfPc(60 + shift);
  const w1 = nms(dst.map((p, i) => (i === 1 ? p + (m[1] === 4 || m[1] === 2 ? -1 : 1) : p)), fd);
  const w2 = nms(src.map((p) => p + shift + 1), fifthsOfPc(61 + shift));
  return choose(r, { q: `Transpose ${nms(src)} ${SHIFT_WORD[shift]}. What do you get?`, a: nms(dst, fd), w: [w1, w2].filter((x) => x !== nms(dst, fd)), v: staffShow(src.map((p) => ({ p, d: 1 }))), why: `Move every note ${SHIFT_WORD[shift]}: ${src.map((p, i) => `${nm(p)} → ${nm(dst[i], fd)}`).join(", ")}.` }, "u:melody:transpose");
});
function chorusLine(t: number): Score {
  return layer(progression(["I", "V", "vi", "IV"], t, "major", { bpm: 108, per: 2, inst: "piano", style: "pulse", bass: true }), { bpm: 108, tracks: [notesTrack("synth", line(t + 12, "4/1 7/1 9/1.5 7/0.5 5/1 4/1 2/2"), 0.85)] });
}
function modulationItem(up: number, t: number): Activity {
  return listen({ prompt: "The chorus plays twice. Does the key change (modulate) the second time?", sound: then(chorusLine(t), up ? transpose(chorusLine(t), up) : chorusLine(t), 0), options: [opt("yes", "Yes — it modulates up"), opt("no", "No — same key both times")], answer: up ? "yes" : "no", skill: "u:key-sig:modulation", why: up ? `The second chorus jumps up ${up === 1 ? "a half step" : "a whole step"} — a classic lift for a song's final chorus.` : "Same key both times — no modulation." });
}
const modulationEar = topic("g8-modulation", (r) => modulationItem(pick(r, [0, 1, 2]), pick(r, [57, 60])));
function inversionItem(rootPc: number, inv: 1 | 2): Activity {
  const f = fifthsOfPc(rootPc);
  const b = midiIn(pcOf(rootPc + (inv === 1 ? 4 : 7)), 52);
  const ps = inv === 1 ? [b, b + 3, b + 8] : [b, b + 5, b + 9];
  const root = MAJ(f);
  return { kind: "keys", task: "chord", prompt: `Build ${root} major in ${inv === 1 ? "first" : "second"} inversion — ${nm(b, f)} on the bottom. (Slash chord: ${root}/${nm(b, f)}.)`, answer: ps, given: [b], lo: 48, hi: 79, labels: true, skill: "u:chord:inversion", why: `${root}/${nm(b, f)} = ${nms(ps, f)}: the ${inv === 1 ? "3rd" : "5th"} of the chord is in the bass.` };
}
const inversionT = topic("g8-inversion", (r, d) => inversionItem(pick(r, [0, 5, 7, 2, 9]), d < 0.35 ? 1 : pick(r, [1, 2] as const)));
const SLASH_Q: Q[] = [
  { q: "What does C/E mean on a chord chart?", a: "A C major chord with E as the lowest note", w: ["Play C, then E", "C divided by E: a rest"], why: "Chord / bass note. C/E is C major in first inversion." },
  { q: "A chord in root position has which note on the bottom?", a: "The root", w: ["The 3rd", "The 5th"], why: "Root position: C – E – G with C lowest." },
  { q: "C major with G on the bottom (G – C – E) is in…", a: "Second inversion", w: ["First inversion", "Root position"], why: "5th in the bass = second inversion." },
  { q: "Why do songwriters use inversions?", a: "To make smooth, stepwise bass lines", w: ["To change the key", "To make chords louder"], why: "C – C/B – Am – Am/G walks down C, B, A, G." },
  { q: "C – C/B – Am – Am/G: what does the bass line do?", a: "Walks down by step: C, B, A, G", w: ["Jumps around randomly", "Stays on C"], why: "Slash chords let the bass glide while the chords change." },
];
const slashQ = qT("g8-slash", "u:chord:inversion", SLASH_Q);
const consonanceEar = topic("g8-consonance", (r, d) => dissonanceItem(r, d, "u:interval:consonance", "Consonant (stable) or dissonant (tense)?"));
const consonanceSort = topic("g8-consonance-sort", (r, d) => {
  const cons = pickN(r, [3, 4, 7, 9, 12], 2);
  const diss = pickN(r, [1, 2, 6, 10, 11], 2);
  const lo = pick(r, [52, 55, 57]);
  return {
    kind: "soundsort",
    prompt: "Tap each interval to hear it, then sort it: consonant (stable) or dissonant (tense)?",
    bins: [{ id: "con", label: "Consonant (stable)" }, { id: "dis", label: "Dissonant (tense)" }],
    items: shuffle(r, [...cons, ...diss]).map((s, i) => ({ id: `int${s}`, label: d < 0.5 ? intervalName(s) : `Sound ${i + 1}`, sound: chordSound([lo, lo + s], "piano", 2.5, 70), bin: cons.includes(s) ? "con" : "dis" })),
    skill: "u:interval:consonance",
  };
});
const tritoneEar = topic("g8-tritone-ear", (r, d) => intervalEar(r, { semis: d < 0.35 ? [6, 7] : [5, 6, 7], harmonic: d > 0.5, skill: "u:interval:tritone" }));
const intervalWide = topic("g8-interval-ear", (r, d) => intervalEar(r, { semis: d < 0.35 ? [3, 4, 7, 12] : [3, 4, 5, 7, 9, 10, 11, 12], harmonic: d > 0.6, skill: "u:interval:ear" }));
const tritoneBuild = topic("g8-tritone-build", (r) => {
  const lo = pick(r, [60, 62, 65, 67, 57]);
  return { kind: "keys", task: "interval", prompt: `Build a tritone up from ${nm(lo)}: three whole steps (6 half steps).`, answer: [lo, lo + 6], given: [lo], lo: 55, hi: 79, labels: true, skill: "u:interval:tritone", why: `${nm(lo)} up 6 half steps is ${nm(lo + 6)}. The tritone splits the octave exactly in half.` };
});
const INTERVAL_Q: Q[] = [
  { q: "How many half steps are in a tritone?", a: "6", w: ["5", "7"], why: "Three whole steps = six half steps." },
  { q: "Old music theorists nicknamed the tritone…", a: "The devil in music (diabolus in musica)", w: ["The angel's leap", "The perfect interval"], why: "It was considered so unstable that teachers warned against it." },
  { q: "After the octave, which interval sounds the most stable?", a: "The perfect 5th", w: ["The minor 2nd", "The tritone"], why: "The 5th is the backbone of chords, power chords and the circle of fifths." },
  { q: "A tritone splits the octave into…", a: "Two equal halves", w: ["Three equal parts", "Twelve uneven parts"], why: "6 + 6 = 12 half steps." },
  { q: "The first two different notes of “Twinkle, Twinkle” (C up to G) make which interval?", a: "A perfect 5th", w: ["A major 3rd", "An octave"], why: "C → G is 7 half steps: a perfect 5th." },
  { q: "Which interval is the most dissonant of all?", a: "The minor 2nd (a half step)", w: ["The octave", "The perfect 5th"], why: "Two neighboring keys played together grind against each other." },
];
const intervalFacts = qT("g8-interval-q", "u:interval:facts", INTERVAL_Q);
const twoVoices = (upper: number[], lower: number[], bpm = 84): Score => ({ bpm, tracks: [notesTrack("flute", upper.map((p) => ({ p, d: 1 }))), notesTrack("cello", lower.map((p) => ({ p, d: 1 })))] });
const MOTION: Record<"contrary" | "parallel" | "oblique", [number[], number[]]> = {
  contrary: [[67, 69, 71, 72], [55, 53, 52, 48]],
  parallel: [[64, 65, 67, 69], [60, 62, 64, 65]],
  oblique: [[67, 69, 71, 72], [48, 48, 48, 48]],
};
const MOTION_WORD = { contrary: "Contrary — opposite directions", parallel: "Parallel — same direction, same distance", oblique: "Oblique — one voice holds still" };
const motionEar = topic("g8-motion", (r) => {
  const k = pick(r, ["contrary", "parallel", "oblique"] as const);
  const sh = pick(r, [0, 2, -2]);
  const [u, l] = MOTION[k];
  return listen({ prompt: "Flute on top, cello below. How do the two voices move?", sound: twoVoices(u.map((p) => p + sh), l.map((p) => p + sh)), options: (["contrary", "parallel", "oblique"] as const).map((x) => opt(x, MOTION_WORD[x])), answer: k, skill: "u:melody:counterpoint", why: { contrary: "One climbs while the other falls: contrary motion keeps voices independent.", parallel: "They move together, the same distance apart: parallel motion (here, in 3rds).", oblique: "The cello holds one note while the flute moves: oblique motion." }[k] });
});
const SMOOTH: number[][] = [[60, 64, 67], [60, 64, 69], [60, 65, 69], [59, 62, 67]];
const JUMPY: number[][] = [[60, 64, 67], [69, 72, 76], [53, 57, 60], [67, 71, 74]];
const voicings = (vs: number[][], inst: InstId): Score => ({ bpm: 72, tracks: [notesTrack(inst, vs.map((p) => ({ p, d: 2 }))), notesTrack("bass", [36, 45, 41, 43].map((p) => ({ p, d: 2 })), 0.8)] });
const voiceLeadEar = topic("g8-voice-leading", (r) => {
  const inst = pick(r, ["strings", "piano", "choir"] as InstId[]);
  return listen({ prompt: "Same chords (C – Am – F – G), two voicings. Which one has smoother voice leading — the upper notes barely move?", options: pair(r, ["smooth", voicings(SMOOTH, inst)], ["jumpy", voicings(JUMPY, inst)]), answer: "smooth", skill: "u:chord:voice-leading", why: "Keep the common tones, move the others by step: C–E–G → C–E–A → C–F–A → B–D–G. That's good voice leading." });
});
const parallelEar = topic("g8-parallel-fifths", (r) => listen({ prompt: "Classical rules ban parallel 5ths — they sound hollow and make two voices blur into one. Which clip has them?", options: pair(r, ["p5", twoVoices([67, 69, 71, 72], [60, 62, 64, 65])], ["ok", twoVoices([67, 69, 71, 72], [60, 57, 55, 48])]), answer: "p5", skill: "u:melody:counterpoint", why: "G/C, A/D, B/E, C/F: every pair a perfect 5th, moving in lockstep. Hollow!" }));
const COUNTER_Q: Q[] = [
  { q: "Counterpoint means…", a: "Two or more independent melodies played together", w: ["One melody with drums", "Playing a melody backward"], why: "From the Latin “point against point” — note against note." },
  { q: "Contrary motion means the voices move…", a: "In opposite directions", w: ["In the same direction", "Not at all"], why: "One goes up while the other goes down." },
  { q: "Why do composers love contrary motion?", a: "It keeps each voice independent and easy to hear", w: ["It's louder", "It changes the key"], why: "Voices that move differently stay distinct." },
  { q: "Which Baroque composer is famous for fugues — the most intricate counterpoint?", a: "J. S. Bach", w: ["Elvis Presley", "Scott Joplin"], why: "In a fugue, a theme enters in one voice after another and they weave together." },
  { q: "A countermelody is…", a: "A second melody that fits against the main one", w: ["The same melody played louder", "A drum fill"], why: "Think of a harmony line or an instrument answering the singer." },
];
const VOICE_Q: Q[] = [
  { q: "Good voice leading usually means…", a: "Moving each voice as little as possible between chords", w: ["Jumping every voice an octave", "Playing every chord in root position"], why: "Smooth moves = a sound that flows." },
  { q: "C major (C–E–G) and A minor (A–C–E) share which notes?", a: "C and E", w: ["A and G", "E and G"], why: "Hold the common tones; move only the one note that changes (G → A)." },
  { q: "Moving from C major (C–E–G) to F major, which voicing moves least?", a: "C–F–A (only E→F and G→A move, by step)", w: ["F–A–C, an octave higher", "A–C–F, everything jumps"], why: "Keep C, and step the others up." },
  { q: "Which two notes of G7 resolve inward to C major?", a: "B up to C, F down to E", w: ["G up to A, D down to C", "Nothing moves"], why: "The tritone B–F squeezes inward to C–E." },
];
const counterQ = qT("g8-counter-q", "u:melody:counterpoint", COUNTER_Q);
const voiceQ = qT("g8-voice-q", "u:chord:voice-leading", VOICE_Q);
const CROWN_LINE = LL("Carry all the music homeward", ["Car", "ry", "all", "the", "mu", "sic", "home", "ward"], [1.5, 0.5, 1, 1, 1.5, 0.5, 1.5, 0.5], [64, 62, 67, 65, 69, 67, 64, 60], [0, 2, 4, 6]);

const MOVE_IDEA = idea("Move it anywhere", [
  frame("Transposing moves a whole tune to a new key. Every interval stays the same, so it's the same song — just higher or lower.", { show: "pics", emoji: "🔀" }, then(songScore("twinkle", { n: 7, inst: "piano", bpm: 110 }), songScore("twinkle", { n: 7, inst: "piano", bpm: 110, transpose: 7 }), 1)),
  frame("Modulation changes key in the middle of a song. Pop's favorite: the last chorus jumps up a step for a lift.", { show: "pics", emoji: "🎢" }, then(chorusLine(60), transpose(chorusLine(60), 2), 0)),
  frame("An inversion stacks a chord's notes with a different one on the bottom. C/E means a C chord with E in the bass.", keysShow(48, 72, [52, 55, 60]), then(chordSound([48, 52, 55], "piano", 2, 70), chordSound([52, 55, 60], "piano", 2, 70), 0)),
  frame("Inversions make smooth bass lines: C – C/B – Am – Am/G walks down step by step.", { show: "staff", clef: "bass", notes: [{ p: 48, d: 2 }, { p: 47, d: 2 }, { p: 45, d: 2 }, { p: 43, d: 2 }] }, { bpm: 76, tracks: [notesTrack("piano", [[60, 64, 67], [60, 64, 67], [60, 64, 69], [60, 64, 69]].map((p) => ({ p, d: 2 }))), notesTrack("cello", [48, 47, 45, 43].map((p) => ({ p, d: 2 })))] }),
], "u:melody:idea");
const INTERVAL_IDEA = idea("Consonance, dissonance and the tritone", [
  frame("Consonant intervals sound stable and at rest: octaves, 5ths, 3rds and 6ths.", { show: "keyboard", lo: 55, hi: 79, lit: [60, 64, 67, 72] }, then(chordSound([60, 67], "piano", 2, 70), chordSound([60, 64], "piano", 2, 70), 0)),
  frame("Dissonant intervals clash and want to move: 2nds, 7ths and the tritone. Tension that makes the resolution feel good.", { show: "keyboard", lo: 55, hi: 79, lit: [60, 61, 71] }, then(chordSound([60, 61], "piano", 2, 70), chordSound([60, 71], "piano", 2, 70), 0)),
  frame("The tritone — 6 half steps, exactly half an octave — was once called “the devil in music.” Hear it resolve: F–B squeezes to E–C.", { show: "keyboard", lo: 55, hi: 79, lit: [65, 71] }, then(chordSound([65, 71], "strings", 2, 70), chordSound([64, 72], "strings", 2.5, 70), 0)),
], "u:interval:idea");
const COUNTER_IDEA = idea("Counterpoint and voice leading", [
  frame("Counterpoint: two melodies at once, each independent. Contrary motion (one up, one down) keeps them distinct.", { show: "pics", emoji: "🧠" }, twoVoices(MOTION.contrary[0], MOTION.contrary[1])),
  frame("Parallel 5ths make two voices blur into one hollow line — Bach's students were told to avoid them.", { show: "pics", emoji: "🚫" }, twoVoices([67, 69, 71, 72], [60, 62, 64, 65])),
  frame("Voice leading: between chords, hold the shared notes and move the rest by the smallest step. The viola often carries these inner voices.", { show: "inst", ids: ["viola"] }, voicings(SMOOTH, "strings")),
], "u:melody:idea");
const CROWN_IDEA = idea("The Composer's Crown", [
  frame("Everything you know, in one song: a progression with a real cadence, a melody with a peak, a lyric that sits on the beat, a countermelody, and a groove.", { show: "pics", emoji: "👑" }, progression(["I", "vi", "IV", "V", "I", "vi", "V", "I"], 60, "major", { bpm: 100, per: 2, inst: "piano", style: "pulse", bass: true, drums: "pop" })),
  frame("One last color: harmonic minor raises the 7th, giving a minor key a strong major V — and a dramatic ending.", { show: "ladder", tonic: 57, steps: [0, 2, 3, 5, 7, 8, 11, 12], lit: [11] }, then(melody(scale(57, "harmonic", 1), 0.5, "piano", 112), cadSound(["i", "iv", "V", "i"], 57, "minor"), 1)),
], "u:melody:idea");

const THEORY_SUMMIT: WorldDef = {
  id: "g8-theory",
  title: "Theory Summit",
  emoji: "🏔️",
  grade: "8",
  items: 8,
  theme: "ice",
  blurb: "Transposition, inversions, the tritone, counterpoint — and the Composer's Crown.",
  talk: ["Sing “Happy Birthday” starting on a high note, then a low note. Is it still the same song? Why?", "What's a song that changes key near the end? Did you notice the lift?"],
  challenge: "Hum a tune you know, then hum it starting a little higher. You just transposed it!",
  stages: [
    {
      title: "Move it anywhere",
      emoji: "🔀",
      levels: 1,
      topics: [transposeEar, transposeCalc, modulationEar, inversionT, slashQ],
      fixed: (r) => [
        MOVE_IDEA,
        transposeEar.gen(r, 0.2),
        inversionItem(0, 1),
        modulationItem(2, 60),
        choose(r, SLASH_Q[0], "u:chord:inversion"),
        transposeCalc.gen(r, 0.2),
        inversionItem(5, 2),
        transposePick.gen(r, 0.3),
      ],
    },
    practice("Intervals and the tritone", "⚡", [intervalWide, tritoneEar, tritoneBuild, consonanceSort, consonanceEar, intervalFacts], { teach: INTERVAL_IDEA, titles: ["Stable and tense", "The devil in music"], unlocks: ["scale:chromatic"] }),
    practice("Counterpoint and voice leading", "🧠", [motionEar, voiceLeadEar, parallelEar, counterQ, voiceQ, inversionT, transposePick, modulationEar], { teach: COUNTER_IDEA, titles: ["Two voices", "Smooth moves"], unlocks: ["inst:viola"] }),
    {
      title: "The Composer's Crown",
      emoji: "👑",
      levels: 1,
      topics: [topic("g8-crown", (r) => pick(r, CROWN.filter((a) => a.kind === "compose" || a.kind === "chords"))), topic("g8-crown-groove", () => CROWN.find((a) => a.kind === "beatlab") ?? CROWN[0]), topic("g8-crown-lyric", () => fitItem(CROWN_LINE)), voiceLeadEar],
      unlocks: ["scale:harmonic"],
      fixed: () => [CROWN_IDEA, ...CROWN],
    },
  ],
};
const CROWN: Activity[] = [
  { kind: "chords", mode: "build", prompt: "The chorus chords: 8 bars that start on I, use IV and vi, and end with an authentic cadence (V → I).", tonic: 60, scale: "major", palette: ["I", "ii", "iii", "IV", "V", "vi"], bars: 8, rules: [{ rule: "start", chord: "I" }, { rule: "use", chords: ["IV", "vi"] }, { rule: "cadence", kind: "authentic" }], inst: "piano", bpm: 100, beat: true, skill: "u:compose:capstone" },
  { kind: "compose", prompt: "The chorus melody on “Carry all the music homeward”: reach high mi for the peak, make at least one leap, and land on do.", pitches: [60, 62, 64, 65, 67, 69, 71, 72, 74, 76], slots: 8, dur: 1, inst: "choir", bpm: 96, rules: [{ rule: "use", pitches: [76] }, { rule: "leap", min: 3 }, { rule: "end", p: 60 }, { rule: "notes", min: 7 }], tonic: 60, labels: "letters", backing: progression(["I", "vi", "V", "I"], 60, "major", { bpm: 96, per: 2, inst: "piano", style: "pulse", bass: true }), lyric: CROWN_LINE.syl, skill: "u:compose:capstone" },
  fitItem(CROWN_LINE),
  { kind: "compose", prompt: "Counterpoint: the flute plays a melody — write a second line UNDER it on the cello. Steps only, ending on mi (E).", pitches: [48, 50, 52, 53, 55, 57, 59, 60], slots: 8, dur: 1, inst: "cello", bpm: 88, rules: [{ rule: "steps" }, { rule: "end", p: 52 }, { rule: "notes", min: 6 }], tonic: 48, labels: "letters", backing: { bpm: 88, tracks: [notesTrack("flute", line(72, "0 -1 -3 -5 -3 -1 0/2"), 0.9)] }, skill: "u:compose:counterpoint" },
  { kind: "keys", task: "chord", prompt: "Smooth move: after C major (C – E – G), build F major with C on the bottom (C – F – A) so your hand barely moves.", answer: [60, 65, 69], given: [60], lo: 48, hi: 79, labels: true, skill: "u:chord:voice-leading", why: "F/C = C – F – A: keep C, step E up to F and G up to A." },
  { kind: "beatlab", mode: "make", prompt: "The groove: kick on 1, snare on 2 and 4, at least 8 hi-hats, and a cymbal crash on beat 1 to launch the chorus.", rows: ["kick", "snare", "hat", "cymbals"], steps: 16, bpm: 100, rules: [{ rule: "on", row: "kick", steps: [0] }, { rule: "on", row: "snare", steps: [4, 12] }, { rule: "count", row: "hat", min: 8 }, { rule: "on", row: "cymbals", steps: [0] }], skill: "u:beatmaking:capstone" },
  { kind: "chords", mode: "build", prompt: "A dramatic minor bridge in A minor: borrow harmonic minor's major V and end with V → i.", tonic: 57, scale: "minor", palette: ["i", "iv", "V", "VI", "VII"], bars: 4, rules: [{ rule: "start", chord: "i" }, { rule: "use", chords: ["VI"] }, { rule: "cadence", kind: "authentic" }], inst: "strings", bpm: 84, skill: "u:compose:capstone" },
];

export const WORLDS: WorldDef[] = [CIRCLE_ATOLL, PROGRESSION_POINT, LYRIC_LAGOON, ARRANGEMENT_ARCHIPELAGO, MODES_MESA, RHYTHM_GYM, CADENCE_CLIFFS, SEVENTH_CHORD_SOUND, FILM_SCORE_FALLS, HISTORY_HIGHWAY, PRODUCERS_DESK, THEORY_SUMMIT];
