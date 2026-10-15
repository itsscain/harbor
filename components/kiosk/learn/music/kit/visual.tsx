"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Dyn, MusicShow, Score } from "@/lib/learn/mus/types";
import { CIRCLE, cellsDurs, chordSymbol, noteColor, romanChord, solfege, tempoWord } from "@/lib/learn/mus/theory";
import { activeAt, activeDur, timeline } from "@/lib/learn/mus/score";
import { GlyphRow } from "../../art/Glyph";
import { RhythmStrip, Staff, SymbolView, TimeSigBig } from "./notation";
import { BeatDots, Bells, InstrumentPic, Keyboard, Ladder } from "./kit";

// One renderer for every picture of music (MusicShow). Pass the beat being heard and the score
// that's playing, and the picture follows along: the sounding note glows on the staff, the key
// lights on the keyboard, the bell shines, the syllable under the rhythm turns pink, the beat heart
// pulses, the chord block lights. Pictures only — the interactive versions live in the activities.

const SECTION_COLORS: Record<string, string> = { A: "#ff7363", B: "#1cb0f6", C: "#3ccf6e", D: "#ffc83d", E: "#8b6cff", verse: "#3ccf6e", chorus: "#ff7363", bridge: "#8b6cff", intro: "#8ad4ff", outro: "#ffc83d", "pre-chorus": "#ff9149", pre: "#ff9149" };
export const sectionColor = (s: string) => SECTION_COLORS[s] ?? SECTION_COLORS[s.toLowerCase()] ?? "#9aa9bd";

/** The pitch sounding now in a score's first notes track (for lighting keys/bells). */
function soundingPitches(score: Score | null | undefined, beat: number | null | undefined): number[] {
  if (!score || beat === null || beat === undefined) return [];
  const t = score.tracks.find((x) => x.kind === "notes");
  if (!t) return [];
  const tl = timeline(t);
  const i = activeAt(tl, beat);
  if (i < 0) return [];
  const p = tl[i].p;
  return p === null ? [] : Array.isArray(p) ? p : [p];
}

export function MusicVisual({ m, beat = null, score = null, size = "md", className }: { m: MusicShow; beat?: number | null; score?: Score | null; size?: "sm" | "md" | "lg"; className?: string }) {
  const k = size === "sm" ? 0.6 : size === "lg" ? 1.25 : 1;
  return <div className={cn("flex items-center justify-center", className)}>{render(m, beat, score, k)}</div>;
}

