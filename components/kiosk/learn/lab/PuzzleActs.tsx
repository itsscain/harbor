"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { applyMachine, bitValues, gate, shiftLetter, toBits } from "@/lib/learn/codelab";
import { SAY } from "@/lib/learn/script";
import { say } from "@/lib/learn/audio";
import { sfx } from "@/lib/learn/sfx";
import { Chunk, useShuffled } from "../kit";
import type { ActProps } from "../acts/common";
import { ChoiceTile, PromptRow, tileState, useChoice, useLater, usePrompt } from "../acts/common";

// The Code Lab's quick puzzles — each one a real computer-science idea you can hold in your hand:
// binary lights, the halving trick for searching, sorting by swapping neighbors, secret codes,
// logic gates, function machines and coordinates.

const hashSeed = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

// ── Binary Beacons ───────────────────────────────────────────────────────────────────────────
export function BinaryAct({ act, fx, onDone }: ActProps<"binary">) {
  const vals = bitValues(act.bits);
  const make = act.mode === "make";
  usePrompt(fx, [make ? SAY.binaryMake : SAY.binaryRead], fx.voice === "keys" ? -1 : 420);
  const [on, setOn] = useState<number[]>(() => (make ? vals.map(() => 0) : toBits(act.target, act.bits)));
  const [misses, setMisses] = useState(0);
  const [done, setDone] = useState(false);
  const later = useLater();
  const total = vals.reduce((s, v, i) => s + (on[i] ? v : 0), 0);
  const opts = useShuffled(act.options ?? [], fx.seed);
  const c = useChoice(String(act.target), fx, onDone, { why: `The lights that are on add up: ${vals.filter((_, i) => on[i]).join(" + ")} = ${act.target}.` });
  const flip = (i: number) => {
    if (!make || done) return;
    sfx("tick");
    setOn(on.map((b, k) => (k === i ? 1 - b : b)));
  };
  // Flipping lights until something happens isn't the idea: set them, add them up, then check.
  const check = (el: HTMLElement) => {
    if (done) return;
    if (total === act.target) {
      setDone(true);
      fx.right(el);
      later(() => onDone(misses), 1600);
    } else {
      setMisses((m) => m + 1);
      fx.wrong(el);
    }
  };
  return (
    <div className="flex w-full max-w-[1000px] flex-col items-center gap-6">
      <PromptRow parts={[make ? SAY.binaryMake : SAY.binaryRead]}>{make ? <>Make <b className="rounded-xl bg-white px-3 text-[var(--l-ink)]">{act.target}</b> with the lights</> : "What number do the lights show?"}</PromptRow>
      <div className="flex flex-wrap justify-center gap-6 rounded-[32px] bg-gradient-to-b from-[#1e293b] to-[#0f172a] px-10 py-8 shadow-[0_10px_0_rgba(0,0,0,0.3)]">
        {vals.map((v, i) => (
          <button key={v} type="button" disabled={!make || done} onClick={() => flip(i)} className={cn("flex flex-col items-center gap-2 rounded-3xl px-3 py-3 transition-colors", make && !done && "hover:bg-white/5 active:bg-white/10")} aria-label={`light worth ${v}, ${on[i] ? "on" : "off"}`}>
            <span className={cn("text-[96px] leading-none transition-all duration-200", on[i] ? "drop-shadow-[0_0_34px_rgba(250,204,21,0.95)]" : "opacity-25 grayscale")}>💡</span>
            <span className={cn("font-mono text-4xl font-bold", on[i] ? "text-[#fde047]" : "text-[#64748b]")}>{on[i]}</span>
            <span className="rounded-full bg-white/15 px-4 py-1 font-display text-2xl font-extrabold text-white">{v}</span>
          </button>
        ))}
      </div>
      {make ? (
        <div className="flex items-center gap-4">
          <span key={total} className={cn("l-pop-in rounded-full px-6 py-2 font-display text-3xl font-extrabold", done ? "bg-[#dcfce7] text-[#166534]" : "bg-white text-[var(--l-ink)]")}>
            {vals.filter((_, i) => on[i]).join(" + ") || "0"} {on.some(Boolean) && `= ${total}`}
          </span>
          <Chunk tone="green" disabled={done} onClick={(e) => check(e.currentTarget)} className="flex h-16 items-center px-8 font-display text-2xl font-extrabold">
            ✓ Check
          </Chunk>
        </div>
      ) : (
        <div className="flex gap-4">
          {opts.map((n) => (
            <ChoiceTile key={n} state={tileState(String(n), c, String(act.target))} shakeKey={c.shake?.id === String(n) ? c.shake.n : undefined} onPick={(el) => c.choose(String(n), el)} className="h-24 w-28 font-display text-5xl font-extrabold">
              {n}
            </ChoiceTile>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Number Hunt (binary search) ──────────────────────────────────────────────────────────────
export function SearchAct({ act, fx, onDone }: ActProps<"search">) {
  usePrompt(fx, [SAY.searchIntro], fx.voice === "keys" ? -1 : 420);
  const secret = useMemo(() => (hashSeed(fx.seed) % act.max) + 1, [fx.seed, act.max]);
  const [lo, setLo] = useState(1);
  const [hi, setHi] = useState(act.max);
  const [guesses, setGuesses] = useState<{ n: number; dir: "up" | "down" | "hit" }[]>([]);
  const [found, setFound] = useState(false);
  const later = useLater();
  const mid = Math.floor((lo + hi) / 2);
  const guess = (n: number, el: HTMLElement) => {
    if (found || n < lo || n > hi) return;
    const g = [...guesses];
    if (n === secret) {
      g.push({ n, dir: "hit" });
      setGuesses(g);
      setFound(true);
      fx.right(el, [SAY.searchFound]);
      const extra = Math.max(0, g.length - act.limit);
      later(() => {
        if (act.coach || g.length > act.limit) void say(SAY.searchTip);
      }, 1600);
      later(() => onDone(extra), 3600);
      return;
    }
    const up = n < secret;
    g.push({ n, dir: up ? "up" : "down" });
    setGuesses(g);
    sfx("beep");
    void say(up ? SAY.higher : SAY.lower);
    if (up) setLo(n + 1);
    else setHi(n - 1);
  };
  const cols = act.max <= 20 ? 10 : act.max <= 50 ? 10 : 10;
  const last = guesses[guesses.length - 1];
  return (
    <div className="flex w-full max-w-[1000px] flex-col items-center gap-4">
      <PromptRow parts={[SAY.searchIntro]}>I&apos;m thinking of a number from 1 to {act.max}. Find it!</PromptRow>
      <div className="flex items-center gap-3 font-display text-xl font-extrabold text-white">
        <span className="rounded-full bg-black/25 px-4 py-1.5">
          Guesses: {guesses.length} <span className="opacity-70">/ {act.limit}</span>
        </span>
        {last && !found && <span key={guesses.length} className="l-pop-in rounded-full bg-[var(--l-gold)] px-4 py-1.5 text-[#5a3b00]">{last.n} → {last.dir === "up" ? "Higher! ⬆️" : "Lower! ⬇️"}</span>}
        {found && <span className="l-pop-in rounded-full bg-[#dcfce7] px-4 py-1.5 text-[#166534]">🎯 {secret}! Found in {guesses.length}</span>}
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: act.max }, (_, i) => i + 1).map((n) => {
          const out = n < lo || n > hi;
          const hit = found && n === secret;
          return (
            <button key={n} type="button" disabled={found || out} onClick={(e) => guess(n, e.currentTarget)} className={cn("flex h-14 w-14 items-center justify-center rounded-xl font-display text-xl font-extrabold transition-all duration-300", out ? "scale-90 bg-white/15 text-white/35" : "bg-white text-[var(--l-ink)] shadow-[0_4px_0_var(--l-line)] active:translate-y-1", hit && "l-boing bg-[var(--l-green)] text-white", act.coach && !found && !out && n === mid && "l-hint ring-4 ring-[var(--l-gold)]")}>
              {hit ? "🎯" : n}
            </button>
          );
        })}
      </div>
      {act.coach && !found && <span className="rounded-full bg-[#fff7d6] px-4 py-1.5 font-display text-lg font-extrabold text-[#7a5200]">💡 Try the glowing middle — it cuts the choices in half!</span>}
    </div>
  );
}

// ── Swap Sort (bubble sort) ──────────────────────────────────────────────────────────────────
const inversions = (a: number[]) => a.reduce((n, x, i) => n + a.slice(i + 1).filter((y) => y < x).length, 0);
export function SwapSortAct({ act, fx, onDone }: ActProps<"swapsort">) {
  usePrompt(fx, [SAY.swapIntro], fx.voice === "keys" ? -1 : 420);
  const [arr, setArr] = useState(act.values);
  const [swaps, setSwaps] = useState(0);
  const [flash, setFlash] = useState<{ i: number; good: boolean; k: number } | null>(null);
  const [done, setDone] = useState(false);
  const later = useLater();
  const min = useMemo(() => inversions(act.values), [act.values]);
  const max = Math.max(...act.values);
  const swap = (i: number, el: HTMLElement) => {
    if (done) return;
    const good = arr[i] > arr[i + 1];
    const next = [...arr];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    setArr(next);
    const n = swaps + 1;
    setSwaps(n);
    setFlash({ i, good, k: n });
    sfx(good ? "whoosh" : "soft-fail");
    if (next.every((v, k) => k === 0 || next[k - 1] <= v)) {
      setDone(true);
      fx.right(el, [SAY.swapDone]);
      later(() => onDone(n <= min ? 0 : n <= min + 4 ? 1 : 2), 2000);
    }
  };
  return (
    <div className="flex w-full max-w-[1100px] flex-col items-center gap-5">
      <PromptRow parts={[SAY.swapIntro]}>Swap neighbors to put them in order — smallest first</PromptRow>
      <div className="flex items-end gap-1">
        {arr.map((v, i) => (
          <div key={`${v}-${i}`} className="flex items-end">
            <div className="flex flex-col items-center gap-1">
              <span className={cn("flex w-[76px] items-start justify-center rounded-t-2xl pt-2 font-display text-3xl font-extrabold text-white shadow-[0_5px_0_rgba(0,40,80,0.2)] transition-all duration-300", done && "bg-[var(--l-green)]")} style={{ height: 50 + (v / max) * 170, background: done ? undefined : `hsl(${190 + (v / max) * 140} 75% 55%)` }}>
                {v}
              </span>
              {act.emoji && <span className="text-2xl">{act.emoji}</span>}
            </div>
            {i < arr.length - 1 && (
              <button type="button" disabled={done} onClick={(e) => swap(i, e.currentTarget)} className={cn("mx-1 mb-10 flex h-12 w-12 items-center justify-center rounded-full bg-white text-[var(--l-ink)] shadow-[0_4px_0_var(--l-line)] active:translate-y-1", flash?.i === i && (flash.good ? "ring-4 ring-[var(--l-green)]" : "l-shake ring-4 ring-[var(--l-coral)]"))} aria-label={`swap ${v} and ${arr[i + 1]}`}>
                <ArrowLeftRight className="h-6 w-6" strokeWidth={2.8} />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 font-display text-xl font-extrabold">
        <span className="rounded-full bg-white px-4 py-1.5 text-[var(--l-ink)]">Swaps: {swaps}</span>
        {flash && !flash.good && !done && <span key={flash.k} className="l-pop-in rounded-full bg-[#fee2e2] px-4 py-1.5 text-[#b91c1c]">👀 Those two were already in order!</span>}
        {done && <span className="l-pop-in rounded-full bg-[#dcfce7] px-4 py-1.5 text-[#166534]">Sorted! Fewest possible: {min}</span>}
      </div>
      <span className="rounded-full bg-black/20 px-4 py-1.5 font-display text-base font-bold text-white">Bubble sort: compare two neighbors — if the left one is bigger, swap!</span>
    </div>
  );
}

// ── Secret Codes ─────────────────────────────────────────────────────────────────────────────
export function CipherAct({ act, fx, onDone }: ActProps<"cipher">) {
  usePrompt(fx, [SAY.cipherIntro], fx.voice === "keys" ? -1 : 420);
  const symbols = act.mode === "symbol" ? [...act.coded] : act.coded.split("");
  const decode = (ch: string) => (act.mode === "shift" ? shiftLetter(ch, -(act.shift ?? 1)) : act.key?.find(([s]) => s === ch)?.[1] ?? "?");
  const [open, setOpen] = useState<number[]>([]);
  const opts = useShuffled(act.options, fx.seed);
  const c = useChoice(act.answer, fx, onDone, { why: `Decode each letter with the key: it spells ${act.answer}.` });
  const units = act.mode === "symbol" ? segment(act.coded) : symbols;
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  return (
    <div className="flex w-full max-w-[1100px] flex-col items-center gap-5">
      <PromptRow parts={[SAY.cipherIntro]}>Crack the code! Tap each letter to decode it.</PromptRow>
      {/* The key */}
      <div className="max-w-full overflow-x-auto rounded-[22px] bg-white/95 p-3 shadow-[0_6px_0_rgba(0,40,80,0.14)]">
        <span className="mb-1 block text-center font-display text-sm font-extrabold uppercase tracking-wide text-[var(--l-ink-2)]">🔑 The key {act.mode === "shift" ? `— every letter moved ${act.shift} forward` : ""}</span>
        {act.mode === "shift" ? (
          <div className="flex gap-1">
            {letters.map((l) => (
              <div key={l} className="flex flex-col items-center">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#ede9fe] font-mono text-lg font-bold text-[#6d28d9]">{shiftLetter(l, act.shift ?? 1)}</span>
                <span className="text-xs">⬇</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--l-card-2)] font-mono text-lg font-bold text-[var(--l-ink)]">{l}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-2">
            {(act.key ?? []).map(([s, l]) => (
              <span key={s} className="flex items-center gap-1 rounded-xl bg-[var(--l-card-2)] px-2.5 py-1 font-mono text-xl font-bold text-[var(--l-ink)]">
                <span className="text-2xl">{s}</span> = {l}
              </span>
            ))}
          </div>
        )}
      </div>
      {/* The message */}
      <div className="flex flex-wrap justify-center gap-2">
        {units.map((u, i) => {
          const isOpen = open.includes(i);
          return (
            <button key={i} type="button" disabled={isOpen} onClick={() => (sfx("pick"), setOpen((o) => [...o, i]))} className={cn("flex h-20 w-16 flex-col items-center justify-center rounded-2xl font-mono text-3xl font-bold shadow-[0_5px_0_rgba(0,40,80,0.2)] transition-all", isOpen ? "l-pop-in bg-[var(--l-green)] text-white" : "bg-[#4c1d95] text-[#e9d5ff]")}>
              {isOpen ? decode(u) : u}
              {isOpen && <span className="font-mono text-xs opacity-80">{u}</span>}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {opts.map((w) => (
          <ChoiceTile key={w} state={tileState(w, c, act.answer)} shakeKey={c.shake?.id === w ? c.shake.n : undefined} onPick={(el) => c.choose(w, el)} className="h-20 min-w-[150px] px-5 font-mono text-3xl font-bold">
            {w}
          </ChoiceTile>
        ))}
      </div>
    </div>
  );
}
/** Split an emoji string into its symbols (emoji can be more than one UTF-16 unit). */
function segment(s: string): string[] {
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: { granularity: string }) => { segment: (t: string) => Iterable<{ segment: string }> } }).Segmenter;
  if (Seg) return [...new Seg(undefined, { granularity: "grapheme" }).segment(s)].map((x) => x.segment);
  return [...s];
}

// ── Logic Lab ────────────────────────────────────────────────────────────────────────────────
export function LogicAct({ act, fx, onDone }: ActProps<"logic">) {
  const light = act.mode === "light";
  usePrompt(fx, light ? [act.story, "~", SAY.logicLight] : [act.story, "~", SAY.logicPredict], fx.voice === "keys" ? -1 : 420);
  const one = act.gate === "NOT";
  // "Light it" starts dark: NOT starts with its switch ON.
  const [a, setA] = useState(light ? one : !!act.a);
  const [b, setB] = useState(light ? false : !!act.b);
  const [ways, setWays] = useState<string[]>([]);
  const [shown, setShown] = useState(!light ? false : true);
  const later = useLater();
  const out = gate(act.gate, a, b);
  const allWays = (one ? [[false, false], [true, false]] : [[false, false], [false, true], [true, false], [true, true]]).filter(([x, y]) => gate(act.gate, !!x, !!y)).length;
  const c = useChoice(gate(act.gate, !!act.a, !!act.b) ? "yes" : "no", fx, onDone, { why: act.gate === "AND" ? "AND needs BOTH switches on." : act.gate === "OR" ? "OR needs at least ONE switch on." : "NOT flips it: ON becomes OFF, OFF becomes ON." });
  const toggle = (which: "a" | "b") => {
    if (!light || ways.length >= allWays) return;
    sfx("tick");
    const na = which === "a" ? !a : a;
    const nb = which === "b" ? !b : b;
    if (which === "a") setA(na);
    else setB(nb);
    const key = `${na ? 1 : 0}${one ? "" : nb ? 1 : 0}`;
    if (gate(act.gate, na, nb) && !ways.includes(key)) {
      const w = [...ways, key];
      setWays(w);
      sfx("star");
      if (w.length >= allWays) {
        fx.right(null);
        later(() => onDone(0), 2000);
      }
    }
  };
  return (
    <div className="flex w-full max-w-[1000px] flex-col items-center gap-5">
      <PromptRow parts={[act.story]}>{act.story}</PromptRow>
      <div className="flex flex-wrap items-center justify-center gap-5 rounded-[28px] bg-white/95 px-6 py-6 shadow-[0_8px_0_rgba(0,40,80,0.16)]">
        <div className="flex flex-col gap-3">
          {[["A", act.labels?.[0], a, () => toggle("a")] as const, ...(one ? [] : [["B", act.labels?.[1], b, () => toggle("b")] as const])].map(([name, label, v, fn]) => (
            <button key={name} type="button" disabled={!light} onClick={fn} className={cn("flex min-h-16 min-w-[180px] flex-col items-center justify-center rounded-2xl px-3 py-1.5 font-display font-extrabold shadow-[0_5px_0_rgba(0,0,0,0.2)] transition-colors", v ? "bg-[var(--l-green)] text-white" : "bg-slate-300 text-slate-600")}>
              <span className="text-lg leading-tight">{label || name}</span>
              <span className="text-2xl">{v ? "ON ✓" : "OFF"}</span>
            </button>
          ))}
        </div>
        <span className="text-4xl">➡️</span>
        <span className="flex h-24 w-32 items-center justify-center rounded-[22px] bg-[#334155] font-display text-3xl font-extrabold text-white shadow-[0_6px_0_#1e293b]">{act.gate}</span>
        <span className="text-4xl">➡️</span>
        <span className={cn("text-8xl transition-all duration-300", shown && out ? "drop-shadow-[0_0_30px_rgba(250,204,21,0.95)]" : "opacity-25 grayscale")}>💡</span>
      </div>
      {light ? (
        <span className="rounded-full bg-[#fff7d6] px-5 py-2 font-display text-xl font-extrabold text-[#7a5200]">
          Find every way to light it: {ways.length} of {allWays} {ways.length > 0 && `· ${ways.map((w) => w.split("").map((d, i) => `${i ? "B" : "A"}${d === "1" ? "✓" : "✗"}`).join(" ")).join("  |  ")}`}
        </span>
      ) : (
        <div className="flex gap-4">
          {["yes", "no"].map((id) => (
            <ChoiceTile key={id} state={tileState(id, c, gate(act.gate, !!act.a, !!act.b) ? "yes" : "no")} shakeKey={c.shake?.id === id ? c.shake.n : undefined} onPick={(el) => (c.choose(id, el), setShown(true))} className="h-20 w-44 font-display text-3xl font-extrabold">
              {id === "yes" ? "💡 Yes, on" : "⚫ No, off"}
            </ChoiceTile>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Function Machines ────────────────────────────────────────────────────────────────────────
export function MachineAct({ act, fx, onDone }: ActProps<"machine">) {
  const out = act.mode === "output";
  usePrompt(fx, [out ? SAY.machineOut : SAY.machineRule], fx.voice === "keys" ? -1 : 420);
  const opts = useShuffled(act.options, fx.seed);
  const c = useChoice(act.answer, fx, onDone, { why: out ? `${act.input} goes in, the rule changes it, and ${act.answer} comes out.` : `Check it: every input follows the rule ${act.answer}.` });
  return (
    <div className="flex w-full max-w-[1000px] flex-col items-center gap-5">
      <PromptRow parts={[out ? SAY.machineOut : SAY.machineRule]}>{out ? "What number will come out?" : "What rule is the machine using?"}</PromptRow>
      <div className="flex flex-wrap items-center justify-center gap-6">
        <div className="rounded-[22px] bg-white/95 p-3 shadow-[0_6px_0_rgba(0,40,80,0.14)]">
          <div className="grid grid-cols-2 gap-x-6 px-2 font-display text-sm font-extrabold uppercase text-[var(--l-ink-2)]">
            <span>in</span>
            <span>out</span>
          </div>
          {act.examples.map(([i, o]) => (
            <div key={i} className="grid grid-cols-2 gap-x-6 rounded-lg px-2 py-0.5 font-mono text-2xl font-bold text-[var(--l-ink)] odd:bg-[var(--l-card-2)]">
              <span>{i}</span>
              <span>{o}</span>
            </div>
          ))}
          {out && (
            <div className="grid grid-cols-2 gap-x-6 rounded-lg bg-[#fff7d6] px-2 py-0.5 font-mono text-2xl font-bold text-[#7a5200]">
              <span>{act.input}</span>
              <span>{c.found ? applyMachine(act.steps, act.input ?? 0) : "?"}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span key={c.found ?? "in"} className={cn("flex h-16 w-16 items-center justify-center rounded-full bg-[var(--l-blue)] font-display text-3xl font-extrabold text-white shadow-[0_4px_0_var(--l-blue-edge)]", c.found && "l-pop-in")}>{out ? act.input : "?"}</span>
          <div className="flex h-32 w-40 flex-col items-center justify-center rounded-[24px] bg-[#64748b] font-display text-white shadow-[0_7px_0_#475569]">
            <span className={cn("text-4xl", c.found && "l-spin")}>⚙️</span>
            <span className="text-2xl font-extrabold">{c.found ? (out ? "✓" : act.answer) : out ? "rule" : "?"}</span>
          </div>
          <span className={cn("flex h-16 w-16 items-center justify-center rounded-full font-display text-3xl font-extrabold text-white shadow-[0_4px_0_var(--l-green-edge)]", c.found ? "l-pop-in bg-[var(--l-green)]" : "bg-slate-300")}>{out ? (c.found ? act.answer : "?") : "?"}</span>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {opts.map((o) => (
          <ChoiceTile key={o} state={tileState(o, c, act.answer)} shakeKey={c.shake?.id === o ? c.shake.n : undefined} onPick={(el) => c.choose(o, el)} className="h-20 min-w-[130px] px-4 font-mono text-3xl font-bold">
            {o}
          </ChoiceTile>
        ))}
      </div>
    </div>
  );
}

// ── Treasure Map (coordinates) ───────────────────────────────────────────────────────────────
export function PlotAct({ act, fx, onDone }: ActProps<"plot">) {
  const place = act.mode === "place";
  usePrompt(fx, [place ? SAY.plotPlace : SAY.plotRead], fx.voice === "keys" ? -1 : 420);
  const [tx, ty] = act.target;
  const answer = `(${tx}, ${ty})`;
  const opts = useShuffled(act.options ?? [], fx.seed);
  const c = useChoice(answer, fx, onDone, { why: `Across ${tx}, then up ${ty}: that's ${answer}.` });
  const [tappedAt, setTappedAt] = useState<string | null>(null);
  const C = Math.floor(Math.min(560 / (act.cols + 1), 380 / (act.rows + 1), 72));
  return (
    <div className="flex w-full max-w-[1000px] flex-col items-center gap-4">
      <PromptRow parts={[place ? SAY.plotPlace : SAY.plotRead]}>{place ? <>Put the {act.emoji} at <b className="rounded-xl bg-white px-2 font-mono text-[var(--l-ink)]">{answer}</b></> : `Where is the ${act.emoji}?`}</PromptRow>
      <div className="relative rounded-[22px] border-[5px] border-dashed border-[#b45309]/50 p-3 shadow-[0_8px_0_rgba(0,40,80,0.16)]" style={{ width: (act.cols + 1) * C + 24, height: (act.rows + 1) * C + 24, background: "radial-gradient(circle at 30% 20%, #fff8e1, #f6e2b3 70%, #ecd08f)" }}>
        <span className="pointer-events-none absolute -right-4 -top-5 text-4xl">🧭</span>
        {Array.from({ length: act.rows }, (_, r) =>
          Array.from({ length: act.cols }, (_, x) => {
            const y = act.rows - 1 - r;
            const k = `(${x}, ${y})`;
            const isTarget = x === tx && y === ty;
            return (
              <button
                key={k}
                type="button"
                disabled={!place || !!c.found}
                onClick={(e) => {
                  setTappedAt(k);
                  c.choose(k, e.currentTarget);
                }}
                className={cn("absolute flex items-center justify-center rounded-md border border-[#c8a96a] font-mono text-xs text-transparent", place && !c.found && "hover:bg-white/50", tappedAt === k && k !== answer && "bg-[#fee2e2] text-[#b91c1c]")}
                style={{ left: 12 + C * 0.9 + x * C, top: 12 + r * C, width: C, height: C }}
                aria-label={k}
              >
                {tappedAt === k && k !== answer && k}
                {((!place && isTarget) || (place && c.found && isTarget)) && <span className={cn("absolute text-4xl", c.found && "l-boing")}>{act.emoji}</span>}
              </button>
            );
          }),
        )}
        {Array.from({ length: act.cols }, (_, x) => (
          <span key={`x${x}`} className="absolute text-center font-display text-lg font-extrabold text-[var(--l-ink-2)]" style={{ left: 12 + C * 0.9 + x * C, top: 12 + act.rows * C + 4, width: C }}>
            {x}
          </span>
        ))}
        {Array.from({ length: act.rows }, (_, r) => (
          <span key={`y${r}`} className="absolute text-right font-display text-lg font-extrabold text-[var(--l-ink-2)]" style={{ left: 4, top: 12 + (act.rows - 1 - r) * C + C / 2 - 12, width: C * 0.7 }}>
            {r}
          </span>
        ))}
        <span className="absolute font-display text-sm font-extrabold text-[var(--l-ink-2)]" style={{ right: 10, bottom: 2 }}>x →</span>
        <span className="absolute font-display text-sm font-extrabold text-[var(--l-ink-2)]" style={{ left: 8, top: 2 }}>↑ y</span>
      </div>
      {!place && (
        <div className="flex flex-wrap justify-center gap-3">
          {opts.map((o) => (
            <ChoiceTile key={o} state={tileState(o, c, answer)} shakeKey={c.shake?.id === o ? c.shake.n : undefined} onPick={(el) => c.choose(o, el)} className="h-20 min-w-[140px] px-4 font-mono text-3xl font-bold">
              {o}
            </ChoiceTile>
          ))}
        </div>
      )}
    </div>
  );
}
