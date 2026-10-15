"use client";

import { useId, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import { Play, Square, VolumeX } from "lucide-react";
import { cn } from "@/lib/cn";
import type { DrumId, InstId } from "@/lib/learn/mus/types";
import { LETTERS, NATURAL_PC, noteColor, pcOf, solfege, spell } from "@/lib/learn/mus/theory";
import { soundName } from "@/lib/learn/mus/catalog";
import { musicAudible, playDrum, playNote } from "@/lib/learn/mus/synth";
import { artUrl } from "../../art/pen";
import { instArt } from "../art/instruments";
import { Glyph } from "../../art/Glyph";

// The music kit: the big play button, a drum to tap, a piano you can glide across with several
// fingers, colored bells, the solfège ladder, pulsing beats and instrument pictures. Pads play
// their own sound the instant a finger lands (no waiting for the finger to lift).

// ── Play button ──────────────────────────────────────────────────────────────────────────────
export function PlayButton({ playing, onClick, size = 96, label, tone = "pink", className, pulse }: { playing: boolean; onClick: () => void; size?: number; label?: string; tone?: "pink" | "blue" | "green" | "violet"; className?: string; pulse?: boolean }) {
  const bg = { pink: ["#ff6fb5", "#d9408f"], blue: ["#1cb0f6", "#1491cf"], green: ["#3ccf6e", "#25a552"], violet: ["#8b6cff", "#6b4fe0"] }[tone];
  return (
    <button
      type="button"
      aria-label={playing ? "Stop" : (label ?? "Play")}
      onClick={onClick}
      className={cn("relative flex shrink-0 items-center justify-center rounded-full text-white transition-transform active:translate-y-1", pulse && !playing && "l-pulse", className)}
      style={{ width: size, height: size, background: `radial-gradient(circle at 35% 30%, ${bg[0]}, ${bg[1]})`, boxShadow: `0 ${size * 0.07}px 0 ${bg[1]}, 0 ${size * 0.12}px ${size * 0.25}px rgba(120,20,80,0.25)` }}
    >
      {playing && <span className="l-hear-ring pointer-events-none absolute inset-0 rounded-full" aria-hidden />}
      {playing ? (
        <span className="flex items-end gap-[6%]" style={{ height: size * 0.34 }} aria-hidden>
          {[0, 1, 2, 3].map((k) => (
            <span key={k} className="m-eq w-[7%] min-w-[5px] rounded-full bg-white" style={{ animationDelay: `${k * 0.13}s`, height: "100%" }} />
          ))}
        </span>
      ) : (
        <Play style={{ width: size * 0.42, height: size * 0.42, marginLeft: size * 0.06 }} fill="currentColor" strokeWidth={0} />
      )}
      {label && <span className="pointer-events-none absolute -bottom-8 whitespace-nowrap font-display text-lg font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.3)]">{label}</span>}
    </button>
  );
}
/** A small round play/stop for an answer (it sits BESIDE the answer, never on it). */
export function MiniPlay({ playing, onClick, size = 60 }: { playing: boolean; onClick: () => void; size?: number }) {
  return (
    <button
      type="button"
      aria-label={playing ? "Stop" : "Play this one"}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn("relative flex shrink-0 items-center justify-center rounded-full text-white transition-transform active:translate-y-1", playing ? "bg-[#d9408f] shadow-[0_5px_0_#a8306e]" : "bg-[#ff6fb5] shadow-[0_5px_0_#d9408f]")}
      style={{ width: size, height: size }}
    >
      {playing && <span className="l-hear-ring pointer-events-none absolute inset-0 rounded-full" aria-hidden />}
      {playing ? <Square style={{ width: size * 0.34, height: size * 0.34 }} fill="currentColor" strokeWidth={0} /> : <Play style={{ width: size * 0.4, height: size * 0.4, marginLeft: size * 0.05 }} fill="currentColor" strokeWidth={0} />}
    </button>
  );
}

