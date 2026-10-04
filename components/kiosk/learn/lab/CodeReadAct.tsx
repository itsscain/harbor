"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { sfx } from "@/lib/learn/sfx";
import { useShuffled } from "../kit";
import type { ActProps } from "../acts/common";
import { ChoiceTile, PromptRow, tileState, useChoice, useLater, usePrompt } from "../acts/common";

// Python Peek: the bridge from blocks to real code. A few lines of genuine Python — variables,
// loops, if/else, functions, lists — and one question: what will it do? Answer, and the program
// "runs": its output prints into a terminal, line by line, so the child checks their own thinking
// against the computer's.
//
// Bug hunts (`act.fix`) flip it around, the way real debugging works: the terminal already shows
// what the program does now (a wrong answer, or a real crash), and the child finds the line that
// causes it — by tapping it in the code or picking its number. Then the line is corrected in place
// and the fixed program prints what it should.

// Python's words (and JavaScript's, for the block editor's code view).
const KEYWORDS = new Set(["for", "in", "range", "while", "if", "elif", "else", "def", "return", "pass", "print", "len", "max", "min", "and", "or", "not", "True", "False", "function", "let"]);
const isError = (line: string) => /^\w+Error\b/.test(line) || line.startsWith("…");

export function CodeReadAct({ act, fx, onDone }: ActProps<"coderead">) {
  usePrompt(fx, [act.question], fx.voice === "keys" ? -1 : 420);
  const bug = act.fix;
  const shuffled = useShuffled(act.options, fx.seed);
  // Line numbers stay in order; answers to "what does it print" get shuffled.
  const opts = bug ? act.options : shuffled;
  const runLines = bug ? bug.output : act.output;
  // Long outputs print faster, like a real terminal racing through a loop.
  const gap = runLines.length > 8 ? 90 : 170;
  const start = bug ? 700 : 250;
  const c = useChoice(act.answer, fx, onDone, { why: act.why, doneDelay: start + 1100 + runLines.length * gap });
  const [shown, setShown] = useState(0);
  const later = useLater();
  // Once it's answered, (re)run the program: the output prints one line at a time.
  useEffect(() => {
    if (!c.found) return;
    if (bug) sfx("snap");
    for (let i = 0; i < runLines.length; i++)
      later(() => {
        setShown(i + 1);
        sfx("tick");
      }, start + i * gap);
    // Runs once, when the answer is found.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.found]);
  // An endless loop really doesn't stop: until it's fixed, its terminal keeps counting.
  const marker = act.output[act.output.length - 1] ?? "";
  const endless = !!bug && marker.includes("never stops");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!endless || c.found) return;
    const t = window.setInterval(() => setTick((n) => n + 1), fx.reduced ? 900 : 380);
    return () => window.clearInterval(t);
  }, [endless, c.found, fx.reduced]);
  const liveRun = () => {
    const nums = act.output.slice(0, -1).map(Number);
    const step = nums.length > 1 ? nums[1] - nums[0] : 1;
    return Array.from({ length: nums.length + tick }, (_, i) => String(nums[0] + i * step)).slice(-12);
  };
  // What the terminal shows: a bug hunt starts with the broken run already on screen.
  const terminal = bug && !c.found ? (endless ? liveRun() : act.output) : runLines.slice(0, shown);
  const fixedLine = bug ? bug.line - 1 : -1;
  return (
    <div className="flex w-full max-w-[1100px] flex-col items-center gap-5">
      <PromptRow parts={[act.question]}>{act.question}</PromptRow>
      <div className="flex w-full flex-col items-stretch gap-4 lg:flex-row">
        <div className="flex-1 overflow-hidden rounded-[24px] bg-[#0f172a] shadow-[0_8px_0_rgba(0,40,80,0.25)]">
          <div className="flex items-center gap-2 bg-[#1e293b] px-4 py-2">
            <span className="h-3 w-3 rounded-full bg-[#ef4444]" />
            <span className="h-3 w-3 rounded-full bg-[#facc15]" />
            <span className="h-3 w-3 rounded-full bg-[#22c55e]" />
            <span className="ml-2 font-mono text-sm text-[#94a3b8]">{bug ? "buggy.py" : "voyage.py"}</span>
            {bug && !c.found && <span className="ml-auto text-sm font-bold text-[#fca5a5]">🐞 tap the line with the bug</span>}
          </div>
          <div className="overflow-x-auto p-3">
            {act.lines.map((ln, i) => {
              const label = `Line ${i + 1}`;
              const tappable = !!bug && !c.found && ln.trim() !== "";
              const tried = c.wrongIds.includes(label);
              const hint = c.hint && label === act.answer;
              const row = (code: string, extra?: string) => (
                <>
                  <span className="w-6 shrink-0 text-right text-base text-[#475569]">{i + 1}</span>
                  <span className={cn("whitespace-pre text-[#e2e8f0]", extra)}>{colorize(code)}</span>
                </>
              );
              if (c.found && i === fixedLine && bug)
                return (
                  <div key={i}>
                    <div className="flex items-baseline gap-4 rounded-lg bg-[#7f1d1d]/50 px-2 font-mono text-[24px] leading-[1.6] opacity-70">{row(ln, "line-through decoration-[#f87171] decoration-2")}</div>
                    <div className="l-pop-in flex items-baseline gap-4 rounded-lg bg-[#14532d]/70 px-2 font-mono text-[24px] leading-[1.6] ring-2 ring-[#22c55e]" style={{ animationDelay: "250ms" }}>
                      {row(bug.code)}
                    </div>
                  </div>
                );
              return tappable ? (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => c.choose(label, e.currentTarget)}
                  className={cn("flex w-full items-baseline gap-4 rounded-lg px-2 text-left font-mono text-[24px] leading-[1.6] transition-colors hover:bg-white/10 active:bg-white/15", tried && "bg-[#7f1d1d]/40", hint && "ring-2 ring-[var(--l-gold)]")}
                >
                  {row(ln)}
                </button>
              ) : (
                <div key={i} className="flex items-baseline gap-4 px-2 font-mono text-[24px] leading-[1.6]">
                  {row(ln)}
                </div>
              );
            })}
          </div>
        </div>
        <div className={cn("flex min-h-[120px] w-full flex-col rounded-[24px] bg-black/85 p-4 font-mono shadow-[0_8px_0_rgba(0,0,0,0.3)] transition-opacity duration-300 lg:w-[34%]", c.found || bug ? "opacity-100" : "opacity-60")}>
          <div className="mb-2 flex items-center justify-between gap-2 text-sm font-bold uppercase tracking-wide">
            {bug ? (
              c.found ? (
                <span className="text-[#22c55e]">✓ Fixed — output</span>
              ) : (
                <span className="text-[#f87171]">▶ Output — not right!</span>
              )
            ) : (
              <span className="text-[#22c55e]">▶ Output</span>
            )}
            {c.found && shown > 0 && (
              <span key={shown} className="l-pop-in rounded-full bg-white/10 px-2 py-0.5 normal-case text-[#a7f3d0]">
                {shown} {shown === 1 ? "line" : "lines"}
              </span>
            )}
          </div>
          {!c.found && !bug && <span className="text-lg text-[#64748b]">Answer to run it…</span>}
          {/* Newest line at the bottom; older ones scroll off the top, like a real terminal. */}
          <div className={cn("flex flex-col justify-end overflow-hidden", endless && !c.found ? "max-h-[200px]" : "max-h-[232px]")}>
            {terminal.map((o, i) => (
              <span key={endless && !c.found ? `n${o}` : `${c.found ? "f" : "b"}${i}`} className={cn("shrink-0 text-[22px] leading-snug", (c.found || (endless && tick > 0)) && "l-pop-in", isError(o) ? "whitespace-pre-wrap text-[#fca5a5]" : "whitespace-pre text-[#a7f3d0]")}>
                {o}
              </span>
            ))}
          </div>
          {endless && !c.found && <span className="mt-1 animate-pulse text-[20px] font-bold text-[#fca5a5]">{marker}</span>}
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {opts.map((o) => (
          <ChoiceTile key={o} state={tileState(o, c, act.answer)} shakeKey={c.shake?.id === o ? c.shake.n : undefined} onPick={(el) => c.choose(o, el)} className={cn("h-20 px-5 font-mono font-bold", bug ? "min-w-[120px] text-[22px]" : "min-w-[150px] text-[26px]")}>
            {o}
          </ChoiceTile>
        ))}
      </div>
    </div>
  );
}

/** Python-ish coloring: keywords pink, strings green, numbers gold, names blue, comments gray. */
export function colorize(line: string) {
  const out: ReactNode[] = [];
  const re = /("[^"]*"|#.*$|\b\d+\b|\b[A-Za-z_]+\b)/g;
  let last = 0;
  let k = 0;
  for (let m = re.exec(line); m; m = re.exec(line)) {
    if (m.index > last) out.push(<span key={k++}>{line.slice(last, m.index)}</span>);
    const t = m[0];
    const cls = t.startsWith('"') ? "text-[#86efac]" : t.startsWith("#") ? "text-[#64748b]" : /^\d/.test(t) ? "text-[#fbbf24]" : KEYWORDS.has(t) ? "text-[#f472b6]" : "text-[#7dd3fc]";
    out.push(
      <span key={k++} className={cls}>
        {t}
      </span>,
    );
    last = m.index + t.length;
  }
  if (last < line.length) out.push(<span key={k++}>{line.slice(last)}</span>);
  return out;
}
