"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { KioskStep } from "@/lib/kiosk/types";
import { accentVars, type AccentRamp } from "@/lib/kiosk/accent";
import { scaleCount } from "@/lib/kiosk/motion";
import type { Daypart } from "@/lib/kiosk/daypart";

/** The Voyage (Kiosk Rework §5.3) — the day as a boat sailing a living, luminous
 *  harbor toward a glowing lighthouse (home). A hybrid scene: soft atmospherics (sky,
 *  water, bloom, caustics, reflection) are GPU-cheap CSS gradient planes; the precise
 *  pieces (track, buoys, boat, lighthouse, beam) are one SVG overlay sharing the boat's
 *  x-math. Daypart-lit, accent-suffused, and fully degradable (reduced-motion / calm /
 *  weak device). All motion is transform/opacity only → 60fps on a cheap tablet. */

type Body = "sun" | "moon";
// 7 daypart palettes — the single source feeding both the CSS planes and the SVG disc.
const DAYPARTS: Record<
  Daypart,
  { skyTop: string; skyBot: string; seaTop: string; seaBot: string; shore: string; body: Body; bodyX: number; bodyY: number; bodyCore: string; bodyGlow: string; stars: number }
> = {
  dawn:      { skyTop: "#2a3550", skyBot: "#6b5a6e", seaTop: "#26404f", seaBot: "#142634", shore: "#3a4258", body: "sun",  bodyX: 200, bodyY: 96, bodyCore: "#ffdcb0", bodyGlow: "#ff9e6b", stars: 6 },
  morning:   { skyTop: "#1f4a66", skyBot: "#2e6f86", seaTop: "#1b566e", seaBot: "#0e2f44", shore: "#34536a", body: "sun",  bodyX: 300, bodyY: 70, bodyCore: "#fff0cf", bodyGlow: "#ffd27a", stars: 0 },
  midday:    { skyTop: "#1f4a66", skyBot: "#123049", seaTop: "#17475f", seaBot: "#0e2a3e", shore: "#2c4a5e", body: "sun",  bodyX: 560, bodyY: 56, bodyCore: "#ffffff", bodyGlow: "#ffe7ad", stars: 0 },
  afternoon: { skyTop: "#1d4660", skyBot: "#1a3a52", seaTop: "#164257", seaBot: "#0d2738", shore: "#2c4257", body: "sun",  bodyX: 780, bodyY: 78, bodyCore: "#ffe9c2", bodyGlow: "#ffc987", stars: 0 },
  golden:    { skyTop: "#3a2d4a", skyBot: "#7a4a52", seaTop: "#2a3a4a", seaBot: "#12202c", shore: "#4a3848", body: "sun",  bodyX: 900, bodyY: 92, bodyCore: "#ffd27a", bodyGlow: "#ff8d4d", stars: 0 },
  dusk:      { skyTop: "#2a2440", skyBot: "#3a2c44", seaTop: "#1e2c3e", seaBot: "#0c1726", shore: "#2e2a44", body: "moon", bodyX: 170, bodyY: 80, bodyCore: "#fdf3da", bodyGlow: "#cdb8ff", stars: 14 },
  night:     { skyTop: "#16223e", skyBot: "#0c1426", seaTop: "#123049", seaBot: "#0a1a2c", shore: "#1a2740", body: "moon", bodyX: 150, bodyY: 74, bodyCore: "#fdf3da", bodyGlow: "#ffe9b8", stars: 22 },
};

// Deterministic faint stars (no Math.random → no hydration drift); sliced by intensity.
const STARS = Array.from({ length: 28 }, (_, i) => ({ x: ((i * 53 + 17) % 1100) + 10, y: ((i * 31 + 9) % 104) + 6 }));

function titleFor(d: Daypart): string {
  if (d === "dawn" || d === "morning") return "This morning's voyage";
  if (d === "golden" || d === "dusk" || d === "night") return "Tonight's voyage";
  return "Today's voyage";
}

