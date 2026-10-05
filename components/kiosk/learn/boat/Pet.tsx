"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { petVoice } from "@/lib/learn/sfx";
import { heart } from "../art/pen";
import { RIG_BY_ID, petInner, type Trick } from "./pets";

// A living pet: the drawing from ./pets with its parts animated by the `.pet` CSS (globals.css).
// It idles on its own (breathes, blinks, looks around, wags); `react` makes it cheer or tilt its
// head once (re-keyed per answer); `mood="sleep"` dozes; a tap plays its next trick with its voice
// and a few floating hearts. Works on its own or nested inside another <svg> (pass x/y).

const TRICK_MS: Record<Trick, number> = { spin: 950, flip: 1050, jump: 900, flap: 1050, wave: 1700, dance: 1350, shake: 750, roar: 1050, hide: 1450, bounce: 1400 };
const HEARTS: [number, number, number][] = [[30, 26, 0], [68, 20, 0.15], [50, 10, 0.3]];

export type PetReact = { mood: "cheer" | "oops"; k: number } | null;

export function Pet({
  id,
  size,
  mood = "idle",
  react = null,
  trick: forced = null,
  tappable,
  still,
  x,
  y,
  className,
  style,
  onTap,
}: {
  id: string;
  size: number;
  mood?: "idle" | "sleep";
  react?: PetReact;
  /** Play this trick now (re-key to replay) — the Pet Trick Show drives it. */
  trick?: { t: Trick; k: number } | null;
  tappable?: boolean;
  still?: boolean;
  /** Position inside a parent <svg> (user units). */
  x?: number;
  y?: number;
  className?: string;
  style?: CSSProperties;
  onTap?: () => void;
}) {
  const inner = petInner(id);
  const rig = RIG_BY_ID.get(id);
  const [trick, setTrick] = useState<{ t: Trick; k: number } | null>(null);
  const [hearts, setHearts] = useState(0);
  const [doneK, setDoneK] = useState(-1);
  const next = useRef(0);
  const timer = useRef<number | null>(null);
  useEffect(() => () => void (timer.current && window.clearTimeout(timer.current)), []);
  // A cheer/oops plays once; after it, the resting animations take over again.
  useEffect(() => {
    if (!react) return;
    const t = window.setTimeout(() => setDoneK(react.k), react.mood === "cheer" ? 1300 : 1500);
    return () => window.clearTimeout(t);
  }, [react]);
  if (!inner || !rig) return null;
  const live = react && react.k !== doneK ? react : null;
  const doing = forced ?? trick;

  const tap = () => {
    onTap?.();
    if (trick) return;
    const t = rig.tricks[next.current % rig.tricks.length];
    next.current++;
    petVoice(rig.voice);
    setTrick({ t, k: next.current });
    setHearts((h) => h + 1);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setTrick(null), TRICK_MS[t]);
  };

  return (
    <svg
      viewBox="0 0 100 100"
      x={x}
      y={y}
      width={size}
      height={size}
      overflow="visible"
      className={cn("pet", still && "pet-still", tappable && "cursor-pointer", className)}
      style={style}
      data-mood={doing ? "idle" : live ? live.mood : mood}
      data-trick={doing?.t}
      onPointerDown={tappable ? tap : undefined}
      aria-hidden
    >
      <g key={`${live?.k ?? "rest"}:${doing?.k ?? 0}`} className="pp-all" style={{ transformOrigin: "50px 92px" }}>
        <g className="pp-turn" style={{ transformOrigin: "50px 56px" }} dangerouslySetInnerHTML={{ __html: inner }} />
      </g>
      {/* Hearts float up on a trick or a cheer. */}
      {(hearts > 0 || live?.mood === "cheer") && !still && (
        <g key={`h${hearts}:${live?.k ?? ""}`} pointerEvents="none">
          {HEARTS.map(([hx, hy, delay], i) => (
            <path key={i} d={heart(hx, hy, 5.5)} fill="#ff6f91" stroke="#2a2f45" strokeWidth="1.6" className="pp-float" style={{ animationDelay: `${delay}s` }} />
          ))}
        </g>
      )}
    </svg>
  );
}
