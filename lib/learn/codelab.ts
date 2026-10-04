import type { Block, CodeLevel, FactoryCond, FactoryItem, FactoryRule, LogicGate, MachineStep, RecipeStep, VarLine } from "./types";
import { runLevel } from "./program";

// Code Lab — the logic behind the coding games that aren't block puzzles. Everything here is pure
// (no React), so the content checker can prove each puzzle has an answer and the UI can replay it.

// ── Robot Chef ───────────────────────────────────────────────────────────────────────────────
/** The first step the robot can't do yet (its `needs` aren't all done before it), or -1 if the
 *  whole order works. Any order that respects every `needs` is a right answer. */
export function recipeFail(order: string[], steps: RecipeStep[]): number {
  const done = new Set<string>();
  for (let i = 0; i < order.length; i++) {
    const s = steps.find((x) => x.id === order[i]);
    if (!s) return i;
    if ((s.needs ?? []).some((n) => !done.has(n))) return i;
    done.add(s.id);
  }
  return order.length === steps.length ? -1 : order.length;
}
/** One order that works (the steps as written, if they're written in a working order). */
export function recipeAnswer(steps: RecipeStep[]): string[] {
  const out: string[] = [];
  const left = [...steps];
  while (left.length) {
    const i = left.findIndex((s) => (s.needs ?? []).every((n) => out.includes(n)));
    if (i < 0) return [];
    out.push(left[i].id);
    left.splice(i, 1);
  }
  return out;
}

// ── Sorting Factory ──────────────────────────────────────────────────────────────────────────
export const condTest = (item: FactoryItem, c: FactoryCond | undefined) => !!c && c.tags.every((t) => item.tags.includes(t));
/** Where an item goes: the first rule whose check is true, else the else-bin. */
export function route(item: FactoryItem, rules: FactoryRule[], elseBin: string, conds: FactoryCond[]): string {
  for (const r of rules) if (condTest(item, conds.find((c) => c.id === r.cond))) return r.bin;
  return elseBin;
}
/** Does a rule set sort every item the way the answer does? */
export function factoryWins(items: FactoryItem[], rules: FactoryRule[], elseBin: string, conds: FactoryCond[], answer: FactoryRule[], answerElse: string) {
  return items.every((it) => route(it, rules, elseBin, conds) === route(it, answer, answerElse, conds));
}

// ── Variables ────────────────────────────────────────────────────────────────────────────────
export type VarStep = { line: number; value: number; changed: boolean; check?: boolean };
/** Run a variable program. Lines are numbered in display order (see varText), so the trace can
 *  light up the line that's running. */
export function runVar(lines: VarLine[], start = 0): { value: number; steps: VarStep[] } {
  const steps: VarStep[] = [];
  let v = start;
  let guard = 0;
  const run = (ls: VarLine[], first: number): number => {
    let n = first;
    for (const l of ls) {
      const at = n++;
      if (guard++ > 400) return n;
      if (l.op === "repeat") {
        const bodyLen = lineCount(l.body);
        for (let k = 0; k < l.n; k++) {
          steps.push({ line: at, value: v, changed: false, check: true });
          run(l.body, at + 1);
        }
        n += bodyLen;
      } else if (l.op === "if") {
        const ok = l.cmp === ">" ? v > l.n : l.cmp === "<" ? v < l.n : v === l.n;
        steps.push({ line: at, value: v, changed: false, check: true });
        if (ok) run(l.body, at + 1);
        n += lineCount(l.body);
      } else {
        v = l.op === "set" ? l.n : l.op === "add" ? v + l.n : l.op === "sub" ? v - l.n : v * l.n;
        steps.push({ line: at, value: v, changed: true });
      }
    }
    return n;
  };
  run(lines, 0);
  return { value: v, steps };
}
export const lineCount = (ls: VarLine[]): number => ls.reduce((n, l) => n + 1 + (l.op === "repeat" || l.op === "if" ? lineCount(l.body) : 0), 0);
/** The program as text lines with indentation depth, in display order. */
export function varText(lines: VarLine[], name: string, depth = 0): { text: string; depth: number }[] {
  const out: { text: string; depth: number }[] = [];
  for (const l of lines) {
    if (l.op === "repeat") {
      out.push({ text: `repeat ${l.n} times:`, depth });
      out.push(...varText(l.body, name, depth + 1));
    } else if (l.op === "if") {
      out.push({ text: `if ${name} ${l.cmp} ${l.n}:`, depth });
      out.push(...varText(l.body, name, depth + 1));
    } else {
      const sym = l.op === "add" ? "+" : l.op === "sub" ? "−" : "×";
      out.push({ text: l.op === "set" ? `${name} = ${l.n}` : `${name} = ${name} ${sym} ${l.n}`, depth });
    }
  }
  return out;
}

// ── Logic gates ──────────────────────────────────────────────────────────────────────────────
export const gate = (g: LogicGate, a: boolean, b: boolean) => (g === "AND" ? a && b : g === "OR" ? a || b : !a);

// ── Function machines ────────────────────────────────────────────────────────────────────────
export function applyMachine(steps: MachineStep[], x: number): number {
  return steps.reduce((v, s) => (s.op === "+" ? v + s.n : s.op === "-" ? v - s.n : s.op === "×" ? v * s.n : v / s.n), x);
}
export const machineText = (steps: MachineStep[]) => steps.map((s) => `${s.op} ${s.n}`).join(", then ");

// ── Binary ───────────────────────────────────────────────────────────────────────────────────
/** Place values, biggest first: 4 bits → [8, 4, 2, 1]. */
export const bitValues = (bits: number) => Array.from({ length: bits }, (_, i) => 2 ** (bits - 1 - i));
export const toBits = (n: number, bits: number) => bitValues(bits).map((v) => (n & v ? 1 : 0));

// ── Secret codes ─────────────────────────────────────────────────────────────────────────────
const A = "A".charCodeAt(0);
export const shiftLetter = (ch: string, k: number) => (/[A-Z]/.test(ch) ? String.fromCharCode(((ch.charCodeAt(0) - A + k + 26 * 4) % 26) + A) : ch);
export const shiftText = (text: string, k: number) => [...text.toUpperCase()].map((c) => shiftLetter(c, k)).join("");

// ── Predict: what a program does ─────────────────────────────────────────────────────────────
/** Actions a program performs on a level (checks don't count) — "how many times will it ring?" */
export function actionCount(level: CodeLevel, program: Block[]): number {
  return runLevel(level, program).results[0]?.steps.filter((s) => s.event !== "yes" && s.event !== "no").length ?? 0;
}
/** Where the boat/rover ends up on the first map. */
export function endCell(level: CodeLevel, program: Block[]): [number, number] | null {
  const r = runLevel(level, program).results[0];
  const st = r?.final as { x?: number; y?: number } | undefined;
  return st && typeof st.x === "number" && typeof st.y === "number" ? [st.x, st.y] : null;
}
