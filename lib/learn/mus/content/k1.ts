import type { Activity } from "../../types";
import type { WorldDef } from "../../gen";
import { int, pick, pickN, shuffle, type Rng } from "../../gen";
import type { DrumId, InstId, MOption, MTrack, Score } from "../types";
import { INSTRUMENTS, isInst, soundName } from "../catalog";
import { intoBars, scale } from "../theory";
import { beat, clicks, groove, hairpin, layer, melody, note1, progression, rhythm, rhythmDurs, tempoRamp, then, tune, withGain } from "../score";
import { piece, type PieceId } from "../pieces";
import { song, songScore } from "../songs";
import { beatTap, beatsShow, bellsShow, contour, echo, fastSlow, frame, idea, instOpt, instShow, keysShow, ladderShow, listen, longShort, loudSoft, majorMinor, meterEar, nearCells, opt, picOpt, picsShow, randomCells, readRhythm, rhythmMatch, rhythmShow, solfegeMatch, soundOpt, topic, whichFamily } from "../make";

// Music for Kindergarten and 1st grade — pictures and voice, no reading needed. The steady beat,
// loud and soft, fast and slow, high and low, long and short, sound and silence, instruments, and
// a first taste of making songs (Beat Lab, three bells). 1st grade starts reading rhythm: ta, ti-ti,
// the quarter rest, so and mi, beat vs. rhythm, the four instrument families, and how music feels.
//
// Every level TEACHES first (an "idea" explainer with sound), then practices, then lets the child
// make something with it. Skill keys "u:<family>[:<detail>]".

// ── Shared helpers ─────────────────────────────────────────────────────────────────────────────
type Snd = InstId | DrumId;
const coin = (r: Rng) => r() < 0.5;
/** Every note and hit at another loudness (so a loud part and a soft part can live in ONE sound —
 *  withGain changes a whole score). */
function atVol(s: Score, k: number): Score {
  return {
    ...s,
    tracks: s.tracks.map((t) => (t.kind === "notes" ? { ...t, notes: t.notes.map((x) => ({ ...x, v: Math.min(1, (x.v ?? 0.8) * k) })) } : { ...t, hits: t.hits.map((h) => ({ ...h, v: Math.min(1, (h.v ?? 0.8) * k) })) })),
  };
}
/** Two sounds to compare, labelled in the order they're heard. */
const pair = (a: Score, b: Score): MOption[] => [soundOpt("a", a, "First", { emoji: "1️⃣" }), soundOpt("b", b, "Second", { emoji: "2️⃣" })];
/** How each drum shows off (one bar of eighths). */
const DRUM_LINE: Partial<Record<DrumId, string>> = {
  snare: "x.x.x.xx", kick: "x...x.x.", bassdrum: "x...x...", tom: "x.x.xx.x", lowtom: "x..x..x.", shaker: "xxxxxxxx", maracas: "xxxxxxxx", tamb: "x.x.xxx.",
  triangle: "x...x...", block: "x.x.x.x.", bongo: "x.xx.xx.", conga: "x..x..x.", cymbals: "x.......", cowbell: "x.x.x.x.", hat: "xxxxxxxx", clap: "..x...x.",
  stomp: "x...x...", sticks: "x.x.x.x.", gong: "x.......",
};
/** A drum (or two) playing a line — `rows` like { kick: "x...x..." }, eighth-note steps. */
function drums(rows: Partial<Record<DrumId, string>>, bpm = 100, times = 2): Score {
  return beat(rows, { bpm, per: 2, times });
}
/** A short phrase that shows off any instrument or drum, in its own range. */
function demo(id: Snd, bpm = 100): Score {
  if (isInst(id)) {
    const info = INSTRUMENTS[id];
    const lo = Math.max(info.lo + 2, Math.min(info.hi - 14, 60));
    const ps = scale(lo, "major", 1).slice(0, 5);
    return melody([...ps, ps[2], ps[0]], [0.5, 0.5, 0.5, 0.5, 1, 0.5, 1.5], id, bpm);
  }
  const rows: Partial<Record<DrumId, string>> = {};
  rows[id] = DRUM_LINE[id] ?? "x.x.x.x.";
  return drums(rows, bpm);
}

/** Just the first `beats` beats of a sound (so long pieces stay short for little ears). */
function cut(s: Score, beats: number): Score {
  return {
    ...s,
    tracks: s.tracks.flatMap((t): MTrack[] => {
      if (t.kind === "drums") {
        const hits = t.hits.filter((h) => h.t < beats - 1e-6);
        return hits.length ? [{ ...t, hits }] : [];
      }
      let at = t.at ?? 0;
      const notes: typeof t.notes = [];
      for (const x of t.notes) {
        if (at >= beats - 1e-6) break;
        notes.push({ ...x, d: Math.min(x.d, beats - at) });
        at += x.d;
      }
      return notes.length ? [{ ...t, notes }] : [];
    }),
  };
}

// ── Beat Beach (K): the steady beat ────────────────────────────────────────────────────────────
const steadyDrum = (bpm = 92) => beat({ kick: "x.x.x.x." }, { bpm, per: 2, times: 2 });
/** Hits that wander — no steady beat. */
const messyDrum = (r: Rng) => rhythmDurs(pick(r, [[0.7, 0.4, 1.5, 0.3, 1.1, -0.5, 2.1], [0.3, 1.6, 0.5, 0.9, 0.2, 1.8, 1.2], [1.2, 0.3, 0.3, 2.0, 0.6, 1.4]]), { bpm: 92, drum: "kick" });
const steadyOrNot = topic("beat-steady", (r) => {
  const order = r() < 0.5;
  const a = soundOpt("steady", steadyDrum(pick(r, [84, 96, 108])), "First", { emoji: "1️⃣" });
  const b = soundOpt("messy", messyDrum(r), "Second", { emoji: "2️⃣" });
  return listen({
    prompt: "Which one has a steady beat?",
    options: order ? [a, { ...b, text: "Second", emoji: "2️⃣" }] : [{ ...b, text: "First", emoji: "1️⃣" }, { ...a, text: "Second", emoji: "2️⃣" }],
    answer: "steady",
    skill: "u:beat:steady",
    why: "A steady beat keeps going evenly — tick, tock, tick, tock — like a clock or your heartbeat.",
  });
});
const beatOrNoBeat = topic("beat-or-not", (r) => {
  const has = r() < 0.5;
  const sound = has ? piece(pick(r, ["march", "polka", "happy"] as const), { bpm: 104 }) : piece("mysterious", { bpm: 60 });
  return listen({ prompt: "Can you march to this music? Does it have a steady beat?", sound, options: [picOpt("yes", "🥁", "Steady beat"), picOpt("no", "☁️", "No beat")], answer: has ? "yes" : "no", skill: "u:beat:feel" });
});
const tapBeat = topic("beat-tap", (r, d) => beatTap({ music: piece(pick(r, ["march", "polka", "happy", "country"] as const), { bpm: Math.round(96 + d * 16) }), beats: 8, scaffold: d < 0.6 }));
/** Beat Lab, 4 squares: fill the beat, boom-clap, copy a beat by ear, or make your own. */
const K_BEATS: [string, string][] = [["x.x.", ".x.x"], ["xx..", "..xx"], ["x...", ".xxx"], ["x.xx", ".x.."], ["xxx.", "...x"]];
const beatMake = topic("beat-make", (r) =>
  pick(r, [
    (): Activity => ({ kind: "beatlab", mode: "make", prompt: "Put a drum on every beat!", rows: ["kick"], steps: 4, bpm: pick(r, [88, 96, 104]), rules: [{ rule: "on", row: "kick", steps: [0, 1, 2, 3] }], skill: "u:beatmaking:steady" }),
    (): Activity => ({ kind: "beatlab", mode: "make", prompt: "Boom, clap, boom, clap! Drum on 1 and 3, clap on 2 and 4.", rows: ["kick", "clap"], steps: 4, bpm: 92, rules: [{ rule: "on", row: "kick", steps: [0, 2] }, { rule: "on", row: "clap", steps: [1, 3] }], skill: "u:beatmaking:steady" }),
    (): Activity => {
      const target = pick(r, K_BEATS);
      return { kind: "beatlab", mode: "copy", prompt: "Listen to the beat. Can you make the same one?", rows: ["kick", "clap"], steps: 4, bpm: 92, target: [...target], skill: "u:beatmaking:copy" };
    },
    (): Activity => ({ kind: "beatlab", mode: "make", prompt: "Make your own beat! Use the drum AND the clap.", rows: ["kick", "clap"], steps: 4, bpm: 96, rules: [{ rule: "count", row: "kick", min: 1 }, { rule: "count", row: "clap", min: 1 }], skill: "u:beatmaking:create" }),
  ])(),
);

const BEAT_IDEA: Activity = idea("The beat", [
  frame("Music has a beat. It goes on and on, steady, like your heartbeat.", beatsShow(4, [], "❤️"), steadyDrum(84)),
  frame("Listen! The drum plays the beat while the song goes.", beatsShow(4), layer(songScore("twinkle", { bpm: 92, n: 7, inst: "bells" }), beat({ kick: "x.x.x.x." }, { bpm: 92, per: 2, times: 2 }))),
  frame("Now you! Tap the drum on the beat.", beatsShow(4), piece("march", { bpm: 100 }), "drum"),
], "u:beat:idea");
const LAB_IDEA: Activity = idea("The Beat Lab", [
  frame("This is the Beat Lab. Each square is one beat.", { show: "grid", rows: ["kick"], pattern: ["x..."] }, beat({ kick: "x..." }, { bpm: 92, per: 1, times: 2 })),
  frame("Tap a square to put a drum there. Tap it again to take it away.", { show: "grid", rows: ["kick"], pattern: ["x.x."] }, beat({ kick: "x.x." }, { bpm: 92, per: 1, times: 2 })),
  frame("Fill every square, and the drum plays the steady beat!", { show: "grid", rows: ["kick"], pattern: ["xxxx"] }, beat({ kick: "xxxx" }, { bpm: 92, per: 1, times: 2 })),
], "u:beat:idea");

const BEAT_BEACH: WorldDef = {
  id: "beat-beach",
  title: "Beat Beach",
  emoji: "🥁",
  grade: "k",
  items: 5,
  blurb: "Feel the steady beat — like a heartbeat!",
  talk: ["Can you clap the beat of your favorite song?", "What else has a steady beat? (A clock, your heart, footsteps…)"],
  challenge: "March around the room to a song and stomp on every beat!",
  stages: [
    {
      title: "Meet the beat",
      emoji: "❤️",
      levels: 1,
      topics: [steadyOrNot, beatOrNoBeat, tapBeat],
      intros: ["Every song has a heartbeat. Let's find it!"],
      fixed: (r) => [BEAT_IDEA, steadyOrNot.gen(r, 0), tapBeat.gen(r, 0), beatOrNoBeat.gen(r, 0.3), tapBeat.gen(r, 0.3)],
    },
    { title: "Beat walk", emoji: "👣", levels: 2, topics: [tapBeat, steadyOrNot, beatOrNoBeat], items: 5 },
    {
      title: "Beat Lab",
      emoji: "🎛️",
      levels: 1,
      topics: [beatMake, tapBeat],
      unlocks: ["drum:shaker"],
      fixed: () => [
        LAB_IDEA,
        { kind: "beatlab", mode: "make", prompt: "Put a drum on every beat!", rows: ["kick"], steps: 4, bpm: 92, rules: [{ rule: "on", row: "kick", steps: [0, 1, 2, 3] }], skill: "u:beatmaking:steady" },
        { kind: "beatlab", mode: "make", prompt: "Boom, clap, boom, clap! Drum on 1 and 3, clap on 2 and 4.", rows: ["kick", "clap"], steps: 4, bpm: 92, rules: [{ rule: "on", row: "kick", steps: [0, 2] }, { rule: "on", row: "clap", steps: [1, 3] }], skill: "u:beatmaking:steady" },
        { kind: "beatlab", mode: "copy", prompt: "Listen to the beat. Can you make the same one?", rows: ["kick", "clap"], steps: 4, bpm: 92, target: ["x.x.", ".x.x"], skill: "u:beatmaking:copy" },
        { kind: "beatlab", mode: "make", prompt: "Make your own beat! Use the drum AND the clap.", rows: ["kick", "clap"], steps: 4, bpm: 96, rules: [{ rule: "count", row: "kick", min: 1 }, { rule: "count", row: "clap", min: 1 }], skill: "u:beatmaking:create" },
      ],
    },
  ],
};

// ── Loud & Soft Lagoon (K): dynamics ───────────────────────────────────────────────────────────
const LS_TUNES = [[60, 64, 67, 72, 67, 64, 60, 60], [67, 65, 64, 62, 60, 62, 64, 64], [60, 60, 67, 67, 69, 69, 67, 67], [64, 62, 60, 62, 64, 64, 64, 64]];
const LS_INSTS: InstId[] = ["piano", "trumpet", "marimba", "xylophone"];
const lsTune = (r: Rng, inst: InstId = pick(r, LS_INSTS)) => melody(pick(r, LS_TUNES), 0.5, inst, 104);
/** Any card's sound: a tune for an instrument, a groove for a drum. */
const lsSound = (r: Rng, id: Snd) => (isInst(id) ? lsTune(r, id) : demo(id, 104));
const stompBeat = (bpm = 100) => drums({ stomp: "x.x.x.x.", clap: "..x...x." }, bpm);

const LOUD_IDEA = idea("Loud and soft", [
  frame("Music can be LOUD — big and strong, like a stomping elephant!", picsShow("🐘"), withGain(stompBeat(), 1.2)),
  frame("Music can be soft — tiny and gentle, like a tiptoeing mouse.", picsShow("🐭"), withGain(melody([72, 76, 79, 76, 72, 76, 79, 84], 0.5, "musicbox", 100), 0.22)),
  frame("Here's the same song. First it's loud… then it's soft. Hear the change?", { show: "dynamics", marks: ["f", "p"] }, then(atVol(songScore("twinkle", { n: 7, inst: "piano", bpm: 100 }), 1.25), atVol(songScore("twinkle", { n: 7, inst: "piano", bpm: 100 }), 0.2), 1)),
  frame("Your turn! Stomp your feet like an elephant… now tiptoe like a mouse.", picsShow("🐾"), then(atVol(stompBeat(), 1.25), atVol(stompBeat(), 0.2), 0)),
], "u:dynamics:idea");

const lsHearT = topic("ls-hear", (r, d) => loudSoft(r, d));
const lsWhichT = topic("ls-which", (r, d) => {
  const louder = coin(r);
  const s = lsTune(r);
  const firstLoud = coin(r);
  const hi = 1.1;
  const lo = d < 0.5 ? 0.18 : 0.36;
  return listen({
    prompt: louder ? "Which one is louder?" : "Which one is softer?",
    options: pair(withGain(s, firstLoud ? hi : lo), withGain(s, firstLoud ? lo : hi)),
    answer: louder === firstLoud ? "a" : "b",
    skill: "u:dynamics:compare",
    why: "Loud is big and strong, like an elephant. Soft is tiny and gentle, like a mouse.",
  });
});
const LS_CARDS: Snd[] = ["piano", "trumpet", "marimba", "xylophone", "violin", "flute", "snare", "bongo", "tamb"];
const lsSortT = topic("ls-sort", (r, d) => {
  const ids = pickN(r, LS_CARDS, 4);
  // Later on, every card is the SAME instrument: one instrument can play loud or soft.
  const same = d >= 0.6;
  const loud = shuffle(r, [true, true, false, false]);
  return {
    kind: "soundsort",
    prompt: same ? "Same instrument, different sounds! Tap each card. Is it loud or soft?" : "Tap each card to hear it. Is it loud or soft?",
    bins: [{ id: "loud", label: "Loud", emoji: "🐘" }, { id: "soft", label: "Soft", emoji: "🐭" }],
    items: ids.map((id, i) => {
      const inst = same ? ids[0] : id;
      return { id: `card${i + 1}`, inst, sound: withGain(lsSound(r, inst), loud[i] ? 1.15 : 0.2), bin: loud[i] ? "loud" : "soft" };
    }),
    skill: "u:dynamics:sort",
  };
});
const waveDynT = topic("ls-wave", (r) => {
  const louder = coin(r);
  return {
    kind: "wave",
    mode: louder ? "louder" : "softer",
    prompt: louder ? "Make the sound LOUDER! Slide up and watch the wave grow tall." : "Make the sound softer. Slide down and watch the wave shrink.",
    hz: pick(r, [262, 330, 392]),
    amp: louder ? pick(r, [0.25, 0.35]) : pick(r, [0.8, 0.9]),
    skill: "u:dynamics:wave",
  };
});

/** Getting louder (a crescendo) or softer (a decrescendo), like a wave coming in or going out. */
const swell = (s: Score, up: boolean) => hairpin(s, up ? 0.15 : 1.25, up ? 1.25 : 0.15);
const drumRoll = () => beat({ snare: "xxxxxxxxxxxxxxxx" }, { bpm: 96, per: 4, times: 2 });
const SWELL_SOUNDS: (() => Score)[] = [
  drumRoll,
  () => melody([60, 64, 67, 64, 60, 64, 67, 64, 60, 64, 67, 64], 0.5, "marimba", 100),
  () => melody([67, 67, 67, 67, 67, 67, 67, 67, 67, 67], 0.5, "trumpet", 100),
  () => melody([60, 67, 64, 67, 60, 67, 64, 67, 60, 67, 64, 67], 0.5, "piano", 104),
];
const crescT = topic("ls-cresc", (r) => {
  const up = coin(r);
  return listen({
    prompt: "Is the music getting louder, or getting softer?",
    sound: swell(pick(r, SWELL_SOUNDS)(), up),
    options: [opt("louder", "Getting louder", { show: { show: "dynamics", marks: ["cresc"] } }), opt("softer", "Getting softer", { show: { show: "dynamics", marks: ["decresc"] } })],
    answer: up ? "louder" : "softer",
    skill: "u:dynamics:cresc",
    why: up ? "It grew louder and louder, like a wave rising up!" : "It got softer and softer, like a wave rolling away.",
  });
});
const CRESC_IDEA = idea("Growing waves", [
  frame("Sometimes music grows louder and louder, like a wave rising up high!", { show: "dynamics", marks: ["cresc"] }, swell(drumRoll(), true)),
  frame("Sometimes it gets softer and softer, like a wave rolling away.", { show: "dynamics", marks: ["decresc"] }, swell(melody([72, 67, 64, 67, 72, 67, 64, 67, 72, 67, 64, 60], 0.5, "marimba", 100), false)),
  frame("Listen! The wave comes in… and goes back out.", picsShow("🌊"), then(swell(melody([60, 64, 67, 72, 60, 64, 67, 72], 0.5, "piano", 100), true), swell(melody([72, 67, 64, 60, 72, 67, 64, 60], 0.5, "piano", 100), false), 0)),
], "u:dynamics:idea");

const BAND_PIECES = ["march", "polka", "happy", "country"] as const;
const conductDyn = (r: Rng, loud: boolean): Activity => ({
  kind: "conduct",
  prompt: loud ? "Make the band play LOUD! Lift your hand up high." : "Make the band play softly. Bring your hand down low.",
  goal: { dyn: loud ? [0.78, 1] : [0, 0.3] },
  music: piece(pick(r, BAND_PIECES)),
  skill: "u:conduct:dynamics",
});
const conductDynT = topic("ls-conduct", (r) => conductDyn(r, coin(r)));
const STOMP_COPY: string[][] = [["xx..", "..xx"], ["x.x.", ".x.x"], ["x..x", ".xx."], ["xxx.", "...x"]];
const stompLab = (r: Rng, k: number): Activity =>
  [
    (): Activity => ({ kind: "beatlab", mode: "make", prompt: "Loud stomps on beats 1 and 3. Soft shakes on beats 2 and 4!", rows: ["stomp", "shaker"], steps: 4, bpm: 96, rules: [{ rule: "on", row: "stomp", steps: [0, 2] }, { rule: "on", row: "shaker", steps: [1, 3] }], skill: "u:beatmaking:loud-soft" }),
    (): Activity => ({ kind: "beatlab", mode: "copy", prompt: "Listen: big stomps and little shakes! Can you make the same beat?", rows: ["stomp", "shaker"], steps: 4, bpm: 96, target: [...pick(r, STOMP_COPY)], skill: "u:beatmaking:copy" }),
    (): Activity => ({ kind: "beatlab", mode: "make", prompt: "Make your own lagoon beat! Use the LOUD stomp and the soft shaker.", rows: ["stomp", "shaker"], steps: 4, bpm: 96, rules: [{ rule: "count", row: "stomp", min: 1 }, { rule: "count", row: "shaker", min: 1 }], skill: "u:beatmaking:loud-soft" }),
  ][k]();
const stompLabT = topic("ls-stomp", (r) => stompLab(r, int(r, 0, 2)));
const CONDUCT_IDEA = idea("Be the conductor", [
  frame("A conductor is the leader of the band. The band watches the conductor's hand!", picsShow("🪄"), piece("march")),
  frame("Hand up high? The band plays LOUD.", { show: "dynamics", marks: ["f"] }, withGain(piece("march"), 1.15)),
  frame("Hand down low? The band plays softly.", { show: "dynamics", marks: ["p"] }, withGain(piece("march"), 0.25)),
], "u:conduct:idea");

