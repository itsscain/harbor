import { cn } from "@/lib/cn";

/**
 * Harbor's mark system (Brand Identity §3–4). A lighthouse defined by its light:
 * the tower is the body, the beacon is the soul. Layers are named (`tower`,
 * `lantern`, `beacon`, `sweep`, `stripe`, `water`) so the beacon and sweep can be
 * animated/recolored independently — the "living beacon" (§3.5).
 *
 * `tone` selects the §3.4 color variant:
 *  - "auto"  (default) — tower in currentColor, beacon gold. Set text color in
 *               context: text-harbor on light (reversed), text-seafog on dark (primary).
 *  - "gold"  — the all-gold glyph (app-icon / stamp).
 *  - "mono"  — single color throughout (currentColor) for print / faxable collateral.
 */
type Tone = "auto" | "gold" | "mono";

function towerFill(tone: Tone) {
  return tone === "gold" ? "fill-beacon" : "fill-current";
}
function beaconFill(tone: Tone) {
  return tone === "mono" ? "fill-current" : "fill-beacon";
}
function stripeFill(tone: Tone) {
  return tone === "auto" ? "fill-seafog/80" : "fill-current/30";
}

export function LighthouseMark({
  className,
  glow = true,
  tone = "auto",
}: {
  className?: string;
  glow?: boolean;
  tone?: Tone;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="Harbor"
      className={cn("h-8 w-8", className)}
    >
      <g id="sweep">
        {glow && <circle cx="24" cy="15" r="13" className={cn(beaconFill(tone), "opacity-25 animate-beacon")} />}
        <path d="M24 15 L7 9 L7 12 Z" className={cn(beaconFill(tone), "opacity-70")} />
        <path d="M24 15 L41 9 L41 12 Z" className={cn(beaconFill(tone), "opacity-70")} />
      </g>
      <g id="beacon">
        <circle cx="24" cy="15" r="4.2" className={beaconFill(tone)} />
      </g>
      <g id="tower">
        <path d="M18.5 20 H29.5 L31.5 42 H16.5 Z" className={towerFill(tone)} />
        <rect x="17.5" y="19" width="13" height="3.2" rx="1.2" className={towerFill(tone)} />
      </g>
      <g id="stripe">
        <path d="M19.4 27 H28.6 L29 31 H19 Z" className={stripeFill(tone)} />
      </g>
      <g id="water">
        <rect x="12" y="42" width="24" height="2.4" rx="1.2" className={cn(tone === "mono" ? "fill-current/50" : "fill-water/60")} />
      </g>
    </svg>
  );
}

/**
 * The beacon glyph — the light alone (§3.2). The part people see thousands of
 * times; reads cleanly down to 16px (favicon, tight chrome, nav). A bright core
 * with a soft radiating sweep.
 */
export function BeaconGlyph({
  className,
  glow = true,
  tone = "auto",
}: {
  className?: string;
  glow?: boolean;
  tone?: Tone;
}) {
  const fill = tone === "mono" ? "fill-current" : "fill-beacon";
  return (
    <svg viewBox="0 0 32 32" fill="none" role="img" aria-label="Harbor" className={cn("h-6 w-6", className)}>
      {glow && <circle cx="16" cy="16" r="14" className={cn(fill, "opacity-20 animate-beacon")} />}
      {/* four-point light */}
      <g id="sweep">
        <path d="M16 16 L4 13.5 L4 18.5 Z" className={cn(fill, "opacity-70")} />
        <path d="M16 16 L28 13.5 L28 18.5 Z" className={cn(fill, "opacity-70")} />
        <path d="M16 16 L13.5 5 L18.5 5 Z" className={cn(fill, "opacity-55")} />
        <path d="M16 16 L13.5 27 L18.5 27 Z" className={cn(fill, "opacity-55")} />
      </g>
      <g id="beacon">
        <circle cx="16" cy="16" r="5" className={fill} />
      </g>
    </svg>
  );
}

/** Horizontal lockup (§4.2): glyph + wordmark, baseline-aligned. The primary lockup. */
export function Wordmark({ className, tone }: { className?: string; tone?: Tone }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LighthouseMark className="h-7 w-7 text-harbor" tone={tone} />
      <span className="font-display text-xl font-extrabold tracking-tight text-harbor">Harbor</span>
    </span>
  );
}

/** Stacked lockup (§4.2): glyph centered above the wordmark — splash, square contexts. */
export function StackedWordmark({ className, tone }: { className?: string; tone?: Tone }) {
  return (
    <span className={cn("inline-flex flex-col items-center gap-2", className)}>
      <LighthouseMark className="h-12 w-12 text-harbor" tone={tone} />
      <span className="font-display text-2xl font-extrabold tracking-tight text-harbor">Harbor</span>
    </span>
  );
}

/**
 * Harbor Plus lockup (§4.2): the wordmark + a quiet beacon-gold "Plus" in DM Sans
 * 600 — a premium signal, never a loud badge ("cancel anytime, the wall still works").
 */
export function HarborPlusLockup({ className, tone }: { className?: string; tone?: Tone }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LighthouseMark className="h-7 w-7 text-harbor" tone={tone} />
      <span className="font-display text-xl font-extrabold tracking-tight text-harbor">Harbor</span>
      <span className="font-sans text-base font-semibold tracking-tight text-beacon">Plus</span>
    </span>
  );
}
