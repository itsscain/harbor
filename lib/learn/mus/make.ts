import type { Activity, Option } from "../types";
import type { DrumId, IdeaFrame, InstId, Meter, MOption, MusicShow, Score } from "./types";
import { int, pick, pickN, shuffle, type Rng, type Topic } from "../gen";
import { INSTRUMENTS, DRUMS, type Family } from "./catalog";
import { RHYTHM, barBeats, cellBeats, chordPitches, intervalName, near, scale, solfege, spelledName, LETTERS, NATURAL_PC, QUALITY_NAME, type ChordQuality, type ScaleKind } from "./theory";
import { chordSound, melody, note1, rhythm, then, withGain, atTempo, progression, scoreBeats } from "./score";
import { piece, type PieceId } from "./pieces";

// Building music lessons: shorthand for explainers, sounds, pictures and answers, plus seeded
// generators for the items every grade leans on (high or low, fast or slow, loud or soft, which
// rhythm did you hear, echo this, name that note, find the key, which instrument…). A generator
// takes the level's RNG and a difficulty 0–1, so a world's levels ramp up and review can make
// fresh items. Skill keys are "u:<family>[:<detail>]".

// ── Shorthand ────────────────────────────────────────────────────────────────────────────────
export const idea = (title: string, frames: IdeaFrame[], skill = "u:idea"): Activity => ({ kind: "idea", title, frames, skill });
export const frame = (text: string, show?: MusicShow, sound?: Score, pad?: IdeaFrame["pad"], pads?: number[]): IdeaFrame => ({ text, ...(show ? { show } : {}), ...(sound ? { sound } : {}), ...(pad ? { pad } : {}), ...(pads ? { pads } : {}) });
export const topic = (key: string, gen: (r: Rng, d: number) => Activity): Topic => ({ key, gen });
/** A topic that draws from a fixed bank of items (each made fresh, so shuffles differ). */
export const bankT = (key: string, bank: ((r: Rng) => Activity)[]): Topic => ({ key, gen: (r) => pick(r, bank)(r) });

export const staffShow = (notes: { p: number | number[] | null; d: number; mark?: boolean }[], clef: "treble" | "bass" = "treble", extra: { key?: number; meter?: Meter; labels?: "letters" | "solfege" | "none"; tonic?: number } = {}): MusicShow => ({ show: "staff", clef, notes, ...extra });
export const rhythmShow = (cells: string[], style: "sticks" | "notes" | "icons" = "sticks", syllables = true, meter?: Meter): MusicShow => ({ show: "rhythm", cells, style, syllables, ...(meter ? { meter } : {}) });
export const keysShow = (lo: number, hi: number, lit: number[] = [], labels: "letters" | "solfege" | "none" = "letters"): MusicShow => ({ show: "keyboard", lo, hi, lit, labels });
export const bellsShow = (pitches: number[], lit: number[] = [], labels: "solfege" | "letters" | "colors" | "none" = "solfege", tonic = 60): MusicShow => ({ show: "bells", pitches, lit, labels, tonic });
export const ladderShow = (tonic: number, steps: number[], lit: number[] = []): MusicShow => ({ show: "ladder", tonic, steps, lit });
export const beatsShow = (n: number, accent: number[] = [], icon?: string): MusicShow => ({ show: "beats", n, accent, ...(icon ? { icon } : {}) });
export const instShow = (...ids: (InstId | DrumId)[]): MusicShow => ({ show: "inst", ids });
export const picsShow = (emoji: string): MusicShow => ({ show: "pics", emoji });

export const opt = (id: string, text?: string, extra: Partial<MOption> = {}): MOption => ({ id, ...(text ? { text } : {}), ...extra });
export const soundOpt = (id: string, sound: Score, text?: string, extra: Partial<MOption> = {}): MOption => ({ id, sound, ...(text ? { text } : {}), ...extra });
export const picOpt = (id: string, emoji: string, text?: string): MOption => ({ id, emoji, ...(text ? { text } : {}) });
export const instOpt = (id: InstId | DrumId, text?: string): MOption => ({ id, inst: id, text: text ?? (id in INSTRUMENTS ? INSTRUMENTS[id as InstId].name : DRUMS[id as DrumId].name) });

