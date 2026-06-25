import { cn } from "@/lib/cn";

/**
 * Custom weather glyphs (Brand Identity §8.2 — part of the illustration hand, not
 * emoji or lucide). Two-tone: clouds/rain/fog in currentColor (adapts to the wall),
 * the sun/moon/lightning in beacon gold — the warm light source. Maps WMO weather
 * codes (Open-Meteo) to a small recurring set.
 */

type Cat = "sun" | "moon" | "partly" | "cloud" | "fog" | "drizzle" | "rain" | "snow" | "thunder";

function category(code: number): Cat {
  if (code === 0 || code === 1) return "sun";
  if (code === 2) return "partly";
  if (code === 3) return "cloud";
  if (code === 45 || code === 48) return "fog";
  if ((code >= 51 && code <= 57) || code === 80) return "drizzle";
  if ((code >= 61 && code <= 67) || code === 81) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code === 82 || (code >= 95 && code <= 99)) return "thunder";
  return "cloud";
}

function Sun() {
  return (
    <g className="fill-beacon">
      <circle cx="16" cy="16" r="5.5" />
      <g className="stroke-beacon" strokeWidth="2" strokeLinecap="round">
        <line x1="16" y1="3.5" x2="16" y2="6.5" />
        <line x1="16" y1="25.5" x2="16" y2="28.5" />
        <line x1="3.5" y1="16" x2="6.5" y2="16" />
        <line x1="25.5" y1="16" x2="28.5" y2="16" />
        <line x1="7.2" y1="7.2" x2="9.3" y2="9.3" />
        <line x1="22.7" y1="22.7" x2="24.8" y2="24.8" />
        <line x1="24.8" y1="7.2" x2="22.7" y2="9.3" />
        <line x1="9.3" y1="22.7" x2="7.2" y2="24.8" />
      </g>
    </g>
  );
}

function Moon() {
  return (
    <g className="fill-beacon">
      <path d="M22.5 19.5 A9 9 0 1 1 14 7 A7 7 0 0 0 22.5 19.5 Z" />
    </g>
  );
}

/** A lumpy cloud in currentColor; cx/cy shift it for compositing. */
function Cloud({ y = 0, scale = 1, className }: { y?: number; scale?: number; className?: string }) {
  return (
    <g className={cn("fill-current", className)} transform={`translate(0 ${y}) scale(${scale})`} style={{ transformOrigin: "center" }}>
      <circle cx="11.5" cy="19" r="5" />
      <circle cx="18.5" cy="16.5" r="6.2" />
      <circle cx="23" cy="20" r="4.5" />
      <rect x="8.5" y="19" width="16" height="6" rx="3" />
    </g>
  );
}

export function WeatherGlyph({ code, isDay = 1, className }: { code: number; isDay?: number; className?: string }) {
  const cat = category(code);
  return (
    <svg viewBox="0 0 32 32" fill="none" role="presentation" className={cn("h-7 w-7", className)}>
      {cat === "sun" && (isDay ? <Sun /> : <Moon />)}
      {cat === "partly" && (
        <>
          {isDay ? (
            <g className="fill-beacon">
              <circle cx="21" cy="11" r="4.5" />
            </g>
          ) : (
            <g className="fill-beacon">
              <path d="M25 14 A6 6 0 1 1 19.5 6 A4.6 4.6 0 0 0 25 14 Z" />
            </g>
          )}
          <Cloud y={3} />
        </>
      )}
      {cat === "cloud" && <Cloud />}
      {cat === "fog" && (
        <>
          <Cloud y={-2} />
          <g className="stroke-current opacity-70" strokeWidth="2" strokeLinecap="round">
            <line x1="7" y1="28" x2="20" y2="28" />
            <line x1="12" y1="31" x2="25" y2="31" />
          </g>
        </>
      )}
      {cat === "drizzle" && (
        <>
          <Cloud y={-2} />
          <g className="stroke-current" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="27" x2="11" y2="30" />
            <line x1="20" y1="27" x2="19" y2="30" />
          </g>
        </>
      )}
      {cat === "rain" && (
        <>
          <Cloud y={-2} />
          <g className="stroke-current" strokeWidth="2" strokeLinecap="round">
            <line x1="11" y1="26" x2="9.5" y2="31" />
            <line x1="16" y1="26" x2="14.5" y2="31" />
            <line x1="21" y1="26" x2="19.5" y2="31" />
          </g>
        </>
      )}
      {cat === "snow" && (
        <>
          <Cloud y={-2} />
          <g className="fill-current">
            <circle cx="11" cy="28.5" r="1.4" />
            <circle cx="16.5" cy="29.5" r="1.4" />
            <circle cx="21" cy="28.5" r="1.4" />
          </g>
        </>
      )}
      {cat === "thunder" && (
        <>
          <Cloud y={-2} />
          <path d="M17 25 L12.5 31 H15.5 L13.5 35 L19 28 H16 L18 25 Z" className="fill-beacon" />
        </>
      )}
    </svg>
  );
}