const LOUD_SOFT: WorldDef = {
  id: "k-loud-soft",
  title: "Loud & Soft Lagoon",
  emoji: "🐘",
  grade: "k",
  items: 5,
  blurb: "Big elephant sounds, tiny mouse sounds — and you're the boss of the volume!",
  talk: ["What's the loudest sound in our house? What's the softest?", "When should music be soft? (At bedtime, when the baby is sleeping…)"],
  challenge: "Sing your favorite song in a tiny mouse voice, then in a big elephant voice!",
  stages: [
    {
      title: "Elephant or mouse?",
      emoji: "🐘",
      levels: 1,
      topics: [lsHearT, lsWhichT],
      intros: ["In the lagoon, elephants are LOUD and mice are soft. Let's listen!"],
      fixed: (r) => [LOUD_IDEA, lsHearT.gen(r, 0), lsWhichT.gen(r, 0), lsSortT.gen(r, 0), lsHearT.gen(r, 0.4)],
    },
    { title: "Lagoon listening", emoji: "👂", levels: 2, topics: [lsHearT, lsWhichT, lsSortT, waveDynT], intros: ["Shh… listen to the lagoon. Loud or soft?", "The lagoon is full of sounds. Can you hear big ones and tiny ones?"] },
    {
      title: "Growing waves",
      emoji: "🌊",
      levels: 1,
      topics: [crescT, lsWhichT, lsHearT],
      intros: ["A wave is coming! Can you hear it grow?"],
      fixed: (r) => [CRESC_IDEA, crescT.gen(r, 0), lsWhichT.gen(r, 0.6), crescT.gen(r, 0.5), waveDynT.gen(r, 0.5)],
    },
    {
      title: "Be the conductor",
      emoji: "🪄",
      levels: 1,
      topics: [conductDynT, stompLabT, waveDynT],
      unlocks: ["drum:stomp"],
      intros: ["The lagoon band needs a leader. That's you!"],
      fixed: (r) => [CONDUCT_IDEA, conductDyn(r, true), conductDyn(r, false), stompLab(r, 0), stompLab(r, 2)],
    },
  ],
};

// ── Fast & Slow Falls (K): tempo ───────────────────────────────────────────────────────────────
const FAST_ANIMALS: [string, string][] = [["🐇", "bunny"], ["🐿️", "squirrel"], ["🐝", "bee"], ["🦘", "kangaroo"]];
const SLOW_ANIMALS: [string, string][] = [["🐢", "turtle"], ["🐌", "snail"], ["🦥", "sloth"]];
const fsPickT = topic("fs-pick", (r, d) => {
  const fast = coin(r);
  const bpm = fast ? int(r, d < 0.5 ? 156 : 138, d < 0.5 ? 176 : 150) : int(r, d < 0.5 ? 56 : 70, d < 0.5 ? 66 : 80);
  const [fe, fw] = pick(r, FAST_ANIMALS);
  const [se, sw] = pick(r, SLOW_ANIMALS);
  return listen({
    prompt: "Is this music fast or slow?",
    sound: cut(piece(pick(r, BAND_PIECES), { bpm }), fast ? 12 : 8),
    options: [picOpt("fast", fe, `Fast, like a ${fw}`), picOpt("slow", se, `Slow, like a ${sw}`)],
    answer: fast ? "fast" : "slow",
    skill: "u:tempo:fast-slow",
    why: fast ? "The beats came quick, quick, quick — that's fast!" : "The beats came one… by… one — that's slow.",
  });
});
const fastSlowT = topic("fs-compare", (r, d) => fastSlow(r, d));
const tapAt = (r: Rng, slow: boolean, d: number): Activity =>
  beatTap({
    music: piece(pick(r, BAND_PIECES), { bpm: slow ? int(r, 66, 76) : int(r, 124, 136) }),
    beats: 8,
    scaffold: d < 0.6,
    prompt: slow ? "Slow music! Tap the drum on every slow beat, like a turtle walking." : "Fast music! Tap quick beats, like a bunny hopping!",
    skill: "u:tempo:tap",
  });
const fsTapT = topic("fs-tap", (r, d) => tapAt(r, coin(r), d));
const fsSortT = topic("fs-sort", (r, d) => {
  // Later on, every card is the SAME instrument — only the speed changes.
  const same = d >= 0.6;
  const fastFlags = shuffle(r, [true, true, false, false]);
  const insts = pickN(r, ["piano", "marimba", "xylophone", "flute", "violin", "trumpet"] as InstId[], 4);
  const ps = pick(r, LS_TUNES);
  return {
    kind: "soundsort",
    prompt: same ? "Same instrument, different speeds! Tap each card. Fast or slow?" : "Tap each card to hear it. Is the music fast or slow?",
    bins: [{ id: "fast", label: "Fast", emoji: "🐇" }, { id: "slow", label: "Slow", emoji: "🐢" }],
    items: fastFlags.map((fast, i) => {
      const inst = same ? insts[0] : insts[i];
      const bpm = fast ? (same ? int(r, 140, 156) : int(r, 170, 200)) : same ? int(r, 66, 80) : int(r, 54, 66);
      return { id: `card${i + 1}`, inst, sound: melody(ps, 0.5, inst, bpm), bin: fast ? "fast" : "slow" };
    }),
    skill: "u:tempo:sort",
  };
});

/** A train that speeds up (or slows down) — tempoRamp stretches the beats. */
const train = (bpm = 80) => drums({ snare: "x.x.x.x.", kick: "x...x..." }, bpm, 3);
const RAMP_BASES: (() => Score)[] = [
  () => melody([60, 64, 67, 64, 60, 64, 67, 64, 60, 64, 67, 64, 60, 64, 67, 64], 0.5, "marimba", 92),
  () => train(92),
  () => melody([67, 65, 64, 62, 60, 62, 64, 65, 67, 65, 64, 62, 60, 62, 64, 65], 0.5, "xylophone", 92),
];
const rampT = topic("fs-ramp", (r) => {
  const up = coin(r);
  return listen({
    prompt: "Is the music speeding up, or slowing down?",
    sound: tempoRamp(pick(r, RAMP_BASES)(), up ? 2.2 : 0.45),
    options: [picOpt("up", "🚀", "Speeding up"), picOpt("down", "🐌", "Slowing down")],
    answer: up ? "up" : "down",
    skill: "u:tempo:ramp",
    why: up ? "The beats got closer and closer together — faster and faster, like a rocket!" : "The beats spread further apart — slower and slower, like a snail.",
  });
});
const conductTempo = (r: Rng, slow: boolean, id: PieceId = pick(r, BAND_PIECES)): Activity => ({
  kind: "conduct",
  prompt: slow ? "Make the band go SLOW, like a turtle! Tap the baton slowly." : "Make the band go FAST, like a bunny! Tap the baton quickly.",
  goal: { tempo: slow ? [50, 82] : [128, 200] },
  music: piece(id, { bpm: slow ? 112 : 96 }),
  skill: "u:conduct:tempo",
});
const conductTempoT = topic("fs-conduct", (r) => conductTempo(r, coin(r)));

const TEMPO_IDEA = idea("Fast and slow", [
  frame("Music can go FAST, like a bunny hopping: hop-hop-hop-hop!", picsShow("🐇"), songScore("twinkle", { n: 7, inst: "xylophone", bpm: 184 })),
  frame("Music can go slow, like a sleepy turtle… step… by… step.", picsShow("🐢"), songScore("twinkle", { n: 7, inst: "xylophone", bpm: 60 })),
  frame("How fast the beat goes is called the tempo. Tick, tock goes the beat!", { show: "tempo", bpm: 100 }, clicks(8, 100)),
  frame("Your turn! Tap the drum fast… now slow.", picsShow("🥁"), undefined, "drum"),
], "u:tempo:idea");
const RAMP_IDEA = idea("Speeding up, slowing down", [
  frame("Here comes the train! It starts slow… then chugs faster and faster!", picsShow("🚂"), tempoRamp(train(), 2.2)),
  frame("Now it slows down… slower… slower… and stops at the station.", picsShow("🚂"), tempoRamp(train(120), 0.45)),
  frame("Music can speed up too! Listen to the band go faster and faster.", picsShow("🎶"), tempoRamp(piece("polka", { bpm: 100 }), 2)),
], "u:tempo:idea");
const BATON_IDEA = idea("The conductor's beat", [
  frame("The conductor taps the beat with a stick called a baton, and the band follows!", picsShow("🪄"), piece("polka", { bpm: 120 })),
  frame("Tap slowly… and the band plays slowly.", { show: "tempo", bpm: 66 }, piece("polka", { bpm: 66 })),
  frame("Tap quickly… and the band zooms along!", { show: "tempo", bpm: 160 }, piece("polka", { bpm: 160 })),
], "u:conduct:idea");

const FAST_SLOW: WorldDef = {
  id: "k-fast-slow",
  title: "Fast & Slow Falls",
  emoji: "🐇",
  grade: "k",
  items: 5,
  blurb: "Hop like a bunny, creep like a turtle — music can go fast or slow!",
  talk: ["Which songs make you want to run? Which make you want to rest?", "Is your heartbeat fast or slow after you run around?"],
  challenge: "Walk around the room to a song — then walk super slow, then super fast!",
  stages: [
    {
      title: "Bunny or turtle?",
      emoji: "🐇",
      levels: 1,
      topics: [fsPickT, fastSlowT, fsTapT],
      intros: ["At the waterfall, bunnies hop fast and turtles creep slow. Let's listen!"],
      fixed: (r) => [TEMPO_IDEA, fsPickT.gen(r, 0), fastSlowT.gen(r, 0), tapAt(r, true, 0), tapAt(r, false, 0.2)],
    },
    { title: "Waterfall walk", emoji: "💦", levels: 2, topics: [fsPickT, fastSlowT, fsTapT, fsSortT], intros: ["Splash! The waterfall music is fast… or is it slow?", "Hop and creep along the waterfall path!"] },
    {
      title: "Speed up, slow down",
      emoji: "🚂",
      levels: 1,
      topics: [rampT, fastSlowT],
      intros: ["All aboard the music train! Can it go faster?"],
      fixed: (r) => [RAMP_IDEA, rampT.gen(r, 0), fastSlowT.gen(r, 0.6), rampT.gen(r, 0.5), fsPickT.gen(r, 0.7)],
    },
    {
      title: "Conductor's beat",
      emoji: "🪄",
      levels: 1,
      topics: [conductTempoT, fsTapT],
      unlocks: ["tool:tempo", "groove:lullaby"],
      intros: ["You hold the baton. The band will play as fast or as slow as YOU say!"],
      fixed: (r) => [
        BATON_IDEA,
        conductTempo(r, true),
        conductTempo(r, false),
        tapAt(r, true, 0.7),
        { kind: "conduct", prompt: "Rock-a-bye! This lullaby is too fast for the baby. Tap the baton slowly to make it gentle and slow.", goal: { tempo: [50, 80] }, music: piece("lullaby", { bpm: 120 }), skill: "u:conduct:tempo" },
      ],
    },
  ],
};

// ── High & Low Lighthouse (K): pitch and melody shape ───────────────────────────────────────────
const HIGH_INSTS: InstId[] = ["flute", "xylophone", "bells", "violin"];
const LOW_INSTS: InstId[] = ["tuba", "cello", "bass", "bassoon"];
/** A little 5-note figure starting on `p`. */
const hlPhrase = (p: number, inst: InstId) => melody([p, p + 4, p + 7, p + 4, p], [0.5, 0.5, 0.5, 0.5, 1], inst, 100);
/** Two notes on one instrument: which is higher (or lower)? Big gaps first, closer later — and
 *  always inside the instrument's range (bells and xylophones start at middle C). */
const HL_PITCHED: InstId[] = ["piano", "bells", "marimba", "flute", "violin", "xylophone"];
function higherLower(r: Rng, d: number, ask?: "higher" | "lower"): Activity {
  const want = ask ?? (coin(r) ? "higher" : "lower");
  const gap = Math.max(3, Math.round(14 - d * 10));
  const inst = pick(r, HL_PITCHED);
  const { lo, hi } = INSTRUMENTS[inst];
  const low = int(r, Math.max(55, lo), Math.min(70, hi - gap));
  const high = low + gap;
  const first = coin(r) ? low : high;
  return listen({
    prompt: want === "higher" ? "Which sound is higher?" : "Which sound is lower?",
    options: pair(note1(first, inst, 1.5, 80), note1(first === low ? high : low, inst, 1.5, 80)),
    answer: (want === "higher" ? high : low) === first ? "a" : "b",
    skill: "u:pitch:high-low",
    why: want === "higher" ? "High sounds are up like a bird. Low sounds are down like a bear." : "Low sounds are deep, like a big bear. High sounds are tiny, like a bird.",
  });
}
const highLowT = topic("hl-compare", (r, d) => higherLower(r, d));
const birdBearT = topic("hl-pick", (r, d) => {
  const high = coin(r);
  // First a bird instrument vs a bear instrument; later the same piano, closer together.
  const close = d >= 0.5;
  const inst: InstId = close ? "piano" : pick(r, high ? HIGH_INSTS : LOW_INSTS);
  const p = high ? (close ? int(r, 72, 76) : int(r, 79, 81)) : close ? int(r, 48, 52) : int(r, 36, 41);
  return listen({
    prompt: "Is this sound high like a bird, or low like a bear?",
    sound: hlPhrase(p, inst),
    options: [picOpt("high", "🐦", "High"), picOpt("low", "🐻", "Low")],
    answer: high ? "high" : "low",
    skill: "u:pitch:high-low",
    why: high ? "That was high and tiny, like a bird singing in a tree." : "That was low and deep, like a big bear's growl.",
  });
});
const hlSortT = topic("hl-sort", (r, d) => {
  const same = d >= 0.6;
  const flags = shuffle(r, [true, true, false, false]);
  const highs = pickN(r, HIGH_INSTS, 2);
  const lows = pickN(r, LOW_INSTS, 2);
  let h = 0;
  let l = 0;
  return {
    kind: "soundsort",
    prompt: same ? "Every card is a piano! Tap each one. Is it high or low?" : "Tap each card to hear it. Is it high or low?",
    bins: [{ id: "high", label: "High", emoji: "🐦" }, { id: "low", label: "Low", emoji: "🐻" }],
    items: flags.map((high, i) => {
      const inst: InstId = same ? "piano" : high ? highs[h++] : lows[l++];
      const p = high ? (same ? int(r, 72, 79) : int(r, 79, 81)) : same ? int(r, 43, 50) : int(r, 36, 41);
      return { id: `card${i + 1}`, inst, sound: hlPhrase(p, inst), bin: high ? "high" : "low" };
    }),
    skill: "u:pitch:sort",
  };
});
const contourT = topic("hl-contour", (r, d) => contour(r, d, "u:contour:up-down"));
const BELL_SETS = [[60, 64, 67, 72], [62, 65, 69, 74], [60, 62, 64, 67], [64, 67, 69, 72]];
const bellFindT = topic("hl-find", (r, d) => {
  const set = pick(r, BELL_SETS);
  const pads = d < 0.4 ? [set[0], set[3]] : d < 0.7 ? [set[0], set[1], set[3]] : set;
  const high = coin(r);
  return {
    kind: "melody",
    mode: "find",
    prompt: high ? "Find the HIGHEST bell — the bird bell! Listen to it, then tap it." : "Find the LOWEST bell — the bear bell! Listen to it, then tap it.",
    notes: [high ? pads[pads.length - 1] : pads[0]],
    pads,
    labels: "colors",
    skill: "u:pitch:find",
  };
});
/** Hear the bells, play them back (2 bells, then 3; longer as it gets harder). */
function bellEcho(r: Rng, d: number): Activity {
  const pads = d < 0.5 ? [60, 67] : [60, 64, 67];
  const n = d < 0.25 ? 2 : d < 0.7 ? 3 : 4;
  let notes: number[] = [];
  for (let k = 0; k < 20; k++) {
    notes = Array.from({ length: n }, () => pick(r, pads));
    if (new Set(notes).size > 1) break;
  }
  return { kind: "melody", mode: "echo", prompt: "Listen to the bells. Then play the same notes!", notes, pads, labels: "colors", inst: "bells", skill: "u:melody:echo" };
}
const bellEchoT = topic("hl-echo", (r, d) => bellEcho(r, d));
const HL_PITCHES = [60, 64, 67, 72];
const hlBacking = () => drums({ kick: "x...x...", shaker: "x.x.x.x." }, 100, 1);
const hlCompose = (k: number): Activity =>
  [
    (): Activity => ({ kind: "compose", prompt: "Write a tune that climbs UP the lighthouse stairs! End higher than you start.", pitches: HL_PITCHES, slots: 4, dur: 1, inst: "xylophone", bpm: 100, tonic: 60, labels: "colors", backing: hlBacking(), rules: [{ rule: "notes", min: 4 }, { rule: "contour", dir: "up" }], skill: "u:compose:contour" }),
    (): Activity => ({ kind: "compose", prompt: "Write a tune that slides DOWN the stairs! End lower than you start.", pitches: HL_PITCHES, slots: 4, dur: 1, inst: "xylophone", bpm: 100, tonic: 60, labels: "colors", backing: hlBacking(), rules: [{ rule: "notes", min: 4 }, { rule: "contour", dir: "down" }], skill: "u:compose:contour" }),
    (): Activity => ({ kind: "compose", prompt: "Write a tune like a wave: up to the top, then back down again!", pitches: HL_PITCHES, slots: 5, dur: 1, inst: "xylophone", bpm: 100, tonic: 60, labels: "colors", backing: hlBacking(), rules: [{ rule: "notes", min: 5 }, { rule: "arch" }], skill: "u:compose:contour" }),
  ][k]();
const hlComposeT = topic("hl-compose", (r) => hlCompose(int(r, 0, 2)));

const HIGH_IDEA = idea("High and low", [
  frame("Some sounds are HIGH, like a little bird singing: tweet, tweet!", picsShow("🐦"), melody([84, 88, 84, 88, 91, 88], [0.5, 0.5, 0.5, 0.5, 1, 1], "flute", 110)),
  frame("Some sounds are LOW, like a big bear: grrrr!", picsShow("🐻"), melody([38, 41, 38, 36], [1, 1, 1, 2], "tuba", 90)),
  frame("Small instruments sing high. Big instruments sing low!", instShow("piccolo", "tuba"), then(melody([86, 91, 86], 0.5, "piccolo", 100), melody([36, 31, 36], 1, "tuba", 100), 1)),
  frame("The piano has both! Low notes on this side… high notes on that side.", keysShow(48, 84, [], "none"), melody([48, 55, 60, 67, 72, 79, 84], 0.5, "piano", 100), "keys"),
], "u:pitch:idea");
const CONTOUR_IDEA = idea("Up, down, or the same", [
  frame("Notes can walk UP, like climbing the lighthouse stairs.", { show: "contour", pitches: [60, 62, 64, 65, 67] }, melody([60, 62, 64, 65, 67], 0.5, "bells", 96)),
  frame("Notes can walk DOWN, step by step.", { show: "contour", pitches: [67, 65, 64, 62, 60] }, melody([67, 65, 64, 62, 60], 0.5, "bells", 96)),
  frame("Or notes can stay the SAME, like waiting at the door.", { show: "contour", pitches: [64, 64, 64, 64] }, melody([64, 64, 64, 64], 0.5, "bells", 96)),
  frame("Try it! Play the bells from the big one to the little one.", bellsShow(HL_PITCHES, [], "colors"), melody(HL_PITCHES, 0.5, "bells", 96), "bells", HL_PITCHES),
], "u:contour:idea");
const BELL_IDEA = idea("Lighthouse bells", [
  frame("These are the lighthouse bells. The big bell sings low. The little bell sings high.", bellsShow([60, 67], [], "colors"), melody([60, 67, 60, 67], 1, "bells", 96)),
  frame("Listen to the bells, then play them back — like an echo!", bellsShow([60, 67], [], "colors"), melody([60, 60, 67], 1, "bells", 96), "bells", [60, 67]),
  frame("Now write your OWN tune on the xylophone. Make it climb the lighthouse!", bellsShow(HL_PITCHES, [], "colors"), layer(melody(HL_PITCHES, 1, "xylophone", 100), hlBacking())),
], "u:melody:idea");