/** A listen-and-choose item (options shuffled per play by the UI; keep the bank order here). */
export function listen(o: { prompt: string; say?: string[]; sound?: Score; show?: MusicShow; options: MOption[]; answer: string; skill: string; why?: string; layout?: "grid" | "row" | "list" }): Activity {
  return { kind: "listen", prompt: o.prompt, ...(o.say ? { say: o.say } : {}), ...(o.sound ? { sound: o.sound } : {}), ...(o.show ? { show: o.show } : {}), options: o.options, answer: o.answer, skill: o.skill, ...(o.why ? { why: o.why } : {}), ...(o.layout ? { layout: o.layout } : {}) };
}
/** A plain choice item with a music picture (no sound needed). */
export function seeChoice(o: { prompt: string; visual?: MusicShow; options: Option[]; answer: string; skill: string; why?: string; layout?: "grid" | "row" | "list" }): Activity {
  return { kind: "choice", prompt: o.prompt, ...(o.visual ? { visual: { type: "music", m: o.visual } } : {}), options: o.options, answer: o.answer, skill: o.skill, ...(o.why ? { why: o.why } : {}), layout: o.layout ?? "row" };
}
/** Words → options (shuffled), for quick text choices. */
export function textOpts(r: Rng, answer: string, wrong: string[], withSay = false): Option[] {
  return shuffle(r, [answer, ...wrong]).map((t) => ({ id: t, text: t, ...(withSay ? { say: [t] } : {}) }));
}

// ── Rhythm making ────────────────────────────────────────────────────────────────────────────
/** Random rhythm cells that fill `bars` bars exactly from a pool (never starts with a rest, never
 *  all the same, and uses the pool's newest cell when `must` is given). */
export function randomCells(r: Rng, pool: string[], meter: Meter, bars = 1, must?: string): string[] {
  const per = barBeats(meter);
  for (let tries = 0; tries < 200; tries++) {
    const out: string[] = [];
    for (let b = 0; b < bars; b++) {
      let t = 0;
      let guard = 0;
      while (!near(t, per) && guard++ < 40) {
        const fits = pool.filter((c) => cellBeats(c) <= per - t + 1e-6 && !(out.length === 0 && RHYTHM[c].durs[0] < 0));
        if (!fits.length) break;
        const c = pick(r, fits);
        out.push(c);
        t += cellBeats(c);
      }
      if (!near(t, per)) out.length = 0;
    }
    if (!out.length) continue;
    if (new Set(out).size === 1 && pool.length > 1) continue;
    if (must && !out.includes(must)) continue;
    if (RHYTHM[out[out.length - 1]].durs.every((d) => d < 0) && out.length > 1 && tries < 150) continue;
    return out;
  }
  return pool.filter((c) => RHYTHM[c].durs[0] > 0).slice(0, 1).concat(Array.from({ length: Math.round(per * bars) - 1 }, () => "ta"));
}
/** The same rhythm with one cell swapped (a "different" answer that's close). */
export function nearCells(r: Rng, cells: string[], pool: string[]): string[] | null {
  for (let tries = 0; tries < 40; tries++) {
    const i = int(r, 0, cells.length - 1);
    const alts = pool.filter((c) => c !== cells[i] && near(cellBeats(c), cellBeats(cells[i])) && !(i === 0 && RHYTHM[c].durs[0] < 0));
    if (!alts.length) continue;
    const out = [...cells];
    out[i] = pick(r, alts);
    return out;
  }
  return null;
}

