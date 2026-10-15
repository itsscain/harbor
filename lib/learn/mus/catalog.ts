import type { DrumId, InstId } from "./types";

// Every instrument Harbor can play: its name, the orchestra family it belongs to, how you make it
// sound, and the range it plays in (MIDI). Lessons sort by family, ask "how does it make sound?",
// and keep melodies inside each instrument's range.

export type Family = "strings" | "woodwinds" | "brass" | "percussion" | "keyboard" | "voice" | "electronic";
export type How = "bow" | "pluck" | "strum" | "blow" | "buzz" | "hit" | "shake" | "press" | "sing" | "electric";

export const INSTRUMENTS: Record<InstId, { name: string; family: Family; how: How; lo: number; hi: number }> = {
  piano: { name: "Piano", family: "keyboard", how: "press", lo: 33, hi: 96 },
  bells: { name: "Bells", family: "percussion", how: "hit", lo: 60, hi: 96 },
  marimba: { name: "Marimba", family: "percussion", how: "hit", lo: 45, hi: 84 },
  xylophone: { name: "Xylophone", family: "percussion", how: "hit", lo: 60, hi: 96 },
  glock: { name: "Glockenspiel", family: "percussion", how: "hit", lo: 67, hi: 100 },
  musicbox: { name: "Music box", family: "keyboard", how: "press", lo: 60, hi: 96 },
  kalimba: { name: "Kalimba", family: "percussion", how: "pluck", lo: 55, hi: 88 },
  steeldrum: { name: "Steel drum", family: "percussion", how: "hit", lo: 55, hi: 84 },
  guitar: { name: "Guitar", family: "strings", how: "strum", lo: 40, hi: 84 },
  eguitar: { name: "Electric guitar", family: "electronic", how: "electric", lo: 40, hi: 86 },
  ukulele: { name: "Ukulele", family: "strings", how: "strum", lo: 60, hi: 81 },
  banjo: { name: "Banjo", family: "strings", how: "pluck", lo: 48, hi: 81 },
  harp: { name: "Harp", family: "strings", how: "pluck", lo: 24, hi: 103 },
  bass: { name: "Bass guitar", family: "strings", how: "pluck", lo: 28, hi: 55 },
  synthbass: { name: "Synth bass", family: "electronic", how: "electric", lo: 24, hi: 55 },
  violin: { name: "Violin", family: "strings", how: "bow", lo: 55, hi: 96 },
  viola: { name: "Viola", family: "strings", how: "bow", lo: 48, hi: 84 },
  cello: { name: "Cello", family: "strings", how: "bow", lo: 36, hi: 72 },
  doublebass: { name: "Double bass", family: "strings", how: "bow", lo: 28, hi: 55 },
  strings: { name: "String section", family: "strings", how: "bow", lo: 36, hi: 96 },
  pizz: { name: "Plucked strings", family: "strings", how: "pluck", lo: 36, hi: 84 },
  flute: { name: "Flute", family: "woodwinds", how: "blow", lo: 60, hi: 96 },
  piccolo: { name: "Piccolo", family: "woodwinds", how: "blow", lo: 74, hi: 108 },
  recorder: { name: "Recorder", family: "woodwinds", how: "blow", lo: 60, hi: 86 },
  clarinet: { name: "Clarinet", family: "woodwinds", how: "blow", lo: 50, hi: 91 },
  oboe: { name: "Oboe", family: "woodwinds", how: "blow", lo: 58, hi: 91 },
  bassoon: { name: "Bassoon", family: "woodwinds", how: "blow", lo: 34, hi: 75 },
  sax: { name: "Saxophone", family: "woodwinds", how: "blow", lo: 49, hi: 81 },
  trumpet: { name: "Trumpet", family: "brass", how: "buzz", lo: 54, hi: 84 },
  trombone: { name: "Trombone", family: "brass", how: "buzz", lo: 40, hi: 72 },
  horn: { name: "French horn", family: "brass", how: "buzz", lo: 41, hi: 77 },
  tuba: { name: "Tuba", family: "brass", how: "buzz", lo: 26, hi: 58 },
  organ: { name: "Organ", family: "keyboard", how: "press", lo: 36, hi: 96 },
  accordion: { name: "Accordion", family: "keyboard", how: "press", lo: 48, hi: 84 },
  harmonica: { name: "Harmonica", family: "woodwinds", how: "blow", lo: 60, hi: 88 },
  synth: { name: "Synthesizer", family: "electronic", how: "electric", lo: 36, hi: 96 },
  pad: { name: "Synth pad", family: "electronic", how: "electric", lo: 36, hi: 84 },
  choir: { name: "Choir", family: "voice", how: "sing", lo: 48, hi: 81 },
  whistle: { name: "Whistle", family: "woodwinds", how: "blow", lo: 60, hi: 96 },
  timpani: { name: "Timpani", family: "percussion", how: "hit", lo: 38, hi: 57 },
};
export const INST_IDS = Object.keys(INSTRUMENTS) as InstId[];

export const DRUMS: Record<DrumId, { name: string; how: How }> = {
  kick: { name: "Kick drum", how: "hit" },
  snare: { name: "Snare drum", how: "hit" },
  hat: { name: "Hi-hat", how: "hit" },
  openhat: { name: "Open hi-hat", how: "hit" },
  clap: { name: "Clap", how: "hit" },
  snap: { name: "Finger snap", how: "hit" },
  stomp: { name: "Stomp", how: "hit" },
  tom: { name: "Tom", how: "hit" },
  lowtom: { name: "Low tom", how: "hit" },
  crash: { name: "Crash cymbal", how: "hit" },
  ride: { name: "Ride cymbal", how: "hit" },
  cymbals: { name: "Cymbals", how: "hit" },
  cowbell: { name: "Cowbell", how: "hit" },
  shaker: { name: "Shaker", how: "shake" },
  maracas: { name: "Maracas", how: "shake" },
  tamb: { name: "Tambourine", how: "shake" },
  triangle: { name: "Triangle", how: "hit" },
  block: { name: "Wood block", how: "hit" },
  rim: { name: "Rim click", how: "hit" },
  sticks: { name: "Sticks", how: "hit" },
  bongo: { name: "Bongos", how: "hit" },
  conga: { name: "Conga", how: "hit" },
  timpani: { name: "Timpani", how: "hit" },
  gong: { name: "Gong", how: "hit" },
  bassdrum: { name: "Bass drum", how: "hit" },
};
export const DRUM_IDS = Object.keys(DRUMS) as DrumId[];
export const isInst = (x: string): x is InstId => x in INSTRUMENTS;
export const isDrum = (x: string): x is DrumId => x in DRUMS;
export const soundName = (x: InstId | DrumId) => (isInst(x) ? INSTRUMENTS[x].name : DRUMS[x].name);

export const FAMILY_NAME: Record<Family, string> = { strings: "Strings", woodwinds: "Woodwinds", brass: "Brass", percussion: "Percussion", keyboard: "Keyboards", voice: "Voices", electronic: "Electronic" };
export const HOW_WORDS: Record<How, string> = { bow: "bow the strings", pluck: "pluck the strings", strum: "strum the strings", blow: "blow air", buzz: "buzz your lips", hit: "hit it", shake: "shake it", press: "press the keys", sing: "sing", electric: "use electricity" };
