"use client";

import { useMemo } from "react";

const COLORS = ["#f6b23d", "#3cbcd9", "#4cc09a", "#e8755a", "#9b8cff", "#ffffff"];

/** A one-shot confetti burst from the center of its (relative/absolute) parent.
 *  Pure CSS particles — no deps. Respects reduced-motion (the global rule
 *  collapses the animation). Mount it (keyed) when a task is completed. */
export function Confetti({ count = 26, spread = 240 }: { count?: number; spread?: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: count }, () => {
        const ang = Math.random() * Math.PI * 2;
        const dist = spread * (0.35 + Math.random() * 0.65);
        return {
          cx: `${Math.cos(ang) * dist}px`,
          cy: `${Math.sin(ang) * dist - 50}px`, // bias upward, like a pop
          cr: `${(Math.random() * 2 - 1) * 420}deg`,
          cd: `${750 + Math.random() * 650}ms`,
          bg: COLORS[Math.floor(Math.random() * COLORS.length)],
          delay: `${Math.random() * 90}ms`,
          size: 6 + Math.round(Math.random() * 8),
          round: Math.random() > 0.5,
        };
      }),
    [count, spread],
  );

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible" aria-hidden>
      <div className="relative h-0 w-0">
        {bits.map((b, i) => (
          <span
            key={i}
            className="confetti-bit"
            style={
              {
                "--cx": b.cx,
                "--cy": b.cy,
                "--cr": b.cr,
                "--cd": b.cd,
                background: b.bg,
                width: b.size,
                height: b.size,
                borderRadius: b.round ? "9999px" : "2px",
                animationDelay: b.delay,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
