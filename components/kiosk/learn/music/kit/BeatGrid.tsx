"use client";

import { memo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/cn";
import type { DrumId, MHit, Score } from "@/lib/learn/mus/types";
import { DRUMS } from "@/lib/learn/mus/catalog";
import { playDrum } from "@/lib/learn/mus/synth";
import { sfx } from "@/lib/learn/sfx";
import { InstrumentPic } from "./kit";

// The Beat Lab grid: a drum machine sized for small fingers (and good enough for a 13-year-old
// producer). One row per drum — tap the drum's picture to hear it — and one square per step: tap a
// square to put a hit there (it plays the moment the finger lands), tap it again to take it away,
// or drag a finger along to paint a whole run in one stroke. Steps are grouped by beat and counted
// ("1 2 3 4", "1 & 2 &", "1 e & a"); while the beat plays, the playhead column glows, every hit
// flashes as it sounds and the drum pictures bounce along. Controlled: the screen owns the grid
// ("x" = hit, "." = rest, one string per row) and hears every change.

// ── Colors and names ─────────────────────────────────────────────────────────────────────────
const DRUM_COLOR: Partial<Record<DrumId, string>> = {
  kick: "#ff7363", bassdrum: "#ff7363", stomp: "#ff9149", tom: "#22c59b", lowtom: "#14a07c",
  snare: "#1cb0f6", rim: "#56c8ff", sticks: "#8ad4ff", block: "#c98a4a",
  hat: "#ffc83d", openhat: "#ffa62b", shaker: "#e6c229", maracas: "#ffd25a", tamb: "#f4b400",
  clap: "#8b6cff", snap: "#b45cff",
  conga: "#3ccf6e", bongo: "#8ad43f", timpani: "#1fb8a8",
  crash: "#ff6fb5", ride: "#ff5cb8", cymbals: "#ff6fb5", gong: "#d9408f",
  cowbell: "#ff9f1c", triangle: "#7b5cff",
};
const FALLBACK = ["#ff7363", "#1cb0f6", "#ffc83d", "#8b6cff", "#22c59b", "#ff9149", "#ff6fb5", "#3ccf6e"];
/** Each drum's color (the same everywhere — Beat Lab, the Studio). */
export const drumColor = (d: DrumId, row = 0) => DRUM_COLOR[d] ?? FALLBACK[row % FALLBACK.length];
const SHORT: Partial<Record<DrumId, string>> = { kick: "Kick", snare: "Snare", hat: "Hi-hat", openhat: "Open hat", lowtom: "Low tom", crash: "Crash", ride: "Ride", block: "Block", rim: "Rim", snap: "Snap", bassdrum: "Bass drum" };
/** A drum's short name for a row label ("Kick", "Hi-hat", "Clap"). */
export const drumShort = (d: DrumId) => SHORT[d] ?? DRUMS[d].name;

/** A hex color mixed toward white (to = 255) or black (to = 0). */
function mix(hex: string, to: number, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (s: number) => Math.round(((n >> s) & 255) * (1 - amt) + to * amt);
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}

const SUB16 = ["", "e", "&", "a"];
/** How a column is counted: "1" … on the beats, "&" / "e" / "a" between them. */
export function stepCount(c: number, steps: number): { text: string; beat: boolean } {
  const per = Math.max(1, Math.round(steps / 4));
  const sub = c % per;
  if (sub === 0) return { text: String(Math.floor(c / per) + 1), beat: true };
  return { text: per === 2 ? "&" : (SUB16[sub] ?? ""), beat: false };
}

// ── Timing ───────────────────────────────────────────────────────────────────────────────────
/** Straight beats → swung time (eighth-note swing, as the synth plays it). */
const swingAt = (b: number, s: number) => {
  if (!s) return b;
  const w = Math.floor(b);
  const f = b - w;
  const mid = 0.5 + s / 2;
  return w + (f <= 0.5 ? (f / 0.5) * mid : mid + ((f - 0.5) / 0.5) * (1 - mid));
};
/** Swung time → straight beats (where on the grid the music is). */
const unswingAt = (t: number, s: number) => {
  if (!s) return t;
  const w = Math.floor(t);
  const f = t - w;
  const mid = 0.5 + s / 2;
  return w + (f <= mid ? (f / mid) * 0.5 : 0.5 + ((f - mid) / (1 - mid)) * 0.5);
};

/** Every row exactly `steps` long, "x" or ".", one per drum. */
export function normGrid(rows: readonly unknown[], grid: readonly string[], steps: number): string[] {
  return rows.map((_, i) => Array.from({ length: steps }, (_, j) => (grid[i]?.[j] === "x" ? "x" : ".")).join(""));
}

/** The grid column being heard at `beat` (beats into the bar, as heard) — −1 when stopped. */
export function gridStep(beat: number | null | undefined, steps: number, swing = 0): number {
  if (beat === null || beat === undefined || !(beat >= 0)) return -1;
  const per = Math.max(1, steps / 4);
  return Math.floor(unswingAt(beat, swing) * per + 1e-6) % steps;
}

/** How many times faster than it sounds a grid loop is written (1, 2 or 4). A drum track's length
 *  is its last hit plus half a beat, rounded up to a bar — so a hit on the last 16th would stretch
 *  a one-bar loop to two. Written k× faster (k× the tempo, k× the positions) it sounds identical and
 *  loops exactly. Divide the player's beat by this. */
export function loopFactor(steps: number, swing = 0): number {
  const per = Math.max(1, steps / 4);
  const last = swingAt((steps - 1) / per, swing);
  for (const k of [1, 2, 4, 8]) if (last <= 4 - 0.5 / k + 1e-9) return k;
  return 8;
}

/** The grid as a Score that loops seamlessly: `times` bars of 4/4 at `bpm`, swing baked into the
 *  hit times, beats accented, an optional crash on the downbeat (a flourish). Play it, then read the
 *  playhead with gridStep(player.beat / k, steps, swing). */
export function gridLoop(rows: readonly DrumId[], grid: readonly string[], steps: number, bpm: number, o: { swing?: number; times?: number; crash?: boolean } = {}): { score: Score; k: number } {
  const swing = Math.max(0, Math.min(0.4, o.swing ?? 0));
  const k = loopFactor(steps, swing);
  const per = Math.max(1, steps / 4);
  const times = Math.max(1, Math.round(o.times ?? 1));
  const g = normGrid(rows, grid, steps);
  const hits: MHit[] = [];
  for (let rep = 0; rep < times; rep++)
    rows.forEach((d, r) => {
      for (let c = 0; c < steps; c++) if (g[r][c] === "x") hits.push({ t: k * (rep * 4 + swingAt(c / per, swing)), k: d, v: c % per === 0 ? 0.86 : 0.7 });
    });
  if (o.crash) hits.push({ t: 0, k: "crash", v: 0.5 });
  // A silent tick at the very end pins the length to whole bars (even for an empty grid).
  hits.push({ t: k * 4 * times - 0.5, k: "sticks", v: 0 });
  return { score: { bpm: bpm * k, meter: [4, 4], tracks: [{ kind: "drums", hits }] }, k };
}

// ── The grid ─────────────────────────────────────────────────────────────────────────────────
export type BeatGridProps = {
  /** One row per drum, top to bottom. */
  rows: DrumId[];
  /** One string per row: "x" = hit, "." = rest. */
  grid: string[];
  /** Steps across one bar of 4/4: 4 = beats, 8 = eighths, 16 = sixteenths. */
  steps: number;
  onChange: (grid: string[]) => void;
  /** The column being heard (−1 = stopped). */
  playStep?: number;
  disabled?: boolean;
  /** "lg" = giant pads for the youngest. */
  size?: "md" | "lg";
  /** Cells that can't be changed (a part that's given). */
  locked?: boolean[][];
  /** Hits flash as the playhead reaches them (turn off while something else plays). Default on. */
  flash?: boolean;
  /** Cells to point at — a glowing hint ring ("look here"). */
  marks?: boolean[][];
  /** Rows to flag (a wiggle and a red ring on the drum); bump `k` to wiggle again. */
  flag?: { rows: number[]; k: number };
  /** Show each drum's name under its picture (for readers). */
  names?: boolean;
};

type Stroke = { on: boolean; r: number; c: number };

export const BeatGrid = memo(function BeatGrid({ rows, grid, steps, onChange, playStep = -1, disabled = false, size = "md", locked, flash = true, marks, flag, names = false }: BeatGridProps) {
  const per = Math.max(1, Math.round(steps / 4));
  const beats = Math.ceil(steps / per);
  const g = normGrid(rows, grid, steps);
  const n = rows.length;
  const lg = size === "lg";
  let rowH = n <= 1 ? (lg ? 156 : 128) : n <= 2 ? (lg ? 132 : 112) : n <= 3 ? (lg ? 104 : 90) : n <= 4 ? (lg ? 86 : 76) : n <= 5 ? 66 : 56;
  if (steps >= 16) rowH = Math.min(rowH, lg ? 78 : 64);
  else if (steps >= 8) rowH = Math.min(rowH, lg ? 118 : 100);
  const pic = Math.round(Math.max(34, Math.min(rowH - 20, lg ? 86 : 66)));
  const labelW = Math.max(pic + 20, names ? 96 : 0);
  const radius = steps >= 16 ? 12 : steps >= 8 ? 16 : 24;
  const cellGap = steps >= 16 ? 4 : 6;
  const beatGap = steps >= 16 ? 12 : 14;
  const rowGap = n >= 5 ? 6 : 8;
  const headH = lg ? 34 : 28;
  // Big pads show the drum's picture on every hit (the youngest see WHAT is there, not just a color).
  const picInCell = steps <= 8 && rowH >= 88;
  const playing = playStep >= 0;

  const surface = useRef<HTMLDivElement>(null);
  const work = useRef<string[] | null>(null);
  const strokes = useRef(new Map<number, Stroke>());
  // The last grid this sent, and the grid it was built on: two quick taps before the screen has
  // re-rendered build on each other instead of the second undoing the first.
  const sent = useRef<{ from: string[]; to: string[] } | null>(null);
  const latest = () => (sent.current && sent.current.from === grid ? [...sent.current.to] : normGrid(rows, grid, steps));
  const emit = (w: string[]) => {
    const to = [...w];
    sent.current = { from: grid, to };
    onChange(to);
  };
  const [tap, setTap] = useState<{ r: number; n: number } | null>(null);
  const [nope, setNope] = useState<{ r: number; c: number; n: number } | null>(null);

  const cellAt = (x: number, y: number): [number, number] | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const cell = el?.closest<HTMLElement>("[data-cell]");
    if (!cell || !surface.current?.contains(cell)) return null;
    const [r, c] = (cell.dataset.cell ?? "").split(",").map(Number);
    return Number.isFinite(r) && Number.isFinite(c) ? [r, c] : null;
  };
  /** Set one cell (on the working copy) and tell the screen. */
  const paint = (w: string[], r: number, c: number, on: boolean): boolean => {
    if (locked?.[r]?.[c]) return false;
    const row = w[r];
    if (!row || (row[c] === "x") === on) return false;
    w[r] = row.slice(0, c) + (on ? "x" : ".") + row.slice(c + 1);
    if (on) playDrum(rows[r], c % per === 0 ? 0.95 : 0.78);
    return true;
  };
  const down = (e: RPointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    const at = cellAt(e.clientX, e.clientY);
    if (!at) return;
    e.preventDefault();
    const [r, c] = at;
    if (locked?.[r]?.[c]) {
      sfx("soft-fail");
      setNope((x) => ({ r, c, n: (x?.n ?? 0) + 1 }));
      return;
    }
    const w = !strokes.current.size || !work.current ? latest() : work.current;
    work.current = w;
    const on = w[r][c] !== "x";
    strokes.current.set(e.pointerId, { on, r, c });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (!on) sfx("tap");
    if (paint(w, r, c, on)) emit(w);
  };
  const move = (e: RPointerEvent<HTMLDivElement>) => {
    const st = strokes.current.get(e.pointerId);
    const w = work.current;
    if (!st || !w) return;
    const at = cellAt(e.clientX, e.clientY);
    if (!at || (at[0] === st.r && at[1] === st.c)) return;
    const [r, c] = at;
    let changed = false;
    // A quick swipe can jump over squares: fill the ones in between along the same row.
    if (r === st.r && Math.abs(c - st.c) > 1) {
      const dir = c > st.c ? 1 : -1;
      for (let k = st.c + dir; k !== c; k += dir) changed = paint(w, r, k, st.on) || changed;
    }
    changed = paint(w, r, c, st.on) || changed;
    strokes.current.set(e.pointerId, { ...st, r, c });
    if (changed) emit(w);
  };
  const up = (e: RPointerEvent<HTMLDivElement>) => {
    strokes.current.delete(e.pointerId);
  };
  /** Keyboard (Enter / Space on a square). */
  const toggleKey = (r: number, c: number) => {
    if (disabled) return;
    const w = latest();
    const on = w[r][c] !== "x";
    if (!on) sfx("tap");
    if (paint(w, r, c, on)) emit(w);
  };

  return (
    <div className="relative w-full rounded-[28px] bg-[#1d2440] p-3 shadow-[0_8px_0_rgba(0,40,80,0.28),inset_0_2px_0_rgba(255,255,255,0.08)] sm:p-4">
      <div className="flex gap-3">
        {/* The drums: tap one to hear it. */}
        <div className="flex shrink-0 flex-col" style={{ gap: rowGap, paddingTop: headH, width: labelW }}>
          {rows.map((d, r) => {
            const flagged = !!flag?.rows.includes(r);
            const bounce = flash && playing && g[r][playStep] === "x";
            return (
              <button
                key={r}
                type="button"
                aria-label={`Hear the ${DRUMS[d].name}`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  playDrum(d, 0.95);
                  setTap((t) => ({ r, n: (t?.n ?? 0) + 1 }));
                }}
                className={cn("relative flex touch-none select-none items-center justify-center rounded-[20px] transition-colors", flagged ? "bg-[#ff7363]/30 ring-[4px] ring-[#ff7363]" : "bg-white/10")}
                style={{ height: rowH }}
              >
                <span key={flagged ? `f${flag?.k}` : "-"} className={cn("flex flex-col items-center", flagged && "l-shake")}>
                  <span key={tap?.r === r ? tap.n : 0} className={cn("block", tap?.r === r && "m-drum-hit")}>
                    <span className="block transition-transform duration-75" style={{ transform: bounce ? "scale(1.16) rotate(-4deg)" : undefined }}>
                      <InstrumentPic id={d} size={names ? Math.min(pic, rowH - 34) : pic} />
                    </span>
                  </span>
                  {names && <span className="mt-0.5 max-w-[90px] truncate font-display text-[15px] font-extrabold leading-none text-white/85">{drumShort(d)}</span>}
                </span>
              </button>
            );
          })}
        </div>

        <div className="min-w-0 flex-1">
          {/* The count across the top: 1 2 3 4 / 1 & 2 & / 1 e & a. */}
          <div className="flex select-none" style={{ gap: beatGap, height: headH }} aria-hidden>
            {Array.from({ length: beats }, (_, b) => (
              <div key={b} className="flex flex-1" style={{ gap: cellGap }}>
                {Array.from({ length: per }, (_, j) => {
                  const c = b * per + j;
                  if (c >= steps) return null;
                  const sc = stepCount(c, steps);
                  const now = c === playStep;
                  return (
                    <span
                      key={c}
                      className={cn("flex min-w-0 flex-1 items-center justify-center font-display font-extrabold leading-none transition-[transform,color] duration-75", sc.beat ? (lg ? "text-2xl" : "text-xl") : "text-sm", now ? "scale-125 text-[#ff8cc6]" : sc.beat ? "text-white/85" : "text-white/40")}
                    >
                      {sc.text}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>

          {/* The squares: tap, or drag to paint. */}
          <div
            ref={surface}
            role="group"
            aria-label="Beat grid: tap a square to put a drum there"
            className={cn("flex touch-none select-none flex-col", disabled && "pointer-events-none")}
            style={{ gap: rowGap }}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            onLostPointerCapture={up}
          >
            {rows.map((d, r) => {
              const color = drumColor(d, r);
              return (
                <div key={r} className="flex" style={{ gap: beatGap, height: rowH }}>
                  {Array.from({ length: beats }, (_, b) => (
                    <div key={b} className="flex min-w-0 flex-1" style={{ gap: cellGap }}>
                      {Array.from({ length: per }, (_, j) => {
                        const c = b * per + j;
                        if (c >= steps) return null;
                        const on = g[r][c] === "x";
                        const here = c === playStep;
                        const lit = on && here && flash;
                        const isLocked = !!locked?.[r]?.[c];
                        const marked = !!marks?.[r]?.[c];
                        const shook = nope?.r === r && nope.c === c;
                        return (
                          <button
                            key={c}
                            type="button"
                            data-cell={`${r},${c}`}
                            aria-label={`${DRUMS[d].name}, step ${c + 1}`}
                            aria-pressed={on}
                            onClick={(e) => {
                              if (e.detail === 0 && !isLocked) toggleKey(r, c);
                            }}
                            className={cn("relative min-w-0 flex-1 transition-[transform,box-shadow,background-color] duration-100", on && "l-boing", marked && "l-hint")}
                            style={{
                              borderRadius: radius,
                              background: on ? `linear-gradient(180deg, ${mix(color, 255, 0.3)}, ${color} 55%, ${mix(color, 0, 0.12)})` : here ? "#4b578a" : c % per === 0 ? "#34406a" : "#283157",
                              boxShadow: lit
                                ? `0 0 0 3px #fff, 0 0 28px ${color}, inset 0 3px 0 rgba(255,255,255,0.5)`
                                : on
                                  ? "inset 0 4px 0 rgba(255,255,255,0.42), inset 0 -6px 0 rgba(0,0,0,0.18), 0 3px 0 rgba(0,0,0,0.3)"
                                  : here
                                    ? "inset 0 0 0 3px rgba(255,255,255,0.55)"
                                    : "inset 0 -4px 0 rgba(0,0,0,0.22)",
                              transform: lit ? "scale(1.07)" : undefined,
                              filter: lit ? "brightness(1.15)" : undefined,
                            }}
                          >
                            {on && picInCell && (
                              <span className="pointer-events-none absolute inset-0 m-auto flex items-center justify-center rounded-full bg-white/85 shadow-[0_2px_0_rgba(0,0,0,0.15)]" style={{ width: Math.round(rowH * 0.56), height: Math.round(rowH * 0.56) }} aria-hidden>
                                <InstrumentPic id={d} size={Math.round(rowH * 0.46)} />
                              </span>
                            )}
                            {lit && <span key={`r${playStep}`} className="m-ripple pointer-events-none absolute inset-0 border-[4px] border-white/80" style={{ borderRadius: radius }} aria-hidden />}
                            {isLocked && (
                              <span key={shook ? nope?.n : 0} className={cn("pointer-events-none absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/25", shook && "l-shake")} aria-hidden>
                                <Lock className="h-3.5 w-3.5 text-white/80" strokeWidth={3} />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});
