"use client";

import { useState } from "react";
import { ArrowRight, Flame, Snowflake, Play, Sprout } from "lucide-react";
import { cn } from "@/lib/cn";
import type { LabSpec, LabThing } from "@/lib/learn/types";
import { SAY } from "@/lib/learn/script";
import { say } from "@/lib/learn/audio";
import { sfx } from "@/lib/learn/sfx";
import { Chunk } from "../kit";
import type { ActProps, LessonFx } from "../acts/common";
import { PromptRow, useLater, usePrompt } from "../acts/common";
import { Glyph, GlyphRow, WithGlyphs, SvgGlyph } from "../art/Glyph";

// Discovery labs: hands-on science on the wall. Every lab runs the scientist's loop — PREDICT what
// will happen, TEST it and watch, then EXPLAIN why — because guessing first (and being surprised)
// is what makes a fact stick. Sink or float, magnets, circuits, heating and cooling water, what a
// plant needs, shadows that follow the sun, and ramps that roll farther on smooth surfaces.

export function LabAct({ act, fx, onDone }: ActProps<"lab">) {
  const s = act.spec;
  switch (s.lab) {
    case "float":
    case "magnet":
    case "circuit":
      return <PredictTest prompt={act.prompt} spec={s} fx={fx} onDone={onDone} />;
    case "states":
      return <StatesLab prompt={act.prompt} spec={s} fx={fx} onDone={onDone} />;
    case "plant":
      return <PlantLab prompt={act.prompt} spec={s} fx={fx} onDone={onDone} />;
    case "shadow":
      return <ShadowLab prompt={act.prompt} spec={s} fx={fx} onDone={onDone} />;
    case "ramp":
      return <RampLab prompt={act.prompt} spec={s} fx={fx} onDone={onDone} />;
  }
}

type LabProps<L extends LabSpec["lab"]> = { prompt: string; spec: Extract<LabSpec, { lab: L }>; fx: LessonFx; onDone: (m: number) => void };

// ── Predict → test (sink/float · magnet · circuit) ───────────────────────────────────────────
const PT = {
  float: { intro: SAY.labFloat, yes: "⛵ Floats", no: "⬇️ Sinks", sayYes: SAY.itFloats, sayNo: SAY.itSinks, q: "Will it sink or float?" },
  magnet: { intro: SAY.labMagnet, yes: "🧲 Sticks", no: "🚫 Doesn't stick", sayYes: SAY.itSticks, sayNo: SAY.noStick, q: "Will the magnet pull it?" },
  circuit: { intro: SAY.labCircuit, yes: "💡 Lights up", no: "⚫ No light", sayYes: SAY.bulbOn, sayNo: SAY.bulbOff, q: "Will the bulb light up?" },
} as const;

