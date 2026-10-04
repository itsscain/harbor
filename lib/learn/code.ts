import type { Activity, Block, CodeLevel, Course, GradeId, Lesson, LevelKind, Unit } from "./types";
import { themeFor } from "./meta";
import { blockCount } from "./program";
import { type Rng, rng, int, pick, pickN } from "./gen";
import {
  ARROWS, BOAT, MOVES, NOTES, blk, seqOf, rep, until, def, call,
  makeMap, genChannel, genCorridor, genMaze, genSeq, genMelody, genLoopSeq, genChorus,
  polygon, flower, solvePixel, pictureColors, makeBug, roverProgram, WALL_FOLLOWER, type MapSpec, type Side,
} from "./codeGen";

// The Code voyage — real programming ideas through six hands-on worlds, run block by block with
// big animations: steer a boat (Sea Navigator), make a robot dance, compose songs, draw with a
// turtle, paint pixel art, and drive a Mars rover with sensors. Concepts grow the way CS
// curricula teach them: sequencing → loops → turning from the boat's view → debugging →
// conditionals + repeat-until → functions → nested loops → algorithms. Little sailors tap
// picture blocks; big kids see the real code their blocks make.

const R = blk("right"), L = blk("left"), U = blk("up"), D = blk("down"), F = blk("fwd"), TL = blk("tl"), TR = blk("tr");
const P = blk("paint");

type Extra = Partial<CodeLevel>;
const withBest = (l: Omit<CodeLevel, "best"> & { best?: number }): CodeLevel => ({ ...l, best: l.best ?? blockCount(l.solution) });
const sea = (goal: string, map: string[], solution: Block[], x: Extra = {}) => withBest({ sim: "sea", goal, palette: ARROWS, maps: [map], facing: "right", solution, ...x });
const view = (goal: string, map: string[], solution: Block[], x: Extra = {}) => withBest({ sim: "sea", goal, palette: BOAT, maps: [map], facing: "right", solution, ...x });
const rover = (goal: string, maps: string[][], solution: Block[], x: Extra = {}) => withBest({ sim: "rover", goal, palette: BOAT, maps, facing: "right", solution, ifs: true, untils: true, ...x });
const dance = (goal: string, target: string[], solution: Block[] = seqOf(target), x: Extra = {}) => withBest({ sim: "dance", goal, palette: MOVES, target, solution, ...x });
const music = (goal: string, target: string[], solution: Block[] = seqOf(target), x: Extra = {}) => withBest({ sim: "music", goal, palette: NOTES, target, solution, ...x });
const turtle = (goal: string, solution: Block[], palette: string[], x: Extra = {}) => withBest({ sim: "turtle", goal, palette, draw: solution, solution, loops: JSON.stringify(solution).includes("repeat"), ...x });
const PIXEL_MOVES = ["paint", "right", "left", "down", "up"];
const pixel = (goal: string, picture: string[], solution: Block[] = solvePixel(picture), x: Extra = {}) => {
  const colors = pictureColors(picture);
  const palette = [...PIXEL_MOVES, ...(colors.length > 1 || colors[0] !== "r" ? colors.map((c) => `color:${c}`) : [])];
  return withBest({ sim: "pixel", goal, palette, picture, solution, ...x });
};
const debug = (l: CodeLevel, buggy: Block[], hint?: string): CodeLevel => ({ ...l, buggy, hint: hint ?? l.hint, goal: "Fix the bug!" });

// ── Generated levels (each one solved before it's kept) ──────────────────────────────────────
const gSea = (r: Rng, goal: string, spec: MapSpec, x: Extra = {}): CodeLevel => {
  const { map, ops } = makeMap(r, spec);
  return (spec.boat ? view : sea)(goal, map, seqOf(ops), x);
};
const gChannel = (r: Rng, boat: boolean, times: [number, number]): CodeLevel => {
  const { map, solution } = genChannel(r, boat, times);
  return (boat ? view : sea)("Spot the pattern — use a loop!", map, solution, { loops: true, hint: "What moves happen again and again?" });
};
const gDance = (r: Rng, len: number) => dance("Copy the dance!", genSeq(r, MOVES, len));
const gSong = (r: Rng, len: number) => music("Play it back!", genMelody(r, len));
type LoopSpec = { body: [number, number]; times: [number, number]; tail?: number };
const gLoopDance = (r: Rng, o: LoopSpec) => {
  const { target, solution } = genLoopSeq(r, MOVES, o);
  return dance("Use a loop!", target, solution, { loops: true });
};
const gLoopSong = (r: Rng, o: LoopSpec) => {
  const { target, solution } = genLoopSeq(r, NOTES, o);
  return music("Use a loop!", target, solution, { loops: true });
};
const gChorus = (r: Rng, kind: "dance" | "music") => {
  const { target, solution } = genChorus(r, kind === "dance" ? MOVES : NOTES);
  return (kind === "dance" ? dance : music)("Make a chorus function!", target, solution, { funcs: true, loops: true, textCode: true, hint: "Define the part that repeats, then call it." });
};
const ANGLES = [120, 90, 72, 60, 45, 40, 36];
const SHAPE_NAME: Record<number, string> = { 3: "triangle", 4: "square", 5: "pentagon", 6: "hexagon", 8: "octagon", 9: "nonagon", 10: "decagon" };
/** The blocks a turtle level needs, plus one decoy turn so the angle is a real choice. */
const turtlePalette = (sol: Block[], extra: string[] = []) => {
  const ops = new Set<string>(extra);
  const walk = (p: Block[]) => p.forEach((b) => (b.body ? walk(b.body) : ops.add(b.op)));
  walk(sol);
  const decoy = ANGLES.map((a) => `rt${a}`).find((a) => !ops.has(a));
  if (decoy) ops.add(decoy);
  return [...ops].sort();
};
const gPolygon = (r: Rng, sides: number[], lens: number[]) => {
  const n = pick(r, sides);
  const sol = polygon(n, pick(r, lens));
  return turtle(`Draw a ${SHAPE_NAME[n]}!`, sol, turtlePalette(sol, ["fd1"]), { hint: `${n} sides: turn ${360 / n} each time.` });
};
const gFlower = (r: Rng) => {
  const n = pick(r, [3, 4, 5, 6]);
  const petals = pick(r, [4, 5, 6, 8, 9, 10].filter((p) => p !== n));
  const sol = flower(petals, n, 1);
  return turtle("Draw the flower!", sol, turtlePalette(sol), { textCode: true, hint: "Loop a shape, and turn a little after each one." });
};
const gCorridor = (r: Rng, side: Side, n: number, turns: [number, number], x: Extra = {}, seg: [number, number] = [1, 3]) =>
  rover(
    side === "mixed" ? "Left or right? One program for every map!" : "One program for every map!",
    Array.from({ length: n }, () => genCorridor(r, { turns: int(r, turns[0], turns[1]), seg, side })),
    roverProgram(side),
    { hint: side === "mixed" ? "When blocked: if it's blocked on the right too, turn left — else turn right." : `If blocked, turn ${side} — otherwise go forward.`, ...x },
  );
