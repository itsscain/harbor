"use client";

import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { runVar, varText } from "@/lib/learn/codelab";
import { SAY } from "@/lib/learn/script";
import { say } from "@/lib/learn/audio";
import { sfx } from "@/lib/learn/sfx";
import { Chunk, useShuffled } from "../kit";
import type { ActProps } from "../acts/common";
import { PromptRow, useLater, usePrompt } from "../acts/common";

// Treasure Counter: a variable is a box with a name that holds a number, and a program can change
// what's inside. Read the little program, predict what the box holds at the end — then watch it
// run line by line: the line lights up, the box changes, and a trace table writes down every step
// (exactly how programmers check their thinking).

export function VariableAct({ act, fx, onDone }: ActProps<"variable">) {
  const voiced = fx.voice !== "keys";
  usePrompt(fx, [SAY.varIntro], voiced ? 420 : -1);
  const later = useLater();
  const text = useMemo(() => varText(act.lines, act.name), [act.lines, act.name]);
  const run = useMemo(() => runVar(act.lines), [act.lines]);
  const options = useShuffled(act.options, fx.seed);
  const [phase, setPhase] = useState<"ask" | "run" | "right" | "wrong">("ask");
  const [guess, setGuess] = useState<number | null>(null);
  const [line, setLine] = useState(-1);
  const [value, setValue] = useState<number | null>(null);
  const [trace, setTrace] = useState<{ line: number; value: number }[]>([]);
  const [bumpKey, setBumpKey] = useState(0);

  const choose = (n: number, el: HTMLElement) => {
    if (phase !== "ask") return;
    sfx("pick");
    setGuess(n);
    setPhase("run");
    if (voiced) void say(SAY.varWatch);
    const ms = 760;
    run.steps.forEach((st, i) => {
      later(() => {
        setLine(st.line);
        if (st.changed) {
          setValue(st.value);
          setBumpKey((k) => k + 1);
          setTrace((t) => [...t, { line: st.line, value: st.value }]);
          sfx("coin");
        } else sfx("tick");
      }, 900 + i * ms);
    });
    later(() => {
      setLine(-1);
      if (n === act.answer) {
        setPhase("right");
        fx.right(el, [SAY.predictRight]);
        later(() => onDone(0), 1900);
      } else {
        setPhase("wrong");
        fx.miss();
        void say(SAY.guessOops);
      }
    }, 900 + run.steps.length * ms + 300);
  };

  return (
    <div className="flex w-full max-w-[1120px] flex-col gap-4">
      <PromptRow parts={[SAY.varIntro]}>
        What will <code className="rounded-lg bg-white/90 px-2 font-mono text-[var(--l-ink)]">{act.name}</code> be at the end?
      </PromptRow>
      <div className="flex w-full flex-col items-stretch gap-4 lg:flex-row">
        {/* The program */}
        <div className="flex-1 rounded-[24px] bg-[#0f172a] p-4 shadow-[0_8px_0_rgba(0,40,80,0.25)]">
          {text.map((ln, i) => (
            <div key={i} className={cn("flex items-center gap-3 rounded-xl px-2 py-1.5 font-mono text-[22px] transition-colors", line === i ? "bg-[#facc15]/25 text-white" : "text-[#cbd5e1]")}>
              <span className="w-6 text-right text-base text-[#64748b]">{i + 1}</span>
              <span style={{ paddingLeft: ln.depth * 28 }} className="whitespace-pre">
                {colorize(ln.text, act.name)}
              </span>
              {line === i && <span className="ml-auto text-xl">👈</span>}
            </div>
          ))}
        </div>
        {/* The box + trace */}
        <div className="flex w-full flex-col items-center gap-3 lg:w-[40%]">
          <div className="relative flex flex-col items-center">
            <span className="rounded-t-xl bg-[var(--l-orange)] px-4 py-1 font-mono text-xl font-bold text-white">
              {act.emoji} {act.name}
            </span>
            <span key={bumpKey} className={cn("flex h-32 w-44 items-center justify-center rounded-[24px] border-[6px] border-[var(--l-orange)] bg-white font-display text-7xl font-extrabold text-[var(--l-ink)]", bumpKey > 0 && "l-pop-in")}>
              {value ?? "?"}
            </span>
          </div>
          <div className="w-full rounded-2xl bg-white/92 p-2 shadow-[0_5px_0_rgba(0,40,80,0.14)]">
            <div className="grid grid-cols-2 gap-x-3 px-2 font-display text-sm font-extrabold uppercase text-[var(--l-ink-2)]">
              <span>line</span>
              <span>{act.name}</span>
            </div>
            <div className="max-h-[160px] overflow-y-auto">
              {trace.length === 0 && <p className="px-2 py-2 font-display text-base font-bold text-[var(--l-ink-2)]">The trace table fills in as it runs.</p>}
              {trace.map((t, i) => (
                <div key={i} className="l-pop-in grid grid-cols-2 gap-x-3 rounded-lg px-2 py-0.5 font-mono text-lg text-[var(--l-ink)] odd:bg-[var(--l-card-2)]">
                  <span>{t.line + 1}</span>
                  <span className="font-bold">{t.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {options.map((n) => (
          <Chunk key={n} tone={guess === n ? (phase === "right" ? "green" : phase === "wrong" ? "coral" : "gold") : "white"} disabled={phase !== "ask"} onClick={(e) => choose(n, e.currentTarget)} className="flex h-20 min-w-[110px] items-center justify-center px-4 font-display text-4xl font-extrabold">
            {n}
          </Chunk>
        ))}
        {phase === "wrong" && (
          <div className="l-card-in flex items-center gap-3 rounded-[20px] bg-white px-5 py-3 font-display text-xl font-bold text-[var(--l-ink)] shadow-[0_5px_0_var(--l-line)]">
            It ended at {act.answer}. Follow the trace table, line by line!
            <Chunk tone="blue" onClick={() => (sfx("tap"), onDone(1))} className="flex h-12 items-center gap-1 px-4 font-display text-lg font-extrabold">
              Got it <ArrowRight className="h-5 w-5" strokeWidth={3} />
            </Chunk>
          </div>
        )}
      </div>
    </div>
  );
}

function colorize(t: string, name: string) {
  const parts = t.split(/(\brepeat\b|\btimes\b|\bif\b|\d+)/);
  return parts.map((p, i) =>
    p === "repeat" || p === "times" || p === "if" ? (
      <span key={i} className="text-[#f472b6]">
        {p}
      </span>
    ) : /^\d+$/.test(p) ? (
      <span key={i} className="text-[#fbbf24]">
        {p}
      </span>
    ) : (
      <span key={i} className={p.includes(name) ? "text-[#7dd3fc]" : undefined}>
        {p}
      </span>
    ),
  );
}
