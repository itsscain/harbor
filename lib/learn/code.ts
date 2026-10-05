import type { Activity, Block, CodeLevel, Course, GradeId, Lesson, LevelKind, Unit } from "./types";
import { themeFor } from "./meta";
import { blockCount } from "./program";
import { type Rng, rng, int, pick, pickN, shuffle } from "./gen";
import {
  ARROWS, BOAT, MOVES, NOTES, blk, seqOf, rep, until, def, call, iff,
  makeMap, makeAdventure, solveGrid, genChannel, genCorridor, genMaze, genSeq, genMelody, genLoopSeq, genChorus,
  polygon, flower, solvePixel, pictureColors, makeBug, roverProgram, WALL_FOLLOWER, type AdventureSpec, type MapSpec, type Side,
} from "./codeGen";
import {
  concept, recipeAct, factoryAct, eventsAct, variableAct, loopFindAct, predictEnd, predictEndBoat, predictCount, predictPick,
  binaryAct, searchAct, swapSortAct, cipherAct, logicAct, machineAct, plotAct, pythonRead, pythonSet, pythonBug, pythonBugSet, LAB_SKILL_LABEL,
} from "./codeLabContent";

// The Code voyage — real programming ideas through six hands-on worlds, run block by block with
// big animations: steer a boat (Sea Navigator), make a robot dance, compose songs, draw with a
// turtle, paint pixel art, and drive a Mars rover with sensors. Concepts grow the way CS
// curricula teach them: sequencing → loops → turning from the boat's view → debugging →
// conditionals + repeat-until → functions → nested loops → algorithms. Little sailors tap
// picture blocks; big kids see the real code their blocks make.
//
// The Code Lab islands teach what's going on underneath: animated concept cards (what a program,
// a bug, a loop, an if, a variable, an event really is), "be the computer" puzzles that make you
// predict a program before it runs, Loop Detective, Robot Chef (computers do EXACTLY what you
// say), the Sorting Factory (if / else-if / AND), Treasure Counter (variables + trace tables),
// Event Studio (how apps react to taps), binary lights, binary search, bubble sort, secret codes,
// logic gates, function machines and coordinates. Python Peek / Python Pro bridge 4th–5th graders
// from blocks to real text code: read a program, predict its output, then hunt real bugs (and
// real crashes) line by line.

const R = blk("right"), L = blk("left"), U = blk("up"), D = blk("down"), F = blk("fwd"), TL = blk("tl"), TR = blk("tr");
const P = blk("paint");

type Extra = Partial<CodeLevel>;
const withBest = (l: Omit<CodeLevel, "best"> & { best?: number }): CodeLevel => ({ ...l, best: l.best ?? blockCount(l.solution) });
/** A sea with fish gets the Catch block; a sea with sharks gets Wait. */
const actsFor = (maps: string[][]) => [...(maps.some((m) => m.join("").includes("f")) ? ["catch"] : []), ...(maps.some((m) => /[HN]/.test(m.join(""))) ? ["wait"] : [])];
const sea = (goal: string, map: string[], solution: Block[], x: Extra = {}) => withBest({ sim: "sea", goal, palette: [...ARROWS, ...actsFor([map])], maps: [map], facing: "right", solution, ...x });
const view = (goal: string, map: string[], solution: Block[], x: Extra = {}) => withBest({ sim: "sea", goal, palette: [...BOAT, ...actsFor([map])], maps: [map], facing: "right", solution, ...x });
/** A hand-drawn adventure sea, its answer found by the solver (right by construction). */
const chart = (goal: string, map: string[], x: Extra & { boat?: boolean } = {}) => {
  const { boat, ...rest } = x;
  return (boat ? view : sea)(goal, map, seqOf(solveGrid(map, boat ? BOAT : ARROWS) ?? []), rest);
};
/** A generated adventure sea built around one feature. */
const gAdv = (r: Rng, goal: string, spec: AdventureSpec, x: Extra = {}): CodeLevel => {
  const { map, ops } = makeAdventure(r, spec);
  return (spec.boat ? view : sea)(goal, map, seqOf(ops), x);
};
/** Smart Nets: rows of sea with fish in different places — ONE program has to catch them all, so
 *  it has to look before it nets ("if on a fish: catch"). */
const gNets = (r: Rng, n: number, len: number): CodeLevel => {
  const maps = Array.from({ length: n }, () => {
    const cells = Array.from({ length: len - 1 }, () => ".");
    const fish = shuffle(r, Array.from({ length: len - 1 }, (_, i) => i)).slice(0, int(r, 1, Math.min(3, len - 2)));
    fish.forEach((i) => (cells[i] = "f"));
    return [`S${cells.join("")}G`];
  });
  return withBest({ sim: "sea", goal: "One program for every row: look before you net!", palette: ["right", "catch"], maps, facing: "right", loops: true, ifs: true, solution: [rep(len, R, iff("fish", blk("catch")))], hint: "Move, then check: if you're on a fish, catch it." });
};
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
/** Pet Trick Show: the dance engine, performed by the child's own boat pet (4 tricks). */
const PET_MOVES = ["wave", "spin", "jump", "clap"];
const petShow = (goal: string, target: string[], solution: Block[] = seqOf(target), x: Extra = {}) => withBest({ sim: "dance", goal, palette: PET_MOVES, target, solution, performer: "pet", ...x });
const gPetShow = (r: Rng, len: number) => petShow("Copy the trick show!", genSeq(r, PET_MOVES, len));
const gPetLoop = (r: Rng, o: LoopSpec) => {
  const { target, solution } = genLoopSeq(r, PET_MOVES, o);
  return petShow("Use a loop for the encore!", target, solution, { loops: true, hint: "Which tricks happen again and again? Put them in a loop." });
};
/** A level as word-only blocks (read the code words) or as code lines (write the code). */
const words = (l: CodeLevel): CodeLevel => ({ ...l, mode: "words" });
const codeLines = (l: CodeLevel): CodeLevel => ({ ...l, mode: "code" });
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

/** A lesson's items: block puzzles (CodeLevel) and Code Lab activities, in order. */
type Item = CodeLevel | Activity;
type LessonDef = { title: string; emoji: string; kind?: LevelKind; levels: Item[] | ((r: Rng) => Item[]) };
/** `story`: the island's setup, told on the opening card of its first level. */
type WorldDef = { id: string; title: string; emoji: string; grade: GradeId; blurb: string; story?: string; lessons: LessonDef[] };

