import type { Activity, Option } from "../../types";
import { items as levelItems, int, keyOf, pick, pickN, rng, shuffle, type Rng, type Topic, type WorldDef } from "../../gen";
import type { ComposeRule, DrumId, InstId, Meter, MOption, MSymbol, MusicShow, Score } from "../types";
import { RHYTHM, LETTERS, cellBeats, scale, solfegeWords, spelledName } from "../theory";
import { beat, clicks, groove, hairpin, layer, melody, note1, onInst, progression, rhythm, tempoRamp, then, transpose, tune, withGain } from "../score";
import { line, piece } from "../pieces";
import { song, songScore } from "../songs";
import { strongSyllables } from "../check";
import { DRUMS, INSTRUMENTS } from "../catalog";
import {
  beatTap, beatsShow, bellsShow, echo, frame, idea, instOpt, instShow, keysShow, ladderShow, listen, meterEar, opt, picOpt, picsShow,
  randomCells, readRhythm, rhythmMatch, rhythmShow, sameDifferent, seeChoice, solfegeMatch, soundOpt, staffName, staffShow, styleEar, textOpts, topic,
  whichFamily, whichInstrument,
} from "../make";

// Music for 2nd and 3rd grade.
//
// 2nd graders hear every prompt, so the sentences stay short. La, then do and re join so and mi
// (the pentatonic scale: "no wrong notes"), long notes and bars of 4, marches and waltzes and their
// strong beats, song form (same or different, AB, ABA, call and response), the staff and the treble
// clef. Then Song Studio: a whole song of their own, a pentatonic tune with a beat, arranged A-B-A.
//
// 3rd graders read on their own: the treble clef's letter names (Every Good Boy Does Fine, FACE),
// sixteenth notes and drum-machine beats, the piano keyboard (and low la / low so below do), rondo
// and theme-and-variations, the orchestra family by family (and conducting it), and real composers
// with their real public-domain music. Then Showcase Studio: a melody and a sixteenth-note rhythm.
//
// Every stage teaches first (an idea you can hear), practices with real sound, and every world
// ends by MAKING something with exactly what it taught. Topic keys are prefixed g2- / g3- (review
// looks topics up course-wide). Skill keys "u:<family>:<detail>".

// ── Pitches and helpers ───────────────────────────────────────────────────────────────────────
const G3 = 55, A3 = 57, C4 = 60, D4 = 62, E4 = 64, F4 = 65, G4 = 67, A4 = 69, B4 = 71, C5 = 72, D5 = 74, E5 = 76, F5 = 77, G5 = 79;
const DO = C4;
const SOL: Record<string, number> = { "so,": -5, "la,": -3, do: 0, re: 2, mi: 4, fa: 5, so: 7, la: 9, ti: 11, "do'": 12 };
/** Solfège → pitches (do = C4): sp("so mi la") = [67, 64, 69]. */
const sp = (s: string, tonic = DO): number[] => s.trim().split(/\s+/).map((x) => tonic + SOL[x]);
/** Kid words for a pitch's solfège ("low la", "so"). */
const sw = (p: number, tonic = DO) => solfegeWords(p, tonic);
/** Pick from a list ordered easy → hard: low difficulty draws from the front, high from the back. */
function byD<T>(r: Rng, d: number, list: readonly T[]): T {
  const n = list.length;
  const hi = Math.max(1, Math.min(n, Math.round(n * (0.45 + 0.55 * d))));
  const lo = Math.min(hi - 1, Math.floor(n * 0.45 * d));
  return list[int(r, lo, hi - 1)];
}
/** Quarter notes with the last one held (a tune that lands). */
const held = (n: number, last = 2) => Array.from({ length: n }, (_, i) => (i === n - 1 ? last : 1));
const tuneOf = (ps: (number | null)[], durs: number | number[] = 1, inst: InstId = "bells", bpm = 96) => melody(ps, durs, inst, bpm);
/** Melody shorthand from pieces.ts ("0 2 4 7/2" = semitones above do, /length) as a Score. */
const phrase = (spec: string, inst: InstId, bpm = 108, tonic = DO): Score => ({ bpm, tracks: [{ kind: "notes", inst, notes: line(tonic, spec) }] });
const sym = (s: MSymbol, label?: string): MusicShow => ({ show: "symbol", sym: s, ...(label ? { label } : {}) });
const meterShow = (m: Meter): MusicShow => ({ show: "meter", meter: m });
const formShow = (sections: string[]): MusicShow => ({ show: "form", sections });
const gridShow = (rows: DrumId[], pattern: string[]): MusicShow => ({ show: "grid", rows, pattern });
const musicVisual = (m: MusicShow): Option["visual"] => ({ type: "music", m });
/** A random walk through a pool (a tune that mostly steps). */
function walk(r: Rng, pool: number[], n: number, maxStep = 2): number[] {
  let i = int(r, 0, pool.length - 1);
  const out = [pool[i]];
  while (out.length < n) {
    i = Math.max(0, Math.min(pool.length - 1, i + int(r, -maxStep, maxStep)));
    out.push(pool[i]);
  }
  return out;
}

/** Sea friends to wear on sound answers (the UI may shuffle them, so never "first / second"). */
const CRITTERS: [string, string][] = [["🐬", "Dolphin"], ["🐢", "Turtle"], ["🐙", "Octopus"], ["🦀", "Crab"], ["🐳", "Whale"], ["🦭", "Seal"], ["🐠", "Fish"], ["🦈", "Shark"]];
function critters(r: Rng, sounds: { id: string; sound: Score }[]): MOption[] {
  const cs = pickN(r, CRITTERS, sounds.length);
  return sounds.map((s, i) => soundOpt(s.id, s.sound, cs[i][1], { emoji: cs[i][0] }));
}

/** A quiet band to write over: drums (rows are ONE bar of eighth notes) and a repeating bass line. */
function band(beats: number, bpm: number, o: { drums?: Partial<Record<DrumId, string>>; bass?: number[]; inst?: InstId; meter?: Meter } = {}): Score {
  const meter: Meter = o.meter ?? [4, 4];
  const per = (meter[0] * 4) / meter[1];
  const bars = Math.max(1, Math.round(beats / per));
  const drums = beat(o.drums ?? (meter[0] === 3 ? { kick: "x.....", shaker: "..x.x." } : { kick: "x...x...", shaker: "..x...x." }), { bpm, per: 2, times: bars, meter });
  const bass = o.bass;
  if (!bass?.length) return drums;
  const low = melody(Array.from({ length: beats }, (_, i) => bass[i % bass.length]), 1, o.inst ?? "marimba", bpm);
  return { ...layer(low, drums), meter };
}

type Lab = "solfege" | "letters" | "colors" | "none";
type MelO = { pads: number[]; tonic?: number; labels?: Lab; inst?: InstId; on?: "bells" | "keys"; durs?: number[]; bpm?: number; show?: "staff" | "ladder" | "none"; skill: string; prompt: string };
/** A melody item: echo (hear it, play it back), read (staff or ladder) or find (one note). */
function mel(mode: "echo" | "read" | "find", notes: number[], o: MelO): Activity {
  return {
    kind: "melody",
    mode,
    prompt: o.prompt,
    notes,
    pads: o.pads,
    ...(o.tonic !== undefined ? { tonic: o.tonic } : {}),
    labels: o.labels ?? "solfege",
    ...(o.inst ? { inst: o.inst } : {}),
    ...(o.on ? { on: o.on } : {}),
    ...(o.show ? { show: o.show } : {}),
    ...(o.show === "staff" ? { clef: "treble" as const } : {}),
    ...(o.durs ? { durs: o.durs } : {}),
    ...(o.bpm ? { bpm: o.bpm } : {}),
    skill: o.skill,
  };
}

/** A compose item (a note grid to write on, played with a band, then kept in the Studio). */
function compose(o: { prompt: string; pitches: number[]; slots: number; dur?: number; inst?: InstId; bpm?: number; rules: ComposeRule[]; tonic?: number; labels?: Lab; backing?: Score; start?: (number | null)[]; lyric?: string[]; skill: string }): Activity {
  const bpm = o.bpm ?? 100;
  const dur = o.dur ?? 1;
  const tonic = o.tonic ?? DO;
  return {
    kind: "compose",
    prompt: o.prompt,
    pitches: o.pitches,
    slots: o.slots,
    dur,
    inst: o.inst ?? "bells",
    bpm,
    rules: o.rules,
    tonic,
    labels: o.labels ?? "solfege",
    backing: o.backing ?? band(o.slots * dur, bpm, { bass: [tonic - 12, tonic - 5] }),
    ...(o.start ? { start: o.start } : {}),
    ...(o.lyric ? { lyric: o.lyric } : {}),
    skill: o.skill,
  };
}

/** A hand-sequenced level: each step is an item, or [topic, difficulty] for a fresh one. A fresh
 *  item never repeats one already in the level. */
type Step = Activity | [Topic, number];
function lvl(r: Rng, steps: Step[]): Activity[] {
  const out: Activity[] = [];
  const keys = new Set<string>();
  for (const s of steps) {
    let a = Array.isArray(s) ? s[0].gen(r, s[1]) : s;
    if (Array.isArray(s)) for (let k = 0; k < 16 && keys.has(keyOf(a)); k++) a = s[0].gen(r, s[1]);
    keys.add(keyOf(a));
    out.push(a);
  }
  return out;
}
/** A stage whose first level opens with hand-picked items (an explainer first), then fresh topic
 *  items; later levels are all topic items. Difficulty ramps the way buildWorlds ramps it. */
function teachStage(levels: number, n: number, open: (r: Rng) => Activity[], topics: Topic[]): (r: Rng, li: number) => Activity[] {
  return (r, li) => {
    const d0 = levels === 1 ? 0.25 : (li / levels) * 0.7;
    const d1 = Math.min(1, d0 + 0.35);
    const head = li === 0 ? open(r) : [];
    const keys = new Set(head.map(keyOf));
    const rest = levelItems(r, topics, Math.max(0, n - head.length) + 4, d0, d1).filter((a) => !keys.has(keyOf(a)));
    return [...head, ...rest.slice(0, Math.max(0, n - head.length))];
  };
}

// ═════ 2nd grade ═════════════════════════════════════════════════════════════════════════════

// ── La La Lagoon: so, mi … and la ────────────────────────────────────────────────────────────
const SML = sp("mi so la");
const SML_PATS = ["so mi so", "so la so", "mi so la", "la so mi", "so so mi", "so mi la", "so la so mi", "mi mi so la", "so mi la so", "la la so mi", "mi so la so", "so so mi la so mi", "mi so la so mi", "la so mi so la"];
const smlLadder = (lit: number[] = []) => ladderShow(DO, [4, 7, 9], lit);

const smlMatch = topic("g2-sml-match", (r, d) => solfegeMatch(r, { steps: [4, 7, 9], n: d < 0.5 ? 3 : 4, skill: "u:solfege:so-mi-la" }));
const smlEcho = topic("g2-sml-echo", (r, d) => {
  const notes = sp(byD(r, d, SML_PATS));
  return mel("echo", notes, { pads: SML, tonic: DO, labels: d < 0.6 ? "solfege" : "colors", durs: held(notes.length), bpm: 92, skill: "u:melody:echo-so-mi-la", prompt: "Listen, then play it back on the bells!" });
});
const smlRead = topic("g2-sml-read", (r, d) => {
  const notes = sp(byD(r, d, SML_PATS));
  return mel("read", notes, { pads: SML, tonic: DO, labels: d < 0.5 ? "solfege" : "colors", show: "ladder", skill: "u:melody:read-ladder", prompt: "Read the notes on the ladder. Then play them on the bells!" });
});
const smlFind = topic("g2-sml-find", (r, d) => {
  const target = d < 0.35 ? A4 : pick(r, SML);
  return mel("find", [target], { pads: SML, tonic: DO, labels: d < 0.25 ? "solfege" : "colors", skill: "u:solfege:find", prompt: `Find ${sw(target)} and play it! Mi is the biggest bell. La is the smallest.` });
});
const smlWho = topic("g2-sml-who", (r) => {
  const want = pick(r, ["la", "la", "so", "mi"]);
  return listen({
    prompt: `Each sea friend sings one note. Who sings ${want}?`,
    options: critters(r, ["mi", "so", "la"].map((s) => ({ id: s, sound: note1(sp(s)[0], "bells", 1.5, 80) }))),
    answer: want,
    skill: "u:solfege:so-mi-la",
    why: "Mi is the lowest of the three. So is in the middle. La is the highest!",
  });
});
const smlHasLa = topic("g2-sml-has-la", (r) => {
  const yes = sp(pick(r, ["so la so mi", "mi so la so", "so mi la so", "la so mi mi", "so so la so", "mi la so mi"]));
  const no = sp(pick(r, ["so mi so mi", "so so mi mi", "mi so so mi", "so mi mi so", "mi mi so so", "so mi so so"]));
  return listen({
    prompt: "Which tune has la in it?",
    options: critters(r, [{ id: "la", sound: tuneOf(yes, held(4), "bells", 92) }, { id: "somi", sound: tuneOf(no, held(4), "bells", 92) }]),
    answer: "la",
    skill: "u:solfege:hear-la",
    why: "La is the note just above so. Listen for the tune that climbs past so!",
  });
});

const rosieBeat = topic("g2-rosie-beat", (r, d) => beatTap({ music: layer(songScore("rosie", { inst: pick(r, ["bells", "marimba"] as InstId[]), bpm: 100 }), beat({ kick: "x.x." }, { bpm: 100, per: 2, times: 6 })), beats: 8, scaffold: d < 0.5, skill: "u:beat:steady", prompt: "Ring Around the Rosie! Tap the drum on every beat." }));
const smlUpDown = topic("g2-sml-updown", (r) => {
  const up = r() < 0.5;
  const ps = sp(pick(r, up ? ["mi so la", "mi mi so la", "so la la", "mi so so la"] : ["la so mi", "la la so mi", "so mi mi", "la so so mi"]));
  return listen({ prompt: "Does the tune climb UP to la, or slide DOWN to mi?", sound: tuneOf(ps, held(ps.length), "bells", 92), options: [picOpt("up", "⬆️", "Up to la"), picOpt("down", "⬇️", "Down to mi")], answer: up ? "up" : "down", skill: "u:contour:so-mi-la", why: "Going up, each note is higher. La is the top of the ladder. Mi is the bottom." });
});

const LA_IDEA = idea("Meet la", [
  frame("Remember so and mi? So is high. Mi is lower. Cuck-oo!", ladderShow(DO, [4, 7], [4, 7]), songScore("cuckoo", { inst: "bells" })),
  frame("Now meet la! La sits one step above so.", smlLadder([9]), tuneOf(sp("so la so la"), [1, 1, 1, 2], "bells", 88)),
  frame("So, mi, la, so, mi. Kids sing this call on playgrounds everywhere!", smlLadder(), tuneOf(sp("so mi la so mi"), [1, 1, 1, 1, 2], "bells", 96)),
  frame("Ring Around the Rosie uses so, mi and la. Listen!", smlLadder(), songScore("rosie", { n: 12, inst: "bells" })),
  frame("Your turn! Play mi, so and la on the bells.", bellsShow(SML, [], "solfege", DO), undefined, "bells", SML),
], "u:solfege:la-idea");
const LADDER_IDEA = idea("Read the ladder", [
  frame("Notes live on a ladder. A higher step is a higher note!", smlLadder([4, 7, 9]), tuneOf(SML, [1, 1, 2], "bells", 84)),
  frame("Mi is the bottom step. La is the top step. So is in between.", smlLadder([4, 9]), tuneOf(sp("mi la mi la"), [1, 1, 1, 2], "bells", 84)),
  frame("Watch the steps light up as they play: so, mi, la, so.", smlLadder(), tuneOf(sp("so mi la so"), [1, 1, 1, 2], "bells", 84)),
  frame("Your turn! Read a step, then ring its bell.", bellsShow(SML, [], "solfege", DO), undefined, "bells", SML),
], "u:melody:ladder-idea");
const SML_WRITE_IDEA = idea("Write a so-mi-la song", [
  frame("Meet the kalimba, a thumb piano from Africa. Its notes ring like water drops.", instShow("kalimba"), tuneOf(sp("so mi la so mi"), [1, 1, 1, 1, 2], "kalimba", 92)),
  frame("A songwriter picks one note at a time. So, mi, la, so!", smlLadder(), tuneOf(sp("so mi la so"), [1, 1, 1, 2], "kalimba", 88)),
  frame("Tap a note in each box to write your tune. Then press play to hear it with the band!", smlLadder(), layer(tuneOf(sp("mi so la so mi so la so"), 1, "kalimba", 100), band(8, 100, { bass: [48, 55] }))),
], "u:compose:idea");

const SML_SONGS: { prompt: string; rules: ComposeRule[]; lyric?: string[]; inst?: InstId }[] = [
  { prompt: "Write a tune with so, mi AND la. End on so.", rules: [{ rule: "use", pitches: SML }, { rule: "end", p: G4 }] },
  { prompt: "Start on mi. Climb up to la in the middle, then come back down.", rules: [{ rule: "start", p: E4 }, { rule: "arch" }] },
  { prompt: "Start on so and end on mi. Use la, too!", rules: [{ rule: "start", p: G4 }, { rule: "end", p: E4 }, { rule: "use", pitches: [A4] }], inst: "kalimba" },
  { prompt: "Write a tune for these words. Fill every box, and use la!", rules: [{ rule: "notes", min: 8 }, { rule: "use", pitches: [A4] }], lyric: ["Lit", "tle", "boat,", "lit", "tle", "boat,", "sail", "home!"], inst: "kalimba" },
  { prompt: "Make a tune with a rest in it, like a little breath. Use la!", rules: [{ rule: "rests", min: 1 }, { rule: "use", pitches: [A4] }, { rule: "notes", min: 5 }] },
];
const smlSong = (s: (typeof SML_SONGS)[number]): Activity => compose({ prompt: s.prompt, pitches: SML, slots: 8, inst: s.inst ?? "bells", rules: s.rules, lyric: s.lyric, skill: "u:compose:so-mi-la" });
const smlCompose = topic("g2-sml-compose", (r) => smlSong(pick(r, SML_SONGS)));

const SML_PRACTICE = [smlEcho, smlWho, rosieBeat, smlMatch, smlHasLa, smlFind, smlUpDown];
const SML_READING = [smlRead, smlEcho, smlUpDown, smlMatch, rosieBeat, smlHasLa];
const LA_LAGOON: WorldDef = {
  id: "g2-la-lagoon",
  title: "La La Lagoon",
  emoji: "🎶",
  grade: "2",
  theme: "shallows",
  items: 6,
  blurb: "So and mi meet a new friend: la! Sing it, ring it, read it, and write a song with it.",
  talk: ["Can you sing a so-mi-la call? (So, mi, la, so, mi!) Can you sing it back to each other?", "Which songs do you know that climb up high and come back down?"],
  challenge: "Sing a so-mi-la call to someone at home. Then have them sing an answer back!",
  stages: [
    {
      title: "Meet la",
      emoji: "🎶",
      levels: 1,
      topics: [smlWho, smlFind, smlEcho, smlMatch, smlHasLa],
      intros: ["A new note swims into the lagoon. Its name is la!"],
      fixed: (r) => lvl(r, [LA_IDEA, [smlWho, 0], [smlFind, 0], [smlEcho, 0], [smlHasLa, 0.2], [smlMatch, 0.3]]),
    },
    { title: "Sing it, ring it", emoji: "🔔", levels: 2, topics: SML_PRACTICE, intros: ["Ring the bells with so, mi and la!", "The sea friends want to sing with you!"] },
    {
      title: "Read the ladder",
      emoji: "🪜",
      levels: 2,
      topics: SML_READING,
      intros: ["Climb the note ladder, one step at a time.", "Read the ladder and play what you see!"],
      fixed: teachStage(2, 6, (r) => [LADDER_IDEA, smlRead.gen(r, 0)], SML_READING),
    },
    {
      title: "La La Songwriter",
      emoji: "✏️",
      levels: 1,
      topics: [smlCompose],
      unlocks: ["inst:kalimba"],
      intros: ["Write your very own so-mi-la song!"],
      fixed: (r) => lvl(r, [SML_WRITE_IDEA, smlSong(SML_SONGS[0]), [smlEcho, 0.5], smlSong(SML_SONGS[1]), [smlRead, 0.6], smlSong(SML_SONGS[3])]),
    },
  ],
};

// ── Half Note Haven: ta-a, the whole note, and bars of 4 ─────────────────────────────────────
const HN1 = ["ta", "titi", "taa"];
const HN2 = ["ta", "titi", "z", "taa"];
const HN3 = ["ta", "titi", "taa", "whole"];
const SING = [G4, E4, A4, G4, E4, C5, G4, D4, E4, C4];
/** Rhythm cells sung on a held instrument (so the long notes really ring). */
function sing(cells: string[], inst: InstId = "recorder", bpm = 92): Score {
  const n = cells.flatMap((c) => RHYTHM[c].durs).filter((x) => x > 0).length;
  return tune(cells, Array.from({ length: n }, (_, i) => SING[i % SING.length]), inst, bpm);
}
const BEAT_SYM: Record<number, MSymbol> = { 1: "quarter", 2: "half", 4: "whole" };
const beatWords = (b: number) => (b === 1 ? "1 beat" : `${b} beats`);

const taaEcho = topic("g2-taa-echo", (r, d) => echo(r, { pool: d < 0.5 ? HN1 : HN2, must: "taa", bars: d < 0.75 ? 1 : 2, bpm: 88, show: d < 0.3 ? "notes" : "none", skill: "u:rhythm:ta-a", prompt: "Listen, then tap it back! For ta-a, tap once and wait." }));
const taaRead = topic("g2-taa-read", (r, d) => readRhythm(r, { pool: d < 0.5 ? HN1 : HN2, must: "taa", bars: d < 0.6 ? 1 : 2, bpm: 84, show: "notes", skill: "u:rhythm:read-ta-a", prompt: "Read the rhythm, then play it! Ta-a is one tap that lasts two beats." }));
const taaMatch = topic("g2-taa-match", (r, d) => rhythmMatch(r, { pool: d < 0.5 ? HN1 : HN2, must: "taa", style: "notes", bpm: 88, skill: "u:rhythm:ta-a" }));
const noteBeats = topic("g2-note-beats", (r, d) => {
  const cell = pick(r, d < 0.35 ? ["ta", "taa"] : ["ta", "taa", "whole"]);
  const p = pick(r, [G4, E4, C5, A4]);
  return listen({
    prompt: "Count the clicks. How many beats does the long note last?",
    sound: layer(tune([cell], [p], "organ", 84), clicks(4, 84)),
    options: [1, 2, 4].map((b) => opt(String(b), beatWords(b), { show: sym(BEAT_SYM[b]) })),
    answer: String(cellBeats(cell)),
    skill: "u:duration:beats",
    why: "Ta lasts 1 beat. Ta-a lasts 2 beats. A whole note lasts all 4!",
  });
});
const noteSee = topic("g2-note-see", (r, d) => {
  const choices = d < 0.4 ? [1, 2] : [1, 2, 4];
  const ask = pick(r, choices);
  return seeChoice({ prompt: `Which note lasts ${beatWords(ask)}?`, options: choices.map((b) => ({ id: String(b), visual: musicVisual(sym(BEAT_SYM[b])) })), answer: String(ask), skill: "u:duration:beats", why: "A filled-in note with a stem is 1 beat. An open note with a stem is 2. An open note with no stem is 4." });
});
const wholeEcho = topic("g2-whole-echo", (r, d) => echo(r, { pool: HN3, must: "whole", bars: 2, bpm: 92, show: d < 0.3 ? "notes" : "none", skill: "u:rhythm:whole-note", prompt: "Listen, then tap it back! The whole note rings for 4 beats." }));
const wholeRead = topic("g2-whole-read", (r, d) => readRhythm(r, { pool: d < 0.5 ? HN3 : [...HN3, "z"], must: "whole", bars: 2, bpm: 84, show: "notes", skill: "u:rhythm:read-whole", prompt: "Read it, then play it! Tap the whole note once and count to 4." }));
const wholeMatch = topic("g2-whole-match", (r) => rhythmMatch(r, { pool: HN3, must: "whole", bars: 2, style: "notes", bpm: 92, skill: "u:rhythm:whole-note" }));

