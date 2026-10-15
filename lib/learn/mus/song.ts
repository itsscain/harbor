import type { DrumId, InstId, MNote, MTrack, Score } from "./types";
import { isDrum, isInst } from "./catalog";
import { SCALES, parseRoman, romanChord, type ScaleKind } from "./theory";
import { chain, progression, voiced, type ChordStyle } from "./score";

// A song a child makes in the Studio: a beat, a melody, chords, a bass line, lyrics, and the order
// of its sections (intro, verse, chorus…). Stored as small JSON on the wall and synced home with
// the Learn ledger ("song:<id>"), so a grown-up can hear it on their phone. Everything that comes
// back from storage is checked and clamped (it's played and drawn), never trusted.

export const SECTION_IDS = ["intro", "verse", "chorus", "bridge", "outro"] as const;
export type SectionId = (typeof SECTION_IDS)[number];
/** Which parts play in each section (the arrangement lesson: build it up, strip it down). */
export const SECTION_PARTS: Record<SectionId, { beat: boolean; bass: boolean; chords: boolean; melody: boolean; name: string; color: string }> = {
  intro: { beat: false, bass: false, chords: true, melody: false, name: "Intro", color: "#8ad4ff" },
  verse: { beat: true, bass: true, chords: true, melody: false, name: "Verse", color: "#3ccf6e" },
  chorus: { beat: true, bass: true, chords: true, melody: true, name: "Chorus", color: "#ff7363" },
  bridge: { beat: false, bass: true, chords: true, melody: true, name: "Bridge", color: "#8b6cff" },
  outro: { beat: true, bass: false, chords: true, melody: false, name: "Outro", color: "#ffc83d" },
};

export type StudioSong = {
  v: 1;
  id: string;
  title: string;
  bpm: number;
  /** do (the tonic), as MIDI. */
  key: number;
  scale: ScaleKind;
  swing: number;
  /** Bars in the loop. */
  bars: 1 | 2 | 4;
  /** Beat Lab: one row per drum, 8 steps per bar ("x" hit, "." rest). */
  beat: { rows: DrumId[]; grid: string[] };
  /** Melody: one slot per eighth note — semitones above do, null = rest, "-" = keep holding. */
  melody: { inst: InstId; notes: (number | "-" | null)[] };
  chords: { on: boolean; inst: InstId; style: ChordStyle; romans: string[] };
  bass: { on: boolean; inst: InstId };
  lyrics: string[];
  /** The song's sections in order (empty = just the loop). */
  sections: SectionId[];
  /** When it was made (ISO). */
  at?: string;
};

export const SONG_ADJ = ["Groovy", "Sunny", "Sparkly", "Dancing", "Sleepy", "Brave", "Silly", "Happy", "Spooky", "Rainbow", "Jumping", "Moonlight", "Bouncy", "Mighty", "Secret", "Tiny", "Giant", "Rocking", "Swinging", "Shining"];
export const SONG_NOUN = ["Octopus", "Dolphin", "Pirate", "Rocket", "Sailboat", "Starfish", "Thunder", "Lighthouse", "Whale", "Waves", "Parrot", "Seahorse", "Sunrise", "Dragon", "Island", "Treasure", "Seagull", "Rainstorm", "Jellyfish", "Moon"];
export const SONG_KIND = ["Song", "Jam", "Groove", "Dance", "Blues", "Lullaby", "Anthem", "March", "Boogie", "Tune"];

export const STEPS_PER_BAR = 8;
export const SLOTS_PER_BAR = 8;

/** A fresh song for a child with the Studio's starter kit. */
export function newSong(id: string, o: { rows?: DrumId[]; inst?: InstId; scale?: ScaleKind; title?: string } = {}): StudioSong {
  const rows = o.rows ?? ["kick", "clap"];
  return {
    v: 1,
    id,
    title: o.title ?? "My Song",
    bpm: 100,
    key: 60,
    scale: o.scale ?? "sml",
    swing: 0,
    bars: 1,
    beat: { rows, grid: rows.map(() => ".".repeat(STEPS_PER_BAR)) },
    melody: { inst: o.inst ?? "bells", notes: Array.from({ length: SLOTS_PER_BAR }, () => null) },
    chords: { on: false, inst: "piano", style: "block", romans: ["I"] },
    bass: { on: false, inst: "bass" },
    lyrics: [],
    sections: [],
  };
}