function render(m: MusicShow, beat: number | null, score: Score | null, k: number): ReactNode {
  switch (m.show) {
    case "staff": {
      const active = activeDur(m.notes.map((x) => (x.p === null ? -x.d : x.d)), beat);
      return <Staff notes={m.notes} clef={m.clef} keySig={m.key} meter={m.meter} active={active} labels={m.labels} tonic={m.tonic} height={170 * k} colored={m.labels === "solfege"} />;
    }
    case "rhythm":
      return <RhythmStrip cells={m.cells} style={m.style} syllables={m.syllables ?? true} meter={m.meter} active={activeDur(cellsDurs(m.cells), beat)} height={(m.style === "icons" ? 120 : 112) * k} />;
    case "keyboard": {
      const sounding = soundingPitches(score, beat);
      return (
        <div style={{ width: Math.min(760, (m.hi - m.lo + 1) * 30) * k }} className="max-w-full">
          <Keyboard lo={m.lo} hi={m.hi} lit={[...(m.lit ?? []), ...sounding]} held={sounding} labels={m.labels} tonic={m.tonic} marks={m.marks} height={170 * k} disabled />
        </div>
      );
    }
    case "bells":
      return (
        <div style={{ width: Math.min(720, m.pitches.length * 110) * k }} className="pointer-events-none max-w-full">
          <Bells pitches={m.pitches} lit={[...(m.lit ?? []), ...soundingPitches(score, beat)]} labels={m.labels} tonic={m.tonic} height={200 * k} />
        </div>
      );
    case "ladder": {
      const s = soundingPitches(score, beat)[0];
      return <Ladder tonic={m.tonic} steps={m.steps} lit={m.lit} active={s !== undefined ? s - m.tonic : null} height={240 * k} />;
    }
    case "beats":
      return <BeatDots n={m.n} beat={beat} accent={m.accent} icon={m.icon} size={84 * k} />;
    case "inst":
      return (
        <div className="flex flex-wrap items-end justify-center gap-5">
          {m.ids.map((id, i) => (
            <InstrumentPic key={i} id={id} size={(m.ids.length > 3 ? 110 : 150) * k} label />
          ))}
        </div>
      );
    case "dynamics":
      return <Dynamics marks={m.marks} k={k} />;
    case "tempo":
      return <Metronome bpm={m.bpm} word={m.word ?? tempoWord(m.bpm)} on={beat !== null} k={k} />;
    case "wave":
      return <WaveView hz={m.hz} amp={m.amp} compare={m.compare} k={k} />;
    case "form":
      return <FormBlocks sections={m.sections} k={k} />;
    case "circle":
      return <CircleOfFifths lit={m.lit} k={k} />;
    case "symbol":
      return (
        <div className="flex flex-col items-center gap-2">
          <SymbolView sym={m.sym} size={150 * k} />
          {m.label && <span className="font-display text-2xl font-extrabold text-[var(--l-ink)]">{m.label}</span>}
        </div>
      );
    case "contour":
      return <Contour pitches={m.pitches} active={score ? activeAt(timeline(score.tracks.find((t) => t.kind === "notes") ?? score.tracks[0]), beat) : -1} k={k} />;
    case "meter":
      return <TimeSigBig meter={m.meter} size={150 * k} />;
    case "pics":
      return <GlyphRow s={m.emoji} size={130 * k} className="l-pop-in" />;
    case "chords":
      return <ChordBlocks romans={m.romans} tonic={m.tonic} scale={m.scale} active={beat !== null && score ? chordIndex(score, beat, m.romans.length) : -1} k={k} />;
    case "grid":
      return <GridView rows={m.rows} pattern={m.pattern} active={beat !== null ? beat : null} k={k} />;
  }
}
function chordIndex(score: Score, beat: number, n: number): number {
  const t = score.tracks.find((x) => x.kind === "notes");
  if (!t || t.kind !== "notes") return -1;
  const len = t.notes.reduce((s, x) => s + x.d, 0);
  if (!len) return -1;
  const i = Math.floor((beat / len) * n);
  return i >= 0 && i < n ? i : -1;
}

