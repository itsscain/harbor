import type { ReactNode } from "react";
import type { ShopItem } from "@/lib/learn/boats";
import { heart, star } from "../art/pen";
import { SvgGlyph } from "../art/Glyph";
import { OL, type Model, type Pt } from "./models";

// What a boat wears: sail patterns, the paint job on the hull, and flags that flutter.

const RAINBOW = ["#ff5d5d", "#ff9f43", "#ffd93d", "#4cd964", "#2fb5ff", "#8b6cff"];
const PAW = "M0 3.2 C-2.6 3.2 -3.6 1 -2.4 -0.6 C-1.4 -1.8 1.4 -1.8 2.4 -0.6 C3.6 1 2.6 3.2 0 3.2 Z";

/** The sail fill: a pattern (or gradient) with id `${id}sp`. Emblem sails (lightning, sunburst)
 *  are a plain color here; their picture is drawn per sail by <SailEmblem>. */
export function SailDefs({ id, sail }: { id: string; sail: ShopItem | undefined }) {
  const a = sail?.color ?? "#ffffff";
  const b = sail?.color2 ?? "#ff7363";
  const pid = `${id}sp`;
  switch (sail?.pattern) {
    case "stripes":
      return (
        <pattern id={pid} width="14" height="14" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" fill={a} />
          <rect width="14" height="7" fill={b} />
        </pattern>
      );
    case "dots":
      return (
        <pattern id={pid} width="14" height="14" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" fill={a} />
          <circle cx="7" cy="7" r="3.2" fill={b} />
        </pattern>
      );
    case "waves":
      return (
        <pattern id={pid} width="20" height="12" patternUnits="userSpaceOnUse">
          <rect width="20" height="12" fill={a} />
          <path d="M0 8 Q5 3 10 8 T20 8" stroke={b} strokeWidth="3" fill="none" />
        </pattern>
      );
    case "stars":
      return (
        <pattern id={pid} width="18" height="18" patternUnits="userSpaceOnUse">
          <rect width="18" height="18" fill={a} />
          <path d={star(9, 9.4, 5.4, 2.4)} fill={b} />
        </pattern>
      );
    case "hearts":
      return (
        <pattern id={pid} width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill={a} />
          <path d={heart(8, 8, 4)} fill={b} />
        </pattern>
      );
    case "paws":
      return (
        <pattern id={pid} width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill={a} />
          <g fill={b} transform="translate(7 9) rotate(-15)">
            <path d={PAW} />
            <circle cx="-3" cy="-3.6" r="1.3" />
            <circle cx="-1" cy="-5.2" r="1.3" />
            <circle cx="1.4" cy="-5.2" r="1.3" />
            <circle cx="3.3" cy="-3.6" r="1.3" />
          </g>
        </pattern>
      );
    case "scales":
      return (
        <pattern id={pid} width="12" height="10" patternUnits="userSpaceOnUse">
          <rect width="12" height="10" fill={a} />
          <path d="M0 10 A6 6 0 0 1 12 10 M-6 5 A6 6 0 0 1 6 5 M6 5 A6 6 0 0 1 18 5" fill="none" stroke={b} strokeWidth="1.6" />
        </pattern>
      );
    case "checker":
      return (
        <pattern id={pid} width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill={a} />
          <rect width="8" height="8" fill={b} />
          <rect x="8" y="8" width="8" height="8" fill={b} />
        </pattern>
      );
    case "rainbow":
      return (
        <linearGradient id={pid} x1="0" y1="0" x2="0" y2="1">
          {RAINBOW.map((c, i) => (
            <stop key={c} offset={`${(i / 5) * 100}%`} stopColor={c} />
          ))}
        </linearGradient>
      );
    default:
      return (
        <pattern id={pid} width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill={a} />
        </pattern>
      );
  }
}

