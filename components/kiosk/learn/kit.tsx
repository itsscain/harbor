"use client";

import { useCallback, useEffect, useRef, useState, type ComponentProps, type CSSProperties, type ReactNode } from "react";
import { Volume2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { say, type Part } from "@/lib/learn/audio";
import { sfx } from "@/lib/learn/sfx";

// Harbor Learn's building blocks: chunky press-down tiles, the replay-the-voice button, star
// bursts, and a pointer-based drag that works with a five-year-old's finger.

export type Tone = "white" | "blue" | "green" | "coral" | "gold" | "violet" | "teal" | "orange" | "ghost";

const TONES: Record<Tone, { f: string; e: string; text: string }> = {
  white: { f: "var(--l-card)", e: "var(--l-line)", text: "var(--l-ink)" },
  blue: { f: "var(--l-blue)", e: "var(--l-blue-edge)", text: "#fff" },
  green: { f: "var(--l-green)", e: "var(--l-green-edge)", text: "#fff" },
  coral: { f: "var(--l-coral)", e: "var(--l-coral-edge)", text: "#fff" },
  gold: { f: "var(--l-gold)", e: "var(--l-gold-edge)", text: "#5a3b00" },
  violet: { f: "var(--l-violet)", e: "var(--l-violet-edge)", text: "#fff" },
  teal: { f: "var(--l-teal)", e: "var(--l-teal-edge)", text: "#fff" },
  orange: { f: "var(--l-orange)", e: "var(--l-orange-edge)", text: "#fff" },
  ghost: { f: "rgba(255,255,255,0.22)", e: "rgba(0,40,80,0.18)", text: "#fff" },
};

export function toneStyle(tone: Tone, extra?: CSSProperties): CSSProperties {
  const t = TONES[tone];
  return { "--f": t.f, "--e": t.e, color: t.text, ...extra } as CSSProperties;
}

/** A chunky tile/button that presses down under the finger. */
export function Chunk({
  tone = "white",
  className,
  style,
  children,
  ...rest
}: ComponentProps<"button"> & { tone?: Tone }) {
  return (
    <button type="button" className={cn("l-chunk", className)} style={toneStyle(tone, style)} {...rest}>
      {children}
    </button>
  );
}

/** The round "hear it again" button. */
export function SpeakerButton({ parts, className, size = 56 }: { parts: Part[] | null; className?: string; size?: number }) {
  return (
    <Chunk
      tone="blue"
      aria-label="Hear it again"
      className={cn("flex shrink-0 items-center justify-center rounded-full", className)}
      style={{ width: size, height: size, borderRadius: 999 }}
      onClick={() => {
        sfx("tap");
        if (parts?.length) void say(parts);
      }}
    >
      <Volume2 style={{ width: size * 0.48, height: size * 0.48 }} strokeWidth={2.6} />
    </Chunk>
  );
}

// ── Bursts: stars and sparkles that fly out of a right answer ────────────────────────────
type Burst = { id: number; x: number; y: number; bits: { e: string; dx: number; dy: number; r: number; s: number; d: number }[] };
const BURST_BITS = {
  star: ["⭐", "✨", "🌟", "💫"],
  sea: ["💧", "✨", "⭐", "🐚"],
  heart: ["💖", "✨", "⭐", "💛"],
};

export function useBursts() {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const id = useRef(0);
  const fire = useCallback((x: number, y: number, kind: keyof typeof BURST_BITS = "star", count = 10) => {
    const set = BURST_BITS[kind];
    const b: Burst = {
      id: ++id.current,
      x,
      y,
      bits: Array.from({ length: count }, (_, i) => {
        const ang = (Math.PI * 2 * i) / count + Math.random() * 0.6;
        const dist = 70 + Math.random() * 90;
        return { e: set[i % set.length], dx: Math.cos(ang) * dist, dy: Math.sin(ang) * dist - 30, r: (Math.random() * 2 - 1) * 200, s: 0.7 + Math.random() * 0.7, d: 650 + Math.random() * 450 };
      }),
    };
    setBursts((bs) => [...bs, b]);
    window.setTimeout(() => setBursts((bs) => bs.filter((x) => x.id !== b.id)), 1300);
  }, []);
  /** Fire from the middle of an element. */
  const fireAt = useCallback(
    (el: Element | null | undefined, kind?: keyof typeof BURST_BITS, count?: number) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      fire(r.left + r.width / 2, r.top + r.height / 2, kind, count);
    },
    [fire],
  );
  return { bursts, fire, fireAt };
}