// ── Small pictures ───────────────────────────────────────────────────────────────────────────
const DYN_WORD: Record<Dyn, string> = { pp: "very soft", p: "soft", mp: "medium soft", mf: "medium loud", f: "loud", ff: "very loud", cresc: "getting louder", decresc: "getting softer" };
export function Dynamics({ marks, k = 1 }: { marks: Dyn[]; k?: number }) {
  return (
    <div className="flex flex-wrap items-end justify-center gap-6">
      {marks.map((d, i) => (
        <span key={i} className="flex flex-col items-center gap-1">
          {d === "cresc" || d === "decresc" ? (
            <svg viewBox="0 0 120 50" style={{ width: 150 * k, height: 62 * k }} aria-hidden>
              <path d={d === "cresc" ? "M8 25 L112 8 M8 25 L112 42" : "M8 8 L112 25 M8 42 L112 25"} stroke="#2a2f45" strokeWidth={5} strokeLinecap="round" fill="none" />
            </svg>
          ) : (
            <span className="font-[Georgia,serif] font-black italic leading-none text-[#2a2f45]" style={{ fontSize: 76 * k }}>
              {d}
            </span>
          )}
          <span className="font-display text-lg font-extrabold text-[var(--l-ink-2)]">{DYN_WORD[d]}</span>
        </span>
      ))}
    </div>
  );
}
export function Metronome({ bpm, word, on, k = 1 }: { bpm: number; word?: string; on?: boolean; k?: number }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 120 150" style={{ width: 130 * k, height: 162 * k }} aria-hidden>
        <path d="M30 140 L50 14 L70 14 L90 140 Z" fill="#c98a4a" stroke="#2a2f45" strokeWidth={5} strokeLinejoin="round" />
        <path d="M40 140 L54 40 L66 40 L80 140 Z" fill="#f2e4c8" stroke="#2a2f45" strokeWidth={3} strokeLinejoin="round" />
        <g className={on ? "m-tick" : undefined} style={{ transformOrigin: "60px 128px", animationDuration: `${(60 / bpm) * 2}s` }}>
          <line x1={60} y1={128} x2={60} y2={34} stroke="#2a2f45" strokeWidth={5} strokeLinecap="round" />
          <rect x={51} y={58} width={18} height={14} rx={3} fill="#ff6fb5" stroke="#2a2f45" strokeWidth={3} />
        </g>
        <rect x={26} y={136} width={68} height={10} rx={4} fill="#a0652c" stroke="#2a2f45" strokeWidth={4} />
      </svg>
      <span className="font-display text-2xl font-extrabold text-[var(--l-ink)]">{word ?? ""} <span className="text-[var(--l-ink-2)]">· {bpm} bpm</span></span>
    </div>
  );
}
export function WaveView({ hz, amp, compare, k = 1, width = 520 }: { hz: number; amp: number; compare?: { hz: number; amp: number }; k?: number; width?: number }) {
  const path = (f: number, a: number) => {
    const cycles = Math.max(1, Math.min(22, f / 40));
    let d = "";
    for (let x = 0; x <= 400; x += 2) {
      const y = 60 - Math.sin((x / 400) * cycles * Math.PI * 2) * a * 48;
      d += `${x === 0 ? "M" : "L"}${x} ${y.toFixed(1)} `;
    }
    return d;
  };
  return (
    <svg viewBox="0 0 400 120" style={{ width: width * k, maxWidth: "100%", height: 150 * k }} className="rounded-[20px] bg-[#0f1f3a]" aria-label="Sound wave">
      {[20, 40, 60, 80, 100].map((y) => (
        <line key={y} x1={0} x2={400} y1={y} y2={y} stroke="#2a4a7a" strokeWidth={1} />
      ))}
      {compare && <path d={path(compare.hz, compare.amp)} stroke="#ffd25a" strokeWidth={4} fill="none" opacity={0.55} strokeDasharray="8 6" />}
      <path d={path(hz, amp)} stroke="#5cf2c3" strokeWidth={4.5} fill="none" className="m-wave" />
    </svg>
  );
}
export function FormBlocks({ sections, active = -1, k = 1, hidden }: { sections: string[]; active?: number; k?: number; hidden?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5">
      {sections.map((s, i) => (
        <span key={i} className={cn("flex items-center justify-center rounded-[18px] border-[3px] border-[#2a2f45] px-4 font-display font-extrabold text-white transition-transform", i === active && "scale-110 shadow-[0_0_0_4px_#fff,0_0_26px_rgba(255,77,141,0.7)]")} style={{ minWidth: 70 * k, height: 70 * k, fontSize: (s.length > 2 ? 20 : 34) * k, background: hidden ? "#9aa9bd" : sectionColor(s) }}>
          {hidden ? "?" : s.length > 1 ? s[0].toUpperCase() + s.slice(1) : s}
        </span>
      ))}
    </div>
  );
}
export function CircleOfFifths({ lit = [], k = 1 }: { lit?: string[]; k?: number }) {
  const R = 150;
  // Rounded: the server and the browser disagree on the last digits of sin/cos (hydration).
  const r2 = (v: number) => Math.round(v * 100) / 100;
  return (
    <svg viewBox="-180 -180 360 360" style={{ width: 340 * k, height: 340 * k }} aria-label="Circle of fifths">
      <circle r={R + 22} fill="#fff" stroke="#2a2f45" strokeWidth={4} />
      <circle r={R - 46} fill="#f3f0ff" stroke="#2a2f45" strokeWidth={3} />
      {CIRCLE.map((c, i) => {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const on = lit.includes(c.major) || lit.includes(c.minor);
        const x = r2(Math.cos(a) * (R - 6));
        const y = r2(Math.sin(a) * (R - 6));
        const xi = r2(Math.cos(a) * (R - 76));
        const yi = r2(Math.sin(a) * (R - 76));
        return (
          <g key={i}>
            <line x1={r2(Math.cos(a + Math.PI / 12) * (R - 46))} y1={r2(Math.sin(a + Math.PI / 12) * (R - 46))} x2={r2(Math.cos(a + Math.PI / 12) * (R + 22))} y2={r2(Math.sin(a + Math.PI / 12) * (R + 22))} stroke="#dbe8f1" strokeWidth={2} />
            {on && <circle cx={x} cy={y} r={24} fill="#ff6fb5" opacity={0.85} />}
            <text x={x} y={y + 8} textAnchor="middle" fontFamily="var(--font-display, system-ui)" fontWeight={900} fontSize={22} fill={on ? "#fff" : "#2a2f45"}>{c.major}</text>
            <text x={xi} y={yi + 6} textAnchor="middle" fontFamily="var(--font-display, system-ui)" fontWeight={800} fontSize={15} fill="#6b4fe0">{c.minor}</text>
          </g>
        );
      })}
    </svg>
  );
}
export function ChordBlocks({ romans, tonic, scale, active = -1, k = 1 }: { romans: string[]; tonic: number; scale: "major" | "minor"; active?: number; k?: number }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5">
      {romans.map((r, i) => {
        let name = "";
        let c = "#9aa9bd";
        try {
          const ch = romanChord(r, tonic, scale);
          name = chordSymbol(ch.root, ch.q, [1, 3, 5, 6, 8, 10].includes(((ch.root % 12) + 12) % 12) && scale === "minor");
          c = noteColor(ch.root);
        } catch {
          /* a bad numeral just shows as itself */
        }
        return (
          <span key={i} className={cn("flex flex-col items-center justify-center rounded-[18px] border-[3px] border-[#2a2f45] px-3 transition-transform", i === active && "scale-110 shadow-[0_0_0_4px_#fff,0_0_26px_rgba(255,77,141,0.7)]")} style={{ minWidth: 78 * k, height: 84 * k, background: c }}>
            <span className="font-[Georgia,serif] font-black leading-none text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]" style={{ fontSize: 30 * k }}>{r}</span>
            <span className="font-display font-extrabold text-white/95" style={{ fontSize: 15 * k }}>{name}</span>
          </span>
        );
      })}
    </div>
  );
}
export function GridView({ rows, pattern, active, k = 1 }: { rows: string[]; pattern: string[]; active?: number | null; k?: number }) {
  const steps = Math.max(...pattern.map((p) => p.length));
  const col = active !== null && active !== undefined && active >= 0 ? Math.floor(active * (steps / 4)) % steps : -1;
  return (
    <div className="flex flex-col gap-1.5 rounded-[20px] bg-[#1d2440] p-3" style={{ width: Math.min(640, 70 + steps * 44) * k }}>
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="w-12 shrink-0">
            <InstrumentPic id={r} size={40 * k} />
          </span>
          {Array.from({ length: steps }, (_, j) => {
            const on = pattern[i]?.[j] === "x";
            return <span key={j} className={cn("aspect-square flex-1 rounded-[8px] border-2", j === col ? "border-white" : "border-transparent")} style={{ background: on ? noteColor(60 + i * 3) : j % 4 === 0 ? "#3a4570" : "#2b3458", boxShadow: on && j === col ? "0 0 16px #fff" : undefined }} />;
          })}
        </div>
      ))}
    </div>
  );
}
export function Contour({ pitches, active = -1, k = 1, tonic }: { pitches: number[]; active?: number; k?: number; tonic?: number }) {
  if (!pitches.length) return null;
  const lo = Math.min(...pitches);
  const hi = Math.max(...pitches, lo + 4);
  const W = 70;
  const pts = pitches.map((p, i) => [30 + i * W, 130 - ((p - lo) / (hi - lo)) * 100] as const);
  return (
    <svg viewBox={`0 0 ${60 + (pitches.length - 1) * W} 160`} style={{ height: 160 * k, maxWidth: "100%" }} aria-label="Melody shape">
      <path d={pts.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ")} stroke="#2a2f45" strokeWidth={4} fill="none" strokeDasharray="10 7" strokeLinecap="round" />
      {pts.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={i === active ? 19 : 15} fill={noteColor(pitches[i])} stroke="#2a2f45" strokeWidth={4} />
          {tonic !== undefined && <text x={x} y={y + 5} textAnchor="middle" fontFamily="var(--font-display, system-ui)" fontWeight={900} fontSize={13} fill="#fff">{solfege(pitches[i], tonic, false)}</text>}
        </g>
      ))}
    </svg>
  );
}
