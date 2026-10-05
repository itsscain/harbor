"use client";

import { useRef, useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Option } from "@/lib/learn/types";
import { numberWord } from "@/lib/learn/gen";
import { SAY } from "@/lib/learn/script";
import { say } from "@/lib/learn/audio";
import { sfx, buzz } from "@/lib/learn/sfx";
import { Chunk, useDrag, useShuffled, useShuffledApart } from "../kit";
import { Visual } from "./Visual";
import { PromptRow, useLater, useSpokenPrompt, type ActProps } from "./common";
import { Glyph, GlyphRow, WithGlyphs } from "../art/Glyph";

// Hands-on activities: drag (or tap) cards into bins, put things in order, match pairs (two
// columns or a memory game), and build numbers from place-value blocks. Every one of them
// forgives a slip — a wrong drop just bounces back — but counts it, so the stars stay honest.

// ── Sort ─────────────────────────────────────────────────────────────────────────────────────
type SortItem = { id: string; text?: string; emoji?: string; bin: string; say?: string[] };

function SortCard({ it, selected, onTap, onDrop }: { it: SortItem; selected: boolean; onTap: () => void; onDrop: (bin: string | null, el: HTMLElement | null) => void }) {
  const el = useRef<HTMLDivElement | null>(null);
  const { handlers, dragging } = useDrag({
    onTap,
    onLift: () => sfx("lift"),
    onDrop: (t) => onDrop(t?.dataset.drop ?? null, el.current),
  });
  return (
    <div
      ref={el}
      {...handlers}
      data-dragging={dragging}
      className={cn("l-drag l-chunk relative flex min-h-[78px] min-w-[120px] items-center justify-center gap-2 px-4 py-2", selected && "ring-[5px] ring-[var(--l-gold)]")}
      style={{ "--f": "var(--l-card)", "--e": "var(--l-line)" } as React.CSSProperties}
    >
      {it.emoji && <GlyphRow s={it.emoji} size={(it.text?.length ?? 0) > 22 ? 40 : 54} />}
      {it.text && <span className={cn("font-reading font-bold leading-tight text-[var(--l-ink)]", it.text.length > 30 ? "max-w-[300px] text-[19px]" : it.text.length > 22 ? "text-[21px]" : "text-[26px]")}><WithGlyphs text={it.text} /></span>}
    </div>
  );
}