/** A sail's own picture for the emblem sails (a lightning bolt, a sunburst), clipped to it. */
export function SailEmblem({ sail, c, r, color2 }: { sail: ShopItem | undefined; c: Pt; r: number; color2: string }) {
  if (sail?.pattern === "bolt") {
    const [x, y] = c;
    const k = r / 12;
    return (
      <path
        d={`M${x + 2 * k} ${y - 13 * k} L${x - 7 * k} ${y + 1.5 * k} L${x - 0.5 * k} ${y + 1.5 * k} L${x - 3 * k} ${y + 13 * k} L${x + 7.5 * k} ${y - 2.5 * k} L${x + 0.8 * k} ${y - 2.5 * k} Z`}
        fill={color2}
        stroke={OL}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    );
  }
  if (sail?.pattern === "sunburst") {
    const [x, y] = c;
    const rays = Array.from({ length: 10 }, (_, i) => {
      const a0 = (i * Math.PI) / 5;
      const a1 = a0 + Math.PI / 10;
      const R = r * 3;
      return `M${x} ${y} L${(x + Math.cos(a0) * R).toFixed(2)} ${(y + Math.sin(a0) * R).toFixed(2)} L${(x + Math.cos(a1) * R).toFixed(2)} ${(y + Math.sin(a1) * R).toFixed(2)} Z`;
    }).join(" ");
    return (
      <g>
        <path d={rays} fill={color2} opacity="0.8" />
        <circle cx={x} cy={y} r={r * 0.5} fill="#fff3a8" stroke={OL} strokeWidth="1.4" />
      </g>
    );
  }
  return null;
}

/** The paint job, drawn inside the hull's clip. */
export function Paint({ id, item, m }: { id: string; item: ShopItem | undefined; m: Model }) {
  const kind = item?.paint ?? "plain";
  const col = item?.color ?? "#ffffff";
  const { top, bottom } = m.box;
  const mid = (top + bottom) / 2;
  const [bx] = m.bow;
  const out: ReactNode[] = [];
  switch (kind) {
    case "stripe":
      if (m.rail) out.push(<path key="s" d={m.rail} transform="translate(0 7)" fill="none" stroke={col} strokeWidth="6.5" />);
      else out.push(<rect key="s" x="0" y={mid - 3} width="140" height="6.5" fill={col} />);
      break;
    case "waves":
      for (const [k, dy] of [[0, -8.5], [1, -15]] as const)
        out.push(<path key={k} d={`M-10 ${bottom + dy} ${Array.from({ length: 12 }, (_, i) => `Q${-5 + i * 14} ${bottom + dy - 5} ${2 + i * 14} ${bottom + dy} T${16 + i * 14} ${bottom + dy}`).join(" ")}`} fill="none" stroke={col} strokeWidth="3" strokeLinecap="round" opacity={k ? 0.65 : 0.95} />);
      break;
    case "dots":
      out.push(
        <pattern key="p" id={`${id}pd`} width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="6" cy="6" r="2.4" fill={col} />
        </pattern>,
        <rect key="r" x="0" y={top - 4} width="140" height={bottom - top + 8} fill={`url(#${id}pd)`} />,
      );
      break;
    case "stars":
    case "hearts":
      for (let i = 0; i < 9; i++) {
        const x = 18 + i * 13;
        const y = mid + (i % 2 ? 6 : -1);
        out.push(kind === "stars" ? <path key={i} d={star(x, y, 4, 1.8)} fill={col} stroke={OL} strokeWidth="1.1" /> : <path key={i} d={heart(x, y, 3.4)} fill={col} stroke={OL} strokeWidth="1.1" />);
      }
      break;
    case "zebra":
      for (let x = -14; x < 150; x += 13) out.push(<path key={x} d={`M${x} ${top - 4} L${x + 6} ${top - 4} Q${x + 2} ${mid} ${x - 2} ${bottom + 4} L${x - 8} ${bottom + 4} Q${x - 4} ${mid} ${x} ${top - 4} Z`} fill={col} opacity="0.85" />);
      break;
    case "checker":
      out.push(
        <pattern key="p" id={`${id}pc`} width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="5" height="5" fill={col} />
          <rect x="5" y="5" width="5" height="5" fill={col} />
        </pattern>,
        <rect key="r" x="0" y={mid + 1} width="140" height={bottom - mid + 4} fill={`url(#${id}pc)`} opacity="0.9" />,
      );
      break;
    case "rainbow":
      RAINBOW.forEach((c, i) => out.push(<rect key={c} x="0" y={top - 4 + ((bottom - top + 8) / 6) * i} width="140" height={(bottom - top + 8) / 6 + 0.5} fill={c} opacity="0.92" />));
      break;
    case "flames": {
      const y = mid + 2;
      out.push(
        <linearGradient key="g" id={`${id}pf`} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor={item?.color2 ?? "#ff7a2f"} />
          <stop offset="1" stopColor={col} />
        </linearGradient>,
        <path
          key="f"
          d={`M${bx} ${y - 10} Q${bx - 14} ${y - 12} ${bx - 26} ${y - 9} Q${bx - 18} ${y - 5} ${bx - 40} ${y - 2} Q${bx - 20} ${y + 1} ${bx - 34} ${y + 6} Q${bx - 16} ${y + 6} ${bx - 26} ${y + 11} Q${bx - 10} ${y + 10} ${bx} ${y + 12} Z`}
          fill={`url(#${id}pf)`}
          stroke={OL}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />,
      );
      break;
    }
    case "shark": {
      const y = mid + 3;
      const x0 = bx - 30;
      out.push(
        <path key="m" d={`M${x0} ${y - 3} Q${bx - 14} ${y + 2} ${bx - 2} ${y - 6} Q${bx - 10} ${y + 10} ${x0} ${y - 3} Z`} fill="#c41f3b" stroke={OL} strokeWidth="1.8" strokeLinejoin="round" />,
        <path key="t" d={`M${x0 + 3} ${y - 2} ${Array.from({ length: 5 }, (_, i) => `L${x0 + 6 + i * 5} ${y + 2.6 + i * 0.2} L${x0 + 8.5 + i * 5} ${y - 0.6 - i * 0.6}`).join(" ")}`} fill={col} stroke={OL} strokeWidth="1.2" strokeLinejoin="round" />,
        <circle key="e" cx={bx - 26} cy={y - 11} r="4.4" fill="#fff" stroke={OL} strokeWidth="1.8" />,
        <circle key="p" cx={bx - 25} cy={y - 11} r="2.2" fill={OL} />,
      );
      break;
    }
    case "gold":
      if (m.rail) out.push(<path key="r" d={m.rail} transform="translate(0 2)" fill="none" stroke={col} strokeWidth="4" />);
      out.push(<rect key="k" x="0" y={bottom - 6} width="140" height="6" fill={item?.color2 ?? "#e09a00"} />);
      out.push(<path key="c" d={`M${bx - 18} ${mid + 2} q4 -6 8 0 t8 0`} fill="none" stroke={col} strokeWidth="2.4" strokeLinecap="round" />);
      break;
  }
  return <>{out}</>;
}

