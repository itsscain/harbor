import type { Option } from "../types";

// Harbor Learn — Music: the shapes of sound the course is written in. Everything here is plain
// data (content is bundled with the wall, so every lesson works offline): notes, beats, drum hits,
// scores to play, pictures of music to draw, and the rules a child's own creations must follow.
//
// Pitches are MIDI numbers (60 = middle C, 61 = C♯, 72 = the C above). Lengths are in beats where
// a quarter note is 1 (an eighth is 0.5, a half note 2, a triplet eighth 1/3). Tempo (bpm) always
// counts quarter notes per minute — even in 6/8.

/** Pitched instruments the synth can play (each has a drawing, see components/kiosk/learn/music/art). */
export type InstId =
  | "piano" | "bells" | "marimba" | "xylophone" | "glock" | "musicbox" | "kalimba" | "steeldrum"
  | "guitar" | "eguitar" | "ukulele" | "banjo" | "harp" | "bass" | "synthbass"
  | "violin" | "viola" | "cello" | "doublebass" | "strings" | "pizz"
  | "flute" | "piccolo" | "recorder" | "clarinet" | "oboe" | "bassoon" | "sax"
  | "trumpet" | "trombone" | "horn" | "tuba"
  | "organ" | "accordion" | "harmonica" | "synth" | "pad" | "choir" | "whistle" | "timpani";

/** Drums and other unpitched sounds. */
export type DrumId =
  | "kick" | "snare" | "hat" | "openhat" | "clap" | "snap" | "stomp" | "tom" | "lowtom" | "crash" | "ride" | "cymbals"
  | "cowbell" | "shaker" | "maracas" | "tamb" | "triangle" | "block" | "rim" | "sticks" | "bongo" | "conga" | "timpani" | "gong" | "bassdrum";

/** A time signature: [beats in a bar, the note that gets the beat] — [4, 4], [3, 4], [6, 8]… */
export type Meter = [number, number];

/** One note: a pitch (an array = a chord, null = a rest), how long (beats) and how loud (0–1). */
export type MNote = { p: number | number[] | null; d: number; v?: number };
/** One drum hit at a beat. */
export type MHit = { t: number; k: DrumId; v?: number };
/** A line of notes played one after another (from beat `at`), or a set of drum hits. */
export type MTrack = { kind: "notes"; inst: InstId; notes: MNote[]; at?: number; vol?: number } | { kind: "drums"; hits: MHit[]; vol?: number };
/** Something to hear. `fx` shapes the whole thing: `lowpass` 0–1 (muffled), `reverb` 0–1 (a bigger
 *  room), `pan` −1…1 (left…right), `gain` (overall loudness, 1 = normal). */
export type Score = { bpm: number; meter?: Meter; swing?: number; tracks: MTrack[]; fx?: { lowpass?: number; reverb?: number; pan?: number; gain?: number } };

/** A dynamic marking (soft → loud), plus the growing/shrinking hairpins. */
export type Dyn = "pp" | "p" | "mp" | "mf" | "f" | "ff" | "cresc" | "decresc";

/** Single music symbols drawn big (an idea frame or an answer card can show one). */
export type MSymbol =
  | "treble" | "bass" | "staff" | "whole" | "half" | "quarter" | "eighth" | "eighths" | "sixteenths" | "dotted-half" | "dotted-quarter"
  | "quarter-rest" | "half-rest" | "whole-rest" | "eighth-rest" | "sharp" | "flat" | "natural" | "fermata" | "repeat" | "barline" | "double-bar"
  | "tie" | "accent" | "staccato" | "time44" | "time34" | "time24" | "time68";

/** A note on the staff: a pitch (or a chord, or a rest), its length in beats, an accidental to
 *  show, and `mark` to circle it (the one a question is about). */
export type StaffNote = { p: number | number[] | null; d: number; acc?: "#" | "b" | "n"; mark?: boolean };

/** A picture of music — drawn by components/kiosk/learn/music (MusicVisual). When the matching
 *  sound is playing, the notes, keys, bells or beats light up in time with it. */
