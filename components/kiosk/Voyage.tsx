"use client";

import type { KioskStep } from "@/lib/kiosk/types";
import type { AccentRamp } from "@/lib/kiosk/accent";

/** The Voyage (ChildView Visual Spec §7) — the day as a boat sailing a moonlit
 *  harbor toward a glowing lighthouse (home). Completed steps light buoys along the
 *  path; the boat marks "now"; the lighthouse is arrival. The screen's hero.
 *  Daypart-aware (night = moon; day/golden = sun). Accent-suffused via the ramp. */

type Scene = "day" | "golden" | "night";

const SCENES: Record<
  Scene,
  { sky: [string, string]; sea: [string, string]; body: "sun" | "moon"; bodyX: number; bodyFill: string; bodyGlow: string; stars: boolean }
> = {
  day: { sky: ["#1f4a66", "#123049"], sea: ["#17475f", "#0e2a3e"], body: "sun", bodyX: 320, bodyFill: "#ffe7ad", bodyGlow: "#ffd27a", stars: false },
  golden: { sky: ["#3a2d4a", "#1a1426"], sea: ["#2a3a4a", "#12202c"], body: "sun", bodyX: 880, bodyFill: "#ffd27a", bodyGlow: "#ffb24d", stars: false },
  night: { sky: ["#16223e", "#0c1426"], sea: ["#123049", "#0a1a2c"], body: "moon", bodyX: 150, bodyFill: "#fdf3da", bodyGlow: "#ffe9b8", stars: true },
};

// Deterministic faint stars in the upper band (no Math.random → no hydration drift).
const STARS = Array.from({ length: 22 }, (_, i) => ({
  x: ((i * 53 + 17) % 1100) + 10,
  y: ((i * 37 + 9) % 96) + 8,
  d: (i % 5) * 0.8,
}));