export function BurstLayer({ bursts }: { bursts: Burst[] }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden" aria-hidden>
      {bursts.map((b) =>
        b.bits.map((bit, i) => (
          <span
            key={`${b.id}-${i}`}
            className="l-particle text-3xl"
            style={{ left: b.x, top: b.y, "--dx": `${bit.dx}px`, "--dy": `${bit.dy}px`, "--r": `${bit.r}deg`, "--s": bit.s, "--d": `${bit.d}ms` } as CSSProperties}
          >
            {bit.e}
          </span>
        )),
      )}
    </div>
  );
}

// ── Drag ─────────────────────────────────────────────────────────────────────────────────
/** Pointer drag for one element: it follows the finger, and on release we report what it was
 *  dropped on (the nearest [data-drop] under the finger). A quick touch without moving is a tap. */
export function useDrag(opts: { onDrop?: (target: HTMLElement | null) => void; onTap?: () => void; onLift?: () => void; disabled?: boolean }) {
  const ref = useRef<HTMLElement | null>(null);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const moved = useRef(false);
  const [dragging, setDragging] = useState(false);
  const optsRef = useRef(opts);
  useEffect(() => {
    optsRef.current = opts;
  });

  const reset = () => {
    const el = ref.current;
    if (el) {
      el.style.transform = "";
      el.style.transition = "transform 220ms cubic-bezier(0.34,1.56,0.64,1)";
    }
    start.current = null;
    moved.current = false;
    setDragging(false);
  };

  const handlers = {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (optsRef.current.disabled || start.current) return;
      ref.current = e.currentTarget;
      start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
      moved.current = false;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const s = start.current;
      const el = ref.current;
      if (!s || !el || e.pointerId !== s.id) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (!moved.current && Math.hypot(dx, dy) > 8) {
        moved.current = true;
        setDragging(true);
        optsRef.current.onLift?.();
      }
      if (moved.current) {
        el.style.transition = "none";
        el.style.transform = `translate(${dx}px, ${dy}px) scale(1.08) rotate(${Math.max(-6, Math.min(6, dx / 30))}deg)`;
      }
    },
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
      const s = start.current;
      const el = ref.current;
      if (!s || e.pointerId !== s.id) return;
      if (!moved.current) {
        reset();
        optsRef.current.onTap?.();
        return;
      }
      const target = dropTargetAt(e.clientX, e.clientY, el);
      reset();
      optsRef.current.onDrop?.(target);
    },
    onPointerCancel: () => reset(),
  };
  return { handlers, dragging };
}

export function dropTargetAt(x: number, y: number, ignore?: Element | null): HTMLElement | null {
  if (typeof document === "undefined") return null;
  for (const el of document.elementsFromPoint(x, y)) {
    if (ignore && ignore.contains(el)) continue;
    const t = (el as HTMLElement).closest?.("[data-drop]") as HTMLElement | null;
    if (t) return t;
  }
  return null;
}

/** A round progress ring (daily goal). */
export function Ring({ value, size = 64, stroke = 8, color = "var(--l-gold)", track = "rgba(255,255,255,0.35)", children }: { value: number; size?: number; stroke?: number; color?: string; track?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.22,1,0.36,1)" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

/** 0–3 stars in a row. */
export function Stars({ n, size = 20, className }: { n: number; size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${n} of 3 stars`}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ fontSize: size, lineHeight: 1, filter: i < n ? "none" : "grayscale(1) opacity(0.35)" }}>
          ⭐
        </span>
      ))}
    </span>
  );
}

/** Shuffle once per mount (choices shouldn't always sit in the same spot). The seed carries the
 *  play's id, so the order changes from one play of a lesson to the next. */
export function useShuffled<T>(items: T[], seed: string): T[] {
  const [out] = useState(() => shuffleSeeded(items, seed));
  return out;
}

export function shuffleSeeded<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    const j = (h >>> 0) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
