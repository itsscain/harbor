import type { Block, CodeLevel } from "@/lib/learn/types";
import { elseIndex } from "@/lib/learn/program";

// The block editor's model: what each block looks like (by age), and immutable edits on the
// program tree. A "list path" points at a block list: [] is the program itself, and each step
// is [blockIndex, "b" | "e"] into a block's body or else-branch.

export type ListPath = (number | "b" | "e")[];
export type Cursor = { list: ListPath; index: number };
export type Sel = { list: ListPath; index: number } | null;

export const PAIR_KIND = { b: "body", e: "else" } as const;

/** The list a path points at. */
export function listAt(prog: Block[], path: ListPath): Block[] {
  let cur = prog;
  for (let k = 0; k < path.length; k += 2) {
    const b = cur[path[k] as number];
    if (!b) return [];
    cur = (path[k + 1] === "e" ? b.else : b.body) ?? [];
  }
  return cur;
}

/** Return a copy of the program with the list at `path` replaced by fn(list). */
export function editList(prog: Block[], path: ListPath, fn: (l: Block[]) => Block[]): Block[] {
  if (!path.length) return fn(prog);
  const [i, br, ...rest] = path as [number, "b" | "e", ...ListPath];
  return prog.map((b, k) => {
    if (k !== i) return b;
    const key = br === "e" ? "else" : "body";
    return { ...b, [key]: editList(b[key] ?? [], rest, fn) };
  });
}

export const insertAt = (prog: Block[], c: Cursor, block: Block) => editList(prog, c.list, (l) => [...l.slice(0, c.index), block, ...l.slice(c.index)]);
export const removeAt = (prog: Block[], list: ListPath, index: number) => editList(prog, list, (l) => l.filter((_, k) => k !== index));
export const updateAt = (prog: Block[], list: ListPath, index: number, patch: Partial<Block>) => editList(prog, list, (l) => l.map((b, k) => (k === index ? { ...b, ...patch } : b)));
export const blockAt = (prog: Block[], list: ListPath, index: number): Block | undefined => listAt(prog, list)[index];

export const isContainer = (op: string) => op === "repeat" || op === "if" || op === "ifelse" || op === "until" || op === "def";
export const sameList = (a: ListPath, b: ListPath) => a.length === b.length && a.every((x, i) => x === b[i]);

/** A run step's address (from the engine: indices, else-branch as -1-i) → the editor's list+index.
 *  A step inside a function call lights up the call itself. */
export function stepTarget(prog: Block[], at: number[]): { list: ListPath; index: number } | null {
  let list: ListPath = [];
  let cur = prog;
  for (let k = 0; k < at.length; k++) {
    const raw = at[k];
    const isElse = raw < 0;
    const i = isElse ? -1 - raw : raw;
    const b = cur[i];
    if (!b) return null;
    if (k === at.length - 1 || b.op === "call") return { list, index: i };
    const next = at[k + 1];
    const intoElse = next < 0;
    list = [...list, i, intoElse ? "e" : "b"];
    cur = (intoElse ? b.else : b.body) ?? [];
  }
  return null;
}
export { elseIndex };

// ── Looks ────────────────────────────────────────────────────────────────────────────────────
export type BlockLook = { icon: string; word: string; color: string; edge: string; text?: string };
const MOTION = { color: "#1cb0f6", edge: "#1491cf" };
const TURN = { color: "#22c59b", edge: "#14a07c" };
const DANCE = { color: "#8b6cff", edge: "#6b4fe0" };
const PAINT = { color: "#ff7363", edge: "#df5444" };
const PEN = { color: "#64748b", edge: "#475569" };
export const NOTE_COLOR: Record<string, [string, string]> = {
  C: ["#ef4444", "#b91c1c"], D: ["#f97316", "#c2410c"], E: ["#eab308", "#a16207"], F: ["#22c55e", "#15803d"], G: ["#3b82f6", "#1d4ed8"], A: ["#a855f7", "#7e22ce"],
};
export const PIXEL_COLOR: Record<string, string> = { r: "#ef4444", b: "#3b82f6", g: "#22c55e", y: "#facc15", o: "#fb923c", p: "#a855f7", n: "#92400e", k: "#1f2937", w: "#ffffff" };
export const COLOR_NAME: Record<string, string> = { r: "red", b: "blue", g: "green", y: "yellow", o: "orange", p: "purple", n: "brown", k: "black", w: "white" };
export const MOVE_EMOJI: Record<string, string> = { wave: "👋", spin: "🌀", jump: "⬆️", clap: "👏", kick: "🦵", bow: "🙇" };
export const COND_LABEL: Record<string, { icon: string; word: string }> = {
  blocked: { icon: "⛔", word: "path blocked" },
  clear: { icon: "✅", word: "path clear" },
  blockedLeft: { icon: "⬅️⛔", word: "blocked on the left" },
  blockedRight: { icon: "⛔➡️", word: "blocked on the right" },
  atGoal: { icon: "🏁", word: "at the goal" },
  fish: { icon: "🐟", word: "on a fish" },
};