/** Hear a rhythm → pick the card that shows it (stick notation for little readers). */
export function rhythmMatch(r: Rng, o: { pool: string[]; meter?: Meter; bars?: number; bpm?: number; style?: "sticks" | "notes" | "icons"; skill: string; prompt?: string; must?: string }): Activity {
  const meter = o.meter ?? [4, 4];
  const cells = randomCells(r, o.pool, meter, o.bars ?? 1, o.must);
  const wrong: string[][] = [];
  for (let k = 0; k < 8 && wrong.length < 2; k++) {
    const w = nearCells(r, k < 4 ? cells : (wrong[0] ?? cells), o.pool) ?? randomCells(r, o.pool, meter, o.bars ?? 1);
    if (w.join() !== cells.join() && !wrong.some((x) => x.join() === w.join())) wrong.push(w);
  }
  const options: MOption[] = shuffle(r, [cells, ...wrong]).map((c) => ({ id: c.join("-"), show: rhythmShow(c, o.style ?? "sticks", false, meter) }));
  return listen({ prompt: o.prompt ?? "Which rhythm did you hear?", sound: rhythm(cells, { bpm: o.bpm ?? 90, meter, drum: "bongo" }), options, answer: cells.join("-"), skill: o.skill, layout: "list" });
}
/** Echo: hear it, tap it back. */
export function echo(r: Rng, o: { pool: string[]; meter?: Meter; bars?: number; bpm?: number; show?: "sticks" | "notes" | "icons" | "none"; skill: string; prompt?: string; must?: string; drum?: DrumId }): Activity {
  const meter = o.meter ?? [4, 4];
  const cells = randomCells(r, o.pool, meter, o.bars ?? 1, o.must);
  return { kind: "rhythm", mode: "echo", prompt: o.prompt ?? "Listen, then tap it back!", cells, meter, bpm: o.bpm ?? 88, show: o.show ?? "none", drum: o.drum ?? "bongo", skill: o.skill };
}
/** Read: see a rhythm, play it after a count-in. */
export function readRhythm(r: Rng, o: { pool: string[]; meter?: Meter; bars?: number; bpm?: number; show?: "sticks" | "notes" | "icons"; skill: string; prompt?: string; must?: string }): Activity {
  const meter = o.meter ?? [4, 4];
  const cells = randomCells(r, o.pool, meter, o.bars ?? 1, o.must);
  return { kind: "rhythm", mode: "read", prompt: o.prompt ?? "Read it, then play it on the drum!", cells, meter, bpm: o.bpm ?? 80, show: o.show ?? "sticks", drum: "snare", skill: o.skill };
}
/** Tap the steady beat along with a piece. */
export function beatTap(o: { music: Score; beats?: number; skill?: string; prompt?: string; scaffold?: boolean }): Activity {
  return { kind: "rhythm", mode: "beat", prompt: o.prompt ?? "Tap the drum on every beat!", bpm: o.music.bpm, music: o.music, beats: o.beats ?? 8, scaffold: o.scaffold ?? true, drum: "kick", skill: o.skill ?? "u:beat:tap" };
}

