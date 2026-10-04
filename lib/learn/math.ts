import type { Activity, Course, Option, ShapeName, Visual } from "./types";
import { buildWorlds, int, makeItemsFor, nearNumbers, numChoice, numKey, numberWord, pick, pickN, shuffle, textChoice, type Rng, type Topic, type WorldDef } from "./gen";

// The Math voyage — Pre-K to 5th grade, ~30 worlds of numbered levels. Every idea starts with
// something to see or touch (count it, fill the net, ten-frames, number lines, place-value
// blocks, arrays, fraction pies, clocks, coins) before it becomes symbols, and facts are tracked
// one by one so the ones a child misses come back until they stick.

const THINGS = ["🐟", "🍎", "⭐", "🐞", "🎈", "🐤", "🌸", "🍪", "🐚", "🦋", "🍓", "🚗", "🦆", "🧁", "🐢", "🍩"];
const thing = (r: Rng) => pick(r, THINGS);
const eq = (text: string): Visual => ({ type: "equation", text });

// ── Pre-K / K ─────────────────────────────────────────────────────────────────────────────────
const count = (max: number, min = 1): Topic => ({
  key: `count${max}`,
  gen: (r, d) => {
    const n = int(r, min, Math.max(min, Math.round(min + (max - min) * (0.35 + d * 0.65))));
    return { kind: "count", emoji: thing(r), n, options: [n, ...nearNumbers(r, n, 2, { min: 1, max: max + 2 })].sort((a, b) => a - b), skill: `m:count:${n}` };
  },
});
const make = (max: number, min = 1): Topic => ({
  key: `makeset${max}`,
  gen: (r, d) => {
    const n = int(r, min, Math.max(min, Math.round(min + (max - min) * (0.4 + d * 0.6))));
    return { kind: "make", emoji: thing(r), n, skill: `m:count:${n}` };
  },
});
const numeral = (max: number): Topic => ({
  key: `numeral${max}`,
  gen: (r) => {
    const n = int(r, max > 5 ? 0 : 1, max);
    const wrong = nearNumbers(r, n, 3, { min: 0, max });
    const options: Option[] = shuffle(r, [n, ...wrong]).map((v) => ({ id: String(v), text: String(v), say: numKey(v) }));
    return { kind: "choice", prompt: `Tap the number ${n}`, say: ["Tap the number,", numberWord(n)], options, answer: String(n), layout: "row", skill: `m:numeral:${n}` };
  },
});
const SHAPES_2D: ShapeName[] = ["circle", "square", "triangle", "rectangle", "star", "heart", "oval", "diamond", "hexagon", "pentagon"];
const COLORS = ["#ff7363", "#1cb0f6", "#3ccf6e", "#ffc83d", "#8b6cff", "#ff9149"];
const shapes = (set: ShapeName[]): Topic => ({
  key: `shapes-${set[0]}-${set.length}`,
  gen: (r) => {
    const target = pick(r, set);
    const wrong = pickN(r, set, 2, (s) => s === target);
    const options: Option[] = shuffle(r, [target, ...wrong]).map((s) => ({ id: s, visual: { type: "shape", shape: s, color: pick(r, COLORS) }, say: [s] }));
    return { kind: "choice", prompt: `Which one is a ${target}?`, say: ["Which one is a,", target], options, answer: target, layout: "row", skill: `m:shape:${target}` };
  },
});
/** Shapes in the real world: "Which one is shaped like a triangle?" 🍕 */
const SHAPE_THINGS: Partial<Record<ShapeName, [string, string][]>> = {
  circle: [["🍪", "cookie"], ["🍩", "donut"], ["🕐", "clock"], ["🍊", "orange"]],
  square: [["🧇", "waffle"], ["🎁", "present"], ["🔲", "tile"], ["🧊", "ice cube"]],
  triangle: [["🍕", "pizza slice"], ["⛺", "tent"], ["🔺", "sign"], ["📐", "ruler"]],
  rectangle: [["🚪", "door"], ["📱", "phone"], ["📺", "TV"], ["💵", "dollar"]],
  star: [["⭐", "star"], ["🌟", "gold star"]],
  heart: [["❤️", "heart"], ["💝", "heart box"]],
  oval: [["🥚", "egg"], ["🏈", "football"]],
  diamond: [["🪁", "kite"], ["🔶", "sign"]],
};
const shapeLife = (set: ShapeName[]): Topic => ({
  key: `shapelife-${set[0]}-${set.length}`,
  gen: (r) => {
    const can = set.filter((s) => SHAPE_THINGS[s]?.length);
    const target = pick(r, can);
    const right = pick(r, SHAPE_THINGS[target]!);
    const wrong = pickN(r, can, 2, (s) => s === target).map((s) => pick(r, SHAPE_THINGS[s]!));
    const options: Option[] = shuffle(r, [right, ...wrong]).map(([emoji, word]) => ({ id: word, emoji, text: word, say: [word] }));
    return { kind: "choice", prompt: `Which one is shaped like a ${target}?`, say: [`Which one is shaped like a ${target}?`], options, answer: right[1], layout: "row", skill: `m:shape:${target}`, why: `A ${right[1]} is shaped like a ${target}!` };
  },
});
const moreFewer: Topic = {
  key: "morefewer",
  gen: (r, d) => {
    const max = d < 0.5 ? 6 : 10;
    const a = int(r, 1, max);
    let b = int(r, 1, max);
    if (b === a) b = a === max ? a - 1 : a + 1;
    const fewer = r() < 0.4;
    const e = thing(r);
    const answer = (fewer ? a < b : a > b) ? "left" : "right";
    return {
      kind: "choice",
      prompt: fewer ? "Which group has fewer?" : "Which group has more?",
      say: [fewer ? "Which group has fewer?" : "Which group has more?"],
      options: [
        { id: "left", visual: { type: "count", emoji: e, n: a } },
        { id: "right", visual: { type: "count", emoji: e, n: b } },
      ],
      answer,
      layout: "row",
      skill: fewer ? "m:compare:fewer" : "m:compare:more",
      why: `${fewer ? Math.min(a, b) : Math.max(a, b)} is ${fewer ? "fewer" : "more"} than ${fewer ? Math.max(a, b) : Math.min(a, b)}.`,
    };
  },
};
const PATTERN_SETS = [["🔴", "🔵"], ["🍎", "🍌"], ["⭐", "🌙"], ["🐟", "🐠"], ["🟩", "🟨"], ["🐶", "🐱"]];
const pattern: Topic = {
  key: "pattern",
  gen: (r, d) => {
    const [a, b] = pick(r, PATTERN_SETS);
    const c = pick(r, ["🟣", "🍇", "❤️", "🦆"]);
    const unit = d < 0.35 ? [a, b] : d < 0.7 ? [a, b, b] : [a, b, c];
    const seq = Array.from({ length: unit.length * 2 + 2 }, (_, i) => unit[i % unit.length]);
    const blank = seq.length - 1;
    const answer = seq[blank];
    const opts = [...new Set([a, b, c])].slice(0, 3);
    return {
      kind: "choice",
      prompt: "What comes next?",
      say: ["What comes next?"],
      visual: { type: "pattern", items: seq, blank },
      options: shuffle(r, opts.includes(answer) ? opts : [answer, ...opts.slice(0, 2)]).map((e) => ({ id: e, emoji: e })),
      answer,
      layout: "row",
      skill: unit.length === 2 ? "m:pattern:ab" : unit[1] === unit[2] ? "m:pattern:abb" : "m:pattern:abc",
    };
  },
};
const tenframe = (max: number): Topic => ({
  key: `tenframe${max}`,
  gen: (r) => {
    const n = int(r, 1, max);
    return numChoice({ r, prompt: "How many dots?", say: ["How many dots?"], visual: { type: "tenframe", n, frames: n > 10 ? 2 : 1 }, answer: n, skill: `m:tenframe:${n}`, min: 0, max: max + 1, spread: 2 });
  },
});
const bigger: Topic = {
  key: "bigger",
  gen: (r, d) => {
    const max = d < 0.5 ? 10 : 20;
    const a = int(r, 0, max);
    let b = int(r, 0, max);
    if (a === b) b = (b + 3) % (max + 1);
    const small = r() < 0.35;
    const answer = small ? Math.min(a, b) : Math.max(a, b);
    return {
      kind: "choice",
      prompt: small ? "Which number is smaller?" : "Which number is bigger?",
      say: [small ? "Which number is smaller?" : "Which number is bigger?"],
      options: [a, b].map((v) => ({ id: String(v), text: String(v), say: numKey(v) })),
      answer: String(answer),
      layout: "row",
      skill: "m:compare:numbers",
      why: `${Math.max(a, b)} is bigger than ${Math.min(a, b)}. On a number line it's further along.`,
    };
  },
};
const numberOrder = (max: number): Topic => ({
  key: `order${max}`,
  gen: (r, d) => {
    const len = d < 0.5 ? 3 : 4;
    const start = int(r, max <= 10 ? 0 : 5, max - len);
    const step = max > 30 && d > 0.6 ? 10 : 1;
    const nums = Array.from({ length: len }, (_, i) => start + i * step).filter((v) => v <= max * (step === 10 ? 10 : 1));
    return { kind: "order", prompt: "Put the numbers in order, smallest first", say: ["Put the numbers in order, smallest first."], items: nums.map((v) => ({ id: String(v), text: String(v), say: numKey(v) })), direction: "row", skill: `m:order:${max}` };
  },
});
const addPics = (max: number): Topic => ({
  key: `addpics${max}`,
  gen: (r) => {
    const a = int(r, 1, max - 1);
    const b = int(r, 1, max - a);
    return { kind: "add", emoji: thing(r), a, b, options: [a + b, ...nearNumbers(r, a + b, 2, { min: 1, max: max + 2 })].sort((x, y) => x - y), skill: `m:add:${a}+${b}` };
  },
});
function addItem(r: Rng, a: number, b: number, max: number, keypad: boolean): Activity {
  const s = a + b;
  const vis: Visual = max <= 10 ? { type: "groups", groups: [{ emoji: "🔴", n: a }, { emoji: "🔵", n: b }], op: "+" } : eq(`${a} + ${b} = ?`);
  const say = s <= 20 ? ["What is", numberWord(a), "plus", numberWord(b)] : undefined;
  const why = s > 10 && a < 10 && b < 10 ? `Make ten: ${a} + ${10 - a} = 10, then ${s - 10} more is ${s}.` : `${a} + ${b} = ${s}. Start at ${Math.max(a, b)} and count on ${Math.min(a, b)}.`;
  if (keypad) return { kind: "keypad", prompt: `${a} + ${b} = ?`, say, visual: eq(`${a} + ${b} = ?`), answer: s, why, skill: `m:add:${a}+${b}` };
  return numChoice({ r, prompt: `${a} + ${b} = ?`, say, visual: vis, answer: s, skill: `m:add:${a}+${b}`, min: 0, spread: 2, why });
}
const addFact = (max: number, keypad = false): Topic => ({
  key: `add${max}${keypad ? "k" : ""}`,
  gen: (r, d) => {
    let a: number, b: number;
    if (max > 10 && d > 0.5) {
      a = int(r, 6, 9);
      b = int(r, 10 - a + 1, 9); // crosses ten
    } else {
      a = int(r, 0, Math.min(9, max - 1));
      b = int(r, 0, Math.min(9, max - a));
    }
    return addItem(r, a, b, max, keypad);
  },
  forSkill: (skill, r) => {
    const m = /^m:add:(\d+)\+(\d+)$/.exec(skill);
    return m ? addItem(r, +m[1], +m[2], Math.max(max, +m[1] + +m[2]), keypad) : null;
  },
});
function subItem(r: Rng, a: number, b: number, keypad: boolean): Activity {
  const s = a - b;
  const vis: Visual = a <= 10 ? { type: "groups", groups: [{ emoji: "🍪", n: a }, { emoji: "🍪", n: b }], op: "-" } : eq(`${a} − ${b} = ?`);
  const say = a <= 20 ? ["What is", numberWord(a), "minus", numberWord(b)] : undefined;
  const why = `${a} − ${b} = ${s}. Count back ${b} from ${a}, or think: ${b} + ? = ${a}.`;
  if (keypad) return { kind: "keypad", prompt: `${a} − ${b} = ?`, say, visual: eq(`${a} − ${b} = ?`), answer: s, why, skill: `m:sub:${a}-${b}` };
  return numChoice({ r, prompt: `${a} − ${b} = ?`, say, visual: vis, answer: s, skill: `m:sub:${a}-${b}`, min: 0, spread: 2, why });
}
const subFact = (max: number, keypad = false): Topic => ({
  key: `sub${max}${keypad ? "k" : ""}`,
  gen: (r, d) => {
    const a = max > 10 && d > 0.4 ? int(r, 11, max) : int(r, 1, Math.min(10, max));
    const b = int(r, 0, max > 10 && a > 10 ? Math.min(9, a) : a);
    return subItem(r, a, b, keypad);
  },
  forSkill: (skill, r) => {
    const m = /^m:sub:(\d+)-(\d+)$/.exec(skill);
    return m ? subItem(r, +m[1], +m[2], keypad) : null;
  },
});
const make10: Topic = {
  key: "make10",
  gen: (r) => {
    const n = int(r, 1, 9);
    return numChoice({ r, prompt: "How many more to make 10?", say: ["How many more to make ten?"], visual: { type: "tenframe", n }, answer: 10 - n, skill: `m:make10:${n}`, min: 0, max: 10, spread: 2, why: `${n} + ${10 - n} = 10. Count the empty boxes.` });
  },
};
const teens: Topic = {
  key: "teens",
  gen: (r) => {
    const n = int(r, 11, 19);
    return numChoice({ r, prompt: "What number is this?", say: ["What number is this?"], visual: { type: "blocks", h: 0, t: 1, o: n - 10 }, answer: n, skill: `m:teen:${n}`, min: 10, max: 20, spread: 2, why: `One ten and ${n - 10} ones make ${n}.` });
  },
};
const countBy: Topic = {
  key: "countby",
  gen: (r, d) => {
    const step = d < 0.4 ? 10 : d < 0.75 ? pick(r, [2, 5, 10]) : pick(r, [2, 5, 10, 3]);
    const start = step === 10 ? int(r, 0, 4) * 10 : step * int(r, 0, 4);
    const seq = Array.from({ length: 4 }, (_, i) => start + i * step);
    const ans = start + 4 * step;
    return numChoice({ r, prompt: `Count by ${step}s: ${seq.join(", ")}, ?`, say: [`Count by ${numberWord(step)}s.`], visual: { type: "pattern", items: [...seq.map(String), "?"], blank: 4 }, answer: ans, skill: `m:skip:${step}`, min: 0, spread: step, also: [ans + 1, ans - step + 1], why: `Each jump adds ${step}: ${seq[3]} + ${step} = ${ans}.` });
  },
};
const after100: Topic = {
  key: "after100",
  gen: (r, d) => {
    const n = int(r, d < 0.5 ? 10 : 20, 98);
    const before = r() < 0.3;
    const ans = before ? n - 1 : n + 1;
    return numChoice({ r, prompt: before ? `What comes before ${n}?` : `What comes after ${n}?`, say: [before ? "What comes before," : "What comes after,", numberWord(n)], answer: ans, skill: "m:count100", min: 0, max: 100, spread: 2, also: [before ? n + 1 : n - 1, ans + 10] });
  },
};
const length: Topic = {
  key: "length",
  gen: (r) => {
    const a = int(r, 2, 8);
    let b = int(r, 2, 8);
    if (a === b) b = a + 2;
    const shorter = r() < 0.4;
    const e = pick(r, ["🐍", "🖍️", "🥖", "🐛"]);
    return {
      kind: "choice",
      prompt: shorter ? "Which one is shorter?" : "Which one is longer?",
      say: [shorter ? "Which one is shorter?" : "Which one is longer?"],
      options: [
        { id: "a", visual: { type: "ruler", length: a, emoji: e } },
        { id: "b", visual: { type: "ruler", length: b, emoji: e } },
      ],
      answer: (shorter ? a < b : a > b) ? "a" : "b",
      layout: "list",
      skill: "m:length",
    };
  },
};