const clamp = (v: unknown, lo: number, hi: number, d: number) => (typeof v === "number" && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d);
const STYLES: ChordStyle[] = ["block", "strum", "arp", "pad", "oompah", "pulse", "waltz"];

/** Check and clamp a song that came back from storage (null if it isn't one). */
export function songFrom(raw: unknown): StudioSong | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string") return null;
  const bars = ([1, 2, 4] as const).includes(r.bars as 1 | 2 | 4) ? (r.bars as 1 | 2 | 4) : 1;
  const steps = bars * STEPS_PER_BAR;
  const beatRaw = (r.beat ?? {}) as { rows?: unknown; grid?: unknown };
  const rows = (Array.isArray(beatRaw.rows) ? beatRaw.rows : []).filter((x): x is DrumId => typeof x === "string" && isDrum(x)).slice(0, 8);
  const grid = rows.map((_, i) => {
    const g = Array.isArray(beatRaw.grid) && typeof beatRaw.grid[i] === "string" ? (beatRaw.grid[i] as string) : "";
    return Array.from({ length: steps }, (_, j) => (g[j] === "x" ? "x" : ".")).join("");
  });
  const melRaw = (r.melody ?? {}) as { inst?: unknown; notes?: unknown };
  const notes = Array.from({ length: bars * SLOTS_PER_BAR }, (_, i) => {
    const v = Array.isArray(melRaw.notes) ? melRaw.notes[i] : null;
    return v === "-" ? "-" : typeof v === "number" && Number.isInteger(v) && v >= -12 && v <= 24 ? v : null;
  });
  const chRaw = (r.chords ?? {}) as { on?: unknown; inst?: unknown; style?: unknown; romans?: unknown };
  const romans = (Array.isArray(chRaw.romans) ? chRaw.romans : []).filter((x): x is string => typeof x === "string" && validRoman(x)).slice(0, bars);
  const bassRaw = (r.bass ?? {}) as { on?: unknown; inst?: unknown };
  const scale = typeof r.scale === "string" && r.scale in SCALES ? (r.scale as ScaleKind) : "penta";
  return {
    v: 1,
    id: r.id.slice(0, 40),
    title: typeof r.title === "string" && r.title.trim() ? r.title.trim().slice(0, 48) : "My Song",
    bpm: Math.round(clamp(r.bpm, 60, 180, 100)),
    key: Math.round(clamp(r.key, 48, 72, 60)),
    scale,
    swing: clamp(r.swing, 0, 0.35, 0),
    bars,
    beat: { rows, grid },
    melody: { inst: typeof melRaw.inst === "string" && isInst(melRaw.inst) ? melRaw.inst : "bells", notes },
    chords: {
      on: chRaw.on === true,
      inst: typeof chRaw.inst === "string" && isInst(chRaw.inst) ? chRaw.inst : "piano",
      style: STYLES.includes(chRaw.style as ChordStyle) ? (chRaw.style as ChordStyle) : "block",
      romans: romans.length ? Array.from({ length: bars }, (_, i) => romans[i] ?? romans[romans.length - 1]) : Array.from({ length: bars }, () => "I"),
    },
    bass: { on: bassRaw.on === true, inst: bassRaw.inst === "synthbass" ? "synthbass" : "bass" },
    lyrics: (Array.isArray(r.lyrics) ? r.lyrics : []).filter((x): x is string => typeof x === "string").map((x) => x.slice(0, 60)).slice(0, 8),
    sections: (Array.isArray(r.sections) ? r.sections : []).filter((x): x is SectionId => (SECTION_IDS as readonly string[]).includes(x as string)).slice(0, 10),
    at: typeof r.at === "string" ? r.at.slice(0, 40) : undefined,
  };
}
function validRoman(x: string) {
  try {
    parseRoman(x);
    return true;
  } catch {
    return false;
  }
}

