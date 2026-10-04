import type { Block, CodeLevel, Dir } from "./types";
import { gridEngine, parseGrid, runLevel, sharkPeriod, type GridState } from "./program";
import { type Rng, int, pick, shuffle } from "./gen";

// Level generators for the Code voyage. Every generated level is solved by a search (or run
// through the engine) before it's kept, so a child never meets an impossible puzzle, and the
// search's answer becomes the level's "best" and its hints.

export const blk = (op: string): Block => ({ op });
export const seqOf = (ops: readonly string[]) => ops.map(blk);
export const rep = (n: number, ...body: Block[]): Block => ({ op: "repeat", n, body });
export const ifelse = (cond: string, body: Block[], els: Block[]): Block => ({ op: "ifelse", cond, body, else: els });
export const iff = (cond: string, ...body: Block[]): Block => ({ op: "if", cond, body });
export const until = (cond: string, ...body: Block[]): Block => ({ op: "until", cond, body });
export const def = (name: string, ...body: Block[]): Block => ({ op: "def", name, body });
export const call = (name: string): Block => ({ op: "call", name });

export const ARROWS = ["up", "down", "left", "right"];
export const BOAT = ["fwd", "tl", "tr"];
export const MOVES = ["wave", "spin", "jump", "clap", "kick", "bow"];
export const NOTES = ["C", "D", "E", "F", "G", "A"];

const STEP: Record<Dir, [number, number]> = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
const LEFT_OF: Record<Dir, Dir> = { up: "left", left: "down", down: "right", right: "up" };
const RIGHT_OF: Record<Dir, Dir> = { up: "right", right: "down", down: "left", left: "up" };
const DIRS: Dir[] = ["up", "right", "down", "left"];

/** How often a generator had to fall back to a plain level (the checker expects 0). */
export const genStats = { fallbacks: 0 };

// ── Sea maps ──────────────────────────────────────────────────────────────────────────────────
type Prev = Map<string, [string, string] | null>;
function trace(prev: Prev, k: string): string[] {
  const ops: string[] = [];
  for (let p = prev.get(k); p; p = prev.get(p[0])) ops.unshift(p[1]);
  return ops;
}

/** The shortest program — arrows, or forward/turns for a boat — that collects every shell and docks. */
export function solveSea(map: string[], boat = false, facing: Dir = "right"): string[] | null {
  const g = parseGrid(map);
  const shells = [...g.shells];
  const full = (1 << shells.length) - 1;
  const bit = (x: number, y: number) => {
    const i = shells.indexOf(`${x},${y}`);
    return i < 0 ? 0 : 1 << i;
  };
  const open = (x: number, y: number) => x >= 0 && y >= 0 && x < g.w && y < g.h && !g.rocks.has(`${x},${y}`);
  type S = { x: number; y: number; f: Dir; m: number };
  const key = (s: S) => `${s.x},${s.y},${boat ? s.f : ""},${s.m}`;
  const s0: S = { x: g.start.x, y: g.start.y, f: facing, m: 0 };
  const prev: Prev = new Map([[key(s0), null]]);
  const q: S[] = [s0];
  for (let i = 0; i < q.length; i++) {
    const s = q[i];
    const k = key(s);
    if (s.x === g.goal.x && s.y === g.goal.y && s.m === full) return trace(prev, k);
    const go = (d: Dir): S | null => {
      const nx = s.x + STEP[d][0];
      const ny = s.y + STEP[d][1];
      return open(nx, ny) ? { x: nx, y: ny, f: d, m: s.m | bit(nx, ny) } : null;
    };
    const next: [string, S | null][] = boat
      ? [["fwd", go(s.f)], ["tl", { ...s, f: LEFT_OF[s.f] }], ["tr", { ...s, f: RIGHT_OF[s.f] }]]
      : DIRS.map((d) => [d, go(d)]);
    for (const [op, n] of next) {
      if (!n) continue;
      const nk = key(n);
      if (prev.has(nk)) continue;
      prev.set(nk, [k, op]);
      q.push(n);
    }
  }
  return null;
}

const turnsIn = (ops: string[], boat: boolean) =>
  boat ? ops.filter((o) => o === "tl" || o === "tr").length : ops.reduce((n, o, i) => n + (i > 0 && o !== ops[i - 1] ? 1 : 0), 0);

