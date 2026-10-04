"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ConceptId } from "@/lib/learn/types";
import { say } from "@/lib/learn/audio";
import { sfx } from "@/lib/learn/sfx";
import { Chunk } from "../kit";
import type { ActProps } from "../acts/common";
import { MiniSpeaker, useLater } from "../acts/common";
import { BlockPill } from "../code/Editor";

// Code Lab concept cards: a big coding idea, shown — not told. Each idea is a few frames; every
// frame has one sentence (spoken for kids who can't read yet) and a little animated demo of
// exactly that sentence: a robot following cards one at a time, a bug found and fixed, six claps
// squeezing into one loop, an if choosing an umbrella, a variable box filling with coins, a frog
// that jumps when YOU tap it. Watching the idea happen is what makes the blocks make sense.

export function ConceptAct({ act, fx, onDone }: ActProps<"concept">) {
  const [frame, setFrame] = useState(0);
  const last = act.lines.length - 1;
  const voiced = fx.voice !== "keys";
  useEffect(() => {
    fx.setPrompt([act.lines[frame]]);
    if (!voiced) return;
    const t = window.setTimeout(() => void say(act.lines[frame]), frame === 0 ? 450 : 250);
    return () => window.clearTimeout(t);
    // Each frame speaks its own sentence once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame]);
  const next = () => {
    sfx("tap");
    if (frame < last) setFrame(frame + 1);
    else {
      sfx("star");
      onDone(0);
    }
  };
  return (
    <div className="flex w-full max-w-[1000px] flex-col items-center gap-4">
      <span className="l-pop-in rounded-full bg-[var(--l-violet)] px-5 py-1.5 font-display text-xl font-extrabold text-white shadow-[0_4px_0_var(--l-violet-edge)]">💡 {act.title}</span>
      <div className="relative flex min-h-[300px] w-full items-center justify-center rounded-[32px] bg-white/95 px-4 py-6 shadow-[0_8px_0_rgba(0,40,80,0.16)]">
        <Demo concept={act.concept} frame={frame} reduced={fx.reduced} />
      </div>
      <div key={frame} className="l-card-in relative flex w-full max-w-[860px] items-center gap-3 rounded-[24px] bg-[#fff7d6] px-5 py-4 shadow-[0_5px_0_#f2d27a]">
        <p className="flex-1 text-balance text-center font-display text-2xl font-bold leading-snug text-[#5a3b00]">{act.lines[frame]}</p>
        <MiniSpeaker parts={[act.lines[frame]]} className="relative" />
      </div>
      <div className="flex items-center gap-3">
        <span className="flex gap-1.5" aria-label={`part ${frame + 1} of ${last + 1}`}>
          {act.lines.map((_, i) => (
            <span key={i} className={cn("h-3 rounded-full transition-all", i === frame ? "w-8 bg-white" : i < frame ? "w-3 bg-white/80" : "w-3 bg-white/35")} />
          ))}
        </span>
        <Chunk tone={frame < last ? "blue" : "green"} onClick={next} className="l-pulse flex h-16 items-center gap-2 px-8 font-display text-2xl font-extrabold">
          {frame < last ? (
            <>
              Next <ArrowRight className="h-7 w-7" strokeWidth={3} />
            </>
          ) : (
            <>
              Got it! <ThumbsUp className="h-7 w-7" strokeWidth={2.6} />
            </>
          )}
        </Chunk>
      </div>
    </div>
  );
}

function Demo({ concept, frame, reduced }: { concept: ConceptId; frame: number; reduced: boolean }): ReactNode {
  switch (concept) {
    case "program": return <ProgramDemo frame={frame} />;
    case "bug": return <BugDemo frame={frame} />;
    case "loop": return <LoopDemo frame={frame} />;
    case "condition": return <IfDemo frame={frame} />;
    case "until": return <UntilDemo frame={frame} />;
    case "function": return <FunctionDemo frame={frame} />;
    case "variable": return <VariableDemo frame={frame} />;
    case "event": return <EventDemo frame={frame} />;
    case "algorithm": return <AlgorithmDemo frame={frame} />;
    case "binary": return <BinaryDemo frame={frame} />;
    case "sorting": return <SortingDemo frame={frame} />;
    case "search": return <SearchDemo frame={frame} />;
    case "coordinates": return <CoordsDemo frame={frame} />;
    case "machine": return <MachineDemo frame={frame} />;
    case "logic": return <LogicDemo frame={frame} />;
    case "cipher": return <CipherDemo frame={frame} />;
    case "nested": return <NestedDemo frame={frame} />;
    case "data": return <DataDemo frame={frame} />;
    case "python": return <PythonDemo frame={frame} />;
  }
  void reduced;
  return null;
}

// ── A tiny robot world: a row of cells and a strip of instruction cards ─────────────────────
type Card = "R" | "L" | "clap" | "wave" | "spin" | "jump";
const CARD_OP: Record<Card, string> = { R: "right", L: "left", clap: "clap", wave: "wave", spin: "spin", jump: "jump" };

/** Runs `cards` one at a time (when `go` changes), moving the robot along a path of `cells`. */
function useRun(cards: Card[], go: number, start = 0, cells = 5) {
  const [i, setI] = useState(-1);
  const [pos, setPos] = useState(start);
  const [fell, setFell] = useState(false);
  const later = useLater();
  useEffect(() => {
    if (go <= 0) return;
    let p = start;
    cards.forEach((c, k) => {
      later(() => {
        setI(k);
        if (c === "R") p = p + 1;
        else if (c === "L") p = p - 1;
        if (p < 0 || p >= cells) {
          setFell(true);
          sfx("bump");
        } else sfx(c === "R" || c === "L" ? "move" : "whoosh");
        setPos(Math.max(-0.6, Math.min(cells - 0.4, p)));
      }, 700 + k * 650);
    });
    later(() => setI(cards.length), 700 + cards.length * 650);
    // The run restarts whenever `go` changes (a new frame).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [go]);
  return { i, pos, fell, done: i >= cards.length };
}

function Path({ cells = 5, pos, goal, fell, mood, actor = "🤖", goalEmoji = "🍪", move }: { cells?: number; pos: number; goal?: number; fell?: boolean; mood?: string; actor?: string; goalEmoji?: string; move?: string | null }) {
  const W = 92;
  return (
    <div className="relative" style={{ width: cells * W, height: W + 26 }}>
      {Array.from({ length: cells }, (_, x) => (
        <span key={x} className="absolute rounded-2xl bg-[#e0f2fe] shadow-[inset_0_-4px_0_#bae6fd]" style={{ left: x * W + 4, top: 22, width: W - 8, height: W - 8 }} />
      ))}
      {goal !== undefined && (
        <span className={cn("absolute flex items-center justify-center text-5xl", pos === goal && !fell && "l-boing")} style={{ left: goal * W, top: 22, width: W, height: W - 8 }}>
          {goalEmoji}
        </span>
      )}
      <span className="absolute flex items-center justify-center" style={{ left: 0, top: 18, width: W, height: W, transform: `translate(${pos * W}px, ${fell ? 40 : 0}px) rotate(${fell ? 40 : 0}deg)`, transition: "transform 420ms cubic-bezier(0.34,1.3,0.64,1)", opacity: fell ? 0.5 : 1 }}>
        <span key={move ?? ""} className={cn("text-6xl", move && "l-hop")}>{actor}</span>
      </span>
      {mood && <span className="l-pop-in absolute -top-3 text-4xl" style={{ left: pos * W + W * 0.62 }}>{mood}</span>}
    </div>
  );
}

function Cards({ cards, at, bad, fixed }: { cards: Card[]; at: number; bad?: number; fixed?: number }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {cards.map((c, k) => (
        <span key={`${k}-${c}`} className={cn("rounded-2xl transition-transform", k === at && "scale-110 ring-[5px] ring-[var(--l-gold)]", k === bad && "l-pulse ring-[5px] ring-[var(--l-coral)]", k === fixed && "l-pop-in")}>
          <BlockPill op={CARD_OP[c]} band="middle" size="md" />
        </span>
      ))}
    </div>
  );
}

function ProgramDemo({ frame }: { frame: number }) {
  const cards: Card[] = frame === 2 ? ["R", "R", "R"] : ["R", "R", "R", "R"];
  const run = useRun(cards, frame >= 1 ? frame : 0);
  const pos = frame === 0 ? 0 : run.pos;
  const arrived = pos === 4;
  return (
    <div className="flex flex-col items-center gap-5">
      <Cards cards={cards} at={frame >= 1 ? run.i : -1} />
      <Path pos={pos} goal={4} mood={run.done ? (arrived ? "🎉" : "🤔") : undefined} />
    </div>
  );
}

function BugDemo({ frame }: { frame: number }) {
  const cards: Card[] = frame === 2 ? ["R", "R", "R", "R"] : ["R", "R", "L", "R"];
  const run = useRun(cards, frame === 0 || frame === 2 ? frame + 1 : 0);
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative">
        <Cards cards={cards} at={frame === 1 ? -1 : run.i} bad={frame === 1 ? 2 : undefined} fixed={frame === 2 ? 2 : undefined} />
        {frame === 1 && <span className="l-pop-in absolute -top-10 left-1/2 text-5xl">🔍</span>}
      </div>
      <Path pos={frame === 1 ? 1 : run.pos} goal={4} mood={run.done ? (frame === 2 ? "🎉" : "🐞") : frame === 1 ? "🐞" : undefined} />
    </div>
  );
}

function LoopDemo({ frame }: { frame: number }) {
  const claps: Card[] = ["clap", "clap", "clap", "clap", "clap", "clap"];
  const run = useRun(claps, frame === 0 ? 1 : frame === 2 ? 3 : 0);
  const n = run.i < 0 ? 0 : Math.min(6, run.i + 1);
  return (
    <div className="flex flex-col items-center gap-6">
      {frame === 0 ? (
        <Cards cards={claps} at={run.i} />
      ) : (
        <div className="l-pop-in flex items-center gap-3 rounded-[20px] bg-[#ff9149] px-4 py-3 shadow-[0_5px_0_#e26f27]">
          <span className="font-display text-xl font-extrabold text-white">🔁 Repeat</span>
          <span className="rounded-xl bg-white px-3 py-1 font-display text-xl font-extrabold text-[#e26f27]">×6</span>
          <span className={cn("rounded-2xl", frame === 2 && run.i >= 0 && run.i < 6 && "ring-[5px] ring-[var(--l-gold)]")}>
            <BlockPill op="clap" band="middle" />
          </span>
          {frame === 2 && run.i >= 0 && run.i < 6 && <span key={n} className="l-pop-in rounded-xl bg-[#fff7d6] px-2.5 py-1 font-display text-lg font-extrabold text-[#7a5200]">{n} of 6</span>}
        </div>
      )}
      <div className="flex items-center gap-6">
        <span key={run.i} className={cn("text-7xl", run.i >= 0 && run.i < 6 && "l-hop")}>🤖</span>
        <span className="font-display text-5xl font-extrabold text-[var(--l-ink)]">👏 × {n}</span>
      </div>
      {frame >= 1 && <span className="l-pop-in rounded-full bg-[#dcfce7] px-4 py-1.5 font-display text-xl font-extrabold text-[#166534]">6 blocks → 1 loop</span>}
    </div>
  );
}

function IfDemo({ frame }: { frame: number }) {
  const rainy = frame === 1;
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex items-center gap-3 rounded-[20px] bg-[#a855f7] px-4 py-3 font-display text-xl font-extrabold text-white shadow-[0_5px_0_#7e22ce]">
        ❓ If
        <span className={cn("rounded-xl bg-white px-3 py-1 text-[#7e22ce]", frame === 1 && "bg-[#bbf7d0] text-[#15803d]", frame === 2 && "bg-[#fecaca] text-[#b91c1c]")}>
          🌧️ raining? {frame === 1 ? "✓" : frame === 2 ? "✗" : ""}
        </span>
        <span className={cn("rounded-xl bg-white/85 px-3 py-1 text-[var(--l-ink)]", frame === 1 && "ring-4 ring-[var(--l-gold)]")}>☂️ umbrella</span>
        <span className="text-white/90">else</span>
        <span className={cn("rounded-xl bg-white/85 px-3 py-1 text-[var(--l-ink)]", frame === 2 && "ring-4 ring-[var(--l-gold)]")}>😎 sunglasses</span>
      </div>
      <div className="relative flex h-44 w-[420px] items-end justify-center overflow-hidden rounded-[24px]" style={{ background: frame === 0 ? "linear-gradient(#cbd5e1,#e2e8f0)" : rainy ? "linear-gradient(#64748b,#94a3b8)" : "linear-gradient(#7dd3fc,#e0f2fe)" }}>
        <span className="absolute left-6 top-3 text-5xl">{frame === 0 ? "❔" : rainy ? "🌧️" : "☀️"}</span>
        {rainy && <span className="l-rain pointer-events-none absolute inset-0" />}
        <span key={frame} className="l-hop mb-3 text-7xl">🤖</span>
        {frame > 0 && <span key={`g${frame}`} className="l-pop-in mb-16 -ml-6 text-5xl">{rainy ? "☂️" : "😎"}</span>}
      </div>
    </div>
  );
}

function UntilDemo({ frame }: { frame: number }) {
  const [p, setP] = useState(0);
  const [checks, setChecks] = useState<boolean[]>([]);
  const later = useLater();
  useEffect(() => {
    if (frame < 1) return;
    let x = 0;
    for (let k = 0; k < 5; k++) {
      later(() => {
        const atDoor = x === 4;
        setChecks((c) => [...c, atDoor]);
        sfx("beep");
        if (!atDoor) {
          later(() => {
            x += 1;
            setP(x);
            sfx("move");
          }, 380);
        }
      }, 600 + k * 900);
    }
    // Runs once when the walking frame starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame]);
  const lastCheck = checks[checks.length - 1];
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex items-center gap-3 rounded-[20px] bg-[#ff9149] px-4 py-3 font-display text-xl font-extrabold text-white shadow-[0_5px_0_#e26f27]">
        🔁 Repeat until
        <span className={cn("rounded-xl bg-white px-3 py-1 text-[#e26f27]", lastCheck === true && "bg-[#bbf7d0] text-[#15803d]", lastCheck === false && "bg-[#fecaca] text-[#b91c1c]")}>
          🚪 at the door? {lastCheck === undefined ? "" : lastCheck ? "✓ yes!" : "✗ no"}
        </span>
        <BlockPill op="right" band="middle" size="sm" />
      </div>
      <Path pos={p} goal={4} goalEmoji="🚪" mood={lastCheck ? "🎉" : undefined} />
      {frame >= 1 && <span className="font-display text-lg font-extrabold text-[var(--l-ink-2)]">checks: {checks.map((c) => (c ? "✓" : "✗")).join(" ")}</span>}
    </div>
  );
}

function FunctionDemo({ frame }: { frame: number }) {
  const steps: Card[] = ["wave", "spin", "clap"];
  const run = useRun([...steps, ...steps], frame === 2 ? 3 : 0);
  const move = run.i >= 0 && run.i < 6 ? CARD_OP[[...steps, ...steps][run.i]] : null;
  return (
    <div className="flex flex-col items-center gap-5">
      {frame === 0 ? (
        <Cards cards={steps} at={-1} />
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-4">
          <div className="l-pop-in rounded-[20px] bg-[#ff6aa2] p-3 shadow-[0_5px_0_#e0457f]">
            <span className="mb-2 block font-display text-xl font-extrabold text-white">🧩 dance =</span>
            <div className="flex gap-2 rounded-xl bg-white/85 p-2">
              {steps.map((c) => (
                <BlockPill key={c} op={CARD_OP[c]} band="middle" size="sm" />
              ))}
            </div>
          </div>
          {frame === 2 && (
            <div className="flex flex-col gap-2">
              {[0, 1].map((k) => (
                <span key={k} className={cn("rounded-2xl transition-transform", run.i >= k * 3 && run.i < k * 3 + 3 && "scale-110 ring-[5px] ring-[var(--l-gold)]")}>
                  <BlockPill op="call" block={{ op: "call", name: "dance" }} band="middle" />
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      <span key={run.i} className={cn("text-8xl", move && "l-hop")}>🤖</span>
      {frame === 2 && <span className="font-display text-xl font-extrabold text-[var(--l-ink)]">2 blocks → {Math.max(0, Math.min(6, run.i + 1))} moves</span>}
    </div>
  );
}

function VariableDemo({ frame }: { frame: number }) {
  const [v, setV] = useState(0);
  const later = useLater();
  useEffect(() => {
    if (frame !== 1) return;
    [1, 2, 3].forEach((n, k) =>
      later(() => {
        setV(n);
        sfx("shell");
      }, 700 + k * 900),
    );
    // Runs once on the counting frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame]);
  const shown = frame === 0 ? 0 : frame === 2 ? 3 : v;
  return (
    <div className="flex flex-col items-center gap-4">
      {frame === 1 && <code className="rounded-xl bg-[#0f172a] px-4 py-2 font-mono text-xl text-[#e2e8f0]">coins = coins + 1</code>}
      <div className="relative flex flex-col items-center">
        <span className="rounded-t-xl bg-[var(--l-orange)] px-4 py-1 font-mono text-lg font-bold text-white">coins</span>
        <span key={shown} className="l-pop-in flex h-32 w-40 items-center justify-center rounded-[22px] border-[6px] border-[var(--l-orange)] bg-white font-display text-7xl font-extrabold text-[var(--l-ink)]">{shown}</span>
        {frame === 1 && v > 0 && <span key={`c${v}`} className="l-float-num absolute -top-4 text-5xl">🪙</span>}
      </div>
      {frame === 2 && (
        <div className="l-pop-in flex gap-3 font-display text-xl font-extrabold">
          <span className="rounded-full bg-[#fff7d6] px-4 py-1.5 text-[#7a5200]">🏆 score: 3</span>
          <span className="rounded-full bg-[#fee2e2] px-4 py-1.5 text-[#b91c1c]">❤️ lives: 2</span>
          <span className="rounded-full bg-[#e0f2fe] px-4 py-1.5 text-[#075985]">⏱️ time: 30</span>
        </div>
      )}
    </div>
  );
}

function EventDemo({ frame }: { frame: number }) {
  const [hops, setHops] = useState(0);
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex items-center gap-3 rounded-[20px] bg-[#facc15] px-4 py-3 font-display text-xl font-extrabold text-[#5a3b00] shadow-[0_5px_0_#ca8a04]">
        ⚡ When <span className="rounded-xl bg-white px-3 py-1">🐸 tapped</span> → <span className="rounded-xl bg-white px-3 py-1">⬆️ jump</span>
      </div>
      <button
        type="button"
        disabled={frame === 0}
        onClick={() => {
          sfx("pop");
          setHops((h) => h + 1);
        }}
        className={cn("rounded-full p-4", frame >= 1 && "l-pulse")}
        aria-label="Tap the frog"
      >
        <span key={hops} className={cn("block text-8xl", hops > 0 && "l-hop")}>🐸</span>
      </button>
      {frame >= 1 && <span className="font-display text-xl font-extrabold text-[var(--l-ink)]">{hops === 0 ? "👆 Tap the frog!" : `Jumps: ${hops}`}</span>}
      {frame === 2 && (
        <div className="flex gap-3 text-4xl">
          <span>👆</span>
          <span>🖱️</span>
          <span>⌨️</span>
          <span>⏰</span>
        </div>
      )}
    </div>
  );
}

function AlgorithmDemo({ frame }: { frame: number }) {
  const nums = [3, 7, 2, 9, 4];
  const [k, setK] = useState(-1);
  const later = useLater();
  useEffect(() => {
    if (frame < 1) return;
    nums.forEach((_, i) => later(() => (setK(i), sfx("beep")), 600 + i * 800));
    // One walk-through per frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame]);
  const best = k < 0 ? null : Math.max(...nums.slice(0, k + 1));
  return (
    <div className="flex flex-col items-center gap-5">
      <span className="font-display text-xl font-extrabold text-[var(--l-ink)]">Find the biggest number</span>
      <div className="flex gap-3">
        {nums.map((n, i) => (
          <span key={i} className={cn("flex h-24 w-20 items-center justify-center rounded-2xl bg-white font-display text-4xl font-extrabold text-[var(--l-ink)] shadow-[0_5px_0_var(--l-line)] transition-transform", i === k && "scale-110 ring-[5px] ring-[var(--l-gold)]", best === n && k >= i && "bg-[#dcfce7]")}>
            {n}
          </span>
        ))}
      </div>
      {frame >= 1 && (
        <div className="flex flex-col items-center gap-1 font-display text-xl font-bold text-[var(--l-ink-2)]">
          <span>1. Look at each card, one at a time.</span>
          <span>2. If it&apos;s bigger than the best so far, it&apos;s the new best.</span>
          <span className="l-pop-in mt-1 rounded-full bg-[#fff7d6] px-4 py-1 font-extrabold text-[#7a5200]">Best so far: {best ?? "—"}</span>
        </div>
      )}
    </div>
  );
}

function BinaryDemo({ frame }: { frame: number }) {
  const vals = [8, 4, 2, 1];
  const on = frame === 0 ? [false, false, false, true] : frame === 1 ? [false, false, false, false] : [false, true, false, true];
  const total = vals.reduce((s, v, i) => s + (on[i] ? v : 0), 0);
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex gap-5">
        {vals.map((v, i) => (
          <div key={v} className="flex flex-col items-center gap-2">
            <span className={cn("text-7xl transition-all", on[i] ? "drop-shadow-[0_0_24px_rgba(250,204,21,0.9)]" : "opacity-30 grayscale")}>💡</span>
            <span className="font-mono text-2xl font-bold text-[var(--l-ink)]">{on[i] ? 1 : 0}</span>
            {frame >= 1 && <span className="rounded-full bg-[var(--l-card-2)] px-3 py-0.5 font-display text-xl font-extrabold text-[var(--l-ink)]">{v}</span>}
          </div>
        ))}
      </div>
      {frame === 2 && <span className="l-pop-in rounded-full bg-[#dcfce7] px-5 py-2 font-display text-3xl font-extrabold text-[#166534]">4 + 1 = {total}</span>}
    </div>
  );
}

function SortingDemo({ frame }: { frame: number }) {
  const start = [5, 2, 4, 1, 3];
  const [arr, setArr] = useState(start);
  const [cmp, setCmp] = useState<number | null>(null);
  const later = useLater();
  useEffect(() => {
    if (frame === 0) return;
    // Bubble sort, one compare at a time.
    const a = frame === 1 ? [...start] : [2, 4, 1, 3, 5];
    let t = 500;
    const passes = frame === 1 ? 1 : 4;
    for (let p = 0; p < passes; p++)
      for (let i = 0; i < a.length - 1 - (frame === 1 ? 0 : p); i++) {
        const j = i;
        later(() => (setCmp(j), sfx("beep")), t);
        t += 450;
        if (a[i] > a[i + 1]) {
          [a[i], a[i + 1]] = [a[i + 1], a[i]];
          const snap = [...a];
          later(() => (setArr(snap), sfx("whoosh")), t);
          t += 450;
        }
      }
    later(() => setCmp(null), t);
    // One sorting run per frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame]);
  return (
    <div className="flex items-end gap-3" style={{ height: 230 }}>
      {arr.map((v, i) => (
        <span key={v} className={cn("flex w-16 items-start justify-center rounded-t-2xl pt-2 font-display text-2xl font-extrabold text-white transition-all duration-300", cmp !== null && (i === cmp || i === cmp + 1) && "ring-[5px] ring-[var(--l-gold)]")} style={{ height: v * 40, background: `hsl(${200 + v * 25} 80% 55%)`, order: i }}>
          {v}
        </span>
      ))}
    </div>
  );
}

function SearchDemo({ frame }: { frame: number }) {
  const lo = frame === 0 ? 1 : frame === 1 ? 9 : 13;
  const hi = frame === 0 ? 16 : 16;
  const guess = frame === 1 ? 8 : frame === 2 ? 12 : null;
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="grid grid-cols-8 gap-2">
        {Array.from({ length: 16 }, (_, i) => i + 1).map((n) => (
          <span key={n} className={cn("flex h-14 w-14 items-center justify-center rounded-xl font-display text-xl font-extrabold transition-all duration-500", n >= lo && n <= hi ? "bg-white text-[var(--l-ink)] shadow-[0_4px_0_var(--l-line)]" : "bg-slate-200 text-slate-400", n === guess && "ring-[5px] ring-[var(--l-gold)]")}>
            {n}
          </span>
        ))}
      </div>
      {guess && <span className="l-pop-in rounded-full bg-[#fff7d6] px-4 py-1.5 font-display text-xl font-extrabold text-[#7a5200]">Guess {guess}? “Higher!” ⬆️</span>}
      {frame === 2 && <span className="font-display text-xl font-extrabold text-[var(--l-ink)]">16 → 8 → 4 → 2 → 1</span>}
    </div>
  );
}

function CoordsDemo({ frame }: { frame: number }) {
  // Same convention as the Treasure Map game: each square has an address, counted from the
  // bottom-left square (0, 0) — across first, then up.
  const C = 60;
  const COLS = 6;
  const ROWS = 5;
  const L = 34;
  const x = frame >= 1 ? 3 : 0;
  const y = frame >= 2 ? 2 : 0;
  return (
    <div className="relative" style={{ width: L + COLS * C + 8, height: ROWS * C + 34 }}>
      {Array.from({ length: ROWS }, (_, r) =>
        Array.from({ length: COLS }, (_, c) => {
          const cy = ROWS - 1 - r;
          const across = frame >= 1 && cy === 0 && c <= x;
          const up = frame >= 2 && c === x && cy <= y;
          return <span key={`${r}-${c}`} className={cn("absolute rounded-md border border-[#cbd5e1] transition-colors duration-500", (across || up) && "bg-[#fff3c4]")} style={{ left: L + c * C, top: r * C, width: C, height: C }} />;
        }),
      )}
      {Array.from({ length: COLS }, (_, c) => (
        <span key={`x${c}`} className={cn("absolute text-center font-display text-lg font-extrabold", frame >= 1 && c === x ? "text-[#b45309]" : "text-[var(--l-ink-2)]")} style={{ left: L + c * C, top: ROWS * C + 4, width: C }}>
          {c}
        </span>
      ))}
      {Array.from({ length: ROWS }, (_, r) => (
        <span key={`y${r}`} className={cn("absolute text-right font-display text-lg font-extrabold", frame >= 2 && r === y ? "text-[#b45309]" : "text-[var(--l-ink-2)]")} style={{ left: 0, top: (ROWS - 1 - r) * C + C / 2 - 13, width: L - 8 }}>
          {r}
        </span>
      ))}
      <span className="absolute flex items-center justify-center text-5xl" style={{ left: L + x * C, top: (ROWS - 1 - y) * C, width: C, height: C, transition: "all 700ms cubic-bezier(0.34,1.3,0.64,1)" }}>
        {frame === 2 ? "💎" : "📍"}
      </span>
      {frame >= 1 && <span className="l-pop-in absolute -top-10 left-1/2 -translate-x-1/2 rounded-full bg-[#fff7d6] px-4 py-1 font-display text-xl font-extrabold text-[#7a5200]">({x}, {y})</span>}
    </div>
  );
}

function MachineDemo({ frame }: { frame: number }) {
  const input = frame === 2 ? 5 : 3;
  return (
    <div className="flex items-center gap-4">
      <span key={`in${frame}`} className={cn("flex h-20 w-20 items-center justify-center rounded-full bg-[var(--l-blue)] font-display text-4xl font-extrabold text-white shadow-[0_5px_0_var(--l-blue-edge)]", frame >= 1 && "l-pop-in")}>{input}</span>
      <span className="text-4xl">➡️</span>
      <div className="flex h-36 w-44 flex-col items-center justify-center rounded-[26px] bg-[#64748b] font-display text-white shadow-[0_8px_0_#475569]">
        <span className={cn("text-4xl", frame >= 1 && "l-spin-slow")}>⚙️</span>
        <span className="text-3xl font-extrabold">× 2</span>
      </div>
      <span className="text-4xl">➡️</span>
      <span key={`out${frame}`} className={cn("flex h-20 w-20 items-center justify-center rounded-full font-display text-4xl font-extrabold text-white shadow-[0_5px_0_var(--l-green-edge)]", frame >= 1 ? "l-pop-in bg-[var(--l-green)]" : "bg-slate-300")} style={{ animationDelay: "600ms" }}>
        {frame >= 1 ? input * 2 : "?"}
      </span>
    </div>
  );
}

function LogicDemo({ frame }: { frame: number }) {
  const [a, setA] = useState(true);
  const [b, setB] = useState(false);
  const g = frame === 0 ? "AND" : frame === 1 ? "OR" : "NOT";
  const out = g === "AND" ? a && b : g === "OR" ? a || b : !a;
  return (
    <div className="flex items-center gap-5">
      <div className="flex flex-col gap-3">
        {[["A", a, setA] as const, ...(g === "NOT" ? [] : [["B", b, setB] as const])].map(([name, v, set]) => (
          <button key={name} type="button" onClick={() => (sfx("tap"), set(!v))} className={cn("flex h-16 w-28 items-center justify-center gap-2 rounded-2xl font-display text-2xl font-extrabold shadow-[0_5px_0_rgba(0,0,0,0.2)]", v ? "bg-[var(--l-green)] text-white" : "bg-slate-300 text-slate-600")}>
            {name}: {v ? "ON" : "OFF"}
          </button>
        ))}
      </div>
      <span className="text-4xl">➡️</span>
      <span className="flex h-24 w-28 items-center justify-center rounded-[22px] bg-[#334155] font-display text-3xl font-extrabold text-white shadow-[0_6px_0_#1e293b]">{g}</span>
      <span className="text-4xl">➡️</span>
      <span className={cn("text-8xl transition-all", out ? "drop-shadow-[0_0_28px_rgba(250,204,21,0.95)]" : "opacity-30 grayscale")}>💡</span>
    </div>
  );
}

function CipherDemo({ frame }: { frame: number }) {
  const letters = "ABCDEFGH".split("");
  const word = frame === 2 ? ["H", "I"] : ["A", "B"];
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-1.5">
        {letters.map((l, i) => (
          <div key={l} className="flex flex-col items-center gap-1">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white font-mono text-2xl font-bold text-[var(--l-ink)] shadow-[0_3px_0_var(--l-line)]">{l}</span>
            {frame >= 1 && <span className="l-pop-in text-xl" style={{ animationDelay: `${i * 60}ms` }}>⬇️</span>}
            {frame >= 1 && <span className="l-pop-in flex h-12 w-12 items-center justify-center rounded-xl bg-[#ede9fe] font-mono text-2xl font-bold text-[#6d28d9]" style={{ animationDelay: `${i * 60}ms` }}>{String.fromCharCode(l.charCodeAt(0) + 1)}</span>}
          </div>
        ))}
      </div>
      {frame === 2 && (
        <span className="l-pop-in rounded-full bg-[#fff7d6] px-5 py-2 font-mono text-3xl font-bold text-[#7a5200]">
          {word.join("")} → {word.map((l) => String.fromCharCode(l.charCodeAt(0) + 1)).join("")}
        </span>
      )}
    </div>
  );
}

function NestedDemo({ frame }: { frame: number }) {
  const [n, setN] = useState(0);
  const later = useLater();
  useEffect(() => {
    later(() => setN(0), 0);
    if (frame === 0) return;
    const total = frame === 1 ? 4 : 12;
    for (let k = 1; k <= total; k++) later(() => (setN(k), sfx("pop")), 400 + k * 260);
    // One drawing run per frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame]);
  return (
    <div className="flex items-center gap-8">
      <div className="rounded-[20px] bg-[#ff9149] p-3 shadow-[0_5px_0_#e26f27]">
        <span className="font-display text-lg font-extrabold text-white">🔁 Repeat ×3</span>
        <div className={cn("mt-2 rounded-[16px] bg-[#ffb27a] p-2", frame === 1 && "ring-[5px] ring-[var(--l-gold)]")}>
          <span className="font-display text-base font-extrabold text-white">🔁 Repeat ×4</span>
          <div className="mt-1 rounded-xl bg-white/85 p-1.5 text-2xl">⭐</div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className={cn("text-4xl transition-all", i < n ? "l-pop-in" : "opacity-15 grayscale")}>⭐</span>
        ))}
      </div>
    </div>
  );
}

function DataDemo({ frame }: { frame: number }) {
  const row = ["r", "r", "r", "w", "w", "r"];
  const col: Record<string, string> = { r: "#ef4444", w: "#f8fafc" };
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-1.5 rounded-xl bg-white p-2 shadow-[0_5px_0_var(--l-line)]">
        {row.map((c, i) => (
          <span key={i} className="h-14 w-14 rounded-lg" style={{ background: col[c], boxShadow: "inset 0 0 0 2px #e2e8f0" }} />
        ))}
      </div>
      {frame >= 1 && <span className="l-pop-in font-mono text-2xl font-bold text-[var(--l-ink)]">red red red white white red</span>}
      {frame === 2 && <span className="l-pop-in rounded-full bg-[#dcfce7] px-5 py-2 font-mono text-2xl font-bold text-[#166534]">3 red · 2 white · 1 red</span>}
    </div>
  );
}

function PythonDemo({ frame }: { frame: number }) {
  // The same program twice: as blocks (left) and as Python (right). The orange loop block and the
  // `for` line share a color, the inside block and the indented line share another — then the
  // indent lights up, and finally the program runs and prints.
  const inside = frame === 3 ? 'print("Ahoy!")' : "clap()";
  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <div className="rounded-[20px] bg-[#ff9149] p-3 shadow-[0_5px_0_#e26f27]">
        <span className="font-display text-xl font-extrabold text-white">🔁 Repeat ×3</span>
        <div className="mt-2 rounded-[14px] bg-[#3b82f6] px-4 py-2 font-display text-xl font-extrabold text-white shadow-[0_4px_0_#1d4ed8]">{frame === 3 ? "💬 say Ahoy!" : "👏 clap"}</div>
      </div>
      <ArrowRight className="h-10 w-10 text-[var(--l-ink-2)]" strokeWidth={3} />
      <div className="min-w-[330px] overflow-hidden rounded-[20px] bg-[#0f172a] shadow-[0_6px_0_rgba(0,40,80,0.25)]">
        <div className="bg-[#1e293b] px-4 py-1.5 font-mono text-sm text-[#94a3b8]">program.py</div>
        <div className="p-4 font-mono text-[24px] leading-[1.7]">
          {frame === 0 ? (
            <span className="l-blink text-[#e2e8f0]">▍</span>
          ) : (
            <>
              <div key={`a${frame}`} className="l-pop-in rounded-md px-1 text-[#e2e8f0] ring-2 ring-[#ff9149]">
                <span className="text-[#f472b6]">for</span> i <span className="text-[#f472b6]">in</span> <span className="text-[#f472b6]">range</span>(<span className="text-[#fbbf24]">3</span>):
              </div>
              <div key={`b${frame}`} className="l-pop-in relative mt-1 whitespace-pre rounded-md px-1 text-[#e2e8f0] ring-2 ring-[#3b82f6]" style={{ animationDelay: "250ms" }}>
                <span className={cn("rounded transition-colors duration-500", frame >= 2 && "bg-[#fbbf24]/45")}>{"    "}</span>
                {frame === 3 ? (
                  <>
                    <span className="text-[#f472b6]">print</span>(<span className="text-[#86efac]">&quot;Ahoy!&quot;</span>)
                  </>
                ) : (
                  <span className="text-[#7dd3fc]">{inside}</span>
                )}
              </div>
              {frame === 2 && <div className="l-pop-in mt-3 w-fit rounded-full bg-[#fbbf24] px-3 py-0.5 font-display text-base font-extrabold text-[#5a3b00]">↑ 4 spaces = inside the loop</div>}
            </>
          )}
        </div>
        {frame === 3 && (
          <div className="border-t border-white/10 bg-black/60 px-4 py-2 font-mono text-xl text-[#a7f3d0]">
            {[0, 1, 2].map((i) => (
              <div key={i} className="l-pop-in" style={{ animationDelay: `${600 + i * 450}ms` }}>
                Ahoy!
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