/** A flag fluttering from a pole top at (x, y), streaming back (left) in the wind. */
export function Flag({ at, item, still, main = true }: { at: Pt; item: ShopItem | undefined; still: boolean; main?: boolean }) {
  const [x, y] = at;
  const color = item?.color ?? "#ff4d5e";
  const cls = still ? undefined : "bt-flag";
  if (!main || item?.id === "flag-pennant") {
    const w = main ? 26 : 14;
    const h = main ? 12 : 7;
    return (
      <g className={cls} style={{ transformOrigin: `${x}px ${y}px` }}>
        <path d={`M${x} ${y} Q${x - w * 0.5} ${y + h * 0.15} ${x - w} ${y + h * 0.5} Q${x - w * 0.5} ${y + h * 0.85} ${x} ${y + h} Z`} fill={main ? color : "#ffd23a"} stroke={OL} strokeWidth={main ? 2.2 : 1.6} strokeLinejoin="round" />
        <circle cx={x} cy={y - 1} r={main ? 2.4 : 1.6} fill="#ffd23a" stroke={OL} strokeWidth="1.4" />
      </g>
    );
  }
  const w = 25;
  const h = 16;
  const cloth = `M${x} ${y} Q${x - w / 2} ${y - 2.6} ${x - w} ${y} L${x - w} ${y + h} Q${x - w / 2} ${y + h - 2.6} ${x} ${y + h} Z`;
  return (
    <g className={cls} style={{ transformOrigin: `${x}px ${y}px` }}>
      <path d={cloth} fill={color} stroke={OL} strokeWidth="2.2" strokeLinejoin="round" />
      {item?.id === "flag-pirate" ? (
        <g>
          <path d={`M${x - 18} ${y + 12} L${x - 7} ${y + 5} M${x - 18} ${y + 5} L${x - 7} ${y + 12}`} stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx={x - 12.5} cy={y + 6.8} r={3.8} fill="#fff" />
          <rect x={x - 14.5} y={y + 9} width={4} height={2.6} rx={0.8} fill="#fff" />
          <circle cx={x - 14} cy={y + 6.6} r={1} fill={color} />
          <circle cx={x - 11} cy={y + 6.6} r={1} fill={color} />
        </g>
      ) : (
        item?.emoji && <SvgGlyph e={item.emoji} x={x - w / 2} y={y + h / 2 - 0.6} size={12.5} />
      )}
      <circle cx={x} cy={y - 1} r={2.4} fill="#ffd23a" stroke={OL} strokeWidth="1.4" />
    </g>
  );
}
