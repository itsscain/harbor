"use client";

import { useId, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { SHOP_BY_ID, lookFrom, modelOf, type BoatLook } from "@/lib/learn/boats";
import { SvgGlyph } from "../art/Glyph";
import { partInner } from "./gear";
import { MODELS, OL, type Ctx, type Pt } from "./models";
import { Flag, Paint, SailDefs, SailEmblem } from "./skin";
import { Pet, type PetReact } from "./Pet";

// The child's boat — their character on every voyage. Side view (map, home, lessons, Shipyard)
// and top view (the coding puzzles). Everything about it comes from the BoatLook: the model, hull
// color, paint job, sails, flag, figurehead, deck gear, a living pet and a trail.

/** A hex color lightened (amt > 0) or darkened (amt < 0). */
export function shade(hex: string, amt: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(amt > 0 ? v + (255 - v) * amt : v * (1 + amt))));
  return `#${[n >> 16, (n >> 8) & 255, n & 255].map((v) => ch(v).toString(16).padStart(2, "0")).join("")}`;
}

/** Where a gear board (40×40) fixes to the boat, and how big it is there. */
const GEAR_FIT: Record<string, { at: Pt; k: number }> = {
  "gear-ring": { at: [20, 20], k: 19 / 40 },
  "gear-anchor": { at: [20, 4], k: 23 / 40 },
  "gear-nest": { at: [20, 22], k: 31 / 40 },
};
function GearPart({ id, spot }: { id: string; spot: Pt }) {
  const inner = partInner(id);
  if (!inner) return null;
  const fit = GEAR_FIT[id] ?? { at: [20, 38] as Pt, k: 26 / 40 };
  return <g transform={`translate(${spot[0] - fit.at[0] * fit.k} ${spot[1] - fit.at[1] * fit.k}) scale(${fit.k})`} dangerouslySetInnerHTML={{ __html: inner }} />;
}

/** Party flags strung from the masthead down to the bow. */
function Bunting({ from, to }: { from: Pt; to: Pt }) {
  const [x0, y0] = from;
  const [x1, y1] = to;
  const cx = (x0 + x1) / 2;
  const cy = Math.max(y0, y1) + 4;
  const colors = ["#ff5d5d", "#ffd93d", "#4cd964", "#2fb5ff", "#8b6cff", "#ff9f43"];
  const pts = Array.from({ length: 7 }, (_, i) => {
    const t = (i + 0.5) / 7;
    const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
    const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
    return [Math.round(x * 100) / 100, Math.round(y * 100) / 100] as Pt;
  });
  return (
    <g>
      <path d={`M${x0} ${y0} Q${cx} ${cy} ${x1} ${y1}`} fill="none" stroke={OL} strokeWidth="1.4" />
      {pts.map(([x, y], i) => (
        <path key={i} d={`M${x - 3} ${y} L${x + 3} ${y} L${x} ${y + 6} Z`} fill={colors[i % colors.length]} stroke={OL} strokeWidth="1" strokeLinejoin="round" />
      ))}
    </g>
  );
}

export type SideBoatProps = {
  look: BoatLook;
  size?: number;
  bob?: boolean;
  className?: string;
  style?: CSSProperties;
  /** The trail it leaves behind (map, home, lessons). */
  showTrail?: boolean;
  /** Float it in a band of sea (the hull sits in the water). */
  sea?: boolean;
  /** Dusk/night: windows and the lantern glow, the pet dozes. */
  night?: boolean;
  /** No moving parts (catalog thumbnails). */
  still?: boolean;
  /** The pet cheers / tilts its head (re-key per answer). */
  petReact?: PetReact;
  /** Tapping the pet plays its tricks. */
  petTappable?: boolean;
  /** Something extra drawn on top (Sail mode's splashes). */
  children?: ReactNode;
};

