"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { ShapeName, Visual as V } from "@/lib/learn/types";
import { emojisIn, isEmoji } from "../art";
import { Glyph, GlyphRow, WithGlyphs } from "../art/Glyph";

// The pictures an item shows — one renderer for all of math, reading and manners: picture scenes,
// counting groups, ten-frames, number lines, clocks, coins, base-ten blocks, fractions, arrays,
// shapes, patterns, graphs, rulers, grids, angles, words and passages. Everything is big, drawn
// (never the emoji font) and high-contrast, sized for a wall tablet and a five-year-old across
// the room.

const INK = "var(--l-ink)";

export function Visual({ v, size = "md", className }: { v: V; size?: "sm" | "md" | "lg"; className?: string }) {
  const k = size === "sm" ? 0.55 : size === "lg" ? 1.2 : 1;
  return <div className={cn("flex items-center justify-center", className)}>{render(v, k)}</div>;
}

function render(v: V, k: number): ReactNode {
  switch (v.type) {
    case "emoji": {
      const px = (v.size === "xl" ? 160 : v.size === "lg" ? 120 : 86) * k;
      return <GlyphRow s={v.emoji} size={px} className="l-pop-in" />;
    }
    case "scene": {
      // A scene is a few pictures side by side — sized so they always sit on one line.
      const n = Math.max(1, emojisIn(v.emoji).length);
      return (
        <div className="flex flex-col items-center gap-2">
          <GlyphRow s={v.emoji} size={Math.min(128, 330 / n) * k} gap={0.04} />
          {v.caption && <span className="font-display text-xl font-bold text-[var(--l-ink-2)]">{v.caption}</span>}
        </div>
      );
    }
    case "count":
      return <Things emoji={v.emoji} n={v.n} k={k} />;
    case "groups":
      return (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {v.groups.map((g, i) => (
            <span key={i} className="contents">
              {i > 0 && v.op && <span className="font-display font-extrabold" style={{ fontSize: 56 * k, color: INK }}>{v.op === "-" ? "−" : v.op}</span>}
              <span className={cn("rounded-[22px] bg-[var(--l-card-2)] p-3", v.op === "-" && i === 1 && "opacity-70")}>
                <Things emoji={g.emoji} n={g.n} k={k * 0.8} crossed={v.op === "-" && i === 1} />
              </span>
            </span>
          ))}
        </div>
      );
    case "tenframe":
      return (
        <div className="flex flex-col gap-3">
          {Array.from({ length: v.frames ?? 1 }, (_, f) => (
            <div key={f} className="grid grid-cols-5 gap-1.5 rounded-2xl bg-[var(--l-ink)] p-1.5">
              {Array.from({ length: 10 }, (_, i) => {
                const on = f * 10 + i < v.n;
                return (
                  <span key={i} className="flex items-center justify-center rounded-lg bg-white" style={{ width: 58 * k, height: 58 * k }}>
                    {on && <span className="rounded-full" style={{ width: 40 * k, height: 40 * k, background: f === 0 ? "var(--l-coral)" : "var(--l-blue)", boxShadow: "inset 0 -4px 0 rgba(0,0,0,0.15)" }} />}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      );
    case "numberline":
      return <NumberLine v={v} k={k} />;
    case "clock":
      return <Clock h={v.h} m={v.m} px={220 * k} />;
    case "coins":
      return (
        <div className="flex flex-wrap items-center justify-center gap-2" style={{ maxWidth: 560 * k }}>
          {v.coins.map((c, i) => (
            <Coin key={i} c={c} k={k} />
          ))}
        </div>
      );
    case "blocks":
      return <Blocks h={v.h} t={v.t} o={v.o} k={k} />;
    case "fraction":
      return <Fraction num={v.num} den={v.den} shape={v.shape} px={180 * k} />;
    case "array":
      return (
        <div className="inline-grid gap-1 rounded-2xl bg-[var(--l-card-2)] p-3" style={{ gridTemplateColumns: `repeat(${v.cols}, auto)` }}>
          {Array.from({ length: v.rows * v.cols }, (_, i) => (
            <Glyph key={i} e={v.emoji} size={Math.max(30, 60 - v.cols * 3) * k} />
          ))}
        </div>
      );
    case "shape":
      return <Shape shape={v.shape} color={v.color ?? "#1cb0f6"} px={170 * k} />;
    case "pattern":
      return (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {v.items.map((it, i) => {
            const pic = isEmoji(it) && emojisIn(it).length === 1;
            return (
              <span
                key={i}
                className={cn("flex items-center justify-center rounded-2xl font-display font-extrabold", i === v.blank ? "border-4 border-dashed border-[var(--l-gold)] bg-white/70 text-[var(--l-gold-edge)]" : "bg-[var(--l-card-2)]")}
                style={{ minWidth: 76 * k, height: 76 * k, fontSize: (it.length > 2 ? 30 : 44) * k, padding: pic ? 6 * k : "0 10px", color: INK }}
              >
                {i === v.blank ? "?" : pic ? <Glyph e={it} size={60 * k} /> : <WithGlyphs text={it} />}
              </span>
            );
          })}
        </div>
      );
    case "equation":
      return <span className="font-display font-extrabold tabular-nums tracking-tight" style={{ fontSize: (v.text.length > 14 ? 54 : 72) * k, color: INK }}><WithGlyphs text={v.text} /></span>;
    case "word": {
      const [a, b] = v.highlight ?? [0, 0];
      return (
        <span className="font-reading font-bold" style={{ fontSize: 88 * k, color: INK, letterSpacing: "0.02em" }}>
          {v.text.slice(0, a)}
          {b > a && <span className="rounded-xl bg-[var(--l-gold)]/45 px-1 text-[var(--l-coral-edge)]">{v.text.slice(a, b)}</span>}
          {v.text.slice(b)}
        </span>
      );
    }
    case "sentence":
      return (
        <p className="max-w-[880px] text-balance text-center font-reading font-bold leading-snug" style={{ fontSize: (v.text.length > 70 ? 32 : 40) * k, color: INK }}>
          {v.text.split(/(_{2,})/).map((part, i) => (/^_{2,}$/.test(part) ? <span key={i} className="mx-1 inline-block w-[3.2em] translate-y-[0.12em] border-b-[5px] border-[var(--l-gold-edge)]" /> : part))}
        </p>
      );
    case "passage":
      return (
        <div className="max-h-[46dvh] w-full max-w-[860px] overflow-y-auto rounded-[24px] bg-[var(--l-card-2)] px-6 py-5 text-left">
          <p className="flex items-center gap-2 font-display text-2xl font-extrabold" style={{ color: INK }}>
            {v.emoji && <GlyphRow s={v.emoji} size={40} />}
            {v.title}
          </p>
          <div className="mt-2 space-y-3 font-reading text-[25px] font-medium leading-[1.55]" style={{ color: INK }}>
            {v.text.split(/\n+/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      );
    case "bars":
      return <Bars data={v.data} k={k} />;
    case "ruler":
      return <Ruler length={v.length} emoji={v.emoji} k={k} />;
    case "grid":
      return <Grid v={v} k={k} />;
    case "angle":
      return <Angle deg={v.deg} px={200 * k} />;
    case "lines":
      return <Lines kind={v.kind} px={200 * k} />;
    case "pair":
      return (
        <div className="flex flex-wrap items-center justify-center gap-5">
          {render(v.left, k * 0.85)}
          {v.mid && <span className="font-display font-extrabold" style={{ fontSize: 48 * k, color: INK }}>{v.mid}</span>}
          {render(v.right, k * 0.85)}
        </div>
      );
  }
}

function Things({ emoji, n, k, crossed }: { emoji: string; n: number; k: number; crossed?: boolean }) {
  const px = (n <= 5 ? 72 : n <= 10 ? 58 : n <= 15 ? 46 : 38) * k;
  const cols = n <= 5 ? n : n <= 10 ? 5 : Math.ceil(n / 3);
  return (
    <span className="inline-grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.max(1, cols)}, auto)` }}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={cn("relative block", crossed && "opacity-60")} style={{ width: px, height: px }}>
          <Glyph e={emoji} size={px} />
          {crossed && (
            <svg viewBox="0 0 10 10" className="absolute inset-[12%]" aria-hidden>
              <path d="M1.5 1.5 L8.5 8.5 M8.5 1.5 L1.5 8.5" stroke="#2a2f45" strokeWidth="2.6" strokeLinecap="round" />
              <path d="M1.5 1.5 L8.5 8.5 M8.5 1.5 L1.5 8.5" stroke="var(--l-coral)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </span>
      ))}
    </span>
  );
}

function NumberLine({ v, k }: { v: Extract<V, { type: "numberline" }>; k: number }) {
  const W = 760 * k;
  const H = 150 * k;
  const pad = 40 * k;
  const step = v.step ?? 1;
  const n = Math.round((v.max - v.min) / step);
  const x = (val: number) => pad + ((val - v.min) / (v.max - v.min)) * (W - pad * 2);
  const y = H * 0.62;
  const frac = step < 1;
  const label = (val: number) => (frac ? (val === v.min || val === v.max ? String(val) : "") : String(Math.round(val * 100) / 100));
  const showEvery = n > 20 ? Math.ceil(n / 10) : 1;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="number line">
      <line x1={pad - 16 * k} x2={W - pad + 16 * k} y1={y} y2={y} stroke={INK} strokeWidth={5 * k} strokeLinecap="round" />
      {Array.from({ length: n + 1 }, (_, i) => {
        const val = v.min + i * step;
        const big = i % showEvery === 0 || i === n;
        return (
          <g key={i}>
            <line x1={x(val)} x2={x(val)} y1={y - (big ? 14 : 8) * k} y2={y + (big ? 14 : 8) * k} stroke={INK} strokeWidth={4 * k} strokeLinecap="round" />
            {big && (
              <text x={x(val)} y={y + 44 * k} textAnchor="middle" fontSize={26 * k} fontWeight={800} fill={INK} fontFamily="var(--font-display), system-ui">
                {label(val)}
              </text>
            )}
          </g>
        );
      })}
      {v.jump && (
        <path
          d={`M ${x(v.jump[0])} ${y - 16 * k} Q ${(x(v.jump[0]) + x(v.jump[1])) / 2} ${y - 90 * k} ${x(v.jump[1])} ${y - 16 * k}`}
          fill="none"
          stroke="var(--l-coral)"
          strokeWidth={6 * k}
          strokeLinecap="round"
          markerEnd="url(#nl-arrow)"
        />
      )}
      <defs>
        <marker id="nl-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--l-coral)" />
        </marker>
      </defs>
      {(v.marks ?? []).map((m, i) => (
        <circle key={i} cx={x(m)} cy={y} r={13 * k} fill="var(--l-blue)" stroke="#fff" strokeWidth={4 * k} />
      ))}
      {v.ask !== undefined && (
        <g>
          <circle cx={x(v.ask)} cy={y} r={15 * k} fill="var(--l-coral)" stroke="#fff" strokeWidth={4 * k} />
          <text x={x(v.ask)} y={y - 30 * k} textAnchor="middle" fontSize={34 * k} fontWeight={900} fill="var(--l-coral-edge)" fontFamily="var(--font-display), system-ui">
            ?
          </text>
        </g>
      )}
    </svg>
  );
}

export function Clock({ h, m, px }: { h: number; m: number; px: number }) {
  const hourAng = ((h % 12) + m / 60) * 30;
  const minAng = m * 6;
  return (
    <svg width={px} height={px} viewBox="0 0 200 200" role="img" aria-label="clock">
      <circle cx="100" cy="100" r="94" fill="#fff" stroke={INK} strokeWidth="8" />
      {Array.from({ length: 60 }, (_, i) => (
        <line key={i} x1="100" y1={i % 5 ? 12 : 10} x2="100" y2={i % 5 ? 17 : 24} stroke={INK} strokeWidth={i % 5 ? 2 : 4} transform={`rotate(${i * 6} 100 100)`} opacity={i % 5 ? 0.45 : 1} />
      ))}
      {Array.from({ length: 12 }, (_, i) => {
        const a = ((i + 1) * 30 * Math.PI) / 180;
        return (
          <text key={i} x={100 + Math.sin(a) * 66} y={100 - Math.cos(a) * 66 + 9} textAnchor="middle" fontSize="25" fontWeight={800} fill={INK} fontFamily="var(--font-display), system-ui">
            {i + 1}
          </text>
        );
      })}
      <line x1="100" y1="100" x2="100" y2="52" stroke="var(--l-coral)" strokeWidth="9" strokeLinecap="round" transform={`rotate(${hourAng} 100 100)`} />
      <line x1="100" y1="100" x2="100" y2="28" stroke="var(--l-blue)" strokeWidth="6" strokeLinecap="round" transform={`rotate(${minAng} 100 100)`} />
      <circle cx="100" cy="100" r="7" fill={INK} />
    </svg>
  );
}

const COIN = {
  p: { label: "1¢", fill: "#d98c4f", edge: "#a85f2a", r: 30 },
  n: { label: "5¢", fill: "#d5dbe1", edge: "#9aa5b1", r: 36 },
  d: { label: "10¢", fill: "#e3e7eb", edge: "#a7b1bc", r: 27 },
  q: { label: "25¢", fill: "#dfe4e9", edge: "#9ca7b3", r: 42 },
};
function Coin({ c, k }: { c: "p" | "n" | "d" | "q"; k: number }) {
  const s = COIN[c];
  const px = s.r * 2 * 1.3 * k;
  return (
    <span className="flex items-center justify-center rounded-full font-display font-extrabold" style={{ width: px, height: px, background: `radial-gradient(circle at 35% 30%, #fff8 0%, transparent 45%), ${s.fill}`, boxShadow: `inset 0 0 0 ${5 * k}px ${s.edge}, 0 ${4 * k}px 0 rgba(0,40,80,0.18)`, fontSize: (s.r > 30 ? 22 : 17) * k, color: "#3b2a14" }}>
      {s.label}
    </span>
  );
}

function Blocks({ h, t, o, k }: { h: number; t: number; o: number; k: number }) {
  const u = 13 * k;
  return (
    <div className="flex flex-wrap items-end justify-center gap-4">
      {Array.from({ length: h }, (_, i) => (
        <span key={`h${i}`} className="grid grid-cols-10 gap-px rounded-md bg-[#1f6fb2] p-px" style={{ width: u * 10 + 11, height: u * 10 + 11 }}>
          {Array.from({ length: 100 }, (_, j) => (
            <span key={j} className="bg-[#5fb0ff]" />
          ))}
        </span>
      ))}
      {t > 0 && (
        <span className="flex items-end gap-1.5">
          {Array.from({ length: t }, (_, i) => (
            <span key={`t${i}`} className="flex flex-col gap-px rounded-md bg-[#c2410c] p-px" style={{ width: u + 2, height: u * 10 + 11 }}>
              {Array.from({ length: 10 }, (_, j) => (
                <span key={j} className="flex-1 bg-[#fb923c]" />
              ))}
            </span>
          ))}
        </span>
      )}
      {o > 0 && (
        <span className="grid grid-cols-3 gap-1.5" style={{ width: (u + 6) * 3 + 12 }}>
          {Array.from({ length: o }, (_, i) => (
            <span key={`o${i}`} className="rounded-[4px] bg-[#22c55e] shadow-[inset_0_-3px_0_rgba(0,0,0,0.18)]" style={{ width: u + 6, height: u + 6 }} />
          ))}
        </span>
      )}
    </div>
  );
}

export function Fraction({ num, den, shape, px }: { num: number; den: number; shape: "pie" | "bar"; px: number }) {
  if (shape === "bar") {
    const w = px * 1.9;
    const h = px * 0.42;
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${num} of ${den}`}>
        {Array.from({ length: den }, (_, i) => (
          <rect key={i} x={4 + (i * (w - 8)) / den} y={4} width={(w - 8) / den} height={h - 8} fill={i < num ? "var(--l-violet)" : "#fff"} stroke={INK} strokeWidth={4} />
        ))}
      </svg>
    );
  }
  const r = px / 2 - 5;
  const c = px / 2;
  return (
    <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} role="img" aria-label={`${num} of ${den}`}>
      {den === 1 ? (
        <circle cx={c} cy={c} r={r} fill={num ? "var(--l-violet)" : "#fff"} stroke={INK} strokeWidth={4} />
      ) : (
        Array.from({ length: den }, (_, i) => {
          const a0 = (i / den) * Math.PI * 2 - Math.PI / 2;
          const a1 = ((i + 1) / den) * Math.PI * 2 - Math.PI / 2;
          const large = a1 - a0 > Math.PI ? 1 : 0;
          return (
            <path key={i} d={`M ${c} ${c} L ${c + r * Math.cos(a0)} ${c + r * Math.sin(a0)} A ${r} ${r} 0 ${large} 1 ${c + r * Math.cos(a1)} ${c + r * Math.sin(a1)} Z`} fill={i < num ? "var(--l-violet)" : "#fff"} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          );
        })
      )}
    </svg>
  );
}

export function Shape({ shape, color, px }: { shape: ShapeName; color: string; px: number }) {
  const s = { fill: color, stroke: "rgba(0,30,60,0.35)", strokeWidth: 4, strokeLinejoin: "round" as const };
  const body: Record<ShapeName, ReactNode> = {
    circle: <circle cx="50" cy="50" r="42" {...s} />,
    oval: <ellipse cx="50" cy="50" rx="46" ry="30" {...s} />,
    square: <rect x="10" y="10" width="80" height="80" rx="3" {...s} />,
    rectangle: <rect x="4" y="24" width="92" height="52" rx="3" {...s} />,
    triangle: <path d="M50 8 L94 88 L6 88 Z" {...s} />,
    diamond: <path d="M50 4 L92 50 L50 96 L8 50 Z" {...s} />,
    pentagon: <path d="M50 6 L94 38 L77 92 L23 92 L6 38 Z" {...s} />,
    hexagon: <path d="M27 8 L73 8 L96 50 L73 92 L27 92 L4 50 Z" {...s} />,
    star: <path d="M50 4 L61 37 L96 37 L68 58 L79 92 L50 71 L21 92 L32 58 L4 37 L39 37 Z" {...s} />,
    heart: <path d="M50 90 C 10 62 4 40 14 24 C 26 6 46 12 50 28 C 54 12 74 6 86 24 C 96 40 90 62 50 90 Z" {...s} />,
    cube: (
      <g {...s}>
        <path d="M20 32 L56 32 L56 88 L20 88 Z" />
        <path d="M20 32 L40 14 L76 14 L56 32 Z" style={{ filter: "brightness(1.15)" }} />
        <path d="M56 32 L76 14 L76 70 L56 88 Z" style={{ filter: "brightness(0.85)" }} />
      </g>
    ),
    sphere: (
      <g>
        <circle cx="50" cy="50" r="42" {...s} />
        <ellipse cx="36" cy="34" rx="12" ry="8" fill="#fff" opacity="0.45" />
      </g>
    ),
    cone: (
      <g {...s}>
        <path d="M50 6 L86 80 Q50 96 14 80 Z" />
        <ellipse cx="50" cy="80" rx="36" ry="10" style={{ filter: "brightness(0.85)" }} />
      </g>
    ),
    cylinder: (
      <g {...s}>
        <path d="M18 20 L18 80 Q50 96 82 80 L82 20 Z" />
        <ellipse cx="50" cy="20" rx="32" ry="10" style={{ filter: "brightness(1.15)" }} />
      </g>
    ),
  };
  return (
    <svg width={px} height={px} viewBox="0 0 100 100" role="img" aria-label={shape}>
      {body[shape]}
    </svg>
  );
}

function Bars({ data, k }: { data: { label: string; value: number; emoji?: string }[]; k: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const H = 230 * k;
  const step = max > 10 ? Math.ceil(max / 5) : 1;
  return (
    <div className="flex items-end gap-3 rounded-2xl bg-[var(--l-card-2)] px-5 pb-3 pt-6">
      <div className="relative mr-1 flex flex-col justify-between text-right font-display text-sm font-bold text-[var(--l-ink-2)]" style={{ height: H }}>
        {Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => (
          <span key={i} className="absolute right-0 translate-y-1/2" style={{ bottom: (i * step * H) / max }}>
            {i * step}
          </span>
        ))}
      </div>
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5">
          <div className="relative flex w-16 items-end justify-center rounded-t-xl" style={{ height: H }}>
            <div className="w-full rounded-t-xl" style={{ height: (d.value / max) * H, background: ["var(--l-blue)", "var(--l-coral)", "var(--l-green)", "var(--l-violet)", "var(--l-orange)"][i % 5], boxShadow: "inset 0 -6px 0 rgba(0,0,0,0.12)" }} />
          </div>
          {d.emoji ? <Glyph e={d.emoji} size={40} /> : null}
          <span className="font-display text-base font-bold" style={{ color: INK }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function Ruler({ length, emoji, k }: { length: number; emoji: string; k: number }) {
  const u = 52 * k;
  const total = Math.max(length + 1, 6);
  return (
    <div className="flex flex-col items-start" style={{ width: u * total + 20 }}>
      <div className="flex items-center" style={{ width: u * length, height: 64 * k, marginLeft: 10 }}>
        <span className="flex h-full w-full items-center justify-center rounded-2xl bg-white/70">
          <GlyphRow s={Array.from({ length: Math.max(1, Math.round(length / 2)) }, () => emoji).join("")} size={52 * k} gap={0} />
        </span>
      </div>
      <svg width={u * total + 20} height={56 * k} viewBox={`0 0 ${u * total + 20} ${56 * k}`}>
        <rect x="2" y="2" width={u * total + 16} height={52 * k} rx="8" fill="#ffd66b" stroke="#c99a1e" strokeWidth="3" />
        {Array.from({ length: total + 1 }, (_, i) => (
          <g key={i}>
            <line x1={10 + i * u} x2={10 + i * u} y1="2" y2={24 * k} stroke={INK} strokeWidth="3" />
            <text x={10 + i * u} y={46 * k} textAnchor="middle" fontSize={18 * k} fontWeight={800} fill={INK}>
              {i}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function Grid({ v, k }: { v: Extract<V, { type: "grid" }>; k: number }) {
  const cell = Math.min(62, 420 / Math.max(v.cols, v.rows)) * k;
  if (v.axes) {
    // A coordinate plane: points live on the lines, (0,0) bottom-left.
    const pad = 34 * k;
    const W = (v.cols - 1) * cell + pad * 2;
    const H = (v.rows - 1) * cell + pad * 2;
    const X = (x: number) => pad + x * cell;
    const Y = (y: number) => H - pad - y * cell;
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="coordinate grid">
        {Array.from({ length: v.cols }, (_, i) => (
          <line key={`x${i}`} x1={X(i)} x2={X(i)} y1={Y(0)} y2={Y(v.rows - 1)} stroke="#c9dbe8" strokeWidth={2} />
        ))}
        {Array.from({ length: v.rows }, (_, i) => (
          <line key={`y${i}`} x1={X(0)} x2={X(v.cols - 1)} y1={Y(i)} y2={Y(i)} stroke="#c9dbe8" strokeWidth={2} />
        ))}
        <line x1={X(0)} x2={X(v.cols - 1) + 10} y1={Y(0)} y2={Y(0)} stroke={INK} strokeWidth={4} />
        <line x1={X(0)} x2={X(0)} y1={Y(0)} y2={Y(v.rows - 1) - 10} stroke={INK} strokeWidth={4} />
        {Array.from({ length: v.cols }, (_, i) => (
          <text key={`lx${i}`} x={X(i)} y={Y(0) + 26 * k} textAnchor="middle" fontSize={18 * k} fontWeight={800} fill={INK}>
            {i}
          </text>
        ))}
        {Array.from({ length: v.rows }, (_, i) =>
          i ? (
            <text key={`ly${i}`} x={X(0) - 14 * k} y={Y(i) + 6 * k} textAnchor="middle" fontSize={18 * k} fontWeight={800} fill={INK}>
              {i}
            </text>
          ) : null,
        )}
        {v.point && <circle cx={X(v.point[0])} cy={Y(v.point[1])} r={12 * k} fill="var(--l-coral)" stroke="#fff" strokeWidth={4} />}
      </svg>
    );
  }
  const filled = new Set((v.fill ?? []).map(([x, y]) => `${x},${y}`));
  return (
    <div className="inline-grid gap-0 rounded-lg border-[3px] border-[var(--l-ink)] bg-white" style={{ gridTemplateColumns: `repeat(${v.cols}, ${cell}px)` }}>
      {Array.from({ length: v.cols * v.rows }, (_, i) => {
        const x = i % v.cols;
        const y = Math.floor(i / v.cols);
        return <span key={i} style={{ height: cell, background: filled.has(`${x},${y}`) ? "var(--l-teal)" : undefined, boxShadow: "inset 0 0 0 1px #c9dbe8" }} />;
      })}
    </div>
  );
}

function Angle({ deg, px }: { deg: number; px: number }) {
  const c = { x: 30, y: 160 };
  const L = 150;
  const a = (deg * Math.PI) / 180;
  const end = { x: c.x + L * Math.cos(-a), y: c.y + L * Math.sin(-a) };
  const r = 44;
  return (
    <svg width={px} height={px} viewBox="0 0 200 200" role="img" aria-label={`angle ${deg} degrees`}>
      <line x1={c.x} y1={c.y} x2={c.x + L} y2={c.y} stroke={INK} strokeWidth="7" strokeLinecap="round" />
      <line x1={c.x} y1={c.y} x2={end.x} y2={end.y} stroke={INK} strokeWidth="7" strokeLinecap="round" />
      {deg === 90 ? (
        <path d={`M ${c.x + 26} ${c.y} L ${c.x + 26} ${c.y - 26} L ${c.x} ${c.y - 26}`} fill="none" stroke="var(--l-coral)" strokeWidth="5" />
      ) : (
        <path d={`M ${c.x + r} ${c.y} A ${r} ${r} 0 ${deg > 180 ? 1 : 0} 0 ${c.x + r * Math.cos(-a)} ${c.y + r * Math.sin(-a)}`} fill="none" stroke="var(--l-coral)" strokeWidth="5" />
      )}
      <circle cx={c.x} cy={c.y} r="7" fill={INK} />
    </svg>
  );
}

function Lines({ kind, px }: { kind: "parallel" | "perpendicular" | "intersecting"; px: number }) {
  const st: CSSProperties = { stroke: INK, strokeWidth: 7, strokeLinecap: "round" };
  return (
    <svg width={px} height={px} viewBox="0 0 200 200" role="img" aria-label={`${kind} lines`}>
      {kind === "parallel" && (
        <>
          <line x1="20" y1="70" x2="180" y2="40" style={st} />
          <line x1="20" y1="150" x2="180" y2="120" style={st} />
        </>
      )}
      {kind === "perpendicular" && (
        <>
          <line x1="20" y1="110" x2="180" y2="110" style={st} />
          <line x1="100" y1="20" x2="100" y2="180" style={st} />
          <path d="M100 92 L118 92 L118 110" fill="none" stroke="var(--l-coral)" strokeWidth="5" />
        </>
      )}
      {kind === "intersecting" && (
        <>
          <line x1="20" y1="160" x2="180" y2="50" style={st} />
          <line x1="30" y1="40" x2="170" y2="170" style={st} />
        </>
      )}
    </svg>
  );
}