export type MapSpec = {
  w: number;
  h: number;
  rocks: number;
  shells?: number;
  /** Solution length range (blocks). */
  len: [number, number];
  /** At least this many turns. */
  turns?: number;
  /** Forward/turn steering instead of arrows. */
  boat?: boolean;
  /** The rocks must force a way around (longer than a straight shot). */
  detour?: boolean;
};

/** A random map that fits the spec, with its shortest solution. */
export function makeMap(r: Rng, o: MapSpec): { map: string[]; ops: string[] } {
  const cells: [number, number][] = [];
  for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) cells.push([x, y]);
  const ns = o.shells ?? 0;
  for (let attempt = 0; attempt < 600; attempt++) {
    const order = shuffle(r, cells);
    const grid = Array.from({ length: o.h }, () => Array.from({ length: o.w }, () => "."));
    const [s, g] = order;
    grid[s[1]][s[0]] = "S";
    grid[g[1]][g[0]] = "G";
    order.slice(2, 2 + ns).forEach(([x, y]) => (grid[y][x] = "*"));
    order.slice(2 + ns, 2 + ns + o.rocks).forEach(([x, y]) => (grid[y][x] = "#"));
    const map = grid.map((row) => row.join(""));
    const ops = solveSea(map, o.boat);
    if (!ops || ops.length < o.len[0] || ops.length > o.len[1]) continue;
    if (turnsIn(ops, !!o.boat) < (o.turns ?? 0)) continue;
    if (o.detour) {
      const moves = o.boat ? ops.filter((x) => x === "fwd").length : ops.length;
      if (moves <= Math.abs(s[0] - g[0]) + Math.abs(s[1] - g[1])) continue;
    }
    return { map, ops };
  }
  genStats.fallbacks++;
  const n = Math.max(2, o.w - 1);
  return { map: ["S" + ".".repeat(n - 1) + "G"], ops: Array(n).fill(o.boat ? "fwd" : "right") };
}

// ── Adventure seas: keys + gates, buttons + drawbridges, whirlpools, currents, fish, sharks ──
/** The shortest program (fewest blocks, no loops) for ANY sea map, found by searching the engine
 *  itself — so the answer is right by construction, whatever the map holds. `ops` are the moves
 *  allowed (arrows, or forward + turns); Catch and Wait join in when there are fish or sharks. */
export function solveGrid(map: string[], ops: readonly string[], facing: Dir = "right", maxDepth = 44): string[] | null {
  const eng = gridEngine(map, facing);
  const g = parseGrid(map);
  const period = sharkPeriod(map);
  const acts = [...ops, ...(g.fish.size ? ["catch"] : []), ...(period ? ["wait"] : [])];
  const boat = ops.includes("fwd");
  const sorted = (xs?: string[]) => [...(xs ?? [])].sort().join(";");
  const key = (s: GridState) => [s.x, s.y, boat ? s.facing : "", sorted(s.got), sorted(s.keys), sorted(s.opened), s.bridge ? 1 : 0, sorted(s.caught), period ? (s.t ?? 0) % period : ""].join("|");
  const prev: Prev = new Map([[key(eng.init), null]]);
  if (eng.won(eng.init)) return [];
  let frontier: GridState[] = [eng.init];
  for (let depth = 0; depth < maxDepth && frontier.length; depth++) {
    const next: GridState[] = [];
    for (const s of frontier) {
      const k = key(s);
      for (const op of acts) {
        if (op === "catch" && !eng.test("fish", s)) continue;
        const r = eng.exec(op, s);
        if (r.fail) continue;
        const nk = key(r.s);
        if (prev.has(nk)) continue;
        prev.set(nk, [k, op]);
        if (eng.won(r.s)) return trace(prev, nk);
        next.push(r.s);
      }
    }
    frontier = next;
    if (prev.size > 400000) break;
  }
  return null;
}

export type AdventureSpec = {
  w: number;
  h: number;
  /** The feature this sea is about. */
  kind: "key" | "keys2" | "bridge" | "pool" | "current" | "fish" | "shark";
  /** Extra scattered rocks, shells and fish. */
  rocks?: number;
  shells?: number;
  fish?: number;
  /** Solution length range (blocks, no loops). */
  len: [number, number];
  /** Forward/turn steering instead of arrows. */
  boat?: boolean;
};