const barFill = topic("g2-bar-fill", (r, d): Activity => {
  const bars = d < 0.4 ? 1 : 2;
  const given: (string[] | null)[] = Array.from({ length: bars }, () => null);
  if (d >= 0.3) given[0] = [pick(r, ["taa", "ta", "titi"])];
  return { kind: "measure", mode: "fill", prompt: bars === 1 ? "Fill the bar so it has 4 beats!" : "Fill every bar so each one has 4 beats!", meter: [4, 4], bars, cards: d < 0.5 ? ["ta", "titi", "taa"] : ["ta", "titi", "z", "taa", "whole"], given, skill: "u:meter:bars" };
});
const barFix = topic("g2-bar-fix", (r, d): Activity => {
  const pool = d < 0.5 ? ["ta", "titi", "taa"] : ["ta", "titi", "z", "taa", "whole"];
  const n = d < 0.6 ? 2 : 3;
  const wrong = int(r, 0, n - 1);
  const given = Array.from({ length: n }, (_, i) => randomCells(r, pool, i === wrong ? [3, 4] : [4, 4], 1));
  return { kind: "measure", mode: "fix", prompt: "One bar has only 3 beats! Find it and fix it.", meter: [4, 4], bars: n, cards: pool, given, skill: "u:meter:bars" };
});
const barCount = topic("g2-bar-count", (r) => {
  const n = int(r, 2, 4);
  const cells = randomCells(r, ["ta", "titi", "taa", "whole"], [4, 4], n);
  return seeChoice({ prompt: "Bar lines cut music into bars. How many bars do you see?", visual: rhythmShow(cells, "notes", false, [4, 4]), options: [2, 3, 4].map((k) => ({ id: String(k), text: String(k) })), answer: String(n), skill: "u:meter:bars" });
});
const barDictation = topic("g2-bar-dictation", (r, d): Activity => {
  const pool = d < 0.5 ? ["ta", "titi", "taa"] : HN3;
  const bars = d < 0.6 ? 1 : 2;
  const target = Array.from({ length: bars }, () => randomCells(r, pool, [4, 4], 1));
  return { kind: "measure", mode: "dictation", prompt: "Listen. Then build the rhythm you heard with the cards.", meter: [4, 4], bars, cards: pool, target, bpm: 84, skill: "u:rhythm:dictation" };
});
const HN_CREATE: (() => Activity)[] = [
  () => ({ kind: "measure", mode: "create", prompt: "Write your own rhythm! Use a ta-a.", meter: [4, 4], bars: 1, cards: ["ta", "titi", "z", "taa"], must: ["taa"], bpm: 88, skill: "u:rhythm:create" }),
  () => ({ kind: "measure", mode: "create", prompt: "Write 2 bars. Use a whole note and a ti-ti.", meter: [4, 4], bars: 2, cards: ["ta", "titi", "z", "taa", "whole"], must: ["whole", "titi"], bpm: 88, skill: "u:rhythm:create" }),
  () => ({ kind: "measure", mode: "create", prompt: "Write 2 bars with a ta-a and a rest. Shh!", meter: [4, 4], bars: 2, cards: ["ta", "titi", "z", "taa", "whole"], must: ["taa", "z"], bpm: 88, skill: "u:rhythm:create" }),
  () => ({ kind: "measure", mode: "create", prompt: "Write 2 bars. Use ta, ti-ti AND ta-a!", meter: [4, 4], bars: 2, cards: ["ta", "titi", "z", "taa", "whole"], must: ["ta", "titi", "taa"], bpm: 88, skill: "u:rhythm:create" }),
];
const barCreate = topic("g2-bar-create", (r) => pick(r, HN_CREATE)());

const TAA_IDEA = idea("Ta-a, the long note", [
  frame("Ta is one beat. Ta-a is a long note. It lasts two beats!", rhythmShow(["ta", "ta", "taa", "ta", "ta", "taa"], "notes", true, [4, 4]), sing(["ta", "ta", "taa", "ta", "ta", "taa"])),
  frame("This is a half note. Hold it while you count: one, two.", sym("half", "ta-a = 2 beats"), layer(tune(["taa", "taa"], [C5, G4], "recorder", 84), clicks(4, 84))),
  frame("Hot Cross Buns has ta-a! Hot cross BUNS.", rhythmShow(["ta", "ta", "taa", "ta", "ta", "taa"], "notes", true, [4, 4]), songScore("hotcross", { n: 6, inst: "bells", bpm: 96 })),
  frame("Your turn! Tap ta, ta, ta-a. Hold still for the long note.", rhythmShow(["ta", "ta", "taa"], "sticks", true), rhythm(["ta", "ta", "taa"], { bpm: 88 }), "drum"),
], "u:rhythm:ta-a-idea");
const WHOLE_IDEA = idea("The whole note", [
  frame("The whole note is the longest. It lasts four beats!", sym("whole", "4 beats"), layer(tune(["whole"], [G4], "organ", 84), clicks(4, 84))),
  frame("Count with the clicks: one, two, three, four. Still ringing!", sym("whole"), layer(tune(["whole"], [C5], "recorder", 80), clicks(4, 80))),
  frame("Ta is 1 beat. Ta-a is 2 beats. The whole note is 4 beats.", rhythmShow(["ta", "ta", "ta", "ta", "taa", "taa", "whole"], "notes", true, [4, 4]), sing(["ta", "ta", "ta", "ta", "taa", "taa", "whole"], "flute", 96)),
  frame("Your turn! Tap the whole note, then count to 4 before you tap again.", sym("whole"), clicks(8, 84), "drum"),
], "u:rhythm:whole-idea");
const BARS_IDEA = idea("Bars and bar lines", [
  frame("Music is cut into little boxes called bars.", rhythmShow(["ta", "ta", "ta", "ta", "taa", "taa", "titi", "ta", "taa", "whole"], "notes", false, [4, 4]), sing(["ta", "ta", "ta", "ta", "taa", "taa", "titi", "ta", "taa", "whole"], "bells", 100)),
  frame("A bar line is the line between two bars.", sym("barline"), clicks(8, 96)),
  frame("In four-four time, every bar holds 4 beats. Count: 1, 2, 3, 4!", meterShow([4, 4]), clicks(8, 96)),
  frame("Ta-a plus ta-a is 4 beats. A whole note is 4 beats. Both fill a bar!", rhythmShow(["taa", "taa", "whole"], "notes", true, [4, 4]), sing(["taa", "taa", "whole"], "recorder", 92)),
  frame("At the very end, a double bar line says: the end!", sym("double-bar"), tune(["ta", "ta", "taa", "whole"], [E4, D4, C4, C4], "bells", 96)),
], "u:meter:bars-idea");
const MEASURE_IDEA = idea("Be a rhythm writer", [
  frame("Composers write rhythms in bars. Now you will too!", rhythmShow(["titi", "ta", "taa", "ta", "z", "taa"], "notes", true, [4, 4]), sing(["titi", "ta", "taa", "ta", "z", "taa"], "marimba", 96)),
  frame("Drag a rhythm card into a bar. Each bar needs 4 beats.", rhythmShow(["taa", "ta", "ta"], "notes", true, [4, 4]), rhythm(["taa", "ta", "ta"], { bpm: 92 })),
  frame("Press play to hear your rhythm on the drum. Then keep it in your Studio!", rhythmShow(["ta", "titi", "taa", "whole"], "notes", true, [4, 4]), rhythm(["ta", "titi", "taa", "whole"], { bpm: 92 })),
], "u:rhythm:create-idea");

const HN_HOLD = [taaEcho, taaRead, taaMatch, noteBeats, noteSee];
const HN_WHOLE = [wholeEcho, noteBeats, wholeRead, noteSee, wholeMatch, taaEcho];
const HN_BARS = [barFill, barCount, barFix, barDictation, taaRead, wholeEcho];
const HALF_HAVEN: WorldDef = {
  id: "g2-half-haven",
  title: "Half Note Haven",
  emoji: "⏳",
  grade: "2",
  theme: "kelp",
  items: 6,
  blurb: "Long notes that ring and ring: ta-a and the whole note. Then cut music into bars of 4!",
  talk: ["Can you clap ta, ta, ta-a and hold your hands together for the long note?", "What sounds in our house are long, and which are short?"],
  challenge: "Sing a song and hold the very last note for 4 beats, like a whole note!",
  stages: [
    {
      title: "Ta-a, hold it!",
      emoji: "⏳",
      levels: 1,
      topics: HN_HOLD,
      intros: ["Some notes are short. Some notes ring long. Let's hold one!"],
      fixed: (r) => lvl(r, [TAA_IDEA, [taaEcho, 0], [noteSee, 0], [taaMatch, 0.1], [taaRead, 0.2], [noteBeats, 0.2]]),
    },
    {
      title: "The whole note",
      emoji: "⭕",
      levels: 2,
      topics: HN_WHOLE,
      intros: ["Meet the longest note of all!", "Count to 4 and let it ring!"],
      fixed: teachStage(2, 6, (r) => [WHOLE_IDEA, noteBeats.gen(r, 0.5)], HN_WHOLE),
    },
    {
      title: "Bars of 4",
      emoji: "📏",
      levels: 2,
      topics: HN_BARS,
      intros: ["Music comes in little boxes called bars.", "Fill every bar with 4 beats!"],
      fixed: teachStage(2, 6, (r) => [BARS_IDEA, barCount.gen(r, 0), barFill.gen(r, 0)], HN_BARS),
    },
    {
      title: "Rhythm writer",
      emoji: "✏️",
      levels: 1,
      topics: [barCreate],
      unlocks: ["tool:bars2"],
      intros: ["Write rhythms of your own, 2 bars long!"],
      fixed: (r) => lvl(r, [MEASURE_IDEA, HN_CREATE[0](), [barDictation, 0.3], HN_CREATE[1](), [taaEcho, 0.8], HN_CREATE[2]()]),
    },
  ],
};

// ── Do Re Mi Ridge: do (home), re, and the pentatonic scale ──────────────────────────────────
const DMSL = sp("do mi so la");
const DRM = sp("do re mi");
const PENTA = sp("do re mi so la");
const DMS_PATS = ["so mi do", "mi mi do", "do mi so", "so so do", "mi so do", "do do mi so", "so mi so do", "la so mi do", "do mi so la", "so la so do", "do mi so mi do", "mi so la so mi do", "la so la so mi do"];
const DRM_PATS = ["mi re do", "do re mi", "re mi re", "mi re do re", "do re mi re", "mi mi re re do", "mi re do re mi", "do do re re mi", "re re mi re do", "mi re mi re do", "do re mi mi re do"];
const PENTA_PATS = ["do re mi so", "so mi re do", "mi so la so", "la so mi re", "do re mi so la", "la so mi re do", "so la so mi re do", "do mi re so mi do", "re mi so la so mi", "mi re do re mi so", "so mi la so mi re do", "do re mi so la so mi re do"];

const doEcho = topic("g2-do-echo", (r, d) => {
  const notes = sp(byD(r, d, DMS_PATS));
  return mel("echo", notes, { pads: DMSL, tonic: DO, labels: d < 0.6 ? "solfege" : "colors", durs: held(notes.length), bpm: 92, skill: "u:melody:echo-do", prompt: "Listen, then play it back! Do is the biggest bell." });
});
const doMatch = topic("g2-do-match", (r, d) => solfegeMatch(r, { steps: d < 0.5 ? [0, 4, 7] : [0, 4, 7, 9], n: d < 0.5 ? 3 : 4, skill: "u:solfege:do" }));
const doHome = topic("g2-do-home", (r) => {
  const home = r() < 0.5;
  const ps = sp(pick(r, home ? ["so mi do", "mi so mi do", "la so mi do", "so so mi do", "do mi so mi do"] : ["do mi so", "so mi so", "mi so la", "do mi so la", "so mi la so"]));
  return listen({
    prompt: "Does this tune end on do, at home?",
    sound: tuneOf(ps, held(ps.length), "bells", 92),
    options: [picOpt("home", "🏠", "Yes, home on do"), picOpt("away", "⛵", "No, still sailing")],
    answer: home ? "home" : "away",
    skill: "u:solfege:do-home",
    why: "Do feels like home. A tune that ends on do sounds finished!",
  });
});
const doFind = topic("g2-do-find", (r, d) => {
  const target = d < 0.4 ? C4 : pick(r, DMSL);
  return mel("find", [target], { pads: DMSL, tonic: DO, labels: d < 0.25 ? "solfege" : "colors", skill: "u:solfege:find", prompt: `Find ${sw(target)} and play it! Do is the biggest bell.` });
});
const reEcho = topic("g2-re-echo", (r, d) => {
  const notes = sp(byD(r, d, DRM_PATS));
  return mel("echo", notes, { pads: DRM, tonic: DO, labels: d < 0.6 ? "solfege" : "colors", durs: held(notes.length), bpm: 92, skill: "u:melody:echo-do-re-mi", prompt: "Listen, then play it back on the bells!" });
});
const reRead = topic("g2-re-read", (r, d) => {
  const notes = sp(byD(r, d, DRM_PATS));
  return mel("read", notes, { pads: DRM, tonic: DO, labels: d < 0.5 ? "solfege" : "colors", show: "ladder", skill: "u:melody:read-ladder", prompt: "Read the ladder, then play the notes!" });
});
const reMatch = topic("g2-re-match", (r, d) => solfegeMatch(r, { steps: [0, 2, 4], n: d < 0.5 ? 3 : 4, skill: "u:solfege:do-re-mi" }));
const DRM_SONGS: { name: string; notes: number[]; durs: number[] }[] = [
  { name: "Hot Cross Buns", notes: sp("mi re do mi re do"), durs: [1, 1, 2, 1, 1, 2] },
  { name: "the middle of Hot Cross Buns", notes: sp("do do do do re re re re"), durs: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5] },
  { name: "Mary Had a Little Lamb", notes: sp("mi re do re mi mi mi"), durs: [1, 1, 1, 1, 1, 1, 2] },
  { name: "the end of Mary Had a Little Lamb", notes: sp("mi re do re mi mi mi mi re re mi re do"), durs: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 4] },
];
const reSong = topic("g2-re-song", (r) => {
  const s = pick(r, DRM_SONGS);
  return mel("read", s.notes, { pads: DRM, tonic: DO, labels: "solfege", show: "ladder", durs: s.durs, bpm: 96, skill: "u:melody:song", prompt: `Play ${s.name}! Read the ladder.` });
});
const pentaEcho = topic("g2-penta-echo", (r, d) => {
  const notes = sp(byD(r, d, PENTA_PATS));
  return mel("echo", notes, { pads: PENTA, tonic: DO, labels: d < 0.6 ? "solfege" : "colors", durs: held(notes.length), bpm: 96, skill: "u:melody:echo-penta", prompt: "Listen, then play it back on the bells!" });
});
const pentaRead = topic("g2-penta-read", (r, d) => {
  const notes = sp(byD(r, d, PENTA_PATS));
  return mel("read", notes, { pads: PENTA, tonic: DO, labels: d < 0.5 ? "solfege" : "colors", show: "ladder", skill: "u:melody:read-ladder", prompt: "Read the ladder, then play the notes!" });
});
const pentaMatch = topic("g2-penta-match", (r) => solfegeMatch(r, { steps: [0, 2, 4, 7, 9], n: 3, skill: "u:scale:penta" }));
const pentaMissing = topic("g2-penta-missing", (r) => {
  const names = ["do", "re", "mi", "so", "la"];
  const gap = int(r, 1, 4);
  return listen({
    prompt: "Listen to the pentatonic scale going up. One note is missing! Which one?",
    sound: tuneOf(PENTA.map((p, i) => (i === gap ? null : p)), 1, "bells", 84),
    options: textOpts(r, names[gap], ["fa", "ti"]),
    answer: names[gap],
    skill: "u:scale:penta",
    why: "The five pentatonic notes are do, re, mi, so and la. No fa, and no ti!",
  });
});
const pentaWhich = topic("g2-penta-which", (r) => listen({
  prompt: "Which scale is the pentatonic scale? It skips over fa and ti!",
  options: critters(r, [{ id: "penta", sound: tuneOf(scale(DO, "penta"), 0.5, "marimba", 100) }, { id: "major", sound: tuneOf(scale(DO, "major"), 0.5, "marimba", 100) }]),
  answer: "penta",
  skill: "u:scale:penta",
  why: "The pentatonic scale has only five notes, with two little jumps in it.",
}));
const SONG_RHYTHMS: { name: string; cells: string[] }[] = [
  { name: "Hot Cross Buns", cells: ["ta", "ta", "taa", "ta", "ta", "taa", "titi", "titi", "titi", "titi", "ta", "ta", "taa"] },
  { name: "Mary Had a Little Lamb", cells: ["ta", "ta", "ta", "ta", "ta", "ta", "taa", "ta", "ta", "taa", "ta", "ta", "taa"] },
];
const songRhythm = topic("g2-song-rhythm", (r, d): Activity => {
  const s = pick(r, SONG_RHYTHMS);
  const read = d >= 0.5;
  const cells = read ? s.cells : s.cells.slice(0, s.name === "Hot Cross Buns" ? 6 : 7);
  return { kind: "rhythm", mode: read ? "read" : "echo", prompt: read ? `Here's the rhythm of ${s.name}. Read it, then play it!` : `Here's the start of ${s.name}. Listen, then tap the rhythm back!`, cells, meter: [4, 4], bpm: 88, show: read ? "notes" : "none", drum: "bongo", skill: "u:rhythm:song" };
});
const pentaJam = topic("g2-penta-jam", (r) => compose({ prompt: "No wrong notes! Fill all 4 boxes with any pentatonic notes you like.", pitches: PENTA, slots: 4, inst: pick(r, ["bells", "kalimba", "marimba"] as InstId[]), rules: [{ rule: "notes", min: 4 }], skill: "u:compose:penta" }));
const PENTA_SONGS: { prompt: string; rules: ComposeRule[] }[] = [
  { prompt: "Write a tune that comes home: end on do!", rules: [{ rule: "end", p: C4 }, { rule: "notes", min: 6 }] },
  { prompt: "Start on do and end on do. Use re in the middle!", rules: [{ rule: "start", p: C4 }, { rule: "end", p: C4 }, { rule: "use", pitches: [D4] }] },
  { prompt: "Climb up high to la, then come home to do.", rules: [{ rule: "use", pitches: [A4] }, { rule: "end", p: C4 }, { rule: "arch" }] },
  { prompt: "Use all five notes: do, re, mi, so and la!", rules: [{ rule: "use", pitches: PENTA }] },
  { prompt: "Write a smooth tune. Only step to the next bell! End on do.", rules: [{ rule: "steps" }, { rule: "end", p: C4 }, { rule: "notes", min: 6 }] },
];
const pentaSong = (s: (typeof PENTA_SONGS)[number], inst: InstId = "bells"): Activity => compose({ prompt: s.prompt, pitches: PENTA, slots: 8, inst, rules: s.rules, skill: "u:compose:penta" });
const pentaCompose = topic("g2-penta-compose", (r) => pentaSong(pick(r, PENTA_SONGS), pick(r, ["bells", "marimba", "kalimba"] as InstId[])));

const DO_IDEA = idea("Do is home", [
  frame("Meet do! Do sits below mi, at the bottom of the ladder.", ladderShow(DO, [0, 4, 7, 9], [0]), tuneOf(sp("so mi do"), [1, 1, 2], "bells", 88)),
  frame("Do feels like home. So, mi, do. Ahh, home!", ladderShow(DO, [0, 4, 7, 9]), tuneOf(sp("so mi so mi do"), [1, 1, 1, 1, 2], "bells", 92)),
  frame("Lots of songs end on do. Ring Around the Rosie does: we all fall DOWN!", ladderShow(DO, [0, 4, 7, 9]), songScore("rosie", { inst: "bells" })),
  frame("Your turn! Play so, mi, do, and come home.", bellsShow(DMSL, [], "solfege", DO), undefined, "bells", DMSL),
], "u:solfege:do-idea");
const RE_IDEA = idea("Re, the step between", [
  frame("Meet re! Re sits between do and mi.", ladderShow(DO, [0, 2, 4], [2]), tuneOf(sp("do re mi"), [1, 1, 2], "bells", 88)),
  frame("Do, re, mi: three steps up. Mi, re, do: three steps down!", ladderShow(DO, [0, 2, 4]), tuneOf(sp("do re mi mi re do"), [1, 1, 2, 1, 1, 2], "bells", 92)),
  frame("Hot Cross Buns is a do-re-mi song!", ladderShow(DO, [0, 2, 4]), songScore("hotcross", { inst: "bells" })),
  frame("Mary Had a Little Lamb starts with mi, re, do too.", ladderShow(DO, [0, 2, 4]), songScore("mary", { inst: "bells", n: 10 })),
  frame("Your turn! Play do, re and mi.", bellsShow(DRM, [], "solfege", DO), undefined, "bells", DRM),
], "u:solfege:re-idea");
const PENTA_IDEA = idea("Five-note magic", [
  frame("Put them all together: do, re, mi, so, la. That's the pentatonic scale!", ladderShow(DO, [0, 2, 4, 7, 9], [0, 2, 4, 7, 9]), tuneOf([...PENTA, C5, ...PENTA.slice().reverse()], [0.5, 0.5, 0.5, 0.5, 0.5, 1, 0.5, 0.5, 0.5, 0.5, 2], "bells", 96)),
  frame("Penta means five. Five notes! It skips over fa and ti.", ladderShow(DO, [0, 2, 4, 7, 9]), tuneOf(PENTA, [1, 1, 1, 1, 2], "marimba", 92)),
  frame("Amazing Grace uses only pentatonic notes. Listen!", picsShow("🎶"), songScore("grace", { inst: "piano", bpm: 92 })),
  frame("Here's the magic: there are NO wrong notes. Play any bells you like!", bellsShow(PENTA, [], "solfege", DO), undefined, "bells", PENTA),
], "u:scale:penta-idea");
const PENTA_WRITE_IDEA = idea("Pentatonic songwriter", [
  frame("People sing pentatonic songs all over the world: in Africa, China, Scotland and America!", ladderShow(DO, [0, 2, 4, 7, 9]), tuneOf(sp("mi so la so mi re do re mi do"), [0.5, 0.5, 1, 0.5, 0.5, 1, 0.5, 0.5, 1, 2], "kalimba", 100)),
  frame("Your tune can go anywhere. Ending on do makes it sound finished.", ladderShow(DO, [0, 2, 4, 7, 9], [0]), tuneOf(sp("so la so mi re do"), [1, 1, 1, 1, 1, 3], "bells", 96)),
  frame("Write it, play it with the band, and keep it in your Studio!", ladderShow(DO, [0, 2, 4, 7, 9]), layer(tuneOf(sp("do re mi so la so mi do"), 1, "marimba", 100), band(8, 100, { bass: [48, 55] }))),
], "u:compose:penta-idea");

const DO_TOPICS = [doEcho, doHome, doMatch, doFind];
const RE_TOPICS = [reEcho, reRead, songRhythm, reMatch, reSong, doHome];
const PENTA_TOPICS = [pentaEcho, pentaMissing, pentaJam, pentaRead, pentaMatch, pentaWhich];
const DO_RE_MI_RIDGE: WorldDef = {
  id: "g2-do-re-mi",
  title: "Do Re Mi Ridge",
  emoji: "⛰️",
  grade: "2",
  theme: "volcano",
  items: 6,
  blurb: "Find do, the home note, and re, the step between. Then climb the five-note pentatonic scale!",
  talk: ["Can you sing Hot Cross Buns with do, re, mi? (Mi re do, mi re do!)", "Why does a song sound finished when it ends on do?"],
  challenge: "Hum a song you know. Does its last note feel like home? That's do!",
  stages: [
    {
      title: "Do is home",
      emoji: "🏠",
      levels: 1,
      topics: DO_TOPICS,
      unlocks: ["note:do"],
      intros: ["Every song has a home note. Its name is do!"],
      fixed: (r) => lvl(r, [DO_IDEA, [doEcho, 0], [doHome, 0], [doFind, 0], [doMatch, 0.2], [doEcho, 0.4]]),
    },
    {
      title: "Re, the step between",
      emoji: "🪜",
      levels: 2,
      topics: RE_TOPICS,
      unlocks: ["note:re"],
      intros: ["Re fills the gap between do and mi!", "Play real songs with do, re and mi!"],
      fixed: teachStage(2, 6, (r) => [RE_IDEA, reEcho.gen(r, 0)], RE_TOPICS),
    },
    {
      title: "Five-note magic",
      emoji: "✨",
      levels: 2,
      topics: PENTA_TOPICS,
      intros: ["Five notes, and no wrong ones!", "Climb the pentatonic scale!"],
      fixed: teachStage(2, 6, (r) => [PENTA_IDEA, pentaEcho.gen(r, 0)], PENTA_TOPICS),
    },
    {
      title: "Pentatonic songwriter",
      emoji: "✏️",
      levels: 1,
      topics: [pentaCompose],
      unlocks: ["scale:penta"],
      intros: ["Write a pentatonic song. Every note sounds good!"],
      fixed: (r) => lvl(r, [PENTA_WRITE_IDEA, pentaSong(PENTA_SONGS[0]), [pentaEcho, 0.5], pentaSong(PENTA_SONGS[1], "marimba"), [reSong, 0.5], pentaSong(PENTA_SONGS[2], "kalimba")]),
    },
  ],
};

