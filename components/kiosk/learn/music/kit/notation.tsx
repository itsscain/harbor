"use client";

import type { CSSProperties, PointerEvent as RPointerEvent, ReactNode } from "react";
import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { Meter, MSymbol, StaffNote } from "@/lib/learn/mus/types";
import { BOTTOM_LINE, FLAT_ORDER, LETTERS, RHYTHM, SHARP_ORDER, barBeats, keyAcc, noteColor, solfege, spell, staffStep, stepToMidi } from "@/lib/learn/mus/theory";

// Music notation, drawn: the staff with its clef, key signature and time signature; notes with
// stems, flags and beams, dots, ledger lines and accidentals; rests; bar lines — and Kodály stick
// notation for the youngest readers. Everything is SVG in "staff units" (one space between lines =
// 10), so it scales to any size. The note that's sounding glows; a tappable staff reports the
// line or space under a finger (writing notes).

export const INK = "#1f2a44";
const SP = 10; // one staff space

// ── Glyphs (paths in staff units, origin noted per glyph) ───────────────────────────────────
/** Treble clef: the spiral curls around the G line (y = 30 when the top line is y = 0). Stroked. */
export const TREBLE = "M11 53 C7 57 15 60 15.5 52 C16 40 15.5 20 17 5 C18 -6 21 -13 19.5 -17 C18 -21 12 -18 12.5 -10 C13 -2 23 3 22.5 11 C22 18 10 19 8.5 27 C7 35 14 39 19 37.5 C25 35.5 25 27 19 25.5 C14 24.5 11.5 28.5 13.5 31.5";
/** Bass clef: the big dot sits on the F line (y = 10). */
export const BASS_CURVE = "M5 10 C5 1 15 -2 20 4 C26 12 20 28 3 38";
export const QUARTER_REST = "M8 2 L17 12.5 C13 16 12.5 20 17.5 24.5 L18.5 25.5 C14 24.5 11 27.5 14.5 33 C8.5 29.5 8.5 24 13.5 23.5 L7.5 17.5 C11.5 14 11.5 9 8 2 Z";
export const EIGHTH_REST_TAIL = "M10 15 C13 17 17 15 19 11 L13 31";
export const FLAT = "M2 -14 L2 6 C6 1 12 1 11 5 C10 9 5 11 2 12 Z";
export const SHARP = "M3 -10 L3 12 M8 -12 L8 10 M-1 -1 L12 -5 M-1 6 L12 2";
export const NATURAL = "M2 -12 L2 6 L10 3 M10 -6 L10 12 M2 -3 L10 -6";

