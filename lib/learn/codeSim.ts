import type { CodeBlock, CodeLevel, Cmd, Dir } from "./types";

// The little programming world: a boat on a grid, sailed by a list of blocks. Pure functions,
// so the kid UI animates the frames and a test can prove every level is solvable.

export type Cell = { x: number; y: number };
export type World = { w: number; h: number; start: Cell; goal: Cell; rocks: Set<string>; shells: Set<string> };
export type Frame = {
  pos: Cell;
  facing: Dir;
  got: string[];
  /** Index path of the block running (e.g. [2, 0] = first block inside the 3rd block's repeat). */
  at: number[] | null;
  event: "start" | "move" | "turn" | "bump" | "shell" | "goal";
};
export type RunResult = { frames: Frame[]; outcome: "win" | "bump" | "short" | "shells" };

export const key = (c: Cell) => `${c.x},${c.y}`;
const STEP: Record<Dir, Cell> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const LEFT_OF: Record<Dir, Dir> = { up: "left", left: "down", down: "right", right: "up" };
const RIGHT_OF: Record<Dir, Dir> = { up: "right", right: "down", down: "left", left: "up" };

export function parseWorld(level: CodeLevel): World {
  const rocks = new Set<string>();
  const shells = new Set<string>();
  let start: Cell = { x: 0, y: 0 };
  let goal: Cell = { x: 0, y: 0 };
  level.map.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === "#") rocks.add(key({ x, y }));
      else if (ch === "*") shells.add(key({ x, y }));
      else if (ch === "S") start = { x, y };
      else if (ch === "G") goal = { x, y };
    }),
  );
  return { w: Math.max(...level.map.map((r) => r.length)), h: level.map.length, start, goal, rocks, shells };
}

/** Count blocks the way kids see them (a repeat is one block plus what's inside). */
export function blockCount(program: CodeBlock[]): number {
  return program.reduce((n, b) => n + ("cmd" in b ? 1 : 1 + blockCount(b.body)), 0);
}

function* flatten(program: CodeBlock[], path: number[] = []): Generator<{ cmd: Cmd; at: number[] }> {
  for (let i = 0; i < program.length; i++) {
    const b = program[i];
    if ("cmd" in b) yield { cmd: b.cmd, at: [...path, i] };
    else for (let k = 0; k < Math.max(0, Math.min(20, b.repeat)); k++) yield* flatten(b.body, [...path, i]);
  }
}

export function runProgram(level: CodeLevel, program: CodeBlock[]): RunResult {
  const world = parseWorld(level);
  let pos = { ...world.start };
  let facing: Dir = level.facing;
  const got: string[] = [];
  const frames: Frame[] = [{ pos, facing, got: [], at: null, event: "start" }];
  const done = () => got.length === world.shells.size;
  let steps = 0;

  for (const { cmd, at } of flatten(program)) {
    if (++steps > 200) break; // a runaway loop just stops
    if (cmd === "turnLeft" || cmd === "turnRight") {
      facing = cmd === "turnLeft" ? LEFT_OF[facing] : RIGHT_OF[facing];
      frames.push({ pos, facing, got: [...got], at, event: "turn" });
      continue;
    }
    const dir: Dir = cmd === "forward" ? facing : (cmd as Dir);
    if (cmd !== "forward") facing = dir;
    const next = { x: pos.x + STEP[dir].x, y: pos.y + STEP[dir].y };
    if (next.x < 0 || next.y < 0 || next.x >= world.w || next.y >= world.h || world.rocks.has(key(next))) {
      frames.push({ pos, facing, got: [...got], at, event: "bump" });
      return { frames, outcome: "bump" };
    }
    pos = next;
    const k = key(pos);
    if (world.shells.has(k) && !got.includes(k)) {
      got.push(k);
      frames.push({ pos, facing, got: [...got], at, event: "shell" });
    } else frames.push({ pos, facing, got: [...got], at, event: "move" });
    if (pos.x === world.goal.x && pos.y === world.goal.y && done()) {
      frames.push({ pos, facing, got: [...got], at, event: "goal" });
      return { frames, outcome: "win" };
    }
  }
  const atGoal = pos.x === world.goal.x && pos.y === world.goal.y;
  return { frames, outcome: atGoal && !done() ? "shells" : "short" };
}

/** Stars for a solved level: 3 = as few blocks as the best answer (and first try), else 2 or 1. */
export function codeStars(level: CodeLevel, program: CodeBlock[], tries: number): number {
  const n = blockCount(program);
  if (n <= level.best && tries <= 1) return 3;
  if (n <= level.best + 2 && tries <= 3) return 2;
  return 1;
}
