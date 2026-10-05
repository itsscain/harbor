"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Block, CodeLevel, Dir } from "@/lib/learn/types";
import { DEFAULT_LOOK } from "@/lib/learn/meta";
import { cellKey, gridEngine, parseGrid, runLevel, type GridState, type Step } from "@/lib/learn/program";
import { SAY } from "@/lib/learn/script";
import { say } from "@/lib/learn/audio";
import { note, sfx } from "@/lib/learn/sfx";
import { Chunk, useShuffled } from "../kit";
import type { ActProps } from "../acts/common";
import { PromptRow, useLater, usePrompt } from "../acts/common";
import { BlockPill, Editor } from "../code/Editor";
import { MOVE_EMOJI, NOTE_COLOR, stepTarget, type ListPath } from "../code/blocks";
import { TopBoat } from "../KidBoat";
import { Glyph } from "../art/Glyph";

// Be the computer: read a program BEFORE it runs and predict what it will do — where the boat will
// stop, how many bells will ring, which of three programs reaches the island. Then it runs, block by
// block, so the child checks their own thinking. Tracing code in your head is the skill that makes
// writing code possible (and predicting first makes the watching stick).

const DEG: Record<Dir, number> = { right: 0, down: 90, left: 180, up: 270 };
const noop = () => {};

