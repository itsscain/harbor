import type { CodeBlock, CodeLevel, Course, Lesson, Unit, GradeId, Cmd } from "./types";

// The Code course — Skipper's boat sails the harbor by a program the child builds from blocks.
// Concepts grow the way early CS curricula teach them: sequencing (arrows) → collecting →
// loops → turning from the boat's point of view → debugging → putting it together.
// Map legend: "." water · "#" rock · "S" start · "G" dock · "*" shell to collect.

const c = (cmd: Cmd): CodeBlock => ({ cmd });
const R = c("right"), L = c("left"), U = c("up"), D = c("down"), F = c("forward"), TL = c("turnLeft"), TR = c("turnRight");
const rep = (n: number, ...body: CodeBlock[]): CodeBlock => ({ repeat: n, body });
const ARROWS: Cmd[] = ["up", "down", "left", "right"];
const BOAT: Cmd[] = ["forward", "turnLeft", "turnRight"];

const lvl = (map: string[], best: number, solution: CodeBlock[], extra: Partial<CodeLevel> = {}): CodeLevel => ({
  map,
  facing: "right",
  palette: ARROWS,
  best,
  solution,
  ...extra,
});

const UNITS: { id: string; title: string; emoji: string; grade: GradeId; blurb: string; lessons: { title: string; emoji: string; levels: CodeLevel[] }[] }[] = [
  {
    id: "u1",
    title: "First voyage",
    emoji: "⛵",
    grade: "prek",
    blurb: "Tell the boat where to go, one arrow at a time.",
    lessons: [
      {
        title: "Set sail",
        emoji: "⛵",
        levels: [
          lvl(["S.G"], 2, [R, R], { hint: "Sail right two times." }),
          lvl(["S...G"], 4, [R, R, R, R], { hint: "Count the water squares." }),
          lvl(["S", ".", ".", "G"], 3, [D, D, D], { hint: "This time, sail down." }),
        ],
      },
      {
        title: "Around the rocks",
        emoji: "🪨",
        levels: [
          lvl(["S.", ".G"], 2, [R, D], { hint: "Right, then down." }),
          lvl(["..G", ".#.", "S.."], 4, [R, R, U, U], { hint: "Go around the rock." }),
          lvl(["S#.", ".#G", "..."], 5, [D, D, R, R, U], { hint: "Sail down first." }),
        ],
      },
    ],
  },
  {
    id: "u2",
    title: "Shell collector",
    emoji: "🐚",
    grade: "k",
    blurb: "Pick up every shell before you dock.",
    lessons: [
      {
        title: "Shell hunt",
        emoji: "🐚",
        levels: [
          lvl(["S*G"], 2, [R, R]),
          lvl(["S.*", "..G"], 3, [R, R, D], { hint: "Get the shell, then dock." }),
          lvl(["*..", "S#G"], 4, [U, R, R, D], { hint: "The shell is up first." }),
          lvl(["S..", "*#*", "..G"], 6, [D, D, R, R, U, D], { hint: "Two shells — get both!" }),
        ],
      },
    ],
  },
  {
    id: "u3",
    title: "Loop the loop",
    emoji: "🔁",
    grade: "k",
    blurb: "A repeat block does the same thing again and again.",
    lessons: [
      {
        title: "Repeat it",
        emoji: "🔁",
        levels: [
          lvl(["S.....G"], 2, [rep(6, R)], { loops: true, hint: "Put → inside a repeat." }),
          lvl(["S*.*.*.G"], 2, [rep(7, R)], { loops: true }),
          lvl(["S.##", "#..#", "##..", "###G"], 3, [rep(3, R, D)], { loops: true, hint: "Repeat: right, down." }),
          lvl(["S....", "....G"], 3, [rep(4, R), D], { loops: true }),
        ],
      },
    ],
  },
  {
    id: "u4",
    title: "Turn and sail",
    emoji: "🧭",
    grade: "1",
    blurb: "Think like the boat: go forward, turn left or right.",
    lessons: [
      {
        title: "Captain's view",
        emoji: "🧭",
        levels: [
          lvl(["S..G"], 3, [F, F, F], { palette: BOAT, hint: "Forward means the way the boat faces." }),
          lvl(["S.", ".G"], 3, [F, TR, F], { palette: BOAT, hint: "Forward, turn right, forward." }),
          lvl(["S.#", "..#", "G.."], 3, [TR, F, F], { palette: BOAT, hint: "Turn to face down first." }),
          lvl(["...G", ".##.", "S..."], 6, [F, F, F, TL, F, F], { palette: BOAT }),
        ],
      },
    ],
  },
  {
    id: "u5",
    title: "Bug hunt",
    emoji: "🐞",
    grade: "1",
    blurb: "Something's wrong with the program — find it and fix it.",
    lessons: [
      {
        title: "Fix the bug",
        emoji: "🐞",
        levels: [
          lvl(["S...G"], 4, [R, R, R, R], { buggy: [R, R, R], hint: "Is it one step short?" }),
          lvl(["S.", "#.", "G."], 4, [R, D, D, L], { buggy: [D, D, L], hint: "The rock is in the way!" }),
          lvl(["S...", "...G"], 3, [rep(3, R), D], { loops: true, buggy: [rep(3, R), U], hint: "Up or down?" }),
        ],
      },
    ],
  },
  {
    id: "u6",
    title: "Captain's challenge",
    emoji: "🏆",
    grade: "2",
    blurb: "Turns and repeats together — the trickiest waters.",
    lessons: [
      {
        title: "Big voyage",
        emoji: "🏆",
        levels: [
          lvl(["S....G"], 2, [rep(5, F)], { palette: BOAT, loops: true }),
          lvl(["S...", "###.", "G..."], 8, [rep(3, F), TR, rep(2, F), TR, rep(3, F)], { palette: BOAT, loops: true }),
          lvl(["S.##", "#..#", "##..", "###G"], 5, [rep(3, F, TR, F, TL)], { palette: BOAT, loops: true, hint: "Find the pattern, then repeat it." }),
        ],
      },
    ],
  },
];

function buildCode(): Course {
  const units: Unit[] = UNITS.map((u) => ({
    id: `code.${u.id}`,
    subject: "code",
    title: u.title,
    emoji: u.emoji,
    grade: u.grade,
    blurb: u.blurb,
    lessons: u.lessons.map(
      (l, i): Lesson => ({
        id: `code.${u.id}.${i + 1}`,
        subject: "code",
        unit: `code.${u.id}`,
        title: l.title,
        emoji: l.emoji,
        activities: l.levels.map((level) => ({ kind: "code", level })),
        skills: [`code:${u.id}`],
      }),
    ),
  }));
  return { id: "code", title: "Code", emoji: "🧩", tagline: "Think like a programmer", units };
}

export const CODE: Course = buildCode();
