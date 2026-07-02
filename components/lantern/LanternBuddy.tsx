"use client";

import { useId } from "react";

export type BuddyMood = "happy" | "wave" | "cheer" | "sleepy";

/** Skipper — the Lantern's friendly harbor buddy: a premium little sailboat with a wind-filled
 *  mainsail + jib, a dimensional hull in the child's colour (glossy sheen, gold boot-stripe, gunwale
 *  rim), a warm masthead light, and a face on the hull, riding a calm layered wave. Unmistakably a
 *  boat (never a rocket), lovable, and expressive — it bobs on the water, blinks, its pennant waves
 *  hello, and it bounces with sparkles when a task is done. Pure transform/opacity animation (the
 *  shared `lb-*` keyframes) → smooth on a cheap tablet, fully still under reduced motion. */
export function LanternBuddy({
  mood = "happy",
  accent = "#18606f",
  size = 128,
  reducedMotion = false,
  cheerKey = 0,
}: {
  mood?: BuddyMood;
  accent?: string;
  size?: number;
  reducedMotion?: boolean;
  /** Bump to replay the cheer bounce (e.g. on each completion). */
  cheerKey?: number;
}) {
  const ink = "#0c3b47";
  const beacon = "#f6b23d";
  const cream = "#fdfbf5";
  const coral = "#f0997b";
  const sleepy = mood === "sleepy";
  const cheering = mood === "cheer";
  const waving = mood === "wave";
  const anim = !reducedMotion;
  // Unique gradient ids per instance so two buddies on one screen never collide.
  const uid = useId().replace(/:/g, "");
  const g = (id: string) => `${uid}${id}`;

  return (
    <svg
      viewBox="0 0 120 100"
      role="img"
      aria-label="Skipper, the Lantern sailboat buddy"
      style={{ width: size * 1.2, height: size, overflow: "visible" }}
    >
      <defs>
        <linearGradient id={g("sail")} x1="0" y1="0" x2="1" y2="0.65">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor={cream} />
          <stop offset="1" stopColor="#e2d3b0" />
        </linearGradient>
        <linearGradient id={g("jib")} x1="1" y1="0" x2="0" y2="0.7">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e5d9bf" />
        </linearGradient>
        <linearGradient id={g("hs")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.30" />
          <stop offset="0.4" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.72" stopColor={ink} stopOpacity="0" />
          <stop offset="1" stopColor={ink} stopOpacity="0.20" />
        </linearGradient>
        <radialGradient id={g("glow")} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff6df" stopOpacity="0.95" />
          <stop offset="0.35" stopColor={beacon} stopOpacity="0.6" />
          <stop offset="1" stopColor={beacon} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={g("ch")} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={coral} stopOpacity="0.9" />
          <stop offset="1" stopColor={coral} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={g("wv")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dcefe9" />
          <stop offset="1" stopColor="#bfe0d7" />
        </linearGradient>
      </defs>

      {/* soft shadow + back wave */}
      <ellipse cx="60" cy="94" rx="33" ry="3.6" fill={ink} opacity="0.08" />
      <path d="M4 87 Q22 81 40 87 Q52 92 64 87 Q84 81 102 87 Q110 90 116 87 L116 98 L4 98 Z" fill={`url(#${g("wv")})`} opacity="0.55" />

      <g key={cheering ? `cheer-${cheerKey}` : "idle"} className={anim && cheering ? "lb-cheer" : undefined}>
        <g className={anim && !sleepy ? "lb-bob" : undefined}>
          {/* masthead light — a little warm harbor lantern on top */}
          <circle cx="58" cy="10" r="9" fill={`url(#${g("glow")})`} opacity={sleepy ? 0.14 : 1} className={anim && !sleepy ? "lb-glow" : undefined} />
          <circle cx="58" cy="10" r="2.9" fill={sleepy ? "#e7cf9c" : beacon} />
          {!sleepy && <circle cx="56.9" cy="8.9" r="1" fill="#fff" opacity="0.95" />}

          {/* mast */}
          <line x1="58" y1="13" x2="58" y2="58" stroke={ink} strokeWidth="2.6" strokeLinecap="round" />

          {/* sails — jib + a wind-filled mainsail with panel seams + a luff highlight */}
          <ellipse cx="70" cy="57.5" rx="17" ry="2.3" fill={ink} opacity="0.09" />
          <path d="M58 25 Q41 39 43 55 L58 55 Z" fill={`url(#${g("jib")})`} stroke={ink} strokeWidth="2" strokeLinejoin="round" />
          <path d="M58 16 Q93 31 88 56 L58 56 Z" fill={`url(#${g("sail")})`} stroke={ink} strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M58 21 Q75 31 72 47" fill="none" stroke={ink} strokeWidth="0.9" opacity="0.13" />
          <path d="M58 33 Q73 41 71 53" fill="none" stroke={ink} strokeWidth="0.9" opacity="0.10" />
          <path d="M58 16 Q64 34 61 56 L58 56 Z" fill="#ffffff" opacity="0.30" />

          {/* jaunty pennant — flaps on a wave hello */}
          <g className={anim && waving ? "lb-wave" : undefined}>
            <path d="M58 8.5 L76 12.5 L58 16 Z" fill={coral} stroke={ink} strokeWidth="1.4" strokeLinejoin="round" />
          </g>

          {/* hull (the child's colour) — gloss + gold boot-stripe + gunwale rim + crisp outline */}
          <path d="M19 58 L101 58 Q96 85 60 85 Q24 85 19 58 Z" fill={accent} />
          <path d="M25 73 Q60 81 95 73 Q94 76 93 78.5 Q60 85.5 27 78.5 Q26 76 25 73 Z" fill={beacon} />
          <path d="M19 58 L101 58 Q96 85 60 85 Q24 85 19 58 Z" fill={`url(#${g("hs")})`} />
          <ellipse cx="37" cy="64" rx="11" ry="3" fill="#ffffff" opacity="0.16" />
          <rect x="16.5" y="55" width="87" height="6.4" rx="3.2" fill={accent} />
          <rect x="16.5" y="55" width="87" height="2.5" rx="1.25" fill="#fff" opacity="0.42" />
          <path d="M19 58 L101 58 Q96 85 60 85 Q24 85 19 58 Z" fill="none" stroke={ink} strokeWidth="2.4" strokeLinejoin="round" />

          {/* cheeks */}
          <ellipse cx="44" cy="73" rx="5.4" ry="3.8" fill={`url(#${g("ch")})`} />
          <ellipse cx="76" cy="73" rx="5.4" ry="3.8" fill={`url(#${g("ch")})`} />

          {/* eyes */}
          {sleepy ? (
            <>
              <path d="M45.5 68.5 q5 4 10 0" stroke={ink} strokeWidth="2.4" fill="none" strokeLinecap="round" />
              <path d="M64.5 68.5 q5 4 10 0" stroke={ink} strokeWidth="2.4" fill="none" strokeLinecap="round" />
            </>
          ) : (
            <g className={anim ? "lb-blink" : undefined}>
              <circle cx="51" cy="69" r="3.9" fill={ink} />
              <circle cx="69" cy="69" r="3.9" fill={ink} />
              <circle cx="52.5" cy="67.4" r="1.35" fill="#fff" />
              <circle cx="70.5" cy="67.4" r="1.35" fill="#fff" />
              <circle cx="49.8" cy="70.6" r="0.8" fill="#fff" opacity="0.55" />
              <circle cx="67.8" cy="70.6" r="0.8" fill="#fff" opacity="0.55" />
            </g>
          )}

          {/* mouth */}
          {cheering ? (
            <>
              <path d="M52.5 74 Q60 83 67.5 74 Q60 78 52.5 74 Z" fill={ink} />
              <path d="M55.5 78.6 Q60 81 64.5 78.6" fill={coral} opacity="0.95" />
            </>
          ) : sleepy ? (
            <path d="M55.5 77 q4.5 2.4 9 0" stroke={ink} strokeWidth="2.2" fill="none" strokeLinecap="round" />
          ) : (
            <path d="M53 75 Q60 80.5 67 75" stroke={ink} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          )}
          {sleepy && (
            <>
              <text x="84" y="30" fontSize="9.5" fill={accent} opacity="0.7" fontWeight="700">z</text>
              <text x="90" y="22" fontSize="7" fill={accent} opacity="0.55" fontWeight="700">z</text>
            </>
          )}
        </g>
      </g>

      {/* front wave (overlaps the hull for depth) + foam */}
      <path d="M6 86 Q24 79 42 86 Q54 91 66 86 Q84 79 100 86 Q108 90 114 86 L114 99 L6 99 Z" fill={`url(#${g("wv")})`} />
      <path d="M6 86 Q24 79 42 86 Q54 91 66 86 Q84 79 100 86 Q108 90 114 86" fill="none" stroke={accent} strokeWidth="1.8" strokeLinecap="round" opacity="0.4" />
      <circle cx="30" cy="85.5" r="1.5" fill="#fff" opacity="0.7" />
      <circle cx="86" cy="85.5" r="1.5" fill="#fff" opacity="0.7" />
      <circle cx="60" cy="87.5" r="1.2" fill="#fff" opacity="0.6" />

      {/* sparkles on a cheer */}
      {anim && cheering && (
        <g key={`spark-${cheerKey}`}>
          {[
            { x: 28, y: 28, d: "0s" },
            { x: 92, y: 24, d: "0.12s" },
            { x: 60, y: 3, d: "0.06s" },
            { x: 103, y: 46, d: "0.18s" },
            { x: 15, y: 50, d: "0.1s" },
          ].map((s, i) => (
            <g key={i} className="lb-spark" style={{ animationDelay: s.d, transformBox: "fill-box", transformOrigin: "center" } as React.CSSProperties}>
              <path
                d={`M${s.x} ${s.y - 3.6} L${s.x + 1.3} ${s.y - 1.3} L${s.x + 3.6} ${s.y} L${s.x + 1.3} ${s.y + 1.3} L${s.x} ${s.y + 3.6} L${s.x - 1.3} ${s.y + 1.3} L${s.x - 3.6} ${s.y} L${s.x - 1.3} ${s.y - 1.3} Z`}
                fill={beacon}
              />
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}

/** Pick a mood from the child's day + time (a small brain for the buddy). */
export function buddyMood(opts: { allDone: boolean; night: boolean; justFinished?: boolean }): BuddyMood {
  if (opts.justFinished || opts.allDone) return "cheer";
  if (opts.night) return "sleepy";
  return "happy";
}

/** A warm, on-brand encouragement line from the buddy, tuned to progress. */
export function buddyLine(done: number, total: number, name: string): string {
  if (total === 0) return `Hi ${name}! What shall we do?`;
  if (done >= total) return `You did it, ${name}! I'm so proud 🎉`;
  if (done === 0) return `Ready when you are, ${name}!`;
  const left = total - done;
  if (left === 1) return `Just one more — you've got this!`;
  const pct = done / total;
  if (pct >= 0.6) return `Almost there — keep going!`;
  return `Nice work! ${left} to go.`;
}
