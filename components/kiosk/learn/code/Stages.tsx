"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import type { Dir } from "@/lib/learn/types";
import type { BoatLook } from "@/lib/learn/meta";
import { cellKey, parseGrid, sharksAt, type GridState, type PixelState, type Seg, type TurtleState } from "@/lib/learn/program";
import { TopBoat } from "../KidBoat";
import { MOVE_EMOJI, NOTE_COLOR, PIXEL_COLOR } from "./blocks";

// The worlds a program drives. Each is a pure picture of the engine's state; CodeAct feeds them
// one step at a time and they animate the change: the boat glides, the rover's sensor beams,
// the robot dances, bells ring, the turtle draws, the brush paints.

// ── Sea Navigator + Mars Rover ───────────────────────────────────────────────────────────────
export type SeaView = {
  states: GridState[];
  /** Accumulated heading per map, so turns always take the short way round. */
  angles: number[];
  active: number;
  trails: string[][];
  bump: { map: number; x: number; y: number; k: number } | null;
  sensor: { map: number; dir: Dir; blocked: boolean; k: number } | null;
  won: boolean;
};

const DIR_STEP: Record<Dir, [number, number]> = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
const CURRENT_TURN: Record<string, number> = { ">": 0, v: 90, "<": 180, "^": 270 };

/** The mission, ticking off as the program runs: keys, gates, buttons, fish, shells, the island. */
function Mission({ map, s }: { map: string[]; s?: GridState }) {
  const g = parseGrid(map);
  const items: { icon: string; have: number; need: number }[] = [];
  if (g.keys.size) items.push({ icon: "🔑", have: s?.keys?.length ?? 0, need: g.keys.size });
  if (g.gates.size) items.push({ icon: "🚪", have: s?.opened?.length ?? 0, need: g.gates.size });
  if (g.buttons.size) items.push({ icon: "🔘", have: s?.bridge ? 1 : 0, need: 1 });
  if (g.fish.size) items.push({ icon: "🐟", have: s?.caught?.length ?? 0, need: g.fish.size });
  if (g.shells.size) items.push({ icon: "🐚", have: s?.got.length ?? 0, need: g.shells.size });
  if (!items.length) return null;
  const home = !!s && s.x === g.goal.x && s.y === g.goal.y;
  return (
    <div className="flex flex-wrap items-center justify-center gap-2" aria-label="Mission">
      {items.map((it) => (
        <span key={it.icon} className={cn("flex items-center gap-1 rounded-full px-3 py-1 font-display text-lg font-extrabold shadow-[0_3px_0_rgba(0,40,80,0.15)] transition-colors", it.have >= it.need ? "bg-[#dcfce7] text-[#166534]" : "bg-white text-[var(--l-ink)]")}>
          <span className="text-xl">{it.icon}</span>
          {it.need > 1 ? `${Math.min(it.have, it.need)}/${it.need}` : it.have >= it.need ? "✓" : ""}
        </span>
      ))}
      <span className="text-lg font-extrabold text-white/80">→</span>
      <span className={cn("flex items-center gap-1 rounded-full px-3 py-1 font-display text-lg font-extrabold shadow-[0_3px_0_rgba(0,40,80,0.15)]", home ? "bg-[#dcfce7] text-[#166534]" : "bg-white text-[var(--l-ink)]")}>
        <span className="text-xl">🏝️</span>
        {home ? "✓" : ""}
      </span>
    </div>
  );
}