// ── 1st – 2nd ─────────────────────────────────────────────────────────────────────────────────
const missingAddend: Topic = {
  key: "missing",
  gen: (r) => {
    const s = int(r, 5, 18);
    const a = int(r, 1, Math.min(9, s - 1));
    return numChoice({ r, prompt: `${a} + ? = ${s}`, visual: eq(`${a} + ? = ${s}`), answer: s - a, skill: "m:missing", min: 0, spread: 2, why: `${a} + ${s - a} = ${s}. Think: ${s} − ${a}.` });
  },
};
const placeRead = (hundreds: boolean): Topic => ({
  key: hundreds ? "place100" : "place10",
  gen: (r) => {
    const h = hundreds ? int(r, 1, 9) : 0;
    const t = int(r, hundreds ? 0 : 1, 9);
    const o = int(r, 0, 9);
    const n = h * 100 + t * 10 + o;
    return numChoice({ r, prompt: "What number do the blocks show?", say: ["What number do the blocks show?"], visual: { type: "blocks", h, t, o }, answer: n, skill: hundreds ? "m:place:hundreds" : "m:place:tens", also: [h * 100 + o * 10 + t, n + 10, n - 1].filter((v) => v !== n && v >= 0), spread: 10, why: hundreds ? `${h} hundreds, ${t} tens and ${o} ones = ${n}.` : `${t} tens and ${o} ones = ${n}.` });
  },
});
const placeBuild: Topic = {
  key: "placebuild",
  gen: (r, d) => {
    const n = d > 0.7 ? int(r, 100, 399) : int(r, 11, 99);
    return { kind: "place", target: n, hundreds: n >= 100, skill: n >= 100 ? "m:place:hundreds" : "m:place:tens" };
  },
};
const tensQ: Topic = {
  key: "tensq",
  gen: (r) => {
    const n = int(r, 21, 98);
    const askOnes = r() < 0.4;
    const ans = askOnes ? n % 10 : Math.floor(n / 10);
    return numChoice({ r, prompt: askOnes ? `How many ones are in ${n}?` : `How many tens are in ${n}?`, answer: ans, skill: "m:place:tens", min: 0, max: 9, spread: 3, also: [askOnes ? Math.floor(n / 10) : n % 10], why: `${n} is ${Math.floor(n / 10)} tens and ${n % 10} ones.` });
  },
};
const compareSign: Topic = {
  key: "comparesign",
  gen: (r, d) => {
    const big = d > 0.6 ? 999 : 99;
    const a = int(r, 10, big);
    const b = r() < 0.15 ? a : int(r, 10, big);
    const sign = a < b ? "<" : a > b ? ">" : "=";
    return { kind: "choice", prompt: `${a} ? ${b}`, visual: eq(`${a}  ?  ${b}`), options: ["<", "=", ">"].map((s) => ({ id: s, text: s })), answer: sign, layout: "row", skill: "m:compare:sign", why: a === b ? "They're the same, so =." : `${Math.max(a, b)} is bigger. The open mouth eats the bigger number.` };
  },
};
const clock = (level: "hour" | "half" | "5min"): Topic => ({
  key: `clock-${level}`,
  gen: (r) => {
    const h = int(r, 1, 12);
    const m = level === "hour" ? 0 : level === "half" ? pick(r, [0, 30]) : int(r, 0, 11) * 5;
    const fmt = (hh: number, mm: number) => `${hh}:${String(mm).padStart(2, "0")}`;
    const ans = fmt(h, m);
    const wrongs = new Set<string>();
    const nh = (h % 12) + 1;
    for (const w of [fmt(nh, m), fmt(h, (m + 30) % 60), fmt(m === 0 ? 12 : Math.max(1, Math.round(m / 5)), h * 5 % 60), fmt(h === 1 ? 12 : h - 1, m)]) if (w !== ans) wrongs.add(w);
    return textChoice({ r, prompt: "What time is it?", say: ["What time is it?"], visual: { type: "clock", h, m }, answer: ans, wrong: [...wrongs].slice(0, 2), skill: `m:time:${level}`, why: m === 0 ? `The short hand points to ${h} and the long hand to 12: ${ans}.` : `The short hand is near ${h} and the long hand shows ${m} minutes: ${ans}.` });
  },
});
const COIN_VALUE = { p: 1, n: 5, d: 10, q: 25 } as const;
const money: Topic = {
  key: "money",
  gen: (r, d) => {
    const kinds = d < 0.4 ? (["p", "n", "d"] as const) : (["p", "n", "d", "q"] as const);
    const n = int(r, 2, d < 0.5 ? 4 : 6);
    const coins = Array.from({ length: n }, () => pick(r, kinds)).sort((a, b) => COIN_VALUE[b] - COIN_VALUE[a]);
    const total = coins.reduce((s, c) => s + COIN_VALUE[c], 0);
    return numChoice({ r, prompt: "How much money?", say: ["How much money is this?"], visual: { type: "coins", coins }, answer: total, skill: "m:money", min: 1, spread: 5, fmt: (v) => `${v}¢`, why: `Count the biggest coins first: quarters are 25, dimes 10, nickels 5, pennies 1. Total ${total}¢.` });
  },
};
const fracBasic: Topic = {
  key: "fracbasic",
  gen: (r, d) => {
    const den = d < 0.4 ? pick(r, [2, 4]) : pick(r, [2, 3, 4, 6, 8]);
    const num = d < 0.4 ? 1 : int(r, 1, den - 1);
    const ans = `${num}/${den}`;
    const wrong = [...new Set([`${den - num || 1}/${den}`, `${num}/${den + 1}`, `${num + 1}/${den}`, `1/${num + 1}`].filter((x) => x !== ans && !x.startsWith("0/")))].slice(0, 2);
    return textChoice({ r, prompt: "What part is colored?", say: ["What part is colored?"], visual: { type: "fraction", num, den, shape: pick(r, ["pie", "bar"]) }, answer: ans, wrong, skill: "m:frac:basic", why: `${num} of ${den} equal parts are colored: ${ans}.` });
  },
};
const SIDES: [ShapeName, number][] = [["triangle", 3], ["square", 4], ["rectangle", 4], ["pentagon", 5], ["hexagon", 6], ["circle", 0]];
const sides: Topic = {
  key: "sides",
  gen: (r) => {
    const [s, n] = pick(r, SIDES);
    return numChoice({ r, prompt: `How many sides does a ${s} have?`, say: ["How many sides?"], visual: { type: "shape", shape: s, color: pick(r, COLORS) }, answer: n, skill: "m:shape:sides", min: 0, max: 8, spread: 2, why: n ? `Count each straight side: a ${s} has ${n}.` : "A circle is round — it has no straight sides." });
  },
};
const NAMES = ["Mia", "Leo", "Ava", "Sam", "Zoe", "Max", "Lily", "Ben", "Nora", "Eli"];
const story = (max: number, ops: ("+" | "-")[]): Topic => ({
  key: `story${max}${ops.join("")}`,
  gen: (r) => {
    const who = pick(r, NAMES);
    const op = pick(r, ops);
    const e = pick(r, ["shells", "stickers", "apples", "fish", "marbles", "cookies"]);
    const a = int(r, 2, max - 1);
    const b = op === "+" ? int(r, 1, max - a) : int(r, 1, a - 1);
    const ans = op === "+" ? a + b : a - b;
    const text =
      op === "+"
        ? pick(r, [`${who} has ${a} ${e}. ${who} gets ${b} more. How many ${e} now?`, `There are ${a} ${e} in a box and ${b} on the table. How many in all?`])
        : pick(r, [`${who} has ${a} ${e} and gives away ${b}. How many are left?`, `${a} ${e} were in a jar. ${b} were eaten. How many are left?`]);
    return numChoice({ r, prompt: text, visual: { type: "groups", groups: op === "+" ? [{ emoji: "🔵", n: Math.min(a, 12) }, { emoji: "🟢", n: Math.min(b, 12) }] : [{ emoji: "🔵", n: Math.min(a, 12) }, { emoji: "🔵", n: Math.min(b, 12) }], op }, answer: ans, skill: op === "+" ? "m:story:add" : "m:story:sub", min: 0, spread: 3, why: `${a} ${op} ${b} = ${ans}.` });
  },
});
const add100 = (keypad: boolean): Topic => ({
  key: "add100",
  gen: (r, d) => {
    const a = int(r, 12, 79);
    const b = d < 0.4 ? int(r, 1, 9) : int(r, 11, 99 - a);
    const s = a + b;
    const why = `Add tens, then ones: ${Math.floor(a / 10) * 10} + ${Math.floor(b / 10) * 10} = ${Math.floor(a / 10) * 10 + Math.floor(b / 10) * 10}, and ${a % 10} + ${b % 10} = ${(a % 10) + (b % 10)}. Total ${s}.`;
    return keypad ? { kind: "keypad", prompt: `${a} + ${b} = ?`, visual: eq(`${a} + ${b} = ?`), answer: s, why, skill: "m:add2d" } : numChoice({ r, prompt: `${a} + ${b} = ?`, visual: eq(`${a} + ${b} = ?`), answer: s, skill: "m:add2d", spread: 10, also: [s - 10, s + 1], why });
  },
});
const sub100 = (keypad: boolean): Topic => ({
  key: "sub100",
  gen: (r, d) => {
    const a = int(r, 30, 99);
    const b = d < 0.4 ? int(r, 1, 9) : int(r, 11, a - 5);
    const s = a - b;
    const why = `Check by adding back: ${s} + ${b} = ${a}.`;
    return keypad ? { kind: "keypad", prompt: `${a} − ${b} = ?`, visual: eq(`${a} − ${b} = ?`), answer: s, why, skill: "m:sub2d" } : numChoice({ r, prompt: `${a} − ${b} = ?`, visual: eq(`${a} − ${b} = ?`), answer: s, skill: "m:sub2d", spread: 10, also: [s + 10, s - 1], why });
  },
});
const arrays: Topic = {
  key: "arrays",
  gen: (r) => {
    const rows = int(r, 2, 5);
    const cols = int(r, 2, 6);
    return numChoice({ r, prompt: "How many in all?", say: ["How many in all?"], visual: { type: "array", rows, cols, emoji: thing(r) }, answer: rows * cols, skill: "m:array", spread: 3, also: [rows + cols], why: `${rows} rows of ${cols} is ${rows} × ${cols} = ${rows * cols}.` });
  },
};
const evenOdd: Topic = {
  key: "evenodd",
  gen: (r) => {
    const nums = pickN(r, Array.from({ length: 30 }, (_, i) => i + 1), 6);
    return { kind: "sort", prompt: "Sort the numbers: even or odd?", say: ["Sort the numbers. Even, or odd?"], bins: [{ id: "even", label: "Even" }, { id: "odd", label: "Odd" }], items: nums.map((n) => ({ id: String(n), text: String(n), bin: n % 2 ? "odd" : "even" })), skill: "m:evenodd" };
  },
};
const rounding = (to: 10 | 100): Topic => ({
  key: `round${to}`,
  gen: (r) => {
    const n = to === 10 ? int(r, 11, 99) : int(r, 110, 990);
    const ans = Math.round(n / to) * to;
    const other = ans === Math.floor(n / to) * to ? ans + to : ans - to;
    return numChoice({ r, prompt: `Round ${n} to the nearest ${to}`, answer: ans, skill: `m:round:${to}`, also: [other, n], spread: to, why: `${n} is closer to ${ans} than to ${other}${n % to === to / 2 ? " (halfway rounds up)" : ""}.` });
  },
});

