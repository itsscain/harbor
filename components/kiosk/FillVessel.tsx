import { cn } from "@/lib/cn";

/** A filling lighthouse — the brand's progress-you-can-feel metaphor for goals
 *  (Kiosk Overhaul §10.2 / Brand §11), over a flat bar. Fills with beacon light
 *  from the base; the lantern ignites when the goal is reached. */
export function FillVessel({ pct, reached, className }: { pct: number; reached?: boolean; className?: string }) {
  const p = Math.max(0, Math.min(100, pct));
  const towerTop = 34;
  const towerBottom = 110;
  const fh = ((towerBottom - towerTop) * p) / 100;
  const fillY = towerBottom - fh;
  return (
    <svg viewBox="0 0 80 122" fill="none" role="img" aria-label={`${Math.round(p)}% to goal`} className={cn("h-28 w-auto", className)}>
      <defs>
        <clipPath id="fv-tower">
          <path d="M27 34 H53 L59 110 H21 Z" />
        </clipPath>
      </defs>
      {/* beacon — ignites at goal */}
      {reached && <circle cx="40" cy="18" r="13" className="fill-beacon opacity-25 animate-beacon" />}
      <circle cx="40" cy="18" r="6" className={reached ? "fill-beacon" : "fill-kmute"} style={{ opacity: reached ? 1 : 0.45 }} />
      {/* tower base (empty) */}
      <path d="M27 34 H53 L59 110 H21 Z" className="fill-kraise" />
      {/* the light filling up */}
      <g clipPath="url(#fv-tower)">
        <rect x="0" y={fillY} width="80" height={fh + 4} className="fill-beacon" style={{ transition: "y 0.7s var(--ease-harbor-emphasis), height 0.7s var(--ease-harbor-emphasis)" }} />
      </g>
      {/* outline + lantern room */}
      <path d="M27 34 H53 L59 110 H21 Z" fill="none" className="stroke-kline" strokeWidth="2" />
      <rect x="25" y="30" width="30" height="6" rx="2" className="fill-kraise" />
      <rect x="20.5" y="109" width="39" height="5" rx="2.5" className="fill-water/60" />
    </svg>
  );
}
