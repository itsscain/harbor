import type { Activity } from "../types";
import type { BeatRule, ChordRule, ComposeRule, Meter, MusicShow, Score } from "./types";
import { DRUM_IDS, INST_IDS, INSTRUMENTS } from "./catalog";
import { BOTTOM_LINE, RHYTHM, barBeats, barFull, cadenceOf, cellBeats, cellsBeats, near, parseRoman, pulses, spell, spelledName, staffStep } from "./theory";
import { scoreBeats } from "./score";
import { SONGS } from "./songs";

// The rules a child's own music must follow — checked the same way on the wall (is this beat,
// tune, rhythm or progression right?) and by the content checker (can every challenge actually be
// solved, and does the empty answer NOT already win?). One source of truth for both.

// ── Beat Lab ─────────────────────────────────────────────────────────────────────────────────
/** The rules a beat grid breaks (empty = it follows them all). */
export function beatFails(grid: string[], rows: string[], rules: BeatRule[]): BeatRule[] {
  const row = (id: string) => grid[rows.indexOf(id)] ?? "";
  const hits = (id: string) => [...row(id)].filter((c) => c === "x").length;
  return rules.filter((r) => {
    switch (r.rule) {
      case "on": return !r.steps.every((s) => row(r.row)[s] === "x");
      case "off": return !r.steps.every((s) => row(r.row)[s] !== "x");
      case "count": return hits(r.row) < r.min || (r.max !== undefined && hits(r.row) > r.max);
      case "rows": return grid.filter((g) => g.includes("x")).length < r.min;
      case "total": { const t = grid.reduce((s, g) => s + [...g].filter((c) => c === "x").length, 0); return t < r.min || (r.max !== undefined && t > r.max); }
    }
  });
}
/** A grid that follows the rules (proof a "make" challenge can be done), or null. */
export function solveBeat(rows: string[], steps: number, rules: BeatRule[]): string[] | null {
  const g = rows.map(() => Array.from({ length: steps }, () => "."));
  for (const r of rules) if (r.rule === "on") for (const s of r.steps) g[rows.indexOf(r.row)][s] = "x";
  const banned = (ri: number, s: number) => rules.some((r) => r.rule === "off" && rows.indexOf(r.row) === ri && r.steps.includes(s));
  const add = (ri: number) => {
    for (let s = 0; s < steps; s += 1) if (g[ri][s] === "." && !banned(ri, s)) { g[ri][s] = "x"; return true; }
    return false;
  };
  for (const r of rules) {
    if (r.rule === "count") { const ri = rows.indexOf(r.row); while (g[ri].filter((c) => c === "x").length < r.min && add(ri)); }
    if (r.rule === "rows") for (let ri = 0; ri < rows.length && g.filter((x) => x.includes("x")).length < r.min; ri++) if (!g[ri].includes("x")) add(ri);
    if (r.rule === "total") for (let ri = 0; g.flat().filter((c) => c === "x").length < r.min && ri < rows.length * steps; ri++) add(ri % rows.length);
  }
  const out = g.map((x) => x.join(""));
  return beatFails(out, rows, rules).length ? null : out;
}

// ── Compose ──────────────────────────────────────────────────────────────────────────────────
/** The rules a melody breaks. `mel` has one pitch or null (rest) per slot; `pitches` = the notes
 *  offered (low → high), which define what a "step" is. */