const HIGH_LOW: WorldDef = {
  id: "k-high-low",
  title: "High & Low Lighthouse",
  emoji: "🗼",
  grade: "k",
  items: 5,
  blurb: "Birds sing high, bears growl low — climb the lighthouse of sound!",
  talk: ["Can you make a high sound like a bird? A low sound like a bear?", "Who in our family has the highest voice? Who has the lowest?"],
  challenge: "Tap a spoon on a big pot and on a small cup. Which one sings higher?",
  stages: [
    {
      title: "Bird or bear?",
      emoji: "🐦",
      levels: 1,
      topics: [highLowT, birdBearT],
      intros: ["A bird sings at the top of the lighthouse. A bear growls at the bottom!"],
      fixed: (r) => [HIGH_IDEA, birdBearT.gen(r, 0), higherLower(r, 0, "higher"), hlSortT.gen(r, 0), higherLower(r, 0.2, "lower")],
    },
    {
      title: "Up the stairs",
      emoji: "🪜",
      levels: 1,
      topics: [contourT, bellFindT],
      intros: ["Notes climb the lighthouse stairs — up, down, or stay put!"],
      fixed: (r) => [CONTOUR_IDEA, contourT.gen(r, 0), bellFindT.gen(r, 0), contourT.gen(r, 0.4), bellFindT.gen(r, 0.6)],
    },
    { title: "Lighthouse listening", emoji: "👂", levels: 2, topics: [hlSortT, birdBearT, contourT, highLowT, bellEchoT], intros: ["Listen from the top of the lighthouse!", "High, low, up and down — you know them all!"] },
    {
      title: "Lighthouse bells",
      emoji: "🔔",
      levels: 1,
      topics: [hlComposeT],
      unlocks: ["inst:xylophone"],
      intros: ["Ring the lighthouse bells, then write a tune of your own!"],
      fixed: (r) => [BELL_IDEA, bellEcho(r, 0.1), bellEcho(r, 0.5), hlCompose(0), hlCompose(2)],
    },
  ],
};

// ── Sound & Silence Shores (K): long and short, sound and silence, the beats in words ──────────
const longShortT = topic("ss-long", (r) => longShort(r));
const LONG_INSTS: InstId[] = ["flute", "violin", "organ", "cello"];
const SHORT_SNDS: Snd[] = ["xylophone", "pizz", "block", "marimba"];
const longSound = (id: Snd, p: number) => (isInst(id) ? note1(p, id, 3, 80) : demo(id));
const shortSound = (id: Snd, p: number) => (isInst(id) ? melody([p, null, p, null, p], [0.25, 0.75, 0.25, 0.75, 0.25], id, 90) : demo(id, 90));
const durSortT = topic("ss-sort", (r, d) => {
  // Later on, one instrument plays both ways: the same flute can be long or short.
  const base: InstId | null = d >= 0.6 ? pick(r, ["flute", "violin"] as InstId[]) : null;
  const flags = shuffle(r, [true, true, false, false]);
  const longs = pickN(r, LONG_INSTS, 2);
  const shorts = pickN(r, SHORT_SNDS, 2);
  let a = 0;
  let b = 0;
  return {
    kind: "soundsort",
    prompt: "Tap each card. Is it a long sound or a short sound?",
    bins: [{ id: "long", label: "Long", emoji: "🐍" }, { id: "short", label: "Short", emoji: "🐞" }],
    items: flags.map((long, i) => {
      const id: Snd = base ?? (long ? longs[a++] : shorts[b++]);
      const p = int(r, 64, 72);
      return { id: `card${i + 1}`, inst: id, sound: long ? longSound(id, p) : shortSound(id, p), bin: long ? "long" : "short" };
    }),
    skill: "u:duration:sort",
  };
});
const longEchoT = topic("ss-long-echo", (r) => echo(r, { pool: ["ta", "taa"], show: "icons", bpm: 84, skill: "u:duration:echo", prompt: "Short sounds and loooong sounds! Tap once for each sound, and wait on the long ones." }));
const restOrNotT = topic("ss-rest-hear", (r) => {
  const has = coin(r);
  const ps = pick(r, [[60, 62, 64, 65, 67, 65, 64, 62], [67, 64, 67, 64, 69, 67, 64, 60], [64, 64, 67, 67, 64, 64, 60, 60]]);
  const at = pick(r, [2, 3, 5, 6]);
  return listen({
    prompt: "The shaker keeps the beat. Did the bells stop for a quiet beat?",
    sound: layer(melody(has ? ps.map((p, i) => (i === at ? null : p)) : ps, 1, "bells", 96), drums({ shaker: "x.x.x.x." }, 96)),
    options: [picOpt("rest", "🤫", "Yes, a quiet beat"), picOpt("none", "🔔", "No, they kept ringing")],
    answer: has ? "rest" : "none",
    skill: "u:rest:hear",
    why: has ? "The bells took a rest — shh! — while the beat kept going." : "The bells rang on every beat. No rest that time!",
  });
});
const echoRestT = topic("ss-echo", (r, d) => echo(r, { pool: ["ta", "z"], must: "z", show: d < 0.5 ? "icons" : "none", bpm: 84, skill: "u:rest:echo", prompt: "Listen, then tap it back! Stay quiet on the shh." }));
const restMatchT = topic("ss-match", (r) => rhythmMatch(r, { pool: ["ta", "z"], must: "z", style: "icons", bpm: 84, skill: "u:rest:match", prompt: "Which picture shows what you heard?" }));

type Word = { text: string; syllables: number; emoji: string; parts: string };
const W = (text: string, emoji: string, parts: string): Word => ({ text, syllables: parts.split("-").length, emoji, parts });
const WORDS: Word[] = [
  W("cat", "🐱", "cat"), W("fish", "🐟", "fish"), W("frog", "🐸", "frog"), W("bee", "🐝", "bee"), W("sun", "☀️", "sun"), W("boat", "⛵", "boat"), W("crab", "🦀", "crab"), W("whale", "🐋", "whale"), W("drum", "🥁", "drum"), W("star", "⭐", "star"),
  W("apple", "🍎", "ap-ple"), W("monkey", "🐒", "mon-key"), W("turtle", "🐢", "tur-tle"), W("penguin", "🐧", "pen-guin"), W("rocket", "🚀", "rock-et"), W("rainbow", "🌈", "rain-bow"), W("cookie", "🍪", "cook-ie"), W("pizza", "🍕", "piz-za"), W("tiger", "🐯", "ti-ger"), W("dolphin", "🐬", "dol-phin"), W("zebra", "🦓", "ze-bra"), W("pretzel", "🥨", "pret-zel"),
  W("butterfly", "🦋", "but-ter-fly"), W("elephant", "🐘", "el-e-phant"), W("banana", "🍌", "ba-na-na"), W("octopus", "🐙", "oc-to-pus"), W("dinosaur", "🦕", "di-no-saur"), W("kangaroo", "🦘", "kan-ga-roo"), W("ladybug", "🐞", "la-dy-bug"), W("strawberry", "🍓", "straw-ber-ry"), W("tomato", "🍅", "to-ma-to"), W("unicorn", "🦄", "u-ni-corn"), W("flamingo", "🦩", "fla-min-go"),
  W("caterpillar", "🐛", "cat-er-pil-lar"), W("watermelon", "🍉", "wa-ter-mel-on"), W("helicopter", "🚁", "hel-i-cop-ter"),
];
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const PART_WORDS = ["", "one part", "two parts", "three parts", "four parts"];
/** Words for a syllable round — never all the same length. */
function syllableWords(r: Rng, max: number, n = 3): { text: string; syllables: number; emoji: string }[] {
  const pool = WORDS.filter((w) => w.syllables <= max);
  let ws = pickN(r, pool, n);
  for (let k = 0; k < 20 && new Set(ws.map((w) => w.syllables)).size < 2; k++) ws = pickN(r, pool, n);
  return ws.map((w) => ({ text: w.text, syllables: w.syllables, emoji: w.emoji }));
}
const syllableT = topic("ss-syll", (r, d) => ({ kind: "rhythm", mode: "syllables", prompt: "Say each word, and tap the drum once for every part!", words: syllableWords(r, d < 0.4 ? 2 : 3), bpm: 90, skill: "u:syllables:words" }));
const drumSaysT = topic("ss-drum-says", (r, d) => {
  const counts = d < 0.5 ? [1, 2] : [1, 2, 3];
  const words = counts.map((c) => pick(r, WORDS.filter((w) => w.syllables === c)));
  const ans = pick(r, words);
  return listen({
    prompt: "The drum is saying a word! Count the taps. Which word was it?",
    sound: rhythmDurs(Array.from({ length: ans.syllables }, () => 1), { bpm: 96, drum: "bongo" }),
    options: words.map((w) => picOpt(w.text, w.emoji, cap(w.text))),
    answer: ans.text,
    skill: "u:syllables:count",
    why: `${cap(ans.text)} has ${PART_WORDS[ans.syllables]}: ${ans.parts}.`,
  });
});
/** Beat Lab with rests: an empty square is a quiet beat. */
const restLab = (r: Rng, k: number): Activity =>
  [
    (): Activity => ({ kind: "beatlab", mode: "make", prompt: "Make a beat with 3 drum taps and 1 empty square — shh!", rows: ["snare"], steps: 4, bpm: 92, rules: [{ rule: "count", row: "snare", min: 3, max: 3 }], skill: "u:beatmaking:rest" }),
    (): Activity => ({ kind: "beatlab", mode: "make", prompt: "Make a beat with 2 drum taps and 2 quiet squares!", rows: ["snare"], steps: 4, bpm: 92, rules: [{ rule: "count", row: "snare", min: 2, max: 2 }], skill: "u:beatmaking:rest" }),
    (): Activity => ({ kind: "beatlab", mode: "copy", prompt: "Listen for the quiet beat. Can you make the same beat?", rows: ["snare"], steps: 4, bpm: 92, target: [pick(r, ["xx.x", "x.xx", "x.x.", "xxx."])], skill: "u:beatmaking:copy" }),
    (): Activity => ({ kind: "beatlab", mode: "make", prompt: "Make your own shore song! Use the drum and the shaker, and leave the last square empty — shh!", rows: ["snare", "shaker"], steps: 4, bpm: 92, rules: [{ rule: "count", row: "snare", min: 1 }, { rule: "count", row: "shaker", min: 1 }, { rule: "off", row: "snare", steps: [3] }, { rule: "off", row: "shaker", steps: [3] }], skill: "u:beatmaking:rest" }),
  ][k]();
const restLabT = topic("ss-lab", (r) => restLab(r, int(r, 0, 3)));
const grid4 = (pattern: string) => beat({ snare: pattern }, { bpm: 92, per: 1, times: 2 });

const LONG_IDEA = idea("Long and short", [
  frame("Some sounds are long, like a snake: sssssssss!", picsShow("🐍"), note1(67, "flute", 4, 80)),
  frame("Some sounds are short, like a ladybug hopping: hop! hop! hop!", picsShow("🐞"), shortSound("xylophone", 72)),
  frame("Listen: long, long… short, short, short, short!", rhythmShow(["taa", "taa", "ta", "ta", "ta", "ta"], "icons", false), tune(["taa", "taa", "ta", "ta", "ta", "ta"], [67, 64, 72, 72, 72, 72], "violin", 96)),
], "u:duration:idea");
const SHH_IDEA = idea("Shh! A quiet beat", [
  frame("Music has sounds… and quiet beats too. A quiet beat is called a rest.", rhythmShow(["ta", "ta", "z", "ta"], "icons"), rhythm(["ta", "ta", "z", "ta"], { bpm: 84 })),
  frame("On a rest, put your finger on your lips: shh!", picsShow("🤫"), rhythm(["ta", "z", "ta", "z"], { bpm: 84 })),
  frame("The beat keeps going, even when we're quiet. The shaker keeps the beat!", rhythmShow(["ta", "ta", "z", "ta", "ta", "z", "ta", "z"], "icons"), layer(rhythm(["ta", "ta", "z", "ta", "ta", "z", "ta", "z"], { bpm: 84 }), drums({ shaker: "x.x.x.x." }, 84))),
  frame("Your turn! Tap the drum, and freeze on the shh.", rhythmShow(["ta", "ta", "z", "ta"], "icons"), rhythm(["ta", "ta", "z", "ta"], { bpm: 84 }), "drum"),
], "u:rest:idea");
const WORD_IDEA = idea("Words have beats", [
  frame("Words have beats too! Cat has one: cat.", picsShow("🐱"), rhythmDurs([2], { bpm: 90, drum: "clap" })),
  frame("Apple has two: ap-ple.", picsShow("🍎"), rhythmDurs([1, 1], { bpm: 90, drum: "clap" })),
  frame("Butterfly has three: but-ter-fly!", picsShow("🦋"), rhythmDurs([1, 1, 1], { bpm: 90, drum: "clap" })),
  frame("Say a word, and tap the drum once for each part!", picsShow("🥁"), undefined, "drum"),
], "u:syllables:idea");
const SHORE_IDEA = idea("Rests in the Beat Lab", [
  frame("In the Beat Lab, an empty square is a rest. Shh!", { show: "grid", rows: ["snare"], pattern: ["xx.x"] }, grid4("xx.x")),
  frame("Drum, shh, drum, drum! Can you hear the quiet beat?", { show: "grid", rows: ["snare"], pattern: ["x.xx"] }, grid4("x.xx")),
  frame("Now make your own beat with a rest in it!", { show: "grid", rows: ["snare"], pattern: ["xxx."] }, grid4("xxx.")),
], "u:beatmaking:idea");

const SOUND_SILENCE: WorldDef = {
  id: "k-sound-silence",
  title: "Sound & Silence Shores",
  emoji: "🤫",
  grade: "k",
  items: 5,
  blurb: "Long snake sounds, short ladybug hops, quiet shh beats — and the drum beats hiding in words!",
  talk: ["Can you clap your name? How many claps is it?", "What makes a long sound? What makes a short sound?"],
  challenge: "Clap the parts of everyone's name at dinner tonight!",
  stages: [
    {
      title: "Snake or ladybug?",
      emoji: "🐍",
      levels: 1,
      topics: [longShortT, longEchoT],
      intros: ["On the shore, a snake hisses looong and a ladybug hops short!"],
      fixed: (r) => [LONG_IDEA, longShortT.gen(r, 0), durSortT.gen(r, 0), longEchoT.gen(r, 0), longShortT.gen(r, 0.5)],
    },
    {
      title: "Shh! Silence",
      emoji: "🤫",
      levels: 2,
      topics: [echoRestT, restMatchT, restOrNotT, durSortT],
      intros: ["Shh… sometimes music takes a quiet beat. Let's find it!", "Sounds and silences all along the shore!"],
      fixed: (r, li) =>
        li === 0
          ? [SHH_IDEA, restOrNotT.gen(r, 0), echoRestT.gen(r, 0), restMatchT.gen(r, 0.2), echoRestT.gen(r, 0.4)]
          : [restMatchT.gen(r, 0.5), durSortT.gen(r, 0.4), echoRestT.gen(r, 0.6), longShortT.gen(r, 0.6), restOrNotT.gen(r, 0.8)],
    },
    {
      title: "Word drums",
      emoji: "🥁",
      levels: 2,
      topics: [syllableT, drumSaysT],
      intros: ["Words have beats hiding inside them. Let's drum them out!", "Bee, ap-ple, but-ter-fly — drum every part!"],
      fixed: (r, li) =>
        li === 0
          ? [WORD_IDEA, drumSaysT.gen(r, 0), syllableT.gen(r, 0), drumSaysT.gen(r, 0.5), syllableT.gen(r, 0.5)]
          : [syllableT.gen(r, 0.6), drumSaysT.gen(r, 0.7), echoRestT.gen(r, 0.7), syllableT.gen(r, 0.9), longEchoT.gen(r, 0.8)],
    },
    {
      title: "Shore song",
      emoji: "🏖️",
      levels: 1,
      topics: [restLabT],
      unlocks: ["drum:snare"],
      intros: ["Make a beat with sounds AND silences — a song for the shore!"],
      fixed: (r) => [SHORE_IDEA, restLab(r, 0), restLab(r, 2), restLab(r, 1), restLab(r, 3)],
    },
  ],
};

// ── Music Friends Island (K): instruments, and how each one makes its sound ─────────────────────
const K_BAND: Snd[] = ["snare", "shaker", "triangle", "bells", "piano", "guitar", "violin", "trumpet", "flute", "xylophone"];
/** Hear an instrument (or drum) → tap its picture. */
function whichSound(r: Rng, d: number, pool: Snd[]): Activity {
  const ans = pick(r, pool);
  const wrong = pickN(r, pool, d < 0.4 ? 1 : 2, (x) => x === ans);
  return listen({
    prompt: "Who is playing? Listen, then tap the instrument!",
    sound: demo(ans),
    options: shuffle(r, [ans, ...wrong]).map((id) => instOpt(id)),
    answer: ans,
    skill: `u:timbre:${ans}`,
    layout: "row",
  });
}
const whichSoundT = topic("mf-which", (r, d) => whichSound(r, d, K_BAND));
const ORDINALS: [string, string][] = [["First", "1️⃣"], ["Second", "2️⃣"], ["Third", "3️⃣"]];
/** The other way round: see an instrument → find its voice among the sounds. */
function findVoice(r: Rng, d: number, pool: Snd[]): Activity {
  const ans = pick(r, pool);
  const ids = shuffle(r, [ans, ...pickN(r, pool, d < 0.4 ? 1 : 2, (x) => x === ans)]);
  return listen({
    prompt: `Find the ${soundName(ans).toLowerCase()}! Tap each sound. Which one is it?`,
    show: instShow(ans),
    options: ids.map((id, i) => soundOpt(id, demo(id), ORDINALS[i][0], { emoji: ORDINALS[i][1] })),
    answer: ans,
    skill: `u:timbre:${ans}`,
  });
}
const findVoiceT = topic("mf-find", (r, d) => findVoice(r, d, K_BAND));
type HowWay = "hit" | "shake" | "blow" | "strings" | "press";
const HOW: Record<HowWay, { label: string; emoji: string; ids: Snd[]; you: string }> = {
  hit: { label: "Hit it", emoji: "👏", ids: ["snare", "xylophone", "triangle", "bongo", "marimba", "bells"], you: "hit it — tap, tap, tap!" },
  shake: { label: "Shake it", emoji: "👋", ids: ["shaker", "maracas", "tamb"], you: "shake it — shake, shake, shake!" },
  blow: { label: "Blow into it", emoji: "💨", ids: ["trumpet", "flute", "recorder", "harmonica"], you: "blow air into it — whoosh!" },
  strings: { label: "Strum the strings", emoji: "🤏", ids: ["guitar", "ukulele", "harp", "banjo"], you: "strum or pluck its strings with your fingers." },
  press: { label: "Press the keys", emoji: "👆", ids: ["piano", "organ", "accordion"], you: "press its keys with your fingers." },
};
const HOW_WAYS = Object.keys(HOW) as HowWay[];
/** "To play the maracas, you shake THEM" (bells, bongos and maracas are plural). */
const howYou = (id: Snd, how: HowWay) => (/s$/.test(soundName(id)) ? HOW[how].you.replace(/\bits\b/g, "their").replace(/\bit\b/g, "them") : HOW[how].you);
const howPlayT = topic("mf-how", (r, d) => {
  const how = pick(r, HOW_WAYS);
  const id = pick(r, HOW[how].ids);
  const others = pickN(r, HOW_WAYS, d < 0.4 ? 1 : 2, (h) => h === how);
  return listen({
    prompt: "How do you play this instrument?",
    sound: demo(id),
    show: instShow(id),
    options: shuffle(r, [how, ...others]).map((h) => picOpt(h, HOW[h].emoji, HOW[h].label)),
    answer: how,
    skill: "u:timbre:how",
    why: `To play the ${soundName(id).toLowerCase()}, you ${howYou(id, how)}`,
  });
});
const howSortT = topic("mf-how-sort", (r, d) => {
  const ways = pickN(r, HOW_WAYS, d < 0.5 ? 2 : 3);
  const per = ways.length === 2 ? [2, 2] : shuffle(r, [2, 1, 1]);
  const items = ways.flatMap((h, i) => pickN(r, HOW[h].ids, per[i]).map((id) => ({ id, inst: id, sound: demo(id), bin: h })));
  return {
    kind: "soundsort",
    prompt: "How do you play each one? Tap a card to hear it, then drag it to its group.",
    bins: ways.map((h) => ({ id: h, label: HOW[h].label, emoji: HOW[h].emoji })),
    items: shuffle(r, items),
    skill: "u:timbre:how-sort",
  };
});
const TWO_BAND: InstId[] = ["piano", "trumpet", "violin", "flute", "guitar", "xylophone"];
const twoBandSortT = topic("mf-two", (r) => {
  const [a, b] = pickN(r, TWO_BAND, 2);
  const tunes = shuffle(r, [[60, 64, 67, 72], [67, 65, 64, 62, 60], [60, 62, 64, 62, 60], [64, 67, 69, 67]]);
  const who = shuffle(r, [a, a, b, b]);
  return {
    kind: "soundsort",
    prompt: `Is it the ${INSTRUMENTS[a].name.toLowerCase()} or the ${INSTRUMENTS[b].name.toLowerCase()}? Tap each card to hear it, then sort them!`,
    bins: [{ id: a, label: INSTRUMENTS[a].name, inst: a }, { id: b, label: INSTRUMENTS[b].name, inst: b }],
    items: who.map((inst, i) => ({ id: `card${i + 1}`, emoji: "🎵", sound: melody(tunes[i], 0.5, inst, 100), bin: inst })),
    skill: "u:timbre:sort",
  };
});
/** So, mi and la as three colored bells (the Studio starts with these). */
const SML = [64, 67, 69];
const bandBacking = (bars = 1) => drums({ kick: "x...x...", shaker: "xxxxxxxx" }, 100, bars);
const bandCompose = (k: number): Activity =>
  [
    (): Activity => ({ kind: "compose", prompt: "Make a tune for your pet to dance to! Put a bell in all four spots.", pitches: SML, slots: 4, dur: 1, inst: "marimba", bpm: 100, tonic: 60, labels: "colors", backing: bandBacking(), rules: [{ rule: "notes", min: 4 }], skill: "u:compose:bells" }),
    (): Activity => ({ kind: "compose", prompt: "Use ALL three bells in your dance tune!", pitches: SML, slots: 4, dur: 1, inst: "marimba", bpm: 100, tonic: 60, labels: "colors", backing: bandBacking(), rules: [{ rule: "use", pitches: SML }], skill: "u:compose:bells" }),
    (): Activity => ({ kind: "compose", prompt: "A longer dance! Fill the spots, and end on the lowest bell.", pitches: SML, slots: 8, dur: 1, inst: "marimba", bpm: 100, tonic: 60, labels: "colors", backing: bandBacking(2), rules: [{ rule: "notes", min: 6 }, { rule: "end", p: 64 }], skill: "u:compose:bells" }),
  ][k]();