export function Voyage({
  steps,
  doneIds,
  ramp,
  scene = "night",
  reducedMotion = false,
}: {
  steps: KioskStep[];
  doneIds: Set<string>;
  ramp: AccentRamp;
  scene?: Scene;
  reducedMotion?: boolean;
}) {
  const N = steps.length;
  if (N < 2) return null;
  const doneCount = steps.filter((s) => doneIds.has(s.id)).length;
  const allDone = doneCount === N;
  const currentIdx = steps.findIndex((s) => !doneIds.has(s.id));

  const xStart = 150;
  const xEnd = 1010;
  const xFor = (i: number) => xStart + (xEnd - xStart) * ((i + 0.5) / N);
  const boatX = allDone ? xEnd : xFor(currentIdx < 0 ? 0 : currentIdx);
  const oneLeft = !allDone && doneCount === N - 1; // "almost home" — brighten the light
  const sc = SCENES[scene];
  const glide = reducedMotion ? undefined : { transition: "all 0.6s cubic-bezier(.22,1,.36,1)" };

  return (
    <div
      className="relative mb-4 overflow-hidden rounded-[24px]"
      style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,.04), 0 20px 50px -30px #000, 0 0 0 1px ${ramp.glow}` }}
    >
      <span className="pointer-events-none absolute left-4 top-3 z-10 text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: ramp.text }}>
        {scene === "night" ? "Tonight's voyage" : "Today's voyage"}
      </span>
      <span className="pointer-events-none absolute right-4 top-3 z-10 text-xs font-semibold tabular-nums" style={{ color: ramp.text }}>
        {allDone ? "Home! 🎉" : `${doneCount} of ${N}`}
      </span>

      <svg viewBox="0 0 1120 250" preserveAspectRatio="xMidYMid meet" width="100%" className="block">
        <defs>
          <linearGradient id="vg-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={sc.sky[0]} />
            <stop offset="1" stopColor={sc.sky[1]} />
          </linearGradient>
          <linearGradient id="vg-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={sc.sea[0]} />
            <stop offset="1" stopColor={sc.sea[1]} />
          </linearGradient>
          <radialGradient id="vg-body">
            <stop offset="0" stopColor={sc.bodyGlow} stopOpacity="0.9" />
            <stop offset="42%" stopColor={sc.bodyGlow} stopOpacity="0.28" />
            <stop offset="100%" stopColor={sc.bodyGlow} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="vg-lh">
            <stop offset="0" stopColor="#ffd27a" stopOpacity={oneLeft || allDone ? "0.95" : "0.7"} />
            <stop offset="100%" stopColor="#ffd27a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="vg-buoy">
            <stop offset="0" stopColor={ramp.bright} stopOpacity="0.9" />
            <stop offset="100%" stopColor={ramp.bright} stopOpacity="0" />
          </radialGradient>
          {/* §2/§3 — the built objects catch light: lighter top (lamp-lit), darker base. */}
          <linearGradient id="vg-tower" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f4f7fc" />
            <stop offset="1" stopColor="#aab4c8" />
          </linearGradient>
          <linearGradient id="vg-hull" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#eef1fb" />
            <stop offset="1" stopColor="#b7bed6" />
          </linearGradient>
        </defs>

        {/* sky + sea */}
        <rect x="0" y="0" width="1120" height="250" fill="url(#vg-sky)" />
        <rect x="0" y="150" width="1120" height="100" fill="url(#vg-sea)" />

        {/* §6.3 — the moon/sun shimmering on the water below it (a soft reflected band) */}
        <rect x={sc.bodyX - 16} y="150" width="32" height="92" fill={sc.bodyFill} opacity="0.1">
          {!reducedMotion && <animate attributeName="opacity" values="0.05;0.15;0.05" dur="6s" repeatCount="indefinite" />}
        </rect>

        {/* stars (night) */}
        {sc.stars &&
          STARS.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r="1.6" fill="#dfe6ff" opacity="0.55">
              {!reducedMotion && <animate attributeName="opacity" values="0.15;0.9;0.15" dur="4s" begin={`${s.d}s`} repeatCount="indefinite" />}
            </circle>
          ))}

        {/* celestial body */}
        <circle cx={sc.bodyX} cy="74" r="84" fill="url(#vg-body)" />
        <circle cx={sc.bodyX} cy="74" r="30" fill={sc.bodyFill} />
        {sc.body === "moon" && <circle cx={sc.bodyX + 12} cy="68" r="30" fill={sc.sky[0]} />}

        {/* journey line — dashed base + lit segment to the boat */}
        <path d="M70 178 H1010" stroke="#23304a" strokeWidth="3" strokeDasharray="2 12" strokeLinecap="round" />
        <path d={`M70 178 H${boatX}`} stroke={ramp.deep} strokeWidth="4" strokeLinecap="round" opacity="0.9" style={glide} />

        {/* buoys (done = lit, upcoming = dim; the current step is the boat) */}
        {steps.map((s, i) => {
          const done = doneIds.has(s.id);
          const isCurrent = i === currentIdx && !allDone;
          if (isCurrent) return null;
          const x = xFor(i);
          return done ? (
            <g key={s.id}>
              <ellipse cx={x} cy="191" rx="13" ry="3" fill="#0a1a2c" opacity="0.5" /> {/* §5 contact shadow — seat the buoy */}
              <circle cx={x} cy="178" r="30" fill="url(#vg-buoy)" />
              <circle cx={x} cy="178" r="9" fill={ramp.bright} />
              <circle cx={x} cy="178" r="9" fill="none" stroke="#cfd6ff" strokeWidth="1.5" />
            </g>
          ) : (
            <g key={s.id}>
              <circle cx={x} cy="178" r="7" fill="#2c3a55" />
              <circle cx={x} cy="178" r="7" fill="none" stroke="#3c4a66" strokeWidth="2" />
            </g>
          );
        })}

        {/* the boat — at "now" */}
        <g transform={`translate(${boatX},178)`} style={glide} className={reducedMotion ? undefined : "k-float"}>
          <ellipse cx="0" cy="34" rx="46" ry="7" fill="#0a1a2c" opacity="0.7" />
          <circle cx="0" cy="0" r="44" fill="url(#vg-buoy)" opacity="0.8" />
          <path d="M-26 6 L26 6 L20 22 L-20 22 Z" fill="url(#vg-hull)" />
          <rect x="-1.5" y="-30" width="3" height="36" fill="#cdd4f0" />
          <path d="M2 -29 L2 1 L30 1 Z" fill={ramp.accent} />
          <path d="M-2 -24 L-2 -2 L-24 -2 Z" fill={ramp.bright} />
        </g>

        {/* the lighthouse — home */}
        <g transform="translate(1010,0)">
          <circle cx="0" cy="120" r="78" fill="url(#vg-lh)" />
          <ellipse cx="0" cy="181" rx="42" ry="4" fill="#08131f" opacity="0.55" /> {/* §5 contact shadow */}
          <path d="M-46 178 Q-30 168 0 168 Q30 168 46 178 Z" fill="#0e2236" />
          <path d="M-13 168 L-9 96 L9 96 L13 168 Z" fill="url(#vg-tower)" />
          <path d="M-13 150 L13 150 M-11 130 L11 130 M-10 112 L10 112" stroke="#c2462f" strokeWidth="6" opacity="0.85" />
          <rect x="-11" y="78" width="22" height="20" rx="3" fill="#1a2740" />
          <circle cx="0" cy="88" r="7" fill="#ffd27a" />
          <circle cx="0" cy="88" r="16" fill="url(#vg-lh)" />
          <path d="M-9 74 L9 74 L5 66 L-5 66 Z" fill="#cdd4e6" />
          {/* §10.5 — bloomed beam: a wide soft cone behind the crisp beam */}
          <path d="M0 88 L-180 20 L-180 84 Z" fill="#ffd27a" opacity={oneLeft || allDone ? "0.12" : "0.05"} />
          <path d="M0 88 L-150 40 L-150 64 Z" fill="#ffd27a" opacity={oneLeft || allDone ? "0.26" : "0.12"} />
        </g>
      </svg>
    </div>
  );
}
