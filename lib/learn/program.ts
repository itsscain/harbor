import type { Block, CodeLevel, Dir } from "./types";

// The coding engine: one interpreter for block programs (repeat, if/else, repeat-until,
// functions) driving six little worlds. Everything is pure, so the UI animates the steps and
// a checker can prove every level is solvable.

/** One pass of a loop that's running: the loop's address, which pass (1-based) and how many
 *  (repeat-until has no fixed count). Every step carries the loops it's inside, so the editor can
 *  show "pass 2 of 4" on the loop while it runs. */
export type Iter = { at: number[]; k: number; n?: number };
export type Step<S> = { state: S; at: number[]; event: string; fail?: string; iters?: Iter[] };
export type Engine<S> = {
  init: S;
  exec: (op: string, s: S) => { s: S; event: string; fail?: string };
  test: (cond: string, s: S) => boolean;
  won: (s: S) => boolean;
  /** Stop as soon as the goal is reached (moving worlds). */
  stopOnWin?: boolean;
};
export type RunResult<S> = { steps: Step<S>[]; final: S; fail?: { at: number[]; reason: string }; won: boolean; overflow: boolean };

/** Else-branch blocks are addressed with negative indices: -1 - i. */
export const elseIndex = (i: number) => -1 - i;

export function runEngine<S>(prog: Block[], eng: Engine<S>, limit = 3000): RunResult<S> {
  const defs = new Map<string, Block[]>();
  for (const b of prog) if (b.op === "def" && b.name) defs.set(b.name, b.body ?? []);
  let s = eng.init;
  const steps: Step<S>[] = [];
  let count = 0;
  let fail: RunResult<S>["fail"];
  let halted = false;
  let overflow = false;
  const stack: Iter[] = [];
  const iters = () => (stack.length ? stack.map((x) => ({ ...x })) : undefined);
  const exec = (blocks: Block[], path: number[], depth: number, elseBranch = false) => {
    for (let i = 0; i < blocks.length && !halted; i++) {
      const b = blocks[i];
      const at = [...path, elseBranch ? elseIndex(i) : i];
      if (b.op === "def") continue;
      if (++count > limit) {
        halted = true;
        overflow = true;
        return;
      }
      if (b.op === "repeat") {
        const reps = Math.min(30, Math.max(0, b.n ?? 2));
        for (let k = 0; k < reps && !halted; k++) {
          stack.push({ at, k: k + 1, n: reps });
          exec(b.body ?? [], at, depth + 1);
          stack.pop();
        }
        continue;
      }
      if (b.op === "if" || b.op === "ifelse") {
        const ok = eng.test(b.cond ?? "", s);
        steps.push({ state: s, at, event: ok ? "yes" : "no", iters: iters() });
        if (ok) exec(b.body ?? [], at, depth + 1);
        else if (b.op === "ifelse") exec(b.else ?? [], at, depth + 1, true);
        continue;
      }
      if (b.op === "until") {
        let guard = 0;
        while (!halted && guard++ < 250) {
          stack.push({ at, k: guard });
          const met = eng.test(b.cond ?? "", s);
          steps.push({ state: s, at, event: met ? "yes" : "no", iters: iters() });
          if (met) {
            stack.pop();
            break;
          }
          const before = steps.length;
          exec(b.body ?? [], at, depth + 1);
          stack.pop();
          if (steps.length === before) break; // an empty body can't make progress
        }
        continue;
      }
      if (b.op === "call") {
        const body = defs.get(b.name ?? "");
        if (body && depth < 6) exec(body, at, depth + 1);
        continue;
      }
      const r = eng.exec(b.op, s);
      s = r.s;
      steps.push({ state: s, at, event: r.event, fail: r.fail, iters: iters() });
      if (r.fail) {
        fail = { at, reason: r.fail };
        halted = true;
        return;
      }
      if (eng.stopOnWin && eng.won(s)) {
        halted = true;
        return;
      }
    }
  };
  exec(prog, [], 0);
  return { steps, final: s, fail, won: !fail && eng.won(s), overflow };
}

/** Blocks as a child counts them (a container is one block plus what's inside). */
export function blockCount(prog: Block[]): number {
  return prog.reduce((n, b) => n + 1 + blockCount(b.body ?? []) + blockCount(b.else ?? []), 0);
}

