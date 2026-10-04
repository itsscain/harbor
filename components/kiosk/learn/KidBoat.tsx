"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";
import { SHOP_BY_ID, type BoatLook } from "@/lib/learn/meta";

// The child's boat — their character on every voyage. Hull color, sail pattern, flag, a pet on
// deck and a trail, all bought with shells in the Harbor Shop. A side view sails the voyage map;
// a top-down view is the boat a child steers in the coding puzzles.

function parts(look: BoatLook) {
  const hull = SHOP_BY_ID.get(look.hull)?.color ?? "#ff7363";
  const sail = SHOP_BY_ID.get(look.sail);
  const flag = SHOP_BY_ID.get(look.flag)?.emoji ?? "🚩";
  const pet = look.pet ? SHOP_BY_ID.get(look.pet)?.emoji ?? null : null;
  const trail = look.trail ? SHOP_BY_ID.get(look.trail)?.emoji ?? null : null;
  return { hull, sail, flag, pet, trail };
}

function SailFill({ id, sail }: { id: string; sail: ReturnType<typeof parts>["sail"] }) {
  const a = sail?.color ?? "#ffffff";
  const b = sail?.color2 ?? "#ff7363";
  switch (sail?.pattern) {
    case "stripes":
      return (
        <pattern id={id} width="14" height="14" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" fill={a} />
          <rect width="14" height="7" fill={b} />
        </pattern>
      );
    case "dots":
      return (
        <pattern id={id} width="14" height="14" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" fill={a} />
          <circle cx="7" cy="7" r="3.2" fill={b} />
        </pattern>
      );
    case "waves":
      return (
        <pattern id={id} width="20" height="12" patternUnits="userSpaceOnUse">
          <rect width="20" height="12" fill={a} />
          <path d="M0 8 Q5 3 10 8 T20 8" stroke={b} strokeWidth="3" fill="none" />
        </pattern>
      );
    case "stars":
      return (
        <pattern id={id} width="18" height="18" patternUnits="userSpaceOnUse">
          <rect width="18" height="18" fill={a} />
          <path d="M9 3 L10.6 7.4 L15 7.4 L11.4 10 L12.8 14.4 L9 11.8 L5.2 14.4 L6.6 10 L3 7.4 L7.4 7.4 Z" fill={b} />
        </pattern>
      );
    case "checker":
      return (
        <pattern id={id} width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill={a} />
          <rect width="8" height="8" fill={b} />
          <rect x="8" y="8" width="8" height="8" fill={b} />
        </pattern>
      );
    case "rainbow":
      return (
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          {["#ff5d5d", "#ff9f43", "#ffd93d", "#4cd964", "#2fb5ff", "#8b6cff"].map((c, i) => (
            <stop key={c} offset={`${(i / 5) * 100}%`} stopColor={c} />
          ))}
        </linearGradient>
      );
    default:
      return (
        <pattern id={id} width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill={a} />
        </pattern>
      );
  }
}

/** Side view: the boat on the voyage map, the home screen and the shop. */
export function SideBoat({ look, size = 120, bob = true, className, showTrail }: { look: BoatLook; size?: number; bob?: boolean; className?: string; showTrail?: boolean }) {
  const id = useId().replace(/:/g, "");
  const p = parts(look);
  return (
    <span className={cn("relative inline-block", bob && "l-bob", className)} style={{ width: size, height: size }}>
      {showTrail && p.trail && (
        <span className="pointer-events-none absolute -left-[38%] bottom-[14%] flex gap-1 opacity-80" aria-hidden style={{ fontSize: size * 0.16 }}>
          <span className="l-pulse">{p.trail}</span>
          <span className="l-pulse" style={{ animationDelay: "0.3s" }}>{p.trail}</span>
        </span>
      )}
      <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden>
        <defs>
          <SailFill id={`s${id}`} sail={p.sail} />
        </defs>
        <ellipse cx="60" cy="104" rx="46" ry="6" fill="rgba(0,40,80,0.18)" />
        {/* mast + sails */}
        <rect x="57" y="18" width="5" height="70" rx="2" fill="#7a4a12" />
        <path d="M62 22 L62 80 L100 80 Q92 48 62 22 Z" fill={`url(#s${id})`} stroke="rgba(0,40,80,0.25)" strokeWidth="2" strokeLinejoin="round" />
        <path d="M56 32 L56 80 L28 80 Q36 56 56 32 Z" fill={`url(#s${id})`} stroke="rgba(0,40,80,0.25)" strokeWidth="2" strokeLinejoin="round" opacity="0.92" />
        {/* hull */}
        <path d="M14 82 L106 82 Q100 102 84 104 L34 104 Q20 100 14 82 Z" fill={p.hull} stroke="rgba(0,0,0,0.2)" strokeWidth="2" strokeLinejoin="round" />
        <path d="M18 88 L102 88" stroke="rgba(255,255,255,0.45)" strokeWidth="3" strokeLinecap="round" />
        <circle cx="40" cy="94" r="3.4" fill="rgba(255,255,255,0.75)" />
        <circle cx="60" cy="94" r="3.4" fill="rgba(255,255,255,0.75)" />
        <circle cx="80" cy="94" r="3.4" fill="rgba(255,255,255,0.75)" />
        {/* flag */}
        <text x="60" y="20" fontSize="20" textAnchor="start">
          {p.flag}
        </text>
        {p.pet && (
          <text x="20" y="82" fontSize="24">
            {p.pet}
          </text>
        )}
      </svg>
    </span>
  );
}

/** Top-down view (bow pointing right): the boat a child steers in the coding puzzles. */
export function TopBoat({ look, size = 64 }: { look: BoatLook; size?: number }) {
  const id = useId().replace(/:/g, "");
  const p = parts(look);
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
      <defs>
        <SailFill id={`t${id}`} sail={p.sail} />
      </defs>
      <ellipse cx="50" cy="56" rx="44" ry="26" fill="rgba(0,40,80,0.18)" />
      <path d="M8 50 Q8 26 40 24 L70 24 Q92 30 96 50 Q92 70 70 76 L40 76 Q8 74 8 50 Z" fill={p.hull} stroke="rgba(0,0,0,0.25)" strokeWidth="3" strokeLinejoin="round" />
      <path d="M18 50 Q18 34 42 32 L68 32 Q84 37 87 50 Q84 63 68 68 L42 68 Q18 66 18 50 Z" fill="#f4dfb8" />
      <path d="M44 30 Q66 50 44 70 L50 70 Q74 50 50 30 Z" fill={`url(#t${id})`} stroke="rgba(0,40,80,0.3)" strokeWidth="2" />
      <circle cx="50" cy="50" r="4.5" fill="#7a4a12" />
      <path d="M92 50 L84 44 L84 56 Z" fill="rgba(255,255,255,0.85)" />
      {p.pet && (
        <text x="18" y="58" fontSize="20">
          {p.pet}
        </text>
      )}
    </svg>
  );
}
