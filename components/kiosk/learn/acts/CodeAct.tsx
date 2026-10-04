"use client";

import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Lightbulb, Play, Repeat, RotateCcw, RotateCw, Undo2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Cmd, CodeBlock, CodeLevel, Dir } from "@/lib/learn/types";
import { parseWorld, runProgram, blockCount, key, type Frame } from "@/lib/learn/codeSim";
import { SAY } from "@/lib/learn/script";
import { say, type Part } from "@/lib/learn/audio";
import { sfx, buzz } from "@/lib/learn/sfx";
import { Chunk, useDrag } from "../kit";
import { PromptRow, useLater, usePrompt, type ActProps } from "./common";

// Code: steer the boat with a program of blocks. Drag (or tap) arrows into "your code", press
// play, and watch it run block by block — the running block lights up, a bump shows exactly
// which block went wrong. Repeat blocks, turning from the boat's point of view, and bug hunts
// come in as the course goes on.

type Simple = { id: number; cmd: Cmd };
type Loop = { id: number; repeat: number; body: Simple[] };
type UBlock = Simple | Loop;
const isLoop = (b: UBlock): b is Loop => "repeat" in b;

const STEP_MS = 480;
const BODY_MAX = 5;

const LOOK: Record<Cmd | "repeat", { icon: ReactNode; tone: string; edge: string; label: string }> = {
  up: { icon: <ArrowUp strokeWidth={3.4} />, tone: "var(--l-blue)", edge: "var(--l-blue-edge)", label: "up" },
  down: { icon: <ArrowDown strokeWidth={3.4} />, tone: "var(--l-blue)", edge: "var(--l-blue-edge)", label: "down" },
  left: { icon: <ArrowLeft strokeWidth={3.4} />, tone: "var(--l-blue)", edge: "var(--l-blue-edge)", label: "left" },
  right: { icon: <ArrowRight strokeWidth={3.4} />, tone: "var(--l-blue)", edge: "var(--l-blue-edge)", label: "right" },
  forward: { icon: <ArrowUp strokeWidth={3.4} />, tone: "var(--l-green)", edge: "var(--l-green-edge)", label: "forward" },
  turnLeft: { icon: <RotateCcw strokeWidth={3} />, tone: "var(--l-orange)", edge: "var(--l-orange-edge)", label: "turn left" },
  turnRight: { icon: <RotateCw strokeWidth={3} />, tone: "var(--l-orange)", edge: "var(--l-orange-edge)", label: "turn right" },
  repeat: { icon: <Repeat strokeWidth={3} />, tone: "var(--l-violet)", edge: "var(--l-violet-edge)", label: "repeat" },
};