// ── Perception (K–2) ─────────────────────────────────────────────────────────────────────────
const PITCHED: InstId[] = ["piano", "bells", "marimba", "flute", "violin", "xylophone"];
/** Two notes: which one is higher (or lower)? Options are the two sounds. */
export function highLow(r: Rng, d: number, o: { ask?: "higher" | "lower"; skill?: string } = {}): Activity {
  const ask = o.ask ?? (r() < 0.5 ? "higher" : "lower");
  const gap = Math.max(3, Math.round(14 - d * 10)); // big gaps first, closer later
  const inst = pick(r, PITCHED);
  // Both notes inside what the instrument can really play.
  const range = INSTRUMENTS[inst];
  const lo = int(r, Math.max(range.lo, 55), Math.max(Math.max(range.lo, 55), Math.min(70, range.hi - gap)));
  const hi = lo + gap;
  const first = r() < 0.5 ? lo : hi;
  const second = first === lo ? hi : lo;
  const ans = (ask === "higher" ? hi : lo) === first ? "a" : "b";
  return listen({
    prompt: ask === "higher" ? "Which sound is higher?" : "Which sound is lower?",
    options: [soundOpt("a", note1(first, inst, 1.5, 80), "First", { emoji: "1️⃣" }), soundOpt("b", note1(second, inst, 1.5, 80), "Second", { emoji: "2️⃣" })],
    answer: ans,
    skill: o.skill ?? "u:pitch:high-low",
    why: ask === "higher" ? "High sounds are up like a bird. Low sounds are down like a bear." : "Low sounds are deep, like a big bear. High sounds are tiny, like a bird.",
  });
}
/** Hear a tune: does it go up, down, or stay the same? */
export function contour(r: Rng, d: number, skill = "u:contour"): Activity {
  const dir = pick(r, ["up", "down", "same"] as const);
  const tonic = 60;
  const sc = scale(tonic, "major", 1);
  const n = d < 0.5 ? 3 : 4;
  const start = dir === "up" ? int(r, 0, 2) : dir === "down" ? int(r, sc.length - 3, sc.length - 1) : int(r, 0, sc.length - 1);
  const ps = Array.from({ length: n }, (_, i) => sc[Math.max(0, Math.min(sc.length - 1, dir === "up" ? start + i : dir === "down" ? start - i : start))]);
  return listen({
    prompt: "Does the tune go up, down, or stay the same?",
    sound: melody(ps, 1, pick(r, PITCHED), 92),
    show: { show: "pics", emoji: "🎵" },
    options: [picOpt("up", "⬆️", "Up"), picOpt("down", "⬇️", "Down"), picOpt("same", "➡️", "Same")],
    answer: dir,
    skill,
  });
}
/** Two versions of a tune: which is faster (or slower)? */
export function fastSlow(r: Rng, d: number, o: { ask?: "faster" | "slower"; skill?: string } = {}): Activity {
  const ask = o.ask ?? (r() < 0.5 ? "faster" : "slower");
  const base = pick(r, [[60, 62, 64, 65, 67, 67], [67, 64, 64, 65, 62, 62], [60, 64, 67, 64, 60, 60]]);
  const slow = int(r, 66, 80);
  const fast = Math.round(slow * (d < 0.5 ? 1.9 : 1.45));
  const firstFast = r() < 0.5;
  const tune = (bpm: number) => melody(base, 0.5, "marimba", bpm);
  return listen({
    prompt: ask === "faster" ? "Which one is faster?" : "Which one is slower?",
    options: [soundOpt("a", tune(firstFast ? fast : slow), "First", { emoji: "1️⃣" }), soundOpt("b", tune(firstFast ? slow : fast), "Second", { emoji: "2️⃣" })],
    answer: (ask === "faster") === firstFast ? "a" : "b",
    skill: o.skill ?? "u:tempo:fast-slow",
    why: "Fast music has more beats every second — like a bunny hopping. Slow music is like a turtle.",
  });
}
/** Loud or soft? (one sound, pick 🐘 loud or 🐭 soft). */
export function loudSoft(r: Rng, d: number, skill = "u:dynamics:loud-soft"): Activity {
  const loud = r() < 0.5;
  const ps = pick(r, [[60, 64, 67, 72], [67, 65, 64, 62, 60], [60, 60, 67, 67]]);
  const s = withGain(melody(ps, 0.5, pick(r, ["piano", "trumpet", "marimba"] as InstId[]), 100), loud ? 1.15 : d < 0.5 ? 0.18 : 0.3);
  return listen({ prompt: "Is this music loud or soft?", sound: s, options: [picOpt("loud", "🐘", "Loud"), picOpt("soft", "🐭", "Soft")], answer: loud ? "loud" : "soft", skill, layout: "row" });
}
/** Long or short sound? */
export function longShort(r: Rng, skill = "u:duration:long-short"): Activity {
  const long = r() < 0.5;
  const p = int(r, 60, 72);
  return listen({ prompt: "Is this sound long or short?", sound: note1(p, pick(r, ["flute", "violin", "organ"] as InstId[]), long ? 4 : 0.25, 80), options: [picOpt("long", "🐍", "Long"), picOpt("short", "🐞", "Short")], answer: long ? "long" : "short", skill });
}
/** Same or different? (two short rhythms or tunes). */
export function sameDifferent(r: Rng, d: number, o: { pool?: string[]; skill?: string } = {}): Activity {
  const pool = o.pool ?? ["ta", "titi", "z"];
  const cells = randomCells(r, pool, [4, 4], 1);
  const same = r() < 0.5;
  const other = same ? cells : (nearCells(r, cells, pool) ?? randomCells(r, pool, [4, 4], 1));
  const isSame = other.join() === cells.join();
  return listen({
    prompt: "Listen to both. Are they the same or different?",
    sound: then(rhythm(cells, { bpm: 90, drum: "block" }), rhythm(other, { bpm: 90, drum: "block" }), 2),
    options: [picOpt("same", "🟰", "Same"), picOpt("diff", "🔀", "Different")],
    answer: isSame ? "same" : "diff",
    skill: o.skill ?? "u:rhythm:same-different",
  });
}
/** Hear an instrument → pick its picture. */
export function whichInstrument(r: Rng, d: number, o: { pool: InstId[]; skill?: string; count?: number }): Activity {
  const ans = pick(r, o.pool);
  const wrong = pickN(r, o.pool, (o.count ?? 3) - 1, (x) => x === ans);
  const info = INSTRUMENTS[ans];
  const ps = scale(Math.max(info.lo + 2, Math.min(info.hi - 14, 60)), "major", 1).slice(0, 5);
  return listen({
    prompt: "Which instrument is playing?",
    sound: melody([...ps, ps[2], ps[0]], [0.5, 0.5, 0.5, 0.5, 1, 0.5, 1.5], ans, 100),
    options: shuffle(r, [ans, ...wrong]).map((id) => instOpt(id)),
    answer: ans,
    skill: o.skill ?? `u:timbre:${ans}`,
    layout: "grid",
  });
}
/** Hear an instrument → which family is it? */
export function whichFamily(r: Rng, o: { pool: InstId[]; skill?: string }): Activity {
  const ans = pick(r, o.pool);
  const fam = INSTRUMENTS[ans].family;
  const fams: Family[] = ["strings", "woodwinds", "brass", "percussion"];
  const ps = scale(Math.max(INSTRUMENTS[ans].lo + 2, Math.min(INSTRUMENTS[ans].hi - 14, 60)), "major", 1).slice(0, 5);
  return listen({
    prompt: "Which family does this instrument belong to?",
    sound: melody(ps, 0.5, ans, 100),
    show: instShow(ans),
    options: fams.map((f) => opt(f, { strings: "Strings", woodwinds: "Woodwinds", brass: "Brass", percussion: "Percussion" }[f as "strings"])),
    answer: fam,
    skill: o.skill ?? "u:family",
    why: `The ${INSTRUMENTS[ans].name.toLowerCase()} is in the ${fam} family.`,
  });
}