export function PredictAct({ act, fx, onDone }: ActProps<"predict">) {
  const level = act.level;
  const grid = level.sim === "sea" || level.sim === "rover";
  const prompt =
    act.ask === "end" ? (level.sim === "rover" ? SAY.predictEndRover : SAY.predictEnd) : act.ask === "count" ? (level.sim === "music" ? SAY.predictCountSong : SAY.predictCountDance) : SAY.predictPick;
  usePrompt(fx, [prompt], fx.voice === "keys" ? -1 : 420);
  const later = useLater();
  const look = fx.look ?? DEFAULT_LOOK;

  // The program being shown/run (for "pick", whichever option is being tested).
  const [shown, setShown] = useState<Block[]>(act.ask === "pick" ? [] : act.program);
  const [active, setActive] = useState<{ list: ListPath; index: number; answer?: "yes" | "no" } | null>(null);
  const [state, setState] = useState<GridState | null>(() => (grid ? gridEngine(level.maps![0], level.facing ?? "right").init : null));
  const [angle, setAngle] = useState(() => DEG[level.facing ?? "right"]);
  const [trail, setTrail] = useState<string[]>([]);
  const [bump, setBump] = useState(0);
  const [beat, setBeat] = useState<{ op: string; k: number; n: number } | null>(null);
  const [guess, setGuess] = useState<string | null>(null);
  const [phase, setPhase] = useState<"ask" | "run" | "right" | "wrong">("ask");
  const [tried, setTried] = useState<number[]>([]);
  const [misses, setMisses] = useState(0);
  const [testing, setTesting] = useState<number | null>(null);
  const finished = useRef(false);

  const finalOf = (prog: Block[]) => runLevel(level, prog);
  const truth = useMemo(() => runLevel(level, act.program), [level, act.program]);
  const endKey = (() => {
    const f = truth.results[0]?.final as GridState | undefined;
    return f && typeof f.x === "number" ? cellKey(f) : null;
  })();
  const count = truth.results[0]?.steps.filter((s) => s.event !== "yes" && s.event !== "no").length ?? 0;
  const countOptions = useShuffled(
    useMemo(() => [...new Set([count, count + (count > 3 ? 2 : 1), Math.max(1, count - (count > 4 ? 2 : 1)), count + 3])].slice(0, 3), [count]),
    fx.seed,
  );
  const pickOrder = useShuffled(
    useMemo(() => (act.options ?? []).map((_, i) => i), [act.options]),
    fx.seed,
  );

  /** Animate a program run; `then(won)` when it ends. */
  const run = (prog: Block[], then: (won: boolean) => void) => {
    setPhase("run");
    setShown(prog);
    const res = finalOf(prog);
    const steps = res.results[0]?.steps ?? [];
    if (grid) {
      const init = gridEngine(level.maps![0], level.facing ?? "right").init;
      setState(init);
      setAngle(DEG[init.facing]);
      setTrail([cellKey(init)]);
    }
    let a = DEG[level.facing ?? "right"];
    let n = 0;
    const ms = fx.voice === "all" ? 520 : 420;
    steps.forEach((st: Step<unknown>, i) => {
      const check = st.event === "yes" || st.event === "no";
      if (grid) {
        const gs = st.state as GridState;
        const d = (((DEG[gs.facing] - a) % 360) + 540) % 360 - 180;
        a += d;
      }
      const ang = a;
      if (!check) n++;
      const nNow = n;
      later(() => {
        const tgt = stepTarget(prog, st.at);
        setActive(tgt ? { ...tgt, answer: check ? (st.event as "yes" | "no") : undefined } : null);
        if (grid) {
          const gs = st.state as GridState;
          setState(gs);
          setAngle(ang);
          setTrail((t) => [...t, cellKey(gs)]);
          if (st.event === "bump") {
            setBump((b) => b + 1);
            sfx(level.sim === "sea" ? "splash" : "bump");
          } else if (st.event === "move") sfx("move");
          else if (st.event === "turn") sfx("turn");
          else if (st.event === "shell") sfx("shell");
          else if (check) sfx("beep");
        } else if (!check) {
          if (level.sim === "music") note(st.event);
          else sfx("whoosh");
          setBeat({ op: st.event, k: i, n: nNow });
        }
      }, 450 + i * ms);
    });
    later(() => {
      setActive(null);
      then(res.won);
    }, 450 + steps.length * ms + 350);
  };

  const finish = (m: number, el: Element | null) => {
    if (finished.current) return;
    finished.current = true;
    if (m === 0) fx.right(el, [SAY.predictRight]);
    later(() => onDone(m), m === 0 ? 1700 : 2400);
  };

  // ── Tap a square: where will it stop? ──
  const tapCell = (k: string, el: HTMLElement) => {
    if (phase !== "ask") return;
    sfx("pick");
    setGuess(k);
    run(act.program, () => {
      if (k === endKey) {
        setPhase("right");
        finish(0, el);
      } else {
        setPhase("wrong");
        setMisses(1);
        fx.miss();
        void say(SAY.guessOops);
      }
    });
  };
  // ── How many? ──
  const tapCount = (v: number, el: HTMLElement) => {
    if (phase !== "ask") return;
    sfx("pick");
    setGuess(String(v));
    run(act.program, () => {
      if (v === count) {
        setPhase("right");
        finish(0, el);
      } else {
        setPhase("wrong");
        setMisses(1);
        fx.miss();
        void say(SAY.guessOops);
      }
    });
  };
  // ── Which program works? (test them until one does) ──
  const tapProgram = (i: number, el: HTMLElement) => {
    if (phase === "run" || phase === "right" || tried.includes(i)) return;
    sfx("pick");
    void say(SAY.predictWatch);
    setTesting(i);
    run(act.options![i], (won) => {
      setTesting(null);
      if (won) {
        setPhase("right");
        finish(tried.length, el);
      } else {
        setTried((t) => [...t, i]);
        setMisses((m) => m + 1);
        setPhase("ask");
        fx.wrong(el);
      }
    });
  };

  const stage = grid ? (
    <MiniSea map={level.maps![0]} state={state} angle={angle} trail={trail} bump={bump} look={look} mars={level.sim === "rover"} guess={act.ask === "end" ? guess : null} truth={phase === "wrong" ? endKey : null} onTap={act.ask === "end" && phase === "ask" ? tapCell : undefined} />
  ) : (
    <SeqStage sim={level.sim} beat={beat} />
  );

  return (
    <div className="flex w-full max-w-[1180px] flex-col gap-4">
      <PromptRow parts={[prompt]}>{act.ask === "end" ? "Where will it stop? Tap the square." : act.ask === "count" ? (level.sim === "music" ? "How many bells will ring?" : "How many moves will the robot do?") : "Which program works? Tap one to test it."}</PromptRow>
      <div className="flex w-full flex-col items-center gap-4 lg:flex-row lg:items-start lg:justify-center">
        <div className="flex flex-col items-center gap-3">
          {stage}
          {phase === "wrong" && (
            <div className="l-card-in flex items-center gap-3 rounded-[20px] bg-white px-5 py-3 font-display text-xl font-bold text-[var(--l-ink)] shadow-[0_5px_0_var(--l-line)]">
              {act.ask === "end" ? "It stopped on the gold square. Follow each block, one at a time!" : `It was ${count}. Count every step — loops repeat!`}
              <Chunk tone="blue" onClick={() => (sfx("tap"), onDone(misses))} className="flex h-12 items-center gap-1 px-4 font-display text-lg font-extrabold">
                Got it <ArrowRight className="h-5 w-5" strokeWidth={3} />
              </Chunk>
            </div>
          )}
        </div>
        {act.ask !== "pick" ? (
          <div className="w-full max-w-[460px] rounded-[26px] bg-white/92 p-3 shadow-[0_8px_0_rgba(0,40,80,0.18)]">
            <span className="px-1 font-display text-lg font-extrabold text-[var(--l-ink)]">The program</span>
            <div className="mt-2 rounded-2xl bg-[var(--l-card-2)] p-2">
              <Editor prog={shown} cursor={{ list: [], index: shown.length }} sel={null} band={fx.voice === "all" ? "little" : "middle"} running active={active} onCursor={noop} onSelect={noop} onDelete={noop} onCount={noop} onCond={noop} />
            </div>
            {act.ask === "count" && (
              <div className="mt-3 flex justify-center gap-3">
                {countOptions.map((v) => (
                  <Chunk key={v} tone={guess === String(v) ? (phase === "right" ? "green" : phase === "wrong" ? "coral" : "gold") : "white"} disabled={phase !== "ask"} onClick={(e) => tapCount(v, e.currentTarget)} className="flex h-20 w-24 items-center justify-center font-display text-4xl font-extrabold">
                    {v}
                  </Chunk>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex w-full max-w-[520px] flex-col gap-3">
            {pickOrder.map((i) => {
              const prog = act.options![i];
              const bad = tried.includes(i);
              return (
                <Chunk key={i} tone={bad ? "ghost" : "white"} disabled={bad || phase === "run" || phase === "right"} onClick={(e) => tapProgram(i, e.currentTarget)} className={cn("flex min-h-[72px] flex-wrap items-center gap-1.5 px-3 py-2 transition-transform", bad && "opacity-50", testing === i && "scale-[1.03] ring-[5px] ring-[var(--l-gold)]")}>
                  <ProgramStrip prog={prog} />
                  {bad && <Glyph e="❌" size={40} className="ml-auto" />}
                </Chunk>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** A program as one row of pills; a loop wraps its blocks in an orange bracket with its count. */
function ProgramStrip({ prog }: { prog: Block[] }) {
  return (
    <>
      {prog.map((b, k) =>
        b.op === "repeat" ? (
          <span key={k} className="flex items-center gap-1 rounded-2xl bg-[#ff9149] py-1 pl-2 pr-1 shadow-[0_4px_0_#e26f27]">
            <span className="font-display text-base font-extrabold text-white"><Glyph e="🔁" size="1.25em" className="mx-[0.1em] inline-block align-[-0.28em]" />×{b.n}</span>
            <span className="flex gap-1 rounded-xl bg-white/80 p-1">
              <ProgramStrip prog={b.body ?? []} />
            </span>
          </span>
        ) : (
          <BlockPill key={k} op={b.op} block={b} band="middle" size="sm" />
        ),
      )}
    </>
  );
}

function MiniSea({ map, state, angle, trail, bump, look, mars, guess, truth, onTap }: { map: string[]; state: GridState | null; angle: number; trail: string[]; bump: number; look: typeof DEFAULT_LOOK; mars: boolean; guess: string | null; truth: string | null; onTap?: (k: string, el: HTMLElement) => void }) {
  const g = parseGrid(map);
  const cell = Math.floor(Math.min(520 / g.w, 400 / g.h, 96));
  const trailSet = new Set(trail);
  return (
    <div className="relative overflow-hidden rounded-[22px] shadow-[0_8px_0_rgba(0,40,80,0.22)]" style={{ width: cell * g.w, height: cell * g.h, background: mars ? "linear-gradient(160deg, #f0905e, #d8653a)" : "linear-gradient(160deg, #48d0ef, #1aa6d6)" }}>
      {map.map((row, y) =>
        [...row].map((ch, x) => {
          const k = cellKey({ x, y });
          const got = state?.got.includes(k);
          const isGuess = guess === k;
          const isTruth = truth === k;
          return (
            <button
              key={k}
              type="button"
              disabled={!onTap || ch === "#"}
              onClick={(e) => onTap?.(k, e.currentTarget)}
              className={cn("absolute flex items-center justify-center", onTap && ch !== "#" && "hover:bg-white/15 active:bg-white/25")}
              style={{ left: x * cell, top: y * cell, width: cell, height: cell, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)" }}
              aria-label={`row ${y + 1}, column ${x + 1}`}
            >
              {trailSet.has(k) && ch !== "S" && <span className="absolute rounded-full" style={{ width: cell * 0.18, height: cell * 0.18, background: mars ? "rgba(90,30,10,0.35)" : "rgba(255,255,255,0.6)" }} />}
              {ch === "#" && <Glyph e={mars ? "⛰️" : "🪨"} size={cell * 0.86} />}
              {ch === "*" && !got && <span className="l-bob" style={{ fontSize: cell * 0.56, lineHeight: 1 }}><Glyph e="🐚" size="1.25em" className="mx-[0.1em] inline-block align-[-0.28em]" /></span>}
              {ch === "G" && <Glyph e={mars ? "🚩" : "🏝️"} size={cell * 0.82} />}
              {isGuess && <span className="l-pop-in absolute inset-1 flex items-start justify-end rounded-xl ring-4 ring-[var(--l-violet)]"><Glyph e="📍" size={32} className="-mr-1 -mt-2" /></span>}
              {isTruth && <span className="l-pop-in absolute inset-1 rounded-xl ring-[6px] ring-[var(--l-gold)]" />}
            </button>
          );
        }),
      )}
      {state && (
        <span className="pointer-events-none absolute flex items-center justify-center" style={{ left: 0, top: 0, width: cell, height: cell, transform: `translate(${state.x * cell}px, ${state.y * cell}px)`, transition: "transform 300ms cubic-bezier(0.34,1.3,0.64,1)" }}>
          <span key={bump} className={cn("flex items-center justify-center", bump > 0 && "l-shake")} style={{ transform: `rotate(${angle}deg)`, transition: "transform 260ms ease-out" }}>
            {mars ? <span style={{ fontSize: cell * 0.7 }}><Glyph e="🛸" size="1.25em" className="mx-[0.1em] inline-block align-[-0.28em]" /></span> : <TopBoat look={look} size={cell * 0.92} />}
          </span>
        </span>
      )}
    </div>
  );
}

function SeqStage({ sim, beat }: { sim: CodeLevel["sim"]; beat: { op: string; k: number; n: number } | null }) {
  return (
    <div className="relative flex h-[300px] w-[440px] flex-col items-center justify-center gap-3 overflow-hidden rounded-[28px]" style={{ background: sim === "music" ? "linear-gradient(160deg,#7c4a1f,#5b3412)" : "repeating-conic-gradient(from 45deg, #4c1d95 0 25%, #6d28d9 0 50%) 0 0/64px 64px" }}>
      {sim === "music" ? (
        <div className="flex items-end gap-2">
          {["C", "D", "E", "F", "G", "A"].map((n, i) => (
            <span key={`${n}${beat?.op === n ? beat.k : ""}`} className={cn("flex w-12 items-end justify-center rounded-xl pb-2 font-display text-xl font-extrabold text-white", beat?.op === n && "l-boing")} style={{ height: 170 - i * 16, background: NOTE_COLOR[n][0], boxShadow: beat?.op === n ? `0 0 0 5px #fff, 0 0 30px 8px ${NOTE_COLOR[n][0]}` : "0 5px 0 rgba(0,0,0,0.25)" }}>
              {n}
            </span>
          ))}
        </div>
      ) : (
        <span key={beat?.k ?? -1} className={cn("text-8xl", beat && "l-hop")}><Glyph e="🤖" size="1.25em" className="mx-[0.1em] inline-block align-[-0.28em]" /></span>
      )}
      {beat && sim !== "music" && <Glyph key={`m${beat.k}`} e={MOVE_EMOJI[beat.op] ?? "✨"} size={76} className="l-pop-in absolute right-10 top-8" />}
      <span key={beat?.n ?? 0} className="l-pop-in rounded-full bg-white px-5 py-1.5 font-display text-3xl font-extrabold text-[var(--l-ink)]">{beat?.n ?? 0}</span>
    </div>
  );
}