export function SeaStage({ maps, view, look, mars, width = 560, height = 440 }: { maps: string[][]; view: SeaView; look: BoatLook; mars: boolean; width?: number; height?: number }) {
  const multi = maps.length > 1;
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3">
      <Mission map={maps[view.active]} s={view.states[view.active]} />
      <OneMap map={maps[view.active]} mapIndex={view.active} view={view} look={look} mars={mars} maxW={width} maxH={multi ? height - 92 : height} />
      {multi && (
        <div className="flex items-center gap-3">
          {maps.map((m, i) => (
            <div key={i} className={cn("rounded-xl p-1 transition-all", i === view.active ? "bg-[var(--l-gold)]" : "bg-white/40")}>
              <OneMap map={m} mapIndex={i} view={view} look={look} mars={mars} maxW={96} maxH={72} thumb />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OneMap({ map, mapIndex, view, look, mars, maxW, maxH, thumb }: { map: string[]; mapIndex: number; view: SeaView; look: BoatLook; mars: boolean; maxW: number; maxH: number; thumb?: boolean }) {
  const g = parseGrid(map);
  const cell = Math.floor(Math.min(maxW / g.w, maxH / g.h, thumb ? 24 : 96));
  const s = view.states[mapIndex];
  const trail = new Set(view.trails[mapIndex] ?? []);
  const bump = view.bump?.map === mapIndex ? view.bump : null;
  const sensor = !thumb && view.sensor?.map === mapIndex ? view.sensor : null;
  const ground: CSSProperties = mars
    ? { background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.08) 0 2px, transparent 3px) 0 0/22px 22px, linear-gradient(160deg, #f0905e, #d8653a)" }
    : { background: "radial-gradient(circle at 50% 120%, rgba(255,255,255,0.18) 0 30%, transparent 31%) 0 0/34px 20px, linear-gradient(160deg, #48d0ef, #1aa6d6)" };
  return (
    <div className={cn("relative overflow-hidden", thumb ? "rounded-lg" : "rounded-[22px] shadow-[0_8px_0_rgba(0,40,80,0.22)]")} style={{ width: cell * g.w, height: cell * g.h, ...ground }}>
      {/* cells */}
      {map.map((row, y) =>
        [...row].map((ch, x) => {
          const k = cellKey({ x, y });
          const got = s?.got.includes(k);
          return (
            <span key={k} className="absolute flex items-center justify-center" style={{ left: x * cell, top: y * cell, width: cell, height: cell, boxShadow: thumb ? undefined : "inset 0 0 0 1px rgba(255,255,255,0.12)" }}>
              {trail.has(k) && ch !== "S" && !thumb && <span className="absolute rounded-full" style={{ width: cell * 0.18, height: cell * 0.18, background: mars ? "rgba(90,30,10,0.35)" : "rgba(255,255,255,0.55)" }} />}
              {/* Obstacles never look like the goal island. */}
              {ch === "#" && <span style={{ fontSize: cell * 0.72, lineHeight: 1 }}>{mars && (x + y) % 3 === 0 ? "⛰️" : "🪨"}</span>}
              {ch === "*" && !got && <span className={cn(!thumb && "l-bob")} style={{ fontSize: cell * 0.56, lineHeight: 1 }}>🐚</span>}
              {ch === "k" && !s?.keys?.includes(k) && <span className={cn(!thumb && "l-bob")} style={{ fontSize: cell * 0.56, lineHeight: 1 }}>🔑</span>}
              {ch === "D" && (
                <span className={cn("flex items-center justify-center rounded-lg transition-all duration-500", s?.opened?.includes(k) ? "opacity-30" : "")} style={{ width: cell * 0.86, height: cell * 0.86, background: "repeating-linear-gradient(90deg, #a16207 0 18%, #854d0e 18% 24%)", boxShadow: "inset 0 0 0 3px #713f12", fontSize: cell * 0.42 }}>
                  {s?.opened?.includes(k) ? "🔓" : "🔒"}
                </span>
              )}
              {ch === "b" && <span className="flex items-center justify-center rounded-full transition-colors" style={{ width: cell * 0.56, height: cell * 0.56, background: s?.bridge ? "#22c55e" : "#ef4444", boxShadow: `0 ${cell * 0.06}px 0 ${s?.bridge ? "#15803d" : "#b91c1c"}`, transform: s?.bridge ? `translateY(${cell * 0.05}px)` : undefined }} />}
              {ch === "=" &&
                (s?.bridge ? (
                  <span className="l-pop-in rounded-md" style={{ width: cell, height: cell * 0.62, background: "repeating-linear-gradient(90deg, #b45309 0 22%, #92400e 22% 26%)", boxShadow: "inset 0 3px 0 rgba(255,255,255,0.25), 0 3px 0 rgba(0,0,0,0.25)" }} />
                ) : (
                  <span style={{ fontSize: cell * 0.6, lineHeight: 1 }}>🚧</span>
                ))}
              {ch === "@" && <span className={cn(!thumb && "l-spin-slow")} style={{ fontSize: cell * 0.7, lineHeight: 1 }}>🌀</span>}
              {CURRENT_TURN[ch] !== undefined && (
                <span className="font-display font-extrabold text-white/80" style={{ fontSize: cell * 0.5, lineHeight: 1, transform: `rotate(${CURRENT_TURN[ch]}deg)` }}>
                  ➜
                </span>
              )}
              {ch === "f" && !s?.caught?.includes(k) && <span className={cn(!thumb && "l-bob")} style={{ fontSize: cell * 0.56, lineHeight: 1 }}>🐟</span>}
              {ch === "G" && <span className={cn(!thumb && view.won && mapIndex === view.active && "l-boing")} style={{ fontSize: cell * 0.7, lineHeight: 1 }}>{mars ? "🚩" : "🏝️"}</span>}
              {ch === "G" && !thumb && <span className="absolute inset-1 rounded-xl ring-4 ring-[var(--l-gold)]/70" />}
            </span>
          );
        }),
      )}
      {/* sensor beam */}
      {sensor && s && (
        <span
          key={sensor.k}
          className="l-pop-in absolute flex items-center justify-center rounded-full"
          style={{
            left: (s.x + 0.5 + DIR_STEP[sensor.dir][0] * 0.62) * cell - cell * 0.22,
            top: (s.y + 0.5 + DIR_STEP[sensor.dir][1] * 0.62) * cell - cell * 0.22,
            width: cell * 0.44,
            height: cell * 0.44,
            background: sensor.blocked ? "rgba(239,68,68,0.85)" : "rgba(34,197,94,0.85)",
            boxShadow: `0 0 0 ${cell * 0.08}px ${sensor.blocked ? "rgba(239,68,68,0.35)" : "rgba(34,197,94,0.35)"}`,
            fontSize: cell * 0.26,
          }}
        >
          {sensor.blocked ? "✋" : "✓"}
        </span>
      )}
      {/* the boat / rover */}
      {s && (
        <span
          className="absolute flex items-center justify-center"
          style={{
            left: 0,
            top: 0,
            width: cell,
            height: cell,
            transform: `translate(${s.x * cell}px, ${s.y * cell}px)`,
            transition: thumb ? "none" : "transform 300ms cubic-bezier(0.34,1.3,0.64,1)",
          }}
        >
          <span key={bump?.k ?? 0} className={cn("flex items-center justify-center", bump && "l-shake")} style={{ transform: `rotate(${view.angles[mapIndex] ?? 0}deg)`, transition: thumb ? "none" : "transform 260ms ease-out" }}>
            {mars ? <Rover size={cell * 0.9} /> : <TopBoat look={look} size={cell * 0.92} />}
          </span>
        </span>
      )}
      {/* sharks on patrol (one cell per tick) — drawn over the boat, so a chomp is plain to see */}
      {g.sharks.length > 0 &&
        sharksAt(map, s?.t ?? 0).map((c, i) => (
          <span key={`shark${i}`} className="pointer-events-none absolute flex items-center justify-center" style={{ left: 0, top: 0, width: cell, height: cell, transform: `translate(${c.x * cell}px, ${c.y * cell}px)`, transition: thumb ? "none" : "transform 300ms ease-in-out", fontSize: cell * 0.7 }}>
            🦈
          </span>
        ))}
      {bump && !thumb && (
        <span key={`b${bump.k}`} className="l-pop-in pointer-events-none absolute flex items-center justify-center" style={{ left: bump.x * cell, top: bump.y * cell, width: cell, height: cell, fontSize: cell * 0.6 }}>
          {mars ? "💥" : "💦"}
        </span>
      )}
    </div>
  );
}

function Rover({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
      <rect x="14" y="16" width="20" height="14" rx="4" fill="#334155" />
      <rect x="62" y="16" width="20" height="14" rx="4" fill="#334155" />
      <rect x="14" y="70" width="20" height="14" rx="4" fill="#334155" />
      <rect x="62" y="70" width="20" height="14" rx="4" fill="#334155" />
      <rect x="18" y="26" width="64" height="48" rx="12" fill="#f8fafc" stroke="#94a3b8" strokeWidth="3" />
      <rect x="28" y="36" width="26" height="28" rx="5" fill="#38bdf8" opacity="0.85" />
      <circle cx="70" cy="50" r="9" fill="#facc15" stroke="#ca8a04" strokeWidth="3" />
      <path d="M86 50 L96 44 L96 56 Z" fill="#ef4444" />
    </svg>
  );
}

// ── Robot Dance Party ────────────────────────────────────────────────────────────────────────
export type SeqView = { done: string[]; current: string | null; key: number; mismatch: number | null; demo: boolean; demoIndex: number | null; won: boolean };

export function DanceStage({ target, view }: { target: string[]; view: SeqView }) {
  return (
    <div className="flex h-full w-full flex-col items-center gap-4">
      <SeqCards target={target} view={view} render={(m) => <span className="text-[34px] leading-none">{MOVE_EMOJI[m]}</span>} label={view.demo ? "Watch the dance!" : "Copy this dance:"} />
      <div className="relative flex flex-1 items-end justify-center overflow-hidden rounded-[28px] px-10 pb-4" style={{ background: "repeating-conic-gradient(from 45deg, #4c1d95 0 25%, #6d28d9 0 50%) 0 0/64px 64px", minHeight: 300, width: "100%" }}>
        <span className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/30 to-transparent" />
        {["#f472b6", "#facc15", "#38bdf8"].map((c, i) => (
          <span key={c} className="l-pulse pointer-events-none absolute top-0 h-[120%] w-24 origin-top opacity-25 blur-md" style={{ left: `${18 + i * 30}%`, background: `linear-gradient(${c}, transparent)`, transform: `rotate(${(i - 1) * 18}deg)`, animationDelay: `${i * 0.4}s` }} />
        ))}
        <Robot move={view.current} k={view.key} happy={view.won} sad={view.mismatch !== null} />
      </div>
    </div>
  );
}

function Robot({ move, k, happy, sad }: { move: string | null; k: number; happy: boolean; sad: boolean }) {
  return (
    <svg key={k} viewBox="0 0 200 240" width="230" height="276" className={cn("robot", move && `mv-${move}`, happy && "mv-bow")} aria-hidden>
      <ellipse cx="100" cy="232" rx="62" ry="7" fill="rgba(0,0,0,0.3)" />
      <g className="rb-body">
        <g className="rb-leg-l">
          <rect x="72" y="168" width="18" height="50" rx="8" fill="#94a3b8" />
          <rect x="62" y="210" width="34" height="14" rx="7" fill="#475569" />
        </g>
        <g className="rb-leg-r">
          <rect x="110" y="168" width="18" height="50" rx="8" fill="#94a3b8" />
          <rect x="104" y="210" width="34" height="14" rx="7" fill="#475569" />
        </g>
        <rect x="56" y="96" width="88" height="80" rx="20" fill="#e2e8f0" stroke="#64748b" strokeWidth="4" />
        <circle cx="100" cy="136" r="14" fill={happy ? "#22c55e" : sad ? "#ef4444" : "#38bdf8"} stroke="#0f172a" strokeWidth="3" />
        <g className="rb-arm-l">
          <rect x="30" y="102" width="20" height="58" rx="10" fill="#94a3b8" />
          <circle cx="40" cy="164" r="11" fill="#475569" />
        </g>
        <g className="rb-arm-r">
          <rect x="150" y="102" width="20" height="58" rx="10" fill="#94a3b8" />
          <circle cx="160" cy="164" r="11" fill="#475569" />
        </g>
        <g className="rb-head">
          <rect x="60" y="30" width="80" height="62" rx="18" fill="#e2e8f0" stroke="#64748b" strokeWidth="4" />
          <rect x="70" y="42" width="60" height="36" rx="10" fill="#0f172a" />
          {sad ? (
            <>
              <path d="M80 54 L92 62 M92 54 L80 62" stroke="#f87171" strokeWidth="4" strokeLinecap="round" />
              <path d="M108 54 L120 62 M120 54 L108 62" stroke="#f87171" strokeWidth="4" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle cx="86" cy="58" r="6" fill="#67e8f9" />
              <circle cx="114" cy="58" r="6" fill="#67e8f9" />
              <path d={happy ? "M86 68 Q100 78 114 68" : "M90 70 Q100 74 110 70"} stroke="#67e8f9" strokeWidth="4" fill="none" strokeLinecap="round" />
            </>
          )}
          <line x1="100" y1="30" x2="100" y2="14" stroke="#64748b" strokeWidth="4" />
          <circle cx="100" cy="11" r="7" fill="#f43f5e" />
        </g>
      </g>
      {move === "clap" && (
        <text x="100" y="96" fontSize="34" textAnchor="middle" className="l-pop-in">
          👏
        </text>
      )}
    </svg>
  );
}

function SeqCards({ target, view, render, label }: { target: string[]; view: SeqView; render: (m: string) => React.ReactNode; label: string }) {
  return (
    <div className="flex w-full flex-col items-center gap-2">
      <span className="font-display text-lg font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.3)]">{label}</span>
      <div className="flex flex-wrap justify-center gap-2">
        {target.map((m, i) => {
          const ok = i < view.done.length && view.done[i] === m;
          const bad = view.mismatch === i;
          const now = view.demo ? view.demoIndex === i : i === view.done.length - 1 && !!view.current;
          return (
            <span key={i} className={cn("relative flex h-[60px] min-w-[60px] items-center justify-center rounded-2xl bg-white px-2 shadow-[0_4px_0_var(--l-line)] transition-transform", now && "scale-110 ring-4 ring-[var(--l-gold)]", ok && !view.demo && "bg-[#dcfce7]", bad && "bg-[#fee2e2] ring-4 ring-[var(--l-coral)]")}>
              {render(m)}
              {ok && !view.demo && <span className="absolute -right-1.5 -top-1.5 text-base">✅</span>}
              {bad && <span className="absolute -right-1.5 -top-1.5 text-base">❌</span>}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ── Music Maker ──────────────────────────────────────────────────────────────────────────────
const BARS = ["C", "D", "E", "F", "G", "A"];
export function MusicStage({ target, view }: { target: string[]; view: SeqView }) {
  const lit = view.demo ? (view.demoIndex !== null ? target[view.demoIndex] : null) : view.current;
  return (
    <div className="flex h-full w-full flex-col items-center gap-5">
      <SeqCards
        target={target}
        view={view}
        render={(n) => (
          <span className="flex h-11 w-11 items-center justify-center rounded-full font-display text-xl font-extrabold text-white" style={{ background: NOTE_COLOR[n]?.[0] }}>
            {n}
          </span>
        )}
        label={view.demo ? "Listen to the song!" : "Play this song:"}
      />
      <div className="flex flex-1 items-center justify-center gap-3 rounded-[28px] bg-[#7c4a1f] px-8 py-6 shadow-[inset_0_-10px_0_rgba(0,0,0,0.2)]" style={{ minHeight: 280 }}>
        {BARS.map((n, i) => {
          const on = lit === n;
          return (
            <div key={`${n}${on ? view.key : ""}`} className="flex flex-col items-center gap-2">
              <span
                className={cn("flex w-[64px] items-end justify-center rounded-2xl pb-3 font-display text-2xl font-extrabold text-white transition-transform", on && "l-boing")}
                style={{
                  height: 230 - i * 22,
                  background: `linear-gradient(180deg, ${NOTE_COLOR[n][0]}, ${NOTE_COLOR[n][1]})`,
                  boxShadow: on ? `0 0 0 6px #fff, 0 0 40px 10px ${NOTE_COLOR[n][0]}` : "0 6px 0 rgba(0,0,0,0.25)",
                  transform: on ? "translateY(6px)" : undefined,
                }}
              >
                {n}
              </span>
              {on && <span className="l-float-num absolute text-3xl">🎵</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Turtle Artist ────────────────────────────────────────────────────────────────────────────
export type TurtleView = { state: TurtleState; extra: Seg[] | null; missing: Seg[] | null; won: boolean; /** heading for display (turns take the short way) */ angle: number };

export function TurtleStage({ target, view, size = 440 }: { target: Seg[]; view: TurtleView; size?: number }) {
  const xs = [0, ...target.flatMap((s) => [s[0], s[2]])];
  const ys = [0, ...target.flatMap((s) => [s[1], s[3]])];
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const span = Math.max(5, maxX - minX + 2.4, maxY - minY + 2.4);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const vb = `${cx - span / 2} ${cy - span / 2} ${span} ${span}`;
  const s = view.state;
  const segs = s.segs;
  const grid: number[] = [];
  for (let v = Math.floor(cx - span / 2); v <= Math.ceil(cx + span / 2); v++) grid.push(v);
  const gy: number[] = [];
  for (let v = Math.floor(cy - span / 2); v <= Math.ceil(cy + span / 2); v++) gy.push(v);
  return (
    <div className="relative overflow-hidden rounded-[28px] bg-[#fffaf0] shadow-[0_8px_0_rgba(0,40,80,0.2)]" style={{ width: size, height: size }}>
      <svg viewBox={vb} width={size} height={size} aria-label="the turtle's drawing">
        {grid.map((v) => (
          <line key={`gx${v}`} x1={v} x2={v} y1={cy - span} y2={cy + span} stroke="#e6dcc8" strokeWidth={0.03} />
        ))}
        {gy.map((v) => (
          <line key={`gy${v}`} y1={v} y2={v} x1={cx - span} x2={cx + span} stroke="#e6dcc8" strokeWidth={0.03} />
        ))}
        {/* the picture to draw */}
        {target.map((t, i) => (
          <line key={`t${i}`} x1={t[0]} y1={t[1]} x2={t[2]} y2={t[3]} stroke={view.missing?.includes(t) ? "#f59e0b" : "#cbd5e1"} strokeWidth={0.22} strokeLinecap="round" strokeDasharray="0.18 0.16" className={cn(view.missing?.includes(t) && "l-pulse")} />
        ))}
        {/* what the turtle drew */}
        {segs.map((g, i) => (
          <line
            key={`d${i}`}
            x1={g[0]}
            y1={g[1]}
            x2={g[2]}
            y2={g[3]}
            stroke={view.extra?.includes(g) ? "#ef4444" : view.won ? "#22c55e" : s.cols[i] ?? "#ff7363"}
            strokeWidth={0.2}
            strokeLinecap="round"
            className={cn(i === segs.length - 1 && !view.won && "l-draw")}
            pathLength={1}
          />
        ))}
        {/* the turtle */}
        <g style={{ transform: `translate(${s.x}px, ${s.y}px) rotate(${view.angle}deg)`, transition: "transform 260ms ease-out" }}>
          <ellipse cx="0" cy="0" rx="0.42" ry="0.34" fill="#16a34a" stroke="#14532d" strokeWidth="0.05" />
          <path d="M-0.2 -0.18 L0.1 -0.18 L0.24 0 L0.1 0.18 L-0.2 0.18 L-0.3 0 Z" fill="#22c55e" opacity="0.9" />
          <circle cx="0.52" cy="0" r="0.16" fill="#4ade80" stroke="#14532d" strokeWidth="0.04" />
          <circle cx="0.58" cy="-0.05" r="0.035" fill="#0f172a" />
          <circle cx="0.58" cy="0.05" r="0.035" fill="#0f172a" />
          {[[-0.25, -0.36], [0.22, -0.36], [-0.25, 0.36], [0.22, 0.36]].map(([lx, ly], i) => (
            <ellipse key={i} cx={lx} cy={ly} rx="0.1" ry="0.07" fill="#4ade80" />
          ))}
          {!s.pen && <circle cx="0" cy="0" r="0.55" fill="none" stroke="#94a3b8" strokeWidth="0.04" strokeDasharray="0.08 0.08" />}
        </g>
      </svg>
      {view.won && <span className="l-pop-in absolute right-4 top-3 text-5xl">🌟</span>}
    </div>
  );
}

// ── Pixel Painter ────────────────────────────────────────────────────────────────────────────
export type PixelView = { state: PixelState; wrong: [number, number][] | null; won: boolean; key: number };

export function PixelStage({ picture, view, size = 420 }: { picture: string[]; view: PixelView; size?: number }) {
  const h = picture.length;
  const w = Math.max(...picture.map((r) => r.length));
  const cell = Math.floor(Math.min(size / w, (size * 0.85) / h, 96));
  const s = view.state;
  const wrong = new Set((view.wrong ?? []).map(([x, y]) => `${x},${y}`));
  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <div className="relative rounded-[18px] bg-white p-2 shadow-[0_8px_0_rgba(0,40,80,0.2)]">
        <div className="relative grid" style={{ gridTemplateColumns: `repeat(${w}, ${cell}px)` }}>
          {Array.from({ length: w * h }, (_, i) => {
            const x = i % w;
            const y = Math.floor(i / w);
            const want = picture[y]?.[x] ?? ".";
            const got = s.grid[y]?.[x] ?? ".";
            return (
              <span key={i} className="relative flex items-center justify-center" style={{ width: cell, height: cell, boxShadow: "inset 0 0 0 1px #e2e8f0" }}>
                {want !== "." && <span className="absolute inset-[18%] rounded-md opacity-25" style={{ background: PIXEL_COLOR[want] }} />}
                {got !== "." && <span key={`${got}${view.key}`} className="l-pop-in absolute inset-[3px] rounded-md" style={{ background: PIXEL_COLOR[got], boxShadow: got === "w" ? "inset 0 0 0 2px #cbd5e1" : undefined }} />}
                {wrong.has(`${x},${y}`) && <span className="absolute z-[1] text-2xl">❌</span>}
              </span>
            );
          })}
          <span className="pointer-events-none absolute left-0 top-0 rounded-lg ring-[5px] ring-[var(--l-gold)]" style={{ width: cell, height: cell, transform: `translate(${s.x * cell}px, ${s.y * cell}px)`, transition: "transform 240ms cubic-bezier(0.34,1.3,0.64,1)" }}>
            <span className="absolute -right-3 -top-4 text-2xl">🖌️</span>
          </span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="font-display text-base font-extrabold text-white">Make this:</span>
        <div className="grid rounded-xl bg-white p-1.5 shadow-[0_5px_0_rgba(0,40,80,0.2)]" style={{ gridTemplateColumns: `repeat(${w}, 22px)` }}>
          {Array.from({ length: w * h }, (_, i) => {
            const c = picture[Math.floor(i / w)]?.[i % w] ?? ".";
            return <span key={i} style={{ width: 22, height: 22, background: c === "." ? "#f8fafc" : PIXEL_COLOR[c], boxShadow: "inset 0 0 0 1px #e2e8f0" }} />;
          })}
        </div>
        <span className="mt-1 flex items-center gap-2 rounded-full bg-white px-3 py-1 font-display text-sm font-extrabold text-[var(--l-ink)]">
          brush: <span className="inline-block h-5 w-5 rounded-full" style={{ background: PIXEL_COLOR[s.color] }} />
        </span>
      </div>
    </div>
  );
}
