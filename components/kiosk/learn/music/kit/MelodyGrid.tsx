"use client";

import { memo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { Home } from "lucide-react";
import { cn } from "@/lib/cn";
import type { InstId } from "@/lib/learn/mus/types";
import { NATURAL_PC, noteColor, noteName, pcOf, solfege } from "@/lib/learn/mus/theory";
import { playNote } from "@/lib/learn/mus/synth";
import { sfx } from "@/lib/learn/sfx";

// The Melody Maker: a piano roll for small fingers. One row per note (high at the top, each in its
// own color, labeled do-re-mi or with letters — tap a label to hear it) and one column per slot of
// time. Tap a square to put that note there (it rings as it lands); tap it again for a rest. Drag
// across the grid to DRAW a tune — every column you pass gets the note under your finger. With
// holds on, a note can ring longer: press and hold a square (or use the Hold tool) to stretch the
// note before it up to there, or drag a note to the right. The playhead column glows as the tune
// plays and the sounding note lights up; notes that fit the chord underneath glow softly.

/** One slot: a pitch (MIDI), a rest (null), or "-" = keep holding the note before. */
export type MelodyNote = number | null | "-";

const FLAT_TONICS = new Set([1, 3, 5, 6, 8, 10]);
/** A note's label in a key: solfège ("do", "so," = low so, "do'" = high do) or its letter name. */
export function noteLabel(p: number, tonic: number, labels: "solfege" | "letters" | "colors" | "none"): string {
  if (labels === "letters") return noteName(p, { flats: FLAT_TONICS.has(pcOf(tonic)) });
  if (labels === "solfege") return solfege(p, tonic);
  return "";
}
/** The note sounding at a slot (a hold continues the note before it), or null. */
export function soundingAt(notes: readonly MelodyNote[], s: number): number | null {
  for (let k = Math.min(s, notes.length - 1); k >= 0; k--) {
    const v = notes[k];
    if (typeof v === "number") return v;
    if (v !== "-") return null;
  }
  return null;
}
/** Every note with how far it's held: its first slot, last slot and pitch. */
export function noteRuns(notes: readonly MelodyNote[]): { head: number; end: number; p: number }[] {
  const out: { head: number; end: number; p: number }[] = [];
  for (let s = 0; s < notes.length; s++) {
    const v = notes[s];
    if (typeof v !== "number") continue;
    let e = s;
    while (notes[e + 1] === "-") e++;
    out.push({ head: s, end: e, p: v });
  }
  return out;
}

// Editing a working copy (one stroke of a finger).
/** The slot where the note sounding at `s` starts (−1 = a rest). */
function headOf(w: MelodyNote[], s: number): number {
  let k = s;
  while (k > 0 && w[k] === "-") k--;
  return typeof w[k] === "number" ? k : -1;
}
/** Holds from `from` on become rests (the note before them ends). */
function cutTail(w: MelodyNote[], from: number) {
  for (let k = from; k < w.length && w[k] === "-"; k++) w[k] = null;
}
function putNote(w: MelodyNote[], s: number, p: number) {
  w[s] = p;
  cutTail(w, s + 1);
}
/** The note starting at `h` rings through slot `m`. */
function stretch(w: MelodyNote[], h: number, m: number) {
  for (let k = h + 1; k <= m; k++) w[k] = "-";
  cutTail(w, m + 1);
}
/** Stretch the note before `s` up to `s` (false if there's no note before it). */
function holdUntil(w: MelodyNote[], s: number): boolean {
  let k = s - 1;
  while (k >= 0 && w[k] === null) k--;
  if (k < 0) return false;
  const h = headOf(w, k);
  if (h < 0) return false;
  stretch(w, h, s);
  return true;
}

export type MelodyGridProps = {
  /** The notes offered (MIDI), low → high; shown high at the top. */
  pitches: number[];
  /** One per slot: a pitch, null = rest, "-" = hold the note before. */
  notes: MelodyNote[];
  onChange: (notes: MelodyNote[]) => void;
  /** do (MIDI) — for solfège labels and the home row. */
  tonic: number;
  labels?: "solfege" | "letters" | "colors" | "none";
  inst?: InstId;
  /** The slot being heard (−1 = stopped). */
  playSlot?: number;
  /** Long notes: press-and-hold, the Hold tool, or drag a note to the right. */
  holds?: boolean;
  /** A syllable under each slot. */
  lyric?: string[];
  /** The notes that fit the chord at a slot — as semitones above do, 0–11 (what song.ts
   *  chordTonesAt gives); they glow softly. */
  fits?: (slot: number) => number[];
  /** Slots in a bar (a stronger line between bars). Default 4. */
  bar?: number;
  /** Slots to point at (a glowing hint). */
  marks?: number[];
  disabled?: boolean;
  size?: "md" | "lg";
};

type Stroke = { id: number; mode: "draw" | "pending" | "stretch" | "hold"; s: number; p: number; h: number; before: MelodyNote[]; moved: boolean; long: boolean; timer?: number };

const isBlackKey = (p: number) => !NATURAL_PC.includes(pcOf(p));

export const MelodyGrid = memo(function MelodyGrid({ pitches, notes, onChange, tonic, labels = "solfege", inst = "bells", playSlot = -1, holds = false, lyric, fits, bar = 4, marks, disabled = false, size = "md" }: MelodyGridProps) {
  const rows = pitches.length;
  const slots = notes.length;
  const lg = size === "lg";
  const rowH = rows <= 3 ? (lg ? 100 : 86) : rows <= 5 ? (lg ? 80 : 68) : rows <= 7 ? (lg ? 62 : 54) : rows <= 9 ? (lg ? 54 : 47) : 42;
  const labelW = labels === "none" ? 26 : labels === "colors" ? 52 : lg ? 84 : 74;
  const textCls = slots <= 6 ? "text-2xl" : slots <= 10 ? "text-xl" : slots <= 13 ? "text-base" : "text-sm";
  const runs = noteRuns(notes);
  const area = useRef<HTMLDivElement>(null);
  const stroke = useRef<Stroke | null>(null);
  const work = useRef<MelodyNote[]>([]);
  const [holdTool, setHoldTool] = useState(false);
  const [ping, setPing] = useState<{ p: number; n: number } | null>(null);
  const [nudge, setNudge] = useState<{ s: number; n: number } | null>(null);

  const pct = (k: number, of: number) => `${(k / of) * 100}%`;
  const rowTop = (p: number) => pct(rows - 1 - pitches.indexOf(p), rows);
  const cellAt = (x: number, y: number, clamp: boolean): { s: number; p: number } | null => {
    const el = area.current;
    if (!el || !rows || !slots) return null;
    const r = el.getBoundingClientRect();
    let fx = (x - r.left) / r.width;
    let fy = (y - r.top) / r.height;
    if (!clamp && (fx < 0 || fx >= 1 || fy < 0 || fy >= 1)) return null;
    fx = Math.min(0.9999, Math.max(0, fx));
    fy = Math.min(0.9999, Math.max(0, fy));
    return { s: Math.floor(fx * slots), p: pitches[rows - 1 - Math.floor(fy * rows)] };
  };
  // The last notes this sent, and the notes they were built on (quick taps build on each other).
  const sent = useRef<{ from: MelodyNote[]; to: MelodyNote[] } | null>(null);
  const latest = (): MelodyNote[] => (sent.current && sent.current.from === notes ? [...sent.current.to] : Array.from({ length: slots }, (_, i) => notes[i] ?? null));
  const commit = (w: MelodyNote[]) => {
    const to = [...w];
    sent.current = { from: notes, to };
    onChange(to);
  };
  const ring = (p: number | null, secs = 0.7) => {
    if (p !== null) playNote(inst, p, secs, 0.85);
  };
  const wiggle = (s: number) => {
    sfx("soft-fail");
    setNudge((x) => ({ s, n: (x?.n ?? 0) + 1 }));
  };
  const longPress = (st: Stroke) => {
    if (stroke.current !== st || st.moved) return;
    st.long = true;
    if (st.before[st.s] === "-") return;
    const w = [...st.before];
    if (holdUntil(w, st.s)) {
      work.current = w;
      commit(w);
      sfx("pop");
      ring(soundingAt(w, st.s), 0.5);
    } else wiggle(st.s);
  };

  const down = (e: RPointerEvent<HTMLDivElement>) => {
    if (disabled || stroke.current) return;
    const hit = cellAt(e.clientX, e.clientY, false);
    if (!hit) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const before = latest();
    const w = [...before];
    const { s, p } = hit;
    const h = headOf(w, s);
    const st: Stroke = { id: e.pointerId, mode: "draw", s, p, h, before, moved: false, long: false };
    stroke.current = st;
    work.current = w;
    if (holds && holdTool) {
      // The Hold tool: tap a slot to stretch the note before it to here; tap a long tail to cut it.
      st.mode = "hold";
      if (w[s] === "-") {
        cutTail(w, s);
        commit(w);
        sfx("tap");
      } else if (holdUntil(w, s)) {
        commit(w);
        sfx("pop");
        ring(soundingAt(w, s), 0.5);
      } else wiggle(s);
      return;
    }
    if (h >= 0 && w[h] === p) st.mode = "pending";
    else {
      putNote(w, s, p);
      commit(w);
      ring(p);
    }
    if (holds) st.timer = window.setTimeout(() => longPress(st), 480);
  };
  const move = (e: RPointerEvent<HTMLDivElement>) => {
    const st = stroke.current;
    if (!st || e.pointerId !== st.id || st.long) return;
    const hit = cellAt(e.clientX, e.clientY, true);
    if (!hit || (hit.s === st.s && hit.p === st.p)) return;
    if (hit.s !== st.s) {
      st.moved = true;
      window.clearTimeout(st.timer);
    }
    if (st.mode === "pending") st.mode = holds && hit.s !== st.s ? "stretch" : "draw";
    if (st.mode === "hold") {
      if (hit.s > st.s) {
        const w = [...st.before];
        if (holdUntil(w, hit.s)) {
          work.current = w;
          commit(w);
        }
      }
      st.s = Math.max(st.s, hit.s);
      st.p = hit.p;
      return;
    }
    if (st.mode === "stretch") {
      const w = [...st.before];
      stretch(w, st.h, Math.max(st.h, hit.s));
      work.current = w;
      commit(w);
      if (hit.s > st.s) sfx("tick", hit.s);
    } else {
      // Drawing: the column gets the note under the finger (a fast swipe fills the columns between).
      const w = work.current;
      const from = pitches.indexOf(st.p);
      const to = pitches.indexOf(hit.p);
      const gap = hit.s - st.s;
      if (Math.abs(gap) > 1 && from >= 0 && to >= 0) {
        const dir = gap > 0 ? 1 : -1;
        for (let q = st.s + dir; q !== hit.s; q += dir) putNote(w, q, pitches[Math.round(from + ((to - from) * (q - st.s)) / gap)]);
      }
      putNote(w, hit.s, hit.p);
      commit(w);
      ring(hit.p, 0.55);
    }
    st.s = hit.s;
    st.p = hit.p;
  };
  const up = (e: RPointerEvent<HTMLDivElement>) => {
    const st = stroke.current;
    if (!st || e.pointerId !== st.id) return;
    window.clearTimeout(st.timer);
    stroke.current = null;
    if (st.mode === "pending" && !st.moved && !st.long) {
      // A tap on a note that's already there: take it away (or, on a long tail, end it here).
      const w = [...st.before];
      if (st.s === st.h) {
        w[st.h] = null;
        cutTail(w, st.h + 1);
      } else cutTail(w, st.s);
      commit(w);
      sfx("tap");
    }
  };

  return (
    <div className="flex w-full flex-col gap-2">
      {holds && (
        <div className="flex items-center justify-end">
          <button
            type="button"
            aria-pressed={holdTool}
            onClick={() => {
              sfx("pick");
              setHoldTool((v) => !v);
            }}
            className={cn("flex h-12 items-center gap-2 rounded-full px-4 font-display text-lg font-extrabold transition-colors", holdTool ? "bg-[var(--l-violet)] text-white shadow-[0_4px_0_var(--l-violet-edge)]" : "bg-white text-[var(--l-ink)] shadow-[0_4px_0_var(--l-line)]")}
          >
            <svg viewBox="0 0 40 20" className="h-5 w-10" aria-hidden>
              <rect x="2" y="4" width="36" height="12" rx="6" fill={holdTool ? "#fff" : "#8b6cff"} opacity={holdTool ? 0.95 : 0.85} />
              <circle cx="9" cy="10" r="6" fill={holdTool ? "#c9b8ff" : "#6b4fe0"} />
            </svg>
            Hold
          </button>
        </div>
      )}
      <div className="flex w-full gap-2">
        {/* The notes: tap one to hear it. */}
        <div className="flex shrink-0 flex-col" style={{ width: labelW }}>
          {[...pitches].reverse().map((p) => {
            const text = noteLabel(p, tonic, labels);
            const home = pcOf(p - tonic) === 0;
            const sounding = playSlot >= 0 && soundingAt(notes, playSlot) === p;
            const pinged = ping?.p === p;
            return (
              <button
                key={p}
                type="button"
                aria-label={`Hear ${text || noteName(p)}`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  ring(p, 0.8);
                  setPing((x) => ({ p, n: (x?.n ?? 0) + 1 }));
                }}
                className="relative flex touch-none select-none p-[3px]"
                style={{ height: rowH }}
              >
                <span
                  key={pinged ? ping?.n : 0}
                  className={cn("relative flex h-full w-full items-center justify-center rounded-[14px] border-[3px] border-[#2a2f45]/70 font-display font-extrabold text-white transition-transform duration-100", pinged && "l-boing", sounding && "scale-110")}
                  style={{ background: noteColor(p), boxShadow: sounding ? `0 0 0 3px #fff, 0 0 18px ${noteColor(p)}` : "inset 0 3px 0 rgba(255,255,255,0.4), 0 3px 0 rgba(0,40,80,0.2)", fontSize: rowH >= 60 ? 24 : rowH >= 48 ? 20 : 17, textShadow: "0 2px 0 rgba(0,0,0,0.28)" }}
                >
                  {text}
                  {home && labels !== "none" && <Home className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full bg-white p-[3px] text-[#d9408f] shadow-[0_2px_0_rgba(0,40,80,0.2)]" strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>

        <div className="min-w-0 flex-1">
          <div
            ref={area}
            role="application"
            aria-label="Note grid: tap a square to put a note there"
            className={cn("relative w-full touch-none select-none overflow-hidden rounded-[18px] bg-white shadow-[inset_0_0_0_2px_#dfe8f1]", disabled && "pointer-events-none")}
            style={{ height: rows * rowH }}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            onLostPointerCapture={up}
          >
            {/* Rows: the home row (do) blushes pink; sharps and flats sit a shade darker. */}
            {pitches.map((p, i) => (
              <div key={p} className="absolute inset-x-0" style={{ top: rowTop(p), height: pct(1, rows), background: pcOf(p - tonic) === 0 ? "#fff1f8" : isBlackKey(p) ? "#eef2f8" : i % 2 ? "#f7fafd" : "#ffffff" }} />
            ))}
            {/* Notes that fit the chord here glow softly. */}
            {fits &&
              Array.from({ length: slots }, (_, s) => {
                const ok = fits(s);
                return pitches.map((p) =>
                  ok.includes(pcOf(p - tonic)) ? <div key={`f${s}:${p}`} className="absolute" style={{ left: pct(s, slots), width: pct(1, slots), top: rowTop(p), height: pct(1, rows), background: `${noteColor(p)}30` }} /> : null,
                );
              })}
            {/* Slot lines (a stronger one between bars). */}
            {Array.from({ length: Math.max(0, slots - 1) }, (_, k) => {
              const strong = (k + 1) % Math.max(1, bar) === 0;
              return <div key={`l${k}`} className="absolute inset-y-0" style={{ left: pct(k + 1, slots), width: strong ? 3 : 1, marginLeft: strong ? -1.5 : -0.5, background: strong ? "#b9c9da" : "#e3ebf3" }} />;
            })}
            {/* The playhead. */}
            {playSlot >= 0 && playSlot < slots && (
              <div className="pointer-events-none absolute inset-y-0 bg-[#ff6fb5]/[0.16]" style={{ left: pct(playSlot, slots), width: pct(1, slots) }}>
                <span className="absolute inset-y-0 left-0 w-[3px] bg-[#ff6fb5]" />
              </div>
            )}
            {/* Hints. */}
            {marks?.map((s) => (
              <div key={`m${s}`} className="l-hint pointer-events-none absolute inset-y-[4px] rounded-[12px]" style={{ left: `calc(${pct(s, slots)} + 4px)`, width: `calc(${pct(1, slots)} - 8px)` }} />
            ))}
            {nudge && nudge.s < slots && <div key={`n${nudge.n}`} className="l-shake pointer-events-none absolute inset-y-0 bg-[#ff7363]/15" style={{ left: pct(nudge.s, slots), width: pct(1, slots) }} />}
            {/* The notes. */}
            {runs.map(({ head, end, p }) => {
              if (!pitches.includes(p)) return null;
              const c = noteColor(p);
              const on = playSlot >= head && playSlot <= end;
              const text = noteLabel(p, tonic, labels);
              return (
                <div key={`${head}:${p}`} className="l-pop-in pointer-events-none absolute p-[3px]" style={{ left: pct(head, slots), width: pct(end - head + 1, slots), top: rowTop(p), height: pct(1, rows) }}>
                  <div
                    className={cn("flex h-full w-full items-center overflow-hidden rounded-[12px] border-[3px] border-[#2a2f45]/75 transition-[transform,box-shadow,filter] duration-100", end > head ? "justify-start pl-2" : "justify-center")}
                    style={{ background: `linear-gradient(180deg, ${c}, ${c} 60%, ${c}cc)`, boxShadow: on ? `0 0 0 3px #fff, 0 0 22px ${c}` : "inset 0 3px 0 rgba(255,255,255,0.45), 0 3px 0 rgba(0,40,80,0.2)", transform: on ? "scale(1.08)" : undefined, filter: on ? "brightness(1.12)" : undefined }}
                  >
                    {text && <span className={cn("font-display font-extrabold leading-none text-white", textCls)} style={{ textShadow: "0 2px 0 rgba(0,0,0,0.3)" }}>{text}</span>}
                    {end > head && <span className="ml-1.5 h-[6px] flex-1 rounded-full bg-white/45" aria-hidden />}
                  </div>
                </div>
              );
            })}
          </div>
          {lyric && lyric.some((x) => x?.trim()) && (
            <div className="mt-1.5 flex w-full">
              {Array.from({ length: slots }, (_, s) => (
                <span key={s} className={cn("min-w-0 flex-1 truncate text-center font-reading font-bold leading-tight transition-[color,transform] duration-100", slots > 12 ? "text-base" : "text-xl", s === playSlot ? "scale-110 text-[#d9408f]" : "text-[var(--l-ink)]")}>
                  {lyric[s] ?? ""}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