// ── Grid worlds: Sea Navigator + Mars Rover ───────────────────────────────────────────────────
export type Cell = { x: number; y: number };
export type GridState = { x: number; y: number; facing: Dir; got: string[] };
export type Grid = { w: number; h: number; start: Cell; goal: Cell; rocks: Set<string>; shells: Set<string> };
export const cellKey = (c: Cell) => `${c.x},${c.y}`;
const STEP: Record<Dir, Cell> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const LEFT_OF: Record<Dir, Dir> = { up: "left", left: "down", down: "right", right: "up" };
const RIGHT_OF: Record<Dir, Dir> = { up: "right", right: "down", down: "left", left: "up" };

export function parseGrid(map: string[]): Grid {
  const rocks = new Set<string>();
  const shells = new Set<string>();
  let start: Cell = { x: 0, y: 0 };
  let goal: Cell = { x: 0, y: 0 };
  map.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === "#") rocks.add(cellKey({ x, y }));
      else if (ch === "*") shells.add(cellKey({ x, y }));
      else if (ch === "S") start = { x, y };
      else if (ch === "G") goal = { x, y };
    }),
  );
  return { w: Math.max(...map.map((r) => r.length)), h: map.length, start, goal, rocks, shells };
}

export function gridEngine(map: string[], facing: Dir): Engine<GridState> {
  const g = parseGrid(map);
  const blocked = (s: GridState, d: Dir) => {
    const n = { x: s.x + STEP[d].x, y: s.y + STEP[d].y };
    return n.x < 0 || n.y < 0 || n.x >= g.w || n.y >= g.h || g.rocks.has(cellKey(n));
  };
  const move = (s: GridState, d: Dir): { s: GridState; event: string; fail?: string } => {
    const n = { x: s.x + STEP[d].x, y: s.y + STEP[d].y };
    if (n.x < 0 || n.y < 0 || n.x >= g.w || n.y >= g.h) return { s: { ...s, facing: d }, event: "bump", fail: "edge" };
    if (g.rocks.has(cellKey(n))) return { s: { ...s, facing: d }, event: "bump", fail: "rock" };
    const k = cellKey(n);
    const got = g.shells.has(k) && !s.got.includes(k) ? [...s.got, k] : s.got;
    return { s: { x: n.x, y: n.y, facing: d, got }, event: got !== s.got ? "shell" : "move" };
  };
  return {
    init: { x: g.start.x, y: g.start.y, facing, got: [] },
    exec: (op, s) => {
      if (op === "up" || op === "down" || op === "left" || op === "right") return move(s, op);
      if (op === "fwd") return move(s, s.facing);
      if (op === "tl") return { s: { ...s, facing: LEFT_OF[s.facing] }, event: "turn" };
      if (op === "tr") return { s: { ...s, facing: RIGHT_OF[s.facing] }, event: "turn" };
      return { s, event: "noop" };
    },
    test: (cond, s) => {
      if (cond === "blocked") return blocked(s, s.facing);
      if (cond === "clear") return !blocked(s, s.facing);
      if (cond === "blockedLeft") return blocked(s, LEFT_OF[s.facing]);
      if (cond === "blockedRight") return blocked(s, RIGHT_OF[s.facing]);
      if (cond === "atGoal") return s.x === g.goal.x && s.y === g.goal.y;
      if (cond === "shell") return g.shells.has(cellKey(s)) && !s.got.includes(cellKey(s));
      return false;
    },
    won: (s) => s.x === g.goal.x && s.y === g.goal.y && s.got.length === g.shells.size,
    stopOnWin: true,
  };
}

// ── Sequence worlds: Robot Dance Party + Music Maker ──────────────────────────────────────────
export type SeqState = { done: string[] };
export function seqEngine(target: string[]): Engine<SeqState> {
  return {
    init: { done: [] },
    exec: (op, s) => {
      const done = [...s.done, op];
      const i = done.length - 1;
      return { s: { done }, event: op, fail: i >= target.length ? "extra" : undefined };
    },
    test: () => false,
    won: (s) => s.done.length === target.length && s.done.every((m, i) => m === target[i]),
  };
}

// ── Turtle Artist ─────────────────────────────────────────────────────────────────────────────
export type Seg = [number, number, number, number];
export type TurtleState = { x: number; y: number; deg: number; pen: boolean; color: string; segs: Seg[]; cols: string[] };
export const TURTLE_BOUND = 7;
const r2 = (v: number) => Math.round(v * 100) / 100;
const EPS = 0.05;
const close = (a: number, b: number) => Math.abs(a - b) < EPS;
/** Same line, either direction (tolerant of tiny floating-point drift). */
export const sameSeg = (a: Seg, b: Seg) =>
  (close(a[0], b[0]) && close(a[1], b[1]) && close(a[2], b[2]) && close(a[3], b[3])) ||
  (close(a[0], b[2]) && close(a[1], b[3]) && close(a[2], b[0]) && close(a[3], b[1]));