const bandComposeT = topic("mf-compose", (r) => bandCompose(int(r, 0, 2)));
const bandBeat = (r: Rng, k: number): Activity =>
  [
    (): Activity => ({ kind: "beatlab", mode: "make", prompt: "Make a band beat! Use the drum, the shaker AND the tambourine.", rows: ["kick", "shaker", "tamb"], steps: 4, bpm: 100, rules: [{ rule: "count", row: "kick", min: 1 }, { rule: "count", row: "shaker", min: 1 }, { rule: "count", row: "tamb", min: 1 }], skill: "u:beatmaking:band" }),
    (): Activity => ({ kind: "beatlab", mode: "copy", prompt: "Listen to the band's beat. Can you make the same one?", rows: ["kick", "shaker"], steps: 4, bpm: 100, target: [...pick(r, [["x.x.", "xxxx"], ["x...", ".xxx"], ["xx..", "..xx"], ["x..x", ".xx."]])], skill: "u:beatmaking:copy" }),
  ][k]();
const bandBeatT = topic("mf-beat", (r) => bandBeat(r, int(r, 0, 1)));

const FRIENDS_IDEA = idea("Meet the band", [
  frame("Every instrument has its own voice. This is a drum!", instShow("snare"), demo("snare")),
  frame("This is a piano. Plink, plonk!", instShow("piano"), demo("piano")),
  frame("This is a trumpet. Toot, toot!", instShow("trumpet"), demo("trumpet")),
  frame("This is a guitar. Strum, strum!", instShow("guitar"), demo("guitar")),
  frame("When friends play together, it's a band!", instShow("ukulele", "marimba", "snare"), cut(piece("happy"), 8)),
], "u:timbre:idea");
const HOW_IDEA = idea("Hit, shake, blow, strum", [
  frame("You HIT a drum or a xylophone to make it sing.", instShow("snare", "xylophone"), then(demo("snare"), demo("xylophone"), 0.5)),
  frame("You SHAKE a shaker or a tambourine.", instShow("shaker", "tamb"), then(demo("shaker"), demo("tamb"), 0.5)),
  frame("You BLOW into a trumpet or a flute.", instShow("trumpet", "flute"), then(demo("trumpet"), demo("flute"), 0.5)),
  frame("You STRUM a guitar's strings… and you PRESS a piano's keys.", instShow("guitar", "piano"), then(demo("guitar"), demo("piano"), 0.5)),
], "u:timbre:idea");
const BAND_IDEA = idea("Your pet's band", [
  frame("Your pet wants to dance! Let's make music for the island band.", picsShow("🐾"), cut(piece("happy"), 8)),
  frame("Here are three bells. Tap them in any order to make a tune.", bellsShow(SML, [], "colors"), melody([67, 64, 69, 67], 1, "marimba", 100), "bells", SML),
  frame("Fill the spots, press play — and watch your pet dance!", bellsShow(SML, [], "colors"), layer(melody([64, 67, 69, 67], 1, "marimba", 100), bandBacking())),
], "u:compose:idea");

const MUSIC_FRIENDS: WorldDef = {
  id: "k-music-friends",
  title: "Music Friends Island",
  emoji: "🎺",
  grade: "k",
  items: 5,
  blurb: "Drums, shakers, trumpets and guitars — meet the band and learn how each one sings!",
  talk: ["Which instrument would you most like to play? Why?", "How do you make a sound on a drum? On a guitar? On a trumpet?"],
  challenge: "Make a shaker: put a spoonful of rice in a closed container and shake along to a song!",
  stages: [
    {
      title: "Meet the band",
      emoji: "🎸",
      levels: 1,
      topics: [whichSoundT, findVoiceT, twoBandSortT],
      intros: ["The island band is warming up. Who's playing?"],
      fixed: (r) => [FRIENDS_IDEA, whichSound(r, 0, ["snare", "piano", "trumpet", "guitar"]), findVoice(r, 0.3, ["snare", "piano", "trumpet", "guitar"]), twoBandSortT.gen(r, 0), whichSound(r, 0.6, K_BAND)],
    },
    {
      title: "Hit, shake, blow, strum",
      emoji: "👏",
      levels: 1,
      topics: [howPlayT],
      intros: ["Some instruments you hit, some you shake, some you blow!"],
      fixed: (r) => [HOW_IDEA, howPlayT.gen(r, 0), howSortT.gen(r, 0), howPlayT.gen(r, 0.5), whichSoundT.gen(r, 0.6)],
    },
    { title: "Island jam", emoji: "🏝️", levels: 2, topics: [whichSoundT, howPlayT, howSortT, findVoiceT], intros: ["Jam time on the island! Listen closely.", "The whole band is here. Can you name them all?"] },
    {
      title: "Pet's dance band",
      emoji: "🐾",
      levels: 1,
      topics: [bandComposeT, bandBeatT],
      unlocks: ["drum:tamb", "inst:marimba"],
      intros: ["Your pet wants to dance. Make the music!"],
      fixed: (r) => [BAND_IDEA, bandCompose(0), bandBeat(r, 0), bandCompose(1), bandCompose(2)],
    },
  ],
};

// ── Song Maker Cove (K): put it together — a beat, a tune, a concert ──────────────────────────
const kcGrid = (kick: string, clap: string, shaker?: string) => beat({ kick, clap, ...(shaker ? { shaker } : {}) }, { bpm: 100, per: 1, times: 2 });
const KC_COPY: string[][] = [["x.x.", ".x.x", "xxxx"], ["x...", "..x.", "xxxx"], ["xx..", "..xx", "x.x."], ["x..x", ".x..", ".xx."]];
const coveBeat = (r: Rng, k: number): Activity =>
  [
    (): Activity => ({ kind: "beatlab", mode: "make", prompt: "Drum on 1 and 3, clap on 2 and 4 — and shake on EVERY beat!", rows: ["kick", "clap", "shaker"], steps: 4, bpm: 100, rules: [{ rule: "on", row: "kick", steps: [0, 2] }, { rule: "on", row: "clap", steps: [1, 3] }, { rule: "on", row: "shaker", steps: [0, 1, 2, 3] }], skill: "u:beatmaking:song" }),
    (): Activity => ({ kind: "beatlab", mode: "copy", prompt: "Listen to this beat. Can you build the same one?", rows: ["kick", "clap", "shaker"], steps: 4, bpm: 100, target: [...pick(r, KC_COPY)], skill: "u:beatmaking:copy" }),
    (): Activity => ({ kind: "beatlab", mode: "make", prompt: "Make your OWN song beat! Use the drum, the clap and the shaker.", rows: ["kick", "clap", "shaker"], steps: 4, bpm: 100, rules: [{ rule: "count", row: "kick", min: 1 }, { rule: "count", row: "clap", min: 1 }, { rule: "count", row: "shaker", min: 1 }], skill: "u:beatmaking:song" }),
  ][k]();
const coveBeatT = topic("kc-beat", (r) => coveBeat(r, int(r, 0, 2)));
function coveEcho(r: Rng, d: number): Activity {
  const pads = d < 0.4 ? [64, 67] : SML;
  const n = d < 0.3 ? 2 : d < 0.7 ? 3 : 4;
  let notes: number[] = [];
  for (let k = 0; k < 20; k++) {
    notes = Array.from({ length: n }, () => pick(r, pads));
    if (new Set(notes).size > 1) break;
  }
  return { kind: "melody", mode: "echo", prompt: "Listen to the bells, then play them back!", notes, pads, labels: "colors", inst: "bells", skill: "u:melody:echo" };
}
const coveEchoT = topic("kc-echo", (r, d) => coveEcho(r, d));
const coveTune = (k: number): Activity =>
  [
    (): Activity => ({ kind: "compose", prompt: "Write a four-note tune! Put a bell in every spot.", pitches: SML, slots: 4, dur: 1, inst: "bells", bpm: 100, tonic: 60, labels: "colors", backing: bandBacking(), rules: [{ rule: "notes", min: 4 }], skill: "u:compose:bells" }),
    (): Activity => ({ kind: "compose", prompt: "Start on the middle bell and end on the lowest bell.", pitches: SML, slots: 4, dur: 1, inst: "bells", bpm: 100, tonic: 60, labels: "colors", backing: bandBacking(), rules: [{ rule: "start", p: 67 }, { rule: "end", p: 64 }, { rule: "notes", min: 3 }], skill: "u:compose:bells" }),
    (): Activity => ({ kind: "compose", prompt: "Use all three bells — low, middle and high!", pitches: SML, slots: 4, dur: 1, inst: "bells", bpm: 100, tonic: 60, labels: "colors", backing: bandBacking(), rules: [{ rule: "use", pitches: SML }], skill: "u:compose:bells" }),
  ][k]();
const coveTuneT = topic("kc-tune", (r) => coveTune(int(r, 0, 2)));
const concertTune = (k: number): Activity =>
  [
    (): Activity => ({ kind: "compose", prompt: "Write your concert song on the piano! Use all three notes, and end on the lowest one.", pitches: SML, slots: 8, dur: 1, inst: "piano", bpm: 100, tonic: 60, labels: "colors", backing: kcGrid("x.x.", ".x.x", "xxxx"), rules: [{ rule: "use", pitches: SML }, { rule: "end", p: 64 }, { rule: "notes", min: 6 }], skill: "u:compose:song" }),
    (): Activity => ({ kind: "compose", prompt: "Make your first two notes come back later in the song — like an echo!", pitches: SML, slots: 8, dur: 1, inst: "piano", bpm: 100, tonic: 60, labels: "colors", backing: kcGrid("x.x.", ".x.x", "xxxx"), rules: [{ rule: "repeat", len: 2 }, { rule: "notes", min: 6 }], skill: "u:compose:song" }),
  ][k]();
const concertTuneT = topic("kc-concert", (r) => concertTune(int(r, 0, 1)));

const SONG_IDEA = idea("What makes a song?", [
  frame("A song has a BEAT: the steady heartbeat that makes you want to dance.", { show: "grid", rows: ["kick", "clap"], pattern: ["x.x.", ".x.x"] }, kcGrid("x.x.", ".x.x")),
  frame("A song has a TUNE: notes that go up and down.", bellsShow(SML, [], "colors"), melody([64, 67, 69, 67, 64, 67, 64, 64], 0.5, "marimba", 100)),
  frame("Put them together, and you've got a SONG!", picsShow("🎶"), layer(melody([64, 67, 69, 67, 64, 67, 64, 64], 0.5, "marimba", 100), kcGrid("x.x.", ".x.x"))),
], "u:compose:idea");
const TUNE_IDEA = idea("Bells that sing", [
  frame("Listen to the cuckoo bird: cuc-koo! Two bells can sing it.", bellsShow([64, 67], [], "colors"), songScore("cuckoo", { inst: "bells", bpm: 100 })),
  frame("Add a third bell, a little higher, for a brand-new sound!", bellsShow(SML, [], "colors"), melody([67, 69, 67, 64], 1, "bells", 100)),
  frame("Copy the bells after me — then make up your own tune!", bellsShow(SML, [], "colors"), melody([64, 67, 69], 1, "bells", 100), "bells", SML),
], "u:compose:idea");
const CONCERT_IDEA = idea("Concert time", [
  frame("It's concert time! Your friends are coming to hear YOUR song.", picsShow("🎤"), cut(piece("happy"), 8)),
  frame("First the beat… then the tune on the piano… then everybody claps!", { show: "grid", rows: ["kick", "clap", "shaker"], pattern: ["x.x.", ".x.x", "xxxx"] }, layer(melody([67, 64, 69, 67, 64, 67, 69, 64], 1, "piano", 100), kcGrid("x.x.", ".x.x", "xxxx"))),
  frame("Then take a big bow!", picsShow("🎉"), melody([64, 67, 69, 72], [0.5, 0.5, 0.5, 2], "piano", 100)),
], "u:compose:idea");

const SONG_MAKER: WorldDef = {
  id: "k-song-maker",
  title: "Song Maker Cove",
  emoji: "🎤",
  grade: "k",
  items: 5,
  blurb: "Build a beat, write a tune, and play a concert of your very own song!",
  talk: ["Ask your child to play you the song they made today!", "What would you name your song?"],
  challenge: "Give a living-room concert: sing or hum your own made-up song for the family!",
  stages: [
    {
      title: "Beat builder",
      emoji: "🎛️",
      levels: 1,
      topics: [coveBeatT, steadyOrNot],
      intros: ["Every song starts with a beat. Let's build one!"],
      fixed: (r) => [SONG_IDEA, coveBeat(r, 0), steadyOrNot.gen(r, 0.5), coveBeat(r, 1), coveBeat(r, 2)],
    },
    {
      title: "Tune builder",
      emoji: "🔔",
      levels: 2,
      topics: [coveEchoT, coveTuneT, contourT],
      intros: ["Now the tune! Three bells are waiting for you.", "More tunes! Listen, copy, and make your own."],
      fixed: (r, li) =>
        li === 0
          ? [TUNE_IDEA, coveEcho(r, 0), coveEcho(r, 0.5), coveTune(0), coveEcho(r, 0.6)]
          : [coveEcho(r, 0.7), contourT.gen(r, 0.5), coveTune(1), coveEcho(r, 0.9), coveTune(2)],
    },
    {
      title: "Concert time",
      emoji: "🎉",
      levels: 1,
      topics: [concertTuneT, coveBeatT, conductDynT],
      unlocks: ["inst:piano"],
      intros: ["Your friends are here! Play them your song!"],
      fixed: (r) => [
        CONCERT_IDEA,
        coveBeat(r, 2),
        concertTune(0),
        concertTune(1),
        { kind: "conduct", prompt: "Big finish! Lift your hand up high so the band plays LOUD for your fans!", goal: { dyn: [0.78, 1] }, music: piece("happy"), skill: "u:conduct:dynamics" },
      ],
    },
  ],
};

// ═══ 1st grade ══════════════════════════════════════════════════════════════════════════════════

// ── Ta & Ti-ti Tide Pools (1st): quarter notes and eighth-note pairs ───────────────────────────
const TT = ["ta", "titi"];
const ttEchoT = topic("tt-echo", (r, d) => echo(r, { pool: TT, must: "titi", bpm: Math.round(80 + d * 16), show: d < 0.4 ? "sticks" : "none", skill: "u:rhythm:ta-titi", prompt: "Listen, then tap it back! Ta is one sound, ti-ti is two." }));
const ttMatchT = topic("tt-match", (r, d) => rhythmMatch(r, { pool: TT, bars: d < 0.7 ? 1 : 2, bpm: 88, skill: "u:rhythm:ta-titi", prompt: "Which rhythm did you hear?" }));
const ttReadT = topic("tt-read", (r, d) => readRhythm(r, { pool: TT, must: "titi", bars: d < 0.6 ? 1 : 2, bpm: Math.round(72 + d * 16), skill: "u:rhythm:read", prompt: "Read the rhythm, then play it on the drum! Say ta and ti-ti as you go." }));
const ONE_WORDS: [string, string][] = [["bee", "🐝"], ["fish", "🐟"], ["crab", "🦀"], ["star", "⭐"], ["boat", "⛵"], ["shell", "🐚"], ["whale", "🐋"], ["sun", "☀️"]];
const TWO_WORDS: [string, string, string][] = [["ap-ple", "🍎", "apple"], ["hon-ey", "🍯", "honey"], ["piz-za", "🍕", "pizza"], ["tur-tle", "🐢", "turtle"], ["dol-phin", "🐬", "dolphin"], ["pen-guin", "🐧", "penguin"], ["mon-key", "🐒", "monkey"], ["cook-ie", "🍪", "cookie"]];
/** Words → rhythm: a one-beat word is ta, a two-part word is ti-ti ("Bee, bee, ap-ple, bee!"). */
const wordRhythmT = topic("tt-words", (r) => {
  const cells = randomCells(r, TT, [4, 4], 1, "titi");
  const one = pick(r, ONE_WORDS);
  const two = pick(r, TWO_WORDS);
  const chant = cells.map((c) => (c === "ta" ? one[0] : two[0])).join(", ");
  const wrong: string[][] = [];
  for (let k = 0; k < 12 && wrong.length < 2; k++) {
    const w = nearCells(r, k < 6 ? cells : (wrong[0] ?? cells), TT);
    if (w && w.join() !== cells.join() && !wrong.some((x) => x.join() === w.join())) wrong.push(w);
  }
  return listen({
    prompt: `${cap(chant)}! Which rhythm matches the words?`,
    sound: rhythm(cells, { bpm: 88, drum: "block" }),
    show: picsShow(two[1]),
    options: shuffle(r, [cells, ...wrong]).map((c) => opt(c.join("-"), undefined, { show: rhythmShow(c, "sticks", false) })),
    answer: cells.join("-"),
    skill: "u:rhythm:words",
    why: `${cap(one[0])} is one sound: ta. ${cap(two[0])} is two quick sounds: ti-ti.`,
    layout: "list",
  });
});
/** Two rhythms: the same, or different? (Twins = same.) */
const ttSameT = topic("tt-same", (r, d) => {
  const cells = randomCells(r, TT, [4, 4], 1, "titi");
  const other = coin(r) ? cells : (nearCells(r, cells, TT) ?? cells);
  const same = other.join() === cells.join();
  return listen({
    prompt: "Listen to both rhythms. Are they the same, or different?",
    sound: then(rhythm(cells, { bpm: Math.round(84 + d * 12), drum: "block" }), rhythm(other, { bpm: Math.round(84 + d * 12), drum: "block" }), 2),
    options: [picOpt("same", "👯", "The same"), picOpt("diff", "🔀", "Different")],
    answer: same ? "same" : "diff",
    skill: "u:rhythm:same-different",
    why: same ? "Both were the same rhythm — like twins!" : "One beat changed between ta and ti-ti, so they're different.",
  });
});
const ttFill = (r: Rng): Activity => {
  const full = randomCells(r, TT, [4, 4], 1, "titi");
  return { kind: "measure", mode: "fill", prompt: "Finish the bar! Every bar holds 4 beats. Drag in ta or ti-ti cards.", meter: [4, 4], bars: 1, cards: TT, given: [full.slice(0, int(r, 1, full.length - 1))], bpm: 88, skill: "u:notation:bar" };
};
const ttFillT = topic("tt-fill", (r) => ttFill(r));
const ttCreate = (bars: number): Activity => ({
  kind: "measure",
  mode: "create",
  prompt: bars === 1 ? "Make your own 4-beat rhythm with ta and ti-ti! Use at least one ti-ti." : "Make a 2-bar rhythm of your own! Use ta AND ti-ti, then play it.",
  meter: [4, 4],
  bars,
  cards: TT,
  must: bars === 1 ? ["titi"] : ["ta", "titi"],
  bpm: 88,
  skill: "u:compose:rhythm",
});
const ttCreateT = topic("tt-create", (r) => ttCreate(int(r, 1, 2)));
const HAT_COPY: string[][] = [["x...x...", "xxxxxxxx"], ["x.x.x.x.", "..xx..xx"], ["x...x.x.", "xx..xx.."], ["x.x...x.", "xxxx..xx"]];
const hatLab = (r: Rng, k: number): Activity =>
  [
    (): Activity => ({ kind: "beatlab", mode: "make", prompt: "The hi-hat plays ti-ti! Put the hi-hat on all 8 little steps, and the kick on beats 1 and 3.", rows: ["kick", "hat"], steps: 8, bpm: 92, rules: [{ rule: "on", row: "hat", steps: [0, 1, 2, 3, 4, 5, 6, 7] }, { rule: "on", row: "kick", steps: [0, 4] }], skill: "u:beatmaking:ti-ti" }),
    (): Activity => ({ kind: "beatlab", mode: "copy", prompt: "Listen: ta on the kick, ti-ti on the hi-hat. Build the same beat!", rows: ["kick", "hat"], steps: 8, bpm: 92, target: [...pick(r, HAT_COPY)], skill: "u:beatmaking:copy" }),
  ][k]();
