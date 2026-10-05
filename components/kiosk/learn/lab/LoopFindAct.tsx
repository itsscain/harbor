"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { SAY } from "@/lib/learn/script";
import { say } from "@/lib/learn/audio";
import { sfx } from "@/lib/learn/sfx";
import { Chunk, useShuffled } from "../kit";
import type { ActProps } from "../acts/common";
import { PromptRow, useLater, usePrompt } from "../acts/common";
import { BlockPill } from "../code/Editor";
import { Glyph } from "../art/Glyph";

// Loop Detective: a long program that does the same thing again and again. Find the part that
// repeats (the groups light up, numbered, so you SEE the repetition), count how many times, and
// watch all those blocks squeeze into one loop. This is the "why" of loops: spotting a pattern
// and saying it once.

export function LoopFindAct({ act, fx, onDone }: ActProps<"loopfind">) {
  const band = fx.voice === "all" ? "little" : fx.voice === "core" ? "middle" : "big";
  const [phase, setPhase] = useState<"part" | "times" | "done">("part");
  const [misses, setMisses] = useState(0);
  const [tried, setTried] = useState<string[]>([]);
  const [shake, setShake] = useState<{ id: string; n: number } | null>(null);
  const later = useLater();
  usePrompt(fx, [SAY.loopFindPart], fx.voice === "keys" ? -1 : 420);

  const chunk = act.ops.slice(0, act.unit);
  const tail = act.ops.slice(act.unit * act.times);
  const parts = useShuffled(
    useMemo(() => [{ id: "a", ops: chunk }, ...act.decoys.map((d, i) => ({ id: `d${i}`, ops: d }))], [act]), // eslint-disable-line react-hooks/exhaustive-deps
    fx.seed,
  );
  const counts = useShuffled(
    useMemo(() => [...new Set([act.times, act.times + 1, Math.max(2, act.times - 1), act.times + 2])].slice(0, 3), [act.times]),
    `${fx.seed}:n`,
  );

  const pickPart = (id: string, el: HTMLElement) => {
    if (phase !== "part") return;
    if (id === "a") {
      sfx("correct");
      fx.burst(el, "star", 8);
      setPhase("times");
      if (fx.voice !== "keys") later(() => void say(SAY.loopFindTimes), 900);
      fx.setPrompt([SAY.loopFindTimes]);
    } else {
      setMisses((m) => m + 1);
      setTried((t) => [...t, id]);
      setShake((s) => ({ id, n: (s?.n ?? 0) + 1 }));
      fx.wrong(el);
    }
  };
  const pickCount = (n: number, el: HTMLElement) => {
    if (phase !== "times") return;
    if (n === act.times) {
      setPhase("done");
      fx.right(el, [SAY.loopFindDone]);
      later(() => onDone(misses), 3000);
    } else {
      setMisses((m) => m + 1);
      setTried((t) => [...t, `n${n}`]);
      setShake((s) => ({ id: `n${n}`, n: (s?.n ?? 0) + 1 }));
      fx.wrong(el);
    }
  };

  const grouped = phase !== "part";
  const pill = band === "little" ? "lg" : "md";
  const before = act.ops.length;
  const after = 1 + chunk.length + tail.length;
  return (
    <div className="flex w-full max-w-[1100px] flex-col items-center gap-5">
      <PromptRow parts={[phase === "part" ? SAY.loopFindPart : SAY.loopFindTimes]}>{phase === "part" ? "Find the part that repeats" : phase === "times" ? "How many times does it repeat?" : "One loop instead of all those blocks!"}</PromptRow>

      {/* The long program — once the part is found, its repeats light up in numbered groups. */}
      {phase !== "done" ? (
        <div className={cn("flex max-w-[1100px] flex-wrap items-center justify-center rounded-[26px] bg-white/92 p-4 shadow-[0_8px_0_rgba(0,40,80,0.16)]", grouped ? "gap-2" : "gap-1.5")}>
          {/* Until the pattern is found it's one even strip (no hints in the spacing). */}
          {Array.from({ length: act.times }, (_, g) => (
            <span key={g} className={cn("relative flex gap-1.5 rounded-2xl transition-all duration-500", grouped ? "p-1.5" : "p-0", grouped && (g % 2 ? "bg-[#ede9fe]" : "bg-[#ffedd5]"))} style={{ transitionDelay: `${g * 160}ms` }}>
              {grouped && <span className="l-pop-in absolute -top-3 left-1 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--l-orange)] font-display text-sm font-extrabold text-white shadow-[0_2px_0_var(--l-orange-edge)]" style={{ animationDelay: `${g * 160}ms` }}>{g + 1}</span>}
              {chunk.map((op, i) => (
                <BlockPill key={i} op={op} band={band} size={pill} />
              ))}
            </span>
          ))}
          {tail.map((op, i) => (
            <BlockPill key={`t${i}`} op={op} band={band} size={pill} />
          ))}
        </div>
      ) : (
        <div className="l-pop-in flex flex-wrap items-center justify-center gap-3">
          <div className="flex items-center gap-2 rounded-[22px] bg-[#ff9149] p-3 shadow-[0_6px_0_#e26f27]">
            <span className="font-display text-2xl font-extrabold text-white"><Glyph e="🔁" size="1.25em" className="mx-[0.1em] inline-block align-[-0.28em]" /> Repeat</span>
            <span className="rounded-xl bg-white px-3 py-1 font-display text-2xl font-extrabold text-[#e26f27]">×{act.times}</span>
            <span className="flex gap-1.5 rounded-xl bg-white/85 p-1.5">
              {chunk.map((op, i) => (
                <BlockPill key={i} op={op} band={band} size={pill} />
              ))}
            </span>
          </div>
          {tail.map((op, i) => (
            <BlockPill key={`t${i}`} op={op} band={band} size={pill} />
          ))}
          <span className="l-pop-in w-full text-center font-display text-3xl font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.3)]" style={{ animationDelay: "500ms" }}>
            {before} blocks → {after} blocks!
          </span>
        </div>
      )}

      {phase === "part" && (
        <div className="flex flex-wrap justify-center gap-3">
          {parts.map((p) => (
            <Chunk key={p.id} tone="white" disabled={tried.includes(p.id)} onClick={(e) => pickPart(p.id, e.currentTarget)} className={cn("flex min-h-[96px] items-center gap-1.5 px-4", tried.includes(p.id) && "opacity-40")}>
              <span key={shake?.id === p.id ? shake.n : 0} className={cn("flex gap-1.5", shake?.id === p.id && "l-shake")}>
                {p.ops.map((op, i) => (
                  <BlockPill key={i} op={op} band={band} size={band === "little" ? "md" : "sm"} />
                ))}
              </span>
            </Chunk>
          ))}
        </div>
      )}
      {phase === "times" && (
        <div className="flex justify-center gap-4">
          {counts.map((n) => (
            <Chunk key={n} tone="white" disabled={tried.includes(`n${n}`)} onClick={(e) => pickCount(n, e.currentTarget)} className={cn("flex h-24 w-28 items-center justify-center font-display text-5xl font-extrabold text-[var(--l-ink)]", tried.includes(`n${n}`) && "opacity-40")}>
              <span key={shake?.id === `n${n}` ? shake.n : 0} className={cn(shake?.id === `n${n}` && "l-shake")}>×{n}</span>
            </Chunk>
          ))}
        </div>
      )}
    </div>
  );
}