// ── 3rd – 5th ─────────────────────────────────────────────────────────────────────────────────
function mulItem(r: Rng, x: number, y: number, keypad: boolean): Activity {
  const p = x * y;
  const skill = `m:mul:${Math.min(x, y)}x${Math.max(x, y)}`;
  const why = `${x} × ${y} = ${p}. That's ${y} groups of ${x}${x <= 10 && y <= 5 ? ` (${Array.from({ length: y }, () => x).join(" + ")})` : ""}.`;
  if (keypad) return { kind: "keypad", prompt: `${x} × ${y} = ?`, visual: eq(`${x} × ${y} = ?`), answer: p, why, skill };
  return numChoice({ r, prompt: `${x} × ${y} = ?`, visual: eq(`${x} × ${y} = ?`), answer: p, skill, spread: Math.max(2, Math.min(x, y)), also: [p + x, p - y, x + y].filter((v) => v > 0 && v !== p), why });
}
const mulFact = (tables: number[], keypad = false): Topic => ({
  key: `mul${tables.join("-")}${keypad ? "k" : ""}`,
  gen: (r) => {
    const a = pick(r, tables);
    const b = int(r, 1, 12);
    const [x, y] = r() < 0.5 ? [a, b] : [b, a];
    return mulItem(r, x, y, keypad);
  },
  forSkill: (skill, r) => {
    const m = /^m:mul:(\d+)x(\d+)$/.exec(skill);
    if (!m) return null;
    const [x, y] = r() < 0.5 ? [+m[1], +m[2]] : [+m[2], +m[1]];
    return mulItem(r, x, y, keypad);
  },
});
const mulArray: Topic = {
  key: "mularray",
  gen: (r) => {
    const rows = int(r, 2, 5);
    const cols = int(r, 2, 6);
    const ans = `${rows} × ${cols}`;
    return textChoice({ r, prompt: "Which multiplication matches?", visual: { type: "array", rows, cols, emoji: thing(r) }, answer: ans, wrong: [`${rows} + ${cols}`, `${rows} × ${cols + 1}`], skill: "m:mul:array", why: `${rows} rows with ${cols} in each row: ${rows} × ${cols}.` });
  },
};
function divItem(r: Rng, n: number, d: number, keypad: boolean): Activity {
  const q = n / d;
  const why = `${n} ÷ ${d} = ${q} because ${d} × ${q} = ${n}.`;
  if (keypad) return { kind: "keypad", prompt: `${n} ÷ ${d} = ?`, visual: eq(`${n} ÷ ${d} = ?`), answer: q, why, skill: `m:div:${n}/${d}` };
  return numChoice({ r, prompt: `${n} ÷ ${d} = ?`, visual: d <= 5 && q <= 6 ? { type: "array", rows: d, cols: q, emoji: thing(r) } : eq(`${n} ÷ ${d} = ?`), answer: q, skill: `m:div:${n}/${d}`, min: 1, spread: 2, why });
}
const divFact = (tables: number[], keypad = false): Topic => ({
  key: `div${tables.join("-")}${keypad ? "k" : ""}`,
  gen: (r) => {
    const d = pick(r, tables);
    const q = int(r, 1, 10);
    return divItem(r, d * q, d, keypad);
  },
  forSkill: (skill, r) => {
    const m = /^m:div:(\d+)\/(\d+)$/.exec(skill);
    return m ? divItem(r, +m[1], +m[2], keypad) : null;
  },
});
const fracLine: Topic = {
  key: "fracline",
  gen: (r) => {
    const den = pick(r, [2, 3, 4, 6, 8]);
    const num = int(r, 1, den - 1);
    const ans = `${num}/${den}`;
    return textChoice({ r, prompt: "What fraction is the dot on?", visual: { type: "numberline", min: 0, max: 1, step: 1 / den, ask: num / den }, answer: ans, wrong: [`${num + 1 > den ? num - 1 : num + 1}/${den}`, `${num}/${den + 2}`].filter((x) => x !== ans), skill: "m:frac:line", why: `The line from 0 to 1 is cut into ${den} equal parts. The dot is ${num} parts along: ${ans}.` });
  },
};
const fracCompareSame: Topic = {
  key: "fraccmp1",
  gen: (r) => {
    const den = pick(r, [4, 5, 6, 8]);
    const a = int(r, 1, den - 1);
    let b = int(r, 1, den - 1);
    if (a === b) b = a === 1 ? 2 : a - 1;
    const ans = `${Math.max(a, b)}/${den}`;
    return {
      kind: "choice",
      prompt: "Which fraction is bigger?",
      options: [a, b].map((x) => ({ id: `${x}/${den}`, text: `${x}/${den}`, visual: { type: "fraction", num: x, den, shape: "pie" } as Visual })),
      answer: ans,
      layout: "row",
      skill: "m:frac:compare",
      why: `Same size pieces (${den}ths), so more pieces is bigger: ${ans}.`,
    };
  },
};
const area: Topic = {
  key: "area",
  gen: (r) => {
    const w = int(r, 2, 6);
    const h = int(r, 2, 5);
    const fill: [number, number][] = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) fill.push([x, y]);
    return numChoice({ r, prompt: "What is the area? (count the squares)", visual: { type: "grid", cols: 7, rows: 6, fill }, answer: w * h, skill: "m:area", spread: 3, also: [2 * (w + h)], why: `${h} rows of ${w} squares: ${h} × ${w} = ${w * h} square units.` });
  },
};
const perimeter: Topic = {
  key: "perimeter",
  gen: (r) => {
    const w = int(r, 2, 12);
    const h = int(r, 2, 9);
    return { kind: "keypad", prompt: `A rectangle is ${w} cm long and ${h} cm wide. What is its perimeter?`, visual: eq(`${w} + ${h} + ${w} + ${h} = ?`), answer: 2 * (w + h), unit: "cm", why: `Perimeter is all the way around: ${w} + ${h} + ${w} + ${h} = ${2 * (w + h)} cm.`, skill: "m:perimeter" };
  },
};
const mul2x1: Topic = {
  key: "mul2x1",
  gen: (r) => {
    const a = int(r, 12, 89);
    const b = int(r, 2, 9);
    return { kind: "keypad", prompt: `${a} × ${b} = ?`, visual: eq(`${a} × ${b} = ?`), answer: a * b, why: `Split it: ${Math.floor(a / 10) * 10} × ${b} = ${Math.floor(a / 10) * 10 * b} and ${a % 10} × ${b} = ${(a % 10) * b}. Add: ${a * b}.`, skill: "m:mul2x1" };
  },
};
const mul2x2: Topic = {
  key: "mul2x2",
  gen: (r) => {
    const a = int(r, 11, 49);
    const b = int(r, 11, 29);
    return { kind: "keypad", prompt: `${a} × ${b} = ?`, visual: eq(`${a} × ${b} = ?`), answer: a * b, why: `${a} × ${Math.floor(b / 10) * 10} = ${a * Math.floor(b / 10) * 10}, plus ${a} × ${b % 10} = ${a * (b % 10)}. Total ${a * b}.`, skill: "m:mul2x2" };
  },
};
const factors: Topic = {
  key: "factors",
  gen: (r, d) => {
    const n = pick(r, d < 0.5 ? [12, 16, 18, 20, 24] : [24, 30, 36, 42, 48, 56, 60]);
    const fs = Array.from({ length: n }, (_, i) => i + 1).filter((x) => n % x === 0 && x > 1 && x < n);
    const ans = pick(r, fs);
    const non = Array.from({ length: 12 }, (_, i) => i + 2).filter((x) => n % x !== 0);
    return { kind: "choice", prompt: `Which number is a factor of ${n}?`, options: shuffle(r, [ans, ...pickN(r, non, 2)]).map((v) => ({ id: String(v), text: String(v) })), answer: String(ans), layout: "row", skill: "m:factors", why: `${ans} × ${n / ans} = ${n}, so ${ans} is a factor of ${n}.` };
  },
};
const multiples: Topic = {
  key: "multiples",
  gen: (r) => {
    const n = int(r, 3, 9);
    const ans = n * int(r, 3, 9);
    const wrong = nearNumbers(r, ans, 2, { min: 2, spread: n - 1 }).filter((v) => v % n !== 0);
    while (wrong.length < 2) wrong.push(ans + 1 + wrong.length);
    return { kind: "choice", prompt: `Which number is a multiple of ${n}?`, options: shuffle(r, [ans, ...wrong]).map((v) => ({ id: String(v), text: String(v) })), answer: String(ans), layout: "row", skill: "m:multiples", why: `${ans} = ${n} × ${ans / n}, so it's a multiple of ${n}.` };
  },
};
const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];
const prime: Topic = {
  key: "prime",
  gen: (r) => {
    const ans = pick(r, PRIMES.slice(2));
    const comps = [4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 22, 25, 27, 33, 35, 39];
    return { kind: "choice", prompt: "Which number is prime?", options: shuffle(r, [ans, ...pickN(r, comps, 2)]).map((v) => ({ id: String(v), text: String(v) })), answer: String(ans), layout: "row", skill: "m:prime", why: `${ans} can only be divided by 1 and itself.` };
  },
};
const longDiv: Topic = {
  key: "longdiv",
  gen: (r) => {
    const d = int(r, 3, 9);
    const q = int(r, 11, 29);
    const rem = int(r, 0, d - 1);
    const n = d * q + rem;
    const fmt = (qq: number, rr: number) => (rr ? `${qq} R${rr}` : `${qq}`);
    const ans = fmt(q, rem);
    const wrong = [fmt(q + 1, rem), fmt(q, (rem + 1) % d), fmt(q - 1, rem)].filter((x) => x !== ans).slice(0, 2);
    return textChoice({ r, prompt: `${n} ÷ ${d} = ?`, visual: eq(`${n} ÷ ${d} = ?`), answer: ans, wrong, skill: "m:div:remainder", why: `${d} × ${q} = ${d * q}, and ${n} − ${d * q} = ${rem} left over: ${ans}.` });
  },
};
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const fracEquiv: Topic = {
  key: "fracequiv",
  gen: (r) => {
    const den = pick(r, [2, 3, 4, 5]);
    const num = int(r, 1, den - 1);
    const k = int(r, 2, 4);
    const ans = `${num * k}/${den * k}`;
    const wrong = [`${num + k}/${den + k}`, `${num * k}/${den * k + 1}`, `${num}/${den * k}`].filter((x) => x !== ans).slice(0, 2);
    return textChoice({ r, prompt: `Which fraction equals ${num}/${den}?`, visual: { type: "fraction", num, den, shape: "bar" }, answer: ans, wrong, skill: "m:frac:equiv", why: `Multiply the top and bottom by ${k}: ${num}/${den} = ${ans}.` });
  },
};
const fracCompare2: Topic = {
  key: "fraccmp2",
  gen: (r) => {
    const pairs: [number, number, number, number][] = [[1, 2, 1, 3], [2, 3, 3, 4], [3, 5, 1, 2], [3, 8, 1, 2], [2, 5, 1, 3], [5, 6, 3, 4], [1, 4, 2, 6], [4, 5, 7, 10]];
    const [a, b, c, d] = pick(r, pairs);
    const big = a / b > c / d ? `${a}/${b}` : `${c}/${d}`;
    return {
      kind: "choice",
      prompt: "Which fraction is bigger?",
      options: shuffle(r, [[a, b], [c, d]]).map(([x, y]) => ({ id: `${x}/${y}`, text: `${x}/${y}`, visual: { type: "fraction", num: x, den: y, shape: "bar" } as Visual })),
      answer: big,
      layout: "row",
      skill: "m:frac:compare2",
      why: `Compare with a common denominator: ${a}/${b} = ${(a * d) / gcd(b, d)}/${(b * d) / gcd(b, d)} and ${c}/${d} = ${(c * b) / gcd(b, d)}/${(b * d) / gcd(b, d)}.`,
    };
  },
};
const fracAddLike: Topic = {
  key: "fracaddlike",
  gen: (r) => {
    const den = pick(r, [5, 6, 8, 10, 12]);
    const a = int(r, 1, den - 2);
    const b = int(r, 1, den - a - 1);
    const sub = r() < 0.35;
    const [x, y] = sub ? [a + b, b] : [a, b];
    const ans = `${sub ? x - y : x + y}/${den}`;
    const wrong = [`${sub ? x - y : x + y}/${den * 2}`, `${(sub ? x - y : x + y) + 1}/${den}`].filter((w) => w !== ans);
    return textChoice({ r, prompt: `${x}/${den} ${sub ? "−" : "+"} ${y}/${den} = ?`, visual: eq(`${x}/${den} ${sub ? "−" : "+"} ${y}/${den}`), answer: ans, wrong, skill: sub ? "m:frac:sublike" : "m:frac:addlike", why: `Same denominator: just ${sub ? "subtract" : "add"} the tops. The bottom stays ${den}.` });
  },
};
const mixed: Topic = {
  key: "mixed",
  gen: (r) => {
    const den = pick(r, [2, 3, 4, 5]);
    const whole = int(r, 1, 3);
    const num = int(r, 1, den - 1);
    const imp = whole * den + num;
    const ans = `${whole} ${num}/${den}`;
    return textChoice({ r, prompt: `Write ${imp}/${den} as a mixed number`, visual: eq(`${imp}/${den}`), answer: ans, wrong: [`${whole + 1} ${num}/${den}`, `${num} ${whole}/${den}`].filter((w) => w !== ans), skill: "m:frac:mixed", why: `${imp} ÷ ${den} = ${whole} remainder ${num}: ${ans}.` });
  },
};
const decimals: Topic = {
  key: "decimals",
  gen: (r, d) => {
    if (d < 0.5) {
      const t = int(r, 1, 9);
      return textChoice({ r, prompt: `Which decimal equals ${t}/10?`, visual: { type: "fraction", num: t, den: 10, shape: "bar" }, answer: `0.${t}`, wrong: [`0.0${t}`, `${t}.0`], skill: "m:dec:tenths", why: `${t} tenths is written 0.${t}.` });
    }
    const a = int(r, 1, 99) / 100;
    let b = int(r, 1, 9) / 10;
    if (Math.abs(a - b) < 0.001) b += 0.1;
    const fa = a.toFixed(2).replace(/0$/, "");
    const fb = b.toFixed(1);
    return { kind: "choice", prompt: "Which is bigger?", options: shuffle(r, [fa, fb]).map((x) => ({ id: x, text: x })), answer: a > b ? fa : fb, layout: "row", skill: "m:dec:compare", why: `Line up the places: ${a.toFixed(2)} vs ${b.toFixed(2)}.` };
  },
};
const PLACES = ["ones", "tens", "hundreds", "thousands", "ten thousands", "hundred thousands", "millions"];
const placeBig: Topic = {
  key: "placebig",
  gen: (r) => {
    const digits = Array.from({ length: 7 }, (_, i) => (i === 0 ? int(r, 1, 9) : int(r, 0, 9)));
    const n = Number(digits.join(""));
    const p = int(r, 1, 6);
    const ans = digits[6 - p];
    return numChoice({ r, prompt: `In ${n.toLocaleString("en-US")}, which digit is in the ${PLACES[p]} place?`, answer: ans, skill: "m:place:big", min: 0, max: 9, spread: 4, also: [digits[5 - p] ?? 0, digits[7 - p] ?? 0].filter((v) => v !== ans), why: `Count places from the right: ones, tens, hundreds… The ${PLACES[p]} digit is ${ans}.` });
  },
};
const angles: Topic = {
  key: "angles",
  gen: (r) => {
    const deg = pick(r, [30, 45, 60, 90, 90, 120, 135, 150]);
    const ans = deg < 90 ? "acute" : deg === 90 ? "right" : "obtuse";
    return { kind: "choice", prompt: "What kind of angle is this?", visual: { type: "angle", deg }, options: ["acute", "right", "obtuse"].map((t) => ({ id: t, text: t })), answer: ans, layout: "row", skill: "m:angle:type", why: deg < 90 ? "Smaller than a square corner: acute." : deg === 90 ? "A perfect square corner: right angle (90°)." : "Wider than a square corner: obtuse." };
  },
};
const lines: Topic = {
  key: "lines",
  gen: (r) => {
    const kind = pick(r, ["parallel", "perpendicular", "intersecting"] as const);
    return { kind: "choice", prompt: "What kind of lines are these?", visual: { type: "lines", kind }, options: ["parallel", "perpendicular", "intersecting"].map((t) => ({ id: t, text: t })), answer: kind, layout: "row", skill: "m:lines", why: kind === "parallel" ? "They never meet — always the same distance apart." : kind === "perpendicular" ? "They cross at a square corner (90°)." : "They cross, but not at a square corner." };
  },
};
const areaFormula: Topic = {
  key: "areaformula",
  gen: (r) => {
    const w = int(r, 4, 15);
    const h = int(r, 3, 12);
    return { kind: "keypad", prompt: `A rug is ${w} ft by ${h} ft. What is its area?`, visual: eq(`${w} × ${h} = ?`), answer: w * h, unit: "sq ft", why: `Area = length × width = ${w} × ${h} = ${w * h} square feet.`, skill: "m:area:formula" };
  },
};
const multiStep: Topic = {
  key: "multistep",
  gen: (r) => {
    const who = pick(r, NAMES);
    const packs = int(r, 3, 8);
    const per = int(r, 4, 12);
    const extra = int(r, 2, 15);
    const give = r() < 0.5;
    const ans = packs * per + (give ? -extra : extra);
    const text = give ? `${who} buys ${packs} packs of ${per} cards and gives away ${extra}. How many cards are left?` : `${who} has ${packs} boxes of ${per} crayons and finds ${extra} more. How many crayons in all?`;
    return { kind: "keypad", prompt: text, answer: ans, why: `${packs} × ${per} = ${packs * per}, then ${give ? `− ${extra}` : `+ ${extra}`} = ${ans}.`, skill: "m:story:multi" };
  },
};
const fracUnlike: Topic = {
  key: "fracunlike",
  gen: (r) => {
    const opts: [number, number, number, number][] = [[1, 2, 1, 3], [1, 2, 1, 4], [1, 3, 1, 4], [2, 3, 1, 6], [1, 4, 3, 8], [1, 2, 2, 5], [3, 4, 1, 8]];
    const [a, b, c, d] = pick(r, opts);
    const L = (b * d) / gcd(b, d);
    const num = a * (L / b) + c * (L / d);
    const g = gcd(num, L);
    const ans = `${num / g}/${L / g}`;
    return textChoice({ r, prompt: `${a}/${b} + ${c}/${d} = ?`, visual: eq(`${a}/${b} + ${c}/${d}`), answer: ans, wrong: [`${a + c}/${b + d}`, `${num}/${L + 1}`].filter((w) => w !== ans), skill: "m:frac:unlike", why: `Use a common denominator ${L}: ${a * (L / b)}/${L} + ${c * (L / d)}/${L} = ${num}/${L}${g > 1 ? ` = ${ans}` : ""}.` });
  },
};
const fracWhole: Topic = {
  key: "fracwhole",
  gen: (r) => {
    const w = int(r, 2, 6);
    const den = pick(r, [3, 4, 5, 8]);
    const num = int(r, 1, den - 1);
    const ans = `${w * num}/${den}`;
    return textChoice({ r, prompt: `${w} × ${num}/${den} = ?`, visual: eq(`${w} × ${num}/${den}`), answer: ans, wrong: [`${w * num}/${w * den}`, `${num}/${w * den}`], skill: "m:frac:mulwhole", why: `${w} groups of ${num}/${den} = ${w * num}/${den}.` });
  },
};
const decAdd: Topic = {
  key: "decadd",
  gen: (r) => {
    const a = int(r, 11, 99) / 10;
    const b = int(r, 11, 99) / 100;
    const s = Math.round((a + b) * 100) / 100;
    const f = (x: number) => x.toFixed(2);
    return textChoice({ r, prompt: `${a.toFixed(1)} + ${b.toFixed(2)} = ?`, visual: eq(`${a.toFixed(1)} + ${b.toFixed(2)}`), answer: f(s), wrong: [f(Math.round((a * 10 + b * 100) / 10) / 10 / 10 + 0.01 + a), f(s + 0.1)].filter((w) => w !== f(s)).slice(0, 2), skill: "m:dec:add", why: `Line up the decimal points: ${a.toFixed(2)} + ${b.toFixed(2)} = ${f(s)}.` });
  },
};
const volume: Topic = {
  key: "volume",
  gen: (r) => {
    const l = int(r, 2, 6);
    const w = int(r, 2, 5);
    const h = int(r, 2, 4);
    return { kind: "keypad", prompt: `A box is ${l} × ${w} × ${h} cubes. What is its volume?`, visual: eq(`${l} × ${w} × ${h} = ?`), answer: l * w * h, unit: "cubes", why: `Volume = length × width × height = ${l * w * h} cubic units.`, skill: "m:volume" };
  },
};
const orderOps: Topic = {
  key: "orderops",
  gen: (r) => {
    const a = int(r, 2, 9);
    const b = int(r, 2, 9);
    const c = int(r, 2, 6);
    const paren = r() < 0.4;
    const ans = paren ? (a + b) * c : a + b * c;
    const wrong = paren ? a + b * c : (a + b) * c;
    const text = paren ? `(${a} + ${b}) × ${c}` : `${a} + ${b} × ${c}`;
    return numChoice({ r, prompt: `${text} = ?`, visual: eq(`${text} = ?`), answer: ans, skill: "m:orderops", also: [wrong], spread: 4, why: paren ? "Parentheses first, then multiply." : `Multiply before adding: ${b} × ${c} = ${b * c}, then + ${a}.` });
  },
};
const coords: Topic = {
  key: "coords",
  gen: (r) => {
    const x = int(r, 0, 6);
    const y = int(r, 0, 5);
    const ans = `(${x}, ${y})`;
    return textChoice({ r, prompt: "What are the coordinates of the dot?", visual: { type: "grid", cols: 7, rows: 6, point: [x, y], axes: true }, answer: ans, wrong: [`(${y}, ${x})`, `(${x + 1}, ${y})`].filter((w) => w !== ans).slice(0, 2), skill: "m:coords", why: `Go across first (x = ${x}), then up (y = ${y}): ${ans}.` });
  },
};