export function lookOf(op: string): BlockLook {
  switch (op) {
    case "up": return { icon: "⬆️", word: "Up", ...MOTION };
    case "down": return { icon: "⬇️", word: "Down", ...MOTION };
    case "left": return { icon: "⬅️", word: "Left", ...MOTION };
    case "right": return { icon: "➡️", word: "Right", ...MOTION };
    case "fwd": return { icon: "⬆️", word: "Forward", ...MOTION };
    case "tl": return { icon: "↩️", word: "Turn left", ...TURN };
    case "tr": return { icon: "↪️", word: "Turn right", ...TURN };
    case "paint": return { icon: "🖌️", word: "Paint", ...PAINT };
    case "penup": return { icon: "✏️", word: "Pen up", ...PEN };
    case "pendown": return { icon: "🖊️", word: "Pen down", ...PEN };
    case "catch": return { icon: "🎣", word: "Catch", color: "#14b8a6", edge: "#0d9488" };
    case "wait": return { icon: "⏳", word: "Wait", color: "#94a3b8", edge: "#64748b" };
    case "repeat": return { icon: "🔁", word: "Repeat", color: "#ff9149", edge: "#e26f27" };
    case "until": return { icon: "🔁", word: "Repeat until", color: "#ff9149", edge: "#e26f27" };
    case "if": return { icon: "❓", word: "If", color: "#a855f7", edge: "#7e22ce" };
    case "ifelse": return { icon: "❓", word: "If", color: "#a855f7", edge: "#7e22ce" };
    case "def": return { icon: "🧩", word: "Define", color: "#ff6aa2", edge: "#e0457f" };
    case "call": return { icon: "🧩", word: "Call", color: "#ff6aa2", edge: "#e0457f" };
  }
  if (MOVE_EMOJI[op]) return { icon: MOVE_EMOJI[op], word: op[0].toUpperCase() + op.slice(1), ...DANCE };
  if (NOTE_COLOR[op]) return { icon: "🔔", word: op, color: NOTE_COLOR[op][0], edge: NOTE_COLOR[op][1], text: op };
  const fd = /^fd(\d)$/.exec(op);
  if (fd) return { icon: "⬆️", word: `Forward ${fd[1]}`, ...MOTION, text: fd[1] };
  const rt = /^(rt|lt)(\d+)$/.exec(op);
  if (rt) return { icon: rt[1] === "rt" ? "↪️" : "↩️", word: `${rt[1] === "rt" ? "Right" : "Left"} ${rt[2]}°`, ...TURN, text: `${rt[2]}°` };
  const col = /^color:(.)$/.exec(op);
  if (col) return { icon: "🎨", word: COLOR_NAME[col[1]] ?? col[1], color: PIXEL_COLOR[col[1]] ?? "#999", edge: "rgba(0,0,0,0.25)" };
  return { icon: "▪️", word: op, ...PEN };
}

/** The palette a level offers: its action blocks, then the containers it allows. */
export function paletteOf(level: CodeLevel, solution: Block[]): { op: string; make: () => Block }[] {
  const out: { op: string; make: () => Block }[] = level.palette.map((op) => ({ op, make: () => ({ op }) }));
  if (level.loops) out.push({ op: "repeat", make: () => ({ op: "repeat", n: 3, body: [] }) });
  if (level.untils) out.push({ op: "until", make: () => ({ op: "until", cond: "atGoal", body: [] }) });
  if (level.ifs) {
    // A plain "if" (no else) when that's what the answer uses — e.g. "if on a fish: catch".
    const plain = JSON.stringify(solution).includes('"op":"if"');
    const cond = condsOf(solution, "if")[0] ?? "blocked";
    out.push(plain ? { op: "if", make: () => ({ op: "if", cond, body: [] }) } : { op: "ifelse", make: () => ({ op: "ifelse", cond: "blocked", body: [], else: [] }) });
  }
  if (level.funcs) {
    const name = solution.find((b) => b.op === "def")?.name ?? "myBlock";
    out.push({ op: "def", make: () => ({ op: "def", name, body: [] }) });
  }
  return out;
}

/** The conditions a level's if/until blocks can ask (from its solution, plus sensible extras). */
export function condsOf(solution: Block[], kind: "if" | "until"): string[] {
  const found = new Set<string>();
  const walk = (p: Block[]) => p.forEach((b) => {
    if (b.cond && ((kind === "until") === (b.op === "until"))) found.add(b.cond);
    if (b.body) walk(b.body);
    if (b.else) walk(b.else);
  });
  walk(solution);
  // A level about fish asks about fish (wall sensors would just be noise there).
  if (kind === "if" && !found.has("fish")) ["blocked", "blockedRight", "blockedLeft"].forEach((c) => found.add(c));
  else if (kind === "until") found.add("atGoal");
  return [...found];
}

/** The next block the known answer would place, given what the child has so far (top level). */
export function nextHint(prog: Block[], solution: Block[]): { index: number; block: Block } | null {
  const sol = solution.filter((b) => b.op !== "def");
  const mine = prog.filter((b) => b.op !== "def");
  let i = 0;
  while (i < mine.length && i < sol.length && JSON.stringify(mine[i]) === JSON.stringify(sol[i])) i++;
  if (i >= sol.length) return null;
  return { index: i, block: sol[i] };
}