export type MusicShow =
  /** Notes on a staff (with clef, key signature, time signature and bar lines). */
  | { show: "staff"; clef?: "treble" | "bass"; notes: StaffNote[]; key?: number; meter?: Meter; labels?: "letters" | "solfege" | "none"; tonic?: number }
  /** A rhythm on one line: stick notation (Kodály), real notes, or big shapes for little ones. */
  | { show: "rhythm"; cells: string[]; meter?: Meter; style?: "sticks" | "notes" | "icons"; syllables?: boolean }
  /** A piano keyboard; `lit` keys glow, `marks` puts a label on keys. */
  | { show: "keyboard"; lo: number; hi: number; lit?: number[]; labels?: "letters" | "solfege" | "none"; tonic?: number; marks?: Record<number, string> }
  /** Colored bells (one per pitch, big to small). */
  | { show: "bells"; pitches: number[]; lit?: number[]; labels?: "solfege" | "letters" | "colors" | "none"; tonic?: number }
  /** The solfège ladder (do at the bottom, up the scale). `steps` are semitones above do. */
  | { show: "ladder"; tonic: number; steps: number[]; lit?: number[] }
  /** A row of beats (hearts) that pulse; `accent` beats are big (strong beats). */
  | { show: "beats"; n: number; accent?: number[]; icon?: string }
  /** Instrument pictures. */
  | { show: "inst"; ids: (InstId | DrumId)[] }
  /** Dynamic markings (p, mf, f…, and hairpins). */
  | { show: "dynamics"; marks: Dyn[] }
  /** A metronome ticking at a tempo, with its Italian word. */
  | { show: "tempo"; bpm: number; word?: string }
  /** A sound wave: how fast it wiggles (pitch) and how tall (loudness). */
  | { show: "wave"; hz: number; amp: number; compare?: { hz: number; amp: number } }
  /** Song form as colored blocks: "ABA", "verse chorus verse chorus bridge chorus"… */
  | { show: "form"; sections: string[] }
  /** The circle of fifths (major keys outside, relative minors inside). */
  | { show: "circle"; lit?: string[] }
  /** One big symbol. */
  | { show: "symbol"; sym: MSymbol; label?: string }
  /** A melody's shape — a line through the notes (up, down, same). */
  | { show: "contour"; pitches: number[] }
  /** A time signature, big. */
  | { show: "meter"; meter: Meter }
  /** Drawn pictures (content emoji keys), e.g. "🐘" for loud. */
  | { show: "pics"; emoji: string }
  /** Chord blocks: roman numerals in a key, shown as colored blocks. */
  | { show: "chords"; romans: string[]; tonic: number; scale: "major" | "minor" }
  /** A drum-machine grid: one row per drum, "x" = hit. */
  | { show: "grid"; rows: DrumId[]; pattern: string[] };

/** A frame of a music explainer: one sentence, a picture of the idea, and the sound that goes
 *  with it (played when the frame appears, replayable). `pad` lets the child try it right there. */
export type IdeaFrame = { text: string; show?: MusicShow; sound?: Score; pad?: "drum" | "bells" | "keys"; pads?: number[] };

/** An answer that can be a sound (it gets its own play button BESIDE it), a picture of music, an
 *  instrument, or plain words/pictures. */
export type MOption = Option & { sound?: Score; show?: MusicShow; inst?: InstId | DrumId };

/** Beat Lab rules (a child's own beat must follow them). Steps count from 0. */
export type BeatRule =
  | { rule: "on"; row: DrumId; steps: number[] }
  | { rule: "off"; row: DrumId; steps: number[] }
  | { rule: "count"; row: DrumId; min: number; max?: number }
  | { rule: "rows"; min: number }
  | { rule: "total"; min: number; max?: number };

/** Melody rules for compose (and the Studio's challenges). `pc`/pitches are MIDI. */
export type ComposeRule =
  /** Start / end on this pitch (e.g. end on do: home). */
  | { rule: "start" | "end"; p: number }
  /** Use every one of these pitches at least once. */
  | { rule: "use"; pitches: number[] }
  /** How many notes (non-rests) at least / at most. */
  | { rule: "notes"; min: number; max?: number }
  /** Only steps (move to a neighbor note in the scale, or repeat) — no skips. */
  | { rule: "steps" }
  /** At least one leap of this many scale steps or more. */
  | { rule: "leap"; min: number }
  /** At least this many rests. */
  | { rule: "rests"; min: number }
  /** The first `len` slots come back again later (a motif that repeats). */
  | { rule: "repeat"; len: number }
  /** Overall the tune goes up / down (last note higher / lower than the first). */
  | { rule: "contour"; dir: "up" | "down" }
  /** The highest note sits in the middle of the tune (an arch). */
  | { rule: "arch" };

/** Chord progression rules. */
export type ChordRule =
  | { rule: "start" | "end"; chord: string }
  | { rule: "use"; chords: string[] }
  /** The last two chords make this cadence. */
  | { rule: "cadence"; kind: "authentic" | "plagal" | "half" | "deceptive" };
