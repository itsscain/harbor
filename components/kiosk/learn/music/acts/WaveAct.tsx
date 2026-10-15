"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent as RKeyboardEvent } from "react";
import { Check, Minus, Plus, Volume2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Part } from "@/lib/learn/audio";
import { liveTone } from "@/lib/learn/mus/synth";
import { SAY } from "@/lib/learn/script";
import { sfx } from "@/lib/learn/sfx";
import { Chunk } from "../../kit";
import { PromptRow, spoken, type ActProps } from "../../acts/common";
import { Glyph } from "../../art/Glyph";
import { SoundOffNote } from "../kit/kit";

// See a sound, hear it, change it. A live oscilloscope shows the child's own tone as a wave that
// travels across the screen — how fast it wiggles is its pitch, how tall it is its loudness — and
// it sings while you slide (or all the time, with "Hear it" on). Make it higher, lower, louder,
// softer, an octave up, or match a target (heard on its button, drawn as a dashed gold ghost).
// Check says what's off in wave words ("more wiggles!"), the answer's zone appears after two
// misses, and after three the wave slides there by itself so no one is ever stuck.

type Tone = NonNullable<ReturnType<typeof liveTone>>;
type Wave = ActProps<"wave">["act"];
type Mode = Wave["mode"];

const TRIES = 3;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const AMP_LO = 0.03;
/** Wiggles across the screen for a pitch (straight proportion, so an octave really doubles them). */
const cyclesOf = (hz: number) => clamp(hz / 55, 1, 40);
/** Where a pitch sits on the slider (a log scale: equal steps sound equal), 0–1. */
const posOf = (hz: number, r: [number, number]) => clamp(Math.log(hz / r[0]) / Math.log(r[1] / r[0]), 0, 1);
const hzAt = (p: number, r: [number, number]) => r[0] * (r[1] / r[0]) ** clamp(p, 0, 1);

function rangeFor(a: Wave): [number, number] {
  if (a.mode === "octave") return [Math.max(60, a.hz / 1.6), Math.min(2400, a.hz * 3.2)];
  if (a.mode === "match" && a.target) return [Math.max(60, Math.min(a.hz, a.target.hz) / 1.7), Math.min(2400, Math.max(a.hz, a.target.hz) * 1.7)];
  return [Math.max(60, a.hz / 2.2), Math.min(2400, a.hz * 2.2)];
}
/** What a perfect answer looks like (the helper slides there after three misses). */
function answerOf(a: Wave): { hz: number; amp: number } {
  switch (a.mode) {
    case "higher": return { hz: a.hz * 1.5, amp: a.amp };
    case "lower": return { hz: a.hz / 1.5, amp: a.amp };
    case "octave": return { hz: a.hz * 2, amp: a.amp };
    case "louder": return { hz: a.hz, amp: Math.min(1, a.amp + 0.4) };
    case "softer": return { hz: a.hz, amp: Math.max(AMP_LO, a.amp - 0.35) };
    case "match": return a.target ?? { hz: a.hz, amp: a.amp };
  }
}
const WHY: Record<Mode, string> = {
  higher: "Higher pitch = faster wiggles! The waves squeeze closer together.",
  lower: "Lower pitch = slower wiggles. The waves stretch out wide.",
  louder: "Louder = taller waves! The wiggles stay the same — only the height grows.",
  softer: "Softer = smaller waves. Same wiggles, less height.",
  octave: "One octave up = exactly twice as many wiggles!",
  match: "Same wiggles and same height — the very same sound!",
};