const hatLabT = topic("tt-hat", (r) => hatLab(r, int(r, 0, 1)));

const TT_IDEA = idea("Ta and ti-ti", [
  frame("Every beat is like a footstep. Ta is ONE sound on a beat.", rhythmShow(["ta", "ta", "ta", "ta"]), rhythm(["ta", "ta", "ta", "ta"], { bpm: 84 })),
  frame("Ti-ti is TWO quick sounds on ONE beat.", rhythmShow(["titi", "titi", "titi", "titi"]), rhythm(["titi", "titi", "titi", "titi"], { bpm: 84 })),
  frame("Mix them up: ta, ta, ti-ti, ta!", rhythmShow(["ta", "ta", "titi", "ta"]), rhythm(["ta", "ta", "titi", "ta"], { bpm: 84 })),
  frame("Words work too! Bee is ta. Ap-ple is ti-ti. Bee, bee, ap-ple, bee!", rhythmShow(["ta", "ta", "titi", "ta"]), rhythm(["ta", "ta", "titi", "ta"], { bpm: 84, drum: "block" })),
  frame("Your turn! Tap ta and ti-ti on the drum.", rhythmShow(["ta", "titi", "ta", "titi"]), rhythm(["ta", "titi", "ta", "titi"], { bpm: 84 }), "drum"),
], "u:rhythm:idea");
const READ_IDEA = idea("Reading rhythm", [
  frame("This is how musicians write rhythm. Ta is one stick.", rhythmShow(["ta", "ta", "ta", "ta"]), rhythm(["ta", "ta", "ta", "ta"], { bpm: 80 })),
  frame("Ti-ti is two sticks holding hands at the top.", rhythmShow(["titi", "ta", "titi", "ta"]), rhythm(["titi", "ta", "titi", "ta"], { bpm: 80 })),
  frame("Real music notes look like this: the same rhythm, with round note heads!", rhythmShow(["titi", "ta", "titi", "ta"], "notes"), rhythm(["titi", "ta", "titi", "ta"], { bpm: 80 })),
  frame("First you hear the count: 1, 2, 3, 4. Then you play. Read it with me!", rhythmShow(["ta", "ta", "titi", "ta"]), rhythm(["ta", "ta", "titi", "ta"], { bpm: 80, count: true })),
], "u:rhythm:idea");
const MAKER_IDEA = idea("Rhythm cards", [
  frame("A bar is a box that holds 4 beats.", rhythmShow(["ta", "ta", "ta", "ta"], "sticks", true, [4, 4]), rhythm(["ta", "ta", "ta", "ta"], { bpm: 88 })),
  frame("Ta fills one beat. Ti-ti fills one beat too — with two sounds!", rhythmShow(["ta", "titi", "titi", "ta"], "sticks", true, [4, 4]), rhythm(["ta", "titi", "titi", "ta"], { bpm: 88 })),
  frame("Drag cards into the bar until it's full. Then press play to hear YOUR rhythm!", rhythmShow(["titi", "ta", "titi", "titi"], "sticks", true, [4, 4]), rhythm(["titi", "ta", "titi", "titi"], { bpm: 88 })),
], "u:compose:idea");

const TA_TITI: WorldDef = {
  id: "g1-ta-titi",
  title: "Ta & Ti-ti Tide Pools",
  emoji: "🦀",
  grade: "1",
  items: 6,
  blurb: "One sound on a beat, two sounds on a beat — read, play and write your first rhythms!",
  talk: ["Can you clap 'ta, ta, ti-ti, ta'? Now clap your name!", "Which foods are ta (pear, cheese) and which are ti-ti (apple, pizza)?"],
  challenge: "Chant and clap: 'Pear, pear, ap-ple, pear!' Then make up a food rhythm of your own!",
  stages: [
    {
      title: "One sound, two sounds",
      emoji: "👣",
      levels: 1,
      topics: [ttEchoT, ttMatchT],
      intros: ["In the tide pools, crabs tap ta and shrimp skip ti-ti!"],
      fixed: (r) => [TT_IDEA, ttEchoT.gen(r, 0), ttMatchT.gen(r, 0), wordRhythmT.gen(r, 0), ttEchoT.gen(r, 0.3), ttMatchT.gen(r, 0.4)],
    },
    { title: "Tide pool rhythms", emoji: "🐚", levels: 2, topics: [ttEchoT, ttMatchT, wordRhythmT, ttSameT], intros: ["Tap along with the tide pool creatures!", "Bee, bee, ap-ple, bee — the tide pools are full of rhythms!"] },
    {
      title: "Reading rhythm",
      emoji: "📜",
      levels: 1,
      topics: [ttReadT, hatLabT],
      intros: ["Rhythms can be written down. Let's learn to read them!"],
      fixed: (r) => [READ_IDEA, ttReadT.gen(r, 0), ttReadT.gen(r, 0.3), hatLab(r, 1), ttMatchT.gen(r, 0.8), ttReadT.gen(r, 0.7)],
    },
    {
      title: "Rhythm maker",
      emoji: "🃏",
      levels: 1,
      topics: [ttCreateT, ttFillT],
      unlocks: ["drum:hat"],
      intros: ["Now YOU write the rhythm. Grab your rhythm cards!"],
      fixed: (r) => [MAKER_IDEA, ttFill(r), ttCreate(1), hatLab(r, 0), ttFill(r), ttCreate(2)],
    },
  ],
};

// ── Shh! Rest Reef (1st): the quarter rest ─────────────────────────────────────────────────────
const TTZ = ["ta", "titi", "z"];
const rEchoT = topic("rr-echo", (r, d) => echo(r, { pool: TTZ, must: "z", bpm: Math.round(80 + d * 12), show: d < 0.4 ? "sticks" : "none", skill: "u:rest:echo", prompt: "Listen, then tap it back. Open your hands on the rest — shh!" }));
const rMatchT = topic("rr-match", (r, d) => rhythmMatch(r, { pool: TTZ, must: "z", bars: d < 0.7 ? 1 : 2, bpm: 88, skill: "u:rest:read", prompt: "Which rhythm did you hear? Look for the rest!" }));
const rReadT = topic("rr-read", (r, d) => readRhythm(r, { pool: TTZ, must: "z", bars: d < 0.6 ? 1 : 2, bpm: Math.round(72 + d * 14), skill: "u:rest:read", prompt: "Read it and play it! Don't play on the rest." }));
const restCountT = topic("rr-count", (r) => {
  const want = int(r, 1, 3);
  let cells = randomCells(r, TTZ, [4, 4], 2, "z");
  for (let k = 0; k < 60 && cells.filter((c) => c === "z").length !== want; k++) cells = randomCells(r, TTZ, [4, 4], 2, "z");
  const got = cells.filter((c) => c === "z").length;
  return listen({
    prompt: "The clicks keep the beat. How many rests did you hear?",
    sound: layer(rhythm(cells, { bpm: 84 }), clicks(8, 84)),
    options: [1, 2, 3].map((n) => opt(String(n), n === 1 ? "1 rest" : `${n} rests`)),
    answer: String(got),
    skill: "u:rest:count",
    why: `There ${got === 1 ? "was 1 rest" : `were ${got} rests`}: ${cells.map((c) => (c === "ta" ? "ta" : c === "titi" ? "ti-ti" : "shh")).join(", ")}.`,
  });
});
const dictT = topic("rr-dict", (r, d) => {
  const bars = d < 0.7 ? 1 : 2;
  const cells = randomCells(r, TTZ, [4, 4], bars, "z");
  return {
    kind: "measure",
    mode: "dictation",
    prompt: bars === 1 ? "Rhythm detective! Listen, then write the rhythm with the cards." : "Listen to both bars, then write what you hear!",
    meter: [4, 4],
    bars,
    cards: TTZ,
    target: intoBars(cells, [4, 4]) ?? [cells],
    bpm: 84,
    skill: "u:rest:dictation",
  };
});
const fixT = topic("rr-fix", (r) => {
  const good = randomCells(r, TTZ, [4, 4], 1);
  const bad = randomCells(r, TTZ, [4, 4], 1, "z");
  const short = bad.slice(0, bad.length - 1);
  return { kind: "measure", mode: "fix", prompt: "One bar is missing a beat! Find it and fix it, so every bar has 4 beats.", meter: [4, 4], bars: 2, cards: TTZ, given: coin(r) ? [good, short] : [short, good], bpm: 84, skill: "u:notation:bar-fix" };
});
const REST_COPY: string[][] = [["x.x.", ".x.."], ["x...", ".x.x"], ["xx..", "...x"], ["x..x", ".x.."]];
const restLab1 = (r: Rng, k: number): Activity =>
  [
    (): Activity => ({ kind: "beatlab", mode: "make", prompt: "Tom on beats 1, 2 and 4. Leave beat 3 empty — that's your rest!", rows: ["tom"], steps: 4, bpm: 92, rules: [{ rule: "on", row: "tom", steps: [0, 1, 3] }, { rule: "off", row: "tom", steps: [2] }], skill: "u:beatmaking:rest" }),
    (): Activity => ({ kind: "beatlab", mode: "copy", prompt: "Listen for the rest, then build the same beat!", rows: ["kick", "tom"], steps: 4, bpm: 92, target: [...pick(r, REST_COPY)], skill: "u:beatmaking:copy" }),
    (): Activity => ({ kind: "beatlab", mode: "make", prompt: "Make your own groove with the kick and the tom. Beat 4 is a rest — leave it empty!", rows: ["kick", "tom"], steps: 4, bpm: 92, rules: [{ rule: "count", row: "kick", min: 1 }, { rule: "count", row: "tom", min: 1 }, { rule: "off", row: "kick", steps: [3] }, { rule: "off", row: "tom", steps: [3] }], skill: "u:beatmaking:rest" }),
  ][k]();
const restLab1T = topic("rr-lab", (r) => restLab1(r, int(r, 0, 2)));
const restCreate = (bars: number): Activity => ({
  kind: "measure",
  mode: "create",
  prompt: bars === 1 ? "Write a 4-beat rhythm with at least one rest in it!" : "Write a 2-bar rhythm with ta, ti-ti AND a rest. Then play it!",
  meter: [4, 4],
  bars,
  cards: TTZ,
  must: bars === 1 ? ["z"] : ["ta", "titi", "z"],
  bpm: 88,
  skill: "u:compose:rhythm",
});
const restCreateT = topic("rr-create", (r) => restCreate(int(r, 1, 2)));

const REST_IDEA = idea("The quarter rest", [
  frame("A rest is a beat with NO sound. Shh!", rhythmShow(["ta", "ta", "z", "ta"]), rhythm(["ta", "ta", "z", "ta"], { bpm: 84 })),
  frame("This squiggle is a rest. It still gets a whole beat — we just don't play.", { show: "symbol", sym: "quarter-rest", label: "rest" }, layer(rhythm(["ta", "z", "ta", "z"], { bpm: 84 }), clicks(4, 84))),
  frame("Listen: ta, ti-ti, shh, ta.", rhythmShow(["ta", "titi", "z", "ta"]), rhythm(["ta", "titi", "z", "ta"], { bpm: 84 })),
  frame("Your turn! Tap the drum, and open your hands on the rest.", rhythmShow(["ta", "titi", "z", "ta"]), rhythm(["ta", "titi", "z", "ta"], { bpm: 84 }), "drum"),
], "u:rest:idea");
const DICT_IDEA = idea("Rhythm detective", [
  frame("Rhythm detectives listen very carefully…", picsShow("🕵️"), rhythm(["ta", "titi", "z", "ta"], { bpm: 84 })),
  frame("…then they write down what they heard, with rhythm cards.", rhythmShow(["ta", "titi", "z", "ta"]), rhythm(["ta", "titi", "z", "ta"], { bpm: 84 })),
  frame("Say it first — ta, ti-ti, shh, ta — then drag one card for each beat.", rhythmShow(["ta", "titi", "z", "ta"], "sticks", true, [4, 4]), rhythm(["ta", "titi", "z", "ta"], { bpm: 84 })),
], "u:rest:idea");
const RESTLAB_IDEA = idea("Rests make grooves", [
  frame("In the Beat Lab, an empty step is a rest. Rests give a beat room to breathe!", { show: "grid", rows: ["kick", "tom"], pattern: ["x.x.", ".x.."] }, beat({ kick: "x.x.", tom: ".x.." }, { bpm: 92, per: 1, times: 2 })),
  frame("Kick, tom, kick… shh! Hear the space on beat 4?", { show: "grid", rows: ["kick", "tom"], pattern: ["x.x.", ".x.."] }, beat({ kick: "x.x.", tom: ".x.." }, { bpm: 92, per: 1, times: 3 })),
  frame("Now build grooves with rests of your own!", { show: "grid", rows: ["kick", "tom"], pattern: ["x...", ".x.x"] }, beat({ kick: "x...", tom: ".x.x" }, { bpm: 92, per: 1, times: 2 })),
], "u:beatmaking:idea");

const REST_REEF: WorldDef = {
  id: "g1-rest-reef",
  title: "Shh! Rest Reef",
  emoji: "🐠",
  grade: "1",
  items: 6,
  blurb: "Sometimes the best sound is no sound at all — meet the quarter rest!",
  talk: ["Can you clap 'ta, ti-ti, shh, ta'? What do your hands do on the shh?", "Where do you hear quiet moments in songs you know?"],
  challenge: "Play freeze dance: dance to music, and freeze like a statue every time it rests!",
  stages: [
    {
      title: "The quiet beat",
      emoji: "🤫",
      levels: 1,
      topics: [rEchoT, rMatchT, rReadT],
      intros: ["Down on the reef, the fish swim to the beat — and hide on the rest!"],
      fixed: (r) => [REST_IDEA, rEchoT.gen(r, 0), rMatchT.gen(r, 0), rReadT.gen(r, 0.1), rEchoT.gen(r, 0.4), rMatchT.gen(r, 0.5)],
    },
    { title: "Reef rhythms", emoji: "🐠", levels: 2, topics: [rEchoT, rMatchT, rReadT, restCountT], intros: ["Swim through the reef rhythms — listen for the rests!", "The reef is full of quiet beats. Can you find them all?"] },
    {
      title: "Rhythm detective",
      emoji: "🕵️",
      levels: 1,
      topics: [dictT, fixT],
      intros: ["A mystery rhythm! Listen closely and write it down."],
      fixed: (r) => [DICT_IDEA, dictT.gen(r, 0), fixT.gen(r, 0.2), dictT.gen(r, 0.4), rReadT.gen(r, 0.6), dictT.gen(r, 0.8)],
    },
    {
      title: "Rest groove lab",
      emoji: "🎛️",
      levels: 1,
      topics: [restLab1T, restCreateT],
      unlocks: ["drum:tom"],
      intros: ["Build grooves with sounds AND silences!"],
      fixed: (r) => [RESTLAB_IDEA, restLab1(r, 0), restLab1(r, 1), restCreate(1), restLab1(r, 2), restCreate(2)],
    },
  ],
};

// ── Sol-Mi Shores (1st): so and mi (the cuckoo call), then la ──────────────────────────────────
const DO = 60;
const MI = 64;
const SO = 67;
const LA = 69;
/** n notes from the pads, never all the same. */
function padNotes(r: Rng, pads: number[], n: number): number[] {
  let notes: number[] = [];
  for (let k = 0; k < 20; k++) {
    notes = Array.from({ length: n }, () => pick(r, pads));
    if (new Set(notes).size > 1) break;
  }
  return notes;
}
const solSkill = (pads: number[]) => (pads.includes(DO) ? "u:solfege:do" : pads.includes(LA) ? "u:solfege:so-mi-la" : "u:solfege:so-mi");
const solEcho = (r: Rng, d: number, pads: number[], inst: InstId = "bells"): Activity => ({ kind: "melody", mode: "echo", prompt: "Listen and sing it back — then play it on the bells!", notes: padNotes(r, pads, d < 0.4 ? 3 : 4), pads, labels: "solfege", tonic: DO, inst, skill: solSkill(pads) });
const solRead = (r: Rng, d: number, pads: number[]): Activity => ({ kind: "melody", mode: "read", prompt: "Read the notes on the ladder. Sing them, then play them!", notes: padNotes(r, pads, d < 0.5 ? 3 : 4), pads, labels: "solfege", tonic: DO, show: "ladder", inst: "bells", skill: "u:solfege:read" });
const smEchoT = topic("sm-echo", (r, d) => solEcho(r, d, [MI, SO]));
const smMatchT = topic("sm-match", (r, d) => solfegeMatch(r, { steps: [4, 7], n: d < 0.5 ? 3 : 4, skill: "u:solfege:so-mi" }));
const smReadT = topic("sm-read", (r, d) => solRead(r, d, [MI, SO]));
const smUpDownT = topic("sm-updown", (r) => {
  const up = coin(r);
  return listen({
    prompt: "Did the bells go UP from mi to so, or DOWN from so to mi?",
    sound: melody(up ? [MI, SO, MI, SO] : [SO, MI, SO, MI], [1, 1.5, 1, 1.5], "bells", 84),
    show: ladderShow(DO, [4, 7]),
    options: [picOpt("up", "⬆️", "Up: mi to so"), picOpt("down", "⬇️", "Down: so to mi")],
    answer: up ? "up" : "down",
    skill: "u:solfege:up-down",
    why: up ? "Mi is low and so is high — the bells climbed up: mi, SO!" : "So is high and mi is low — the bells came down: SO, mi.",
  });
});
const SOL_SONGS: { id: string; title: string; emoji: string; n?: number }[] = [
  { id: "rainrain", title: "Rain, Rain, Go Away", emoji: "🌧️" },
  { id: "cuckoo", title: "Cuckoo", emoji: "🐦" },
  { id: "thisoldman", title: "This Old Man", emoji: "👴", n: 6 },
  { id: "rosie", title: "Ring Around the Rosie", emoji: "🌹", n: 12 },
];
const solSong = (r: Rng, withLa: boolean): Activity => {
  const pool = withLa ? SOL_SONGS : SOL_SONGS.slice(0, 3);
  const ans = pick(r, pool);
  const wrong = pickN(r, pool, 2, (s) => s.id === ans.id);
  return listen({
    prompt: withLa ? "These songs use so, mi and la. Which song is it?" : "These songs are made of so and mi. Which song is it?",
    sound: songScore(ans.id, { inst: "bells", n: ans.n }),
    show: ladderShow(DO, withLa ? [4, 7, 9] : [4, 7]),
    options: shuffle(r, [ans, ...wrong]).map((s) => picOpt(s.id, s.emoji, s.title)),
    answer: ans.id,
    skill: "u:ear:songs",
  });
};
const smSongT = topic("sm-song", (r) => solSong(r, false));
const smlEchoT = topic("sml-echo", (r, d) => solEcho(r, d, [MI, SO, LA]));
const smlMatchT = topic("sml-match", (r, d) => solfegeMatch(r, { steps: [4, 7, 9], n: d < 0.5 ? 3 : 4, skill: "u:solfege:so-mi-la" }));
const smlReadT = topic("sml-read", (r, d) => solRead(r, d, [MI, SO, LA]));
const smlSongT = topic("sml-song", (r) => solSong(r, true));
const smBacking = (bars: number) => drums({ kick: "x...x...", shaker: "x.x.x.x." }, 96, bars);
const smCompose = (k: number): Activity =>
  [
    (): Activity => ({ kind: "compose", prompt: "Write a so-mi song! Use so AND mi, and fill all four spots.", pitches: [MI, SO], slots: 4, dur: 1, inst: "flute", bpm: 96, tonic: DO, labels: "solfege", backing: smBacking(1), rules: [{ rule: "use", pitches: [MI, SO] }, { rule: "notes", min: 4 }], skill: "u:compose:so-mi" }),
    (): Activity => ({ kind: "compose", prompt: "Now add la! Write an 8-note song with so, mi AND la.", pitches: [MI, SO, LA], slots: 8, dur: 1, inst: "flute", bpm: 96, tonic: DO, labels: "solfege", backing: smBacking(2), rules: [{ rule: "use", pitches: [MI, SO, LA] }, { rule: "notes", min: 7 }], skill: "u:compose:so-mi" }),
    (): Activity => ({ kind: "compose", prompt: "Start on so and end on mi — like a cuckoo calling goodbye!", pitches: [MI, SO, LA], slots: 8, dur: 1, inst: "flute", bpm: 96, tonic: DO, labels: "solfege", backing: smBacking(2), rules: [{ rule: "start", p: SO }, { rule: "end", p: MI }, { rule: "notes", min: 6 }], skill: "u:compose:so-mi" }),
    (): Activity => ({ kind: "compose", prompt: "Write a song with a rest in it: sing, sing… shh! Use so, mi and la.", pitches: [MI, SO, LA], slots: 8, dur: 1, inst: "flute", bpm: 96, tonic: DO, labels: "solfege", backing: smBacking(2), rules: [{ rule: "rests", min: 1 }, { rule: "notes", min: 6 }, { rule: "use", pitches: [MI, SO, LA] }], skill: "u:compose:so-mi" }),
  ][k]();