// ── Meter Marsh: strong beats, groups of 2 and 3, time signatures ────────────────────────────
/** Twelve beats grouped in 2s, 3s or 4s: a big drum on each strong beat (easy), or only louder clicks (hard). */
function accents(r: Rng, n: number, d: number): Score {
  const bpm = pick(r, [104, 112, 120]);
  if (d < 0.5) return beat({ kick: "x" + ".".repeat(n - 1), block: "." + "x".repeat(n - 1) }, { bpm, per: 1, times: Math.round(12 / n) });
  return clicks(12, bpm, [n, 4]);
}
type Stress = { syl: string[]; durs: number[]; pitches: number[]; meter: Meter; bpm: number };
const RAIN = song("rainrain");
const STRESS: Stress[] = [
  { syl: ["See", "saw,", "up", "and", "down!"], durs: [1, 1, 0.5, 0.5, 1], pitches: [G4, E4, G4, G4, E4], meter: [2, 4], bpm: 96 },
  { syl: RAIN.words ?? [], durs: RAIN.durs, pitches: RAIN.pitches.map((p) => p ?? G4), meter: [2, 4], bpm: 96 },
  { syl: ["Hot", "cross", "buns,", "hot", "cross", "buns!"], durs: [1, 1, 2, 1, 1, 2], pitches: sp("mi re do mi re do"), meter: [4, 4], bpm: 96 },
  { syl: ["Twin", "kle,", "twin", "kle,", "lit", "tle", "star"], durs: [1, 1, 1, 1, 1, 1, 2], pitches: [C4, C4, G4, G4, A4, A4, G4], meter: [4, 4], bpm: 96 },
  { syl: ["Light", "ly", "row,", "light", "ly", "row"], durs: [1, 1, 2, 1, 1, 2], pitches: [G4, E4, E4, F4, D4, D4], meter: [4, 4], bpm: 100 },
  { syl: ["Lon", "don", "Bridge", "is", "fall", "ing", "down"], durs: [1.5, 0.5, 1, 1, 1, 1, 2], pitches: [G4, A4, G4, F4, E4, F4, G4], meter: [4, 4], bpm: 100 },
  { syl: ["Float", "ing", "a", "way,", "sail", "ing", "all", "day"], durs: [1, 1, 1, 3, 1, 1, 1, 3], pitches: [G4, E4, G4, C5, A4, G4, E4, G4], meter: [3, 4], bpm: 120 },
  { syl: ["Swing", "ing", "so", "high,", "up", "to", "the", "sky!"], durs: [1, 1, 1, 3, 1, 1, 1, 3], pitches: [C4, E4, G4, A4, G4, E4, D4, C4], meter: [3, 4], bpm: 120 },
  { syl: ["Bells", "are", "ring", "ing,", "ding,", "dong,", "dell!"], durs: [2, 1, 2, 1, 1, 1, 1], pitches: [C5, A4, G4, E4, G4, E4, C4], meter: [3, 4], bpm: 120 },
];
const stressPrompt = (m: Meter) => (m[0] === 4 ? "This song goes in 4. Tap the words on beats 1 and 3, the strong beats!" : `This song goes in ${m[0]}. Tap the words on beat 1, the strong beat!`);
const strongWords = topic("g2-strong-words", (r, d): Activity => {
  const s = pick(r, d < 0.4 ? STRESS.filter((x) => x.meter[0] !== 3) : STRESS);
  return { kind: "lyrics", mode: "stress", prompt: stressPrompt(s.meter), syllables: s.syl, durs: s.durs, pitches: s.pitches, stress: strongSyllables(s.durs, s.meter), bpm: s.bpm, meter: s.meter, skill: "u:meter:strong-beats" };
});
const meterGroups = topic("g2-meter-groups", (r, d) => {
  const choices = d < 0.6 ? [2, 3] : [2, 3, 4];
  const n = pick(r, choices);
  return listen({
    prompt: "Listen for the strong beats. Does the music go in 2s, 3s or 4s?",
    sound: accents(r, n, d),
    options: choices.map((k) => opt(String(k), `In ${k}s`, { show: beatsShow(k, [0]) })),
    answer: String(n),
    skill: "u:meter:groups",
    why: "Count from each strong beat: ONE two, or ONE two three, or ONE two three four.",
  });
});
const marchWaltz = topic("g2-march-waltz", (r) => meterEar(r, { skill: "u:meter:march-waltz" }));
const meterTap = topic("g2-meter-tap", (r, d) => {
  const which = pick(r, ["march", "waltz", "country"] as const);
  return beatTap({ music: piece(which, { bpm: which === "march" ? 108 : 112 }), beats: 8, scaffold: d < 0.5, skill: "u:beat:steady", prompt: "Tap the drum on every beat. Feel the strong ones!" });
});
const timeSig = topic("g2-time-sig", (r, d) => {
  const n = pick(r, [2, 3, 4]);
  return listen({
    prompt: "Listen for the strong beats. Which time signature fits?",
    sound: accents(r, n, Math.max(0.2, d - 0.2)),
    options: [2, 3, 4].map((k) => opt(String(k), undefined, { show: meterShow([k, 4]) })),
    answer: String(n),
    skill: "u:meter:time-signature",
    why: "The top number of a time signature tells how many beats are in each bar.",
  });
});
const meterSee = topic("g2-meter-see", (r) => {
  const k = pick(r, [2, 3, 4]);
  return seeChoice({ prompt: "How many beats are in each bar with this time signature?", visual: meterShow([k, 4]), options: [2, 3, 4].map((x) => ({ id: String(x), text: String(x) })), answer: String(k), skill: "u:meter:time-signature", why: "Look at the top number. It counts the beats in each bar." });
});
const meterFill = topic("g2-meter-fill", (r): Activity => {
  const three = r() < 0.6;
  return three
    ? { kind: "measure", mode: "fill", prompt: "This music is in three-four time. Fill each bar with 3 beats!", meter: [3, 4], bars: 2, cards: ["ta", "titi", "taa", "taaa"], skill: "u:meter:bars-3" }
    : { kind: "measure", mode: "fill", prompt: "This music is in two-four time. Fill each bar with 2 beats!", meter: [2, 4], bars: 2, cards: ["ta", "titi", "z", "taa"], skill: "u:meter:bars-2" };
});
/** Tap ONLY the strong beat: one long note per bar, so each tap lands on beat 1. */
const strongTap = (three: boolean) => topic(three ? "g2-strong-tap-3" : "g2-strong-tap", (r): Activity => {
  const two = r() < 0.5;
  const m: Meter = three ? [3, 4] : two ? [2, 4] : [4, 4];
  const cell = three ? "taaa" : two ? "taa" : "whole";
  const bars = m[0] === 4 ? 3 : 4;
  return { kind: "rhythm", mode: "read", prompt: three ? "Three-four time! Tap only on beat 1 of every bar. Count: ONE two three." : two ? "Two-four time! Tap only on beat 1 of every bar. Count: ONE two." : "Four-four time! Tap only on beat 1 of every bar. Count: ONE two three four.", cells: Array.from({ length: bars }, () => cell), meter: m, bpm: 100, show: "notes", drum: "kick", skill: "u:meter:strong-tap" };
});
const strongTap2 = strongTap(false);
const strongTap3 = strongTap(true);
const IN3 = [["birthday", 12], ["grace", 9], ["bonnie", 10]] as const;
const NOT3 = [["twinkle", 7], ["mary", 7], ["rainrain", 11], ["jingle", 8], ["hotcross", 6]] as const;
const songIn3 = topic("g2-song-in-3", (r) => {
  const [y, yn] = pick(r, IN3);
  const [n, nn] = pick(r, NOT3);
  return listen({ prompt: "Which song swings in 3, like a waltz? ONE two three, ONE two three.", options: critters(r, [{ id: "three", sound: songScore(y, { inst: "piano", n: yn }) }, { id: "other", sound: songScore(n, { inst: "piano", n: nn }) }]), answer: "three", skill: "u:meter:hear-3", why: "Happy Birthday, Amazing Grace and My Bonnie all go in 3. Twinkle, Mary and Jingle Bells go in 2s and 4s." });
});
const METER_BEATS: (() => Activity)[] = [
  () => ({ kind: "beatlab", mode: "make", prompt: "Ding the cowbell on beat 1, the strong beat. Then add a drum and a clap!", rows: ["kick", "clap", "cowbell"], steps: 4, bpm: 100, rules: [{ rule: "on", row: "cowbell", steps: [0] }, { rule: "off", row: "cowbell", steps: [1, 2, 3] }, { rule: "count", row: "kick", min: 1 }, { rule: "count", row: "clap", min: 1 }], skill: "u:beatmaking:strong-beat" }),
  () => ({ kind: "beatlab", mode: "make", prompt: "Make a march! Big drum on squares 1 and 5, the strong beats. Snare on 3 and 7.", rows: ["bassdrum", "snare", "cowbell"], steps: 8, bpm: 104, rules: [{ rule: "on", row: "bassdrum", steps: [0, 4] }, { rule: "on", row: "snare", steps: [2, 6] }], skill: "u:beatmaking:strong-beat" }),
  () => ({ kind: "beatlab", mode: "make", prompt: "Make your own beat! The kick and the cowbell both play on beat 1. Use at least 3 rows.", rows: ["kick", "snare", "hat", "cowbell"], steps: 8, bpm: 100, rules: [{ rule: "on", row: "cowbell", steps: [0] }, { rule: "on", row: "kick", steps: [0] }, { rule: "rows", min: 3 }], skill: "u:beatmaking:create" }),
];
const meterBeat = topic("g2-meter-beat", (r) => pick(r, METER_BEATS)());
const METER_CREATE: (() => Activity)[] = [
  () => ({ kind: "measure", mode: "create", prompt: "Write a waltz rhythm: 2 bars of three-four. Use a ta-a-a!", meter: [3, 4], bars: 2, cards: ["ta", "titi", "z", "taa", "taaa"], must: ["taaa"], bpm: 104, skill: "u:meter:create" }),
  () => ({ kind: "measure", mode: "create", prompt: "Write a march rhythm: 2 bars of two-four. Use ti-ti!", meter: [2, 4], bars: 2, cards: ["ta", "titi", "z", "taa"], must: ["titi"], bpm: 104, skill: "u:meter:create" }),
  () => ({ kind: "measure", mode: "create", prompt: "Write 2 bars of three-four with a ta-a and a ti-ti.", meter: [3, 4], bars: 2, cards: ["ta", "titi", "z", "taa", "taaa"], must: ["taa", "titi"], bpm: 104, skill: "u:meter:create" }),
];
const meterCreate = topic("g2-meter-create", (r) => pick(r, METER_CREATE)());

const STRONG_IDEA = idea("Strong beats and weak beats", [
  frame("Some beats are strong. Some are weak. Listen: ONE two, ONE two.", beatsShow(4, [0, 2]), beat({ kick: "x.", block: ".x" }, { bpm: 100, per: 1, times: 4 })),
  frame("A march goes in twos: LEFT right, LEFT right!", beatsShow(2, [0]), piece("march", { bpm: 108 })),
  frame("A waltz goes in threes: ONE two three, ONE two three. Time to dance!", beatsShow(3, [0]), piece("waltz", { bpm: 132 })),
  frame("Your turn! Play ONE two three on the drum. Make ONE loud!", beatsShow(3, [0]), beat({ kick: "x..", block: ".xx" }, { bpm: 100, per: 1, times: 3 }), "drum"),
], "u:meter:strong-idea");
const TIMESIG_IDEA = idea("Time signatures", [
  frame("A time signature sits at the start of the music. The top number counts the beats in each bar.", meterShow([4, 4]), clicks(8, 100, [4, 4])),
  frame("Two-four: 2 beats in a bar. Marches love it!", meterShow([2, 4]), clicks(8, 100, [2, 4])),
  frame("Three-four: 3 beats in a bar. That's a waltz!", meterShow([3, 4]), clicks(9, 108, [3, 4])),
  frame("Here's a note just for three-four: ta-a-a. It lasts 3 beats and fills a whole bar!", sym("dotted-half", "ta-a-a = 3 beats"), layer(tune(["taaa", "taaa"], [G4, C5], "recorder", 104), clicks(6, 104, [3, 4]))),
], "u:meter:time-signature-idea");
const METER_MAKE_IDEA = idea("Meter maker", [
  frame("Drummers mark the strong beat to make you want to move. Listen to the cowbell on beat 1!", gridShow(["kick", "clap", "cowbell"], ["x.x.", ".x.x", "x..."]), beat({ kick: "x.x.", clap: ".x.x", cowbell: "x..." }, { bpm: 100, per: 1, times: 3 })),
  frame("A march beat: the big drum plays the strong beats. Boom, tap, boom, tap!", gridShow(["bassdrum", "snare"], ["x...x...", "..x...x."]), beat({ bassdrum: "x...x...", snare: "..x...x." }, { bpm: 104, per: 2, times: 3 })),
  frame("Now make beats and rhythms of your own, in 2s, 3s and 4s!", meterShow([3, 4]), piece("waltz", { bpm: 132 })),
], "u:meter:maker-idea");

const STRONG_TOPICS = [meterGroups, marchWaltz, strongTap2, meterTap, songIn3, strongWords];
const TIMESIG_TOPICS = [timeSig, meterFill, strongTap3, meterSee, strongWords, songIn3];
const METER_MARSH: WorldDef = {
  id: "g2-meter-marsh",
  title: "Meter Marsh",
  emoji: "🐸",
  grade: "2",
  theme: "jungle",
  items: 6,
  blurb: "Feel the strong beats! March in 2s, waltz in 3s, and read the time signature.",
  talk: ["Can you march (in 2) and then waltz (in 3) around the kitchen?", "Clap a song you know. Which beats feel strong?"],
  challenge: "Put on any song and find its strong beat. Stomp on it, and clap the others!",
  stages: [
    {
      title: "Strong and weak",
      emoji: "💪",
      levels: 1,
      topics: STRONG_TOPICS,
      intros: ["Some beats are strong, like a frog's big jump!"],
      fixed: (r) => lvl(r, [STRONG_IDEA, [meterGroups, 0], [marchWaltz, 0], [meterTap, 0], [strongWords, 0], [meterGroups, 0.3]]),
    },
    { title: "March or waltz?", emoji: "💃", levels: 2, topics: STRONG_TOPICS, intros: ["March in 2s or waltz in 3s?", "Find the strong beats in real songs!"] },
    {
      title: "Time signatures",
      emoji: "🔢",
      levels: 2,
      topics: TIMESIG_TOPICS,
      intros: ["Two numbers tell you how the music goes!", "Fill bars of 2 and 3!"],
      fixed: teachStage(2, 6, (r) => [TIMESIG_IDEA, meterSee.gen(r, 0), timeSig.gen(r, 0)], TIMESIG_TOPICS),
    },
    {
      title: "Meter maker",
      emoji: "🐸",
      levels: 1,
      topics: [meterBeat, meterCreate],
      unlocks: ["drum:cowbell"],
      intros: ["Make beats that march and rhythms that waltz!"],
      fixed: (r) => lvl(r, [METER_MAKE_IDEA, METER_BEATS[0](), METER_CREATE[0](), METER_BEATS[1](), [strongWords, 0.8], METER_CREATE[1]()]),
    },
  ],
};

// ── Form Fjord: same and different, AB, ABA, call and response ───────────────────────────────
type Parts = { A: Score; B: Score; C: Score };
/** Contrasting little phrases (2 bars each): A, B and C differ in tune, rhythm, range AND instrument. */
const PARTS: (() => Parts)[] = [
  () => ({ A: phrase("0 2 4 0 4 7 7/2", "bells"), B: phrase("-12/0.5 -12/0.5 -5 -12/0.5 -12/0.5 -5 -8 -10 -12/2", "tuba"), C: phrase("12/0.5 14/0.5 16 19/0.5 16/0.5 14 12/4", "flute") }),
  () => ({ A: phrase("7 4 7 4 9 7 4/2", "marimba"), B: phrase("0/0.5 0/0.5 0/0.5 0/0.5 7 7 5/0.5 4/0.5 2 0/2", "trumpet"), C: phrase("12 11 9 7 9/2 12/2", "violin") }),
  () => ({ A: phrase("0/0.5 4/0.5 7/0.5 12/0.5 7/0.5 4/0.5 0 2/0.5 4/0.5 2 0/2", "xylophone"), B: phrase("-12/2 -8/2 -5/2 -12/2", "cello"), C: phrase("9 7 9 12 9 7 4/2", "piano") }),
  () => ({ A: phrase("4 7/0.5 9/0.5 7 4 2 4 0/2", "kalimba"), B: phrase("0+4+7/2 5+9+12/2 7+11+14/2 0+4+7/2", "organ"), C: phrase("12/0.5 9/0.5 7/0.5 9/0.5 12 14 12/0.5 9/0.5 7 r/2", "steeldrum") }),
];
const partsFor = (p: Parts, order: string[]): Record<string, Score> => Object.fromEntries([...new Set(order)].map((k) => [k, p[k as keyof Parts]]));
const FORMS2 = [["A", "B"], ["A", "B", "A"], ["A", "A", "B"], ["A", "B", "B"], ["A", "B", "A"], ["A", "A", "B", "A"]];
const FORM_NAMES2 = ["AB", "ABA", "AAB", "ABB", "AABA"];
const formBuild2 = topic("g2-form-build", (r, d): Activity => {
  const order = [...byD(r, d, FORMS2)];
  return { kind: "form", mode: "build", prompt: "Listen to the whole song. Put the blocks in the order you hear!", sections: partsFor(pick(r, PARTS)(), order), order, skill: "u:form:build" };
});
const formLabel2 = topic("g2-form-label", (r, d): Activity => {
  const order = [...byD(r, d, FORMS2)];
  const answer = order.join("");
  return { kind: "form", mode: "label", prompt: "Listen to the song. What is its form?", sections: partsFor(pick(r, PARTS)(), order), order, options: shuffle(r, [answer, ...pickN(r, FORM_NAMES2, 2, (x) => x === answer)]), answer, skill: "u:form:label" };
});
const phraseSame = topic("g2-phrase-same", (r, d) => {
  const ps = pickN(r, PARTS, 2).map((f) => f());
  const a = ps[0].A;
  const same = r() < 0.5;
  const inst = a.tracks[0].kind === "notes" ? a.tracks[0].inst : "bells";
  const b = same ? a : d < 0.5 ? ps[0].B : onInst(ps[1].A, inst);
  return listen({ prompt: "Listen to both phrases. Are they the same or different?", sound: then(a, b, 1), options: [picOpt("same", "🟰", "Same"), picOpt("diff", "🔀", "Different")], answer: same ? "same" : "diff", skill: "u:form:same-different", why: "Same phrases get the same letter. A new phrase gets a new letter!" });
});
const CALLS = ["0 2 4 7", "7 4 7 9", "0 2 4 2", "4/0.5 4/0.5 2 4 7", "9 7 4 2", "0 4 7/2"];
const HOMES = ["7 4 2 0", "4 2 2 0", "2 4 2 0", "9 7 4 0", "4/0.5 2/0.5 0 0/2"];
const AWAYS = ["4 2 4 7", "0 2 4 9", "7 4 2 2", "9 7 9 7", "2 4 2 2"];
const callAnswer = topic("g2-call-answer", (r) => listen({
  prompt: "Listen to the call. Which answer comes home to do?",
  sound: phrase(pick(r, CALLS), "trumpet", 100),
  options: critters(r, [{ id: "home", sound: phrase(pick(r, HOMES), "bells", 100) }, { id: "away", sound: phrase(pick(r, AWAYS), "bells", 100) }]),
  answer: "home",
  skill: "u:form:call-response",
  why: "An answer that ends on do sounds finished. It's home!",
}));
const questionOrAnswer = topic("g2-q-or-a", (r) => {
  const q = r() < 0.5;
  return listen({ prompt: "Is this phrase a question or an answer?", sound: phrase(pick(r, q ? CALLS : HOMES), "marimba", 100), options: [picOpt("q", "❓", "A question"), picOpt("a", "🏠", "An answer")], answer: q ? "q" : "a", skill: "u:form:question-answer", why: "A question ends up in the air. An answer comes home to do." });
});
const callEcho = topic("g2-call-echo", (r, d) => {
  const notes = sp(byD(r, d, PENTA_PATS));
  return mel("echo", notes, { pads: PENTA, tonic: DO, labels: d < 0.5 ? "solfege" : "colors", durs: held(notes.length), bpm: 100, skill: "u:melody:echo-penta", prompt: "Here's my call. Echo it right back!" });
});
const ABA_A = [sp("do re mi do"), sp("mi re do do"), sp("do mi re do"), sp("mi mi re do")];
const abaCompose = topic("g2-aba-compose", (r) => {
  const A = pick(r, ABA_A);
  return compose({ prompt: "Your A part is ready, at the start and the end. Write a B part in the middle! Make it different: use so and la.", pitches: PENTA, slots: 12, start: [...A, null, null, null, null, ...A], rules: [{ rule: "notes", min: 12 }, { rule: "use", pitches: [G4, A4] }], skill: "u:compose:form" });
});
const CALL_STARTS = [sp("do re mi so"), sp("so mi la so"), sp("mi re mi so"), sp("do mi so la")];
const callCompose = topic("g2-call-compose", (r) => compose({ prompt: "The call is ready. Write the answer, and make it come home to do!", pitches: PENTA, slots: 8, start: [...pick(r, CALL_STARTS), null, null, null, null], rules: [{ rule: "notes", min: 8 }, { rule: "end", p: C4 }], skill: "u:compose:call-response" }));

const TWINKLE_A = songScore("twinkle", { inst: "bells", bpm: 120 });
const TWINKLE_B = tuneOf([G4, G4, F4, F4, E4, E4, D4, G4, G4, F4, F4, E4, E4, D4], [1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2], "bells", 120);
const HCB_A = tuneOf(sp("mi re do"), [1, 1, 2], "bells", 100);
const HCB_B = tuneOf(sp("do do do do re re re re"), 0.5, "bells", 100);
const SAME_IDEA_PARTS = PARTS[1]();
const SAME_IDEA = idea("Same or different?", [
  frame("Songs are made of phrases: little musical sentences.", formShow(["A"]), SAME_IDEA_PARTS.A),
  frame("Listen. These two phrases are the SAME.", formShow(["A", "A"]), then(SAME_IDEA_PARTS.A, SAME_IDEA_PARTS.A, 0.5)),
  frame("Now listen. These two are DIFFERENT!", formShow(["A", "B"]), then(SAME_IDEA_PARTS.A, SAME_IDEA_PARTS.B, 0.5)),
  frame("We name phrases with letters. The first one is A. A new one is B.", formShow(["A", "A", "B"]), then(then(SAME_IDEA_PARTS.A, SAME_IDEA_PARTS.A, 0.5), SAME_IDEA_PARTS.B, 0.5)),
], "u:form:same-idea");
const ABA_IDEA_PARTS = PARTS[0]();
const ABA_IDEA = idea("AB and ABA", [
  frame("AB form: one part, then a new part.", formShow(["A", "B"]), then(ABA_IDEA_PARTS.A, ABA_IDEA_PARTS.B, 0.5)),
  frame("ABA form: A, then B, then A comes back! Like a sandwich.", formShow(["A", "B", "A"]), then(then(ABA_IDEA_PARTS.A, ABA_IDEA_PARTS.B, 0.5), ABA_IDEA_PARTS.A, 0.5)),
  frame("Twinkle, Twinkle is ABA! Listen for A coming back at the end.", formShow(["A", "B", "A"]), then(then(TWINKLE_A, TWINKLE_B, 0), TWINKLE_A, 0)),
  frame("Hot Cross Buns goes A, A, B, A. Can you hear it?", formShow(["A", "A", "B", "A"]), songScore("hotcross", { inst: "bells" })),
], "u:form:aba-idea");
const CALL_IDEA = idea("Call and response", [
  frame("A call asks a musical question. It ends up in the air.", picsShow("❓"), phrase("0 2 4 7", "trumpet", 100)),
  frame("The response answers it, and comes home to do.", picsShow("🏠"), then(phrase("0 2 4 7", "trumpet", 100), phrase("7 4 2 0", "bells", 100), 0)),
  frame("Sailors sang call and response songs called sea shanties to pull the ropes together. Heave, ho!", picsShow("⛵"), then(phrase("7 7 4 9/0.5 7/0.5 4 2/2", "trumpet", 104), phrase("4 4 2 4/0.5 2/0.5 0 0/2", "choir", 104), 0)),
  frame("Your turn! Play an answer on the bells. End on do.", bellsShow(PENTA, [], "solfege", DO), phrase("0 2 4 7", "trumpet", 100), "bells", PENTA),
], "u:form:call-idea");
const FORM_WRITE_IDEA = idea("Form builder", [
  frame("Songwriters plan their songs like builders: A, then B, then A again!", formShow(["A", "B", "A"]), then(then(phrase("0 2 4 0/2", "bells", 104), phrase("7 9 7 4/2", "bells", 104), 0), phrase("0 2 4 0/2", "bells", 104), 0)),
  frame("A B part should be different. Try new notes, like so and la!", formShow(["A", "B", "A"]), phrase("7/0.5 9/0.5 7/0.5 9/0.5 7 4/2", "marimba", 104)),
  frame("Or write an answer to a call. Come home to do!", formShow(["A", "B"]), then(phrase("0 2 4 7", "trumpet", 100), phrase("7 4 2 0", "bells", 100), 0)),
], "u:form:builder-idea");
const twinkleForm = (): Activity => ({ kind: "form", mode: "build", prompt: "Twinkle, Twinkle! Listen, and put its parts in order.", sections: { A: TWINKLE_A, B: TWINKLE_B }, order: ["A", "B", "A"], skill: "u:form:build" });
const hotCrossForm = (): Activity => ({ kind: "form", mode: "label", prompt: "Hot Cross Buns! Listen. What is its form?", sections: { A: HCB_A, B: HCB_B }, order: ["A", "A", "B", "A"], options: ["AABA", "ABA", "AB"], answer: "AABA", skill: "u:form:label" });