export function composeFails(mel: (number | null)[], rules: ComposeRule[], pitches: number[]): ComposeRule[] {
  const ns = mel.filter((p): p is number => p !== null);
  const idx = (p: number) => pitches.indexOf(p);
  return rules.filter((r) => {
    switch (r.rule) {
      case "start": return ns[0] !== r.p;
      case "end": return ns[ns.length - 1] !== r.p;
      case "use": return !r.pitches.every((p) => ns.includes(p));
      case "notes": return ns.length < r.min || (r.max !== undefined && ns.length > r.max);
      case "steps": return ns.some((p, i) => i > 0 && Math.abs(idx(p) - idx(ns[i - 1])) > 1);
      case "leap": return !ns.some((p, i) => i > 0 && Math.abs(idx(p) - idx(ns[i - 1])) >= r.min);
      case "rests": return mel.filter((p) => p === null).length < r.min;
      case "repeat": {
        const head = mel.slice(0, r.len);
        if (head.length < r.len || head.every((p) => p === null)) return true;
        for (let s = r.len; s + r.len <= mel.length; s++) if (head.every((p, k) => mel[s + k] === p)) return false;
        return true;
      }
      case "contour": return ns.length < 2 || (r.dir === "up" ? ns[ns.length - 1] <= ns[0] : ns[ns.length - 1] >= ns[0]);
      case "arch": {
        if (ns.length < 3) return true;
        const hi = Math.max(...ns);
        const at = ns.indexOf(hi);
        return at === 0 || at === ns.length - 1 || ns.lastIndexOf(hi) === ns.length - 1;
      }
    }
  });
}
/** A melody that follows the rules (search — proof a compose challenge can be done), or null. */
export function solveCompose(pitches: number[], slots: number, rules: ComposeRule[], seed = 1): (number | null)[] | null {
  let h = seed * 2654435761;
  const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
  const start = rules.find((r) => r.rule === "start") as Extract<ComposeRule, { p: number }> | undefined;
  const end = rules.find((r) => r.rule === "end") as Extract<ComposeRule, { p: number }> | undefined;
  const stepsOnly = rules.some((r) => r.rule === "steps");
  const rests = (rules.find((r) => r.rule === "rests") as Extract<ComposeRule, { rule: "rests" }> | undefined)?.min ?? 0;
  for (let tries = 0; tries < 4000; tries++) {
    const mel: (number | null)[] = [];
    let cur = start ? pitches.indexOf(start.p) : Math.floor(rnd() * pitches.length);
    for (let i = 0; i < slots; i++) {
      if (i > 0 && i < slots - 1 && mel.filter((p) => p === null).length < rests && rnd() < 0.35) { mel.push(null); continue; }
      if (i > 0) cur = stepsOnly ? Math.max(0, Math.min(pitches.length - 1, cur + Math.floor(rnd() * 3) - 1)) : Math.floor(rnd() * pitches.length);
      mel.push(pitches[cur]);
    }
    if (end) mel[slots - 1] = end.p;
    const rep = rules.find((r) => r.rule === "repeat") as Extract<ComposeRule, { rule: "repeat" }> | undefined;
    if (rep && slots >= rep.len * 2) for (let k = 0; k < rep.len && slots - rep.len - 1 + k >= rep.len; k++) mel[slots - rep.len * 2 + k] = mel[k];
    if (!composeFails(mel, rules, pitches).length) return mel;
  }
  return null;
}

// ── Measures ─────────────────────────────────────────────────────────────────────────────────
/** Can a bar be filled exactly with these cards (repeats allowed)? */
export function fillable(cards: string[], m: Meter, have = 0): boolean {
  const per = barBeats(m);
  const sizes = [...new Set(cards.map(cellBeats))];
  const reach = new Set<number>([Math.round(have * 12)]);
  const goal = Math.round(per * 12);
  for (let k = 0; k < 64; k++)
    for (const r of [...reach]) for (const s of sizes) { const v = r + Math.round(s * 12); if (v <= goal) reach.add(v); }
  return reach.has(goal);
}
export const measureDone = (bars: string[][], m: Meter) => bars.every((b) => barFull(b, m));

// ── Chords ───────────────────────────────────────────────────────────────────────────────────
export function chordFails(prog: string[], rules: ChordRule[]): ChordRule[] {
  return rules.filter((r) => {
    switch (r.rule) {
      case "start": return prog[0] !== r.chord;
      case "end": return prog[prog.length - 1] !== r.chord;
      case "use": return !r.chords.every((c) => prog.includes(c));
      case "cadence": return prog.length < 2 || cadenceOf(prog[prog.length - 2], prog[prog.length - 1]) !== r.kind;
    }
  });
}
export function solveChords(palette: string[], bars: number, rules: ChordRule[]): string[] | null {
  const cur: string[] = [];
  let found: string[] | null = null;
  let budget = 200000;
  const go = (i: number) => {
    if (found || budget-- <= 0) return;
    if (i === bars) {
      if (!chordFails(cur, rules).length) found = [...cur];
      return;
    }
    for (const c of palette) {
      cur.push(c);
      go(i + 1);
      cur.pop();
      if (found) return;
    }
  };
  go(0);
  return found;
}

