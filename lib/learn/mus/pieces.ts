import type { InstId, MNote, MTrack, Score } from "./types";
import { groove, progression, transpose, type Groove } from "./score";
import { songScore } from "./songs";

// Little pieces of music in many styles and moods — the listening library. Each one is written
// here as notes and patterns (no recordings), so it works offline and can be played in any key at
// any speed: a march and a waltz, a lullaby, rock, hip hop, swing, the blues, reggae, bossa nova,
// salsa, country, gospel, EDM, a minuet, ragtime — and movie moods (heroic, spooky, sad, happy,
// sneaky, mysterious, calm, exciting). Lessons ask "what style is this?", "which music fits the
// superhero?", "march or waltz?", and the Studio borrows their grooves.

/** Melody shorthand: "0 4 7 12/2 r 7/2" = semitones above the tonic with an optional /length
 *  (default `d`), "r" a rest, "0+4+7" a chord. */
export function line(tonic: number, spec: string, d = 1): MNote[] {
  return spec
    .trim()
    .split(/\s+/)
    .map((tok) => {
      const [x, len] = tok.split("/");
      const dd = len ? Number(len) : d;
      if (x === "r") return { p: null, d: dd };
      const ps = x.split("+").map((s) => tonic + Number(s));
      return { p: ps.length > 1 ? ps : ps[0], d: dd };
    });
}
const notes = (inst: InstId, ns: MNote[], vol?: number, at?: number): MTrack => ({ kind: "notes", inst, notes: ns, vol, at });
const withTracks = (s: Score, ...tracks: MTrack[]): Score => ({ ...s, tracks: [...s.tracks, ...tracks] });
/** Drums only from a groove, cut to `beats`. */
function drums(g: Groove, beats: number, bpm: number): MTrack {
  const s = groove(g, Math.ceil(beats / 3) + 1, bpm);
  const t = s.tracks[0];
  return t.kind === "drums" ? { ...t, hits: t.hits.filter((h) => h.t < beats - 1e-6), vol: 0.8 } : t;
}

export type PieceId =
  | "march" | "waltz" | "lullaby" | "rock" | "hiphop" | "swing" | "blues" | "reggae" | "bossa" | "salsa" | "country" | "gospel" | "edm"
  | "minuet" | "ragtime" | "funk" | "trap" | "polka" | "chorale" | "fanfare" | "circus" | "lofi"
  | "heroic" | "spooky" | "sad" | "happy" | "sneaky" | "mysterious" | "calm" | "exciting";