export function Voyage({
  steps,
  doneIds,
  ramp,
  daypart,
  reducedMotion = false,
  intensity = 1,
  arrivalSignal,
  uid,
}: {
  steps: KioskStep[];
  doneIds: Set<string>;
  ramp: AccentRamp;
  daypart: Daypart;
  reducedMotion?: boolean;
  intensity?: number;
  arrivalSignal?: number;
  uid: string;
}) {
  const N = steps.length;
  const doneCount = steps.filter((s) => doneIds.has(s.id)).length;
  const allDone = N > 0 && doneCount === N;

  // Arrival flare — fires exactly once when the routine completes (a one-shot decoration
  // that never owns the boat's position; position is always derived from doneIds).
  const prevAllDone = useRef(false);
  const [flareKey, setFlareKey] = useState(0);
  useEffect(() => {
    if (allDone && !prevAllDone.current && !reducedMotion) setFlareKey((k) => k + 1);
    prevAllDone.current = allDone;
  }, [allDone, reducedMotion]);

  if (N < 2) return null;

  const currentIdx = steps.findIndex((s) => !doneIds.has(s.id));
  const xStart = 150;
  const xEnd = 1010;
  const xFor = (i: number) => xStart + (xEnd - xStart) * ((i + 0.5) / N);
  // Boat sits at the first not-done node, or the dock when done; clamped short of the
  // lighthouse so it never collides on small step counts.
  const boatX = allDone ? xEnd : Math.min(xFor(currentIdx < 0 ? 0 : currentIdx), 980);
  const proximity = doneCount / N; // 0→1 drives lighthouse + beam brightness (continuous)
  const litFrac = Math.max(0, (boatX - 70) / 940); // scaleX of the lit journey track
  const D = DAYPARTS[daypart];
  const glide: CSSProperties | undefined = reducedMotion ? undefined : { transition: "transform 0.6s var(--ease-harbor-out)" };
  const fade: CSSProperties | undefined = reducedMotion ? undefined : { transition: "opacity 0.6s var(--ease-harbor-calm)" };
  const lhBright = 0.4 + 0.55 * proximity;
  const beamOp = 0.12 + 0.5 * proximity;

  const starCount = Math.max(0, scaleCount(D.stars, intensity));
  const starBg =
    D.stars > 0 && starCount > 0
      ? STARS.slice(0, starCount)
          .map((s) => `radial-gradient(1.5px 1.5px at ${((s.x / 1120) * 100).toFixed(1)}% ${((s.y / 138) * 100).toFixed(1)}%, rgba(223,230,255,.9), transparent)`)
          .join(",")
      : "none";

  const rootStyle = {
    ...accentVars(ramp.accent),
    "--sky-top": D.skyTop,
    "--sky-bot": D.skyBot,
    "--sea-top": D.seaTop,
    "--sea-bot": D.seaBot,
    "--shore": D.shore,
    "--body-core": D.bodyCore,
    "--body-glow": D.bodyGlow,
    "--body-x": `${((D.bodyX / 1120) * 100).toFixed(2)}%`,
    "--body-y": `${((D.bodyY / 250) * 100).toFixed(2)}%`,
    "--vg-intensity": String(intensity),
    aspectRatio: "1120 / 250",
    boxShadow: `inset 0 1px 0 rgba(255,255,255,.04), 0 20px 50px -30px #000, 0 0 0 1px ${ramp.glow}`,
  } as CSSProperties;

  return (
    <div className="vg-root relative mb-4 overflow-hidden rounded-[24px]" data-rm={reducedMotion ? "" : undefined} style={rootStyle}>
      {/* atmospheric planes (CSS gradients; composite for free) */}
      <div className="vg-sky" />
      {D.stars > 0 && <div className="vg-stars" style={{ backgroundImage: starBg }} />}
      <div className="vg-bloom" />
      <div className="vg-shore" />
      <div className="vg-water" />
      <div className="vg-reflect" />
      <div className="vg-caustics" />
      <div className="vg-waterline" />

      <span className="pointer-events-none absolute left-4 top-3 z-10 text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: ramp.text }}>
        {titleFor(daypart)}
      </span>
      <span className="pointer-events-none absolute right-4 top-3 z-10 text-xs font-semibold tabular-nums" style={{ color: ramp.text }}>
        {allDone ? "Home! 🎉" : `${doneCount} of ${N}`}
      </span>

      <svg viewBox="0 0 1120 250" preserveAspectRatio="xMidYMid meet" className="vg-svg absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id={`vg-bodyglow-${uid}`}>
            <stop offset="0" stopColor={D.bodyGlow} stopOpacity="0.85" />
            <stop offset="45%" stopColor={D.bodyGlow} stopOpacity="0.25" />
            <stop offset="100%" stopColor={D.bodyGlow} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`vg-buoy-${uid}`}>
            <stop offset="0" stopColor={ramp.bright} stopOpacity="0.9" />
            <stop offset="100%" stopColor={ramp.bright} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`vg-lh-${uid}`}>
            <stop offset="0" stopColor="#ffe1a0" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#ffd27a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`vg-beam-${uid}`} x1="1" y1="0" x2="0" y2="0">
            <stop offset="0" stopColor="#ffd27a" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ffd27a" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`vg-tower-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f4f7fc" />
            <stop offset="1" stopColor="#aab4c8" />
          </linearGradient>
          <linearGradient id={`vg-hull-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#eef1fb" />
            <stop offset="1" stopColor="#b7bed6" />
          </linearGradient>
        </defs>

        {/* celestial body — a tight edge-glow (the wide soft bloom is the CSS plane) + crisp disc */}
        <circle cx={D.bodyX} cy={D.bodyY} r="44" fill={`url(#vg-bodyglow-${uid})`} />
        <circle cx={D.bodyX} cy={D.bodyY} r="28" fill={D.bodyCore} />
        {D.body === "moon" && <circle cx={D.bodyX + 12} cy={D.bodyY - 6} r="28" fill={D.skyTop} />}

        {/* journey track — dashed base + lit segment grown via scaleX (transform, not the d attr) */}
        <path d="M70 178 H1010" stroke="#23304a" strokeWidth="3" strokeDasharray="2 12" strokeLinecap="round" />
        <g style={{ transform: `scaleX(${litFrac})`, transformOrigin: "70px 178px", ...glide }}>
          <path d="M70 178 H1010" stroke={ramp.glow} strokeWidth="10" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity="0.5" />
          <path d="M70 178 H1010" stroke={ramp.deep} strokeWidth="5" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity="0.95" />
        </g>

        {/* buoys — done = lit + reflection; current = boat (nothing); upcoming = dim */}
        {steps.map((s, i) => {
          const done = doneIds.has(s.id);
          const isCurrent = i === currentIdx && !allDone;
          if (isCurrent) return null;
          const x = xFor(i);
          if (!done) {
            return (
              <g key={s.id}>
                <circle cx={x} cy="178" r="7" fill="#2c3a55" />
                <circle cx={x} cy="178" r="7" fill="none" stroke="#3c4a66" strokeWidth="2" />
              </g>
            );
          }
          return (
            <g key={s.id}>
              <circle cx={x} cy="178" r="28" fill={`url(#vg-buoy-${uid})`} opacity={Math.min(1, 0.9 * intensity)} />
              <ellipse cx={x} cy="194" rx="4" ry="11" fill={ramp.bright} opacity="0.22" /> {/* reflection on the water */}
              <circle cx={x} cy="178" r="9" fill={ramp.bright} />
              <circle cx={x} cy="178" r="9" fill="none" stroke="#cfd6ff" strokeWidth="1.5" />
            </g>
          );
        })}

        {/* the boat — outer group advances (translateX, glides on completion); a middle group
            holds the baseline position so the inner CSS bob transform doesn't clobber it */}
        <g style={{ transform: `translateX(${boatX}px)`, ...glide }}>
          <g transform="translate(0,178)">
          <g className={reducedMotion ? undefined : "vg-bob"}>
            <path d="M-26 10 L-78 2 L-78 20 Z" fill={ramp.glow} opacity="0.18" /> {/* wake */}
            <circle cx="0" cy="0" r="42" fill={`url(#vg-buoy-${uid})`} opacity="0.7" /> {/* lit aura */}
            <path d="M-18 24 L18 24 L14 36 L-14 36 Z" fill={ramp.deep} opacity="0.22" /> {/* reflection */}
            <path d="M-26 6 L26 6 L20 22 L-20 22 Z" fill={`url(#vg-hull-${uid})`} />
            <rect x="-1.5" y="-30" width="3" height="36" fill="#cdd4f0" />
            <path d="M2 -29 L2 1 L30 1 Z" fill={ramp.accent} />
            <path d="M-2 -24 L-2 -2 L-24 -2 Z" fill={ramp.bright} />
          </g>
          </g>
        </g>

        {/* the lighthouse — home; brightness ramps with proximity, beam sweeps + flares on arrival */}
        <g transform="translate(1010,0)">
          <circle cx="0" cy="120" r="78" fill={`url(#vg-lh-${uid})`} style={{ opacity: lhBright, ...fade }} />
          <path d="M-46 178 Q-30 168 0 168 Q30 168 46 178 Z" fill="#0e2236" />
          <path d="M-13 168 L-9 96 L9 96 L13 168 Z" fill={`url(#vg-tower-${uid})`} />
          <path d="M-13 150 L13 150 M-11 130 L11 130 M-10 112 L10 112" stroke="#c2462f" strokeWidth="6" opacity="0.85" />
          <rect x="-11" y="78" width="22" height="20" rx="3" fill="#1a2740" />
          {/* the sweeping beam — pivots about the lamp (fill-box origin), brightens with proximity */}
          <g className={reducedMotion ? undefined : "vg-beam"} style={{ opacity: beamOp, transformBox: "fill-box", transformOrigin: "100% 100%" }}>
            <path d="M0 88 L-200 26 L-200 88 Z" fill={`url(#vg-beam-${uid})`} opacity="0.5" />
            <path d="M0 88 L-165 48 L-165 84 Z" fill={`url(#vg-beam-${uid})`} />
          </g>
          <circle cx="0" cy="88" r="7" fill="#ffd27a" />
          <circle cx="0" cy="88" r="16" fill={`url(#vg-lh-${uid})`} style={{ opacity: lhBright, ...fade }} />
          <path d="M-9 74 L9 74 L5 66 L-5 66 Z" fill="#cdd4e6" />
          {flareKey > 0 && !reducedMotion && <circle key={flareKey} className="vg-flare" cx="0" cy="88" r="26" fill={`url(#vg-lh-${uid})`} />}
        </g>
      </svg>
    </div>
  );
}