/** Editor blocks (with ids for keys and removal) from a program; ids count up from `from`. */
function toU(blocks: CodeBlock[], from = 1): UBlock[] {
  let id = from;
  return blocks.map((b) => ("cmd" in b ? { id: id++, cmd: b.cmd } : { id: id++, repeat: b.repeat, body: b.body.filter((x): x is { cmd: Cmd } => "cmd" in x).map((x) => ({ id: id++, cmd: x.cmd })) }));
}
const toCode = (p: UBlock[]): CodeBlock[] => p.map((b) => (isLoop(b) ? { repeat: b.repeat, body: b.body.map((x) => ({ cmd: x.cmd })) } : { cmd: b.cmd }));
const sameShape = (a: CodeBlock, b: CodeBlock) => JSON.stringify(a) === JSON.stringify(b);
const ROT: Record<Dir, number> = { right: 0, down: 90, left: 180, up: 270 };
const STEP: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export function CodeAct({ act, fx, onDone }: ActProps<"code">) {
  const level: CodeLevel = act.level;
  const world = useMemo(() => parseWorld(level), [level]);
  const initial = useMemo(() => toU(level.buggy ?? []), [level]);
  const [prog, setProg] = useState<UBlock[]>(initial);
  const [frame, setFrame] = useState<Frame | null>(null);
  const [running, setRunning] = useState(false);
  const [trail, setTrail] = useState<string[]>([]);
  const [bumpN, setBumpN] = useState(0);
  const [errorAt, setErrorAt] = useState<number[] | null>(null);
  const [fails, setFails] = useState(0);
  const [won, setWon] = useState(false);
  const [hintAt, setHintAt] = useState<{ palette?: Cmd | "repeat"; block?: number } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(1000);
  const newId = () => ++idRef.current;
  const later = useLater();

  const hasShells = world.shells.size > 0;
  const turns = level.palette.includes("forward");
  const line = level.buggy ? SAY.codeBug : level.loops && fx.firstTime ? SAY.codeLoop : turns && fx.firstTime ? SAY.codeTurns : hasShells ? SAY.codeShells : SAY.codeGoal;
  const parts: Part[] = fx.firstTime && !level.buggy ? [line, { gap: 300 }, SAY.addBlocks] : [line];
  usePrompt(fx, parts);

  const capacity = Math.min(14, level.best + 4);
  const used = blockCount(toCode(prog));
  const pos = frame?.pos ?? world.start;
  const facing = frame?.facing ?? level.facing;
  const got = new Set(frame?.got ?? []);
  const activeAt = running ? frame?.at ?? null : null;

  const edit = (next: UBlock[]) => {
    if (running || won) return;
    if (blockCount(toCode(next)) > capacity) {
      sfx("wrong");
      return;
    }
    setProg(next);
    setErrorAt(null);
    setHintAt(null);
    if (frame) {
      setFrame(null);
      setTrail([]);
    }
  };
  const addBlock = (cmd: Cmd | "repeat", into?: number) => {
    sfx("snap");
    buzz(10);
    if (cmd === "repeat") return edit([...prog, { id: newId(), repeat: 2, body: [] }]);
    // A tap fills an empty repeat that was just added; otherwise blocks go on the end.
    const last = prog[prog.length - 1];
    const target = into ?? (last && isLoop(last) && last.body.length === 0 ? last.id : undefined);
    if (target !== undefined) {
      return edit(prog.map((b) => (b.id === target && isLoop(b) && b.body.length < BODY_MAX ? { ...b, body: [...b.body, { id: newId(), cmd }] } : b)));
    }
    edit([...prog, { id: newId(), cmd }]);
  };
  const removeBlock = (id: number) => {
    sfx("pop");
    edit(prog.filter((b) => b.id !== id).map((b) => (isLoop(b) ? { ...b, body: b.body.filter((x) => x.id !== id) } : b)));
  };
  const cycleRepeat = (id: number) => {
    sfx("pick");
    edit(prog.map((b) => (b.id === id && isLoop(b) ? { ...b, repeat: b.repeat >= 9 ? 2 : b.repeat + 1 } : b)));
  };

  const play = () => {
    if (running || won) return;
    if (!prog.length) {
      void say(SAY.addBlocks);
      return;
    }
    sfx("whoosh");
    const run = runProgram(level, toCode(prog));
    setRunning(true);
    setErrorAt(null);
    setHintAt(null);
    setTrail([key(world.start)]);
    setFrame(run.frames[0]);
    run.frames.forEach((f, i) => {
      if (i === 0) return;
      later(() => {
        setFrame(f);
        if (f.event === "move" || f.event === "shell" || f.event === "goal") setTrail((t) => (t.includes(key(f.pos)) ? t : [...t, key(f.pos)]));
        if (f.event === "move") sfx("move");
        else if (f.event === "turn") sfx("turn");
        else if (f.event === "shell") {
          sfx("shell");
          const cell = mapRef.current?.querySelector(`[data-cell="${key(f.pos)}"]`);
          fx.burst(cell, "sea", 7);
        } else if (f.event === "bump") {
          sfx("bump");
          buzz([0, 40, 30, 40]);
          setBumpN((n) => n + 1);
        }
      }, i * STEP_MS);
    });
    later(() => finishRun(run.outcome, run.frames[run.frames.length - 1]), run.frames.length * STEP_MS + 120);
  };

  const finishRun = (outcome: "win" | "bump" | "short" | "shells", last: Frame) => {
    if (outcome === "win") {
      setWon(true);
      setRunning(false);
      sfx("dock");
      const extra = blockCount(toCode(prog)) > level.best ? 1 : 0;
      later(() => fx.right(mapRef.current, []), 250);
      later(() => onDone(Math.min(2, fails) + extra), 2300);
      return;
    }
    setFails((n) => n + 1);
    if (outcome === "bump") {
      setErrorAt(last.at);
      const cmd = blockAt(prog, last.at);
      const dir: Dir = cmd === "forward" || !cmd ? last.facing : (cmd as Dir);
      const [dx, dy] = STEP[dir] ?? [0, 0];
      const nx = last.pos.x + dx;
      const ny = last.pos.y + dy;
      const off = nx < 0 || ny < 0 || nx >= world.w || ny >= world.h;
      void say(off ? SAY.outOfBounds : SAY.bumped);
    } else void say(outcome === "shells" ? SAY.missedShells : SAY.notThere);
    sfx("wrong");
    later(() => {
      setRunning(false);
      setFrame(null);
      setTrail([]);
    }, 1500);
  };

  const hint = () => {
    sfx("pick");
    const code = toCode(prog);
    const sol = level.solution;
    let k = 0;
    while (k < code.length && k < sol.length && sameShape(code[k], sol[k])) k++;
    if (k < code.length) setHintAt({ block: prog[k].id }); // this block is the problem
    else if (k < sol.length) {
      const s = sol[k];
      setHintAt({ palette: "cmd" in s ? s.cmd : "repeat" });
    }
    void say(level.hint ? [SAY.codeHint, { gap: 200 }, level.hint] : SAY.codeHint);
  };

  const cell = `min(calc(min(46vw, 540px) / ${world.w}), calc(46vh / ${world.h}), 112px)`;

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <PromptRow parts={parts}>{level.buggy ? "Find the bug and fix it!" : hasShells ? "Get every shell, then sail to the island" : "Sail the boat to the island"}</PromptRow>
      <div className="flex w-full flex-col items-center justify-center gap-5 lg:flex-row lg:items-start">
        {/* The map */}
        <div className="rounded-[30px] bg-white p-3 shadow-[0_8px_0_var(--l-line)]">
          <div ref={mapRef} className="relative" style={{ "--cell": cell, width: `calc(var(--cell) * ${world.w})`, height: `calc(var(--cell) * ${world.h})` } as CSSProperties}>
            {Array.from({ length: world.h }, (_, y) =>
              Array.from({ length: world.w }, (_, x) => {
                const k = key({ x, y });
                const rock = world.rocks.has(k);
                const shell = world.shells.has(k) && !got.has(k);
                const goal = world.goal.x === x && world.goal.y === y;
                return (
                  <div
                    key={k}
                    data-cell={k}
                    className="absolute flex items-center justify-center"
                    style={{ left: `calc(var(--cell) * ${x})`, top: `calc(var(--cell) * ${y})`, width: "var(--cell)", height: "var(--cell)", padding: 3 }}
                  >
                    <div
                      className={cn("flex h-full w-full items-center justify-center rounded-[16px]", rock ? "bg-[#c9b48a]" : "bg-[#7fd3f7]")}
                      style={{ fontSize: "calc(var(--cell) * 0.55)", lineHeight: 1, backgroundImage: rock ? undefined : "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.35), transparent 45%)" }}
                    >
                      {rock ? "🪨" : goal ? "🏝️" : shell ? <span className="l-bob">🐚</span> : trail.includes(k) ? <span className="h-3 w-3 rounded-full bg-white/80" /> : null}
                    </div>
                  </div>
                );
              }),
            )}
            {/* the boat */}
            <div className="absolute left-0 top-0 transition-transform ease-out" style={{ width: "var(--cell)", height: "var(--cell)", transform: `translate(calc(var(--cell) * ${pos.x}), calc(var(--cell) * ${pos.y}))`, transitionDuration: `${STEP_MS - 80}ms` }}>
              <div key={bumpN} className={cn("flex h-full w-full items-center justify-center", bumpN > 0 && frame?.event === "bump" && "l-shake")}>
                <TopBoat angle={ROT[facing]} won={won} />
              </div>
            </div>
          </div>
        </div>

        {/* The code */}
        <div className="flex w-full max-w-[520px] flex-col gap-4">
          <div data-drop="program" className="min-h-[132px] rounded-[26px] bg-white p-4 shadow-[0_8px_0_var(--l-line)]">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-display text-lg font-bold text-[var(--l-ink-2)]">Your code</span>
              <span className={cn("rounded-full px-3 py-0.5 font-display text-sm font-bold", used >= capacity ? "bg-[var(--l-coral)] text-white" : "bg-[var(--l-card-2)] text-[var(--l-ink-2)]")}>
                {used}/{capacity}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {prog.map((b, i) =>
                isLoop(b) ? (
                  <div key={b.id} data-drop="repeat" data-id={b.id} className={cn("flex flex-wrap items-center gap-2 rounded-[20px] border-4 border-[var(--l-violet)] bg-[var(--l-violet)]/10 p-1.5 pr-2", activeAt?.[0] === i && "outline outline-4 outline-[var(--l-gold)]", hintAt?.block === b.id && "l-hint")}>
                    <button type="button" onClick={() => cycleRepeat(b.id)} className="flex h-[64px] items-center gap-1 rounded-2xl bg-[var(--l-violet)] px-3 font-display text-2xl font-extrabold text-white shadow-[0_4px_0_var(--l-violet-edge)]" aria-label={`repeat ${b.repeat} times, tap to change`}>
                      <Repeat className="h-6 w-6" strokeWidth={3} />×{b.repeat}
                    </button>
                    {b.body.map((x, j) => (
                      <BlockChip key={x.id} cmd={x.cmd} onTap={() => removeBlock(x.id)} active={activeAt?.[0] === i && activeAt?.[1] === j} error={errorAt?.[0] === i && errorAt?.[1] === j} small />
                    ))}
                    {b.body.length < BODY_MAX && <span className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl border-[3px] border-dashed border-[var(--l-violet)]/60 text-2xl text-[var(--l-violet)]/70">+</span>}
                    <button type="button" onClick={() => removeBlock(b.id)} aria-label="remove repeat" className="ml-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-white text-[var(--l-ink-2)] shadow-[0_2px_0_var(--l-line)]">
                      <X className="h-4 w-4" strokeWidth={3} />
                    </button>
                  </div>
                ) : (
                  <BlockChip key={b.id} cmd={b.cmd} onTap={() => removeBlock(b.id)} active={activeAt?.length === 1 && activeAt[0] === i} error={errorAt?.length === 1 && errorAt[0] === i} hint={hintAt?.block === b.id} />
                ),
              )}
              {Array.from({ length: Math.max(0, Math.min(3, capacity - used)) }, (_, i) => (
                <span key={`e${i}`} className="h-[72px] w-[72px] rounded-[18px] border-[3px] border-dashed border-[var(--l-line)]" aria-hidden />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {level.palette.map((c) => (
              <PaletteBlock key={c} cmd={c} onAdd={addBlock} hint={hintAt?.palette === c} disabled={running || won} />
            ))}
            {level.loops && <PaletteBlock cmd="repeat" onAdd={addBlock} hint={hintAt?.palette === "repeat"} disabled={running || won} />}
          </div>

          <div className="flex items-center justify-center gap-3">
            <Chunk
              tone="white"
              onClick={() => {
                sfx("tap");
                idRef.current += 100;
                edit(toU(level.buggy ?? [], idRef.current));
              }}
              disabled={running || won}
              aria-label="Start over"
              className="flex h-[72px] w-[72px] items-center justify-center"
            >
              <Undo2 className="h-8 w-8 text-[var(--l-ink-2)]" strokeWidth={2.8} />
            </Chunk>
            <Chunk tone="green" onClick={play} disabled={running || won} className={cn("flex h-[84px] flex-1 items-center justify-center gap-3 font-display text-3xl font-extrabold", !running && prog.length > 0 && !won && "l-pulse")}>
              <Play className="h-9 w-9 fill-current" /> Play
            </Chunk>
            {(fails >= 1 || level.buggy) && (
              <Chunk tone="gold" onClick={hint} disabled={running || won} aria-label="Hint" className="flex h-[72px] w-[72px] items-center justify-center">
                <Lightbulb className="h-8 w-8" strokeWidth={2.6} />
              </Chunk>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function blockAt(prog: UBlock[], at: number[] | null): Cmd | null {
  if (!at) return null;
  const b = prog[at[0]];
  if (!b) return null;
  if (isLoop(b)) return b.body[at[1] ?? 0]?.cmd ?? null;
  return b.cmd;
}

function BlockChip({ cmd, onTap, active, error, hint, small }: { cmd: Cmd; onTap: () => void; active?: boolean; error?: boolean; hint?: boolean; small?: boolean }) {
  const look = LOOK[cmd];
  const s = small ? 52 : 72;
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={`${look.label} block, tap to remove`}
      className={cn("l-pop-in flex items-center justify-center rounded-[18px] text-white transition-transform", active && "-translate-y-1.5 scale-110", error && "l-shake", hint && "l-hint")}
      style={{ width: s, height: s, background: error ? "var(--l-coral)" : look.tone, boxShadow: `0 5px 0 ${error ? "var(--l-coral-edge)" : look.edge}${active ? ", 0 0 0 5px var(--l-gold)" : ""}` }}
    >
      <span style={{ width: s * 0.55, height: s * 0.55 }} className="flex items-center justify-center [&>svg]:h-full [&>svg]:w-full">
        {look.icon}
      </span>
    </button>
  );
}

function PaletteBlock({ cmd, onAdd, hint, disabled }: { cmd: Cmd | "repeat"; onAdd: (c: Cmd | "repeat", into?: number) => void; hint?: boolean; disabled?: boolean }) {
  const look = LOOK[cmd];
  const { handlers, dragging } = useDrag({
    disabled,
    onLift: () => sfx("lift"),
    onTap: () => onAdd(cmd),
    onDrop: (target) => {
      if (!target) return;
      if (target.dataset.drop === "repeat" && cmd !== "repeat") onAdd(cmd, Number(target.dataset.id));
      else if (target.dataset.drop === "program" || target.dataset.drop === "repeat") onAdd(cmd);
    },
  });
  return (
    <div
      {...handlers}
      data-dragging={dragging}
      role="button"
      aria-label={`${look.label} block`}
      className={cn("l-drag l-chunk flex h-[88px] w-[88px] flex-col items-center justify-center gap-0.5 text-white", hint && "l-hint", disabled && "opacity-50")}
      style={{ "--f": look.tone, "--e": look.edge } as CSSProperties}
    >
      <span className="flex h-11 w-11 items-center justify-center [&>svg]:h-full [&>svg]:w-full">{look.icon}</span>
      <span className="font-display text-[13px] font-bold leading-none opacity-95">{look.label}</span>
    </div>
  );
}

/** The boat seen from above — its bow points the way it will go. */
function TopBoat({ angle, won }: { angle: number; won: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className={cn("h-[86%] w-[86%] drop-shadow-[0_4px_4px_rgba(0,40,80,0.3)] transition-transform duration-300", won && "l-boing")} style={{ transform: `rotate(${angle}deg)` }} aria-label="boat">
      <path d="M10 50 C10 31 28 22 50 22 C71 22 86 35 95 50 C86 65 71 78 50 78 C28 78 10 69 10 50 Z" fill="#ff7363" stroke="#df5444" strokeWidth="3" />
      <path d="M21 50 C21 37 34 31 50 31 C66 31 77 40 83 50 C77 60 66 69 50 69 C34 69 21 63 21 50 Z" fill="#ffe8dc" />
      <path d="M44 50 L24 34 C33 44 35 47 44 50 Z" fill="#fff" stroke="#cfdbe6" strokeWidth="1.5" />
      <circle cx="44" cy="50" r="5" fill="#ffc83d" stroke="#e0a21a" strokeWidth="2" />
      <circle cx="70" cy="43" r="4" fill="#17324d" />
      <circle cx="70" cy="57" r="4" fill="#17324d" />
      <circle cx="71.4" cy="41.6" r="1.3" fill="#fff" />
      <circle cx="71.4" cy="55.6" r="1.3" fill="#fff" />
    </svg>
  );
}