const smComposeT = topic("sm-compose", (r) => smCompose(int(r, 0, 3)));

const SOMI_IDEA = idea("So and mi", [
  frame("Listen to the cuckoo bird: cuc-koo! It sings two notes.", picsShow("🐦"), songScore("cuckoo", { inst: "flute", bpm: 100 })),
  frame("The high note is called SO. The low note is called MI.", ladderShow(DO, [4, 7]), melody([SO, MI], 1, "bells", 84)),
  frame("Sing with me: so, mi, so-so, mi!", ladderShow(DO, [4, 7]), melody([SO, MI, SO, SO, MI], [1, 1, 0.5, 0.5, 1], "bells", 84)),
  frame("Rain, Rain, Go Away is made of just so and mi!", ladderShow(DO, [4, 7]), songScore("rainrain", { inst: "bells" })),
  frame("Your turn! Play so and mi on the bells.", bellsShow([MI, SO], [], "solfege", DO), melody([SO, MI], 1, "bells", 84), "bells", [MI, SO]),
], "u:solfege:idea");
const LA_IDEA = idea("Here comes la", [
  frame("Meet a new note: LA. It sits just above so.", ladderShow(DO, [4, 7, 9]), melody([SO, LA, SO], 1, "bells", 84)),
  frame("So, la, so, mi — hear la peek over the top?", ladderShow(DO, [4, 7, 9]), melody([SO, LA, SO, MI], 1, "bells", 84)),
  frame("Ring Around the Rosie uses so, mi AND la!", ladderShow(DO, [4, 7, 9]), songScore("rosie", { inst: "bells", n: 12 })),
  frame("Try it: so, la, so, mi!", bellsShow([MI, SO, LA], [], "solfege", DO), melody([SO, LA, SO, MI], 1, "bells", 84), "bells", [MI, SO, LA]),
], "u:solfege:idea");
const SM_WRITE_IDEA = idea("Songwriter", [
  frame("Songwriters make up tunes. You can too — with so, mi and la!", ladderShow(DO, [4, 7, 9]), layer(melody([SO, SO, MI, LA, SO, SO, MI, MI], 1, "flute", 96), smBacking(2))),
  frame("A tune that ends on mi sounds like a cuckoo saying goodbye.", bellsShow([MI, SO, LA], [], "solfege", DO), melody([SO, LA, SO, MI], [1, 1, 1, 2], "flute", 96)),
  frame("Your songs play on the flute — the bird of the orchestra!", instShow("flute"), melody([SO, MI, SO, MI, LA, SO, MI], [0.5, 0.5, 0.5, 0.5, 1, 1, 2], "flute", 96)),
], "u:compose:idea");

const SOL_MI: WorldDef = {
  id: "g1-sol-mi",
  title: "Sol-Mi Shores",
  emoji: "🐦",
  grade: "1",
  items: 6,
  blurb: "So and mi — the cuckoo's call. Then la joins in, and you write your first songs!",
  talk: ["Can you sing 'so-mi' like a cuckoo? Like someone calling your name?", "Sing 'Rain, Rain, Go Away' together. Which words are so? Which are mi?"],
  challenge: "Call someone in the family with so-mi: 'Din-ner!' (so on din, mi on ner). Can they answer you in so-mi?",
  stages: [
    {
      title: "The cuckoo call",
      emoji: "🐦",
      levels: 1,
      topics: [smEchoT, smMatchT, smReadT],
      intros: ["Cuc-koo! A bird on the shore is singing two notes. Let's learn them!"],
      fixed: (r) => [SOMI_IDEA, solEcho(r, 0, [MI, SO]), smMatchT.gen(r, 0), smReadT.gen(r, 0.2), smSongT.gen(r, 0.3), solEcho(r, 0.6, [MI, SO])],
    },
    { title: "So-mi shells", emoji: "🐚", levels: 2, topics: [smEchoT, smMatchT, smReadT, smSongT, smUpDownT], intros: ["Every shell on the shore sings so or mi!", "Up to so, down to mi — sing along the shore!"] },
    {
      title: "La joins in",
      emoji: "🌹",
      levels: 1,
      topics: [smlEchoT, smlMatchT, smlReadT, smlSongT],
      intros: ["A new note sails in: la!"],
      fixed: (r) => [LA_IDEA, smlEchoT.gen(r, 0), smlMatchT.gen(r, 0.2), smlReadT.gen(r, 0.3), smlSongT.gen(r, 0.5), smlEchoT.gen(r, 0.7)],
    },
    {
      title: "So-mi songwriter",
      emoji: "📝",
      levels: 1,
      topics: [smComposeT],
      unlocks: ["inst:flute"],
      intros: ["Time to write songs with so, mi and la!"],
      fixed: (r) => [SM_WRITE_IDEA, smCompose(0), smlEchoT.gen(r, 0.8), smCompose(1), smCompose(2), smCompose(3)],
    },
  ],
};

// ── Beat or Rhythm Bay (1st): beat vs rhythm, strong and weak beats, ostinato, word rhythms ────
const BR_SONGS: { id: string; n: number; words: string }[] = [
  { id: "hotcross", n: 17, words: "Hot cross buns" },
  { id: "rainrain", n: 12, words: "Rain, rain, go away" },
  { id: "baabaa", n: 9, words: "Baa, baa, black sheep" },
  { id: "rosie", n: 12, words: "Ring around the rosie" },
];
/** A song on the bells with a drum that plays either the steady BEAT or the RHYTHM of the words. */
function brSound(id: string, n: number, mode: "beat" | "rhythm", bpm = 96): Score {
  const s = song(id);
  const durs = s.durs.slice(0, n);
  const total = Math.round(durs.reduce((a, b) => a + b, 0));
  const drum = mode === "beat" ? rhythmDurs(Array.from({ length: total }, () => 1), { bpm, drum: "bongo" }) : rhythmDurs(durs.map((d, i) => (s.pitches[i] === null ? -d : d)), { bpm, drum: "bongo" });
  return layer(songScore(id, { inst: "bells", n, bpm }), drum);
}
const beatVsRhythmT = topic("br-which", (r) => {
  const sg = pick(r, BR_SONGS);
  const isBeat = coin(r);
  return listen({
    prompt: `"${sg.words}…" Is the drum playing the steady BEAT, or the RHYTHM of the words?`,
    sound: brSound(sg.id, sg.n, isBeat ? "beat" : "rhythm"),
    options: [picOpt("beat", "❤️", "The steady beat"), picOpt("rhythm", "🗣️", "The rhythm of the words")],
    answer: isBeat ? "beat" : "rhythm",
    skill: "u:beat:vs-rhythm",
    why: isBeat ? "The drum went even and steady, like a heartbeat — that's the beat." : "The drum played one sound for every word part — that's the rhythm.",
  });
});
const WORD_PHRASES: { words: string; cells: string[] }[] = [
  { words: "Hot cross buns", cells: ["ta", "ta", "taa"] },
  { words: "One a penny, two a penny", cells: ["titi", "titi", "titi", "titi"] },
  { words: "Rain, rain, go away", cells: ["ta", "ta", "titi", "ta"] },
  { words: "Have you any wool?", cells: ["titi", "titi", "taa"] },
  { words: "Twinkle, twinkle, little star", cells: ["ta", "ta", "ta", "ta", "ta", "ta", "taa"] },
  { words: "Apple, apple, pear, pear", cells: ["titi", "titi", "ta", "ta"] },
  { words: "Pizza, pizza, pie!", cells: ["titi", "titi", "taa"] },
  { words: "Splash, splash, splishy splash", cells: ["ta", "ta", "titi", "ta"] },
];
const wordsEchoT = topic("br-words", (r, d) => {
  const ph = pick(r, WORD_PHRASES);
  return { kind: "rhythm", mode: "echo", prompt: `Say it and clap it: "${ph.words}." Now tap the rhythm of the words!`, cells: ph.cells, meter: [4, 4], bpm: 88, show: d < 0.5 ? "sticks" : "none", drum: "block", skill: "u:rhythm:words" };
});
/** n beats a bar with the `strong` ones accented. */
function accentScore(n: number, strong: number[], bpm = 92, bars = 2): Score {
  const hits: { t: number; k: DrumId; v: number }[] = [];
  for (let b = 0; b < bars; b++) for (let i = 0; i < n; i++) hits.push({ t: b * n + i, k: "bongo", v: strong.includes(i) ? 1 : 0.3 });
  return { bpm, meter: [n, 4], tracks: [{ kind: "drums", hits }] };
}
const accentEarT = topic("br-accent", (r, d) => {
  const at = int(r, 0, 3);
  return listen({
    prompt: "Listen! One beat is STRONGER than the others. Which one?",
    sound: accentScore(4, [at], Math.round(88 + d * 16), 2),
    options: [0, 1, 2, 3].map((i) => opt(`b${i + 1}`, `Beat ${i + 1}`, { show: beatsShow(4, [i]) })),
    answer: `b${at + 1}`,
    skill: "u:meter:accent",
    why: `Beat ${at + 1} was the big, strong one. A strong beat is called an accent.`,
  });
});
const meterEarT = topic("br-meter", (r) => meterEar(r, { words: true, skill: "u:meter:2-3" }));
const swLab = (k: number): Activity =>
  [
    (): Activity => ({ kind: "beatlab", mode: "make", prompt: "STRONG-weak, STRONG-weak! Put the big kick on beats 1 and 3, and the little hi-hat on beats 2 and 4.", rows: ["kick", "hat"], steps: 4, bpm: 96, rules: [{ rule: "on", row: "kick", steps: [0, 2] }, { rule: "off", row: "kick", steps: [1, 3] }, { rule: "on", row: "hat", steps: [1, 3] }], skill: "u:meter:strong-weak" }),
    (): Activity => ({ kind: "beatlab", mode: "make", prompt: "Make a march! The bass drum goes on the strong beats, 1 and 3. Add the snare wherever you like.", rows: ["bassdrum", "snare"], steps: 4, bpm: 112, rules: [{ rule: "on", row: "bassdrum", steps: [0, 2] }, { rule: "off", row: "bassdrum", steps: [1, 3] }, { rule: "count", row: "snare", min: 1 }], skill: "u:meter:strong-weak" }),
  ][k]();
const swLabT = topic("br-sw-lab", (r) => swLab(int(r, 0, 1)));
const OST_PATS: string[][] = [["ta", "ta", "titi", "ta"], ["titi", "ta", "titi", "ta"], ["ta", "titi", "ta", "ta"], ["titi", "titi", "ta", "ta"], ["ta", "ta", "ta", "titi"], ["ta", "ta", "titi", "z"]];
const OST_SONGS: { id: string; n: number }[] = [{ id: "twinkle", n: 14 }, { id: "mary", n: 13 }, { id: "lightlyrow", n: 13 }];
const ostHearT = topic("br-ost-hear", (r) => {
  const rep = coin(r);
  const p0 = pick(r, OST_PATS);
  const bars = rep ? [p0, p0, p0, p0] : pickN(r, OST_PATS, 4);
  const sg = pick(r, OST_SONGS);
  return listen({
    prompt: "Listen to the drum under the song. Does it play the same pattern over and over?",
    sound: layer(songScore(sg.id, { inst: "piano", n: sg.n, bpm: 96 }), rhythm(bars.flat(), { bpm: 96, drum: "conga" })),
    options: [picOpt("yes", "🔁", "Yes — it repeats!"), picOpt("no", "🔀", "No — it keeps changing")],
    answer: rep ? "yes" : "no",
    skill: "u:rhythm:ostinato",
    why: rep ? "The drum played the same little pattern again and again. That's an ostinato!" : "The drum's pattern changed every bar, so it wasn't an ostinato.",
  });
});
const ostEchoT = topic("br-ost-echo", (r, d) => {
  const p = pick(r, OST_PATS);
  return { kind: "rhythm", mode: "echo", prompt: "Here's an ostinato — a pattern that repeats! Listen, then tap it back, two times through.", cells: [...p, ...p], meter: [4, 4], bpm: Math.round(84 + d * 12), show: d < 0.5 ? "sticks" : "none", drum: "conga", skill: "u:rhythm:ostinato" };
});
const OST_COPY: string[][] = [["x...x...", "..x...x.", "x.x.x.x."], ["x..x....", "....x...", "xxxxxxxx"], ["x...x.x.", "..x...x.", "x.x.x.x."], ["x.x.....", "....x.x.", "xxxx.xxx"]];
const ostCopyT = topic("br-ost-copy", (r) => ({ kind: "beatlab", mode: "copy", prompt: "The Beat Lab loops a beat over and over — that makes it an ostinato! Copy this one.", rows: ["kick", "block", "hat"], steps: 8, bpm: 96, target: [...pick(r, OST_COPY)], skill: "u:beatmaking:copy" }));
const ostMake = (): Activity => ({ kind: "beatlab", mode: "make", prompt: "Make an ostinato for the bay band! Use at least two drums — the Beat Lab will loop it again and again.", rows: ["kick", "block", "hat"], steps: 8, bpm: 96, rules: [{ rule: "rows", min: 2 }, { rule: "total", min: 4 }], skill: "u:beatmaking:ostinato" });
const ostMakeT = topic("br-ost-make", () => ostMake());
const NAME_WORDS: Word[] = [
  W("Mom", "👩", "Mom"), W("Dad", "👨", "Dad"), W("Grandma", "👵", "Grand-ma"), W("Grandpa", "👴", "Grand-pa"), W("baby", "👶", "ba-by"), W("sister", "👧", "sis-ter"),
  W("brother", "👦", "broth-er"), W("teacher", "👩‍🏫", "teach-er"), W("family", "👪", "fam-i-ly"), W("Sam", "🧒", "Sam"), W("Lucy", "👧", "Lu-cy"), W("Benjamin", "👦", "Ben-ja-min"),
  W("Olivia", "👧", "O-liv-i-a"), W("Max", "🧒", "Max"), W("Isabella", "👧", "Is-a-bel-la"), W("Noah", "👦", "No-ah"),
];
const nameRhythmT = topic("br-names", (r, d) => {
  const pool = NAME_WORDS.filter((w) => w.syllables <= (d < 0.5 ? 3 : 5));
  let ws = pickN(r, pool, 3);
  for (let k = 0; k < 20 && new Set(ws.map((w) => w.syllables)).size < 2; k++) ws = pickN(r, pool, 3);
  return { kind: "rhythm", mode: "syllables", prompt: "Say each name, and tap the drum once for every part!", words: ws.map((w) => ({ text: w.text, syllables: w.syllables, emoji: w.emoji })), bpm: 90, skill: "u:syllables:names" };
});
const LYRIC_FITS: { id: string; n: number }[] = [{ id: "hotcross", n: 3 }, { id: "rainrain", n: 5 }, { id: "twinkle", n: 7 }, { id: "mary", n: 7 }, { id: "baabaa", n: 4 }, { id: "thisoldman", n: 6 }, { id: "rowboat", n: 5 }];
const lyricFit = (r: Rng): Activity => {
  const f = pick(r, LYRIC_FITS);
  const s = song(f.id);
  return { kind: "lyrics", mode: "fit", prompt: "Put each word part on its note — then sing along!", syllables: (s.words ?? []).slice(0, f.n), durs: s.durs.slice(0, f.n), pitches: s.pitches.slice(0, f.n).map((p) => p ?? DO), bpm: 96, meter: s.meter, skill: "u:lyrics:fit" };
};
const lyricFitT = topic("br-lyric", (r) => lyricFit(r));

const BR_IDEA = idea("Beat and rhythm", [
  frame("The BEAT is steady, like your heartbeat. It never changes.", beatsShow(4, [], "❤️"), brSound("hotcross", 6, "beat")),
  frame("The RHYTHM follows the words: Hot… cross… buns!", rhythmShow(["ta", "ta", "taa"]), brSound("hotcross", 6, "rhythm")),
  frame("Hear them both at once? The heartbeat on the low drum, the words on the wood block!", beatsShow(4), layer(songScore("hotcross", { inst: "bells", n: 6, bpm: 96 }), rhythmDurs([1, 1, 1, 1, 1, 1, 1, 1], { bpm: 96, drum: "kick" }), rhythmDurs([1, 1, 2, 1, 1, 2], { bpm: 96, drum: "block" }))),
  frame("Your turn! Tap the steady beat while the song plays.", beatsShow(4), songScore("hotcross", { inst: "bells", bpm: 96 }), "drum"),
], "u:beat:idea");
const STRONG_IDEA = idea("Strong and weak", [
  frame("Beats come in groups. The first beat is STRONG, the next one is weak.", beatsShow(2, [0]), accentScore(2, [0], 96, 4)),
  frame("A march goes STRONG-weak, STRONG-weak: LEFT, right, LEFT, right!", beatsShow(2, [0]), cut(piece("march"), 8)),
  frame("A waltz goes STRONG-weak-weak: ONE, two, three, ONE, two, three!", beatsShow(3, [0]), cut(piece("waltz"), 12)),
  frame("Stomp on the strong beats, tap on the weak ones!", beatsShow(4, [0, 2]), accentScore(4, [0, 2], 96, 2), "drum"),
], "u:meter:idea");
const OST_IDEA = idea("Ostinato", [
  frame("An ostinato is a little pattern that repeats again and again — like waves on the shore.", picsShow("🌊"), rhythm(["ta", "ta", "titi", "z", "ta", "ta", "titi", "z", "ta", "ta", "titi", "z"], { bpm: 96, drum: "conga" })),
  frame("Say it: Splash, splash, splishy splash! Splash, splash, splishy splash!", rhythmShow(["ta", "ta", "titi", "ta"]), rhythm(["ta", "ta", "titi", "ta", "ta", "ta", "titi", "ta"], { bpm: 96, drum: "conga" })),
  frame("Now hear it under a song. Round and round it goes!", picsShow("🔁"), layer(songScore("lightlyrow", { inst: "piano", n: 13, bpm: 96 }), rhythm(Array.from({ length: 4 }, () => ["ta", "ta", "titi", "ta"]).flat(), { bpm: 96, drum: "conga" }))),
], "u:rhythm:idea");
const NAMES_IDEA = idea("Rhythm in names", [
  frame("Names have rhythm too! Sam has one part: Sam.", picsShow("🧒"), rhythmDurs([2], { bpm: 90, drum: "block" })),
  frame("Lu-cy has two parts. Ben-ja-min has three!", picsShow("👧"), rhythmDurs([1, 1, -2, 1, 1, 2], { bpm: 90, drum: "block" })),
  frame("Words ride on notes — that's how songs get their words. Hot cross buns!", rhythmShow(["ta", "ta", "taa"]), songScore("hotcross", { inst: "piano", n: 3, bpm: 90 })),
], "u:syllables:idea");

const BEAT_RHYTHM: WorldDef = {
  id: "g1-beat-rhythm",
  title: "Beat or Rhythm Bay",
  emoji: "❤️",
  grade: "1",
  items: 6,
  blurb: "The steady heartbeat and the bouncy words — strong beats, repeating patterns, and the rhythm of your name!",
  talk: ["Pat the steady beat on your knees while you sing a song. Now clap the words. Which is the beat?", "How many parts are in each family member's name?"],
  challenge: "Make up an ostinato with your hands (pat, pat, clap-clap) and keep it going while someone sings!",
  stages: [
    {
      title: "Heartbeat or words?",
      emoji: "❤️",
      levels: 1,
      topics: [beatVsRhythmT, wordsEchoT, tapBeat],
      intros: ["In the bay, the waves keep the beat and the seagulls sing the words!"],
      fixed: (r) => [BR_IDEA, beatVsRhythmT.gen(r, 0), tapBeat.gen(r, 0.3), wordsEchoT.gen(r, 0), beatVsRhythmT.gen(r, 0.5), wordsEchoT.gen(r, 0.6)],
    },
    {
      title: "Strong and weak",
      emoji: "💪",
      levels: 1,
      topics: [accentEarT, meterEarT, swLabT],
      intros: ["Some beats are strong, some are weak. LEFT, right, LEFT, right!"],
      fixed: (r) => [STRONG_IDEA, accentEarT.gen(r, 0), meterEarT.gen(r, 0.2), swLab(0), accentEarT.gen(r, 0.6), meterEarT.gen(r, 0.8)],
    },
    {
      title: "Ostinato island",
      emoji: "🔁",
      levels: 2,
      topics: [ostHearT, ostEchoT, ostCopyT],
      intros: ["Round and round like the waves — patterns that repeat!", "Beats, rhythms, strong beats and ostinatos — the whole bay is grooving!"],
      fixed: (r, li) =>
        li === 0
          ? [OST_IDEA, ostHearT.gen(r, 0), ostEchoT.gen(r, 0.2), ostCopyT.gen(r, 0.4), ostHearT.gen(r, 0.6), ostEchoT.gen(r, 0.8)]
          : [ostHearT.gen(r, 0.7), beatVsRhythmT.gen(r, 0.6), ostEchoT.gen(r, 0.9), accentEarT.gen(r, 0.8), wordsEchoT.gen(r, 0.8), meterEarT.gen(r, 0.9)],
    },
    {
      title: "Name rhythms",
      emoji: "👪",
      levels: 1,
      topics: [nameRhythmT, lyricFitT, ostMakeT],
      unlocks: ["drum:block", "groove:polka"],
      intros: ["Your name has a rhythm. So do songs! Let's play with words."],
      fixed: (r) => [NAMES_IDEA, nameRhythmT.gen(r, 0), lyricFit(r), nameRhythmT.gen(r, 0.6), ostMake(), lyricFit(r)],
    },
  ],
};