/** Shown in music activities when the wall's sound is off. */
export function SoundOffNote() {
  if (musicAudible()) return null;
  return (
    <div className="flex items-center gap-2 rounded-full bg-white/95 px-4 py-1.5 font-display text-base font-extrabold text-[var(--l-coral-edge)] shadow-[0_3px_0_rgba(0,40,80,0.15)]">
      <VolumeX className="h-5 w-5" strokeWidth={2.6} /> Sound is off — ask a grown-up to turn it on for Music.
    </div>
  );
}

// ── Drum ─────────────────────────────────────────────────────────────────────────────────────
/** A big drum to tap. Plays `drum` the moment a finger lands and reports the tap (with its event,
 *  for exact timing). `glow` pulses it (the beat scaffold). */
export function DrumPad({ drum = "bongo", onHit, size = 220, disabled, glow, color = "#ff7363", label }: { drum?: DrumId; onHit?: (e: RPointerEvent<HTMLButtonElement>) => void; size?: number; disabled?: boolean; glow?: boolean; color?: string; label?: string }) {
  const [hit, setHit] = useState(0);
  const uid = useId().replace(/:/g, "");
  return (
    <button
      type="button"
      aria-label={label ?? "Tap the drum"}
      disabled={disabled}
      onPointerDown={(e) => {
        if (disabled) return;
        playDrum(drum, 0.95);
        setHit((h) => h + 1);
        onHit?.(e);
      }}
      className={cn("relative shrink-0 touch-none select-none rounded-full transition-[filter,opacity]", disabled && "opacity-60 saturate-50")}
      style={{ width: size, height: size * 0.92 }}
    >
      {glow && <span className="m-beat-glow pointer-events-none absolute inset-[-6%] rounded-full" aria-hidden />}
      <svg key={hit} viewBox="0 0 200 184" className={cn("h-full w-full drop-shadow-[0_10px_8px_rgba(0,40,80,0.25)]", hit > 0 && "m-drum-hit")} aria-hidden>
        <defs>
          <linearGradient id={`${uid}s`} x1="0" x2="1">
            <stop offset="0" stopColor={color} />
            <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.28" />
            <stop offset="1" stopColor={color} />
          </linearGradient>
          <radialGradient id={`${uid}h`} cx="0.4" cy="0.35" r="0.75">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#e9eef5" />
          </radialGradient>
        </defs>
        <path d="M20 62 L20 132 Q100 186 180 132 L180 62 Z" fill={color} stroke="#2a2f45" strokeWidth="5" strokeLinejoin="round" />
        <path d="M20 62 L20 132 Q100 186 180 132 L180 62 Z" fill={`url(#${uid}s)`} opacity="0.5" />
        {[40, 70, 100, 130, 160].map((x) => (
          <path key={x} d={`M${x} ${x === 100 ? 100 : 92} L${x === 100 ? 100 : x < 100 ? x + 8 : x - 8} ${x === 100 ? 158 : 150}`} stroke="#ffd25a" strokeWidth="5" strokeLinecap="round" />
        ))}
        <ellipse cx="100" cy="62" rx="80" ry="34" fill={`url(#${uid}h)`} stroke="#2a2f45" strokeWidth="5" />
        <ellipse cx="78" cy="52" rx="26" ry="9" fill="#ffffff" opacity="0.9" />
        <path d="M24 74 Q100 112 176 74" stroke="#2a2f45" strokeWidth="4" fill="none" opacity="0.35" />
      </svg>
      {hit > 0 && <span key={`r${hit}`} className="m-ripple pointer-events-none absolute left-1/2 top-[34%] h-[40%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-[6px] border-white/80" aria-hidden />}
    </button>
  );
}

// ── Piano keyboard ───────────────────────────────────────────────────────────────────────────
const isBlack = (m: number) => !NATURAL_PC.includes(pcOf(m));
/**
 * A piano from `lo` to `hi`. Several fingers at once; slide a finger to glide (glissando). Each key
 * plays as it's pressed. `lit` keys glow in their note color (a hint or what's playing), `held`
 * keys look pressed (a chord being built), `marks` label keys.
 */
