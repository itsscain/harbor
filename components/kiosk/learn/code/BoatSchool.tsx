"use client";

import { useEffect, useRef, useState } from "react";
import { Play, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/cn";
import type { BoatLook } from "@/lib/learn/meta";
import { SAY, numberWord } from "@/lib/learn/script";
import { say } from "@/lib/learn/audio";
import { sfx } from "@/lib/learn/sfx";
import { Chunk } from "../kit";
import { TopBoat } from "../KidBoat";
import { HearButton, type LessonFx } from "../acts/common";
import { BlockPill } from "./Editor";

// Boat School: the lesson every child does once, before their first boat puzzle — and it can't be
// skipped. Hands-on, one idea at a time:
//   1. one block, one step (tap the arrow, press Play, watch one step);
//   2. count the squares to the island, then use exactly that many blocks;
//   3. too many blocks: the boat does EVERY block — it reaches the island, keeps going, and
//      crashes into the rock (the extras turn red);
//   4. take the extras away and it lands on the island.
// Every step waits for the child to do it AND for the words to finish, so nothing can be tapped
// past. Leaving the level is still possible; the tutorial simply starts again next time.

const COLS = 6; // boat · water · water · island · water · rock
const ISLAND = 3;
const ROCK = 5;
type Stage = "meet" | "play1" | "add3" | "play3" | "add5" | "play5" | "remove" | "play3b" | "rule";
const STAGES: Stage[] = ["meet", "play1", "add3", "play3", "add5", "play5", "remove", "play3b", "rule"];

export function BoatSchool({ fx, look, band, onDone }: { fx: LessonFx; look: BoatLook; band: "little" | "middle" | "big"; onDone: () => void }) {
  const [stage, setStage] = useState<Stage>("meet");
  const [blocks, setBlocks] = useState(0);
  const [boat, setBoat] = useState(0);
  const [bump, setBump] = useState(0);
  const [line, setLine] = useState<string>(SAY.bsMeet);
  const [canAct, setCanAct] = useState(false);
  const [running, setRunning] = useState(false);
  const [badges, setBadges] = useState(0);
  const [stepNo, setStepNo] = useState<number | null>(null);
  const [arrived, setArrived] = useState(false);
  const [extrasRed, setExtrasRed] = useState(false);
  const timers = useRef<number[]>([]);
  const token = useRef(0);
  const seaRef = useRef<HTMLDivElement | null>(null);

  const later = (fn: () => void, ms: number) => {
    const my = token.current;
    timers.current.push(window.setTimeout(() => my === token.current && fn(), ms));
  };
  useEffect(
    () => () => {
      token.current++;
      timers.current.forEach((t) => window.clearTimeout(t));
    },
    [],
  );

  /** Say a line; the next action unlocks only once it's been said (or after a while). */
  const speakThenUnlock = (text: string, after?: () => void) => {
    fx.setPrompt([text]);
    const my = token.current;
    let done = false;
    const finish = () => {
      if (done || my !== token.current) return;
      done = true;
      setCanAct(true);
      after?.();
    };
    void say(text).then(finish);
    later(finish, Math.max(4000, text.split(" ").length * 520));
  };
  /** Show a new line and say it. */
  const narrate = (text: string, after?: () => void) => {
    setLine(text);
    setCanAct(false);
    speakThenUnlock(text, after);
  };
  useEffect(() => {
    speakThenUnlock(SAY.bsMeet);
    // The first line, once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goal = stage === "meet" ? 1 : stage === "add3" ? 3 : stage === "add5" ? 5 : null;
  const addArrow = () => {
    if (!canAct || goal === null || blocks >= goal) return;
    sfx("snap");
    const n = blocks + 1;
    setBlocks(n);
    if (n < goal) return;
    if (stage === "meet") {
      setStage("play1");
      narrate(SAY.bsPlay1);
    } else if (stage === "add3") {
      setStage("play3");
      narrate(SAY.bsPlay3);
    } else {
      setStage("play5");
      narrate(SAY.bsPlayExtra);
    }
  };

  const removeExtra = (k: number) => {
    if (stage !== "remove" || !canAct || k < ISLAND) return;
    sfx("tap");
    const n = blocks - 1;
    setBlocks(n);
    if (n === ISLAND) {
      setExtrasRed(false);
      setStage("play3b");
      narrate(SAY.bsTryAgain);
    }
  };

  /** Sail the program: one square per block, counting out loud; a rock stops the boat with a splash. */
  const run = () => {
    if (!canAct || running) return;
    setRunning(true);
    setArrived(false);
    setBoat(0);
    setBump(0);
    sfx("whoosh");
    const n = blocks;
    const pace = band === "little" ? 720 : 560;
    for (let k = 1; k <= n; k++)
      later(() => {
        setStepNo(k);
        if (k >= ROCK) {
          setBump((b) => b + 1);
          sfx("splash");
          return;
        }
        setBoat(k);
        sfx("move");
        if (band !== "big" || k <= ISLAND) void say(numberWord(k));
        if (k === ISLAND) setArrived(true);
      }, 450 + (k - 1) * pace);
    later(() => {
      setRunning(false);
      setStepNo(null);
      ranThrough(n);
    }, 450 + (n - 1) * pace + 900);
  };

  const ranThrough = (n: number) => {
    if (n === 1) {
      narrate(SAY.bsOneStep, () => {
        setBoat(0);
        setStage("add3");
        countSquares();
      });
    } else if (n === ISLAND && stage === "play3") {
      sfx("dock");
      fx.burst(seaRef.current, "star", 14);
      narrate(SAY.bsMadeIt, () => {
        setBoat(0);
        setArrived(false);
        setStage("add5");
        narrate(SAY.bsTooMany);
      });
    } else if (n > ISLAND) {
      setExtrasRed(true);
      narrate(SAY.bsCrash, () => {
        setStage("remove");
        narrate(SAY.bsRemove);
      });
    } else {
      sfx("dock");
      fx.burst(seaRef.current, "star", 16);
      setStage("rule");
      narrate(SAY.bsRule);
    }
  };

  /** "The island is three steps away — one, two, three": the squares light up as they're counted. */
  const countSquares = () => {
    setBadges(0);
    setLine(SAY.bsCount);
    setCanAct(false);
    void say(SAY.bsCount).then(() => {
      [1, 2, 3].forEach((k) =>
        later(() => {
          setBadges(k);
          sfx("count", k);
          void say(numberWord(k));
        }, k * 650),
      );
      later(() => narrate(SAY.bsAddTwo), 3 * 650 + 700);
    });
  };

  const C = 100;
  const expectArrow = canAct && goal !== null && blocks < goal;
  const expectPlay = canAct && !running && (stage === "play1" || stage === "play3" || stage === "play5" || stage === "play3b");
  const stageNo = STAGES.indexOf(stage);
  return (
    <div className="flex w-full max-w-[1000px] flex-col items-center gap-4">
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-[var(--l-violet)] px-5 py-1.5 font-display text-xl font-extrabold text-white shadow-[0_4px_0_var(--l-violet-edge)]">⛵ Boat School</span>
        <span className="flex gap-1.5" aria-label={`step ${stageNo + 1} of ${STAGES.length}`}>
          {STAGES.map((s, i) => (
            <span key={s} className={cn("h-3 rounded-full transition-all", i === stageNo ? "w-7 bg-white" : i < stageNo ? "w-3 bg-white/85" : "w-3 bg-white/30")} />
          ))}
        </span>
      </div>

      {/* The sea: boat, two squares of water, the island, open water, a rock. */}
      <div ref={seaRef} className="relative overflow-hidden rounded-[22px] shadow-[0_8px_0_rgba(0,40,80,0.22)]" style={{ width: C * COLS, height: C * 1.3, background: "radial-gradient(circle at 50% 120%, rgba(255,255,255,0.18) 0 30%, transparent 31%) 0 0/34px 20px, linear-gradient(160deg, #48d0ef, #1aa6d6)" }}>
        {Array.from({ length: COLS }, (_, x) => (
          <span key={x} className="absolute flex items-center justify-center" style={{ left: x * C, top: C * 0.15, width: C, height: C, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)" }}>
            {x === ISLAND && <span className={cn(arrived && "l-boing")} style={{ fontSize: C * 0.7, lineHeight: 1 }}>🏝️</span>}
            {x === ISLAND && <span className="absolute inset-1 rounded-xl ring-4 ring-[var(--l-gold)]/70" />}
            {x === ROCK && <span style={{ fontSize: C * 0.72, lineHeight: 1 }}>🪨</span>}
            {x >= 1 && x <= ISLAND && badges >= x && (
              <span className="l-pop-in absolute -top-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--l-gold)] font-display text-xl font-extrabold text-[#5a3b00] shadow-[0_3px_0_var(--l-gold-edge)]">{x}</span>
            )}
          </span>
        ))}
        <span className="absolute flex items-center justify-center" style={{ left: 0, top: C * 0.15, width: C, height: C, transform: `translateX(${boat * C}px)`, transition: "transform 420ms cubic-bezier(0.34,1.3,0.64,1)" }}>
          <span key={`shake${bump}`} className={cn(bump > 0 && "l-shake")}>
            <TopBoat look={look} size={C * 0.9} />
          </span>
          {stepNo !== null && (
            <span key={`step${stepNo}`} className="l-pop-in absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-white px-2.5 font-display text-lg font-extrabold text-[var(--l-ink)] shadow-[0_3px_0_rgba(0,40,80,0.2)]">
              {stepNo}
            </span>
          )}
        </span>
        {bump > 0 && stage !== "rule" && (
          <span key={`b${bump}`} className="l-pop-in pointer-events-none absolute flex items-center justify-center" style={{ left: (ROCK - 0.5) * C, top: C * 0.15, width: C, height: C, fontSize: C * 0.6 }}>
            💦
          </span>
        )}
        {arrived && running && blocks > ISLAND && (
          <span className="l-pop-in absolute left-1/2 top-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/95 px-4 py-1 font-display text-base font-extrabold text-[var(--l-ink)]">🏝️ It made it… but there are more blocks!</span>
        )}
      </div>

      {/* What to do now (read aloud; the speaker says it again). */}
      <div key={line} className="l-card-in flex w-full max-w-[860px] items-center gap-4 rounded-[24px] bg-[#fff7d6] px-5 py-4 shadow-[0_5px_0_#f2d27a]">
        <HearButton parts={[line]} size={60} label="Hear it again" />
        <p className="flex-1 text-balance font-display text-2xl font-bold leading-snug text-[#5a3b00]">{line}</p>
      </div>

      {/* The program: one pill per block. The extras turn red — tap them to take them away. */}
      <div className="flex min-h-[86px] w-full max-w-[860px] flex-wrap items-center gap-3 rounded-[24px] bg-white/92 px-4 py-3 shadow-[0_6px_0_rgba(0,40,80,0.16)]">
        <span className="font-display text-lg font-extrabold text-[var(--l-ink-2)]">Your program:</span>
        {blocks === 0 && <span className="rounded-2xl border-[3px] border-dashed border-[var(--l-line)] px-4 py-3 font-display text-base font-bold text-[var(--l-ink-2)]">empty</span>}
        {Array.from({ length: blocks }, (_, k) => {
          const extra = extrasRed && k >= ISLAND;
          return (
            <button key={k} type="button" disabled={!extra || !canAct} onClick={() => removeExtra(k)} className={cn("relative rounded-2xl", extra && canAct && "l-hint")} aria-label={extra ? "Take away this extra block" : `block ${k + 1}`}>
              <BlockPill op="right" band={band} className={cn(extra && "ring-4 ring-[var(--l-coral)]")} style={extra ? { background: "var(--l-coral)", boxShadow: "0 5px 0 var(--l-coral-edge)" } : undefined} />
              {extra && <span className="absolute -right-2 -top-3 rounded-full bg-white px-2 font-display text-sm font-extrabold text-[var(--l-coral-edge)] shadow-[0_2px_0_rgba(0,0,0,0.15)]">extra ✕</span>}
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 font-display text-xs font-extrabold text-[var(--l-ink-2)]">{k + 1}</span>
            </button>
          );
        })}
      </div>

      {/* The controls: the arrow block and Play. A pointing hand shows what to do next. */}
      <div className="flex items-center gap-6 pt-2">
        <div className="relative">
          <button type="button" onClick={addArrow} disabled={!expectArrow} className={cn("rounded-2xl transition-transform active:translate-y-1", !expectArrow && "opacity-40")} aria-label="Add an arrow block">
            <BlockPill op="right" band={band} size="lg" />
          </button>
          {expectArrow && <span className="l-bob pointer-events-none absolute -bottom-12 left-1/2 -translate-x-1/2 text-5xl">👆</span>}
        </div>
        {stage === "rule" ? (
          canAct && (
            <Chunk tone="green" onClick={() => (sfx("star"), onDone())} className="l-pulse flex h-20 items-center gap-3 px-10 font-display text-3xl font-extrabold">
              I got it! <ThumbsUp className="h-8 w-8" strokeWidth={2.6} />
            </Chunk>
          )
        ) : (
          <div className="relative">
            <Chunk tone="green" disabled={!expectPlay} onClick={run} className={cn("flex h-20 items-center gap-3 px-10 font-display text-3xl font-extrabold", !expectPlay && "opacity-40")}>
              <Play className="h-8 w-8" fill="currentColor" /> Play
            </Chunk>
            {expectPlay && <span className="l-bob pointer-events-none absolute -bottom-12 left-1/2 -translate-x-1/2 text-5xl">👆</span>}
          </div>
        )}
      </div>
    </div>
  );
}