/** Side view, bow to the right. */
export function SideBoat({ look: rawLook, size = 120, bob = true, className, style, showTrail, sea, night = false, still = false, petReact, petTappable, children }: SideBoatProps) {
  const id = useId().replace(/:/g, "");
  const look = lookFrom(rawLook);
  const m = MODELS[modelOf(look)];
  const hull = SHOP_BY_ID.get(look.hull)?.color ?? "#ff7363";
  const sail = SHOP_BY_ID.get(look.sail);
  const c: Ctx = {
    id,
    hull,
    hullHi: shade(hull, 0.28),
    hullLo: shade(hull, -0.3),
    sailFill: `url(#${id}sp)`,
    sail: sail?.color ?? "#ffffff",
    sail2: sail?.color2 ?? "#ff7363",
    night,
    still,
  };
  const trail = look.trail ? SHOP_BY_ID.get(look.trail)?.emoji : null;
  const gear = look.deck.map((g) => SHOP_BY_ID.get(g)!).filter(Boolean);
  const at = (spot: keyof typeof m.spots) => m.spots[spot];
  const onDeck = gear.filter((g) => g.spot === "bow" || g.spot === "mid" || g.spot === "stern");
  const hasLantern = look.deck.includes("gear-lantern");
  return (
    <span className={cn("relative inline-block", bob && !still && "l-bob", className)} style={{ width: size, height: size, ...style }}>
      <svg viewBox="0 0 140 140" width={size} height={size} overflow="visible" aria-hidden className={still ? "boat-still" : undefined}>
        <defs>
          <SailDefs id={id} sail={sail} />
          <linearGradient id={`${id}hg`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={c.hullHi} />
            <stop offset="0.55" stopColor={hull} />
            <stop offset="1" stopColor={c.hullLo} />
          </linearGradient>
          <radialGradient id={`${id}hb`} cx="0.35" cy="0.3" r="0.85">
            <stop offset="0" stopColor={c.hullHi} />
            <stop offset="0.6" stopColor={hull} />
            <stop offset="1" stopColor={c.hullLo} />
          </radialGradient>
          <linearGradient id={`${id}ss`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#000" stopOpacity="0.14" />
            <stop offset="0.6" stopColor="#000" stopOpacity="0" />
          </linearGradient>
          <clipPath id={`${id}hc`}>
            <path d={m.hull} />
          </clipPath>
          <radialGradient id={`${id}lg`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fff2a8" stopOpacity="0.95" />
            <stop offset="1" stopColor="#ffd23a" stopOpacity="0" />
          </radialGradient>
        </defs>

        {!sea && <ellipse cx="72" cy="127" rx="54" ry="5.5" fill="rgba(0,40,80,0.16)" />}
        {/* The trail, drifting away behind the stern. */}
        {showTrail && trail && !still && (
          <g pointerEvents="none">
            {[0, 0.5, 1, 1.4].map((delay, i) => (
              <g key={i} className="bt-trail" style={{ animationDelay: `${delay}s`, transformOrigin: "10px 110px" }}>
                <SvgGlyph e={trail} x={8 - (i % 2) * 4} y={110 - (i % 3) * 5} size={13 - (i % 2) * 3} />
              </g>
            ))}
          </g>
        )}

        <g className={bob && !still ? "bt-bob" : undefined} style={{ transformOrigin: "70px 112px" }}>
          {m.back?.(c)}
          {m.rig?.(c)}
          {/* Sails: the pattern, a touch of shade, the outline — billowing in the wind. */}
          {m.sails.map((s, i) => (
            <g key={i} className={still ? undefined : "bt-sail"} style={{ transformOrigin: `${s.o[0]}px ${s.o[1]}px`, animationDelay: `${i * 0.3}s` }}>
              <path d={s.d} fill={c.sailFill} stroke={OL} strokeWidth="2.4" strokeLinejoin="round" />
              {(sail?.pattern === "bolt" || sail?.pattern === "sunburst") && (
                <g clipPath={`url(#${id}sc${i})`}>
                  <clipPath id={`${id}sc${i}`}>
                    <path d={s.d} />
                  </clipPath>
                  <SailEmblem sail={sail} c={s.c} r={s.r} color2={c.sail2} />
                </g>
              )}
              <path d={s.d} fill={`url(#${id}ss)`} />
              <path d={s.d} fill="none" stroke={OL} strokeWidth="2.4" strokeLinejoin="round" />
            </g>
          ))}
          {look.deck.includes("gear-nest") && <GearPart id="gear-nest" spot={at("mast")} />}
          {look.deck.includes("gear-bunting") && <Bunting from={[m.flags[0][0], m.flags[0][1] + 12]} to={[m.bow[0] - 2, m.bow[1] - 2]} />}
          {/* On deck (behind the hull's top edge): gear, a glowing lantern, the pet. */}
          {hasLantern && night && <circle cx={at("stern")[0]} cy={at("stern")[1] - 12} r="16" fill={`url(#${id}lg)`} className={still ? undefined : "bt-glow"} />}
          {onDeck.map((g) => (
            <GearPart key={g.id} id={g.id} spot={g.id === "gear-anchor" ? [m.bow[0] - 9, m.bow[1] + 6] : at(g.spot!)} />
          ))}
          {look.pet && <Pet id={look.pet} size={m.petSize} x={m.pet[0] - m.petSize / 2} y={m.pet[1] - m.petSize * 0.92} mood={night ? "sleep" : "idle"} react={petReact} tappable={petTappable} still={still} />}
          {/* The hull: shaded color, its paint job, a light rail and a shine. */}
          <path d={m.hull} fill={`url(#${id}hg)`} />
          <g clipPath={`url(#${id}hc)`}>
            <Paint id={id} item={SHOP_BY_ID.get(look.paint)} m={m} />
          </g>
          {m.rail && <path d={m.rail} fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" />}
          <path d={m.hull} fill="none" stroke={OL} strokeWidth="3" strokeLinejoin="round" />
          <ellipse cx={m.spots.stern[0] + 10} cy={m.box.top + 5} rx="9" ry="2" fill="#fff" opacity="0.45" />
          {m.details?.(c)}
          {m.front?.(c)}
          {look.figure && !m.noFigure && <FigurePart id={look.figure} bow={m.bow} />}
          {look.deck.includes("gear-ring") && <GearPart id="gear-ring" spot={at("side")} />}
          {m.flags.map((f, i) => (
            <Flag key={i} at={f} item={i === 0 ? SHOP_BY_ID.get(look.flag) : undefined} main={i === 0} still={still} />
          ))}
          {children}
        </g>

        {sea && (
          <g pointerEvents="none" mask={`url(#${id}sf)`}>
            <mask id={`${id}sf`} maskUnits="userSpaceOnUse" x="-40" y="100" width="220" height="50">
              <rect x="-40" y="100" width="220" height="50" fill={`url(#${id}sg)`} />
            </mask>
            <linearGradient id={`${id}sg`} gradientUnits="userSpaceOnUse" x1="-40" y1="0" x2="180" y2="0">
              <stop offset="0" stopColor="#000" />
              <stop offset="0.22" stopColor="#fff" />
              <stop offset="0.78" stopColor="#fff" />
              <stop offset="1" stopColor="#000" />
            </linearGradient>
            <g className={still ? undefined : "bt-water"}>
              <path d={`M-30 115 ${Array.from({ length: 11 }, (_, i) => `Q${-20 + i * 20} 111 ${-10 + i * 20} 115 T${10 + i * 20} 115`).join(" ")} V146 H-30 Z`} fill="#1d93cf" opacity="0.62" />
              <path d={`M-30 115 ${Array.from({ length: 11 }, (_, i) => `Q${-20 + i * 20} 111 ${-10 + i * 20} 115 T${10 + i * 20} 115`).join(" ")}`} fill="none" stroke="#fff" strokeOpacity="0.75" strokeWidth="2.2" />
            </g>
            <ellipse cx={m.bow[0] - 4} cy="114" rx="7" ry="2.4" fill="#fff" opacity="0.85" className={still ? undefined : "bt-foam"} style={{ transformOrigin: `${m.bow[0] - 4}px 114px` }} />
          </g>
        )}
      </svg>
    </span>
  );
}

function FigurePart({ id, bow }: { id: string; bow: Pt }) {
  const inner = partInner(id);
  if (!inner) return null;
  const k = 32 / 40;
  return <g transform={`translate(${bow[0] - 10 * k} ${bow[1] - 30 * k}) scale(${k})`} dangerouslySetInnerHTML={{ __html: inner }} />;
}

/** Top view (bow pointing right): the boat a child steers in the coding puzzles. */
export function TopBoat({ look: rawLook, size = 64 }: { look: BoatLook; size?: number }) {
  const id = useId().replace(/:/g, "");
  const look = lookFrom(rawLook);
  const model = modelOf(look);
  const hull = SHOP_BY_ID.get(look.hull)?.color ?? "#ff7363";
  const sail = SHOP_BY_ID.get(look.sail);
  const hi = shade(hull, 0.3);
  const lo = shade(hull, -0.3);
  const fillH = `url(#${id}th)`;
  const deck = "#f4dfb8";
  const sailF = `url(#${id}sp)`;
  const mastDot = (x: number, y = 50, r = 4) => <circle key={`m${x}`} cx={x} cy={y} r={r} fill="#a0652c" stroke={OL} strokeWidth="1.8" />;
  const boomSail = (x: number, len: number, w: number, key: string) => <path key={key} d={`M${x} 50 Q${x - len * 0.5} ${50 - w} ${x - len} 50 Q${x - len * 0.5} ${50 + w * 0.35} ${x} 50 Z`} fill={sailF} stroke={OL} strokeWidth="2" strokeLinejoin="round" />;
  let body: ReactNode;
  switch (model) {
    case "catamaran":
      body = (
        <>
          {[30, 70].map((y) => (
            <path key={y} d={`M8 ${y} Q10 ${y - 9} 40 ${y - 9} L74 ${y - 8} Q94 ${y - 6} 96 ${y} Q94 ${y + 6} 74 ${y + 8} L40 ${y + 9} Q10 ${y + 9} 8 ${y} Z`} fill={fillH} stroke={OL} strokeWidth="2.6" strokeLinejoin="round" />
          ))}
          <rect x="26" y="34" width="46" height="32" rx="4" fill="#e8d2a6" stroke={OL} strokeWidth="2" />
          <path d="M30 40 L68 60 M30 60 L68 40 M30 50 L68 50" stroke={OL} strokeOpacity="0.3" strokeWidth="1.4" />
          {boomSail(60, 40, 14, "s")}
          {mastDot(60)}
        </>
      );
      break;
    case "tug":
      body = (
        <>
          <path d="M8 50 Q8 22 38 20 L66 20 Q94 26 97 50 Q94 74 66 80 L38 80 Q8 78 8 50 Z" fill={fillH} stroke={OL} strokeWidth="3" strokeLinejoin="round" />
          <path d="M16 50 Q16 30 40 28 L64 28 Q86 33 88 50 Q86 67 64 72 L40 72 Q16 70 16 50 Z" fill={deck} stroke={OL} strokeWidth="2" />
          <rect x="42" y="34" width="30" height="32" rx="4" fill="#f4f7fb" stroke={OL} strokeWidth="2.2" />
          <rect x="44" y="36" width="26" height="28" rx="3" fill={sail?.color ?? "#ffffff"} opacity="0.55" />
          <circle cx="30" cy="50" r="8" fill="#3d4360" stroke={OL} strokeWidth="2" />
          <circle cx="30" cy="50" r="4.5" fill={sailF} stroke={OL} strokeWidth="1.4" />
        </>
      );
      break;
    case "paddle":
      body = (
        <>
          <rect x="4" y="30" width="14" height="40" rx="3" fill={hull} stroke={OL} strokeWidth="2.2" />
          {[36, 44, 52, 60].map((y) => (
            <path key={y} d={`M4 ${y} L18 ${y}`} stroke={OL} strokeWidth="1.6" />
          ))}
          <path d="M16 50 Q16 26 42 24 L70 24 Q94 30 97 50 Q94 70 70 76 L42 76 Q16 74 16 50 Z" fill={fillH} stroke={OL} strokeWidth="3" strokeLinejoin="round" />
          <rect x="26" y="32" width="56" height="36" rx="5" fill="#f4f7fb" stroke={OL} strokeWidth="2.2" />
          {[44, 62].map((x) => (
            <g key={x}>
              <circle cx={x} cy="50" r="7" fill="#3d4360" stroke={OL} strokeWidth="2" />
              <circle cx={x} cy="50" r="3.6" fill={sailF} />
            </g>
          ))}
        </>
      );
      break;
    case "viking":
      body = (
        <>
          <path d="M4 50 Q6 34 30 32 L76 32 Q96 36 99 50 Q96 64 76 68 L30 68 Q6 66 4 50 Z" fill={fillH} stroke={OL} strokeWidth="3" strokeLinejoin="round" />
          <path d="M12 50 Q14 40 32 39 L74 39 Q90 42 92 50 Q90 58 74 61 L32 61 Q14 60 12 50 Z" fill={deck} stroke={OL} strokeWidth="2" />
          {[26, 38, 50, 62, 74].flatMap((x, i) => [
            <circle key={`a${x}`} cx={x} cy={33.5} r={4.4} fill={i % 2 ? sail?.color2 ?? "#ff7363" : sail?.color ?? "#fff"} stroke={OL} strokeWidth="1.6" />,
            <circle key={`b${x}`} cx={x} cy={66.5} r={4.4} fill={i % 2 ? sail?.color ?? "#fff" : sail?.color2 ?? "#ff7363"} stroke={OL} strokeWidth="1.6" />,
          ])}
          <rect x="47" y="24" width="8" height="52" rx="3" fill={sailF} stroke={OL} strokeWidth="2" />
          {mastDot(51)}
        </>
      );
      break;
    case "duck":
      body = (
        <>
          <path d="M8 50 Q6 30 30 28 L66 30 Q84 32 86 50 Q84 68 66 70 L30 72 Q6 70 8 50 Z" fill={fillH} stroke={OL} strokeWidth="3" strokeLinejoin="round" />
          <path d="M20 40 Q36 36 50 44 Q36 52 20 48 Z M20 60 Q36 64 50 56 Q36 48 20 52 Z" fill={lo} opacity="0.5" />
          <circle cx="80" cy="50" r="14" fill={fillH} stroke={OL} strokeWidth="2.8" />
          <path d="M91 44 Q101 48 101 50 Q101 52 91 56 Z" fill="#ff9f43" stroke={OL} strokeWidth="2" strokeLinejoin="round" />
          <circle cx="84" cy="44" r="2" fill={OL} />
          <circle cx="84" cy="56" r="2" fill={OL} />
        </>
      );
      break;
    case "galleon":
      body = (
        <>
          <path d="M4 50 Q4 22 34 20 L72 21 Q96 28 99 50 Q96 72 72 79 L34 80 Q4 78 4 50 Z" fill={fillH} stroke={OL} strokeWidth="3" strokeLinejoin="round" />
          <path d="M14 50 Q14 30 36 28 L70 29 Q88 34 90 50 Q88 66 70 71 L36 72 Q14 70 14 50 Z" fill={deck} stroke={OL} strokeWidth="2" />
          <rect x="10" y="30" width="16" height="40" rx="3" fill={lo} stroke={OL} strokeWidth="2" />
          {[36, 56, 76].map((x, i) => (
            <rect key={x} x={x - 3} y={28 + i} width="6" height={44 - i * 2} rx="2.4" fill={sailF} stroke={OL} strokeWidth="1.8" />
          ))}
          {[36, 56, 76].map((x) => mastDot(x, 50, 3.2))}
        </>
      );
      break;
    default: {
      const two = model === "schooner";
      body = (
        <>
          <path d="M8 50 Q8 26 40 24 L70 24 Q92 30 96 50 Q92 70 70 76 L40 76 Q8 74 8 50 Z" fill={fillH} stroke={OL} strokeWidth="3" strokeLinejoin="round" />
          <path d="M18 50 Q18 34 42 32 L68 32 Q84 37 87 50 Q84 63 68 68 L42 68 Q18 66 18 50 Z" fill={deck} stroke={OL} strokeWidth="2" />
          {two ? [boomSail(44, 28, 12, "a"), boomSail(70, 22, 10, "b")] : boomSail(54, 34, 14, "a")}
          {two ? [mastDot(44, 50, 3.6), mastDot(70, 50, 3.6)] : mastDot(54)}
        </>
      );
    }
  }
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden overflow="visible">
      <defs>
        <SailDefs id={id} sail={sail} />
        <radialGradient id={`${id}th`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor={hi} />
          <stop offset="0.6" stopColor={hull} />
          <stop offset="1" stopColor={lo} />
        </radialGradient>
      </defs>
      <ellipse cx="52" cy="58" rx="46" ry="27" fill="rgba(0,40,80,0.18)" />
      {body}
      <path d="M93 50 L86 45 L86 55 Z" fill="rgba(255,255,255,0.9)" />
      {look.pet && <Pet id={look.pet} size={26} x={14} y={30} still />}
    </svg>
  );
}