// ── The voyage ────────────────────────────────────────────────────────────────────────────────
const WORLDS: WorldDef[] = [
  // Pre-K
  { id: "count5", title: "Counting Cove", emoji: "🖐️", grade: "prek", blurb: "Count things one by one, up to 5.", stages: [
    { title: "Count with me", emoji: "🐟", topics: [count(3), count(5)], levels: 2 },
    { title: "Fill the net", emoji: "🥅", topics: [make(5), count(5)], levels: 2 },
    { title: "Find the number", emoji: "🔢", topics: [numeral(5), count(5)], levels: 2 },
  ] },
  { id: "shapes", title: "Shape Shore", emoji: "🔺", grade: "prek", blurb: "Circles, squares, triangles and more.", stages: [
    { title: "Shape hunt", emoji: "⭕", topics: [shapes(["circle", "square", "triangle"]), shapeLife(["circle", "square", "triangle"])], levels: 2 },
    { title: "More shapes", emoji: "⭐", topics: [shapes(["circle", "square", "triangle", "rectangle", "star", "heart"]), shapeLife(["circle", "square", "triangle", "rectangle", "star", "heart"])], levels: 2 },
    { title: "Shape masters", emoji: "🔷", topics: [shapes(SHAPES_2D)], levels: 1 },
  ] },
  { id: "compare", title: "More-or-Less Lagoon", emoji: "⚖️", grade: "prek", blurb: "Which has more? What comes next?", stages: [
    { title: "More or fewer", emoji: "🍎", topics: [moreFewer], levels: 2 },
    { title: "Patterns", emoji: "🔴", topics: [pattern], levels: 2 },
    { title: "Mix it up", emoji: "🎲", topics: [moreFewer, pattern, count(5)], levels: 1 },
  ] },
  // Kindergarten
  { id: "count10", title: "Ten Frame Reef", emoji: "🔟", grade: "k", blurb: "Count, see and build numbers to 10.", stages: [
    { title: "Count to 10", emoji: "🐠", topics: [count(10, 5)], levels: 2 },
    { title: "Ten frames", emoji: "🟡", topics: [tenframe(10)], levels: 2 },
    { title: "Numbers to 10", emoji: "🔢", topics: [numeral(10), make(10, 5)], levels: 2 },
  ] },
  { id: "numsense", title: "Number Line Islands", emoji: "📏", grade: "k", blurb: "Bigger, smaller, and putting numbers in order.", stages: [
    { title: "Bigger or smaller", emoji: "🐳", topics: [bigger], levels: 2 },
    { title: "Number order", emoji: "🪜", topics: [numberOrder(10)], levels: 2 },
    { title: "Number sense", emoji: "🧠", topics: [bigger, numberOrder(20), moreFewer], levels: 1 },
  ] },
  { id: "add5", title: "Adding Atoll", emoji: "➕", grade: "k", blurb: "Put groups together and count them all.", stages: [
    { title: "Push them together", emoji: "👐", topics: [addPics(5)], levels: 2 },
    { title: "Adding to 5", emoji: "➕", topics: [addFact(5)], levels: 2 },
    { title: "Adding to 10", emoji: "🧮", topics: [addPics(10), addFact(10)], levels: 2 },
  ] },
  { id: "sub5", title: "Take-Away Tide", emoji: "➖", grade: "k", blurb: "Some swim away — how many are left?", stages: [
    { title: "Take away to 5", emoji: "🍪", topics: [subFact(5)], levels: 2 },
    { title: "Take away to 10", emoji: "🐟", topics: [subFact(10)], levels: 2 },
    { title: "Plus or minus", emoji: "🔀", topics: [addFact(10), subFact(10)], levels: 2 },
  ] },
  { id: "make10", title: "Make-Ten Marina", emoji: "🧩", grade: "k", blurb: "Pairs that make 10 — the secret to fast math.", stages: [
    { title: "Make 10", emoji: "🔟", topics: [make10], levels: 3 },
    { title: "Ten friends", emoji: "🤝", topics: [make10, addFact(10)], levels: 2 },
  ] },
  { id: "teens", title: "Hundred Harbor", emoji: "💯", grade: "k", blurb: "Teen numbers, counting by tens, and on to 100.", stages: [
    { title: "Teen numbers", emoji: "🧱", topics: [teens], levels: 2 },
    { title: "Count by tens", emoji: "🔟", topics: [countBy], levels: 2 },
    { title: "What comes next?", emoji: "➡️", topics: [after100], levels: 2 },
  ] },
  { id: "measure", title: "Measure Mountain", emoji: "📐", grade: "k", blurb: "Longer, shorter — and solid shapes.", stages: [
    { title: "Longer or shorter", emoji: "🐍", topics: [length], levels: 2 },
    { title: "Solid shapes", emoji: "🧊", topics: [shapes(["cube", "sphere", "cone", "cylinder"])], levels: 2 },
  ] },
  // 1st grade
  { id: "facts20", title: "Fact Falls", emoji: "⚡", grade: "1", blurb: "Addition facts to 20 — doubles and making ten.", stages: [
    { title: "Facts to 10", emoji: "➕", topics: [addFact(10, true)], levels: 2 },
    { title: "Make ten to add", emoji: "🔟", topics: [addFact(20)], levels: 2 },
    { title: "Facts to 20", emoji: "⚡", topics: [addFact(20, true)], levels: 2 },
  ] },
  { id: "sub20", title: "Subtraction Strait", emoji: "➖", grade: "1", blurb: "Subtract to 20 and find the missing number.", stages: [
    { title: "Subtract to 20", emoji: "➖", topics: [subFact(20)], levels: 2 },
    { title: "Missing numbers", emoji: "❓", topics: [missingAddend], levels: 2 },
    { title: "Fact families", emoji: "👨‍👩‍👧", topics: [addFact(20, true), subFact(20, true)], levels: 2 },
  ] },
  { id: "place10", title: "Tens-and-Ones Town", emoji: "🧱", grade: "1", blurb: "Tens and ones — what numbers are made of.", stages: [
    { title: "Read the blocks", emoji: "🧱", topics: [placeRead(false)], levels: 2 },
    { title: "Build it", emoji: "🏗️", topics: [placeBuild], levels: 2 },
    { title: "Tens or ones?", emoji: "🔟", topics: [tensQ, placeRead(false)], levels: 2 },
  ] },
  { id: "compare2", title: "Gator Gulf", emoji: "🐊", grade: "1", blurb: "Greater than, less than, equal.", stages: [
    { title: "Hungry gator", emoji: "🐊", topics: [compareSign], levels: 3 },
    { title: "In order", emoji: "🪜", topics: [numberOrder(100), compareSign], levels: 2 },
  ] },
  { id: "time", title: "Clocktower Key", emoji: "🕐", grade: "1", blurb: "Tell time and count coins.", stages: [
    { title: "O'clock", emoji: "🕐", topics: [clock("hour")], levels: 2 },
    { title: "Half past", emoji: "🕧", topics: [clock("half")], levels: 2 },
    { title: "Coins", emoji: "🪙", topics: [money], levels: 2 },
  ] },
  { id: "fractions1", title: "Pizza Pier", emoji: "🍕", grade: "1", blurb: "Halves, fourths — and shapes' sides.", stages: [
    { title: "Halves and fourths", emoji: "🍕", topics: [fracBasic], levels: 2 },
    { title: "Sides and corners", emoji: "🔷", topics: [sides], levels: 2 },
  ] },
  { id: "story20", title: "Story Sea", emoji: "📖", grade: "1", blurb: "Math stories: what's happening, and how many?", stages: [
    { title: "Adding stories", emoji: "🐚", topics: [story(20, ["+"])], levels: 2 },
    { title: "Taking-away stories", emoji: "🍪", topics: [story(20, ["-"])], levels: 2 },
    { title: "Mixed stories", emoji: "📚", topics: [story(20, ["+", "-"])], levels: 2 },
  ] },
  // 2nd grade
  { id: "add100", title: "Big-Number Bay", emoji: "🔢", grade: "2", blurb: "Add and subtract within 100.", stages: [
    { title: "Add within 100", emoji: "➕", topics: [add100(false)], levels: 2 },
    { title: "Subtract within 100", emoji: "➖", topics: [sub100(false)], levels: 2 },
    { title: "Solve it", emoji: "⌨️", topics: [add100(true), sub100(true)], levels: 2 },
  ] },
  { id: "skip", title: "Skip-Count Springs", emoji: "🐸", grade: "2", blurb: "Count by 2s, 5s and 10s; arrays; even and odd.", stages: [
    { title: "Skip counting", emoji: "🐸", topics: [countBy], levels: 2 },
    { title: "Arrays", emoji: "🔲", topics: [arrays], levels: 2 },
    { title: "Even or odd", emoji: "⚖️", topics: [evenOdd], levels: 2 },
  ] },
  { id: "place100", title: "Hundreds Hideout", emoji: "🏰", grade: "2", blurb: "Hundreds, money and time to 5 minutes.", stages: [
    { title: "Hundreds", emoji: "💯", topics: [placeRead(true)], levels: 2 },
    { title: "Money math", emoji: "💰", topics: [money], levels: 2 },
    { title: "Time to 5 minutes", emoji: "⏰", topics: [clock("5min")], levels: 2 },
  ] },
  // 3rd grade
  { id: "times1", title: "Times Table Tropics", emoji: "✖️", grade: "3", blurb: "Multiply by 2, 3, 4, 5 and 10.", stages: [
    { title: "Groups of", emoji: "🔲", topics: [mulArray, arrays], levels: 2 },
    { title: "2s, 5s, 10s", emoji: "✋", topics: [mulFact([2, 5, 10])], levels: 2 },
    { title: "3s and 4s", emoji: "🍀", topics: [mulFact([3, 4])], levels: 2 },
  ] },
  { id: "divide1", title: "Sharing Shoals", emoji: "➗", grade: "3", blurb: "Divide by sharing, and fractions on a line.", stages: [
    { title: "Fair shares", emoji: "🍪", topics: [divFact([2, 3, 4, 5])], levels: 2 },
    { title: "Fractions on a line", emoji: "📏", topics: [fracLine], levels: 2 },
    { title: "Bigger fraction", emoji: "🥧", topics: [fracCompareSame], levels: 2 },
  ] },
  { id: "area", title: "Area Archipelago", emoji: "🟩", grade: "3", blurb: "Area, perimeter and rounding.", stages: [
    { title: "Area", emoji: "🟩", topics: [area], levels: 2 },
    { title: "Perimeter", emoji: "🔲", topics: [perimeter], levels: 2 },
    { title: "Rounding", emoji: "🎯", topics: [rounding(10), rounding(100)], levels: 2 },
  ] },
  // 4th grade
  { id: "times2", title: "Multiplication Mountains", emoji: "🏔️", grade: "4", blurb: "All the times tables, and bigger multiplication.", stages: [
    { title: "6s, 7s, 8s", emoji: "✖️", topics: [mulFact([6, 7, 8], true)], levels: 2 },
    { title: "9s, 11s, 12s", emoji: "✖️", topics: [mulFact([9, 11, 12], true)], levels: 2 },
    { title: "2-digit × 1-digit", emoji: "🧮", topics: [mul2x1], levels: 2 },
    { title: "2-digit × 2-digit", emoji: "🏗️", topics: [mul2x2], levels: 2 },
  ] },
  { id: "factors", title: "Factor Fjord", emoji: "🔍", grade: "4", blurb: "Factors, multiples and prime numbers.", stages: [
    { title: "Factors", emoji: "🔍", topics: [factors], levels: 2 },
    { title: "Multiples", emoji: "🔁", topics: [multiples], levels: 2 },
    { title: "Prime time", emoji: "💎", topics: [prime], levels: 2 },
  ] },
  { id: "divide2", title: "Division Depths", emoji: "➗", grade: "4", blurb: "Division facts and remainders.", stages: [
    { title: "Division facts", emoji: "➗", topics: [divFact([6, 7, 8, 9], true)], levels: 2 },
    { title: "Remainders", emoji: "🧩", topics: [longDiv], levels: 3 },
  ] },
  { id: "fractions4", title: "Fraction Falls", emoji: "🥧", grade: "4", blurb: "Equivalent, compare, add and mixed numbers.", stages: [
    { title: "Equal fractions", emoji: "⚖️", topics: [fracEquiv], levels: 2 },
    { title: "Compare fractions", emoji: "⚖️", topics: [fracCompare2], levels: 2 },
    { title: "Add and subtract", emoji: "➕", topics: [fracAddLike], levels: 2 },
    { title: "Mixed numbers", emoji: "🍰", topics: [mixed], levels: 2 },
  ] },
  { id: "decimals", title: "Decimal Docks", emoji: "🔟", grade: "4", blurb: "Tenths, hundredths and huge numbers.", stages: [
    { title: "Decimals", emoji: "🔟", topics: [decimals], levels: 3 },
    { title: "Millions", emoji: "🏦", topics: [placeBig, rounding(100)], levels: 2 },
  ] },
  { id: "geometry4", title: "Angle Atoll", emoji: "📐", grade: "4", blurb: "Angles, lines and area formulas.", stages: [
    { title: "Angles", emoji: "📐", topics: [angles], levels: 2 },
    { title: "Lines", emoji: "🛤️", topics: [lines, angles], levels: 2 },
    { title: "Area formula", emoji: "🟩", topics: [areaFormula, perimeter], levels: 2 },
  ] },
  { id: "story4", title: "Puzzle Peaks", emoji: "🧠", grade: "4", blurb: "Multi-step word problems.", stages: [{ title: "Think it through", emoji: "🧠", topics: [multiStep], levels: 4 }] },
  // 5th grade
  { id: "fractions5", title: "Fraction Frontier", emoji: "🌋", grade: "5", blurb: "Unlike denominators and multiplying fractions.", stages: [
    { title: "Unlike denominators", emoji: "🧩", topics: [fracUnlike], levels: 3 },
    { title: "Fraction × whole", emoji: "✖️", topics: [fracWhole], levels: 2 },
  ] },
  { id: "decimals5", title: "Volume Volcano", emoji: "🧊", grade: "5", blurb: "Decimal math, volume and order of operations.", stages: [
    { title: "Add decimals", emoji: "➕", topics: [decAdd], levels: 2 },
    { title: "Volume", emoji: "🧊", topics: [volume], levels: 2 },
    { title: "Order of operations", emoji: "🧮", topics: [orderOps], levels: 2 },
  ] },
  { id: "coords", title: "Treasure Grid", emoji: "🗺️", grade: "5", blurb: "Find treasure with coordinates.", stages: [{ title: "X marks the spot", emoji: "🗺️", topics: [coords], levels: 3 }] },
];

export const MATH: Course = {
  id: "math",
  title: "Math",
  emoji: "🔢",
  tagline: "Count, build and solve",
  units: buildWorlds("math", "math", WORLDS),
  itemsFor: makeItemsFor(WORLDS),
};
