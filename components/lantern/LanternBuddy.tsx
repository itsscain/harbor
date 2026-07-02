"use client";

export type BuddyMood = "happy" | "wave" | "cheer" | "sleepy";

/** Beam — the Lantern's friendly harbor buddy (a little buoy with a warm beacon light).
 *  On-brand (the beacon + buoy from the illustration cast), lovable, and expressive: it
 *  waves hello, cheers when a task is done, and gets sleepy at night. Pure transform/opacity
 *  animation → smooth on a cheap tablet; fully still under reduced motion. */
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
  const sleepy = mood === "sleepy";
  const cheering = mood === "cheer";
  const anim = !reducedMotion;

  return (
    <svg
      viewBox="0 0 100 120"
      role="img"
      aria-label="Beam, the Lantern buddy"
      style={{ width: size, height: (size * 120) / 100, overflow: "visible" }}
    >
      {/* ground shadow */}
      <ellipse cx="50" cy="112" rx="22" ry="4" fill={ink} opacity="0.08" />

      <g key={cheering ? `cheer-${cheerKey}` : "idle"} className={anim && cheering ? "lb-cheer" : undefined}>
        <g className={anim && !sleepy ? "lb-bob" : undefined}>
          {/* beacon light on top */}
          <circle cx="50" cy="15" r="13" fill={beacon} opacity={sleepy ? 0.12 : 0.3} className={anim && !sleepy ? "lb-glow" : undefined} />
          <rect x="46.5" y="20" width="7" height="10" rx="2" fill={accent} />
          <circle cx="50" cy="15" r="6.5" fill={sleepy ? "#e7cf9c" : beacon} />
          {!sleepy && <circle cx="48" cy="13" r="2" fill="#fff" opacity="0.8" />}

          {/* body — a rounded buoy */}
          <path d="M50 28 C33 28 25 43 25 62 C25 85 36 98 50 98 C64 98 75 85 75 62 C75 43 67 28 50 28 Z" fill={accent} />
          {/* beacon stripe */}
          <path d="M27 47 C34 43 66 43 73 47 L71 55 C64 51 36 51 29 55 Z" fill={beacon} opacity="0.85" />
          {/* belly (face panel) */}
          <ellipse cx="50" cy="70" rx="19" ry="20" fill="#fdfbf5" opacity="0.95" />

          {/* arms */}
          <ellipse cx="24" cy="72" rx="5.5" ry="8" fill={accent} />
          <g className={anim && mood === "wave" ? "lb-wave" : undefined}>
            <ellipse cx="76" cy="72" rx="5.5" ry="8" fill={accent} />
          </g>

          {/* cheeks */}
          <circle cx="38" cy="72" r="3.2" fill="#f0997b" opacity="0.5" />
          <circle cx="62" cy="72" r="3.2" fill="#f0997b" opacity="0.5" />

          {/* eyes */}
          {sleepy ? (
            <>
              <path d="M40 66 q3 3 6 0" stroke={ink} strokeWidth="2.4" fill="none" strokeLinecap="round" />
              <path d="M54 66 q3 3 6 0" stroke={ink} strokeWidth="2.4" fill="none" strokeLinecap="round" />
            </>
          ) : (
            <g className={anim ? "lb-blink" : undefined}>
              <circle cx="43" cy="66" r="3.1" fill={ink} />
              <circle cx="57" cy="66" r="3.1" fill={ink} />
              <circle cx="44.2" cy="64.8" r="1" fill="#fff" />
              <circle cx="58.2" cy="64.8" r="1" fill="#fff" />
            </g>
          )}

          {/* mouth */}
          {cheering ? (
            <path d="M42 74 Q50 86 58 74 Z" fill={ink} />
          ) : sleepy ? (
            <path d="M46 76 q4 2 8 0" stroke={ink} strokeWidth="2.2" fill="none" strokeLinecap="round" />
          ) : (
            <path d="M43 74 Q50 80 57 74" stroke={ink} strokeWidth="2.6" fill="none" strokeLinecap="round" />
          )}
          {sleepy && <text x="66" y="40" fontSize="10" fill={accent} opacity="0.7" fontWeight="700">z</text>}
        </g>
      </g>

      {/* sparkles on a cheer */}
      {anim && cheering && (
        <g key={`spark-${cheerKey}`}>
          {[
            { x: 26, y: 40, d: "0s" },
            { x: 74, y: 36, d: "0.12s" },
            { x: 50, y: 24, d: "0.06s" },
            { x: 82, y: 58, d: "0.18s" },
          ].map((s, i) => (
            <g key={i} className="lb-spark" style={{ animationDelay: s.d, transformBox: "fill-box", transformOrigin: "center" } as React.CSSProperties}>
              <path
                d={`M${s.x} ${s.y - 4} L${s.x + 1.4} ${s.y - 1.4} L${s.x + 4} ${s.y} L${s.x + 1.4} ${s.y + 1.4} L${s.x} ${s.y + 4} L${s.x - 1.4} ${s.y + 1.4} L${s.x - 4} ${s.y} L${s.x - 1.4} ${s.y - 1.4} Z`}
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