export function Keyboard({
  lo,
  hi,
  onPress,
  inst = "piano",
  lit = [],
  held = [],
  labels = "none",
  tonic = 60,
  marks,
  height = 220,
  disabled,
  wrong = [],
  className,
}: {
  lo: number;
  hi: number;
  onPress?: (midi: number) => void;
  inst?: InstId;
  lit?: number[];
  held?: number[];
  labels?: "letters" | "solfege" | "none";
  tonic?: number;
  marks?: Record<number, string>;
  height?: number;
  disabled?: boolean;
  wrong?: number[];
  className?: string;
}) {
  const whites: number[] = [];
  for (let m = lo; m <= hi; m++) if (!isBlack(m)) whites.push(m);
  const W = 100 / whites.length;
  const ref = useRef<HTMLDivElement>(null);
  const fingers = useRef(new Map<number, number>());
  const [down, setDown] = useState<number[]>([]);
  const keyAt = (x: number, y: number): number | null => {
    const el = ref.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const fx = (x - r.left) / r.width;
    const fy = (y - r.top) / r.height;
    if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return null;
    const wi = Math.min(whites.length - 1, Math.floor(fx * whites.length));
    if (fy < 0.62) {
      // Black keys sit over the boundary between whites.
      for (const m of [whites[wi] + 1, whites[wi] - 1]) {
        if (m < lo || m > hi || !isBlack(m)) continue;
        const left = m > whites[wi] ? (wi + 1) * W : wi * W;
        const cx = left / 100;
        if (Math.abs(fx - cx) < (W * 0.32) / 100) return m;
      }
    }
    return whites[wi];
  };
  const press = (id: number, m: number | null) => {
    const prev = fingers.current.get(id);
    if (m === prev) return;
    if (m === null) {
      fingers.current.delete(id);
    } else {
      fingers.current.set(id, m);
      playNote(inst, m, 0.9, 0.85);
      onPress?.(m);
    }
    setDown([...fingers.current.values()]);
  };
  const label = (m: number) => (marks?.[m] ? marks[m] : labels === "letters" ? LETTERS[spell(m).letter] + (isBlack(m) ? "♯" : "") : labels === "solfege" ? solfege(m, tonic, false) : "");
  return (
    <div
      ref={ref}
      className={cn("relative w-full touch-none select-none overflow-hidden rounded-b-[18px] rounded-t-[8px] bg-[#2a2f45] p-1.5 pt-2 shadow-[0_8px_0_rgba(0,40,80,0.25)]", disabled && "pointer-events-none opacity-60", className)}
      style={{ height }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        press(e.pointerId, keyAt(e.clientX, e.clientY));
      }}
      onPointerMove={(e) => {
        if (fingers.current.has(e.pointerId)) press(e.pointerId, keyAt(e.clientX, e.clientY));
      }}
      onPointerUp={(e) => press(e.pointerId, null)}
      onPointerCancel={(e) => press(e.pointerId, null)}
      role="group"
      aria-label="Piano keyboard"
    >
      <div className="relative h-full w-full">
        {whites.map((m, i) => {
          const on = down.includes(m) || held.includes(m);
          const glow = lit.includes(m);
          const bad = wrong.includes(m);
          return (
            <div
              key={m}
              className={cn("absolute bottom-0 top-0 rounded-b-[12px] border-x border-[#2a2f45]/30 transition-[transform,background] duration-75", on ? "translate-y-[2px]" : "")}
              style={{ left: `${i * W}%`, width: `${W}%`, background: bad ? "#ffd2cd" : on ? "#d9e9ff" : glow ? `linear-gradient(180deg,#fff 40%, ${noteColor(m)}aa)` : "linear-gradient(180deg,#fff 70%,#e8eef6)", boxShadow: on ? "inset 0 -3px 0 #b9c9e2" : "inset 0 -7px 0 #cfd9e6" }}
            >
              {glow && <span className="m-key-glow absolute inset-x-[18%] bottom-[14%] top-[66%] rounded-full" style={{ background: noteColor(m) }} />}
              {label(m) && <span className="absolute inset-x-0 bottom-[6%] text-center font-display text-[min(2.2vw,20px)] font-extrabold" style={{ color: glow ? "#fff" : "#2a2f45", textShadow: glow ? "0 1px 2px rgba(0,0,0,0.4)" : undefined }}>{label(m)}</span>}
            </div>
          );
        })}
        {whites.map((m, i) => {
          const b = m + 1;
          if (b > hi || !isBlack(b)) return null;
          const on = down.includes(b) || held.includes(b);
          const glow = lit.includes(b);
          const bad = wrong.includes(b);
          return (
            <div
              key={b}
              className="absolute top-0 z-[2] rounded-b-[8px] transition-transform duration-75"
              style={{ left: `${(i + 1) * W - W * 0.31}%`, width: `${W * 0.62}%`, height: "60%", background: bad ? "#ff8a7a" : glow ? noteColor(b) : on ? "#4a5578" : "linear-gradient(180deg,#3b4466,#1d2236)", boxShadow: on ? "inset 0 -2px 0 rgba(255,255,255,0.15)" : "inset 0 -6px 0 rgba(255,255,255,0.12), 0 3px 0 rgba(0,0,0,0.25)", transform: on ? "translateY(2px)" : undefined }}
            >
              {label(b) && labels !== "letters" && <span className="absolute inset-x-0 bottom-[8%] text-center font-display text-[min(1.6vw,14px)] font-extrabold text-white">{label(b)}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Bells ────────────────────────────────────────────────────────────────────────────────────
/** Colored bells, low (big) to high (small). Each rings as it's tapped. */
export function Bells({ pitches, onPress, inst = "bells", labels = "solfege", tonic = 60, lit = [], height = 240, disabled, wrong = [], className }: { pitches: number[]; onPress?: (m: number) => void; inst?: InstId; labels?: "solfege" | "letters" | "colors" | "none"; tonic?: number; lit?: number[]; height?: number; disabled?: boolean; wrong?: number[]; className?: string }) {
  const [ring, setRing] = useState<{ m: number; k: number } | null>(null);
  const n = pitches.length;
  return (
    <div className={cn("flex w-full items-end justify-center gap-[1.6%] touch-none select-none", disabled && "pointer-events-none opacity-60", className)} style={{ height }} role="group" aria-label="Bells">
      {pitches.map((m, i) => {
        const h = 100 - (i / Math.max(1, n - 1)) * 34;
        const on = ring?.m === m;
        const glow = lit.includes(m);
        const bad = wrong.includes(m);
        const c = noteColor(m);
        const text = labels === "solfege" ? solfege(m, tonic, false) : labels === "letters" ? LETTERS[spell(m).letter] + (isBlack(m) ? "♯" : "") : "";
        return (
          <button
            key={m}
            type="button"
            aria-label={text || `Bell ${i + 1}`}
            onPointerDown={(e) => {
              e.preventDefault();
              playNote(inst, m, 1.2, 0.9);
              setRing((r) => ({ m, k: (r?.k ?? 0) + 1 }));
              onPress?.(m);
            }}
            className={cn("relative flex min-w-0 flex-1 flex-col items-center justify-end rounded-[22px] pb-3 transition-transform duration-75", on && "translate-y-1", glow && "m-bell-glow")}
            style={{ height: `${h}%`, maxWidth: 120, background: bad ? "#ffd2cd" : `linear-gradient(180deg, ${c}, ${c}cc 60%, ${c})`, boxShadow: `inset 0 6px 0 rgba(255,255,255,0.45), inset 0 -10px 0 rgba(0,0,0,0.14), 0 6px 0 rgba(0,40,80,0.25)`, border: "3px solid #2a2f45" } as CSSProperties}
          >
            <span className="absolute left-1/2 top-[10%] h-[9%] w-[22%] -translate-x-1/2 rounded-full bg-white/60" aria-hidden />
            <span className="absolute left-1/2 top-[45%] h-[12%] w-[12%] -translate-x-1/2 rounded-full border-[3px] border-[#2a2f45]/40 bg-white/30" aria-hidden />
            {on && <span key={ring?.k} className="m-ripple pointer-events-none absolute inset-[-8%] rounded-[26px] border-[5px] border-white/80" aria-hidden />}
            {text && <span className="relative font-display text-[min(3.4vw,30px)] font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.3)]">{text}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ── Solfège ladder ───────────────────────────────────────────────────────────────────────────
export function Ladder({ tonic, steps, lit = [], active = null, height = 260, onPress }: { tonic: number; steps: number[]; lit?: number[]; active?: number | null; height?: number; onPress?: (semis: number) => void }) {
  const all = [...new Set(steps)].sort((a, b) => a - b);
  const lo = Math.min(...all, 0);
  const hi = Math.max(...all, 12);
  return (
    <div className="relative flex w-[min(100%,320px)] flex-col-reverse justify-between" style={{ height }} role="img" aria-label="Solfège ladder">
      {Array.from({ length: hi - lo + 1 }, (_, k) => lo + k)
        .filter((s) => all.includes(s))
        .map((s) => {
          const on = active === s;
          const glow = lit.includes(s);
          const c = noteColor(tonic + s);
          return (
            <button
              key={s}
              type="button"
              disabled={!onPress}
              onPointerDown={() => onPress?.(s)}
              className={cn("relative mx-auto flex h-[15%] min-h-[34px] items-center justify-center rounded-[14px] font-display text-2xl font-extrabold text-white transition-transform", on && "scale-110")}
              style={{ width: `${62 + ((s - lo) / Math.max(1, hi - lo)) * 30}%`, background: glow || on ? c : `${c}88`, boxShadow: on ? `0 0 0 4px #fff, 0 0 24px ${c}` : "0 4px 0 rgba(0,40,80,0.2)", border: "3px solid #2a2f45" }}
            >
              {solfege(tonic + s, tonic)}
            </button>
          );
        })}
    </div>
  );
}

// ── Beats ────────────────────────────────────────────────────────────────────────────────────
export function BeatDots({ n, beat, accent = [], icon, size = 64 }: { n: number; beat?: number | null; accent?: number[]; icon?: string; size?: number }) {
  const cur = beat !== null && beat !== undefined && beat >= 0 ? Math.floor(beat + 1e-6) % n : -1;
  return (
    <div className="flex items-center justify-center gap-3" role="img" aria-label={`${n} beats`}>
      {Array.from({ length: n }, (_, k) => {
        const on = k === cur;
        const big = accent.includes(k);
        const s = size * (big ? 1.18 : 1);
        return (
          <span key={k} className={cn("flex items-center justify-center transition-transform duration-100", on && "scale-125")} style={{ width: s, height: s }}>
            {icon ? (
              <Glyph e={icon} size={s} className={cn("transition-[filter] duration-100", !on && "opacity-80 saturate-[0.7]")} />
            ) : (
              <span className="block h-full w-full rounded-full border-[4px] border-[#2a2f45]" style={{ background: on ? "#ff4d8d" : big ? "#ffc0dc" : "#ffe3f0" }} />
            )}
          </span>
        );
      })}
    </div>
  );
}

// ── Instrument pictures ──────────────────────────────────────────────────────────────────────
const FALLBACK: Record<string, string> = { piano: "🎹", guitar: "🎸", violin: "🎻", trumpet: "🎺", kick: "🥁", snare: "🥁", bells: "🔔", synth: "🎛️", choir: "🎤", horn: "📯" };
export function InstrumentPic({ id, size = 96, className, label }: { id: InstId | DrumId | string; size?: number; className?: string; label?: boolean }) {
  const art = instArt(id);
  const pic = art ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={artUrl(art)} alt="" draggable={false} className={cn("pointer-events-none select-none", className)} style={{ width: size, height: size }} />
  ) : (
    <Glyph e={FALLBACK[id] ?? "🎵"} size={size} className={className} />
  );
  if (!label) return pic;
  let name = id as string;
  try {
    name = soundName(id as InstId);
  } catch {
    /* extras have no catalog name */
  }
  return (
    <span className="inline-flex flex-col items-center gap-1">
      {pic}
      <span className="font-display text-base font-extrabold text-[var(--l-ink)]">{name}</span>
    </span>
  );
}

/** A labeled row of pictures/badges. */
export function Row({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-center justify-center gap-4", className)}>{children}</div>;
}