/** A random sea built around one feature, checked by the solver: the gate / bridge / whirlpool
 *  really has to be used (the sea can't be crossed without it), a shark really is in the way. */
export function makeAdventure(r: Rng, o: AdventureSpec): { map: string[]; ops: string[] } {
  const ops = o.boat ? BOAT : ARROWS;
  for (let attempt = 0; attempt < 500; attempt++) {
    const grid = Array.from({ length: o.h }, () => Array.from({ length: o.w }, () => "."));
    const set = (x: number, y: number, ch: string) => (grid[y][x] = ch);
    const at = (x: number, y: number) => grid[y]?.[x];
    // A wall across the sea (down a column) splits it: left side and right side.
    const wallAt = (col: number, opening: string | null) => {
      const gap = int(r, 0, o.h - 1);
      for (let y = 0; y < o.h; y++) set(col, y, y === gap && opening ? opening : "#");
      return gap;
    };
    const freeIn = (x0: number, x1: number): [number, number][] => {
      const out: [number, number][] = [];
      for (let y = 0; y < o.h; y++) for (let x = x0; x <= x1; x++) if (at(x, y) === ".") out.push([x, y]);
      return shuffle(r, out);
    };
    const place = (x0: number, x1: number, ch: string) => {
      const c = freeIn(x0, x1)[0];
      if (!c) return false;
      set(c[0], c[1], ch);
      return true;
    };
    const mid = int(r, 2, o.w - 3);
    const L: [number, number] = [0, mid - 1];
    const R: [number, number] = [mid + 1, o.w - 1];
    let ok = true;
    if (o.kind === "key" || o.kind === "bridge") {
      wallAt(mid, o.kind === "key" ? "D" : "=");
      ok = place(...L, "S") && place(...L, o.kind === "key" ? "k" : "b") && place(...R, "G");
    } else if (o.kind === "keys2") {
      const m2 = int(r, mid + 2, o.w - 2);
      if (m2 >= o.w - 1 || m2 - mid < 2) continue;
      wallAt(mid, "D");
      wallAt(m2, "D");
      ok = place(...L, "S") && place(...L, "k") && place(mid + 1, m2 - 1, "k") && place(m2 + 1, o.w - 1, "G");
    } else if (o.kind === "pool") {
      wallAt(mid, null);
      ok = place(...L, "S") && place(...L, "@") && place(...R, "@") && place(...R, "G");
    } else if (o.kind === "current") {
      // A current along the boat's row: it carries you to the island (ride it!) or pushes you
      // back (go around it!).
      const row = int(r, 0, o.h - 1);
      const dir = pick(r, [">", "<"]);
      const from = int(r, 1, Math.max(1, o.w - 4));
      const len = int(r, 2, Math.max(2, Math.min(4, o.w - 1 - from)));
      for (let x = from; x < from + len && x < o.w - 1; x++) set(x, row, dir);
      set(0, row, "S");
      set(o.w - 1, int(r, 0, o.h - 1), "G");
    } else if (o.kind === "fish") {
      ok = place(0, o.w - 1, "S") && place(0, o.w - 1, "G");
    } else if (o.kind === "shark") {
      // A shark swims up and down a column the boat must cross.
      wallAt(mid, null);
      for (let y = 0; y < o.h; y++) set(mid, y, ".");
      set(mid, int(r, 0, o.h - 1), "N");
      ok = place(...L, "S") && place(...R, "G");
    }
    if (!ok) continue;
    for (let i = 0; i < (o.fish ?? 0); i++) ok = ok && place(0, o.w - 1, "f");
    for (let i = 0; i < (o.shells ?? 0); i++) ok = ok && place(0, o.w - 1, "*");
    for (let i = 0; i < (o.rocks ?? 0); i++) ok = ok && place(0, o.w - 1, "#");
    if (!ok) continue;
    const map = grid.map((row) => row.join(""));
    // Searches stop at the longest answer allowed (a sea that needs more isn't kept anyway).
    const sol = solveGrid(map, ops, "right", o.len[1]);
    if (!sol || sol.length < o.len[0]) continue;
    // The feature has to matter.
    const deep = o.len[1] * 2;
    if (o.kind === "pool" || o.kind === "key" || o.kind === "keys2" || o.kind === "bridge") {
      const without = map.map((row) => row.replace(/[@D=]/g, "#"));
      if (solveGrid(without, ops, "right", deep)) continue;
    }
    if (o.kind === "current") {
      const calm = map.map((row) => row.replace(/[<>^v]/g, "."));
      const plain = solveGrid(calm, ops, "right", deep);
      if (!plain || plain.length === sol.length) continue; // the current must change the best route
    }
    if (o.kind === "shark") {
      const safe = map.map((row) => row.replace(/[HN]/g, "."));
      const plain = solveGrid(safe, ops, "right", deep);
      if (plain && plain.length >= sol.length) continue; // the shark must make you wait or dodge
    }
    return { map, ops: sol };
  }
  genStats.fallbacks++;
  const n = Math.max(2, o.w - 1);
  return { map: ["S" + ".".repeat(n - 1) + "G"], ops: Array(n).fill(o.boat ? "fwd" : "right") };
}