const FRERE_A = tuneOf([C4, D4, E4, C4], 1, "bells", 104);
const FRERE_B = tuneOf([E4, F4, G4], [1, 1, 2], "bells", 104);
const realForm = topic("g2-real-form", (r) => pick(r, [
  twinkleForm,
  hotCrossForm,
  (): Activity => ({ kind: "form", mode: "build", prompt: "Are You Sleeping? Listen, and put its parts in order.", sections: { A: FRERE_A, B: FRERE_B }, order: ["A", "A", "B", "B"], skill: "u:form:build" }),
  (): Activity => ({ kind: "form", mode: "label", prompt: "Are You Sleeping? Listen. What is its form?", sections: { A: FRERE_A, B: FRERE_B }, order: ["A", "A", "B", "B"], options: ["AABB", "ABAB", "ABA"], answer: "AABB", skill: "u:form:label" }),
])());
const formQuiz = topic("g2-form-quiz", (r) => pick(r, [
  (): Activity => seeChoice({ prompt: "ABA form is like a sandwich. Which part is the bread on both ends?", visual: formShow(["A", "B", "A"]), options: textOpts(r, "A", ["B"]), answer: "A", skill: "u:form:label", why: "In ABA, the A part comes first AND last, with B in the middle." }),
  (): Activity => seeChoice({ prompt: "Which picture shows A, B, A?", options: shuffle(r, [["A", "B", "A"], ["A", "B"], ["A", "A", "B"]]).map((s) => ({ id: s.join(""), visual: musicVisual(formShow(s)) })), answer: "ABA", skill: "u:form:label" }),
  (): Activity => seeChoice({ prompt: "A song goes A, B, A. How many DIFFERENT parts does it have?", visual: formShow(["A", "B", "A"]), options: textOpts(r, "2", ["1", "3"]), answer: "2", skill: "u:form:label", why: "There are two different parts, A and B. A just plays twice!" }),
])());
const rhythmSame = topic("g2-rhythm-same", (r, d) => sameDifferent(r, d, { pool: d < 0.5 ? ["ta", "titi", "z"] : ["ta", "titi", "z", "taa"], skill: "u:form:same-different" }));
const SAME_TOPICS = [phraseSame, formBuild2, realForm, rhythmSame, formLabel2, formQuiz];
const CALL_TOPICS = [callAnswer, questionOrAnswer, callEcho, callCompose, realForm, phraseSame];
const FORM_FJORD: WorldDef = {
  id: "g2-form-fjord",
  title: "Form Fjord",
  emoji: "🏔️",
  grade: "2",
  theme: "ice",
  items: 6,
  blurb: "Songs have parts! Hear same and different, build AB and ABA, and answer a musical call.",
  talk: ["Sing Twinkle, Twinkle. Where does the A part come back?", "Can you clap a question, and have someone clap an answer?"],
  challenge: "Listen to a favorite song. Can you hear a part that comes back again? That's its A!",
  stages: [
    {
      title: "Same or different?",
      emoji: "🔀",
      levels: 1,
      topics: SAME_TOPICS,
      intros: ["Music has parts, like a train has cars!"],
      fixed: (r) => lvl(r, [SAME_IDEA, [phraseSame, 0], [phraseSame, 0.2], [formBuild2, 0], [phraseSame, 0.4], [formBuild2, 0.2]]),
    },
    {
      title: "AB and ABA",
      emoji: "🥪",
      levels: 2,
      topics: SAME_TOPICS,
      intros: ["A, B, A: a song sandwich!", "Build the song, block by block!"],
      fixed: teachStage(2, 6, (r) => [ABA_IDEA, formLabel2.gen(r, 0.2)], SAME_TOPICS),
    },
    {
      title: "Call and response",
      emoji: "📣",
      levels: 2,
      topics: CALL_TOPICS,
      intros: ["Music can ask a question, and answer it!", "Echo the call, then answer it!"],
      fixed: teachStage(2, 6, (r) => [CALL_IDEA, callAnswer.gen(r, 0), questionOrAnswer.gen(r, 0)], CALL_TOPICS),
    },
    {
      title: "Form builder",
      emoji: "🧱",
      levels: 1,
      topics: [abaCompose, callCompose],
      unlocks: ["tool:sections"],
      intros: ["Build a song with an A and a B part!"],
      fixed: (r) => lvl(r, [FORM_WRITE_IDEA, [abaCompose, 0], twinkleForm(), [callCompose, 0], hotCrossForm(), [abaCompose, 1]]),
    },
  ],
};

// ── Staff Station: five lines, four spaces, the treble clef ──────────────────────────────────
const LINES = [E4, G4, B4, D5, F5];
const SPACES = [F4, A4, C5, E5];
const NTH = ["first", "second", "third", "fourth", "fifth"];
const IN_STAFF = [E4, F4, G4, A4, B4, C5, D5, E5, F5];
const staffPlace2 = topic("g2-staff-place", (r): Activity => {
  const onLine = r() < 0.55;
  const i = onLine ? int(r, 0, 4) : int(r, 0, 3);
  const p = onLine ? LINES[i] : SPACES[i];
  const where = onLine ? (i === 0 ? "the bottom line" : i === 4 ? "the top line" : `the ${NTH[i]} line`) : (i === 0 ? "the bottom space" : i === 3 ? "the top space" : `the ${NTH[i]} space`);
  return { kind: "staff", mode: "place", prompt: `Put a note on ${where}. Count up from the bottom!`, clef: "treble", notes: [p], hear: true, skill: "u:staff:lines-spaces" };
});
const lineOrSpace = topic("g2-line-space", (r) => {
  const onLine = r() < 0.5;
  const p = pick(r, onLine ? LINES : SPACES);
  return seeChoice({ prompt: "Is this note on a line, or in a space?", visual: staffShow([{ p, d: 4, mark: true }]), options: [{ id: "line", text: "On a line" }, { id: "space", text: "In a space" }], answer: onLine ? "line" : "space", skill: "u:staff:lines-spaces", why: "A line note has the line right through its middle. A space note sits between two lines." });
});
const staffHigher = topic("g2-staff-higher", (r, d) => {
  const gap = d < 0.5 ? int(r, 3, 5) : int(r, 1, 2);
  const i = int(r, 0, IN_STAFF.length - 1 - gap);
  const lo = IN_STAFF[i];
  const hi = IN_STAFF[i + gap];
  const firstHigh = r() < 0.5;
  const notes = firstHigh ? [hi, lo] : [lo, hi];
  const ask = r() < 0.5 ? "higher" : "lower";
  const ans = (ask === "higher") === firstHigh ? "first" : "second";
  return listen({ prompt: `Which note sounds ${ask}? Look where it sits on the staff.`, sound: tuneOf(notes, 1.5, "piano", 80), show: staffShow(notes.map((p) => ({ p, d: 2 }))), options: [opt("first", "The first note"), opt("second", "The second note")], answer: ans, skill: "u:staff:high-low", why: "Higher on the staff means a higher sound. Lower on the staff means a lower sound." });
});
const staffShape = topic("g2-staff-shape", (r, d) => {
  const n = d < 0.5 ? 3 : 4;
  const s = int(r, 0, IN_STAFF.length - n);
  const up = IN_STAFF.slice(s, s + n);
  const down = [...up].reverse();
  const same = Array.from({ length: n }, () => up[1]);
  const want = pick(r, ["up", "down", "same"]);
  const shapes: Record<string, number[]> = { up, down, same };
  return listen({ prompt: "Listen. Which staff shows the notes you heard?", sound: tuneOf(shapes[want], 1, "bells", 88), options: ["up", "down", "same"].map((k) => opt(k, undefined, { show: staffShow(shapes[k].map((p) => ({ p, d: 1 }))) })), answer: want, skill: "u:staff:contour", why: "Notes that go up the staff sound higher and higher. Notes on the same spot sound the same." });
});
const staffRead2 = topic("g2-staff-read", (r, d) => {
  const penta = d >= 0.5;
  const notes = sp(byD(r, d, penta ? PENTA_PATS : SML_PATS));
  return mel("read", notes, { pads: penta ? PENTA : SML, tonic: DO, labels: "solfege", show: "staff", skill: "u:staff:read", prompt: "Read the notes on the staff. Then play them on the bells!" });
});
const clefPlace = topic("g2-clef-place", (r): Activity => r() < 0.55
  ? { kind: "staff", mode: "place", prompt: "Put a note on G: the line the treble clef curls around!", clef: "treble", notes: [G4], hear: true, skill: "u:staff:treble-clef" }
  : { kind: "staff", mode: "place", prompt: "Put middle C on the staff. It gets its own little line below the staff!", clef: "treble", notes: [C4], hear: true, skill: "u:staff:treble-clef" });
const clefName = topic("g2-clef-name", (r) => staffName(r, { clef: "treble", pool: [C4, G4], skill: "u:staff:treble-clef" }));
const clefHigh = topic("g2-clef-high", (r) => {
  const [hi, lo] = pick(r, [["flute", "tuba"], ["violin", "cello"], ["piccolo", "bassoon"], ["bells", "doublebass"]] as [InstId, InstId][]);
  return listen({ prompt: "The treble clef is for high sounds. Which instrument reads the treble clef?", options: [{ ...instOpt(hi), sound: instTune(hi) }, { ...instOpt(lo), sound: instTune(lo) }], answer: hi, skill: "u:staff:treble-clef", why: "High instruments, like the flute and the violin, read the treble clef." });
});
const STAFF_WRITES2: { prompt: string; notes: number[] }[] = [
  { prompt: "Write mi, re, do: Hot Cross Buns! Mi is on the bottom line. Do is middle C.", notes: [E4, D4, C4] },
  { prompt: "Write so, mi, la. So is on the second line. Mi is on the bottom line.", notes: [G4, E4, A4] },
  { prompt: "Write do, re, mi going up. Do is middle C.", notes: [C4, D4, E4] },
  { prompt: "Write so, la, so, mi. So is on the second line.", notes: [G4, A4, G4, E4] },
  { prompt: "Write G on the clef's line. Then write middle C below it.", notes: [G4, C4] },
];
const staffWriteItem = (i: number): Activity => ({ kind: "staff", mode: "write", prompt: STAFF_WRITES2[i].prompt, clef: "treble", notes: STAFF_WRITES2[i].notes, hear: true, skill: "u:staff:write" });
const staffWrite2 = topic("g2-staff-write", (r) => staffWriteItem(int(r, 0, STAFF_WRITES2.length - 1)));
const staffCompose2 = topic("g2-staff-compose", (r) => compose({
  prompt: pick(r, ["Write a tune with C, D, E, G and A. End on C, the home note!", "Start on G, the treble clef's note, and end on C!"]),
  pitches: PENTA,
  slots: 8,
  labels: "letters",
  inst: "ukulele",
  rules: r() < 0.5 ? [{ rule: "end", p: C4 }, { rule: "notes", min: 6 }] : [{ rule: "start", p: G4 }, { rule: "end", p: C4 }],
  skill: "u:compose:letters",
}));

const STAFF_IDEA = idea("The staff", [
  frame("This is the staff. It has 5 lines. Count them: 1, 2, 3, 4, 5!", staffShow(LINES.map((p) => ({ p, d: 1 }))), tuneOf(LINES, 1, "bells", 84)),
  frame("Between the lines are 4 spaces.", staffShow(SPACES.map((p) => ({ p, d: 1 }))), tuneOf(SPACES, 1, "bells", 84)),
  frame("A note can sit ON a line, with the line through its middle.", staffShow([{ p: G4, d: 4, mark: true }]), note1(G4, "bells", 2, 72)),
  frame("Or IN a space, between two lines.", staffShow([{ p: A4, d: 4, mark: true }]), note1(A4, "bells", 2, 72)),
  frame("Higher on the staff means a higher sound. Listen to the notes climb!", staffShow(IN_STAFF.map((p) => ({ p, d: 0.5 }))), tuneOf(IN_STAFF, 0.5, "bells", 96)),
], "u:staff:idea");
const SOMI_STAFF_IDEA = idea("So, mi and la on the staff", [
  frame("So sits on the second line. Mi sits on the bottom line, just below.", staffShow([{ p: G4, d: 2 }, { p: E4, d: 2 }], "treble", { labels: "solfege", tonic: DO }), tuneOf([G4, E4], 2, "bells", 84)),
  frame("La sits in the space right above so.", staffShow([{ p: G4, d: 2 }, { p: A4, d: 2 }], "treble", { labels: "solfege", tonic: DO }), tuneOf([G4, A4], 2, "bells", 84)),
  frame("Read it: so, mi, la, so!", staffShow(sp("so mi la so").map((p) => ({ p, d: 1 })), "treble", { labels: "solfege", tonic: DO }), tuneOf(sp("so mi la so"), [1, 1, 1, 2], "bells", 88)),
  frame("Do and re live low: re just under the staff, and do on its own little line.", staffShow(PENTA.map((p) => ({ p, d: 1 })), "treble", { labels: "solfege", tonic: DO }), tuneOf(PENTA, [1, 1, 1, 1, 2], "bells", 88)),
], "u:staff:read-idea");
const CLEF_IDEA = idea("The treble clef", [
  frame("This curly sign is the treble clef.", sym("treble"), tuneOf([C5, E5, G5, E5, C5], [0.5, 0.5, 0.5, 0.5, 2], "flute", 100)),
  frame("It curls around the second line. That line is G! So the treble clef is also called the G clef.", staffShow([{ p: G4, d: 4, mark: true }], "treble", { labels: "letters" }), note1(G4, "bells", 2, 72)),
  frame("Middle C sits on its own little line, just below the staff.", staffShow([{ p: C4, d: 4, mark: true }], "treble", { labels: "letters" }), note1(C4, "piano", 2, 72)),
  frame("The treble clef is for high sounds: flutes, violins, bells, and your singing voice!", instShow("flute", "violin", "bells"), tuneOf(sp("so mi la so mi"), [1, 1, 1, 1, 2], "violin", 92)),
], "u:staff:treble-clef-idea");
const STAFF_WRITE_IDEA = idea("Write it down!", [
  frame("Composers write tunes on the staff, so anyone can play them, even years later!", staffShow(sp("mi re do mi re do").map((p) => ({ p, d: 1 }))), songScore("hotcross", { inst: "bells", n: 6 })),
  frame("Mi, re, do on the staff: that's Hot Cross Buns!", staffShow(sp("mi re do").map((p) => ({ p, d: 1 })), "treble", { labels: "solfege", tonic: DO }), tuneOf(sp("mi re do"), [1, 1, 2], "bells", 92)),
  frame("Meet the ukulele from Hawaii! Ukulele players read music too. Strum, strum!", instShow("ukulele"), transpose(progression(["I", "IV", "V", "I"], DO, "major", { bpm: 100, per: 2, inst: "ukulele", style: "strum" }), 12)),
], "u:staff:write-idea");

const STAFF_TOPICS = [lineOrSpace, staffHigher, staffShape, staffPlace2];
const STAFF_READ_TOPICS = [staffPlace2, staffRead2, lineOrSpace, staffShape, staffHigher];
const CLEF_TOPICS = [clefPlace, clefName, clefHigh, staffRead2, staffPlace2];
const STAFF_STATION: WorldDef = {
  id: "g2-staff-station",
  title: "Staff Station",
  emoji: "🎼",
  grade: "2",
  theme: "coral",
  items: 6,
  blurb: "Five lines, four spaces: the staff! Read notes going up and down, and meet the treble clef.",
  talk: ["Can you draw a staff with 5 lines? Put a note on a line and a note in a space!", "Why do you think composers write their music down?"],
  challenge: "Find written music somewhere (a songbook, a hymnal, a piano book). Count the lines on the staff!",
  stages: [
    {
      title: "Five lines, four spaces",
      emoji: "🎼",
      levels: 1,
      topics: STAFF_TOPICS,
      intros: ["Music has its own way to write notes down!"],
      fixed: (r) => lvl(r, [STAFF_IDEA, [lineOrSpace, 0], [staffHigher, 0], [staffPlace2, 0], [staffShape, 0], [lineOrSpace, 0.5]]),
    },
    {
      title: "Read the staff",
      emoji: "👀",
      levels: 2,
      topics: STAFF_READ_TOPICS,
      intros: ["So, mi and la have homes on the staff!", "Read the staff and play the bells!"],
      fixed: teachStage(2, 6, (r) => [SOMI_STAFF_IDEA, staffRead2.gen(r, 0)], STAFF_READ_TOPICS),
    },
    {
      title: "The treble clef",
      emoji: "🌀",
      levels: 2,
      topics: CLEF_TOPICS,
      intros: ["Meet the curly treble clef!", "Find G and middle C!"],
      fixed: teachStage(2, 6, (r) => [CLEF_IDEA, clefPlace.gen(r, 0), clefName.gen(r, 0)], CLEF_TOPICS),
    },
    {
      title: "Staff writer",
      emoji: "✍️",
      levels: 1,
      topics: [staffWrite2, staffCompose2],
      unlocks: ["inst:ukulele"],
      intros: ["Write notes on the staff, like a real composer!"],
      fixed: (r) => lvl(r, [STAFF_WRITE_IDEA, staffWriteItem(0), [staffCompose2, 0], staffWriteItem(1), [staffRead2, 0.8], staffWriteItem(3)]),
    },
  ],
};

// ── Song Studio (2nd grade capstone): a pentatonic song with a beat, in A-B-A form ───────────
const SONG_A = layer(phrase("0 2 4 7 4 2 0/2", "bells", 104), beat({ kick: "x...x...", clap: "..x...x." }, { bpm: 104, per: 2, times: 2 }));
const SONG_B = layer(phrase("7/0.5 9/0.5 7/0.5 9/0.5 12 9 7/0.5 4/0.5 2 4/2", "marimba", 104), beat({ kick: "x.x.x.x.", cowbell: "x...x...", shaker: "xxxxxxxx" }, { bpm: 104, per: 2, times: 2 }));
const STUDIO_COPY: { rows: DrumId[]; steps: 4 | 8; target: string[] }[] = [
  { rows: ["kick", "clap"], steps: 4, target: ["x.x.", ".x.x"] },
  { rows: ["kick", "clap"], steps: 4, target: ["xx.x", "..x."] },
  { rows: ["kick", "clap", "cowbell"], steps: 4, target: ["x.x.", ".x.x", "x..."] },
  { rows: ["kick", "clap", "shaker"], steps: 8, target: ["x...x...", "..x...x.", "x.x.x.x."] },
  { rows: ["kick", "clap", "cowbell"], steps: 8, target: ["x..x..x.", "....x...", "x...x..."] },
];
const studioCopy = topic("g2-studio-copy", (r, d): Activity => {
  const t = byD(r, d, STUDIO_COPY);
  return { kind: "beatlab", mode: "copy", prompt: "Listen to the beat. Can you build the same one?", rows: t.rows, steps: t.steps, bpm: 96, target: t.target, skill: "u:beatmaking:copy" };
});
const STUDIO_BEATS: (() => Activity)[] = [
  () => ({ kind: "beatlab", mode: "make", prompt: "Make the beat for your A part. Kick on beat 1, and a clap somewhere!", rows: ["kick", "clap", "shaker"], steps: 8, bpm: 104, rules: [{ rule: "on", row: "kick", steps: [0] }, { rule: "count", row: "clap", min: 1 }], skill: "u:beatmaking:create" }),
  () => ({ kind: "beatlab", mode: "make", prompt: "Make a busy B beat! Use the cowbell, and at least 8 hits in all.", rows: ["kick", "clap", "cowbell", "shaker"], steps: 8, bpm: 104, rules: [{ rule: "count", row: "cowbell", min: 1 }, { rule: "total", min: 8 }], skill: "u:beatmaking:create" }),
  () => ({ kind: "beatlab", mode: "make", prompt: "Boom, clap! Kick on squares 1 and 5. Clap on squares 3 and 7. Add anything else you like.", rows: ["kick", "clap", "shaker"], steps: 8, bpm: 100, rules: [{ rule: "on", row: "kick", steps: [0, 4] }, { rule: "on", row: "clap", steps: [2, 6] }], skill: "u:beatmaking:create" }),
];
const studioBeat = topic("g2-studio-beat", (r) => pick(r, STUDIO_BEATS)());
const showBeat = (): Activity => ({ kind: "beatlab", mode: "make", prompt: "Your new open hi-hat goes TSSS! Make a show beat: kick on beat 1, and use the open hi-hat.", rows: ["kick", "clap", "hat", "openhat"], steps: 8, bpm: 104, rules: [{ rule: "on", row: "kick", steps: [0] }, { rule: "count", row: "openhat", min: 1 }, { rule: "rows", min: 3 }], skill: "u:beatmaking:create" });
const songAba = topic("g2-song-aba", (r) => {
  const A = pick(r, [sp("do re mi do"), sp("so mi re do"), sp("mi so mi do"), sp("do mi re do")]);
  return compose({ prompt: "Your song's A part is ready at both ends. Write the B part in the middle. Use la to make it different!", pitches: PENTA, slots: 12, inst: pick(r, ["marimba", "kalimba", "ukulele"] as InstId[]), start: [...A, null, null, null, null, ...A], rules: [{ rule: "notes", min: 12 }, { rule: "use", pitches: [A4] }], backing: band(12, 104, { drums: { kick: "x...x...", clap: "..x...x.", openhat: "......x." }, bass: [48, 55] }), skill: "u:compose:song" });
});
const songFull = (): Activity => compose({ prompt: "Write a whole A-B-A song! Make your first 4 notes come back at the end, and finish on do.", pitches: PENTA, slots: 12, inst: "marimba", rules: [{ rule: "repeat", len: 4 }, { rule: "end", p: C4 }, { rule: "notes", min: 10 }], backing: band(12, 104, { drums: { kick: "x...x...", clap: "..x...x.", openhat: "......x." }, bass: [48, 55] }), skill: "u:compose:song" });
const studioForm = (): Activity => ({ kind: "form", mode: "label", prompt: "Listen to this little song. What is its form?", sections: { A: SONG_A, B: SONG_B }, order: ["A", "B", "A"], options: ["ABA", "AB", "AAB"], answer: "ABA", skill: "u:form:label" });

const SONG_PLAN_IDEA = idea("Plan a song", [
  frame("A whole song needs three things. First, a beat!", gridShow(["kick", "clap"], ["x...x...", "..x...x."]), beat({ kick: "x...x...", clap: "..x...x." }, { bpm: 104, per: 2, times: 2 })),
  frame("Second, a tune. Ours uses the five pentatonic notes.", ladderShow(DO, [0, 2, 4, 7, 9]), phrase("0 2 4 7 4 2 0/2", "bells", 104)),
  frame("Third, a plan: A, then B, then A again!", formShow(["A", "B", "A"]), then(then(SONG_A, SONG_B, 0), SONG_A, 0)),
  frame("Let's build a song together, one part at a time!", formShow(["A", "B", "A"]), SONG_A),
], "u:compose:song-idea");
const SHOWTIME_IDEA = idea("Showtime!", [
  frame("Here's your new sound: the open hi-hat. Tsss!", gridShow(["kick", "openhat"], ["x...x...", "..x...x."]), beat({ kick: "x...x...", openhat: "..x...x." }, { bpm: 104, per: 2, times: 2 })),
  frame("Put it all together: a beat, a pentatonic tune, and A-B-A!", formShow(["A", "B", "A"]), then(then(SONG_A, SONG_B, 0), SONG_A, 0)),
  frame("When you finish, your song goes to your Studio. Play it for your family!", picsShow("🎤"), SONG_B),
], "u:compose:showtime-idea");

const SONG_PARTS = [studioBeat, pentaCompose, studioCopy, formBuild2, pentaEcho];
const SONG_STUDIO: WorldDef = {
  id: "g2-song-studio",
  title: "Song Studio",
  emoji: "🎤",
  grade: "2",
  theme: "night",
  items: 6,
  blurb: "Your first whole song: a beat, a pentatonic tune, and an A-B-A plan. Then play it for everyone!",
  talk: ["What should your song be about? Give it a name!", "Which part of your song do you like best: the beat, the tune, or the B part?"],
  challenge: "Play your Song Studio song for your family. Can they clap along to the beat?",
  stages: [
    {
      title: "Plan a song",
      emoji: "📋",
      levels: 1,
      topics: [studioCopy, formBuild2, pentaEcho],
      intros: ["Every great song starts with a plan!"],
      fixed: (r) => lvl(r, [SONG_PLAN_IDEA, studioForm(), [studioCopy, 0], [pentaEcho, 0.3], [studioCopy, 0.4], [formBuild2, 0.5]]),
    },
    { title: "Make the parts", emoji: "🧩", levels: 2, topics: SONG_PARTS, intros: ["Make a beat and a tune for your song!", "More beats, more tunes!"] },
    {
      title: "Showtime!",
      emoji: "🎤",
      levels: 1,
      topics: [songAba, studioBeat],
      unlocks: ["drum:openhat"],
      intros: ["Put your whole song together. Showtime!"],
      fixed: (r) => lvl(r, [SHOWTIME_IDEA, showBeat(), pentaSong(PENTA_SONGS[0], "kalimba"), [songAba, 0], STUDIO_BEATS[1](), songFull()]),
    },
  ],
};

// ═════ 3rd grade ═════════════════════════════════════════════════════════════════════════════
// Instrument helpers (used by the orchestra, the composers, and 2nd grade's treble-clef lesson).
/** A comfortable home note for each instrument (its tune sits there, so high sounds high). */
const HOME: Partial<Record<InstId, number>> = {
  violin: 74, viola: 62, cello: 50, doublebass: 38, harp: 60, flute: 79, piccolo: 86, clarinet: 62, oboe: 69, bassoon: 46,
  trumpet: 67, horn: 55, trombone: 48, tuba: 36, timpani: 45, xylophone: 79, glock: 84, marimba: 60, bells: 76, piano: 60,
};
/** A little tune on an instrument, in its own range. */
function instTune(id: InstId, bpm = 100): Score {
  const info = INSTRUMENTS[id];
  if (id === "timpani") return melody([45, 52, 45, 45, 52, 45], [1, 1, 0.5, 0.5, 1, 1], "timpani", bpm);
  const base = Math.max(info.lo, Math.min(info.hi - 8, HOME[id] ?? 60));
  const ps = scale(base, "major", 1).slice(0, 5);
  return melody([...ps, ps[2], ps[0]], [0.5, 0.5, 0.5, 0.5, 1, 0.5, 1.5], id, bpm);
}

/** The heroic film cue in D (so its timpani stays inside the timpani's range). */
const heroic = (bpm?: number): Score => piece("heroic", { tonic: D4, ...(bpm ? { bpm } : {}) });
/** A short trumpet fanfare over a snare roll and a crash. */
const fanfare = (): Score => layer(phrase("0/0.333 0/0.333 0/0.334 7 r/0.5 4/0.25 7/0.25 12/2 r 7/0.333 7/0.333 7/0.334 12 r/0.5 16/0.25 19/0.25 24/2", "trumpet", 112), beat({ snare: "xxxx............xxxx............", crash: "......x...............x........." }, { bpm: 112, per: 4, times: 1 }));
/** Each instrument plays a little rising figure in turn (a family parade, high to low). */
function parade(ids: InstId[], bpm = 112): Score {
  return ids
    .map((id) => {
      const b = Math.max(INSTRUMENTS[id].lo, Math.min(INSTRUMENTS[id].hi - 8, HOME[id] ?? 60));
      return melody([b, b + 4, b + 7], [0.5, 0.5, 1], id, bpm);
    })
    .reduce((acc, s) => then(acc, s, 0.5));
}
/** The same phrase with one note moved (a near miss for sharp ears), kept in the instrument's range. */
function tweak(s: Score, r: Rng): Score {
  const t = s.tracks[0];
  if (t.kind !== "notes") return s;
  const info = INSTRUMENTS[t.inst];
  const idx = t.notes.map((x, i) => (typeof x.p === "number" && i > 0 ? i : -1)).filter((i) => i >= 0);
  const i = pick(r, idx);
  const notes = t.notes.map((x, j) => {
    if (j !== i || typeof x.p !== "number") return x;
    const up = x.p + pick(r, [2, 3]);
    const down = x.p - pick(r, [2, 3]);
    return { ...x, p: (r() < 0.5 && down >= info.lo) || up > info.hi ? down : up };
  });
  return { ...s, tracks: [{ ...t, notes }, ...s.tracks.slice(1)] };
}