const WORLDS: WorldDef[] = [
  // ── Pre-K ────────────────────────────────────────────────────────────────────────────────
  { id: "voyage", title: "First Voyage", emoji: "⛵", grade: "prek", blurb: "Tell the boat where to go, one arrow at a time.", lessons: [
    { title: "Set sail", emoji: "⛵", levels: [
      concept("program", "little"),
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
  { id: "pettricks", title: "Pet Trick Show", emoji: "🦜", grade: "prek", blurb: "Program your pet's trick show!", story: "Your pet wants to put on a show! Watch the tricks first — then put the trick blocks in order so your pet can do them too.", lessons: [
    { title: "First tricks", emoji: "🦜", levels: [
      petShow("Copy the trick show!", ["wave", "jump"]),
      petShow("Copy the trick show!", ["spin", "clap"]),
      petShow("Copy the trick show!", ["jump", "spin", "wave"]),
    ] },
    { title: "Showtime", emoji: "🎉", levels: (r) => [gPetShow(r, 3), gPetShow(r, 4), petShow("The big trick show!", ["clap", "jump", "spin", "jump"])] },
    { title: "Encore!", emoji: "🔁", levels: (r) => [
      petShow("Three jumps! Use a loop.", ["jump", "jump", "jump"], [rep(3, blk("jump"))], { loops: true, hint: "The same trick three times? Put it in a loop!" }),
      gPetLoop(r, { body: [1, 2], times: [2, 3] }),
      gPetLoop(r, { body: [2, 2], times: [2, 3] }),
    ] },
    { title: "Treasure review", emoji: "🗺️", kind: "review", levels: (r) => [gPetShow(r, 4), gDance(r, 4), gPetLoop(r, { body: [2, 2], times: [2, 2] })] },
    { title: "Star of the show", emoji: "🏆", kind: "boss", levels: (r) => [gPetShow(r, 5), gPetLoop(r, { body: [2, 3], times: [2, 3] }), gPetShow(r, 6)] },
  ] },
  // ── Code Lab (Pre-K) ──
  { id: "chef", title: "Robot Chef", emoji: "🤖", grade: "prek", blurb: "The robot does EXACTLY what you say — in the order you say it!", lessons: [
    { title: "Breakfast bot", emoji: "🥣", levels: (r) => [recipeAct(r, "cereal"), recipeAct(r, "fish")] },
    { title: "Bathroom bot", emoji: "🪥", levels: (r) => [recipeAct(r, "teeth"), recipeAct(r, "cereal", true)] },
    { title: "Garden bot", emoji: "🌱", levels: (r) => [recipeAct(r, "seed"), recipeAct(r, "fish", true)] },
    { title: "Treasure review", emoji: "🗺️", kind: "review", levels: (r) => [recipeAct(r, "teeth", true), recipeAct(r, "seed", true)] },
    { title: "Chef's challenge", emoji: "🏆", kind: "boss", levels: (r) => [recipeAct(r, "sandwich"), recipeAct(r, "dressed")] },
  ] },
  { id: "patterns", title: "Pattern Parade", emoji: "🎉", grade: "prek", blurb: "Find what repeats — and squeeze it into a loop.", lessons: [
    { title: "Spot the pattern", emoji: "👀", levels: (r) => [loopFindAct(r, "dance", [2, 2], [3, 3]), loopFindAct(r, "notes", [2, 2], [3, 3]), loopFindAct(r, "dance", [2, 2], [2, 3])] },
    { title: "Pattern power", emoji: "💪", levels: (r) => [loopFindAct(r, "arrows", [2, 2], [3, 3]), predictCount(r, "music", false), loopFindAct(r, "dance", [2, 2], [3, 4])] },
    { title: "Treasure review", emoji: "🗺️", kind: "review", levels: (r) => [loopFindAct(r, "notes", [2, 3], [2, 3]), predictCount(r, "dance", false), gDance(r, 4)] },
    { title: "Parade boss", emoji: "🏆", kind: "boss", levels: (r) => [loopFindAct(r, "dance", [3, 3], [2, 3]), predictCount(r, "music", false), loopFindAct(r, "arrows", [2, 3], [3, 3])] },
  ] },
  // ── Adventure seas (Pre-K) ──
  { id: "keys", title: "Key Cove", emoji: "🔑", grade: "prek", blurb: "Grab the key, open the gate, sail home.", story: "A locked gate blocks the way to the island! Sail over the golden key first — then the gate opens for your boat.", lessons: [
    { title: "The golden key", emoji: "🔑", levels: [
      chart("Grab the key, then sail through the gate!", ["S.kDG"]),
      chart("Key first, then the gate!", ["S", "k", ".", "D", "G"]),
      chart("Get the key, open the gate, find the island!", ["Sk.", "##D", "..G"]),
    ] },
    { title: "Key hunt", emoji: "🔍", levels: (r) => [chart("The key is off the path — go get it!", ["S..#.G", ".k.D.."]), gAdv(r, "Find the key, open the gate!", { w: 4, h: 3, kind: "key", len: [4, 7] }), gAdv(r, "Find the key, open the gate!", { w: 4, h: 3, kind: "key", len: [4, 7] })] },
    { title: "Treasure review", emoji: "🗺️", kind: "review", levels: (r) => [gAdv(r, "Key, gate, island!", { w: 5, h: 3, kind: "key", len: [5, 8] }), gSea(r, "Sail to the island!", { w: 4, h: 3, rocks: 3, len: [4, 6], turns: 1 })] },
    { title: "Key boss", emoji: "🏆", kind: "boss", levels: (r) => [gAdv(r, "Key, gate, island!", { w: 5, h: 3, kind: "key", len: [6, 9] }), gAdv(r, "Key, gate, island!", { w: 5, h: 3, kind: "key", len: [6, 9], shells: 1 }), gAdv(r, "Key, gate, island!", { w: 5, h: 3, kind: "key", len: [6, 9] })] },
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
  { id: "wharf", title: "Word Wharf", emoji: "📖", grade: "k", blurb: "No arrows here — read the code words!", story: "At Word Wharf the blocks have no arrows — only words! Read each one — up, down, left, right — and tell your boat where to go.", lessons: [
    { title: "Read and sail", emoji: "📖", levels: [
      words(sea("Read the words — sail to the island!", ["S..G"], [R, R, R], { hint: "Find the word right." })),
      words(sea("Read the words — sail to the island!", ["S", ".", "G"], [D, D], { hint: "Find the word down." })),
      words(sea("Read the words — sail to the island!", ["G.", ".S"], [U, L], { hint: "Up first, then left." })),
    ] },
    { title: "Word routes", emoji: "🧭", levels: (r) => [
      words(gSea(r, "Read the words — find the way!", { w: 3, h: 3, rocks: 1, len: [3, 4], turns: 1 })),
      words(gSea(r, "Read the words — find the way!", { w: 4, h: 3, rocks: 2, len: [4, 5], turns: 2 })),
      words(gSea(r, "Read the words — find the way!", { w: 4, h: 3, rocks: 3, len: [4, 6], turns: 2, detour: true })),
    ] },
    { title: "Treasure review", emoji: "🗺️", kind: "review", levels: (r) => [
      words(gSea(r, "Read the words — find the way!", { w: 4, h: 4, rocks: 3, len: [5, 6], turns: 2 })),
      words(gSea(r, "Read the words — find the way!", { w: 4, h: 4, rocks: 4, len: [5, 7], turns: 2, detour: true })),
    ] },
    { title: "Word boss", emoji: "🏆", kind: "boss", levels: (r) => [
      words(gSea(r, "Read the words — the long way home!", { w: 5, h: 4, rocks: 5, len: [6, 8], turns: 3, detour: true })),
      words(gSea(r, "Read the words — the long way home!", { w: 5, h: 4, rocks: 6, len: [7, 9], turns: 3, detour: true })),
    ] },
  ] },
  { id: "loops", title: "Loop the Loop", emoji: "🔁", grade: "k", blurb: "A repeat block does the same thing again and again.", lessons: [
    { title: "Repeat it", emoji: "🔁", levels: [
      concept("loop", "little"),
      sea("Use repeat to sail far!", ["S.....G"], [rep(6, R)], { loops: true, hint: "Put the right arrow inside a repeat." }),
      sea("Repeat and collect!", ["S*.*.*.G"], [rep(7, R)], { loops: true }),
      sea("Repeat down the stairs!", ["S.##", "#..#", "##..", "###G"], [rep(3, R, D)], { loops: true, hint: "Repeat: right, then down." }),
    ] },
    { title: "Loop dances", emoji: "🕺", levels: (r) => [
      loopFindAct(r, "dance", [2, 2], [3, 3]),
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
      predictEnd(r, { w: 4, h: 3, loop: false, rocks: 1 }),
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
  // ── Code Lab (K) ──
  { id: "computer", title: "Be the Computer", emoji: "🖥️", grade: "k", blurb: "Read the program first — where will it go?", lessons: [
    { title: "Where will it stop?", emoji: "📍", levels: (r) => [predictEnd(r, { w: 3, h: 3, loop: false, rocks: 1 }), predictEnd(r, { w: 4, h: 3, loop: false, rocks: 1 }), predictEnd(r, { w: 4, h: 3, loop: false, rocks: 2 })] },
    { title: "Count it", emoji: "🔢", levels: (r) => [predictCount(r, "music", false), predictCount(r, "dance", false), predictEnd(r, { w: 4, h: 4, loop: false, rocks: 2 })] },
    { title: "Which one works?", emoji: "🤔", levels: (r) => [predictPick(r, { w: 3, h: 3, rocks: 2, len: [3, 4], turns: 1 }), predictPick(r, { w: 4, h: 3, rocks: 3, len: [4, 5], turns: 2 }), predictEnd(r, { w: 4, h: 4, loop: true, rocks: 2 })] },
    { title: "Treasure review", emoji: "🗺️", kind: "review", levels: (r) => [predictEnd(r, { w: 4, h: 4, loop: true, rocks: 2 }), predictCount(r, "music", false), predictPick(r, { w: 4, h: 3, rocks: 3, len: [4, 5], turns: 2 })] },
    { title: "Computer boss", emoji: "🏆", kind: "boss", levels: (r) => [predictEnd(r, { w: 5, h: 4, loop: true, rocks: 3 }), predictPick(r, { w: 4, h: 4, rocks: 4, len: [5, 6], turns: 2 }), predictCount(r, "dance", false)] },
  ] },
  { id: "events", title: "Event Island", emoji: "⚡", grade: "k", blurb: "When you tap it, it does something — make your own app!", lessons: [
    { title: "When I tap…", emoji: "👆", levels: (r) => [concept("event", "little"), eventsAct(r, 2), eventsAct(r, 2)] },
    { title: "Tiny apps", emoji: "📱", levels: (r) => [eventsAct(r, 2), eventsAct(r, 3)] },
    { title: "Treasure review", emoji: "🗺️", kind: "review", levels: (r) => [eventsAct(r, 3), recipeAct(r, "seed", true)] },
    { title: "App boss", emoji: "🏆", kind: "boss", levels: (r) => [eventsAct(r, 3), eventsAct(r, 3)] },
  ] },
  // ── Adventure seas (K) ──
  { id: "bridges", title: "Bridge Bay", emoji: "🌉", grade: "k", blurb: "Press the button to lower the drawbridge.", story: "The drawbridge is up — no boat can pass! Sail over the red button to bring it down, then cross.", lessons: [
    { title: "Press the button", emoji: "🔘", levels: [
      chart("Press the button, then cross the bridge!", ["Sb=G"]),
      chart("Button first — then the bridge!", ["S.b", "##.", "G=."]),
      chart("Find the button, cross the bridge!", ["Sb.#.", "...=G", "#..#."]),
    ] },
    { title: "Bridge builder", emoji: "🛠️", levels: (r) => [gAdv(r, "Button, bridge, island!", { w: 5, h: 3, kind: "bridge", len: [4, 8] }), gAdv(r, "Button, bridge, island!", { w: 5, h: 3, kind: "bridge", len: [4, 8] }), gAdv(r, "Grab the key, open the gate!", { w: 5, h: 3, kind: "key", len: [5, 8] })] },
    { title: "Bridge boss", emoji: "🏆", kind: "boss", levels: (r) => [gAdv(r, "Button, bridge, island!", { w: 6, h: 3, kind: "bridge", len: [6, 10] }), gAdv(r, "Button, bridge — and a shell!", { w: 6, h: 3, kind: "bridge", len: [6, 10], shells: 1 }), gAdv(r, "Key, gate, island!", { w: 6, h: 3, kind: "key", len: [6, 10] })] },
  ] },
  { id: "pools", title: "Whirlpool Way", emoji: "🌀", grade: "k", blurb: "Whirlpools are secret tunnels under the rocks.", story: "Rocks wall off the island — but whirlpools are secret tunnels! Sail into one whirlpool and you pop out of the other.", lessons: [
    { title: "Secret tunnels", emoji: "🌀", levels: [
      chart("Sail into the whirlpool!", ["S@#@G"]),
      chart("Whirlpool — then the island!", ["S.@#G", "...#@"]),
      chart("Which way is the tunnel?", ["S..#..", ".@.#.@", "...#.G"]),
    ] },
    { title: "Pop out!", emoji: "💫", levels: (r) => [gAdv(r, "Find the secret tunnel!", { w: 5, h: 3, kind: "pool", len: [3, 7] }), gAdv(r, "Find the secret tunnel!", { w: 5, h: 3, kind: "pool", len: [3, 7] }), gAdv(r, "Find the secret tunnel — and a shell!", { w: 5, h: 3, kind: "pool", len: [4, 8], shells: 1 })] },
    { title: "Whirlpool boss", emoji: "🏆", kind: "boss", levels: (r) => [gAdv(r, "Through the tunnel!", { w: 6, h: 3, kind: "pool", len: [5, 9], shells: 1 }), gAdv(r, "Button, bridge, island!", { w: 6, h: 3, kind: "bridge", len: [5, 9] }), gAdv(r, "Through the tunnel!", { w: 6, h: 4, kind: "pool", len: [5, 9], rocks: 1 })] },
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
    { title: "Twists and turns", emoji: "🌀", levels: (r) => [
      predictEndBoat(r, { w: 4, h: 3, rocks: 1 }),
      view("Sail around!", ["...G", ".##.", "S..."], [F, F, F, TL, F, F]),
      view("Zigzag!", ["S.#", "#..", "##G"], [F, TR, F, TL, F, TR, F]),
      view("U-turn!", ["S..", "##.", "G.."], [F, F, TR, F, F, TR, F, F]),
    ] },
    { title: "Open sea", emoji: "⛵", levels: (r) => [
      predictEndBoat(r, { w: 4, h: 4, rocks: 2 }),
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
      concept("bug", "middle"),
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
    { title: "Loop and turn", emoji: "↪️", levels: (r) => [loopFindAct(r, "arrows", [2, 2], [3, 4], true), gChannel(r, true, [2, 3]), gChannel(r, true, [3, 3]), gChannel(r, true, [3, 4])] },
    { title: "Loop the moves", emoji: "🔁", levels: (r) => [
      gLoopDance(r, { body: [2, 3], times: [3, 4], tail: 0.6 }),
      gLoopSong(r, { body: [3, 3], times: [2, 3], tail: 0.6 }),
      gChannel(r, true, [3, 4]),
    ] },
    { title: "Treasure review", emoji: "🗺️", kind: "review", levels: (r) => [gChannel(r, false, [4, 5]), gPolygon(r, [4], [1, 2]), gChannel(r, true, [3, 4])] },
    { title: "Lagoon boss", emoji: "🏆", kind: "boss", levels: (r) => [gChannel(r, true, [4, 4]), gLoopDance(r, { body: [3, 3], times: [3, 4], tail: 1 }), gChannel(r, true, [4, 5])] },
  ] },
  // ── Code Lab (1st) ──
  { id: "factory", title: "Sorting Factory", emoji: "🏭", grade: "1", blurb: "If it's red → red bin. Else → gray bin. Build the rule!", lessons: [
    { title: "If or else", emoji: "❓", levels: (r) => [concept("condition", "middle"), factoryAct(r, "red"), factoryAct(r, "animal")] },
    { title: "Shape sorter", emoji: "⚪", levels: (r) => [factoryAct(r, "circle"), factoryAct(r, "wings")] },
    { title: "Treasure review", emoji: "🗺️", kind: "review", levels: (r) => [factoryAct(r, "red"), factoryAct(r, "circle"), recipeAct(r, "sandwich", true)] },
    { title: "Factory boss", emoji: "🏆", kind: "boss", levels: (r) => [factoryAct(r, "wings"), factoryAct(r, "animal"), factoryAct(r, "circle")] },
  ] },
  { id: "detective", title: "Loop Detective", emoji: "🔎", grade: "1", blurb: "Find the pattern hiding in a long program.", lessons: [
    { title: "Case of the claps", emoji: "👏", levels: (r) => [loopFindAct(r, "dance", [2, 3], [3, 4]), loopFindAct(r, "arrows", [2, 2], [3, 4], true), predictCount(r, "music", false)] },
    { title: "Case of the tunes", emoji: "🎵", levels: (r) => [loopFindAct(r, "notes", [3, 3], [2, 3], true), predictCount(r, "dance", false), loopFindAct(r, "arrows", [3, 3], [2, 3])] },
    { title: "Treasure review", emoji: "🗺️", kind: "review", levels: (r) => [loopFindAct(r, "dance", [3, 3], [3, 3], true), predictEnd(r, { w: 5, h: 4, loop: true, rocks: 2 }), gLoopSong(r, { body: [2, 3], times: [2, 3] })] },
    { title: "Detective boss", emoji: "🏆", kind: "boss", levels: (r) => [loopFindAct(r, "notes", [3, 4], [3, 4], true), predictCount(r, "music", true), loopFindAct(r, "arrows", [3, 4], [2, 3], true)] },
  ] },
  { id: "kitchen", title: "Robot Kitchen", emoji: "🍕", grade: "1", blurb: "Bigger recipes, trickier orders, sneakier bugs.", lessons: [
    { title: "Lunch rush", emoji: "🥪", levels: (r) => [recipeAct(r, "sandwich"), recipeAct(r, "snowman")] },
    { title: "Fix the robot", emoji: "🔧", levels: (r) => [recipeAct(r, "dressed", true), recipeAct(r, "pizza")] },
    { title: "Treasure review", emoji: "🗺️", kind: "review", levels: (r) => [recipeAct(r, "dogbath"), recipeAct(r, "snowman", true)] },
    { title: "Kitchen boss", emoji: "🏆", kind: "boss", levels: (r) => [recipeAct(r, "lemonade"), recipeAct(r, "pizza", true)] },
  ] },
  // ── Adventure seas (1st) ──
  { id: "fishing", title: "Fishing Village", emoji: "🎣", grade: "1", blurb: "A new block: Catch. Net every fish, then dock.", story: "The village needs fish for dinner! Sail right onto a fish, then use the Catch block to net it. Catch every fish, then dock at the island.", lessons: [
    { title: "Catch!", emoji: "🎣", levels: [
      chart("Sail onto the fish and catch it!", ["S.f.G"]),
      chart("Catch both fish, then dock!", ["Sf", ".f", ".G"]),
      chart("Two fish for dinner!", ["S.f.f.G"]),
    ] },
    { title: "Fish in a loop", emoji: "🔁", levels: [
      sea("Use a loop to catch every fish!", ["S.f.f.f.G"], [rep(3, R, R, blk("catch")), R, R], { loops: true, hint: "Right, right, catch — that happens three times." }),
      sea("Find the pattern, then loop it!", ["Sf.f.f.G"], [rep(3, R, blk("catch"), R), R], { loops: true, hint: "Right, catch, right… again and again." }),
      sea("Loop down the river!", ["S", "f", "f", "f", "G"], [rep(3, D, blk("catch")), D], { loops: true }),
    ] },
    { title: "Fishing trip", emoji: "🐟", levels: (r) => [gAdv(r, "Catch every fish, then dock!", { w: 5, h: 3, kind: "fish", fish: 2, len: [6, 10] }), gAdv(r, "Catch every fish, then dock!", { w: 5, h: 3, kind: "fish", fish: 3, len: [7, 12], rocks: 1 }), gAdv(r, "Get the key — and the fish!", { w: 5, h: 3, kind: "key", fish: 1, len: [6, 11] })] },
    { title: "Treasure review", emoji: "🗺️", kind: "review", levels: (r) => [gAdv(r, "Catch every fish, then dock!", { w: 5, h: 3, kind: "fish", fish: 2, len: [6, 10], rocks: 1 }), gAdv(r, "Through the tunnel!", { w: 5, h: 3, kind: "pool", len: [3, 7] })] },
    { title: "Fishing boss", emoji: "🏆", kind: "boss", levels: (r) => [sea("Loop it!", ["S.f.f.f.f.G"], [rep(4, R, R, blk("catch")), R, R], { loops: true }), gAdv(r, "Catch every fish!", { w: 6, h: 3, kind: "fish", fish: 3, len: [8, 13], rocks: 2 }), gAdv(r, "Button, bridge, fish!", { w: 6, h: 3, kind: "bridge", fish: 1, len: [7, 12] })] },
  ] },
  { id: "rapids", title: "Current Rapids", emoji: "🌊", grade: "1", blurb: "Currents push your boat. Ride them — or go around!", story: "Whoosh! The white arrows in the water are currents. Sail onto one and it carries you along — sometimes that's a shortcut, sometimes it's the wrong way!", lessons: [
    { title: "Ride the current", emoji: "🏄", levels: [
      chart("Ride the current to the island!", ["S>>>.G"]),
      chart("One block is all it takes!", ["S....", "v####", ">>>>G"]),
      chart("This current goes the wrong way — sail around it!", ["S.<<.G", "......"]),
    ] },
    { title: "Rapids run", emoji: "💦", levels: (r) => [gAdv(r, "Use the currents!", { w: 6, h: 3, kind: "current", len: [2, 8] }), gAdv(r, "Use the currents!", { w: 6, h: 3, kind: "current", len: [2, 8], rocks: 1 }), gAdv(r, "Use the currents — get the shell!", { w: 6, h: 3, kind: "current", len: [3, 9], shells: 1 })] },
    { title: "Rapids boss", emoji: "🏆", kind: "boss", levels: (r) => [gAdv(r, "Ride the currents!", { w: 6, h: 4, kind: "current", len: [3, 9], rocks: 2 }), chart("Current, key, gate!", ["S>>.#G", "...k#.", "#.#.D."]), gAdv(r, "Ride the currents — steer like a captain!", { w: 5, h: 3, kind: "current", len: [3, 10], boat: true })] },
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
  // ── Code Lab (2nd) ──
  { id: "captain", title: "Code Captain", emoji: "💻", grade: "2", blurb: "Write real code — line by line.", story: "Real programmers write code as words, one line at a time. Tap code lines to build your program — then your boat runs it, line by line!", lessons: [
    { title: "First lines", emoji: "💻", levels: [
      codeLines(sea("Write the code: sail to the island!", ["S..G"], [R, R, R], { hint: "right() moves the boat one square to the right." })),
      codeLines(sea("Write the code: around the rocks!", ["S..", "##.", "G.."], [R, R, D, D, L, L], { hint: "Each line is one move. Read your code from the top." })),
      codeLines(gSea(rng("captain:1"), "Write the code: find the way!", { w: 4, h: 3, rocks: 3, len: [4, 6], turns: 2 })),
    ] },
    { title: "for loops", emoji: "🔁", levels: (r) => [
      codeLines(sea("Use a for loop!", ["S....G"], [rep(5, R)], { loops: true, hint: "for i in range(5): runs the lines inside it 5 times." })),
      codeLines(gChannel(r, false, [2, 3])),
      codeLines(gChannel(r, false, [3, 4])),
    ] },
    { title: "Treasure review", emoji: "🗺️", kind: "review", levels: (r) => [
      codeLines(gSea(r, "Write the code: find the way!", { w: 5, h: 4, rocks: 5, len: [6, 8], turns: 3, detour: true })),
      codeLines(gChannel(r, false, [3, 4])),
    ] },
    { title: "Captain's code", emoji: "🏆", kind: "boss", levels: (r) => [
      codeLines(gSea(r, "Write the code: the long way home!", { w: 5, h: 5, rocks: 7, len: [8, 10], turns: 4, detour: true })),
      codeLines(gChannel(r, false, [4, 5])),
      codeLines(chart("Write the code: key, gate, island!", ["S.k#.", "##.D.", "G...."])),
    ] },
  ] },
  { id: "counter", title: "Treasure Counter", emoji: "🪙", grade: "2", blurb: "Variables: boxes with names that hold numbers.", lessons: [
    { title: "The magic box", emoji: "📦", levels: (r) => [concept("variable", "middle"), variableAct(r, 1), variableAct(r, 1)] },
    { title: "Counting in loops", emoji: "🔁", levels: (r) => [variableAct(r, 2), variableAct(r, 1), variableAct(r, 2)] },
    { title: "Treasure review", emoji: "🗺️", kind: "review", levels: (r) => [variableAct(r, 2), predictCount(r, "music", false), variableAct(r, 2)] },
    { title: "Counter boss", emoji: "🏆", kind: "boss", levels: (r) => [variableAct(r, 2), variableAct(r, 3), variableAct(r, 2)] },
  ] },
  { id: "beacons", title: "Binary Beacons", emoji: "💡", grade: "2", blurb: "Computers count with lights that are on or off.", lessons: [
    { title: "On and off", emoji: "💡", levels: (r) => [concept("binary", "middle"), binaryAct(r, 3, "make"), binaryAct(r, 3, "make"), binaryAct(r, 3, "read")] },
    { title: "Four lights", emoji: "🔆", levels: (r) => [binaryAct(r, 4, "make"), binaryAct(r, 4, "read"), binaryAct(r, 4, "make")] },
    { title: "Beacon boss", emoji: "🏆", kind: "boss", levels: (r) => [binaryAct(r, 4, "make"), binaryAct(r, 4, "read"), binaryAct(r, 4, "make"), binaryAct(r, 4, "read")] },
  ] },
  { id: "hunt", title: "Number Hunt", emoji: "🎯", grade: "2", blurb: "Guess the middle — the fastest way to find anything.", lessons: [
    { title: "Higher or lower?", emoji: "⬆️", levels: () => [concept("search", "middle"), searchAct(10, true), searchAct(16, true)] },
    { title: "Halve it!", emoji: "✂️", levels: () => [searchAct(20, true), searchAct(20), searchAct(16)] },
    { title: "Hunt boss", emoji: "🏆", kind: "boss", levels: () => [searchAct(30), searchAct(25), searchAct(32)] },
  ] },
  { id: "floor", title: "Factory Floor", emoji: "⚙️", grade: "2", blurb: "Three bins: if, else-if, else.", lessons: [
    { title: "Fruit or veggie?", emoji: "🥦", levels: (r) => [factoryAct(r, "produce"), factoryAct(r, "colors")] },
    { title: "Animal homes", emoji: "🌊", levels: (r) => [factoryAct(r, "habitat"), factoryAct(r, "produce")] },
    { title: "Floor boss", emoji: "🏆", kind: "boss", levels: (r) => [factoryAct(r, "colors"), factoryAct(r, "habitat"), factoryAct(r, "produce")] },
  ] },
  // ── Adventure seas (2nd) ──
  { id: "sharks", title: "Shark Shallows", emoji: "🦈", grade: "2", blurb: "Timing! Wait for the shark to swim by.", story: "A shark patrols the bay, back and forth, one square every time your boat does a block. Watch its path — and use the new Wait block to let it swim by!", lessons: [
    { title: "Wait for it…", emoji: "⏳", levels: [
      chart("Wait for the shark to pass!", ["#N#", "S.G", "#.#"]),
      chart("Time it right — then cross!", ["##.##", "S.N.G", "##.##"]),
      chart("Watch the shark, wait, then go!", ["###.###", "S.....G", "###N###"]),
    ] },
    { title: "Two sharks", emoji: "🦈", levels: (r) => [chart("Two sharks — time both crossings!", ["#.##.#", "S....G", "#N##N#"]), gAdv(r, "Don't get chomped!", { w: 5, h: 3, kind: "shark", len: [5, 10] }), gAdv(r, "Don't get chomped!", { w: 5, h: 3, kind: "shark", len: [5, 10] })] },
    { title: "Treasure review", emoji: "🗺️", kind: "review", levels: (r) => [gAdv(r, "Don't get chomped!", { w: 5, h: 4, kind: "shark", len: [5, 11] }), gAdv(r, "Catch every fish!", { w: 5, h: 3, kind: "fish", fish: 2, len: [6, 10] })] },
    { title: "Shark boss", emoji: "🏆", kind: "boss", levels: (r) => [gAdv(r, "Sneak past the shark!", { w: 6, h: 3, kind: "shark", len: [6, 12], shells: 1 }), gAdv(r, "Sneak past — and catch a fish!", { w: 6, h: 4, kind: "shark", len: [6, 13], fish: 1 }), chart("Two sharks — time both crossings!", ["#.##.#", "S....G", "#N##N#"], { boat: true })] },
  ] },
  { id: "vault", title: "Treasure Vault", emoji: "🗝️", grade: "2", blurb: "Two gates, two keys — plan the whole trip.", story: "The pirate's treasure island is behind TWO locked gates. Find a key for each one — and plan your trip before you press Play.", lessons: [
    { title: "Two keys", emoji: "🗝️", levels: (r) => [gAdv(r, "Two keys, two gates!", { w: 7, h: 3, kind: "keys2", len: [8, 14] }), gAdv(r, "Two keys, two gates!", { w: 7, h: 3, kind: "keys2", len: [8, 14] })] },
    { title: "Everything at once", emoji: "🧭", levels: [
      chart("Key, gate, button, bridge!", ["S.k#..", "##.D.b", "G=.#.."]),
      chart("Tunnel, button, bridge!", ["S@.#k.", "##.#D#", "@..=.G", "b....."]),
    ] },
    { title: "Vault boss", emoji: "🏆", kind: "boss", levels: (r) => [gAdv(r, "Two keys, two gates — and a shell!", { w: 7, h: 3, kind: "keys2", len: [9, 15], shells: 1 }), gAdv(r, "Two keys, two gates!", { w: 7, h: 4, kind: "keys2", len: [9, 16] }), chart("Current, key, gate!", ["S>>.#G", "...k#.", "#.#.D."])] },
  ] },

  // ── 3rd grade ────────────────────────────────────────────────────────────────────────────
  { id: "rover", title: "Mars Rover", emoji: "🛸", grade: "3", blurb: "Sensors + if/else: one program that solves every map.", lessons: [
    { title: "Drive until…", emoji: "🛰️", levels: [
      concept("until", "big"),
      rover("Drive until you reach the goal!", [["S......G"], ["S...G"]], [until("atGoal", F)], { ifs: false, hint: "Repeat until at goal: forward." }),
      rover("One program for all three maps!", [["S...", "###.", "###G"], ["S.....", "#####.", "#####G"], ["S.", "#.", "#.", "#G"]], roverProgram("right"), { hint: "If blocked, turn right — otherwise go forward." }),
      rover("Now the path turns left!", [["...G", "###.", "S..."], [".....G", "#####.", "S....."], ["#G", "#.", "#.", "S."]], roverProgram("left"), { hint: "If blocked, turn left — otherwise go forward." }),
    ] },
    { title: "Winding canyons", emoji: "🏜️", levels: (r) => [concept("condition", "big"), gCorridor(r, "right", 2, [2, 3]), gCorridor(r, "left", 2, [2, 3]), gCorridor(r, "right", 3, [3, 4], {}, [1, 4])] },
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
      concept("nested", "big"),
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
  // ── Code Lab (3rd) ──
  { id: "codes", title: "Secret Codes", emoji: "🕵️", grade: "3", blurb: "Encode and crack messages like a spy.", lessons: [
    { title: "Picture codes", emoji: "🔣", levels: (r) => [concept("cipher", "big"), cipherAct(r, "symbol", 3), cipherAct(r, "symbol", 4)] },
    { title: "Shift ciphers", emoji: "🔤", levels: (r) => [cipherAct(r, "shift", 3, 1), cipherAct(r, "shift", 4, 1), cipherAct(r, "shift", 4, 2)] },
    { title: "Treasure review", emoji: "🗺️", kind: "review", levels: (r) => [cipherAct(r, "symbol", 4), cipherAct(r, "shift", 4, 3), cipherAct(r, "symbol", 5)] },
    { title: "Spy boss", emoji: "🏆", kind: "boss", levels: (r) => [cipherAct(r, "shift", 5, 3), cipherAct(r, "shift", 5, 2), cipherAct(r, "symbol", 5)] },
  ] },
  { id: "map", title: "Treasure Map", emoji: "🗺️", grade: "3", blurb: "Coordinates: across, then up.", lessons: [
    { title: "X marks the spot", emoji: "❌", levels: (r) => [concept("coordinates", "big"), plotAct(r, 5, 4, "place"), plotAct(r, 5, 4, "read")] },
    { title: "Bigger maps", emoji: "🧭", levels: (r) => [plotAct(r, 7, 5, "place"), plotAct(r, 7, 5, "read"), predictEnd(r, { w: 6, h: 4, loop: true, rocks: 3 })] },
    { title: "Map boss", emoji: "🏆", kind: "boss", levels: (r) => [plotAct(r, 8, 6, "place"), plotAct(r, 8, 6, "read"), plotAct(r, 8, 6, "place")] },
  ] },
  { id: "voyage-vars", title: "Variable Voyage", emoji: "📈", grade: "3", blurb: "Trace a variable through loops and ifs.", lessons: [
    { title: "Up and down", emoji: "↕️", levels: (r) => [concept("variable", "big"), variableAct(r, 3), variableAct(r, 2), variableAct(r, 3)] },
    { title: "If it's big…", emoji: "❓", levels: (r) => [variableAct(r, 4), variableAct(r, 3), variableAct(r, 4)] },
    { title: "Voyage boss", emoji: "🏆", kind: "boss", levels: (r) => [variableAct(r, 4), variableAct(r, 4), variableAct(r, 3)] },
  ] },
  { id: "apps", title: "App Studio", emoji: "📱", grade: "3", blurb: "Bigger apps: points, sounds, hiding and showing.", lessons: [
    { title: "Four buttons", emoji: "🎛️", levels: (r) => [concept("event", "big"), eventsAct(r, 4), eventsAct(r, 3)] },
    { title: "Studio boss", emoji: "🏆", kind: "boss", levels: (r) => [eventsAct(r, 4), eventsAct(r, 4)] },
  ] },
  // ── Adventure seas (3rd) ──
  { id: "nets", title: "Smart Nets", emoji: "🐟", grade: "3", blurb: "If/then: one program that catches fish wherever they are.", story: "The fish swim somewhere new every day! Write ONE program that works for every row: move, look — and only cast your net if you're on a fish.", lessons: [
    { title: "Look, then net", emoji: "👀", levels: (r) => [concept("condition", "big"), gNets(r, 2, 4), gNets(r, 3, 4)] },
    { title: "Every row", emoji: "🐟", levels: (r) => [gNets(r, 3, 5), gNets(r, 3, 6), gNets(r, 4, 5)] },
    { title: "Treasure review", emoji: "🗺️", kind: "review", levels: (r) => [gNets(r, 3, 5), gAdv(r, "Don't get chomped!", { w: 5, h: 3, kind: "shark", len: [5, 10] })] },
    { title: "Nets boss", emoji: "🏆", kind: "boss", levels: (r) => [gNets(r, 4, 6), gNets(r, 4, 7), gAdv(r, "Two keys, two gates!", { w: 7, h: 3, kind: "keys2", len: [8, 15] })] },
  ] },

  // ── 4th grade ────────────────────────────────────────────────────────────────────────────
  { id: "functions", title: "Function Falls", emoji: "🧩", grade: "4", blurb: "Make your own blocks with functions.", lessons: [
    { title: "Make a block", emoji: "🧩", levels: [
      concept("function", "big"),
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
      concept("bug", "big"),
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
  // ── Code Lab (4th) ──
  { id: "shipyard", title: "Sort Shipyard", emoji: "📊", grade: "4", blurb: "Sorting and searching algorithms, by hand.", lessons: [
    { title: "Bubble sort", emoji: "🔃", levels: (r) => [concept("sorting", "big"), swapSortAct(r, 4), swapSortAct(r, 5)] },
    { title: "Search smarter", emoji: "🔍", levels: (r) => [searchAct(50), swapSortAct(r, 5), searchAct(64)] },
    { title: "Shipyard boss", emoji: "🏆", kind: "boss", levels: (r) => [swapSortAct(r, 6), searchAct(100), swapSortAct(r, 6)] },
  ] },
  { id: "logic", title: "Logic Lighthouse", emoji: "🔌", grade: "4", blurb: "AND, OR, NOT — the tiny switches inside every computer.", lessons: [
    { title: "AND and OR", emoji: "🔀", levels: (r) => [concept("logic", "big"), logicAct(r, "AND", "light"), logicAct(r, "OR", "light"), logicAct(r, "AND", "predict")] },
    { title: "NOT and more", emoji: "🔁", levels: (r) => [logicAct(r, "NOT", "light"), logicAct(r, "OR", "predict"), logicAct(r, "NOT", "predict"), logicAct(r, "AND", "predict")] },
    { title: "Lighthouse boss", emoji: "🏆", kind: "boss", levels: (r) => [logicAct(r, "OR", "predict"), logicAct(r, "AND", "predict"), logicAct(r, "NOT", "predict"), logicAct(r, "OR", "light")] },
  ] },
  { id: "machines", title: "Function Machines", emoji: "⚙️", grade: "4", blurb: "Input → rule → output. Crack the rule!", lessons: [
    { title: "What comes out?", emoji: "➡️", levels: (r) => [concept("machine", "big"), machineAct(r, 1, "output"), machineAct(r, 2, "output")] },
    { title: "Crack the rule", emoji: "🔓", levels: (r) => [machineAct(r, 1, "rule"), machineAct(r, 2, "rule"), machineAct(r, 2, "output")] },
    { title: "Machine boss", emoji: "🏆", kind: "boss", levels: (r) => [machineAct(r, 3, "output"), machineAct(r, 3, "rule"), machineAct(r, 3, "rule")] },
  ] },
  { id: "smart-factory", title: "Smart Factory", emoji: "🧠", grade: "4", blurb: "AND conditions — and why the ORDER of your rules matters.", lessons: [
    { title: "Both at once", emoji: "🔴", levels: (r) => [factoryAct(r, "redCircle"), factoryAct(r, "redFruit")] },
    { title: "Order matters", emoji: "🔢", levels: (r) => [factoryAct(r, "order"), factoryAct(r, "redCircle")] },
    { title: "Factory boss", emoji: "🏆", kind: "boss", levels: (r) => [factoryAct(r, "redFruit"), factoryAct(r, "order"), factoryAct(r, "habitat")] },
  ] },
  { id: "grand", title: "Grand Voyage", emoji: "🧭", grade: "4", blurb: "Captain's view through keys, bridges, tunnels, currents and sharks.", story: "Captain, the Grand Voyage begins! Steer from the boat's own view — forward, turn left, turn right — through locked gates, drawbridges, whirlpools, currents and shark water.", lessons: [
    { title: "Captain's keys", emoji: "🔑", levels: (r) => [gAdv(r, "Key, gate, island — steer like a captain!", { w: 5, h: 3, kind: "key", len: [6, 12], boat: true }), gAdv(r, "Button, bridge, island!", { w: 5, h: 3, kind: "bridge", len: [6, 12], boat: true }), gAdv(r, "Through the tunnel!", { w: 5, h: 3, kind: "pool", len: [4, 10], boat: true })] },
    { title: "Rough water", emoji: "🌊", levels: (r) => [gAdv(r, "Ride the currents!", { w: 6, h: 3, kind: "current", len: [3, 11], boat: true }), gAdv(r, "Sneak past the shark!", { w: 6, h: 3, kind: "shark", len: [6, 13], boat: true }), gAdv(r, "Catch every fish!", { w: 5, h: 3, kind: "fish", fish: 2, len: [7, 13], boat: true })] },
    { title: "Voyage boss", emoji: "🏆", kind: "boss", levels: (r) => [chart("Key, gate, button, bridge!", ["S.k#..", "##.D.b", "G=.#.."], { boat: true }), gAdv(r, "Two keys, two gates!", { w: 7, h: 3, kind: "keys2", len: [10, 18], boat: true }), gNets(r, 4, 6)] },
  ] },
  { id: "python", title: "Python Peek", emoji: "🐍", grade: "4", blurb: "Real code, typed as text: read it, predict it, run it.", lessons: [
    { title: "Hello, Python", emoji: "👋", levels: (r) => [concept("python", "big"), ...pythonSet(r, [1, 1, 1])] },
    { title: "Boxes with names", emoji: "📦", levels: (r) => pythonSet(r, [1, 1, 1, 1]) },
    { title: "Loops in text", emoji: "🔁", levels: (r) => pythonSet(r, [2, 2, 2, 1]) },
    { title: "Counting from 0", emoji: "🔢", levels: (r) => pythonSet(r, [2, 2, 2, 2]) },
    { title: "Bug hunt", emoji: "🐞", levels: (r) => pythonBugSet(r, 1, 4) },
    { title: "Python boss", emoji: "🏆", kind: "boss", levels: (r) => [...pythonSet(r, [1, 2, 3, 2]), ...pythonBugSet(r, 1, 1)] },
  ] },

  // ── 5th grade ────────────────────────────────────────────────────────────────────────────
  { id: "algorithms", title: "Algorithm Archipelago", emoji: "🧠", grade: "5", blurb: "Smarter programs: one algorithm that escapes any maze.", lessons: [
    { title: "Follow the wall", emoji: "🧱", levels: [
      concept("algorithm", "big"),
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
  // ── Code Lab (5th) ──
  { id: "data", title: "Data Docks", emoji: "💾", grade: "5", blurb: "Bits, bytes, codes and maps: how computers store things.", lessons: [
    { title: "Five bits", emoji: "💡", levels: (r) => [concept("binary", "big"), binaryAct(r, 5, "make"), binaryAct(r, 5, "read")] },
    { title: "Codes and maps", emoji: "🗝️", levels: (r) => [concept("data", "big"), cipherAct(r, "shift", 5, 4), plotAct(r, 9, 6, "read"), binaryAct(r, 5, "make")] },
    { title: "Data boss", emoji: "🏆", kind: "boss", levels: (r) => [binaryAct(r, 5, "read"), cipherAct(r, "shift", 5, 5), variableAct(r, 5)] },
  ] },
  { id: "academy", title: "Algorithm Academy", emoji: "🎓", grade: "5", blurb: "Efficient algorithms: fewest guesses, fewest swaps, fewest blocks.", lessons: [
    { title: "Efficiency", emoji: "⚡", levels: (r) => [searchAct(100), swapSortAct(r, 7), variableAct(r, 5)] },
    { title: "Read the code", emoji: "👓", levels: (r) => [predictPick(r, { w: 5, h: 5, rocks: 7, len: [7, 9], turns: 3 }), predictEnd(r, { w: 7, h: 5, loop: true, rocks: 4 }), machineAct(r, 3, "rule")] },
    { title: "Academy final", emoji: "🏆", kind: "boss", levels: (r) => [searchAct(128), swapSortAct(r, 7), variableAct(r, 5), predictPick(r, { w: 6, h: 5, rocks: 9, len: [8, 10], turns: 4 })] },
  ] },
  { id: "python-pro", title: "Python Pro", emoji: "🐍", grade: "5", blurb: "If, elif, functions, lists and loops inside loops — in real Python.", lessons: [
    { title: "Decisions", emoji: "❓", levels: (r) => [concept("python", "big"), ...pythonSet(r, [2, 3, 3, 3])] },
    { title: "Functions and lists", emoji: "🧩", levels: (r) => pythonSet(r, [3, 3, 3, 3]) },
    { title: "Loops inside loops", emoji: "🌀", levels: (r) => pythonSet(r, [4, 3, 4, 4]) },
    { title: "Crash course", emoji: "💥", levels: (r) => pythonBugSet(r, 2, 4) },
    { title: "Treasure review", emoji: "🗺️", kind: "review", levels: (r) => [pythonRead(r, 2), predictEnd(r, { w: 6, h: 4, loop: true, rocks: 3 }), pythonBug(r, 1), variableAct(r, 5), pythonRead(r, 3)] },
    { title: "Python master", emoji: "👑", kind: "boss", levels: (r) => [...pythonSet(r, [3, 4, 4, 3]), ...pythonBugSet(r, 2, 1)] },
  ] },
  { id: "legend", title: "Legend of the Deep", emoji: "🐙", grade: "5", blurb: "The hardest seas: everything at once, from the captain's view.", story: "Legend says a golden treasure lies past the Kraken's waters. Only a master captain can plan the whole trip — keys, bridges, tunnels, currents and sharks — in one perfect program.", lessons: [
    { title: "The Kraken's maze", emoji: "🐙", levels: (r) => [chart("Tunnel, button, bridge!", ["S@.#k.", "##.#D#", "@..=.G", "b....."], { boat: true }), gAdv(r, "Two keys, two gates!", { w: 7, h: 4, kind: "keys2", len: [10, 20], boat: true }), gAdv(r, "Sneak past the shark — catch the fish!", { w: 6, h: 4, kind: "shark", fish: 1, len: [8, 16], boat: true })] },
    { title: "Master captain", emoji: "⚓", levels: (r) => [chart("Current, key, gate!", ["S>>.#G", "...k#.", "#.#.D."], { boat: true }), gAdv(r, "Ride the currents — get the shells!", { w: 7, h: 4, kind: "current", len: [5, 14], shells: 2, boat: true }), gAdv(r, "Through the tunnel — every fish!", { w: 6, h: 4, kind: "pool", fish: 2, len: [7, 16], boat: true })] },
    { title: "Legend boss", emoji: "👑", kind: "boss", levels: (r) => [gAdv(r, "Two keys, two gates — and a shell!", { w: 7, h: 4, kind: "keys2", len: [12, 22], shells: 1, boat: true }), chart("Two sharks — time both crossings!", ["#.##.#", "S....G", "#N##N#"], { boat: true }), gNets(r, 5, 7)] },
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
  ...LAB_SKILL_LABEL,
};

const LITTLE: GradeId[] = ["prek", "k"];
/** Which lessons draw the program's route as it's built ("full"), or just the newest block's
 *  ("last") — by world, lesson by lesson. Every later level is on its own (a Peek after misses). */
const PREVIEW: Record<string, ("full" | "last")[]> = { voyage: ["full", "full", "last", "last"], keys: ["last"], wharf: ["full", "last"] };
const BIG: GradeId[] = ["3", "4", "5"];
const isLevel = (x: Item): x is CodeLevel => "sim" in x;
function lessonFrom(w: WorldDef, l: LessonDef, n: number): Lesson {
  const items = typeof l.levels === "function" ? l.levels(rng(`code:${w.id}:${n}`)) : l.levels;
  // Big kids see the real code their blocks make; little ones get picture blocks only.
  const preview = PREVIEW[w.id]?.[n - 1];
  const acts: Activity[] = items.map((x) => {
    if (!isLevel(x)) return x;
    const lv = preview && (x.sim === "sea" || x.sim === "rover") && !x.preview ? { ...x, preview } : x;
    return { kind: "code", level: LITTLE.includes(w.grade) || lv.mode === "code" ? lv : { ...lv, textCode: lv.textCode ?? BIG.includes(w.grade) }, skill: `c:${skillOf(lv)}` };
  });
  return {
    id: `code.${w.id}.${n}`,
    subject: "code",
    unit: `code.${w.id}`,
    n,
    kind: l.kind ?? "lesson",
    title: l.title,
    emoji: l.emoji,
    activities: acts,
    skills: [...new Set(acts.flatMap((a) => (a.skill ? [a.skill] : [])))],
    ...(n === 1 && w.story ? { intro: w.story } : {}),
  };
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
  tagline: "Program boats, robots, apps and art",
  units,
  // Review: replay solved levels of the same concept (a different one each time).
  itemsFor: (skill, n, seed) => pickN(rng(seed), pool.filter((a) => a.skill === skill), n),
};
