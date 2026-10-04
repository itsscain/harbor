"use client";

import { useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";
import type { RecipeStep } from "@/lib/learn/types";
import { recipeFail } from "@/lib/learn/codelab";
import { SAY } from "@/lib/learn/script";
import { say } from "@/lib/learn/audio";
import { sfx } from "@/lib/learn/sfx";
import { Chunk, useShuffledApart } from "../kit";
import type { ActProps } from "../acts/common";
import { PromptRow, useLater, usePrompt } from "../acts/common";

// Robot Chef: a robot that does EXACTLY what the instructions say, in the order they say it. Put
// the steps in order and press play — pour the milk before there's a cup and you get milk all
// over the counter. It's the first big idea of programming (computers don't guess what you meant)
// and the first taste of debugging: watch where it goes wrong, fix the order, run it again.

export function RecipeAct({ act, fx, onDone }: ActProps<"recipe">) {
  const voiced = fx.voice !== "keys";
  usePrompt(fx, [SAY.recipeIntro], voiced ? 420 : -1);
  const later = useLater();
  const pool = useShuffledApart(act.steps, fx.seed);
  const [prog, setProg] = useState<string[]>(() => act.buggy ?? []);
  const [phase, setPhase] = useState<"edit" | "run" | "oops" | "won">("edit");
  const [at, setAt] = useState(-1);
  const [failAt, setFailAt] = useState(-1);
  const [misses, setMisses] = useState(0);
  const byId = (id: string) => act.steps.find((s) => s.id === id)!;
  const left = pool.filter((s) => !prog.includes(s.id));
  const editing = phase === "edit" || phase === "oops";

  const add = (s: RecipeStep) => {
    if (!editing) return;
    sfx("snap");
    if (voiced) void say(s.text);
    setPhase("edit");
    setFailAt(-1);
    setAt(-1);
    setProg((p) => [...p, s.id]);
  };
  const remove = (id: string) => {
    if (!editing) return;
    sfx("tap");
    setPhase("edit");
    setFailAt(-1);
    setAt(-1);
    setProg((p) => p.filter((x) => x !== id));
  };
  const reset = () => {
    if (!editing) return;
    sfx("whoosh");
    setProg(act.buggy ?? []);
    setPhase("edit");
    setFailAt(-1);
    setAt(-1);
  };

  const play = () => {
    if (prog.length !== act.steps.length) return;
    setPhase("run");
    setFailAt(-1);
    sfx("whoosh");
    const bad = recipeFail(prog, act.steps);
    const upto = bad < 0 ? prog.length : bad + 1;
    for (let i = 0; i < upto; i++) {
      later(() => {
        setAt(i);
        if (i === bad) {
          setFailAt(i);
          sfx("bump");
        } else sfx("pop");
      }, 500 + i * 900);
    }
    later(() => {
      if (bad < 0) {
        setPhase("won");
        fx.right(null, [SAY.recipeWin]);
        later(() => onDone(misses), 2600);
      } else {
        setPhase("oops");
        setMisses((m) => m + 1);
        fx.miss();
        void say(voiced ? [SAY.recipeOops, { gap: 200 }, byId(prog[bad]).fail ?? ""] : SAY.recipeOops);
      }
    }, 500 + upto * 900 + 300);
  };

  const done = phase === "won";
  const failing = failAt >= 0 ? byId(prog[failAt]) : null;
  const made = prog.slice(0, at >= 0 ? (failAt >= 0 ? failAt : at + 1) : 0).map(byId);
  return (
    <div className="flex w-full max-w-[1180px] flex-col gap-4">
      <PromptRow parts={[SAY.recipeIntro]}>{act.buggy ? `Fix the robot's program: ${act.title}` : `Program the robot: ${act.title}`}</PromptRow>
      <div className="flex w-full flex-col items-stretch gap-4 lg:flex-row">
        {/* The kitchen */}
        <div className="relative flex min-h-[320px] flex-1 flex-col items-center justify-end overflow-hidden rounded-[28px] p-4 shadow-[0_8px_0_rgba(0,40,80,0.16)]" style={{ background: "linear-gradient(#fff7e6, #ffe9c2)" }}>
          {/* The room: a tiled wall, a window, a shelf, and a wooden counter. */}
          <span className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.9) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.9) 2px, transparent 2px)", backgroundSize: "34px 34px" }} />
          <span className="pointer-events-none absolute right-6 top-5 h-24 w-32 overflow-hidden rounded-xl border-[6px] border-white bg-gradient-to-b from-[#7dd3fc] to-[#e0f2fe] shadow-[0_4px_0_rgba(0,40,80,0.12)]">
            <span className="absolute left-1/2 top-0 h-full w-1.5 -translate-x-1/2 bg-white" />
            <span className="absolute left-3 top-2 text-2xl">☀️</span>
            <span className="absolute bottom-1 right-2 text-xl">🌳</span>
          </span>
          <span className="pointer-events-none absolute left-5 top-6 flex items-end gap-1.5 border-b-[7px] border-[#b45309] px-2 pb-0.5 text-3xl">
            <span>{act.scene}</span>
            <span>🍯</span>
            <span>🧂</span>
          </span>
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-[#d97706] to-[#92400e] shadow-[inset_0_6px_0_rgba(255,255,255,0.25)]" />
          {failing && (
            <div className="l-pop-in absolute left-1/2 top-6 z-[1] flex max-w-[86%] -translate-x-1/2 items-center gap-3 rounded-[22px] bg-white px-4 py-3 shadow-[0_6px_0_var(--l-line)]">
              <span className="l-shake text-5xl">{failing.failEmoji ?? "💥"}</span>
              <span className="font-display text-xl font-bold leading-snug text-[var(--l-coral-edge)]">{failing.fail ?? "Oops! The robot can't do that yet."}</span>
            </div>
          )}
          {done && (
            <div className="l-pop-in absolute inset-x-0 top-6 z-[1] flex flex-col items-center gap-1">
              <span className="l-boing text-8xl">{act.doneEmoji}</span>
              <span className="rounded-full bg-white px-5 py-1.5 font-display text-2xl font-extrabold text-[#166534] shadow-[0_4px_0_var(--l-line)]">{act.done}</span>
            </div>
          )}
          <div className="relative z-[1] flex items-end gap-4">
            <span key={at} className={cn("text-8xl", phase === "run" && "l-hop", failing && "grayscale-[0.4]")}>{failing ? "😵" : done ? "🥳" : "🤖"}</span>
            {/* What the robot has done so far piles up on the counter. */}
            <div className="mb-2 flex min-h-[64px] min-w-[180px] flex-wrap items-end gap-1 rounded-t-2xl border-b-[10px] border-[#b45309] px-2">
              {made.map((s, i) => (
                <span key={`${s.id}${i}`} className="l-pop-in text-5xl">{s.emoji}</span>
              ))}
            </div>
          </div>
        </div>

        {/* The program */}
        <div className="flex w-full flex-col gap-3 rounded-[28px] bg-white/92 p-3 shadow-[0_8px_0_rgba(0,40,80,0.18)] lg:w-[48%]">
          <span className="px-1 font-display text-lg font-extrabold text-[var(--l-ink)]">🤖 The robot&apos;s program</span>
          <ol className="flex min-h-[120px] flex-col gap-2 rounded-2xl bg-[var(--l-card-2)] p-2">
            {prog.length === 0 && <li className="px-2 py-3 font-display text-base font-bold text-[var(--l-ink-2)]">Tap the steps below, in order 👇</li>}
            {prog.map((id, i) => {
              const s = byId(id);
              return (
                <li key={id}>
                  <button type="button" disabled={!editing} onClick={() => remove(id)} className={cn("flex w-full items-center gap-3 rounded-2xl bg-white px-3 py-2 text-left shadow-[0_4px_0_var(--l-line)] transition-transform", i === at && phase === "run" && "scale-[1.03] ring-[5px] ring-[var(--l-gold)]", i === failAt && "l-pulse ring-[5px] ring-[var(--l-coral)]", done && "bg-[#dcfce7]")}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--l-gold)] font-display text-base font-extrabold text-[#5a3b00]">{i + 1}</span>
                    <span className="text-3xl">{s.emoji}</span>
                    <span className="font-reading text-[21px] font-bold leading-tight text-[var(--l-ink)]">{s.text}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="flex flex-wrap gap-2">
            {left.map((s) => (
              <Chunk key={s.id} tone="white" disabled={!editing} onClick={() => add(s)} className="flex min-h-[64px] items-center gap-2 px-3 text-left">
                <span className="text-3xl">{s.emoji}</span>
                <span className="font-reading text-[19px] font-bold leading-tight text-[var(--l-ink)]">{s.text}</span>
              </Chunk>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Chunk tone="white" disabled={!editing} onClick={reset} className="flex h-16 w-16 items-center justify-center text-[var(--l-ink-2)]" aria-label="Start over">
              <RotateCcw className="h-7 w-7" strokeWidth={2.6} />
            </Chunk>
            <Chunk tone="green" disabled={!editing || prog.length !== act.steps.length} onClick={play} className={cn("flex h-16 flex-1 items-center justify-center gap-2 font-display text-2xl font-extrabold", editing && prog.length === act.steps.length && "l-pulse")}>
              <Play className="h-8 w-8 fill-current" /> {phase === "oops" ? "Try again" : "Play"}
            </Chunk>
          </div>
        </div>
      </div>
    </div>
  );
}