/** A channel that repeats one move pattern (spot the pattern → use a loop). */
const ARROW_PATTERNS: string[][] = [
  ["right", "down"], ["right", "right", "down"], ["down", "right"], ["right", "up"],
  ["right", "right", "up"], ["down", "down", "right"], ["up", "right"], ["right", "down", "down"],
];
const BOAT_PATTERNS: string[][] = [
  ["fwd", "tr", "fwd", "tl"], ["fwd", "tl", "fwd", "tr"], ["fwd", "fwd", "tr", "fwd", "tl"], ["fwd", "tr", "fwd", "fwd", "tl"], ["fwd", "fwd", "tl", "fwd", "tr"],
];
export function genChannel(r: Rng, boat: boolean, times: [number, number]): { map: string[]; solution: Block[] } {
  const pat = pick(r, boat ? BOAT_PATTERNS : ARROW_PATTERNS);
  const k = int(r, times[0], times[1]);
  let x = 0;
  let y = 0;
  let f: Dir = "right";
  const cells: [number, number][] = [[0, 0]];
  for (let i = 0; i < k; i++)
    for (const op of pat) {
      if (op === "tl") f = LEFT_OF[f];
      else if (op === "tr") f = RIGHT_OF[f];
      else {
        const d = op === "fwd" ? f : (op as Dir);
        x += STEP[d][0];
        y += STEP[d][1];
        cells.push([x, y]);
      }
    }
  return { map: drawPath(r, cells), solution: [rep(k, ...seqOf(pat))] };
}

/** Render a path as a map: the channel is water, everything around it reef (with a little open sea far from it). */
function drawPath(r: Rng, cells: [number, number][]): string[] {
  const minX = Math.min(...cells.map((c) => c[0]));
  const minY = Math.min(...cells.map((c) => c[1]));
  const w = Math.max(...cells.map((c) => c[0])) - minX + 1;
  const h = Math.max(...cells.map((c) => c[1])) - minY + 1;
  const grid = Array.from({ length: h }, () => Array.from({ length: w }, () => "#"));
  cells.forEach(([cx, cy]) => (grid[cy - minY][cx - minX] = "."));
  void r;
  const [sx, sy] = cells[0];
  const [gx, gy] = cells[cells.length - 1];
  grid[sy - minY][sx - minX] = "S";
  grid[gy - minY][gx - minX] = "G";
  return grid.map((row) => row.join(""));
}

// ── Rover corridors + mazes (one program must solve them all) ───────────────────────────────
export type Side = "right" | "left" | "mixed";
export const roverProgram = (side: Side): Block[] =>
  side === "mixed"
    ? [until("atGoal", ifelse("blocked", [ifelse("blockedRight", [blk("tl")], [blk("tr")])], [blk("fwd")]))]
    : [until("atGoal", ifelse("blocked", [blk(side === "right" ? "tr" : "tl")], [blk("fwd")]))];
export const WALL_FOLLOWER: Block[] = [until("atGoal", ifelse("blockedRight", [ifelse("blocked", [blk("tl")], [blk("fwd")])], [blk("tr"), blk("fwd")]))];