// ── Treble Clef Trail: line notes, space notes, letter names ─────────────────────────────────
const T_ALL = [C4, D4, ...IN_STAFF, G5];
const C_KEYS = scale(C4, "major"); // C4 … C5, the white keys
function placeText(p: number): string {
  if (p === C4) return "Put middle C on the staff. It gets its own little ledger line below the staff.";
  if (p === D4) return "Put D on the staff. It hangs just below the bottom line.";
  if (p === G5) return "Put G on the staff. It sits just above the top line.";
  return LINES.includes(p) ? `Put ${spelledName(p)} on the staff. It's a line note!` : `Put ${spelledName(p)} on the staff. It's a space note!`;
}
const place = (p: number, skill: string): Activity => ({ kind: "staff", mode: "place", prompt: placeText(p), clef: "treble", notes: [p], hear: true, skill });
const lineName = topic("g3-line-name", (r) => staffName(r, { clef: "treble", pool: LINES, skill: "u:staff:treble-lines" }));
const linePlace = topic("g3-line-place", (r) => place(pick(r, LINES), "u:staff:treble-lines"));
const spaceName = topic("g3-space-name", (r) => staffName(r, { clef: "treble", pool: SPACES, skill: "u:staff:treble-spaces" }));
const spacePlace = topic("g3-space-place", (r) => place(pick(r, SPACES), "u:staff:treble-spaces"));
const trailName = topic("g3-trail-name", (r, d) => staffName(r, { clef: "treble", pool: d < 0.5 ? IN_STAFF : T_ALL, skill: "u:staff:treble-notes" }));
const trailPlace = topic("g3-trail-place", (r, d) => place(pick(r, d < 0.5 ? IN_STAFF : T_ALL), "u:staff:treble-notes"));
const trailMnemonic = topic("g3-mnemonic", (r) => pick(r, [
  (): Activity => seeChoice({ prompt: "The treble lines, bottom to top: Every Good Boy Does ____", visual: staffShow(LINES.map((p) => ({ p, d: 1 })), "treble", { labels: "letters" }), options: textOpts(r, "Fine", ["Fast", "Fun"]), answer: "Fine", skill: "u:staff:treble-lines" }),
  (): Activity => seeChoice({ prompt: "The four spaces, bottom to top, spell a word. Which word?", visual: staffShow(SPACES.map((p) => ({ p, d: 1 }))), options: textOpts(r, "FACE", ["CAFE", "FADE"]), answer: "FACE", skill: "u:staff:treble-spaces" }),
  (): Activity => seeChoice({ prompt: "What is the name of the bottom line of the treble staff?", visual: staffShow([{ p: E4, d: 2, mark: true }]), options: textOpts(r, "E", ["F", "C", "G"]), answer: "E", skill: "u:staff:treble-lines" }),
  (): Activity => seeChoice({ prompt: "The treble clef curls around one line. Which note lives there?", visual: sym("treble"), options: textOpts(r, "G", ["C", "E", "B"]), answer: "G", skill: "u:staff:treble-lines", why: "The treble clef is also called the G clef. Its curl wraps around the G line." }),
])());
const trailLS = topic("g3-line-or-space", (r) => {
  const L = pick(r, ["G", "B", "D", "A", "C"]);
  return seeChoice({ prompt: `Inside the staff, is ${L} a line note or a space note?`, options: [{ id: "line", text: "A line note" }, { id: "space", text: "A space note" }], answer: "GBD".includes(L) ? "line" : "space", skill: "u:staff:treble-notes", why: "Lines: E, G, B, D, F (Every Good Boy Does Fine). Spaces: F, A, C, E." });
});
const SPELL_WORDS: { w: string; notes: number[]; hint: string }[] = [
  { w: "CAB", notes: [C5, A4, B4], hint: "Every note is inside the staff." },
  { w: "BAG", notes: [B4, A4, G4], hint: "Every note is inside the staff." },
  { w: "BAD", notes: [B4, A4, D5], hint: "Every note is inside the staff." },
  { w: "DAB", notes: [D5, A4, B4], hint: "Every note is inside the staff." },
  { w: "DAD", notes: [D5, A4, D5], hint: "Every note is inside the staff." },
  { w: "FACE", notes: [F4, A4, C5, E5], hint: "It's all in the spaces!" },
  { w: "EGG", notes: [E4, G4, G4], hint: "E is on the bottom line." },
  { w: "CAGE", notes: [C5, A4, G4, E4], hint: "E is on the bottom line." },
  { w: "BEAD", notes: [B4, E5, A4, D5], hint: "E is in the top space." },
  { w: "FADED", notes: [F5, A4, D5, E5, D5], hint: "F is on the top line. E is in the top space." },
  { w: "BADGE", notes: [B4, A4, D5, G4, E4], hint: "E is on the bottom line." },
  { w: "CABBAGE", notes: [C5, A4, B4, B4, A4, G4, E5], hint: "E is in the top space." },
];
const trailSpell = topic("g3-spell", (r, d): Activity => {
  const w = byD(r, d, SPELL_WORDS);
  return { kind: "staff", mode: "write", prompt: `Spell ${w.w} with notes on the staff! ${w.hint}`, clef: "treble", notes: w.notes, hear: true, skill: "u:staff:write" };
});
const SONG_BITS: number[][] = [
  [E4, E4, F4, G4, G4, F4, E4, D4], // Ode to Joy
  [E4, D4, C4, D4, E4, E4, E4], // Mary Had a Little Lamb
  [C4, C4, G4, G4, A4, A4, G4], // Twinkle
  [C4, D4, E4, C4, C4, D4, E4, C4], // Frère Jacques
  [G4, E4, E4, F4, D4, D4], // Lightly Row
  [G4, A4, G4, F4, E4, F4, G4], // London Bridge
  [C4, E4, F4, G4, C4, E4, F4, G4], // When the Saints
];
const trailRead = topic("g3-trail-read", (r, d) => {
  const known = r() < 0.5;
  const notes = known ? pick(r, SONG_BITS) : walk(r, C_KEYS, d < 0.5 ? 4 : 6);
  return mel("read", notes, { pads: C_KEYS, on: "keys", inst: "piano", labels: d < 0.5 ? "letters" : "none", show: "staff", skill: "u:melody:read-staff", prompt: known ? "Read the notes on the staff and play them. Do you know this song?" : "Read the notes on the staff, then play them on the piano!" });
});
const LETTER_SONGS: { prompt: string; rules: ComposeRule[] }[] = [
  { prompt: "Write a tune that starts on E and ends on C.", rules: [{ rule: "start", p: E4 }, { rule: "end", p: C4 }, { rule: "notes", min: 6 }] },
  { prompt: "Hide the word BAG in your tune: use B, A and G. End on G.", rules: [{ rule: "use", pitches: [B4, A4, G4] }, { rule: "end", p: G4 }] },
  { prompt: "Write a tune that climbs from middle C all the way up to high C.", rules: [{ rule: "start", p: C4 }, { rule: "end", p: C5 }] },
  { prompt: "Write a smooth tune that moves only by steps (C to D, D to E…). End on C.", rules: [{ rule: "steps" }, { rule: "end", p: C4 }, { rule: "notes", min: 7 }] },
  { prompt: "Write a tune with a big leap: jump over 3 or more notes at once! End on C.", rules: [{ rule: "leap", min: 4 }, { rule: "end", p: C4 }] },
  { prompt: "Use the FACE letters (F, A, C and E) somewhere in your tune!", rules: [{ rule: "use", pitches: [F4, A4, C5, E4] }] },
];
const lineRead = topic("g3-line-read", (r, d) => mel("read", walk(r, LINES, d < 0.5 ? 3 : 5, 1), { pads: IN_STAFF, on: "keys", inst: "piano", labels: d < 0.5 ? "letters" : "none", show: "staff", skill: "u:staff:read-lines", prompt: "Read the line notes on the staff, then play them on the piano!" }));
const spaceRead = topic("g3-space-read", (r, d) => mel("read", walk(r, SPACES, d < 0.5 ? 3 : 5, 1), { pads: IN_STAFF, on: "keys", inst: "piano", labels: d < 0.5 ? "letters" : "none", show: "staff", skill: "u:staff:read-spaces", prompt: "Read the space notes on the staff, then play them on the piano!" }));
const letterSong = (s: (typeof LETTER_SONGS)[number], inst: InstId = "piano"): Activity => compose({ prompt: s.prompt, pitches: C_KEYS, slots: 8, inst, labels: "letters", rules: s.rules, skill: "u:compose:letters" });
const letterCompose = topic("g3-letter-compose", (r) => letterSong(pick(r, LETTER_SONGS), pick(r, ["piano", "bells", "harp"] as InstId[])));

const LINES_IDEA = idea("Every Good Boy Does Fine", [
  frame("The 5 lines of the treble staff have letter names. From the bottom up: E, G, B, D, F.", staffShow(LINES.map((p) => ({ p, d: 1 })), "treble", { labels: "letters" }), tuneOf(LINES, 1, "piano", 84)),
  frame("Remember them with a sentence: Every Good Boy Does Fine!", staffShow(LINES.map((p) => ({ p, d: 1 })), "treble", { labels: "letters" }), tuneOf(LINES, [1, 1, 1, 1, 2], "bells", 92)),
  frame("Or make up your own sentence: Elephants Get Big Dirty Feet!", staffShow(LINES.map((p) => ({ p, d: 1 })), "treble", { labels: "letters" }), tuneOf([...LINES].reverse(), [1, 1, 1, 1, 2], "bells", 92)),
  frame("So a note on the bottom line is E, and a note on the top line is F.", staffShow([{ p: E4, d: 2, mark: true }, { p: F5, d: 2, mark: true }], "treble", { labels: "letters" }), tuneOf([E4, F5], 2, "piano", 72)),
  frame("Try it: play the line notes, bottom to top. E, G, B, D, F.", staffShow(LINES.map((p) => ({ p, d: 1 })), "treble", { labels: "letters" }), undefined, "bells", LINES),
], "u:staff:treble-lines-idea");
const SPACES_IDEA = idea("F-A-C-E", [
  frame("The 4 spaces spell a word, from the bottom up: F, A, C, E. FACE!", staffShow(SPACES.map((p) => ({ p, d: 1 })), "treble", { labels: "letters" }), tuneOf(SPACES, [1, 1, 1, 2], "bells", 84)),
  frame("Put lines and spaces together and the letters go in ABC order up the staff: E F G A B C D E F.", staffShow(IN_STAFF.map((p) => ({ p, d: 0.5 })), "treble", { labels: "letters" }), tuneOf(IN_STAFF, 0.5, "bells", 96)),
  frame("The music alphabet only uses 7 letters, A to G. After G, it starts again at A!", staffShow([F4, G4, A4, B4].map((p) => ({ p, d: 1 })), "treble", { labels: "letters" }), tuneOf([F4, G4, A4, B4], [1, 1, 1, 2], "piano", 88)),
  frame("Try it: play the space notes. F, A, C, E!", staffShow(SPACES.map((p) => ({ p, d: 1 })), "treble", { labels: "letters" }), undefined, "bells", SPACES),
], "u:staff:treble-spaces-idea");
const BEYOND_IDEA = idea("Off the edge of the staff", [
  frame("Notes can hang just below the staff. That one is D.", staffShow([{ p: D4, d: 2, mark: true }], "treble", { labels: "letters" }), note1(D4, "piano", 2, 72)),
  frame("Middle C gets its own short line, called a ledger line.", staffShow([{ p: C4, d: 2, mark: true }], "treble", { labels: "letters" }), note1(C4, "piano", 2, 72)),
  frame("And a note can sit just above the top line. That's G.", staffShow([{ p: G5, d: 2, mark: true }], "treble", { labels: "letters" }), note1(G5, "piano", 2, 72)),
  frame("Notes can even spell words! B, A, G spells BAG.", staffShow([B4, A4, G4].map((p) => ({ p, d: 1 })), "treble", { labels: "letters" }), tuneOf([B4, A4, G4], [1, 1, 2], "piano", 88)),
], "u:staff:treble-notes-idea");
const NOTE_WRITE_IDEA = idea("Note-name composer", [
  frame("Meet the glockenspiel! Its bright metal bars ring out high notes.", instShow("glock"), tuneOf([C5, E5, G5, C5 + 12, G5, E5, C5], [0.5, 0.5, 0.5, 1, 0.5, 0.5, 2], "glock", 100)),
  frame("Composers think in letter names. C, E, G, high C!", staffShow([C4, E4, G4, C5].map((p) => ({ p, d: 1 })), "treble", { labels: "letters" }), tuneOf([C4, E4, G4, C5], [1, 1, 1, 2], "piano", 92)),
  frame("Pick letters to write a tune. You can even hide a word in it, like C-A-B!", staffShow([C5, A4, B4].map((p) => ({ p, d: 1 })), "treble", { labels: "letters" }), tuneOf([C5, A4, B4], [1, 1, 2], "bells", 88)),
], "u:compose:letters-idea");

const LINE_TOPICS = [lineName, linePlace, lineRead, trailMnemonic];
const SPACE_TOPICS = [spaceName, spacePlace, spaceRead, trailLS, lineName, trailMnemonic];
const TRAIL_TOPICS = [trailName, trailSpell, trailPlace, trailRead, trailLS];
const TREBLE_TRAIL: WorldDef = {
  id: "g3-treble-trail",
  title: "Treble Clef Trail",
  emoji: "🗺️",
  grade: "3",
  theme: "jungle",
  items: 7,
  blurb: "Every note on the treble staff has a letter name. Learn the lines and spaces, spell words with notes, and read real songs.",
  talk: ["What's your own sentence for the lines E, G, B, D, F?", "Which words can you spell with only the letters A to G? (CAB, BAG, FACE, CABBAGE…)"],
  challenge: "Write a secret word on a staff with notes (only letters A–G!). Can someone at home decode it?",
  stages: [
    {
      title: "Every Good Boy Does Fine",
      emoji: "📏",
      levels: 1,
      topics: LINE_TOPICS,
      fixed: (r) => lvl(r, [LINES_IDEA, [trailMnemonic, 0], [lineName, 0], [linePlace, 0], [lineRead, 0], [lineName, 0.5], [linePlace, 0.7]]),
    },
    { title: "F-A-C-E", emoji: "😊", levels: 2, topics: SPACE_TOPICS, fixed: teachStage(2, 7, (r) => [SPACES_IDEA, spaceName.gen(r, 0), spacePlace.gen(r, 0)], SPACE_TOPICS) },
    { title: "Read the trail", emoji: "🗺️", levels: 2, topics: TRAIL_TOPICS, fixed: teachStage(2, 7, (r) => [BEYOND_IDEA, trailSpell.gen(r, 0)], TRAIL_TOPICS) },
    {
      title: "Note-name composer",
      emoji: "✍️",
      levels: 1,
      topics: [letterCompose, trailSpell],
      unlocks: ["inst:glock"],
      fixed: (r) => lvl(r, [NOTE_WRITE_IDEA, letterSong(LETTER_SONGS[0]), [trailSpell, 0.5], letterSong(LETTER_SONGS[1], "bells"), [trailRead, 0.7], letterSong(LETTER_SONGS[5], "harp"), [trailSpell, 1]]),
    },
  ],
};

// ── Sixteenth Note Surf: ti-ka-ti-ka, ti-ti-ka, ti-ka-ti, and 16-step beats ──────────────────
const SX1 = ["ta", "titi", "tika"];
const SX2 = ["ta", "titi", "tika", "titika", "tikati"];
const SX_NAME: Record<string, string> = { titika: "ti-ti-ka", tikati: "ti-ka-ti", tika: "ti-ka-ti-ka", titi: "ti-ti" };
const withClicks = (cells: string[], bpm: number, drum: DrumId = "snare") => layer(rhythm(cells, { bpm, drum }), clicks(Math.round(cells.reduce((s, c) => s + cellBeats(c), 0)), bpm));

const tikaEcho = topic("g3-tika-echo", (r, d) => echo(r, { pool: d < 0.5 ? SX1 : [...SX1, "z"], must: "tika", bars: d < 0.8 ? 1 : 2, bpm: 66, show: d < 0.25 ? "notes" : "none", skill: "u:rhythm:ti-ka-ti-ka", prompt: "Listen, then tap it back! Ti-ka-ti-ka is four quick, even taps in one beat." }));
const tikaRead = topic("g3-tika-read", (r, d) => readRhythm(r, { pool: d < 0.5 ? SX1 : [...SX1, "z", "taa"], must: "tika", bars: d < 0.7 ? 1 : 2, bpm: 63, show: "notes", skill: "u:rhythm:read-sixteenths", prompt: "Read it, then play it! Keep the four sixteenths even." }));
const tikaMatch = topic("g3-tika-match", (r, d) => rhythmMatch(r, { pool: d < 0.5 ? SX1 : SX2, must: "tika", style: "notes", bpm: 72, skill: "u:rhythm:ti-ka-ti-ka" }));
const beatSplit = topic("g3-beat-split", (r) => {
  const cell = pick(r, ["ta", "titi", "tika"]);
  return listen({
    prompt: "Count the drum notes inside each click. How many notes fit in one beat?",
    sound: withClicks([cell, cell, cell, cell], 72),
    options: ([["1", "quarter"], ["2", "eighths"], ["4", "sixteenths"]] as [string, MSymbol][]).map(([k, s]) => opt(k, k === "1" ? "1 note" : `${k} notes`, { show: sym(s) })),
    answer: String(RHYTHM[cell].durs.length),
    skill: "u:rhythm:subdivide",
    why: "Ta is 1 note in a beat, ti-ti is 2, and ti-ka-ti-ka is 4!",
  });
});
const gallopEcho = topic("g3-gallop-echo", (r, d) => echo(r, { pool: SX2, must: pick(r, ["titika", "tikati"]), bars: d < 0.7 ? 1 : 2, bpm: 66, skill: "u:rhythm:ti-ti-ka", prompt: "Listen, then tap it back! Listen for ti-ti-ka and ti-ka-ti." }));
const gallopRead = topic("g3-gallop-read", (r, d) => readRhythm(r, { pool: d < 0.6 ? SX2 : [...SX2, "z"], must: pick(r, ["titika", "tikati"]), bars: d < 0.7 ? 1 : 2, bpm: 63, show: "notes", skill: "u:rhythm:read-sixteenths", prompt: "Read it, then play it! Ti-ti-ka gallops. Ti-ka-ti trips." }));
const gallopMatch = topic("g3-gallop-match", (r) => rhythmMatch(r, { pool: SX2, must: pick(r, ["titika", "tikati"]), style: "notes", bpm: 72, skill: "u:rhythm:ti-ti-ka" }));
const cellEar = topic("g3-cell-ear", (r) => {
  const cells = ["titika", "tikati", "tika", "titi"];
  const ans = pick(r, cells);
  return listen({
    prompt: "Which rhythm keeps repeating?",
    sound: withClicks([ans, ans, ans, ans], 72, "conga"),
    options: shuffle(r, [ans, ...pickN(r, cells, 2, (c) => c === ans)]).map((c) => opt(c, SX_NAME[c], { show: rhythmShow([c], "notes", false) })),
    answer: ans,
    skill: "u:rhythm:ti-ti-ka",
    why: "Ti-ti-ka: long, short, short. Ti-ka-ti: short, short, long. Ti-ka-ti-ka: four even notes.",
  });
});
const SURF8: { rows: DrumId[]; target: string[] }[] = [
  { rows: ["kick", "snare", "hat"], target: ["x...x...", "..x...x.", "x.x.x.x."] },
  { rows: ["kick", "snare", "hat"], target: ["x...x...", "..x...x.", "xxxxxxxx"] },
  { rows: ["kick", "snare", "hat"], target: ["x..x....", "..x...x.", "x.x.x.x."] },
  { rows: ["kick", "snare", "hat"], target: ["x...x.x.", "..x...x.", "xxxxxxxx"] },
  { rows: ["kick", "clap", "hat"], target: ["x..x..x.", "....x...", "xxxxxxxx"] },
  { rows: ["kick", "snare", "openhat"], target: ["x..x.x..", "..x...x.", ".x.x.x.x"] },
];
const surfCopy = topic("g3-surf-copy", (r, d): Activity => {
  const t = byD(r, d, SURF8);
  return { kind: "beatlab", mode: "copy", prompt: "Listen to the beat, then build the same one!", rows: t.rows, steps: 8, bpm: 92, target: t.target, skill: "u:beatmaking:copy" };
});
const SURF16: (() => Activity)[] = [
  () => ({ kind: "beatlab", mode: "make", prompt: "Sixteenth notes on the hi-hat: fill all 16 hi-hat squares! Then put the kick on square 1.", rows: ["kick", "snare", "hat"], steps: 16, bpm: 80, rules: [{ rule: "count", row: "hat", min: 16 }, { rule: "on", row: "kick", steps: [0] }], skill: "u:beatmaking:sixteenths" }),
  () => ({ kind: "beatlab", mode: "make", prompt: "Kick on beats 1 and 3 (squares 1 and 9). Snare on beats 2 and 4 (squares 5 and 13). Then add at least 12 hi-hats!", rows: ["kick", "snare", "hat"], steps: 16, bpm: 84, rules: [{ rule: "on", row: "kick", steps: [0, 8] }, { rule: "on", row: "snare", steps: [4, 12] }, { rule: "count", row: "hat", min: 12 }], skill: "u:beatmaking:sixteenths" }),
  () => ({ kind: "beatlab", mode: "fix", prompt: "The hi-hat should play every sixteenth note. Fill in the gaps to fix the beat!", rows: ["kick", "snare", "hat"], steps: 16, bpm: 84, target: ["x.......x.......", "....x.......x...", "xxxxxxxxxxxxxxxx"], start: ["x.......x.......", "....x.......x...", "x.x.x.x.x.x.x.x."], skill: "u:beatmaking:sixteenths" }),
  () => ({ kind: "beatlab", mode: "fix", prompt: "Something's off! Listen closely, then fix the kick so the beat matches.", rows: ["kick", "snare", "hat"], steps: 16, bpm: 84, target: ["x.....x.x.......", "....x.......x...", "x.x.x.x.x.x.x.x."], start: ["x.......x.......", "....x.......x...", "x.x.x.x.x.x.x.x."], skill: "u:beatmaking:fix" }),
];
const surf16 = topic("g3-surf-16", (r, d) => byD(r, d, SURF16)());
const sxFill = topic("g3-sx-fill", (r, d): Activity => ({ kind: "measure", mode: "fill", prompt: "Fill each bar with 4 beats. Use the sixteenth-note cards!", meter: [4, 4], bars: 2, cards: d < 0.5 ? SX1 : [...SX2, "taa"], given: [[d < 0.5 ? "tika" : pick(r, ["tika", "titika", "tikati"])], null], skill: "u:rhythm:sixteenth-bars" }));
const sxDictation = topic("g3-sx-dictation", (r, d): Activity => {
  const pool = d < 0.5 ? SX1 : SX2;
  const bars = d < 0.7 ? 1 : 2;
  const target = Array.from({ length: bars }, (_, i) => randomCells(r, pool, [4, 4], 1, i === 0 ? "tika" : undefined));
  return { kind: "measure", mode: "dictation", prompt: "Listen. Then build the rhythm you heard with the cards.", meter: [4, 4], bars, cards: pool, target, bpm: 66, skill: "u:rhythm:dictation" };
});
const SX_CREATE: (() => Activity)[] = [
  () => ({ kind: "measure", mode: "create", prompt: "Write 2 bars of your own. Use ti-ka-ti-ka AND ti-ti-ka!", meter: [4, 4], bars: 2, cards: [...SX2, "z", "taa"], must: ["tika", "titika"], bpm: 72, skill: "u:rhythm:create-sixteenths" }),
  () => ({ kind: "measure", mode: "create", prompt: "Write 2 bars with a ti-ka-ti and a long ta-a to rest on.", meter: [4, 4], bars: 2, cards: [...SX2, "z", "taa"], must: ["tikati", "taa"], bpm: 72, skill: "u:rhythm:create-sixteenths" }),
  () => ({ kind: "measure", mode: "create", prompt: "Write 2 bars using ti-ti-ka, ti-ka-ti and a rest.", meter: [4, 4], bars: 2, cards: [...SX2, "z", "taa"], must: ["titika", "tikati", "z"], bpm: 72, skill: "u:rhythm:create-sixteenths" }),
];
const sxCreate = topic("g3-sx-create", (r) => pick(r, SX_CREATE)());
const SX_BEATS: (() => Activity)[] = [
  () => ({ kind: "beatlab", mode: "make", prompt: "Start with a CRASH on square 1 (only one!). Kick on 1 and 9, snare on 5 and 13, and at least 8 hi-hats.", rows: ["kick", "snare", "hat", "crash"], steps: 16, bpm: 88, rules: [{ rule: "on", row: "crash", steps: [0] }, { rule: "count", row: "crash", min: 1, max: 1 }, { rule: "on", row: "kick", steps: [0, 8] }, { rule: "on", row: "snare", steps: [4, 12] }, { rule: "count", row: "hat", min: 8 }], skill: "u:beatmaking:create" }),
  () => ({ kind: "beatlab", mode: "make", prompt: "Make your own surf beat! Use all 4 rows, at least 8 hi-hat sixteenths, and no more than 2 crashes.", rows: ["kick", "snare", "hat", "crash"], steps: 16, bpm: 88, rules: [{ rule: "rows", min: 4 }, { rule: "count", row: "hat", min: 8 }, { rule: "count", row: "crash", min: 1, max: 2 }], skill: "u:beatmaking:create" }),
];
const sxBeat = topic("g3-sx-beat", (r) => pick(r, SX_BEATS)());

