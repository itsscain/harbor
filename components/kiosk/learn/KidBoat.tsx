"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";
import { SHOP_BY_ID, type BoatLook } from "@/lib/learn/meta";
import { Glyph, SvgGlyph } from "./art/Glyph";

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

const OL = "#2a2f45";
/** A hex color lightened (amt > 0) or darkened (amt < 0). */
function shade(hex: string, amt: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(amt > 0 ? v + (255 - v) * amt : v * (1 + amt))));
  return `#${[n >> 16, (n >> 8) & 255, n & 255].map((v) => ch(v).toString(16).padStart(2, "0")).join("")}`;
}

/** Side view: the boat on the voyage map, the home screen and the shop — drawn in the house style
 *  (navy outline, light from the top-left), with its flag and pet as drawings. */
export function SideBoat({ look, size = 120, bob = true, className, showTrail }: { look: BoatLook; size?: number; bob?: boolean; className?: string; showTrail?: boolean }) {
  const id = useId().replace(/:/g, "");
  const p = parts(look);
  return (
    <span className={cn("relative inline-block", bob && "l-bob", className)} style={{ width: size, height: size }}>
      {showTrail && p.trail && (
        <span className="pointer-events-none absolute -left-[36%] bottom-[12%] flex gap-1 opacity-90" aria-hidden>
          <Glyph e={p.trail} size={size * 0.2} className="l-pulse" />
          <Glyph e={p.trail} size={size * 0.15} className="l-pulse self-end" style={{ animationDelay: "0.3s" }} />
        </span>
      )}
      <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden>
        <defs>
          <SailFill id={`s${id}`} sail={p.sail} />
          <linearGradient id={`h${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={shade(p.hull, 0.25)} />
            <stop offset="0.55" stopColor={p.hull} />
            <stop offset="1" stopColor={shade(p.hull, -0.28)} />
          </linearGradient>
          <linearGradient id={`l${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#000" stopOpacity="0.12" />
            <stop offset="0.6" stopColor="#000" stopOpacity="0" />
          </linearGradient>
        </defs>
        <ellipse cx="60" cy="106" rx="46" ry="5.5" fill="rgba(0,40,80,0.18)" />
        {/* Mast, then the sails (pattern + a touch of shade + the navy outline). */}
        <rect x="56.5" y="16" width="6" height="72" rx="3" fill="#a0652c" stroke={OL} strokeWidth="2.5" />
        <path d="M63 21 L63 80 L101 80 Q93 47 63 21 Z" fill={`url(#s${id})`} stroke={OL} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M63 21 L63 80 L101 80 Q93 47 63 21 Z" fill={`url(#l${id})`} />
        <path d="M56 31 L56 80 L27 80 Q35 55 56 31 Z" fill={`url(#s${id})`} stroke={OL} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M68 34 Q80 48 86 64" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* The hull: shaded, a white stripe, portholes, a shine. */}
        <path d="M13 82 L107 82 Q101 103 84 105 L34 105 Q19 101 13 82 Z" fill={`url(#h${id})`} stroke={OL} strokeWidth="3" strokeLinejoin="round" />
        <path d="M17.5 89 L102.5 89" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="3.5" strokeLinecap="round" />
        {[40, 60, 80].map((x) => (
          <circle key={x} cx={x} cy="96" r="3.6" fill="#bfe8ff" stroke={OL} strokeWidth="1.8" />
        ))}
        <ellipse cx="30" cy="85.5" rx="9" ry="2" fill="#ffffff" opacity="0.55" />
        {/* The flag on top of the mast, and a pet on deck. */}
        <SvgGlyph e={p.flag} x={70} y={13} size={22} />
        {p.pet && <SvgGlyph e={p.pet} x={24} y={70} size={28} />}
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
        <radialGradient id={`th${id}`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor={shade(p.hull, 0.3)} />
          <stop offset="0.6" stopColor={p.hull} />
          <stop offset="1" stopColor={shade(p.hull, -0.3)} />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="57" rx="44" ry="26" fill="rgba(0,40,80,0.18)" />
      <path d="M8 50 Q8 26 40 24 L70 24 Q92 30 96 50 Q92 70 70 76 L40 76 Q8 74 8 50 Z" fill={`url(#th${id})`} stroke={OL} strokeWidth="3" strokeLinejoin="round" />
      <path d="M18 50 Q18 34 42 32 L68 32 Q84 37 87 50 Q84 63 68 68 L42 68 Q18 66 18 50 Z" fill="#f4dfb8" stroke={OL} strokeWidth="2" />
      <path d="M44 30 Q66 50 44 70 L50 70 Q74 50 50 30 Z" fill={`url(#t${id})`} stroke={OL} strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="50" cy="50" r="4.5" fill="#a0652c" stroke={OL} strokeWidth="1.8" />
      <path d="M92 50 L84 44 L84 56 Z" fill="rgba(255,255,255,0.9)" />
      <ellipse cx="30" cy="34" rx="10" ry="3" fill="#ffffff" opacity="0.4" transform="rotate(-12 30 34)" />
      {p.pet && <SvgGlyph e={p.pet} x={26} y={52} size={24} />}
    </svg>
  );
}