export function turtleEngine(target?: Seg[]): Engine<TurtleState> {
  return {
    init: { x: 0, y: 0, deg: -90, pen: true, color: "#ff7363", segs: [], cols: [] },
    exec: (op, s) => {
      const fd = /^fd(\d)$/.exec(op);
      if (fd) {
        const n = Number(fd[1]);
        let { x, y } = s;
        const segs = [...s.segs];
        const cols = [...s.cols];
        for (let i = 0; i < n; i++) {
          const nx = x + Math.cos((s.deg * Math.PI) / 180);
          const ny = y + Math.sin((s.deg * Math.PI) / 180);
          if (Math.abs(nx) > TURTLE_BOUND || Math.abs(ny) > TURTLE_BOUND) return { s: { ...s, x, y, segs, cols }, event: "bump", fail: "edge" };
          if (s.pen) {
            segs.push([x, y, nx, ny]);
            cols.push(s.color);
          }
          x = nx;
          y = ny;
        }
        return { s: { ...s, x, y, segs, cols }, event: "draw" };
      }
      const rt = /^(rt|lt)(\d+)$/.exec(op);
      if (rt) return { s: { ...s, deg: (s.deg + (rt[1] === "rt" ? 1 : -1) * Number(rt[2]) + 360) % 360 }, event: "turn" };
      if (op === "penup") return { s: { ...s, pen: false }, event: "pen" };
      if (op === "pendown") return { s: { ...s, pen: true }, event: "pen" };
      const col = /^color:(.+)$/.exec(op);
      if (col) return { s: { ...s, color: col[1] }, event: "color" };
      return { s, event: "noop" };
    },
    test: () => false,
    // Every line of the picture drawn, and nothing extra (retracing a line is fine).
    won: (s) => !!target && target.every((t) => s.segs.some((g) => sameSeg(t, g))) && s.segs.every((g) => target.some((t) => sameSeg(t, g))),
  };
}
export function segKey([a, b, c, d]: Seg): string {
  const p1 = `${r2(a)},${r2(b)}`;
  const p2 = `${r2(c)},${r2(d)}`;
  return p1 < p2 ? `${p1}|${p2}` : `${p2}|${p1}`;
}
/** The picture a drawing program makes (the faint target to trace). */
export function drawTarget(draw: Block[]): Seg[] {
  return runEngine(draw, turtleEngine()).final.segs.map((s) => [s[0], s[1], s[2], s[3]] as Seg);
}

// ── Pixel Painter ─────────────────────────────────────────────────────────────────────────────
export type PixelState = { x: number; y: number; color: string; grid: string[][] };
export function pixelEngine(picture: string[]): Engine<PixelState> {
  const h = picture.length;
  const w = Math.max(...picture.map((r) => r.length));
  return {
    init: { x: 0, y: 0, color: "r", grid: Array.from({ length: h }, () => Array.from({ length: w }, () => ".")) },
    exec: (op, s) => {
      const moves: Record<string, [number, number]> = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] };
      if (moves[op]) {
        const [dx, dy] = moves[op];
        const nx = s.x + dx;
        const ny = s.y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) return { s, event: "bump" }; // the edge just stops the brush
        return { s: { ...s, x: nx, y: ny }, event: "move" };
      }
      if (op === "paint") {
        const grid = s.grid.map((row) => [...row]);
        grid[s.y][s.x] = s.color;
        return { s: { ...s, grid }, event: "paint" };
      }
      const col = /^color:(.)$/.exec(op);
      if (col) return { s: { ...s, color: col[1] }, event: "color" };
      return { s, event: "noop" };
    },
    test: () => false,
    won: (s) => s.grid.every((row, y) => row.every((c, x) => c === (picture[y][x] ?? "."))),
  };
}

// ── One entry point per level ─────────────────────────────────────────────────────────────────
/** Run a program on a level. Rover/sea levels with several maps must solve ALL of them. */
export function runLevel(level: CodeLevel, prog: Block[]): { results: RunResult<unknown>[]; won: boolean } {
  let engines: Engine<unknown>[];
  switch (level.sim) {
    case "sea":
    case "rover":
      engines = (level.maps ?? []).map((m) => gridEngine(m, level.facing ?? "right") as Engine<unknown>);
      break;
    case "dance":
    case "music":
      engines = [seqEngine(level.target ?? []) as Engine<unknown>];
      break;
    case "turtle":
      engines = [turtleEngine(drawTarget(level.draw ?? [])) as Engine<unknown>];
      break;
    case "pixel":
      engines = [pixelEngine(level.picture ?? []) as Engine<unknown>];
      break;
  }
  const results = engines.map((e) => runEngine(prog, e));
  return { results, won: results.every((r) => r.won) };
}