const gMaze = (r: Rng, cw: number, ch: number, n = 1) =>
  rover("Escape the maze — follow the wall!", Array.from({ length: n }, () => genMaze(r, cw, ch)), WALL_FOLLOWER, {
    textCode: true,
    hint: "Keep your right hand on the wall: if it's open on the right, turn right and go.",
  });
const gBug = (r: Rng, l: CodeLevel, hint = "Run it and watch where it goes wrong.") => debug(l, makeBug(r, l, l.solution), hint);

// ── Pixel pictures ───────────────────────────────────────────────────────────────────────────
const PICS: Record<string, string[]> = {
  plus: [".r.", "rrr", ".r."],
  x: ["r.r", ".r.", "r.r"],
  tee: ["rrr", ".r.", ".r."],
  ell: ["r..", "r..", "rrr"],
  tree: [".g.", "ggg", ".n."],
  face: ["b.b", "...", "rrr"],
  flag: ["rrb", "rrb", "rrb"],
  heart: [".r.r.", "rrrrr", ".rrr.", "..r.."],
  boat: ["..y..", ".yy..", "nnnnn", ".nnn."],
  fish: [".oo.o", "ooooo", ".oo.o"],
  house: ["..r..", ".rrr.", "rrrrr", ".bnb."],
  sun: ["y.y.y", ".yyy.", "yyyyy", ".yyy.", "y.y.y"],
  ghost: [".ppp.", "ppppp", "pkpkp", "ppppp", "p.p.p"],
  rocket: ["..w..", ".wbw.", ".www.", ".www.", "o.o.o"],
};

type LessonDef = { title: string; emoji: string; kind?: LevelKind; levels: CodeLevel[] | ((r: Rng) => CodeLevel[]) };
type WorldDef = { id: string; title: string; emoji: string; grade: GradeId; blurb: string; lessons: LessonDef[] };