// ── Instrument Families Harbor (1st): strings, woodwinds, brass, percussion ─────────────────────
/** An instrument showing off low in its range, in the middle, or up high. */
function demoAt(id: InstId, where: "low" | "mid" | "high", bpm = 100): Score {
  const { lo, hi } = INSTRUMENTS[id];
  const base = where === "low" ? lo + 5 : where === "high" ? Math.min(hi - 10, Math.max(lo + 12, 72)) : Math.max(lo + 2, Math.min(hi - 14, 60));
  const ps = scale(base, "major", 1).slice(0, 5);
  return melody([...ps, ps[2], ps[0]], [0.5, 0.5, 0.5, 0.5, 1, 0.5, 1.5], id, bpm);
}
const STRINGS: InstId[] = ["violin", "viola", "cello", "doublebass", "harp", "guitar"];
const WINDS: InstId[] = ["flute", "clarinet", "oboe", "bassoon"];
const BRASS: InstId[] = ["trumpet", "trombone", "horn", "tuba"];
const ORCH_ALL: Snd[] = [...STRINGS, ...WINDS, ...BRASS, "timpani", "xylophone", "snare", "cymbals"];
const lower = (id: Snd) => soundName(id).toLowerCase();
const stringsT = topic("fam-strings", (r, d) => whichSound(r, d, d < 0.5 ? ["violin", "cello", "harp", "guitar"] : STRINGS));
const windsT = topic("fam-winds", (r, d) => whichSound(r, d, d < 0.5 ? ["flute", "clarinet", "trumpet", "tuba"] : [...WINDS, ...BRASS]));
const orchWhichT = topic("fam-all", (r, d) => whichSound(r, d, ORCH_ALL));
const BOWED: InstId[] = ["violin", "viola", "cello", "doublebass"];
const PLUCKED: InstId[] = ["harp", "guitar", "banjo", "ukulele"];
const bowPluckT = topic("fam-bow", (r) => {
  const bowed = coin(r);
  const id = pick(r, bowed ? BOWED : PLUCKED);
  return listen({
    prompt: "This is a string instrument. Is it played with a bow, or plucked with fingers?",
    sound: demoAt(id, bowed && (id === "cello" || id === "doublebass") ? "low" : "mid"),
    show: instShow(id),
    options: [picOpt("bow", "🎻", "With a bow"), picOpt("pluck", "🤏", "Plucked with fingers")],
    answer: bowed ? "bow" : "pluck",
    skill: "u:family:bow-pluck",
    why: bowed ? `The ${lower(id)} is played with a bow that rubs the strings — a long, smooth sound.` : `The ${lower(id)}'s strings are plucked or strummed — a "ping" that fades away.`,
  });
});
const STRING_PAIRS: [InstId, InstId][] = [["violin", "cello"], ["violin", "doublebass"], ["viola", "doublebass"], ["violin", "harp"]];
const WIND_PAIRS: [InstId, InstId][] = [["flute", "bassoon"], ["trumpet", "tuba"], ["clarinet", "bassoon"], ["trumpet", "trombone"], ["piccolo", "tuba"]];
/** Two instruments of one family: which plays lower (or higher)? Bigger = lower. */
function sizePair(r: Rng, pairs: [InstId, InstId][]): Activity {
  const [small, big] = pick(r, pairs);
  const askLow = coin(r);
  return listen({
    prompt: askLow ? "Which instrument plays LOWER? Tap each one to hear it." : "Which instrument plays HIGHER? Tap each one to hear it.",
    options: shuffle(r, [small, big]).map((id) => soundOpt(id, demoAt(id, id === big ? "low" : "high"), INSTRUMENTS[id].name, { inst: id })),
    answer: askLow ? big : small,
    skill: "u:family:size",
    why: `The ${lower(big)} is bigger, so it plays lower. The ${lower(small)} is smaller, so it plays higher.`,
  });
}
const sizeStringsT = topic("fam-size-s", (r) => sizePair(r, STRING_PAIRS));
const sizeWindsT = topic("fam-size-w", (r) => sizePair(r, WIND_PAIRS));
const blowBuzzT = topic("fam-wind", (r) => {
  const brass = coin(r);
  const id = pick(r, brass ? BRASS : WINDS);
  return listen({
    prompt: "Woodwind or brass? Listen, and look closely!",
    sound: demo(id),
    show: instShow(id),
    options: [opt("woodwinds", "Woodwinds: blow air", { emoji: "💨" }), opt("brass", "Brass: buzz your lips", { emoji: "🎺" })],
    answer: brass ? "brass" : "woodwinds",
    skill: "u:family:wind-brass",
    why: brass ? `The ${lower(id)} is brass: players buzz their lips into a metal mouthpiece.` : `The ${lower(id)} is a woodwind: players blow air across a hole or through a reed.`,
  });
});
const bowSortT = topic("fam-bow-sort", (r) => {
  const items = [
    ...pickN(r, BOWED, 2).map((id) => ({ id, inst: id, sound: demoAt(id, id === "cello" || id === "doublebass" ? "low" : "mid"), bin: "bow" })),
    ...pickN(r, PLUCKED, 2).map((id) => ({ id, inst: id, sound: demo(id), bin: "pluck" })),
  ];
  return { kind: "soundsort", prompt: "Bowed or plucked? Tap each string instrument to hear it, then sort it.", bins: [{ id: "bow", label: "With a bow", emoji: "🎻" }, { id: "pluck", label: "Plucked", emoji: "🤏" }], items: shuffle(r, items), skill: "u:family:bow-sort" };
});
const windSortT = topic("fam-wind-sort", (r) => {
  const items = [
    ...pickN(r, WINDS.filter((x) => x !== "flute"), 2).map((id) => ({ id, inst: id, sound: demo(id), bin: "woodwinds" })),
    ...pickN(r, BRASS.filter((x) => x !== "trumpet"), 2).map((id) => ({ id, inst: id, sound: demo(id), bin: "brass" })),
  ];
  return { kind: "soundsort", prompt: "Woodwind or brass? Tap each card to hear it, then drag it to its family.", bins: [{ id: "woodwinds", label: "Woodwinds", inst: "flute" }, { id: "brass", label: "Brass", inst: "trumpet" }], items: shuffle(r, items), skill: "u:family:wind-sort" };
});
/** Play like a member of the family: the bells sound like the instrument. */
const FAM_PADS: Partial<Record<InstId, number[]>> = { violin: [67, 71, 74], cello: [48, 52, 55], harp: [60, 64, 67], flute: [72, 76, 79], clarinet: [55, 60, 64], trumpet: [60, 64, 67], tuba: [36, 40, 43] };
const famEcho = (r: Rng, d: number, inst: InstId): Activity => {
  const pads = FAM_PADS[inst] ?? [60, 64, 67];
  return { kind: "melody", mode: "echo", prompt: `Be a ${lower(inst)} player! Listen, then play it back.`, notes: padNotes(r, pads, d < 0.5 ? 3 : 4), pads, inst, labels: "colors", skill: "u:family:play" };
};
const famEchoT = topic("fam-echo", (r, d) => famEcho(r, d, pick(r, Object.keys(FAM_PADS) as InstId[])));
const familyT = topic("fam-which", (r) => whichFamily(r, { pool: [...STRINGS, ...WINDS, ...BRASS, "timpani", "xylophone", "marimba", "glock"], skill: "u:family:which" }));
const FAM_BINS: { id: string; label: string; inst: Snd }[] = [
  { id: "strings", label: "Strings", inst: "violin" },
  { id: "woodwinds", label: "Woodwinds", inst: "flute" },
  { id: "brass", label: "Brass", inst: "trumpet" },
  { id: "percussion", label: "Percussion", inst: "snare" },
];
const FAM_ITEMS: Record<string, Snd[]> = { strings: ["cello", "harp", "doublebass", "viola"], woodwinds: ["clarinet", "oboe", "bassoon", "piccolo"], brass: ["trombone", "tuba", "horn"], percussion: ["timpani", "xylophone", "cymbals", "triangle"] };
const familySortT = topic("fam-sort", (r, d) => {
  const fams = d < 0.5 ? pickN(r, FAM_BINS, 2) : d < 0.8 ? pickN(r, FAM_BINS, 3) : FAM_BINS;
  const per = fams.length === 2 ? [2, 2] : fams.length === 3 ? shuffle(r, [2, 1, 1]) : shuffle(r, [2, 1, 1, 1]);
  const items = fams.flatMap((f, i) => pickN(r, FAM_ITEMS[f.id], per[i]).map((id) => ({ id, inst: id, sound: demo(id), bin: f.id })));
  return { kind: "soundsort", prompt: "Which family? Tap each card to hear it, then drag it home.", bins: fams.map((f) => ({ id: f.id, label: f.label, inst: f.inst })), items: shuffle(r, items), skill: "u:family:sort" };
});
const PENTA = [60, 62, 64, 67, 69];
const orchBacking = (inst: InstId, tonic = 60) => progression(["I", "IV", "V", "I"], tonic, "major", { bpm: 96, per: 2, inst, style: "block" });
const orchCompose = (k: number): Activity =>
  [
    (): Activity => ({ kind: "compose", prompt: "Write a tune for the violin! Use at least 6 notes.", pitches: PENTA, slots: 8, dur: 1, inst: "violin", bpm: 96, tonic: 60, labels: "colors", backing: orchBacking("pizz"), rules: [{ rule: "notes", min: 6 }], skill: "u:compose:orchestra" }),
    (): Activity => ({ kind: "compose", prompt: "Write a fanfare for the trumpet! Make it climb, so it ends higher than it starts.", pitches: PENTA, slots: 8, dur: 1, inst: "trumpet", bpm: 96, tonic: 60, labels: "colors", backing: orchBacking("horn"), rules: [{ rule: "contour", dir: "up" }, { rule: "notes", min: 5 }], skill: "u:compose:orchestra" }),
    (): Activity => ({ kind: "compose", prompt: "Write a deep, low tune for the cello. End on its lowest note.", pitches: [48, 50, 52, 55, 57], slots: 8, dur: 1, inst: "cello", bpm: 96, tonic: 48, labels: "colors", backing: orchBacking("harp", 48), rules: [{ rule: "end", p: 48 }, { rule: "notes", min: 5 }], skill: "u:compose:orchestra" }),
    (): Activity => ({ kind: "compose", prompt: "Write a tune for the flute, the bird of the orchestra. Fly smoothly: use only neighbor notes!", pitches: PENTA, slots: 8, dur: 1, inst: "flute", bpm: 96, tonic: 60, labels: "colors", backing: orchBacking("harp"), rules: [{ rule: "steps" }, { rule: "notes", min: 6 }], skill: "u:compose:orchestra" }),
  ][k]();
const orchComposeT = topic("fam-compose", (r) => orchCompose(int(r, 0, 3)));
/** A tiny orchestra: violin tune (Ode to Joy), flute, horn chords and timpani. */
const orchestra = () =>
  layer(
    songScore("odetojoy", { inst: "violin", n: 15, bpm: 100 }),
    progression(["I", "V", "I", "V"], 60, "major", { bpm: 100, per: 4, inst: "horn", style: "pad" }),
    melody([76, 74, 72, 74], 4, "flute", 100),
    melody([48, null, 48, null, 43, null, 43, null, 48, null, 48, null, 43, null, 43, null], 1, "timpani", 100),
  );

const STRINGS_IDEA = idea("The string family", [
  frame("Meet the string family! They sing when their strings shake.", instShow("violin", "viola", "cello", "doublebass"), then(demoAt("violin", "high"), demoAt("cello", "low"), 0.5)),
  frame("Some strings are played with a BOW, like the violin and the cello.", instShow("violin", "cello"), then(demo("violin"), demoAt("cello", "low"), 0.5)),
  frame("Some strings are PLUCKED with fingers, like the harp and the guitar.", instShow("harp", "guitar"), then(demo("harp"), demo("guitar"), 0.5)),
  frame("Big strings sing low. Little strings sing high!", instShow("violin", "doublebass"), then(demoAt("violin", "high"), demoAt("doublebass", "low"), 0.5)),
], "u:family:idea");
const WINDS_IDEA = idea("Woodwinds and brass", [
  frame("The woodwind family makes sound with air: flute, clarinet, oboe and bassoon.", instShow("flute", "clarinet", "oboe", "bassoon"), then(demo("flute"), demo("clarinet"), 0.5)),
  frame("Flute players blow across a hole. Clarinet and oboe players blow through a thin reed.", instShow("flute", "oboe"), then(demo("flute"), demo("oboe"), 0.5)),
  frame("The brass family BUZZES! Players buzz their lips into shiny metal: trumpet, trombone, horn and tuba.", instShow("trumpet", "trombone", "horn", "tuba"), piece("fanfare")),
  frame("Buzz your lips like a trumpet player: bzzzz!", instShow("trumpet"), demo("trumpet")),
], "u:family:idea");
const PERC_IDEA = idea("Percussion and the orchestra", [
  frame("The percussion family: you hit them, shake them or scrape them!", instShow("snare", "timpani", "cymbals", "triangle"), drums({ snare: "x.x.x.xx", cymbals: "x.......", triangle: "....x..." })),
  frame("Some percussion plays notes, like the xylophone and the timpani.", instShow("xylophone", "timpani"), then(demo("xylophone"), demoAt("timpani", "low"), 0.5)),
  frame("Strings, woodwinds, brass and percussion: four families make one ORCHESTRA!", instShow("violin", "flute", "horn", "timpani"), orchestra()),
], "u:family:idea");
const ORCH_IDEA = idea("Harbor orchestra", [
  frame("Composers write music for each family to play. Listen to the whole orchestra!", instShow("violin", "flute", "horn", "timpani"), orchestra()),
  frame("A composer picks who plays the tune: a sweet violin, a bold trumpet, a deep cello…", instShow("violin", "trumpet", "cello"), then(demoAt("violin", "high"), demoAt("cello", "low"), 0.5)),
  frame("Now YOU are the composer. Write a tune for each instrument!", picsShow("🎼"), layer(melody([60, 64, 67, 69, 67, 64, 62, 60], 1, "violin", 96), orchBacking("pizz"))),
], "u:compose:idea");

const FAMILIES: WorldDef = {
  id: "g1-families",
  title: "Instrument Families Harbor",
  emoji: "🎻",
  grade: "1",
  items: 6,
  blurb: "Strings, woodwinds, brass and percussion — meet the four families of the orchestra!",
  talk: ["Which instrument family would you join? Why?", "Big instruments play low and small ones play high. Can you think of an example?"],
  challenge: "Make a family band: rubber bands on a box (strings), blow across a bottle (woodwind), and a pot drum (percussion)!",
  stages: [
    {
      title: "The string family",
      emoji: "🎻",
      levels: 1,
      topics: [stringsT, bowPluckT, sizeStringsT, bowSortT, famEchoT],
      unlocks: ["inst:violin"],
      intros: ["The string family lives in the first harbor house. Let's meet them!"],
      fixed: (r) => [STRINGS_IDEA, whichSound(r, 0, ["violin", "cello", "harp", "guitar"]), bowPluckT.gen(r, 0), bowSortT.gen(r, 0), sizePair(r, STRING_PAIRS), famEcho(r, 0.3, "violin")],
    },
    {
      title: "Woodwinds and brass",
      emoji: "🎺",
      levels: 1,
      topics: [windsT, blowBuzzT, sizeWindsT, windSortT],
      unlocks: ["inst:trumpet"],
      intros: ["Whoosh and bzzz! The wind families are tuning up."],
      fixed: (r) => [WINDS_IDEA, whichSound(r, 0, ["flute", "clarinet", "trumpet", "tuba"]), blowBuzzT.gen(r, 0), windSortT.gen(r, 0), sizePair(r, WIND_PAIRS), famEcho(r, 0.5, "trumpet")],
    },
    {
      title: "The whole orchestra",
      emoji: "🥁",
      levels: 2,
      topics: [familyT, familySortT, orchWhichT],
      intros: ["Boom, crash, ting! Then everyone plays together.", "All four families are in the harbor today. Can you tell them apart?"],
      fixed: (r, li) =>
        li === 0
          ? [PERC_IDEA, familyT.gen(r, 0), familySortT.gen(r, 0), orchWhichT.gen(r, 0.4), familyT.gen(r, 0.6), familySortT.gen(r, 0.8)]
          : [orchWhichT.gen(r, 0.7), familyT.gen(r, 0.8), famEcho(r, 0.8, pick(r, ["cello", "flute", "tuba"] as InstId[])), sizePair(r, [...STRING_PAIRS, ...WIND_PAIRS]), blowBuzzT.gen(r, 0.9), familySortT.gen(r, 0.9)],
    },
    {
      title: "Harbor orchestra",
      emoji: "🎼",
      levels: 1,
      topics: [orchComposeT],
      intros: ["You're the composer now. Write music for the orchestra!"],
      fixed: (r) => [ORCH_IDEA, orchCompose(0), orchCompose(1), familySortT.gen(r, 1), orchCompose(2), orchCompose(3)],
    },
  ],
};