/** Stars for a solved level: 3 = no more blocks than the best answer, first try. */
export function codeStars(level: CodeLevel, prog: Block[], tries: number): number {
  const n = blockCount(prog);
  if (n <= level.best && tries <= 1) return 3;
  if (n <= level.best + 2 && tries <= 3) return 2;
  return 1;
}

// ── "Real code" view for big kids ─────────────────────────────────────────────────────────────
const NAMES: Record<string, string> = {
  up: "moveUp()", down: "moveDown()", left: "moveLeft()", right: "moveRight()", fwd: "forward()", tl: "turnLeft()", tr: "turnRight()",
  paint: "paint()", penup: "penUp()", pendown: "penDown()",
};
const CONDS: Record<string, string> = { blocked: "pathBlocked()", clear: "pathClear()", atGoal: "atGoal()", blockedLeft: "blockedLeft()", blockedRight: "blockedRight()", shell: "onShell()" };
export function toText(prog: Block[], indent = ""): string[] {
  const out: string[] = [];
  for (const b of prog) {
    if (b.op === "repeat") {
      out.push(`${indent}for (let i = 0; i < ${b.n ?? 2}; i++) {`, ...toText(b.body ?? [], indent + "  "), `${indent}}`);
    } else if (b.op === "if") {
      out.push(`${indent}if (${CONDS[b.cond ?? ""] ?? b.cond}) {`, ...toText(b.body ?? [], indent + "  "), `${indent}}`);
    } else if (b.op === "ifelse") {
      out.push(`${indent}if (${CONDS[b.cond ?? ""] ?? b.cond}) {`, ...toText(b.body ?? [], indent + "  "), `${indent}} else {`, ...toText(b.else ?? [], indent + "  "), `${indent}}`);
    } else if (b.op === "until") {
      out.push(`${indent}while (!${CONDS[b.cond ?? ""] ?? b.cond}) {`, ...toText(b.body ?? [], indent + "  "), `${indent}}`);
    } else if (b.op === "def") {
      out.push(`${indent}function ${b.name}() {`, ...toText(b.body ?? [], indent + "  "), `${indent}}`);
    } else if (b.op === "call") {
      out.push(`${indent}${b.name}();`);
    } else {
      const fd = /^fd(\d)$/.exec(b.op);
      const rt = /^(rt|lt)(\d+)$/.exec(b.op);
      const col = /^color:(.+)$/.exec(b.op);
      out.push(`${indent}${fd ? `forward(${fd[1]})` : rt ? `${rt[1] === "rt" ? "turnRight" : "turnLeft"}(${rt[2]})` : col ? `setColor("${col[1]}")` : NAMES[b.op] ?? `${b.op}()`};`);
    }
  }
  return out;
}

/** The same program as Python (what Python Peek teaches): snake_case names, colons and indents. */
const snake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
export function toPython(prog: Block[], indent = ""): string[] {
  const inner = indent + "    ";
  const body = (p?: Block[]) => (p?.length ? toPython(p, inner) : [`${inner}pass`]);
  const cond = (c?: string) => snake(CONDS[c ?? ""] ?? `${c}()`);
  const out: string[] = [];
  for (const b of prog) {
    if (b.op === "repeat") out.push(`${indent}for i in range(${b.n ?? 2}):`, ...body(b.body));
    else if (b.op === "if") out.push(`${indent}if ${cond(b.cond)}:`, ...body(b.body));
    else if (b.op === "ifelse") out.push(`${indent}if ${cond(b.cond)}:`, ...body(b.body), `${indent}else:`, ...body(b.else));
    else if (b.op === "until") out.push(`${indent}while not ${cond(b.cond)}:`, ...body(b.body));
    else if (b.op === "def") out.push(`${indent}def ${b.name}():`, ...body(b.body));
    else if (b.op === "call") out.push(`${indent}${b.name}()`);
    else {
      const fd = /^fd(\d)$/.exec(b.op);
      const rt = /^(rt|lt)(\d+)$/.exec(b.op);
      const col = /^color:(.+)$/.exec(b.op);
      const note = /^[A-G]$/.test(b.op);
      out.push(`${indent}${fd ? `forward(${fd[1]})` : rt ? `${rt[1] === "rt" ? "turn_right" : "turn_left"}(${rt[2]})` : col ? `set_color("${col[1]}")` : note ? `play("${b.op}")` : snake(NAMES[b.op] ?? `${b.op}()`)}`);
    }
  }
  return out;
}