const TIKA_IDEA = idea("Ti-ka-ti-ka", [
  frame("Ta is one beat. Ti-ti splits the beat into two.", rhythmShow(["ta", "ta", "titi", "titi"], "notes", true), withClicks(["ta", "ta", "titi", "titi"], 72)),
  frame("Ti-ka-ti-ka splits it into FOUR! These are sixteenth notes.", rhythmShow(["tika", "tika", "ta", "ta"], "notes", true), withClicks(["tika", "tika", "ta", "ta"], 72)),
  frame("Four sixteenths fit in the time of one ta. Like rain drumming on a roof!", rhythmShow(["ta", "titi", "tika", "ta"], "notes", true), withClicks(["ta", "titi", "tika", "ta"], 72, "conga")),
  frame("Try it: ti-ka-ti-ka, ta, ti-ka-ti-ka, ta. Keep the four taps even!", rhythmShow(["tika", "ta", "tika", "ta"], "sticks", true), rhythm(["tika", "ta", "tika", "ta"], { bpm: 66 }), "drum"),
], "u:rhythm:sixteenths-idea");
const GALLOP_IDEA = idea("Ti-ti-ka and ti-ka-ti", [
  frame("One eighth plus two sixteenths: ti, ti-ka. Together: ti-ti-ka! It gallops like a horse.", rhythmShow(["titika", "titika", "titika", "titika"], "notes", true), rhythm(["titika", "titika", "titika", "titika"], { bpm: 76, drum: "block" })),
  frame("Flip it around: ti-ka, ti. Together: ti-ka-ti!", rhythmShow(["tikati", "tikati", "tikati", "tikati"], "notes", true), rhythm(["tikati", "tikati", "tikati", "tikati"], { bpm: 76, drum: "block" })),
  frame("Side by side: ti-ti-ka, ti-ka-ti, ti-ka-ti-ka, ta.", rhythmShow(["titika", "tikati", "tika", "ta"], "notes", true), withClicks(["titika", "tikati", "tika", "ta"], 72, "conga")),
  frame("Your turn! Gallop on the drum: ti-ti-ka, ti-ti-ka.", rhythmShow(["titika", "titika", "tikati", "ta"], "sticks", true), rhythm(["titika", "titika", "tikati", "ta"], { bpm: 66 }), "drum"),
], "u:rhythm:gallop-idea");
const SURF_IDEA = idea("Surf beats", [
  frame("The Beat Lab can split each beat into 4 squares: sixteenth notes!", gridShow(["hat"], ["xxxxxxxxxxxxxxxx"]), beat({ hat: "xxxxxxxxxxxxxxxx" }, { bpm: 84, per: 4, times: 2 })),
  frame("Kick on beats 1 and 3, snare on 2 and 4, and a racing hi-hat. That's a beat!", gridShow(["kick", "snare", "hat"], ["x.......x.......", "....x.......x...", "xxxxxxxxxxxxxxxx"]), beat({ kick: "x.......x.......", snare: "....x.......x...", hat: "xxxxxxxxxxxxxxxx" }, { bpm: 84, per: 4, times: 2 })),
  frame("With 8 squares, each square is an eighth note, a ti.", gridShow(["kick", "snare", "hat"], ["x...x...", "..x...x.", "x.x.x.x."]), beat({ kick: "x...x...", snare: "..x...x.", hat: "x.x.x.x." }, { bpm: 92, per: 2, times: 2 })),
], "u:beatmaking:sixteenths-idea");
const SX_WRITE_IDEA = idea("Sixteenth composer", [
  frame("Here's your new crash cymbal. CRASH! Drummers use it to start a big moment.", gridShow(["crash", "kick", "snare", "hat"], ["x...............", "x.......x.......", "....x.......x...", "x.x.x.x.x.x.x.x."]), beat({ crash: "x...............", kick: "x.......x.......", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x." }, { bpm: 88, per: 4, times: 2 })),
  frame("Sixteenths make a rhythm race. Mix in long notes so it can breathe.", rhythmShow(["tika", "titika", "taa", "tikati", "ta", "taa"], "notes", true, [4, 4]), rhythm(["tika", "titika", "taa", "tikati", "ta", "taa"], { bpm: 72, drum: "snare" })),
  frame("Now write rhythms and beats of your own. They go straight to your Studio!", rhythmShow(["titika", "tika", "ta", "tikati"], "notes", true, [4, 4]), withClicks(["titika", "tika", "ta", "tikati"], 72, "conga")),
], "u:rhythm:create-sixteenths-idea");

const TIKA_TOPICS = [tikaEcho, beatSplit, tikaMatch, tikaRead];
const GALLOP_TOPICS = [gallopEcho, cellEar, gallopMatch, gallopRead, tikaEcho];
const SURF_TOPICS = [surfCopy, surf16, sxFill, sxDictation, gallopEcho];
const SIXTEENTH_SURF: WorldDef = {
  id: "g3-sixteenth-surf",
  title: "Sixteenth Note Surf",
  emoji: "🏄",
  grade: "3",
  theme: "storm",
  items: 7,
  blurb: "Split the beat into four: ti-ka-ti-ka! Gallop with ti-ti-ka, trip with ti-ka-ti, and build racing 16-step beats.",
  talk: ["Can you say ti-ka-ti-ka four times fast, and keep it even?", "Which sounds in the world are fast like sixteenths? (Rain, a horse galloping, a woodpecker…)"],
  challenge: "Tap ti-ka-ti-ka on the table with your fingers while someone claps a slow, steady beat.",
  stages: [
    {
      title: "Ti-ka-ti-ka",
      emoji: "🌧️",
      levels: 1,
      topics: TIKA_TOPICS,
      fixed: (r) => lvl(r, [TIKA_IDEA, [beatSplit, 0], [tikaEcho, 0], [tikaMatch, 0.2], [tikaRead, 0.2], [beatSplit, 0.5], [tikaEcho, 0.5]]),
    },
    { title: "Gallop and trip", emoji: "🐎", levels: 2, topics: GALLOP_TOPICS, fixed: teachStage(2, 7, (r) => [GALLOP_IDEA, cellEar.gen(r, 0)], GALLOP_TOPICS) },
    { title: "Surf beats", emoji: "🌊", levels: 2, topics: SURF_TOPICS, fixed: teachStage(2, 7, (r) => [SURF_IDEA, surfCopy.gen(r, 0)], SURF_TOPICS) },
    {
      title: "Sixteenth composer",
      emoji: "🏄",
      levels: 1,
      topics: [sxCreate, sxBeat],
      unlocks: ["tool:sixteen", "drum:crash"],
      fixed: (r) => lvl(r, [SX_WRITE_IDEA, SX_BEATS[0](), SX_CREATE[0](), [sxDictation, 0.8], SX_CREATE[1](), [gallopEcho, 0.9], SX_BEATS[1]()]),
    },
  ],
};

// ── Piano Pier: black-key groups, white-key names, steps and skips, low la and low so ────────
const KEY_HINT: Record<string, string> = {
  C: "C is the white key just left of the 2 black keys.",
  D: "D is the white key in the middle of the 2 black keys.",
  E: "E is the white key just right of the 2 black keys.",
  F: "F is the white key just left of the 3 black keys.",
  G: "G is the white key between the first two of the 3 black keys.",
  A: "A is the white key between the last two of the 3 black keys.",
  B: "B is the white key just right of the 3 black keys.",
};
const ALL_KEYS = Array.from({ length: 25 }, (_, i) => 48 + i);
const WHITE_IN = (lo: number, hi: number) => ALL_KEYS.filter((p) => p >= lo && p <= hi && C_KEYS.some((c) => (c - p) % 12 === 0));
const keyFind = (p: number, hint: boolean, skill: string): Activity => ({ kind: "keys", task: "find", prompt: `Find ${spelledName(p)} on the keyboard.${hint ? ` ${KEY_HINT[spelledName(p)]}` : ""}`, answer: [p], lo: 48, hi: 72, labels: false, octaveFree: true, skill });
const findGroups = topic("g3-find-groups", (r, d) => keyFind(pick(r, d < 0.35 ? [C4] : [C4, D4, E4, F4, B4]), true, "u:keys:black-groups"));
const keyGroup = topic("g3-key-group", (r) => {
  const p = pick(r, [48, 52, 53, 59, 60, 64, 65, 71]);
  const two = [0, 4].includes(p % 12);
  return seeChoice({ prompt: "Look at the glowing key. Is it right next to a group of 2 black keys, or a group of 3?", visual: keysShow(48, 72, [p], "none"), options: [{ id: "2", text: "A group of 2" }, { id: "3", text: "A group of 3" }], answer: two ? "2" : "3", skill: "u:keys:black-groups", why: "C and E hug the group of 2 black keys. F and B hug the group of 3." });
});
const findWhite = topic("g3-find-white", (r, d) => keyFind(pick(r, WHITE_IN(60, 71)), d < 0.4, "u:keys:white-keys"));
const keyNameSee = topic("g3-key-name", (r) => {
  const p = pick(r, WHITE_IN(48, 71));
  const L = spelledName(p);
  return seeChoice({ prompt: "Which key is glowing? Use the black-key groups to find your way!", visual: keysShow(48, 72, [p], "none"), options: textOpts(r, L, pickN(r, LETTERS.filter((x) => x !== L), 3)), answer: L, skill: "u:keys:white-keys" });
});
const musicAbc = topic("g3-music-abc", (r) => {
  const i = int(r, 0, 6);
  const up = r() < 0.6;
  const ans = LETTERS[(i + (up ? 1 : 6)) % 7];
  return seeChoice({ prompt: up ? `Going UP the keyboard, which white key comes right after ${LETTERS[i]}?` : `Going DOWN the keyboard, which white key comes right before ${LETTERS[i]}?`, options: textOpts(r, ans, pickN(r, LETTERS.filter((x) => x !== ans && x !== LETTERS[i]), 2)), answer: ans, skill: "u:keys:white-keys", why: "The white keys go A, B, C, D, E, F, G, and then start over at A." });
});
const keyLowHigh = topic("g3-key-low-high", (r) => {
  const low = r() < 0.5;
  return listen({ prompt: "Was this note played on the LEFT side of the piano, or the RIGHT side?", sound: note1(low ? pick(r, [36, 38, 40, 41, 43]) : pick(r, [79, 81, 83, 84, 86]), "piano", 1.5, 80), options: [picOpt("left", "⬅️", "Left side: low notes"), picOpt("right", "➡️", "Right side: high notes")], answer: low ? "left" : "right", skill: "u:keys:low-high", why: "On a piano, the notes get higher as you move to the right, and lower as you move to the left." });
});
const stepSkip = topic("g3-step-skip", (r, d) => {
  const kind = pick(r, d < 0.4 ? ["step", "skip"] : ["step", "skip", "same"]);
  const i = int(r, 0, C_KEYS.length - 3);
  const lo = C_KEYS[i];
  const hi = kind === "step" ? C_KEYS[i + 1] : kind === "skip" ? C_KEYS[i + 2] : lo;
  const notes = r() < 0.5 ? [lo, hi] : [hi, lo];
  return listen({ prompt: "Step, skip, or the same note again?", sound: tuneOf(notes, [1, 1.5], "piano", 80), ...(d < 0.3 ? { show: keysShow(60, 72, [], "letters") } : {}), options: d < 0.4 ? [opt("step", "Step"), opt("skip", "Skip")] : [opt("step", "Step"), opt("skip", "Skip"), opt("same", "Same note")], answer: kind, skill: "u:keys:step-skip", why: "A step moves to the very next white key. A skip jumps over one key." });
});
const keyStepSkip = topic("g3-key-step-skip", (r): Activity => {
  const W = WHITE_IN(57, 72);
  const skip = r() < 0.5;
  const up = r() < 0.6;
  const k = skip ? 2 : 1;
  const i = up ? int(r, 0, W.length - 1 - k) : int(r, k, W.length - 1);
  const a = W[i];
  const b = W[up ? i + k : i - k];
  return { kind: "keys", task: "interval", prompt: `${spelledName(a)} is pressed. Add the white key a ${skip ? "skip" : "step"} ${up ? "up" : "down"} from it, then press Check!`, answer: [a, b], lo: 55, hi: 76, labels: true, given: [a], skill: "u:keys:step-skip", why: `A ${skip ? "skip jumps over one white key" : "step goes to the very next white key"}: ${spelledName(a)} to ${spelledName(b)}.` };
});
const keysEcho = topic("g3-keys-echo", (r, d) => {
  const notes = walk(r, C_KEYS, d < 0.5 ? 4 : 5, d < 0.5 ? 1 : 2);
  return mel("echo", notes, { pads: C_KEYS, on: "keys", inst: "piano", labels: d < 0.6 ? "letters" : "none", durs: held(notes.length), bpm: 92, skill: "u:melody:echo-keys", prompt: "Listen, then play it back on the piano!" });
});
const pierSong = topic("g3-pier-song", (r, d) => {
  const notes = pick(r, SONG_BITS);
  return mel("read", notes, { pads: C_KEYS, on: "keys", inst: "piano", labels: d < 0.5 ? "letters" : "none", show: "staff", skill: "u:melody:read-staff", prompt: "Play this famous tune! Read the staff and find each key." });
});
const LOW = sp("so, la, do re mi so la");
const LOW_PATS = ["do la, so,", "so, la, do", "la, do re do", "mi re do la,", "so, do re mi", "do re do la, so,", "so mi do la,", "la, do mi re do la,", "re do la, so, la,", "mi so la so mi re do la,"];
const lowEcho = topic("g3-low-echo", (r, d) => {
  const notes = sp(byD(r, d, LOW_PATS));
  return mel("echo", notes, { pads: LOW, tonic: DO, labels: d < 0.5 ? "solfege" : "none", inst: "marimba", durs: held(notes.length), bpm: 92, skill: "u:melody:echo-low", prompt: "Listen, then play it back! Low so and low la are the two lowest notes, just below do." });
});
const lowMatch = topic("g3-low-match", (r, d) => {
  const steps = [-5, -3, 0, 2, 4];
  const n = d < 0.5 ? 3 : 4;
  const make = () => Array.from({ length: n }, () => DO + pick(r, steps));
  const ans = make();
  const wrong: number[][] = [];
  for (let k = 0; k < 30 && wrong.length < 2; k++) {
    const w = make();
    if (w.join() !== ans.join() && !wrong.some((x) => x.join() === w.join())) wrong.push(w);
  }
  return listen({ prompt: "Which notes did you hear?", sound: tuneOf(ans, 1, "marimba", 84), options: shuffle(r, [ans, ...wrong]).map((ps) => opt(ps.join("-"), ps.map((p) => sw(p)).join(" – "))), answer: ans.join("-"), skill: "u:solfege:low-la-so", layout: "list" });
});
const lowEnd = topic("g3-low-end", (r) => {
  const la = r() < 0.5;
  const ps = sp(pick(r, la ? ["do re do la,", "mi re do la,", "so mi re do la,", "la, do re do la,"] : ["la, so, la, do", "so, la, do re do", "mi re la, do", "so, la, re do"]));
  return listen({ prompt: "Does this tune end on do, or on low la?", sound: tuneOf(ps, held(ps.length, 3), "marimba", 88), options: [opt("do", "On do (bright, home)"), opt("la", "On low la (darker)")], answer: la ? "la" : "do", skill: "u:solfege:low-la-so", why: "Tunes that end on low la sound darker and a little mysterious. Tunes that end on do sound bright and finished." });
});
const LOW_SONGS: { prompt: string; rules: ComposeRule[]; bass: number[] }[] = [
  { prompt: "Write a mysterious tune that ends on low la. Use low so too!", rules: [{ rule: "end", p: A3 }, { rule: "use", pitches: [G3] }], bass: [45, 52] },
  { prompt: "Start on low so and climb up home to do at the end.", rules: [{ rule: "start", p: G3 }, { rule: "end", p: C4 }, { rule: "notes", min: 6 }], bass: [48, 55] },
  { prompt: "Use low la AND low so, then finish on do.", rules: [{ rule: "use", pitches: [A3, G3] }, { rule: "end", p: C4 }], bass: [48, 55] },
];
const lowSong = (s: (typeof LOW_SONGS)[number]): Activity => compose({ prompt: s.prompt, pitches: LOW, slots: 8, inst: "piano", labels: "solfege", rules: s.rules, backing: band(8, 96, { bass: s.bass }), skill: "u:compose:low-penta" });
const lowCompose = topic("g3-low-compose", (r) => lowSong(pick(r, LOW_SONGS)));

const KEYS_IDEA = idea("Find your way on the piano", [
  frame("The piano has white keys and black keys.", keysShow(48, 72, [], "none"), tuneOf(scale(48, "major", 2), 0.25, "piano", 112)),
  frame("The black keys come in groups: 2, then 3, then 2, then 3, again and again.", keysShow(48, 72, [49, 51, 54, 56, 58, 61, 63, 66, 68, 70], "none"), tuneOf([49, 51, 54, 56, 58, 61, 63, 66, 68, 70], 0.5, "piano", 112)),
  frame("C is the white key just left of the 2 black keys. There's a C in every group!", keysShow(48, 72, [48, 60, 72], "letters"), tuneOf([48, 60, 72], [1, 1, 2], "piano", 84)),
  frame("D sits between the 2 black keys. E is just to their right.", keysShow(48, 72, [62, 64], "letters"), tuneOf([60, 62, 64], [1, 1, 2], "piano", 84)),
  frame("Your turn: play every C you can find!", keysShow(48, 72, [], "none"), undefined, "keys", ALL_KEYS),
], "u:keys:idea");
const ABC_IDEA = idea("A, B, C, D, E, F, G", [
  frame("White keys use just 7 letters: A, B, C, D, E, F and G.", keysShow(57, 72, [57, 59, 60, 62, 64, 65, 67], "letters"), tuneOf([57, 59, 60, 62, 64, 65, 67], 0.5, "piano", 100)),
  frame("After G, the letters start over at A!", keysShow(57, 72, [67, 69, 71], "letters"), tuneOf([65, 67, 69, 71, 72], [0.5, 0.5, 0.5, 0.5, 1], "piano", 100)),
  frame("F is just left of the 3 black keys. G and A live inside them. B is just to their right.", keysShow(60, 72, [65, 67, 69, 71], "letters"), tuneOf([65, 67, 69, 71], [1, 1, 1, 2], "piano", 88)),
  frame("Count up from C: C, D, E, F, G, A, B, C! That's the C major scale.", keysShow(60, 72, C_KEYS, "letters"), tuneOf(C_KEYS, [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 2], "piano", 100)),
], "u:keys:white-keys-idea");
const STEPS_IDEA = idea("Steps and skips", [
  frame("Move to the very next white key: that's a step. C to D is a step.", keysShow(60, 72, [60, 62], "letters"), tuneOf([60, 62], [1, 2], "piano", 80)),
  frame("Jump over one key: that's a skip. C to E is a skip.", keysShow(60, 72, [60, 64], "letters"), tuneOf([60, 64], [1, 2], "piano", 80)),
  frame("Steps sound smooth, like walking. Skips sound bouncy, like hopping!", keysShow(60, 72, [], "letters"), then(tuneOf([60, 62, 64, 65, 67], 0.5, "piano", 100), tuneOf([60, 64, 67, 72], 0.5, "piano", 100), 1)),
  frame("Beethoven's Ode to Joy walks almost all in steps. Listen!", staffShow(sp("mi mi fa so so fa mi re").map((p) => ({ p, d: 1 })), "treble", { labels: "letters" }), songScore("odetojoy", { inst: "piano", n: 15 })),
], "u:keys:step-skip-idea");
const LOW_IDEA = idea("Below do: low la and low so", [
  frame("Notes keep going below do! Just under do live low la and low so.", keysShow(53, 72, [55, 57, 60], "letters"), tuneOf([60, 57, 55], [1, 1, 2], "piano", 84)),
  frame("Do, low la, low so. Down, down, down!", bellsShow(LOW, [], "solfege", DO), tuneOf([60, 57, 55, 57, 60], [1, 1, 1, 1, 2], "marimba", 88)),
  frame("A tune that ends on low la sounds darker and more mysterious.", picsShow("🌙"), tuneOf(sp("mi re do la,"), [1, 1, 1, 3], "marimba", 84)),
  frame("Amazing Grace starts on low so! A-MAZ-ing grace: low so, do, mi.", picsShow("🎶"), songScore("grace", { inst: "piano", n: 8, bpm: 88 })),
  frame("Your turn! Play low so, low la, do, re and mi.", keysShow(53, 72, LOW, "letters"), undefined, "keys", ALL_KEYS),
], "u:solfege:low-idea");

const GROUP_TOPICS = [findGroups, keyGroup, keyLowHigh, keyNameSee];
const ABC_TOPICS = [findWhite, keyNameSee, keysEcho, musicAbc, findGroups, keyLowHigh];
const STEP_TOPICS = [stepSkip, keyStepSkip, keysEcho, pierSong, findWhite];
const LOW_TOPICS = [lowEcho, lowMatch, lowEnd, lowCompose];
const PIANO_PIER: WorldDef = {
  id: "g3-piano-pier",
  title: "Piano Pier",
  emoji: "🎹",
  grade: "3",
  theme: "pirate",
  items: 7,
  blurb: "Find your way on the piano with the black-key groups, name every white key, step and skip, and discover low la and low so.",
  talk: ["How do the black keys help you find C on a piano?", "Can you hum a tune that moves in steps? One that skips?"],
  challenge: "Find a piano or keyboard (or a piano app) and play every C, from the lowest to the highest!",
  stages: [
    {
      title: "Groups of 2 and 3",
      emoji: "🎹",
      levels: 1,
      topics: GROUP_TOPICS,
      fixed: (r) => lvl(r, [KEYS_IDEA, [keyGroup, 0], [findGroups, 0], [keyLowHigh, 0], [keyGroup, 0.3], [findGroups, 0.5], [findGroups, 0.8]]),
    },
    { title: "A to G", emoji: "🔤", levels: 2, topics: ABC_TOPICS, fixed: teachStage(2, 7, (r) => [ABC_IDEA, musicAbc.gen(r, 0), findWhite.gen(r, 0)], ABC_TOPICS) },
    { title: "Steps and skips", emoji: "🐸", levels: 2, topics: STEP_TOPICS, fixed: teachStage(2, 7, (r) => [STEPS_IDEA, stepSkip.gen(r, 0)], STEP_TOPICS) },
    {
      title: "Below do",
      emoji: "⚓",
      levels: 1,
      topics: LOW_TOPICS,
      unlocks: ["note:la,", "note:so,"],
      fixed: (r) => lvl(r, [LOW_IDEA, [lowEcho, 0], [lowEnd, 0], [lowMatch, 0.2], lowSong(LOW_SONGS[1]), [lowEcho, 0.6], lowSong(LOW_SONGS[0])]),
    },
  ],
};

// ── Rondo Reef: repetition and contrast, rondo, theme and variations ─────────────────────────
const FORMS3 = [["A", "B", "A"], ["A", "A", "B", "A"], ["A", "B", "A", "B"], ["A", "B", "C", "A"], ["A", "B", "A", "C", "A"], ["A", "B", "A", "C", "A"]];
const FORM_NAMES3 = ["ABA", "AABA", "ABAB", "ABCA", "ABACA", "ABCBA"];
const formBuild3 = topic("g3-form-build", (r, d): Activity => {
  const order = [...byD(r, d, FORMS3)];
  return { kind: "form", mode: "build", prompt: "Listen to the whole piece. Drag the section blocks into the order you hear.", sections: partsFor(pick(r, PARTS)(), order), order, skill: "u:form:build" };
});
const formLabel3 = topic("g3-form-label", (r, d): Activity => {
  const order = [...byD(r, d, FORMS3)];
  const answer = order.join("");
  return { kind: "form", mode: "label", prompt: "Listen to the piece. Which form is it?", sections: partsFor(pick(r, PARTS)(), order), order, options: shuffle(r, [answer, ...pickN(r, FORM_NAMES3, 3, (x) => x === answer)]), answer, skill: "u:form:label" };
});
const phraseSame3 = topic("g3-phrase-same", (r) => {
  const a = pick(r, PARTS)().A;
  const same = r() < 0.45;
  return listen({ prompt: "Listen closely. Are the two phrases exactly the same, or did a note change?", sound: then(a, same ? a : tweak(a, r), 1), options: [picOpt("same", "🟰", "Exactly the same"), picOpt("diff", "🔀", "A note changed")], answer: same ? "same" : "diff", skill: "u:form:same-different", why: "Composers repeat phrases exactly, or change just a note or two. Sharp ears catch it!" });
});
const rondoFacts = topic("g3-rondo-facts", (r) => pick(r, [
  (): Activity => seeChoice({ prompt: "A rondo goes A B A C A. How many times do you hear the A section?", visual: formShow(["A", "B", "A", "C", "A"]), options: textOpts(r, "3", ["2", "5"]), answer: "3", skill: "u:form:rondo", why: "A comes back between the new sections: A, B, A, C, A. That's 3 times!" }),
  (): Activity => seeChoice({ prompt: "In a rondo, which section keeps coming back?", visual: formShow(["A", "B", "A", "C", "A"]), options: textOpts(r, "A", ["B", "C"]), answer: "A", skill: "u:form:rondo", why: "The A theme returns again and again, like a chorus." }),
  (): Activity => seeChoice({ prompt: "Which of these forms is a rondo?", options: textOpts(r, "A B A C A", ["A B C D E", "A A B B"]), answer: "A B A C A", skill: "u:form:rondo", why: "In a rondo the A section returns, with new sections in between." }),
  (): Activity => seeChoice({ prompt: "In A B A form, which section brings the CONTRAST?", visual: formShow(["A", "B", "A"]), options: textOpts(r, "B", ["The first A", "The last A"]), answer: "B", skill: "u:form:contrast", why: "B is the new, different part. A repeats. Contrast + repetition = great form!" }),
])());
type Theme = { name: string; ps: number[]; ds: number[] };
const THEMES: Theme[] = [
  { name: "Twinkle, Twinkle", ps: [C4, C4, G4, G4, A4, A4, G4], ds: [1, 1, 1, 1, 1, 1, 2] },
  { name: "Mary Had a Little Lamb", ps: [E4, D4, C4, D4, E4, E4, E4], ds: [1, 1, 1, 1, 1, 1, 2] },
  { name: "Hot Cross Buns", ps: [E4, D4, C4, E4, D4, C4], ds: [1, 1, 2, 1, 1, 2] },
  { name: "Ode to Joy", ps: [E4, E4, F4, G4, G4, F4, E4, D4], ds: [1, 1, 1, 1, 1, 1, 1, 1] },
  { name: "Frère Jacques", ps: [C4, D4, E4, C4, C4, D4, E4, C4], ds: [1, 1, 1, 1, 1, 1, 1, 1] },
];
type VarKind = "faster" | "slower" | "minor" | "inst" | "notes" | "louder";
const VAR_KINDS: VarKind[] = ["faster", "slower", "minor", "inst", "notes", "louder"];
const VAR_TEXT: Record<VarKind, string> = { faster: "It got faster", slower: "It got slower", minor: "It changed to minor (darker)", inst: "A new instrument plays it", notes: "Extra quick notes were added", louder: "It got much louder" };
const upStep = (p: number) => C_KEYS.find((c) => c > p) ?? p + 2;
/** The theme changed one way: a variation. */
function variation(t: Theme, v: VarKind, r: Rng): Score {
  switch (v) {
    case "faster": return melody(t.ps, t.ds, "piano", 168);
    case "slower": return melody(t.ps, t.ds, "piano", 60);
    case "minor": return melody(t.ps.map((p) => ([4, 9, 11].includes((((p - C4) % 12) + 12) % 12) ? p - 1 : p)), t.ds, "piano", 100);
    case "inst": return melody(t.ps, t.ds, pick(r, ["trumpet", "flute", "violin", "clarinet"] as InstId[]), 100);
    case "louder": return withGain(melody(t.ps, t.ds, "piano", 100), 1.2);
    case "notes": {
      const ps: number[] = [];
      const ds: number[] = [];
      t.ps.forEach((p, i) => {
        const d = t.ds[i];
        if (d === 1) { ps.push(p, upStep(p), p, upStep(p)); ds.push(0.25, 0.25, 0.25, 0.25); } else { ps.push(p); ds.push(d); }
      });
      return melody(ps, ds, "piano", 100);
    }
  }
}
const themeSound = (t: Theme, v?: VarKind) => (v === "louder" ? withGain(melody(t.ps, t.ds, "piano", 100), 0.35) : melody(t.ps, t.ds, "piano", 100));
const varWhat = topic("g3-var-what", (r) => {
  const t = pick(r, THEMES);
  const v = pick(r, VAR_KINDS);
  return listen({
    prompt: `First you'll hear the theme (${t.name}), then a variation. What changed?`,
    sound: then(themeSound(t, v), variation(t, v, r), 1),
    options: shuffle(r, [v, ...pickN(r, VAR_KINDS, 2, (x) => x === v)]).map((k) => opt(k, VAR_TEXT[k])),
    answer: v,
    skill: "u:form:variation",
    why: "A variation keeps the tune but changes something: speed, notes, instrument, loudness, or major and minor.",
  });
});
const themeOrVar = topic("g3-theme-or-var", (r, d) => {
  const t = pick(r, THEMES);
  const v = pick(r, d < 0.5 ? (["notes", "minor", "inst"] as VarKind[]) : (["notes", "minor"] as VarKind[]));
  return listen({ prompt: `Which one is the plain theme of ${t.name}, with nothing changed?`, options: critters(r, [{ id: "theme", sound: themeSound(t) }, { id: "var", sound: variation(t, v, r) }]), answer: "theme", skill: "u:form:variation", why: "The theme is the tune in its plain form. A variation dresses it up." });
});
const VAR_COMPOSE: (() => Activity)[] = [
  () => compose({ prompt: "Here's Twinkle's first line. Make a smooth variation: change notes so the tune only moves by steps. Keep C first and G last!", pitches: C_KEYS, slots: 8, inst: "harp", labels: "letters", start: [C4, C4, G4, G4, A4, A4, G4, G4], rules: [{ rule: "steps" }, { rule: "start", p: C4 }, { rule: "end", p: G4 }], skill: "u:compose:variation" }),
  () => compose({ prompt: "Here's the start of Mary Had a Little Lamb. Make a bouncy variation: add a leap over 3 or more notes! Keep E first and C last.", pitches: C_KEYS, slots: 8, inst: "harp", labels: "letters", start: [E4, D4, C4, D4, E4, E4, E4, C4], rules: [{ rule: "leap", min: 4 }, { rule: "start", p: E4 }, { rule: "end", p: C4 }], skill: "u:compose:variation" }),
  () => compose({ prompt: "Here's Hot Cross Buns. Make a variation that climbs higher: use G and A somewhere, and end on C.", pitches: C_KEYS, slots: 8, inst: "harp", labels: "letters", start: [E4, D4, C4, null, E4, D4, C4, null], rules: [{ rule: "use", pitches: [G4, A4] }, { rule: "end", p: C4 }], skill: "u:compose:variation" }),
];
const varCompose = topic("g3-var-compose", (r) => pick(r, VAR_COMPOSE)());
const rondoCompose = topic("g3-rondo-compose", (r) => {
  const [A, extra] = pick(r, [[sp("mi re do"), [G4, A4]], [sp("do mi so"), [D4, A4]], [sp("so mi do"), [D4, A4]]] as [number[], number[]][]);
  return compose({ prompt: "A tiny rondo: A B A C A! Your A theme is ready. Fill the empty boxes with a B part and a C part. They must use new notes!", pitches: PENTA, slots: 15, inst: "harp", start: [...A, null, null, null, ...A, null, null, null, ...A], rules: [{ rule: "notes", min: 15 }, { rule: "use", pitches: extra }], backing: band(15, 112, { meter: [3, 4], drums: { kick: "x.....", shaker: "..x.x." }, bass: [48, 55, 55] }), bpm: 112, skill: "u:compose:rondo" });
});

const CONTRAST_PARTS = PARTS[2]();
const CONTRAST_IDEA = idea("Repetition and contrast", [
  frame("Composers repeat ideas so we remember them.", formShow(["A", "A"]), then(CONTRAST_PARTS.A, CONTRAST_PARTS.A, 0.5)),
  frame("Then they add contrast, something new, so we don't get bored!", formShow(["A", "A", "B"]), then(then(CONTRAST_PARTS.A, CONTRAST_PARTS.A, 0.5), CONTRAST_PARTS.B, 0.5)),
  frame("Contrast can be a new tune, new instruments, a new speed, louder or softer, or a darker minor sound.", formShow(["A", "B"]), then(phrase("0 2 4 7 4 2 0/2", "flute", 120), phrase("0 2 3 7 3 2 0/2", "cello", 72, 48), 0.5)),
  frame("The best music balances the two: enough repetition to remember, enough contrast to surprise.", formShow(["A", "A", "B", "A"]), then(then(then(CONTRAST_PARTS.A, CONTRAST_PARTS.A, 0.5), CONTRAST_PARTS.B, 0.5), CONTRAST_PARTS.A, 0.5)),
], "u:form:contrast-idea");
const RONDO_PARTS = PARTS[1]();
const RONDO_IDEA = idea("The rondo", [
  frame("A rondo is like a merry-go-round: the A section keeps coming back around!", formShow(["A", "B", "A", "C", "A"]), RONDO_PARTS.A),
  frame("A B A C A: the A theme, something new, A again, something else new, and A to finish.", formShow(["A", "B", "A", "C", "A"]), [RONDO_PARTS.B, RONDO_PARTS.A, RONDO_PARTS.C, RONDO_PARTS.A].reduce((acc, s) => then(acc, s, 0.5), RONDO_PARTS.A)),
  frame("Composers like Mozart and Beethoven loved writing rondos. Hear the A theme come back one more time!", formShow(["A", "C", "A"]), then(then(RONDO_PARTS.A, RONDO_PARTS.C, 0.5), RONDO_PARTS.A, 0.5)),
], "u:form:rondo-idea");
const VAR_IDEA = idea("Theme and variations", [
  frame("A theme is a tune. A variation is the same tune, changed in some way.", picsShow("🎶"), themeSound(THEMES[0])),
  frame("Mozart wrote 12 variations on a French tune. You know it as Twinkle, Twinkle!", picsShow("🌟"), songScore("twinkle", { inst: "piano", n: 7 })),
  frame("Variation: add racing quick notes!", picsShow("💨"), variation(THEMES[0], "notes", rng("g3-var-idea"))),
  frame("Variation: make it minor, dark and mysterious.", picsShow("🌙"), variation(THEMES[0], "minor", rng("g3-var-idea"))),
  frame("Variation: a new instrument and a new speed. Same tune, new costume!", picsShow("🎭"), melody(THEMES[0].ps, THEMES[0].ds, "trumpet", 150)),
], "u:form:variation-idea");
const VAR_MAKE_IDEA = idea("Variation maker", [
  frame("Now you're the composer. Take a theme and make it your own!", picsShow("✏️"), themeSound(THEMES[0])),
  frame("Try filling a leap with steps, like Mozart's quick runs. C, D, E, F, G!", staffShow([C4, D4, E4, F4, G4].map((p) => ({ p, d: 1 })), "treble", { labels: "letters" }), tuneOf([C4, D4, E4, F4, G4], [0.5, 0.5, 0.5, 0.5, 2], "harp", 100)),
  frame("Meet the harp: 47 strings, plucked by hand. Now it's in your Studio!", instShow("harp"), tuneOf([C4, E4, G4, C5, E5, G5, C5 + 12], [0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 2], "harp", 96)),
], "u:compose:variation-idea");

const CONTRAST_TOPICS = [phraseSame3, formLabel3, formBuild3, rondoFacts];
const RONDO_TOPICS = [formBuild3, rondoFacts, formLabel3, phraseSame3];
const VAR_TOPICS = [varWhat, themeOrVar, formLabel3, varWhat];
const RONDO_REEF: WorldDef = {
  id: "g3-rondo-reef",
  title: "Rondo Reef",
  emoji: "🐠",
  grade: "3",
  theme: "coral",
  items: 7,
  blurb: "Repetition and contrast make music make sense. Ride the rondo merry-go-round, and dress up a tune in variations, like Mozart.",
  talk: ["What part of your favorite song comes back again and again?", "If you made a variation of Happy Birthday, what would you change?"],
  challenge: "Sing Twinkle, Twinkle three ways: fast, slow, and in a spooky voice. You just made variations!",
  stages: [
    {
      title: "Repeat and contrast",
      emoji: "🔁",
      levels: 1,
      topics: CONTRAST_TOPICS,
      fixed: (r) => lvl(r, [CONTRAST_IDEA, [phraseSame3, 0], [formLabel3, 0], [phraseSame3, 0.4], [formBuild3, 0.2], [rondoFacts, 0], [formLabel3, 0.3]]),
    },
    { title: "The rondo", emoji: "🎠", levels: 2, topics: RONDO_TOPICS, fixed: teachStage(2, 7, (r) => [RONDO_IDEA, rondoFacts.gen(r, 0), formBuild3.gen(r, 0.75)], RONDO_TOPICS) },
    { title: "Theme and variations", emoji: "🎭", levels: 2, topics: VAR_TOPICS, fixed: teachStage(2, 7, (r) => [VAR_IDEA, varWhat.gen(r, 0), themeOrVar.gen(r, 0)], VAR_TOPICS) },
    {
      title: "Variation maker",
      emoji: "✏️",
      levels: 1,
      topics: [varCompose, rondoCompose],
      unlocks: ["inst:harp"],
      fixed: (r) => lvl(r, [VAR_MAKE_IDEA, VAR_COMPOSE[0](), [varWhat, 0.7], [rondoCompose, 0], [formBuild3, 1], VAR_COMPOSE[2](), [themeOrVar, 0.8]]),
    },
  ],
};

// ── Orchestra Odyssey: the families up close, high and low, the conductor, the seats ─────────
const FAMILY_POOLS: Record<string, InstId[]> = {
  strings: ["violin", "cello", "doublebass", "harp"],
  woodwinds: ["flute", "clarinet", "oboe", "bassoon"],
  brass: ["trumpet", "horn", "trombone", "tuba"],
  percussion: ["timpani", "xylophone", "glock", "marimba"],
};
const ORCH_ALL: InstId[] = ["violin", "viola", "cello", "doublebass", "harp", "flute", "clarinet", "oboe", "bassoon", "trumpet", "horn", "trombone", "tuba", "timpani", "xylophone", "glock"];
const famHighLow = topic("g3-fam-highlow", (r) => {
  const fam = pick(r, [["violin", "viola", "cello", "doublebass"], ["piccolo", "flute", "oboe", "clarinet", "bassoon"], ["trumpet", "horn", "trombone", "tuba"]] as InstId[][]);
  const [x, y] = pickN(r, fam, 2);
  const hi = (HOME[x] ?? 60) > (HOME[y] ?? 60) ? x : y;
  const lo = hi === x ? y : x;
  const ask = r() < 0.5 ? "higher" : "lower";
  return listen({ prompt: `Both play the same little tune. Which instrument sounds ${ask}?`, options: [x, y].map((id) => ({ ...instOpt(id), sound: instTune(id) })), answer: ask === "higher" ? hi : lo, skill: "u:family:high-low", why: "In every family, the bigger the instrument, the lower it sounds." });
});
const famWhich = (fam: string) => topic(`g3-which-${fam}`, (r, d) => whichInstrument(r, d, { pool: FAMILY_POOLS[fam], skill: `u:timbre:${fam}` }));
const whichStrings = famWhich("strings");
const whichWinds = topic("g3-which-winds", (r, d) => whichInstrument(r, d, { pool: r() < 0.5 ? FAMILY_POOLS.woodwinds : FAMILY_POOLS.brass, skill: "u:timbre:winds" }));
const whichPerc = famWhich("percussion");
const famOf = topic("g3-family-of", (r) => whichFamily(r, { pool: ORCH_ALL, skill: "u:family:which" }));
const stringSort = topic("g3-string-sort", (r): Activity => ({
  kind: "soundsort",
  prompt: "Tap each string instrument to hear it. Is it a high string or a low string?",
  bins: [{ id: "high", label: "High strings", emoji: "🐦" }, { id: "low", label: "Low strings", emoji: "🐻" }],
  items: shuffle(r, [["violin", "high"], ["viola", "high"], ["cello", "low"], ["doublebass", "low"]] as [InstId, string][]).map(([id, bin]) => ({ id, inst: id, label: INSTRUMENTS[id].name, sound: instTune(id), bin })),
  skill: "u:family:strings",
}));
const windSort = topic("g3-wind-sort", (r): Activity => ({
  kind: "soundsort",
  prompt: "Woodwind or brass? Tap each one to hear it, then sort them.",
  bins: [{ id: "woodwinds", label: "Woodwinds", inst: "clarinet" }, { id: "brass", label: "Brass", inst: "trumpet" }],
  items: [...pickN(r, FAMILY_POOLS.woodwinds, 3).map((id) => ({ id, inst: id, label: INSTRUMENTS[id].name, sound: instTune(id), bin: "woodwinds" })), ...pickN(r, FAMILY_POOLS.brass, 3).map((id) => ({ id, inst: id, label: INSTRUMENTS[id].name, sound: instTune(id), bin: "brass" }))],
  skill: "u:family:winds-brass",
}));
const UNPITCHED: [DrumId, string][] = [["snare", "x.x.xxx."], ["cymbals", "x...x..."], ["bassdrum", "x...x.x."], ["triangle", "x.x.x.x."], ["tamb", "xxx.x.x."]];
const percSort = topic("g3-perc-sort", (r): Activity => ({
  kind: "soundsort",
  prompt: "Does it play notes (pitched), or just rhythms (unpitched)? Tap each one, then sort.",
  bins: [{ id: "pitched", label: "Plays notes", inst: "xylophone" }, { id: "unpitched", label: "Just rhythm", inst: "snare" }],
  items: [
    ...pickN(r, ["timpani", "xylophone", "glock", "marimba"] as InstId[], 3).map((id) => ({ id, inst: id, label: INSTRUMENTS[id].name, sound: instTune(id), bin: "pitched" })),
    ...pickN(r, UNPITCHED, 3).map(([id, pat]) => ({ id, inst: id, label: DRUMS[id].name, sound: beat({ [id]: pat }, { bpm: 100, per: 2, times: 1 }), bin: "unpitched" })),
  ],
  skill: "u:family:percussion",
}));
const PERC_EAR: [DrumId, string][] = [["snare", "x.x.xxx.x.x.xxx."], ["cymbals", "x.......x......."], ["bassdrum", "x...x...x...x..."], ["triangle", "x...x...x...x..."], ["tamb", "xxx.x.x.xxx.x.x."], ["block", "x.x.x.x.x.xxx..."]];
const percEar = topic("g3-perc-ear", (r) => {
  const [ans, pat] = pick(r, PERC_EAR);
  return listen({ prompt: "Which percussion instrument is playing?", sound: beat({ [ans]: pat }, { bpm: 100, per: 4, times: 1 }), options: shuffle(r, [ans, ...pickN(r, PERC_EAR.map(([k]) => k), 2, (k) => k === ans)]).map((k) => instOpt(k)), answer: ans, skill: "u:timbre:percussion", why: `That was the ${DRUMS[ans].name.toLowerCase()}.`, layout: "grid" });
});
const CONDUCT: (() => Activity)[] = [
  () => ({ kind: "conduct", prompt: "The orchestra is playing too slowly! Tap the baton faster to bring them up to Allegro.", goal: { tempo: [120, 156] }, music: heroic(80), word: "Allegro", skill: "u:conduct:tempo" }),
  () => ({ kind: "conduct", prompt: "Slow the orchestra down to Adagio: calm and slow. Tap the baton gently.", goal: { tempo: [60, 80] }, music: piece("waltz", { bpm: 140 }), word: "Adagio", skill: "u:conduct:tempo" }),
  () => ({ kind: "conduct", prompt: "Make the orchestra play softly: piano! Lower your hand.", goal: { dyn: [0, 0.35] }, music: piece("calm"), word: "piano", skill: "u:conduct:dynamics" }),
  () => ({ kind: "conduct", prompt: "Make it LOUD: forte! Raise your hand up high.", goal: { dyn: [0.75, 1] }, music: heroic(), word: "forte", skill: "u:conduct:dynamics" }),
  () => ({ kind: "conduct", prompt: "Big finish! Faster (Allegro) AND louder (forte). Tap quickly and raise your hand!", goal: { tempo: [120, 160], dyn: [0.7, 1] }, music: heroic(84), word: "Allegro, forte", skill: "u:conduct:tempo" }),
];
const conductT = topic("g3-conduct", (r, d) => byD(r, d, CONDUCT)());
const conductorFacts = topic("g3-conductor-facts", (r) => pick(r, [
  (): Activity => seeChoice({ prompt: "What does a conductor hold to show the beat?", options: textOpts(r, "A baton", ["A bow", "A drumstick"]), answer: "A baton", skill: "u:conduct:role", why: "The baton is a thin stick. The conductor waves it to show the beat and how the music should feel." }),
  (): Activity => seeChoice({ prompt: "Which family sits closest to the conductor?", options: textOpts(r, "The strings", ["The brass", "The percussion"]), answer: "The strings", skill: "u:conduct:role", why: "The strings sit in front. Woodwinds sit behind them, then brass, with percussion at the very back." }),
  (): Activity => seeChoice({ prompt: "What does it mean when the conductor raises a hand high?", options: textOpts(r, "Play louder", ["Stop playing", "Play slower"]), answer: "Play louder", skill: "u:conduct:role", why: "A big, high gesture means louder. A small, low one means softer." }),
  (): Activity => seeChoice({ prompt: "Where does the percussion section sit?", options: textOpts(r, "At the very back", ["Right in front", "Next to the conductor"]), answer: "At the very back", skill: "u:conduct:role", why: "Percussion is loud, so it sits at the back of the orchestra." }),
])());
const seatSort = topic("g3-seat-sort", (r): Activity => ({
  kind: "sort",
  prompt: "Where does each one sit in the orchestra?",
  bins: [{ id: "front", label: "Front", emoji: "🎻" }, { id: "middle", label: "Middle", emoji: "🎶" }, { id: "back", label: "Back", emoji: "🥁" }],
  items: shuffle(r, [
    ...pickN(r, [["violins", "Violins"], ["violas", "Violas"], ["cellos", "Cellos"]], 2).map(([id, text]) => ({ id, text, bin: "front" })),
    ...pickN(r, [["flutes", "Flutes"], ["clarinets", "Clarinets"], ["oboes", "Oboes"], ["bassoons", "Bassoons"]], 2).map(([id, text]) => ({ id, text, bin: "middle" })),
    ...pickN(r, [["trumpets", "Trumpets"], ["tubas", "Tubas"], ["timpani", "Timpani"], ["trombones", "Trombones"]], 2).map(([id, text]) => ({ id, text, bin: "back" })),
  ]),
  skill: "u:family:seating",
}));
const CELLO = [48, 50, 52, 55, 57, 60];
const CELLO_SONGS: { prompt: string; rules: ComposeRule[] }[] = [
  { prompt: "Write a deep, singing tune for the cello. Start and end on low C.", rules: [{ rule: "start", p: 48 }, { rule: "end", p: 48 }, { rule: "notes", min: 6 }] },
  { prompt: "Write a cello tune that climbs up to middle C in the middle, then sinks back down.", rules: [{ rule: "use", pitches: [60] }, { rule: "arch" }] },
  { prompt: "Write a slow cello tune that only moves by steps. End on low C.", rules: [{ rule: "steps" }, { rule: "end", p: 48 }, { rule: "notes", min: 6 }] },
];
const celloSong = (s: (typeof CELLO_SONGS)[number]): Activity => compose({ prompt: s.prompt, pitches: CELLO, slots: 8, inst: "cello", labels: "letters", tonic: 48, bpm: 84, rules: s.rules, backing: band(8, 84, { drums: { bassdrum: "x.......", triangle: "....x..." }, bass: [36, 43], inst: "doublebass" }), skill: "u:compose:orchestra" });
const celloCompose = topic("g3-cello-compose", (r) => celloSong(pick(r, CELLO_SONGS)));

const STRINGS_IDEA = idea("The string family", [
  frame("The string family: violin, viola, cello and double bass. A bow pulls across the strings to make them sing.", instShow("violin", "viola", "cello", "doublebass"), parade(["violin", "viola", "cello", "doublebass"])),
  frame("The violin is the smallest, so it plays the highest notes.", instShow("violin"), instTune("violin")),
  frame("The double bass is the biggest: about as tall as a grown-up! It plays the lowest notes.", instShow("doublebass"), instTune("doublebass")),
  frame("Bigger instrument, lower sound. That rule works in every family!", instShow("violin", "cello"), then(instTune("violin"), instTune("cello"), 1)),
], "u:family:strings-idea");
const WINDS_IDEA = idea("Woodwinds and brass", [
  frame("Woodwinds: flute, clarinet, oboe and bassoon. Players blow air to make the sound.", instShow("flute", "clarinet", "oboe", "bassoon"), parade(["flute", "oboe", "clarinet", "bassoon"])),
  frame("The flute is held sideways. The oboe and bassoon use a double reed: two thin pieces of cane that buzz.", instShow("flute", "oboe"), then(instTune("flute"), instTune("oboe"), 1)),
  frame("Brass: trumpet, French horn, trombone and tuba. Players buzz their lips into a metal mouthpiece!", instShow("trumpet", "horn", "trombone", "tuba"), parade(["trumpet", "horn", "trombone", "tuba"])),
  frame("The trombone has a slide. The tuba is the biggest brass instrument, and the lowest.", instShow("trombone", "tuba"), then(instTune("trombone"), instTune("tuba"), 1)),
], "u:family:winds-idea");
const PERC_IDEA = idea("Percussion and the conductor", [
  frame("Percussion: you hit it, shake it or scrape it. Timpani, snare drum, xylophone and cymbals!", instShow("timpani", "snare", "xylophone", "cymbals"), layer(instTune("xylophone"), beat({ snare: "x.x.xxx.", cymbals: "x......." }, { bpm: 100, per: 2, times: 1 }))),
  frame("Some percussion plays notes, like the xylophone and the timpani. That's pitched percussion.", instShow("xylophone", "timpani"), then(instTune("xylophone"), instTune("timpani"), 1)),
  frame("Some just plays rhythms, like the snare drum and the cymbals. That's unpitched percussion.", instShow("snare", "cymbals"), beat({ snare: "x.x.xxx.x.x.xxx.", cymbals: "x.......x......." }, { bpm: 100, per: 2, times: 1 })),
  frame("The conductor leads everyone with a baton: faster or slower, louder or softer. All together!", picsShow("🎼"), heroic()),
], "u:family:percussion-idea");
const SEAT_IDEA = idea("Take your seats", [
  frame("Here's how an orchestra sits. The strings are in front, close to the conductor.", instShow("violin", "viola", "cello"), parade(["violin", "viola", "cello"])),
  frame("Woodwinds sit in the middle. Brass sits behind them. Percussion is at the very back!", instShow("flute", "trumpet", "timpani"), parade(["flute", "trumpet", "timpani"])),
  frame("Meet the cello: deep and warm, like a singing voice. Now it's in your Studio!", instShow("cello"), tuneOf([48, 52, 55, 60, 57, 55, 52, 48], [1, 0.5, 0.5, 2, 1, 0.5, 0.5, 2], "cello", 80)),
], "u:family:seating-idea");

const STRING_TOPICS = [famHighLow, stringSort, whichStrings, famOf];
const WIND_TOPICS = [whichWinds, famHighLow, famOf, whichStrings, windSort];
const PERC_TOPICS = [percSort, whichPerc, conductorFacts, conductT, percEar, famOf];
const ORCHESTRA: WorldDef = {
  id: "g3-orchestra",
  title: "Orchestra Odyssey",
  emoji: "🎻",
  grade: "3",
  theme: "deep",
  items: 7,
  blurb: "Meet the orchestra family by family: who plays high, who plays low, where everyone sits, and how the conductor leads them all.",
  talk: ["If you could play one orchestra instrument, which would it be, and why?", "Why do you think the biggest instruments play the lowest notes?"],
  challenge: "Watch a video of an orchestra. Point to the strings, woodwinds, brass and percussion. Can you spot the conductor's baton?",
  stages: [
    {
      title: "The string family",
      emoji: "🎻",
      levels: 1,
      topics: STRING_TOPICS,
      fixed: (r) => lvl(r, [STRINGS_IDEA, [famHighLow, 0], [stringSort, 0], [whichStrings, 0], [famHighLow, 0.5], [whichStrings, 0.5], [famOf, 0.5]]),
    },
    { title: "Winds and brass", emoji: "🎺", levels: 2, topics: WIND_TOPICS, fixed: teachStage(2, 7, (r) => [WINDS_IDEA, whichWinds.gen(r, 0)], WIND_TOPICS) },
    { title: "Percussion and the conductor", emoji: "🥁", levels: 2, topics: PERC_TOPICS, fixed: teachStage(2, 7, (r) => [PERC_IDEA, conductT.gen(r, 0)], PERC_TOPICS) },
    {
      title: "Take your seats",
      emoji: "💺",
      levels: 1,
      topics: [seatSort, celloCompose, conductT],
      unlocks: ["inst:cello"],
      fixed: (r) => lvl(r, [SEAT_IDEA, [seatSort, 0], celloSong(CELLO_SONGS[0]), [conductT, 1], [famOf, 0.8], celloSong(CELLO_SONGS[1]), [conductorFacts, 0.5]]),
    },
  ],
};

// ── Composer Cove: real composers and their real (public-domain) music ───────────────────────
/** A Mozart-style variation on Twinkle: the tune wrapped in racing sixteenths. */
function mozartRun(): Score {
  const down = (p: number) => [...C_KEYS].reverse().find((c) => c < p) ?? p - 1;
  const ps: number[] = [];
  const ds: number[] = [];
  for (const p of [C4, C4, G4, G4, A4, A4]) { ps.push(p, upStep(p), p, down(p)); ds.push(0.25, 0.25, 0.25, 0.25); }
  ps.push(G4);
  ds.push(2);
  return melody(ps, ds, "piano", 92);
}
/** Grieg's Mountain King, louder and faster as it goes. */
const mountainBuild = (): Score => hairpin(tempoRamp(then(songScore("mountainking", { inst: "bassoon", bpm: 92 }), songScore("mountainking", { inst: "bassoon", bpm: 92 }), 0), 2.2), 0.3, 1.15);
type Work = { title: string; sound: () => Score };
const WORKS: Record<string, { name: string; works: Work[] }> = {
  bach: { name: "Bach", works: [{ title: "Minuet in G", sound: () => piece("minuet") }] },
  mozart: { name: "Mozart", works: [{ title: "Variations on Twinkle, Twinkle", sound: () => then(songScore("twinkle", { inst: "piano", n: 7, bpm: 92 }), mozartRun(), 0.5) }] },
  beethoven: { name: "Beethoven", works: [{ title: "Ode to Joy", sound: () => songScore("odetojoy", { inst: "piano", n: 15 }) }, { title: "Für Elise", sound: () => songScore("furelise", { inst: "piano" }) }] },
  grieg: { name: "Grieg", works: [{ title: "In the Hall of the Mountain King", sound: () => songScore("mountainking", { inst: "bassoon" }) }] },
  joplin: { name: "Scott Joplin", works: [{ title: "The Entertainer", sound: () => piece("ragtime") }] },
  sousa: { name: "John Philip Sousa", works: [{ title: "a march", sound: () => piece("march") }] },
};
// The composers meet the child stage by stage, so a question only names composers already met.
const SET1 = ["bach", "mozart", "beethoven"];
const SET2 = [...SET1, "grieg"];
const SET3 = [...SET2, "joplin", "sousa"];
const whoWroteT = (key: string, set: string[]) => topic(key, (r, d) => {
  const ans = pick(r, set);
  const w = pick(r, WORKS[ans].works);
  return listen({
    prompt: d < 0.5 ? `This is ${w.title}. Who wrote it?` : "Listen. Which composer wrote this music?",
    sound: w.sound(),
    options: shuffle(r, [ans, ...pickN(r, set, 2, (x) => x === ans)]).map((k) => opt(k, WORKS[k].name)),
    answer: ans,
    skill: "u:composer:ear",
    why: `That was ${w.title}, by ${WORKS[ans].name}.`,
  });
});
const whoWrote1 = whoWroteT("g3-who-wrote-1", SET1);
const whoWrote2 = whoWroteT("g3-who-wrote-2", SET2);
const whoWrote = whoWroteT("g3-who-wrote", SET3);
const FACTS: { q: string; a: string; w: string[]; why: string; stage: number }[] = [
  { stage: 1, q: "Who kept writing music even after he lost his hearing?", a: "Beethoven", w: ["Mozart", "Bach"], why: "Beethoven wrote his Ninth Symphony, with the Ode to Joy, when he was almost completely deaf." },
  { stage: 1, q: "Who wrote his first music when he was only 5 years old?", a: "Mozart", w: ["Bach", "Beethoven"], why: "Mozart wrote little pieces at 5 and toured Europe as a child star." },
  { stage: 1, q: "Who had 20 children, and many of them became musicians?", a: "Bach", w: ["Beethoven", "Mozart"], why: "Johann Sebastian Bach had 20 children. Several became famous composers too!" },
  { stage: 1, q: "Who wrote the Ode to Joy?", a: "Beethoven", w: ["Bach", "Mozart"], why: "The Ode to Joy comes from Beethoven's Ninth Symphony (1824)." },
  { stage: 1, q: "Which composer was born first, long ago?", a: "Bach (born 1685)", w: ["Mozart (born 1756)", "Beethoven (born 1770)"], why: "Bach was born in 1685, Mozart in 1756, and Beethoven in 1770." },
  { stage: 1, q: "Which composer loved the clarinet, a new instrument in his time?", a: "Mozart", w: ["Bach", "Beethoven"], why: "Mozart wrote a famous Clarinet Concerto in 1791, the last year of his life." },
  { stage: 2, q: "Whose music tells about a troll king deep inside a mountain?", a: "Edvard Grieg", w: ["Mozart", "Bach"], why: "Grieg wrote In the Hall of the Mountain King for a play called Peer Gynt." },
  { stage: 2, q: "Which country was Edvard Grieg from?", a: "Norway", w: ["Germany", "Austria"], why: "Grieg was from Norway. Bach and Beethoven were German, and Mozart was from Austria." },
  { stage: 2, q: "Who wrote Für Elise?", a: "Beethoven", w: ["Grieg", "Bach"], why: "Beethoven wrote Für Elise around 1810. Nobody is sure who Elise was!" },
  { stage: 3, q: "Who was called the King of Ragtime?", a: "Scott Joplin", w: ["Bach", "Grieg"], why: "Scott Joplin wrote The Entertainer and the Maple Leaf Rag." },
  { stage: 3, q: "Who was called the March King?", a: "John Philip Sousa", w: ["Mozart", "Grieg"], why: "Sousa wrote The Stars and Stripes Forever, the national march of the United States." },
  { stage: 3, q: "Who was the first Black woman to have her symphony played by a major American orchestra?", a: "Florence Price", w: ["Scott Joplin", "Mozart"], why: "In 1933 the Chicago Symphony Orchestra played Florence Price's Symphony No. 1." },
  { stage: 3, q: "The sousaphone, a giant tuba that wraps around the player, is named after which composer?", a: "John Philip Sousa", w: ["Scott Joplin", "Beethoven"], why: "It was built for Sousa's band, so it was named after him!" },
];
const composerFactsT = (key: string, stage: number) => topic(key, (r) => {
  const f = pick(r, FACTS.filter((x) => x.stage <= stage));
  return seeChoice({ prompt: f.q, options: textOpts(r, f.a, f.w), answer: f.a, skill: "u:composer:facts", why: f.why, layout: "list" });
});
const composerFacts1 = composerFactsT("g3-composer-facts-1", 1);
const composerFacts2 = composerFactsT("g3-composer-facts-2", 2);
const composerFacts = composerFactsT("g3-composer-facts", 3);
const WORK_PAIRS: [string, string, string][] = [["bach", "Bach", "Minuet in G"], ["beethoven", "Beethoven", "Ode to Joy"], ["mozart", "Mozart", "Twinkle Variations"], ["grieg", "Grieg", "Mountain King"], ["joplin", "Scott Joplin", "The Entertainer"], ["sousa", "Sousa", "Stars and Stripes Forever"]];
const composerMatchT = (key: string, set: string[]) => topic(key, (r): Activity => {
  const pairs = pickN(r, WORK_PAIRS.filter(([k]) => set.includes(k)), 4);
  return { kind: "match", prompt: "Match each composer to their music.", pairs: pairs.map(([, a, b]) => ({ a: { id: a, text: a }, b: { id: b, text: b } })), mode: "columns", skill: "u:composer:works" };
});
const composerMatch1 = composerMatchT("g3-composer-match-1", SET1);
const composerMatch = composerMatchT("g3-composer-match", SET3);
const BORN: [string, string, number][] = [["bach", "Bach", 1685], ["mozart", "Mozart", 1756], ["beethoven", "Beethoven", 1770], ["grieg", "Grieg", 1843], ["sousa", "Sousa", 1854], ["joplin", "Scott Joplin", 1868], ["price", "Florence Price", 1887]];
const timelineT = (key: string, set: string[]) => topic(key, (r): Activity => {
  const who = pickN(r, BORN.filter(([k]) => set.includes(k)), 4).sort((a, b) => a[2] - b[2]);
  return { kind: "order", prompt: "Put the composers in order, from the one born first to the one born last.", items: who.map(([k, name, year]) => ({ id: k, text: `${name} (${k === "joplin" ? "about " : ""}${year})` })), direction: "column", skill: "u:history:composers" };
});
const timeline1 = timelineT("g3-timeline-1", SET1);
const timeline = timelineT("g3-timeline", [...SET3, "price"]);
const mountainChange = topic("g3-mountain-change", (r) => {
  const grow = r() < 0.6;
  const theme = songScore("mountainking", { inst: "bassoon", bpm: 92 });
  return listen({
    prompt: "Listen to the Mountain King. What happens to the music as it goes on?",
    sound: grow ? mountainBuild() : hairpin(tempoRamp(then(theme, theme, 0), 0.75), 1, 0.35),
    options: [opt("grow", "It gets faster and louder"), opt("shrink", "It gets slower and softer"), opt("same", "It stays the same")],
    answer: grow ? "grow" : "shrink",
    skill: "u:tempo:changes",
    why: "Getting faster is called accelerando. Getting louder is called crescendo. Grieg uses both to build excitement!",
  });
});
const MOODS: [string, string, string, () => Score][] = [
  ["Für Elise", "minor", "beethoven", () => songScore("furelise", { inst: "piano" })],
  ["the Mountain King", "minor", "grieg", () => songScore("mountainking", { inst: "bassoon" })],
  ["the Ode to Joy", "major", "beethoven", () => songScore("odetojoy", { inst: "piano", n: 15 })],
  ["the Minuet in G", "major", "bach", () => songScore("minuet", { inst: "piano", n: 16 })],
  ["The Entertainer", "major", "joplin", () => songScore("entertainer", { inst: "piano" })],
];
const composerMoodT = (key: string, set: string[]) => topic(key, (r) => {
  const [title, mode, , sound] = pick(r, MOODS.filter(([, , k]) => set.includes(k)));
  return listen({ prompt: `Is ${title} in a major key (bright) or a minor key (darker)?`, sound: sound(), options: [opt("major", "Major (bright)"), opt("minor", "Minor (darker)")], answer: mode, skill: "u:major-minor:composers", why: "Major keys usually sound bright. Minor keys sound darker or more mysterious." });
});
const composerMood2 = composerMoodT("g3-composer-mood-2", SET2);
const composerMood = composerMoodT("g3-composer-mood", SET3);
const conductMountain = topic("g3-conduct-mountain", (): Activity => ({ kind: "conduct", prompt: "Be Grieg's conductor! The trolls want it FASTER. Tap the baton quickly to speed up the Mountain King to Presto!", goal: { tempo: [150, 200] }, music: songScore("mountainking", { inst: "bassoon", bpm: 96 }), word: "Presto", skill: "u:conduct:tempo" }));
const styleClassic = topic("g3-style-classic", (r) => styleEar(r, { pool: ["march", "ragtime", "minuet", "waltz", "chorale"], prompt: "What kind of music is this?", skill: "u:genre:classic" }));
const marchBand = (bpm = 112): Score => layer(progression(["I", "IV", "V", "I"], C4, "major", { bpm, per: 2, inst: "piano", style: "oompah" }), groove("march", 4, bpm));
const minuetBand = (bpm = 120): Score => progression(["I", "V7", "V7", "I"], C4, "major", { bpm, per: 3, inst: "piano", style: "waltz", meter: [3, 4] });
const COMPOSER_SONGS: (() => Activity)[] = [
  () => compose({ prompt: "Write a march tune, like Sousa! Use at least one big leap, and start and end on C.", pitches: C_KEYS, slots: 8, inst: "trumpet", labels: "letters", bpm: 112, rules: [{ rule: "leap", min: 3 }, { rule: "start", p: C4 }, { rule: "end", p: C4 }], backing: marchBand(112), skill: "u:compose:style" }),
  () => compose({ prompt: "Write a minuet tune in 3, like the Bach family notebook. It's 4 bars of three-four. End on C.", pitches: C_KEYS, slots: 12, inst: "harp", labels: "letters", bpm: 120, rules: [{ rule: "end", p: C4 }, { rule: "notes", min: 9 }], backing: minuetBand(120), skill: "u:compose:style" }),
  () => compose({ prompt: "Write a Mozart-style variation: a smooth tune of steps that begins on C and ends on G.", pitches: C_KEYS, slots: 8, inst: "clarinet", labels: "letters", rules: [{ rule: "steps" }, { rule: "start", p: C4 }, { rule: "end", p: G4 }], skill: "u:compose:style" }),
];
const composerCompose = topic("g3-composer-compose", (r) => pick(r, COMPOSER_SONGS)());

const OLD_MASTERS_IDEA = idea("Bach, Mozart and Beethoven", [
  frame("Johann Sebastian Bach lived in Germany about 300 years ago. This Minuet in G comes from a music notebook his family shared.", picsShow("📜"), piece("minuet")),
  frame("Wolfgang Amadeus Mozart wrote his first music at age 5! He wrote 12 variations on the tune we call Twinkle, Twinkle.", picsShow("🌟"), then(songScore("twinkle", { inst: "piano", n: 7, bpm: 92 }), mozartRun(), 0.5)),
  frame("Ludwig van Beethoven kept writing music even after he lost his hearing. This is his Ode to Joy.", picsShow("🎹"), songScore("odetojoy", { inst: "piano", n: 15 })),
  frame("Bach was born in 1685, Mozart in 1756, and Beethoven in 1770. Their music is still played every day!", picsShow("🎼"), piece("minuet", { bpm: 132 })),
], "u:composer:idea");
const STORIES_IDEA = idea("Stories in sound", [
  frame("Edvard Grieg, from Norway, wrote music for a play about trolls: In the Hall of the Mountain King.", picsShow("🏔️"), songScore("mountainking", { inst: "bassoon" })),
  frame("It starts slow and quiet, then gets faster and LOUDER as the trolls get angrier. Run!", picsShow("⛰️"), mountainBuild()),
  frame("Beethoven's Für Elise rocks back and forth between two notes. It's in a minor key, so it sounds thoughtful.", picsShow("🎹"), songScore("furelise", { inst: "piano" })),
], "u:composer:stories-idea");
const AMERICA_IDEA = idea("American music makers", [
  frame("Scott Joplin was the King of Ragtime. Ragtime's bouncy rhythms helped lead to jazz!", picsShow("🎹"), piece("ragtime")),
  frame("John Philip Sousa was the March King. He wrote The Stars and Stripes Forever, the national march of the United States.", picsShow("🎺"), piece("march")),
  frame("Florence Price was the first Black woman to have her symphony played by a major American orchestra, in 1933. She loved spirituals like this one.", picsShow("🎻"), songScore("saints", { inst: "piano", bpm: 120 })),
], "u:composer:america-idea");
const NOTEBOOK_IDEA = idea("Composer's notebook", [
  frame("Every composer keeps a notebook of tunes. Now it's your turn to write like the masters!", picsShow("📒"), piece("minuet")),
  frame("A march needs strong steps and big leaps, with an oom-pah band underneath.", picsShow("🎺"), marchBand(112)),
  frame("Meet the clarinet, the instrument Mozart loved. Now it's in your Studio!", instShow("clarinet"), instTune("clarinet")),
], "u:composer:notebook-idea");

const MASTER_TOPICS = [whoWrote1, composerFacts1, timeline1, composerMatch1];
const STORY_TOPICS = [mountainChange, conductMountain, composerMood2, whoWrote2, composerFacts2];
const AMERICA_TOPICS = [styleClassic, whoWrote, composerFacts, composerMatch, timeline, composerMood];
const COMPOSER_COVE: WorldDef = {
  id: "g3-composer-cove",
  title: "Composer Cove",
  emoji: "📜",
  grade: "3",
  theme: "sky",
  items: 7,
  blurb: "Meet Bach, Mozart, Beethoven, Grieg, Scott Joplin, Sousa and Florence Price, and hear their real music. Then write like them!",
  talk: ["Which composer's music did you like best? What did it make you imagine?", "Beethoven kept composing after he lost his hearing. How do you think he did it?"],
  challenge: "Ask a grown-up to play a piece by one of today's composers (Ode to Joy, The Entertainer, the Mountain King…). Dance or draw while you listen!",
  stages: [
    {
      title: "Bach, Mozart and Beethoven",
      emoji: "📜",
      levels: 1,
      topics: MASTER_TOPICS,
      fixed: (r) => lvl(r, [OLD_MASTERS_IDEA, [whoWrote1, 0], [composerFacts1, 0], [timeline1, 0], [whoWrote1, 0.3], [composerMatch1, 0], [composerFacts1, 0.5]]),
    },
    { title: "Stories in sound", emoji: "🏔️", levels: 2, topics: STORY_TOPICS, fixed: teachStage(2, 7, (r) => [STORIES_IDEA, conductMountain.gen(r, 0)], STORY_TOPICS) },
    { title: "American music makers", emoji: "🎺", levels: 2, topics: AMERICA_TOPICS, fixed: teachStage(2, 7, (r) => [AMERICA_IDEA, styleClassic.gen(r, 0)], AMERICA_TOPICS) },
    {
      title: "Composer's notebook",
      emoji: "📒",
      levels: 1,
      topics: [composerCompose, composerMatch],
      unlocks: ["inst:clarinet"],
      fixed: (r) => lvl(r, [NOTEBOOK_IDEA, COMPOSER_SONGS[0](), [whoWrote, 0.8], COMPOSER_SONGS[1](), [composerMatch, 0.5], COMPOSER_SONGS[2](), [composerFacts, 0.9]]),
    },
  ],
};

// ── Showcase Studio (3rd grade capstone): a melody on the staff + a sixteenth-note rhythm ────
const SHOW_SONGS: { prompt: string; rules: ComposeRule[] }[] = [
  { prompt: "Write your 2-bar melody! Start on C, end on C, and use E and G along the way.", rules: [{ rule: "start", p: C4 }, { rule: "end", p: C4 }, { rule: "use", pitches: [E4, G4] }] },
  { prompt: "Write a 2-bar melody that climbs to its highest note in the middle, then comes home to C.", rules: [{ rule: "arch" }, { rule: "end", p: C4 }] },
  { prompt: "Write a 2-bar melody with a motif: make your first 2 notes come back later. End on C.", rules: [{ rule: "repeat", len: 2 }, { rule: "end", p: C4 }, { rule: "notes", min: 6 }] },
];
const showSong = (s: (typeof SHOW_SONGS)[number], inst: InstId = "piano"): Activity => compose({ prompt: s.prompt, pitches: C_KEYS, slots: 8, inst, labels: "letters", rules: s.rules, backing: band(8, 96, { drums: { kick: "x...x...", snare: "..x...x.", hat: "xxxxxxxx" }, bass: [48, 55] }), bpm: 96, skill: "u:compose:melody" });
const showCompose = topic("g3-show-compose", (r) => showSong(pick(r, SHOW_SONGS), pick(r, ["piano", "bells", "clarinet", "harp"] as InstId[])));
const PLAN_IDEA = idea("Plan your piece", [
  frame("A composer's piece starts with a melody, written on the staff with letter names.", staffShow([C4, E4, G4, E4, F4, D4, C4].map((p, i) => ({ p, d: i === 6 ? 2 : 1 })), "treble", { labels: "letters" }), tuneOf([C4, E4, G4, E4, F4, D4, C4], [1, 1, 1, 1, 1, 1, 2], "piano", 96)),
  frame("Then a rhythm that moves. Sixteenths make it race; long notes let it breathe.", rhythmShow(["tika", "ta", "titika", "taa", "tikati", "ta"], "notes", true, [4, 4]), withClicks(["tika", "ta", "titika", "taa", "tikati", "ta"], 72)),
  frame("Put them together with a band and you have a piece. Let's write yours!", picsShow("🎧"), layer(tuneOf([C4, E4, G4, E4, F4, D4, C4], [1, 1, 1, 1, 1, 1, 2], "piano", 96), band(8, 96, { drums: { kick: "x...x...", snare: "..x...x.", hat: "xxxxxxxx" }, bass: [48, 55] }))),
], "u:compose:plan-idea");
const PREMIERE_IDEA = idea("Premiere!", [
  frame("A premiere is the very first time a piece is played for an audience. This is yours!", picsShow("🎉"), fanfare()),
  frame("Your Studio can now hold notes long, like ta-a and whole notes. Let your melody sing!", sym("whole", "hold it!"), tuneOf([C4, E4, G4, C5], [1, 1, 2, 4], "clarinet", 96)),
  frame("Write your melody and your rhythm. Then share them with your family!", picsShow("🎤"), layer(tuneOf([E4, G4, A4, G4, E4, D4, C4], [1, 0.5, 0.5, 1, 1, 1, 3], "bells", 96), band(8, 96, { drums: { kick: "x...x...", snare: "..x...x.", hat: "xxxxxxxx" }, bass: [48, 55] }))),
], "u:compose:premiere-idea");
const SHOW_PLAN_TOPICS = [trailSpell, sxDictation, trailRead, trailName];
const SHOW_DRAFT_TOPICS = [showCompose, sxCreate, trailSpell, sxBeat, letterCompose, trailName];
const SHOWCASE: WorldDef = {
  id: "g3-showcase",
  title: "Showcase Studio",
  emoji: "🎧",
  grade: "3",
  theme: "candy",
  items: 7,
  blurb: "Your own piece: a 2-bar melody with real letter names, a sixteenth-note rhythm and a beat. Then the premiere!",
  talk: ["What would you name your piece?", "Who would you like to play your piece for first?"],
  challenge: "Perform your Showcase piece for your family. Tell them the letter names of your melody!",
  stages: [
    {
      title: "Plan your piece",
      emoji: "📋",
      levels: 1,
      topics: SHOW_PLAN_TOPICS,
      fixed: (r) => lvl(r, [PLAN_IDEA, [trailSpell, 0.3], [sxDictation, 0.3], [trailRead, 0.3], [trailName, 0.6], [sxDictation, 0.8], [trailSpell, 0.7]]),
    },
    { title: "Drafts", emoji: "📝", levels: 2, topics: SHOW_DRAFT_TOPICS },
    {
      title: "Premiere!",
      emoji: "🎉",
      levels: 1,
      topics: [showCompose, sxCreate],
      unlocks: ["tool:holds"],
      fixed: (r) => lvl(r, [PREMIERE_IDEA, showSong(SHOW_SONGS[0]), SX_CREATE[0](), showSong(SHOW_SONGS[2], "clarinet"), SX_BEATS[0](), [sxCreate, 0.6], showSong(SHOW_SONGS[1], "harp")]),
    },
  ],
};

export const WORLDS: WorldDef[] = [LA_LAGOON, HALF_HAVEN, DO_RE_MI_RIDGE, METER_MARSH, FORM_FJORD, STAFF_STATION, SONG_STUDIO, TREBLE_TRAIL, SIXTEENTH_SURF, PIANO_PIER, RONDO_REEF, ORCHESTRA, COMPOSER_COVE, SHOWCASE];
