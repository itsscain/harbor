import type { DrumId, GradeId, InstId } from "../types";
import { COURSES, startUnitIndex } from "../curriculum";
import { DRUMS, INSTRUMENTS, isDrum, isInst } from "./catalog";
import type { ScaleKind } from "./theory";
import type { Groove } from "./score";

// What a child's Studio can do — it grows as they learn. Every music level can carry `unlocks`
// ("drum:snare", "note:la", "inst:piano", "scale:minor", "tool:chords"…); passing it adds that to
// the Studio for good. Worlds before where a child started (a big kid starts at their grade) count
// as already learned. Everyone begins with a starter kit: kick, clap, the bells and so-mi-la.

export type Powers = {
  drums: DrumId[];
  /** Solfège syllables the Melody Maker offers (low la, so … high do). */
  notes: string[];
  scales: ScaleKind[];
  insts: InstId[];
  grooves: Groove[];
  tools: Set<string>;
  all: Set<string>;
};

export const STARTER = ["drum:kick", "drum:clap", "note:so", "note:mi", "note:la", "inst:bells", "scale:sml"];
/** Melody notes in the order they're met (Kodály), and where they sit (semitones above do). */
export const NOTE_ORDER: { syl: string; semis: number }[] = [
  { syl: "so,", semis: -5 }, { syl: "la,", semis: -3 }, { syl: "do", semis: 0 }, { syl: "re", semis: 2 }, { syl: "mi", semis: 4 }, { syl: "fa", semis: 5 },
  { syl: "so", semis: 7 }, { syl: "la", semis: 9 }, { syl: "ti", semis: 11 }, { syl: "do'", semis: 12 }, { syl: "re'", semis: 14 }, { syl: "mi'", semis: 16 },
];

/** Every unlock a grown-up could see listed, with a kid name. */
export function powerName(key: string): string {
  const [kind, id] = key.split(":");
  if (kind === "drum" && isDrum(id)) return DRUMS[id].name;
  if (kind === "inst" && isInst(id)) return INSTRUMENTS[id].name;
  if (kind === "note") return `The note ${id.replace(",", " (low)").replace("'", " (high)")}`;
  if (kind === "scale") return ({ major: "Major scale", minor: "Minor scale", penta: "Pentatonic scale", minorPenta: "Minor pentatonic", blues: "Blues scale", dorian: "Dorian mode", mixolydian: "Mixolydian mode", lydian: "Lydian mode", phrygian: "Phrygian mode", harmonic: "Harmonic minor", chromatic: "All 12 notes", sml: "So-mi-la", somi: "So-mi", dms: "Do-mi-so", dmsl: "Do-mi-so-la" } as Record<string, string>)[id] ?? id;
  if (kind === "groove") return `${id[0].toUpperCase()}${id.slice(1)} groove`;
  if (kind === "tool")
    return ({ chords: "Chords", bass: "Bass line", lyrics: "Lyrics", sections: "Song sections", swing: "Swing", tempo: "Tempo dial", bars2: "2-bar loops", bars4: "4-bar loops", holds: "Long notes", keys: "Change key", sixteen: "16th-note beats" } as Record<string, string>)[id] ?? id;
  return key;
}

/** The Studio's powers for a child (from their best stars per lesson and their grade). */
export function studioPowers(grade: GradeId, best: (lessonId: string) => number | null): Powers {
  const all = new Set<string>(STARTER);
  const units = COURSES.music?.units ?? [];
  const start = startUnitIndex("music", grade);
  units.forEach((u, ui) => {
    for (const l of u.lessons) if (l.unlocks?.length && (ui < start || (best(l.id) ?? 0) >= 1)) l.unlocks.forEach((k) => all.add(k));
  });
  return powersFrom(all);
}
export function powersFrom(all: Set<string>): Powers {
  const pick = (kind: string) => [...all].filter((k) => k.startsWith(`${kind}:`)).map((k) => k.slice(kind.length + 1));
  const notes = NOTE_ORDER.filter((n) => all.has(`note:${n.syl}`)).map((n) => n.syl);
  return {
    drums: pick("drum").filter(isDrum),
    notes,
    scales: pick("scale") as ScaleKind[],
    insts: pick("inst").filter(isInst),
    grooves: pick("groove") as Groove[],
    tools: new Set(pick("tool")),
    all,
  };
}
/** Everything (the dev preview, and a grown-up's "try it all" in the future). */
export function allPowers(): Powers {
  const all = new Set<string>(STARTER);
  for (const u of COURSES.music?.units ?? []) for (const l of u.lessons) l.unlocks?.forEach((k) => all.add(k));
  for (const k of Object.keys(DRUMS)) all.add(`drum:${k}`);
  for (const k of Object.keys(INSTRUMENTS)) all.add(`inst:${k}`);
  for (const n of NOTE_ORDER) all.add(`note:${n.syl}`);
  for (const t of ["chords", "bass", "lyrics", "sections", "swing", "tempo", "bars2", "bars4", "holds", "keys", "sixteen"]) all.add(`tool:${t}`);
  for (const s of ["major", "minor", "penta", "minorPenta", "blues", "dorian", "mixolydian"]) all.add(`scale:${s}`);
  return powersFrom(all);
}
/** What passing a lesson adds that the child didn't have yet. */
export function newPowers(before: Powers, after: Powers): string[] {
  return [...after.all].filter((k) => !before.all.has(k));
}
