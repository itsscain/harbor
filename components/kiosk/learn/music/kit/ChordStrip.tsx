"use client";

import { memo, useId, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import type { InstId } from "@/lib/learn/mus/types";
import { chordSymbol, noteColor, pcOf, romanChord } from "@/lib/learn/mus/theory";
import { voiced } from "@/lib/learn/mus/score";
import { playNote } from "@/lib/learn/mus/synth";
import { sfx } from "@/lib/learn/sfx";
import { useDrag } from "../../kit";

// Chord cards and a row of bars to put them in — the chord-progression builder. Each card is a
// chord of the key, drawn like ChordBlocks (the roman numeral big, the chord's name small, colored
// by its root); tap a card to hear it strummed. Then tap a bar to put it there — or drag the card
// onto a bar. Tap a filled bar to clear it (or to swap in the card that's picked up); drag a chord
// from one bar to another to move it, or off the strip to throw it away. The bar being played
// glows. Long progressions wrap four bars to a line, like a real chord chart.

const FLAT_MAJOR = new Set([1, 3, 5, 6, 8, 10]);
const FLAT_MINOR = new Set([0, 2, 3, 5, 7, 10]);

/** A roman numeral in a key: the chord's name ("Am", "B♭"), its root's color, and its pitches. */
export function chordInfo(roman: string, tonic: number, scale: "major" | "minor"): { name: string; color: string; root: number; pitches: number[] } {
  try {
    const c = romanChord(roman, tonic, scale);
    const flats = (scale === "minor" ? FLAT_MINOR : FLAT_MAJOR).has(pcOf(tonic));
    return { name: chordSymbol(c.root, c.q, flats), color: noteColor(c.root), root: c.root, pitches: voiced(c.root, c.q) };
  } catch {
    return { name: "", color: "#9aa9bd", root: tonic, pitches: [] };
  }
}

/** Strum a chord right now, with its root in the bass. */
export function playChord(roman: string, tonic: number, scale: "major" | "minor", inst: InstId = "piano") {
  const c = chordInfo(roman, tonic, scale);
  if (!c.pitches.length) return;
  let low = c.root;
  while (low > 52) low -= 12;
  while (low < 40) low += 12;
  playNote("bass", low, 1.3, 0.7);
  c.pitches.forEach((p, i) => (i ? window.setTimeout(() => playNote(inst, p, 1.4, 0.62), i * 24) : playNote(inst, p, 1.4, 0.62)));
}

export type ChordStripProps = {
  /** The chord cards offered (roman numerals in the key: "I", "IV", "V7", "vi"…). */
  palette: string[];
  /** One per bar (null = empty). */
  value: (string | null)[];
  onChange: (value: (string | null)[]) => void;
  tonic: number;
  scale: "major" | "minor";
  /** The bar being heard (−1 = stopped). */
  playBar?: number;
  /** What a tapped card sounds like. */
  inst?: InstId;
  disabled?: boolean;
  /** Bars to flag (a red ring and a wiggle); bump `k` to wiggle again. */
  marks?: { bars: number[]; k: number };
  size?: "md" | "lg";
};

export const ChordStrip = memo(function ChordStrip({ palette, value, onChange, tonic, scale, playBar = -1, inst = "piano", disabled = false, marks, size = "md" }: ChordStripProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [sel, setSel] = useState<string | null>(null);
  const [lifted, setLifted] = useState(false);
  const [nudge, setNudge] = useState(0);
  const lg = size === "lg";
  const cardW = lg ? 116 : 96;
  const cardH = lg ? 124 : 104;
  const bars = value.length;
  const cols = bars <= 6 ? bars : 4;
  const slotH = bars > 8 ? (lg ? 100 : 88) : lg ? 132 : 112;

  const slotOf = (t: HTMLElement | null): number | null => {
    const d = t?.dataset.drop ?? "";
    if (!d.startsWith(`${uid}:`)) return null;
    const i = Number(d.slice(uid.length + 1));
    return Number.isInteger(i) && i >= 0 && i < bars ? i : null;
  };
  const set = (i: number, r: string | null) => {
    const next = [...value];
    next[i] = r;
    onChange(next);
  };
  const hear = (r: string) => playChord(r, tonic, scale, inst);
  const putIn = (i: number, r: string) => {
    set(i, r);
    hear(r);
    sfx("snap");
  };
  const tapCard = (r: string) => {
    hear(r);
    sfx("pick");
    setSel((s) => (s === r ? null : r));
  };
  const tapSlot = (i: number) => {
    if (disabled) return;
    const cur = value[i];
    if (sel && sel !== cur) return putIn(i, sel);
    if (cur) {
      set(i, null);
      sfx("pop");
      return;
    }
    // Nothing picked up yet: the cards wiggle ("pick one of us first").
    sfx("tap");
    setNudge((n) => n + 1);
  };

  return (
    <div className={cn("flex w-full flex-col items-center gap-4", disabled && "pointer-events-none")}>
      {/* The cards */}
      <div key={nudge} className={cn("flex flex-wrap items-center justify-center gap-3", nudge > 0 && "l-shake")}>
        {palette.map((r) => (
          <ChordCard
            key={r}
            roman={r}
            info={chordInfo(r, tonic, scale)}
            w={cardW}
            h={cardH}
            selected={sel === r}
            disabled={disabled}
            onTap={() => tapCard(r)}
            onLift={() => {
              sfx("lift");
              setSel(r);
              setLifted(true);
            }}
            onDrop={(t) => {
              setLifted(false);
              const i = slotOf(t);
              if (i !== null) putIn(i, r);
            }}
            onCancel={() => setLifted(false)}
          />
        ))}
      </div>
      {/* The bars */}
      <div className="grid w-full gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {value.map((r, i) => {
          const on = i === playBar;
          const flagged = !!marks?.bars.includes(i);
          const waiting = !r && (!!sel || lifted);
          return (
            <div
              key={i}
              data-drop={`${uid}:${i}`}
              className={cn("relative rounded-[24px] transition-transform duration-150", on && "scale-[1.04]")}
              style={{ height: slotH }}
            >
              {r ? (
                <SlotChord
                  key={r}
                  roman={r}
                  info={chordInfo(r, tonic, scale)}
                  h={slotH}
                  on={on}
                  flagged={flagged}
                  disabled={disabled}
                  onTap={() => tapSlot(i)}
                  onLift={() => {
                    sfx("lift");
                    setLifted(true);
                  }}
                  onDrop={(t) => {
                    setLifted(false);
                    const j = slotOf(t);
                    if (j === i) return;
                    const next = [...value];
                    if (j === null) {
                      next[i] = null;
                      sfx("pop");
                    } else {
                      next[i] = value[j];
                      next[j] = r;
                      sfx("snap");
                    }
                    onChange(next);
                  }}
                  onCancel={() => setLifted(false)}
                />
              ) : (
                <button
                  key={`e${flagged ? marks?.k : 0}`}
                  type="button"
                  aria-label={`Bar ${i + 1}: empty`}
                  onClick={() => tapSlot(i)}
                  className={cn(
                    "flex h-full w-full flex-col items-center justify-center rounded-[24px] border-[4px] border-dashed transition-colors",
                    flagged ? "l-shake border-[var(--l-coral)] bg-[#ffe7e3]" : on ? "border-[#ff6fb5] bg-[#fff0f7]" : waiting ? "l-pulse border-[#ff6fb5] bg-white/70" : "border-[#c9d6e3] bg-white/55",
                  )}
                  style={on ? { boxShadow: "0 0 0 4px #fff, 0 0 26px rgba(255,111,181,0.75)" } : undefined}
                >
                  <Plus className={cn("h-9 w-9", waiting ? "text-[#ff6fb5]" : "text-[#9fb2c6]")} strokeWidth={3} />
                </button>
              )}
              <span className={cn("pointer-events-none absolute left-3 top-2 font-display text-base font-extrabold", r ? "text-white/85" : "text-[var(--l-ink-2)]/70")}>{i + 1}</span>
              {flagged && (
                <span key={`!${marks?.k}`} className="l-pop-in pointer-events-none absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--l-coral)] font-display text-2xl font-black text-white shadow-[0_3px_0_var(--l-coral-edge)]" aria-hidden>
                  !
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

function ChordFace({ roman, name, h }: { roman: string; name: string; h: number }) {
  return (
    <>
      <span className="font-[Georgia,serif] font-black leading-none text-white" style={{ fontSize: Math.round(h * 0.36), textShadow: "0 2px 0 rgba(0,0,0,0.25)" }}>
        {roman}
      </span>
      <span className="mt-1 font-display font-extrabold leading-none text-white/95" style={{ fontSize: Math.round(h * 0.17), textShadow: "0 1px 0 rgba(0,0,0,0.2)" }}>
        {name}
      </span>
    </>
  );
}

type DragFns = { onTap: () => void; onLift: () => void; onDrop: (t: HTMLElement | null) => void; onCancel: () => void; disabled: boolean };

/** A card in the palette (an endless supply: it springs back after you drop it). */
function ChordCard({ roman, info, w, h, selected, disabled, onTap, onLift, onDrop, onCancel }: { roman: string; info: { name: string; color: string }; w: number; h: number; selected: boolean } & DragFns) {
  const { handlers, dragging } = useDrag({ onTap, onLift, onDrop, disabled });
  return (
    <div
      {...handlers}
      onPointerCancel={() => {
        handlers.onPointerCancel();
        onCancel();
      }}
      data-dragging={dragging}
      role="button"
      aria-label={`${roman} chord, ${info.name}`}
      aria-pressed={selected}
      className={cn("l-drag relative flex flex-col items-center justify-center rounded-[22px] border-[3px] border-[#2a2f45] transition-[box-shadow,translate] duration-150", selected && !dragging && "-translate-y-1.5")}
      style={{ width: w, height: h, background: `linear-gradient(180deg, ${info.color}, ${info.color} 62%, ${info.color}d9)`, boxShadow: selected ? `0 0 0 5px var(--l-gold), 0 10px 0 rgba(0,40,80,0.2)` : "inset 0 4px 0 rgba(255,255,255,0.35), 0 6px 0 rgba(0,40,80,0.22)" }}
    >
      <ChordFace roman={roman} name={info.name} h={h} />
    </div>
  );
}

/** A chord sitting in a bar: tap to clear it, drag it to another bar (or off the strip). */
function SlotChord({ roman, info, h, on, flagged, disabled, onTap, onLift, onDrop, onCancel }: { roman: string; info: { name: string; color: string }; h: number; on: boolean; flagged: boolean } & DragFns) {
  const { handlers, dragging } = useDrag({ onTap, onLift, onDrop, disabled });
  return (
    <div
      {...handlers}
      onPointerCancel={() => {
        handlers.onPointerCancel();
        onCancel();
      }}
      data-dragging={dragging}
      role="button"
      aria-label={`${roman} chord, ${info.name} — tap to take it out`}
      className={cn("l-drag l-boing relative flex h-full w-full flex-col items-center justify-center rounded-[24px] border-[4px]", flagged ? "border-[var(--l-coral)]" : "border-[#2a2f45]")}
      style={{
        background: `linear-gradient(180deg, ${info.color}, ${info.color} 62%, ${info.color}d9)`,
        boxShadow: on ? `0 0 0 4px #fff, 0 0 30px ${info.color}, 0 0 0 9px rgba(255,111,181,0.55)` : flagged ? "0 0 0 4px rgba(255,115,99,0.45), 0 6px 0 rgba(0,40,80,0.22)" : "inset 0 4px 0 rgba(255,255,255,0.35), 0 6px 0 rgba(0,40,80,0.22)",
        filter: on ? "brightness(1.12)" : undefined,
      }}
    >
      <ChordFace roman={roman} name={info.name} h={Math.min(h, 120)} />
    </div>
  );
}