// ── Pitch and the staff (1st–8th) ────────────────────────────────────────────────────────────
/** Hear a short so-mi(-la…) pattern → pick its solfège. */
export function solfegeMatch(r: Rng, o: { steps: number[]; n?: number; tonic?: number; skill?: string }): Activity {
  const tonic = o.tonic ?? 60;
  const n = o.n ?? 3;
  const make = () => Array.from({ length: n }, () => tonic + pick(r, o.steps));
  const ans = make();
  const wrong: number[][] = [];
  for (let k = 0; k < 20 && wrong.length < 2; k++) {
    const w = make();
    if (w.join() !== ans.join() && !wrong.some((x) => x.join() === w.join())) wrong.push(w);
  }
  const label = (ps: number[]) => ps.map((p) => solfege(p, tonic)).join(" – ");
  return listen({
    prompt: "Which notes did you hear?",
    // Bells don't go below middle C — low la and low so ring on the marimba.
    sound: melody(ans, 1, Math.min(...ans) < 60 ? "marimba" : "bells", 84),
    options: shuffle(r, [ans, ...wrong]).map((ps) => opt(ps.join("-"), label(ps), { show: ladderShow(tonic, o.steps, ps.map((p) => p - tonic)) })),
    answer: ans.join("-"),
    skill: o.skill ?? `u:solfege:${o.steps.join("")}`,
    layout: "list",
  });
}
/** Name a note on the staff (treble or bass), letters as answers. */
export function staffName(r: Rng, o: { clef: "treble" | "bass"; pool: number[]; skill?: string; key?: number }): Activity {
  const p = pick(r, o.pool);
  const ans = spelledName(p, o.key ?? 0);
  const letters = shuffle(r, LETTERS.filter((l) => l !== ans[0])).slice(0, 3);
  const options = shuffle(r, [ans, ...letters.map((l) => l + ans.slice(1))]);
  return { kind: "staff", mode: "name", prompt: "What is this note's name?", clef: o.clef, notes: [p], key: o.key, options, answer: ans, hear: true, skill: o.skill ?? `u:staff:${o.clef}` };
}
/** Find a note on the keyboard. */
export function findKey(r: Rng, o: { pool: number[]; lo?: number; hi?: number; skill?: string; labels?: boolean }): Activity {
  const p = pick(r, o.pool);
  return { kind: "keys", task: "find", prompt: `Find ${spelledName(p)} on the keyboard!`, answer: [p], lo: o.lo ?? 60, hi: o.hi ?? 83, labels: o.labels ?? false, octaveFree: true, skill: o.skill ?? "u:keys:find" };
}
/** Build a chord on the keyboard. */
export function buildChord(r: Rng, o: { roots: number[]; qualities: ChordQuality[]; skill?: string; lo?: number; hi?: number }): Activity {
  const root = pick(r, o.roots);
  const q = pick(r, o.qualities);
  const ps = chordPitches(root, q);
  const nm = spelledName(root) + (q === "maj" ? "" : q === "min" ? "m" : q === "dim" ? "dim" : q === "aug" ? "+" : q);
  return { kind: "keys", task: "chord", prompt: `Build a ${nm} chord (${QUALITY_NAME[q]}).`, answer: ps, lo: o.lo ?? 48, hi: o.hi ?? 79, labels: true, given: [root], octaveFree: true, skill: o.skill ?? `u:chord:build-${q}`, why: `${nm} = ${ps.map((p) => spelledName(p)).join(" – ")}.` };
}
/** Hear an interval → name it. */
export function intervalEar(r: Rng, o: { semis: number[]; harmonic?: boolean; skill?: string }): Activity {
  const s = pick(r, o.semis);
  const lo = int(r, 55, 67);
  const sound = o.harmonic ? chordSound([lo, lo + s], "piano", 2.5, 60) : melody([lo, lo + s], [1, 1.5], "piano", 70);
  return listen({ prompt: "Which interval is it?", sound, options: o.semis.map((x) => opt(String(x), intervalName(x))), answer: String(s), skill: o.skill ?? "u:interval:ear", layout: o.semis.length > 4 ? "grid" : "row" });
}
/** Hear a chord → major or minor (or more qualities). */
export function chordQualityEar(r: Rng, o: { qualities: ChordQuality[]; skill?: string }): Activity {
  const q = pick(r, o.qualities);
  const root = int(r, 55, 64);
  const ps = chordPitches(root, q);
  const words: Record<string, string> = { maj: "Major (bright)", min: "Minor (dark)", dim: "Diminished (tense)", aug: "Augmented (floaty)", "7": "Dominant 7th", maj7: "Major 7th", m7: "Minor 7th" };
  return listen({ prompt: "Is this chord major or minor?", sound: then(melody(ps, 0.5, "piano", 90), chordSound(ps, "piano", 2.5, 90), 0), options: o.qualities.map((x) => opt(x, words[x] ?? x)), answer: q, skill: o.skill ?? "u:chord:quality" });
}
/** Hear a scale or tune → major or minor (happy or sad). */
export function majorMinor(r: Rng, o: { skill?: string; kid?: boolean } = {}): Activity {
  const minor = r() < 0.5;
  const tonic = int(r, 57, 64);
  const kind: ScaleKind = minor ? "minor" : "major";
  const sc = scale(tonic, kind, 1);
  const tunes = [[0, 2, 4, 2, 0], [0, 1, 2, 3, 4, 2, 0], [4, 3, 2, 1, 0], [0, 2, 4, 7, 4, 2, 0]];
  const t = pick(r, tunes).map((i) => sc[Math.min(sc.length - 1, i)]);
  const s = then(melody(t, 0.5, "piano", 96), chordSound(chordPitches(tonic, minor ? "min" : "maj"), "piano", 2, 96), 0);
  return listen({ prompt: o.kid ? "Does this music sound happy or sad?" : "Major or minor?", sound: s, options: o.kid ? [picOpt("major", "😀", "Happy"), picOpt("minor", "😢", "Sad")] : [opt("major", "Major"), opt("minor", "Minor")], answer: minor ? "minor" : "major", skill: o.skill ?? "u:major-minor", why: "Major keys usually sound bright and happy; minor keys sound darker or sadder." });
}
/** March (2) or waltz (3)? */
export function meterEar(r: Rng, o: { skill?: string; words?: boolean } = {}): Activity {
  const waltz = r() < 0.5;
  const s = waltz ? piece("waltz", { tonic: pick(r, [57, 60, 62]) }) : piece("march", { tonic: pick(r, [58, 60, 62]) });
  return listen({ prompt: o.words ? "Does it feel like 2 (a march) or 3 (a waltz)?" : "Is this a march or a waltz?", sound: s, options: [opt("march", "March (1-2)", { emoji: "🥁" }), opt("waltz", "Waltz (1-2-3)", { emoji: "💃" })], answer: waltz ? "waltz" : "march", skill: o.skill ?? "u:meter:2-3", why: waltz ? "A waltz swings in threes: ONE two three, ONE two three." : "A march steps in twos: LEFT right, LEFT right." });
}
/** Hear a style demo → name it. */
export function styleEar(r: Rng, o: { pool: PieceId[]; skill?: string; prompt?: string; count?: number }): Activity {
  const ans = pick(r, o.pool);
  const wrong = pickN(r, o.pool, (o.count ?? 3) - 1, (x) => x === ans);
  return listen({ prompt: o.prompt ?? "What style of music is this?", sound: atTempo(piece(ans), piece(ans).bpm), options: shuffle(r, [ans, ...wrong]).map((id) => opt(id, pieceName(id))), answer: ans, skill: o.skill ?? "u:genre", layout: (o.count ?? 3) > 3 ? "grid" : "row" });
}
export const pieceName = (id: PieceId) => ({ march: "March", waltz: "Waltz", lullaby: "Lullaby", rock: "Rock", hiphop: "Hip hop", swing: "Jazz", blues: "Blues", reggae: "Reggae", bossa: "Bossa nova", salsa: "Salsa", country: "Country", gospel: "Gospel", edm: "Electronic", minuet: "Classical", ragtime: "Ragtime", funk: "Funk", trap: "Trap", polka: "Polka", chorale: "Hymn", fanfare: "Fanfare", circus: "Circus", lofi: "Lo-fi", heroic: "Heroic", spooky: "Spooky", sad: "Sad", happy: "Happy", sneaky: "Sneaky", mysterious: "Mysterious", calm: "Calm", exciting: "Exciting" })[id];

/** A chord progression to hear (for chords "match" items). */
export const progSound = (romans: string[], tonic = 60, mode: "major" | "minor" = "major", bpm = 84) => progression(romans, tonic, mode, { bpm, per: 2, inst: "piano", style: "block", bass: true });
/** How long a sound lasts (beats) — handy for keeping items short. */
export { scoreBeats };
/** Natural-letter pitches between two notes (for staff pools). */
export function naturals(lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let p = lo; p <= hi; p++) if (NATURAL_PC.includes(((p % 12) + 12) % 12)) out.push(p);
  return out;
}
