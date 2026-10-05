"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import type { SubjectId } from "@/lib/learn/types";
import { SUBJECT_LOOK } from "@/lib/learn/curriculum";
import type { BoatLook } from "@/lib/learn/meta";
import { SideBoat } from "./KidBoat";
import { Glyph } from "./art/Glyph";

// The world a lesson happens in: open sea under a sky tinted by the subject (warm for reading,
// violet for math…), soft clouds drifting, sunlight, and waves rolling along the bottom — so a
// question sits on a scene, not on a flat color. Up top, the voyage: a lane of buoys (one per
// challenge) with the child's boat sailing toward the island.

const CLOUDS = [
  { x: 8, y: 9, s: 1, d: 0, dur: 90 },
  { x: 62, y: 5, s: 0.75, d: -30, dur: 110 },
  { x: 84, y: 17, s: 0.6, d: -60, dur: 130 },
];

export function LessonBackdrop({ subject, dusk, reduced }: { subject: SubjectId; dusk?: boolean; reduced?: boolean }) {
  const sl = SUBJECT_LOOK[subject];
  const sky = dusk
    ? `radial-gradient(900px 420px at 78% -6%, ${sl.from}55 0%, transparent 62%), linear-gradient(180deg, #24427f 0%, #1c3770 44%, #152b5c 78%, #0f2149 100%)`
    : `radial-gradient(900px 440px at 80% -8%, ${sl.from}cc 0%, ${sl.from}33 38%, transparent 64%), radial-gradient(1200px 520px at 50% -12%, #d6f6ff 0%, transparent 60%), linear-gradient(180deg, #9fe2ff 0%, #5ccbf2 32%, #2aaee0 68%, #1792cb 100%)`;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden style={{ background: sky }}>
      {/* Sunlight from the top right. */}
      {!dusk && <div className={cn("absolute -right-[10%] -top-[30%] h-[110%] w-[70%] opacity-[0.22]", !reduced && "l-sunrays")} style={{ background: "repeating-conic-gradient(from 200deg at 85% 0%, rgba(255,255,255,0.9) 0deg 4deg, transparent 4deg 14deg)", WebkitMaskImage: "radial-gradient(ellipse at 85% 0%, #000 0%, transparent 70%)", maskImage: "radial-gradient(ellipse at 85% 0%, #000 0%, transparent 70%)" } as CSSProperties} />}
      {/* Clouds drifting by. */}
      {CLOUDS.map((c, i) => (
        <svg key={i} viewBox="0 0 200 80" className={cn("absolute", !reduced && "l-cloud")} style={{ left: `${c.x}%`, top: `${c.y}%`, width: 220 * c.s, opacity: dusk ? 0.18 : 0.75, animationDuration: `${c.dur}s`, animationDelay: `${c.d}s` } as CSSProperties}>
          <path d="M30 70 Q6 70 8 52 Q10 36 30 38 Q34 16 60 18 Q76 2 100 14 Q122 4 138 22 Q164 18 168 40 Q192 42 190 58 Q188 72 166 70 Z" fill="#ffffff" />
        </svg>
      ))}
      {/* Two rows of waves rolling along the bottom. */}
      <div className="absolute inset-x-0 bottom-0 h-[16%] min-h-[90px]">
        <Waves className={cn("absolute inset-x-0 bottom-[26%] h-full opacity-50", !reduced && "l-wave-slow")} color={dusk ? "#2c4d8f" : "#7fd8f7"} />
        <Waves className={cn("absolute inset-x-0 -bottom-[4%] h-[86%] opacity-80", !reduced && "l-wave-fast")} color={dusk ? "#1b3567" : "#1586c0"} />
      </div>
      {/* A few bubbles. */}
      {!reduced && [12, 27, 71, 88].map((x, i) => <span key={i} className="l-bubble absolute bottom-0 rounded-full border-2 border-white/60 bg-white/15" style={{ left: `${x}%`, width: 10 + (i % 3) * 5, height: 10 + (i % 3) * 5, animationDelay: `${i * 2.3}s`, animationDuration: `${9 + i * 1.7}s` } as CSSProperties} />)}
    </div>
  );
}

function Waves({ className, color }: { className?: string; color: string }) {
  // Twice as wide as the screen and tiled, so sliding it left by half loops seamlessly.
  return (
    <div className={className} style={{ width: "200%" }}>
      <svg viewBox="0 0 1600 100" preserveAspectRatio="none" className="h-full w-full">
        <path d="M0 40 Q100 10 200 40 T400 40 T600 40 T800 40 T1000 40 T1200 40 T1400 40 T1600 40 V100 H0 Z" fill={color} />
      </svg>
    </div>
  );
}

/** The voyage across the top: a buoy for each challenge, the boat sailing toward the island (or
 *  the Kraken on a boss level). */
export function SeaLane({ done, total, boss, look, reduced, hot }: { done: number; total: number; boss?: boolean; look: BoatLook; reduced?: boolean; hot?: boolean }) {
  const p = total ? Math.min(1, done / total) : 0;
  const n = Math.min(total, 14);
  // The boat (72px) sails from the lane's start to just short of the island, never over the buttons
  // beside the lane; the gold fill and the buoys follow the boat's middle.
  const along = (f: number) => `calc(36px + ${f} * (100% - 112px))`;
  return (
    <div className="relative h-16 flex-1">
      {/* The lane. */}
      <div className="absolute inset-x-0 top-1/2 h-6 -translate-y-1/2 overflow-hidden rounded-full bg-[#0d6fa5]/35 shadow-[inset_0_3px_0_rgba(0,30,60,0.18)]">
        <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ width: along(p), background: hot ? "linear-gradient(90deg,#ffb347,#ff7a45)" : "linear-gradient(90deg,#ffe066,#ffc83d)" }}>
          <div className="absolute inset-x-3 top-1 h-1.5 rounded-full bg-white/50" />
        </div>
      </div>
      {/* Buoys. */}
      {Array.from({ length: n }, (_, k) => {
        const at = (k + 1) / (n + 1);
        const passed = p >= at;
        return <span key={k} className={cn("absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-colors duration-500", passed ? "border-white bg-white" : "border-white/70 bg-[#0d6fa5]/40")} style={{ left: along(at) }} />;
      })}
      {/* The island (or the Kraken) at the end. */}
      <span className={cn("absolute right-0 top-1/2 -translate-y-[58%] translate-x-[10%] drop-shadow-[0_3px_0_rgba(0,40,80,0.2)]", !reduced && "l-bob")}>
        <Glyph e={boss ? "🐙" : "🏝️"} size={60} />
      </span>
      {/* The boat. */}
      <span className="absolute top-1/2 transition-[left] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ left: `calc(${p} * (100% - 112px))`, transform: "translateY(-64%)" }}>
        <SideBoat look={look} size={72} bob={!reduced} />
      </span>
    </div>
  );
}