export function WaveAct({ act, fx, onDone }: ActProps<"wave">) {
  const mode = act.mode;
  const target = act.target ?? null;
  const voiced = fx.voice !== "keys";
  const little = fx.voice === "all";
  const range = rangeFor(act);
  const needPitch = mode === "higher" || mode === "lower" || mode === "octave" || (mode === "match" && (!target || Math.abs(target.hz - act.hz) / act.hz >= 0.03));
  const needAmp = mode === "louder" || mode === "softer" || (mode === "match" && !!target && Math.abs(target.amp - act.amp) >= 0.08);
  const { parts, auto } = spoken(fx, act.say, act.prompt);
  const intro: Part[] = fx.firstTime && voiced ? [...parts, "~", SAY.waveHow] : parts;

  const [hz, setHz] = useState(act.hz);
  const [amp, setAmp] = useState(act.amp);
  const [ready, setReady] = useState(false);
  const [hear, setHear] = useState(false); // "Hear it" keeps the tone on
  const [sounding, setSounding] = useState(false);
  const [targetOn, setTargetOn] = useState(false);
  const [misses, setMisses] = useState(0);
  const [phase, setPhase] = useState<"try" | "won" | "show">("try");
  const [msg, setMsg] = useState<{ text: string; good: boolean; k: number } | null>(null);
  // Live values for the tone (state lags a render), the tones themselves, and timers.
  const box = useRef({ hz: act.hz, amp: act.amp, hear: false, drag: 0, tone: null as Tone | null, shot: null as Tone | null, timers: [] as number[] });

  const after = (fn: () => void, ms: number) => {
    box.current.timers.push(window.setTimeout(fn, ms));
  };
  const stopShot = () => {
    const b = box.current;
    b.shot?.stop();
    b.shot = null;
    setTargetOn(false);
  };
  /** A short tone on its own (the target, the starting sound, the answer). */
  const shot = (f: number, a: number, ms: number, isTarget = false) => {
    const b = box.current;
    stopShot();
    b.shot = liveTone(f, a);
    if (isTarget) setTargetOn(true);
    const me = b.shot;
    after(() => {
      if (box.current.shot === me) stopShot();
    }, ms);
  };
  const toneOn = () => {
    const b = box.current;
    stopShot();
    if (b.tone) b.tone.set(b.hz, b.amp);
    else b.tone = liveTone(b.hz, b.amp);
    setSounding(true);
  };
  const toneOff = () => {
    const b = box.current;
    b.tone?.stop();
    b.tone = null;
    setSounding(false);
  };
  const setPitch = (v: number) => {
    const b = box.current;
    b.hz = clamp(v, range[0], range[1]);
    setHz(b.hz);
    b.tone?.set(b.hz, b.amp);
  };
  const setLoud = (v: number) => {
    const b = box.current;
    b.amp = clamp(v, AMP_LO, 1);
    setAmp(b.amp);
    b.tone?.set(b.hz, b.amp);
  };
  const grab = () => {
    const b = box.current;
    if (phase !== "try") return;
    b.drag += 1;
    setMsg(null);
    toneOn();
  };
  const release = () => {
    const b = box.current;
    b.drag = Math.max(0, b.drag - 1);
    if (!b.drag && !b.hear) toneOff();
  };
  /** The little − / + buttons: a small step, heard. */
  const nudge = (k: number, which: "hz" | "amp") => {
    if (phase !== "try") return;
    sfx("tap");
    setMsg(null);
    if (which === "hz") setPitch(box.current.hz * k);
    else setLoud(box.current.amp + k);
    const b = box.current;
    if (!b.tone) shot(b.hz, b.amp, 500);
  };
  const toggleHear = () => {
    const b = box.current;
    sfx("tap");
    b.hear = !b.hear;
    setHear(b.hear);
    if (b.hear) toneOn();
    else if (!b.drag) toneOff();
  };
  const hearTarget = () => {
    if (!target) return;
    sfx("tap");
    const b = box.current;
    b.hear = false;
    setHear(false);
    toneOff();
    shot(target.hz, target.amp, 1600, true);
  };

  // Ask, then let the sound be heard before anything is touched: the target, or the starting sound.
  useEffect(() => {
    const b = box.current;
    let alive = true;
    fx.setPrompt(intro);
    const first = () => {
      if (!alive) return;
      if (mode === "match" && target) {
        b.shot = liveTone(target.hz, target.amp);
        setTargetOn(true);
      } else b.shot = liveTone(act.hz, act.amp);
      const me = b.shot;
      b.timers.push(
        window.setTimeout(() => {
          me?.stop();
          if (b.shot === me) b.shot = null;
          setTargetOn(false);
          if (alive) setReady(true);
        }, 1500),
      );
    };
    const t = window.setTimeout(() => {
      if (auto && intro.length) void fx.say(intro).then(() => window.setTimeout(first, 200));
      else first();
    }, 380);
    const cap = window.setTimeout(() => alive && setReady(true), 16000);
    return () => {
      alive = false;
      window.clearTimeout(t);
      window.clearTimeout(cap);
      b.timers.forEach((x) => window.clearTimeout(x));
      b.timers = [];
      b.tone?.stop();
      b.tone = null;
      b.shot?.stop();
      b.shot = null;
    };
    // Asked once on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** What's off, in wave words (null = right). */
  const problem = (): string | null => {
    const r = hz / act.hz;
    switch (mode) {
      case "higher":
        return r >= 1.15 ? null : r < 0.97 ? "That's lower! Slide the other way — toward the bird." : "Higher still! Make the wiggles squeeze closer together.";
      case "lower":
        return r <= 0.85 ? null : r > 1.03 ? "That's higher! Slide the other way — toward the bear." : "Lower still! Stretch the wiggles out wider.";
      case "octave":
        return Math.abs(r / 2 - 1) <= 0.05 ? null : r < 2 ? "Not high enough yet. An octave up has TWICE as many wiggles." : "Too high! An octave up is twice as many wiggles — not more.";
      case "louder":
        return amp >= act.amp + 0.25 ? null : amp < act.amp ? "That's softer! Make the wave taller." : "Louder still! Make the wave even taller.";
      case "softer":
        return amp <= act.amp - 0.25 ? null : amp > act.amp ? "That's louder! Make the wave smaller." : "Softer still! Make the wave even smaller.";
      case "match": {
        if (!target) return null;
        if (needPitch && Math.abs(hz - target.hz) / target.hz > 0.06) return hz < target.hz ? "Your sound is lower than the target. Slide higher — more wiggles!" : "Your sound is higher than the target. Slide lower — fewer wiggles!";
        if (needAmp && Math.abs(amp - target.amp) > 0.12) return amp < target.amp ? "Same pitch! Now make it louder — a taller wave." : "Same pitch! Now make it softer — a smaller wave.";
        return null;
      }
    }
  };

  const say = (text: string, good: boolean) => {
    setMsg((m) => ({ text, good, k: (m?.k ?? 0) + 1 }));
    if (voiced) void fx.say(text);
  };
  const finishWith = (m: number) => {
    const a = answerOf(act);
    const start = mode === "match" && target ? target : { hz: act.hz, amp: act.amp };
    const end = phase === "try" && m < TRIES ? { hz, amp } : a;
    // Hear the change: before, then after.
    after(() => shot(start.hz, start.amp, 750, mode === "match"), 900);
    after(() => shot(end.hz, end.amp, 1000), 1800);
    const why = mode === "octave" ? `${WHY.octave} ${Math.round(act.hz)} Hz × 2 = ${Math.round(act.hz * 2)} Hz.` : WHY[mode];
    after(() => void fx.explain(why, voiced ? [why] : undefined).then(() => onDone(m)), 2900);
  };

  const check = (el: HTMLElement) => {
    if (phase !== "try" || !ready) return;
    const b = box.current;
    b.hear = false;
    setHear(false);
    toneOff();
    const p = problem();
    if (!p) {
      setPhase("won");
      setMsg({ text: mode === "match" ? "A perfect match!" : "Yes! Just right!", good: true, k: 99 });
      fx.right(el);
      finishWith(misses);
      return;
    }
    const m = misses + 1;
    setMisses(m);
    fx.miss();
    if (m < TRIES) {
      say(p, false);
      return;
    }
    // Three tries: the wave slides to the answer by itself, and says why.
    setPhase("show");
    say("Watch — here's where it goes!", true);
    const a = answerOf(act);
    const from0 = { hz: b.hz, amp: b.amp };
    for (let k = 1; k <= 14; k++)
      after(() => {
        const t = k / 14;
        const e = t * t * (3 - 2 * t);
        setPitch(from0.hz * (a.hz / from0.hz) ** e);
        setLoud(from0.amp + (a.amp - from0.amp) * e);
      }, 400 + k * 70);
    after(() => finishWith(m), 1500);
  };

  const ghost = mode === "match" ? target : misses >= 2 && mode === "octave" ? answerOf(act) : { hz: act.hz, amp: act.amp };
  const ghostKind: "target" | "start" | "answer" = mode === "match" ? "target" : misses >= 2 && mode === "octave" ? "answer" : "start";
  const zone = misses >= 2 && phase === "try";
  const busy = phase !== "try" || !ready;
  const ratio = hz / act.hz;
  const rel = mode === "louder" || mode === "softer" ? (amp > act.amp + 0.02 ? "up" : amp < act.amp - 0.02 ? "down" : "same") : ratio > 1.01 ? "up" : ratio < 0.99 ? "down" : "same";
  const relWord = mode === "louder" || mode === "softer" ? { up: "louder", down: "softer", same: "same as the start" }[rel] : { up: "higher", down: "lower", same: "same as the start" }[rel];

  return (
    <div className="relative flex w-full max-w-[1080px] flex-col items-center gap-3">
      <PromptRow parts={intro}>{act.prompt}</PromptRow>
      <SoundOffNote />
      <div className="flex w-full items-stretch justify-center gap-4 rounded-[30px] bg-white/95 p-3.5 shadow-[0_8px_0_rgba(0,40,80,0.14)]">
        <div className="relative min-w-0 max-w-[760px] flex-1 self-center">
          <Scope hz={hz} amp={amp} ghost={ghost} ghostKind={ghostKind} on={sounding || targetOn} targetOn={targetOn} reduced={fx.reduced} />
          {/* Readouts on the screen */}
          <div className="pointer-events-none absolute left-3 top-2.5 flex items-center gap-2">
            {!little && mode !== "louder" && mode !== "softer" && <span className="rounded-full bg-[#0b1830]/80 px-3 py-1 font-display text-lg font-extrabold tabular-nums text-[#5cf2c3]">{Math.round(hz)} Hz</span>}
            {mode !== "match" && rel !== "same" && (
              <span className="flex items-center gap-1 rounded-full bg-[#0b1830]/80 py-0.5 pl-1.5 pr-3 font-display text-base font-extrabold text-white">
                <Glyph e={rel === "up" ? "⬆️" : "⬇️"} size={22} /> {relWord}
                {mode === "octave" && fx.voice !== "all" && <span className="ml-1 tabular-nums text-[#ffd25a]">× {ratio.toFixed(2)}</span>}
              </span>
            )}
          </div>
          {ghost && (
            <span className={cn("pointer-events-none absolute right-3 top-2.5 rounded-full px-3 py-1 font-display text-base font-extrabold", ghostKind === "start" ? "bg-white/15 text-white/80" : "bg-[#ffd25a]/20 text-[#ffd25a]", targetOn && "l-pulse")}>
              {ghostKind === "target" ? (misses > 0 && fx.voice !== "all" ? `target · ${Math.round(target!.hz)} Hz` : "target") : ghostKind === "answer" ? "an octave up" : "start"}
            </span>
          )}
          {/* What Check found, right on the screen (so it never pushes the buttons around). */}
          {msg && (
            <span key={msg.k} className={cn("l-pop-in pointer-events-none absolute bottom-3 left-1/2 w-max max-w-[88%] -translate-x-1/2 rounded-[18px] px-4 py-1.5 text-center font-display text-lg font-extrabold leading-tight text-white shadow-[0_4px_0_rgba(0,0,0,0.25)]", msg.good ? "bg-[var(--l-green)]" : "bg-[var(--l-orange)]")}>
              {msg.text}
            </span>
          )}
        </div>
        {needAmp && <AmpSlider amp={amp} onChange={setLoud} onGrab={grab} onRelease={release} onNudge={(k) => nudge(k, "amp")} disabled={busy} little={little} zone={zone ? zoneFor(act, "amp") : null} />}
      </div>
      {needPitch && <PitchSlider hz={hz} range={range} onChange={setPitch} onGrab={grab} onRelease={release} onNudge={(k) => nudge(k, "hz")} disabled={busy} little={little} zone={zone ? zoneFor(act, "hz") : null} />}
      {/* Fixed widths and a counter beside the row: the buttons never shift under a finger. */}
      <div className="relative flex min-h-[76px] items-center justify-center gap-4">
        <Chunk tone={hear ? "violet" : "blue"} onClick={toggleHear} disabled={busy} aria-pressed={hear} className="flex h-16 min-w-[176px] items-center justify-center gap-2 px-6 font-display text-xl font-extrabold">
          <Volume2 className={cn("h-7 w-7", hear && "l-hear-wiggle")} strokeWidth={2.6} />
          {hear ? "Sound on" : "Hear it"}
        </Chunk>
        {mode === "match" && target && (
          <Chunk tone="gold" onClick={hearTarget} disabled={busy} className={cn("flex h-16 items-center gap-2 px-6 font-display text-xl font-extrabold", targetOn && "l-pulse")}>
            <Glyph e="🎯" size={34} /> Hear the target
          </Chunk>
        )}
        <Chunk tone="green" onClick={(e) => check(e.currentTarget)} disabled={busy} className={cn("flex h-16 items-center gap-2 px-8 font-display text-2xl font-extrabold", busy && "opacity-70")}>
          <Check className="h-8 w-8" strokeWidth={3.5} /> Check
        </Chunk>
        {misses > 0 && phase === "try" && <span className="absolute left-full top-1/2 ml-4 -translate-y-1/2 whitespace-nowrap font-display text-base font-bold text-white/85">Try {misses + 1} of {TRIES}</span>}
      </div>
    </div>
  );
}

/** The range that counts as right (shown as a green zone after two misses). */
function zoneFor(a: Wave, which: "hz" | "amp"): [number, number] | null {
  if (which === "hz") {
    switch (a.mode) {
      case "higher": return [a.hz * 1.15, a.hz * 2.2];
      case "lower": return [a.hz / 2.2, a.hz * 0.85];
      case "octave": return [a.hz * 2 * 0.95, a.hz * 2 * 1.05];
      case "match": return a.target ? [a.target.hz * 0.94, a.target.hz * 1.06] : null;
      default: return null;
    }
  }
  switch (a.mode) {
    case "louder": return [Math.min(1, a.amp + 0.25), 1];
    case "softer": return [AMP_LO, Math.max(AMP_LO, a.amp - 0.25)];
    case "match": return a.target ? [Math.max(AMP_LO, a.target.amp - 0.12), Math.min(1, a.target.amp + 0.12)] : null;
    default: return null;
  }
}

// ── The oscilloscope ───────────────────────────────────────────────────────────────────────────
const SW = 400;
const SH = 130;
const MID = 65;
/** How fast the wave travels (screen units a second) — the same for every pitch, like real sound,
 *  so a higher note's wiggles stream past faster. */
const TRAVEL = 90;
function wavePath(f: number, a: number, extra: boolean) {
  const per = SW / cyclesOf(f);
  const step = Math.max(1.2, per / 18);
  const end = SW + (extra ? per : 0) + 0.01;
  let d = "";
  for (let x = 0; x <= end; x += step) d += `${x === 0 ? "M" : "L"}${x.toFixed(1)} ${(MID - Math.sin((x / per) * Math.PI * 2) * a * 54).toFixed(1)}`;
  return { d, per };
}
function Scope({ hz, amp, ghost, ghostKind, on, targetOn, reduced }: { hz: number; amp: number; ghost: { hz: number; amp: number } | null; ghostKind: "target" | "start" | "answer"; on: boolean; targetOn: boolean; reduced: boolean }) {
  const uid = useId().replace(/:/g, "");
  const me = wavePath(hz, amp, true);
  const gh = ghost ? wavePath(ghost.hz, ghost.amp, false) : null;
  return (
    <svg viewBox={`0 0 ${SW} ${SH}`} className="block w-full rounded-[22px] bg-[#0f1f3a] shadow-[inset_0_0_0_4px_#22355c]" role="img" aria-label={`A sound wave: ${Math.round(hz)} wiggles a second`}>
      <defs>
        <clipPath id={`${uid}c`}>
          <rect x={0} y={0} width={SW} height={SH} rx={18} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${uid}c)`}>
        {[1, 2, 3, 4, 5, 6, 7].map((k) => (
          <line key={`v${k}`} x1={k * 50} x2={k * 50} y1={0} y2={SH} stroke="#22406b" strokeWidth={1} />
        ))}
        {[MID - 54, MID - 27, MID + 27, MID + 54].map((y) => (
          <line key={`h${y}`} x1={0} x2={SW} y1={y} y2={y} stroke="#22406b" strokeWidth={1} />
        ))}
        <line x1={0} x2={SW} y1={MID} y2={MID} stroke="#2f5590" strokeWidth={1.5} />
        {gh && <path d={gh.d} fill="none" stroke={ghostKind === "start" ? "#ffffff" : "#ffd25a"} strokeWidth={ghostKind === "start" ? 2.5 : 3.5} strokeDasharray={ghostKind === "start" ? "4 6" : "9 7"} opacity={ghostKind === "start" ? 0.35 : targetOn ? 0.95 : 0.7} />}
        <g>
          {!reduced && <animateTransform key={Math.round(me.per * 4)} attributeName="transform" type="translate" from="0 0" to={`${(-me.per).toFixed(2)} 0`} dur={`${(me.per / TRAVEL).toFixed(3)}s`} repeatCount="indefinite" />}
          {on && <path d={me.d} fill="none" stroke="#5cf2c3" strokeWidth={11} strokeLinejoin="round" opacity={0.22} />}
          <path d={me.d} fill="none" stroke="#5cf2c3" strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" opacity={on ? 1 : 0.8} />
        </g>
      </g>
    </svg>
  );
}

// ── Sliders ────────────────────────────────────────────────────────────────────────────────────
function Knob({ size, tall }: { size: number; tall?: boolean }) {
  return (
    <span className="flex items-center justify-center rounded-full border-[4px] border-[#2a2f45] bg-white shadow-[0_5px_0_rgba(0,40,80,0.25)]" style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 40 40" style={{ width: size * 0.62, height: size * 0.62 }}>
        <path d={tall ? "M4 20 Q10 4 16 20 T28 20 T40 20" : "M2 20 Q5 12 8 20 T14 20 T20 20 T26 20 T32 20 T38 20"} stroke="#1cb0f6" strokeWidth={4.5} fill="none" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function PitchSlider({ hz, range, onChange, onGrab, onRelease, onNudge, disabled, little, zone }: { hz: number; range: [number, number]; onChange: (hz: number) => void; onGrab: () => void; onRelease: () => void; onNudge: (k: number) => void; disabled: boolean; little: boolean; zone: [number, number] | null }) {
  const track = useRef<HTMLDivElement>(null);
  const at = (x: number) => {
    const el = track.current;
    if (!el) return;
    const rc = el.getBoundingClientRect();
    onChange(hzAt((x - rc.left) / rc.width, range));
  };
  const key = (e: RKeyboardEvent) => {
    if (disabled) return;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") onNudge(1.03);
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") onNudge(1 / 1.03);
  };
  const knob = little ? 70 : 62;
  return (
    <div className={cn("flex w-full items-center gap-3 rounded-[28px] bg-white/25 px-3 py-1.5", disabled && "opacity-60")}>
      <Chunk tone="white" aria-label="A little lower" disabled={disabled} onClick={() => onNudge(1 / 1.015)} className="flex h-14 w-14 shrink-0 items-center justify-center text-[var(--l-ink)]">
        <Minus className="h-7 w-7" strokeWidth={3} />
      </Chunk>
      <span className="flex shrink-0 flex-col items-center">
        <Glyph e="🐻" size={little ? 50 : 42} />
        <span className="font-display text-sm font-extrabold text-white">low</span>
      </span>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Pitch: low to high"
        aria-valuemin={Math.round(range[0])}
        aria-valuemax={Math.round(range[1])}
        aria-valuenow={Math.round(hz)}
        aria-disabled={disabled}
        onKeyDown={key}
        onPointerDown={(e) => {
          if (disabled) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          onGrab();
          at(e.clientX);
        }}
        onPointerMove={(e) => {
          if (!disabled && e.currentTarget.hasPointerCapture(e.pointerId)) at(e.clientX);
        }}
        onPointerUp={onRelease}
        onPointerCancel={onRelease}
        className="relative h-[78px] min-w-0 flex-1 touch-none select-none"
      >
        <div ref={track} className="absolute top-1/2 h-7 -translate-y-1/2 rounded-full shadow-[inset_0_3px_0_rgba(0,0,0,0.15),0_4px_0_rgba(0,40,80,0.18)]" style={{ left: knob / 2, right: knob / 2, background: "linear-gradient(90deg, #3346a8, #1cb0f6 50%, #7ef0d0)" }}>
          {zone && <span className="absolute -inset-y-2.5 rounded-[14px] border-[3px] border-dashed border-white bg-[var(--l-green)]/60" style={{ left: `${posOf(zone[0], range) * 100}%`, width: `${(posOf(zone[1], range) - posOf(zone[0], range)) * 100}%` }} aria-hidden />}
          <span className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${posOf(hz, range) * 100}%` }}>
            <Knob size={knob} />
          </span>
        </div>
      </div>
      <span className="flex shrink-0 flex-col items-center">
        <Glyph e="🐦" size={little ? 50 : 42} />
        <span className="font-display text-sm font-extrabold text-white">high</span>
      </span>
      <Chunk tone="white" aria-label="A little higher" disabled={disabled} onClick={() => onNudge(1.015)} className="flex h-14 w-14 shrink-0 items-center justify-center text-[var(--l-ink)]">
        <Plus className="h-7 w-7" strokeWidth={3} />
      </Chunk>
    </div>
  );
}