// ── Lyrics ───────────────────────────────────────────────────────────────────────────────────
/** Which syllables start on a strong beat (the first beat of each bar, and the middle of a 4/4
 *  bar), given one length per syllable. */
export function strongSyllables(durs: number[], m: Meter): number[] {
  const per = barBeats(m);
  const ps = pulses(m);
  const strong = new Set<number>([0]);
  if (m[0] === 4 && m[1] === 4) strong.add(2);
  if (m[1] === 8 && ps.length >= 2) strong.add(ps[0]);
  const out: number[] = [];
  let t = 0;
  durs.forEach((d, i) => {
    const inBar = ((t % per) + per) % per;
    if ([...strong].some((s) => near(inBar, s))) out.push(i);
    t += d;
  });
  return out;
}

// ── Validating content (for scripts/check-learn.mjs) ────────────────────────────────────────
const INST = new Set<string>(INST_IDS);
const DRUM = new Set<string>(DRUM_IDS);
export function scoreProblems(s: Score | undefined, where = "sound"): string[] {
  if (!s) return [];
  const out: string[] = [];
  if (!(s.bpm >= 30 && s.bpm <= 260)) out.push(`${where}: bpm ${s.bpm}`);
  if (!s.tracks.length) out.push(`${where}: no tracks`);
  for (const t of s.tracks) {
    if (t.kind === "notes") {
      if (!INST.has(t.inst)) out.push(`${where}: unknown instrument ${t.inst}`);
      if (!t.notes.length) out.push(`${where}: empty notes track`);
      const range = INSTRUMENTS[t.inst];
      let outside = 0;
      for (const x of t.notes) {
        if (!(x.d > 0)) out.push(`${where}: note length ${x.d}`);
        for (const p of x.p === null ? [] : Array.isArray(x.p) ? x.p : [x.p]) {
          if (!(p >= 21 && p <= 108) || !Number.isInteger(p)) out.push(`${where}: pitch ${p}`);
          // Real instruments have a range: a flute can't play a low C (a couple of half steps of slack).
          else if (range && (p < range.lo - 2 || p > range.hi + 2)) outside++;
        }
      }
      if (outside) out.push(`${where}: ${outside} note(s) outside the ${t.inst}'s range (${range.lo}–${range.hi}, catalog.ts)`);
    } else {
      if (!t.hits.length) out.push(`${where}: empty drum track`);
      for (const h of t.hits) if (!DRUM.has(h.k)) out.push(`${where}: unknown drum ${h.k}`);
    }
  }
  if (scoreBeats(s) * (60 / s.bpm) > 75) out.push(`${where}: longer than 75 seconds`);
  return out;
}
export function showProblems(m: MusicShow | undefined, where = "show"): string[] {
  if (!m) return [];
  const out: string[] = [];
  switch (m.show) {
    case "rhythm":
      for (const c of m.cells) if (!(c in RHYTHM)) out.push(`${where}: unknown rhythm cell ${c}`);
      break;
    case "staff":
      for (const x of m.notes) for (const p of x.p === null ? [] : Array.isArray(x.p) ? x.p : [x.p]) if (!staffRange(p, m.clef ?? "treble", m.key ?? 0)) out.push(`${where}: ${p} off the ${m.clef ?? "treble"} staff`);
      break;
    case "keyboard":
      if (m.hi <= m.lo || m.hi - m.lo > 37) out.push(`${where}: keyboard range`);
      break;
    case "grid":
      if (m.rows.length !== m.pattern.length) out.push(`${where}: grid rows`);
      break;
  }
  return out;
}
/** Within three ledger lines of the staff. */
export function staffRange(p: number, clef: "treble" | "bass", key = 0): boolean {
  const st = staffStep(spell(p, key));
  return st >= BOTTOM_LINE[clef] - 7 && st <= BOTTOM_LINE[clef] + 8 + 7;
}
const distinct = (xs: unknown[]) => new Set(xs.map((x) => JSON.stringify(x))).size === xs.length;