/** Is there anything in it yet? */
export const songIsEmpty = (s: StudioSong) => !s.beat.grid.some((g) => g.includes("x")) && !s.melody.notes.some((p) => typeof p === "number") && !s.chords.on;

/** One pass of the loop as a Score, playing only the parts a section uses. */
export function loopScore(s: StudioSong, parts = { beat: true, bass: true, chords: true, melody: true }, times = 1): Score {
  const barLen = 4;
  const total = s.bars * barLen;
  const tracks: MTrack[] = [];
  if (parts.beat) {
    const hits = [];
    for (let rep = 0; rep < times; rep++)
      for (let r = 0; r < s.beat.rows.length; r++)
        for (let i = 0; i < s.beat.grid[r].length; i++)
          if (s.beat.grid[r][i] === "x") hits.push({ t: rep * total + (i * barLen) / STEPS_PER_BAR, k: s.beat.rows[r], v: i % 4 === 0 ? 0.85 : 0.7 });
    if (hits.length) tracks.push({ kind: "drums", hits, vol: 0.85 });
  }
  if (parts.melody && s.melody.notes.some((p) => typeof p === "number")) {
    const ns: MNote[] = [];
    for (let rep = 0; rep < times; rep++)
      s.melody.notes.forEach((p) => {
        if (p === "-" && ns.length && ns[ns.length - 1].p !== null) ns[ns.length - 1] = { ...ns[ns.length - 1], d: ns[ns.length - 1].d + 0.5 };
        else ns.push({ p: typeof p === "number" ? s.key + p : null, d: 0.5 });
      });
    tracks.push({ kind: "notes", inst: s.melody.inst, notes: ns, vol: 0.9 });
  }
  if ((parts.chords && s.chords.on) || (parts.bass && s.bass.on)) {
    const romans = Array.from({ length: times }, () => s.chords.romans).flat();
    const mode = s.scale === "minor" || s.scale === "minorPenta" || s.scale === "harmonic" || s.scale === "dorian" || s.scale === "phrygian" ? "minor" : "major";
    const p = progression(romans, s.key, mode, { bpm: s.bpm, per: barLen, inst: s.chords.inst, style: s.chords.style, bass: parts.bass && s.bass.on });
    if (parts.chords && s.chords.on) tracks.push({ ...p.tracks[0], vol: 0.7 } as MTrack);
    if (parts.bass && s.bass.on && p.tracks[1]) tracks.push({ ...(p.tracks[1] as Extract<MTrack, { kind: "notes" }>), inst: s.bass.inst });
  }
  if (!tracks.length) tracks.push({ kind: "drums", hits: [{ t: total - 0.01, k: "sticks", v: 0 }] });
  return { bpm: s.bpm, meter: [4, 4], swing: s.swing || undefined, tracks };
}
/** The whole song: every section in order (or the loop twice if there are no sections). */
export function songScoreOf(s: StudioSong): Score {
  if (!s.sections.length) return loopScore(s, undefined, 2);
  return chain(s.sections.map((id) => loopScore(s, SECTION_PARTS[id], id === "chorus" ? 2 : 1)), 0);
}
/** The chord a melody note sits under (for the "notes that fit" glow). */
export function chordTonesAt(s: StudioSong, slot: number): number[] {
  if (!s.chords.on) return [];
  const bar = Math.floor(slot / SLOTS_PER_BAR) % Math.max(1, s.chords.romans.length);
  const r = s.chords.romans[bar];
  if (!r) return [];
  const c = romanChord(r, s.key, s.scale === "minor" ? "minor" : "major");
  return voiced(c.root, c.q).map((p) => ((p - s.key) % 12 + 12) % 12);
}
