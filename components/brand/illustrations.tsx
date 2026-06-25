import { cn } from "@/lib/cn";

/**
 * The Harbor illustration cast (Brand Identity §8) — the "hand of the brand."
 * A tight, recurring set of two-tone SVG motifs drawn by the same hand as the
 * lighthouse mark: simple, warm, lightly geometric. Structure uses `currentColor`
 * (so they sit on the dark wall or the light app — set text color in context);
 * the beacon gold is reserved for the literal light/warm focal point (§8.1).
 *
 * Earned warmth: use at meaningful, calm, or celebratory moments — empty states,
 * onboarding ("first voyage"), arrival/celebration, Voyage postcards, marketing —
 * never sprinkled as decoration on every card.
 */

type Props = { className?: string };

/** The Voyage's hero — a little boat sailing home. */
export function Boat({ className }: Props) {
  return (
    <svg viewBox="0 0 64 52" fill="none" role="img" aria-label="Boat" className={cn("h-12 w-12", className)}>
      <g id="sail">
        <path d="M32 6 L32 32 L13 32 Z" className="fill-beacon" />
        <path d="M35 12 L35 32 L49 32 Z" className="fill-current opacity-80" />
      </g>
      <line x1="32" y1="5" x2="32" y2="34" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <g id="hull">
        <path d="M11 36 H53 L47 46 H17 Z" className="fill-current" />
      </g>
      <g id="wake" className="opacity-50">
        <path d="M6 50 q6 -4 12 0 t12 0 t12 0 t12 0" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** Anchor — for the regulation moments (dropping anchor to steady yourself). */
export function AnchorMark({ className }: Props) {
  return (
    <svg viewBox="0 0 48 56" fill="none" role="img" aria-label="Anchor" className={cn("h-12 w-12", className)}>
      <circle cx="24" cy="8" r="5" stroke="currentColor" strokeWidth="3" fill="none" />
      <line x1="24" y1="13" x2="24" y2="46" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
      <line x1="14" y1="20" x2="34" y2="20" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
      <path
        d="M8 30 C8 44 18 49 24 49 C30 49 40 44 40 30"
        stroke="currentColor"
        strokeWidth="3.4"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M5 27 L9 31 L13 26" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M43 27 L39 31 L35 26" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A soft wave run — divider / texture. Set width via className; tiles horizontally. */
export function Waves({ className }: Props) {
  return (
    <svg viewBox="0 0 120 14" fill="none" role="presentation" preserveAspectRatio="none" className={cn("h-3.5 w-full", className)}>
      <path
        d="M0 8 q7.5 -7 15 0 t15 0 t15 0 t15 0 t15 0 t15 0 t15 0 t15 0"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        className="opacity-60"
      />
    </svg>
  );
}

/** A buoy with a small light — accent / wayfinding motif. */
export function Buoy({ className }: Props) {
  return (
    <svg viewBox="0 0 40 56" fill="none" role="img" aria-label="Buoy" className={cn("h-12 w-10", className)}>
      <circle cx="20" cy="8" r="3.5" className="fill-beacon" />
      <line x1="20" y1="11" x2="20" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M11 18 H29 L26 40 H14 Z" className="fill-current" />
      <rect x="10" y="24" width="20" height="4.5" className="fill-beacon opacity-90" />
      <path d="M9 44 q11 -6 22 0 q-11 6 -22 0Z" className="fill-current opacity-50" />
    </svg>
  );
}

/**
 * The composed harbor scene — the hero illustration for empty states, onboarding,
 * and arrival. A lighthouse on a headland, the beacon lit, a boat on calm water.
 */
export function HarborScene({ className }: Props) {
  return (
    <svg viewBox="0 0 200 130" fill="none" role="img" aria-label="A harbor at dusk" className={cn("h-32 w-auto", className)}>
      {/* beacon glow */}
      <circle cx="150" cy="34" r="20" className="fill-beacon opacity-15 animate-beacon" />
      {/* light sweep */}
      <path d="M150 34 L108 26 L108 42 Z" className="fill-beacon opacity-30" />
      {/* lighthouse */}
      <g id="lighthouse">
        <circle cx="150" cy="34" r="6" className="fill-beacon" />
        <path d="M141 42 H159 L163 96 H137 Z" className="fill-current" />
        <rect x="139.5" y="40" width="21" height="4.5" rx="1.8" className="fill-current" />
        <path d="M143 58 H157 L157.6 66 H142.4 Z" className="fill-current opacity-40" />
      </g>
      {/* headland */}
      <path d="M120 96 Q150 86 184 96 L184 104 H120 Z" className="fill-current opacity-70" />
      {/* boat */}
      <g id="boat">
        <path d="M44 78 L44 96 L30 96 Z" className="fill-beacon opacity-90" />
        <path d="M46 84 L46 96 L56 96 Z" className="fill-current opacity-70" />
        <line x1="44" y1="77" x2="44" y2="97" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M28 98 H60 L55 106 H33 Z" className="fill-current" />
      </g>
      {/* water */}
      <g id="water" className="opacity-50">
        <path d="M8 112 q9 -5 18 0 t18 0 t18 0 t18 0 t18 0 t18 0 t18 0 t18 0 t18 0" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <path d="M20 122 q9 -5 18 0 t18 0 t18 0 t18 0 t18 0 t18 0 t18 0" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}