const WORLDS: WorldDef[] = [
  // ── Pre-K ────────────────────────────────────────────────────────────────────────────────
  { id: "voyage", title: "First Voyage", emoji: "⛵", grade: "prek", blurb: "Tell the boat where to go, one arrow at a time.", lessons: [
    { title: "Set sail", emoji: "⛵", levels: [
      sea("Sail to the island!", ["S.G"], [R, R], { hint: "Sail right two times." }),
      sea("Sail to the island!", ["S...G"], [R, R, R, R], { hint: "Count the water squares." }),
      sea("Sail to the island!", ["S", ".", ".", "G"], [D, D, D], { hint: "This time, sail down." }),
    ] },
    { title: "Around the rocks", emoji: "🪨", levels: [
      sea("Sail around the rock!", ["S.", "#G"], [R, D], { hint: "Right, then down." }),
      sea("Sail around the rock!", ["..G", ".#.", "S.."], [R, R, U, U], { hint: "Go around the rock." }),
      sea("Find the way!", ["S#.", ".#G", "..."], [D, D, R, R, U], { hint: "Sail down first." }),
    ] },
    { title: "Island hopping", emoji: "🏝️", levels: (r) => [
      gSea(r, "Sail to the island!", { w: 3, h: 3, rocks: 1, len: [3, 4], turns: 1 }),
      gSea(r, "Sail to the island!", { w: 3, h: 3, rocks: 2, len: [3, 4], turns: 1, detour: true }),
      gSea(r, "Find the way!", { w: 4, h: 3, rocks: 3, len: [4, 5], turns: 2 }),
    ] },
    { title: "Treasure review", emoji: "🗺️", kind: "review", levels: (r) => [
      sea("Sail to the island!", ["G..", "#.#", "..S"], [L, U, U, L]),
      gSea(r, "Find the way!", { w: 4, h: 3, rocks: 3, len: [4, 5], turns: 2, detour: true }),
      gSea(r, "Find the way!", { w: 4, h: 4, rocks: 4, len: [5, 6], turns: 2 }),
    ] },
    { title: "Rocky reef", emoji: "🐠", levels: (r) => [
      sea("Sail around the reef!", ["....", "S##G", "...."], [U, R, R, R, D], { hint: "Go over the rocks." }),
      sea("Find the way!", ["S..#", "#.#.", "..G."], [R, D, D, R]),
      gSea(r, "Find the way!", { w: 4, h: 4, rocks: 5, len: [5, 7], turns: 3, detour: true }),
    ] },
    { title: "Captain's challenge", emoji: "🏆", kind: "boss", levels: (r) => [
      sea("The long way home!", ["S.#.", "#.#.", "#...", "###G"], [R, D, D, R, R, D]),
      gSea(r, "Find the way!", { w: 4, h: 4, rocks: 5, len: [6, 7], turns: 3, detour: true }),
      gSea(r, "Find the way!", { w: 5, h: 4, rocks: 7, len: [7, 8], turns: 3, detour: true }),
    ] },
  ] },
  { id: "dance", title: "Robot Dance Party", emoji: "🤖", grade: "prek", blurb: "Watch the dance, then program the robot to copy it!", lessons: [
    { title: "First moves", emoji: "👋", levels: [
      dance("Copy the dance!", ["wave", "jump"]),
      dance("Copy the dance!", ["clap", "spin", "clap"]),
      dance("Copy the dance!", ["jump", "jump", "wave"]),
    ] },
    { title: "Groove time", emoji: "🕺", levels: [
      dance("Copy the dance!", ["spin", "wave", "kick", "bow"]),
      dance("Copy the dance!", ["clap", "jump", "clap", "jump"]),
      dance("Copy the dance!", ["kick", "spin", "jump", "wave", "bow"]),
    ] },
    { title: "Freestyle", emoji: "💃", levels: (r) => [gDance(r, 4), gDance(r, 4), gDance(r, 5)] },
    { title: "Treasure review", emoji: "🗺️", kind: "review", levels: (r) => [gDance(r, 5), gSea(r, "Sail to the island!", { w: 3, h: 3, rocks: 2, len: [3, 4], turns: 1 }), gDance(r, 5)] },
    { title: "Dance-off", emoji: "🏆", kind: "boss", levels: (r) => [
      dance("The big finale!", ["wave", "spin", "spin", "jump", "clap", "bow"]),
      gDance(r, 6),
      dance("The big finale!", ["kick", "kick", "jump", "wave", "spin", "bow"]),
    ] },
  ] },
  // ── Kindergarten ─────────────────────────────────────────────────────────────────────────
  { id: "music", title: "Music Maker", emoji: "🎵", grade: "k", blurb: "Program the bells to play a song.", lessons: [
    { title: "First notes", emoji: "🔔", levels: [
      music("Play it back!", ["C", "D", "E"]),
      music("Play it back!", ["E", "D", "C"]),
      music("Play it back!", ["C", "E", "G"]),
    ] },
    { title: "Little songs", emoji: "🎶", levels: [
      music("Hot Cross Buns!", ["E", "D", "C", "E", "D", "C"]),
      music("Twinkle, Twinkle!", ["C", "C", "G", "G", "A", "A", "G"]),
      music("Mary Had a Little Lamb!", ["E", "D", "C", "D", "E", "E", "E"]),
    ] },
    { title: "Melody makers", emoji: "🎼", levels: (r) => [gSong(r, 4), gSong(r, 5), gSong(r, 5)] },
    { title: "Treasure review", emoji: "🗺️", kind: "review", levels: (r) => [gSong(r, 5), gDance(r, 5), gSong(r, 6)] },
    { title: "Concert night", emoji: "🏆", kind: "boss", levels: [
      music("Jingle Bells!", ["E", "E", "E", "E", "E", "E", "E", "G", "C", "D", "E"]),
      music("Mary Had a Little Lamb!", ["E", "D", "C", "D", "E", "E", "E", "D", "D", "D"]),
      music("Twinkle, Twinkle!", ["C", "C", "G", "G", "A", "A", "G", "F", "F", "E", "E", "D", "D", "C"]),
    ] },
  ] },
  { id: "shells", title: "Shell Collector", emoji: "🐚", grade: "k", blurb: "Pick up every shell before you dock.", lessons: [
    { title: "Shell hunt", emoji: "🐚", levels: [
      sea("Get the shell, then the island!", ["S*G"], [R, R]),
      sea("Get the shell, then the island!", ["S.*", "..G"], [R, R, D], { hint: "Get the shell, then dock." }),
      sea("Get the shell, then the island!", ["*..", "S#G"], [U, R, R, D], { hint: "The shell is up first." }),
    ] },
    { title: "Shell sweep", emoji: "🌊", levels: [
      sea("Get both shells!", ["S..", "*#*", "..G"], [D, D, R, R, U, D], { hint: "Two shells — get both!" }),
      sea("Collect them all!", ["S*.*", "...G"], [R, R, R, D]),
      sea("Collect them all!", ["*.S.*", "..G.."], [L, L, R, R, R, R, D, L, L], { hint: "One side, then the other." }),
    ] },
    { title: "Beachcomber", emoji: "🦀", levels: (r) => [
      gSea(r, "Get the shell, then the island!", { w: 4, h: 3, rocks: 2, shells: 1, len: [4, 6], turns: 1 }),
      gSea(r, "Get the shell, then the island!", { w: 4, h: 3, rocks: 3, shells: 1, len: [4, 6], turns: 2 }),
      gSea(r, "Collect them all!", { w: 4, h: 3, rocks: 2, shells: 2, len: [5, 7], turns: 2 }),
    ] },
    { title: "Treasure review", emoji: "🗺️", kind: "review", levels: (r) => [
      gSea(r, "Find the way!", { w: 4, h: 4, rocks: 5, len: [5, 7], turns: 2, detour: true }),
      gSea(r, "Collect them all!", { w: 4, h: 4, rocks: 3, shells: 2, len: [6, 8], turns: 2 }),
      gDance(r, 5),
    ] },
    { title: "Shell storm", emoji: "⛈️", levels: (r) => [
      gSea(r, "Collect them all!", { w: 5, h: 3, rocks: 3, shells: 2, len: [6, 8], turns: 2 }),
      gSea(r, "Collect them all!", { w: 4, h: 4, rocks: 4, shells: 2, len: [6, 9], turns: 3 }),
      gSea(r, "Collect them all!", { w: 5, h: 4, rocks: 5, shells: 2, len: [7, 9], turns: 3 }),
    ] },
    { title: "Treasure king", emoji: "🏆", kind: "boss", levels: (r) => [
      gSea(r, "Collect them all!", { w: 5, h: 4, rocks: 5, shells: 3, len: [8, 10], turns: 3 }),
      gSea(r, "Collect them all!", { w: 5, h: 4, rocks: 6, shells: 2, len: [8, 10], turns: 3, detour: true }),
      gSea(r, "Collect them all!", { w: 5, h: 5, rocks: 7, shells: 3, len: [9, 11], turns: 4 }),
    ] },
  ] },
  { id: "loops", title: "Loop the Loop", emoji: "🔁", grade: "k", blurb: "A repeat block does the same thing again and again.", lessons: [
    { title: "Repeat it", emoji: "🔁", levels: [
      sea("Use repeat to sail far!", ["S.....G"], [rep(6, R)], { loops: true, hint: "Put the right arrow inside a repeat." }),
      sea("Repeat and collect!", ["S*.*.*.G"], [rep(7, R)], { loops: true }),
      sea("Repeat down the stairs!", ["S.##", "#..#", "##..", "###G"], [rep(3, R, D)], { loops: true, hint: "Repeat: right, then down." }),
    ] },
    { title: "Loop dances", emoji: "🕺", levels: [
      dance("Use a loop!", ["clap", "clap", "clap", "jump"], [rep(3, blk("clap")), blk("jump")], { loops: true }),
      dance("Use a loop!", ["wave", "spin", "wave", "spin", "wave", "spin"], [rep(3, blk("wave"), blk("spin"))], { loops: true }),
      music("Use a loop!", ["C", "D", "E", "C", "D", "E"], [rep(2, blk("C"), blk("D"), blk("E"))], { loops: true }),
    ] },
    { title: "Loop lagoon", emoji: "🌀", levels: (r) => [gChannel(r, false, [3, 3]), gChannel(r, false, [3, 4]), gChannel(r, false, [4, 4])] },
    { title: "Loop songs", emoji: "🎶", levels: (r) => [
      gLoopSong(r, { body: [2, 2], times: [2, 3] }),
      gLoopDance(r, { body: [2, 3], times: [2, 3], tail: 0.5 }),
      gLoopSong(r, { body: [3, 3], times: [2, 3], tail: 0.5 }),
    ] },
    { title: "Treasure review", emoji: "🗺️", kind: "review", levels: (r) => [
      gChannel(r, false, [3, 4]),
      gLoopDance(r, { body: [2, 3], times: [3, 4], tail: 0.5 }),
      gSea(r, "Collect them all!", { w: 4, h: 4, rocks: 3, shells: 2, len: [6, 8], turns: 2 }),
    ] },
    { title: "Loop master", emoji: "🏆", kind: "boss", levels: (r) => [
      sea("Sail across, then down!", ["S....", "....G"], [rep(4, R), D], { loops: true }),
      dance("Loop the party!", ["jump", "kick", "jump", "kick", "jump", "kick", "bow"], [rep(3, blk("jump"), blk("kick")), blk("bow")], { loops: true }),
      gChannel(r, false, [4, 5]),
    ] },
  ] },
  { id: "explorer", title: "Ocean Explorer", emoji: "🔭", grade: "k", blurb: "Bigger seas, trickier reefs — plan the whole trip.", lessons: [
    { title: "Open water", emoji: "🌊", levels: (r) => [
      gSea(r, "Find the way!", { w: 5, h: 4, rocks: 6, len: [6, 8], turns: 2, detour: true }),
      gSea(r, "Find the way!", { w: 5, h: 4, rocks: 7, len: [7, 9], turns: 3, detour: true }),
      gSea(r, "Collect them all!", { w: 5, h: 4, rocks: 5, shells: 2, len: [7, 9], turns: 3 }),
    ] },
    { title: "Fog bank", emoji: "🌫️", levels: (r) => [
      gSea(r, "Find the way!", { w: 5, h: 5, rocks: 8, len: [8, 10], turns: 3, detour: true }),
      gChannel(r, false, [4, 5]),
      gSea(r, "Collect them all!", { w: 5, h: 5, rocks: 7, shells: 2, len: [8, 10], turns: 3 }),
    ] },
    { title: "Explorer's boss", emoji: "🏆", kind: "boss", levels: (r) => [
      gSea(r, "Find the way!", { w: 6, h: 5, rocks: 11, len: [9, 12], turns: 4, detour: true }),
      gSea(r, "Collect them all!", { w: 6, h: 5, rocks: 9, shells: 3, len: [10, 12], turns: 4 }),
      gChannel(r, false, [5, 5]),
    ] },
  ] },
  // ── 1st grade ────────────────────────────────────────────────────────────────────────────
  { id: "turtle", title: "Turtle Artist", emoji: "🐢", grade: "1", blurb: "Program a turtle to draw lines and shapes.", lessons: [
    { title: "Draw lines", emoji: "✏️", levels: [
      turtle("Draw the line!", seqOf(["fd2"]), ["fd1", "fd2", "rt90", "lt90"]),
      turtle("Draw an L!", seqOf(["fd2", "rt90", "fd2"]), ["fd1", "fd2", "rt90", "lt90"]),
      turtle("Draw a doorway!", seqOf(["fd2", "rt90", "fd2", "rt90", "fd2"]), ["fd1", "fd2", "rt90", "lt90"]),
    ] },
    { title: "Squares", emoji: "🟥", levels: [
      turtle("Draw a square!", polygon(4, 2), ["fd1", "fd2", "rt90", "lt90"], { hint: "Repeat 4 times: forward, turn." }),
      turtle("Draw a small square!", polygon(4, 1), ["fd1", "fd2", "rt90", "lt90"]),
      turtle("Draw a rectangle!", [rep(2, blk("fd3"), blk("rt90"), blk("fd1"), blk("rt90"))], ["fd1", "fd2", "fd3", "rt90", "lt90"]),
    ] },
    { title: "Stairs", emoji: "🪜", levels: [
      turtle("Draw the stairs!", [rep(3, blk("fd1"), blk("rt90"), blk("fd1"), blk("lt90"))], ["fd1", "fd2", "rt90", "lt90"], { hint: "Up, over, up, over…" }),
      turtle("Draw a castle wall!", [rep(3, ...seqOf(["fd1", "rt90", "fd1", "rt90", "fd1", "lt90", "fd1", "lt90"]))], ["fd1", "rt90", "lt90"], { hint: "Up, over, down, over — repeat." }),
      turtle("Draw a big square!", polygon(4, 3), ["fd1", "fd2", "fd3", "rt90", "lt90"]),
    ] },
    { title: "Treasure review", emoji: "🗺️", kind: "review", levels: (r) => [gPolygon(r, [4], [1, 2, 3]), gDance(r, 6), gLoopSong(r, { body: [2, 3], times: [2, 3], tail: 0.5 })] },
    { title: "Turtle boss", emoji: "🏆", kind: "boss", levels: [
      turtle("Draw a plus sign!", [rep(4, ...seqOf(["fd2", "rt90", "rt90", "fd2", "lt90"]))], ["fd1", "fd2", "rt90", "lt90"], { hint: "Go out, come back, turn." }),
      turtle("Draw a tall rectangle!", [rep(2, ...seqOf(["fd3", "rt90", "fd2", "rt90"]))], ["fd1", "fd2", "fd3", "rt90", "lt90"]),
      turtle("Draw two boxes!", [rep(2, ...polygon(4, 1), ...seqOf(["rt90", "fd1", "lt90"]))], ["fd1", "rt90", "lt90"], { hint: "A square, scoot over, another square." }),
    ] },
  ] },
  { id: "view", title: "Captain's View", emoji: "🧭", grade: "1", blurb: "Think like the boat: go forward, turn left or right.", lessons: [
    { title: "Forward!", emoji: "⬆️", levels: [
      view("Sail forward to the island!", ["S..G"], [F, F, F], { hint: "Forward means the way the boat faces." }),
      view("Turn and sail!", ["S.", "#G"], [F, TR, F], { hint: "Forward, turn right, forward." }),
      view("Face the right way!", ["S.#", "..#", "G.."], [TR, F, F], { hint: "Turn to face down first." }),
    ] },
    { title: "Twists and turns", emoji: "🌀", levels: [
      view("Sail around!", ["...G", ".##.", "S..."], [F, F, F, TL, F, F]),
      view("Zigzag!", ["S.#", "#..", "##G"], [F, TR, F, TL, F, TR, F]),
      view("U-turn!", ["S..", "##.", "G.."], [F, F, TR, F, F, TR, F, F]),
    ] },
    { title: "Open sea", emoji: "⛵", levels: (r) => [
      gSea(r, "Find the way!", { w: 4, h: 3, rocks: 3, len: [4, 6], turns: 1, boat: true }),
      gSea(r, "Find the way!", { w: 4, h: 3, rocks: 4, len: [5, 7], turns: 2, boat: true }),
      gSea(r, "Find the way!", { w: 4, h: 4, rocks: 5, len: [6, 8], turns: 2, boat: true, detour: true }),
    ] },
    { title: "Treasure review", emoji: "🗺️", kind: "review", levels: (r) => [
      gSea(r, "Find the way!", { w: 4, h: 4, rocks: 5, len: [6, 8], turns: 2, boat: true }),
      gPolygon(r, [4], [2, 3]),
      gSea(r, "Get the shell, then the island!", { w: 4, h: 4, rocks: 4, shells: 1, len: [6, 9], turns: 2, boat: true }),
    ] },
    { title: "Deep water", emoji: "🐋", levels: (r) => [
      gSea(r, "Find the way!", { w: 5, h: 4, rocks: 6, len: [7, 10], turns: 3, boat: true, detour: true }),
      gSea(r, "Get the shell, then the island!", { w: 5, h: 4, rocks: 5, shells: 1, len: [7, 10], turns: 3, boat: true }),
      gSea(r, "Find the way!", { w: 5, h: 5, rocks: 8, len: [8, 11], turns: 3, boat: true, detour: true }),
    ] },
    { title: "Navigator boss", emoji: "🏆", kind: "boss", levels: (r) => [
      gSea(r, "Find the way!", { w: 5, h: 5, rocks: 8, len: [9, 12], turns: 4, boat: true, detour: true }),
      gSea(r, "Collect them all!", { w: 5, h: 4, rocks: 5, shells: 2, len: [9, 12], turns: 4, boat: true }),
      gSea(r, "Find the way!", { w: 6, h: 5, rocks: 11, len: [10, 13], turns: 4, boat: true, detour: true }),
    ] },
  ] },
  { id: "bugs", title: "Bug Hunt", emoji: "🐞", grade: "1", blurb: "Something's wrong with the program — find it and fix it.", lessons: [
    { title: "Fix the bug", emoji: "🐞", levels: [
      debug(sea("", ["S...G"], [R, R, R, R]), [R, R, R], "Is it one step short?"),
      debug(sea("", ["S.", "#.", "G."], [R, D, D, L]), [D, D, L], "The rock is in the way!"),
      debug(dance("", ["wave", "jump", "spin", "bow"]), seqOf(["wave", "spin", "jump", "bow"]), "Two moves are swapped."),
    ] },
    { title: "Bug squasher", emoji: "🔨", levels: [
      debug(sea("", ["S...", "...G"], [rep(3, R), D], { loops: true }), [rep(3, R), U], "Up or down?"),
      debug(turtle("", polygon(4, 2), ["fd1", "fd2", "rt90", "lt90"]), [rep(3, blk("fd2"), blk("rt90"))], "How many sides does a square have?"),
      debug(music("", ["C", "C", "G", "G", "A", "A", "G"]), seqOf(["C", "C", "G", "G", "A", "G", "A"]), "Listen to the end."),
    ] },
    { title: "Bug swarm", emoji: "🐜", levels: (r) => [
      gBug(r, gSea(r, "", { w: 4, h: 3, rocks: 3, len: [4, 6], turns: 2 })),
      gBug(r, gDance(r, 5)),
      gBug(r, gSea(r, "", { w: 4, h: 4, rocks: 4, len: [5, 7], turns: 2, boat: true })),
    ] },
    { title: "Bug boss", emoji: "🏆", kind: "boss", levels: (r) => [
      gBug(r, gChannel(r, false, [3, 4])),
      gBug(r, gLoopSong(r, { body: [2, 3], times: [2, 3], tail: 0.5 })),
      gBug(r, gSea(r, "", { w: 5, h: 4, rocks: 6, len: [6, 9], turns: 3, boat: true })),
    ] },
  ] },
  { id: "lagoon", title: "Loop Lagoon", emoji: "🌀", grade: "1", blurb: "Loops + turns: find the pattern in the path.", lessons: [
    { title: "Loop and turn", emoji: "↪️", levels: (r) => [gChannel(r, true, [2, 3]), gChannel(r, true, [3, 3]), gChannel(r, true, [3, 4])] },
    { title: "Loop the moves", emoji: "🔁", levels: (r) => [
      gLoopDance(r, { body: [2, 3], times: [3, 4], tail: 0.6 }),
      gLoopSong(r, { body: [3, 3], times: [2, 3], tail: 0.6 }),
      gChannel(r, true, [3, 4]),
    ] },
    { title: "Treasure review", emoji: "🗺️", kind: "review", levels: (r) => [gChannel(r, false, [4, 5]), gPolygon(r, [4], [1, 2]), gChannel(r, true, [3, 4])] },
    { title: "Lagoon boss", emoji: "🏆", kind: "boss", levels: (r) => [gChannel(r, true, [4, 4]), gLoopDance(r, { body: [3, 3], times: [3, 4], tail: 1 }), gChannel(r, true, [4, 5])] },
  ] },
  // ── 2nd grade ────────────────────────────────────────────────────────────────────────────
  { id: "pixel", title: "Pixel Painter", emoji: "🎨", grade: "2", blurb: "Program a paint robot to make pixel art.", lessons: [
    { title: "First strokes", emoji: "🖌️", levels: [pixel("Paint the picture!", ["rrr"]), pixel("Paint the picture!", ["r.r"]), pixel("Paint the picture!", ["r", "r", "r"])] },
    { title: "Paint with loops", emoji: "🔁", levels: [
      pixel("Use a loop!", ["rrrrr"], [rep(5, P, R)], { loops: true }),
      pixel("Two colors!", ["rbrbrb"], [rep(3, blk("color:r"), P, R, blk("color:b"), P, R)], { loops: true }),
      pixel("A box!", ["rr", "rr"]),
    ] },
    { title: "Little pictures", emoji: "🖼️", levels: [pixel("Paint a plus!", PICS.plus), pixel("Paint a tree!", PICS.tree), pixel("Paint a flag!", PICS.flag)] },
    { title: "Treasure review", emoji: "🗺️", kind: "review", levels: (r) => [pixel("Paint an X!", PICS.x), gSea(r, "Find the way!", { w: 5, h: 4, rocks: 6, len: [7, 9], turns: 3, boat: true }), pixel("Paint a face!", PICS.face)] },
    { title: "Art show", emoji: "🏆", kind: "boss", levels: [pixel("Paint a heart!", PICS.heart), pixel("Paint a boat!", PICS.boat), pixel("Paint a fish!", PICS.fish)] },
  ] },
  { id: "shapes", title: "Shape Studio", emoji: "🔺", grade: "2", blurb: "New angles make new shapes: triangles, hexagons, stars.", lessons: [
    { title: "Triangles", emoji: "🔺", levels: [
      turtle("Draw a triangle!", polygon(3, 2), ["fd1", "fd2", "rt90", "rt120"], { hint: "Turn 120 each time." }),
      turtle("Draw a hexagon!", polygon(6, 1), ["fd1", "fd2", "rt60", "rt90", "rt120"], { hint: "Six sides, turn 60." }),
      turtle("Draw a big triangle!", polygon(3, 3), ["fd1", "fd2", "fd3", "rt60", "rt120"]),
    ] },
    { title: "Stars and more", emoji: "⭐", levels: [
      turtle("Draw a star!", [rep(5, blk("fd3"), blk("rt144"))], ["fd2", "fd3", "rt72", "rt144"], { hint: "A star turns 144." }),
      turtle("Draw a pentagon!", polygon(5, 2), ["fd1", "fd2", "rt72", "rt144"]),
      turtle("Draw an octagon!", polygon(8, 1), ["fd1", "fd2", "rt45", "rt90"], { hint: "Eight sides, turn 45." }),
    ] },
    { title: "Polygon party", emoji: "🎉", levels: (r) => [gPolygon(r, [3, 5, 6], [1, 2]), gPolygon(r, [5, 6, 8], [1, 2]), gPolygon(r, [8, 9, 10], [1])] },
    { title: "Shape boss", emoji: "🏆", kind: "boss", levels: [
      turtle("Draw a big star!", [rep(5, blk("fd4"), blk("rt144"))], ["fd2", "fd3", "fd4", "rt72", "rt144"]),
      turtle("Draw a big hexagon!", polygon(6, 2), ["fd1", "fd2", "rt45", "rt60"]),
      turtle("Draw a decagon!", polygon(10, 1), ["fd1", "rt36", "rt45"], { hint: "Ten sides: 360 ÷ 10 = 36." }),
    ] },
  ] },
  { id: "reef", title: "Reef Runner", emoji: "🐟", grade: "2", blurb: "Long voyages: steer, collect, and loop the patterns.", lessons: [
    { title: "Reef routes", emoji: "🐠", levels: (r) => [
      gSea(r, "Collect them all!", { w: 5, h: 4, rocks: 5, shells: 2, len: [9, 12], turns: 4, boat: true }),
      gChannel(r, true, [3, 4]),
      gSea(r, "Find the way!", { w: 5, h: 5, rocks: 9, len: [9, 12], turns: 4, boat: true, detour: true }),
    ] },
    { title: "Current riders", emoji: "🌊", levels: (r) => [
      gChannel(r, true, [4, 5]),
      gSea(r, "Collect them all!", { w: 5, h: 5, rocks: 7, shells: 2, len: [10, 13], turns: 4, boat: true }),
      gChannel(r, true, [4, 5]),
    ] },
    { title: "Treasure review", emoji: "🗺️", kind: "review", levels: (r) => [pixel("Paint a T!", PICS.tee), gPolygon(r, [5, 6], [1, 2]), gChannel(r, true, [4, 5])] },
    { title: "Reef boss", emoji: "🏆", kind: "boss", levels: (r) => [
      gSea(r, "Collect them all!", { w: 6, h: 5, rocks: 10, shells: 3, len: [12, 15], turns: 5, boat: true }),
      gChannel(r, true, [5, 5]),
      gSea(r, "Find the way!", { w: 6, h: 6, rocks: 14, len: [12, 16], turns: 5, boat: true, detour: true }),
    ] },
  ] },
  { id: "bugs2", title: "Bug Hunt II", emoji: "🪲", grade: "2", blurb: "Sneakier bugs: loops that count wrong, shapes that don't close.", lessons: [
    { title: "Loop bugs", emoji: "🔁", levels: [
      debug(turtle("", polygon(3, 2), ["fd1", "fd2", "rt90", "rt120"]), [rep(3, blk("fd2"), blk("rt90"))], "A triangle turns 120."),
      debug(pixel("", ["rrrrr"], [rep(5, P, R)], { loops: true }), [rep(4, P, R)], "Count the squares."),
      debug(dance("", ["clap", "jump", "clap", "jump", "clap", "jump", "bow"], [rep(3, blk("clap"), blk("jump")), blk("bow")], { loops: true }), [rep(3, blk("jump"), blk("clap")), blk("bow")], "What comes first?"),
    ] },
    { title: "Bug swarm", emoji: "🐜", levels: (r) => [gBug(r, gChannel(r, true, [3, 4])), gBug(r, gPolygon(r, [5, 6], [1, 2])), gBug(r, gLoopDance(r, { body: [2, 3], times: [3, 4], tail: 0.6 }))] },
    { title: "Bug boss", emoji: "🏆", kind: "boss", levels: (r) => [gBug(r, pixel("", PICS.ell)), gBug(r, gChannel(r, true, [4, 5])), gBug(r, gSea(r, "", { w: 5, h: 5, rocks: 8, len: [9, 12], turns: 4, boat: true }))] },
  ] },
  // ── 3rd grade ────────────────────────────────────────────────────────────────────────────
  { id: "rover", title: "Mars Rover", emoji: "🛸", grade: "3", blurb: "Sensors + if/else: one program that solves every map.", lessons: [
    { title: "Drive until…", emoji: "🛰️", levels: [
      rover("Drive until you reach the goal!", [["S......G"], ["S...G"]], [until("atGoal", F)], { ifs: false, hint: "Repeat until at goal: forward." }),
      rover("One program for all three maps!", [["S...", "###.", "###G"], ["S.....", "#####.", "#####G"], ["S.", "#.", "#.", "#G"]], roverProgram("right"), { hint: "If blocked, turn right — otherwise go forward." }),
      rover("Now the path turns left!", [["...G", "###.", "S..."], [".....G", "#####.", "S....."], ["#G", "#.", "#.", "S."]], roverProgram("left"), { hint: "If blocked, turn left — otherwise go forward." }),
    ] },
    { title: "Winding canyons", emoji: "🏜️", levels: (r) => [gCorridor(r, "right", 2, [2, 3]), gCorridor(r, "left", 2, [2, 3]), gCorridor(r, "right", 3, [3, 4], {}, [1, 4])] },
    { title: "Left or right?", emoji: "🤔", levels: (r) => [
      rover("Use the right sensor!", [["S..#", "##.#", "##.G"], ["...G", "###.", "S..."], ["S.#", "#.#", "#.G"]], roverProgram("mixed"), { hint: "When blocked: if it's blocked on the right too, turn left — else turn right." }),
      gCorridor(r, "mixed", 2, [2, 3]),
      gCorridor(r, "mixed", 3, [3, 4]),
    ] },
    { title: "Treasure review", emoji: "🗺️", kind: "review", levels: (r) => [gCorridor(r, "left", 3, [3, 4], {}, [1, 4]), pixel("Paint a house!", PICS.house), gCorridor(r, "mixed", 2, [3, 4])] },
    { title: "Rover boss", emoji: "🏆", kind: "boss", levels: (r) => [gCorridor(r, "mixed", 3, [4, 5]), gCorridor(r, "right", 3, [3, 4], {}, [1, 4]), gCorridor(r, "mixed", 3, [5, 6], {}, [1, 4])] },
  ] },
  { id: "pixel2", title: "Pixel Patterns", emoji: "🟦", grade: "3", blurb: "Loops inside loops paint whole pictures.", lessons: [
    { title: "Rows and rows", emoji: "🟦", levels: [
      pixel("Paint two rows!", ["rrrr", "rrrr"], [rep(4, P, R), D, rep(4, P, L)], { loops: true }),
      pixel("Stripes!", ["rrrr", "....", "rrrr"], [rep(4, P, R), D, D, rep(4, P, L)], { loops: true }),
      pixel("A frame!", ["rrrr", "r..r", "r..r", "rrrr"], [rep(3, P, R), rep(3, P, D), rep(3, P, L), rep(3, P, U)], { loops: true, hint: "One loop for each side." }),
    ] },
    { title: "Diagonals", emoji: "↘️", levels: [
      pixel("Diagonal!", ["r...", ".r..", "..r.", "...r"], [rep(4, P, R, D)], { loops: true, hint: "Paint, right, down — repeat." }),
      pixel("Checkerboard!", ["r.r.", ".r.r", "r.r.", ".r.r"], [rep(2, rep(2, P, R, R), D, rep(2, P, L, L), D)], { loops: true, hint: "Loop a row, step down, loop back." }),
      pixel("Paint the sun!", PICS.sun),
    ] },
    { title: "Pixel gallery", emoji: "🖼️", levels: [pixel("Paint a house!", PICS.house), pixel("Paint a ghost!", PICS.ghost), pixel("Paint a rocket!", PICS.rocket)] },
    { title: "Pixel boss", emoji: "🏆", kind: "boss", levels: [
      pixel("Paint the big block!", ["bbbbb", "bbbbb", "bbbbb"], [blk("color:b"), rep(3, rep(5, P, R), D, rep(5, L))], { loops: true, hint: "A loop inside a loop!" }),
      pixel("Paint a heart!", PICS.heart),
      pixel("Paint the stripes!", ["ryryr", "ryryr", "ryryr"], [rep(2, blk("color:r"), rep(3, P, D), R, blk("color:y"), rep(3, P, U), R), blk("color:r"), rep(3, P, D)], { loops: true, hint: "Paint down one column, up the next." }),
    ] },
  ] },
  { id: "songs", title: "Song Factory", emoji: "🎼", grade: "3", blurb: "Real songs are full of repeats — loop them!", lessons: [
    { title: "Loop the song", emoji: "🎵", levels: [
      music("Frère Jacques!", ["C", "D", "E", "C", "C", "D", "E", "C", "E", "F", "G", "E", "F", "G"], [rep(2, ...seqOf(["C", "D", "E", "C"])), rep(2, ...seqOf(["E", "F", "G"]))], { loops: true }),
      music("Hot Cross Buns!", ["E", "D", "C", "E", "D", "C", "C", "C", "C", "C", "D", "D", "D", "D", "E", "D", "C"], [rep(2, ...seqOf(["E", "D", "C"])), rep(4, blk("C")), rep(4, blk("D")), ...seqOf(["E", "D", "C"])], { loops: true }),
      music("Jingle Bells!", ["E", "E", "E", "E", "E", "E", "E", "G", "C", "D", "E"], [rep(7, blk("E")), ...seqOf(["G", "C", "D", "E"])], { loops: true }),
    ] },
    { title: "Remix", emoji: "🎧", levels: (r) => [gLoopSong(r, { body: [3, 4], times: [2, 3], tail: 0.5 }), gLoopSong(r, { body: [2, 3], times: [3, 4], tail: 0.7 }), gLoopDance(r, { body: [3, 4], times: [2, 3], tail: 0.7 })] },
    { title: "Song boss", emoji: "🏆", kind: "boss", levels: (r) => [gLoopSong(r, { body: [4, 4], times: [3, 3], tail: 1 }), gLoopDance(r, { body: [4, 4], times: [3, 4], tail: 1 }), gLoopSong(r, { body: [3, 4], times: [4, 4], tail: 1 })] },
  ] },
  // ── 4th grade ────────────────────────────────────────────────────────────────────────────
  { id: "functions", title: "Function Falls", emoji: "🧩", grade: "4", blurb: "Make your own blocks with functions.", lessons: [
    { title: "Make a block", emoji: "🧩", levels: [
      dance("Make a chorus function!", ["wave", "spin", "clap", "jump", "wave", "spin", "clap", "kick", "wave", "spin", "clap"], [def("chorus", ...seqOf(["wave", "spin", "clap"])), call("chorus"), blk("jump"), call("chorus"), blk("kick"), call("chorus")], { funcs: true, textCode: true, hint: "Define the part that repeats, then call it." }),
      music("Make a chorus function!", ["E", "D", "C", "G", "E", "D", "C", "A", "E", "D", "C"], [def("chorus", ...seqOf(["E", "D", "C"])), call("chorus"), blk("G"), call("chorus"), blk("A"), call("chorus")], { funcs: true, textCode: true }),
      view("Define a zigzag and use it!", ["S.###", "#....", "####G"], [def("zig", F, TR, F, TL), call("zig"), F, F, call("zig")], { funcs: true, textCode: true }),
    ] },
    { title: "Chorus line", emoji: "🎤", levels: (r) => [gChorus(r, "dance"), gChorus(r, "music"), gChorus(r, "dance")] },
    { title: "Treasure review", emoji: "🗺️", kind: "review", levels: (r) => [gCorridor(r, "mixed", 2, [3, 4], { textCode: true }), gChorus(r, "music"), gBug(r, gPolygon(r, [6, 8], [1]))] },
    { title: "Function boss", emoji: "🏆", kind: "boss", levels: (r) => [
      turtle("Three squares with one function!", [def("square", ...polygon(4, 1)), rep(3, call("square"), ...seqOf(["penup", "rt90", "fd2", "lt90", "pendown"]))], ["fd1", "fd2", "rt90", "lt90", "penup", "pendown"], { funcs: true, textCode: true }),
      gChorus(r, "dance"),
      gChorus(r, "music"),
    ] },
  ] },
  { id: "gallery", title: "Turtle Gallery", emoji: "🌸", grade: "4", blurb: "Loops inside loops draw flowers, suns and star bursts.", lessons: [
    { title: "Flowers", emoji: "🌸", levels: [
      turtle("Draw a flower of squares!", flower(6, 4, 1), ["fd1", "rt60", "rt90"], { textCode: true, hint: "Repeat a square, turning a little each time." }),
      turtle("Draw a pinwheel!", flower(8, 3, 1), ["fd1", "rt45", "rt120"], { textCode: true }),
      turtle("Draw a sun!", flower(6, 3, 2), ["fd1", "fd2", "rt60", "rt120"], { textCode: true }),
    ] },
    { title: "Garden party", emoji: "🌻", levels: (r) => [gFlower(r), gFlower(r), gFlower(r)] },
    { title: "Gallery boss", emoji: "🏆", kind: "boss", levels: (r) => [
      turtle("Draw a star burst!", [rep(4, rep(5, blk("fd2"), blk("rt144")), blk("rt90"))], ["fd2", "rt90", "rt144"], { textCode: true }),
      gFlower(r),
      turtle("Draw a hexagon flower!", flower(6, 6, 1), ["fd1", "rt60"], { textCode: true }),
    ] },
  ] },
  { id: "debug", title: "Debug Detective", emoji: "🕵️", grade: "4", blurb: "Tougher bugs in loops, turns and sensors.", lessons: [
    { title: "Find the bug", emoji: "🔎", levels: [
      debug(rover("", [["S...", "###.", "###G"], ["S.", "#.", "#G"]], roverProgram("right"), { textCode: true }), roverProgram("left"), "Which way should it turn?"),
      debug(turtle("", polygon(6, 1), ["fd1", "rt60", "rt90", "rt120"], { textCode: true }), [rep(6, blk("fd1"), blk("rt90"))], "A hexagon turns 60 each time."),
      debug(pixel("", ["rrrr", "....", "rrrr"], [rep(4, P, R), D, D, rep(4, P, L)], { loops: true, textCode: true }), [rep(4, P, R), D, rep(4, P, L)], "Is the second stripe in the right row?"),
    ] },
    { title: "Case files", emoji: "📁", levels: (r) => [gBug(r, gCorridor(r, "right", 2, [2, 3], { textCode: true })), gBug(r, gFlower(r)), gBug(r, gChorus(r, "music"))] },
    { title: "Detective boss", emoji: "🏆", kind: "boss", levels: (r) => [
      gBug(r, gCorridor(r, "mixed", 2, [3, 4], { textCode: true })),
      gBug(r, pixel("", PICS.ghost, undefined, { textCode: true })),
      gBug(r, gSea(r, "", { w: 6, h: 5, rocks: 10, shells: 2, len: [10, 14], turns: 4, boat: true }, { textCode: true })),
    ] },
  ] },
  // ── 5th grade ────────────────────────────────────────────────────────────────────────────
  { id: "algorithms", title: "Algorithm Archipelago", emoji: "🧠", grade: "5", blurb: "Smarter programs: one algorithm that escapes any maze.", lessons: [
    { title: "Follow the wall", emoji: "🧱", levels: [
      rover("Back to basics: until + if/else!", [["S...", "###.", "###G"], ["S..#", "##.#", "##.G"]], roverProgram("mixed"), { textCode: true, hint: "When blocked: if it's blocked on the right too, turn left — else turn right." }),
      rover("Escape any maze with one program!", [["S..#", "##.#", "#..#", "#.##", "#..G"], ["S.##", "#..#", "##.#", "##.G"]], WALL_FOLLOWER, { textCode: true, hint: "Keep your right hand on the wall: if it's open on the right, turn right and go." }),
      gMaze(rng("code:algorithms:wall"), 3, 2),
    ] },
    { title: "Maze runner", emoji: "🌀", levels: (r) => [gMaze(r, 3, 2), gMaze(r, 3, 3), gMaze(r, 3, 3, 2)] },
    { title: "Labyrinth", emoji: "🏛️", levels: (r) => [gMaze(r, 4, 3), gMaze(r, 4, 3, 2), gMaze(r, 4, 4)] },
    { title: "Treasure review", emoji: "🗺️", kind: "review", levels: (r) => [gCorridor(r, "mixed", 3, [4, 5], { textCode: true }), gChorus(r, "dance"), gMaze(r, 4, 3)] },
    { title: "Algorithm boss", emoji: "🏆", kind: "boss", levels: (r) => [gMaze(r, 4, 4, 2), gMaze(r, 5, 4), gMaze(r, 5, 5)] },
  ] },
  { id: "masters", title: "Code Masters", emoji: "👑", grade: "5", blurb: "Everything together: loops, functions, sensors and art.", lessons: [
    { title: "Masterpieces", emoji: "🖼️", levels: [
      turtle("Draw a sun of triangles!", flower(6, 3, 2), ["fd1", "fd2", "rt60", "rt120"], { textCode: true }),
      pixel("Checkerboard with nested loops!", ["r.r.", ".r.r", "r.r.", ".r.r"], [rep(2, rep(2, P, R, R), D, rep(2, P, L, L), D)], { loops: true, textCode: true }),
      turtle("Draw a galaxy!", flower(10, 5, 1), ["fd1", "rt36", "rt72"], { textCode: true }),
    ] },
    { title: "Grand remix", emoji: "🎛️", levels: (r) => [gChorus(r, "music"), gMaze(r, 4, 4), gFlower(r)] },
    { title: "Master's final", emoji: "👑", kind: "boss", levels: (r) => [gMaze(r, 5, 5, 2), gBug(r, gChorus(r, "dance")), gCorridor(r, "mixed", 3, [5, 6], { textCode: true }, [1, 4])] },
  ] },
];