/** A winding corridor whose turns all go one way (or both ways, for "mixed"). */
export function genCorridor(r: Rng, o: { turns: number; seg: [number, number]; side: Side }): string[] {
  for (let attempt = 0; attempt < 400; attempt++) {
    let x = 0;
    let y = 0;
    let f: Dir = "right";
    const cells: [number, number][] = [[0, 0]];
    const sides: boolean[] = [];
    for (let t = 0; t <= o.turns; t++) {
      const len = int(r, o.seg[0], o.seg[1]);
      for (let i = 0; i < len; i++) {
        x += STEP[f][0];
        y += STEP[f][1];
        cells.push([x, y]);
      }
      if (t < o.turns) {
        const right = o.side === "right" || (o.side === "mixed" && r() < 0.5);
        sides.push(right);
        f = right ? RIGHT_OF[f] : LEFT_OF[f];
      }
    }
    if (o.side === "mixed" && (sides.every(Boolean) || !sides.some(Boolean))) continue;
    const idx = new Map(cells.map((c, i) => [`${c[0]},${c[1]}`, i]));
    if (idx.size !== cells.length) continue;
    let touching = false;
    cells.forEach(([cx, cy], i) => {
      for (const d of DIRS) {
        const j = idx.get(`${cx + STEP[d][0]},${cy + STEP[d][1]}`);
        if (j !== undefined && Math.abs(j - i) > 1) touching = true;
      }
    });
    if (touching) continue;
    const map = drawPath(r, cells);
    const level = { sim: "rover", maps: [map], facing: "right" } as CodeLevel;
    if (!runLevel(level, roverProgram(o.side)).won) continue;
    return map;
  }
  genStats.fallbacks++;
  return ["S..G"];
}

/** A perfect maze (one way between any two spots) — keep a hand on the wall and you'll get out. */
export function genMaze(r: Rng, cw: number, ch: number): string[] {
  const W = cw * 2 - 1;
  const H = ch * 2 - 1;
  const grid = Array.from({ length: H }, () => Array.from({ length: W }, () => "#"));
  const seen = new Set<string>(["0,0"]);
  const stack: [number, number][] = [[0, 0]];
  grid[0][0] = ".";
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const nbrs = DIRS.map((d) => [cx + STEP[d][0], cy + STEP[d][1]] as [number, number]).filter(
      ([nx, ny]) => nx >= 0 && ny >= 0 && nx < cw && ny < ch && !seen.has(`${nx},${ny}`),
    );
    if (!nbrs.length) {
      stack.pop();
      continue;
    }
    const [nx, ny] = pick(r, nbrs);
    seen.add(`${nx},${ny}`);
    grid[cy + ny][cx + nx] = ".";
    grid[ny * 2][nx * 2] = ".";
    stack.push([nx, ny]);
  }
  grid[0][0] = "S";
  grid[H - 1][W - 1] = "G";
  return grid.map((row) => row.join(""));
}

// ── Dances + songs ───────────────────────────────────────────────────────────────────────────
/** A run of moves with no three alike in a row. */
export function genSeq(r: Rng, palette: readonly string[], len: number, noRepeat = false): string[] {
  const out: string[] = [];
  let guard = 0;
  while (out.length < len && guard++ < 500) {
    const m = pick(r, palette);
    const last = out[out.length - 1];
    if (noRepeat && last === m) continue;
    if (out.length >= 2 && last === m && out[out.length - 2] === m) continue;
    out.push(m);
  }
  return out;
}
/** A singable melody: small steps up and down the bells. */
export function genMelody(r: Rng, len: number): string[] {
  let i = pick(r, [0, 2, 4]);
  const out = [NOTES[i]];
  while (out.length < len) {
    i = Math.max(0, Math.min(NOTES.length - 1, i + pick(r, [-2, -1, -1, 0, 1, 1, 2])));
    out.push(NOTES[i]);
  }
  return out;
}
/** A pattern that repeats (plus maybe one extra move at the end) — made for a loop. */
export function genLoopSeq(r: Rng, palette: readonly string[], o: { body: [number, number]; times: [number, number]; tail?: number }): { target: string[]; solution: Block[] } {
  const body = genSeq(r, palette, int(r, o.body[0], o.body[1]), true);
  const k = int(r, o.times[0], o.times[1]);
  const tail = r() < (o.tail ?? 0) ? [pick(r, palette.filter((m) => m !== body[0]))] : [];
  const target = [...Array.from({ length: k }, () => body).flat(), ...tail];
  return { target, solution: [rep(k, ...seqOf(body)), ...seqOf(tail)] };
}
/** A song with a chorus that comes back between verses — made for a function. */
export function genChorus(r: Rng, palette: readonly string[]): { target: string[]; solution: Block[] } {
  const chorus = genSeq(r, palette, 3, true);
  const a = pick(r, palette.filter((m) => m !== chorus[0]));
  const b = pick(r, palette.filter((m) => m !== chorus[0]));
  return {
    target: [...chorus, a, ...chorus, b, ...chorus],
    solution: [def("chorus", ...seqOf(chorus)), call("chorus"), blk(a), call("chorus"), blk(b), call("chorus")],
  };
}

