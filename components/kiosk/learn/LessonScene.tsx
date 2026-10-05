"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import type { SubjectId } from "@/lib/learn/types";
import { SUBJECT_LOOK } from "@/lib/learn/curriculum";
import type { BoatLook } from "@/lib/learn/meta";
import { SideBoat } from "./KidBoat";
import type { PetReact } from "./boat/Pet";
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
      {/* Each subject's own island on the horizon. */}
      <Horizon subject={subject} dusk={!!dusk} />
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

/** Far-off islands on the horizon that say which subject this is — a storybook island and a
 *  lighthouse (reading), shape mountains (math), a robot dock with a crane (code), a volcano and an
 *  observatory (discovery), a harbor village (manners), Lighthouse Point with its beam (faith). */
const SCENES: Record<SubjectId, { far: string; near: string; glow?: string }> = {
  reading: {
    far: "M0 160 L0 124 Q150 96 300 120 Q450 140 600 116 Q760 92 900 118 Q1050 140 1200 112 L1200 160 Z",
    near: "M30 160 Q120 112 250 160 Z M104 128 Q137 106 170 122 Q203 106 236 128 L236 137 Q203 117 170 132 Q137 117 104 137 Z M950 160 Q1062 116 1180 160 Z M1046 160 L1056 70 L1082 70 L1092 160 Z M1050 56 H1088 V72 H1050 Z M1046 56 L1069 38 L1092 56 Z",
  },
  math: {
    far: "M0 160 L0 128 Q200 100 400 126 Q600 146 800 120 Q1000 96 1200 124 L1200 160 Z",
    near: "M20 160 L104 66 L188 160 Z M146 160 L210 98 L274 160 Z M1010 160 Q1066 120 1122 160 Z M1066 112 m-32 0 a32 32 0 1 0 64 0 a32 32 0 1 0 -64 0 Z M1120 160 V118 L1132 106 H1172 V148 L1160 160 Z",
  },
  code: {
    far: "M0 160 L0 130 Q300 104 600 130 Q900 150 1200 122 L1200 160 Z",
    near: "M84 160 V58 H100 V160 Z M92 60 H214 V70 H92 Z M204 70 V102 H210 V70 Z M24 160 V126 H78 V160 Z M120 160 V136 H168 V160 Z M1034 160 L1048 124 H1084 L1098 160 Z M1036 84 H1096 V126 H1036 Z M1064 84 V66 H1068 V84 Z M1066 62 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 Z",
  },
  science: {
    far: "M0 160 L0 126 Q240 98 480 124 Q720 148 960 118 Q1080 104 1200 120 L1200 160 Z",
    near: "M14 160 L118 78 L150 82 L254 160 Z M134 62 m-15 0 a15 15 0 1 0 30 0 a15 15 0 1 0 -30 0 Z M154 42 m-19 0 a19 19 0 1 0 38 0 a19 19 0 1 0 -38 0 Z M996 160 V122 H1106 V160 Z M996 122 A55 55 0 0 1 1106 122 Z M1146 160 V98 Q1162 66 1178 98 V160 Z M1138 160 L1146 132 V160 Z M1186 160 L1178 132 V160 Z",
  },
  manners: {
    far: "M0 160 L0 128 Q200 108 400 126 Q600 144 800 124 Q1000 104 1200 126 L1200 160 Z",
    near: "M36 160 V116 L68 92 L100 116 V160 Z M100 160 V124 L126 104 L152 124 V160 Z M160 160 V130 L180 116 L200 130 V160 Z M1036 160 V112 L1070 88 L1104 112 V160 Z M1104 160 V122 L1132 100 L1160 122 V160 Z M980 160 V128 L1004 110 L1028 128 V160 Z",
  },
  faith: {
    far: "M0 160 L0 122 Q180 94 360 118 Q560 144 760 116 Q980 88 1200 116 L1200 160 Z",
    near: "M40 160 Q130 114 240 160 Z M84 160 V120 L112 98 L140 120 V160 Z M109 98 V78 H115 V98 Z M102 84 H122 V90 H102 Z M960 160 Q1070 112 1190 160 Z M1050 160 L1062 54 L1090 54 L1102 160 Z M1056 40 H1096 V56 H1056 Z M1052 40 L1076 20 L1100 40 Z",
    glow: "M1076 48 L1200 4 L1200 34 Z M1076 48 L940 10 L944 36 Z",
  },
};
function Horizon({ subject, dusk }: { subject: SubjectId; dusk: boolean }) {
  const sc = SCENES[subject];
  return (
    <svg viewBox="0 0 1200 160" preserveAspectRatio="xMidYMax slice" className="absolute inset-x-0 bottom-[9%] h-[24%] w-full">
      {sc.glow && <path d={sc.glow} fill={dusk ? "rgba(255,236,160,0.42)" : "rgba(255,248,200,0.5)"} />}
      <path d={sc.far} fill={dusk ? "#2f4d8c" : "#ffffff"} opacity={dusk ? 0.55 : 0.22} />
      <path d={sc.near} fill={dusk ? "#22407a" : "#ffffff"} opacity={dusk ? 0.75 : 0.34} fillRule="evenodd" />
    </svg>
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
export function SeaLane({ done, total, boss, look, reduced, hot, petReact }: { done: number; total: number; boss?: boolean; look: BoatLook; reduced?: boolean; hot?: boolean; petReact?: PetReact }) {
  const p = total ? Math.min(1, done / total) : 0;
  const n = Math.min(total, 14);
  // The boat (86px) sails from the lane's start to just short of the island, never over the buttons
  // beside the lane; the gold fill and the buoys follow the boat's middle.
  const along = (f: number) => `calc(43px + ${f} * (100% - 126px))`;
  return (
    <div className="relative h-[84px] flex-1">
      {/* The lane (the boat floats on it by its waterline). */}
      <div className="absolute inset-x-0 top-[66%] h-6 -translate-y-1/2 overflow-hidden rounded-full bg-[#0d6fa5]/35 shadow-[inset_0_3px_0_rgba(0,30,60,0.18)]">
        <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ width: along(p), background: hot ? "linear-gradient(90deg,#ffb347,#ff7a45)" : "linear-gradient(90deg,#ffe066,#ffc83d)" }}>
          <div className="absolute inset-x-3 top-1 h-1.5 rounded-full bg-white/50" />
        </div>
      </div>
      {/* Buoys. */}
      {Array.from({ length: n }, (_, k) => {
        const at = (k + 1) / (n + 1);
        const passed = p >= at;
        return <span key={k} className={cn("absolute top-[66%] h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-colors duration-500", passed ? "border-white bg-white" : "border-white/70 bg-[#0d6fa5]/40")} style={{ left: along(at) }} />;
      })}
      {/* The island (or the Kraken) at the end. */}
      <span className={cn("absolute bottom-[calc(34%-16px)] right-0 translate-x-[10%] drop-shadow-[0_3px_0_rgba(0,40,80,0.2)]", !reduced && "l-bob")}>
        <Glyph e={boss ? "🐙" : "🏝️"} size={64} />
      </span>
      {/* The boat. */}
      <span className="absolute bottom-[calc(34%-17px)] transition-[left] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ left: `calc(${p} * (100% - 126px))` }}>
        <SideBoat look={look} size={86} bob={!reduced} petReact={petReact} still={reduced} showTrail={hot} />
        {/* A splash each time it surges ahead. */}
        {done > 0 && !reduced && (
          <svg key={done} viewBox="0 0 60 30" className="l-splash pointer-events-none absolute -left-3 bottom-[10%] w-16" aria-hidden>
            <path d="M6 26 Q10 8 20 18 M26 24 Q30 2 38 16 M44 26 Q50 12 56 20" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
          </svg>
        )}
      </span>
    </div>
  );
}