function AmpSlider({ amp, onChange, onGrab, onRelease, onNudge, disabled, little, zone }: { amp: number; onChange: (a: number) => void; onGrab: () => void; onRelease: () => void; onNudge: (k: number) => void; disabled: boolean; little: boolean; zone: [number, number] | null }) {
  const area = useRef<HTMLDivElement>(null);
  const at = (y: number) => {
    const el = area.current;
    if (!el) return;
    const rc = el.getBoundingClientRect();
    onChange(AMP_LO + (1 - AMP_LO) * clamp(1 - (y - rc.top) / rc.height, 0, 1));
  };
  const key = (e: RKeyboardEvent) => {
    if (disabled) return;
    if (e.key === "ArrowUp" || e.key === "ArrowRight") onNudge(0.05);
    if (e.key === "ArrowDown" || e.key === "ArrowLeft") onNudge(-0.05);
  };
  const pos = (a: number) => ((a - AMP_LO) / (1 - AMP_LO)) * 100;
  const knob = little ? 70 : 62;
  return (
    <div className={cn("flex w-[104px] shrink-0 flex-col items-center gap-1", disabled && "opacity-60")}>
      <Glyph e="🐘" size={little ? 44 : 38} />
      <div
        role="slider"
        tabIndex={0}
        aria-label="Loudness: soft to loud"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(amp * 100)}
        aria-disabled={disabled}
        onKeyDown={key}
        onPointerDown={(e) => {
          if (disabled) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          onGrab();
          at(e.clientY);
        }}
        onPointerMove={(e) => {
          if (!disabled && e.currentTarget.hasPointerCapture(e.pointerId)) at(e.clientY);
        }}
        onPointerUp={onRelease}
        onPointerCancel={onRelease}
        className="relative w-[78px] flex-1 touch-none select-none rounded-[40px] shadow-[inset_0_4px_0_rgba(0,40,80,0.12),0_5px_0_rgba(0,40,80,0.18)]"
        style={{ minHeight: 150, background: "linear-gradient(0deg, #e6f6ff 0%, #8fd8ff 50%, #1cb0f6 100%)" }}
      >
        <div ref={area} className="absolute inset-x-0" style={{ top: knob / 2, bottom: knob / 2 }}>
          {zone && <span className="absolute -inset-x-2 rounded-[16px] border-[3px] border-dashed border-white bg-[var(--l-green)]/60" style={{ bottom: `${pos(zone[0])}%`, height: `${pos(zone[1]) - pos(zone[0])}%` }} aria-hidden />}
          <span className="absolute left-1/2 -translate-x-1/2 translate-y-1/2" style={{ bottom: `${pos(amp)}%` }}>
            <Knob size={knob} tall />
          </span>
        </div>
      </div>
      <Glyph e="🐭" size={little ? 44 : 38} />
      <span className="flex gap-1.5">
        <Chunk tone="white" aria-label="A little softer" disabled={disabled} onClick={() => onNudge(-0.04)} className="flex h-12 w-12 items-center justify-center text-[var(--l-ink)]">
          <Minus className="h-6 w-6" strokeWidth={3} />
        </Chunk>
        <Chunk tone="white" aria-label="A little louder" disabled={disabled} onClick={() => onNudge(0.04)} className="flex h-12 w-12 items-center justify-center text-[var(--l-ink)]">
          <Plus className="h-6 w-6" strokeWidth={3} />
        </Chunk>
      </span>
    </div>
  );
}