type Opts = { tonic?: number; bpm?: number };
export const PIECES: Record<PieceId, { name: string; kind: "style" | "mood"; build: (o: Opts) => Score }> = {
  march: {
    name: "March",
    kind: "style",
    build: ({ tonic = 60, bpm = 116 }) => {
      const base = progression(["I", "I", "IV", "I", "V", "V", "I", "I"], tonic, "major", { bpm, per: 2, inst: "horn", style: "oompah", lowInst: "tuba" });
      return withTracks(base, notes("trumpet", line(tonic, "0/0.5 4/0.5 7/1 7/0.5 4/0.5 0/1 5/0.5 9/0.5 12/1 9/1 7/0.5 11/0.5 14/1 11/0.5 7/0.5 12/2"), 0.85), drums("march", 16, bpm));
    },
  },
  waltz: {
    name: "Waltz",
    kind: "style",
    build: ({ tonic = 60, bpm = 150 }) => {
      const base = progression(["I", "I", "V7", "V7", "V7", "V7", "I", "I"], tonic, "major", { bpm, per: 3, inst: "piano", style: "waltz", meter: [3, 4] });
      return { ...withTracks(base, notes("violin", line(tonic, "4/2 7/1 12/2 11/1 9/2 7/1 5/3 5/2 7/1 11/2 9/1 7/2 5/1 4/3"), 0.85)), meter: [3, 4] };
    },
  },
  lullaby: {
    name: "Lullaby",
    kind: "style",
    build: ({ tonic = 60, bpm = 72 }) => {
      const base = progression(["I", "IV", "I", "V", "I", "IV", "V", "I"], tonic, "major", { bpm, per: 3, inst: "pad", style: "pad", meter: [3, 4] });
      return { ...withTracks(base, notes("musicbox", line(tonic + 12, "7/2 4/1 7/2 9/1 7/2 4/1 2/3 4/2 5/1 7/2 4/1 2/2 -1/1 0/3"), 0.8)), meter: [3, 4], fx: { reverb: 0.5 } };
    },
  },
  rock: {
    name: "Rock",
    kind: "style",
    build: ({ tonic = 52, bpm = 124 }) => {
      const riff = line(tonic, "0+7/0.5 0+7/0.5 0+7/0.5 0+7/0.5 0+7/0.5 0+7/0.5 3+10/0.5 5+12/0.5 5+12/0.5 5+12/0.5 5+12/0.5 5+12/0.5 3+10/0.5 3+10/0.5 0+7/1");
      const bass = line(tonic - 12, "0/0.5 0/0.5 0/0.5 0/0.5 0/0.5 0/0.5 3/0.5 5/0.5 5/0.5 5/0.5 5/0.5 5/0.5 3/0.5 3/0.5 0/1");
      return { bpm, tracks: [notes("eguitar", [...riff, ...riff], 0.75), notes("bass", [...bass, ...bass], 0.9), drums("rock", 16, bpm)] };
    },
  },
  hiphop: {
    name: "Hip hop",
    kind: "style",
    build: ({ tonic = 57, bpm = 88 }) => {
      const keys = progression(["i", "VI", "III", "VII"], tonic, "minor", { bpm, per: 4, inst: "piano", style: "block" });
      const bass = line(tonic - 24, "0/1.5 0/0.5 r/2 8/1.5 8/0.5 r/2 3/1.5 3/0.5 r/2 10/1.5 10/0.5 r/2");
      return { ...withTracks(keys, notes("synthbass", bass, 1), drums("hiphop", 16, bpm)), swing: 0.12 };
    },
  },
  lofi: {
    name: "Lo-fi beat",
    kind: "style",
    build: ({ tonic = 60, bpm = 78 }) => {
      const keys = progression(["IVmaj7", "iii7", "ii7", "Imaj7"], tonic, "major", { bpm, per: 4, inst: "piano", style: "block" });
      return { ...withTracks(keys, notes("kalimba", line(tonic + 12, "4/1 7/0.5 9/1.5 r/1 2/1 4/0.5 7/2.5 r/1 0/1 2/0.5 4/1.5 r/1 -1/3 r/1"), 0.6), notes("bass", line(tonic - 24, "5/4 4/4 2/4 0/4"), 0.85), drums("hiphop", 16, bpm)), swing: 0.18, fx: { lowpass: 0.45, reverb: 0.3 } };
    },
  },
  swing: {
    name: "Jazz swing",
    kind: "style",
    build: ({ tonic = 60, bpm = 150 }) => {
      const comp = progression(["ii7", "V7", "Imaj7", "VI7"], tonic, "major", { bpm, per: 4, inst: "piano", style: "block" });
      comp.tracks[0] = notes("piano", comp.tracks[0].kind === "notes" ? comp.tracks[0].notes.flatMap((x) => [{ p: null, d: 1 }, { p: x.p, d: 1, v: 0.6 }, { p: null, d: 1 }, { p: x.p, d: 1, v: 0.55 }]) : [], 0.7);
      const walk = line(tonic - 24, "2 5 9 12 7 11 14 13 12 7 4 7 9 13 16 14");
      const sax = line(tonic, "r/1 9/0.5 10/0.5 9/0.5 7/0.5 4/1 5/1.5 4/0.5 2/1 r/1 7/0.5 9/0.5 11/1 12/2 r/1 9/0.5 7/0.5 4/2 r/2");
      return { ...withTracks(comp, notes("doublebass", walk, 0.95), notes("sax", sax, 0.8), drums("swing", 16, bpm)), swing: 0.33 };
    },
  },
  blues: {
    name: "Blues",
    kind: "style",
    build: ({ tonic = 60, bpm = 104 }) => {
      const bars = ["I7", "I7", "I7", "I7", "IV7", "IV7", "I7", "I7", "V7", "IV7", "I7", "V7"];
      const keys = progression(bars, tonic, "major", { bpm, per: 4, inst: "organ", style: "strum" });
      const boogie = bars.flatMap((r) => {
        const off = r.startsWith("IV") ? 5 : r.startsWith("V") ? 7 : 0;
        return line(tonic - 24 + off, "0 4 7 9 10 9 7 4", 0.5);
      });
      const lick = line(tonic + 12, "r/1 3/0.5 5/0.5 6/0.5 7/1.5 r/2 10/1 7/0.5 5/0.5 3/1 0/1");
      return { ...withTracks(keys, notes("bass", boogie, 0.9), notes("harmonica", [...lick, { p: null, d: 8 }, ...line(tonic + 17, "r/1 3/0.5 5/0.5 6/0.5 7/1.5 r/2 10/1 7/0.5 5/0.5 3/1 0/1")], 0.75), drums("shuffle", 48, bpm)), swing: 0.33 };
    },
  },
  reggae: {
    name: "Reggae",
    kind: "style",
    build: ({ tonic = 55, bpm = 78 }) => {
      const skank: MNote[] = [];
      for (const r of ["I", "IV", "I", "V"]) {
        const off = r === "IV" ? 5 : r === "V" ? 7 : 0;
        for (let b = 0; b < 4; b++) skank.push({ p: null, d: 0.5 }, { p: [tonic + 12 + off, tonic + 16 + off, tonic + 19 + off], d: 0.5, v: 0.6 });
      }
      const bass = line(tonic - 24, "0/1.5 0/0.5 4/1 7/1 5/1.5 5/0.5 9/1 12/1 0/1.5 0/0.5 4/1 7/1 7/1.5 7/0.5 11/1 14/1");
      return { bpm, tracks: [notes("organ", skank, 0.65), notes("bass", bass, 1), drums("reggae", 16, bpm)] };
    },
  },
  bossa: {
    name: "Bossa nova",
    kind: "style",
    build: ({ tonic = 60, bpm = 132 }) => {
      const gtr = progression(["Imaj7", "ii7", "iii7", "ii7"], tonic, "major", { bpm, per: 4, inst: "guitar", style: "pulse" });
      return withTracks(gtr, notes("flute", line(tonic + 12, "7/1.5 4/0.5 4/1 2/1 4/1.5 7/0.5 5/2 4/1.5 2/0.5 2/1 0/1 2/4"), 0.75), notes("bass", line(tonic - 24, "0/1.5 7/2.5 2/1.5 9/2.5 4/1.5 11/2.5 2/1.5 9/2.5"), 0.85), drums("bossa", 16, bpm));
    },
  },
  salsa: {
    name: "Salsa",
    kind: "style",
    build: ({ tonic = 60, bpm = 180 }) => {
      const montuno = ["I", "IV", "V", "IV"].flatMap((r) => {
        const off = r === "IV" ? 5 : r === "V" ? 7 : 0;
        return line(tonic + off, "0+12/0.5 4/0.5 7/0.5 0+12/0.5 r/0.5 4/0.5 7/0.5 4/0.5");
      });
      const tumbao = line(tonic - 24, "r/1.5 7/1 0/1.5 r/1.5 12/1 5/1.5 r/1.5 14/1 7/1.5 r/1.5 12/1 5/1.5");
      return { bpm, tracks: [notes("piano", [...montuno, ...montuno], 0.7), notes("bass", tumbao, 0.9), drums("salsa", 16, bpm)] };
    },
  },
  country: {
    name: "Country",
    kind: "style",
    build: ({ tonic = 55, bpm = 116 }) => {
      const banjo = progression(["I", "I", "IV", "I", "V", "V", "I", "I"], tonic + 12, "major", { bpm, per: 2, inst: "banjo", style: "arp" });
      return withTracks(banjo, notes("violin", line(tonic + 12, "4/1 7/1 9/0.5 7/0.5 4/1 5/1 9/1 7/2 2/1 4/0.5 2/0.5 0/2"), 0.75), notes("bass", line(tonic - 12, "0 7 0 7 0 7 0 7 5 12 0 7 7 2 0 7"), 0.85), drums("country", 16, bpm));
    },
  },
  gospel: {
    name: "Gospel",
    kind: "style",
    build: ({ tonic = 58, bpm = 88 }) => {
      const organ = progression(["I", "IV", "I", "V", "I", "IV", "V", "I"], tonic, "major", { bpm, per: 2, inst: "organ", style: "strum", bass: true });
      return withTracks(organ, notes("choir", line(tonic + 12, "4/2 5/1 4/1 2/2 0/2 4/2 5/1 7/1 7/4"), 0.7), drums("gospel", 16, bpm));
    },
  },
  edm: {
    name: "Electronic dance",
    kind: "style",
    build: ({ tonic = 57, bpm = 126 }) => {
      const pad = progression(["i", "VI", "III", "VII"], tonic, "minor", { bpm, per: 4, inst: "pad", style: "pad" });
      const arp = ["i", "VI", "III", "VII"].flatMap((r) => {
        const off = r === "VI" ? 8 : r === "III" ? 3 : r === "VII" ? 10 : 0;
        const m3 = r === "i" ? 3 : 4;
        return line(tonic + 12 + off, `0 ${m3} 7 12 7 ${m3} 0 ${m3}`, 0.5);
      });
      const bass = ["i", "VI", "III", "VII"].flatMap((r) => line(tonic - 24 + (r === "VI" ? 8 : r === "III" ? 3 : r === "VII" ? 10 : 0), "r/0.5 0/0.5 r/0.5 0/0.5 r/0.5 0/0.5 r/0.5 0/0.5"));
      return withTracks(pad, notes("synth", arp, 0.6), notes("synthbass", bass, 0.9), drums("edm", 16, bpm));
    },
  },
  minuet: {
    name: "Minuet (classical)",
    kind: "style",
    build: ({ bpm = 120 }) => {
      const s = songScore("minuet", { inst: "piano", bpm });
      return withTracks(s, notes("pizz", line(43, "0+12/3 -1+11/3 -3+9/3 -5+7/3 -3+9/3 -5+7/3 -7+5/3 2+14/3"), 0.6));
    },
  },
  ragtime: {
    name: "Ragtime",
    kind: "style",
    build: ({ bpm = 100 }) => {
      const s = songScore("entertainer", { inst: "piano", bpm });
      return withTracks(s, notes("piano", line(48, "r/0.5 0/0.5 4+7+12/0.5 -5/0.5 4+7+12/0.5 0/0.5 4+7+12/0.5 -5/0.5 4+7+12/0.5 5/0.5 9+12+17/0.5 0/0.5 9+12+17/0.5 7/0.5 11+14+17/0.5 -5/0.5 4+7+12/1"), 0.55));
    },
  },
  funk: {
    name: "Funk",
    kind: "style",
    build: ({ tonic = 52, bpm = 104 }) => {
      const bass = line(tonic - 12, "0/0.25 r/0.25 12/0.25 r/0.25 0/0.25 0/0.25 r/0.5 10/0.25 r/0.25 12/0.25 0/0.25 r/0.5 7/0.25 10/0.25", 0.25);
      const stabs = line(tonic + 12, "r/0.5 3+7+10/0.25 r/0.75 3+7+10/0.25 r/0.25 3+7+10/0.25 r/1.75", 0.25);
      return { bpm, tracks: [notes("synthbass", [...bass, ...bass, ...bass, ...bass], 1), notes("organ", [...stabs, ...stabs, ...stabs, ...stabs], 0.6), drums("funk", 16, bpm)] };
    },
  },
  trap: {
    name: "Trap",
    kind: "style",
    build: ({ tonic = 55, bpm = 140 }) => {
      const arp = line(tonic + 12, "0/0.5 3/0.5 7/0.5 3/0.5 0/0.5 3/0.5 8/0.5 7/0.5", 0.5);
      return { bpm, tracks: [notes("piano", [...arp, ...arp, ...arp, ...arp], 0.55), notes("synthbass", line(tonic - 24, "0/3 r/1 8/2 7/2 0/3 r/1 3/2 2/2"), 1), drums("trap", 16, bpm)] };
    },
  },
  polka: {
    name: "Polka",
    kind: "style",
    build: ({ tonic = 60, bpm = 132 }) => {
      const base = progression(["I", "V7", "V7", "I", "I", "V7", "V7", "I"], tonic, "major", { bpm, per: 2, inst: "accordion", style: "oompah", lowInst: "tuba" });
      return withTracks(base, notes("clarinet", line(tonic + 12, "4/0.5 5/0.5 7/0.5 7/0.5 7/0.5 5/0.5 4/1 2/0.5 4/0.5 5/0.5 5/0.5 5/0.5 4/0.5 2/1 4/0.5 5/0.5 7/0.5 12/0.5 11/0.5 9/0.5 7/1 5/0.5 2/0.5 -1/1 0/2"), 0.8), drums("polka", 16, bpm));
    },
  },
  chorale: {
    name: "Hymn (chorale)",
    kind: "style",
    build: ({ tonic = 60, bpm = 66 }) => progression(["I", "IV", "I", "V", "vi", "IV", "V", "I"], tonic, "major", { bpm, per: 2, inst: "choir", style: "block", bass: true }),
  },
  fanfare: {
    name: "Fanfare",
    kind: "style",
    build: ({ tonic = 60, bpm = 112 }) => ({ bpm, tracks: [notes("trumpet", line(tonic, "0/0.333 0/0.333 0/0.334 7/1 r/0.5 4/0.25 7/0.25 12/2 r/1 7/0.333 7/0.333 7/0.334 12/1 r/0.5 16/0.25 19/0.25 24/2"), 0.9), notes("timpani", line(tonic - 12, "0/1 r/1 -5/1 r/1 0/1 r/1 -5/0.5 -5/0.5 0/2"), 0.8)] }),
  },
  circus: {
    name: "Circus",
    kind: "style",
    build: ({ tonic = 60, bpm = 176 }) => {
      const base = progression(["I", "I", "V7", "V7", "V7", "V7", "I", "I"], tonic, "major", { bpm, per: 2, inst: "organ", style: "oompah", lowInst: "tuba" });
      return withTracks(base, notes("organ", line(tonic + 12, "7/0.5 6/0.5 7/0.5 6/0.5 7/0.5 8/0.5 9/1 5/0.5 4/0.5 5/0.5 4/0.5 5/0.5 6/0.5 7/1 2/0.5 1/0.5 2/0.5 3/0.5 4/0.5 7/0.5 11/1 12/2"), 0.7), drums("polka", 16, bpm));
    },
  },
  heroic: {
    name: "Heroic",
    kind: "mood",
    build: ({ tonic = 60, bpm = 104 }) => {
      const strings = progression(["I", "bVI", "bVII", "I"], tonic, "major", { bpm, per: 4, inst: "strings", style: "pad" });
      return withTracks(strings, notes("horn", line(tonic, "0/1 7/0.5 12/2.5 10/0.75 8/0.25 10/1 7/2 r/1 0/1 7/0.5 12/1.5 15/1 14/1 12/4"), 0.9), notes("timpani", line(tonic - 12, "0/0.25 0/0.25 0/0.25 0/0.25 0/3 r/4 0/0.25 0/0.25 0/0.25 0/0.25 0/3 r/4"), 0.75));
    },
  },
  spooky: {
    name: "Spooky",
    kind: "mood",
    build: ({ tonic = 57, bpm = 72 }) => {
      const trem: MNote[] = [];
      for (const off of [0, 0, 1, 0, 3, 1, 0, -1]) for (let k = 0; k < 8; k++) trem.push({ p: [tonic - 12 + off, tonic - 12 + off + 6], d: 0.125, v: 0.45 });
      return { bpm, fx: { reverb: 0.7 }, tracks: [notes("cello", trem, 0.7), notes("organ", line(tonic, "r/2 0/1.5 1/0.5 0/1 r/1 3/1.5 2/0.5 1/1 r/1 -1/2 0/2"), 0.6)] };
    },
  },
  sad: {
    name: "Sad",
    kind: "mood",
    build: ({ tonic = 57, bpm = 62 }) => {
      const arps = progression(["i", "VI", "iv", "V"], tonic, "minor", { bpm, per: 4, inst: "piano", style: "arp" });
      return withTracks(arps, notes("cello", line(tonic - 12, "12/2 10/1 8/1 7/3 5/1 8/2 7/1 5/1 4/4"), 0.75));
    },
  },
  happy: {
    name: "Happy",
    kind: "mood",
    build: ({ tonic = 60, bpm = 132 }) => {
      // The ukulele sits high (its strings start at middle C), so its chords go up an octave.
      const keys = transpose(progression(["I", "V", "vi", "IV"], tonic, "major", { bpm, per: 4, inst: "ukulele", style: "strum" }), 12);
      return withTracks(keys, notes("marimba", line(tonic + 12, "0/0.5 4/0.5 7/1 4/0.5 7/0.5 12/1 11/0.5 7/0.5 2/1 7/1 r/0.5 9/0.5 12/0.5 9/0.5 5/1 4/0.5 2/0.5 0/2"), 0.75), drums("pop", 16, bpm));
    },
  },
  sneaky: {
    name: "Sneaky",
    kind: "mood",
    build: ({ tonic = 57, bpm = 112 }) => ({
      bpm,
      tracks: [
        notes("pizz", line(tonic - 12, "0/0.5 r/0.5 3/0.5 r/0.5 7/0.5 r/0.5 6/0.5 r/0.5 5/0.5 r/0.5 3/0.5 r/0.5 0/0.5 r/0.5 -1/0.5 r/0.5 0/0.5 r/0.5 3/0.5 r/0.5 7/0.5 r/0.5 6/0.5 r/0.5 7/0.5 r/0.5 10/0.5 r/0.5 12/1 r/1"), 0.85),
        notes("clarinet", line(tonic, "r/4 r/2 3/0.5 2/0.5 0/1 r/4 r/2 7/0.5 6/0.5 7/1"), 0.6),
      ],
    }),
  },
  mysterious: {
    name: "Mysterious",
    kind: "mood",
    build: ({ tonic = 60, bpm = 76 }) => {
      const wt = line(tonic, "0 2 4 6 8 10 12 10 8 6 4 2", 0.5);
      return { bpm, fx: { reverb: 0.6 }, tracks: [notes("harp", [...wt, ...wt], 0.7), notes("pad", line(tonic - 12, "0+6/6 2+8/6"), 0.5)] };
    },
  },
  calm: {
    name: "Calm",
    kind: "mood",
    build: ({ tonic = 60, bpm = 66 }) => {
      const arps = progression(["Imaj7", "IVmaj7", "Imaj7", "IVmaj7"], tonic, "major", { bpm, per: 4, inst: "harp", style: "arp" });
      return { ...withTracks(arps, notes("flute", line(tonic + 12, "4/3 2/1 0/4 5/3 4/1 2/4"), 0.6)), fx: { reverb: 0.5 } };
    },
  },
  exciting: {
    name: "Exciting",
    kind: "mood",
    build: ({ tonic = 50, bpm = 156 }) => {
      const ost: MNote[] = [];
      for (const off of [0, 0, 3, 5]) for (let k = 0; k < 8; k++) ost.push({ p: tonic + off + (k % 2 ? 12 : 0), d: 0.5, v: k % 2 ? 0.6 : 0.85 });
      return { bpm, tracks: [notes("strings", ost, 0.75), notes("trumpet", line(tonic + 12, "0/2 3/1 5/1 7/3 10/1 12/4 10/2 7/2"), 0.8), drums("rock", 16, bpm)] };
    },
  },
};
export const piece = (id: PieceId, o: Opts = {}): Score => PIECES[id].build(o);
export const PIECE_IDS = Object.keys(PIECES) as PieceId[];