/** Everything wrong with the song book: a length for every note, one word part per sung note
 *  (karaoke and the lyric lessons show them one to a note), and whole bars after any pickup. */
export function songProblems(): string[] {
  const out: string[] = [];
  for (const s of SONGS) {
    if (s.pitches.length !== s.durs.length) out.push(`song ${s.id}: ${s.pitches.length} notes but ${s.durs.length} lengths`);
    if (s.words) {
      const sung = s.pitches.filter((p) => p !== null).length;
      if (s.words.length !== sung) out.push(`song ${s.id}: ${s.words.length} word parts for ${sung} sung notes`);
      for (const w of s.words) if (/\s/.test(w.trim())) out.push(`song ${s.id}: "${w}" puts two word parts on one note`);
    }
    const bars = (s.durs.reduce((a, b) => a + b, 0) - (s.pickup ?? 0)) / barBeats(s.meter);
    if (!near(bars, Math.round(bars))) out.push(`song ${s.id}: ${bars.toFixed(2)} bars of ${s.meter.join("/")} — not whole bars`);
  }
  return out;
}

/** Everything wrong with one music activity (empty = good). */
export function musicProblems(a: Activity): string[] {
  const out: string[] = [];
  const bad = (m: string) => out.push(m);
  switch (a.kind) {
    case "idea":
      if (a.frames.length < 2) bad("idea: fewer than 2 frames");
      a.frames.forEach((f, i) => {
        if (!f.text.trim()) bad(`idea: frame ${i + 1} has no words`);
        out.push(...scoreProblems(f.sound, `frame ${i + 1}`), ...showProblems(f.show, `frame ${i + 1}`));
      });
      break;
    case "listen": {
      const ids = a.options.map((o) => o.id);
      if (a.options.length < 2) bad("listen: fewer than 2 options");
      if (!distinct(ids)) bad(`listen: duplicate options ${ids}`);
      if (!ids.includes(a.answer)) bad(`listen: answer ${a.answer} not in ${ids}`);
      const faces = a.options.map((o) => `${o.text ?? ""}|${o.emoji ?? ""}|${o.inst ?? ""}|${JSON.stringify(o.show ?? null)}|${JSON.stringify(o.sound ?? null)}`);
      if (!distinct(faces)) bad("listen: options look/sound identical");
      if (!a.sound && !a.options.some((o) => o.sound)) bad("listen: nothing to hear");
      out.push(...scoreProblems(a.sound), ...showProblems(a.show));
      a.options.forEach((o) => out.push(...scoreProblems(o.sound, `option ${o.id}`), ...showProblems(o.show, `option ${o.id}`)));
      break;
    }
    case "rhythm":
      if (!(a.bpm >= 50 && a.bpm <= 200)) bad(`rhythm: bpm ${a.bpm}`);
      if (a.mode === "echo" || a.mode === "read") {
        const cells = a.cells ?? [];
        if (!cells.length) bad("rhythm: no cells");
        for (const c of cells) if (!(c in RHYTHM)) bad(`rhythm: unknown cell ${c}`);
        const sounding = cells.flatMap((c) => RHYTHM[c]?.durs ?? []).filter((d) => d > 0).length;
        if (sounding < 2) bad("rhythm: fewer than 2 notes to tap");
        const m = a.meter ?? [4, 4];
        const beats = cellsBeats(cells.filter((c) => c in RHYTHM));
        if (Math.abs(beats / barBeats(m) - Math.round(beats / barBeats(m))) > 1e-6) bad(`rhythm: ${beats} beats doesn't fill whole bars of ${m.join("/")}`);
        if (RHYTHM[cells[0]]?.durs[0] < 0) bad("rhythm: starts with a rest (nothing to echo from)");
      }
      if (a.mode === "beat" && !(a.beats && a.beats >= 4)) bad("rhythm: beat mode needs beats ≥ 4");
      if (a.mode === "syllables") {
        if (!a.words?.length) bad("rhythm: syllables mode needs words");
        for (const w of a.words ?? []) if (!(w.syllables >= 1 && w.syllables <= 6)) bad(`rhythm: ${w.text} syllables ${w.syllables}`);
      }
      out.push(...scoreProblems(a.music, "music"));
      break;
    case "melody":
      if (!a.notes.length) bad("melody: no notes");
      if (a.mode === "find" && a.notes.length !== 1) bad("melody: find wants one note");
      for (const p of a.notes) if (!a.pads.includes(p)) bad(`melody: note ${p} not on a pad ${a.pads}`);
      if (!distinct(a.pads) || a.pads.some((p, i) => i > 0 && p <= a.pads[i - 1])) bad("melody: pads must rise, no repeats");
      if (a.durs && a.durs.length !== a.notes.length) bad("melody: durs length");
      if ((a.labels === "solfege" || a.show === "ladder") && a.tonic === undefined) bad("melody: solfege needs a tonic");
      if (a.show === "staff") for (const p of a.notes) if (!staffRange(p, a.clef ?? "treble")) bad(`melody: ${p} off the staff`);
      break;
    case "staff": {
      if (!a.notes.length) bad("staff: no notes");
      for (const p of a.notes) if (!staffRange(p, a.clef, a.key ?? 0)) bad(`staff: ${p} off the ${a.clef} staff`);
      if (a.mode === "name") {
        if (!a.options?.length || a.answer === undefined || !a.options.includes(a.answer)) bad("staff: answer not in options");
        if (a.answer !== undefined && a.notes[0] !== undefined && a.answer !== spelledName(a.notes[0], a.key ?? 0)) bad(`staff: answer ${a.answer} but the note is ${spelledName(a.notes[0], a.key ?? 0)}`);
        if (a.options && !distinct(a.options)) bad("staff: duplicate options");
      }
      if (a.mode === "place" && a.notes.length !== 1) bad("staff: place wants one note");
      if (a.mode === "write" && a.notes.length < 2) bad("staff: write wants 2+ notes");
      break;
    }
    case "keys":
      if (a.hi <= a.lo || a.hi - a.lo > 37) bad("keys: range");
      if (!a.answer.length) bad("keys: no answer");
      for (const p of a.answer) if (p < a.lo || p > a.hi) bad(`keys: answer ${p} outside ${a.lo}–${a.hi}`);
      if (!distinct(a.answer)) bad("keys: duplicate answer keys");
      for (const p of a.given ?? []) if (!a.answer.includes(p)) bad("keys: a given key isn't part of the answer");
      if (a.given && a.given.length >= a.answer.length) bad("keys: everything is given");
      break;
    case "measure": {
      for (const c of a.cards) if (!(c in RHYTHM)) bad(`measure: unknown card ${c}`);
      if (a.bars < 1 || a.bars > 4) bad("measure: 1–4 bars");
      if (!fillable(a.cards, a.meter)) bad("measure: the cards can't fill a bar");
      const given = a.given ?? [];
      for (const b of given) if (b && cellsBeats(b) > barBeats(a.meter) + 1e-6) bad("measure: a given bar is already too full");
      if (a.mode === "fix") {
        const wrong = given.filter((b) => b && !barFull(b, a.meter)).length;
        if (wrong !== 1) bad(`measure: fix wants exactly one wrong bar (has ${wrong})`);
      }
      if (a.mode === "dictation") {
        if (!a.target || a.target.length !== a.bars) bad("measure: dictation needs a target per bar");
        for (const b of a.target ?? []) {
          if (!barFull(b, a.meter)) bad("measure: a target bar isn't full");
          for (const c of b) if (!a.cards.includes(c)) bad(`measure: target uses ${c} (not a card)`);
        }
      }
      for (const c of a.must ?? []) if (!a.cards.includes(c)) bad(`measure: must-use ${c} isn't a card`);
      if (a.mode === "fill" && given.length && given.every((b) => b && barFull(b, a.meter))) bad("measure: already filled");
      break;
    }
    case "beatlab": {
      if (!distinct(a.rows)) bad("beatlab: duplicate rows");
      for (const r of a.rows) if (!DRUM.has(r)) bad(`beatlab: unknown drum ${r}`);
      const okLen = (xs?: string[]) => !xs || (xs.length === a.rows.length && xs.every((x) => x.length === a.steps && /^[x.]+$/.test(x)));
      if (!okLen(a.target)) bad("beatlab: target shape");
      if (!okLen(a.start)) bad("beatlab: start shape");
      if (a.mode === "copy" || a.mode === "fix") {
        if (!a.target) bad("beatlab: copy/fix needs a target");
        if (a.target && !a.target.some((x) => x.includes("x"))) bad("beatlab: empty target");
      }
      if (a.mode === "fix" && a.start && a.target && a.start.join() === a.target.join()) bad("beatlab: fix starts already fixed");
      if (a.mode === "make") {
        if (!a.rules?.length) bad("beatlab: make needs rules");
        else {
          if (!solveBeat(a.rows, a.steps, a.rules)) bad("beatlab: the rules can't be met");
          if (!beatFails(a.rows.map(() => ".".repeat(a.steps)), a.rows, a.rules).length) bad("beatlab: an empty grid already follows the rules");
          for (const r of a.rules) if ((r.rule === "on" || r.rule === "off") && r.steps.some((s) => s < 0 || s >= a.steps)) bad("beatlab: rule step off the grid");
          for (const r of a.rules) if ("row" in r && !a.rows.includes(r.row)) bad(`beatlab: rule row ${r.row} isn't a row`);
        }
      }
      break;
    }
    case "compose":
      if (!distinct(a.pitches) || a.pitches.some((p, i) => i > 0 && p <= a.pitches[i - 1])) bad("compose: pitches must rise, no repeats");
      if (a.slots < 2 || a.slots > 16) bad("compose: 2–16 slots");
      if (a.start && (a.start.length !== a.slots || a.start.some((p) => p !== null && !a.pitches.includes(p)))) bad("compose: start shape");
      for (const r of a.rules) {
        if ((r.rule === "start" || r.rule === "end") && !a.pitches.includes(r.p)) bad(`compose: ${r.rule} note ${r.p} isn't offered`);
        if (r.rule === "use" && r.pitches.some((p) => !a.pitches.includes(p))) bad("compose: use-note isn't offered");
      }
      if (!solveCompose(a.pitches, a.slots, a.rules)) bad("compose: no tune can follow these rules");
      if (!composeFails(Array.from({ length: a.slots }, () => null), a.rules, a.pitches).length) bad("compose: an empty tune already follows the rules");
      out.push(...scoreProblems(a.backing, "backing"));
      break;
    case "conduct":
      if (!a.goal.tempo && !a.goal.dyn) bad("conduct: no goal");
      if (a.goal.tempo && (a.goal.tempo[0] < 40 || a.goal.tempo[1] > 208 || a.goal.tempo[0] >= a.goal.tempo[1])) bad("conduct: tempo goal range");
      if (a.goal.tempo && a.music.bpm >= a.goal.tempo[0] && a.music.bpm <= a.goal.tempo[1] && !a.goal.dyn) bad("conduct: the music already plays at the goal tempo");
      if (a.goal.dyn && (a.goal.dyn[0] < 0 || a.goal.dyn[1] > 1 || (0.55 >= a.goal.dyn[0] && 0.55 <= a.goal.dyn[1] && !a.goal.tempo))) bad("conduct: dynamics goal (the band starts at 0.55)");
      out.push(...scoreProblems(a.music, "music"));
      break;
    case "soundsort": {
      const bins = new Set(a.bins.map((b) => b.id));
      if (a.bins.length < 2) bad("soundsort: fewer than 2 bins");
      if (a.items.length < 2) bad("soundsort: fewer than 2 items");
      if (!distinct(a.items.map((x) => x.id)) || !distinct(a.bins.map((b) => b.id))) bad("soundsort: duplicate ids");
      for (const it of a.items) {
        if (!bins.has(it.bin)) bad(`soundsort: ${it.id} → missing bin ${it.bin}`);
        if (!it.sound && !it.inst) bad(`soundsort: ${it.id} makes no sound`);
        out.push(...scoreProblems(it.sound, `item ${it.id}`));
      }
      if (new Set(a.items.map((x) => x.bin)).size < 2) bad("soundsort: every item goes in the same bin");
      break;
    }
    case "wave":
      if (!(a.hz >= 80 && a.hz <= 2000) || !(a.amp > 0 && a.amp <= 1)) bad("wave: start out of range");
      if (a.mode === "match") {
        if (!a.target) bad("wave: match needs a target");
        else if (Math.abs(a.target.hz - a.hz) / a.hz < 0.08 && Math.abs(a.target.amp - a.amp) < 0.15) bad("wave: target equals start");
      }
      if (a.mode === "octave" && a.hz * 2 > 2000) bad("wave: octave goes too high");
      if ((a.mode === "louder" && a.amp > 0.75) || (a.mode === "softer" && a.amp < 0.3)) bad("wave: no room to change loudness");
      break;
    case "form": {
      const keys = Object.keys(a.sections);
      if (a.order.length < 2) bad("form: order too short");
      for (const s of a.order) if (!keys.includes(s)) bad(`form: section ${s} has no music`);
      for (const k of keys) out.push(...scoreProblems(a.sections[k], `section ${k}`));
      if (a.mode === "label") {
        if (!a.options?.includes(a.answer ?? "")) bad("form: answer not in options");
        if (a.answer !== a.order.join("")) bad(`form: answer ${a.answer} ≠ order ${a.order.join("")}`);
        if (a.options && !distinct(a.options)) bad("form: duplicate options");
      }
      break;
    }
    case "lyrics":
      if (a.syllables.length !== a.durs.length) bad("lyrics: one length per syllable");
      if (a.durs.some((d) => !(d > 0))) bad("lyrics: lengths must be positive");
      if (a.pitches && a.pitches.length !== a.syllables.length) bad("lyrics: one pitch per syllable");
      if (a.mode === "stress") {
        const want = strongSyllables(a.durs, a.meter);
        if (!a.stress || a.stress.join() !== want.join()) bad(`lyrics: stress ${a.stress} ≠ strong beats ${want}`);
        if (!want.length || want.length === a.syllables.length) bad("lyrics: stress needs some strong and some weak syllables");
      }
      if (a.mode === "fit" && a.syllables.length < 3) bad("lyrics: fit needs 3+ syllables");
      break;
    case "chords":
      for (const c of a.palette) try { parseRoman(c); } catch { bad(`chords: bad numeral ${c}`); }
      if (!distinct(a.palette)) bad("chords: duplicate palette");
      if (a.bars < 2 || a.bars > 12) bad("chords: 2–12 bars");
      if (a.mode === "match") {
        if (!a.answer || a.answer.length !== a.bars) bad("chords: match needs one chord per bar");
        for (const c of a.answer ?? []) if (!a.palette.includes(c)) bad(`chords: answer ${c} not in palette`);
      }
      if (a.mode === "build") {
        if (!a.rules?.length) bad("chords: build needs rules");
        else if (!solveChords(a.palette, a.bars, a.rules)) bad("chords: no progression follows the rules");
        for (const r of a.rules ?? []) for (const c of r.rule === "use" ? r.chords : r.rule === "start" || r.rule === "end" ? [r.chord] : []) if (!a.palette.includes(c)) bad(`chords: rule chord ${c} not in palette`);
      }
      break;
    case "choice":
      if (a.visual?.type === "music") out.push(...showProblems(a.visual.m, "visual"));
      for (const o of a.options) if (o.visual?.type === "music") out.push(...showProblems(o.visual.m, `option ${o.id}`));
      break;
  }
  return out;
}