export function SortAct({ act: a, fx, onDone }: ActProps<"sort">) {
  const parts = useSpokenPrompt(fx, a.say, a.prompt);
  const items = useShuffled(a.items, fx.seed);
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [misses, setMisses] = useState(0);
  const [shakeBin, setShakeBin] = useState<{ id: string; n: number } | null>(null);
  const later = useLater();
  const voice = fx.voice !== "keys";

  const tryPlace = (it: SortItem, bin: string | null, el: Element | null) => {
    if (!bin) return;
    if (bin === it.bin) {
      sfx("snap");
      buzz(14);
      fx.burst(el, "star", 6);
      const next = { ...placed, [it.id]: bin };
      setPlaced(next);
      setSelected(null);
      if (Object.keys(next).length === a.items.length) {
        fx.right(el);
        later(() => onDone(misses), 1300);
      }
    } else {
      setMisses((m) => m + 1);
      setShakeBin((s) => ({ id: bin, n: (s?.n ?? 0) + 1 }));
      fx.wrong(el);
    }
  };
  const left = items.filter((it) => !placed[it.id]);
  return (
    <div className="flex w-full max-w-[1100px] flex-col items-center gap-5">
      <PromptRow parts={parts}>{a.prompt}</PromptRow>
      <div className="flex min-h-[96px] flex-wrap items-center justify-center gap-3">
        {left.map((it) => (
          <div key={it.id} className="l-pop-in relative">
            <SortCard
              it={it}
              selected={selected === it.id}
              onTap={() => {
                sfx("pick");
                setSelected((s) => (s === it.id ? null : it.id));
                if (voice && it.say) void say(it.say);
              }}
              onDrop={(bin, el) => tryPlace(it, bin, el)}
            />
          </div>
        ))}
      </div>
      <div className="grid w-full gap-4" style={{ gridTemplateColumns: `repeat(${a.bins.length}, minmax(0, 1fr))` }}>
        {a.bins.map((b) => {
          const inBin = a.items.filter((it) => placed[it.id] === b.id);
          return (
            <button
              type="button"
              key={b.id}
              data-drop={b.id}
              onClick={(e) => {
                const it = items.find((x) => x.id === selected);
                if (it) tryPlace(it, b.id, e.currentTarget);
              }}
              className={cn("flex flex-col items-center gap-3 rounded-[28px] border-[4px] border-dashed border-white/80 bg-white/25 p-4 transition-colors", a.items.some((x) => (x.text?.length ?? 0) > 22) ? "min-h-[170px]" : "min-h-[220px]", selected && "bg-white/40")}
            >
              <span key={shakeBin?.id === b.id ? shakeBin.n : 0} className={cn("flex items-center gap-2 rounded-full bg-white px-5 py-2 font-display text-2xl font-extrabold text-[var(--l-ink)] shadow-[0_4px_0_var(--l-line)]", shakeBin?.id === b.id && "l-shake")}>
                {b.emoji && <GlyphRow s={b.emoji} size={38} />}
                {b.label}
              </span>
              <span className="flex flex-wrap justify-center gap-2">
                {inBin.map((it) => (
                  <span key={it.id} className="l-pop-in flex items-center gap-1 rounded-2xl bg-white px-3 py-1.5 shadow-[0_3px_0_var(--l-green-edge)]">
                    {it.emoji && <GlyphRow s={it.emoji} size={36} />}
                    {it.text && <span className="font-reading text-xl font-bold text-[var(--l-ink)]"><WithGlyphs text={it.text} /></span>}
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Order ────────────────────────────────────────────────────────────────────────────────────
export function OrderAct({ act: a, fx, onDone }: ActProps<"order">) {
  const parts = useSpokenPrompt(fx, a.say, a.prompt);
  const shuffled = useShuffledApart(a.items, fx.seed);
  const [n, setN] = useState(0); // how many are in place
  const [misses, setMisses] = useState(0);
  const [shake, setShake] = useState<{ id: string; k: number } | null>(null);
  const later = useLater();
  const column = a.direction === "column";
  const tap = (id: string, el: Element | null) => {
    if (n >= a.items.length) return;
    const it = a.items.find((x) => x.id === id);
    if (fx.voice !== "keys" && it?.say) void say(it.say);
    if (a.items[n].id === id) {
      sfx("snap");
      fx.burst(el, "star", 6);
      const next = n + 1;
      setN(next);
      if (next === a.items.length) {
        fx.right(el);
        later(() => onDone(misses), 1300);
      }
    } else {
      setMisses((m) => m + 1);
      setShake((s) => ({ id, k: (s?.k ?? 0) + 1 }));
      fx.wrong(el);
    }
  };
  const hintId = misses >= 2 && n < a.items.length ? a.items[n].id : null;
  // Long step lists sit side by side (answers left, cards right) so they fit a landscape wall.
  const side = column && a.items.length >= 4 && a.items.some((it) => (it.text?.length ?? 0) > 16);
  return (
    <div className={cn("flex w-full flex-col items-center", side ? "max-w-[1180px] gap-5" : "max-w-[1100px] gap-6")}>
      <PromptRow parts={parts}>{a.prompt}</PromptRow>
      <div className={side ? "flex w-full items-start justify-center gap-6" : "contents"}>
        {/* The answer row fills up in order */}
        <div className={cn("flex", column ? (side ? "w-[min(52%,600px)] flex-col gap-2.5" : "w-full max-w-[560px] flex-col gap-3") : "flex-wrap justify-center gap-3")}>
          {a.items.map((it, i) => (
            <div key={it.id} className={cn("flex items-center gap-3 rounded-[22px] border-[4px] border-dashed px-4 py-2", i < n ? "border-transparent bg-white shadow-[0_5px_0_var(--l-green-edge)]" : "border-white/70 bg-white/20", column ? (side ? "min-h-[62px]" : "min-h-[70px]") : "min-h-[92px] min-w-[140px] justify-center")}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--l-gold)] font-display text-lg font-extrabold text-[#5a3b00]">{i + 1}</span>
              {i < n && (
                <span className="l-pop-in flex items-center gap-2">
                  {it.emoji && <GlyphRow s={it.emoji} size={side ? 38 : 46} />}
                  {it.text && <span className={cn("font-reading font-bold leading-tight text-[var(--l-ink)]", side ? "text-[21px]" : "text-[24px]")}><WithGlyphs text={it.text} /></span>}
                </span>
              )}
            </div>
          ))}
        </div>
        <div className={cn("flex", side ? "w-[min(44%,520px)] flex-col gap-2.5" : "flex-wrap justify-center gap-3")}>
          {shuffled.map((it) => {
            const used = a.items.findIndex((x) => x.id === it.id) < n;
            if (used) return null;
            return (
              <Chunk key={it.id} tone="white" onClick={(e) => (sfx("pick"), tap(it.id, e.currentTarget))} className={cn("flex items-center gap-2 text-[var(--l-ink)]", side ? "min-h-[62px] justify-start px-4 text-left" : "min-h-[84px] px-5", hintId === it.id && "l-hint")}>
                <span key={shake?.id === it.id ? shake.k : 0} className={cn("flex items-center gap-2", shake?.id === it.id && "l-shake")}>
                  {it.emoji && <GlyphRow s={it.emoji} size={side ? 38 : 48} />}
                  {it.text && <span className={cn("font-reading font-bold leading-tight", side ? "text-[21px]" : "text-[26px]")}><WithGlyphs text={it.text} /></span>}
                </span>
              </Chunk>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Match ────────────────────────────────────────────────────────────────────────────────────
function Face({ o, small }: { o: Option; small?: boolean }) {
  if (o.visual) return <Visual v={o.visual} size="sm" />;
  return (
    <span className="flex flex-col items-center gap-1">
      {o.emoji && <GlyphRow s={o.emoji} size={small ? 48 : 62} />}
      {o.text && <span className={cn("text-balance text-center font-reading font-bold leading-tight text-[var(--l-ink)]", (o.text?.length ?? 0) > 14 ? "text-[20px]" : "text-[26px]")}><WithGlyphs text={o.text} /></span>}
    </span>
  );
}

const PAIR_COLORS = ["#3ccf6e", "#1cb0f6", "#8b6cff", "#ff9149", "#ff6aa2", "#22c59b"];

export function MatchAct(props: ActProps<"match">) {
  return props.act.mode === "memory" ? <Memory {...props} /> : <Columns {...props} />;
}

function Columns({ act: a, fx, onDone }: ActProps<"match">) {
  const parts = useSpokenPrompt(fx, a.say, a.prompt);
  const lefts = useShuffled(a.pairs.map((p, i) => ({ i, o: p.a })), `${fx.seed}:a`);
  const rights = useShuffled(a.pairs.map((p, i) => ({ i, o: p.b })), `${fx.seed}:b`);
  const [sel, setSel] = useState<{ side: "a" | "b"; i: number } | null>(null);
  const [matched, setMatched] = useState<number[]>([]);
  const [misses, setMisses] = useState(0);
  const [shake, setShake] = useState<{ key: string; n: number } | null>(null);
  const later = useLater();
  const pick = (side: "a" | "b", i: number, o: Option, el: Element | null) => {
    if (matched.includes(i)) return;
    sfx("pick");
    if (fx.voice !== "keys" && o.say) void say(o.say);
    if (!sel || sel.side === side) return setSel({ side, i });
    if (sel.i === i) {
      const m = [...matched, i];
      setMatched(m);
      setSel(null);
      sfx("snap");
      fx.burst(el, "star", 7);
      if (m.length === a.pairs.length) {
        fx.right(el);
        later(() => onDone(misses), 1300);
      }
    } else {
      setMisses((x) => x + 1);
      setShake((s) => ({ key: `${side}${i}|${sel.side}${sel.i}`, n: (s?.n ?? 0) + 1 }));
      setSel(null);
      fx.wrong(el);
    }
  };
  const tile = (side: "a" | "b", i: number, o: Option) => {
    const done = matched.includes(i);
    const isSel = sel?.side === side && sel.i === i;
    const shaking = !!shake && shake.key.split("|").includes(`${side}${i}`);
    return (
      <Chunk
        key={`${side}${i}`}
        tone="white"
        disabled={done}
        onClick={(e) => pick(side, i, o, e.currentTarget)}
        className={cn("flex min-h-[92px] w-full items-center justify-center px-3 py-2", isSel && "ring-[5px] ring-[var(--l-gold)]", done && "opacity-90")}
        style={done ? { boxShadow: `0 6px 0 ${PAIR_COLORS[matched.indexOf(i) % PAIR_COLORS.length]}`, outline: `4px solid ${PAIR_COLORS[matched.indexOf(i) % PAIR_COLORS.length]}` } : undefined}
      >
        <span key={shaking ? shake!.n : 0} className={cn(shaking && "l-shake")}>
          <Face o={o} />
        </span>
      </Chunk>
    );
  };
  return (
    <div className="flex w-full max-w-[1000px] flex-col items-center gap-5">
      <PromptRow parts={parts}>{a.prompt}</PromptRow>
      <div className="grid w-full grid-cols-2 gap-x-10 gap-y-3">
        <div className="flex flex-col gap-3">{lefts.map((x) => tile("a", x.i, x.o))}</div>
        <div className="flex flex-col gap-3">{rights.map((x) => tile("b", x.i, x.o))}</div>
      </div>
    </div>
  );
}

function Memory({ act: a, fx, onDone }: ActProps<"match">) {
  const parts = useSpokenPrompt(fx, a.say, a.prompt);
  const cards = useShuffled(
    a.pairs.flatMap((p, i) => [
      { key: `${i}a`, i, o: p.a },
      { key: `${i}b`, i, o: p.b },
    ]),
    fx.seed,
  );
  const [open, setOpen] = useState<string[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [fails, setFails] = useState(0);
  const later = useLater();
  const busy = open.length >= 2;
  const flip = (c: (typeof cards)[number], el: Element | null) => {
    if (busy || open.includes(c.key) || matched.includes(c.i)) return;
    sfx("whoosh");
    if (fx.voice !== "keys" && c.o.say) void say(c.o.say);
    const now = [...open, c.key];
    setOpen(now);
    if (now.length < 2) return;
    const [x, y] = now.map((k) => cards.find((q) => q.key === k)!);
    if (x.i === y.i) {
      later(() => {
        sfx("snap");
        fx.burst(el, "star", 8);
        const m = [...matched, x.i];
        setMatched(m);
        setOpen([]);
        if (m.length === a.pairs.length) {
          fx.right(el);
          // Exploring is part of memory: misses beyond one per pair count.
          later(() => onDone(Math.max(0, fails - a.pairs.length)), 1300);
        }
      }, 450);
    } else {
      setFails((f) => f + 1);
      later(() => {
        sfx("tap");
        setOpen([]);
      }, 1000);
    }
  };
  const cols = cards.length <= 8 ? 4 : cards.length <= 12 ? 4 : 5;
  return (
    <div className="flex w-full max-w-[980px] flex-col items-center gap-5">
      <PromptRow parts={parts}>{a.prompt}</PromptRow>
      <div className="grid w-full gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {cards.map((c) => {
          const up = open.includes(c.key) || matched.includes(c.i);
          return (
            <button key={c.key} type="button" onClick={(e) => flip(c, e.currentTarget)} className="relative h-[136px] [perspective:900px]" aria-label={up ? (c.o.text ?? "card") : "hidden card"}>
              <span className="absolute inset-0 transition-transform duration-500 [transform-style:preserve-3d]" style={{ transform: up ? "rotateY(180deg)" : "none" }}>
                <span className="absolute inset-0 flex items-center justify-center rounded-[22px] bg-[var(--l-violet)] shadow-[0_6px_0_var(--l-violet-edge)] [backface-visibility:hidden]"><Glyph e="⚓" size={58} /></span>
                <span className={cn("absolute inset-0 flex items-center justify-center rounded-[22px] bg-white p-2 shadow-[0_6px_0_var(--l-line)] [backface-visibility:hidden] [transform:rotateY(180deg)]", matched.includes(c.i) && "shadow-[0_6px_0_var(--l-green-edge)] outline outline-4 outline-[var(--l-green)]")}>
                  <Face o={c.o} small />
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Place value ──────────────────────────────────────────────────────────────────────────────
export function PlaceAct({ act: a, fx, onDone }: ActProps<"place">) {
  const target = a.target;
  const word = target <= 100 ? numberWord(target) : null;
  const prompt = `Build ${target}`;
  const parts = useSpokenPrompt(fx, word ? [SAY.buildNumber, "~", word] : undefined, prompt);
  const [h, setH] = useState(0);
  const [t, setT] = useState(0);
  const [o, setO] = useState(0);
  const [misses, setMisses] = useState(0);
  const [shake, setShake] = useState(0);
  const [done, setDone] = useState(false);
  const later = useLater();
  const value = h * 100 + t * 10 + o;
  const col = (label: string, n: number, set: (f: (v: number) => number) => void, max: number, color: string, unit: React.ReactNode) => (
    <div className="flex flex-col items-center gap-3 rounded-[26px] bg-white/90 p-4 shadow-[0_6px_0_var(--l-line)]">
      <span className="font-display text-xl font-extrabold text-[var(--l-ink-2)]">{label}</span>
      <div className="flex min-h-[150px] max-w-[240px] flex-wrap items-end justify-center gap-1.5">{Array.from({ length: n }, (_, i) => <span key={i} className="l-pop-in">{unit}</span>)}</div>
      <span className="font-display text-4xl font-extrabold tabular-nums" style={{ color }}>{n}</span>
      <div className="flex gap-2">
        <Chunk tone="white" aria-label={`fewer ${label}`} disabled={done || n === 0} onClick={() => (sfx("tap"), set((v) => Math.max(0, v - 1)))} className="flex h-14 w-14 items-center justify-center text-[var(--l-ink)]">
          <Minus className="h-7 w-7" strokeWidth={3} />
        </Chunk>
        <Chunk tone="blue" aria-label={`more ${label}`} disabled={done || n >= max} onClick={() => (sfx("count", n + 1), set((v) => Math.min(max, v + 1)))} className="flex h-14 w-14 items-center justify-center">
          <Plus className="h-7 w-7" strokeWidth={3} />
        </Chunk>
      </div>
    </div>
  );
  const check = (el: Element | null) => {
    if (done) return;
    if (value === target) {
      setDone(true);
      fx.right(el, word && fx.voice !== "keys" ? [word] : []);
      later(() => onDone(misses), 1300);
    } else {
      setMisses((m) => m + 1);
      setShake((s) => s + 1);
      fx.wrong(el);
    }
  };
  const digits = String(target).padStart(a.hundreds ? 3 : 2, "0");
  return (
    <div className="flex w-full max-w-[1000px] flex-col items-center gap-5">
      <PromptRow parts={parts}>
        Build <span className="rounded-xl bg-[#fff3c4] px-3 text-[var(--l-ink)] shadow-[0_3px_0_#f2d27a]">{target}</span>
      </PromptRow>
      <div className="flex flex-wrap items-stretch justify-center gap-4">
        {a.hundreds && col("Hundreds", h, setH, 9, "#1f6fb2", <span className="block h-12 w-12 rounded-md bg-[#5fb0ff] shadow-[inset_0_0_0_2px_#1f6fb2]" />)}
        {col("Tens", t, setT, 9, "#c2410c", <span className="block h-[108px] w-3.5 rounded-sm bg-[#fb923c] shadow-[inset_0_0_0_2px_#c2410c]" />)}
        {col("Ones", o, setO, 9, "#15803d", <span className="block h-5 w-5 rounded-[4px] bg-[#22c55e] shadow-[inset_0_-3px_0_rgba(0,0,0,0.18)]" />)}
      </div>
      <div className="flex items-center gap-4">
        <span key={shake} className={cn("rounded-[22px] bg-white px-6 py-3 font-display text-4xl font-extrabold tabular-nums text-[var(--l-ink)] shadow-[0_6px_0_var(--l-line)]", shake > 0 && !done && "l-shake")}>{value}</span>
        <Chunk tone="green" onClick={(e) => check(e.currentTarget)} className="flex h-[72px] items-center gap-2 px-7 font-display text-2xl font-extrabold">
          <Check className="h-8 w-8" strokeWidth={3.5} /> Check
        </Chunk>
      </div>
      {misses >= 2 && !done && (
        <p className="l-rise font-display text-xl font-bold text-white">
          Hint: {a.hundreds ? `${digits[0]} hundreds, ` : ""}
          {digits[digits.length - 2]} tens and {digits[digits.length - 1]} ones.
        </p>
      )}
    </div>
  );
}