// ── Turtle + pixels ──────────────────────────────────────────────────────────────────────────
/** A regular polygon: n sides of length `side` (n ∈ 3,4,5,6,8,9,10 so the angle is whole). */
export const polygon = (n: number, side: number): Block[] => [rep(n, blk(`fd${side}`), blk(`rt${360 / n}`))];
/** A flower: a polygon stamped `petals` times around the middle. */
export const flower = (petals: number, n: number, side: number): Block[] => [rep(petals, ...polygon(n, side), blk(`rt${360 / petals}`))];

/** A straightforward painting program for a picture (a child using loops can beat it). */
export function solvePixel(picture: string[]): Block[] {
  const ops: string[] = [];
  let x = 0;
  let y = 0;
  let color = "r";
  picture.forEach((row, ry) => {
    const xs = [...row].map((c, i) => (c !== "." ? i : -1)).filter((i) => i >= 0);
    if (!xs.length) return;
    while (y < ry) {
      ops.push("down");
      y++;
    }
    const lo = Math.min(...xs);
    const hi = Math.max(...xs);
    const leftFirst = Math.abs(x - lo) <= Math.abs(x - hi);
    for (let k = 0; k <= hi - lo; k++) {
      const tx = leftFirst ? lo + k : hi - k;
      while (x < tx) {
        ops.push("right");
        x++;
      }
      while (x > tx) {
        ops.push("left");
        x--;
      }
      const c = row[tx];
      if (c === ".") continue;
      if (c !== color) {
        ops.push(`color:${c}`);
        color = c;
      }
      ops.push("paint");
    }
  });
  return seqOf(ops);
}
export const pictureColors = (picture: string[]) => [...new Set(picture.join("").replace(/\./g, ""))];

// ── Bugs ─────────────────────────────────────────────────────────────────────────────────────
const OPPOSITE: Record<string, string> = { up: "down", down: "up", left: "right", right: "left", tl: "tr", tr: "tl" };
/** Break a working program in one small way (a missing step, two swapped, a wrong turn, a wrong
 *  count) — and make sure it really is broken. */
export function makeBug(r: Rng, level: CodeLevel, solution: Block[]): Block[] {
  const clone = (p: Block[]): Block[] => JSON.parse(JSON.stringify(p));
  for (let attempt = 0; attempt < 80; attempt++) {
    const p = clone(solution);
    // Every block list in the program (top level, loop bodies, if/else branches, functions).
    const lists: Block[][] = [];
    const loops: Block[] = [];
    const walk = (bs: Block[]) => {
      lists.push(bs);
      for (const b of bs) {
        if (b.op === "repeat") loops.push(b);
        if (b.body) walk(b.body);
        if (b.else) walk(b.else);
      }
    };
    walk(p);
    const list = pick(r, lists.filter((l) => l.length));
    const simple = list.map((b, i) => [b, i] as const).filter(([b]) => !b.body);
    const kind = pick(r, ["drop", "swap", "flip", "count"]);
    if (kind === "count" && loops.length) {
      const loop = pick(r, loops);
      loop.n = Math.max(1, (loop.n ?? 2) + pick(r, [-1, 1]));
    } else if (kind === "drop" && simple.length > 1) list.splice(pick(r, simple)[1], 1);
    else if (kind === "swap" && list.length > 1) {
      const i = int(r, 0, list.length - 2);
      if (JSON.stringify(list[i]) === JSON.stringify(list[i + 1])) continue;
      [list[i], list[i + 1]] = [list[i + 1], list[i]];
    } else if (kind === "flip") {
      const flips = simple.filter(([b]) => OPPOSITE[b.op]);
      if (!flips.length) continue;
      const [b] = pick(r, flips);
      b.op = OPPOSITE[b.op];
    } else continue;
    if (!runLevel(level, p).won) return p;
  }
  genStats.fallbacks++;
  return clone(solution).slice(0, -1);
}