function PredictTest({ prompt, spec, fx, onDone }: LabProps<"float" | "magnet" | "circuit">) {
  const t = PT[spec.lab];
  const voiced = fx.voice !== "keys";
  usePrompt(fx, [t.intro], voiced ? 420 : -1);
  const later = useLater();
  const [i, setI] = useState(0);
  const [guess, setGuess] = useState<boolean | null>(null);
  const [tested, setTested] = useState(false);
  const [misses, setMisses] = useState(0);
  const [log, setLog] = useState<{ thing: LabThing; right: boolean }[]>([]);
  const thing = spec.things[i];
  const last = i === spec.things.length - 1;

  const predict = (g: boolean) => {
    if (guess !== null) return;
    sfx("pick");
    setGuess(g);
    later(() => {
      setTested(true);
      sfx(spec.lab === "float" ? "splash" : spec.lab === "magnet" ? "snap" : thing.yes ? "star" : "soft-fail");
      const right = g === thing.yes;
      if (!right) setMisses((m) => m + 1);
      setLog((l) => [...l, { thing, right }]);
      if (voiced) void say([thing.yes ? t.sayYes : t.sayNo, { gap: 200 }, right ? SAY.guessRight : SAY.guessOops, { gap: 250 }, thing.why]);
      else if (right) sfx("correct");
    }, 700);
  };
  const next = () => {
    sfx("tap");
    if (!last && voiced) void say(spec.things[i + 1].name);
    if (last) {
      const m = misses;
      if (m === 0) fx.right(null);
      later(() => onDone(Math.min(2, m)), m === 0 ? 1200 : 200);
      return;
    }
    setI(i + 1);
    setGuess(null);
    setTested(false);
  };

  return (
    <div className="flex w-full max-w-[1100px] flex-col items-center gap-4">
      <PromptRow parts={[t.intro]}>{prompt || t.q}</PromptRow>
      <div className="flex w-full flex-col items-center gap-4 lg:flex-row lg:items-stretch lg:justify-center">
        <div className="relative flex h-[330px] w-full max-w-[560px] items-center justify-center overflow-hidden rounded-[28px] shadow-[0_8px_0_rgba(0,40,80,0.18)]" style={{ background: spec.lab === "float" ? "linear-gradient(#f0f9ff 0 30%, #7dd3fc 30%, #0ea5e9)" : spec.lab === "magnet" ? "linear-gradient(#fef3c7,#fde68a)" : "linear-gradient(#e2e8f0,#cbd5e1)" }}>
          {spec.lab === "float" && <FloatScene thing={thing} tested={tested} />}
          {spec.lab === "magnet" && <MagnetScene thing={thing} tested={tested} />}
          {spec.lab === "circuit" && <CircuitScene thing={thing} tested={tested} />}
          <span className="absolute left-4 top-3 rounded-full bg-white/85 px-3 py-1 font-display text-sm font-extrabold text-[var(--l-ink-2)]">
            <Glyph e="🧪" size="1.2em" className="mr-1 inline-block align-[-0.25em]" /> {i + 1} of {spec.things.length}
          </span>
        </div>
        <div className="flex w-full max-w-[440px] flex-col justify-center gap-3">
          <div className="flex items-center gap-3 rounded-[22px] bg-white/95 px-4 py-3 shadow-[0_5px_0_rgba(0,40,80,0.14)]">
            <GlyphRow s={thing.emoji ?? ""} size={72} />
            <span className="font-display text-3xl font-extrabold text-[var(--l-ink)]">{thing.name}</span>
          </div>
          {!tested ? (
            <>
              <span className="text-center font-display text-lg font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.3)]"><Glyph e="🤔" size="1.2em" className="mr-1 inline-block align-[-0.25em]" /> What&apos;s your prediction?</span>
              <div className="grid grid-cols-2 gap-3">
                {[true, false].map((g) => (
                  <Chunk key={String(g)} tone={guess === g ? "gold" : "white"} disabled={guess !== null} onClick={() => predict(g)} className="flex h-20 items-center justify-center px-2 font-display text-2xl font-extrabold">
                    <WithGlyphs text={g ? t.yes : t.no} />
                  </Chunk>
                ))}
              </div>
            </>
          ) : (
            <div className="l-card-in flex flex-col gap-2 rounded-[22px] bg-white px-4 py-3 shadow-[0_5px_0_var(--l-line)]">
              <span className={cn("font-display text-2xl font-extrabold", guess === thing.yes ? "text-[#166534]" : "text-[var(--l-coral-edge)]")}>
                <WithGlyphs text={`${guess === thing.yes ? "✅ You predicted it!" : "😮 Surprise!"} ${thing.yes ? t.yes : t.no}`} />
              </span>
              <span className="font-display text-xl font-bold leading-snug text-[var(--l-ink)]"><Glyph e="💡" size="1.25em" className="mx-[0.1em] inline-block align-[-0.28em]" /> {thing.why}</span>
              <Chunk tone="blue" onClick={next} className="mt-1 flex h-14 items-center justify-center gap-2 font-display text-xl font-extrabold">
                {last ? "Finish" : "Next thing"} <ArrowRight className="h-6 w-6" strokeWidth={3} />
              </Chunk>
            </div>
          )}
          <div className="flex justify-center gap-2">
            {log.map((l, k) => (
              <span key={k} className="flex items-center gap-0.5 rounded-full bg-white/85 px-2 py-0.5">
                <GlyphRow s={l.thing.emoji} size={30} />
                <Glyph e={l.right ? "✅" : "🔁"} size={18} />
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FloatScene({ thing, tested }: { thing: LabThing; tested: boolean }) {
  return (
    <>
      <span className="pointer-events-none absolute inset-x-0 top-[30%] h-2 bg-white/50" />
      <span
        key={thing.id}
        className="absolute text-7xl"
        style={{
          left: "50%",
          top: !tested ? "8%" : thing.yes ? "24%" : "76%",
          transform: "translate(-50%, 0)",
          transition: tested ? (thing.yes ? "top 900ms cubic-bezier(0.34,1.6,0.64,1)" : "top 1400ms cubic-bezier(0.45,0,0.55,1)") : "none",
        }}
      >
        <span className={cn("block", tested && thing.yes && "l-bob")}>
          <GlyphRow s={thing.emoji} size="1.15em" />
        </span>
      </span>
      {tested && <Glyph e="💦" size={48} className="l-pop-in absolute left-1/2 top-[27%] -translate-x-1/2 opacity-80" />}
      {tested && !thing.yes && <Glyph e="💧" size={32} className="l-bubble-up pointer-events-none absolute left-[55%] top-[70%]" />}
    </>
  );
}

function MagnetScene({ thing, tested }: { thing: LabThing; tested: boolean }) {
  return (
    <div className="relative h-full w-full">
      <Glyph e="🧲" size={112} className="absolute" style={{ left: tested ? "54%" : "12%", top: "34%", transition: "left 700ms cubic-bezier(0.34,1.3,0.64,1)", transform: "rotate(90deg)" }} />
      <span key={thing.id} className={cn("absolute block", tested && !thing.yes && "l-wobble")} style={{ left: tested && thing.yes ? "66%" : "72%", top: "36%", transition: "left 260ms ease-in 520ms" }}>
        <GlyphRow s={thing.emoji} size={88} />
      </span>
      {tested && thing.yes && <Glyph e="✨" size={48} className="l-pop-in absolute left-[62%] top-[24%]" style={{ animationDelay: "700ms" }} />}
    </div>
  );
}

function CircuitScene({ thing, tested }: { thing: LabThing; tested: boolean }) {
  const lit = tested && thing.yes;
  return (
    <svg viewBox="0 0 400 260" className="h-full w-full" aria-label="a circuit with a battery, a bulb and a gap">
      <rect x="40" y="40" width="320" height="180" rx="24" fill="none" stroke={lit ? "#f59e0b" : "#475569"} strokeWidth="8" strokeDasharray="0" />
      {/* the gap */}
      <rect x="170" y="206" width="60" height="28" fill="#cbd5e1" />
      <rect x="40" y="110" width="40" height="70" rx="6" fill="#1f2937" />
      <rect x="50" y="102" width="20" height="10" rx="3" fill="#9ca3af" />
      <text x="60" y="150" textAnchor="middle" fill="#fde047" fontSize="20" fontWeight="bold">+</text>
      <circle cx="200" cy="40" r="30" fill={lit ? "#fde047" : "#e5e7eb"} stroke="#64748b" strokeWidth="4" style={{ filter: lit ? "drop-shadow(0 0 20px rgba(250,204,21,0.95))" : undefined, transition: "all 400ms" }} />
      {lit && <SvgGlyph e="💡" x={200} y={40} size={44} />}
      <SvgGlyph key={thing.id} e={thing.emoji} x={200} y={tested ? 216 : 134} size={56} style={{ transition: "all 500ms" }} />
    </svg>
  );
}

// ── Heating and cooling: ice · water · steam ─────────────────────────────────────────────────
const STATE_OF = (t: number) => (t <= 0 ? "solid" : t >= 100 ? "gas" : "liquid");
const START_T = { solid: -20, liquid: 25, gas: 110 } as const;
const STATE_WORD = { solid: "Ice (a solid)", liquid: "Water (a liquid)", gas: "Steam (a gas)" } as const;

function StatesLab({ prompt, spec, fx, onDone }: LabProps<"states">) {
  usePrompt(fx, [SAY.labStates], fx.voice !== "keys" ? 420 : -1);
  const later = useLater();
  const [temp, setTemp] = useState<number>(START_T[spec.start]);
  const [change, setChange] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [wrongWay, setWrongWay] = useState(0);
  const state = STATE_OF(temp);
  const RANK = { solid: 0, liquid: 1, gas: 2 } as const;
  const press = (dir: 1 | -1) => {
    if (done) return;
    const before = STATE_OF(temp);
    // Heating when it needs cooling (or the other way round) is a guess, not an experiment.
    const away = (RANK[before] < RANK[spec.goal] && dir < 0) || (RANK[before] > RANK[spec.goal] && dir > 0);
    const t = Math.max(-40, Math.min(140, temp + dir * 45));
    setTemp(t);
    const after = STATE_OF(t);
    sfx(dir > 0 ? "whoosh" : "tick");
    if (before !== after) {
      const word = before === "solid" ? SAY.melting : before === "gas" ? SAY.condensing : after === "gas" ? SAY.evaporating : SAY.freezing;
      setChange(word);
      void say(word);
    } else setChange(null);
    if (away) {
      setWrongWay((w) => w + 1);
      fx.miss();
    }
    if (after === spec.goal) {
      setDone(true);
      fx.right(null);
      later(() => onDone(Math.min(2, wrongWay + (away ? 1 : 0))), 2000);
    }
  };
  const dots = Array.from({ length: 16 }, (_, k) => k);
  return (
    <div className="flex w-full max-w-[1000px] flex-col items-center gap-4">
      <PromptRow parts={[SAY.labStates]}>{prompt}</PromptRow>
      <div className="flex flex-wrap items-center justify-center gap-6">
        <div className="relative flex h-[300px] w-[230px] items-end justify-center overflow-hidden rounded-b-[60px] rounded-t-xl border-[6px] border-white/80 bg-white/30">
          {state === "solid" && <Glyph e="🧊" size={112} className="mb-6" />}
          {state === "liquid" && <span className="absolute inset-x-0 bottom-0 h-[55%] bg-[#38bdf8]/70" />}
          {state === "gas" && (
            <>
              <Glyph e="💨" size={60} className="l-rise absolute bottom-10 left-8 opacity-80" />
              <Glyph e="💨" size={60} className="l-rise absolute bottom-16 right-10 opacity-70" style={{ animationDelay: "400ms" }} />
            </>
          )}
          <span className="absolute right-2 top-2 rounded-full bg-white px-2 py-0.5 font-mono text-lg font-bold text-[var(--l-ink)]">{temp}°C</span>
        </div>
        {/* What the tiny particles are doing */}
        <div className="flex flex-col items-center gap-2">
          <span className="font-display text-base font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.3)]">Zoom in: the tiny particles</span>
          <div className="relative h-[200px] w-[200px] overflow-hidden rounded-[24px] bg-white/95 shadow-[0_6px_0_rgba(0,40,80,0.16)]">
            {dots.map((k) => {
              const gx = (k % 4) * 40 + 40;
              const gy = Math.floor(k / 4) * 40 + 40;
              const spread = state === "gas" ? 1 : state === "liquid" ? 0.35 : 0;
              const x = state === "gas" ? ((k * 53) % 170) + 15 : gx + ((k * 7) % 11 - 5) * spread * 3;
              // A liquid settles in the bottom of the box, loosely packed; a solid is a tight grid.
              const y = state === "gas" ? ((k * 97) % 170) + 15 : state === "liquid" ? 82 + Math.floor(k / 4) * 30 + ((k * 13) % 9 - 4) * 2 : gy;
              return <span key={k} className={cn("absolute h-5 w-5 rounded-full bg-[var(--l-blue)]", state === "solid" ? "l-wobble" : state === "liquid" ? "l-sway" : "l-float")} style={{ left: x - 10, top: y - 10, transition: "all 600ms ease", animationDuration: state === "gas" ? "0.9s" : undefined }} />;
            })}
          </div>
          <span className="rounded-full bg-white px-4 py-1 font-display text-lg font-extrabold text-[var(--l-ink)]">{STATE_WORD[state]}</span>
        </div>
      </div>
      {change && <span key={`${change}${temp}`} className="l-pop-in rounded-full bg-[#fff7d6] px-5 py-1.5 font-display text-2xl font-extrabold text-[#7a5200]">{change}</span>}
      <div className="flex gap-4">
        <Chunk tone="coral" disabled={done} onClick={() => press(1)} className="flex h-16 items-center gap-2 px-6 font-display text-2xl font-extrabold">
          <Flame className="h-7 w-7" /> Heat
        </Chunk>
        <Chunk tone="blue" disabled={done} onClick={() => press(-1)} className="flex h-16 items-center gap-2 px-6 font-display text-2xl font-extrabold">
          <Snowflake className="h-7 w-7" /> Cool
        </Chunk>
      </div>
    </div>
  );
}

// ── What does a plant need? ──────────────────────────────────────────────────────────────────
const NEEDS = [
  { id: "sun", label: "Sunlight", emoji: "☀️", why: SAY.plantSun },
  { id: "water", label: "Water", emoji: "💧", why: SAY.plantWater },
  { id: "air", label: "Air", emoji: "💨", why: SAY.plantAir },
  { id: "soil", label: "Soil", emoji: "🟫", why: SAY.plantSoil },
] as const;

function PlantLab({ prompt, spec, fx, onDone }: LabProps<"plant">) {
  usePrompt(fx, [SAY.labPlant], fx.voice !== "keys" ? 420 : -1);
  const later = useLater();
  const [on, setOn] = useState<string[]>([]);
  const [phase, setPhase] = useState<"set" | "grow" | "wilt" | "won">("set");
  const [missing, setMissing] = useState<string | null>(null);
  const [misses, setMisses] = useState(0);
  const toggle = (id: string) => {
    if (phase === "grow" || phase === "won") return;
    sfx("tick");
    setPhase("set");
    setMissing(null);
    setOn((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));
  };
  const grow = () => {
    const miss = spec.need.find((n) => !on.includes(n));
    setPhase("grow");
    sfx("whoosh");
    later(() => {
      if (!miss) {
        setPhase("won");
        fx.right(null);
        later(() => onDone(Math.min(2, misses)), 2400);
      } else {
        setPhase("wilt");
        setMissing(miss);
        setMisses((m) => m + 1);
        fx.miss();
        const w = NEEDS.find((x) => x.id === miss)!;
        void say(w.why);
      }
    }, 1600);
  };
  const size = phase === "won" ? 1 : phase === "grow" ? 0.7 : 0.46;
  return (
    <div className="flex w-full max-w-[1000px] flex-col items-center gap-4">
      <PromptRow parts={[SAY.labPlant]}>{prompt}</PromptRow>
      <div className="relative flex h-[300px] w-full max-w-[560px] items-end justify-center overflow-hidden rounded-[28px] shadow-[0_8px_0_rgba(0,40,80,0.18)]" style={{ background: on.includes("sun") ? "linear-gradient(#7dd3fc,#e0f2fe)" : "linear-gradient(#334155,#64748b)" }}>
        {on.includes("sun") && <Glyph e="☀️" size={72} className="l-rays absolute right-6 top-4" />}
        {on.includes("water") && phase !== "set" && <span className="l-rain pointer-events-none absolute inset-0 opacity-70" />}
        <span className="absolute bottom-0 h-16 w-full" style={{ background: on.includes("soil") ? "#7c4a1f" : "#d6d3d1" }} />
        <span className={cn("relative mb-12 block origin-bottom transition-transform duration-[1400ms]", phase === "wilt" && "l-droop")} style={{ transform: `scale(${size})` }}>
          <Glyph e={phase === "won" ? "🌻" : phase === "wilt" ? "🥀" : "🌱"} size={170} />
        </span>
      </div>
      {missing && (
        <span className="l-card-in rounded-[20px] bg-white px-5 py-2 font-display text-xl font-bold text-[var(--l-coral-edge)] shadow-[0_4px_0_var(--l-line)]">
          <GlyphRow s={NEEDS.find((x) => x.id === missing)?.emoji ?? ""} size="1.3em" className="mr-1 align-[-0.3em]" />
          {NEEDS.find((x) => x.id === missing)?.why}
        </span>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        {NEEDS.map((n) => (
          <Chunk key={n.id} tone={on.includes(n.id) ? "teal" : "white"} disabled={phase === "grow" || phase === "won"} onClick={() => toggle(n.id)} className="flex h-16 items-center gap-2 px-4 font-display text-xl font-extrabold">
            <GlyphRow s={n.emoji ?? ""} size={40} /> {n.label} {on.includes(n.id) ? "✓" : ""}
          </Chunk>
        ))}
        <Chunk tone="green" disabled={phase === "grow" || phase === "won"} onClick={grow} className="l-pulse flex h-16 items-center gap-2 px-6 font-display text-2xl font-extrabold">
          <Sprout className="h-7 w-7" /> Grow!
        </Chunk>
      </div>
    </div>
  );
}

// ── Shadows ──────────────────────────────────────────────────────────────────────────────────
function ShadowLab({ prompt, spec, fx, onDone }: LabProps<"shadow">) {
  usePrompt(fx, [SAY.labShadow], fx.voice !== "keys" ? 420 : -1);
  const later = useLater();
  const [pos, setPos] = useState(1); // 0 (sunrise, left) … 6 (sunset, right)
  const [misses, setMisses] = useState(0);
  const [done, setDone] = useState(false);
  const ang = (pos / 6) * Math.PI; // 0 = left horizon, π = right horizon
  const sx = 50 - Math.cos(ang) * 40;
  const sy = 78 - Math.sin(ang) * 62;
  const height = Math.sin(ang); // 0 low … 1 high
  const len = Math.max(18, 150 * (1 - height) + 24);
  const dir = pos < 3 ? 1 : pos > 3 ? -1 : 0; // shadow points away from the sun
  const ok = spec.goal === "short" ? pos === 3 : spec.goal === "long" ? pos === 0 || pos === 6 : spec.goal === "left" ? pos > 3 : pos < 3;
  const check = () => {
    if (done) return;
    if (ok) {
      setDone(true);
      fx.right(null);
      later(() => onDone(Math.min(2, misses)), 1800);
    } else {
      setMisses((m) => m + 1);
      fx.wrong(null);
    }
  };
  return (
    <div className="flex w-full max-w-[1000px] flex-col items-center gap-4">
      <PromptRow parts={[SAY.labShadow]}>{prompt}</PromptRow>
      <div className="relative h-[300px] w-full max-w-[640px] overflow-hidden rounded-[28px] shadow-[0_8px_0_rgba(0,40,80,0.18)]" style={{ background: `linear-gradient(${height > 0.4 ? "#7dd3fc" : "#fdba74"}, #fef3c7)` }}>
        <span className="absolute text-6xl" style={{ left: `${sx}%`, top: `${sy}%`, transform: "translate(-50%,-50%)", transition: "all 500ms ease" }}><Glyph e="☀️" size="1.25em" className="mx-[0.1em] inline-block align-[-0.28em]" /></span>
        <span className="absolute bottom-0 h-[22%] w-full bg-[#86efac]" />
        {/* the shadow lies on the ground, away from the sun */}
        <span className="absolute bottom-[19%] h-5 rounded-full bg-black/35 blur-[1px]" style={{ left: dir >= 0 ? "50%" : `calc(50% - ${len}px)`, width: dir === 0 ? len : len, transform: dir === 0 ? "translateX(-50%)" : undefined, transition: "all 500ms ease" }} />
        <Glyph e="🧍" size={144} className="absolute bottom-[19%] left-1/2 -translate-x-1/2" />
      </div>
      <div className="flex items-center gap-3">
        <Chunk tone="white" disabled={done || pos === 0} onClick={() => (sfx("tick"), setPos((p) => Math.max(0, p - 1)))} className="flex h-14 items-center px-4 font-display text-lg font-extrabold text-[var(--l-ink)]">
          <Glyph e="🌅" size="1.2em" className="mr-1 inline-block align-[-0.25em]" /> Earlier
        </Chunk>
        <input type="range" min={0} max={6} value={pos} onChange={(e) => (sfx("tick"), setPos(Number(e.target.value)))} disabled={done} className="h-4 w-[300px] accent-[var(--l-gold)]" aria-label="Move the sun" />
        <Chunk tone="white" disabled={done || pos === 6} onClick={() => (sfx("tick"), setPos((p) => Math.min(6, p + 1)))} className="flex h-14 items-center px-4 font-display text-lg font-extrabold text-[var(--l-ink)]">
          Later <Glyph e="🌇" size="1.2em" className="ml-1 inline-block align-[-0.25em]" />
        </Chunk>
      </div>
      <Chunk tone="green" disabled={done} onClick={check} className="flex h-16 items-center gap-2 px-8 font-display text-2xl font-extrabold">
        <Glyph e="✅" size="1.2em" className="mr-1 inline-block align-[-0.25em]" /> Check
      </Chunk>
    </div>
  );
}

// ── Ramps + friction ─────────────────────────────────────────────────────────────────────────
const SURF = [
  { id: "carpet", label: "Carpet", emoji: "🧶", grip: 0.45, color: "#b45309" },
  { id: "wood", label: "Wood", emoji: "🪵", grip: 0.7, color: "#d97706" },
  { id: "ice", label: "Ice", emoji: "🧊", grip: 0.95, color: "#bae6fd" },
] as const;

function RampLab({ prompt, spec, fx, onDone }: LabProps<"ramp">) {
  usePrompt(fx, [SAY.labRamp], fx.voice !== "keys" ? 420 : -1);
  const later = useLater();
  const [h, setH] = useState(1); // 0 low · 1 medium · 2 high
  const [surf, setSurf] = useState(1);
  const [dist, setDist] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const [misses, setMisses] = useState(0);
  const [done, setDone] = useState(false);
  const d = Math.round(((h + 1) / 3) * SURF[surf].grip * 100);
  const best = spec.goal === "far" ? h === 2 && surf === 2 : h === 0 && surf === 0;
  const roll = () => {
    if (rolling || done) return;
    setRolling(true);
    setDist(null);
    sfx("whoosh");
    later(() => {
      setDist(d);
      setRolling(false);
      if (best) {
        setDone(true);
        fx.right(null);
        later(() => onDone(Math.min(2, misses)), 2000);
      } else {
        setMisses((m) => m + 1);
        fx.miss();
        void say(spec.goal === "far" ? SAY.rampFarther : SAY.rampSooner);
      }
    }, 1500);
  };
  const ramp = 60 + h * 50;
  return (
    <div className="flex w-full max-w-[1000px] flex-col items-center gap-4">
      <PromptRow parts={[SAY.labRamp]}>{prompt}</PromptRow>
      <div className="relative h-[260px] w-full max-w-[700px] overflow-hidden rounded-[28px] bg-gradient-to-b from-[#e0f2fe] to-[#f8fafc] shadow-[0_8px_0_rgba(0,40,80,0.18)]">
        <svg viewBox="0 0 700 260" className="absolute inset-0 h-full w-full">
          <polygon points={`20,230 200,230 20,${230 - ramp}`} fill="#94a3b8" />
          <rect x="200" y="230" width="500" height="30" fill={SURF[surf].color} />
          {[1, 2, 3, 4, 5].map((k) => (
            <g key={k}>
              <line x1={200 + k * 95} y1="230" x2={200 + k * 95} y2="246" stroke="#334155" strokeWidth="3" />
              <text x={200 + k * 95} y="258" textAnchor="middle" fontSize="13" fill="#334155">{k * 20}</text>
            </g>
          ))}
        </svg>
        <Glyph e="🚗" size={60} className="absolute" style={{ left: rolling || dist !== null ? 180 + ((dist ?? d) / 100) * 470 : 20, bottom: rolling || dist !== null ? 26 : 30 + ramp - 6, transition: rolling ? "left 1400ms cubic-bezier(0.2,0.7,0.35,1), bottom 500ms ease-in" : "none" }} />
        {dist !== null && <span className="l-pop-in absolute right-4 top-3 rounded-full bg-white px-4 py-1 font-display text-xl font-extrabold text-[var(--l-ink)]">Rolled {dist} cm</span>}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <span className="font-display text-lg font-extrabold text-white">Ramp:</span>
        {["Low", "Medium", "High"].map((l, k) => (
          <Chunk key={l} tone={h === k ? "orange" : "white"} disabled={rolling || done} onClick={() => (sfx("tick"), setH(k), setDist(null))} className="flex h-12 items-center px-4 font-display text-lg font-extrabold">
            {l}
          </Chunk>
        ))}
        <span className="ml-2 font-display text-lg font-extrabold text-white">Floor:</span>
        {SURF.map((s, k) => (
          <Chunk key={s.id} tone={surf === k ? "teal" : "white"} disabled={rolling || done} onClick={() => (sfx("tick"), setSurf(k), setDist(null))} className="flex h-12 items-center gap-1 px-3 font-display text-lg font-extrabold">
            <GlyphRow s={s.emoji} size={30} />
            {s.label}
          </Chunk>
        ))}
      </div>
      <Chunk tone="green" disabled={rolling || done} onClick={roll} className="l-pulse flex h-16 items-center gap-2 px-8 font-display text-2xl font-extrabold">
        <Play className="h-7 w-7 fill-current" /> Roll!
      </Chunk>
      {done && <span className="l-pop-in rounded-[20px] bg-white px-5 py-2 text-center font-display text-xl font-bold text-[var(--l-ink)]"><WithGlyphs text={spec.goal === "far" ? "💡 A higher ramp gives more speed, and a smooth floor means less friction to slow it down." : "💡 A low ramp means less speed, and a rough floor has more friction to stop it."} /></span>}
    </div>
  );
}