function Head({ x, y, open, color, glow, wide }: { x: number; y: number; open?: boolean; color: string; glow?: boolean; wide?: boolean }) {
  const rx = wide ? 7.2 : 6;
  return (
    <g>
      {glow && <ellipse cx={x} cy={y} rx={rx + 5} ry={9.5} fill={color} opacity={0.28} transform={`rotate(-20 ${x} ${y})`} />}
      <ellipse cx={x} cy={y} rx={rx} ry={4.6} fill={open ? "#fff" : color} stroke={color} strokeWidth={open ? 2.4 : 1} transform={`rotate(-20 ${x} ${y})`} />
    </g>
  );
}
function Accidental({ acc, x, y, color }: { acc: number | "n"; x: number; y: number; color: string }) {
  if (acc === 1) return <path d={SHARP} transform={`translate(${x - 18} ${y})`} stroke={color} strokeWidth={2.2} strokeLinecap="round" fill="none" />;
  if (acc === -1) return <path d={FLAT} transform={`translate(${x - 16} ${y})`} stroke={color} strokeWidth={2.2} fill="none" strokeLinejoin="round" />;
  if (acc === "n") return <path d={NATURAL} transform={`translate(${x - 17} ${y})`} stroke={color} strokeWidth={2.2} fill="none" />;
  return null;
}
export function RestGlyph({ beats, x, mid, color }: { beats: number; x: number; mid: number; color: string }) {
  const b = Math.abs(beats);
  if (b >= 4) return <rect x={x - 7} y={mid - 10} width={14} height={5.5} fill={color} />;
  if (b >= 2) return <rect x={x - 7} y={mid - 5.5} width={14} height={5.5} fill={color} />;
  if (b >= 1) return <path d={QUARTER_REST} transform={`translate(${x - 13} ${mid - 18})`} fill={color} />;
  return (
    <g transform={`translate(${x - 14} ${mid - 16})`}>
      <circle cx={11} cy={14} r={3.4} fill={color} />
      <path d={EIGHTH_REST_TAIL} stroke={color} strokeWidth={2.6} fill="none" strokeLinecap="round" />
      {b < 0.5 && <path d="M8 22 C11 24 15 22 17 18" stroke={color} strokeWidth={2.6} fill="none" strokeLinecap="round" />}
    </g>
  );
}
export function ClefGlyph({ clef, x, top, color = INK }: { clef: "treble" | "bass"; x: number; top: number; color?: string }) {
  if (clef === "treble") return <path d={TREBLE} transform={`translate(${x} ${top})`} stroke={color} strokeWidth={3.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
  return (
    <g transform={`translate(${x} ${top})`}>
      <path d={BASS_CURVE} stroke={color} strokeWidth={3.6} fill="none" strokeLinecap="round" />
      <circle cx={6} cy={10} r={4.3} fill={color} />
      <circle cx={28} cy={5} r={2.6} fill={color} />
      <circle cx={28} cy={15} r={2.6} fill={color} />
    </g>
  );
}

/** A note's letter with its sharp or flat ("F♯" in D major). */
const letterName = (p: number, key: number) => {
  const sp = spell(p, key);
  return LETTERS[sp.letter] + (sp.acc === 1 ? "♯" : sp.acc === -1 ? "♭" : "");
};

// ── Layout ───────────────────────────────────────────────────────────────────────────────────
/** Durations that get a flag/beam: eighths (1 beam), sixteenths (2). */
const beamsFor = (d: number) => (d <= 0.25 + 1e-6 ? 2 : d <= 0.5 + 1e-6 ? 1 : d <= 0.75 + 1e-6 ? 1 : 0);
const isDotted = (d: number) => [0.75, 1.5, 3].some((x) => Math.abs(d - x) < 1e-6);
const isOpen = (d: number) => d >= 2 - 1e-6;

type Placed = { i: number; x: number; steps: number[]; d: number; acc: (number | "n" | null)[]; rest: boolean; mark?: boolean; p: StaffNote["p"] };

/**
 * A staff of notes. Width follows the notes (proportional spacing); the SVG scales to fit. `active`
 * glows the note being played; `onStep` makes the staff tappable (reports the staff step — line or
 * space — under the finger); `ghost` shows a faint note at a step (while placing).
 */
export function Staff({
  notes,
  clef = "treble",
  keySig = 0,
  meter,
  active = -1,
  labels = "none",
  tonic = 60,
  height = 170,
  minWidth = 360,
  color = INK,
  onStep,
  ghostStep,
  placed,
  colored,
  className,
}: {
  notes: StaffNote[];
  clef?: "treble" | "bass";
  keySig?: number;
  meter?: Meter;
  active?: number;
  labels?: "letters" | "solfege" | "none";
  tonic?: number;
  height?: number;
  minWidth?: number;
  color?: string;
  /** Tap mode: called with the staff step under the finger. */
  onStep?: (step: number) => void;
  ghostStep?: number | null;
  /** Steps placed by the child (write mode), drawn as notes after the given ones. */
  placed?: number[];
  /** Color noteheads by pitch (boomwhacker colors). */
  colored?: boolean;
  className?: string;
}) {
  const bottom = BOTTOM_LINE[clef];
  const top = 0; // y of the top line
  const yOf = (step: number) => top + 40 - (step - bottom) * (SP / 2);
  const stepOfY = (y: number) => Math.round(bottom + (top + 40 - y) / (SP / 2));
  const mid = top + 20;
  const midStep = bottom + 4;
  // Header: clef, key signature, time signature.
  let x = 8;
  const header: ReactNode[] = [<ClefGlyph key="clef" clef={clef} x={x} top={clef === "treble" ? top : top} color={color} />];
  x += 36;
  const ks = keySig;
  const kOrder = ks > 0 ? SHARP_ORDER.slice(0, ks) : FLAT_ORDER.slice(0, -ks);
  const KEY_STEPS: Record<string, number[]> = {
    "treble#": [38, 35, 39, 36, 33, 37, 34],
    "trebleb": [34, 37, 33, 36, 32, 35, 31],
    "bass#": [24, 21, 25, 22, 19, 23, 20],
    "bassb": [20, 23, 19, 22, 18, 21, 17],
  };
  kOrder.forEach((_, i) => {
    const st = KEY_STEPS[`${clef}${ks > 0 ? "#" : "b"}`][i];
    header.push(<Accidental key={`k${i}`} acc={ks > 0 ? 1 : -1} x={x + 16} y={yOf(st)} color={color} />);
    x += 10;
  });
  if (kOrder.length) x += 6;
  if (meter) {
    header.push(
      <g key="meter" fontFamily="Georgia, 'Times New Roman', serif" fontWeight={900} fontSize={22} fill={color} textAnchor="middle">
        <text x={x + 9} y={top + 18}>{meter[0]}</text>
        <text x={x + 9} y={top + 38}>{meter[1]}</text>
      </g>,
    );
    x += 26;
  }
  x += 6;
  // Notes, proportionally spaced; bar lines by meter.
  const all: StaffNote[] = [...notes, ...(placed ?? []).map((st) => ({ p: stepToMidi(st) + keyAcc(keySig, ((st % 7) + 7) % 7), d: 1 }))];
  const per = meter ? barBeats(meter) : 0;
  const items: Placed[] = [];
  const bars: number[] = [];
  let beat = 0;
  for (let i = 0; i < all.length; i++) {
    const n = all[i];
    const ps = n.p === null ? [] : Array.isArray(n.p) ? n.p : [n.p];
    const sp = ps.map((p) => spell(p, keySig));
    const steps = sp.map(staffStep);
    const acc = sp.map((s) => (n.acc === "n" ? "n" : n.acc === "#" ? 1 : n.acc === "b" ? -1 : s.acc !== keyAcc(keySig, s.letter) ? (s.acc === 0 ? ("n" as const) : s.acc) : null) as number | "n" | null);
    const w = 22 + 16 * Math.sqrt(Math.max(0.25, n.d)) + (acc.some((a) => a !== null) ? 10 : 0);
    if (acc.some((a) => a !== null)) x += 10;
    items.push({ i, x: x + 8, steps, d: n.d, acc, rest: n.p === null, mark: n.mark, p: n.p });
    x += w - (acc.some((a) => a !== null) ? 10 : 0);
    beat += n.d;
    if (per && Math.abs(beat / per - Math.round(beat / per)) < 1e-6 && i < all.length - 1) {
      bars.push(x - 4);
      x += 8;
    }
  }
  const width = Math.max(minWidth, x + 14);
  // Beam groups: consecutive flagged notes inside the same beat.
  const groups: number[][] = [];
  {
    let cur: number[] = [];
    let t = 0;
    let groupBeat = -1;
    items.forEach((it, k) => {
      const flagged = !it.rest && beamsFor(it.d) > 0 && !isDotted(it.d) && it.steps.length === 1;
      const b = Math.floor(t + 1e-6);
      if (flagged && (cur.length === 0 || b === groupBeat)) {
        cur.push(k);
        groupBeat = b;
      } else {
        if (cur.length) groups.push(cur);
        cur = flagged ? [k] : [];
        groupBeat = b;
      }
      t += it.d;
    });
    if (cur.length) groups.push(cur);
  }
  const inBeam = new Map<number, number[]>();
  for (const g of groups) if (g.length >= 2) for (const k of g) inBeam.set(k, g);

  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const toStep = (e: RPointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const m = svg.getScreenCTM();
    if (!m) return null;
    const p = pt.matrixTransform(m.inverse());
    const st = stepOfY(p.y);
    return Math.max(bottom - 6, Math.min(bottom + 14, st));
  };
  const vbTop = -34;
  const vbH = 108;
  const showGhost = ghostStep ?? hover;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 ${vbTop} ${width} ${vbH}`}
      style={{ height, maxWidth: "100%", touchAction: onStep ? "none" : undefined } as CSSProperties}
      className={cn("overflow-visible", onStep && "cursor-pointer", className)}
      onPointerMove={onStep ? (e) => setHover(toStep(e)) : undefined}
      onPointerLeave={onStep ? () => setHover(null) : undefined}
      onPointerDown={
        onStep
          ? (e) => {
              const st = toStep(e);
              if (st !== null) onStep(st);
            }
          : undefined
      }
      role="img"
      aria-label="Music staff"
    >
      {/* Lines */}
      {[0, 1, 2, 3, 4].map((k) => (
        <line key={k} x1={2} x2={width - 2} y1={top + k * SP} y2={top + k * SP} stroke={color} strokeWidth={1.6} opacity={0.85} />
      ))}
      <line x1={width - 2} x2={width - 2} y1={top} y2={top + 40} stroke={color} strokeWidth={notes.length && meter ? 4 : 1.6} />
      {header}
      {bars.map((bx, k) => (
        <line key={k} x1={bx} x2={bx} y1={top} y2={top + 40} stroke={color} strokeWidth={1.8} />
      ))}
      {/* Hover / ghost note (tap mode). */}
      {onStep && showGhost !== null && showGhost !== undefined && (
        <g opacity={0.45} pointerEvents="none">
          <Ledgers x={width - 50} steps={[showGhost]} bottom={bottom} yOf={yOf} color={color} />
          <Head x={width - 50} y={yOf(showGhost)} color={colored ? noteColor(stepToMidi(showGhost)) : color} />
        </g>
      )}
      {items.map((it, k) => {
        const on = it.i === active;
        const c = on ? "#ff4d8d" : colored && !it.rest ? noteColor(stepToMidi(it.steps[0])) : color;
        if (it.rest) return <g key={k}>{on && <circle cx={it.x} cy={mid} r={16} fill="#ff4d8d" opacity={0.2} />}<RestGlyph beats={it.d} x={it.x} mid={mid} color={c} /></g>;
        const avg = it.steps.reduce((s, v) => s + v, 0) / it.steps.length;
        const up = avg < midStep;
        const hi = Math.max(...it.steps);
        const lo = Math.min(...it.steps);
        const stemX = up ? it.x + 5.6 : it.x - 5.6;
        const beam = inBeam.get(k);
        const stemEnd = up ? yOf(hi) - 34 : yOf(lo) + 34;
        const flags = beamsFor(it.d);
        return (
          <g key={k}>
            {it.mark && <circle cx={it.x} cy={yOf(avg)} r={15} fill="none" stroke="#ff7a3d" strokeWidth={3} strokeDasharray="4 3" />}
            <Ledgers x={it.x} steps={it.steps} bottom={bottom} yOf={yOf} color={color} />
            {it.steps.map((st, j) => (
              <g key={j}>
                {it.acc[j] !== null && <Accidental acc={it.acc[j]!} x={it.x} y={yOf(st)} color={c} />}
                <Head x={it.x} y={yOf(st)} open={isOpen(it.d)} wide={it.d >= 4} color={c} glow={on} />
              </g>
            ))}
            {isDotted(it.d) && <circle cx={it.x + 11} cy={yOf(hi) - ((hi - bottom) % 2 === 0 ? 4 : 0)} r={2.2} fill={c} />}
            {it.d < 4 && <line x1={stemX} x2={stemX} y1={yOf(up ? lo : hi)} y2={beam ? beamY(beam, k, items, up, yOf) : stemEnd} stroke={c} strokeWidth={2} />}
            {!beam && flags > 0 && !isDotted(it.d) && <Flags x={stemX} y={stemEnd} up={up} n={flags} color={c} />}
            {labels !== "none" && typeof it.p === "number" && (
              <text x={it.x} y={top + 64} textAnchor="middle" fontFamily="var(--font-display, system-ui)" fontWeight={800} fontSize={12} fill={c}>
                {labels === "letters" ? letterName(it.p, keySig) : solfege(it.p, tonic, false)}
              </text>
            )}
          </g>
        );
      })}
      {/* Beams */}
      {[...new Set(inBeam.values())].map((g, k) => {
        const first = items[g[0]];
        const last = items[g[g.length - 1]];
        const avg = g.reduce((s, idx) => s + items[idx].steps[0], 0) / g.length;
        const up = avg < midStep;
        const x1 = up ? first.x + 5.6 : first.x - 5.6;
        const x2 = up ? last.x + 5.6 : last.x - 5.6;
        const y1 = beamY(g, g[0], items, up, yOf);
        const y2 = beamY(g, g[g.length - 1], items, up, yOf);
        const isActive = g.some((idx) => items[idx].i === active);
        const c = isActive ? "#ff4d8d" : color;
        const two = g.every((idx) => beamsFor(items[idx].d) === 2);
        return (
          <g key={k}>
            <path d={`M${x1} ${y1} L${x2} ${y2} L${x2} ${y2 + (up ? 5 : -5)} L${x1} ${y1 + (up ? 5 : -5)} Z`} fill={c} />
            {two && <path d={`M${x1} ${y1 + (up ? 9 : -9)} L${x2} ${y2 + (up ? 9 : -9)} L${x2} ${y2 + (up ? 14 : -14)} L${x1} ${y1 + (up ? 14 : -14)} Z`} fill={c} />}
          </g>
        );
      })}
    </svg>
  );
}
function beamY(g: number[], k: number, items: Placed[], up: boolean, yOf: (s: number) => number) {
  const ys = g.map((idx) => yOf(up ? Math.max(...items[idx].steps) : Math.min(...items[idx].steps)));
  const base = up ? Math.min(...ys) - 32 : Math.max(...ys) + 32;
  const firstY = up ? Math.min(base, ys[0] - 26) : Math.max(base, ys[0] + 26);
  const lastY = up ? Math.min(base, ys[ys.length - 1] - 26) : Math.max(base, ys[ys.length - 1] + 26);
  const slope = Math.max(-6, Math.min(6, (lastY - firstY) / 2));
  const pos = g.indexOf(k) / Math.max(1, g.length - 1);
  return base + slope * (pos - 0.5) * 2 * 0.5;
}
function Flags({ x, y, up, n, color }: { x: number; y: number; up: boolean; n: number; color: string }) {
  return (
    <g>
      {Array.from({ length: n }, (_, k) => {
        const yy = up ? y + k * 8 : y - k * 8;
        return <path key={k} d={up ? `M${x} ${yy} C${x + 2} ${yy + 8} ${x + 13} ${yy + 10} ${x + 9} ${yy + 22} C${x + 10} ${yy + 13} ${x + 4} ${yy + 10} ${x} ${yy + 8} Z` : `M${x} ${yy} C${x + 2} ${yy - 8} ${x + 13} ${yy - 10} ${x + 9} ${yy - 22} C${x + 10} ${yy - 13} ${x + 4} ${yy - 10} ${x} ${yy - 8} Z`} fill={color} />;
      })}
    </g>
  );
}
function Ledgers({ x, steps, bottom, yOf, color }: { x: number; steps: number[]; bottom: number; yOf: (s: number) => number; color: string }) {
  const out: number[] = [];
  const hi = Math.max(...steps);
  const lo = Math.min(...steps);
  for (let s = bottom + 10; s <= hi; s += 2) out.push(s);
  for (let s = bottom - 2; s >= lo; s -= 2) out.push(s);
  return (
    <g>
      {out.map((s) => (
        <line key={s} x1={x - 11} x2={x + 11} y1={yOf(s)} y2={yOf(s)} stroke={color} strokeWidth={1.8} />
      ))}
    </g>
  );
}

// ── Rhythm (stick notation, notes on one line, or big shapes for little ones) ────────────────
type RItem = { d: number; syl: string; cell: number };
export function RhythmStrip({
  cells,
  style = "sticks",
  syllables = true,
  active = -1,
  meter,
  height = 120,
  color = INK,
  marks,
  className,
}: {
  cells: string[];
  style?: "sticks" | "notes" | "icons";
  syllables?: boolean;
  /** Index of the note/rest sounding now (counting every note and rest). */
  active?: number;
  meter?: Meter;
  height?: number;
  color?: string;
  /** Per note: good / miss marks after a try. */
  marks?: ("good" | "early" | "late" | "miss" | "extra" | null)[];
  className?: string;
}) {
  const items: RItem[] = [];
  cells.forEach((c, ci) => RHYTHM[c]?.durs.forEach((d, k) => items.push({ d, syl: RHYTHM[c].syl[k], cell: ci })));
  const per = meter ? barBeats(meter) : 0;
  // Positions: a beat is 54 units wide.
  const BEAT = 54;
  const xs: number[] = [];
  const bars: number[] = [];
  let t = 0;
  let x = 18;
  for (const it of items) {
    xs.push(x + Math.min(BEAT, Math.abs(it.d) * BEAT) * 0.28);
    x += Math.max(26, Math.abs(it.d) * BEAT);
    t += Math.abs(it.d);
    if (per && Math.abs(t / per - Math.round(t / per)) < 1e-6 && t < items.reduce((s, v) => s + Math.abs(v.d), 0) - 1e-6) {
      bars.push(x - 4);
      x += 10;
    }
  }
  const width = x + 10;
  const base = 70;
  const groups: number[][] = [];
  {
    // Beam eighths/sixteenths inside each cell (a cell is one beat's worth or less).
    let cur: number[] = [];
    let cell = -1;
    items.forEach((it, k) => {
      const flagged = it.d > 0 && it.d < 1 - 1e-6;
      if (flagged && it.cell === cell) cur.push(k);
      else {
        if (cur.length > 1) groups.push(cur);
        cur = flagged ? [k] : [];
      }
      cell = it.cell;
    });
    if (cur.length > 1) groups.push(cur);
  }
  const beamed = new Set(groups.flat());
  return (
    <svg viewBox={`0 0 ${width} ${style === "icons" ? 110 : 106}`} style={{ height, maxWidth: "100%" }} className={cn("overflow-visible", className)} role="img" aria-label="Rhythm">
      {style === "notes" && <line x1={4} x2={width - 4} y1={base} y2={base} stroke={color} strokeWidth={1.6} opacity={0.7} />}
      {bars.map((bx, k) => (
        <line key={k} x1={bx} x2={bx} y1={base - 34} y2={base + 6} stroke={color} strokeWidth={2} opacity={0.6} />
      ))}
      {items.map((it, k) => {
        const on = k === active;
        const mk = marks?.[k];
        const c = on ? "#ff4d8d" : mk === "miss" ? "#df5444" : mk === "early" || mk === "late" ? "#e0a21a" : mk === "good" ? "#25a552" : color;
        const cx = xs[k];
        let glyph: ReactNode;
        if (style === "icons") {
          const w = Math.max(18, Math.abs(it.d) * BEAT - 12);
          glyph =
            it.d < 0 ? (
              <g>
                <text x={cx + w / 2 - 10} y={base - 6} fontSize={30} fontFamily="var(--font-display, system-ui)" fontWeight={900} fill={c} opacity={0.6} textAnchor="middle">z</text>
              </g>
            ) : (
              <rect x={cx - 10} y={base - 30 - (it.d < 1 ? -6 : 0)} width={it.d >= 2 ? w + 10 : Math.min(30, w)} height={it.d < 1 ? 22 : 30} rx={it.d < 1 ? 11 : 15} fill={c} opacity={on ? 1 : 0.9} />
            );
        } else if (it.d < 0) {
          glyph = style === "sticks" && Math.abs(it.d) === 1 ? <path d={QUARTER_REST} transform={`translate(${cx - 13} ${base - 34})`} fill={c} /> : <RestGlyph beats={it.d} x={cx} mid={base - 16} color={c} />;
        } else {
          const stemTop = base - 44;
          const headY = base - 4;
          const showHead = style === "notes" || it.d >= 2 - 1e-6;
          glyph = (
            <g>
              {on && <circle cx={cx} cy={base - 22} r={20} fill="#ff4d8d" opacity={0.16} />}
              {showHead && <ellipse cx={cx - 5} cy={headY} rx={6.5} ry={5} fill={it.d >= 2 ? "#fff" : c} stroke={c} strokeWidth={2.4} transform={`rotate(-20 ${cx - 5} ${headY})`} />}
              {it.d < 4 && <line x1={showHead ? cx + 1 : cx} x2={showHead ? cx + 1 : cx} y1={showHead ? headY - 2 : base} y2={stemTop} stroke={c} strokeWidth={style === "sticks" ? 3.4 : 2.2} strokeLinecap="round" />}
              {isDotted(it.d) && <circle cx={cx + 10} cy={headY} r={2.6} fill={c} />}
              {!beamed.has(k) && it.d < 1 - 1e-6 && <Flags x={showHead ? cx + 1 : cx} y={stemTop} up n={beamsFor(it.d)} color={c} />}
            </g>
          );
        }
        return (
          <g key={k}>
            {glyph}
            {syllables && (
              <text x={cx} y={base + 26} textAnchor="middle" fontFamily="var(--font-display, system-ui)" fontWeight={800} fontSize={15} fill={c} opacity={it.d < 0 ? 0.7 : 1}>
                {it.syl}
              </text>
            )}
          </g>
        );
      })}
      {groups.map((g, k) => {
        const x1 = xs[g[0]] + (style === "notes" ? 1 : 0);
        const x2 = xs[g[g.length - 1]] + (style === "notes" ? 1 : 0);
        const on = g.includes(active);
        const c = on ? "#ff4d8d" : color;
        const two = g.every((idx) => items[idx].d <= 0.25 + 1e-6);
        const y = base - 44;
        return (
          <g key={k}>
            <rect x={x1 - 1.5} y={y - 1} width={x2 - x1 + 3} height={6} fill={c} />
            {two && <rect x={x1 - 1.5} y={y + 8} width={x2 - x1 + 3} height={6} fill={c} />}
            {!two && g.some((idx) => items[idx].d <= 0.25 + 1e-6) && g.map((idx, j) => (items[idx].d <= 0.25 + 1e-6 ? <rect key={j} x={xs[idx] - (j === g.length - 1 ? 12 : 0)} y={y + 8} width={12} height={6} fill={c} /> : null))}
          </g>
        );
      })}
    </svg>
  );
}

/** One big music symbol. */
export function SymbolView({ sym, size = 120, color = INK }: { sym: MSymbol; size?: number; color?: string }) {
  const box = (children: ReactNode, vb = "-10 -26 60 92") => (
    <svg viewBox={vb} style={{ width: size, height: size }} role="img" aria-label={sym}>
      {children}
    </svg>
  );
  const head = (open: boolean, x = 18, y = 40) => <ellipse cx={x} cy={y} rx={7} ry={5.3} fill={open ? "#fff" : color} stroke={color} strokeWidth={2.6} transform={`rotate(-20 ${x} ${y})`} />;
  const stem = (x = 24.5, y1 = 39, y2 = 2) => <line x1={x} x2={x} y1={y1} y2={y2} stroke={color} strokeWidth={2.6} />;
  switch (sym) {
    case "treble":
      return box(<ClefGlyph clef="treble" x={4} top={6} color={color} />);
    case "bass":
      return box(<ClefGlyph clef="bass" x={0} top={8} color={color} />, "-6 -8 46 60");
    case "whole":
      return box(<ellipse cx={20} cy={30} rx={10} ry={6.5} fill="#fff" stroke={color} strokeWidth={4} transform="rotate(-20 20 30)" />, "0 10 40 40");
    case "half":
      return box(<>{head(true)}{stem()}</>);
    case "quarter":
      return box(<>{head(false)}{stem()}</>);
    case "dotted-half":
      return box(<>{head(true)}{stem()}<circle cx={33} cy={40} r={3} fill={color} /></>);
    case "dotted-quarter":
      return box(<>{head(false)}{stem()}<circle cx={33} cy={40} r={3} fill={color} /></>);
    case "eighth":
      return box(<>{head(false)}{stem()}<Flags x={24.5} y={2} up n={1} color={color} /></>);
    case "eighths":
      return box(<>{head(false, 8)}{stem(14.5)}{head(false, 32)}{stem(38.5)}<rect x={13} y={1} width={27} height={6} fill={color} /></>, "-6 -26 60 92");
    case "sixteenths":
      return box(<>{head(false, 8)}{stem(14.5)}{head(false, 32)}{stem(38.5)}<rect x={13} y={1} width={27} height={6} fill={color} /><rect x={13} y={10} width={27} height={6} fill={color} /></>, "-6 -26 60 92");
    case "quarter-rest":
      return box(<path d={QUARTER_REST} transform="translate(6 8) scale(1.3)" fill={color} />, "0 0 40 60");
    case "half-rest":
      return box(<><line x1={4} x2={36} y1={30} y2={30} stroke={color} strokeWidth={2} /><rect x={11} y={23} width={18} height={7} fill={color} /></>, "0 10 40 30");
    case "whole-rest":
      return box(<><line x1={4} x2={36} y1={20} y2={20} stroke={color} strokeWidth={2} /><rect x={11} y={20} width={18} height={7} fill={color} /></>, "0 10 40 30");
    case "eighth-rest":
      return box(<RestGlyph beats={0.5} x={22} mid={30} color={color} />, "0 0 40 60");
    case "sharp":
      return box(<path d={SHARP} transform="translate(16 30) scale(1.4)" stroke={color} strokeWidth={2.4} fill="none" strokeLinecap="round" />, "0 0 40 60");
    case "flat":
      return box(<path d={FLAT} transform="translate(14 32) scale(1.5)" stroke={color} strokeWidth={2.4} fill="none" />, "0 0 40 60");
    case "natural":
      return box(<path d={NATURAL} transform="translate(13 30) scale(1.4)" stroke={color} strokeWidth={2.4} fill="none" />, "0 0 40 60");
    case "fermata":
      return box(<><path d="M4 34 A16 16 0 0 1 36 34" stroke={color} strokeWidth={4} fill="none" strokeLinecap="round" /><circle cx={20} cy={30} r={3.4} fill={color} /></>, "0 10 40 30");
    case "repeat":
      return box(<><rect x={30} y={0} width={5} height={40} fill={color} /><line x1={24} x2={24} y1={0} y2={40} stroke={color} strokeWidth={2} /><circle cx={16} cy={15} r={3} fill={color} /><circle cx={16} cy={25} r={3} fill={color} /></>, "0 -5 40 50");
    case "barline":
      return box(<><line x1={0} x2={40} y1={0} y2={0} stroke={color} strokeWidth={1.5} /><line x1={0} x2={40} y1={40} y2={40} stroke={color} strokeWidth={1.5} /><line x1={20} x2={20} y1={0} y2={40} stroke={color} strokeWidth={3} /></>, "0 -5 40 50");
    case "double-bar":
      return box(<><line x1={16} x2={16} y1={0} y2={40} stroke={color} strokeWidth={2} /><rect x={22} y={0} width={5} height={40} fill={color} /></>, "0 -5 40 50");
    case "tie":
      return box(<><ellipse cx={8} cy={28} rx={6} ry={4.5} fill={color} /><ellipse cx={32} cy={28} rx={6} ry={4.5} fill={color} /><path d="M9 20 Q20 10 31 20" stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" /></>, "0 0 40 40");
    case "accent":
      return box(<path d="M6 12 L34 20 L6 28" stroke={color} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />, "0 0 40 40");
    case "staccato":
      return box(<>{head(false, 18, 30)}<circle cx={18} cy={14} r={3.4} fill={color} /></>, "0 0 40 44");
    case "staff":
      return box(<>{[0, 1, 2, 3, 4].map((k) => <line key={k} x1={0} x2={60} y1={k * 10} y2={k * 10} stroke={color} strokeWidth={2} />)}</>, "-4 -10 68 60");
    case "time44":
    case "time34":
    case "time24":
    case "time68": {
      const [a, b] = sym === "time44" ? [4, 4] : sym === "time34" ? [3, 4] : sym === "time24" ? [2, 4] : [6, 8];
      return <TimeSigBig meter={[a, b]} size={size} color={color} />;
    }
  }
}
export function TimeSigBig({ meter, size = 110, color = INK }: { meter: Meter; size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 40 56" style={{ width: size * 0.72, height: size }} role="img" aria-label={`${meter[0]} ${meter[1]} time`}>
      {[0, 1, 2, 3, 4].map((k) => (
        <line key={k} x1={0} x2={40} y1={8 + k * 10} y2={8 + k * 10} stroke={color} strokeWidth={1.2} opacity={0.5} />
      ))}
      <g fontFamily="Georgia, 'Times New Roman', serif" fontWeight={900} fontSize={23} fill={color} textAnchor="middle">
        <text x={20} y={26}>{meter[0]}</text>
        <text x={20} y={46}>{meter[1]}</text>
      </g>
    </svg>
  );
}