/** The concept a level practices (parent progress + review). */
function skillOf(l: CodeLevel): string {
  const json = JSON.stringify(l.solution);
  if (l.buggy) return "debugging";
  if (json.includes('"def"')) return "functions";
  if (json.includes('"until"') || json.includes('"if')) return "conditionals";
  if (l.sim === "turtle" && /"repeat".*"repeat"/.test(json)) return "nested-loops";
  if (json.includes('"repeat"')) return "loops";
  if (l.sim === "turtle") return "shapes";
  if (l.sim === "pixel") return "pixels";
  if (l.palette.includes("fwd")) return "turning";
  if ((l.maps ?? []).some((m) => m.join("").includes("*"))) return "planning";
  return "sequencing";
}

export const CODE_SKILL_LABEL: Record<string, string> = {
  "c:sequencing": "Step-by-step plans",
  "c:planning": "Planning a route",
  "c:loops": "Loops",
  "c:turning": "Turning (boat's view)",
  "c:shapes": "Shapes & angles",
  "c:pixels": "Pixel art",
  "c:debugging": "Debugging",
  "c:conditionals": "If/else + sensors",
  "c:functions": "Functions",
  "c:nested-loops": "Loops inside loops",
};

const LITTLE: GradeId[] = ["prek", "k"];
const BIG: GradeId[] = ["3", "4", "5"];
function lessonFrom(w: WorldDef, l: LessonDef, n: number): Lesson {
  const levels = typeof l.levels === "function" ? l.levels(rng(`code:${w.id}:${n}`)) : l.levels;
  // Big kids see the real code their blocks make; little ones get picture blocks only.
  const acts: Activity[] = levels.map((level) => ({
    kind: "code",
    level: LITTLE.includes(w.grade) ? level : { ...level, textCode: level.textCode ?? BIG.includes(w.grade) },
    skill: `c:${skillOf(level)}`,
  }));
  return { id: `code.${w.id}.${n}`, subject: "code", unit: `code.${w.id}`, n, kind: l.kind ?? "lesson", title: l.title, emoji: l.emoji, activities: acts, skills: [...new Set(acts.map((a) => a.skill!))] };
}

const units: Unit[] = WORLDS.map((w, wi) => ({
  id: `code.${w.id}`,
  subject: "code",
  n: wi + 1,
  title: w.title,
  emoji: w.emoji,
  grade: w.grade,
  theme: themeFor(wi + 2),
  blurb: w.blurb,
  lessons: w.lessons.map((l, i) => lessonFrom(w, l, i + 1)),
}));

const pool = units.flatMap((u) => u.lessons.flatMap((l) => l.activities));

export const CODE: Course = {
  id: "code",
  title: "Code",
  emoji: "🧩",
  tagline: "Program boats, robots, art and music",
  units,
  // Review: replay solved levels of the same concept (a different one each time).
  itemsFor: (skill, n, seed) => pickN(rng(seed), pool.filter((a) => a.skill === skill), n),
};