// ── Mood Music Marina (1st): how music makes us feel ──────────────────────────────────────────
const happySadT = topic("mood-hs", (r) => majorMinor(r, { kid: true, skill: "u:major-minor:happy-sad" }));
type Mood = { id: PieceId; face: string; word: string; why: string };
const MOODS: Mood[] = [
  { id: "happy", face: "😀", word: "Happy", why: "Bright major notes and a bouncy beat make music sound happy!" },
  { id: "sad", face: "😢", word: "Sad", why: "Slow, low minor notes make music sound sad." },
  { id: "calm", face: "😌", word: "Calm", why: "Slow, soft, smooth music feels calm — like a quiet sea." },
  { id: "exciting", face: "🤩", word: "Exciting", why: "Fast, loud music with lots of energy feels exciting!" },
  { id: "spooky", face: "👻", word: "Spooky", why: "Shivery strings and strange notes sound spooky!" },
  { id: "sneaky", face: "🕵️", word: "Sneaky", why: "Quiet, tiptoeing plucks sound sneaky — like a detective creeping along." },
];
const moodPieceT = topic("mood-feel", (r, d) => {
  const pool = d < 0.4 ? MOODS.slice(0, 2) : d < 0.7 ? MOODS.slice(0, 4) : MOODS;
  const ans = pick(r, pool);
  const wrong = pickN(r, pool, Math.min(2, pool.length - 1), (m) => m.id === ans.id);
  return listen({ prompt: "How does this music make you feel?", sound: cut(piece(ans.id), 12), options: shuffle(r, [ans, ...wrong]).map((m) => picOpt(m.id, m.face, m.word)), answer: ans.id, skill: "u:mood:feel", why: ans.why });
});
const calmExcitingT = topic("mood-ce", (r) => {
  const calm = coin(r);
  const id: PieceId = calm ? pick(r, ["calm", "lullaby"] as PieceId[]) : pick(r, ["exciting", "circus", "fanfare"] as PieceId[]);
  return listen({
    prompt: "Is this music calm or exciting?",
    sound: cut(piece(id), 12),
    options: [picOpt("calm", "😌", "Calm"), picOpt("exciting", "🤩", "Exciting")],
    answer: calm ? "calm" : "exciting",
    skill: "u:mood:calm-exciting",
    why: calm ? "It's slow, soft and smooth — calm, like floating on a quiet sea." : "It's fast and loud — exciting, like a big adventure!",
  });
});
const lullabyParadeT = topic("mood-lp", (r) => {
  const lull = coin(r);
  return listen({
    prompt: "Is this a lullaby for bedtime, or a march for a parade?",
    // (The lullaby's music box can't go below middle C, so it stays at C or D.)
    sound: cut(lull ? piece("lullaby", { tonic: pick(r, [60, 62]) }) : piece("march", { tonic: pick(r, [58, 60, 62]) }), 12),
    options: [picOpt("lullaby", "😴", "Lullaby"), picOpt("march", "🥁", "Parade march")],
    answer: lull ? "lullaby" : "march",
    skill: "u:genre:lullaby-march",
    why: lull ? "Soft, slow and swaying in threes — a lullaby to rock a baby to sleep." : "Loud, strong and steady — LEFT, right — a march for a parade!",
  });
});
const SCENES: { emoji: string; what: string; fit: PieceId; not: PieceId[] }[] = [
  { emoji: "🌙", what: "a sleepy night", fit: "lullaby", not: ["circus", "exciting", "march"] },
  { emoji: "🦸", what: "a superhero flying to the rescue", fit: "heroic", not: ["lullaby", "sad", "calm"] },
  { emoji: "👻", what: "a haunted house", fit: "spooky", not: ["happy", "polka", "march"] },
  { emoji: "🎉", what: "a birthday party", fit: "happy", not: ["sad", "spooky", "lullaby"] },
  { emoji: "🕵️", what: "a detective tiptoeing", fit: "sneaky", not: ["march", "happy", "heroic"] },
  { emoji: "🌧️", what: "a rainy, sad day", fit: "sad", not: ["circus", "happy", "exciting"] },
  { emoji: "🤡", what: "a clown at the circus", fit: "circus", not: ["sad", "calm", "spooky"] },
  { emoji: "🌊", what: "a calm, quiet sea", fit: "calm", not: ["exciting", "circus", "march"] },
];
const fitsPictureT = topic("mood-fit", (r, d) => {
  const sc = pick(r, SCENES);
  const ids = shuffle(r, [sc.fit, ...pickN(r, sc.not, d < 0.5 ? 1 : 2)]);
  return listen({
    prompt: `Which music fits ${sc.what}? Tap each one to hear it.`,
    show: picsShow(sc.emoji),
    options: ids.map((id, i) => soundOpt(id, cut(piece(id), 8), ORDINALS[i][0], { emoji: ORDINALS[i][1] })),
    answer: sc.fit,
    skill: "u:mood:fit",
    why: `Movie composers do this! The ${pieceWord(sc.fit)} music matches ${sc.what}.`,
  });
});
/** Happy (major) or sad (minor) tune cards: the same shapes in C major and C minor. */
const MOOD_SHAPES = [[0, 1, 2, 1, 0], [0, 1, 2, 3, 4, 2, 0], [4, 3, 2, 1, 0], [0, 2, 4, 2, 0]];
const hsSortT = topic("mood-hs-sort", (r) => {
  const happy = shuffle(r, [true, true, false, false]);
  const insts = pickN(r, ["piano", "marimba", "flute", "violin", "guitar", "xylophone"] as InstId[], 4);
  return {
    kind: "soundsort",
    prompt: "Happy or sad? Tap each card to hear it, then sort it.",
    bins: [{ id: "happy", label: "Happy", emoji: "😀" }, { id: "sad", label: "Sad", emoji: "😢" }],
    items: happy.map((h, i) => {
      const sc = scale(60, h ? "major" : "minor", 1);
      const ps = pick(r, MOOD_SHAPES).map((k) => sc[k]);
      return { id: `card${i + 1}`, inst: insts[i], sound: then(melody(ps, 0.5, insts[i], 96), melody([[60, h ? 64 : 63, 67]], 2, insts[i], 96), 0), bin: h ? "happy" : "sad" };
    }),
    skill: "u:mood:sort",
  };
});
const CALM_PIECES: PieceId[] = ["calm", "lullaby", "chorale"];
const EXCITING_PIECES: PieceId[] = ["exciting", "circus", "fanfare", "polka"];
const ceSortT = topic("mood-ce-sort", (r) => {
  const items = shuffle(r, [...pickN(r, CALM_PIECES, 2).map((id) => ({ id, sound: cut(piece(id), 6), bin: "calm" })), ...pickN(r, EXCITING_PIECES, 2).map((id) => ({ id, sound: cut(piece(id), 8), bin: "exciting" }))]);
  return { kind: "soundsort", prompt: "Calm or exciting? Tap each card to hear it, then sort it.", bins: [{ id: "calm", label: "Calm", emoji: "😌" }, { id: "exciting", label: "Exciting", emoji: "🤩" }], items, skill: "u:mood:sort" };
});
/** Conduct a change of mood: slow + soft = calm, fast + loud = exciting. */
const moodConduct = (r: Rng, calm: boolean): Activity => ({
  kind: "conduct",
  prompt: calm ? "Turn this lively music CALM: tap the baton slowly, and bring your hand down low." : "Turn this sleepy music EXCITING: tap the baton fast, and lift your hand up high!",
  goal: calm ? { tempo: [50, 84], dyn: [0, 0.35] } : { tempo: [132, 200], dyn: [0.75, 1] },
  music: calm ? piece(pick(r, ["happy", "polka", "march"] as PieceId[])) : piece("lullaby", { bpm: 76 }),
  skill: "u:mood:conduct",
});
const moodConductT = topic("mood-conduct", (r) => moodConduct(r, coin(r)));
const paradeTapT = topic("mood-parade", (r, d) => beatTap({ music: piece("march", { bpm: int(r, 104, 120), tonic: pick(r, [58, 60, 62]) }), beats: 8, scaffold: d < 0.5, prompt: "Join the parade! Tap the drum on every beat of the march.", skill: "u:genre:march-tap" }));
const pieceWord = (id: PieceId) => ({ lullaby: "soft, slow", heroic: "big, brave", spooky: "shivery, spooky", happy: "bright, bouncy", sneaky: "tiptoeing, sneaky", sad: "slow, sad", circus: "silly, bouncy", calm: "smooth, calm" } as Partial<Record<PieceId, string>>)[id] ?? "right";
const HAPPY_PS = [60, 62, 64, 67, 69];
const SAD_PS = [57, 60, 62, 64, 67];
const moodCompose = (k: number): Activity =>
  [
    (): Activity => ({ kind: "compose", prompt: "Write a HAPPY tune! Bouncy and bright — and end on the lowest note, the home note.", pitches: HAPPY_PS, slots: 8, dur: 1, inst: "marimba", bpm: 120, tonic: 60, labels: "colors", backing: progression(["I", "V", "vi", "IV"], 60, "major", { bpm: 120, per: 2, inst: "guitar", style: "strum" }), rules: [{ rule: "end", p: 60 }, { rule: "notes", min: 6 }], skill: "u:compose:mood" }),
    (): Activity => ({ kind: "compose", prompt: "Write a SAD tune — slow and gentle, ending on the lowest note.", pitches: SAD_PS, slots: 8, dur: 1, inst: "piano", bpm: 66, tonic: 57, labels: "colors", backing: progression(["i", "iv", "i", "v"], 57, "minor", { bpm: 66, per: 2, inst: "strings", style: "pad" }), rules: [{ rule: "end", p: 57 }, { rule: "notes", min: 5 }], skill: "u:compose:mood" }),
    (): Activity => ({ kind: "compose", prompt: "Write a CALM tune: smooth, using only neighbor notes. No big jumps!", pitches: HAPPY_PS, slots: 8, dur: 1, inst: "flute", bpm: 72, tonic: 60, labels: "colors", backing: progression(["Imaj7", "IVmaj7"], 60, "major", { bpm: 72, per: 4, inst: "harp", style: "arp" }), rules: [{ rule: "steps" }, { rule: "notes", min: 6 }], skill: "u:compose:mood" }),
    (): Activity => ({ kind: "compose", prompt: "Write an EXCITING tune with at least one BIG jump!", pitches: HAPPY_PS, slots: 8, dur: 1, inst: "trumpet", bpm: 140, tonic: 60, labels: "colors", backing: layer(progression(["I", "IV", "V", "IV"], 60, "major", { bpm: 140, per: 2, inst: "strings", style: "pulse" }), groove("rock", 2, 140)), rules: [{ rule: "leap", min: 3 }, { rule: "notes", min: 6 }], skill: "u:compose:mood" }),
  ][k]();
const moodComposeT = topic("mood-compose", (r) => moodCompose(int(r, 0, 3)));
const MAJ_TUNE = [60, 62, 64, 65, 67, 65, 64, 62, 60];
const MIN_TUNE = [60, 62, 63, 65, 67, 65, 63, 62, 60];

const HS_IDEA = idea("Happy or sad?", [
  frame("Music can make us FEEL things. This music sounds happy!", picsShow("😀"), cut(piece("happy"), 12)),
  frame("This music sounds sad.", picsShow("😢"), cut(piece("sad"), 8)),
  frame("Same tune, two feelings! First major: bright and happy. Then minor: darker and sad.", picsShow("🎭"), then(melody(MAJ_TUNE, 0.5, "piano", 96), melody(MIN_TUNE, 0.5, "piano", 96), 1)),
], "u:mood:idea");
const CE_IDEA = idea("Calm or exciting?", [
  frame("Calm music is slow and soft, like a quiet sea.", picsShow("😌"), cut(piece("calm"), 8)),
  frame("Exciting music is fast and loud, like a big adventure!", picsShow("🤩"), cut(piece("exciting"), 12)),
  frame("A lullaby is calm, to help a baby fall asleep…", picsShow("😴"), cut(piece("lullaby"), 9)),
  frame("…and a parade march is exciting! LEFT, right, LEFT, right!", picsShow("🥁"), cut(piece("march"), 12)),
], "u:mood:idea");
const MOOD_WRITE_IDEA = idea("Make a feeling", [
  frame("Composers choose the notes, the speed and the instruments to make a feeling.", picsShow("🎭"), then(cut(piece("happy"), 8), cut(piece("sad"), 6), 1)),
  frame("Bright notes and a bouncy beat sound HAPPY. Slow, low notes sound sad.", picsShow("😀"), layer(melody([60, 64, 67, 69, 67, 64, 62, 60], 1, "marimba", 120), progression(["I", "V", "vi", "IV"], 60, "major", { bpm: 120, per: 2, inst: "guitar", style: "strum" }))),
  frame("Now it's your turn: write music that FEELS something!", picsShow("🎶"), cut(piece("calm"), 6)),
], "u:compose:idea");

const MOOD: WorldDef = {
  id: "g1-mood",
  title: "Mood Music Marina",
  emoji: "🎭",
  grade: "1",
  items: 6,
  blurb: "Happy or sad, calm or exciting — hear how music makes feelings, then make some of your own!",
  talk: ["Which song makes you feel happy? Which one feels calm?", "If you made the music for a movie about our family, how would it sound?"],
  challenge: "Hum a happy tune, then turn it into a sad one — slower, softer and lower!",
  stages: [
    {
      title: "Happy or sad?",
      emoji: "😀",
      levels: 1,
      topics: [happySadT, moodPieceT, hsSortT],
      intros: ["At the marina, every boat plays a different feeling!"],
      fixed: (r) => [HS_IDEA, happySadT.gen(r, 0), moodPieceT.gen(r, 0), hsSortT.gen(r, 0), fitsPictureT.gen(r, 0.2), happySadT.gen(r, 0.5)],
    },
    {
      title: "Calm or exciting?",
      emoji: "🤩",
      levels: 1,
      topics: [calmExcitingT, lullabyParadeT, fitsPictureT, moodConductT],
      intros: ["Shh, a lullaby… then BOOM, a parade!"],
      fixed: (r) => [CE_IDEA, calmExcitingT.gen(r, 0), lullabyParadeT.gen(r, 0), moodConduct(r, true), fitsPictureT.gen(r, 0.4), moodConduct(r, false)],
    },
    { title: "Movie music", emoji: "🎬", levels: 2, topics: [moodPieceT, fitsPictureT, happySadT, paradeTapT, calmExcitingT, ceSortT], intros: ["Lights, camera, music! Pick the music that fits the movie.", "Every picture needs the right music. You choose!"] },
    {
      title: "Make a feeling",
      emoji: "🎨",
      levels: 1,
      topics: [moodComposeT],
      unlocks: ["inst:guitar"],
      intros: ["Paint a feeling with music!"],
      fixed: (r) => [MOOD_WRITE_IDEA, moodCompose(0), moodCompose(1), fitsPictureT.gen(r, 0.9), moodCompose(2), moodCompose(3)],
    },
  ],
};

// ── Song Studio Bay (1st): do, the home note — and a whole song of your own ─────────────────────
const DMS = [DO, MI, SO];
const DMSL = [DO, MI, SO, LA];
const doEchoT = topic("st-do-echo", (r, d) => solEcho(r, d, d < 0.5 ? DMS : DMSL));
const doMatchT = topic("st-do-match", (r, d) => solfegeMatch(r, { steps: d < 0.5 ? [0, 4, 7] : [0, 4, 7, 9], n: d < 0.5 ? 3 : 4, skill: "u:solfege:do" }));
const doReadT = topic("st-do-read", (r, d) => solRead(r, d, d < 0.5 ? DMS : DMSL));
const doHomeT = topic("st-home", (r) => {
  const home = coin(r);
  const mid = padNotes(r, [MI, SO, LA], 4);
  return listen({
    prompt: "Does this tune sail home to do at the end?",
    sound: melody([DO, ...mid, home ? DO : pick(r, [SO, LA])], [1, 1, 1, 1, 1, 2], "bells", 92),
    show: ladderShow(DO, [0, 4, 7, 9]),
    options: [picOpt("home", "🏠", "Yes — it's home!"), picOpt("away", "⛵", "No — still sailing")],
    answer: home ? "home" : "away",
    skill: "u:solfege:home",
    why: home ? "It ended on do, the home note — so it sounds finished." : "It stopped on another note, so it still sounds like it's sailing away.",
  });
});
const studioBeat = (k: number): Activity =>
  [
    (): Activity => ({ kind: "beatlab", mode: "make", prompt: "A real drummer's beat! Kick on beats 1 and 3, snare on 2 and 4, and the hi-hat ti-ti on every step.", rows: ["kick", "snare", "hat"], steps: 8, bpm: 96, rules: [{ rule: "on", row: "kick", steps: [0, 4] }, { rule: "on", row: "snare", steps: [2, 6] }, { rule: "on", row: "hat", steps: [0, 1, 2, 3, 4, 5, 6, 7] }], skill: "u:beatmaking:song" }),
    (): Activity => ({ kind: "beatlab", mode: "make", prompt: "Make the beat for YOUR song! Use the tom AND the wood block, plus anything else you like.", rows: ["kick", "tom", "block", "hat"], steps: 8, bpm: 96, rules: [{ rule: "count", row: "tom", min: 1 }, { rule: "count", row: "block", min: 1 }, { rule: "total", min: 4 }], skill: "u:beatmaking:song" }),
  ][k]();
const studioBeatT = topic("st-beat", (r) => studioBeat(int(r, 0, 1)));
const songRhythmT = topic("st-rhythm", () => restCreate(2));
const studioBacking = () => layer(progression(["I", "IV", "V", "I"], DO, "major", { bpm: 100, per: 2, inst: "guitar", style: "strum" }), drums({ kick: "x...x...", snare: "..x...x.", hat: "xxxxxxxx" }, 100, 2));
const studioSong = (k: number): Activity =>
  [
    (): Activity => ({ kind: "compose", prompt: "Write your song! Use do, mi, so and la — and end on do, the home note.", pitches: DMSL, slots: 8, dur: 1, inst: "piano", bpm: 100, tonic: DO, labels: "solfege", backing: studioBacking(), rules: [{ rule: "use", pitches: DMSL }, { rule: "end", p: DO }], skill: "u:compose:song" }),
    (): Activity => ({ kind: "compose", prompt: "Write a song that starts on so and sails home to do.", pitches: DMSL, slots: 8, dur: 1, inst: "piano", bpm: 100, tonic: DO, labels: "solfege", backing: studioBacking(), rules: [{ rule: "start", p: SO }, { rule: "end", p: DO }, { rule: "notes", min: 6 }], skill: "u:compose:song" }),
    (): Activity => ({ kind: "compose", prompt: "Give your song a catchy start: make your first two notes come back later. End on do!", pitches: DMSL, slots: 8, dur: 1, inst: "piano", bpm: 100, tonic: DO, labels: "solfege", backing: studioBacking(), rules: [{ rule: "repeat", len: 2 }, { rule: "end", p: DO }, { rule: "notes", min: 6 }], skill: "u:compose:song" }),
    (): Activity => ({ kind: "compose", prompt: "A song with words! Put a note under every word, and end on do.", pitches: DMSL, slots: 8, dur: 1, inst: "piano", bpm: 100, tonic: DO, labels: "solfege", backing: studioBacking(), lyric: ["My", "boat", "sails", "home", "to-", "day,", "hoo-", "ray!"], rules: [{ rule: "notes", min: 8 }, { rule: "end", p: DO }], skill: "u:compose:song" }),
  ][k]();
const studioSongT = topic("st-song", (r) => studioSong(int(r, 0, 3)));

const DO_IDEA = idea("Do, the home note", [
  frame("Meet DO! Do is the home note. A song feels finished when it lands on do.", ladderShow(DO, [0, 4, 7]), melody([SO, MI, DO], [1, 1, 2], "bells", 84)),
  frame("Do sits below mi, at the bottom of the ladder: do, mi, so, la.", ladderShow(DO, [0, 4, 7, 9]), melody([DO, MI, SO, LA, SO, MI, DO], 0.5, "bells", 96)),
  frame("Listen: this tune sails away… and comes home to do!", picsShow("🏠"), melody([DO, MI, SO, LA, SO, MI, MI, DO], [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 2], "bells", 96)),
  frame("This one stops on so. Does it sound finished? Not yet — still sailing!", picsShow("⛵"), melody([DO, MI, SO, LA, SO, MI, LA, SO], [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 2], "bells", 96)),
  frame("Your turn! Play do, mi and so on the bells.", bellsShow(DMS, [], "solfege", DO), melody(DMS, 1, "bells", 84), "bells", DMS),
], "u:solfege:idea");
const PARTS_IDEA = idea("Song parts", [
  frame("A song has parts: a beat, a rhythm, a tune — and words!", { show: "grid", rows: ["kick", "snare", "hat"], pattern: ["x...x...", "..x...x.", "xxxxxxxx"] }, drums({ kick: "x...x...", snare: "..x...x.", hat: "xxxxxxxx" }, 96)),
  frame("Words ride on the rhythm. Hot, cross, buns: ta, ta, ta-a!", rhythmShow(["ta", "ta", "taa"]), songScore("hotcross", { n: 3, inst: "piano", bpm: 90 })),
  frame("Today you'll build each part. Tomorrow's hit song starts here!", picsShow("🧩"), layer(songScore("hotcross", { n: 6, inst: "piano", bpm: 96 }), drums({ kick: "x...x...", snare: "..x...x.", hat: "xxxxxxxx" }, 96))),
], "u:compose:idea");
const MYSONG_IDEA = idea("My first song", [
  frame("Songwriters use what they know: a beat, so-mi-la — and do, the home note.", ladderShow(DO, [0, 4, 7, 9]), layer(melody([SO, MI, LA, SO, MI, SO, MI, DO], 1, "piano", 100), studioBacking())),
  frame("End your tune on do, and it will feel finished, like a boat sailing home.", picsShow("🏠"), melody([MI, SO, MI, DO], [1, 1, 1, 2], "piano", 100)),
  frame("Write it, play it, and save it to your Studio!", picsShow("🎤"), layer(melody([DO, MI, SO, LA, SO, MI, MI, DO], 1, "piano", 100), studioBacking())),
], "u:compose:idea");

const SONG_STUDIO: WorldDef = {
  id: "g1-song-studio",
  title: "Song Studio Bay",
  emoji: "🎧",
  grade: "1",
  items: 6,
  blurb: "Meet do, the home note — then put a beat, a rhythm, words and a tune together into YOUR song!",
  talk: ["Ask to hear the song your child wrote today. What's it called?", "Why does a song sound finished when it lands on do?"],
  challenge: "Write the words for a family song (about your pet, your house or your favorite food) and sing it with a so-mi-la tune!",
  stages: [
    {
      title: "Do, the home note",
      emoji: "🏠",
      levels: 1,
      topics: [doEchoT, doMatchT, doHomeT, doReadT],
      unlocks: ["note:do"],
      intros: ["Every boat needs a home harbor. Every song has a home note: do!"],
      fixed: (r) => [DO_IDEA, doEchoT.gen(r, 0), doMatchT.gen(r, 0.2), doHomeT.gen(r, 0.3), doReadT.gen(r, 0.4), doEchoT.gen(r, 0.7)],
    },
    {
      title: "Song parts",
      emoji: "🧩",
      levels: 2,
      topics: [songRhythmT, lyricFitT, studioBeatT],
      intros: ["Beat, rhythm, words — let's build the parts of a song!", "More song parts! Listen, write, and sing."],
      fixed: (r, li) =>
        li === 0
          ? [PARTS_IDEA, studioBeat(0), restCreate(2), lyricFit(r), dictT.gen(r, 0.5), lyricFit(r)]
          : [lyricFit(r), dictT.gen(r, 0.8), doHomeT.gen(r, 0.6), restCreate(1), doEchoT.gen(r, 0.9), studioBeat(1)],
    },
    {
      title: "My first song",
      emoji: "🎤",
      levels: 1,
      topics: [studioSongT, studioBeatT],
      intros: ["Everything you've learned comes together. Write YOUR song!"],
      fixed: () => [MYSONG_IDEA, studioSong(0), studioBeat(1), studioSong(1), studioSong(2), studioSong(3)],
    },
  ],
};

export const WORLDS: WorldDef[] = [BEAT_BEACH, LOUD_SOFT, FAST_SLOW, HIGH_LOW, SOUND_SILENCE, MUSIC_FRIENDS, SONG_MAKER, TA_TITI, REST_REEF, SOL_MI, BEAT_RHYTHM, FAMILIES, MOOD, SONG_STUDIO];
